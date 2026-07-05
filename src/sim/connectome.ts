/**
 * Connectome — the neural-net LineSegments layer. Every update it rebuilds entity-to-entity
 * links via spatial-grid neighbor queries, propagates activation along each link, and paints
 * link colors from the combined neural weight. Faithful port of legacy lines 441-447 + 798-821
 * with the Known Bug 13 fix: only the populated link range is uploaded to the GPU.
 *
 * V2 (CONTRACTS V2, graph writer): the rebuild loop additionally records each link as an
 * entity-list index pair in {@link Connectome.pairs} (consumed by GraphMind on a slow cadence)
 * and supports a community palette via {@link Connectome.setCommunityOf} — when installed, link
 * hue comes from an 8-hue tribe palette instead of the pure time hue. With no palette installed
 * the visual output is bit-for-bit identical to V1.
 */
import * as THREE from 'three';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';

/** Grid query radius for link candidates (legacy `SG.query(..., 8)`). */
const LINK_RADIUS = 8;
/** Squared link reach — 8^2 (legacy threshold 64). */
const LINK_REACH2 = 64;
/** 8-hue tribe palette step: communities map to evenly spaced hues `(c & 7) / 8`. */
const TRIBE_HUE_STEP = 1 / 8;
/** Within-tribe neural-weight shimmer — half a palette step so tribes stay distinguishable. */
const TRIBE_NW_JITTER = TRIBE_HUE_STEP / 2;
/**
 * Hard bound on the neural activation accumulator. The link pass is a positive-feedback
 * web (every link pumps a's `act` into b at gain `nw · ACT_PROP_GAIN · dt·60`), against
 * which entities.ts decay + brain excitation compete. ±4 is far above normal play; the
 * `!(<)` comparison form below also seals NaN (audit fix, 0.6.x).
 */
/**
 * Activation propagation gain along each link — scales with sim dt so firing rate is
 * frame-rate independent. The legacy 0.01 at 60 Hz was too weak to read as live neurons.
 */
const ACT_PROP_GAIN = 0.045;
/** Visual pulse frequencies (rad/s) — tuned for ~8–15 Hz apparent firing, not ~0.5 Hz. */
const FIRE_HZ = 38;
const RETRACT_HZ = 16;
const HUE_DRIFT_HZ = 5.5;
const WAVE1_HZ = 22;
const WAVE2_HZ = 17;
/** Hard clamp on the activation accumulator (see update loop). */
const ACT_MAX = 4;

// Module-level scratch color — reused for every link (keeps update() allocation-free).
const TMP_COLOR = new THREE.Color();

/**
 * V110 — living axons. A link is no longer a flat straight 2-vertex segment (the "1980s vector" look);
 * it is a {@link LINK_SEG}-segment polyline that BOWS + WAVES between its two endpoints. The endpoints
 * stay pinned to the two real creatures (the `sin(πu)` envelope is 0 at both ends), so the graph still
 * reads true; only the body bends. Amplitude breathes with the V109 `retract` term + link intensity.
 * Purely geometric + deterministic (per-link phase is a hash of the pair → no rng); the V109 colour
 * (one hue/sat/firing-brightness per link) is carried unchanged onto every vertex.
 */
const LINK_SEG = 6;
/** Floats per link in the position/color buffers: LINK_SEG segments × 2 verts × 3 components. */
const LINK_FLOATS = LINK_SEG * 6;
/** Per-point parametric tables (constant across links) — filled once so the hot loop stays cheap. */
const LINK_U = new Float32Array(LINK_SEG + 1);
const LINK_ENV = new Float32Array(LINK_SEG + 1); // sin(πu): 0 at the ends, 1 mid → endpoints pinned
const LINK_ANG1 = new Float32Array(LINK_SEG + 1);
const LINK_ANG2 = new Float32Array(LINK_SEG + 1);
for (let k = 0; k <= LINK_SEG; k++) {
  const u = k / LINK_SEG;
  LINK_U[k] = u;
  LINK_ENV[k] = Math.sin(u * Math.PI);
  LINK_ANG1[k] = u * Math.PI * 2.0;
  LINK_ANG2[k] = u * Math.PI * 3.0;
}
/** Scratch for the LINK_SEG+1 polyline points (reused → update() stays allocation-free). */
const TMP_PT = new Float32Array((LINK_SEG + 1) * 3);

/**
 * Owns the connectome LineSegments. The caller decides rebuild cadence (legacy gated by
 * entity count: every 1/2/3 frames); each `update()` call performs one full rebuild.
 */
