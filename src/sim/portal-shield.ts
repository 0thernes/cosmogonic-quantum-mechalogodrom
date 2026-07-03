/**
 * PORTAL SHIELD (V126, USER) — the IMMUNE reaction. Where {@link PortalDeath} / {@link PortalDeathFauna}
 * blast mortal creatures that touch the ascension Portal, the three GOD-TIER bodies — the Super
 * Creatures, the APEX abomination, and the Mechalogodrom — are invulnerable: they "just bounce off it
 * and vibrate and flash briefly in a white dazzling shimmery shiny millions-of-sparkles at hyperspeed
 * everywhere around the creature … back to normal in 2 seconds." This owns that spectacle.
 *
 * Given the immune bodies' world positions each frame, any one inside the portal's flash radius sheds a
 * dense cloud of blinding-white / faintly-iridescent sparks that streak outward at hyperspeed and wink
 * out in a breath — continuously re-emitted while it lingers, so the body wears a shimmering halo the
 * whole time it's in the void and the cloud dissolves ~½ s after it drifts clear. The bodies DON'T die
 * and their motion is owned by their own systems, so this never touches sim state.
 *
 * DETERMINISM (ADR 0004): purely visual (the immune bodies neither die nor change) — but it still draws
 * ZERO rng (index/golden-angle hashes seed every spark), so it can't perturb the seeded population
 * stream. One additive `THREE.Points` pool, owned + disposed here. O(bodies + POOL) per frame.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { SimContext } from '../types';

/** Portal (void-throat) world centre — matches PortalDeath / PortalDeathFauna. */
const PORTAL_X = 0;
const PORTAL_Y = 24 * ARENA_MID;
const PORTAL_Z = -40 * ARENA_MID - 0.5 * ARENA_MID;
/** Flash radius — wider than the kill sphere (9·MID) so the shimmer ignites as a body APPROACHES. */
const FLASH_R = 16 * ARENA_MID;
const FLASH_R2 = FLASH_R * FLASH_R;

/** Big pool — the shimmer is meant to read as "millions of sparkles". */
const POOL = 2400;
/** Sparks shed per immune body per frame while it's inside the flash radius (a persistent halo). */
const PER_FRAME = 22;
/** A spark lives a heartbeat then winks out (additive ⇒ black = invisible). */
const LIFE = 0.55;

const TMP = new THREE.Color();

export class PortalShield {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  private active = false;
  /** Cumulative frames an immune body spent shimmering in the void (telemetry / tests). */
  flashes = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.7 * ARENA_MID,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    ctx.scene.add(this.points);
  }

  /** Arm/disarm (world.ts passes `monolithTemple.revealed`). O(1). */
  setActive(v: boolean): void {
    this.active = v;
  }

  stats(): { flashes: number; active: boolean } {
    return { flashes: this.flashes, active: this.active };
  }

  /** Shed {@link PER_FRAME} blinding-white sparks in a small shell around `(x,y,z)`, streaking outward at
   *  hyperspeed. Deterministic (index/golden-angle hashes — no rng). O(PER_FRAME). */
  private shimmer(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_FRAME; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653; // golden angle (azimuth)
      const el = (((i * 7 + k) % 13) / 13 - 0.5) * Math.PI; // elevation −π/2..π/2
      const ce = Math.cos(el);
      const shell = (1.4 + (i % 6) * 0.9) * ARENA_MID; // spawn just off the body surface
      const sp = (0.7 + ((i * 17) % 13) / 13) * 46 * ARENA_MID; // HYPERSPEED
      const dx = Math.cos(a) * ce;
      const dy = Math.sin(el);
      const dz = Math.sin(a) * ce;
      const o = i * 3;
      this.posArr[o] = x + dx * shell;
      this.posArr[o + 1] = y + dy * shell;
      this.posArr[o + 2] = z + dz * shell;
      this.vel[o] = dx * sp;
      this.vel[o + 1] = dy * sp;
      this.vel[o + 2] = dz * sp;
      // Blinding white with a faint iridescent tint (cyan / magenta / gold rotating by index).
      const t3 = i % 3;
      const c = TMP.setHSL(t3 === 0 ? 0.52 : t3 === 1 ? 0.86 : 0.13, 0.5, 0.985);
      this.baseCol[o] = c.r;
      this.baseCol[o + 1] = c.g;
      this.baseCol[o + 2] = c.b;
      this.colArr[o] = c.r;
      this.colArr[o + 1] = c.g;
      this.colArr[o + 2] = c.b;
      this.life[i] = LIFE;
    }
  }

  /**
   * Per-frame: for each immune body inside the portal flash radius, shed a shimmer halo; then advance +
   * fade every spark. `bodies` are world positions (Super Creatures + APEX; the Mechalogodrom rides its
   * own high altitude and rarely reaches the throat). Frozen dt = 0 ⇒ sparks hold. O(bodies + POOL).
   */
  react(bodies: readonly THREE.Vector3[], t: number, dt: number): void {
    if (this.active && dt > 0) {
      for (const b of bodies) {
        const dx = b.x - PORTAL_X;
        const dy = b.y - PORTAL_Y;
        const dz = b.z - PORTAL_Z;
        if (dx * dx + dy * dy + dz * dz <= FLASH_R2) {
          this.shimmer(b.x, b.y, b.z);
          this.flashes++;
        }
      }
    }
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const f = nL > 0 ? nL / LIFE : 0;
      const o = i * 3;
      // Sparks streak out and drag to a stop (a crisp twinkle, no gravity — they hang in the void glow).
      const drag = 1 - Math.min(1, 3.2 * dt);
      this.vel[o] = (this.vel[o] ?? 0) * drag;
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) * drag;
      this.vel[o + 2] = (this.vel[o + 2] ?? 0) * drag;
      this.posArr[o] = (this.posArr[o] ?? 0) + (this.vel[o] ?? 0) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + (this.vel[o + 2] ?? 0) * dt;
      // Twinkle: a fast flicker on top of the linear fade so it reads as shimmering, not a smooth wipe.
      const tw = f * (0.6 + 0.4 * Math.abs(Math.sin(t * 40 + i)));
      this.colArr[o] = (this.baseCol[o] ?? 0) * tw;
      this.colArr[o + 1] = (this.baseCol[o + 1] ?? 0) * tw;
      this.colArr[o + 2] = (this.baseCol[o + 2] ?? 0) * tw;
    }
    this.points.visible = anyAlive;
    if (anyAlive) {
      (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /** Remove the spark mesh + free its GPU resources (World.dispose / HMR safe). */
  dispose(): void {
    this.ctx.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
