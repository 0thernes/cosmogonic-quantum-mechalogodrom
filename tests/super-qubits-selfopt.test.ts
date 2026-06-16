/**
 * QUANTUM NATURAL GRADIENT self-optimization (V93) — pins the {@link QuantumMind.selfOptimizeStep}
 * contract: the mind descends its own Fubini–Study geometry (the QGT it already computes) to make its
 * INTENDED thought more probable (Stokes et al., Quantum 4, 269, 2020). Each test is a falsifiable claim:
 * bounded telemetry, full determinism, RNG-freedom of the optimization, and that the natural-gradient
 * bias genuinely raises (never lowers) the intended thought's probability — the mind LEARNS within itself.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { QuantumMind, QMIND_QUBITS } from '../src/sim/super-qubits';

/** A fixed driver vector: moderate superposition + entanglement, amplification (aspects[4]) off. */
const drive = (): number[] => {
  const a = Array.from({ length: 10 }, () => 0.3);
  a[0] = 0.4; // superposition
  a[1] = 0.4; // entanglement
  a[4] = 0; // no Grover amplification — isolate the self-optimization
  return a;
};
const LAT = [0.3, -0.5, 0.7, -0.2, 0.9, -0.8, 0.1, 0.6, -0.4, 0.5, -0.7, 0.2, 0.8, -0.1, 0.4, -0.6];

describe('QuantumMind (V93) — quantum natural-gradient self-optimization', () => {
  test('selfOpt telemetry is well-formed + bounded', () => {
    const m = new QuantumMind(mulberry32(1));
    m.evolve(drive(), LAT);
    const so = m.snapshot().selfOpt;
    expect(so.target).toBeGreaterThanOrEqual(0);
    expect(so.target).toBeLessThan(1 << QMIND_QUBITS);
    expect(so.targetBits).toHaveLength(QMIND_QUBITS);
    for (const v of [so.pTarget, so.improve]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(so.gradNorm).toBeGreaterThanOrEqual(0);
    expect(so.natNorm).toBeGreaterThanOrEqual(0);
    expect(Math.abs(so.biasSup)).toBeLessThanOrEqual(0.35 + 1e-9);
    expect(Math.abs(so.biasEnt)).toBeLessThanOrEqual(0.35 + 1e-9);
  });

  test('same seed + drivers ⇒ identical self-optimization trajectory (deterministic)', () => {
    const a = new QuantumMind(mulberry32(42));
    const b = new QuantumMind(mulberry32(42));
    for (let i = 0; i < 16; i++) {
      a.evolve(drive(), LAT);
      b.evolve(drive(), LAT);
    }
    expect(JSON.stringify(a.snapshot().selfOpt)).toBe(JSON.stringify(b.snapshot().selfOpt));
  });

  test('it LEARNS: the natural-gradient bias engages and raises (never lowers) the intended thought', () => {
    const m = new QuantumMind(mulberry32(7));
    m.evolve(drive(), LAT);
    const first = m.snapshot().selfOpt.pTarget; // P(intent) at zero bias
    for (let i = 0; i < 40; i++) m.evolve(drive(), LAT);
    const so = m.snapshot().selfOpt;
    // the optimizer engaged — a nonzero (sup,ent) bias accrued
    expect(Math.abs(so.biasSup) + Math.abs(so.biasEnt)).toBeGreaterThan(1e-4);
    // …and gradient ASCENT made the intended thought at least as probable as it was at zero bias
    expect(so.pTarget).toBeGreaterThanOrEqual(first - 1e-9);
  });

  test('the self-optimization draws NO rng — the Born stream stays in lockstep', () => {
    // Two minds with identical drivers; one also reads a snapshot (running the QGT) between beats. The
    // self-opt does 6 extra circuit rebuilds + a restore each beat, none drawing rng — so the NEXT Born
    // sample must still match bit-for-bit (the optimization is side-effect-free on the seeded stream).
    const x = new QuantumMind(mulberry32(99));
    const y = new QuantumMind(mulberry32(99));
    x.evolve(drive(), LAT);
    x.snapshot();
    y.evolve(drive(), LAT);
    x.evolve(drive(), LAT);
    y.evolve(drive(), LAT);
    expect(x.lastSample).toBe(y.lastSample);
  });
});
