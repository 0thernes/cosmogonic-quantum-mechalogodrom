/**
 * THE QUANTUM COMPUTING MIND (V75) — pins the non-destructive Born sample, the amplitude/Bloch
 * readouts added to {@link QuantumRegister}, and the {@link QuantumMind} contract: deterministic
 * statevector evolution from the mind's signals, bounded telemetry, real tunable entanglement, and
 * NaN-freedom. Experiments (a falsifiable claim each), per the Physicist's law 4.
 */
import { describe, expect, test } from 'bun:test';
import { QuantumRegister } from '../src/math/quantum';
import { mulberry32 } from '../src/math/rng';
import { QuantumMind, QMIND_QUBITS, QMIND_LAYERS } from '../src/sim/super-qubits';

const EPS = 1e-12;

describe('QuantumRegister inspection extensions (V75)', () => {
  test('sample() is non-destructive: the superposition survives + the index is Born-valid', () => {
    const reg = new QuantumRegister(2);
    reg.apply('h', 0);
    reg.apply('cx', 1, 0); // Bell pair: only |00> (0) and |11> (3)
    const before = Array.from(reg.probabilities());
    for (const seed of [1, 7, 42, 1234]) {
      const idx = reg.sample(mulberry32(seed));
      expect(idx === 0 || idx === 3).toBeTrue();
    }
    const after = reg.probabilities();
    for (let i = 0; i < before.length; i++) {
      expect(Math.abs((after[i] ?? 0) - (before[i] ?? 0))).toBeLessThan(EPS); // untouched
    }
  });

  test('sample() is deterministic + consumes one rng draw (streams stay in lockstep)', () => {
    const make = (): QuantumRegister => {
      const r = new QuantumRegister(3);
      r.apply('h', 0);
      r.apply('ry', 1, undefined, 0.9);
      r.apply('cx', 2, 1);
      return r;
    };
    const ra = mulberry32(0xabcdef);
    const rb = mulberry32(0xabcdef);
    expect(make().sample(ra)).toBe(make().sample(rb));
    expect(ra()).toBe(rb()); // exactly one draw each
  });

  test('amplitudesInto() copies the live statevector (|+> = [1/√2, 1/√2])', () => {
    const reg = new QuantumRegister(1);
    reg.apply('h', 0);
    const re = new Float64Array(2);
    const im = new Float64Array(2);
    reg.amplitudesInto(re, im);
    expect(Math.abs((re[0] ?? 0) - Math.SQRT1_2)).toBeLessThan(EPS);
    expect(Math.abs((re[1] ?? 0) - Math.SQRT1_2)).toBeLessThan(EPS);
    expect(Math.abs(im[0] ?? 0)).toBeLessThan(EPS);
  });

  test('blochInto(): |0>→(0,0,1), X→(0,0,−1), H→(1,0,0); Bell qubit is maximally mixed', () => {
    const out = new Float64Array(3);
    const z0 = new QuantumRegister(1);
    z0.blochInto(0, out);
    expect(Math.abs((out[2] ?? 0) - 1)).toBeLessThan(EPS); // |0> → +Z

    const x = new QuantumRegister(1);
    x.apply('x', 0);
    x.blochInto(0, out);
    expect(Math.abs((out[2] ?? 0) + 1)).toBeLessThan(EPS); // |1> → −Z

    const plus = new QuantumRegister(1);
    plus.apply('h', 0);
    plus.blochInto(0, out);
    expect(Math.abs((out[0] ?? 0) - 1)).toBeLessThan(EPS); // |+> → +X
    expect(Math.abs(out[1] ?? 0)).toBeLessThan(EPS);
    expect(Math.abs(out[2] ?? 0)).toBeLessThan(EPS);

    const bell = new QuantumRegister(2);
    bell.apply('h', 0);
    bell.apply('cx', 1, 0);
    bell.blochInto(0, out);
    const r = Math.hypot(out[0] ?? 0, out[1] ?? 0, out[2] ?? 0);
    expect(r).toBeLessThan(EPS); // entangled → reduced state at the Bloch origin
  });

  test('blochInto rejects an out-of-range qubit', () => {
    const reg = new QuantumRegister(2);
    expect(() => reg.blochInto(2, new Float64Array(3))).toThrow(RangeError);
  });
});

const aspects = (ent: number, sup = 0): number[] => {
  const a = Array.from({ length: 10 }, () => 0.3);
  a[0] = sup;
  a[1] = ent;
  return a;
};
const LATENT = [
  0.3, -0.5, 0.7, -0.2, 0.9, -0.8, 0.1, 0.6, -0.4, 0.5, -0.7, 0.2, 0.8, -0.1, 0.4, -0.6,
];

