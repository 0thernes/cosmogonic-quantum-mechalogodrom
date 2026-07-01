/**
 * Cosmic web (CONTRACTS V11 viz) — a faint, deep far-field lattice of glowing nodes joined by thin
 * filaments (reference 2: the frost-fractal cosmic web), giving the void real depth and context
 * instead of an empty gradient. Additive, sits behind everything.
 *
 * V110 PURPOSE (the owner's "what are the things beyond the dome DOING?"): the web is no longer inert
 * dressing — it is a far-field READOUT of the dome's vitality, the cosmos witnessing the life within.
 * It brightens, swells and warms as the population thrives; churns, flickers and reddens as world chaos
 * rises; and cools, desaturates and dims toward a dead lattice as entropy (heat death) climbs or the
 * population collapses. So the void now has reason: it reflects the simulation it surrounds.
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

/** Clamp to [0,1]. */
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export class CosmicWeb {
  private readonly group = new THREE.Group();
  private readonly pMat: THREE.PointsMaterial;
  private readonly lMat: THREE.LineBasicMaterial;
  // Reused colour scratch so the per-frame vitality readout stays allocation-free.
  private readonly pColor = new THREE.Color();
  private readonly lColor = new THREE.Color();

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

  /**
   * V110 vitality readout — the cosmos reflects the dome's life. Render-only (material props +
   * group rotation), allocation-free, draws no rng, writes no sim state. O(1).
   * @param t scaled clock · @param population 0..1 (alive fraction) · @param chaos 0..1 · @param entropy 0..1
   */
  update(t: number, population: number, chaos: number, entropy: number): void {
    const pop = clamp01(population);
    const c = clamp01(chaos);
    const en = clamp01(entropy);
    const life = pop * (1 - en * 0.7); // thriving life, suppressed by heat-death
    const sh = 0.5 + 0.5 * Math.sin(t * (0.14 + 0.25 * c)); // breathes faster as the world agitates
    this.pMat.opacity = 0.16 + life * 0.5 + sh * 0.16;
    this.pMat.size = 4 + life * 7 + sh * 1.5;
    this.lMat.opacity = 0.03 + life * 0.16 + sh * 0.06 * (0.4 + c);
    // Hue: serene blue when calm/thriving → inflamed red as chaos rises; desaturate + dim toward death.
    this.pColor.setHSL((0.62 - c * 0.46 + 1) % 1, 0.55 * (1 - en * 0.6), 0.55 + life * 0.22);
    this.pMat.color.copy(this.pColor);
    this.lColor.setHSL((0.6 - c * 0.42 + 1) % 1, 0.4 * (1 - en * 0.5), 0.42 + life * 0.12);
    this.lMat.color.copy(this.lColor);
    // The whole web churns faster + the disc tilts as the world agitates.
    this.group.rotation.y = t * (0.003 + 0.012 * c);
    this.group.rotation.z = Math.sin(t * 0.02) * 0.05 * c;
  }

  /** Free the two owned geometries + both materials and remove the web from the scene (HMR / world-reset
   *  safe; idempotent). Without this each hot reload orphaned two BufferGeometries + the point/line materials. */
  dispose(): void {
    this.group.traverse((o) => {
      const g = (o as THREE.Points | THREE.LineSegments).geometry;
      if (g) g.dispose();
    });
    this.pMat.dispose();
    this.lMat.dispose();
    this.group.removeFromParent();
  }
}
