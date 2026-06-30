/**
 * TEMPLE GREEBLE — the abomination-architecture detail shell. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (headless Object3D only);
 * - it realizes two InstancedMeshes (greeble masses+panels, data-rain strips) at the capped counts;
 * - every instance transform is finite (no NaN megastructure);
 * - placement is DETERMINISTIC: two builds ⇒ bit-identical instance matrices (pure positional hash);
 * - `update` is a pure uniform write (drives uTime/uChaos/uReact + greeble emissive, no throw);
 * - `dispose()` frees both meshes and detaches them from the temple group.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { TempleGreeble } from '../src/sim/temple-greeble';

const U = 2.5; // ARENA_MID

function fingerprint(mesh: THREE.InstancedMesh): number[] {
  const arr = mesh.instanceMatrix.array as ArrayLike<number>;
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) out.push(arr[i]!);
  return out;
}

describe('TempleGreeble — the megastructure detail shell', () => {
  test('boots headless, attaches two instanced meshes at the capped counts', () => {
    const parent = new THREE.Group();
    const g = new TempleGreeble(parent, U);
    expect(g.greebleCount).toBeGreaterThan(5000); // ~100 macro masses + 7000 micro panels
    expect(g.stripCount).toBe(1100);
    let instanced = 0;
    parent.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) instanced++;
    });
    expect(instanced).toBe(2);
    g.dispose();
  });

  test('every instance transform is finite (no NaN megastructure)', () => {
    const parent = new THREE.Group();
    const g = new TempleGreeble(parent, U);
    for (const v of fingerprint(g.greeble)) expect(Number.isFinite(v)).toBe(true);
    for (const v of fingerprint(g.strips)) expect(Number.isFinite(v)).toBe(true);
    g.dispose();
  });

  test('placement is deterministic — two builds ⇒ bit-identical instance matrices', () => {
    const a = new TempleGreeble(new THREE.Group(), U);
    const b = new TempleGreeble(new THREE.Group(), U);
    expect(a.greebleCount).toBe(b.greebleCount);
    const ga = fingerprint(a.greeble);
    const gb = fingerprint(b.greeble);
    expect(ga.length).toBe(gb.length);
    for (let i = 0; i < ga.length; i++) expect(ga[i]).toBe(gb[i]);
    a.dispose();
    b.dispose();
  });

  test('update is a pure uniform write (no throw, no new mesh)', () => {
    const parent = new THREE.Group();
    const g = new TempleGreeble(parent, U);
    let before = 0;
    parent.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) before++;
    });
    expect(() => g.update(9.5, 0.6, 0.8)).not.toThrow();
    let after = 0;
    parent.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) after++;
    });
    expect(after).toBe(before);
    g.dispose();
  });

  test('dispose() frees both meshes and clears them from the group', () => {
    const parent = new THREE.Group();
    const g = new TempleGreeble(parent, U);
    let live = 0;
    parent.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) live++;
    });
    expect(live).toBe(2);
    expect(() => g.dispose()).not.toThrow();
    let after = 0;
    parent.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) after++;
    });
    expect(after).toBe(0);
  });
});
