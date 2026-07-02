/**
 * V122 (USER #4) — the MARKET panel's Lorenz curve is REAL distribution math, not decor.
 * lorenzDeciles: cumulative wealth share at each population decile (the curve the ticker draws).
 */
import { describe, expect, test } from 'bun:test';
import { lorenzDeciles } from '../src/sim/economy';

describe('lorenzDeciles — real Lorenz-curve data', () => {
  test('perfect equality is the diagonal; top decile holds exactly 10%', () => {
    const { deciles, topDecileShare } = lorenzDeciles([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    for (let d = 0; d < 10; d++) expect(deciles[d]).toBeCloseTo((d + 1) / 10, 10);
    expect(topDecileShare).toBeCloseTo(0.1, 10);
  });

  test('one agent owns everything: the curve hugs zero then jumps to 1', () => {
    const { deciles, topDecileShare } = lorenzDeciles([0, 0, 0, 0, 0, 0, 0, 0, 0, 100]);
    for (let d = 0; d < 9; d++) expect(deciles[d]).toBe(0);
    expect(deciles[9]).toBe(1);
    expect(topDecileShare).toBe(1);
  });

  test('monotone, ends at exactly 1, negatives clamped, empty/zero input sane', () => {
    const { deciles } = lorenzDeciles([3, -2, 9, 1, 7, 0, 4, 2, 8, 6, 5]);
    let prev = 0;
    for (const v of deciles) {
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
    expect(deciles[9]).toBe(1);
    expect(lorenzDeciles([]).deciles[9]).toBe(1);
    expect(lorenzDeciles([0, 0, 0]).deciles[4]).toBeCloseTo(0.5, 10); // all-broke ⇒ diagonal
  });
});
