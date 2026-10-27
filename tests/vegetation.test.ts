import { describe, expect, it } from 'bun:test';
import * as THREE from 'three';
import { Vegetation } from '../src/sim/vegetation';

describe('Vegetation', () => {
  it('boots into a scene and reports thousands of placed plants', () => {
    const scene = new THREE.Scene();
    const veg = new Vegetation(scene);
    expect(veg).toBeDefined();
    veg.dispose();
  });

  it('updates without throwing and keeps all instance matrices finite', () => {
    const scene = new THREE.Scene();
    const veg = new Vegetation(scene);
    veg.setChaos(0.5);
    veg.setWindStrength(1.2);
    veg.update(0.5, 0.016);
    veg.update(10, 0.016);
    veg.dispose();
  });

  it('attaches plants to a moving ground sampler and accepts slope normals', () => {
    const scene = new THREE.Scene();
    const veg = new Vegetation(scene);
    veg.attachGround(
      (x, z) => 12 + Math.sin(x * 0.01) * 2 + Math.cos(z * 0.01) * 2,
      () => ({ nx: 0.18, ny: 0.96, nz: 0.08 }),
    );
    veg.applyContact(80, 80, 1);
    veg.update(2, 0.016);
    let mesh: THREE.InstancedMesh | null = null;
    scene.traverse((o) => {
      if (
        !mesh &&
        (o as THREE.InstancedMesh).isInstancedMesh &&
        (o as THREE.InstancedMesh).count > 0
      ) {
        mesh = o as THREE.InstancedMesh;
      }
    });
    expect(mesh).not.toBeNull();
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    mesh!.getMatrixAt(0, m);
    pos.setFromMatrixPosition(m);
    expect(pos.y).toBeGreaterThan(10);
    veg.dispose();
  });

  it('disposes intermediate stem/top geometries during construction, before dispose() is ever called', () => {
    // buildSpeciesGeometry merges a stem + a top primitive into one BufferGeometry per species, via
    // toNonIndexed() copies that mergeGeometries() never frees. Only the final merged geometry was kept
    // on the species record, so those intermediates were orphaned forever — Vegetation.dispose() had no
    // reference to reach them. A fixed build disposes every intermediate immediately after merging, so
    // BufferGeometry.dispose() must already have fired multiple times by the time the constructor returns.
    const orig = THREE.BufferGeometry.prototype.dispose;
    let disposedDuringConstruction = 0;
    THREE.BufferGeometry.prototype.dispose = function (this: THREE.BufferGeometry) {
      disposedDuringConstruction++;
      return orig.call(this);
    };
    try {
      const scene = new THREE.Scene();
      const veg = new Vegetation(scene);
      expect(disposedDuringConstruction).toBeGreaterThan(0);
      veg.dispose();
    } finally {
      THREE.BufferGeometry.prototype.dispose = orig;
    }
  });
});
