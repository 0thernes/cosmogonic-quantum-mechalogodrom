/**
 * The 20 sorting-field algorithms — port of legacy `ALGOS` (lines 206-228),
 * behaviorally honest names preserved verbatim.
 *
 * Each `step` is a pure single-step swap PROPOSAL over the live prefix
 * `values[0..length)` of a pre-allocated Float32Array (Known Bug 4 fix: the
 * legacy code copied entity sort values into a fresh `{length}` object every
 * frame; the new signature reads the shared buffer + live length directly and
 * never touches indices ≥ `length`). Steps never mutate `values` — the caller
 * applies the returned swap to entities and buffer alike.
 *
 * Hot path: every step is O(length) worst case and allocation-free except for
 * the returned `[a, b]` tuple, which the contract explicitly permits and
 * callers treat as transient.
 */
import type { SortAlgo } from '../types';

/**
 * Unchecked typed-array read. O(1).
 * Invariant: every call site bounds `idx` to [0, length) via modulo / min
 * arithmetic, and `length` ≤ `values.length` by the caller's contract.
 */
function at(values: Float32Array, idx: number): number {
  return values[idx]!;
}

/** The 20 sorting-field algorithms in legacy order. Indexed by `SimState.algoIdx`. */
export const ALGOS: readonly SortAlgo[] = [
  {
    name: 'BUBBLE FIELD',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % (length - 1);
      return at(values, j) > at(values, j + 1) ? [j, j + 1] : null;
    },
  },
  {
    name: 'SELECTION SWEEP',
    step(values, length, i) {
      if (length < 2) return null;
      const s = i % length;
      let m = s;
      for (let k = s + 1; k < length; k++) {
        if (at(values, k) < at(values, m)) m = k;
      }
      return m !== s ? [s, m] : null;
    },
  },
  {
    name: 'INSERTION PUSH',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      return j > 0 && at(values, j) < at(values, j - 1) ? [j - 1, j] : null;
    },
  },
  {
    name: 'MERGE IMPULSE',
    step(values, length, i) {
      if (length < 2) return null;
      const s = 2 << (i % 4);
      const st = (i * s) % length;
      const m = Math.min(st + Math.floor(s / 2), length);
      return m > 0 && m < length && at(values, m) < at(values, m - 1) ? [m - 1, m] : null;
    },
  },
  {
    name: 'PIVOT FIELD',
    step(values, length, i) {
      if (length < 2) return null;
      const p = at(values, length - 1);
      const j = i % length;
      return j < length - 1 && at(values, j) > p ? [j, length - 1] : null;
    },
  },
  {
    name: 'HEAP SIFT',
    step(values, length, i) {
      if (length < 2) return null;
      const n = length;
      const h = Math.max(1, (n / 2) | 0);
      const j = i % h;
      const l = 2 * j + 1;
      const r = 2 * j + 2;
      let g = j;
      if (l < n && at(values, l) > at(values, g)) g = l;
      if (r < n && at(values, r) > at(values, g)) g = r;
      return g !== j ? [j, g] : null;
    },
  },
  {
    name: 'SHELL GAP',
    step(values, length, i) {
      if (length < 2) return null;
      // Legacy `[5,3,1][i%3]` without the per-call array literal (hot path).
      const m3 = i % 3;
      const g = m3 === 0 ? 5 : m3 === 1 ? 3 : 1;
      const j = (i * g) % length;
      return j + g < length && at(values, j) > at(values, j + g) ? [j, j + g] : null;
    },
  },
  {
    name: 'COCKTAIL WAVE',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % (length - 1);
      const d = Math.floor(i / length) % 2;
      const k = d ? length - 2 - j : j;
      return k >= 0 && k < length - 1 && at(values, k) > at(values, k + 1) ? [k, k + 1] : null;
    },
  },
  {
    name: 'COMB SWEEP',
    step(values, length, i) {
      if (length < 2) return null;
      let g = Math.floor(length / 1.3);
      for (let k = 0; k < i % 3; k++) g = Math.max(1, Math.floor(g / 1.3));
      const j = (i * g) % length;
      return j + g < length && at(values, j) > at(values, j + g) ? [j, j + g] : null;
    },
  },
  {
    name: 'GNOME CRAWL',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      return j > 0 && at(values, j) < at(values, j - 1) ? [j - 1, j] : null;
    },
  },
  {
    name: 'CYCLE PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const c = i % length;
      let p = 0;
      for (let k = c + 1; k < length; k++) {
        if (at(values, k) < at(values, c)) p++;
      }
      return p > 0 && c !== p % length ? [c, p % length] : null;
    },
  },
  {
    name: 'PANCAKE FLIP',
    step(values, length, i) {
      if (length < 2) return null;
      const n = Math.max(2, length - (i % length));
      let m = 0;
      for (let k = 1; k < n; k++) {
        if (at(values, k) > at(values, m)) m = k;
      }
      return m !== n - 1 ? [m, n - 1] : null;
    },
  },
  {
    name: 'BITONIC MESH',
    step(values, length, i) {
      if (length < 2) return null;
      const k = 2 << (i % 4);
      const j = (i * 2) % length;
      const p = j ^ (k >> 1);
      return p > 0 && p < length && j < p && at(values, j) > at(values, p) ? [j, p] : null;
    },
  },
  {
    name: 'STOOGE DRIFT',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const e = Math.min(j + 2, length - 1);
      return at(values, j) > at(values, e) ? [j, e] : null;
    },
  },
  {
    name: 'ODD-EVEN PULSE',
    step(values, length, i) {
      if (length < 2) return null;
      const p = i % 2;
      for (let j = p; j < length - 1; j += 2) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    name: 'COUNT PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const t = (i + 1) % length;
      return j !== t && at(values, j) > at(values, t) ? [j, t] : null;
    },
  },
  {
    name: 'RADIX PHASE',
    step(values, length, i) {
      if (length < 2) return null;
      const d = Math.pow(10, i % 3);
      const j = i % length;
      const k = (j + 1) % length;
      return Math.floor(at(values, j) / d) % 10 > Math.floor(at(values, k) / d) % 10
        ? [j, k]
        : null;
    },
  },
  {
    name: 'RUN MERGE',
    step(values, length, i) {
      if (length < 2) return null;
      const rs = 4;
      const s = (i * rs) % length;
      for (let j = s; j < Math.min(s + rs - 1, length - 1); j++) {
        if (at(values, j) > at(values, j + 1)) return [j, j + 1];
      }
      return null;
    },
  },
  {
    name: 'HOLE SCATTER',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      const k = (j + 3) % length;
      return at(values, j) > at(values, k) ? [j, k] : null;
    },
  },
  {
    name: 'STRAND PULL',
    step(values, length, i) {
      if (length < 2) return null;
      const j = i % length;
      if (j > 0 && at(values, j) < at(values, j - 1)) return [j - 1, j];
      return j < length - 1 && at(values, j) > at(values, j + 1) ? [j, j + 1] : null;
    },
  },
];
