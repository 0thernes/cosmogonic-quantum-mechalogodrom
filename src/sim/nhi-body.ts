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
  /** Shared material for both ocular points; owned by the body so it is disposed on death. */
  eyeMat: THREE.MeshStandardMaterial;
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

    // V109: wider alien skin palette — each NHI gets a unique biomechanical "species" hue/texture.
    const speciesHue = (0.52 + this.spawnIndex * 0.137) % 1;
    const skinSat = 0.62 + 0.25 * Math.sin(this.spawnIndex * 1.7);
    const skinLit = 0.35 + 0.14 * Math.sin(this.spawnIndex * 2.3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(speciesHue, skinSat, skinLit),
      emissive: new THREE.Color().setHSL((0.72 + this.spawnIndex * 0.091) % 1, 0.86, 0.28),
      emissiveIntensity: 1.9,
      metalness: 0.75 + 0.2 * Math.sin(this.spawnIndex * 3.1),
      roughness: 0.12 + 0.18 * Math.abs(Math.sin(this.spawnIndex * 2.7)),
      flatShading: true,
    });
    group.add(new THREE.Mesh(this.coreGeo, coreMat));

    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL((0.08 + this.spawnIndex * 0.173) % 1, 0.72, 0.5),
      emissive: new THREE.Color().setHSL((0.13 + this.spawnIndex * 0.113) % 1, 0.9, 0.34),
      emissiveIntensity: 1.45,
      metalness: 0.95,
      roughness: 0.14,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);
    const ring2 = new THREE.Mesh(this.ringGeo, ringMat);
    ring2.rotation.set(Math.PI / 2.05, 0.4 + this.spawnIndex * 0.31, 0.75);
    ring2.scale.set(0.72 + 0.14 * Math.sin(this.spawnIndex), 1.18, 0.72 + 0.14 * Math.cos(this.spawnIndex));
    group.add(ring2);

    // Ocular crown on the "face" (front +z) — weird but readable at distance.
    const eyeHue = (0.9 + this.spawnIndex * 0.071) % 1;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xf8ffff,
      emissive: new THREE.Color().setHSL(eyeHue, 0.95, 0.62),
      emissiveIntensity: 5.4,
    });
    for (let i = 0; i < 7; i++) {
      const a = -0.95 + i * 0.32;
      const eye = new THREE.Mesh(this.eyeGeo, eyeMat);
      eye.position.set(Math.sin(a) * R * 0.42, Math.cos(a * 1.7) * R * 0.22, R * 0.86);
      const sc = 0.65 + 0.35 * Math.sin(i * 2.1 + this.spawnIndex);
      eye.scale.setScalar(sc);
      group.add(eye);
    }

    this.root.add(group);
    this.bodies.set(id, {
      group,
      coreMat,
      ringMat,
      eyeMat,
      phase: this.spawnIndex++ * 2.399963229728653,
    });
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
      // V109: more dynamic, restless alien motion — faster spin + irregular multi-frequency wobble.
      g.rotation.y = t * (0.32 + 0.12 * Math.sin(b.phase)) + b.phase;
      g.rotation.x = Math.sin(t * 0.58 + b.phase) * 0.62 + Math.sin(t * 1.3 + b.phase * 2.1) * 0.18;
      g.rotation.z = Math.sin(t * 0.41 + b.phase * 1.7) * 0.35 + Math.sin(t * 0.93 + b.phase) * 0.14;
      // Morph: a writhing, non-uniform breathing scale — reads as a living, shifting body.
      g.scale.set(
        1.12 + Math.sin(t * 1.17 + b.phase) * 0.26 + Math.sin(t * 2.7 + b.phase) * 0.08,
        1.18 + Math.sin(t * 1.61 + b.phase * 1.3) * 0.32 + Math.sin(t * 3.1 + b.phase * 0.8) * 0.1,
        1.08 + Math.sin(t * 1.39 + b.phase * 0.7) * 0.24 + Math.sin(t * 2.4 + b.phase * 1.2) * 0.07,
      );
      b.coreMat.emissiveIntensity =
        1.55 + Math.sin(t * 1.23 + b.phase) * 0.55 + Math.sin(t * 0.37 + b.phase) * 0.25 + Math.sin(t * 4.1 + b.phase) * 0.15;
      b.ringMat.emissiveIntensity =
        1.05 + Math.sin(t * 2.17 + b.phase) * 0.45 + Math.sin(t * 0.53 + b.phase) * 0.25 + Math.sin(t * 3.7 + b.phase) * 0.2;
      b.eyeMat.emissiveIntensity =
        5.4 + Math.sin(t * 2.5 + b.phase) * 0.8 + Math.sin(t * 6.0 + b.phase * 3.0) * 0.4;
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

  /** Free ALL GPU resources (live body materials via clear(), then the shared geometries) on world
   * teardown / HMR reload. Idempotent — geometry.dispose() is safe to call twice. */
  dispose(): void {
    this.clear();
    this.coreGeo.dispose();
    this.ringGeo.dispose();
    this.eyeGeo.dispose();
    this.root.removeFromParent();
  }

  private disposeBody(b: Body): void {
    this.root.remove(b.group);
    b.coreMat.dispose();
    b.ringMat.dispose();
    b.eyeMat.dispose();
  }
}
