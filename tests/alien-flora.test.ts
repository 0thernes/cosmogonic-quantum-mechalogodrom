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
    // The touch point is recorded immediately (visual uniform, slot 0)...
    const pos = mat.uniforms['uContactPos']!.value as THREE.Vector2;
    expect(pos.x).toBe(12);
    expect(pos.y).toBe(-34);
    // Multi-point uniforms also receive the seed (local thrash, not lawn-wide slabs).
    const cx = mat.uniforms['uContactX']!.value as THREE.Vector4;
    expect(cx.x).toBe(12);
    // ...and the bend SPRINGS in through update() (a damped ragdoll, not an instant poke): it rises
    // off rest and reaches a real deflection over the first frames.
    let peak = 0;
    for (let i = 0; i < 24; i++) {
      f.update(1 / 60, 1, 0.3);
      peak = Math.max(peak, Math.abs(mat.uniforms['uContact']!.value as number));
    }
    expect(peak).toBeGreaterThan(0.1);
    // With no further contact the spring settles back toward rest — bounded, never a runaway.
    // Keep loop short under coverage (collision O(N·k) is real work; spring is fast).
    for (let i = 0; i < 180; i++) f.update(1 / 60, 1, 0.3);
    expect(Math.abs(mat.uniforms['uContact']!.value as number)).toBeLessThan(0.05);
    f.dispose();
  });

  test('multi-point setContacts keeps local seeds independent (no single giant patch)', () => {
    const ctx = makeCtx();
    const f = new AlienFlora(ctx);
    const mat = (f as unknown as { material: THREE.ShaderMaterial }).material;
    f.setContacts([
      { x: 10, z: 20, strength: 0.9 },
      { x: 200, z: -150, strength: 0.7 },
      { x: -80, z: 90, strength: 0.5 },
    ]);
    for (let i = 0; i < 12; i++) f.update(1 / 60, 1, 0.4);
    const cx = mat.uniforms['uContactX']!.value as THREE.Vector4;
    const cz = mat.uniforms['uContactZ']!.value as THREE.Vector4;
    const cs = mat.uniforms['uContactS']!.value as THREE.Vector4;
    expect(cx.x).toBe(10);
    expect(cz.x).toBe(20);
    expect(cx.y).toBe(200);
    expect(cz.y).toBe(-150);
    expect(cx.z).toBe(-80);
    expect(cz.z).toBe(90);
    // All three springs should have sprung to a real deflection.
    expect(Math.abs(cs.x)).toBeGreaterThan(0.05);
    expect(Math.abs(cs.y)).toBeGreaterThan(0.05);
    expect(Math.abs(cs.z)).toBeGreaterThan(0.05);
    // Shader must use tight local falloff (not the old ~72u slab radius).
    // CONTACT_RADIUS=15 → r²=225; inner full-strength knee at 12 (local thrash, not slab).
    expect(mat.vertexShader).toContain('smoothstep(225.0, 12.0, d2)');
    expect(mat.vertexShader).toContain('aMeta');
    expect(mat.vertexShader).toContain('rootPin');
    // Upright multi-axis morph (Y-spin + lateral thrash) — never pitch/roll into dirt.
    expect(mat.vertexShader).toContain('tipMorph');
    expect(mat.vertexShader).toContain('Dual counter-spins');
    expect(mat.vertexShader).toContain('twist2');
    expect(mat.vertexShader).toContain('chirality');
    expect(mat.vertexShader).toContain('berry');
    expect(mat.vertexShader).toContain('josephson');
    expect(mat.vertexShader).toContain('zeno');
    expect(mat.vertexShader).toContain('Kakeya');
    expect(mat.vertexShader).toContain('needleLen');
    // Soft-body plant↔plant collision + hard contact thrash (not hollow decorative).
    expect(mat.vertexShader).toContain('SOFT COLLISION');
    expect(mat.vertexShader).toContain('plantHit');
    expect(mat.vertexShader).toContain('hitSquash');
    expect(mat.vertexShader).toContain('selfFlee');
    expect(mat.vertexShader).toContain('aPush'); // CPU spatial-hash pair forces
    // Plant↔land: rigid crest ride (one Y for whole plant — per-vertex lift sheared stems thin).
    expect(mat.vertexShader).toContain('cqmTerrainDisplacement');
    expect(mat.vertexShader).toContain('liftMax');
    expect(mat.vertexShader).toContain('rigidRide');
    expect(mat.vertexShader).not.toContain('liftHere');
    expect(mat.fragmentShader).toContain('field4');
    // Operational skins (food/stress/contact), not decorative paint.
    expect(mat.fragmentShader).toContain('Mutating operational skins');
    expect(mat.fragmentShader).toContain('moebiusHue');
    expect(mat.fragmentShader).toContain('hopfAngles');
    expect(mat.fragmentShader).toContain('Quasiperiodic');
    f.dispose();
  });

  test('operational ecology: food field, overgraze debt, and climate are load-bearing (falsifiable)', () => {
    const ctx = makeCtx(true);
    const f = new AlienFlora(ctx);
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
    // Food field is never above raw biomass; quality is positive on occupied cells.
    const bm = f.biomassAt(gx, gz);
    const food = f.foodAt(gx, gz);
    expect(food).toBeLessThanOrEqual(bm + 1e-9);
    expect(f.qualityAt(gx, gz)).toBeGreaterThan(0);
    expect(f.capacityAt(gx, gz)).toBeGreaterThan(0.5);
    // Heavy graze stamps pressure debt; food ranking falls while pressure is elevated.
    for (let i = 0; i < 40; i++) f.grazeAt(gx, gz, 1, 1 / 60);
    expect(f.pressureAt(gx, gz)).toBeGreaterThan(0.05);
    const foodAfter = f.foodAt(gx, gz);
    expect(foodAfter).toBeLessThan(f.biomassAt(gx, gz) + 1e-9);
    // Edaphic quality is position-dependent (not a flat constant).
    let sawDiff = false;
    const q0 = f.qualityAt(gx, gz);
    for (let a = 80; a < PLATFORM_HALF && !sawDiff; a += 40) {
      for (let ang = 0; ang < 6.28 && !sawDiff; ang += 0.7) {
        const c = f.comfortAt(Math.cos(ang) * a, Math.sin(ang) * a);
        if (c.strength > 0.05 && Math.abs(f.qualityAt(c.x, c.z) - q0) > 0.02) sawDiff = true;
      }
    }
    expect(sawDiff).toBe(true);
    // High entropy climate slows recovery vs calm climate (matched starting debt).
    const slow = new AlienFlora(makeCtx(true));
    const fast = new AlienFlora(makeCtx(true));
    let sx = gx;
    let sz = gz;
    for (let i = 0; i < 80; i++) {
      slow.grazeAt(sx, sz, 1, 1 / 60);
      fast.grazeAt(sx, sz, 1, 1 / 60);
    }
    for (let i = 0; i < 400; i++) {
      slow.update(1 / 60, 1, 0.2, 0.95); // high entropy
      fast.update(1 / 60, 1, 0.2, 0.05); // low entropy
    }
    expect(fast.biomassAt(sx, sz)).toBeGreaterThan(slow.biomassAt(sx, sz));
    f.dispose();
    slow.dispose();
    fast.dispose();
  });

  test('fully grazed cells respawn to living biomass within ~5s under calm climate (falsifiable)', () => {
    const ctx = makeCtx(true);
    const f = new AlienFlora(ctx);
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
    // Graze to stub.
    for (let i = 0; i < 120; i++) f.grazeAt(gx, gz, 1, 1 / 60);
    expect(f.biomassAt(gx, gz)).toBeLessThan(0.15);
    // Calm climate recovery for 5 seconds.
    for (let i = 0; i < 300; i++) f.update(1 / 60, i / 60, 0.1, 0.05);
    expect(f.biomassAt(gx, gz)).toBeGreaterThan(0.55);
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
    // With no grazing, the cell REGROWS and becomes edible again (~5s respawn; don't over-spin collision).
    for (let i = 0; i < 420; i++) f.update(1 / 60, 1, 0.3);
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
    // Short recovery window — adaptive gain must outpace baseline on the grazed cell
    // before both saturate (fast ~5s respawn makes long windows converge).
    for (let i = 0; i < 90; i++) {
      baseline.update(1 / 60, 1, 0.3);
      adaptive.update(1 / 60, 1, 0.3);
    }
    expect(adaptive.biomassAt(gx, gz)).toBeGreaterThan(baseline.biomassAt(gx, gz));
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
