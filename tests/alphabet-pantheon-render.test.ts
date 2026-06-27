/**
 * ALPHABET PANTHEON RENDER (V-ABC). Falsifiable claims:
 * - all 100 archetypes get a body (count === ALPHABET_PANTHEON_SIZE) across ≤ 5 InstancedMeshes;
 * - the 24 vowels (7 greek + 5 latin, both cases) bucket into the distinctive knot pool;
 * - construction + ticking draw NO rng and need no WebGL (headless Scene only);
 * - every instance transform stays FINITE over a long run at max chaos;
 * - deterministic: two independent renders, same (t) sequence ⇒ bit-identical instance matrices;
 * - dispose() frees the rig without throwing.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlphabetPantheonRender } from '../src/sim/alphabet-pantheon-render';
import { ALPHABET_PANTHEON_SIZE } from '../src/sim/alphabet-pantheon';

function instancedMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) out.push(o as THREE.InstancedMesh);
  });
  return out;
}

describe('AlphabetPantheonRender — 100 archetypes alive in the dome', () => {
  test('renders all 100 archetypes across ≤ 5 instanced pools', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    expect(r.count).toBe(ALPHABET_PANTHEON_SIZE);
    expect(ALPHABET_PANTHEON_SIZE).toBe(100);
    const meshes = instancedMeshes(scene);
    expect(meshes.length).toBeLessThanOrEqual(5);
    let total = 0;
    for (const m of meshes) total += m.count;
    expect(total).toBe(100);
    r.dispose();
  });

  test('the 24 vowels bucket into one distinctive pool', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    const counts = instancedMeshes(scene)
      .map((m) => m.count)
      .sort((a, b) => a - b);
    // greek vowels 7×2 (upper+lower) + latin vowels 5×2 = 24 in the knot pool.
    expect(counts).toContain(24);
    r.dispose();
  });

  test('every instance transform stays finite over a long run at max chaos', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < 60 * 90; i++) {
      t += dt;
      r.setChaos(1);
      r.update(t);
    }
    const m = new THREE.Matrix4();
    for (const mesh of instancedMeshes(scene)) {
      for (let s = 0; s < mesh.count; s++) {
        mesh.getMatrixAt(s, m);
        for (const e of m.elements) expect(Number.isFinite(e)).toBe(true);
      }
    }
    r.dispose();
  });

  test('is deterministic — same tick sequence ⇒ identical instance matrices', () => {
    const sa = new THREE.Scene();
    const sb = new THREE.Scene();
    const a = new AlphabetPantheonRender(sa);
    const b = new AlphabetPantheonRender(sb);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < 300; i++) {
      t += dt;
      a.setChaos(0.5);
      b.setChaos(0.5);
      a.update(t);
      b.update(t);
    }
    const ma = instancedMeshes(sa);
    const mb = instancedMeshes(sb);
    expect(ma.length).toBe(mb.length);
    const x = new THREE.Matrix4();
    const y = new THREE.Matrix4();
    for (let p = 0; p < ma.length; p++) {
      const A = ma[p]!;
      const B = mb[p]!;
      expect(A.count).toBe(B.count);
      for (let s = 0; s < A.count; s++) {
        A.getMatrixAt(s, x);
        B.getMatrixAt(s, y);
        for (let e = 0; e < 16; e++) expect(x.elements[e]).toBe(y.elements[e]);
      }
    }
    a.dispose();
    b.dispose();
  });

  test('dispose() is safe', () => {
    const r = new AlphabetPantheonRender(new THREE.Scene());
    r.update(1);
    expect(() => r.dispose()).not.toThrow();
  });
});
