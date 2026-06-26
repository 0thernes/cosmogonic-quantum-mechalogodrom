/**
 * Minimal P1 scaffolding: quantum-classical contrast bench (per 2026-06-26 plan).
 *
 * Exercises the real shipped `rngContrast` (classical LCG + Eshkol quantum path) on a tiny task.
 * Asserts it executes without throwing and produces bounded [0,1] contrast.
 * Runnable: `bun bench/quantum-classical.bench.ts` (or via bench index if wired).
 *
 * This is harness scaffolding only — no new production sim behavior, no full OEE, no perf target.
 * Determinism: seeded. Uses only existing modules.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { rngContrast, classicalShannonEntropy } from '../src/sim/classical-contrast';
import { mulberry32 } from '../src/math/rng';

if (import.meta.main) {
  // tiny sanity run (capturable by test harness or manual)
  const c = rngContrast(42, 64);
  if (typeof c.contrast !== 'number' || c.contrast < 0 || c.contrast > 1) {
    throw new Error('quantum-classical contrast out of bounds');
  }
  const e = classicalShannonEntropy(123, 32);
  if (typeof e !== 'number' || e < 0 || e > 1) {
    throw new Error('classical entropy out of bounds');
  }
  console.log(
    'quantum-classical scaffold OK: contrast=',
    c.contrast.toFixed(4),
    'entropy=',
    e.toFixed(4),
  );
}

group('quantum-classical contrast (P1 scaffold)', () => {
  bench('rngContrast(seed,64) — classical LCG vs Eshkol QRNG', () => {
    const c = rngContrast(0xdeadbeef, 64);
    do_not_optimize(c.contrast);
  });

  bench('classicalShannonEntropy + mulberry32 baseline (tiny)', () => {
    const s = classicalShannonEntropy(42, 32);
    const r = mulberry32(99)();
    do_not_optimize(s + r);
  });
});

if (import.meta.main) {
  await run();
}
