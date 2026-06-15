/**
 * WingmanRenderer (V47) — the render leaf that draws a WingmanSwarm's drones as one InstancedMesh.
 * Visual-only and kept separate from the pure swarm sim, but it carries real logic worth pinning:
 * the per-instance matrix write from the flat positions buffer, the emissive-glow clamp
 * (1.2 + 2·clamp(glow,0,1)), the count floor (Math.max(1,count)), and the short-buffer `?? 0`
 * robustness fallback. Headless: real three.js scene graph + InstancedMesh, no WebGL renderer.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { WingmanRenderer } from '../src/sim/super-wingmen-render';

function meshOf(scene: THREE.Scene): THREE.InstancedMesh {
  const m = scene.children.find((o) => o instanceof THREE.InstancedMesh);
  expect(m).toBeInstanceOf(THREE.InstancedMesh);
  return m as THREE.InstancedMesh;
}

function instancePosition(mesh: THREE.InstancedMesh, i: number): THREE.Vector3 {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(i, m);
  return new THREE.Vector3().setFromMatrixPosition(m);
}

describe('WingmanRenderer — construction', () => {
  test('adds one InstancedMesh with the requested instance count', () => {
    const scene = new THREE.Scene();
    new WingmanRenderer(scene, 8);
    expect(meshOf(scene).count).toBe(8);
  });

  test('floors the count at 1 (Math.max(1, count)) so a zero-size swarm still builds', () => {
    const scene = new THREE.Scene();
    new WingmanRenderer(scene, 0);
    expect(meshOf(scene).count).toBe(1);
  });
});

describe('WingmanRenderer — sync', () => {
  test('writes each drone position from the flat XYZ buffer into its instance matrix', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 3);
    const mesh = meshOf(scene);
    const v0 = mesh.instanceMatrix.version; // `needsUpdate` is write-only; the version bump proves the upload flag fired
    const positions = new Float32Array([1, 2, 3, -4, 5, -6, 7, -8, 9]);
    r.sync(positions, 0.5, 0.5);
    expect(instancePosition(mesh, 0).toArray()).toEqual([1, 2, 3]);
    expect(instancePosition(mesh, 1).toArray()).toEqual([-4, 5, -6]);
    expect(instancePosition(mesh, 2).toArray()).toEqual([7, -8, 9]);
    expect(mesh.instanceMatrix.version).toBeGreaterThan(v0);
  });

  test('clamps the emissive glow to [1.2, 3.2] regardless of the input range', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 1);
    const mat = meshOf(scene).material as THREE.MeshStandardMaterial;
    const pos = new Float32Array([0, 0, 0]);
    const cases: [number, number][] = [
      [-5, 1.2], // below 0 → floor
      [0, 1.2],
      [0.5, 2.2],
      [1, 3.2],
      [100, 3.2], // above 1 → ceil
    ];
    for (const [glow, expected] of cases) {
      r.sync(pos, 1, glow);
      expect(mat.emissiveIntensity).toBeCloseTo(expected, 6);
    }
  });

  test('a positions buffer shorter than count×3 falls back to origin (no NaN, no throw)', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 4);
    r.sync(new Float32Array([]), 2, 0.5); // empty buffer, 4 instances
    const mesh = meshOf(scene);
    for (let i = 0; i < 4; i++) {
      const p = instancePosition(mesh, i);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(p.toArray()).toEqual([0, 0, 0]);
    }
  });
});

describe('WingmanRenderer — dispose', () => {
  test('removes its mesh from the scene', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 2);
    expect(scene.children.some((o) => o instanceof THREE.InstancedMesh)).toBe(true);
    r.dispose();
    expect(scene.children.some((o) => o instanceof THREE.InstancedMesh)).toBe(false);
  });
});
