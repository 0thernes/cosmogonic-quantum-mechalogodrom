/**
 * Cosmic web (CONTRACTS V11 viz) — a faint, deep far-field lattice of glowing nodes joined by thin
 * filaments (reference 2: the frost-fractal cosmic web), giving the void real depth and context
 * instead of an empty gradient. Additive, sits behind everything; a slow shimmer + drift is pure
 * trig of the sim clock.
 *
 * Boot-stream-neutral + deterministic: node positions come from a Fibonacci shell + an index hash
 * (NO rng, NO clock at construction), exactly like the leviathans, so the composition root may build
 * it anywhere without shifting the seeded stream and it is identical for a given seed. Standard
 * Points/Lines materials only (no hand-written GLSL) — it degrades to "faint" rather than "broken".
 */
import * as THREE from 'three';

/** Node count of the web (telemetry-friendly; cheap — one Points draw + one LineSegments draw). */
const NODES = 280;
/** Shell radius — far beyond the play space so it reads as a backdrop, never an obstacle. */
const RADIUS = 680;
/** Filament fan-out: each node links to these index-neighbours (deterministic web topology). */
const LINKS = [3, 8, 21] as const;

/** Deterministic fractional hash in [0,1) from an integer index (no rng). */
function hash01(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export class CosmicWeb {
  private readonly group = new THREE.Group();
  private readonly pMat: THREE.PointsMaterial;
  private readonly lMat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    // Fibonacci-shell node positions with a per-node hashed radius jitter → an irregular, organic web.
    const pos = new Float32Array(NODES * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODES; i++) {
      const y = 1 - (i / (NODES - 1)) * 2; // 1 .. -1
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      const jr = RADIUS * (0.78 + 0.34 * hash01(i));
      pos[i * 3] = Math.cos(th) * ring * jr;
      pos[i * 3 + 1] = y * jr * 0.6; // flatten vertically — a disc-ish galactic web
      pos[i * 3 + 2] = Math.sin(th) * ring * jr;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pMat = new THREE.PointsMaterial({
      color: 0xc4dcff,
      size: 7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(pGeo, this.pMat);

    // Filaments: link each node to a few index-neighbours (deterministic web, no spatial search).
    const segs: number[] = [];
    for (let i = 0; i < NODES; i++) {
      const ax = pos[i * 3] ?? 0;
      const ay = pos[i * 3 + 1] ?? 0;
      const az = pos[i * 3 + 2] ?? 0;
      for (const off of LINKS) {
        const j = (i + off) % NODES;
        segs.push(ax, ay, az, pos[j * 3] ?? 0, pos[j * 3 + 1] ?? 0, pos[j * 3 + 2] ?? 0);
      }
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
    this.lMat = new THREE.LineBasicMaterial({
      color: 0x6f96c8,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lGeo, this.lMat);

    this.group.add(points, lines);
    scene.add(this.group);
  }

  /** Slow shimmer + drift — pure trig, allocation-free, draws no rng. O(1). */
  update(t: number): void {
    const sh = 0.5 + 0.5 * Math.sin(t * 0.18);
    this.pMat.opacity = 0.38 + sh * 0.3;
    this.lMat.opacity = 0.07 + sh * 0.08;
    this.group.rotation.y = t * 0.004;
  }
}
