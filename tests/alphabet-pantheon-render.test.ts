/**
 * ALPHABET PANTHEON RENDER (V-ABC). Falsifiable claims:
 * - all 100 archetypes get a body (count === ALPHABET_PANTHEON_SIZE);
 * - one solid InstancedMesh per unique wild-geometry bucket (≥80) + wire halos + accent/filament/spore layers;
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

/** Solid letter bodies (wild-geometry pools — each pool < 100 instances). */
function coreBodyMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  return instancedMeshes(scene).filter(
    (m) => !(m.material as THREE.MeshBasicMaterial).wireframe && m.count < 100,
  );
}

function firstCoreMatrix(scene: THREE.Scene): number[] {
  const mesh = coreBodyMeshes(scene)[0]!;
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(0, m);
  return [...m.elements];
}

describe('AlphabetPantheonRender — 100 archetypes alive in the dome', () => {
  test('renders all 100 archetypes across unique geometry buckets', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    expect(r.count).toBe(ALPHABET_PANTHEON_SIZE);
    const cores = coreBodyMeshes(scene);
    expect(cores.length).toBeGreaterThanOrEqual(80);
    expect(cores.length).toBeLessThanOrEqual(100);
    let coreTotal = 0;
    for (const m of cores) coreTotal += m.count;
    expect(coreTotal).toBe(100);
    const accents = instancedMeshes(scene).filter((m) => m.count === 100);
    expect(accents.length).toBeGreaterThanOrEqual(3);
    r.dispose();
  });

  test('geometry buckets spread — not one recoloured bucket', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    expect(coreBodyMeshes(scene).length).toBeGreaterThanOrEqual(80);
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

  test('dt-driven update freezes while paused and resumes when dt advances', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    r.update(0, 1 / 60);
    const frozen = firstCoreMatrix(scene);

    r.setChaos(1);
    r.update(999, 0);
    expect(firstCoreMatrix(scene)).toEqual(frozen);

    r.update(999, 1 / 60);
    const resumed = firstCoreMatrix(scene);
    expect(resumed.some((v, i) => v !== frozen[i])).toBe(true);
    r.dispose();
  });

  test('dispose() is safe', () => {
    const r = new AlphabetPantheonRender(new THREE.Scene());
    r.update(1);
    expect(() => r.dispose()).not.toThrow();
  });
});
