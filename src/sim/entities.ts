/**
 * Entity lifecycle and per-frame simulation for the organism population.
 *
 * Port of the legacy entity system (legacy/cosmogonic-quantum-mechalogodrom.html lines
 * 291-356: `disposeEntity` / `remorphEntity` / `mkE`) and the full entity update loop
 * (lines 699-796): all 26 behaviors (delegated to `behaviors.ts`), neural activation decay,
 * wind physics, belly pulse, containment, auto-split, and temperature-modified death with
 * respawn-when-sparse.
 *
 * Memory discipline (legacy comments, lines 296-297): geometry is SHARED from the cache and
 * never disposed; the MeshStandardMaterial is per-entity and always disposed.
 */
import * as THREE from 'three';
import { TAU, lerp } from '../math/scalar';
import { ARENA, ARENA_Y, CONTAIN_RADIUS2, ARENA_RADIUS, RENDER_MODE_FX } from './constants';
import type { RenderMode } from './constants';
import { PHYLUM_COUNT } from './phyla';
import type { PhylumMorphType } from './phyla';
import { applyBehavior } from './behaviors';
import type { BehaviorEnv } from './behaviors';
import type { Entity, SimContext, UpdateStats } from '../types';

/** Base material parameters a {@link RenderMode} is layered on top of. */
interface RenderModeBase {
  met: number;
  rou: number;
  op: number;
  emI: number;
}

/**
 * Apply a {@link RenderMode} to a MeshStandardMaterial on top of its morphotype base
 * (CONTRACTS V7.3). `null` fx fields fall back to the base; NEON's emissive boost is the
 * INITIAL value only — `update()` re-targets it each frame so the glow holds. Used by the
 * per-mesh path here AND by the instanced renderer's pool materials. Allocation-free. O(1).
 */
export function applyRenderModeTo(
  mat: THREE.MeshStandardMaterial,
  mode: RenderMode,
  base: RenderModeBase,
): void {
  const fx = RENDER_MODE_FX[mode];
  const baseTransparent = base.op < 0.6;
  const transparent = fx.transparent ?? baseTransparent;
  mat.wireframe = fx.wireframe;
  mat.metalness = fx.metalness ?? base.met;
  mat.roughness = fx.roughness ?? base.rou;
  mat.transparent = transparent;
  mat.opacity = fx.opacity ?? (baseTransparent ? base.op : 1.0);
  mat.side = transparent ? THREE.DoubleSide : THREE.FrontSide;
  // Legacy never set depthWrite (three defaults true, even for translucent morphs); only GHOST
  // turns it off. `?? true` both preserves the legacy look AND restores it when leaving ghost.
  mat.depthWrite = fx.depthWrite ?? true;
  mat.emissiveIntensity = base.emI * fx.emissiveBoost;
  mat.needsUpdate = true;
}

/** Scratch vector for velocity integration / containment impulses (no per-frame allocation). */
const MOVE = new THREE.Vector3();
/** Scratch vector for spawn positions — `spawn()` copies it, so reuse is safe. */
const SPAWN_AT = new THREE.Vector3();
/** Distinct-morphotype scratch set — cleared at the top of every `update()` call. */
const MORPHS_SEEN = new Set<number>();
/** Reused stats instance returned by `update()` — copy the fields if you need to retain them. */
const STATS: UpdateStats = { energy: 0, morphCount: 0 };

/**
 * Owns the organism population: spawning, true morphogenesis, per-frame behavior + physics,
 * and death. The composition root constructs one, seeds it (legacy boots with 300 organisms —
 * call `reset(300)`), and calls `update(dt, t)` once per frame after the grid rebuild.
 */