describe('QuantumMind (V75) — the simulated-qubit cognition layer', () => {
  test('snapshot telemetry is well-formed + bounded; probabilities sum to 1', () => {
    const m = new QuantumMind(mulberry32(1));
    m.evolve(aspects(0.6, 0.5), LATENT);
    const s = m.snapshot();
    expect(s.qubits).toBe(QMIND_QUBITS);
    expect(s.dim).toBe(1 << QMIND_QUBITS);
    expect(s.layers).toBe(QMIND_LAYERS);
    expect(s.probs).toHaveLength(s.dim);
    expect(s.phase).toHaveLength(s.dim);
    expect(s.bloch).toHaveLength(QMIND_QUBITS);
    expect(s.p1).toHaveLength(QMIND_QUBITS);
    expect(s.sampledBits).toHaveLength(QMIND_QUBITS);
    expect(s.sampled).toBeGreaterThanOrEqual(0);
    expect(s.sampled).toBeLessThan(s.dim);
    let sum = 0;
    for (const p of s.probs) {
      expect(p).toBeGreaterThanOrEqual(0);
      sum += p;
    }
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
    for (const v of [s.entropy, s.entanglement, s.coherence]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    for (const b of s.bloch) {
      expect(Math.hypot(b.x, b.y, b.z)).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(b.r - Math.hypot(b.x, b.y, b.z))).toBeLessThan(1e-9);
    }
  });

  test('same seed + same drivers ⇒ identical quantum psyche (deterministic)', () => {
    const a = new QuantumMind(mulberry32(99));
    const b = new QuantumMind(mulberry32(99));
    for (let i = 0; i < 8; i++) {
      a.evolve(aspects(0.4 + i * 0.05, 0.3), LATENT);
      b.evolve(aspects(0.4 + i * 0.05, 0.3), LATENT);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('the entanglement aspect REALLY entangles: zero ⇒ separable, one ⇒ correlated', () => {
    const sep = new QuantumMind(mulberry32(5));
    sep.evolve(aspects(0, 0), LATENT); // no controlled-RY ring → product state
    const sepS = sep.snapshot();
    expect(sepS.entanglement).toBeLessThan(1e-6); // every qubit stays pure

    const ent = new QuantumMind(mulberry32(5));
    ent.evolve(aspects(1, 0), LATENT); // full controlled-RY ring
    expect(ent.snapshot().entanglement).toBeGreaterThan(0.05);
  });

  test('no NaN + finite amplitudes across a long driven run', () => {
    const m = new QuantumMind(mulberry32(7));
    for (let i = 0; i < 200; i++) {
      const lat = LATENT.map((v, k) => Math.sin(i * 0.1 + k) * v);
      m.evolve(aspects((i % 10) / 10, (i % 5) / 5), lat);
      const s = m.snapshot();
      let acc = s.entropy + s.entanglement + s.coherence;
      for (const p of s.probs) acc += p;
      for (const b of s.bloch) acc += b.x + b.y + b.z;
      expect(Number.isFinite(acc)).toBe(true);
    }
  });

  // ── V84: the Quantum Geometric Tensor / Fubini–Study metric (ported from the QGTL/Moonlab study) ──
  test('QGT: the Fubini–Study metric is symmetric, PSD-diagonal, and finite', () => {
    const m = new QuantumMind(mulberry32(11));
    m.evolve(aspects(0.5, 0.5), LATENT);
    const g = m.snapshot().geometry;
    expect(g.metric).toHaveLength(4);
    expect(Math.abs((g.metric[1] ?? 0) - (g.metric[2] ?? 0))).toBeLessThan(EPS); // g01 == g10
    expect(g.metric[0]).toBeGreaterThanOrEqual(-1e-9); // ‖∂₀ψ‖² − |⟨∂₀ψ|ψ⟩|² ≥ 0 (Cauchy–Schwarz)
    expect(g.metric[3]).toBeGreaterThanOrEqual(-1e-9);
    expect(g.scalar).toBeGreaterThanOrEqual(-1e-9); // trace = g00 + g11 ≥ 0
    expect(Number.isFinite(g.curvature + g.scalar + g.berry)).toBe(true);
  });

  test('QGT is deterministic AND never corrupts the seeded beat stream', () => {
    // One mind takes a snapshot (running the QGT, which perturbs the register) mid-run; a control
    // does not. Their NEXT Born sample must still match bit-for-bit — the readout is side-effect-free.
    const withQgt = new QuantumMind(mulberry32(77));
    const control = new QuantumMind(mulberry32(77));
    withQgt.evolve(aspects(0.6, 0.4), LATENT);
    withQgt.snapshot(); // runs geometricMetric() → leaves the register perturbed
    control.evolve(aspects(0.6, 0.4), LATENT); // no snapshot
    withQgt.evolve(aspects(0.7, 0.5), LATENT);
    control.evolve(aspects(0.7, 0.5), LATENT);
    expect(withQgt.lastSample).toBe(control.lastSample); // beat stream untouched by the readout
    expect(JSON.stringify(withQgt.snapshot().geometry)).toBe(
      JSON.stringify(control.snapshot().geometry),
    ); // same drivers ⇒ identical geometry
  });

  test('QGT RESPONDS to cognition: different drives curve the thought-space differently', () => {
    const a = new QuantumMind(mulberry32(3));
    a.evolve(aspects(0.2, 0.2), LATENT);
    const b = new QuantumMind(mulberry32(3));
    b.evolve(aspects(0.9, 0.9), LATENT);
    const ga = a.snapshot().geometry;
    const gb = b.snapshot().geometry;
    expect(Math.abs(ga.scalar - gb.scalar) + Math.abs(ga.curvature - gb.curvature)).toBeGreaterThan(
      1e-4,
    );
  });
});
