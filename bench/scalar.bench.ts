/**
 * Scalar math microbenchmarks — runnable standalone (`bun bench/scalar.bench.ts`) or aggregated
 * via `bun bench/index.ts`.
 *
 * Operand pools are seeded once with mulberry32(42) and cycled through a power-of-two ring so
 * every call sees varied yet deterministic inputs (defeats constant folding without per-call
 * allocation). Ranges mirror the legacy spawn volume (`(rng()-0.5)*70`, `rng()*30-8`).
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { clamp, dist2, dist2XZ, lerp } from '../src/math/scalar';

const rng = mulberry32(42);
const N = 1024; // power of two — indices wrap with a mask
const MASK = N - 1;

const ax = new Float64Array(N);
const ay = new Float64Array(N);
const az = new Float64Array(N);
const bx = new Float64Array(N);
const by = new Float64Array(N);
const bz = new Float64Array(N);
const ts = new Float64Array(N);
for (let n = 0; n < N; n++) {
  ax[n] = (rng() - 0.5) * 70;
  ay[n] = rng() * 30 - 8;
  az[n] = (rng() - 0.5) * 70;
  bx[n] = (rng() - 0.5) * 70;
  by[n] = rng() * 30 - 8;
  bz[n] = (rng() - 0.5) * 70;
  ts[n] = rng();
}

group('scalar: lerp / clamp / dist2 / dist2XZ', () => {
  let kL = 0;
  bench('lerp(a, b, t)', () => {
    // kL is masked into [0, N) — every index below is in range.
    do_not_optimize(lerp(ax[kL]!, bx[kL]!, ts[kL]!));
    kL = (kL + 1) & MASK;
  });

  let kC = 0;
  bench('clamp(v, -10, 10)', () => {
    // kC is masked into [0, N) — index below is in range.
    do_not_optimize(clamp(ax[kC]!, -10, 10));
    kC = (kC + 1) & MASK;
  });

  let kD = 0;
  bench('dist2(ax, ay, az, bx, by, bz)', () => {
    // kD is masked into [0, N) — every index below is in range.
    do_not_optimize(dist2(ax[kD]!, ay[kD]!, az[kD]!, bx[kD]!, by[kD]!, bz[kD]!));
    kD = (kD + 1) & MASK;
  });

  let kX = 0;
  bench('dist2XZ(ax, az, bx, bz)', () => {
    // kX is masked into [0, N) — every index below is in range.
    do_not_optimize(dist2XZ(ax[kX]!, az[kX]!, bx[kX]!, bz[kX]!));
    kX = (kX + 1) & MASK;
  });
});

if (import.meta.main) {
  await run();
}
