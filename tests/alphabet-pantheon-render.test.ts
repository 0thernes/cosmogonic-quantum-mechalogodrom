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
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { AlphabetPantheonRender } from '../src/sim/alphabet-pantheon-render';
import { ALPHABET_PANTHEON_SIZE } from '../src/sim/alphabet-pantheon';
import { ARENA_RADIUS } from '../src/sim/constants';

const root = resolve(import.meta.dir, '..');

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

  test('user #10 — core bodies use the provided equirect atlas as opaque skins', () => {
    const atlas = resolve(root, 'public/textures/pantheon_equirect_refs_atlas.png');
    expect(existsSync(atlas)).toBe(true);
    expect(statSync(atlas).size).toBeGreaterThan(500_000);

    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    const core = coreBodyMeshes(scene)[0]!;
    const mat = core.material as THREE.ShaderMaterial;
    expect(mat.transparent).toBe(false);
    expect(mat.blending).toBe(THREE.NormalBlending);
    expect(mat.depthWrite).toBe(true);
    expect(mat.uniforms.uRefAtlas?.value).toBeInstanceOf(THREE.Texture);
    expect(core.geometry.getAttribute('refBand')).toBeInstanceOf(THREE.InstancedBufferAttribute);
    r.dispose();
  });

  test('user #10 — wire halos hidden by default; VISION·wire toggles them', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    const halos = instancedMeshes(scene).filter((m) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      return mat.wireframe && mat.opacity <= 0.05;
    });
    expect(halos.length).toBeGreaterThan(0);
    for (const h of halos) expect(h.visible).toBe(false);
    r.setWireHalosVisible(true);
    for (const h of halos) expect(h.visible).toBe(true);
    r.setWireHalosVisible(false);
    for (const h of halos) expect(h.visible).toBe(false);
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

  test('user #10 — every godform body stays inside the dome and above the floor (max chaos, long run)', () => {
    // Regression seal for the owner's "biggest incomplete problem": pantheon creatures escaping the
    // dome and sinking underneath it. The prior ring-clamp forced each body's horizontal radius into
    // a fixed outer ring and allowed y down to -20, which flung the inner/upper anchors OUT to
    // ~1.24·DOME_R and let them drop under the ground. The anchor-tether fix must keep every body
    // contained AND above the floor, even under maximum chaos drive over a long run.
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    const dt = 1 / 60;
    let t = 0;
    const worldM = new THREE.Matrix4();
    const instM = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    let maxDist = 0;
    let minY = Infinity;
    for (let i = 0; i < 60 * 60; i++) {
      t += dt;
      r.setChaos(1); // worst case — maximum wander drive
      r.update(t);
      for (const mesh of coreBodyMeshes(scene)) {
        mesh.updateWorldMatrix(true, false);
        for (let s = 0; s < mesh.count; s++) {
          mesh.getMatrixAt(s, instM);
          worldM.multiplyMatrices(mesh.matrixWorld, instM);
          pos.setFromMatrixPosition(worldM);
          const dist = Math.hypot(pos.x, pos.y, pos.z);
          if (dist > maxDist) maxDist = dist;
          if (pos.y < minY) minY = pos.y;
        }
      }
    }
    // USER #10 (box-arena diorama): godforms roam the large arena box but never escape it. Horizontal
    // reach is capped at ARENA_HALF (0.95·ARENA_RADIUS) and height at ARENA_CEIL (0.68·ARENA_RADIUS),
    // so the max distance from origin is the box diagonal ≈ 1.17·ARENA_RADIUS.
    expect(maxDist).toBeLessThanOrEqual(ARENA_RADIUS * 1.17);
    // ...and they must SPREAD across the arena (fill it), not cluster centrally — reach well past centre.
    expect(maxDist).toBeGreaterThan(ARENA_RADIUS * 0.5);
    // Never underneath the ground plane.
    expect(minY).toBeGreaterThanOrEqual(-1);
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
