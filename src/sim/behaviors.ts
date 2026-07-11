/**
 * The 26 per-entity behavior fields, ported faithfully from the legacy entity update loop
 * (legacy/cosmogonic-quantum-mechalogodrom.html lines 709-763) — same constants, same magic
 * numbers, same force shapes.
 *
 * Internal API (consumed only by `entities.ts`): the EntityManager owns ONE long-lived
 * {@link BehaviorEnv}, rewrites its per-frame/per-entity fields in place, and calls
 * {@link applyBehavior} once per entity per frame. Neighbor lookups go through `ctx.grid`
 * (the shared query buffer is fully consumed before any other query runs). All randomness
 * flows through the injected `ctx.rng` (contract rule 7 — never the built-in random).
 */
import * as THREE from 'three';
import { clamp, dist2, dist2XZ } from '../math/scalar';
import {
  ARENA,
  HABITAT_XZ_SCALE,
  HABITAT_Y_SCALE,
  MONOLITH_CONFIG,
  PLATFORM_FLOOR,
  SOCIAL_FLOCK_R,
  SOCIAL_GRAPHSEEK_R,
  SOCIAL_MARKET_R,
  SOCIAL_NASH_R,
  SOCIAL_SCALE,
  SOCIAL_SETUNION_R,
  SOCIAL_TYPEMORPH_R,
  socialR2,
} from './constants';
import type { Behavior } from './constants';
import type { Entity, EntityData, SimContext } from '../types';

/** Module-level scratch vectors — behavior math allocates nothing per frame. */
const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const FLOCK_R2 = socialR2(8);
const NASH_R2 = socialR2(10);
const MARKET_R2 = socialR2(12);
const TYPEMORPH_R2 = socialR2(10);
const SETUNION_SAME_R2 = socialR2(15);
const SETUNION_REPEL_R2 = socialR2(6);
const GRAPHSEEK_MIN_R2 = socialR2(1.5);

/**
 * Clamp bound for the 'lorenz' attractor samples, in attractor units (world units × 0.1).
 * The classical Lorenz attractor lives within |x|, |y| ≲ 20, z ∈ [0, 48]; inside the
 * containment arena (|x|, |z| ≤ 65, y ∈ [-9, 40]) the samples never exceed ±6.5, so the clamp
 * is invisible in normal play. Without it, an escapee's position feeds the quadratic terms
 * (`lx·lz`, `lx·ly`), whose superexponential growth outruns the 0.98 damping and the -0.005
 * containment impulse at high chaos (cm = 3): position overflows to ±Infinity, after which
 * `lx·(28 - lz) - ly` evaluates ∞ - ∞ = NaN and the containment `normalize()` computes
 * ∞ · (1 / ∞) = NaN — the NaN then spreads population-wide through the spatial hash
 * (NaN | 0 === 0 buckets NaN positions into the world-origin cell). Bounded samples keep the
 * injected acceleration finite for ANY position and steer far escapees back toward the basin.
 */
const LORENZ_BOUND = 25;

/**
 * Long-lived parameter bag for behavior handlers. The EntityManager constructs exactly one and
 * mutates the per-frame (`dt`, `t`, `cm`) and per-entity (`sp2`, `sinWF`, `cosWF`, `doTheory`)
 * fields in place, keeping the hot path allocation-free.
 */
