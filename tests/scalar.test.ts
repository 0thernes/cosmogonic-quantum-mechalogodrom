import { describe, expect, test } from 'bun:test';
import {
  SENTIENCE_TIERS,
  TAU,
  clamp,
  dist2,
  dist2XZ,
  lerp,
  sentienceTier,
} from '../src/math/scalar';

describe('TAU', () => {
  test('is a full turn in radians', () => {
    expect(TAU).toBe(Math.PI * 2);
    expect(Math.cos(TAU)).toBeCloseTo(1, 12);
    expect(Math.sin(TAU)).toBeCloseTo(0, 12);
  });
});

describe('lerp', () => {
  test('returns endpoints at t=0 and t=1', () => {
    expect(lerp(3, 9, 0)).toBe(3);
    expect(lerp(3, 9, 1)).toBe(9);
  });

  test('interpolates linearly between endpoints', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(-4, 4, 0.25)).toBe(-2);
  });

  test('is unclamped (extrapolates), matching the legacy helper', () => {
    expect(lerp(0, 10, 1.5)).toBe(15);
    expect(lerp(0, 10, -0.5)).toBe(-5);
  });

  test('handles a === b', () => {
    expect(lerp(7, 7, 0.3)).toBe(7);
  });
});

describe('clamp', () => {
  test('passes through in-range values', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  test('clamps below lo and above hi', () => {
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(42, 0, 1)).toBe(1);
  });

  test('is exact at the bounds', () => {
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });

  test('works with negative ranges', () => {
    expect(clamp(-10, -5, -1)).toBe(-5);
    expect(clamp(0, -5, -1)).toBe(-1);
    expect(clamp(-3, -5, -1)).toBe(-3);
  });
});

describe('dist2', () => {
  test('matches the squared euclidean distance', () => {
    expect(dist2(0, 0, 0, 1, 2, 2)).toBe(9);
    expect(dist2(1, 1, 1, 1, 1, 1)).toBe(0);
  });

  test('is symmetric in its endpoints', () => {
    expect(dist2(-2, 5, 0.5, 3, -1, 7)).toBe(dist2(3, -1, 7, -2, 5, 0.5));
  });

  test('is non-negative', () => {
    expect(dist2(-3, -4, -5, 3, 4, 5)).toBeGreaterThanOrEqual(0);
  });
});

describe('sentienceTier (F-SENTIENCE-VAR)', () => {
  test('maps the 0..1 index to ascending named tiers, ends inclusive', () => {
    expect(sentienceTier(0)).toBe('DORMANT');
    expect(sentienceTier(1)).toBe('TRANSCENDENT');
    expect(sentienceTier(0.5)).toBe('AWARE'); // middle band (index 2 of 5)
  });

  test('clamps out-of-range inputs and never returns undefined', () => {
    expect(sentienceTier(-5)).toBe('DORMANT');
    expect(sentienceTier(99)).toBe('TRANSCENDENT');
    for (let v = 0; v <= 1.0001; v += 0.05) {
      expect(SENTIENCE_TIERS).toContain(sentienceTier(v));
    }
  });

  test('is monotonic non-decreasing across the range (higher index ⇒ same-or-higher tier)', () => {
    let last = -1;
    for (let v = 0; v <= 1; v += 0.01) {
      const idx = SENTIENCE_TIERS.indexOf(sentienceTier(v));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });
});

describe('dist2XZ', () => {
  test('matches the squared planar distance', () => {
    expect(dist2XZ(0, 0, 3, 4)).toBe(25);
    expect(dist2XZ(-1, -1, -1, -1)).toBe(0);
  });

  test('agrees with dist2 when y components are equal', () => {
    expect(dist2XZ(2, -7, -3, 4)).toBe(dist2(2, 99, -7, -3, 99, 4));
  });

  test('is symmetric in its endpoints', () => {
    expect(dist2XZ(1.5, -2, 8, 0.25)).toBe(dist2XZ(8, 0.25, 1.5, -2));
  });
});
