/**
 * GOD-COLOSSUS — the one colossal god-tier monument. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (headless Scene only);
 * - it builds a single root group carrying ~2400 instanced greeble panels, all transforms finite;
 * - placement is DETERMINISTIC: two builds ⇒ bit-identical greeble instance matrices (positional hash);
 * - `update` blazes/rotates/sways with no throw and spawns NO new geometry (scene object count stable);
 * - `dispose()` detaches the monument from the scene.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { GodColossus } from '../src/sim/god-colossus';

function instanceMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) out.push(o);
  });
  return out;
}

function panelFingerprint(scene: THREE.Scene): number[] {
  const out: number[] = [];
  for (const mesh of instanceMeshes(scene)) {
    const arr = mesh.instanceMatrix.array as ArrayLike<number>;
    for (let i = 0; i < arr.length; i++) out.push(arr[i]!);
  }
  return out;
}

function countObjects(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse(() => n++);
  return n;
}

describe('GodColossus — the colossal god-tier monument', () => {
  test('boots headless: one root group + ~2400 greeble panels', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    let groups = 0;
    scene.traverse((o) => {
      if (o instanceof THREE.Group) groups++;
    });
    expect(groups).toBe(1);
    expect(g.panelCount).toBeGreaterThan(2000);
    expect(instanceMeshes(scene).length).toBe(1);
    g.dispose();
  });

  test('every greeble instance transform is finite', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    const fp = panelFingerprint(scene);
    expect(fp.length).toBeGreaterThan(0);
    for (const v of fp) expect(Number.isFinite(v)).toBe(true);
    g.dispose();
  });

  test('placement is deterministic — two builds ⇒ bit-identical greeble matrices', () => {
    const a = new THREE.Scene();
    const b = new THREE.Scene();
    const ga = new GodColossus(a);
    const gb = new GodColossus(b);
    expect(ga.panelCount).toBe(gb.panelCount);
    const pa = panelFingerprint(a);
    const pb = panelFingerprint(b);
    expect(pa.length).toBe(pb.length);
    for (let i = 0; i < pa.length; i++) expect(pa[i]).toBe(pb[i]!);
    ga.dispose();
    gb.dispose();
  });

  test('update blazes + rotates with finite transforms and spawns no geometry', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    const before = countObjects(scene);
    for (let f = 0; f < 240; f++) g.update(f / 60, (f % 60) / 60, ((f * 7) % 100) / 100);
    expect(countObjects(scene)).toBe(before); // no per-frame allocation into the scene graph
    scene.traverse((o) => {
      o.updateMatrix();
      const a = o.matrix.elements;
      for (let i = 0; i < a.length; i++) expect(Number.isFinite(a[i]!)).toBe(true);
    });
    g.dispose();
  });

  test('dispose() detaches the monument', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    g.dispose();
    expect(scene.children.length).toBe(0);
  });
});
