/**
 * THE MONOLITH TEMPLE (CONTRACTS V63) — the level-100 ascension end-state made physical. When the
 * super creature reaches the LEGENDARY apex (`SuperEvolution.ascended`), a **megalithic trilithon
 * temple** rises from the field: a stepped plinth, two colossal tapered pillars, a great lintel,
 * an impossible warped cage, a black-hole shadow core, spike altars, and — framed between the
 * pillars — a shimmering **portal** (the gateway to GAME STAGE 2, the "Eshkol Tsotchke" second
 * world, built later). It rises over a couple of seconds, then breathes + spins its glyph-rings
 * forever.
 *
 * Self-contained + GUARDED-friendly: it builds its own meshes, hides them until {@link reveal}, and
 * frees every geometry + material on {@link dispose}. Purely visual — no sim state, no rng, animated
 * from `t`/`dt` plus read-only world scalars (`setEnvironment`) — so it is determinism-neutral (it
 * can be revealed by the impure evolution META-layer without ever perturbing the population golden).
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { ARENA_MID } from './constants';

/** Seconds the temple takes to rise into place once revealed. */
const RISE_TIME = 2.4;
/** How far below its resting height the temple starts when it rises. */
const RISE_DROP = 60 * ARENA_MID;

/** Stone palette + the portal's two shimmer colours (absorb-cyan ↔ ascension-violet). */
const STONE = 0x2a2f3a;
const PORTAL_A = new THREE.Color(0.3, 0.85, 1.0);
const PORTAL_B = new THREE.Color(0.75, 0.4, 1.0);

export interface TempleEnvironment {
  /** Normalized chaos, 0..1 (world passes `state.chaos / CHAOS_MAX`). */
  readonly chaos: number;
  /** Normalized entropy/order/heat-death axis, 0..1 (world passes `state.entropy / ENTROPY_MAX`). */
  readonly entropy: number;
  /** Live logical organism count. */
  readonly population: number;
  /** Current tier capacity, used only to normalize crowding. */
  readonly capacity: number;
}

export interface MonolithTempleSnapshot {
  readonly revealed: boolean;
  /** Rise ease 0..1. */
  readonly rise: number;
  /** Real-bound drive from chaos + entropy + crowding, 0..1. */
  readonly reactivity: number;
  /** Portal/cage shimmer scalar, 0..1-ish. */
  readonly shimmer: number;
  /** Shadow-core intensity scalar, 0..1-ish. */
  readonly shadow: number;
  /** Warped-cage displacement amplitude in world units. */
  readonly cageWarp: number;
  /** Population / capacity, guarded and clamped. */
  readonly crowding: number;
  /** Number of direct children in the temple rig. */
  readonly visualNodes: number;
}

export class MonolithTemple {
  private readonly scene: THREE.Scene;
  private readonly group = new THREE.Group();
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly portalMat: THREE.MeshBasicMaterial;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly singularityMat: THREE.MeshBasicMaterial;
  private readonly cageMat: THREE.LineBasicMaterial;
  private readonly shardMat: THREE.MeshStandardMaterial;
  private readonly rings: THREE.Mesh[] = [];
  private readonly shards: THREE.Mesh[] = [];
  private readonly cage: THREE.LineSegments;
  private readonly cageGeo: THREE.BufferGeometry;
  private readonly cageBase: Float32Array;
  private readonly shadowCore: THREE.Mesh;
  private readonly singularityRing: THREE.Mesh;
  private readonly portalColor = new THREE.Color();
  private _revealed = false;
  private age = 0;
  private chaos = 0;
  private entropy = 0;
  private crowding = 0;
  private rise = 0;
  private reactivity = 0;
  private shimmer = 0;
  private shadow = 0;
  private cageWarp = 0;
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

    // Jagged altar-spikes around the plinth: the temple no longer reads as a clean civic gate.
    this.shardMat = new THREE.MeshStandardMaterial({
      color: 0x16101d,
      roughness: 0.45,
      metalness: 0.55,
      emissive: 0x260018,
      emissiveIntensity: 0.75,
    });
    this.mats.push(this.shardMat);
    const shardGeo = new THREE.ConeGeometry(1.8 * U, 11 * U, 5);
    this.geos.push(shardGeo);
    for (let i = 0; i < 12; i++) {
      const th = (Math.PI * 2 * i) / 12;
      const sx = Math.cos(th) * 20 * U;
      const sz = Math.sin(th) * 12 * U;
      const sh = new THREE.Mesh(shardGeo, this.shardMat);
      sh.position.set(sx, 9 * U, sz);
      sh.rotation.z = Math.sin(th) * 0.45;
      sh.rotation.x = -Math.cos(th) * 0.32;
      sh.frustumCulled = false;
      this.group.add(sh);
      this.shards.push(sh);
    }

