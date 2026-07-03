/**
 * PORTAL DEATH — BIG FAUNA (V126, USER: "everything else DIES … only Super Creatures and Pantheons
 * bounce off it"). Companion to {@link PortalDeath} (which kills the organism SWARM in `entities.list`):
 * this drives the four SEPARATE persistent rosters — shoggoths, puppeteers, titans, leviathans — that
 * live OUTSIDE the swarm and so were untouched by its kill. Any member that enters the portal's vertical
 * kill-CYLINDER (the void-throat column, ground-to-sky — a cylinder, not the swarm's y-centred sphere, so
 * ground roamers well BELOW the sphere still die at the throat's base) erupts in a hell-warp burst and
 * re-enters the world ELSEWHERE {@link PORTAL_RESPAWN_DELAY} seconds later.
 *
 * IMMUNE by exclusion: the 100 Pantheon + the god-tier bodies (Super Creature / APEX / Mechalogodrom) are
 * OTHER systems and simply never register here — they don't die (their bounce + white-sparkle reaction is
 * a separate pass). Each roster hides a downed member via `group.visible=false` (which cascades to its
 * child lights) and self-schedules the respawn; this companion only owns the shared burst.
 *
 * DETERMINISM (ADR 0004): the cull test is pure geometry and every burst / respawn value comes from an
 * index/golden-angle hash — ZERO rng draws — so the whole spectacle is provably incapable of perturbing
 * the seeded population golden (and it only ever runs post-ascension anyway). One additive `THREE.Points`
 * burst pool, owned + disposed here.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { SimContext } from '../types';

/** A roster whose members can be blasted by the portal (implemented by shoggoths/puppets/titans/leviathans). */
export interface PortalCullable {
  /**
   * Blast any VISIBLE member inside the portal kill-cylinder (vertical axis at world x=`ax`, z=`az`,
   * squared radius `r2`): emit a burst at it via `onDeath`, hide it, and re-enter it ELSEWHERE
   * {@link PORTAL_RESPAWN_DELAY} s later. `t` = sim seconds. Deterministic; O(members).
   */
  portalCull(
    ax: number,
    az: number,
    r2: number,
    t: number,
    onDeath: (x: number, y: number, z: number) => void,
  ): void;
}

/** "Everything that dies does respawn 5 seconds later elsewhere." (USER) */
export const PORTAL_RESPAWN_DELAY = 5;

/** Void-throat cylinder axis — matches {@link PortalDeath}'s PORTAL_X/PORTAL_Z (temple reveal + local offset). */
const PORTAL_X = 0;
const PORTAL_Z = -40 * ARENA_MID - 0.5 * ARENA_MID;
/** Cylinder cull radius — a touch wider than the swarm sphere (9·MID) so ground roamers at the throat's
 *  base (well below the y=24·MID sphere centre) still die when they reach the portal column. */
const CULL_R = 11 * ARENA_MID;
const CULL_R2 = CULL_R * CULL_R;

/**
 * Deterministic "elsewhere" for a respawn: a golden-angle ring biased to +z (the portal sits at z≈-101),
 * kept inside the ±540 platform and clear of the kill cylinder. Mutates out.x / out.z, PRESERVES out.y so
 * a member re-enters at its own natural height band. No rng, no alloc.
 */
export function portalReappearSpot(seq: number, out: THREE.Vector3): void {
  const ang = seq * 2.399963229728653; // golden angle
  const rad = 150 + (seq % 4) * 60; // 150..330
  out.x = Math.cos(ang) * rad;
  out.z = 90 + Math.abs(Math.sin(ang)) * rad * 0.5; // 90..255: +z, far from the portal at z≈-101,
  // and hypot(x,z) ≤ ~420 so a re-entrant always lands well inside the ±540 platform.
}

const POOL = 960;
const PER_DEATH = 30;
/** Seconds a burst particle lives before it fades to black (additive ⇒ black = invisible). */
const LIFE = 1.05;
const TMP = new THREE.Color();

export class PortalDeathFauna {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  /** Cumulative fauna consumed by the portal (telemetry / tests). */
  kills = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 3.2 * ARENA_MID,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    ctx.scene.add(this.points);
  }

  stats(): { kills: number } {
    return { kills: this.kills };
  }

  /**
   * Emit a hell-warp mutation burst of {@link PER_DEATH} particles at `(x,y,z)` — a chaotic entropy
   * eruption (hot-white core → magenta/violet warp → sickly-green flecks, biased upward). Every value
   * comes from the ring index (golden angle + hashes), NOT rng, so the VFX never touches the seeded
   * stream. O(PER_DEATH).
   */
  private burst(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_DEATH; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653; // golden angle around the vertical axis
      const b = (((i % 9) * 0.7 + k * 0.6180339) % Math.PI) - Math.PI / 2; // elevation −π/2..π/2
      const sp = (0.5 + ((i * 13) % 11) / 11) * 30 * ARENA_MID; // outward speed
      const cb = Math.cos(b);
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(a) * cb * sp;
      this.vel[o + 1] = Math.sin(b) * sp + 9 * ARENA_MID; // biased upward — an eruption, not a puddle
      this.vel[o + 2] = Math.sin(a) * cb * sp;
      const hot = i % 4 === 0;
      const green = i % 5 === 0;
      const hue = green ? 0.32 : 0.82 + ((i % 5) / 5) * 0.12; // green flecks vs magenta→violet warp
      const c = TMP.setHSL(hue % 1, green ? 0.85 : 0.95, hot ? 0.97 : 0.56);
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
   * Per-frame: when armed (temple revealed) and time is advancing, drive every roster's portalCull
   * (which kills + self-respawns its own members), then advance + fade the shared burst. Frozen dt=0 ⇒
   * no kills (particles hold). O(Σ members + POOL).
   */
  update(active: boolean, t: number, dt: number, rosters: readonly PortalCullable[]): void {
    if (active && dt > 0) {
      const emit = (x: number, y: number, z: number): void => {
        this.burst(x, y, z);
        this.kills++;
      };
      for (const r of rosters) r.portalCull(PORTAL_X, PORTAL_Z, CULL_R2, t, emit);
    }
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const f = nL > 0 ? nL / LIFE : 0; // 1 → 0 over LIFE
      const o = i * 3;
      const sw = Math.sin(t * 6 + i) * 11 * ARENA_MID * dt; // deterministic warp swirl
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) - 17 * ARENA_MID * dt; // gravity
      this.posArr[o] = (this.posArr[o] ?? 0) + ((this.vel[o] ?? 0) + sw) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + ((this.vel[o + 2] ?? 0) - sw) * dt;
      this.colArr[o] = (this.baseCol[o] ?? 0) * f;
      this.colArr[o + 1] = (this.baseCol[o + 1] ?? 0) * f;
      this.colArr[o + 2] = (this.baseCol[o + 2] ?? 0) * f;
    }
    this.points.visible = anyAlive;
    if (anyAlive) {
      (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /** Remove the burst mesh + free its GPU resources (World.dispose / HMR safe). */
  dispose(): void {
    this.ctx.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
