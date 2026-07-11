/**
 * ALIEN FLORA — the vegetal ground ecology. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (boot-stream-neutral; headless Scene only);
 * - it places exactly 60k desktop plants across ≤9 InstancedMeshes, all transforms finite and in bounds;
 * - placement is DETERMINISTIC: two builds from identical context ⇒ bit-identical instance matrices;
 * - `comfortAt` returns a finite world position + a 0..1 cover strength (the fauna's cover readout);
 * - `update` is allocation-free O(52²) ecology + uniform work and never allocates a mesh;
 * - `dispose()` frees every mesh + removes them from the scene without throwing.
 *
 * Headless: three's Scene / InstancedMesh / ShaderMaterial / BufferGeometry need no WebGL context.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  ALIEN_FLORA_FIELD_HALF,
  ALIEN_FLORA_TARGET_DESKTOP,
  ALIEN_FLORA_TARGET_MOBILE,
  AlienFlora,
} from '../src/sim/alien-flora';
import { PLATFORM_HALF } from '../src/sim/constants';
import type { OrganismIntelligenceSignal, SimContext } from '../src/types';

const OPERATIONAL_SIGNAL: OrganismIntelligenceSignal = {
  enabled: true,
  indicatorOnly: true,
  revision: 1,
  resourcePressure: 1,
  threatResponse: 0.3,
  exploration: 0.7,
  socialDrive: 1,
  plasticity: 1,
  forecast: 1,
  confidence: 1,
  corpusDrive: 1,
  ecologyRisk: 0.5,
  ecologySurprise: 0.25,
  channels: new Float32Array([1, 1, 1, 1]),
  integratedRepoCount: 17,
  diagnosticAlert: false,
};

/** Minimal headless ctx — AlienFlora only reads `scene` + `quality.isMobile`. */
function makeCtx(isMobile = false, organismIntelligence?: OrganismIntelligenceSignal): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: { isMobile },
    organismIntelligence,
  } as unknown as SimContext;
}

/** Direct typed-array views for every family mesh (avoids million-element boxed-number copies). */
function matrixArrays(scene: THREE.Scene): Float32Array[] {
  const out: Float32Array[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      out.push(o.instanceMatrix.array as Float32Array);
    }
  });
  return out;
}

