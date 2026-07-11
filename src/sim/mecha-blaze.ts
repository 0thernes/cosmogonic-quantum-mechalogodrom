/**
 * MECHA BLAZE (V127, USER: "Mechalogodrom also KILLS / DESTROYS Entities … like the portal but in a
 * FIERY BLAZE … respawn in 5 seconds randomly new place"). The Mechalogodrom hangs at a FIXED altitude
 * above the arena (0, {@link MECHA_Y}, 0); any organism that rises into the fiery cone hanging beneath it
 * is INCINERATED —
 * a fiery orange→red→gold eruption that streaks UPWARD (fire rises) — and re-enters the world ELSEWHERE
 * {@link RESPAWN_DELAY} seconds later at a fresh random spot.
 *
 * Structurally identical to {@link PortalDeath} (it too scans only `entities.list`), so the Super
 * Creature / APEX / Pantheon — separate bodies — are immune to the mecha's fire as well. UNLIKE the
 * portal it is ALWAYS armed (the mecha is always present, no ascension gate); the cone bottoms out at
 * {@link BLAZE_FLOOR} (upper third of the column), so the ground swarm is safe and only genuine high-
 * flyers in the middle of the dome burn.
 *
 * DETERMINISM (ADR 0004): the kill test is pure geometry; a respawn draws from the seeded `ctx.rng` via
 * {@link EntityManager.spawn} exactly as organic growth does (so same seed ⇒ same deaths + respawns),
 * and the VFX draws ZERO rng (a golden-angle/index hash seeds each ember). The 5-second timer is sim-time
 * based (frame-deterministic), never Date.now. One additive `THREE.Points` ember pool, owned + disposed.
 */
import * as THREE from 'three';
import { ARENA_MID, ARENA_RADIUS } from './constants';
import type { EntityManager } from './entities';
import type { Entity, SimContext } from '../types';

/** Mechalogodrom altitude — mirrors mechalogodrom.ts ALTITUDE = ARENA_RADIUS·0.92 (the God-Colossus's
 *  vertical center, ≈ 299). The group sits at (0, MECHA_Y, 0). */
export const MECHA_Y = ARENA_RADIUS * 0.92;
const MECHA_X = 0;
const MECHA_Z = 0;
// USER V127: the blaze REACHES DOWN — a widening fiery CONE hanging from the mecha into the central
// column, so high-flyers that rise anywhere under it actually get incinerated (a bare sphere at y≈299
// almost never bit, since organisms cap at the habitat ceiling). The cone is narrow at the machine
// (BASE_R, ≈ its exocage) and fans out as it falls, bottoming out at BLAZE_FLOOR — well above the
// ground swarm, so only genuine high-flyers in the middle of the dome burn.
/** Cone radius AT the mecha (a touch beyond the exocage CORE_R·2.7 ≈ 81). Tied to the god's body size,
 *  which is unchanged by the altitude change, so it stays 90. */
const BASE_R = 36 * ARENA_MID; // 90
/** Extra radius per world-unit of descent below the mecha — the cone fans out as the fire falls. */
const CONE_SPREAD = 0.34;
/** Lowest altitude the blaze reaches — below this, organisms are safe. The god hovers at the God-Colossus
 *  center (≈ 299); the cone hangs ~150u beneath it (floor 150 → god ≈ 299), sparing the ground swarm while
 *  catching genuine high-flyers in the central column. */
const BLAZE_FLOOR = 150;
/** A small cap above the mecha so an organism touching it from directly overhead still burns. */
const BLAZE_CEIL = MECHA_Y + 24 * ARENA_MID;
/** "respawn in 5 seconds randomly new place." */
const RESPAWN_DELAY = 5;

/** Ember pool: ~24 simultaneous deaths × PER_DEATH. Additive, always rendered when alive. */
const POOL = 780;
const PER_DEATH = 26;
/** Seconds an ember lives before it burns out (additive ⇒ black = invisible). */
const LIFE = 1.1;
const TMP = new THREE.Color();

/** Live stats for telemetry / tests. */
export interface MechaBlazeStats {
  /** Cumulative organisms incinerated by the mecha. */
  kills: number;
  /** Deaths awaiting their 5-second respawn. */
  pending: number;
  active: boolean;
}

export class MechaBlaze {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  private active = true;
  private readonly respawns: { at: number; mi: number }[] = [];
  private respawnHead = 0;
  private readonly deathIndices: number[] = [];
  kills = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.8 * ARENA_MID,
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

  /** Arm/disarm the blaze (world.ts holds it armed except while paused). O(1). */
  setActive(v: boolean): void {
    this.active = v;
  }

