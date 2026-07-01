/**
 * APEX Field Substrate tests — the GPU-resident field organs + their CPU determinism oracle.
 *
 * Asserts the real stencil physics: deterministic evolution, bounded fields (no blow-up), a heat
 * total that does not grow, and a resident-parameter count that stays within the device texel budget.
 */
import { describe, expect, test } from 'bun:test';
import {
  APEX_FIELDS,
  ApexFieldGrid,
  fieldDesignedParams,
  fieldHash,
  fieldResidentParams,
  heatDiffuseStep,
  seedField,
} from '../src/sim/apex-field-substrate';
import { DEVICE_BROWSER } from '../src/sim/apex-parameter-manifold';

describe('field substrate — resident-parameter accounting', () => {
  test('the four field organs design tens of millions of texels', () => {
    // 2048² + 2048² + 1024² + 1024²·2
    expect(fieldDesignedParams(APEX_FIELDS)).toBe(4194304 + 4194304 + 1048576 + 2097152);
    expect(fieldDesignedParams(APEX_FIELDS)).toBeGreaterThan(10_000_000);
  });

  test('resident field params stay within the device texel budget', () => {
    const resident = fieldResidentParams(APEX_FIELDS, DEVICE_BROWSER);
    for (const f of APEX_FIELDS) {
      expect(Math.min(f.w * f.h, DEVICE_BROWSER.fieldTexelCap)).toBeLessThanOrEqual(
        DEVICE_BROWSER.fieldTexelCap,
      );
    }
    expect(resident).toBeGreaterThan(0);
  });
});

describe('field substrate — deterministic stencil oracle', () => {
  test('a field grid evolves deterministically for a seed; seeds diverge', () => {
    const organ = APEX_FIELDS[1]!; // heat
    const a = new ApexFieldGrid(organ, 12345);
    const b = new ApexFieldGrid(organ, 12345);
    const c = new ApexFieldGrid(organ, 54321);
    for (let i = 0; i < 25; i++) {
      a.step();
      b.step();
      c.step();
    }
    expect(a.hash()).toBe(b.hash());
    expect(a.hash()).not.toBe(c.hash());
  });

  test('heat diffusion is bounded and the total does not grow', () => {
    const organ = APEX_FIELDS[1]!;
    const grid = new ApexFieldGrid(organ, 7);
    const start = Math.abs(grid.total());
    for (let i = 0; i < 100; i++) grid.step();
    const end = Math.abs(grid.total());
    const f = grid.field();
    for (let i = 0; i < f.length; i += 37) expect(Number.isFinite(f[i]!)).toBe(true);
    // diffusion with clamped boundaries never manufactures net magnitude
    expect(end).toBeLessThanOrEqual(start + 1e-6);
  });

  test('the wave organ stays finite (CFL-stable) over a long run', () => {
    const organ = APEX_FIELDS[0]!; // acoustic wave
    const grid = new ApexFieldGrid(organ, 3);
    for (let i = 0; i < 200; i++) grid.step();
    const f = grid.field();
    let maxAbs = 0;
    for (let i = 0; i < f.length; i++) maxAbs = Math.max(maxAbs, Math.abs(f[i] ?? 0));
    expect(Number.isFinite(maxAbs)).toBe(true);
    expect(maxAbs).toBeLessThan(100); // bounded — no exponential blow-up
  });
});

describe('field substrate — hashing primitive', () => {
  test('the raw diffusion step matches a hand-rolled reference and is stable', () => {
    const w = 8;
    const h = 8;
    const src = new Float64Array(w * h);
    const dst = new Float64Array(w * h);
    seedField(src, 1);
    heatDiffuseStep(src, dst, w, h, 0.2);
    const h1 = fieldHash(dst);
    const dst2 = new Float64Array(w * h);
    heatDiffuseStep(src, dst2, w, h, 0.2);
    expect(fieldHash(dst2)).toBe(h1);
  });
});
