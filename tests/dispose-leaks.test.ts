/**
 * GPU-resource teardown for the scene-only visual systems (CosmicWeb, QuantumLattice).
 *
 * These systems own BufferGeometries + materials and add them to the scene, but had NO dispose() and were
 * omitted from World.dispose() — so every dev HMR reload orphaned their geometries/materials (the repo's
 * recurring WebGL-context-exhaustion leak; three's WebGLRenderer.dispose() does NOT traverse the scene).
 * These tests prove each now frees its owned geometry + material, detaches from the scene, and is
 * idempotent. (Connectome + InstancedEntityRenderer own the same fix but need a full SimContext to build,
 * so they are covered by tsc + the shared growPool disposal pattern they mirror.)
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { CosmicWeb } from '../src/sim/cosmic-web';
import { QuantumLattice } from '../src/sim/quantum-lattice';

describe('dispose-leaks: scene-only systems free their GPU resources', () => {
  test('CosmicWeb.dispose frees its geometries + materials and detaches from the scene', () => {
    const scene = new THREE.Scene();
    const web = new CosmicWeb(scene);
    expect(scene.children.length).toBeGreaterThan(0); // it added a group
    const geoDispose = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDispose = spyOn(THREE.Material.prototype, 'dispose');
    web.dispose();
    expect(geoDispose.mock.calls.length).toBeGreaterThanOrEqual(2); // pGeo + lGeo
    expect(matDispose.mock.calls.length).toBeGreaterThanOrEqual(2); // PointsMaterial + LineBasicMaterial
    expect(scene.children.length).toBe(0); // group.removeFromParent()
    geoDispose.mockRestore();
    matDispose.mockRestore();
    expect(() => web.dispose()).not.toThrow(); // idempotent
  });

  test('QuantumLattice.dispose frees the 3 wireframe shells + shared material and detaches', () => {
    const scene = new THREE.Scene();
    const lat = new QuantumLattice(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    const geoDispose = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDispose = spyOn(THREE.Material.prototype, 'dispose');
    lat.dispose();
    expect(geoDispose.mock.calls.length).toBeGreaterThanOrEqual(3); // 3 WireframeGeometry shells
    expect(matDispose.mock.calls.length).toBeGreaterThanOrEqual(1); // one shared LineBasicMaterial
    expect(scene.children.length).toBe(0);
    geoDispose.mockRestore();
    matDispose.mockRestore();
    expect(() => lat.dispose()).not.toThrow(); // idempotent
  });
});