    // The PORTAL — a glowing disc framed by a bright ring, between the pillars.
    const portalY = 7.2 * U + 17 * U;
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.mats.push(this.shadowMat);
    this.shadowCore = new THREE.Mesh(new THREE.SphereGeometry(5.6 * U, 24, 16), this.shadowMat);
    this.geos.push(this.shadowCore.geometry);
    this.shadowCore.position.set(0, portalY, -0.4 * U);
    this.shadowCore.frustumCulled = false;
    this.group.add(this.shadowCore);

    this.singularityMat = new THREE.MeshBasicMaterial({
      color: 0x08000f,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.singularityMat);
    const singularityGeo = new THREE.TorusGeometry(6.4 * U, 0.55 * U, 10, 72);
    this.geos.push(singularityGeo);
    this.singularityRing = new THREE.Mesh(singularityGeo, this.singularityMat);
    this.singularityRing.position.set(0, portalY, -0.3 * U);
    this.singularityRing.frustumCulled = false;
    this.group.add(this.singularityRing);

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

    // Impossible cage: several skewed rings cross-linked at non-neighboring phases. Per-frame warp
    // makes it react like a mathematical abomination without hand-written GLSL.
    this.cageGeo = this.buildCageGeo();
    this.geos.push(this.cageGeo);
    this.cageBase = new Float32Array(
      (this.cageGeo.getAttribute('position') as THREE.BufferAttribute).array as ArrayLike<number>,
    );
    this.cageMat = new THREE.LineBasicMaterial({
      color: 0xa600ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mats.push(this.cageMat);
    this.cage = new THREE.LineSegments(this.cageGeo, this.cageMat);
    this.cage.frustumCulled = false;
    this.group.add(this.cage);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  /** Whether the temple has risen. */
  get revealed(): boolean {
    return this._revealed;
  }

  /** Feed read-only world state into the visual temple. Draws no rng and writes no sim state. */
  setEnvironment(env: TempleEnvironment): void {
    this.chaos = norm01(env.chaos);
    this.entropy = norm01(env.entropy);
    const cap = finitePositive(env.capacity);
    this.crowding = cap > 0 ? clamp(finitePositive(env.population) / cap, 0, 1) : 0;
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

  /** Build the fixed line mesh for the impossible cage. */
  private buildCageGeo(): THREE.BufferGeometry {
    const U = ARENA_MID;
    const layers = 4;
    const seg = 18;
    const segments = layers * seg + (layers - 1) * seg;
    const arr = new Float32Array(segments * 6);
    let o = 0;
    const point = (layer: number, i: number, out: THREE.Vector3): void => {
      const th = (Math.PI * 2 * i) / seg + layer * 0.23;
      const rx = (24 - layer * 3.3) * U;
      const rz = (15 + layer * 2.2) * U;
      const y = (13 + layer * 8.2) * U;
      out.set(Math.cos(th) * rx, y, Math.sin(th) * rz);
    };
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const push = (): void => {
      arr[o++] = a.x;
      arr[o++] = a.y;
      arr[o++] = a.z;
      arr[o++] = b.x;
      arr[o++] = b.y;
      arr[o++] = b.z;
    };
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < seg; i++) {
        point(layer, i, a);
        point(layer, (i + 1) % seg, b);
        push();
      }
    }
    for (let layer = 0; layer < layers - 1; layer++) {
      for (let i = 0; i < seg; i++) {
        point(layer, i, a);
        point(layer + 1, (i * 5 + 3) % seg, b);
        push();
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }

  /**
   * Animate the gateway: ease it into place over {@link RISE_TIME}, then breathe the portal, cycle
   * its colour, and spin the glyph-rings. No-op while hidden. Pure `t`/`dt` math (no rng). O(1).
   */
  update(dt: number, t: number): void {
    if (!this._revealed) return;
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const safeT = Number.isFinite(t) ? t : 0;
    this.age += safeDt;
    const rise = this.age < RISE_TIME ? this.age / RISE_TIME : 1;
    const ease = 1 - (1 - rise) * (1 - rise); // ease-out
    this.rise = ease;
    this.reactivity = clamp(this.chaos * 0.45 + this.entropy * 0.25 + this.crowding * 0.3, 0, 1);
    this.group.position.y = this.restY - RISE_DROP * (1 - ease);

    const pulse = 0.5 + Math.sin(safeT * (1.6 + this.chaos * 1.2)) * 0.5;
    const flicker = 0.5 + Math.sin(safeT * 7.7) * Math.sin(safeT * 2.3) * 0.5;
    this.shimmer = ease * (0.2 + 0.8 * (0.55 * pulse + 0.45 * this.reactivity));
    this.shadow = ease * (0.12 + 0.88 * (0.4 * this.entropy + 0.35 * this.chaos + 0.25 * flicker));
    this.cageWarp = ARENA_MID * ease * (0.7 + 5.6 * this.reactivity);
    this.portalColor.copy(PORTAL_A).lerp(PORTAL_B, pulse);
    this.portalMat.color.copy(this.portalColor);
    this.portalMat.opacity = (0.28 + pulse * 0.26 + this.reactivity * 0.22) * ease;
    this.haloMat.opacity = (0.08 + pulse * 0.1 + this.reactivity * 0.18) * ease;
    this.shadowMat.opacity = Math.min(0.85, 0.22 + this.shadow * 0.55);
    this.shadowCore.scale.setScalar(0.75 + ease * 0.2 + this.shadow * 0.38);
    this.singularityMat.opacity = (0.18 + this.shimmer * 0.46) * ease;
    this.singularityMat.color.setHSL(0.77 + this.entropy * 0.08, 0.95, 0.18 + this.chaos * 0.22);
    this.singularityRing.rotation.z = -safeT * (0.32 + this.reactivity * 0.9);
    this.singularityRing.rotation.x = Math.sin(safeT * 0.31) * 0.35;
    this.singularityRing.scale.setScalar(0.84 + this.shadow * 0.35);
    this.shardMat.emissiveIntensity = 0.35 + this.shimmer * 2.4;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r) continue;
      r.rotation.z += (i % 2 === 0 ? 0.012 : -0.018) * (0.5 + pulse + this.reactivity);
      const m = r.material as THREE.MeshBasicMaterial;
      m.opacity = (0.4 + pulse * 0.22 + this.reactivity * 0.28) * ease;
    }
    for (let i = 0; i < this.shards.length; i++) {
      const sh = this.shards[i];
      if (!sh) continue;
      const s = 1 + this.shimmer * 0.22 + Math.sin(safeT * 1.4 + i) * this.reactivity * 0.12;
      sh.scale.set(0.78 + this.entropy * 0.24, s, 0.78 + this.chaos * 0.3);
      sh.rotation.y = safeT * (0.05 + this.chaos * 0.1) + i;
    }
    this.warpCage(safeT, ease);
  }

  /** Warp the impossible cage in-place; fixed vertex count, no allocations. */
  private warpCage(t: number, ease: number): void {
    const pos = this.cageGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = this.cageBase;
    const amp = this.cageWarp;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = base[i] ?? 0;
      const by = base[i + 1] ?? 0;
      const bz = base[i + 2] ?? 0;
      const wave =
        Math.sin(bx * 0.024 + t * (0.9 + this.chaos)) +
        Math.sin(bz * 0.031 - t * (0.7 + this.entropy)) +
        0.5 * Math.sin((bx + by + bz) * 0.012 + t * 1.9);
      const squeeze = 1 + ease * this.reactivity * 0.075 * wave;
      arr[i] = bx * squeeze;
      arr[i + 1] = by + wave * amp;
      arr[i + 2] = bz * (1 - ease * this.reactivity * 0.055 * wave);
    }
    pos.needsUpdate = true;
    this.cage.rotation.y = t * (0.02 + this.chaos * 0.08);
    this.cage.rotation.x = Math.sin(t * 0.13) * (0.08 + this.entropy * 0.18);
    this.cageMat.opacity = (0.12 + this.shimmer * 0.36) * ease;
    this.cageMat.color.setHSL(0.78 + this.chaos * 0.16, 1, 0.45 + this.shimmer * 0.2);
  }

  /** Read-only debug/test snapshot of the visual state. */
  snapshot(): MonolithTempleSnapshot {
    return {
      revealed: this._revealed,
      rise: this.rise,
      reactivity: this.reactivity,
      shimmer: this.shimmer,
      shadow: this.shadow,
      cageWarp: this.cageWarp,
      crowding: this.crowding,
      visualNodes: this.group.children.length,
    };
  }

  /** Remove + free all GPU resources. */
  dispose(): void {
    this.scene.remove(this.group);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}

function norm01(v: number): number {
  return Number.isFinite(v) ? clamp(v, 0, 1) : 0;
}

function finitePositive(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}
