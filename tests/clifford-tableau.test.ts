/**
 * THE CLIFFORD STABILIZER TABLEAU (V100) — closed-form experiments for the Aaronson–Gottesman simulator.
 * Each test is a falsifiable claim about a PROVABLE property of stabilizer states (Physicist's law 4):
 * Bell/GHZ carry exactly 1 ebit across any cut, GHZ measurements are perfectly correlated, a product state
 * carries 0 entanglement, H²=I and X|0⟩=|1⟩ are exact, sampling is deterministic from a seed, and — the
 * whole point — it all scales to dozens of qubits the dense register can never reach.
 */
import { describe, expect, test } from 'bun:test';
import { CliffordTableau } from '../src/math/clifford-tableau';
import { mulberry32 } from '../src/math/rng';

describe('CliffordTableau (V100) — Aaronson–Gottesman stabilizer simulator', () => {
  test('a Bell state carries exactly 1 ebit across the cut', () => {
    const c = new CliffordTableau(2);
    c.h(0).cnot(0, 1);
    expect(c.entanglementEntropy(1)).toBe(1);
  });

  test('a product state |0…0⟩ (even after local H/S) carries 0 entanglement', () => {
    const c = new CliffordTableau(6);
    expect(c.entanglementEntropy(3)).toBe(0);
    for (let q = 0; q < 6; q++) c.h(q).s(q); // purely local Cliffords ⇒ still a product state
    expect(c.entanglementEntropy(3)).toBe(0);
  });

  test('a GHZ state carries exactly 1 ebit across EVERY cut', () => {
    const n = 8;
    const c = new CliffordTableau(n);
    c.h(0);
    for (let i = 1; i < n; i++) c.cnot(0, i);
    for (let k = 1; k < n; k++) expect(c.entanglementEntropy(k)).toBe(1); // GHZ = 1 ebit at any boundary
  });

  test('GHZ measurements are perfectly correlated: every qubit agrees (all-0 or all-1)', () => {
    const n = 10;
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const c = new CliffordTableau(n);
      c.h(0);
      for (let i = 1; i < n; i++) c.cnot(0, i);
      const bits = c.sample(mulberry32(seed));
      const allZero = bits === 0n;
      const allOne = bits === (1n << BigInt(n)) - 1n;
      expect(allZero || allOne).toBeTrue(); // a GHZ collapse is global — no qubit disagrees
    }
  });

  test('H² = I and X|0⟩ = |1⟩ are exact (deterministic measurement)', () => {
    const a = new CliffordTableau(1);
    a.h(0).h(0);
    const ma = a.measure(0, mulberry32(1));
    expect(ma.deterministic).toBeTrue();
    expect(ma.outcome).toBe(0); // H²|0⟩ = |0⟩

    const b = new CliffordTableau(1);
    b.x_(0);
    const mb = b.measure(0, mulberry32(1));
    expect(mb.deterministic).toBeTrue();
    expect(mb.outcome).toBe(1); // X|0⟩ = |1⟩
  });

  test('measuring a fresh |0…0⟩ is deterministically 0 on every qubit', () => {
    const c = new CliffordTableau(5);
    for (let q = 0; q < 5; q++) {
      const m = c.measure(q, mulberry32(q + 1));
      expect(m.deterministic).toBeTrue();
      expect(m.outcome).toBe(0);
    }
  });

  test('same seed + same circuit ⇒ bit-identical sample (deterministic)', () => {
    const build = (): CliffordTableau => {
      const c = new CliffordTableau(12);
      for (let q = 0; q < 12; q++) c.h(q);
      for (let q = 0; q < 11; q++) c.cnot(q, q + 1);
      c.s(3).cz(2, 9).swap(0, 11).y_(5);
      return c;
    };
    expect(build().sample(mulberry32(0xabcdef))).toBe(build().sample(mulberry32(0xabcdef)));
  });

  test('scales far beyond the dense ceiling: a 40-qubit GHZ is exact and fast', () => {
    const n = 40; // 2^40 amplitudes are impossible to store; the tableau is 2n+1 rows
    const c = new CliffordTableau(n);
    c.h(0);
    for (let i = 1; i < n; i++) c.cnot(0, i);
    expect(c.entanglementEntropy(20)).toBe(1); // still exactly 1 ebit
    const s = c.snapshot();
    expect(s.qubits).toBe(40);
    expect(s.entanglement).toBe(1);
    const bits = c.sample(mulberry32(5));
    expect(bits === 0n || bits === (1n << 40n) - 1n).toBeTrue();
  });

  test('snapshot telemetry is well-formed + bounded', () => {
    const n = 6;
    const c = new CliffordTableau(n);
    c.h(0).cnot(0, 1).cnot(1, 2).h(3).cz(3, 4);
    c.sample(mulberry32(3));
    const s = c.snapshot();
    expect(s.qubits).toBe(n);
    expect(s.entanglement).toBeGreaterThanOrEqual(0);
    expect(s.entanglement).toBeLessThanOrEqual(Math.floor(n / 2));
    expect(s.entanglementNorm).toBeGreaterThanOrEqual(0);
    expect(s.entanglementNorm).toBeLessThanOrEqual(1);
    expect(s.spread).toBeGreaterThanOrEqual(0);
    expect(s.spread).toBeLessThanOrEqual(1);
    expect(s.sampleBits).toHaveLength(Math.min(n, 53));
  });
});
