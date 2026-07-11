/**
 * SUPER HUNT (V127, USER "Super Creature Hunts and Eats Entities as food and fuel … They respawn right
 * after in 5 seconds"). The apex super-creatures become PREDATORS: each frame every apex senses the
 * nearest organism within {@link SENSES_R}, bends its flight toward it (via {@link SuperBodySystem.setHuntTarget}),
 * and when it closes to within {@link EAT_R} it CONSUMES it — the organism bursts in a green feed-puff,
 * the apex banks the food ({@link SuperBodySystem.eat}), and a fresh organism re-enters the world ELSEWHERE
 * {@link RESPAWN_DELAY} seconds later.
 *
 * ONE backwards scan of `entities.list` does BOTH jobs at once (per organism, per apex): eat it if inside
 * EAT_R of that apex, else track it as that apex's nearest prey for the steering pass. Victims are then
 * removed by one stable batch compaction. Only ORGANISMS are prey here (plants are the dome-wide
 * feeding pass, item D); the Pantheon / mecha / other apexes are separate bodies and are never eaten.
 *
 * DETERMINISM (ADR 0004): distances are pure geometry; a respawn draws seeded `ctx.rng` via
 * {@link EntityManager.spawn} (like organic growth); the feed-puff VFX draws ZERO rng (index hashes); the
 * 5-second timer is sim-time based. One additive puff Points pool, owned + disposed here.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { EntityManager } from './entities';
import type { SuperBodySystem } from './super-body';
import type { Entity, SimContext } from '../types';

/** How far an apex SENSES prey (and turns to pursue). */
const SENSES_R = 60 * ARENA_MID; // 150
const SENSES_R2 = SENSES_R * SENSES_R;
/** How close the apex must be to swallow an organism. */
const EAT_R = 9 * ARENA_MID; // 22.5
const EAT_R2 = EAT_R * EAT_R;
/** "They respawn right after in 5 seconds." */
const RESPAWN_DELAY = 5;

const POOL = 640;
const PER_EAT = 18;
const LIFE = 0.7;
const TMP = new THREE.Color();

export interface SuperHuntStats {
  /** Cumulative organisms eaten across all apexes. */
  eaten: number;
  /** Organisms awaiting their 5-second respawn. */
  pending: number;
}

export class SuperHunt {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  /** Per-apex scratch (grown to match the body count on first use — no per-frame alloc after). */
  private readonly bodyPos: THREE.Vector3[] = [];
  private readonly nearPos: THREE.Vector3[] = [];
  private readonly nearD2: number[] = [];
  private readonly hasNear: boolean[] = [];
  private readonly respawns: { at: number; mi: number }[] = [];
  private respawnHead = 0;
  private readonly deathIndices: number[] = [];
  eaten = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.9 * ARENA_MID,
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

  stats(): SuperHuntStats {
    return { eaten: this.eaten, pending: this.respawns.length - this.respawnHead };
  }

  /** Cancel organisms queued by the pre-reset population so Genesis stays at one progenitor. */
  clearPendingRespawns(): void {
    this.respawns.length = 0;
    this.respawnHead = 0;
  }

  /** Green organic feed-puff of {@link PER_EAT} motes at `(x,y,z)` — a swallowed organism dissolving.
   *  Deterministic (golden-angle + index hashes, no rng). O(PER_EAT). */
  private puff(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_EAT; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653;
      const b = (((i % 7) * 0.9 + k * 0.618) % Math.PI) - Math.PI / 2;
      const sp = (0.3 + ((i * 11) % 9) / 9) * 12 * ARENA_MID;
      const cb = Math.cos(b);
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(a) * cb * sp;
      this.vel[o + 1] = Math.sin(b) * sp;
      this.vel[o + 2] = Math.sin(a) * cb * sp;
      // Bioluminescent green→lime feed spray, a few hot-white sparks.
      const hot = i % 6 === 0;
      const hue = 0.28 + ((i % 5) / 5) * 0.12; // green..lime..yellow-green
      const c = TMP.setHSL(hue, hot ? 0.4 : 0.9, hot ? 0.95 : 0.55);
      this.baseCol[o] = c.r;
      this.baseCol[o + 1] = c.g;
      this.baseCol[o + 2] = c.b;
      this.colArr[o] = c.r;
      this.colArr[o + 1] = c.g;
      this.colArr[o + 2] = c.b;
      this.life[i] = LIFE;
    }
  }

  /** Grow the per-apex scratch arrays to `n` slots (once; idempotent). */
  private ensureScratch(n: number): void {
    while (this.bodyPos.length < n) {
      this.bodyPos.push(new THREE.Vector3());
      this.nearPos.push(new THREE.Vector3());
      this.nearD2.push(Infinity);
      this.hasNear.push(false);
    }
  }

  /**
   * Per-frame: while advancing, each apex hunts + eats the organisms; then fire due respawns ELSEWHERE
   * and advance + fade the feed-puffs. Frozen dt=0 ⇒ no hunting (puffs hold). O(apexes · n + POOL).
   */
  update(
    bodies: readonly SuperBodySystem[],
    entities: EntityManager,
    t: number,
    dt: number,
    onEat?: (e: Entity, index: number) => void,
  ): void {
    const nb = bodies.length;
    if (dt > 0 && nb > 0) {
      this.ensureScratch(nb);
      for (let b = 0; b < nb; b++) {
        bodies[b]!.worldPosition(this.bodyPos[b]!);
        this.nearD2[b] = SENSES_R2;
        this.hasNear[b] = false;
      }
      const list = entities.list;
      this.deathIndices.length = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        // NHI backing bodies are explicitly consumption-immune. Lethal portal/mecha hazards remain a
        // separate policy; ordinary apex feeding must neither eat nor pursue an NHI as prey.
        if (!e || e.userData.isNhi) continue;
        const p = e.position;
        let consumed = false;
        for (let b = 0; b < nb; b++) {
          const bp = this.bodyPos[b]!;
          const dx = p.x - bp.x;
          const dy = p.y - bp.y;
          const dz = p.z - bp.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= EAT_R2) {
            this.puff(p.x, p.y, p.z);
            const mi = e.userData.mi ?? 0;
            // V127: the eaten organism's dying mind is MEASURED — the world runs Thaler's gedanken
            // neural-death on its 70-param brain BEFORE disposal (its weights + senses are still live).
            onEat?.(e, i);
            this.deathIndices.push(i);
            bodies[b]!.eat();
            this.respawns.push({ at: t + RESPAWN_DELAY, mi });
            this.eaten++;
            consumed = true;
            break;
          } else if (d2 < this.nearD2[b]!) {
            this.nearD2[b] = d2;
            this.nearPos[b]!.copy(p);
            this.hasNear[b] = true;
          }
        }
        if (consumed) continue;
      }
      entities.disposeManyDescending(this.deathIndices);
      // Steer: pursue the nearest sensed prey, else resume the idle wander.
      for (let b = 0; b < nb; b++) {
        if (this.hasNear[b]) {
          const np = this.nearPos[b]!;
          bodies[b]!.setHuntTarget(np.x, np.y, np.z);
        } else {
          bodies[b]!.clearHunt();
        }
      }
    }
    // Eaten organisms re-enter ELSEWHERE (fresh random platform spot).
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
    // Advance + fade the feed-puffs (drift + slight rise + fade).
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
