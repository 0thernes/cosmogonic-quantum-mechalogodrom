import { describe, expect, test } from 'bun:test';
import {
  clearMathCaches,
  distanceCache,
  getCachedDistance2,
  getCachedSinCos,
  trigCache,
} from '../src/core/math-cache';

describe('MathCache', () => {
  test('trig cache returns cached sin/cos objects and invalidates on clear', () => {
    trigCache.clear();
    const result1 = getCachedSinCos(Math.PI / 4);
    const result2 = getCachedSinCos(Math.PI / 4);

    expect(result1).toEqual(result2);
    expect(result1).toBe(result2);

    clearMathCaches();
    const result3 = getCachedSinCos(Math.PI / 4);
    expect(result3).toEqual(result1);
    expect(result3).not.toBe(result1);
  });

  test('distance cache returns cached squared distances', () => {
    distanceCache.clear();
    const d1 = getCachedDistance2(1, 2, 3, 4, 5, 6);
    const d2 = getCachedDistance2(1, 2, 3, 4, 5, 6);

    expect(d1).toBe(d2);
    expect(d1).toBe(27);

    clearMathCaches();
    expect(getCachedDistance2(1, 2, 3, 4, 5, 6)).toBe(27);
  });

  test('LRU recency keeps a touched entry and evicts the oldest untouched entry', () => {
    trigCache.clear();
    const first = getCachedSinCos(0);
    const second = getCachedSinCos(1);

    for (let i = 2; i < 128; i++) {
      getCachedSinCos(i);
    }

    expect(getCachedSinCos(0)).toBe(first);
    getCachedSinCos(128);
    expect(getCachedSinCos(0)).toBe(first);

    const recomputedSecond = getCachedSinCos(1);
    expect(recomputedSecond).toEqual(second);
    expect(recomputedSecond).not.toBe(second);
  });
});
