/**
 * APEX Field Organs tests — the live multi-physics sensorium + the grid excite/variance primitives.
 *
 * Asserts real physics: excitation raises the field, the sensorium is deterministic and bounded, and
 * driving the organs genuinely increases their energy (the embodiment loop is load-bearing, not decor).
 */
import { describe, expect, test } from 'bun:test';
import { APEX_FIELDS, ApexFieldGrid } from '../src/sim/apex-field-substrate';
import { ApexFieldOrgans } from '../src/sim/apex-field-organs';

describe('field grid — excite + variance primitives', () => {
  test('excite raises the field total; variance is finite and non-negative', () => {
    const grid = new ApexFieldGrid(APEX_FIELDS[1]!, 5); // heat (diffusion)
    const before = grid.total();
    grid.excite(3);
    expect(grid.total()).toBeGreaterThan(before);
    expect(grid.variance()).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(grid.variance())).toBe(true);
  });
});

describe('field organs — deterministic multi-physics sensorium', () => {
  test('same seed ⇒ identical sensorium; different seed ⇒ different', () => {
    const a = new ApexFieldOrgans(1234);
    const b = new ApexFieldOrgans(1234);
    const c = new ApexFieldOrgans(4321);
    for (let i = 0; i < 20; i++) {
      const d = 0.4 + 0.3 * Math.sin(i);
      a.step(d);
      b.step(d);
      c.step(d);
    }
    expect(a.sense()).toEqual(b.sense());
    expect(a.sense()).not.toEqual(c.sense());
  });

  test('every sensorium channel is finite and in [0, 1]', () => {
    const organs = new ApexFieldOrgans(77);
    for (let i = 0; i < 30; i++) organs.step(0.6);
    const s = organs.sense();
    for (const v of Object.values(s)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('field organs — the drive is load-bearing (embodiment loop)', () => {
  test('driving the organs raises acoustic energy above the undriven baseline', () => {
    const driven = new ApexFieldOrgans(9);
    const idle = new ApexFieldOrgans(9);
    for (let i = 0; i < 40; i++) {
      driven.step(0.9);
      idle.step(0);
    }
    expect(driven.sense().acousticEnergy).toBeGreaterThan(idle.sense().acousticEnergy);
  });

  test('sustained drive sustains richer structure than an idle organ (which smooths out)', () => {
    const driven = new ApexFieldOrgans(3);
    const idle = new ApexFieldOrgans(3);
    for (let i = 0; i < 40; i++) {
      driven.step(0.8);
      idle.step(0);
    }
    // the idle organ's initial noise diffuses/smooths away; the driven one keeps injecting structure
    expect(driven.sense().richness).toBeGreaterThan(idle.sense().richness);
  });
});
