import { describe, expect, test } from 'bun:test';
import { INSTINCT_GOALS, instinctSatisfactionFor } from '../src/sim/super-mind';
import { atom, compound, instinctSatisfaction, type Term } from '../src/math/unification';

describe('cached instinct satisfaction', () => {
  test('equals the per-beat unification for all 16 KB states, on first and repeated lookups', () => {
    const seen = new Set<number>();
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 15; k >= 0; k--) {
        const [e, r, d, s] = [(k & 1) !== 0, (k & 2) !== 0, (k & 4) !== 0, (k & 8) !== 0];
        const kb: Term[] = [
          compound('drive', atom('explore'), atom(e ? 'high' : 'low')),
          compound('drive', atom('rest'), atom(r ? 'high' : 'low')),
          compound('drive', atom('dominate'), atom(d ? 'high' : 'low')),
          compound('state', atom('surprise'), atom(s ? 'high' : 'low')),
        ];
        const want = instinctSatisfaction(INSTINCT_GOALS, kb);
        expect(Object.is(instinctSatisfactionFor(e, r, d, s), want)).toBe(true);
        seen.add(want);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
