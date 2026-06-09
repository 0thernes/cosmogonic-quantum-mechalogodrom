import { describe, expect, test } from 'bun:test';
import { ALGOS } from '../src/sim/algorithms';
import { mulberry32 } from '../src/math/rng';

/** Legacy names, in legacy order (lines 207-227) — regression guard. */
const EXPECTED_NAMES = [
  'BUBBLE FIELD',
  'SELECTION SWEEP',
  'INSERTION PUSH',
  'MERGE IMPULSE',
  'PIVOT FIELD',
  'HEAP SIFT',
  'SHELL GAP',
  'COCKTAIL WAVE',
  'COMB SWEEP',
  'GNOME CRAWL',
  'CYCLE PHASE',
  'PANCAKE FLIP',
  'BITONIC MESH',
  'STOOGE DRIFT',
  'ODD-EVEN PULSE',
  'COUNT PHASE',
  'RADIX PHASE',
  'RUN MERGE',
  'HOLE SCATTER',
  'STRAND PULL',
] as const;

/** Deterministic seed shared by every case (contract rule 7 applies to tests too). */
const SEED = 0xc05a06;

/** Unchecked read; all test indices are bounded by construction. */
function at(values: Float32Array, idx: number): number {
  return values[idx]!;
}

/** Fills values[0..n) with seeded uniform draws scaled to [0, 100). */
function seededValues(n: number): Float32Array {
  const rng = mulberry32(SEED);
  const values = new Float32Array(n);
  for (let i = 0; i < n; i++) values[i] = rng() * 100;
  return values;
}

/** Brute-force inversion count of values[0..length). O(n^2) — fine for n=16. */
function inversions(values: Float32Array, length: number): number {
  let inv = 0;
  for (let a = 0; a < length; a++) {
    for (let b = a + 1; b < length; b++) {
      if (at(values, a) > at(values, b)) inv++;
    }
  }
  return inv;
}

describe('ALGOS', () => {
  test('exports the 20 legacy algorithms, exact names, exact order', () => {
    expect(ALGOS.map((a) => a.name)).toEqual([...EXPECTED_NAMES]);
  });

  for (const algo of ALGOS) {
    describe(algo.name, () => {
      test('returns null for degenerate lengths 0 and 1', () => {
        const values = seededValues(8);
        for (const length of [0, 1]) {
          for (let i = 0; i < 64; i++) {
            expect(algo.step(values, length, i)).toBeNull();
          }
        }
      });

      test('never returns out-of-range, fractional, or self-paired indices', () => {
        // Capacity (660) exceeds every live length, mimicking the pre-allocated
        // MAX_E buffer: reads past `length` would land on poison-but-valid data,
        // so the only observable contract is the returned index range.
        const values = seededValues(660);
        for (const length of [2, 5, 650]) {
          for (let i = 0; i < 2000; i++) {
            const swap = algo.step(values, length, i);
            if (swap === null) continue;
            const [a, b] = swap;
            expect(Number.isInteger(a)).toBe(true);
            expect(Number.isInteger(b)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThan(length);
            expect(b).toBeGreaterThanOrEqual(0);
            expect(b).toBeLessThan(length);
            expect(a).not.toBe(b);
          }
        }
      });

      test('step is a pure proposal — never mutates the buffer', () => {
        const values = seededValues(64);
        const before = Array.from(values);
        for (let i = 0; i < 500; i++) algo.step(values, 64, i);
        expect(Array.from(values)).toEqual(before);
      });

      test('applying proposed swaps reduces inversions or terminates within 50·n² steps', () => {
        const n = 16;
        const cap = 50 * n * n; // 12800
        // Longest step period is lcm of the tiny moduli involved (≤ 96 for
        // n=16), so a quiet tail this long proves the algorithm reached a
        // fixpoint: identical (i mod period, state) pairs recur swap-free.
        const quietTail = 1000;
        const values = seededValues(n);
        const inv0 = inversions(values, n);
        let minInv = inv0;
        let lastSwap = -1;
        for (let i = 0; i < cap; i++) {
          const swap = algo.step(values, n, i);
          if (swap === null) continue;
          const [a, b] = swap;
          const tmp = at(values, a);
          values[a] = at(values, b);
          values[b] = tmp;
          lastSwap = i;
          const inv = inversions(values, n);
          if (inv < minInv) minInv = inv;
        }
        const terminated = lastSwap < cap - quietTail;
        // Progress is measured over the trajectory: the cyclic-wrap fields
        // (CYCLE/COUNT/RADIX/HOLE) are perpetual by construction — their
        // comparison pairs form a cycle over all indices, which admits no
        // fixpoint for distinct values — so they never terminate, but they
        // must still strictly reduce inversions below the starting count.
        expect(minInv < inv0 || terminated).toBe(true);
      });
    });
  }
});
