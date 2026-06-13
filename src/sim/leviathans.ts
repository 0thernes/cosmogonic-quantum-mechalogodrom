/**
 * Leviathans (F-BEINGS) — a fourth order of colossal non-human intelligence beyond the shoggoths,
 * puppet-masters, and titans: serpentine drifters that sail the mid-field on slow sinusoidal
 * currents, undulating and pulsing with an inner glow. They are majestic scenery-scale life — they
 * roam and react but (in this first increment) never touch the organism sim, so the system is
 * PURELY ADDITIVE.
 *
 * Determinism: the constructor draws NO rng and `update()` draws none either — every position, hue,
 * and undulation is a pure function of the leviathan's index and the sim clock. So the system is
 * boot-stream-neutral (the composition root may construct it anywhere without shifting the seeded
 * stream) and its motion is identical for a given seed. The only world coupling is read-only: it
 * feels an active singularity through {@link SingularitySystem.bodyForce} (F-HOLES), which also
 * draws no rng.
 */
import * as THREE from 'three';
import { ARENA_MID, MID_RADIUS2 } from './constants';
import { POINT_LIGHT_GAIN } from './environment';
import type { SimContext } from '../types';
import type { SingularitySystem } from './singularities';

/** How many leviathans sail the world (fixed — telemetry-friendly, cheap). */
const COUNT = 4;
/** Silhouette scale — large enough to read as colossal against the monoliths. */
const COLOSSAL = 4;
/** Roam ring radius (mid-field, inside the shoggoth/quantum containment). */
const ROAM_R = 48 * ARENA_MID;
/** Per-leviathan additive base hues (cold abyssal palette), indexed by id. */
const HUES = [0.55, 0.62, 0.48, 0.7] as const;

/** Module scratch — `update()` never allocates per frame. */
const HOLE_F = new THREE.Vector3();
const V1 = new THREE.Vector3();

/** Internal per-leviathan record. */
interface Leviathan {
  group: THREE.Group;
  body: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  aura: THREE.PointLight;
  vel: THREE.Vector3;
  /** Phase offset, derived from the index (golden-angle spread) — not rng. */
  ph: number;
  hue: number;
}

/**
 * Owns the four leviathans. Constructed once by the composition root; `update(dt, t)` is called
 * every frame. `attachSingularity` opts the colossi into the F-HOLES force field (no-op until
 * attached). `count` feeds optional telemetry.
 */
export class LeviathanSystem {
  private readonly levs: Leviathan[] = [];
  private singularity: SingularitySystem | null = null;

  // Only the scene is needed past construction; the rest of the context (rng, grid, …) is unused
  // by design — leviathans draw no rng and touch no organism state (F-BEINGS additive contract).
  constructor(ctx: SimContext) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    // A capsule body reads as a sea-serpent/whale silhouette; built once, deterministically.
    const geo = new THREE.CapsuleGeometry(1.6 * COLOSSAL, 9 * COLOSSAL, 5, 14);
    for (let i = 0; i < COUNT; i++) {
      const hue = HUES[i] ?? 0.55;
      const group = new THREE.Group();
      const ang = (i / COUNT) * Math.PI * 2;
      group.position.set(Math.cos(ang) * ROAM_R, 18 + (i % 2) * 10, Math.sin(ang) * ROAM_R);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.5, 0.25),
        emissive: new THREE.Color().setHSL(hue, 0.7, 0.15),
        emissiveIntensity: 1.2,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.9,
      });
      const body = new THREE.Mesh(geo, mat);
      body.rotation.z = Math.PI / 2; // lie the capsule horizontal so it swims, not stands
      group.add(body);
      const aura = new THREE.PointLight(new THREE.Color().setHSL(hue, 0.6, 0.4), 0, 90 * ARENA_MID);
      aura.position.y = 4;
      group.add(aura);
      root.add(group);
      this.levs.push({
        group,
        body,
        mat,
        aura,
        vel: new THREE.Vector3(),
        ph: i * 2.399963229728653, // golden angle in radians — even, rng-free spread
        hue,
      });
    }
  }

  /** Number of leviathans (constant — telemetry). */
  get count(): number {
    return this.levs.length;
  }

  /** F-HOLES: wire in the singularity system so an active hole tugs the leviathans (or null to detach). */
  attachSingularity(singularity: SingularitySystem | null): void {
    this.singularity = singularity;
  }

  /**
   * Advance all leviathans: a slow sinusoidal sail through the mid-field, a gentle undulation +
   * glow pulse, and the F-HOLES body force. Allocation-free, rng-free. O(COUNT) per frame.
   */
  update(dt: number, t: number): void {
    for (let i = 0; i < this.levs.length; i++) {
      const lv = this.levs[i];
      if (!lv) continue; // noUncheckedIndexedAccess: i < length
      const g = lv.group;
      const p = g.position;

      // Sinusoidal sail: a wide lazy orbit whose radius and height breathe over time.
      const orbit = t * 0.04 + lv.ph;
      const r = ROAM_R * (0.85 + Math.sin(t * 0.05 + lv.ph) * 0.15);
      lv.vel.x += (Math.cos(orbit) * r - p.x) * 0.0006 * dt * 60;
      lv.vel.z += (Math.sin(orbit) * r - p.z) * 0.0006 * dt * 60;
      lv.vel.y += (18 + Math.sin(t * 0.07 + lv.ph) * 12 - p.y) * 0.0005 * dt * 60;
      lv.vel.multiplyScalar(0.96);

      // F-HOLES: an active singularity drags the colossus too (no-op when unattached/inactive).
      if (this.singularity && this.singularity.bodyForce(p.x, p.y, p.z, dt, HOLE_F)) {
        lv.vel.add(HOLE_F);
      }
      // Mid-field containment so a hole can never fling one off to infinity.
      if (p.lengthSq() > MID_RADIUS2) {
        V1.copy(p).normalize().multiplyScalar(-0.02);
        lv.vel.add(V1);
      }

      V1.copy(lv.vel).multiplyScalar(dt * 60);
      p.add(V1);
      // Face travel direction (yaw toward velocity) + a slow body undulation (roll).
      if (lv.vel.x * lv.vel.x + lv.vel.z * lv.vel.z > 1e-6) {
        g.rotation.y = Math.atan2(lv.vel.x, lv.vel.z);
      }
      lv.body.rotation.x = Math.sin(t * 1.2 + lv.ph) * 0.25; // tail undulation

      // Inner glow + aura pulse.
      const pulse = 1 + Math.sin(t * 1.5 + lv.ph) * 0.4;
      lv.mat.emissiveIntensity = 1.2 * pulse;
      lv.aura.intensity = (2 + Math.sin(t * 1.5 + lv.ph) * 1.2) * POINT_LIGHT_GAIN;
    }
  }
}