describe('AlienFlora — the vegetal ground ecology', () => {
  test('boots headless and plants a substantial field across family meshes', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    expect(f.speciesCount).toBe(50);
    expect(f.instanceCount).toBe(ALIEN_FLORA_TARGET_DESKTOP);
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
    const arrays = matrixArrays(ctx.scene);
    expect(arrays.length).toBeGreaterThan(0);
    let finite = true;
    for (const arr of arrays) {
      for (let i = 0; i < arr.length; i++) finite &&= Number.isFinite(arr[i]);
    }
    expect(finite).toBe(true);
    f.dispose();
  });

  test('placement is deterministic — two builds ⇒ bit-identical instance matrices', () => {
    const a = makeCtx();
    const b = makeCtx();
    const fa = new AlienFlora(a);
    const fb = new AlienFlora(b);
    expect(fa.instanceCount).toBe(fb.instanceCount);
    const pa = matrixArrays(a.scene);
    const pb = matrixArrays(b.scene);
    expect(pa.length).toBe(pb.length);
    let identical = true;
    for (let m = 0; m < pa.length; m++) {
      const aa = pa[m]!;
      const bb = pb[m]!;
      if (aa.length !== bb.length) identical = false;
      for (let i = 0; identical && i < aa.length; i++) identical = aa[i] === bb[i];
    }
    expect(identical).toBe(true);
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
      [900, -900],
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

  test('every plant stays inside the expanded walls and the field reaches outer corners', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    let maxAbs = 0;
    let outerCornerPlants = 0;
    const outerByQuadrant = [0, 0, 0, 0];
    let withinBounds = true;
    for (const arr of matrixArrays(ctx.scene)) {
      for (let i = 0; i < arr.length; i += 16) {
        const x = arr[i + 12] ?? Infinity;
        const z = arr[i + 14] ?? Infinity;
        maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(z));
        withinBounds &&= Math.abs(x) <= PLATFORM_HALF && Math.abs(z) <= PLATFORM_HALF;
        if (Math.abs(x) > PLATFORM_HALF * 0.75 && Math.abs(z) > PLATFORM_HALF * 0.75) {
          outerCornerPlants++;
          const quadrant = (x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0);
          outerByQuadrant[quadrant] = (outerByQuadrant[quadrant] ?? 0) + 1;
        }
      }
    }
    expect(ALIEN_FLORA_FIELD_HALF).toBe(PLATFORM_HALF);
    expect(withinBounds).toBe(true);
    expect(maxAbs).toBeGreaterThan(PLATFORM_HALF * 0.98);
    expect(outerCornerPlants).toBeGreaterThan(100);
    for (const count of outerByQuadrant) expect(count).toBeGreaterThan(20);
    f.dispose();
  });

  test('update performs bounded ecology + uniform writes without allocating a new mesh', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    let before = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) before++;
    });
    expect(() => f.update(1 / 60, 12.5, 0.7, 0.25, 3, -2)).not.toThrow();
    const mat = (f as unknown as { material: THREE.ShaderMaterial }).material;
    expect(mat.vertexShader).toContain('float cqmTerrainDisplacement');
    expect(mat.uniforms['uTerrainEntropy']!.value).toBe(0.25);
    const wind = mat.uniforms['uTerrainWind']!.value as THREE.Vector2;
    expect(wind.x).toBe(3);
    expect(wind.y).toBe(-2);
    let after = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) after++;
    });
    expect(after).toBe(before); // Fixed-grid update never spawns geometry or scans plant instances.
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
    for (let a = 60; a < PLATFORM_HALF && !found; a += 30) {
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

  test('operational field accelerates actual biomass recovery under matched grazing', () => {
    const baseline = new AlienFlora(makeCtx(true));
    const adaptive = new AlienFlora(makeCtx(true, OPERATIONAL_SIGNAL));
    let gx = 0;
    let gz = 0;
    let found = false;
    for (let radius = 60; radius < PLATFORM_HALF && !found; radius += 30) {
      for (let angle = 0; angle < 6.28 && !found; angle += 0.4) {
        const c = baseline.comfortAt(Math.cos(angle) * radius, Math.sin(angle) * radius);
        if (c.strength > 0.05) {
          gx = c.x;
          gz = c.z;
          found = true;
        }
      }
    }
    expect(found).toBe(true);
    expect(adaptive.meanBiomass()).toBe(baseline.meanBiomass());
    for (let i = 0; i < 250; i++) {
      baseline.grazeAt(gx, gz, 1, 1 / 60);
      adaptive.grazeAt(gx, gz, 1, 1 / 60);
    }
    for (let i = 0; i < 600; i++) {
      baseline.update(1 / 60, 1, 0.3);
      adaptive.update(1 / 60, 1, 0.3);
    }
    expect(adaptive.meanBiomass()).toBeGreaterThan(baseline.meanBiomass());
    const exactMean = (flora: AlienFlora): number => {
      const internals = flora as unknown as { biomass: Float32Array; density: Float32Array };
      let total = 0;
      let occupied = 0;
      for (let i = 0; i < internals.biomass.length; i++) {
        if ((internals.density[i] ?? 0) <= 0) continue;
        total += internals.biomass[i] ?? 0;
        occupied++;
      }
      return occupied > 0 ? total / occupied : 0;
    };
    expect(baseline.meanBiomass()).toBeCloseTo(exactMean(baseline), 8);
    expect(adaptive.meanBiomass()).toBeCloseTo(exactMean(adaptive), 8);
    const beforeInvalidGraze = adaptive.meanBiomass();
    expect(adaptive.grazeAt(gx, gz, Number.NaN, Number.NaN)).toBe(0);
    expect(adaptive.meanBiomass()).toBe(beforeInvalidGraze);
    baseline.dispose();
    adaptive.dispose();
  });

  test('mobile builds a lighter field than desktop', () => {
    const desktop = new AlienFlora(makeCtx(false));
    const mobile = new AlienFlora(makeCtx(true));
    expect(desktop.instanceCount).toBe(ALIEN_FLORA_TARGET_DESKTOP);
    expect(mobile.instanceCount).toBe(ALIEN_FLORA_TARGET_MOBILE);
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
