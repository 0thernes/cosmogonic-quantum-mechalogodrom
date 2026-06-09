/**
 * RNG microbenchmarks — runnable standalone (`bun bench/rng.bench.ts`) or aggregated via
 * `bun bench/index.ts`.
 *
 * Compares the contract-mandated deterministic mulberry32 PRNG (contract rule 7) against the
 * native unseeded `Math.random` baseline. `Math.random` is BANNED in sim logic — it appears
 * here solely as the performance reference point the contract asks for.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { hashSeed, mulberry32 } from '../src/math/rng';

const rng = mulberry32(42);

group('rng: mulberry32 vs native unseeded baseline', () => {
  bench('Math.random() [baseline — banned in sim logic]', () => {
    do_not_optimize(Math.random());
  }).baseline(true);

  bench('mulberry32(42)()', () => {
    do_not_optimize(rng());
  });

  bench("hashSeed('cosmogonic-quantum-mechalogodrom')", () => {
    do_not_optimize(hashSeed('cosmogonic-quantum-mechalogodrom'));
  });
});

if (import.meta.main) {
  await run();
}
