/**
 * PORTAL DEATH ZONE (V126, USER) — the ascension Portal (the {@link MonolithTemple} void throat) is
 * DEATH. Any population organism that TOUCHES the portal sphere explodes in a hell-warp burst and dies;
 * it re-enters the world ELSEWHERE {@link RESPAWN_DELAY} seconds later (a fresh random platform spot).
 *
 * IMMUNITY is structural, not a special-case: the Super Creatures, the APEX abomination, and the
 * Mechalogodrom are their own bodies OUTSIDE the {@link EntityManager} population — this system only ever
 * scans `entities.list`, so those three can drift through the void untouched (their own bounce/shimmer
 * reaction is a separate visual pass). The kill sphere is derived from the temple's fixed reveal at
 * `(0, 0, -40·ARENA_MID)` plus the void throat's local offset — see monolith-temple.ts §8 (VOID THROAT).
 *
 * DETERMINISM (ADR 0004): the kill test is pure geometry; a respawn is a real sim event that draws from
 * the seeded `ctx.rng` (via {@link EntityManager.spawn}), exactly as organic growth does — so same seed +
 * same portal state ⇒ same deaths + same respawns. The VFX draws ZERO rng (a golden-angle/index hash
 * seeds each particle) so the spectacle can never perturb the population stream. The burst pool is a
 * single additive `THREE.Points` (owned here, disposed in {@link dispose}).
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { EntityManager } from './entities';
import type { Entity, SimContext } from '../types';

/** Void-throat world centre (temple reveal z `-40·MID` + local void offset `-0.5·MID`; height `CORE_Y`). */
const PORTAL_X = 0;
const PORTAL_Y = 24 * ARENA_MID; // CORE_Y — the void throat sits mid-column, well inside the entity y-range
const PORTAL_Z = -40 * ARENA_MID - 0.5 * ARENA_MID;
/** Kill radius — the void sphere (5.5·MID) + the rim torus (6.2·MID) + a touch of margin. */
const KILL_R = 9 * ARENA_MID;
const KILL_R2 = KILL_R * KILL_R;
/** "Everything that dies does respawn 5 seconds later elsewhere." */
const RESPAWN_DELAY = 5;

/** Burst-particle pool: ~30 simultaneous deaths × {@link PER_DEATH}. Tiny — always rendered, additive. */
const POOL = 720;
const PER_DEATH = 24;
/** Seconds a burst particle lives before it fades to black (additive ⇒ black = invisible). */
const LIFE = 0.9;

const TMP_COL = new THREE.Color();

/** Live stats for telemetry / tests. */
export interface PortalDeathStats {
  /** Cumulative organisms consumed by the portal. */
  kills: number;
  /** Deaths awaiting their 5-second respawn. */
  pending: number;
  /** Whether the kill sphere is armed (temple revealed). */
  active: boolean;
}

