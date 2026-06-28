/**
 * Cosmological singularities (CONTRACTS V7.4) — the chaos control's repertoire of real
 * cosmology, summoned one at a time at a point in the arena. Each is a deterministic
 * force-field + a self-built visual rig that auto-expires; the per-frame update is
 * allocation-free (module scratch only), the rig is built on `summon` (a user event) and
 * torn down on expiry/`dispose`.
 *
 * The five effects, grounded in the physics the philosophy demands (real math under every
 * effect):
 * - **ENTROPY** — the 2nd law / heat death: velocities are thermalized (seeded random kicks),
 *   emissive fades toward a uniform grey, and the world's heat (chaos) rises. Disorder wins.
 * - **BLACKHOLE** — a gravitational sink: an r⁻² pull toward the singularity (capped near the
 *   centre), an event horizon past which organisms are consumed (disposed, scarring the RD
 *   ground), and a heated accretion disk of infalling matter.
 * - **WHITEHOLE** — the time-reversed black hole (the other side of the Kruskal extension):
 *   nothing may ENTER. An r⁻² REPULSION ejects matter; anything that reaches the horizon is
 *   thrown back out past it. Cosmic censorship made visible.
 * - **GREYHOLE** — the speculative evaporating/intermediate hole: it alternates absorb↔emit
 *   pulses (a black hole leaking its mass back, Hawking-style), neither fully consuming nor
 *   fully ejecting.
 * - **STRANGESTAR** — a quark/strange-matter star (Bodmer–Witten): a contact-conversion front
 *   that "infects" nearby organisms, recolouring them into a strange-matter palette — the
 *   strangelet chain reaction spreading as the population drifts through the zone.
 *
 * Determinism: every random draw is from the injected `ctx.rng` — the per-particle orbital
 * seeds at SUMMON (a user event) and the ENTROPY kicks; the force fields and the per-frame
 * particle orbits are pure trigonometry/vector math. Same seed + same summon/update sequence ⇒
 * the same evolution. The CONSTRUCTOR draws NO rng and builds NO scene objects, so the system
 * is boot-stream-neutral (the integrator can place its construction anywhere).
 */
import * as THREE from 'three';
import { TAU } from '../math/scalar';
import { ARENA_MID } from './constants';
import type { Entity, QualityTier, SimContext } from '../types';
import type { EntityManager } from './entities';

/** The five summonable singularity kinds, in chaos-control cycle order. */
export const SINGULARITY_KINDS = [
  'entropy',
  'blackhole',
  'whitehole',
  'greyhole',
  'strangestar',
] as const;

/** One cosmological effect. */
export type SingularityKind = (typeof SINGULARITY_KINDS)[number];

/** Lifetime of a summoned singularity (seconds). */
const DURATION = 9;
/** Force-field reach in world units (beyond this, entities are unaffected). */
const REACH = 95 * ARENA_MID;
const REACH2 = REACH * REACH;
/** Event-horizon radius (black/white/grey holes) in world units. */
const HORIZON = 9 * ARENA_MID;
/** Accretion-disk radius. */
const DISK_R = 17 * ARENA_MID;
/** Strange-matter conversion radius. */
const CONV_R = 32 * ARENA_MID;
const CONV_R2 = CONV_R * CONV_R;
/** Gravitational constant (tuned for a strong but bounded rush) and the per-frame accel cap. */
const G = 2200;
const ACCEL_MAX = 6;
/** F-HOLES: the big roaming beings feel a gentler share of the field so colossi glide, not snap. */
const BODY_GAIN = 0.4;
/** Max organisms a black hole consumes per frame (keeps mass die-off off the budget cliff). */
const MAX_CONSUME = 25;
/** Accretion/fountain particle count by tier (instanced = laptop+). Independent of population. */
const PARTICLES_HI = 1400;
const PARTICLES_LO = 350;

/** Tier-scaled particle budget — ultra/mega keep full YOLO fidelity (no instanced gate). */
function particleBudget(tier: QualityTier): number {
  switch (tier) {
    case 'mega':
      return 6200;
    case 'ultra':
      return 4000;
    case 'desktop':
      return 2400;
    case 'laptop':
      return PARTICLES_HI;
    default:
      return PARTICLES_LO;
  }
}

function particleSizeMul(tier: QualityTier): number {
  switch (tier) {
    case 'mega':
      return 2.35;
    case 'ultra':
      return 1.85;
    case 'desktop':
      return 1.4;
    default:
      return 1;
  }
}
/** Per-particle radial drift speed (infall for black holes, fountain for white). */
const PARTICLE_DRIFT = 14 * ARENA_MID;
/** Keplerian angular-rate gain (inner particles orbit faster: ω ∝ √(G/ρ³)). */
const PARTICLE_OMEGA_K = 3;
/** Additive particle tint per kind. */
const PARTICLE_COLOR: Readonly<Record<SingularityKind, number>> = {
  entropy: 0x4a3a30,
  blackhole: 0xffaa33,
  whitehole: 0x9fdcff,
  greyhole: 0xa0a8b8,
  strangestar: 0x7cff5a,
};

