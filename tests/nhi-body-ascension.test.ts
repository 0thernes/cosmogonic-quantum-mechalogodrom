/**
 * NHI-body ascension lane (PHILOSOPHY "Real math or no math").
 *
 * `nhiAscension` maps a launched being's REAL height (world Y) to a [0,1] signal that drives the
 * V-NHI-EXPANDED hyperspace-dimensionality lattice — a being flying high shimmers with tesseract light.
 * Falsifiable claims (property-based, robust to the NHI_ASCEND_SPAN constant):
 * - ground → 0, top of the column → 1, mid → 0.5; clamps beyond; monotonic non-decreasing;
 * - finite + within [0,1]; non-finite/negative → 0.
 */
import { describe, expect, test } from 'bun:test';
import { NHI_ASCENSION_LEVELS, nhiAscension } from '../src/sim/nhi-body';

describe('nhiAscension (pure)', () => {
  test('ground → 0, top → 1, mid → 0.5; clamps beyond the column', () => {
    expect(nhiAscension(NHI_ASCENSION_LEVELS.floor)).toBe(0);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.ceiling)).toBeCloseTo(1, 6);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.middle)).toBeCloseTo(0.5, 6);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.ceiling + 1000)).toBe(1); // clamp above
    expect(nhiAscension(-50)).toBe(0); // below ground → clamp
  });

  test('monotonic non-decreasing; always within [0,1]', () => {
    let prev = -1;
    for (let y = -20; y <= NHI_ASCENSION_LEVELS.ceiling + 60; y += 10) {
      const v = nhiAscension(y);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });

  test('non-finite heights → 0, never NaN', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const v = nhiAscension(bad);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });
});