export interface BehaviorEnv {
  /** Shared sim dependencies (grid, rng, state, quality, ...). */
  readonly ctx: SimContext;
  /** Spawn hook for the 'split' behavior — EntityManager.spawn (returns null at the cap). */
  readonly spawn: (pos: THREE.Vector3, mi: number, scale: number) => Entity | null;
  /** Frame delta in seconds (already timeScaled by the composition root). */
  dt: number;
  /** Sim elapsed time in seconds. */
  t: number;
  /** Chaos multiplier `min(chaos / 2, 3)` (legacy `cMul()`, line 639). */
  cm: number;
  /** Per-entity speed `spd * cm` (legacy `sp2`, line 703). */
  sp2: number;
  /** `sin(t * wf + ph)` for the current entity (legacy `sinWF`, line 705). */
  sinWF: number;
  /** `cos(t * wf + ph)` for the current entity (legacy `cosWF`, line 705). */
  cosWF: number;
  /**
   * Theory-behavior stagger gate. At tiers ≤ 5,000 entities this is the legacy
   * `(frame + index) % 2 === 0` (each theory entity runs its grid-query work every
   * other frame); at the ultra tier (> 5,000) the entity loop widens the stride so
   * the five neighbor-query theory behaviors run every 3rd frame instead, spacing
   * out the dominant per-frame cost wall (see EntityManager.update). The behavior
   * forces are unchanged — only the cadence at which an entity re-evaluates them.
   */
  doTheory: boolean;
  /**
   * Flock stagger gate. The 'flock' behavior issues a grid query EVERY frame (it is
   * not a theory behavior), so at 10k entities it is, on its own, ~30% of the
   * neighbor-visit budget. At tiers ≤ 5,000 this is always `true` (byte-identical to
   * the legacy every-frame flock); at the ultra tier the loop runs it every other
   * frame. 'flock' draws no rng, so this gate never perturbs the seeded stream.
   */
  doFlock: boolean;
}

type Handler = (e: Entity, u: EntityData, env: BehaviorEnv) => void;

/** Trig wander on XZ (legacy line 710). O(1). */
function drift(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += env.sinWF * 0.002 * env.sp2;
  u.vel.z += Math.cos(env.t * u.wf * 0.7 + u.ph) * 0.002 * env.sp2;
}

/** Circular acceleration around the origin (legacy line 711). O(1). */
function orbit(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  const oa = env.t * env.sp2 * 0.3 + u.ph;
  u.vel.x += Math.cos(oa) * 0.003;
  u.vel.z += Math.sin(oa) * 0.003;
}

/** Scale heartbeat (legacy line 712). O(1). */
function pulse(e: Entity, u: EntityData, env: BehaviorEnv): void {
  e.scale.setScalar(u.sc * (1 + env.sinWF * u.wa * env.cm * 2));
}

/** Chase a slowly wandering attractor point (legacy line 713). O(1). */
function swarm(e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += (Math.sin(env.t * 0.1) * 10 - e.position.x) * 0.0003 * env.sp2;
  u.vel.z += (Math.cos(env.t * 0.1) * 10 - e.position.z) * 0.0003 * env.sp2;
}

/**
 * flee's outer-damping threshold, ARENA-scaled like the containment it mirrors: legacy damped
 * past radius 55 of the 65u arena (55² = 3025); the V3 arena is 325u, so the ring starts at
 * 275 (= 55 · ARENA). Unscaled, the ×0.9/frame damping covered ~97% of the arena area and
 * froze every flee organism (audit fix, 0.6.x). dist² units.
 */
const FLEE_DAMP_XZ = 55 * ARENA * HABITAT_XZ_SCALE;
const FLEE_DAMP_Y = 55 * ARENA * HABITAT_Y_SCALE;
/**
 * hunt's arrive radius, ARENA-scaled: legacy stopped inside radius 5 (25 in dist² units) of
 * a 65u arena; the monolith ring now sits ×5 farther out. dist² units.
 */
const HUNT_STOP_R2 = 25 * ARENA * ARENA;

/** Run outward, damped outside the habitat-scaled ellipsoid (2× XZ, 3× Y). O(1). */
function flee(e: Entity, u: EntityData, env: BehaviorEnv): void {
  V1.copy(e.position)
    .normalize()
    .multiplyScalar(0.0003 * env.sp2);
  u.vel.add(V1);
  const nx = e.position.x / FLEE_DAMP_XZ;
  const ny = e.position.y / FLEE_DAMP_Y;
  const nz = e.position.z / FLEE_DAMP_XZ;
  if (nx * nx + ny * ny + nz * nz > 1) u.vel.multiplyScalar(0.9);
}

