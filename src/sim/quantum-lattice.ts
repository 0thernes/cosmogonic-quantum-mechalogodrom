/**
 * Quantum lattice (CONTRACTS V11 viz) — a floating neon sacred-geometry anchor: concentric,
 * counter-rotating wireframe platonic shells (reference 4: the neon quantum/sacred-geometry lattice),
 * breathing above the field as a visual heart for the quantum cosmos.
 *
 * Additive neon wireframe (no hand-written GLSL → degrades to "faint", never "broken"), placed +
 * animated with pure trig and NO rng/clock at construction → boot-stream-neutral, identical per
 * seed, no sim-state coupling. Sits above the play space and renders additively, so it glows through
 * the world rather than occluding it.
 */
import * as THREE from 'three';

interface Shell {
  seg: THREE.LineSegments;
  /** Per-shell angular speed (counter-rotation gives the interlocking sacred-geometry shimmer). */
  spin: number;
}

export class QuantumLattice {
  private readonly group = new THREE.Group();
  private readonly shells: Shell[] = [];
  private readonly mat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.mat = new THREE.LineBasicMaterial({
      color: 0x3fe6ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // Concentric platonic shells at golden-ratio-ish radii, each spinning at a different rate.
    const defs: ReadonlyArray<readonly [THREE.BufferGeometry, number]> = [
      [new THREE.IcosahedronGeometry(22, 0), 0.07],
      [new THREE.DodecahedronGeometry(31, 0), -0.045],
      [new THREE.OctahedronGeometry(42, 0), 0.028],
    ];
    for (const [geo, spin] of defs) {
      const wire = new THREE.WireframeGeometry(geo);
      geo.dispose();
      this.shells.push({ seg: new THREE.LineSegments(wire, this.mat), spin });
    }
    for (const s of this.shells) this.group.add(s.seg);
    this.group.position.set(0, 72, 0); // float above the field's heart
    scene.add(this.group);
  }

  /** Counter-rotate the shells + a shared scale/glow breath. Pure trig, allocation-free, no rng. */
  update(t: number): void {
    for (let i = 0; i < this.shells.length; i++) {
      const s = this.shells[i];
      if (!s) continue;
      s.seg.rotation.y = t * s.spin;
      s.seg.rotation.x = t * s.spin * 0.6;
    }
    this.group.scale.setScalar(1 + Math.sin(t * 0.8) * 0.12);
    this.mat.opacity = 0.15 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.1));
  }

  /** Free the 3 owned WireframeGeometry shells + the shared material and remove the lattice from the scene
   *  (HMR / world-reset safe; idempotent). The base platonic geometries were already freed at build time. */
  dispose(): void {
    for (const s of this.shells) s.seg.geometry.dispose();
    this.mat.dispose();
    this.group.removeFromParent();
  }
}
