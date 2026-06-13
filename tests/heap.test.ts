import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { BinaryHeap, selectTopK, type Less } from '../src/math/heap';

/** Min-heap comparator over numbers (root = smallest). */
const numLess: Less<number> = (a, b) => a < b;

/** Drain a heap via repeated pop(), collecting roots in extraction order. */
function drain<T>(heap: BinaryHeap<T>): T[] {
  const out: T[] = [];
  for (let v = heap.pop(); v !== undefined; v = heap.pop()) out.push(v);
  return out;
}

/** Seeded random integer array in [0, range). */
function randomInts(n: number, seed: number, range: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((rng() * range) | 0);
  return out;
}

describe('BinaryHeap basic invariants', () => {
  test('empty heap reports empty and yields undefined', () => {
    const h = new BinaryHeap<number>(numLess);
    expect(h.size).toBe(0);
    expect(h.isEmpty()).toBe(true);
    expect(h.peek()).toBeUndefined();
    expect(h.pop()).toBeUndefined();
  });

  test('push/pop drains in ascending order (min-heap heapsort)', () => {
    const h = new BinaryHeap<number>(numLess);
    const input = [5, 1, 9, 3, 3, 7, 0, 8, 2, 6, 4];
    for (const v of input) h.push(v);
    expect(h.size).toBe(input.length);
    expect(drain(h)).toEqual([...input].sort((a, b) => a - b));
    expect(h.isEmpty()).toBe(true);
  });

  test('peek is always the current minimum', () => {
    const h = new BinaryHeap<number>(numLess);
    const seen: number[] = [];
    for (const v of [4, 2, 7, 1, 9, 0, 5]) {
      h.push(v);
      seen.push(v);
      expect(h.peek()).toBe(Math.min(...seen));
    }
  });

  test('clear empties but keeps the heap usable', () => {
    const h = new BinaryHeap<number>(numLess);
    for (const v of [3, 1, 2]) h.push(v);
    h.clear();
    expect(h.size).toBe(0);
    expect(h.peek()).toBeUndefined();
    h.push(42);
    expect(h.peek()).toBe(42);
  });

  test('replaceRoot on empty heap inserts and returns undefined', () => {
    const h = new BinaryHeap<number>(numLess);
    expect(h.replaceRoot(7)).toBeUndefined();
    expect(h.size).toBe(1);
    expect(h.peek()).toBe(7);
  });

  test('replaceRoot swaps the root and re-heapifies in one step', () => {
    const h = new BinaryHeap<number>(numLess);
    for (const v of [1, 2, 3, 4, 5]) h.push(v);
    expect(h.replaceRoot(10)).toBe(1); // old min returned
    expect(h.peek()).toBe(2); // new min after re-sift
    expect(drain(h).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 10]);
  });

  test('max-heap via inverted comparator drains descending', () => {
    const h = new BinaryHeap<number>((a, b) => a > b);
    for (const v of [5, 1, 9, 3, 7]) h.push(v);
    expect(drain(h)).toEqual([9, 7, 5, 3, 1]);
  });
});

describe('BinaryHeap property: heapsort equals Array.sort', () => {
  test('1000 random arrays drain in sorted order', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const n = 1 + ((seed * 7) % 50);
      const input = randomInts(n, seed + 1, 100);
      const h = new BinaryHeap<number>(numLess);
      for (const v of input) h.push(v);
      expect(drain(h)).toEqual([...input].sort((a, b) => a - b));
    }
  });
});

/**
 * Reference top-K: the first `k` of a stable descending sort. Mirrors the graph-mind contract —
 * rank DESC, ties broken by ascending index — which is what `selectTopK` must reproduce.
 */
interface Ranked {
  index: number;
  rank: number;
}
const rankBetter: Less<Ranked> = (a, b) =>
  a.rank !== b.rank ? a.rank > b.rank : a.index < b.index;

function referenceTopK(items: readonly Ranked[], k: number): Ranked[] {
  return [...items]
    .sort((a, b) => (a.rank !== b.rank ? b.rank - a.rank : a.index - b.index))
    .slice(0, Math.max(0, k));
}

function keySet(items: readonly Ranked[]): Set<number> {
  return new Set(items.map((it) => it.index));
}

describe('selectTopK vs reference stable sort', () => {
  test('matches the top-k SET across 2000 random rank vectors (ties included)', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const n = 1 + ((seed * 13) % 60);
      const rng = mulberry32(seed + 1);
      // Small rank range forces frequent exact ties → exercises the index tie-break.
      const items: Ranked[] = [];
      for (let i = 0; i < n; i++) items.push({ index: i, rank: (rng() * 5) | 0 });
      for (const k of [0, 1, 3, 20, n, n + 5]) {
        const got = selectTopK(items, k, rankBetter);
        expect(got.length).toBe(Math.max(0, Math.min(k, n)));
        expect(keySet(got)).toEqual(keySet(referenceTopK(items, k)));
      }
    }
  });

  test('result sorted by the same order equals the reference exactly (order parity)', () => {
    const rng = mulberry32(424242);
    const items: Ranked[] = [];
    for (let i = 0; i < 500; i++) items.push({ index: i, rank: (rng() * 50) | 0 });
    const k = 20;
    const got = selectTopK(items, k, rankBetter).sort((a, b) =>
      a.rank !== b.rank ? b.rank - a.rank : a.index - b.index,
    );
    expect(got).toEqual(referenceTopK(items, k));
  });

  test('degenerate k and empty input', () => {
    const items: Ranked[] = [
      { index: 0, rank: 3 },
      { index: 1, rank: 1 },
      { index: 2, rank: 2 },
    ];
    expect(selectTopK(items, 0, rankBetter)).toEqual([]);
    expect(selectTopK(items, -5, rankBetter)).toEqual([]);
    expect(selectTopK([], 5, rankBetter)).toEqual([]);
    expect(keySet(selectTopK(items, 99, rankBetter))).toEqual(new Set([0, 1, 2]));
  });

  test('does not mutate the input array', () => {
    const items: Ranked[] = [
      { index: 0, rank: 1 },
      { index: 1, rank: 9 },
      { index: 2, rank: 4 },
    ];
    const snapshot = items.map((it) => it.index);
    selectTopK(items, 2, rankBetter);
    expect(items.map((it) => it.index)).toEqual(snapshot);
  });

  test('deterministic: identical inputs yield identical result SETs', () => {
    const rng = mulberry32(7);
    const items: Ranked[] = [];
    for (let i = 0; i < 200; i++) items.push({ index: i, rank: (rng() * 10) | 0 });
    const a = selectTopK(items, 17, rankBetter);
    const b = selectTopK(items, 17, rankBetter);
    expect(keySet(a)).toEqual(keySet(b));
  });

  test('all-equal ranks fall back to the lowest indices (pure tie-break)', () => {
    const items: Ranked[] = [];
    for (let i = 0; i < 30; i++) items.push({ index: i, rank: 1 });
    const got = keySet(selectTopK(items, 5, rankBetter));
    expect(got).toEqual(new Set([0, 1, 2, 3, 4]));
  });
});
