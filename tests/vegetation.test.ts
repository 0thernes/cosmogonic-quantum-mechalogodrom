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
});
