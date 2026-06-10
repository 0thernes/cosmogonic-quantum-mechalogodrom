/**
 * QuantumRegister microbenchmarks — runnable standalone (`bun bench/quantum.bench.ts`) or
 * aggregated via `bun bench/index.ts`.
 *
 * Contract (V2): apply('h'), apply('cx'), and probabilities() at n = 5 (32 amplitudes) — the
 * register width QuantumCircuitSystem runs in the sim. entropy() rides along because update()
 * recomputes it on the same cadence. The fixture is scrambled into a non-trivial entangled
 * state by a deterministic mulberry32(42) gate program; every benched op is unitary or
 * read-only, so the state stays normalized however many iterations mitata runs.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { QuantumRegister } from '../src/math/quantum';

const reg = new QuantumRegister(5);
const rng = mulberry32(42);
for (let i = 0; i < 64; i++) {
  reg.apply('h', i % 5);
  reg.apply('rx', (i + 1) % 5, undefined, rng() * Math.PI);
  reg.apply('cx', (i + 2) % 5, (i + 3) % 5);
}

group('quantum: QuantumRegister n=5 (32 amplitudes)', () => {
  bench("apply('h', 2)", () => {
    reg.apply('h', 2);
  });

  bench("apply('cx', 0, 3)", () => {
    reg.apply('cx', 0, 3);
  });

  bench('probabilities() (reused buffer)', () => {
    do_not_optimize(reg.probabilities());
  });

  bench('entropy()', () => {
    do_not_optimize(reg.entropy());
  });
});

if (import.meta.main) {
  await run();
}
