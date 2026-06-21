/**
 * Emergence-angles instrument (the 7 canonical + empowerment/Φ/Lyapunov = 10). Pure deterministic
 * scoring, so it is fully unit-testable headlessly: clamping, breadth-vs-depth, and the aggregate.
 */
import { describe, expect, test } from 'bun:test';
import {
  ACTIVE_THRESHOLD,
  EMERGENCE_ANGLE_COUNT,
  EMERGENCE_ANGLE_LABELS,
  emergenceProfile,
  type EmergenceObservations,
} from '../src/sim/emergence-angles';

const ZERO: EmergenceObservations = {
  worldCognition: 0,
  dreaming: 0,
  ontogeny: 0,
  language: 0,
  mindField: 0,
  criticality: 0,
  selection: 0,
  empowerment: 0,
  phi: 0,
  lyapunov: 0,
};

const full = (v: number): EmergenceObservations => ({
  worldCognition: v,
  dreaming: v,
  ontogeny: v,
  language: v,
  mindField: v,
  criticality: v,
  selection: v,
  empowerment: v,
  phi: v,
  lyapunov: v,
});

describe('emergence angles (7 → 10)', () => {
  test('there are exactly 10 angles with index-aligned labels', () => {
    expect(EMERGENCE_ANGLE_COUNT).toBe(10);
    expect(EMERGENCE_ANGLE_LABELS).toHaveLength(10);
    // the three NEW first-class axes are present
    expect(EMERGENCE_ANGLE_LABELS).toContain('empowerment');
    expect(EMERGENCE_ANGLE_LABELS).toContain('integrated-information');
    expect(EMERGENCE_ANGLE_LABELS).toContain('chaos-lyapunov');
    const p = emergenceProfile(ZERO);
    expect(p.angles).toHaveLength(10);
    expect(p.labels).toHaveLength(10);
  });

  test('a dead cosmos scores zero on every axis and the aggregate', () => {
    const p = emergenceProfile(ZERO);
    expect(p.activeCount).toBe(0);
    expect(p.depth).toBe(0);
    expect(p.breadth).toBe(0);
    expect(p.index).toBe(0);
  });

  test('a fully-alive cosmos saturates depth, breadth and the index', () => {
    const p = emergenceProfile(full(1));
    expect(p.activeCount).toBe(10);
    expect(p.depth).toBeCloseTo(1, 9);
    expect(p.breadth).toBeCloseTo(1, 9);
    expect(p.index).toBeCloseTo(1, 9);
  });

  test('inputs are clamped to [0,1] (out-of-range cannot inflate the score)', () => {
    const p = emergenceProfile(full(9));
    for (const a of p.angles) expect(a).toBe(1);
    expect(p.index).toBeCloseTo(1, 9);
    const n = emergenceProfile(full(-5));
    for (const a of n.angles) expect(a).toBe(0);
    expect(n.index).toBe(0);
  });

  test('breadth and depth are distinct — one maxed axis cannot fake broad emergence', () => {
    // One axis at full, nine dead: high on that axis, but low aggregate (no breadth).
    const spike = emergenceProfile({ ...ZERO, phi: 1 });
    expect(spike.activeCount).toBe(1);
    expect(spike.depth).toBeCloseTo(0.1, 9);
    expect(spike.index).toBeCloseTo(0.5 * 0.1 + 0.5 * 0.1, 9); // 0.10
    // Many shallow axes vs one deep axis: breadth lifts the index above the lone spike.
    const broad = emergenceProfile(full(ACTIVE_THRESHOLD));
    expect(broad.activeCount).toBe(10);
    expect(broad.index).toBeGreaterThan(spike.index);
  });

  test('deterministic — identical observations yield identical profiles', () => {
    const obs = full(0.42);
    expect(emergenceProfile(obs)).toEqual(emergenceProfile(obs));
  });
});
