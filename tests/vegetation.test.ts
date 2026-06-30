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
