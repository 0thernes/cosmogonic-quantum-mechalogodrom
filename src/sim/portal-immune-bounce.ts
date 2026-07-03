/**
 * PORTAL IMMUNE BOUNCE (V126, USER: "only Super Creatures and Pantheons bounce off it … flash briefly in
 * a white dazzling crazy shimmery millions-sparkles at hyper speed everywhere around the creature …
 * back to normal in 2 seconds"). The counterpart to {@link PortalDeathFauna}: where lesser fauna DIE at
 * the portal, the immune bodies RICOCHET — they cannot pass through the void throat, so they are ejected
 * back out (a bounce + vibrate at the rim) and wreathed in a fast-blooming white spark shower that fades
 * over ~{@link SPARK_LIFE} seconds.
 *
 * The bounce itself is owned by each immune body (see {@link PortalImmune.portalDeflect} — the pantheon
 * ejects the member from its nav cylinder + kicks its velocity outward); this system owns only the shared
 * white-sparkle Points pool and drives the deflect while the portal is armed. IMMUNE bodies never enter
 * {@link PortalDeathFauna} / {@link PortalDeath}, so nothing here can ever kill.
 *
 * DETERMINISM (ADR 0004): deflect is pure geometry; every spark value is an index/golden-angle hash (ZERO
 * rng) and it only runs post-ascension — it cannot perturb the population golden. One additive Points pool.
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';
import type { SimContext } from '../types';

/** An immune body that ricochets off the portal instead of dying (implemented by the pantheon roster). */
export interface PortalImmune {
  /**
   * Ricochet any member inside the portal kill-cylinder (vertical axis x=`ax`, z=`az`; squared radius
   * `r2`) back OUT — a bounce + rim vibration — and call `onBounce` at each for the white-spark flash.
   * Immune bodies never die. `t` is unused today but kept symmetric with {@link PortalCullable}.
   * Deterministic; O(members).
   */
  portalDeflect(
    ax: number,
    az: number,
    r2: number,
    onBounce: (x: number, y: number, z: number) => void,
  ): void;
}

/** Void-throat cylinder axis — matches {@link PortalDeathFauna} (so death + bounce share one portal zone). */
const PORTAL_X = 0;
const PORTAL_Z = -40 * ARENA_MID - 0.5 * ARENA_MID;
const BOUNCE_R = 11 * ARENA_MID;
const BOUNCE_R2 = BOUNCE_R * BOUNCE_R;

const POOL = 2400;
/** Sparks per bounce — a DENSE dazzling shower ("millions of sparkles"). */
const PER_BOUNCE = 64;
/** "back to normal in 2 seconds" — the shower blooms fast and is gone by ~2 s. */
const SPARK_LIFE = 2.0;
const TMP = new THREE.Color();

export class PortalImmuneBounce {
  private readonly ctx: SimContext;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  /** Cumulative bounces (telemetry / tests). */
  bounces = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.5 * ARENA_MID, // tiny, glittering
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    ctx.scene.add(this.points);
  }

  stats(): { bounces: number } {
    return { bounces: this.bounces };
  }

  /**
   * Emit a dazzling WHITE spark shower of {@link PER_BOUNCE} tiny points around `(x,y,z)` at hyper speed
   * in every direction (a few carry a cool blue-white shimmer). Deterministic (golden-angle + index
   * hashes, no rng). O(PER_BOUNCE).
   */
  private spark(x: number, y: number, z: number): void {
    for (let k = 0; k < PER_BOUNCE; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      // Even sphere of directions (golden-angle spiral) so sparks fly EVERYWHERE around the creature.
      const yy = 1 - (((i % PER_BOUNCE) + 0.5) / PER_BOUNCE) * 2; // 1 → -1
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const phi = i * 2.399963229728653;
      const sp = (0.6 + ((i * 17) % 13) / 13) * 46 * ARENA_MID; // HYPER speed
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = Math.cos(phi) * rr * sp;
      this.vel[o + 1] = yy * sp;
      this.vel[o + 2] = Math.sin(phi) * rr * sp;
      // Mostly hot white; a fraction a cool blue-white shimmer for the "shiny" glint.
      const cool = i % 6 === 0;
      const c = cool ? TMP.setHSL(0.58, 0.35, 0.96) : TMP.setHSL(0, 0, 1);
      this.baseCol[o] = c.r;
      this.baseCol[o + 1] = c.g;
      this.baseCol[o + 2] = c.b;
      this.colArr[o] = c.r;
      this.colArr[o + 1] = c.g;
      this.colArr[o + 2] = c.b;
      this.life[i] = SPARK_LIFE;
    }
    this.bounces++;
  }

  /**
   * Per-frame: while armed (temple revealed) and advancing, ricochet every immune body out of the portal
   * cylinder (each sparks on contact), then advance + fade the spark shower (drag makes the hyper-fast
   * sparks slow + twinkle out by ~{@link SPARK_LIFE}s). Frozen dt=0 ⇒ no bounces. O(Σ members + POOL).
   */
  update(active: boolean, t: number, dt: number, immunes: readonly PortalImmune[]): void {
    if (active && dt > 0) {
      const onBounce = (x: number, y: number, z: number): void => this.spark(x, y, z);
      for (const im of immunes) im.portalDeflect(PORTAL_X, PORTAL_Z, BOUNCE_R2, onBounce);
    }
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      const L = this.life[i] ?? 0;
      if (L <= 0) continue;
      anyAlive = true;
      const nL = L - dt;
      this.life[i] = nL > 0 ? nL : 0;
      const frac = nL > 0 ? nL / SPARK_LIFE : 0; // 1 → 0 over SPARK_LIFE
      const o = i * 3;
      const drag = 1 - 2.6 * dt; // fast sparks decelerate into a twinkle
      const d = drag > 0 ? drag : 0;
      this.vel[o] = (this.vel[o] ?? 0) * d;
      this.vel[o + 1] = (this.vel[o + 1] ?? 0) * d - 6 * ARENA_MID * dt; // a little gravity
      this.vel[o + 2] = (this.vel[o + 2] ?? 0) * d;
      this.posArr[o] = (this.posArr[o] ?? 0) + (this.vel[o] ?? 0) * dt;
      this.posArr[o + 1] = (this.posArr[o + 1] ?? 0) + (this.vel[o + 1] ?? 0) * dt;
      this.posArr[o + 2] = (this.posArr[o + 2] ?? 0) + (this.vel[o + 2] ?? 0) * dt;
      // Twinkle: modulate brightness with a fast per-spark flicker as it fades (the "shimmery" glint).
      const tw = 0.55 + 0.45 * Math.sin(t * 40 + i * 1.7);
      const b = frac * tw;
      this.colArr[o] = (this.baseCol[o] ?? 0) * b;
      this.colArr[o + 1] = (this.baseCol[o + 1] ?? 0) * b;
      this.colArr[o + 2] = (this.baseCol[o + 2] ?? 0) * b;
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