/** Seek the nearest monolith on XZ, stopping inside radius 25 (legacy 5, line 717). O(m). */
function hunt(e: Entity, u: EntityData, env: BehaviorEnv): void {
  // Infinity sentinel: the legacy 9999 (≈ radius 100 in dist² units) predates the ×5
  // monolith layout — entities farther than 100u from every monolith never updated
  // (hx, hz) from (0, 0) and steered toward the world origin instead (audit fix, 0.6.x).
  let best = Infinity;
  let hx = 0;
  let hz = 0;
  for (let k = 0; k < MONOLITH_CONFIG.length; k++) {
    const mc = MONOLITH_CONFIG[k];
    if (!mc) continue; // invariant: dense config array
    const dd = dist2XZ(e.position.x, e.position.z, mc[0], mc[1]);
    if (dd < best) {
      best = dd;
      hx = mc[0];
      hz = mc[1];
    }
  }
  if (best > HUNT_STOP_R2) {
    u.vel.x += (hx - e.position.x) * 0.0001 * env.sp2;
    u.vel.z += (hz - e.position.z) * 0.0001 * env.sp2;
  }
}

/** Chaos-gated mitosis: half-scale child of the same morphotype (legacy line 719). O(1). */
function split(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const rng = env.ctx.rng;
  if (u.age > 100 && rng() < 0.001 * env.cm) {
    const child = env.spawn(e.position, u.mi, 0.5);
    if (child) {
      child.userData.vel.set((rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2);
    }
  }
}

/** Tight XY corkscrew (legacy line 716). O(1). */
function coil(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += Math.sin(env.t * 3 * env.sp2 + u.ph) * 0.003;
  u.vel.y += Math.cos(env.t * 2 * env.sp2 + u.ph) * 0.002;
}

/** Rising rotational sweep (legacy line 714). O(1). */
function spiral(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += Math.cos(env.t * env.sp2 + u.ph) * 0.004;
  u.vel.y += Math.sin(env.t * env.sp2 * 0.5) * 0.002;
  u.vel.z += Math.sin(env.t * env.sp2 + u.ph) * 0.004;
}

/** Gentle radial outflow (legacy line 715). O(1). */
function expand(e: Entity, u: EntityData, env: BehaviorEnv): void {
  V1.copy(e.position)
    .normalize()
    .multiplyScalar(0.0005 * env.sp2);
  u.vel.add(V1);
}

/** Fast 90°-offset oscillation on XZ (legacy line 720). O(1). */
function zigzag(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += Math.sin(env.t * 8 + u.ph) * 0.004 * env.sp2;
  u.vel.z += Math.cos(env.t * 8 + u.ph + Math.PI / 2) * 0.004 * env.sp2;
}

/** Vertical sine bob (legacy line 721). O(1). */
function sine(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.y += env.sinWF * 0.003 * env.sp2;
}

/** Floor bounce with constant gravity (legacy line 722, rescaled to the platform floor). O(1). */
function bounce(e: Entity, u: EntityData, _env: BehaviorEnv): void {
  // Bounce off the platform floor. `<=` + epsilon (not the legacy `< -8`, from the old 65-unit arena):
  // containment pins entities at exactly PLATFORM_FLOOR with vel.y zeroed, so a strict `<` would never fire.
  if (e.position.y <= PLATFORM_FLOOR + 0.05) u.vel.y = Math.abs(u.vel.y) * 0.8 + 0.05;
  u.vel.y -= 0.001;
}

/** Cohere toward XZ neighbors within distance 8 (legacy lines 723-727). O(k). */
function flock(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_FLOCK_R);
  let fx = 0;
  let fz = 0;
  let fn = 0;
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    const dx = ne.position.x - e.position.x;
    const dz = ne.position.z - e.position.z;
    if (dx * dx + dz * dz < FLOCK_R2) {
      fx += dx;
      fz += dz;
      fn++;
    }
  }
  if (fn > 0) {
    u.vel.x += (fx / fn) * 0.00032 * env.sp2;
    u.vel.z += (fz / fn) * 0.00032 * env.sp2;
  }
}

