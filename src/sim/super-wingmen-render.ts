/**
 * Wingman-swarm RENDER layer (V47) — draws a {@link WingmanSwarm}'s 100 robots as ONE InstancedMesh
 * (a single draw call) of little emissive octahedral drones that spin + pulse as they orbit the super
 * creature. Visual only; it reads the swarm's flat `positions` buffer each frame and writes per-instance
 * matrices. Kept separate from the pure {@link WingmanSwarm} so the sim logic stays THREE-free + testable.
 */
import * as THREE from 'three';

/** Speed→size gain: a per-frame drone displacement of ~0.9 world units saturates the swell. */
const WINGMAN_SPEED_SCALE = 0.6;
/** Drone size swell range above the 0.45 base — a still drone is small, a hard-maneuvering one large. */
const WINGMAN_SWELL = 0.55;

/**
 * Per-drone speed proxy: the frame-to-frame displacement magnitude of drone `i` from the flat XYZ
 * buffers (`j = i*3`). Returns 0 when there is no previous frame or a buffer is short (`?? 0`). This
 * is the drone's REAL motion — the readout that swells a maneuvering drone — not a clock. Pure. O(1).
 */
export function droneSpeed(prev: Float32Array | null, cur: Float32Array, j: number): number {
  if (!prev) return 0;
  const dx = (cur[j] ?? 0) - (prev[j] ?? 0);
  const dy = (cur[j + 1] ?? 0) - (prev[j + 1] ?? 0);
  const dz = (cur[j + 2] ?? 0) - (prev[j + 2] ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Per-swarm shader uniforms — uGlow is the escort's REAL assist/dominance (the same signal that lifts
 *  the base emissive), so the named-effect suite intensifies exactly when the escort presses harder. */
interface WingmanUniforms {
  uTime: THREE.IUniform<number>;
  uGlow: THREE.IUniform<number>;
}

/**
 * Patch the drone material with the WINGMAN-EXPANDED suite: 5 GPU effects whose strength is a FALSIFIABLE
 * readout of the escort's real dominance (`uGlow`) — orbs-plasmoids, laser-dance, buffer shimmer,
 * ionizing flutter, bit-glitch — with per-drone variety from `gl_InstanceID`. A calm swarm is quiet; a
 * hard-pressing escort's swarm erupts. GPU-only, no per-drone CPU, no rng.
 */
function patchDroneBody(mat: THREE.MeshStandardMaterial, u: WingmanUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = u.uTime;
    shader.uniforms['uGlow'] = u.uGlow;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWObjP;\nvarying float vWDrone;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWObjP = position;\nvWDrone = float(gl_InstanceID) * 0.6180339887;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWObjP;\nvarying float vWDrone;\nuniform float uTime;\nuniform float uGlow;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        float wFres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
        float wPh = vWDrone * 6.2831853;
        // ORBS PLASMOIDS EXPANDED (glow) — plasma orbs bloom as the escort dominates.
        float wOrb = pow(0.5 + 0.5 * sin(vWObjP.x * 9.0 + vWObjP.y * 7.0 + uTime * 5.0 + wPh), 8.0);
        totalEmissiveRadiance += vec3(0.6, 0.4, 1.0) * wOrb * uGlow * 1.4;
        // LASER DANCE EXPANDED (glow) — thin laser filaments sweep the drone.
        float wLaser = pow(0.5 + 0.5 * sin(vWObjP.y * 20.0 - uTime * 12.0 + wPh), 20.0);
        totalEmissiveRadiance += vec3(0.4, 1.0, 0.9) * wLaser * uGlow * 1.8;
        // BUFFER LIGHT SHIMMER (glow) — a bright sparkle gilds the rim.
        float wSpk = step(0.7, fract(sin(vWObjP.x * 31.0 + wPh) * 43758.0)) * pow(wFres, 1.5);
        totalEmissiveRadiance += vec3(1.0, 0.9, 0.7) * wSpk * (0.4 + 0.6 * uGlow);
        // IONIZING FLUTTER (glow) — ion streaks band the drone.
        float wIon = pow(0.5 + 0.5 * sin(vWObjP.z * 24.0 - uTime * 16.0 + wPh), 8.0);
        totalEmissiveRadiance += vec3(0.3, 0.6, 1.0) * wIon * uGlow;
        // BIT-GLITCH (glow) — a dominant swarm quantizes into glitch blocks.
        float wGlitch = floor((sin(vWObjP.x * 7.0 + wPh) + sin(uTime * 10.0)) * 3.0) / 3.0;
        totalEmissiveRadiance += vec3(0.2, 1.0, 0.5) * wGlitch * uGlow * 0.4;`,
      );
  };
  mat.customProgramCacheKey = () => 'wingmanExpandedV1';
}

export class WingmanRenderer {
  private readonly mesh: THREE.InstancedMesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly dummy = new THREE.Object3D();
  /** Previous frame's positions, so each drone's REAL per-frame speed drives its size. */
  private prevPositions: Float32Array | null = null;
  private readonly color = new THREE.Color(0.62, 0.42, 1.0); // violet, matched to the apex glow
  /** Shader uniforms for the WINGMAN-EXPANDED suite (driven from the real dominance glow each frame). */
  private readonly u: WingmanUniforms = { uTime: { value: 0 }, uGlow: { value: 0 } };

  constructor(scene: THREE.Scene, count: number) {
    const geo = new THREE.OctahedronGeometry(0.55, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.1, 0.08, 0.16),
      emissive: this.color,
      emissiveIntensity: 1.8,
      metalness: 0.7,
      roughness: 0.25,
    });
    patchDroneBody(this.mat, this.u);
    this.mesh = new THREE.InstancedMesh(geo, this.mat, Math.max(1, count));
    this.mesh.frustumCulled = false; // the swarm ranges across the arena with its creature
    this.mesh.castShadow = false;
    scene.add(this.mesh);
  }

  /**
   * Write the swarm's positions into the instance matrices (each drone spins + pulses), and set the
   * glow from the escort's assist/dominance. `positions` is the swarm's flat XYZ buffer (count×3).
   */
  sync(positions: Float32Array, t: number, glow: number): void {
    const n = this.mesh.count;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      this.dummy.position.set(positions[j] ?? 0, positions[j + 1] ?? 0, positions[j + 2] ?? 0);
      this.dummy.rotation.set(t * 1.3 + i, t * 0.9 + i * 0.7, t * 0.5);
      // De-decorated (was a sin(t) pulse): the drone's size now reads its REAL per-frame speed, so a
      // hard-maneuvering escort drone visibly swells while an idle one stays small. Falsifiable.
      const s = droneSpeed(this.prevPositions, positions, j) * WINGMAN_SPEED_SCALE;
      this.dummy.scale.setScalar(0.45 + (s > WINGMAN_SWELL ? WINGMAN_SWELL : s));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    // Stash this frame's positions for next frame's speed readout (resize on swarm-size change).
    if (!this.prevPositions || this.prevPositions.length !== positions.length) {
      this.prevPositions = new Float32Array(positions.length);
    }
    this.prevPositions.set(positions);
    const g = glow < 0 ? 0 : glow > 1 ? 1 : glow;
    this.mat.emissiveIntensity = 1.2 + 2.0 * g;
    // WINGMAN-EXPANDED: feed the real dominance glow (same clamp) + clock to the named-effect suite.
    this.u.uTime.value = t;
    this.u.uGlow.value = g;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.removeFromParent();
  }
}
