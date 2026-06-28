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
 * Hard bound on the neural activation accumulator. The link pass below is a positive-feedback
 * web (every link pumps a's `act` into b at gain `nw · 0.01`), against which the only decay is
 * entities.ts's per-frame `act *= 0.95`. Linearized, a dense mutual cluster of ~21+ entities
 * inside the 8u link radius at the every-frame cadence rung out-gains the decay and `act`
 * diverges to Infinity. ±4 is far above the |act| ≲ 1 a healthy web produces, so the clamp is
 * invisible in normal play; the `!(<)` comparison form below also seals NaN (audit fix, 0.6.x).
 */
const ACT_MAX = 4;

// Module-level scratch color — reused for every link (keeps update() allocation-free).
const TMP_COLOR = new THREE.Color();

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
  /** Link capacity (quality.maxLinks; legacy MNN: 2200 mobile / 4000 desktop). */
  private readonly maxLinks: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly geo: THREE.BufferGeometry;
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
    this.positions = new Float32Array(this.maxLinks * 6);
    this.colors = new Float32Array(this.maxLinks * 6);
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
    ctx.scene.add(
      new THREE.LineSegments(
        this.geo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        }),
      ),
    );
  }

  /** Links built by the last update (legacy `connLinks`, telemetry #v3 + sparkline #g3). */
  get links(): number {
    return this.linkCount;
  }

  /** Index pairs recorded in {@link pairs} by the last update (`pairCount <= links`). */
  get pairCount(): number {
    return this.pairTotal;
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
   * Rebuild links from scratch (legacy 798-821): every 2nd entity queries the grid for
   * neighbors within 8u; pairs closer than 8 get a segment, activation propagation
   * (`eb.act += ea.act * nw * 0.01`), and an HSL color from the pair's mean neural weight
   * (hue from the tribe palette when a community lookup is installed, time hue otherwise).
   * Each link is also recorded as an entity-list index pair in `pairs` for GraphMind.
   * O(n·k + n) where n = entities (stride 2; + an O(n) id→index refill) and k = neighbors per
   * query; allocation-free (the grid query's shared buffer is consumed before the next query).
   */
  update(_dt: number, t: number): void {
    const grid = this.ctx.grid;
    const list = this.entities.list;
    const pos = this.positions;
    const col = this.colors;
    const pairs = this.pairs;
    const communityOf = this.communityOf;
    const max = this.maxLinks;
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
    for (let ni = 0; ni < list.length && wI < max; ni += 2) {
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
          const idx = wI * 6;
          pos[idx] = ap.x;
          pos[idx + 1] = ap.y;
          pos[idx + 2] = ap.z;
          pos[idx + 3] = bp.x;
          pos[idx + 4] = bp.y;
          pos[idx + 5] = bp.z;
          const bi = this.idxFind(eb.id);
          if (bi >= 0) {
            pairs[pc * 2] = ni;
            pairs[pc * 2 + 1] = bi;
            pc++;
          }
          const nI = 1 - nd * 0.125;
          const nw = (ea.userData.nW + eb.userData.nW) * 0.5;
          // Bounded activation propagation: `!(< ACT_MAX)` routes both overflow AND NaN to
          // the cap, the symmetric branch floors the (rare) negative side. O(1), no allocation.
          const act = eb.userData.act + ea.userData.act * nw * 0.01;
          eb.userData.act = !(act < ACT_MAX) ? ACT_MAX : act > -ACT_MAX ? act : -ACT_MAX;
          const hue = communityOf
            ? ((communityOf(ni) & 7) * TRIBE_HUE_STEP + nw * TRIBE_NW_JITTER) % 1
            : (t * 0.04 + nw * 0.5) % 1;
          TMP_COLOR.setHSL(hue, 0.75, 0.25 + nI * 0.45);
          col[idx] = TMP_COLOR.r;
          col[idx + 1] = TMP_COLOR.g;
          col[idx + 2] = TMP_COLOR.b;
          col[idx + 3] = TMP_COLOR.r;
          col[idx + 4] = TMP_COLOR.g;
          col[idx + 5] = TMP_COLOR.b;
          wI++;
        }
      }
    }
    this.linkCount = wI;
    this.pairTotal = pc;
    if (wI > 0) {
      // Known Bug 13 fix: upload only the populated segment range, not all maxLinks*6 floats.
      this.posAttr.clearUpdateRanges();
      this.posAttr.addUpdateRange(0, wI * 6);
      this.posAttr.needsUpdate = true;
      this.colAttr.clearUpdateRanges();
      this.colAttr.addUpdateRange(0, wI * 6);
      this.colAttr.needsUpdate = true;
    }
    this.geo.setDrawRange(0, wI * 2);
  }
}