/** Pure random-walk jitter (legacy line 728). O(1). */
function scatter(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  const rng = env.ctx.rng;
  u.vel.x += (rng() - 0.5) * 0.01 * env.sp2;
  u.vel.z += (rng() - 0.5) * 0.01 * env.sp2;
}

/** Tangential swirl around the world axis (legacy line 729). O(1). */
function vortex(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const vd = e.position.length() || 1;
  u.vel.x += (-e.position.z / vd) * 0.003 * env.sp2;
  u.vel.z += (e.position.x / vd) * 0.003 * env.sp2;
  u.vel.y += Math.sin(env.t + u.ph) * 0.001;
}

/** Snap toward the nearest 4-unit XZ grid point (legacy line 730). O(1). */
function lattice(e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.x += (Math.round(e.position.x / 4) * 4 - e.position.x) * 0.002 * env.sp2;
  u.vel.z += (Math.round(e.position.z / 4) * 4 - e.position.z) * 0.002 * env.sp2;
}

/** Traveling wave keyed on world X (legacy line 731). O(1). */
function wave(e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.vel.y += Math.sin(e.position.x * 0.3 + env.t * 2 + u.ph) * 0.003 * env.sp2;
  u.vel.x += env.cosWF * 0.001 * env.sp2;
}

/** Corkscrew with half-rate vertical phase (legacy line 732). O(1). */
function helix(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  const ha = env.t * env.sp2 + u.ph;
  u.vel.x += Math.cos(ha) * 0.003;
  u.vel.z += Math.sin(ha) * 0.003;
  u.vel.y += Math.sin(ha * 0.5) * 0.002;
}

/** Golden-ratio phase drift with rare random tunneling jumps (legacy line 733). O(1). */
function quantum(_e: Entity, u: EntityData, env: BehaviorEnv): void {
  u.qP += env.dt * u.wf;
  const qc = Math.sin(u.qP) * Math.cos(u.qP * 1.618);
  u.vel.x += qc * 0.003 * env.sp2;
  u.vel.z += Math.sin(u.qP * 0.7) * 0.003 * env.sp2;
  u.vel.y += Math.cos(u.qP * 1.3) * 0.002 * env.sp2;
  const rng = env.ctx.rng;
  if (rng() < 0.005 * env.cm) {
    u.vel.set((rng() - 0.5) * 0.3, (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.3);
  }
}

/**
 * Prisoner's-dilemma payoffs against XZ neighbors within distance 10; low payoff flips
 * strategy (legacy lines 735-739). O(k).
 */
function nash(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_NASH_R);
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    if (dist2XZ(e.position.x, e.position.z, ne.position.x, ne.position.z) < NASH_R2) {
      const them = ne.userData.strategy;
      u.payoff = u.strategy === 0 ? (them === 0 ? 3 : 0) : them === 0 ? 5 : 1;
      V1.copy(ne.position)
        .sub(e.position)
        .normalize()
        .multiplyScalar(them === 0 ? 0.0012 * env.sp2 : -0.0009 * env.sp2);
      u.vel.add(V1);
    }
  }
  if (u.payoff < 1.5 && env.ctx.rng() < 0.01 * env.cm) u.strategy = u.strategy === 0 ? 1 : 0;
}

/**
 * Wealth diffusion: random income, size ∝ wealth, and trade with neighbors whose wealth gap
 * exceeds 20 (legacy lines 740-744). O(k).
 */
function market(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const rng = env.ctx.rng;
  u.energy += (rng() - 0.5) * env.cm * 0.5;
  u.energy = clamp(u.energy, 0, 100);
  e.scale.setScalar(u.sc * (0.5 + u.energy / 100));
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_MARKET_R);
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    if (dist2XZ(e.position.x, e.position.z, ne.position.x, ne.position.z) < MARKET_R2) {
      const diff = ne.userData.energy - u.energy;
      if (Math.abs(diff) > 20) {
        V1.copy(ne.position)
          .sub(e.position)
          .normalize()
          .multiplyScalar(diff * 0.00005 * env.sp2);
        u.vel.add(V1);
        u.energy += diff * 0.01;
        ne.userData.energy -= diff * 0.01;
      }
    }
  }
}

