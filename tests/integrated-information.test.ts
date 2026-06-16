/**
 * INTEGRATED INFORMATION Φ (V90 / SC 1.1) — proves the IIT proxy captures GLOBAL integration, not any
 * entanglement: a product state and a LOCALIZED Bell pair are both reducible (Φ=0), while a GHZ state is
 * irreducible with the closed-form Φ = d/(d−1)·(1−½) = 4/7 at every balanced cut. Falsifiable claims.
 */
import { describe, expect, test } from 'bun:test';
import { QuantumRegister } from '../src/math/quantum';
import { integratedInformation, subsystemLinearEntropy } from '../src/sim/integrated-information';

const EPS = 1e-9;
const amps = (reg: QuantumRegister): { re: Float64Array; im: Float64Array } => {
  const re = new Float64Array(reg.dimension);
  const im = new Float64Array(reg.dimension);
  reg.amplitudesInto(re, im);
  return { re, im };
};

describe('integratedInformation Φ (V90)', () => {
  test('a product state |000000⟩ has Φ = 0 (perfectly reducible)', () => {
    const reg = new QuantumRegister(6);
    const { re, im } = amps(reg);
    const s = integratedInformation(re, im, 6);
    expect(s.qubits).toBe(6);
    expect(s.cuts).toBe(10); // C(5,2) balanced cuts containing qubit 0
    expect(s.phi).toBeLessThan(EPS);
    expect(s.meanIntegration).toBeLessThan(EPS);
    expect(s.mipBits).toHaveLength(6);
  });

  test('a product of single-qubit superpositions |+⟩^6 is still reducible (Φ = 0)', () => {
    const reg = new QuantumRegister(6);
    for (let q = 0; q < 6; q++) reg.apply('h', q);
    const { re, im } = amps(reg);
    expect(integratedInformation(re, im, 6).phi).toBeLessThan(1e-9);
  });

  test('a GHZ register is irreducible: Φ = 4/7 at every balanced cut (closed form)', () => {
    const reg = new QuantumRegister(6);
    reg.apply('h', 0);
    for (let q = 1; q < 6; q++) reg.apply('cx', q, 0); // GHZ: (|000000⟩+|111111⟩)/√2
    const { re, im } = amps(reg);
    const s = integratedInformation(re, im, 6);
    // ρ_A = ½(|0..0⟩⟨0..0|+|1..1⟩⟨1..1|) ⇒ Tr ρ_A² = ½ ⇒ S_L = (8/7)(1−½) = 4/7.
    const expected = 4 / 7;
    expect(Math.abs(s.phi - expected)).toBeLessThan(1e-6);
    expect(Math.abs(s.meanIntegration - expected)).toBeLessThan(1e-6); // every cut identical
  });

  test('a LOCALIZED Bell pair is reducible (Φ = 0): a balanced cut can keep it whole', () => {
    const reg = new QuantumRegister(6);
    reg.apply('h', 0);
    reg.apply('cx', 1, 0); // Bell on {0,1}, qubits 2..5 = |0⟩
    const { re, im } = amps(reg);
    const s = integratedInformation(re, im, 6);
    // Some balanced cut puts both 0 and 1 on side A → that cut has S_L = 0 → Φ = min = 0.
    expect(s.phi).toBeLessThan(1e-9);
    // …but the MEAN is > 0 (cuts that straddle the pair are entangled), so the measure isn't vacuous.
    expect(s.meanIntegration).toBeGreaterThan(0.05);
  });

  test('subsystemLinearEntropy: |+⟩ on a single qubit is separable; a Bell cut is maximally mixed', () => {
    const sep = new QuantumRegister(2);
    sep.apply('h', 0);
    sep.apply('h', 1);
    const a = amps(sep);
    expect(subsystemLinearEntropy(a.re, a.im, 2, 0b01)).toBeLessThan(1e-9); // product ⇒ 0

    const bell = new QuantumRegister(2);
    bell.apply('h', 0);
    bell.apply('cx', 1, 0);
    const b = amps(bell);
    // ρ_A = I/2 ⇒ Tr ρ_A² = ½ ⇒ S_L = (2/1)(1−½) = 1 (maximally entangled single qubit).
    expect(Math.abs(subsystemLinearEntropy(b.re, b.im, 2, 0b01) - 1)).toBeLessThan(1e-9);
  });

  test('deterministic + bounded over a driven register', () => {
    const reg = new QuantumRegister(6);
    reg.apply('h', 0);
    reg.apply('ry', 1, undefined, 0.7);
    reg.apply('cx', 2, 1);
    reg.apply('rz', 3, undefined, 1.1);
    reg.apply('cx', 4, 3);
    const { re, im } = amps(reg);
    const a = integratedInformation(re, im, 6);
    const b = integratedInformation(re, im, 6);
    expect(a.phi).toBe(b.phi); // deterministic
    expect(a.phi).toBeGreaterThanOrEqual(0);
    expect(a.phi).toBeLessThanOrEqual(1);
    expect(a.meanIntegration).toBeGreaterThanOrEqual(a.phi - 1e-9); // mean ≥ min
  });
});
