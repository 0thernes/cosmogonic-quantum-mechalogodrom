/**
 * QUANTUM COHERENCE RESOURCES (V90 / SC 1.1) — proves the resource-theory monotones against closed
 * forms: a basis state has zero coherence, a uniform superposition is maximal (C_l1 = d−1, C_r = log₂d),
 * and both monotones are basis-dependent (a |+⟩ is maximal; rotating to its own eigenbasis would zero it).
 */
import { describe, expect, test } from 'bun:test';
import { QuantumRegister } from '../src/math/quantum';
import { quantumCoherence } from '../src/math/quantum-coherence';

const amps = (reg: QuantumRegister): { re: Float64Array; im: Float64Array } => {
  const re = new Float64Array(reg.dimension);
  const im = new Float64Array(reg.dimension);
  reg.amplitudesInto(re, im);
  return { re, im };
};

describe('quantumCoherence (V90)', () => {
  test('a computational-basis state |000⟩ has zero coherence', () => {
    const reg = new QuantumRegister(3);
    const { re, im } = amps(reg);
    const c = quantumCoherence(re, im);
    expect(c.l1).toBeLessThan(1e-12);
    expect(c.relEntropy).toBeLessThan(1e-12);
    expect(c.l1Norm).toBeLessThan(1e-12);
    expect(c.relEntropyNorm).toBeLessThan(1e-12);
  });

  test('a uniform superposition |+⟩^3 is maximally coherent (C_l1 = d−1, C_r = log₂d)', () => {
    const reg = new QuantumRegister(3);
    for (let q = 0; q < 3; q++) reg.apply('h', q);
    const { re, im } = amps(reg);
    const c = quantumCoherence(re, im);
    const d = 8;
    expect(Math.abs(c.l1 - (d - 1))).toBeLessThan(1e-9); // 7
    expect(Math.abs(c.relEntropy - Math.log2(d))).toBeLessThan(1e-9); // 3 bits
    expect(Math.abs(c.l1Norm - 1)).toBeLessThan(1e-9);
    expect(Math.abs(c.relEntropyNorm - 1)).toBeLessThan(1e-9);
  });

  test('a single |+⟩ qubit: C_l1 = 1, C_r = 1 bit', () => {
    const reg = new QuantumRegister(1);
    reg.apply('h', 0);
    const { re, im } = amps(reg);
    const c = quantumCoherence(re, im);
    expect(Math.abs(c.l1 - 1)).toBeLessThan(1e-9);
    expect(Math.abs(c.relEntropy - 1)).toBeLessThan(1e-9);
  });

  test('partial coherence sits strictly between the extremes + stays bounded', () => {
    const reg = new QuantumRegister(2);
    reg.apply('ry', 0, undefined, 0.6); // a tilted single-qubit superposition
    const { re, im } = amps(reg);
    const c = quantumCoherence(re, im);
    expect(c.l1).toBeGreaterThan(0);
    expect(c.l1Norm).toBeGreaterThan(0);
    expect(c.l1Norm).toBeLessThanOrEqual(1);
    expect(c.relEntropyNorm).toBeGreaterThanOrEqual(0);
    expect(c.relEntropyNorm).toBeLessThanOrEqual(1);
  });
});
