/**
 * SUPER FEEDING (V128, USER stage C) — the Super Creatures HUNT and EAT the organism swarm as food/fuel.
 * The 5 apex minds already PERCEIVE prey (`SuperCreature` percept `preyClose`) and steer with their HUNT
 * plans; this closes the loop — CONSUMPTION. Any organism inside an apex body's maw radius is DEVOURED:
 * it undergoes the real gedanken neural-death (the world runs Thaler's dissolution on its 70-param brain
 * via the `onEat` hook — its dying mind is MEASURED, not just deleted), then re-enters the world
 * ELSEWHERE {@link FEED_RESPAWN_DELAY} seconds later, and a shower of ember-gold motes streams from the
 * prey INTO the eater (the meal made visible). The Super Creature / APEX are outside the swarm, so an
 * apex never eats itself; NHIs (isNhi) fly their own mind and are spared the maw.
 *
 * DETERMINISM (ADR 0004): the kill test is pure geometry; a respawn is a real sim event drawing the
 * seeded `ctx.rng` (via {@link EntityManager.spawn}), exactly as organic growth does. The absorption VFX
 * draws ZERO rng (index/golden-angle hashes) so the spectacle never perturbs the population golden. One
 * additive `THREE.Points` pool, owned + disposed here. O(supers·n + POOL) per frame.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { EntityManager } from './entities';
import type { Entity, SimContext } from '../types';

/** Maw radius — an apex body devours organisms within this of its centre. */
const EAT_R = 9 * ARENA_MID;
const EAT_R2 = EAT_R * EAT_R;
/** At most this many organisms devoured per apex per frame (a mouth, not a black hole). */
const BITES_PER_FRAME = 3;
/** "They respawn right after in 5 seconds." (USER) */
export const FEED_RESPAWN_DELAY = 5;

/** Absorption-mote pool: prey-into-eater ember streams. */
const POOL = 900;
const PER_BITE = 20;
const LIFE = 0.55;
const TMP = new THREE.Color();

export class SuperFeeding {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  /** Per-mote target (the eater's centre it streams toward) + a fixed inward speed. */
  private readonly tgt = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  private readonly respawns: { at: number; mi: number }[] = [];
  /** Cumulative organisms eaten (telemetry / tests). */
  meals = 0;

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

  stats(): { meals: number; pending: number } {
    return { meals: this.meals, pending: this.respawns.length };
  }

  /** Emit {@link PER_BITE} ember-gold motes at the prey `(px,py,pz)` that stream toward the eater
   *  `(ex,ey,ez)` — the meal being absorbed. Deterministic (index hashes, no rng). O(PER_BITE). */
  private absorb(px: number, py: number, pz: number, ex: number, ey: number, ez: number): void {
    for (let k = 0; k < PER_BITE; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653;
      const el = (((i * 5 + k) % 11) / 11 - 0.5) * Math.PI;
      const r = (0.4 + ((i * 7) % 5) / 5) * 3 * ARENA_MID; // scatter around the prey at bite time
      const ce = Math.cos(el);
      const o = i * 3;
      this.posArr[o] = px + Math.cos(a) * ce * r;
      this.posArr[o + 1] = py + Math.sin(el) * r;
      this.posArr[o + 2] = pz + Math.sin(a) * ce * r;
      this.tgt[o] = ex;
      this.tgt[o + 1] = ey;
      this.tgt[o + 2] = ez;
      // ember-gold → hot-white core (fuel).
      const hot = i % 3 === 0;
      const c = TMP.setHSL(0.09 + ((i % 4) / 4) * 0.04, 0.9, hot ? 0.95 : 0.6);
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
   * Per-frame: each apex body at `superPos[j]` devours up to {@link BITES_PER_FRAME} organisms inside its
   * maw (nearest not required — first-in-range, backwards scan for safe index shift). `onEat(e, index)`
   * lets the world run the gedanken death BEFORE disposal. Then fire due respawns ELSEWHERE and advance
   * the absorption motes. Frozen dt = 0 ⇒ no eating. O(supers·n + POOL).
   */
  update(
    superPos: readonly THREE.Vector3[],
    entities: EntityManager,
    t: number,
    dt: number,
    onEat?: (e: Entity, index: number) => void,
  ): void {
    const list = entities.list;
    if (dt > 0 && superPos.length > 0) {
      for (let j = 0; j < superPos.length; j++) {
        const c = superPos[j];
        if (!c) continue;
        let bites = 0;
        for (let i = list.length - 1; i >= 0 && bites < BITES_PER_FRAME; i--) {
          const e = list[i];
          if (!e || e.userData.isNhi) continue; // launched NHIs are spared
          const p = e.position;
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const dz = p.z - c.z;
          if (dx * dx + dy * dy + dz * dz <= EAT_R2) {
            this.absorb(p.x, p.y, p.z, c.x, c.y, c.z);
            const mi = e.userData.mi ?? 0;
            onEat?.(e, i); // gedanken neural-death, measured, before disposal
            entities.disposeAt(i);
            this.respawns.push({ at: t + FEED_RESPAWN_DELAY, mi });
            this.meals++;
            bites++;
          }
        }
      }
    }
    while (this.respawns.length > 0 && (this.respawns[0]?.at ?? Infinity) <= t) {
      const r = this.respawns.shift();
      if (r) entities.spawn(null, r.mi);
    }
    // Advance the motes toward their eater + fade.
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const f = nL > 0 ? nL / LIFE : 0;
      const o = i * 3;
      const pull = Math.min(1, 6 * dt); // accelerate inward — sucked into the maw
      this.posArr[o] = (this.posArr[o] ?? 0) + ((this.tgt[o] ?? 0) - (this.posArr[o] ?? 0)) * pull;
      this.posArr[o + 1] =
        (this.posArr[o + 1] ?? 0) + ((this.tgt[o + 1] ?? 0) - (this.posArr[o + 1] ?? 0)) * pull;
      this.posArr[o + 2] =
        (this.posArr[o + 2] ?? 0) + ((this.tgt[o + 2] ?? 0) - (this.posArr[o + 2] ?? 0)) * pull;
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

  /** Remove the mote mesh + free its GPU resources (World.dispose / HMR safe). */
  dispose(): void {
    this.ctx.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
