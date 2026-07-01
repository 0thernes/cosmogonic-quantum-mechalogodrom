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
  /** Owned tube geometries for organic tendrils (disposed with the body). */
  readonly tendrilGeos: THREE.BufferGeometry[];
  /** Golden-angle phase from the spawn index — even, rng-free variation between bodies. */
  phase: number;
}

/** Silhouette radius of an NHI body — large enough to read as a colossus, not an organism. */
const R = 3.4;

/** A morphing, red-eyed, biomechanical body per launched NHI. */
export class NhiBodySystem {
  private readonly root = new THREE.Group();
  private readonly bodies = new Map<number, Body>();
  private readonly coreGeo: THREE.SphereGeometry; // changed for less-poly bio look (user request)
  private readonly ringGeo: THREE.TorusGeometry;
  private readonly eyeGeo: THREE.SphereGeometry;
  private readonly spikeGeo: THREE.ConeGeometry;
  private spawnIndex = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    // USER #7: crazy wild mutational Morphicbiofuckery. Less poly, more unique organic shapes.
    // Dark black base + bright shimmery highlights. High-seg sphere + displaced feel via multiple layers.
    // Real "bio fuckery" via multiple overlaid shapes with different phases.
    this.coreGeo = new THREE.SphereGeometry(R, 6, 5); // higher to reduce poly look
    this.ringGeo = new THREE.TorusGeometry(R * 1.35, R * 0.12, 8, 28);
    this.eyeGeo = new THREE.SphereGeometry(R * 0.16, 12, 12);
    this.spikeGeo = new THREE.ConeGeometry(R * 0.13, R * 1.15, 7, 1);
  }

  /** Birth an alien body for NHI `id` at (x,y,z). Idempotent per id. */
  spawn(id: number, x: number, y: number, z: number): void {
    if (this.bodies.has(id)) return;
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // V109: wider alien skin palette — each NHI gets a unique biomechanical "species" hue/texture.
    // USER #7: dark black base with bright highlights, shimmery.
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x050505, // near black
      emissive: new THREE.Color().setHSL((0.78 + this.spawnIndex * 0.091) % 1, 0.96, 0.55),
      emissiveIntensity: 1.4,
      metalness: 0.9,
      roughness: 0.15,
      flatShading: false, // smoother for bio look
    });
    group.add(new THREE.Mesh(this.coreGeo, coreMat));

    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL((0.08 + this.spawnIndex * 0.173) % 1, 0.82, 0.18),
      emissive: new THREE.Color().setHSL((0.13 + this.spawnIndex * 0.113) % 1, 0.98, 0.42),
      emissiveIntensity: 1.05,
      metalness: 0.95,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);
    const ring2 = new THREE.Mesh(this.ringGeo, ringMat);
    ring2.rotation.set(Math.PI / 2.05, 0.4 + this.spawnIndex * 0.31, 0.75);
    ring2.scale.set(
      0.72 + 0.14 * Math.sin(this.spawnIndex),
      1.18,
      0.72 + 0.14 * Math.cos(this.spawnIndex),
    );
    group.add(ring2);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399963229728653 + this.spawnIndex * 0.41;
      const spike = new THREE.Mesh(this.spikeGeo, ringMat);
      spike.position.set(
        Math.cos(a) * R * 0.78,
        Math.sin(a * 1.7) * R * 0.34,
        Math.sin(a) * R * 0.78,
      );
      spike.rotation.set(Math.sin(a) * 1.2, a, Math.cos(a) * 1.2);
      spike.scale.setScalar(0.55 + 0.35 * Math.sin(i * 1.9 + this.spawnIndex));
      group.add(spike);
    }

    const tendrilGeos: THREE.BufferGeometry[] = [];
    for (let ti = 0; ti < 5; ti++) {
      const a = ti * 1.256637 + this.spawnIndex * 0.37;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(a) * R * 0.42,
          Math.sin(a * 2.1) * R * 0.28,
          Math.sin(a) * R * 0.42,
        ),
        new THREE.Vector3(
          Math.cos(a + 1.4) * R * 0.82,
          Math.sin(a * 3.2) * R * 0.38,
          Math.sin(a + 1.4) * R * 0.82,
        ),
        new THREE.Vector3(
          Math.cos(a + 2.6) * R * 1.05,
          -R * 0.18 + Math.sin(a) * R * 0.22,
          Math.sin(a + 2.6) * R * 1.05,
        ),
      ]);
      const geo = new THREE.TubeGeometry(curve, 10, R * (0.045 + (ti % 3) * 0.012), 6, false);
      tendrilGeos.push(geo);
      const tendril = new THREE.Mesh(geo, ringMat);
      tendril.rotation.y = a;
      tendril.rotation.x = Math.sin(a * 1.7) * 0.35;
      group.add(tendril);
    }

    // Ocular crown on the "face" (front +z) — weird but readable at distance.
    const eyeHue = (0.9 + this.spawnIndex * 0.071) % 1;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      emissive: new THREE.Color().setHSL(eyeHue, 0.95, 0.62),
      emissiveIntensity: 2.4,
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
      tendrilGeos,
      phase: this.spawnIndex++ * 2.399963229728653,
    });
  }

  /**
   * Per frame: each body follows its NHI (position via `posOf`), spins, breathes (non-uniform scale
   * wobble = the morph), and pulses its glow. A body whose NHI has died (`posOf` → null) is disposed.
   * Allocation-free. O(bodies).
   *
   * @param onSocial optional callback fired when this body is within 55u of another NHI; the scalar
   *   `0..1` is the social proximity level so callers can layer sound (e.g. NhiBodySystem emits no
   *   audio itself; AudioEngine is wired from world.ts).
   */
  update(
    t: number,
    posOf: (id: number) => THREE.Vector3 | null,
    onSocial?: (id: number, level: number) => void,
  ): void {
    for (const [id, b] of this.bodies) {
      const p = posOf(id);
      if (!p) {
        this.disposeBody(b);
        this.bodies.delete(id);
        continue;
      }
      let social = 0;
      for (const [otherId] of this.bodies) {
        if (otherId === id) continue;
        const op = posOf(otherId);
        if (!op) continue;
        const dx = p.x - op.x;
        const dy = p.y - op.y;
        const dz = p.z - op.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 55 * 55) social = Math.max(social, 1 - Math.sqrt(d2) / 55);
      }
      if (social > 0.4 && onSocial) onSocial(id, social);
      const g = b.group;
      g.position.copy(p);
      // V109: more dynamic, restless alien motion — faster spin + irregular multi-frequency wobble.
      g.rotation.y = t * (0.32 + 0.12 * Math.sin(b.phase)) + b.phase;
      g.rotation.x = Math.sin(t * 0.58 + b.phase) * 0.62 + Math.sin(t * 1.3 + b.phase * 2.1) * 0.18;
      g.rotation.z =
        Math.sin(t * 0.41 + b.phase * 1.7) * 0.35 + Math.sin(t * 0.93 + b.phase) * 0.14;
      // Morph: a writhing, non-uniform breathing scale — reads as a living, shifting body.
      g.scale.set(
        1.12 +
          social * 0.18 +
          Math.sin(t * 1.17 + b.phase) * 0.26 +
          Math.sin(t * 2.7 + b.phase) * 0.08,
        1.18 +
          social * 0.25 +
          Math.sin(t * 1.61 + b.phase * 1.3) * 0.32 +
          Math.sin(t * 3.1 + b.phase * 0.8) * 0.1,
        1.08 +
          social * 0.16 +
          Math.sin(t * 1.39 + b.phase * 0.7) * 0.24 +
          Math.sin(t * 2.4 + b.phase * 1.2) * 0.07,
      );
      b.coreMat.emissiveIntensity =
        1.55 +
        Math.sin(t * 1.23 + b.phase) * 0.55 +
        Math.sin(t * 0.37 + b.phase) * 0.25 +
        Math.sin(t * 4.1 + b.phase) * 0.15 +
        social * 1.25;
      b.ringMat.emissiveIntensity =
        1.05 +
        Math.sin(t * 2.17 + b.phase) * 0.45 +
        Math.sin(t * 0.53 + b.phase) * 0.25 +
        Math.sin(t * 3.7 + b.phase) * 0.2 +
        social * 1.65;
      b.eyeMat.emissiveIntensity =
        1.85 +
        Math.sin(t * 2.5 + b.phase) * 0.45 +
        Math.sin(t * 6.0 + b.phase * 3.0) * 0.25 +
        social * 0.85;
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
    this.spikeGeo.dispose();
    this.root.removeFromParent();
  }

  private disposeBody(b: Body): void {
    this.root.remove(b.group);
    b.coreMat.dispose();
    b.ringMat.dispose();
    b.eyeMat.dispose();
    for (const g of b.tendrilGeos) g.dispose();
  }
}