/** Module scratch — update() and summon() never allocate per frame. */
const V = new THREE.Vector3();
/**
 * Scratch list of horizon-crossers a black/grey hole will consume THIS frame. The force pass
 * collects them (capped at {@link MAX_CONSUME}); the disposal runs afterwards so `disposeAt`'s
 * left-shift never invalidates an index mid-pass. Length is reset to 0 each call, so it retains
 * at most {@link MAX_CONSUME} references between frames (≤ 25 entities — negligible). */
const CONSUME: Entity[] = [];
/**
 * Membership view of {@link CONSUME} used by the disposal pass: a single reverse scan of the live
 * list disposes any member (O(n) once + the disposeAt shifts), replacing a per-victim O(n)
 * `indexOf` (which made disposal O(n·consumeCap) — the consuming hole's real ceiling at 50k). The
 * Set lookup also IS the liveness guard: a victim no longer in `list` (a stale grid or a same-frame
 * cross-system disposal) is simply never encountered, so it can never be double-disposed. */
const CONSUME_SET = new Set<Entity>();
/** Heat-death dark target for the ENTROPY colour fade — a deep ash, not washed grey. */
const GREY = new THREE.Color(0.12, 0.10, 0.08);
/** V59 gravitational redshift/blueshift targets — infalling light reddens, ejected light blueshifts. */
const REDSHIFT = new THREE.Color(1.0, 0.18, 0.05);
const BLUESHIFT = new THREE.Color(0.35, 0.66, 1.0);
/** V59 time-dilation reach (multiples of the horizon) — matter crawls + light shifts within this. */
const WARP_R_MULT = 4;

/**
 * V7.5 falsifiable field parameters (world units), frozen + exported for tests and audits. These
 * are the EXACT constants the O(k) force passes read, surfaced so a regression test can assert the
 * r⁻² law, the REACH/HORIZON/CONV_R geometry, and the consume cap without re-deriving magic
 * numbers. Read-only; nothing mutates them.
 */
export const SINGULARITY_FIELD = {
  /** Gravitational force-field reach (entities beyond are unaffected). */
  REACH,
  /** {@link REACH} squared (the 3D sphere test). */
  REACH2,
  /** Event-horizon radius (consume/eject boundary for black/white/grey holes). */
  HORIZON,
  /** Strange-matter contact-conversion radius. */
  CONV_R,
  /** {@link CONV_R} squared. */
  CONV_R2,
  /** Time-dilation/redshift reach as a multiple of {@link HORIZON}. */
  WARP_R_MULT,
  /** Gravitational constant (Σ accel = min(G/r², {@link ACCEL_MAX})). */
  G,
  /** Per-frame radial acceleration cap. */
  ACCEL_MAX,
  /** Max organisms a black hole consumes per frame. */
  MAX_CONSUME,
} as const;
/**
 * V60 screen-lens strength per kind (signed): + PINCHES light inward (absorbers), − BULGES it out
 * (emitters). Fed to the post-FX gravitational-lens pass, scaled by the lifetime fade. Tuned so the
 * black hole reads as a strong well and the white hole as a bright bulge without nausea.
 */
const LENS_BASE: Readonly<Record<SingularityKind, number>> = {
  entropy: -0.1,
  blackhole: 0.34,
  whitehole: -0.3,
  greyhole: 0.24,
  strangestar: 0.16,
};

/**
 * Internal rig handle — the meshes a summon builds, kept so update() can animate them and
 * dispose() can free them. `primary` is the focal body, `ring` the optional disk/halo, and
 * `points`/`pState` the Keplerian accretion-disk / matter-fountain particle cloud (V7-beyond).
 */
interface Rig {
  group: THREE.Group;
  primary: THREE.Mesh;
  primaryMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  ring: THREE.Mesh | null;
  ringMat: THREE.MeshBasicMaterial | null;
  points: THREE.Points | null;
  pointsMat: THREE.PointsMaterial | null;
  /** Per-particle orbital state [rho, theta, y] × N (drawn from rng at summon, evolves). */
  pState: Float32Array | null;
  /** V59: extra additive glow meshes (photon ring + halo shell) — animated + disposed together. */
  extras: THREE.Mesh[];
  extraMats: THREE.Material[];
}

