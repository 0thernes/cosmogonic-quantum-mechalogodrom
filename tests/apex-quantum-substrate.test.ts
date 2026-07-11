/**
 * APEX Quantum Substrate tests — the Quantum Brain scaled to a billion-dimensional Hilbert space.
 *
 * Asserts the simulated quantum-information model's dimensions and invariants:
 *   - the stabilizer reflex addresses a ≥ 1e9-dimensional state space at 30 qubits (Gottesman–Knill).
 *   - the dense exact core stays within the 8-qubit statevector ceiling; qubit budgets clamp.
 *   - evolution is bit-for-bit deterministic (same seed ⇒ same reach + plan bias).
 *   - the Born-distribution plan bias is a valid probability vector (load-bearing coupling).
 *   - no NaN/Inf ever leaks across a long run; entanglement/entropy stay in range.
 */
import { describe, expect, test } from 'bun:test';
import {
  APEX_DENSE_QUBITS_CAP,
  APEX_STABILIZER_QUBITS_MAX,
  ApexQuantumSubstrate,
  stabilizerQubitsForBillion,
} from '../src/sim/apex-quantum-substrate';
import { APEX_BILLION } from '../src/sim/apex-parameter-manifold';

describe('quantum substrate — billion-dimensional reach', () => {
  test('default stabilizer reflex reaches a billion-dimensional state space', () => {
    const q = new ApexQuantumSubstrate(12345);
    const r = q.reach();
    expect(r.stabilizerQubits).toBe(30);
    expect(r.stabilizerDim).toBeGreaterThanOrEqual(APEX_BILLION);
    expect(r.reachesBillion).toBe(true);
    expect(r.effectiveDim).toBe(r.denseDim + r.stabilizerDim);
  });

  test('30 stabilizer qubits is exactly the billion threshold', () => {
    expect(stabilizerQubitsForBillion()).toBe(30);
  });

  test('qubit budgets clamp to the dense ceiling and the stabilizer max', () => {
    const q = new ApexQuantumSubstrate(7, { denseQubits: 99, stabilizerQubits: 999 });
    expect(q.denseQubits).toBe(APEX_DENSE_QUBITS_CAP);
    expect(q.stabilizerQubits).toBe(APEX_STABILIZER_QUBITS_MAX);
  });

  test('cross-cut entanglement TRACKS the drive (the Quantum Brain is load-bearing, not decor)', () => {
    const norm = (drive: number): number => {
      const q = new ApexQuantumSubstrate(5);
      for (let i = 0; i < 6; i++) q.step(drive);
      return q.reach().stabilizerEntanglementNorm;
    };
    const lo = norm(0.1);
    const mid = norm(0.5);
    const hi = norm(0.9);
    expect(mid).toBeGreaterThan(lo);
    expect(hi).toBeGreaterThan(mid);
    expect(hi).toBeGreaterThan(0.5); // genuinely high entanglement at high drive (regression guard)
  });
});

describe('quantum substrate — determinism', () => {
  test('same seed + same steps ⇒ identical reach and plan bias', () => {
    const a = new ApexQuantumSubstrate(0xabc);
    const b = new ApexQuantumSubstrate(0xabc);
    for (let i = 0; i < 40; i++) {
      a.step(0.3 + 0.2 * Math.sin(i));
      b.step(0.3 + 0.2 * Math.sin(i));
    }
    const ra = a.reach();
    const rb = b.reach();
    expect(ra.bornEntropy).toBe(rb.bornEntropy);
    expect(ra.stabilizerEntanglement).toBe(rb.stabilizerEntanglement);
    expect(ra.qgtVolume).toBe(rb.qgtVolume);
    expect(a.planBias(6)).toEqual(b.planBias(6));
  });

  test('different seeds diverge in quantum telemetry', () => {
    const a = new ApexQuantumSubstrate(1);
    const b = new ApexQuantumSubstrate(2);
    for (let i = 0; i < 20; i++) {
      a.step(0.5);
      b.step(0.5);
    }
    // seed drives the corpus pulse (cliffordEnt) AND the dense-core phase (bornEntropy) → both diverge
    expect(a.reach().cliffordEnt).not.toBe(b.reach().cliffordEnt);
    expect(a.reach().bornEntropy).not.toBe(b.reach().bornEntropy);
  });
});

describe('quantum substrate — load-bearing plan bias', () => {
  test('plan bias is a valid probability vector', () => {
    const q = new ApexQuantumSubstrate(42);
    for (let i = 0; i < 10; i++) q.step(0.6);
    const bias = q.planBias(6);
    expect(bias.length).toBe(6);
    const sum = bias.reduce((a, v) => a + v, 0);
    expect(sum).toBeCloseTo(1, 6);
    for (const v of bias) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('quantum substrate — stability over a long run', () => {
  test('no NaN/Inf leaks; entanglement and entropy stay in range', () => {
    const q = new ApexQuantumSubstrate(999);
    for (let i = 0; i < 200; i++) q.step((i % 7) / 7);
    const r = q.reach();
    expect(Number.isFinite(r.bornEntropy)).toBe(true);
    expect(r.bornEntropy).toBeGreaterThanOrEqual(0);
    expect(r.bornEntropy).toBeLessThanOrEqual(r.denseQubits + 1e-9);
    expect(r.stabilizerEntanglementNorm).toBeGreaterThanOrEqual(0);
    expect(r.stabilizerEntanglementNorm).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.qgtVolume)).toBe(true);
  });
});
