/**
 * DOME FEEDING (V127, USER: "All the things in the dome eat Entities and Plants Biome … Everything goes
 * to them if they are hungry and desiring. They die off with animation and then respawn in 5 seconds
 * (Quantum Death …)"). The generalization of {@link SuperHunt} (which feeds the apexes) across the rest
 * of the roaming fauna — the TITANS, LEVIATHANS, and PUPPETEERS. (Shoggoths already run their own
 * consumption cycle; the apexes eat via SuperHunt — so those are left as-is to avoid double-eating.)
 *
 * Each frame every feeder body GRAZES the flora at its own footprint (nibbling the plant biomass down —
 * the flora's shader shows it) and EATS any organism that wanders within {@link EAT_R} of it: the
 * organism bursts in a green feed-puff and re-enters the world ELSEWHERE {@link RESPAWN_DELAY} seconds
 * later. ONE backwards scan of `entities.list` handles the eating for ALL feeders at once (backwards so a
 * `disposeAt` never shifts an unvisited index).
 *
 * DETERMINISM (ADR 0004): grazing + eat tests are pure geometry; a respawn draws seeded `ctx.rng` via
 * {@link EntityManager.spawn}; the feed-puff VFX draws ZERO rng; the 5-second timer is sim-time based.
 * Only ORGANISMS are eaten (the feeders themselves, the Pantheon, and the apexes are separate bodies and
 * are never prey). One additive puff Points pool, owned + disposed here.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { EntityManager } from './entities';
import type { SimContext } from '../types';

/** A roaming body that grazes plants + eats organisms near it (titans / leviathans / puppeteers). */
export interface DomeFeeder {
  /** Visit each LIVE member's world position (downed / hidden members are skipped). Allocation-free. */
  eachFeederPos(cb: (x: number, y: number, z: number) => void): void;
}

/** How close an organism must be for a feeder to swallow it. */
const EAT_R = 8 * ARENA_MID; // 20
const EAT_R2 = EAT_R * EAT_R;
/** Graze appetite fed to flora.grazeAt at each feeder's footprint. */
const GRAZE_PRESSURE = 0.7;
/** "respawn in 5 seconds." */
const RESPAWN_DELAY = 5;
/** Max feeders tracked per frame (10 titans + 4 leviathans + ~14 puppeteers ≈ 28; headroom to 64). */
const MAX_FEEDERS = 64;

const POOL = 720;
const PER_EAT = 16;
const LIFE = 0.7;
const TMP = new THREE.Color();

export interface DomeFeedingStats {
  /** Cumulative organisms eaten by the dome fauna. */
  eaten: number;
  /** Organisms awaiting their 5-second respawn. */
  pending: number;
}

export class DomeFeeding {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  /** Flat feeder positions collected each frame (x,y,z per slot). */
  private readonly feederXYZ = new Float32Array(MAX_FEEDERS * 3);
  private readonly respawns: { at: number; mi: number }[] = [];
  eaten = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.7 * ARENA_MID,
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

  stats(): DomeFeedingStats {
    return { eaten: this.eaten, pending: this.respawns.length };
  }

  /** Green feed-puff of {@link PER_EAT} motes at `(x,y,z)`. Deterministic (index hashes, no rng). */
  private puff(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_EAT; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653;
      const b = (((i % 7) * 0.9 + k * 0.618) % Math.PI) - Math.PI / 2;
      const sp = (0.3 + ((i * 11) % 9) / 9) * 11 * ARENA_MID;
      const cb = Math.cos(b);
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(a) * cb * sp;
      this.vel[o + 1] = Math.sin(b) * sp + 2 * ARENA_MID;
      this.vel[o + 2] = Math.sin(a) * cb * sp;
      const hot = i % 6 === 0;
      const hue = 0.26 + ((i % 5) / 5) * 0.13; // green..lime..chartreuse
      const c = TMP.setHSL(hue, hot ? 0.4 : 0.9, hot ? 0.94 : 0.54);
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
   * Per-frame: (1) collect every feeder's position + GRAZE the flora under it; (2) eat any organism within
   * EAT_R of any feeder (ONE backwards scan); (3) fire due respawns ELSEWHERE; (4) fade the feed-puffs.
   * `graze` is flora.grazeAt (world XZ → nibble). Frozen dt=0 ⇒ no feeding (puffs hold). O(feeders·n + POOL).
   */
  update(
    feeders: readonly DomeFeeder[],
    entities: EntityManager,
    graze: (x: number, z: number, pressure: number, dt: number) => void,
    t: number,
    dt: number,
  ): void {
    if (dt > 0) {
      // (1) collect feeder positions + graze the flora at each footprint.
      let fc = 0;
      const xyz = this.feederXYZ;
      for (const f of feeders) {
        f.eachFeederPos((x, y, z) => {
          if (fc >= MAX_FEEDERS) return;
          const o = fc * 3;
          xyz[o] = x;
          xyz[o + 1] = y;
          xyz[o + 2] = z;
          fc++;
          graze(x, z, GRAZE_PRESSURE, dt);
        });
      }
      // (2) eat organisms near ANY feeder — one backwards scan.
      if (fc > 0) {
        const list = entities.list;
        for (let i = list.length - 1; i >= 0; i--) {
          const e = list[i];
          if (!e) continue;
          const p = e.position;
          for (let g = 0; g < fc; g++) {
            const o = g * 3;
            const dx = p.x - xyz[o]!;
            const dy = p.y - xyz[o + 1]!;
            const dz = p.z - xyz[o + 2]!;
            if (dx * dx + dy * dy + dz * dz <= EAT_R2) {
              this.puff(p.x, p.y, p.z);
              const mi = e.userData.mi ?? 0;
              entities.disposeAt(i); // O(1); backwards scan ⇒ index shift is safe
              this.respawns.push({ at: t + RESPAWN_DELAY, mi });
              this.eaten++;
              break; // this organism is gone — stop checking feeders
            }
          }
        }
      }
    }
    // (3) eaten organisms re-enter ELSEWHERE.
    while (this.respawns.length > 0 && (this.respawns[0]?.at ?? Infinity) <= t) {
      const r = this.respawns.shift();
      if (r) entities.spawn(null, r.mi);
    }
    // (4) advance + fade the feed-puffs.
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const f = nL > 0 ? nL / LIFE : 0;
      const o = i * 3;
      this.vel[o] = (this.vel[o] ?? 0) * (1 - 1.8 * dt);
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) * (1 - 1.8 * dt) + 3 * ARENA_MID * dt;
      this.vel[o + 2] = (this.vel[o + 2] ?? 0) * (1 - 1.8 * dt);
      this.posArr[o] = (this.posArr[o] ?? 0) + (this.vel[o] ?? 0) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + (this.vel[o + 2] ?? 0) * dt;
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

  /** Remove the puff mesh + free its GPU resources (World.dispose / HMR safe). */
  dispose(): void {
    this.ctx.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