/**
 * Owns the currently-summoned singularity (at most one at a time — a new summon replaces the
 * old). Constructed once by the composition root; the chaos control drives `summon`, and the
 * frame loop calls `update(dt, t)`.
 */
export class SingularitySystem {
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  private readonly scene: THREE.Scene;

  private _kind: SingularityKind | null = null;
  private life = 0;
  private rig: Rig | null = null;
  private readonly center = new THREE.Vector3();
  /** Organisms this singularity has consumed (black hole) — surfaced for audits. */
  private _consumed = 0;
  /** V60 signed screen-lens strength for the active kind × lifetime fade (0 when none). */
  private _lens = 0;

  constructor(ctx: SimContext, entities: EntityManager) {
    this.ctx = ctx;
    this.entities = entities;
    this.scene = ctx.scene;
  }

  /** Is a singularity currently active? */
  get active(): boolean {
    return this._kind !== null;
  }

  /** The active kind, or null when none is summoned. */
  get kind(): SingularityKind | null {
    return this._kind;
  }

  /** Organisms consumed by the current/last black hole (read after a summon for audits). */
  get consumed(): number {
    return this._consumed;
  }

  /**
   * V60: signed strength for the post-FX gravitational lens (+pinch absorbers / −bulge emitters),
   * already scaled by the lifetime fade; 0 when nothing is summoned. The integrator feeds it to the
   * {@link Engine.setLens} pass together with {@link lensCenter}. O(1).
   */
  get lensStrength(): number {
    return this._lens;
  }

  /**
   * V60: copy the active singularity's world centre into `out` for screen-projection by the lens
   * pass. Returns false (and leaves `out` untouched) when nothing is summoned. Allocation-free. O(1).
   */
  lensCenter(out: THREE.Vector3): boolean {
    if (this._kind === null) return false;
    out.copy(this.center);
    return true;
  }

  /**
   * F-HOLES: the active singularity's radial velocity delta at an arbitrary world point, so the
   * BIG roaming beings (shoggoths, titans) and other massive bodies feel the hole — not only the
   * organisms. Writes the per-frame delta into `out` and returns true when active and in reach.
   * Mirrors the organism field (r⁻² toward/away from the centre, capped at {@link ACCEL_MAX}) at a
   * gentler {@link BODY_GAIN} so the colossi drift majestically instead of snapping. Pull for the
   * absorbers, push for the emitters; the entropy heat-death gives a gentle outward swell. Draws no
   * rng and allocation-free (writes the caller's `out`), so it never perturbs the seeded stream.
   */
  bodyForce(px: number, py: number, pz: number, dt: number, out: THREE.Vector3): boolean {
    const kind = this._kind;
    if (kind === null) {
      out.set(0, 0, 0);
      return false;
    }
    const c = this.center;
    out.set(c.x - px, c.y - py, c.z - pz); // vector toward the centre
    const r2 = out.lengthSq();
    if (r2 > REACH2 || r2 < 1e-6) {
      out.set(0, 0, 0);
      return false;
    }
    let sign = 1; // blackhole / absorber pull is the default
    if (kind === 'whitehole') sign = -1;
    else if (kind === 'greyhole')
      sign = 0.6; // averages toward absorb; organisms get the pulse
    else if (kind === 'strangestar')
      sign = 0.4; // a mild draw into the conversion zone
    else if (kind === 'entropy') sign = -0.3; // heat-death swell — shove the colossi gently apart
    const r = Math.sqrt(r2);
    const accel = Math.min(G / r2, ACCEL_MAX) * sign * BODY_GAIN;
    out.multiplyScalar((accel * dt) / r); // out (toward centre) → unit × accel × dt
    return true;
  }

  /**
   * Summon a singularity of `kind` at world position `pos` (a new summon replaces any active
   * one). Builds the visual rig (incl. the seeded particle cloud — a fixed number of `ctx.rng`
   * draws, like burst/split) and arms the force field for {@link DURATION} seconds. Allocation
   * happens here (meshes + particle buffers) — never in {@link update}. O(particles).
   */
  summon(kind: SingularityKind, pos: THREE.Vector3): void {
    this.disposeRig();
    this._kind = kind;
    this.life = DURATION;
    this._consumed = 0;
    this.center.copy(pos);
    this.rig = this.buildRig(kind);
    this.rig.group.position.copy(pos);
    this.scene.add(this.rig.group);
  }

  /** Tear down the active singularity immediately (used on genesis reset). */
  dispose(): void {
    this.disposeRig();
    this._kind = null;
    this.life = 0;
    this._lens = 0;
  }

