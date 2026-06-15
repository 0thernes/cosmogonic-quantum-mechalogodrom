/**
 * Wingman-swarm RENDER layer (V47) — draws a {@link WingmanSwarm}'s 100 robots as ONE InstancedMesh
 * (a single draw call) of little emissive octahedral drones that spin + pulse as they orbit the super
 * creature. Visual only; it reads the swarm's flat `positions` buffer each frame and writes per-instance
 * matrices. Kept separate from the pure {@link WingmanSwarm} so the sim logic stays THREE-free + testable.
 */
import * as THREE from 'three';

export class WingmanRenderer {
  private readonly mesh: THREE.InstancedMesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color(0.62, 0.42, 1.0); // violet, matched to the apex glow

  constructor(scene: THREE.Scene, count: number) {
    const geo = new THREE.OctahedronGeometry(0.55, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.1, 0.08, 0.16),
      emissive: this.color,
      emissiveIntensity: 1.8,
      metalness: 0.7,
      roughness: 0.25,
    });
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
      this.dummy.scale.setScalar(0.55 + 0.25 * Math.sin(t * 4 + i));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mat.emissiveIntensity = 1.2 + 2.0 * (glow < 0 ? 0 : glow > 1 ? 1 : glow);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.removeFromParent();
  }
}
