/**
 * FLOATING MONOLITHS — suspended dome architecture. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (headless Scene only);
 * - it adds 16 megalith groups carrying thousands of instanced greeble panels, all transforms finite;
 * - placement is DETERMINISTIC: two builds ⇒ bit-identical instance matrices (pure positional hash);
 * - `update` drifts the groups + kindles emissive with no throw and spawns no geometry;
 * - `dispose()` detaches every megalith from the scene.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { FloatingMonoliths } from '../src/sim/floating-monoliths';

function instanceMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) out.push(o);
  });
  return out;
}

function fingerprint(scene: THREE.Scene): number[] {
  const out: number[] = [];
  for (const mesh of instanceMeshes(scene)) {
    const arr = mesh.instanceMatrix.array as ArrayLike<number>;
    for (let i = 0; i < arr.length; i++) out.push(arr[i]!);
  }
  return out;
}

describe('FloatingMonoliths — suspended dome architecture', () => {
  test('boots headless, hangs 16 megaliths with thousands of greeble panels', () => {
    const scene = new THREE.Scene();
    const f = new FloatingMonoliths(scene);
    let groups = 0;
    scene.traverse((o) => {
      if (o instanceof THREE.Group) groups++;
    });
    expect(groups).toBe(16);
    expect(f.panelCount).toBeGreaterThan(2000); // ~14 greebled megaliths × 180 panels
    expect(instanceMeshes(scene).length).toBeGreaterThanOrEqual(13);
    f.dispose();
  });

  test('every instance transform is finite', () => {
    const scene = new THREE.Scene();
    const f = new FloatingMonoliths(scene);
    const fp = fingerprint(scene);
    expect(fp.length).toBeGreaterThan(0);
    for (const v of fp) expect(Number.isFinite(v)).toBe(true);
    f.dispose();
  });

  test('placement is deterministic — two builds ⇒ bit-identical instance matrices', () => {
    const a = new THREE.Scene();
    const b = new THREE.Scene();
    const fa = new FloatingMonoliths(a);
    const fb = new FloatingMonoliths(b);
    expect(fa.panelCount).toBe(fb.panelCount);
    const pa = fingerprint(a);
    const pb = fingerprint(b);
    expect(pa.length).toBe(pb.length);
    for (let i = 0; i < pa.length; i++) expect(pa[i]).toBe(pb[i]);
    fa.dispose();
    fb.dispose();
  });

  test('update drifts the megaliths with no throw + no new geometry', () => {
    const scene = new THREE.Scene();
    const f = new FloatingMonoliths(scene);
    const before = instanceMeshes(scene).length;
    expect(() => f.update(14.0, 0.6)).not.toThrow();
    expect(() => f.update(28.0, 1.5)).not.toThrow(); // out-of-range chaos is clamped
    expect(instanceMeshes(scene).length).toBe(before);
    f.dispose();
  });

  test('dispose() detaches every megalith from the scene', () => {
    const scene = new THREE.Scene();
    const f = new FloatingMonoliths(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(() => f.dispose()).not.toThrow();
    expect(scene.children.length).toBe(0);
  });
});
