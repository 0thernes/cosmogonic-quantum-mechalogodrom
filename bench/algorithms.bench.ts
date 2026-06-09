/**
 * Sorting-field algorithm benchmarks — runnable standalone (`bun bench/algorithms.bench.ts`) or
 * aggregated via `bun bench/index.ts`.
 *
 * Every ALGOS entry steps over a single 650-length Float32Array (650 = the legacy mobile
 * maxEntities cap, the largest field a sort step sees on small devices). The field is seeded
 * once with mulberry32(42) in the legacy sortVal range (`rng()*100`) and never mutated — swaps
 * are not applied — so every sample measures pure step cost, not array setup.
 *
 * The step counter cycles deterministically through [0, LENGTH*8) so each algorithm's modular
 * phases (i % length, i % 4, gap schedules, direction flips, …) are all exercised; the reported
 * time is the mean over that cycle.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { ALGOS } from '../src/sim/algorithms';

const rng = mulberry32(42);
const LENGTH = 650;
const STEP_PERIOD = LENGTH * 8;
const values = new Float32Array(LENGTH);
for (let n = 0; n < LENGTH; n++) {
  values[n] = rng() * 100;
}

group('algorithms: single step over Float32Array(650)', () => {
  for (const algo of ALGOS) {
    let i = 0;
    bench(algo.name, () => {
      do_not_optimize(algo.step(values, LENGTH, i));
      i = (i + 1) % STEP_PERIOD;
    });
  }
});

if (import.meta.main) {
  await run();
}
