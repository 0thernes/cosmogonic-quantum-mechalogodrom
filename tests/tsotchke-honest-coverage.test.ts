/**
 * Tsotchke wiring honesty — proves the public coverage metric is DE-INFLATED (per the 2026-06-21
 * honesty audit, which flagged the old metric reading ~1.0 by averaging only the already-wired
 * entries + counting org-meta). The honest fraction counts fenced repos as present-but-unwired and
 * excludes `.github` meta, so it can never read "all wired 1.0".
 */
import { describe, expect, test } from 'bun:test';
import {
  tsotchkeWiredSubstrateFraction,
  tsotchkeWiringCoverage,
} from '../src/sim/tsotchke-registry';

describe('tsotchke honest wired fraction', () => {
  test('de-inflated: < 1.0, and strictly below the mean-weight metric', () => {
    const honest = tsotchkeWiredSubstrateFraction();
    expect(honest).toBeLessThan(1);
    expect(honest).toBeGreaterThan(0.5);
    // the mean-weight metric averages only wired entries → ~1.0; honest counts fenced + excludes meta.
    expect(honest).toBeLessThan(tsotchkeWiringCoverage());
  });

  test('matches the audit figure (~18 of 21 scientific substrates wired)', () => {
    expect(tsotchkeWiredSubstrateFraction()).toBeCloseTo(18 / 21, 2);
  });
});
