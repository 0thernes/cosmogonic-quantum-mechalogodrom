/**
 * Artifact field (CONTRACTS V9 — "physical visual effects + artifacts that effect the world").
 *
 * Persistent relics the world leaves behind: a death scars the ground with a shard, a summoned
 * singularity drops a relic, a quantum collapse scatters motes. They are real objects in the scene
 * — a bounded pool rendered through ONE InstancedMesh (≤ 1 draw call) — that spin, pulse, and fade
 * over their lifetime, then recycle. The living world thus accrues a visible history of its own
 * violence and wonder.
 *
 * DETERMINISM SAFETY (deliberate): this system draws NO randomness and writes NO simulation state —
 * placement is purely positional (driven by events that already happened), animation is a pure
 * function of the seeded sim time `t`, and it touches only its own InstancedMesh. It therefore
 * cannot perturb the seeded RNG stream, entity trajectories, or the 300-frame determinism golden.
 * {@link influenceAt} exposes a read-only proximity field for any future consumer, but this module
 * never feeds it back into the sim itself. Per-frame `update` is allocation-free (module scratch).
 */
import * as THREE from 'three';

/** What left the mark — selects the relic's tint. */
export type ArtifactKind = 'scar' | 'relic' | 'mote';

/** Default pool size: plenty of simultaneous relics, still one instanced draw call. */
const DEFAULT_CAP = 64;

/** Seconds an artifact lives before it fades out and its slot recycles. */
const ARTIFACT_LIFE = 22;

/** Influence radius (world units) used by {@link influenceAt}. */
const INFLUENCE_RADIUS = 30;

/** Per-kind base tint (HSL hue, sat, light) + base scale. */
const KIND_STYLE: Readonly<
  Record<ArtifactKind, { hue: number; sat: number; light: number; scale: number }>
> = {
  scar: { hue: 0.02, sat: 0.8, light: 0.45, scale: 1.6 }, // ember red — a death
  relic: { hue: 0.72, sat: 0.7, light: 0.55, scale: 3.2 }, // violet — a singularity
  mote: { hue: 0.5, sat: 0.85, light: 0.6, scale: 1.0 }, // cyan — a collapse mote
};

// ── Per-frame scratch (module-level, so update() allocates nothing) ──
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const POS = new THREE.Vector3();
const SCL = new THREE.Vector3();
const COL = new THREE.Color();

/**
 * A bounded ring of world artifacts rendered through one InstancedMesh. Construct with the scene;
 * call {@link place} from events and {@link update} once per frame. Reads only the scene + sim time.
 */
export class ArtifactField {
  private readonly cap: number;
  private readonly mesh: THREE.InstancedMesh;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly born: Float32Array;
  private readonly baseScale: Float32Array;
  private readonly active: Uint8Array;
  /** Next slot to (re)use — a ring, so the oldest relic is recycled at capacity. */
  private head = 0;
  private liveCount = 0;

  constructor(scene: THREE.Scene, cap = DEFAULT_CAP) {
    this.cap = Math.max(1, cap);
    this.px = new Float32Array(this.cap);
    this.py = new Float32Array(this.cap);
    this.pz = new Float32Array(this.cap);
    this.born = new Float32Array(this.cap);
    this.baseScale = new Float32Array(this.cap);
    this.active = new Uint8Array(this.cap);
    const geo = new THREE.OctahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.9,
      metalness: 0.2,
      roughness: 0.35,
      emissiveIntensity: 1.4,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    // Start every slot collapsed (scale 0) so empty slots are invisible.
    M.compose(POS.set(0, -9999, 0), Q.identity(), SCL.set(0, 0, 0));
    for (let i = 0; i < this.cap; i++) this.mesh.setMatrixAt(i, M);
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  /** Number of artifacts currently alive (telemetry). */
  get count(): number {
    return this.liveCount;
  }

  /**
   * Drop an artifact at world (x, y, z). The oldest is recycled at capacity (ring). `tNow` is the
   * seeded sim time used as its birth stamp. Positional only — no rng, no sim-state write. O(1).
   */
  place(x: number, y: number, z: number, kind: ArtifactKind, tNow: number): void {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    if (this.active[i] === 0) this.liveCount = Math.min(this.liveCount + 1, this.cap);
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.born[i] = tNow;
    const style = KIND_STYLE[kind];
    this.baseScale[i] = style.scale;
    this.active[i] = 1;
    COL.setHSL(style.hue, style.sat, style.light);
    this.mesh.setColorAt(i, COL);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Convenience for ground events that only carry x/z (the scar sits just above the floor). */
  placeGround(x: number, z: number, kind: ArtifactKind, tNow: number): void {
    this.place(x, 2, z, kind, tNow);
  }

  /**
   * Animate every live artifact: rise-then-fade scale over its life, a slow per-slot spin. Recycles
   * expired slots. Pure function of (stored position, sim time `t`); allocation-free. O(cap).
   */
  update(_dt: number, t: number): void {
    let changed = false;
    for (let i = 0; i < this.cap; i++) {
      if (this.active[i] === 0) continue;
      const age = t - (this.born[i] ?? 0);
      if (age < 0 || age > ARTIFACT_LIFE) {
        // expired (or clock went backwards) — collapse + free the slot
        this.active[i] = 0;
        this.liveCount = Math.max(0, this.liveCount - 1);
        M.compose(POS.set(0, -9999, 0), Q.identity(), SCL.set(0, 0, 0));
        this.mesh.setMatrixAt(i, M);
        changed = true;
        continue;
      }
      // Envelope: quick rise in the first second, gentle pulse, long fade to zero at end of life.
      const frac = age / ARTIFACT_LIFE;
      const rise = Math.min(1, age * 2);
      const fade = 1 - frac * frac; // ease-out fade
      const pulse = 1 + Math.sin(t * 2 + i) * 0.12;
      const s = (this.baseScale[i] ?? 1) * rise * fade * pulse;
      E.set(t * 0.4 + i, t * 0.6 + i * 0.3, 0);
      Q.setFromEuler(E);
      POS.set(this.px[i] ?? 0, (this.py[i] ?? 0) + Math.sin(t * 1.5 + i) * 0.6, this.pz[i] ?? 0);
      SCL.set(s, s, s);
      M.compose(POS, Q, SCL);
      this.mesh.setMatrixAt(i, M);
      changed = true;
    }
    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Read-only proximity influence at world (x, z): sum over live artifacts of a linear falloff in
   * [0, 1] within {@link INFLUENCE_RADIUS}. Pure, allocation-free, O(cap). Exposed for consumers
   * (telemetry, future steering) — this module never feeds it back into the sim.
   */
  influenceAt(x: number, z: number): number {
    let sum = 0;
    const r = INFLUENCE_RADIUS;
    for (let i = 0; i < this.cap; i++) {
      if (this.active[i] === 0) continue;
      const dx = (this.px[i] ?? 0) - x;
      const dz = (this.pz[i] ?? 0) - z;
      const d = Math.hypot(dx, dz);
      if (d < r) sum += 1 - d / r;
    }
    return sum;
  }

  /** Remove the instanced mesh from the scene and dispose its GPU resources. */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
