/**
 * Game-theory benchmarks — runnable standalone (`bun bench/games.bench.ts`) or aggregated via
 * `bun bench/index.ts`.
 *
 * Covers the two hot ops the titan economy runs every tick (`sim/titans.ts`): one iterated
 * Prisoner's-Dilemma `playRound` against a warmed pair history, and one in-place `replicatorStep`
 * over the strategy population. Both are O(1)/O(n) and allocation-free; inputs are seeded by
 * mulberry32(42).
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import {
  PRISONERS_DILEMMA,
  STRATEGIES,
  alwaysDefect,
  createHistory,
  playRound,
  pushHistory,
  replicatorStep,
  titForTat,
} from '../src/math/games';

const rng = mulberry32(42);

const history = createHistory();
for (let i = 0; i < 8; i++) pushHistory(history, rng() < 0.5 ? 0 : 1, rng() < 0.5 ? 0 : 1);

const shares = new Float64Array(STRATEGIES.length).fill(1 / STRATEGIES.length);
const fitness = new Float64Array(STRATEGIES.length);
for (let i = 0; i < fitness.length; i++) fitness[i] = rng() * 4;

group('games', () => {
  bench('playRound — iterated PD (titForTat vs alwaysDefect)', () => {
    do_not_optimize(playRound(PRISONERS_DILEMMA, titForTat, alwaysDefect, history));
  });

  // replicatorStep mutates in place; the shares drift but the per-call work stays O(n), so running
  // it repeatedly measures the real step cost without any per-iteration allocation.
  bench('replicatorStep — population dynamics (in place)', () => {
    replicatorStep(shares, fitness);
  });
});

if (import.meta.main) {
  await run();
}