/**
 * Type-theory attraction: same type pulls hard, adjacent (subtype) weakly, others repel
 * (legacy lines 745-748). O(k).
 */
function typemorph(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_TYPEMORPH_R);
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    if (dist2XZ(e.position.x, e.position.z, ne.position.x, ne.position.z) < TYPEMORPH_R2) {
      const same = u.typeId === ne.userData.typeId;
      const sub = Math.abs(u.typeId - ne.userData.typeId) === 1;
      V1.copy(ne.position)
        .sub(e.position)
        .normalize()
        .multiplyScalar((same ? 0.0024 : sub ? 0.0007 : -0.00025) * env.sp2);
      u.vel.add(V1);
    }
  }
}

/**
 * Set-theory tribal clustering (legacy lines 749-753 × colony law):
 * - soft spring toward nearest same-group kin (filament, not pure centroid blob)
 * - mild pull to kin centroid (colony cohesion)
 * - repel other groups inside the repel disk
 * O(k).
 */
function setunion(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_SETUNION_R);
  V2.set(0, 0, 0);
  let cnt = 0;
  let kinMinD2 = Infinity;
  let kinE: Entity | null = null;
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    const dd = dist2XZ(e.position.x, e.position.z, ne.position.x, ne.position.z);
    if (ne.userData.setGroup === u.setGroup && dd < SETUNION_SAME_R2) {
      V2.add(ne.position);
      cnt++;
      if (dd > 1e-8 && dd < kinMinD2) {
        kinMinD2 = dd;
        kinE = ne;
      }
    } else if (ne.userData.setGroup !== u.setGroup && dd < SETUNION_REPEL_R2) {
      V1.copy(e.position)
        .sub(ne.position)
        .normalize()
        .multiplyScalar(0.0026 * env.sp2);
      u.vel.add(V1);
    }
  }
  // Nearest-kin spring at classic chain length — tribes form strings, not one ball.
  if (kinE && Number.isFinite(kinMinD2)) {
    const optD = 4 + (u.typeId % 5);
    const d = Math.sqrt(kinMinD2);
    V1.copy(kinE.position)
      .sub(e.position)
      .normalize()
      .multiplyScalar((d - optD) * 0.002 * env.sp2);
    u.vel.add(V1);
  }
  if (cnt > 0) {
    V2.divideScalar(cnt)
      .sub(e.position)
      .normalize()
      .multiplyScalar(0.0011 * env.sp2);
    u.vel.add(V2);
  }
}

/**
 * Spring toward a preferred non-touching neighbor at ideal edge `4 + typeId`
 * (legacy lines 754-758 × tribal preference). Uses full 3D distance like legacy `d2`.
 * Preference order builds colony filaments: same setGroup → same typeId → any nearest.
 * O(k).
 */
