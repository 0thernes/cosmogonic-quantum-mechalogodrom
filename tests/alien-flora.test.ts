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
    expect(meshes).toBeLessThanOrEqual(9); // V109: expanded to 9 structural family silhouettes
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

  test('contact response is a visual-only ragdoll spring that settles to rest', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    const mat = (f as unknown as { material: THREE.ShaderMaterial }).material;
    f.setContact(12, -34, 0.8);
    // The touch point is recorded immediately (visual uniform)...
    const pos = mat.uniforms['uContactPos']!.value as THREE.Vector2;
    expect(pos.x).toBe(12);
    expect(pos.y).toBe(-34);
    // ...and the bend SPRINGS in through update() (a damped ragdoll, not an instant poke): it rises
    // off rest and reaches a real deflection over the first frames.
    let peak = 0;
    for (let i = 0; i < 24; i++) {
      f.update(1 / 60, 1, 0.3);
      peak = Math.max(peak, Math.abs(mat.uniforms['uContact']!.value as number));
    }
    expect(peak).toBeGreaterThan(0.1);
    // With no further contact the spring settles back toward rest — bounded, never a runaway.
    for (let i = 0; i < 400; i++) f.update(1 / 60, 1, 0.3);
    expect(Math.abs(mat.uniforms['uContact']!.value as number)).toBeLessThan(0.05);
    f.dispose();
  });

  test('grazing offers food + eats plants down to stubs, and biomass regrows (life-cycle)', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    // Find a cell that actually has plants (the centre is cleared) via the cover query.
    let gx = 0;
    let gz = 0;
    let found = false;
    for (let a = 60; a < 540 && !found; a += 30) {
      for (let ang = 0; ang < 6.28 && !found; ang += 0.4) {
        const c = f.comfortAt(Math.cos(ang) * a, Math.sin(ang) * a);
        if (c.strength > 0.05) {
          gx = c.x;
          gz = c.z;
          found = true;
        }
      }
    }
    expect(found).toBe(true);
    // Graze it hard → it yields food (energy) while depleting; once eaten out, further grazes yield ~0.
    let totalFood = 0;
    for (let i = 0; i < 250; i++) totalFood += f.grazeAt(gx, gz, 1, 1 / 60);
    expect(totalFood).toBeGreaterThan(0); // plants offered food
    expect(f.grazeAt(gx, gz, 1, 1 / 60)).toBeCloseTo(0, 3); // eaten to a stub → no more food
    // With no grazing, the cell REGROWS and becomes edible again (regenerate from death).
    for (let i = 0; i < 1400; i++) f.update(1 / 60, 1, 0.3);
    expect(f.grazeAt(gx, gz, 1, 1 / 60)).toBeGreaterThan(0);
    // A location off the field yields nothing (no plants there).
    expect(f.grazeAt(1e6, 1e6, 1, 1 / 60)).toBe(0);
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