  /**
   * Advance the active singularity: apply its force field to the population, animate the rig,
   * and expire after {@link DURATION}. No-op when inactive. Allocation-free. The hole/strange
   * passes are O(cells + k) where k = entities within REACH/CONV_R. Above the 10k mega-tier knee
   * the shared hash holds AREAL density constant (EntityManager.densityScale = √(maxEntities/10000)
   * spreads the arena), so k — and the cost — stop scaling with n through the 50k ceiling; below 10k
   * densityScale clamps to 1, so k rises with n but stays ≤ the removed O(n) full-list sweep (and the
   * absolute cost there is small). Either way the EXACT per-frame physics runs at every tier. Entropy
   * is a global heat-death and stays an O(n) strided pass (see {@link applyEntropy}). O(1) inactive.
   */
  update(dt: number, t: number): void {
    if (this._kind === null || !this.rig) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.disposeRig();
      this._kind = null;
      this._lens = 0;
      return;
    }
    const fade = this.life < 1 ? this.life : 1; // ramp out over the last second
    // V60: drive the screen-lens strength (signed per kind × fade) for the post-FX pass.
    this._lens = LENS_BASE[this._kind] * fade;
    switch (this._kind) {
      case 'entropy':
        this.applyEntropy(dt);
        break;
      case 'blackhole':
        this.applyHole(dt, +1, MAX_CONSUME);
        break;
      case 'whitehole':
        this.applyHole(dt, -1, 0);
        break;
      case 'greyhole': {
        // Alternating absorb (+) / emit (−) on a slow pulse — the leaking hole. The absorb
        // half-cycle CONSUMES at a quarter of a black hole's rate (audit fix: the old
        // consume=false forced the eject branch, so a greyhole could never retain anything —
        // its "absorb" was in fact fully ejecting); the emit half ejects like a white hole.
        const absorbing = Math.sin(t * 1.3) >= 0;
        this.applyHole(dt, absorbing ? +1 : -1, absorbing ? MAX_CONSUME >> 2 : 0);
        break;
      }
      case 'strangestar':
        this.applyStrange();
        break;
    }
    this.animateRig(dt, t, fade);
  }

  /**
   * ENTROPY: thermalize velocities, grey the glow, raise the heat. Strided (i += 2) for budget.
   *
   * INTENTIONALLY a GLOBAL O(n) pass — NOT converted to the O(k) reach query the holes use, by
   * design (V7.5 adversarial-audit ruling, two dimensions concurring):
   * - PHYSICS: heat death is a global thermodynamic end-state, not a finite-speed propagating front;
   *   the expanding translucent shell ({@link animateRig}) is a stylized RIG, not a force boundary.
   *   The global REACH of the effect is the world-heat coupling (`s.chaos`), which weather, economy,
   *   quantum cadence and entity jitter all read — so entropy is felt everywhere via chaos, while the
   *   per-body kick is the local face of the same global process.
   * - DETERMINISM: the `i += 2` stride + the per-visit `rng()` draws are part of the seeded stream.
   *   Bounding the thermalization to a shell would change WHICH and HOW MANY bodies draw from
   *   `ctx.rng` each frame, perturbing the stream for every entropy-active replay. Global+strided is
   *   the determinism-preserving correct state. (Cost is ~5 ms/frame at 50k — a documented, bounded,
   *   transient-effect tradeoff, not a scaling defect.)
   */
  private applyEntropy(dt: number): void {
    const rng = this.ctx.rng;
    const list = this.entities.list;
    const mag = 0.05;
    for (let i = 0; i < list.length; i += 2) {
      const e = list[i];
      if (!e) continue;
      const u = e.userData;
      u.vel.x += (rng() - 0.5) * mag;
      u.vel.y += (rng() - 0.5) * mag * 0.6;
      u.vel.z += (rng() - 0.5) * mag;
      // Fade emissive toward a uniform heat-death grey (colour persists; update() manages emI).
      e.material.color.lerp(GREY, 0.01);
    }
    // The world heats: nudge chaos up toward its ceiling (the integrator clamps it).
    const s = this.ctx.state;
    s.chaos = Math.min(s.chaos + dt * 0.8, 10);
  }

  /**
   * Radial gravity. `sign` = +1 pulls (black/grey absorb), −1 repels (white/grey emit).
   * `consumeCap` = max organisms disposed per frame at the horizon (0 ⇒ a non-consuming hole:
   * crossers are thrown back out past the horizon instead — the white-hole/emit branch).
   */
  private applyHole(dt: number, sign: number, consumeCap: number): void {
    const list = this.entities.list;
    const c = this.center;
    // O(k) reach query (V7.5 perf): instead of an O(n) sweep of the WHOLE population, ask the
    // shared per-frame spatial hash for only the bodies whose grid cells overlap the REACH square
    // — a superset of the 3D REACH sphere (|xz| ≤ ‖Δ‖ ≤ REACH) for a CURRENT grid, which we then
    // filter exactly. Above the 10k knee EntityManager.densityScale (√(maxEntities/10000)) spreads
    // the arena to hold AREAL density constant, so k = entities within REACH stops scaling with n
    // through the 50k mega ceiling; below 10k densityScale clamps to 1 so k rises with n but stays
    // ≤ the removed O(n) sweep (small absolute cost). The EXACT per-frame r⁻² physics runs at every
    // tier (the old >5,000 half-rate stride + 2× accel approximation is GONE). The query buffer is a
    // shared instance valid until the next query(); we read it before any other query call, and
    // reading it draws no rng, so the seeded stream is untouched. (NB: world.ts rebuilds the grid
    // every OTHER frame, so on odd frames membership is ±1 frame stale — accepted sim-wide, and the
    // weakest boundary force re-acquires any 1-frame-missed body at the next rebuild.)
    const near = this.ctx.grid.query(c.x, c.z, REACH);
    let eaten = 0;
    CONSUME.length = 0;
    for (let qi = 0; qi < near.length; qi++) {
      const e = near[qi]!; // invariant: query buffer is a dense array of live grid entries
      V.copy(c).sub(e.position); // points toward the centre
      const r2 = V.lengthSq();
      if (r2 > REACH2 || r2 < 1e-6) continue; // outside the true 3D sphere (or dead-centre)
      const r = Math.sqrt(r2);
      if (r < HORIZON) {
        // F-NHI: a launched being is immune to consumption (its "Matrix" power) — it is thrown back
        // out like the white-hole case instead of being eaten. `isNhi` is undefined on every normal
        // organism, so this is byte-identical until you launch one.
        if (consumeCap > 0 && eaten < consumeCap && e.userData.isNhi !== true) {
          // Crossed the event horizon — defer the consume so disposeAt()'s left-shift can't
          // invalidate the index of an entity still to be forced (the query is unordered w.r.t.
          // `list`). Collected now, disposed after the pass.
          CONSUME[eaten++] = e;
          continue;
        }
        if (consumeCap === 0 || e.userData.isNhi === true) {
          // Non-consuming hole (or an immune NHI): nothing may enter — eject back past the horizon.
          V.multiplyScalar(1 / r); // unit toward centre
          e.position.copy(c).addScaledVector(V, -HORIZON * 1.05);
          e.userData.vel.addScaledVector(V, -0.6);
          continue;
        }
      }
      const accel = Math.min(G / r2, ACCEL_MAX) * sign;
      e.userData.vel.addScaledVector(V, (accel * dt) / r); // V/r = unit toward centre
      // V59: SPACE-TIME WARP — not just gravity. TIME DILATES toward the horizon (velocities are
      // scaled down, so matter visibly CRAWLS as it nears the hole) and infalling light REDSHIFTS
      // (a black hole reddens it; a white hole blueshifts the ejecta). Both fade to nothing by
      // WARP_R_MULT·HORIZON. Pure math, no rng — determinism-neutral.
      if (r < HORIZON * WARP_R_MULT) {
        let k = 1 - (r - HORIZON) / (HORIZON * (WARP_R_MULT - 1)); // 1 at horizon → 0 at the edge
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        e.userData.vel.multiplyScalar(1 - 0.42 * k); // dilation: down to ~0.58× near the horizon
        e.material.color.lerp(sign > 0 ? REDSHIFT : BLUESHIFT, 0.05 * k);
      }
    }
    // Dispose the collected horizon-crossers in a SINGLE reverse scan (O(n) once + the disposeAt
    // shifts), not a per-victim O(n) `indexOf` (which made this O(n·consumeCap) — the consuming
    // hole's real cost ceiling at 50k). disposeAt fires the world's onDeath hook, which scars the RD
    // ground at the corpse's UV (the mortality feedback loop), and does the ordered left-shift.
    // Iterating DESCENDING means each disposeAt only moves the already-scanned tail and lower indices
    // stay valid. The CONSUME_SET membership doubles as the liveness guard — a victim no longer in
    // `list` (a stale grid, rebuilt every other frame, or a same-frame disposal by another system
    // like shoggoth/titan) is simply never encountered, so we never double-dispose.
    if (eaten > 0) {
      CONSUME_SET.clear();
      for (let ci = 0; ci < eaten; ci++) CONSUME_SET.add(CONSUME[ci]!);
      for (let i = list.length - 1; i >= 0 && CONSUME_SET.size > 0; i--) {
        const e = list[i];
        if (e !== undefined && CONSUME_SET.has(e)) {
          this.entities.disposeAt(i);
          this._consumed++;
          CONSUME_SET.delete(e); // each entity is in the list once — stop tracking it
        }
      }
      CONSUME_SET.clear(); // release references — no per-frame retention
    }
    CONSUME.length = 0; // release the collected references — no per-frame retention
    // V60: a summoned hole STIRS reality — the warped spacetime raises the world's disorder while it
    // lives, so weather, economy, quantum cadence and entity jitter (all chaos-coupled) visibly react
    // to it, not just the bodies it pulls. Deterministic (no rng); the integrator clamps the ceiling.
    const s = this.ctx.state;
    s.chaos = Math.min(s.chaos + dt * 0.35, 10);
  }

  /** STRANGE STAR: organisms inside the conversion radius are recoloured to strange matter. */
  private applyStrange(): void {
    const c = this.center;
    // O(k) reach query (V7.5 perf): the conversion front is a CONTACT effect, so only the bodies in
    // the shared hash's cells overlapping the CONV_R square can be inside it — query them, filter by
    // the true 3D conversion sphere, recolour. Above the 10k knee k is held population-flat by the
    // areal-density scaling (below it k scales with n but stays ≤ the removed O(n) sweep), so the
    // old >5,000 half-rate stride is GONE: every body in the zone converts every frame. Idempotent
    // (a fixed recolour), so a 1-frame-stale grid entry just re-stains an already-strange body.
    const near = this.ctx.grid.query(c.x, c.z, CONV_R);
    for (let qi = 0; qi < near.length; qi++) {
      const e = near[qi]!; // invariant: query buffer is a dense array of live grid entries
      if (V.copy(c).sub(e.position).lengthSq() > CONV_R2) continue;
      // Strange-matter stain: a sickly quark-green body with a violet glow. Colour persists
      // after the star expires (update() only re-targets emissiveIntensity, not the hues),
      // so the conversion leaves a lasting mark — the chain reaction's footprint.
      e.material.color.setRGB(0.18, 0.34, 0.12);
      e.material.emissive.setRGB(0.4, 0.05, 0.6);
      e.material.emissiveIntensity = Math.max(e.material.emissiveIntensity, 2.4);
    }
  }

  /** Per-frame visual animation (spin/pulse + Keplerian particles + the lifetime fade). O(particles). */
  private animateRig(dt: number, t: number, fade: number): void {
    const rig = this.rig;
    if (!rig) return;
    const pulse = 1 + Math.sin(t * 4) * 0.06;
    rig.group.scale.setScalar(fade);
    this.animateParticles(dt, fade);
    if (this._kind === 'entropy') {
      // The heat-death shell grows and thins as it expires.
      const grow = 1 + (DURATION - this.life) * 0.5;
      rig.primary.scale.setScalar(grow);
      rig.primaryMat.opacity = 0.18 * fade;
    } else {
      rig.primary.scale.setScalar(pulse);
    }
    if (rig.ring) {
      rig.ring.rotation.z += 0.04;
      rig.ring.rotation.x = Math.PI * 0.42;
      if (rig.ringMat) rig.ringMat.opacity = 0.9 * fade;
    }
    // V59: shimmer the photon ring + breathe the glow halo. The ring (index 0 for holes) spins on
    // its own axis for a lensed shimmer; every extra pulses its base opacity and rides the fade.
    if (rig.extras.length) {
      const shimmer = 0.85 + Math.sin(t * 6) * 0.15;
      const breathe = 0.8 + Math.sin(t * 2.3) * 0.2;
      const ph = rig.extras[0];
      if (ph) ph.rotation.z += 0.03;
      for (let i = 0; i < rig.extraMats.length; i++) {
        const m = rig.extraMats[i];
        if (!(m instanceof THREE.MeshBasicMaterial)) continue;
        const base = (m.userData.baseOpacity as number | undefined) ?? m.opacity;
        m.opacity = base * fade * (i === 0 ? shimmer : breathe);
      }
    }
  }

  /**
   * Advance the particle cloud: Keplerian differential rotation (ω ∝ √(G/ρ³), inner faster)
   * plus per-kind radial drift — black holes SPIRAL IN (respawn at the outer disk), white holes
   * FOUNTAIN OUT (respawn at the throat), entropy DISPERSES, grey/strange hold a rotating shell.
   * Pure t/dt math (no rng); writes the pre-allocated position array in place. O(particles),
   * independent of the population. Allocation-free.
   */
  private animateParticles(dt: number, fade: number): void {
    const rig = this.rig;
    if (!rig || !rig.points || !rig.pState) return;
    const st = rig.pState;
    const posAttr = rig.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const n = st.length / 3;
    const kind = this._kind;
    for (let p = 0; p < n; p++) {
      const b = p * 3;
      let rho = st[b] ?? 1;
      let theta = st[b + 1] ?? 0;
      const y = st[b + 2] ?? 0;
      theta += Math.sqrt(G / (rho * rho * rho + 1)) * PARTICLE_OMEGA_K * dt;
      if (kind === 'blackhole') {
        rho -= PARTICLE_DRIFT * dt;
        if (rho < HORIZON) rho = DISK_R * 1.4; // crossed the horizon → respawn at the outer disk
      } else if (kind === 'whitehole') {
        rho += PARTICLE_DRIFT * dt;
        if (rho > REACH) rho = HORIZON * 1.1; // ejected → respawn at the throat (the fountain)
      } else if (kind === 'entropy') {
        rho += PARTICLE_DRIFT * 0.5 * dt; // disorder spreads outward
        if (rho > REACH * 0.7) rho = HORIZON;
      }
      st[b] = rho;
      st[b + 1] = theta;
      pos[b] = Math.cos(theta) * rho;
      pos[b + 1] = y;
      pos[b + 2] = Math.sin(theta) * rho;
    }
    posAttr.needsUpdate = true;
    if (rig.pointsMat) rig.pointsMat.opacity = 0.85 * fade;
  }

  /** Build the visual rig for `kind`. Allocates (user event); freed by {@link disposeRig}. */
  private buildRig(kind: SingularityKind): Rig {
    const group = new THREE.Group();
    let primary: THREE.Mesh;
    let primaryMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
    let ring: THREE.Mesh | null = null;
    let ringMat: THREE.MeshBasicMaterial | null = null;
    // V59: extra glow meshes (photon ring + halo aura) — built per kind, animated + freed together.
    const extras: THREE.Mesh[] = [];
    const extraMats: THREE.Material[] = [];

    if (kind === 'blackhole') {
      // The shadow: a pure-black sphere. Everything bright sits OUTSIDE it (additive), so the
      // horizon reads as the dark disc real images show — the EHT "ring of fire" silhouette.
      primaryMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 32, 32), primaryMat);
      // Hot accretion disk — additive so the infalling plasma GLOWS rather than paints flat.
      ringMat = new THREE.MeshBasicMaterial({
        color: 0xffb24a,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.5, 20, 64), ringMat);
      this.addHoleHalo(0xffe1a0, 0xff6a1e, extras, extraMats);
    } else if (kind === 'whitehole') {
      primaryMat = new THREE.MeshBasicMaterial({ color: 0xeaf4ff });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 32, 32), primaryMat);
      ringMat = new THREE.MeshBasicMaterial({
        color: 0x8fd6ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.32, 20, 64), ringMat);
      this.addHoleHalo(0xdff0ff, 0x4aa8ff, extras, extraMats);
    } else if (kind === 'greyhole') {
      primaryMat = new THREE.MeshBasicMaterial({ color: 0x3a3f4a });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 32, 32), primaryMat);
      ringMat = new THREE.MeshBasicMaterial({
        color: 0xb6bccc,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.38, 20, 64), ringMat);
      this.addHoleHalo(0xc8cedb, 0x8088a0, extras, extraMats);
    } else if (kind === 'strangestar') {
      primaryMat = new THREE.MeshStandardMaterial({
        color: 0x2a5418,
        emissive: 0x66109a,
        emissiveIntensity: 2,
        metalness: 0.3,
        roughness: 0.4,
      });
      primary = new THREE.Mesh(new THREE.IcosahedronGeometry(HORIZON * 0.9, 1), primaryMat);
      // A violet strangelet aura — the conversion front made visible.
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x9a2cff,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      auraMat.userData.baseOpacity = 0.22;
      const aura = new THREE.Mesh(new THREE.SphereGeometry(HORIZON * 1.5, 20, 20), auraMat);
      aura.frustumCulled = false;
      extras.push(aura);
      extraMats.push(auraMat);
    } else {
      // entropy — an inverted translucent shell that expands as disorder spreads.
      primaryMat = new THREE.MeshBasicMaterial({
        color: 0x2a2520,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
      });
      primary = new THREE.Mesh(new THREE.SphereGeometry(REACH * 0.4, 20, 20), primaryMat);
    }

    primary.frustumCulled = false;
    group.add(primary);
    if (ring) {
      ring.frustumCulled = false;
      ring.rotation.x = Math.PI * 0.42;
      group.add(ring);
    }
    for (const ex of extras) group.add(ex);
    // Keplerian accretion-disk / matter-fountain particle cloud (V7-beyond) — real orbital
    // matter the holes pull in and the white hole throws out. Built from the seeded rng at
    // SUMMON (deterministic); animated by pure t/dt math each frame (no per-frame rng).
    const parts = this.buildParticles(kind);
    if (parts) group.add(parts.points);
    // The group position is set by summon() from the caller's world point (which should sit
    // mid-field, ~16·ARENA_Y up, so the rig reads as an object in the volume, not on the floor).
    return {
      group,
      primary,
      primaryMat,
      ring,
      ringMat,
      points: parts ? parts.points : null,
      pointsMat: parts ? parts.pointsMat : null,
      pState: parts ? parts.pState : null,
      extras,
      extraMats,
    };
  }

  /**
   * V59: build a hole's bright trim — the lensed PHOTON RING that hugs the event horizon (a thin
   * additive torus, the iconic "ring of fire") plus a soft GLOW HALO bleeding past the horizon
   * (gravitational glow). Both are additive + depth-write-off so they read as light, not surface,
   * and carry a `baseOpacity` so {@link animateRig} can pulse + fade them. Pushed into the caller's
   * arrays (added to the group + freed with the rig). Allocates only on summon (a user event).
   */
  private addHoleHalo(
    ringHex: number,
    glowHex: number,
    extras: THREE.Mesh[],
    extraMats: THREE.Material[],
  ): void {
    const photonMat = new THREE.MeshBasicMaterial({
      color: ringHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    photonMat.userData.baseOpacity = 0.95;
    const photon = new THREE.Mesh(
      new THREE.TorusGeometry(HORIZON * 1.18, HORIZON * 0.06, 12, 80),
      photonMat,
    );
    photon.frustumCulled = false;
    photon.rotation.x = Math.PI * 0.5;
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowHex,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    glowMat.userData.baseOpacity = 0.28;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(HORIZON * 1.75, 24, 24), glowMat);
    glow.frustumCulled = false;
    extras.push(photon, glow);
    extraMats.push(photonMat, glowMat);
  }

  /**
   * Build the particle cloud for `kind` from the seeded rng (CONTRACTS V7-beyond). Returns the
   * additive Points plus the per-particle orbital state [rho, theta, y] × N. Tier-scaled count;
   * draws a documented, fixed number of rng samples at SUMMON (a user event, like burst). The
   * geometry's position array is recomputed each frame by {@link animateRig}.
   */
  private buildParticles(
    kind: SingularityKind,
  ): { points: THREE.Points; pointsMat: THREE.PointsMaterial; pState: Float32Array } | null {
    const rng = this.ctx.rng;
    const tier = this.ctx.quality.tier;
    const n = particleBudget(tier);
    const sizeMul = particleSizeMul(tier);
    const pos = new Float32Array(n * 3);
    const st = new Float32Array(n * 3);
    // Per-kind initial radial band + vertical spread (disk for holes, cloud for strange/entropy).
    const rInner = kind === 'strangestar' ? 0 : HORIZON * 1.1;
    const rOuter =
      kind === 'strangestar' ? CONV_R * 0.55 : kind === 'entropy' ? REACH * 0.4 : DISK_R * 1.4;
    const yspread = kind === 'strangestar' || kind === 'entropy' ? rOuter : HORIZON * 0.5;
    for (let p = 0; p < n; p++) {
      const b = p * 3;
      const rho = rInner + (rOuter - rInner) * Math.sqrt(rng()); // area-uniform radial fill
      const theta = rng() * TAU;
      const y = (rng() - 0.5) * 2 * yspread;
      st[b] = rho;
      st[b + 1] = theta;
      st[b + 2] = y;
      pos[b] = Math.cos(theta) * rho;
      pos[b + 1] = y;
      pos[b + 2] = Math.sin(theta) * rho;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: PARTICLE_COLOR[kind],
      size: 1.6 * ARENA_MID * sizeMul,
      transparent: true,
      opacity: tier === 'mega' || tier === 'ultra' ? 0.96 : 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, pointsMat);
    points.frustumCulled = false;
    return { points, pointsMat, pState: st };
  }

  /** Remove + free the current rig's GPU resources (geometry + materials). O(1). */
  private disposeRig(): void {
    const rig = this.rig;
    if (!rig) return;
    this.scene.remove(rig.group);
    rig.primary.geometry.dispose();
    rig.primaryMat.dispose();
    if (rig.ring) rig.ring.geometry.dispose();
    if (rig.ringMat) rig.ringMat.dispose();
    if (rig.points) rig.points.geometry.dispose();
    if (rig.pointsMat) rig.pointsMat.dispose();
    // V59: free the photon ring / glow halo geometries + materials.
    for (const ex of rig.extras) ex.geometry.dispose();
    for (const m of rig.extraMats) m.dispose();
    this.rig = null;
  }
}