export class Connectome {
  /**
   * Entity-list index pairs for the links recorded by the last `update()` — layout
   * `[a0, b0, a1, b1, ...]`, valid range `[0, pairCount * 2)`. Contents are only valid until
   * the next `update()` call. A link is recorded only when both endpoints resolve to a live
   * `entities.list` index (a neighbor that died since the last grid rebuild is still drawn —
   * preserving V1 visuals — but yields no pair), so `pairCount <= links`.
   */
  readonly pairs: Uint32Array;
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  /** Link capacity (quality.maxLinks ≈ 8× maxEntities — scales with population). */
  private readonly maxLinks: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly geo: THREE.BufferGeometry;
  /** The scene LineSegments (retained so {@link dispose} can remove it + free its material). */
  private readonly lines: THREE.LineSegments;
  private linkCount = 0;
  private pairTotal = 0;
  /** Community lookup installed by GraphMind (null ⇒ V1 time-hue coloring). */
  private communityOf: ((entityIndex: number) => number) | null = null;
  // Open-addressed mesh-id → list-index table, generation-stamped so a refill never clears
  // memory. Capacity is a power of two ≥ 4 × maxEntities (load factor ≤ 0.25 ⇒ probes always
  // terminate). All three arrays are allocated once — the per-update refill is allocation-free.
  private readonly idxKeys: Float64Array;
  private readonly idxVals: Uint32Array;
  private readonly idxGens: Uint32Array;
  private idxGen = 0;

