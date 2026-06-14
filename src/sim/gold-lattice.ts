/**
 * Gold lattice (CONTRACTS V11 viz) — a sparse set of large, faint, slowly-turning GOLD wireframe
 * polyhedra suspended in the mid-far field (reference 5: the gold-line architectural void with
 * floating geometry), adding architectural depth and a "designed-space" read to the cosmos.
 *
 * Additive wireframe LineSegments only (no hand-written GLSL → degrades to "faint", never "broken"),
 * index-placed on a Fibonacci ring with NO rng and NO clock at construction → boot-stream-neutral and
 * identical per seed, exactly like the leviathans and the cosmic web. The slow tumble + glow breath
 * in {@link update} are pure trig.
 */
import * as THREE from 'three';

/** How many floating gold forms hang in the void. */
const COUNT = 7;
/** Placement ring radius — mid-far, framing the space without obstructing the play field. */
const RING = 360;

export class GoldLattice {
  private readonly group = new THREE.Group();
  private readonly forms: THREE.LineSegments[] = [];
  private readonly mat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.mat = new THREE.LineBasicMaterial({
      color: 0xc8a23a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      // Vary the platonic solid per index for visual variety (octahedron / icosahedron / cube).
      const base =
        i % 3 === 0
          ? new THREE.OctahedronGeometry(1)
          : i % 3 === 1
            ? new THREE.IcosahedronGeometry(1)
            : new THREE.BoxGeometry(1.4, 1.4, 1.4);
      const wire = new THREE.WireframeGeometry(base);
      base.dispose();
      const seg = new THREE.LineSegments(wire, this.mat);
      seg.scale.setScalar(22 + (i % 4) * 14);
      const th = golden * i;
      const y = (1 - (i / (COUNT - 1)) * 2) * RING * 0.42;
      seg.position.set(Math.cos(th) * RING, y, Math.sin(th) * RING);
      this.group.add(seg);
      this.forms.push(seg);
    }
    scene.add(this.group);
  }

  /** Slow per-form tumble + a shared glow breath. Pure trig, allocation-free, draws no rng. */
  update(t: number): void {
    for (let i = 0; i < this.forms.length; i++) {
      const f = this.forms[i];
      if (!f) continue;
      f.rotation.x = t * 0.03 * (1 + (i % 3) * 0.4) + i;
      f.rotation.y = t * 0.05 * (1 + (i % 2) * 0.5);
    }
    this.mat.opacity = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.15));
  }
}
