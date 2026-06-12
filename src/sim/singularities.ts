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
 * Determinism: every random draw is from the injected `ctx.rng` (ENTROPY kicks only); the
 * force fields are pure trigonometry/vector math. Same seed + same summon/update sequence ⇒
 * the same evolution. The constructor draws NO rng and builds NO scene objects, so the system
 * is boot-stream-neutral (the integrator can place its construction anywhere).
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { SimContext } from '../types';
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
/** Max organisms a black hole consumes per frame (keeps mass die-off off the budget cliff). */
const MAX_CONSUME = 25;

/** Module scratch — update() and summon() never allocate per frame. */
const V = new THREE.Vector3();
/** Heat-death grey target for the ENTROPY colour fade. */
const GREY = new THREE.Color(0.5, 0.5, 0.5);

/**
 * Internal rig handle — the meshes a summon builds, kept so update() can animate them and
 * dispose() can free them. `primary` is the focal body, `ring` the optional disk/halo.
 */
interface Rig {
  group: THREE.Group;
  primary: THREE.Mesh;
  primaryMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  ring: THREE.Mesh | null;
  ringMat: THREE.MeshBasicMaterial | null;
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
   * Summon a singularity of `kind` at world position `pos` (a new summon replaces any active
   * one). Builds the visual rig and arms the force field for {@link DURATION} seconds. Draws
   * no rng. Allocation happens here (a handful of meshes) — never in {@link update}. O(1).
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
  }

  /**
   * Advance the active singularity: apply its force field to the population, animate the rig,
   * and expire after {@link DURATION}. No-op when inactive. Allocation-free. O(n) over live
   * entities while active (a transient — singularities last seconds), O(1) otherwise.
   */
  update(dt: number, t: number): void {
    if (this._kind === null || !this.rig) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.disposeRig();
      this._kind = null;
      return;
    }
    const fade = this.life < 1 ? this.life : 1; // ramp out over the last second
    switch (this._kind) {
      case 'entropy':
        this.applyEntropy(dt);
        break;
      case 'blackhole':
        this.applyHole(dt, +1, true);
        break;
      case 'whitehole':
        this.applyHole(dt, -1, false);
        break;
      case 'greyhole':
        // Alternating absorb (+) / emit (−) on a slow pulse — the leaking hole.
        this.applyHole(dt, Math.sin(t * 1.3) >= 0 ? +1 : -1, false);
        break;
      case 'strangestar':
        this.applyStrange();
        break;
    }
    this.animateRig(t, fade);
  }

  /** ENTROPY: thermalize velocities, grey the glow, raise the heat. Strided for budget. */
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
      e.material.color.lerp(GREY, 0.02);
    }
    // The world heats: nudge chaos up toward its ceiling (the integrator clamps it).
    const s = this.ctx.state;
    s.chaos = Math.min(s.chaos + dt * 0.8, 10);
  }

  /**
   * Radial gravity. `sign` = +1 pulls (black/grey absorb), −1 repels (white/grey emit). When
   * `consume` and an organism crosses the horizon it is disposed (scarring the RD ground);
   * for the repulsive case a crosser is thrown back out past the horizon instead.
   */
  private applyHole(dt: number, sign: number, consume: boolean): void {
    const list = this.entities.list;
    const c = this.center;
    let eaten = 0;
    // Iterate from the end so disposeAt()'s left-shift never skips an unvisited entity.
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e) continue;
      V.copy(c).sub(e.position); // points toward the centre
      const r2 = V.lengthSq();
      if (r2 > REACH2 || r2 < 1e-6) continue;
      const r = Math.sqrt(r2);
      if (r < HORIZON) {
        if (consume && eaten < MAX_CONSUME) {
          // Crossed the event horizon — consumed. disposeAt fires the world's onDeath hook,
          // which scars the RD ground at the corpse's UV (the mortality feedback loop).
          this.entities.disposeAt(i);
          this._consumed++;
          eaten++;
          continue;
        }
        if (!consume) {
          // White hole: nothing may enter — eject the crosser back out past the horizon.
          V.multiplyScalar(1 / r); // unit toward centre
          e.position.copy(c).addScaledVector(V, -HORIZON * 1.05);
          e.userData.vel.addScaledVector(V, -0.6);
          continue;
        }
      }
      const accel = Math.min(G / r2, ACCEL_MAX) * sign;
      e.userData.vel.addScaledVector(V, (accel * dt) / r); // V/r = unit toward centre
    }
  }

  /** STRANGE STAR: organisms inside the conversion radius are recoloured to strange matter. */
  private applyStrange(): void {
    const list = this.entities.list;
    const c = this.center;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      if (V.copy(c).sub(e.position).lengthSq() > CONV_R2) continue;
      // Strange-matter stain: a sickly quark-green body with a violet glow. Colour persists
      // after the star expires (update() only re-targets emissiveIntensity, not the hues),
      // so the conversion leaves a lasting mark — the chain reaction's footprint.
      e.material.color.setRGB(0.18, 0.34, 0.12);
      e.material.emissive.setRGB(0.4, 0.05, 0.6);
      e.material.emissiveIntensity = Math.max(e.material.emissiveIntensity, 2.4);
    }
  }

  /** Per-frame visual animation (spin/pulse + the lifetime fade). Allocation-free. */
  private animateRig(t: number, fade: number): void {
    const rig = this.rig;
    if (!rig) return;
    const pulse = 1 + Math.sin(t * 4) * 0.06;
    rig.group.scale.setScalar(fade);
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
  }

  /** Build the visual rig for `kind`. Allocates (user event); freed by {@link disposeRig}. */
  private buildRig(kind: SingularityKind): Rig {
    const group = new THREE.Group();
    let primary: THREE.Mesh;
    let primaryMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
    let ring: THREE.Mesh | null = null;
    let ringMat: THREE.MeshBasicMaterial | null = null;

    if (kind === 'blackhole') {
      primaryMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 24, 24), primaryMat);
      ringMat = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.45, 16, 48), ringMat);
    } else if (kind === 'whitehole') {
      primaryMat = new THREE.MeshBasicMaterial({ color: 0xeaf4ff });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 24, 24), primaryMat);
      ringMat = new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.3, 16, 48), ringMat);
    } else if (kind === 'greyhole') {
      primaryMat = new THREE.MeshBasicMaterial({ color: 0x555a66 });
      primary = new THREE.Mesh(new THREE.SphereGeometry(HORIZON, 24, 24), primaryMat);
      ringMat = new THREE.MeshBasicMaterial({
        color: 0x99a0b0,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, HORIZON * 0.35, 16, 48), ringMat);
    } else if (kind === 'strangestar') {
      primaryMat = new THREE.MeshStandardMaterial({
        color: 0x2a5418,
        emissive: 0x66109a,
        emissiveIntensity: 2,
        metalness: 0.3,
        roughness: 0.4,
      });
      primary = new THREE.Mesh(new THREE.IcosahedronGeometry(HORIZON * 0.9, 1), primaryMat);
    } else {
      // entropy — an inverted translucent shell that expands as disorder spreads.
      primaryMat = new THREE.MeshBasicMaterial({
        color: 0xb0b4b8,
        transparent: true,
        opacity: 0.18,
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
    // The group position is set by summon() from the caller's world point (which should sit
    // mid-field, ~16·ARENA_Y up, so the rig reads as an object in the volume, not on the floor).
    return { group, primary, primaryMat, ring, ringMat };
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
    this.rig = null;
  }
}
