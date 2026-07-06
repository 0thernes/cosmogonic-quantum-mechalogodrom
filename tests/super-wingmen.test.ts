/**
 * THE WINGMAN SWARM (V47) — the 100-robot escort, each a ~250-param brain. Pins the count + per-robot
 * budget, determinism, the bounded orbit formation, the assist signal, NaN-freedom, and that the swarm
 * tracks its creature as it flies.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { WingmanSwarm, WINGMAN_COUNT, WINGMAN_PARAMS_EACH } from '../src/sim/super-wingmen';
import { WingmanRenderer, droneSpeed } from '../src/sim/super-wingmen-render';

const Q0 = [0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0.4]; // a sample quantum-aspect vector

function hdist(pos: Float32Array, i: number, cx: number, cz: number): number {
  return Math.hypot(pos[i * 3]! - cx, pos[i * 3 + 2]! - cz);
}

function meshOf(scene: THREE.Scene): THREE.InstancedMesh {
  const m = scene.children.find((o) => o instanceof THREE.InstancedMesh);
  expect(m).toBeInstanceOf(THREE.InstancedMesh);
  return m as THREE.InstancedMesh;
}

function instanceScale(mesh: THREE.InstancedMesh, i: number): number {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(i, m);
  return new THREE.Vector3().setFromMatrixScale(m).x;
}

function instancePosition(mesh: THREE.InstancedMesh, i: number): THREE.Vector3 {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(i, m);
  return new THREE.Vector3().setFromMatrixPosition(m);
}

describe('WingmanSwarm (V47)', () => {
  test('100 robots, each a ~250-parameter brain', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(1));
    expect(sw.count).toBe(100);
    expect(WINGMAN_PARAMS_EACH).toBeGreaterThanOrEqual(200);
    expect(WINGMAN_PARAMS_EACH).toBeLessThanOrEqual(300);
    expect(sw.paramsTotal).toBe(100 * WINGMAN_PARAMS_EACH);
    expect(sw.positions).toHaveLength(300); // 100 × xyz
  });

  test('same seed ⇒ identical swarm (deterministic positions + assist)', () => {
    const a = new WingmanSwarm(40, mulberry32(7));
    const b = new WingmanSwarm(40, mulberry32(7));
    for (let f = 0; f < 20; f++) {
      a.update(0, 12, 0, 0.8, Q0, f / 60, 1 / 60);
      b.update(0, 12, 0, 0.8, Q0, f / 60, 1 / 60);
    }
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(a.assist).toBe(b.assist);
  });

  test('robots hold a bounded orbit formation around the creature', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(3));
    for (let f = 0; f < 60; f++) sw.update(0, 12, 0, 0.7, Q0, f / 60, 1 / 60);
    for (let i = 0; i < sw.count; i++) {
      const d = hdist(sw.positions, i, 0, 0);
      expect(d).toBeGreaterThan(4); // never collapses into the core
      expect(d).toBeLessThan(28); // never flies off
    }
  });

  test('assist is a bounded 0..1 lift', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(5));
    for (let f = 0; f < 30; f++) {
      sw.update(0, 12, 0, 0.9, Q0, f / 60, 1 / 60);
      expect(sw.assist).toBeGreaterThanOrEqual(0);
      expect(sw.assist).toBeLessThanOrEqual(1);
    }
  });

  test('the swarm tracks its creature as it flies (positions follow the centre)', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(9));
    for (let f = 0; f < 30; f++) sw.update(0, 12, 0, 0.6, Q0, f / 60, 1 / 60);
    // move the creature far away and let the swarm re-centre on it
    for (let f = 30; f < 60; f++) sw.update(120, 30, -80, 0.6, Q0, f / 60, 1 / 60);
    for (let i = 0; i < sw.count; i++) {
      expect(hdist(sw.positions, i, 120, -80)).toBeLessThan(28); // orbiting the NEW locus
    }
  });

  test('no NaN under a long run', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(11));
    for (let f = 0; f < 400; f++)
      sw.update(Math.sin(f) * 50, 14, Math.cos(f) * 50, 0.5, Q0, f / 60, 1 / 60);
    for (const v of sw.positions) expect(Number.isFinite(v)).toBe(true);
    expect(Number.isFinite(sw.assist)).toBe(true);
  });
});

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
    const v0 = mesh.instanceMatrix.version;
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
      [-5, 1.2],
      [0, 1.2],
      [0.5, 2.2],
      [1, 3.2],
      [100, 3.2],
    ];
    for (const [glow, expected] of cases) {
      r.sync(pos, 1, glow);
      expect(mat.emissiveIntensity).toBeCloseTo(expected, 6);
    }
  });

  test('a positions buffer shorter than count x 3 falls back to origin', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 4);
    r.sync(new Float32Array([]), 2, 0.5);
    const mesh = meshOf(scene);
    for (let i = 0; i < 4; i++) {
      const p = instancePosition(mesh, i);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(p.toArray()).toEqual([0, 0, 0]);
    }
  });
});

describe('droneSpeed (pure)', () => {
  test('frame-to-frame displacement magnitude; 0 with no previous frame; short buffer falls back to 0', () => {
    expect(droneSpeed(null, new Float32Array([1, 2, 3]), 0)).toBe(0);
    const prev = new Float32Array([0, 0, 0]);
    const cur = new Float32Array([3, 4, 0]);
    expect(droneSpeed(prev, cur, 0)).toBeCloseTo(5, 6);
    expect(droneSpeed(new Float32Array([]), cur, 0)).toBeCloseTo(5, 6);
  });
});

describe('WingmanRenderer — drone size reads REAL speed (de-decorated)', () => {
  test('a maneuvering drone swells; an idle one stays at the base size', () => {
    const scene = new THREE.Scene();
    const r = new WingmanRenderer(scene, 2);
    const mesh = meshOf(scene);
    r.sync(new Float32Array([0, 0, 0, 10, 0, 0]), 0, 0.5);
    r.sync(new Float32Array([2, 0, 0, 10, 0, 0]), 1, 0.5);
    const moving = instanceScale(mesh, 0);
    const still = instanceScale(mesh, 1);
    expect(moving).toBeGreaterThan(still);
    expect(still).toBeCloseTo(0.45, 6);
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
