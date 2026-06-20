/**
 * Factor-graph sum-product belief propagation — verified against hand-computed exact marginals
 * (BP is exact on trees). Proves genuine probabilistic inference, not a heuristic.
 */
import { describe, expect, test } from 'bun:test';
import { beliefPropagation, beliefEntropy, type FactorGraph } from '../src/math/belief-propagation';

const nearArr = (a: Float64Array, b: number[], eps = 1e-6): boolean =>
  a.length === b.length && b.every((v, i) => Math.abs(a[i]! - v) < eps);

describe('belief propagation — single factor', () => {
  test('one unary factor ⇒ belief is the normalised potential', () => {
    const fg: FactorGraph = {
      cardinalities: [2],
      factors: [{ vars: [0], table: Float64Array.from([1, 3]) }],
    };
    const b = beliefPropagation(fg, 5);
    expect(nearArr(b[0]!, [0.25, 0.75])).toBe(true);
  });

  test('two unary factors on one var multiply', () => {
    const fg: FactorGraph = {
      cardinalities: [2],
      factors: [
        { vars: [0], table: Float64Array.from([2, 1]) },
        { vars: [0], table: Float64Array.from([1, 1]) },
      ],
    };
    const b = beliefPropagation(fg, 5);
    expect(nearArr(b[0]!, [2 / 3, 1 / 3])).toBe(true);
  });
});

describe('belief propagation — pairwise chain (exact on a tree)', () => {
  test('identity coupling propagates the prior to the neighbour', () => {
    const fg: FactorGraph = {
      cardinalities: [2, 2],
      factors: [
        { vars: [0], table: Float64Array.from([0.9, 0.1]) }, // prior on v0
        { vars: [0, 1], table: Float64Array.from([1, 0, 0, 1]) }, // v0 == v1
      ],
    };
    const b = beliefPropagation(fg, 10);
    expect(nearArr(b[0]!, [0.9, 0.1])).toBe(true);
    expect(nearArr(b[1]!, [0.9, 0.1])).toBe(true);
  });

  test('noisy coupling gives the hand-computed neighbour marginal', () => {
    // prior v0 = [0.7,0.3]; P(v1|v0) rows [0.8,0.2] and [0.2,0.8]
    // ⇒ marginal v1 = [0.7·0.8+0.3·0.2, 0.7·0.2+0.3·0.8] = [0.62, 0.38]
    const fg: FactorGraph = {
      cardinalities: [2, 2],
      factors: [
        { vars: [0], table: Float64Array.from([0.7, 0.3]) },
        { vars: [0, 1], table: Float64Array.from([0.8, 0.2, 0.2, 0.8]) },
      ],
    };
    const b = beliefPropagation(fg, 12);
    expect(nearArr(b[0]!, [0.7, 0.3])).toBe(true);
    expect(nearArr(b[1]!, [0.62, 0.38])).toBe(true);
  });
});

describe('belief propagation — entropy + determinism', () => {
  test('uniform belief ⇒ entropy 1, one-hot ⇒ 0', () => {
    expect(beliefEntropy(Float64Array.from([0.5, 0.5]))).toBeCloseTo(1, 9);
    expect(beliefEntropy(Float64Array.from([1, 0]))).toBeCloseTo(0, 9);
  });

  test('identical graphs give identical beliefs', () => {
    const fg: FactorGraph = {
      cardinalities: [3],
      factors: [{ vars: [0], table: Float64Array.from([1, 2, 3]) }],
    };
    const a = beliefPropagation(fg, 6)[0]!;
    const b = beliefPropagation(fg, 6)[0]!;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(nearArr(a, [1 / 6, 2 / 6, 3 / 6])).toBe(true);
  });
});