function graphseek(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const nb = env.ctx.grid.query(e.position.x, e.position.z, SOCIAL_GRAPHSEEK_R);
  let minD2 = 9999 * SOCIAL_SCALE * SOCIAL_SCALE;
  let minE: Entity | null = null;
  let kinD2 = 9999 * SOCIAL_SCALE * SOCIAL_SCALE;
  let kinE: Entity | null = null;
  let typeD2 = 9999 * SOCIAL_SCALE * SOCIAL_SCALE;
  let typeE: Entity | null = null;
  for (let i = 0; i < nb.length; i++) {
    const ne = nb[i];
    if (!ne || ne === e) continue;
    const dd = dist2(
      e.position.x,
      e.position.y,
      e.position.z,
      ne.position.x,
      ne.position.y,
      ne.position.z,
    );
    if (dd <= GRAPHSEEK_MIN_R2) continue;
    if (dd < minD2) {
      minD2 = dd;
      minE = ne;
    }
    if (ne.userData.setGroup === u.setGroup && dd < kinD2) {
      kinD2 = dd;
      kinE = ne;
    }
    if (ne.userData.typeId === u.typeId && dd < typeD2) {
      typeD2 = dd;
      typeE = ne;
    }
  }
  const partner = kinE ?? typeE ?? minE;
  if (!partner) return;
  const d2 = kinE ? kinD2 : typeE ? typeD2 : minD2;
  // Classic ideal edge — tight filaments (not sparse beads).
  const optD = 4 + u.typeId;
  const gain = (kinE ? 0.0032 : typeE ? 0.0026 : 0.0022) * env.sp2;
  V1.copy(partner.position)
    .sub(e.position)
    .normalize()
    .multiplyScalar((Math.sqrt(d2) - optD) * gain);
  u.vel.add(V1);
}

/**
 * Scaled Lorenz-attractor accelerations with rare random kicks (legacy lines 759-763). O(1).
 * Samples are clamped to ±{@link LORENZ_BOUND} — identical inside the arena, divergence-proof
 * outside (see the bound's doc and tests/nan-stability.test.ts for the sealed NaN source).
 */
function lorenz(e: Entity, u: EntityData, env: BehaviorEnv): void {
  const lx = clamp(e.position.x * 0.1, -LORENZ_BOUND, LORENZ_BOUND);
  const ly = clamp((e.position.y + 10) * 0.1, -LORENZ_BOUND, LORENZ_BOUND);
  const lz = clamp(e.position.z * 0.1, -LORENZ_BOUND, LORENZ_BOUND);
  u.vel.x += 10 * (ly - lx) * env.dt * 0.002 * env.sp2;
  u.vel.y += (lx * (28 - lz) - ly) * env.dt * 0.001 * env.sp2;
  u.vel.z += (lx * ly - 2.667 * lz) * env.dt * 0.002 * env.sp2;
  const rng = env.ctx.rng;
  if (rng() < 0.01 * env.cm) {
    V1.set((rng() - 0.5) * 0.1, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.1);
    u.vel.add(V1);
  }
}

/** The five theory behaviors run only on staggered frames (legacy `doTheory &&` gates). */
const THEORY = new Set<Behavior>(['nash', 'market', 'typemorph', 'setunion', 'graphseek']);

/** Behavior name → handler, exhaustive over the 26-name `Behavior` union. */
const HANDLERS: Readonly<Record<Behavior, Handler>> = {
  drift,
  orbit,
  pulse,
  swarm,
  flee,
  hunt,
  split,
  coil,
  spiral,
  expand,
  zigzag,
  sine,
  bounce,
  flock,
  scatter,
  vortex,
  lattice,
  wave,
  helix,
  quantum,
  nash,
  market,
  typemorph,
  setunion,
  graphseek,
  lorenz,
};

/**
 * Apply the entity's behavior field for this frame. Theory behaviors (nash / market /
 * typemorph / setunion / graphseek) are skipped when `env.doTheory` is false — the legacy
 * `(frame + i) % 2` stagger (line 707), under which a theory entity simply idles that frame
 * (widened to every 3rd frame at the ultra tier). 'flock' is likewise skipped when
 * `env.doFlock` is false (ultra-only; always true ≤ 5,000 entities). On a skipped frame the
 * entity keeps its current velocity — the force is simply re-evaluated less often, identically
 * to the legacy theory stagger.
 *
 * Hot path: allocation-free. O(k) where k = neighbors returned by the grid query (O(1) for
 * non-neighbor behaviors; O(m) for 'hunt', m = MONOLITH_CONFIG.length).
 */
export function applyBehavior(e: Entity, env: BehaviorEnv): void {
  const u = e.userData;
  if (!env.doTheory && THEORY.has(u.beh)) return;
  if (!env.doFlock && u.beh === 'flock') return;
  HANDLERS[u.beh](e, u, env);
}
