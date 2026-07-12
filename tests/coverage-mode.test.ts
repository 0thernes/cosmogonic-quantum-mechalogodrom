/**
 * Coverage-mode helper — wall-clock budgets must not run under instrumented gate children.
 */
import { describe, expect, test } from 'bun:test';
import { expectWallBudgetMs, underCoverage } from './coverage-mode';

describe('coverage-mode helper', () => {
  test('underCoverage is a boolean (env-dependent; gate child sets CQM_COVERAGE)', () => {
    expect(typeof underCoverage()).toBe('boolean');
  });

  test('expectWallBudgetMs accepts a legal cold sample under current mode', () => {
    // 1ms is always under any real budget when not covering; under coverage only requires > 0.
    expect(() => expectWallBudgetMs(1, 120)).not.toThrow();
  });

  test('expectWallBudgetMs rejects non-finite or negative samples always', () => {
    expect(() => expectWallBudgetMs(Number.NaN, 120)).toThrow();
    expect(() => expectWallBudgetMs(-1, 120)).toThrow();
  });

  test('expectWallBudgetMs rejects over-budget samples when not under coverage', () => {
    if (underCoverage()) {
      // Under coverage the wall assert is a smoke check only.
      expect(() => expectWallBudgetMs(500, 120)).not.toThrow();
    } else {
      expect(() => expectWallBudgetMs(500, 120)).toThrow(/≥ budget/);
    }
  });
});