export class EntityManager {
  /** Live entities in spawn order. Index order is meaningful to the sorting field. */
  readonly list: Entity[] = [];
  /**
   * Live population per phylum (CONTRACTS V3.2/V3.5), recounted by every
   * `update()`. REUSED Float32Array — telemetry/observatory copy what they keep.
   * Unaffiliated (legacy, phylum -1) organisms are not counted.
   */
  readonly phylumCounts = new Float32Array(PHYLUM_COUNT);
  /**
   * Death→ground feedback hook (CONTRACTS V2 frame pipeline): invoked with the dying
   * entity's world x/z exactly once per disposal routed through `disposeAt()` — which
   * covers BOTH the age-death branch of `update()` and external consumers like shoggoth
   * consumption. NOT fired by `reset()`: mass disposal is a genesis event, not a death.
   * The composition root wires this to ReactionDiffusionSystem.perturb; null disables.
   * Mutable public field by design (audit fix A). Allocation-free to invoke.
   */
  onDeath: ((x: number, z: number) => void) | null = null;
  private readonly ctx: SimContext;
  /** Single long-lived behavior env; per-entity fields are rewritten in `update()` (no alloc). */
  private readonly env: BehaviorEnv;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.env = {
      ctx,
      spawn: (pos, mi, scale) => this.spawn(pos, mi, scale),
      dt: 0,
      t: 0,
      cm: 0,
      sp2: 0,
      sinWF: 0,
      cosWF: 0,
      doTheory: false,
      doFlock: true,
    };
  }

  /**
   * Create one organism of morphotype `mi % 100` (legacy `mkE`, lines 328-355). Returns null
   * when the population is at `quality.maxEntities`. A null `pos` means the legacy random spawn
   * volume (x/z ∈ ±35, y ∈ [-8, 22)); `pos` is copied, so passing a scratch vector is safe.
   * O(1).
   */
  spawn(pos: THREE.Vector3 | null, mi: number, scale = 1): Entity | null {
    const ctx = this.ctx;
    if (this.list.length >= ctx.quality.maxEntities) return null;
    const morphCount = ctx.morphs.length;
    if (morphCount === 0) return null; // defensive: empty taxonomy
    const m: PhylumMorphType | undefined = ctx.morphs[mi % morphCount];
    if (!m) return null; // invariant: morphs is dense — defensive only
    const geo = ctx.geos[m.gi];
    if (!geo) return null; // invariant: gi < geos.length by construction
    const rng = ctx.rng;
    const s = lerp(m.srMin, m.srMax, rng()) * scale;
    const isTransparent = m.op < 0.6;
    const mat = new THREE.MeshStandardMaterial({
      color: m.col,
      emissive: m.em,
      emissiveIntensity: m.emI,
      metalness: m.met,
      roughness: m.rou,
      transparent: isTransparent,
      opacity: isTransparent ? m.op : 1.0,
      side: isTransparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    // Layer the active render style on top of the morphotype base (CONTRACTS V7.3).
    // For SOLID this re-sets identical values, so the legacy look is byte-identical.
    applyRenderModeTo(mat, ctx.state.renderMode, m);
    const mesh = new THREE.Mesh(geo, mat) as Entity;
    mesh.scale.setScalar(s);
    const phylum = m.phylum ?? -1;
    if (pos) {
      mesh.position.copy(pos);
    } else if (phylum >= 0) {
      // V3.2 home-sector bias: phylum p spawns in its angular wedge of the
      // arena (matching titan p's patrol angle), radius 12%..67% of the rim.
      const ang = (phylum / PHYLUM_COUNT) * TAU + (rng() - 0.5) * 0.9;
      const rad = (0.12 + rng() * 0.55) * ARENA_RADIUS;
      mesh.position.set(Math.cos(ang) * rad, rng() * 30 - 8, Math.sin(ang) * rad);
    } else {
      // Legacy random volume × ARENA (V3.1 spawn-volume scale).
      mesh.position.set((rng() - 0.5) * 70 * ARENA, rng() * 30 - 8, (rng() - 0.5) * 70 * ARENA);
    }
    if (ctx.quality.instanced) {
      // V3.1: pooled rendering — the data mesh NEVER joins the scene graph; the
      // InstancedEntityRenderer mirrors it per frame. updateMatrix() is manual.
      mesh.matrixAutoUpdate = false;
    } else {
      mesh.castShadow = ctx.quality.shadows && this.list.length < 120;
    }
    mesh.userData = {
      mi: mi % morphCount,
      vel: new THREE.Vector3((rng() - 0.5) * 0.1, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.1),
      age: 0,
      life: 200 + rng() * 900,
      ph: rng() * TAU,
      sc: s,
      beh: m.beh,
      spd: m.spd,
      wf: m.wf,
      wa: m.wa,
      sT: 300 + rng() * 500,
      belly: 0,
      sortVal: rng() * 100,
      nW: rng(),
      act: 0,
      qP: rng() * TAU,
      energy: 50 + rng() * 50,
      strategy: rng() < 0.5 ? 0 : 1,
      typeId: Math.floor(rng() * 5),
      setGroup: Math.floor(rng() * 4),
      payoff: 0,
      phylum,
      beh2: m.beh2 ?? null,
    };
    if (!ctx.quality.instanced) ctx.scene.add(mesh);
    this.list.push(mesh);
    return mesh;
  }

  /**
   * Remove the entity from the scene and dispose its per-entity material (legacy
   * `disposeEntity`, lines 294-302). The geometry is SHARED from the cache — never disposed.
   * Does NOT remove the entity from `list`; use `disposeAt()` for that. O(1).
   */
  dispose(e: Entity): void {
    // Instanced mode: the mesh was never added — remove() is a safe no-op there.
    this.ctx.scene.remove(e);
    e.material.dispose();
  }

  /**
   * Dispose the entity at `index` and remove it from `list`, preserving order (the sorting
   * field reads positional order, matching the legacy `splice`). Fires {@link onDeath} (when
   * wired) with the entity's x/z — exactly once per disposal, after the list is consistent,
   * so the callback may safely spawn. Allocation-free ordered removal. O(n − index).
   */
  disposeAt(index: number): void {
    const list = this.list;
    const e = list[index];
    if (!e) return;
    this.dispose(e);
    for (let j = index + 1; j < list.length; j++) {
      const next = list[j];
      if (next) list[j - 1] = next; // invariant: j < length ⇒ defined
    }
    list.length -= 1;
    const onDeath = this.onDeath;
    if (onDeath) onDeath(e.position.x, e.position.z);
  }

  /**
   * Dispose the entire population, then respawn `count` organisms with random morphotypes at
   * random positions (legacy `rSim`, line 592 — resetting chaos/mutations/algoStep/graphs is
   * the composition root's job). O(n + count).
   */
  reset(count: number): void {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e) this.dispose(e);
    }
    list.length = 0;
    const rng = this.ctx.rng;
    const morphCount = Math.max(1, this.ctx.morphs.length);
    for (let i = 0; i < count; i++) this.spawn(null, Math.floor(rng() * morphCount));
  }

  /**
   * Advance every organism one frame (legacy entity loop, lines 699-796): behavior field,
   * neural activation decay, chaos jitter + wind physics + damping + integration, belly pulse,
   * containment, auto-split, and temperature-modified death with respawn-when-sparse.
   *
   * Returns a REUSED stats object (copy the fields if retained): `energy` = Σ|vel| over the
   * population, `morphCount` = distinct live morphotype indices.
   *
   * Hot path: allocation-free except event-driven `spawn()` calls (entity creation inherently
   * allocates). O(n·k) where n = entities and k = average neighbors per grid query.
   */
  update(dt: number, t: number): UpdateStats {
    const ctx = this.ctx;
    const state = ctx.state;
    const rng = ctx.rng;
    const list = this.list;
    const maxEntities = ctx.quality.maxEntities;
    const cm = Math.min(state.chaos / 2, 3); // legacy cMul(), line 639
    const windX = state.wind.x * cm * 0.0005; // legacy windScale folded in (line 700)
    const windZ = state.wind.z * cm * 0.0005;
    const tMod = state.temperature < 0 ? 0.7 : state.temperature > 30 ? 1.3 : 1.0;
    const frame = state.frame;
    const env = this.env;
    env.dt = dt;
    env.t = t;
    env.cm = cm;
    // Ultra-tier neighbor-query throttle (CONTRACTS V3.6 — calibration in
    // docs/BENCHMARKS.md "Ultra-tier 10k optimization"). The five theory behaviors and
    // 'flock' dominate the per-frame cost wall at 10k (≈292k neighbor visits/frame, with
    // theory at ~205k and flock alone at ~88k). For maxEntities ≤ 5,000 (phone/laptop/
    // desktop) this resolves to the LEGACY stride 2 and flock-every-frame — byte-identical
    // streams and visuals, so every existing test and determinism property is untouched.
    // Above 5,000 (ultra only) the theory stride widens to 3 and flock staggers to every
    // other frame, cutting the dominant neighbor work ~⅓ and ~½ respectively. The forces
    // are identical; only an entity's re-evaluation cadence changes (exactly how the legacy
    // theory stagger has always worked). Neither gate touches the rng draw count at ≤5,000.
    const ultra = maxEntities > 5000;
    const theoryStride = ultra ? 3 : 2;
    const flockEvery = ultra ? 2 : 1;
    // Adaptive steady-state target: ORGANIC growth (auto-split, sparse respawn) stops here so
    // an idle ultra world settles below the 10k ceiling. Equals maxEntities on every other tier
    // (target===max ⇒ byte-identical to legacy). The hard spawn cap inside spawn() still uses
    // maxEntities, so user bursts/apocalypse can transiently exceed the target up to 10k, after
    // which the lack of auto-split lets the population relax back toward `target` (CONTRACTS V4.5).
    const target = Math.min(ctx.quality.targetEntities, maxEntities);
    MORPHS_SEEN.clear();
    this.phylumCounts.fill(0);
    const phylumCounts = this.phylumCounts;
    let energy = 0;
    // Render-mode emissive coupling (CONTRACTS V7.3): the per-frame emissive target scales by
    // the mode's boost so NEON's self-glow holds against the decay below. 1 for every other
    // mode ⇒ this loop stays byte-identical outside NEON.
    const emiBoost = RENDER_MODE_FX[state.renderMode].emissiveBoost;
    const emiCap = 2.5 * emiBoost;

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const u = e.userData;
      u.age += dt * 30;
      MORPHS_SEEN.add(u.mi);
      if (u.phylum >= 0 && u.phylum < PHYLUM_COUNT) {
        phylumCounts[u.phylum] = (phylumCounts[u.phylum] ?? 0) + 1;
      }

      const sp2 = u.spd * cm;
      const wfph = t * u.wf + u.ph;
      const sinWF = Math.sin(wfph);
      const cosWF = Math.cos(wfph);
      env.sp2 = sp2;
      env.sinWF = sinWF;
      env.cosWF = cosWF;
      // Theory-behavior stagger (legacy line 707, stride 2 ≤ 5,000 entities; stride 3 ultra).
      env.doTheory = (frame + i) % theoryStride === 0;
      // Flock stagger: every frame ≤ 5,000 (legacy), every other frame at ultra.
      env.doFlock = flockEvery === 1 || (frame + i) % flockEvery === 0;
      // V3.2 OUTLIER blend: a wildcard with a second behavior runs it on the odd
      // TWO-FRAME block (((frame+i) >> 1) & 1) — temporal 50/50 blending,
      // allocation-free (swap, dispatch, restore). The block parity is decoupled
      // from the stagger parity on purpose: the original raw (frame+i) & 1 gate
      // was the exact complement of the stride-2 theory gate above, so a theory
      // second behavior (nash/market/typemorph/setunion/graphseek — 5 of 26) was
      // a guaranteed no-op, and flock-beh2 likewise at ultra (audit fix, 0.6.x).
      // Within a beh2 block the (frame+i) parity still alternates, so blended
      // theory/flock work keeps its contracted stagger cadence at 50% share.
      // Members (beh2 = null) take the legacy path.
      const b2 = u.beh2;
      if (b2 !== null && (((frame + i) >> 1) & 1) === 1) {
        const b1 = u.beh;
        u.beh = b2;
        applyBehavior(e, env);
        u.beh = b1;
      } else {
        applyBehavior(e, env);
      }

      // Neural activation decay (legacy lines 766-768).
      u.act *= 0.95;
      u.act += cm * 0.01 * sinWF;
      if (u.act > 1) {
        e.material.emissiveIntensity = Math.min(e.material.emissiveIntensity + 0.1, emiCap);
      } else {
        const m = ctx.morphs[u.mi];
        if (m)
          e.material.emissiveIntensity = lerp(
            e.material.emissiveIntensity,
            m.emI * emiBoost,
            dt * 2,
          );
      }

      // Chaos jitter + wind physics, damping, integration (legacy lines 771-776).
      u.vel.x += (rng() - 0.5) * 0.003 * cm + windX;
      u.vel.y += (rng() - 0.5) * 0.0015 * cm;
      u.vel.z += (rng() - 0.5) * 0.003 * cm + windZ;
      u.vel.multiplyScalar(0.98);
      MOVE.copy(u.vel).multiplyScalar(dt * 60);
      e.position.add(MOVE);
      e.rotation.x += sinWF * 0.012 * sp2 * 0.4;
      e.rotation.y += cosWF * 0.01 * sp2 * 0.35;
      e.rotation.z += Math.sin(wfph + 1) * 0.007 * sp2;

      // Belly pulse — post-split digestion visual (legacy line 779).
      if (u.belly > 0) {
        u.belly -= dt * 30;
        e.material.emissiveIntensity = 1.5 + Math.sin(t * 8) * 0.5;
        e.scale.x = u.sc * (1 + Math.sin(t * 6) * 0.4);
        e.scale.y = u.sc * (1 + Math.cos(t * 5) * 0.3);
        e.scale.z = u.sc;
        if (u.belly <= 0) e.scale.setScalar(u.sc);
      }

      // Containment — squared distance, no sqrt (legacy 4225 × ARENA²; V3.1).
      if (e.position.lengthSq() > CONTAIN_RADIUS2) {
        MOVE.copy(e.position).normalize().multiplyScalar(-0.005);
        u.vel.add(MOVE);
      }
      if (e.position.y < -9) u.vel.y += 0.01;
      if (e.position.y > 40 * ARENA_Y) u.vel.y -= 0.005;
      energy += u.vel.length();

      // Auto-split (legacy lines 787-788). sT re-arms only on a successful roll, like legacy.
      // Organic growth is gated by the adaptive `target` (= maxEntities on every tier except
      // ultra): an idle world stops splitting at the target instead of climbing to the ceiling.
      // At target === maxEntities (≤5,000) the short-circuited `rng()` is drawn on exactly the
      // legacy frames, so the seeded stream is byte-identical.
      u.sT -= dt * 30 * cm;
      if (u.sT <= 0 && list.length < target && rng() < 0.06) {
        u.sT = 300 + rng() * 500;
        SPAWN_AT.set(
          e.position.x + (rng() - 0.5) * 2,
          e.position.y + rng(),
          e.position.z + (rng() - 0.5) * 2,
        );
        this.spawn(SPAWN_AT, (u.mi + Math.floor(rng() * 5)) % ctx.morphs.length, 0.7);
      }

      // Temperature-modified death + respawn-when-sparse (legacy lines 790-795).
      // onDeath fires inside disposeAt — exactly once per death, never doubled here.
      if (u.age > u.life * tMod) {
        const ex = e.position.x;
        const ez = e.position.z;
        this.disposeAt(i);
        // Sparse floor scales with the adaptive target (legacy 100 of 1000 = 10%; = maxEntities
        // on tiers ≤ 5,000, so byte-identical there). Keeps "repopulate when sparse" proportional
        // to the steady-state target rather than the 10k ceiling.
        if (list.length < Math.max(100, target * 0.1)) {
          for (let r = 0; r < 3; r++) {
            SPAWN_AT.set(
              (rng() - 0.5) * 40 * 2.5 + ex * 0.3,
              rng() * 3,
              (rng() - 0.5) * 40 * 2.5 + ez * 0.3,
            );
            this.spawn(SPAWN_AT, Math.floor(rng() * ctx.morphs.length));
          }
        }
      }
    }

    STATS.energy = energy;
    STATS.morphCount = MORPHS_SEEN.size;
    return STATS;
  }

  /**
   * True morphogenesis (legacy `remorphEntity`, lines 304-326): swap the shared-geometry
   * reference and rewrite the per-entity material in place — cheaper than dispose + respawn
   * because the mesh and scene slot are reused. Zero allocation. O(1).
   */
  remorph(e: Entity, mi: number): void {
    const ctx = this.ctx;
    const morphCount = ctx.morphs.length;
    if (morphCount === 0) return; // defensive: empty taxonomy
    const m: PhylumMorphType | undefined = ctx.morphs[mi % morphCount];
    if (!m) return; // invariant: morphs is dense — defensive only
    const geo = ctx.geos[m.gi];
    if (geo) e.geometry = geo; // shared from the cache — swap only, never dispose
    const mat = e.material;
    mat.color.copy(m.col);
    mat.emissive.copy(m.em);
    // metalness/roughness/transparent/opacity/side/wireframe/emissive + depthWrite are all set
    // by applyRenderModeTo on top of the morphotype base (CONTRACTS V7.3).
    applyRenderModeTo(mat, ctx.state.renderMode, m);
    const u = e.userData;
    u.mi = mi % morphCount;
    u.beh = m.beh;
    u.spd = m.spd;
    u.wf = 0.3 + ctx.rng() * 6;
    u.wa = 0.03 + ctx.rng() * 0.5;
    u.phylum = m.phylum ?? -1; // true morphogenesis crosses phylum lines (V3.2)
    u.beh2 = m.beh2 ?? null;
    e.scale.setScalar(u.sc);
  }

  /**
   * Apply a {@link RenderMode} to every live entity's material (CONTRACTS V7.3, supersedes the
   * legacy `tW` wireframe toggle, line 594). `ctx.state.renderMode` is owned by the composition
   * root; spawns and remorphs read it for new/rewritten materials. Each material is rebased on
   * its morphotype so switching back to SOLID restores the exact base look. O(n).
   */
  setRenderMode(mode: RenderMode): void {
    const ctx = this.ctx;
    const morphCount = ctx.morphs.length;
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const m = morphCount > 0 ? ctx.morphs[e.userData.mi % morphCount] : undefined;
      if (m) applyRenderModeTo(e.material, mode, m);
    }
  }

  /**
   * Back-compat alias (CONTRACTS V7.3): the old binary wireframe toggle maps onto the new
   * render-mode cycle. O(n).
   */
  setWireframe(on: boolean): void {
    this.setRenderMode(on ? 'wire' : 'solid');
  }
}
