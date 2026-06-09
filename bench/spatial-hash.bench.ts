/**
 * SpatialHash benchmarks — runnable standalone (`bun bench/spatial-hash.bench.ts`) or aggregated
 * via `bun bench/index.ts`.
 *
 * Uses 1000 plain `{ position: { x, z } }` records (no three.js dependency) with positions
 * seeded by mulberry32(42) across the legacy ±35 world extent (`(rng()-0.5)*70`).
 *
 * - clear+insert cycle: the per-frame grid rebuild world.ts performs (every 2nd frame).
 * - query(0, 0, 8): the behavior-system neighbor lookup hot path; with cell size 8 this scans
 *   the 3×3 cell block around the origin and returns the SHARED result buffer (Known Bug 5 fix).
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';

/** Minimal shape accepted by SpatialHash — deliberately not a THREE.Mesh. */
interface FlatItem {
  position: { x: number; z: number };
}

const rng = mulberry32(42);
const COUNT = 1000;
const items: FlatItem[] = [];
for (let n = 0; n < COUNT; n++) {
  items.push({ position: { x: (rng() - 0.5) * 70, z: (rng() - 0.5) * 70 } });
}

const rebuildGrid = new SpatialHash<FlatItem>();
const queryGrid = new SpatialHash<FlatItem>();
for (const item of items) {
  queryGrid.insert(item);
}

group('spatial-hash: 1000 items, cell size 8', () => {
  bench('clear() + insert() ×1000 (frame rebuild cycle)', () => {
    rebuildGrid.clear();
    for (let n = 0; n < COUNT; n++) {
      // n < COUNT === items.length — always in range.
      rebuildGrid.insert(items[n]!);
    }
  });

  bench('query(0, 0, 8) (shared-buffer neighbor lookup)', () => {
    do_not_optimize(queryGrid.query(0, 0, 8));
  });
});

if (import.meta.main) {
  await run();
}
