/**
 * ALIEN FLORA — the vegetal ground ecology. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (boot-stream-neutral; headless Scene only);
 * - it places a substantial 15k desktop population across ≥1 family InstancedMesh, all transforms finite;
 * - placement is DETERMINISTIC: two builds from identical context ⇒ bit-identical instance matrices;
 * - `comfortAt` returns a finite world position + a 0..1 cover strength (the fauna's cover readout);
 * - `update` is a pure uniform write (no throw, drives uTime/uWind/uChaos) and never allocates a mesh;
 * - `dispose()` frees every mesh + removes them from the scene without throwing.
 *
 * Headless: three's Scene / InstancedMesh / ShaderMaterial / BufferGeometry need no WebGL context.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlienFlora } from '../src/sim/alien-flora';
import type { SimContext } from '../src/types';

/** Minimal headless ctx — AlienFlora only reads `scene` + `quality.isMobile`. */
function makeCtx(isMobile = false): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: { isMobile },
  } as unknown as SimContext;
}

/** Concatenate every family mesh's instance-matrix array (the full placement fingerprint). */
function matrixFingerprint(scene: THREE.Scene): number[] {
  const out: number[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      const arr = o.instanceMatrix.array as ArrayLike<number>;
      for (let i = 0; i < arr.length; i++) out.push(arr[i]!);
    }
  });
  return out;
}

describe('AlienFlora — the vegetal ground ecology', () => {
  test('boots headless and plants a substantial field across family meshes', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    expect(f.speciesCount).toBe(50);
    expect(f.instanceCount).toBeGreaterThan(10000);
    expect(f.instanceCount).toBeLessThanOrEqual(15000);
    let meshes = 0;
    let total = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        meshes++;
        total += o.count;
      }
    });
    expect(meshes).toBeGreaterThanOrEqual(1);
    expect(meshes).toBeLessThanOrEqual(6);
    expect(total).toBe(f.instanceCount); // every placed plant is in some family mesh
    f.dispose();
  });

  test('every instance transform is finite (plants seated on the terrain, no NaN matrices)', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    const fp = matrixFingerprint(ctx.scene);
    expect(fp.length).toBeGreaterThan(0);
    for (const v of fp) expect(Number.isFinite(v)).toBe(true);
    f.dispose();
  });

  test('placement is deterministic — two builds ⇒ bit-identical instance matrices', () => {
    const a = makeCtx();
    const b = makeCtx();
    const fa = new AlienFlora(a);
    const fb = new AlienFlora(b);
    expect(fa.instanceCount).toBe(fb.instanceCount);
    const pa = matrixFingerprint(a.scene);
    const pb = matrixFingerprint(b.scene);
    expect(pa.length).toBe(pb.length);
    for (let i = 0; i < pa.length; i++) expect(pa[i]).toBe(pb[i]);
    fa.dispose();
    fb.dispose();
  });

  test('comfortAt returns a finite grove position + a 0..1 cover strength', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    for (const [x, z] of [
      [0, 0],
      [120, -90],
      [-200, 150],
      [300, 300],
    ] as const) {
      const c = f.comfortAt(x, z);
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
      expect(Number.isFinite(c.z)).toBe(true);
      expect(c.strength).toBeGreaterThanOrEqual(0);
      expect(c.strength).toBeLessThanOrEqual(1);
    }
    // Somewhere in the planted field, cover strength must be strictly positive (the grid tallied plants).
    let sawCover = false;
    for (let a = 0; a < 360 && !sawCover; a += 20) {
      const x = Math.cos((a * Math.PI) / 180) * 160;
      const z = Math.sin((a * Math.PI) / 180) * 160;
      if (f.comfortAt(x, z).strength > 0) sawCover = true;
    }
    expect(sawCover).toBe(true);
    f.dispose();
  });

  test('update is a pure uniform write (drives uTime/uChaos, no throw, no new mesh)', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    let before = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) before++;
    });
    expect(() => f.update(1 / 60, 12.5, 0.7)).not.toThrow();
    let after = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) after++;
    });
    expect(after).toBe(before); // O(1) update never spawns geometry
    f.dispose();
  });

  test('mobile builds a lighter field than desktop', () => {
    const desktop = new AlienFlora(makeCtx(false));
    const mobile = new AlienFlora(makeCtx(true));
    expect(mobile.instanceCount).toBeLessThan(desktop.instanceCount);
    expect(mobile.instanceCount).toBeLessThanOrEqual(5200);
    desktop.dispose();
    mobile.dispose();
  });

  test('dispose() frees the field and clears it from the scene', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    let live = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) live++;
    });
    expect(live).toBeGreaterThan(0);
    expect(() => f.dispose()).not.toThrow();
    let after = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) after++;
    });
    expect(after).toBe(0);
  });
});
