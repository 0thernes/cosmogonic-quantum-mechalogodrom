/**
 * BOUNCE IMPACT FX (V128, USER stage E — visible-hazard polish) — the ragdoll {@link CollisionBounce}
 * ejects + ricochets organisms off the god‑bodies (Super Creatures / APEX / Temple / Tower) but does it
 * INVISIBLY: only position + velocity change, so the owner's "shake + bounce off" reads as nothing on
 * screen. This throws a bright electric SPARK burst at each contact point — a little shockwave of white→
 * cyan flecks fanning off the surface — so every ricochet visibly POPS.
 *
 * SELF‑CONTAINED: it re‑runs the same cheap penetration test as {@link CollisionBounce} on the SAME
 * collider set (a handful of spheres) rather than reaching into that module — so it adds a spark without
 * touching the physics, and can't perturb the bounce logic. It reads entity positions and mutates
 * NOTHING (pure VFX). Cheap: O(n · colliders), capped at {@link MAX_IMPACTS} sparked contacts/frame.
 *
 * DETERMINISM (ADR 0004): every spark's velocity + colour is an index/golden‑angle hash — ZERO rng, no
 * `Date.now`. A world‑level system (never in the bare‑EntityManager golden trace). One additive Points
 * pool, owned + disposed here.
 */
import * as THREE from 'three';

/** A solid spherical body organisms bounce off (mirror of collision-bounce's BounceCollider). */
export interface ImpactCollider {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly r: number;
}

/** The minimum the FX reads from the pool — positions only (it mutates nothing). */
export interface ImpactPool {
  readonly list: { readonly position: THREE.Vector3 }[];
}

const POOL = 640;
const SPARKS_PER_IMPACT = 8;
const MAX_IMPACTS = 40; // budget — a crowd slamming a body sparks over frames, no hitch
const LIFE = 0.45; // sparks snap bright then vanish (an impact, not a fire)
const TMP = new THREE.Color();

export class BounceImpactFX {
  private readonly scene: THREE.Scene;
  private readonly geo = new THREE.BufferGeometry();
  private readonly posArr = new Float32Array(POOL * 3);
  private readonly colArr = new Float32Array(POOL * 3);
  private readonly baseCol = new Float32Array(POOL * 3);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly life = new Float32Array(POOL);
  private readonly points: THREE.Points;
  private cursor = 0;
  /** Cumulative sparked contacts (telemetry / tests). */
  sparks = 0;

  constructor(scene: THREE.Scene, size = 4) {
    this.scene = scene;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    const mat = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      fog: false,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  /** Throw a shockwave of sparks off the surface at `(x,y,z)`, fanned around the outward normal `n`. */
  private burst(x: number, y: number, z: number, nx: number, ny: number, nz: number): void {
    // Build a tangent basis around the normal so sparks fan across the surface, not just straight out.
    let tx = -ny;
    let ty = nx;
    let tz = 0;
    if (tx * tx + ty * ty + tz * tz < 1e-4) {
      tx = 0;
      ty = -nz;
      tz = ny;
    }
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const bx = ny * tz - nz * ty;
    const by = nz * tx - nx * tz;
    const bz = nx * ty - ny * tx;
    for (let k = 0; k < SPARKS_PER_IMPACT; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = i * 2.399963229728653; // golden angle around the normal
      const cone = 0.55 + ((i % 5) / 5) * 0.4; // fan width
      const sp = 9 + ((i * 13) % 11); // spark speed
      const dirX = nx * cone + (tx * Math.cos(a) + bx * Math.sin(a)) * (1 - cone);
      const dirY = ny * cone + (ty * Math.cos(a) + by * Math.sin(a)) * (1 - cone);
      const dirZ = nz * cone + (tz * Math.cos(a) + bz * Math.sin(a)) * (1 - cone);
      const o = i * 3;
      this.posArr[o] = x;
      this.posArr[o + 1] = y;
      this.posArr[o + 2] = z;
      this.vel[o] = dirX * sp;
      this.vel[o + 1] = dirY * sp;
      this.vel[o + 2] = dirZ * sp;
      // Electric palette: hot white cores → cyan flecks (a hard, cold impact spark).
      const hot = i % 3 === 0;
      const c = TMP.setHSL(0.52, hot ? 0.15 : 0.9, hot ? 0.98 : 0.62);
      this.baseCol[o] = c.r;
      this.baseCol[o + 1] = c.g;
      this.baseCol[o + 2] = c.b;
      this.colArr[o] = c.r;
      this.colArr[o + 1] = c.g;
      this.colArr[o + 2] = c.b;
      this.life[i] = LIFE;
    }
    this.sparks++;
  }

  /**
   * Detect the penetrating organisms (about to be ejected by CollisionBounce this frame) and spark at
   * each contact point; then advance + fade the sparks. `dt = 0` (paused) ⇒ no new sparks, sparks hold.
   */
  update(colliders: readonly ImpactCollider[], pool: ImpactPool, dt: number): void {
    if (dt > 0 && colliders.length > 0) {
      const list = pool.list;
      let impacts = 0;
      for (let i = 0; i < list.length && impacts < MAX_IMPACTS; i++) {
        const e = list[i];
        if (!e) continue;
        const p = e.position;
        for (let c = 0; c < colliders.length; c++) {
          const col = colliders[c]!;
          const dx = p.x - col.x;
          const dy = p.y - col.y;
          const dz = p.z - col.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          const r = col.r;
          if (d2 >= r * r || d2 <= 1e-8) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const nz = dz / d;
          this.burst(col.x + nx * r, col.y + ny * r, col.z + nz * r, nx, ny, nz);
          impacts++;
          break; // one spark per organism per frame (matches CollisionBounce's one-bounce rule)
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

  /** Free the spark pool + detach from the scene. */
  dispose(): void {
    this.scene.remove(this.points);
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
