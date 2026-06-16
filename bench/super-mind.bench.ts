/**
 * SuperMind microbenchmarks — runnable standalone (`bun bench/super-mind.bench.ts`) or aggregated via
 * `bun bench/index.ts`. Measures the apex creature's two distinct cadences as the 1.1 faculty stack has
 * grown past twenty per-beat sub-systems — the "Functional Operations / Operational Function" budget:
 *
 *   • `think()`     — ONE full cognitive beat: the 5-stage / 5-depth / 25-variant Tree of Thought, the 30
 *                     organ-nets, the 6-qubit `evolve()` + the per-beat quantum-natural-gradient + Grover
 *                     amplification, the spin-glass settle, active inference, ToM, neuromodulation, the
 *                     successor-representation look-ahead, empowerment, holographic recall — everything that
 *                     runs every simulation frame for the lone apex creature.
 *   • `snapshot()`  — the UI-cadence telemetry read: the full Quantum Geometric Tensor (QGTL), the quantum
 *                     "magic" (4ⁿ Pauli strings), integrated information + coherence — the heavier readouts
 *                     that run only when the BRAIN observatory is open, NEVER per simulation beat.
 *
 * The fixture is seeded (`mulberry32(42)`) and warmed so the EMAs / reservoir / belief states settle to a
 * representative steady state; every benched call is deterministic and allocation-disciplined in `think()`.
 */
import { bench, do_not_optimize, group, run } from 'mitata';
import { mulberry32 } from '../src/math/rng';
import { SuperMind } from '../src/sim/super-mind';
import type { SuperPercept } from '../src/sim/super-creature';

const mind = new SuperMind(mulberry32(42));
const percept: SuperPercept = {
  energy: 0.55,
  threat: 0.3,
  crowding: 0.4,
  chaos: 0.5,
  wealthRel: 0.5,
  preyClose: 0.45,
  rivalClose: 0.3,
  pull: 0.2,
  light: 0.5,
  sound: 0.4,
  phase: 0.25,
};
// Warm up: let the affect EMAs, the reservoir, the active-inference belief, etc. settle to steady state so
// the measured cost reflects ongoing operation, not the first transient beats.
for (let i = 0; i < 64; i++) mind.think(percept);

group('super-mind: the apex composite mind', () => {
  bench('think() — one full cognitive beat (all faculties, PER SIMULATION FRAME)', () => {
    do_not_optimize(mind.think(percept));
  });

  bench(
    'snapshot() — UI-cadence telemetry (QGT + magic + IIT; only when the BRAIN board is open)',
    () => {
      do_not_optimize(mind.snapshot());
    },
  );
});

if (import.meta.main) {
  await run();
}
