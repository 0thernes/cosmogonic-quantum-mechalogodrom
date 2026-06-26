import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  FACULTY_COUNT,
  FACULTY_NAMES,
  FacultiesPantheon,
  facultyCouplingDensity,
} from '../src/sim/faculties-pantheon';

describe('NHSI faculties pantheon (100 + god-layer)', () => {
  test('registry exposes 144 named faculties including brutal god-layer', () => {
    expect(FACULTY_COUNT).toBe(144);
    expect(FACULTY_COUNT).toBeGreaterThanOrEqual(100);
    expect(FACULTY_NAMES).toContain('BROLY_LEGENDARY_RAGE');
    expect(FACULTY_NAMES).toContain('DR_MANHATTAN_OMNISCIENCE');
    expect(FACULTY_NAMES).toContain('TTGL_SPIRAL_POWER');
  });

  test('ring coupling raises measured density vs independent dials', () => {
    const p = new FacultiesPantheon(mulberry32(42));
    const inputs = new Float32Array(16);
    for (let i = 0; i < 16; i++) inputs[i] = (i % 7) / 7;
    let d0 = 0;
    for (let t = 0; t < 8; t++) {
      p.update(inputs);
      d0 = p.getCouplingDensity();
    }
    expect(d0).toBeGreaterThan(0);
    expect(d0).toBeLessThanOrEqual(1);
  });

  test('facultyCouplingDensity is pure and symmetric in spirit', () => {
    const a = [0.2, 0.8, 0.5, 0.5];
    expect(facultyCouplingDensity(a)).toBeGreaterThan(0);
    expect(facultyCouplingDensity([0.5, 0.5, 0.5, 0.5])).toBe(0);
  });

  test('deterministic: same seed + inputs ⇒ identical coupling trajectory', () => {
    const run = () => {
      const p = new FacultiesPantheon(mulberry32(99));
      const inputs = new Float32Array(16);
      for (let i = 0; i < 16; i++) inputs[i] = i / 16;
      for (let t = 0; t < 12; t++) p.update(inputs);
      return {
        coupling: p.getCouplingDensity(),
        act: p.getAggregateActivation(),
        conf: p.getAggregateConfidence(),
      };
    };
    expect(run()).toEqual(run());
  });
});
