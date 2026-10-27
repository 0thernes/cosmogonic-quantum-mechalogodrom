import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  cullEntities,
  isPointInFrustum,
  isSphereInFrustum,
  isWithinRenderDistance,
} from '../src/core/frustum-cull';

function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

describe('frustum culling helpers', () => {
  test('classifies visible and off-screen points without changing camera output', () => {
    const camera = makeCamera();
    expect(isPointInFrustum(camera, new THREE.Vector3(0, 0, -5))).toBe(true);
    expect(isPointInFrustum(camera, new THREE.Vector3(1000, 0, -5))).toBe(false);
    expect(isSphereInFrustum(camera, new THREE.Vector3(0, 0, -5), 1)).toBe(true);
  });

  test('batch culling respects squared distance and negative-distance semantics', () => {
    const camera = makeCamera();
    const positions = new Float32Array([0, 0, -5, 200, 0, -5, 0, 0, -50]);
    const radii = new Float32Array([1, 1, 1]);

    expect(cullEntities(camera, positions, radii, 20)).toEqual([0]);
    expect(cullEntities(camera, positions, radii, 100)).toEqual([0, 2]);
    expect(cullEntities(camera, positions, radii, -1)).toEqual([]);
  });

  test('render-distance helper preserves negative max-distance behavior', () => {
    const camera = makeCamera();
    const near = new THREE.Vector3(0, 0, -5);
    expect(isWithinRenderDistance(camera, near, 5)).toBe(true);
    expect(isWithinRenderDistance(camera, near, 4.99)).toBe(false);
    expect(isWithinRenderDistance(camera, near, -1)).toBe(false);
  });
});
