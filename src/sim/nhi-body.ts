/**
 * Alien NHI bodies (CONTRACTS V10 viz) — a dedicated, menacing, morphing form for each launched NHI
 * (reference: the biomechanical red-eyed uncanny alien), rendered OUTSIDE the instanced organism
 * pool so it can carry unique geometry + a wet biomechanical material the pools can't.
 *
 * Additive + deterministic-by-index (no rng, no sim coupling): each body's world position is copied
 * from its NHI entity every frame; the morph (non-uniform scale wobble), spin, and glow pulse are
 * pure trig of the sim clock + an index-derived phase. The world owns it: {@link spawn} on launch,
 * {@link update} each frame (which also disposes a body once its NHI dies), {@link clear} on reset.
 * Standard materials only (no hand-written GLSL), so it compiles clean and degrades to "invisible"
 * rather than "broken" if anything is off.
 */
import * as THREE from 'three';

interface Body {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  /** Golden-angle phase from the spawn index — even, rng-free variation between bodies. */
  phase: number;
}

/** Silhouette radius of an NHI body — large enough to read as a colossus, not an organism. */
const R = 3.4;

/** A morphing, red-eyed, biomechanical body per launched NHI. */
export class NhiBodySystem {
  private readonly root = new THREE.Group();
  private readonly bodies = new Map<number, Body>();
  private readonly coreGeo: THREE.IcosahedronGeometry;
  private readonly ringGeo: THREE.TorusGeometry;
  private readonly eyeGeo: THREE.SphereGeometry;
  private spawnIndex = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    // Faceted (flat-shaded) icosahedron core → an angular, crystalline-alien read; a torus ring for
    // the biomechanical "harness"; small spheres for the uncanny ocular points. Shared geometries.
    this.coreGeo = new THREE.IcosahedronGeometry(R, 1);
    this.ringGeo = new THREE.TorusGeometry(R * 1.35, R * 0.12, 8, 28);
    this.eyeGeo = new THREE.SphereGeometry(R * 0.16, 12, 12);
  }

  /** Birth an alien body for NHI `id` at (x,y,z). Idempotent per id. */
  spawn(id: number, x: number, y: number, z: number): void {
    if (this.bodies.has(id)) return;
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x140509,
      emissive: 0x4a0014,
      emissiveIntensity: 1.4,
      metalness: 0.85,
      roughness: 0.32,
      flatShading: true,
    });
    group.add(new THREE.Mesh(this.coreGeo, coreMat));

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1a0d04,
      emissive: 0x6a3a08,
      emissiveIntensity: 1.1,
      metalness: 0.95,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    // Two red ocular points on the "face" (front +z) — the uncanny stare.
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x300000,
      emissive: 0xff1212,
      emissiveIntensity: 4.5,
    });
    const eyeL = new THREE.Mesh(this.eyeGeo, eyeMat);
    eyeL.position.set(R * 0.32, R * 0.18, R * 0.86);
    const eyeR = new THREE.Mesh(this.eyeGeo, eyeMat);
    eyeR.position.set(-R * 0.32, R * 0.18, R * 0.86);
    group.add(eyeL, eyeR);

    this.root.add(group);
    this.bodies.set(id, { group, coreMat, ringMat, phase: this.spawnIndex++ * 2.399963229728653 });
  }

  /**
   * Per frame: each body follows its NHI (position via `posOf`), spins, breathes (non-uniform scale
   * wobble = the morph), and pulses its glow. A body whose NHI has died (`posOf` → null) is disposed.
   * Allocation-free. O(bodies).
   */
  update(t: number, posOf: (id: number) => THREE.Vector3 | null): void {
    for (const [id, b] of this.bodies) {
      const p = posOf(id);
      if (!p) {
        this.disposeBody(b);
        this.bodies.delete(id);
        continue;
      }
      const g = b.group;
      g.position.copy(p);
      g.rotation.y = t * 0.35 + b.phase;
      g.rotation.x = Math.sin(t * 0.5 + b.phase) * 0.4;
      // Morph: a writhing, non-uniform breathing scale — reads as a living, shifting body.
      g.scale.set(
        1 + Math.sin(t * 1.7 + b.phase) * 0.18,
        1 + Math.sin(t * 2.1 + b.phase * 1.3) * 0.22,
        1 + Math.sin(t * 1.9 + b.phase * 0.7) * 0.18,
      );
      b.coreMat.emissiveIntensity = 1.2 + Math.sin(t * 1.6 + b.phase) * 0.7;
      b.ringMat.emissiveIntensity = 0.9 + Math.sin(t * 3.1 + b.phase) * 0.5;
    }
  }

  /** Number of live alien bodies (telemetry). */
  get count(): number {
    return this.bodies.size;
  }

  /** Dispose every body (e.g. on world reset). */
  clear(): void {
    for (const b of this.bodies.values()) this.disposeBody(b);
    this.bodies.clear();
  }

  private disposeBody(b: Body): void {
    this.root.remove(b.group);
    b.coreMat.dispose();
    b.ringMat.dispose();
  }
}
