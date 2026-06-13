/**
 * Heap / top-K benchmarks — runnable standalone (`bun bench/heap.bench.ts`) or aggregated via
 * `bun bench/index.ts`.
 *
 * Models the graph-mind `updateRank()` hot path: pull the top RANK_TOP (20) PageRank scores out of
 * up to V = 10,000 nodes. Compares the bounded min-heap `selectTopK` (O(V log K)) against the
 * previous approach — a full `Array.sort` over all V keys then a slice (O(V log V)). Inputs are
 * seeded by mulberry32(42) so every run sorts the identical vector.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { selectTopK } from '../src/math/heap';

const rng = mulberry32(42);
const V = 10000;
const K = 20;

/** String keys (as `Object.keys(pagerank)` yields) with a parallel rank lookup. */
const keys: string[] = [];
const ranks: Record<string, number> = {};
for (let i = 0; i < V; i++) {
  const key = String(i);
  keys.push(key);
  ranks[key] = rng();
}

const isBetter = (a: string, b: string): boolean => {
  const ra = ranks[a] ?? 0;
  const rb = ranks[b] ?? 0;
  return ra !== rb ? ra > rb : Number(a) < Number(b);
};

group(`top-${K} of V=${V}`, () => {
  bench('selectTopK — bounded min-heap O(V log K)', () => {
    do_not_optimize(selectTopK(keys, K, isBetter));
  });

  bench('full Array.sort + slice O(V log V) (previous)', () => {
    const copy = keys.slice();
    copy.sort((a, b) => (ranks[b] ?? 0) - (ranks[a] ?? 0));
    do_not_optimize(copy.slice(0, K));
  });
});

if (import.meta.main) {
  await run();
}
