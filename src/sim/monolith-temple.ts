/**
 * THE MONOLITH TEMPLE (CONTRACTS V63) — the level-100 ascension end-state made physical. When the
 * super creature reaches the LEGENDARY apex (`SuperEvolution.ascended`), a **megalithic trilithon
 * temple** rises from the field: a stepped plinth, two colossal tapered pillars, a great lintel, and
 * — framed between the pillars — a shimmering **portal** (the gateway to GAME STAGE 2, the "Eshkol
 * Tsotchke" second world, built later). It rises over a couple of seconds, then breathes + spins its
 * glyph-rings forever.
 *
 * Self-contained + GUARDED-friendly: it builds its own meshes, hides them until {@link reveal}, and
 * frees every geometry + material on {@link dispose}. Purely visual — no sim state, no rng, animated
 * from `t`/`dt` only — so it is determinism-neutral (it can be revealed by the impure evolution
 * META-layer without ever perturbing the population golden).
 */
import * as THREE from 'three';
import { ARENA_MID } from './constants';

/** Seconds the temple takes to rise into place once revealed. */
const RISE_TIME = 2.4;
/** How far below its resting height the temple starts when it rises. */
const RISE_DROP = 60 * ARENA_MID;

/** Stone palette + the portal's two shimmer colours (absorb-cyan ↔ ascension-violet). */
const STONE = 0x2a2f3a;
const PORTAL_A = new THREE.Color(0.3, 0.85, 1.0);
const PORTAL_B = new THREE.Color(0.75, 0.4, 1.0);

export class MonolithTemple {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly portalMat: THREE.MeshBasicMaterial;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly rings: THREE.Mesh[] = [];
  private readonly portalColor = new THREE.Color();
  private _revealed = false;
  private age = 0;
  /** Resting Y the temple settles at (set on reveal). */
  private restY = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const U = ARENA_MID;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: STONE,
      roughness: 0.82,
      metalness: 0.15,
      emissive: 0x0a0d14,
      emissiveIntensity: 0.4,
    });
    this.mats.push(stoneMat);
    const stone = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ): THREE.Mesh => {
      const g = new THREE.BoxGeometry(w, h, d);
      this.geos.push(g);
      const m = new THREE.Mesh(g, stoneMat);
      m.position.set(x, y, z);
      m.frustumCulled = false;
      this.group.add(m);
      return m;
    };

    // Stepped plinth — three shrinking slabs.
    stone(46 * U, 3 * U, 30 * U, 0, 1.5 * U, 0);
    stone(38 * U, 2.4 * U, 24 * U, 0, 4.2 * U, 0);
    stone(30 * U, 1.8 * U, 18 * U, 0, 6.3 * U, 0);

    // Two colossal pillars (slightly tapered via a cylinder with unequal radii) + the lintel.
    const pillarGeo = new THREE.CylinderGeometry(3.4 * U, 4.6 * U, 34 * U, 6);
    this.geos.push(pillarGeo);
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, stoneMat);
      p.position.set(sx * 9 * U, 7.2 * U + 17 * U, 0);
      p.frustumCulled = false;
      this.group.add(p);
    }
    stone(28 * U, 4 * U, 7 * U, 0, 7.2 * U + 34 * U + 2 * U, 0); // the great lintel

    // The PORTAL — a glowing disc framed by a bright ring, between the pillars.
    const portalY = 7.2 * U + 17 * U;
    const discGeo = new THREE.CircleGeometry(7.5 * U, 48);
    this.geos.push(discGeo);
    this.portalMat = new THREE.MeshBasicMaterial({
      color: PORTAL_A.clone(),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.portalMat);
    const disc = new THREE.Mesh(discGeo, this.portalMat);
    disc.position.set(0, portalY, 0);
    disc.frustumCulled = false;
    this.group.add(disc);

    const ringGeo = new THREE.TorusGeometry(7.8 * U, 0.7 * U, 12, 60);
    this.geos.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbfe9ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, portalY, 0);
    ring.frustumCulled = false;
    this.group.add(ring);
    this.rings.push(ring);

    // Two counter-rotating glyph-rings around the portal (the gateway "spins up").
    for (let i = 0; i < 2; i++) {
      const gg = new THREE.TorusGeometry((10 + i * 2.4) * U, 0.28 * U, 8, 50);
      this.geos.push(gg);
      const gm = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x8fdcff : 0xc79bff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.mats.push(gm);
      const gr = new THREE.Mesh(gg, gm);
      gr.position.set(0, portalY, 0);
      gr.rotation.x = i === 0 ? 0.5 : -0.5;
      gr.frustumCulled = false;
      this.group.add(gr);
      this.rings.push(gr);
    }

    // A soft outer halo so the whole gateway glows.
    const haloGeo = new THREE.SphereGeometry(13 * U, 20, 20);
    this.geos.push(haloGeo);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x6fb8ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.haloMat);
    const halo = new THREE.Mesh(haloGeo, this.haloMat);
    halo.position.set(0, portalY, 0);
    halo.frustumCulled = false;
    this.group.add(halo);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  /** Whether the temple has risen. */
  get revealed(): boolean {
    return this._revealed;
  }

  /**
   * Raise the temple at `(x, y, z)` (idempotent — calling again just repositions). `silent` skips
   * the rise animation (used on boot when restoring an already-ascended creature so it's just THERE).
   */
  reveal(x: number, y: number, z: number, silent = false): void {
    this.restY = y;
    this.group.position.set(x, silent ? y : y - RISE_DROP, z);
    this.group.visible = true;
    this._revealed = true;
    if (silent) this.age = RISE_TIME;
  }

  /**
   * Animate the gateway: ease it into place over {@link RISE_TIME}, then breathe the portal, cycle
   * its colour, and spin the glyph-rings. No-op while hidden. Pure `t`/`dt` math (no rng). O(1).
   */
  update(dt: number, t: number): void {
    if (!this._revealed) return;
    this.age += dt;
    const rise = this.age < RISE_TIME ? this.age / RISE_TIME : 1;
    const ease = 1 - (1 - rise) * (1 - rise); // ease-out
    this.group.position.y = this.restY - RISE_DROP * (1 - ease);

    const pulse = 0.5 + Math.sin(t * 1.6) * 0.5;
    this.portalColor.copy(PORTAL_A).lerp(PORTAL_B, pulse);
    this.portalMat.color.copy(this.portalColor);
    this.portalMat.opacity = (0.35 + pulse * 0.35) * ease;
    this.haloMat.opacity = (0.12 + pulse * 0.12) * ease;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r) continue;
      r.rotation.z += (i % 2 === 0 ? 0.012 : -0.018) * (0.5 + pulse);
      const m = r.material as THREE.MeshBasicMaterial;
      m.opacity = (0.55 + pulse * 0.3) * ease;
    }
  }

  /** Remove + free all GPU resources. */
  dispose(): void {
    this.scene.remove(this.group);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}