  stats(): MechaBlazeStats {
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
   * Erupt {@link PER_DEATH} fire embers at `(x,y,z)` — a hot-white core throwing gold → orange → deep-red
   * embers that shoot UPWARD (fire rises) and flicker out. Every value comes from the ring index (golden
   * angle + hashes), NOT rng, so the VFX can never perturb the seeded stream. O(PER_DEATH).
   */
  private ignite(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_DEATH; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653; // golden angle
      const rise = 0.35 + ((i * 7) % 9) / 9; // 0.35..1.24 upward bias
      const sp = (0.4 + ((i * 13) % 11) / 11) * 22 * ARENA_MID;
      const flare = 0.4 + ((i * 5) % 7) / 7; // lateral spread
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(a) * sp * flare;
      this.vel[o + 1] = sp * rise + 10 * ARENA_MID; // FIRE RISES
      this.vel[o + 2] = Math.sin(a) * sp * flare;
      // Flame palette: hot-white core → gold → orange → deep red (hue 0.02..0.14, high sat).
      const hot = i % 5 === 0;
      const hue = 0.02 + ((i % 7) / 7) * 0.11; // red→orange→gold
      const c = TMP.setHSL(hue, hot ? 0.55 : 0.95, hot ? 0.95 : 0.55);
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
   * Per-frame: (1) when armed, incinerate every organism inside the mecha's fiery cone (backwards scan)
   * and queue its respawn; (2) fire due respawns ELSEWHERE; (3) advance + fade the embers (buoyant rise +
   * drag). Frozen dt=0 ⇒ no kills (embers hold). O(n + POOL). `onKill(e,i)` fires while the burning
   * organism's brain + senses are STILL LIVE — the world runs Thaler's gedanken neural-death on it here.
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
        if (p.y < BLAZE_FLOOR || p.y > BLAZE_CEIL) continue; // outside the fiery column's vertical reach
        const dx = p.x - MECHA_X;
        const dz = p.z - MECHA_Z;
        // Downward-widening cone: the kill radius grows with how far the organism is BELOW the mecha,
        // so the blaze fans out as it falls (narrow at the machine, wide near BLAZE_FLOOR).
        const descent = MECHA_Y - p.y;
        const coneR = BASE_R + (descent > 0 ? descent * CONE_SPREAD : 0);
        if (dx * dx + dz * dz <= coneR * coneR) {
          this.ignite(p.x, p.y, p.z);
          const mi = e.userData.mi ?? 0;
          // Measure the incinerated mind BEFORE post-scan batch disposal (weights + senses still live).
          onKill?.(e, i);
          this.deathIndices.push(i);
          this.respawns.push({ at: t + RESPAWN_DELAY, mi });
          this.kills++;
        }
      }
      entities.disposeManyDescending(this.deathIndices);
    }
    while ((this.respawns[this.respawnHead]?.at ?? Infinity) <= t) {
      const r = this.respawns[this.respawnHead++];
      if (r) entities.spawn(null, r.mi); // fresh random platform spot (rng-seeded)
    }
    if (this.respawnHead === this.respawns.length) {
      this.respawns.length = 0;
      this.respawnHead = 0;
    } else if (this.respawnHead >= 64 && this.respawnHead * 2 >= this.respawns.length) {
      this.respawns.copyWithin(0, this.respawnHead);
      this.respawns.length -= this.respawnHead;
      this.respawnHead = 0;
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
      this.vel[o] = (this.vel[o] ?? 0) * (1 - 1.4 * dt); // drag
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) * (1 - 0.6 * dt) + 4 * ARENA_MID * dt; // buoyant (fire rises)
      this.vel[o + 2] = (this.vel[o + 2] ?? 0) * (1 - 1.4 * dt);
      this.posArr[o] = (this.posArr[o] ?? 0) + (this.vel[o] ?? 0) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + (this.vel[o + 2] ?? 0) * dt;
      // Fade from the STORED base colour by life fraction, with a fast flame flicker.
      const fl = f * (0.6 + 0.4 * Math.sin(t * 30 + i * 2.1));
      this.colArr[o] = (this.baseCol[o] ?? 0) * fl;
      this.colArr[o + 1] = (this.baseCol[o + 1] ?? 0) * fl;
      this.colArr[o + 2] = (this.baseCol[o + 2] ?? 0) * fl;
    }
    this.points.visible = anyAlive;
    if (anyAlive) {
      (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /** Remove the ember mesh + free its GPU resources (World.dispose / HMR safe). */
  dispose(): void {
    this.ctx.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