  /** Allocates the link buffers and adds the LineSegments to the scene (legacy 441-447). */
  constructor(ctx: SimContext, entities: EntityManager) {
    this.ctx = ctx;
    this.entities = entities;
    this.maxLinks = ctx.quality.maxLinks;
    this.positions = new Float32Array(this.maxLinks * LINK_FLOATS);
    this.colors = new Float32Array(this.maxLinks * LINK_FLOATS);
    this.pairs = new Uint32Array(this.maxLinks * 2);
    let cap = 64;
    while (cap < ctx.quality.maxEntities * 4) cap *= 2;
    this.idxKeys = new Float64Array(cap);
    this.idxVals = new Uint32Array(cap);
    this.idxGens = new Uint32Array(cap);
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(
      this.geo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    const lines = this.lines;
    // USER (always-visible connectome): the axon web spans the WHOLE dome and its vertices are
    // rebuilt every frame, but three.js computes the geometry bounding sphere ONCE (lazily) and never
    // again — so as creatures roam, the stale sphere drifts out of the frustum and the ENTIRE web
    // flickers out at certain camera angles/distances (the "sometimes I can't see it close or far"
    // trigger). Disable frustum culling so it is drawn unconditionally at every angle + distance.
    // depthTest:true keeps links BETWEEN bodies (not smeared ON TOP of every skin — the V127 eyesore).
    // Additive blending + V109/V110 dynamic HSL + waving polylines = the living neural net the user sees.
    lines.frustumCulled = false;
    lines.renderOrder = 2;
    lines.visible = true;
    ctx.scene.add(lines);
  }

  /** Show/hide the axon-web render (default ON — the entity neural net). The graph keeps computing
   *  regardless; this only toggles the visual layer. O(1). */
  setWebVisible(show: boolean): void {
    this.lines.visible = show;
  }

  /** Whether the axon-web LineSegments are currently drawn. */
  get webVisible(): boolean {
    return this.lines.visible;
  }

  /** Links built by the last update (legacy `connLinks`, telemetry #v3 + sparkline #g3). */
  get links(): number {
    return this.linkCount;
  }

  /** Index pairs recorded in {@link pairs} by the last update (`pairCount <= links`). */
  get pairCount(): number {
    return this.pairTotal;
  }

  /** Free the owned geometry + material and remove the axon-web from the scene (HMR / world-reset safe;
   *  idempotent per three.js). Without this each hot reload orphaned a Connectome geometry + material. */
  dispose(): void {
    this.ctx.scene.remove(this.lines);
    this.geo.dispose();
    (this.lines.material as THREE.Material).dispose();
  }

  /**
   * Install (or remove, with `null`) the community lookup used for link coloring. When set,
   * link hue is `(fn(aIndex) & 7) / 8` — an 8-hue tribe palette keyed off the link's first
   * endpoint — plus a half-step neural-weight shimmer, replacing the V1 time-drift hue.
   * `fn` is called once per link per update; it MUST be O(1) and allocation-free. O(1).
   */
  setCommunityOf(fn: ((entityIndex: number) => number) | null): void {
    this.communityOf = fn;
  }

  /** Stamp `id → value` into the current generation of the lookup table. O(1) expected. */
  private idxInsert(id: number, value: number): void {
    const keys = this.idxKeys;
    const gens = this.idxGens;
    const gen = this.idxGen;
    const cap = keys.length;
    let h = (id % cap) >>> 0;
    let probes = 0;
    // Load factor ≤ 0.25 (cap ≥ 4·maxEntities ≥ 4·list.length) ⇒ an empty slot always exists.
    while (gens[h] === gen && keys[h] !== id) {
      h = h + 1 >= cap ? 0 : h + 1;
      if (++probes > cap) break;
    }
    keys[h] = id;
    this.idxVals[h] = value;
    gens[h] = gen;
  }

  /** Look up a mesh id in the current generation; -1 when absent. O(1) expected. */
  private idxFind(id: number): number {
    const keys = this.idxKeys;
    const gens = this.idxGens;
    const gen = this.idxGen;
    const cap = keys.length;
    let h = (id % cap) >>> 0;
    let probes = 0;
    while (gens[h] === gen) {
      if (keys[h] === id) {
        const v = this.idxVals[h];
        return v === undefined ? -1 : v; // h < cap by construction — guard satisfies the checker
      }
      h = h + 1 >= cap ? 0 : h + 1;
      if (++probes > cap) break;
    }
    return -1;
  }

  /**
   * Rebuild links from scratch (legacy 798-821): every entity queries the grid for
   * neighbors within 8u; undirected pairs emit once (`ni < bi`). Activation propagation
   * (`eb.act += ea.act * nw * ACT_PROP_GAIN * dt·60`), and an HSL color from the pair's mean neural weight
   * (hue from the tribe palette when a community lookup is installed, time hue otherwise).
   * Each link is also recorded as an entity-list index pair in `pairs` for GraphMind.
   * O(n·k + n) where n = entities (+ an O(n) id→index refill) and k = neighbors per
   * query; allocation-free (the grid query's shared buffer is consumed before the next query).
   *
   * `mutateAct` (default true) gates the ONLY entity-state write in this method — the activation
   * propagation into `eb.userData.act`. With it false the pass is purely read-only (geometry + colour
   * only), so the SUSPENDED-pause loop can keep the axons WAVING on the advancing visual clock without
   * decaying the seeded neural state (USER: the neural net stays alive-in-place while paused). At the
   * default `true` the output is byte-identical to the pre-flag behaviour.
   */
  update(dt: number, t: number, mutateAct = true): void {
    const grid = this.ctx.grid;
    const list = this.entities.list;
    const pos = this.positions;
    const col = this.colors;
    const pairs = this.pairs;
    const communityOf = this.communityOf;
    const max = this.maxLinks;
    const actStep = mutateAct ? ACT_PROP_GAIN * Math.min(1, dt * 60) : 0;
    // Advance the lookup generation (uint32 wrap ≈ 2.2 years of 60 fps updates; on the wrap,
    // stamps are zeroed so a slot from 2^32 updates ago can never alias the new generation).
    this.idxGen = (this.idxGen + 1) >>> 0;
    if (this.idxGen === 0) {
      this.idxGens.fill(0);
      this.idxGen = 1;
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.idxInsert(e.id, i); // invariant: list is dense
    }
    let wI = 0;
    let pc = 0;
    for (let ni = 0; ni < list.length && wI < max; ni++) {
      const ea = list[ni];
      if (!ea) continue; // noUncheckedIndexedAccess: ni < length
      const ap = ea.position;
      const nearby = grid.query(ap.x, ap.z, LINK_RADIUS);
      for (let nj = 0; nj < nearby.length && wI < max; nj++) {
        const eb = nearby[nj];
        if (!eb || eb === ea) continue; // noUncheckedIndexedAccess guard + self-link skip
        const bp = eb.position;
        const dx = ap.x - bp.x;
        const dy = ap.y - bp.y;
        const dz = ap.z - bp.z;
        const nd2 = dx * dx + dy * dy + dz * dz;
        if (nd2 < LINK_REACH2) {
          const nd = Math.sqrt(nd2);
          const bi = this.idxFind(eb.id);
          // Undirected dedup: one segment per pair (both endpoints query at full population).
          if (bi >= 0 && ni >= bi) continue;
          if (bi >= 0) {
            pairs[pc * 2] = ni;
            pairs[pc * 2 + 1] = bi;
            pc++;
          }
          const nI = 1 - nd * 0.125;
          const nw = (ea.userData.nW + eb.userData.nW) * 0.5;
          // Bounded activation propagation: `!(< ACT_MAX)` routes both overflow AND NaN to
          // the cap, the symmetric branch floors the (rare) negative side. O(1), no allocation.
          const act = eb.userData.act + ea.userData.act * nw * actStep;
          if (mutateAct) {
            eb.userData.act = !(act < ACT_MAX) ? ACT_MAX : act > -ACT_MAX ? act : -ACT_MAX;
          }
          // V109 colour: one dynamic hue/saturation + firing/retracting brightness per link.
          const actPulse = (ea.userData.act + eb.userData.act) * 0.5;
          const fire = 0.5 + 0.5 * Math.sin(t * FIRE_HZ + nw * 12.0 + ni * 0.7);
          const retract = 0.25 + 0.75 * Math.sin(t * RETRACT_HZ + nd * 0.55 + ni * 0.3);
          const hue = communityOf
            ? ((communityOf(ni) & 7) * TRIBE_HUE_STEP +
                nw * TRIBE_NW_JITTER +
                t * HUE_DRIFT_HZ * 0.04) %
              1
            : (t * HUE_DRIFT_HZ * 0.09 + nw * 0.6 + actPulse * 0.38) % 1;
          const sat = 0.94 + 0.06 * Math.sin(t * RETRACT_HZ * 1.1 + nw * 8.0);
          const lit = 0.28 + nI * 0.48 + nw * 0.38 + actPulse * 0.55 * fire * retract;
          TMP_COLOR.setHSL(hue, sat, Math.min(0.92, lit));
          const cr = TMP_COLOR.r;
          const cg = TMP_COLOR.g;
          const cb = TMP_COLOR.b;
          // V110 GEOMETRY: bow the link into a LINK_SEG waving axon. Endpoints pin to the two creatures
          // (sin(πu) envelope = 0 at both ends); the body waves on two perpendicular axes, amplitude
          // breathing with the V109 `retract` term + link intensity. Per-link phase = deterministic hash.
          const inv = nd > 1e-4 ? 1 / nd : 0;
          const dxn = (bp.x - ap.x) * inv;
          const dyn = (bp.y - ap.y) * inv;
          const dzn = (bp.z - ap.z) * inv;
          let p1x = -dzn;
          const p1y = 0;
          let p1z = dxn;
          let p1l = Math.sqrt(p1x * p1x + p1z * p1z);
          if (p1l < 1e-4) {
            p1x = 1;
            p1z = 0;
            p1l = 1;
          }
          p1x /= p1l;
          p1z /= p1l;
          const p2x = dyn * p1z - dzn * p1y;
          const p2y = dzn * p1x - dxn * p1z;
          const p2z = dxn * p1y - dyn * p1x;
          const phase = ap.x * 0.13 + bp.z * 0.17 + ea.id * 7e-4 + eb.id * 1.1e-3;
          const amp =
            (nd < 11.25 ? nd * 0.22 : 2.35) *
            (0.26 + 0.74 * retract) *
            (0.55 + 0.45 * nI) *
            (0.85 + 0.35 * fire);
          for (let k = 0; k <= LINK_SEG; k++) {
            const u = LINK_U[k]!;
            const envAmp = amp * LINK_ENV[k]!;
            const w1 = Math.sin(LINK_ANG1[k]! + t * WAVE1_HZ + phase) * envAmp;
            const w2 = Math.cos(LINK_ANG2[k]! + t * WAVE2_HZ + phase * 1.3) * envAmp * 0.6;
            const o = k * 3;
            TMP_PT[o] = ap.x + (bp.x - ap.x) * u + p1x * w1 + p2x * w2;
            TMP_PT[o + 1] = ap.y + (bp.y - ap.y) * u + p1y * w1 + p2y * w2;
            TMP_PT[o + 2] = ap.z + (bp.z - ap.z) * u + p1z * w1 + p2z * w2;
          }
          let w = wI * LINK_FLOATS;
          for (let k = 0; k < LINK_SEG; k++) {
            const a3 = k * 3;
            const b3 = a3 + 3;
            pos[w] = TMP_PT[a3]!;
            pos[w + 1] = TMP_PT[a3 + 1]!;
            pos[w + 2] = TMP_PT[a3 + 2]!;
            pos[w + 3] = TMP_PT[b3]!;
            pos[w + 4] = TMP_PT[b3 + 1]!;
            pos[w + 5] = TMP_PT[b3 + 2]!;
            col[w] = cr;
            col[w + 1] = cg;
            col[w + 2] = cb;
            col[w + 3] = cr;
            col[w + 4] = cg;
            col[w + 5] = cb;
            w += 6;
          }
          wI++;
        }
      }
    }
    this.linkCount = wI;
    this.pairTotal = pc;
    if (wI > 0 && this.lines.visible) {
      // Skip the GPU upload while HIDDEN (toggle via setWebVisible) — pairs + activation still compute.
      // Known Bug 13 fix: upload only the populated range, not all maxLinks*LINK_FLOATS floats.
      this.posAttr.clearUpdateRanges();
      this.posAttr.addUpdateRange(0, wI * LINK_FLOATS);
      this.posAttr.needsUpdate = true;
      this.colAttr.clearUpdateRanges();
      this.colAttr.addUpdateRange(0, wI * LINK_FLOATS);
      this.colAttr.needsUpdate = true;
    }
    // Each link draws LINK_SEG segments → LINK_SEG·2 vertices.
    this.geo.setDrawRange(0, wI * LINK_SEG * 2);
  }
}
