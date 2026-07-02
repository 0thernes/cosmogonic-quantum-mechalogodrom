/**
 * GROWTH RAMP (V121). Falsifiable claims:
 * - the target starts AT the base (no instant jump) and reaches the ceiling band by ramp end;
 * - the climb is SLOW (USER: devices must keep up) — after 60 s it is still near the base;
 * - a reset rebases to base 1 and the same slow climb applies from the anchor;
 * - the ceiling is NEVER exceeded (breathe only dips below), and never capped short of it;
 * - pure + deterministic: same inputs ⇒ same output.
 */
import { describe, expect, test } from 'bun:test';
import { GROWTH_RAMP_SECS, growthTargetAt } from '../src/sim/growth-ramp';

describe('growthTargetAt — slow, re-anchorable population ramp', () => {
  test('starts at the base and reaches the ceiling band by ramp end', () => {
    expect(growthTargetAt(0, 500, 5000)).toBe(500);
    const grown = growthTargetAt(GROWTH_RAMP_SECS + 1, 500, 5000);
    expect(grown).toBeGreaterThan(5000 * 0.9); // breathe dips at most ~8%
    expect(grown).toBeLessThanOrEqual(5000);
  });

  test('the climb is gentle: after 60 s the target is still a small fraction of the ceiling', () => {
    const at60 = growthTargetAt(60, 1, 5000);
    // smoothstep(60/630) ≈ 0.026 → ~130 of 5000. Anything past 10% would mean the ramp regressed.
    expect(at60).toBeLessThan(5000 * 0.1);
    expect(at60).toBeGreaterThan(1); // but it IS growing — never capped/gated
  });

  test('reset semantics: base 1 regrows from ONE progenitor, monotone until the breathe', () => {
    expect(growthTargetAt(0, 1, 5000)).toBe(1);
    let prev = 0;
    for (let s = 0; s <= GROWTH_RAMP_SECS / 2; s += 10) {
      const v = growthTargetAt(s, 1, 5000);
      expect(v).toBeGreaterThanOrEqual(prev); // early ramp is monotone (breathe amp scales with ease)
      prev = v;
    }
  });

  test('never exceeds the ceiling at any time (ceiling untouched, only the climb is slow)', () => {
    for (let s = 0; s < GROWTH_RAMP_SECS * 3; s += 7) {
      expect(growthTargetAt(s, 500, 5000)).toBeLessThanOrEqual(5000);
    }
  });

  test('guards: negative elapsed → base; base above ceiling clamps to ceiling', () => {
    expect(growthTargetAt(-5, 500, 5000)).toBe(500);
    expect(growthTargetAt(0, 9000, 5000)).toBe(5000);
  });
});
