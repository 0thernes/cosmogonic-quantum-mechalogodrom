/**
 * QUANTUM MAGIC — STABILIZER RÉNYI ENTROPY (SC 1.1) — proves the non-stabilizerness monotone against
 * closed forms: every stabilizer (Clifford-reachable) state has ZERO magic, and a single T|+⟩ qubit has
 * the exact magic log₂(4/3). Falsifiable claims (the Physicist's law 4).
 */
import { describe, expect, test } from 'bun:test';
import { QuantumRegister } from '../src/math/quantum';
import { quantumMagic } from '../src/math/quantum-magic';

const amps = (reg: QuantumRegister): { re: Float64Array; im: Float64Array } => {
  const re = new Float64Array(reg.dimension);
  const im = new Float64Array(reg.dimension);
  reg.amplitudesInto(re, im);
  return { re, im };
};

describe('quantumMagic — stabilizer Rényi entropy (SC 1.1)', () => {
  test('computational-basis |000⟩ is a stabilizer state ⇒ magic = 0', () => {
    const reg = new QuantumRegister(3);
    const { re, im } = amps(reg);
    const m = quantumMagic(re, im, 3);
    expect(m.qubits).toBe(3);
    expect(m.magic).toBeLessThan(1e-9);
    expect(m.stabilizer).toBe(true);
    expect(m.magicNorm).toBeLessThan(1e-9);
  });

  test('|+⟩^3 (all-Hadamard) is a stabilizer state ⇒ magic = 0', () => {
    const reg = new QuantumRegister(3);
    for (let q = 0; q < 3; q++) reg.apply('h', q);
    const { re, im } = amps(reg);
    expect(quantumMagic(re, im, 3).magic).toBeLessThan(1e-9);
  });

  test('GHZ_3 (H + CNOT chain — all Clifford) is a stabilizer state ⇒ magic = 0', () => {
    const reg = new QuantumRegister(3);
    reg.apply('h', 0);
    reg.apply('cx', 1, 0);
    reg.apply('cx', 2, 1);
    const { re, im } = amps(reg);
    expect(quantumMagic(re, im, 3).magic).toBeLessThan(1e-9);
  });

  test('a single T|+⟩ qubit has the exact magic log₂(4/3) ≈ 0.415', () => {
    const reg = new QuantumRegister(1);
    reg.apply('h', 0); // |+⟩
    reg.apply('t', 0); // T|+⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2 — a canonical magic state
    const { re, im } = amps(reg);
    const m = quantumMagic(re, im, 1);
    const expected = Math.log2(4 / 3);
    expect(Math.abs(m.magic - expected)).toBeLessThan(1e-9);
    expect(m.stabilizer).toBe(false);
    expect(m.magic).toBeGreaterThan(0);
  });

  test('S|+⟩ stays Clifford (S is a Clifford gate) ⇒ magic = 0, but a T pushes it positive', () => {
    const sPlus = new QuantumRegister(1);
    sPlus.apply('h', 0);
    sPlus.apply('s', 0); // S|+⟩ = |+i⟩ — a stabilizer state
    const a = amps(sPlus);
    expect(quantumMagic(a.re, a.im, 1).magic).toBeLessThan(1e-9);
  });

  test('a non-Clifford RY rotation injects magic; deterministic + bounded', () => {
    const reg = new QuantumRegister(4);
    reg.apply('h', 0);
    reg.apply('ry', 1, undefined, 0.7); // non-Clifford angle
    reg.apply('cx', 2, 1);
    reg.apply('rz', 3, undefined, 0.4);
    const { re, im } = amps(reg);
    const m1 = quantumMagic(re, im, 4);
    const m2 = quantumMagic(re, im, 4);
    expect(m1.magic).toBe(m2.magic); // deterministic (pure function)
    expect(m1.magic).toBeGreaterThan(1e-6); // genuine magic
    expect(m1.magicNorm).toBeGreaterThanOrEqual(0);
    expect(m1.magicNorm).toBeLessThanOrEqual(1);
  });
});
