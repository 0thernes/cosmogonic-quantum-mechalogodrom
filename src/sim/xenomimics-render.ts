/**
 * XENOMIMIC RENDERER — ten distinct low-poly horrors that shimmer on the ground.
 *
 * One InstancedMesh per species (10 distinct geometries + colours), so each "kind" has its own design.
 * Instances are ground-hugging (positioned by the sim at ground-wave height); per-instance colour pulses
 * with each creature's live quantum-coherence SHIMMER, so the swarm shines and changes in cycles with its
 * neurology and the environment. Dark-base bodies with bright emissive rims (house art direction — no
 * flat TRON, no decorative confetti). Geometry is owned + disposed here (never module-shared), and every
 * mesh is `frustumCulled = false` so it compiles and shows from frame one.
 *
 * Pure view layer: reads {@link XenomimicPopulation}, writes only GPU instance buffers. No sim state,
 * no RNG.
 */
import * as THREE from 'three';
import type { XenomimicPopulation, Xenomimic } from './xenomimics';
import { XENOMIMIC_SPECIES } from './xenomimics';

/** Per-species base hues (HSL h) — 10 distinct skins across the spectrum. */
const SPECIES_HUE = [0.02, 0.09, 0.15, 0.33, 0.46, 0.53, 0.61, 0.72, 0.83, 0.94];
/** Per-species instance capacity (population caps at 1000 across 10 species; 256 gives ample headroom). */
const PER_SPECIES_CAP = 256;

/** Ten distinct deterministic geometries — tessellated / stellated horrors, one per species. */
function speciesGeometry(species: number): THREE.BufferGeometry {
  switch (species % XENOMIMIC_SPECIES) {
    case 0:
      return new THREE.OctahedronGeometry(1, 0);
    case 1:
      return new THREE.TetrahedronGeometry(1.15, 0);
    case 2:
      return new THREE.OctahedronGeometry(1, 1); // stellated-ish (subdivided)
    case 3:
      return new THREE.IcosahedronGeometry(0.95, 0);
    case 4:
      return new THREE.DodecahedronGeometry(0.9, 0);
    case 5:
      return new THREE.ConeGeometry(0.85, 1.8, 5); // spiky pentagonal
    case 6:
      return new THREE.BoxGeometry(1.1, 1.1, 1.1); // tesseract-cube cell
    case 7:
      return new THREE.TorusGeometry(0.7, 0.28, 6, 8); // mobius-ish ring
    case 8:
      return new THREE.TetrahedronGeometry(1.1, 1); // subdivided shard
    default:
      return new THREE.IcosahedronGeometry(0.9, 1); // bead-mandala sphere
  }
}

export class XenomimicRenderer {
  private readonly scene: THREE.Scene;
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly material: THREE.MeshStandardMaterial;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private disposed = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: false,
      metalness: 0.35,
      roughness: 0.4,
      emissive: new THREE.Color(0x111119),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.96,
    });
    for (let s = 0; s < XENOMIMIC_SPECIES; s++) {
      const geo = speciesGeometry(s);
      this.geos.push(geo);
      const mesh = new THREE.InstancedMesh(geo, this.material, PER_SPECIES_CAP);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(PER_SPECIES_CAP * 3),
        3,
      );
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.name = `xenomimic-species-${s}`;
      this.meshes.push(mesh);
      scene.add(mesh);
    }
  }

  /** Mirror the live population into the GPU instance buffers. `t` is the visual clock (seconds). */
  sync(population: XenomimicPopulation, t: number): void {
    if (this.disposed) return;
    const counts = Array.from({ length: XENOMIMIC_SPECIES }, () => 0);
    population.forEach((c: Xenomimic) => {
      const mesh = this.meshes[c.species];
      if (!mesh) return;
      const i = counts[c.species] ?? 0;
      if (i >= PER_SPECIES_CAP) return;
      counts[c.species] = i + 1;

      // Small but "slightly bigger" than the old ambient diamonds; a gentle breathing pulse.
      const breathe = 1 + 0.12 * Math.sin(t * 2 + c.gaitPhase);
      const scale = (1.4 + (c.energy - 0.5) * 0.6) * breathe;
      this.dummy.position.set(c.x, c.y, c.z);
      // Fulcrum lean tilts the body (pitch/roll) so it leans into turns + wobbles on landings — weight.
      this.dummy.rotation.set(c.gaitPhase + c.leanX, c.heading, c.swayPhase * 0.5 + c.leanZ);
      this.dummy.scale.setScalar(Math.max(0.4, scale));
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);

      // Shimmer: coherence brightens + de-saturates the body in cycles; anti-mimics run cooler/darker.
      const hue = ((SPECIES_HUE[c.species] ?? 0) + c.shimmer * 0.08) % 1;
      const light = 0.28 + c.shimmer * 0.5 * (c.role === 0 ? 1 : 0.7);
      const sat = 0.85 - c.shimmer * 0.3;
      this.color.setHSL(hue, sat, Math.min(0.85, light));
      mesh.setColorAt(i, this.color);
    });

    for (let s = 0; s < this.meshes.length; s++) {
      const mesh = this.meshes[s]!;
      mesh.count = counts[s] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    for (const geo of this.geos) geo.dispose();
    this.material.dispose();
    this.meshes.length = 0;
    this.geos.length = 0;
  }
}