export class PortalDeath {
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
  /** Pending respawns: absolute sim time to fire, + the dead organism's morphotype (so like re-enters). */
  private readonly respawns: { at: number; mi: number }[] = [];
  private respawnHead = 0;
  private readonly deathIndices: number[] = [];
  kills = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.4 * ARENA_MID,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    ctx.scene.add(this.points);
  }

  /** Arm/disarm the kill sphere (world.ts passes `monolithTemple.revealed`). O(1). */
  setActive(v: boolean): void {
    this.active = v;
  }

  stats(): PortalDeathStats {
    return {
      kills: this.kills,
      pending: this.respawns.length - this.respawnHead,
      active: this.active,
    };
  }

  /** Cancel organisms queued by the pre-reset population so Genesis stays at one progenitor. */
  clearPendingRespawns(): void {
    this.respawns.length = 0;
    this.respawnHead = 0;
  }

  /**
   * Emit a hell-warp burst of {@link PER_DEATH} particles at `(x,y,z)` — a chaotic, entropy-coloured
   * eruption (hot-white core → magenta/violet warp → sickly-green flecks). Deterministic: every value
   * comes from the ring index (golden-angle + hashes), NOT `ctx.rng`, so the VFX never touches the
   * seeded population stream. O(PER_DEATH).
   */
  private burst(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_DEATH; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653; // golden angle around the vertical axis
      const b = (((i % 7) * 0.8975979 + k * 0.6180339) % Math.PI) - Math.PI / 2; // elevation −π/2..π/2
      const sp = (0.42 + ((i * 13) % 11) / 11) * 24 * ARENA_MID; // outward speed
      const cb = Math.cos(b);
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(a) * cb * sp;
      this.vel[o + 1] = Math.sin(b) * sp + 7 * ARENA_MID; // biased upward — an eruption, not a puddle
      this.vel[o + 2] = Math.sin(a) * cb * sp;
      // Hell-warp palette: mostly magenta→violet, a hot-white core, sickly-green chaos flecks.
      const hot = i % 4 === 0;
      const green = i % 5 === 0;
      const hue = green ? 0.32 : 0.82 + ((i % 5) / 5) * 0.12;
      const c = TMP_COL.setHSL(hue % 1, green ? 0.85 : 0.95, hot ? 0.96 : 0.58);
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
   * Per-frame: (1) when armed, find every organism inside the void sphere and remove all victims with
   * one stable batch compaction; (2) fire due respawns ELSEWHERE; (3) advance + fade the burst.
   * `dt` is the sim delta (frozen dt = 0 ⇒ no kills/respawns, particles hold). O(n + POOL).
   */
  update(
    entities: EntityManager,
    t: number,
    dt: number,
    onKill?: (e: Entity, index: number) => void,
  ): void {
    const list = entities.list;
    if (this.active && dt > 0) {
      this.deathIndices.length = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (!e) continue;
        const p = e.position;
        const dx = p.x - PORTAL_X;
        const dy = p.y - PORTAL_Y;
        const dz = p.z - PORTAL_Z;
        if (dx * dx + dy * dy + dz * dz <= KILL_R2) {
          this.burst(p.x, p.y, p.z);
          const mi = e.userData.mi ?? 0;
          // V127 (USER): the gedanken death — let the world run Thaler's neural-death experiment on this
          // being's dying brain BEFORE it is disposed (its weights + senses are still live at index i).
          onKill?.(e, i);
          this.deathIndices.push(i);
          this.respawns.push({ at: t + RESPAWN_DELAY, mi });
          this.kills++;
        }
      }
      entities.disposeManyDescending(this.deathIndices);
    }
    // Due deaths re-enter the world ELSEWHERE — spawn(null) = a fresh random platform spot (rng-seeded).
    while ((this.respawns[this.respawnHead]?.at ?? Infinity) <= t) {
      const r = this.respawns[this.respawnHead++];
      if (r) entities.spawn(null, r.mi);
    }
    if (this.respawnHead === this.respawns.length) {
      this.respawns.length = 0;
      this.respawnHead = 0;
    } else if (this.respawnHead >= 64 && this.respawnHead * 2 >= this.respawns.length) {
      this.respawns.copyWithin(0, this.respawnHead);
      this.respawns.length -= this.respawnHead;
      this.respawnHead = 0;
    }
    // Advance + fade the burst (drag + gravity + a chaotic warp swirl; fade base colour by life fraction).
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const f = nL > 0 ? nL / LIFE : 0; // 1 → 0 over LIFE
      const o = i * 3;
      const sw = Math.sin(t * 6 + i) * 9 * ARENA_MID * dt; // deterministic warp swirl
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) - 16 * ARENA_MID * dt; // gravity
      this.posArr[o] = (this.posArr[o] ?? 0) + ((this.vel[o] ?? 0) + sw) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + ((this.vel[o + 2] ?? 0) - sw) * dt;
      // Fade toward black (additive ⇒ vanishes) from the STORED base colour — never compounds.
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
