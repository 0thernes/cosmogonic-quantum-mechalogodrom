/**
 * THE QUANTUM GEOMETRIC TENSOR (V84) — proves the ported QGTL primitive against closed-form qubit
 * geometry: the Fubini–Study metric of an RY rotation is exactly 1/4, real states carry no Berry
 * curvature, and an RY·RZ qubit (a path on the Bloch sphere) carries real geometric phase. Experiments
 * (a falsifiable claim each), per the Physicist's law 4.
 */
import { describe, expect, test } from 'bun:test';
import { quantumGeometricTensor } from '../src/math/quantum-geometry';

// |ψ(θ)⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩ — a single real RY rotation.
const ry = (p: readonly number[], re: Float64Array, im: Float64Array): void => {
  const t = (p[0] ?? 0) / 2;
  re[0] = Math.cos(t);
  re[1] = Math.sin(t);
  im[0] = 0;
  im[1] = 0;
};

// |ψ(θ,φ)⟩ = e^{-iφ/2}cos(θ/2)|0⟩ + e^{iφ/2}sin(θ/2)|1⟩ — RY then RZ (a Bloch-sphere point).
const ryrz = (p: readonly number[], re: Float64Array, im: Float64Array): void => {
  const t = (p[0] ?? 0) / 2;
  const f = (p[1] ?? 0) / 2;
  const c = Math.cos(t);
  const s = Math.sin(t);
  re[0] = c * Math.cos(f);
  im[0] = -c * Math.sin(f);
  re[1] = s * Math.cos(f);
  im[1] = s * Math.sin(f);
};

describe('quantumGeometricTensor (V84) — the ported QGTL primitive', () => {
  test('Fubini–Study metric of an RY rotation is 1/4 (closed form)', () => {
    const g = quantumGeometricTensor([0.7], ry, 2);
    expect(g.params).toBe(1);
    expect(Math.abs((g.metric[0]?.[0] ?? 0) - 0.25)).toBeLessThan(1e-5);
    expect(Math.abs(g.volume - 0.25)).toBeLessThan(1e-5);
    expect(g.fisher).toBeCloseTo(1, 4); // QFI = 4·g = 1
    expect(g.berryMagnitude).toBe(0); // single parameter ⇒ no off-diagonal curvature
  });

  test('a real two-qubit product state has a diagonal metric and zero Berry curvature', () => {
    // Two independent RY rotations on 2 qubits → |ψ⟩ = RY(a)⊗RY(b)|00⟩ (dim 4, amplitudes real).
    const product = (p: readonly number[], re: Float64Array, im: Float64Array): void => {
      const a = (p[0] ?? 0) / 2;
      const b = (p[1] ?? 0) / 2;
      const c0 = Math.cos(a);
      const s0 = Math.sin(a);
      const c1 = Math.cos(b);
      const s1 = Math.sin(b);
      re[0] = c0 * c1; // |00>
      re[1] = s0 * c1; // |01> (qubit0 = bit0)
      re[2] = c0 * s1; // |10>
      re[3] = s0 * s1; // |11>
      im[0] = im[1] = im[2] = im[3] = 0;
    };
    const g = quantumGeometricTensor([0.9, 0.4], product, 4);
    expect(Math.abs((g.metric[0]?.[0] ?? 0) - 0.25)).toBeLessThan(1e-4);
    expect(Math.abs((g.metric[1]?.[1] ?? 0) - 0.25)).toBeLessThan(1e-4);
    expect(Math.abs(g.metric[0]?.[1] ?? 0)).toBeLessThan(1e-4); // independent ⇒ off-diagonal ≈ 0
    expect(g.berryMagnitude).toBeLessThan(1e-6); // real states ⇒ no geometric phase
  });

  test('an RY·RZ qubit carries real Berry curvature; the metric is symmetric, Berry antisymmetric', () => {
    const g = quantumGeometricTensor([1.0, 0.7], ryrz, 2);
    // g_θθ = 1/4 (closed form, independent of φ).
    expect(Math.abs((g.metric[0]?.[0] ?? 0) - 0.25)).toBeLessThan(1e-4);
    // g_φφ = (1/4) sin²θ.
    const expectedPhiPhi = 0.25 * Math.sin(1.0) * Math.sin(1.0);
    expect(Math.abs((g.metric[1]?.[1] ?? 0) - expectedPhiPhi)).toBeLessThan(1e-3);
    // symmetric metric, antisymmetric Berry.
    expect(Math.abs((g.metric[0]?.[1] ?? 0) - (g.metric[1]?.[0] ?? 0))).toBeLessThan(1e-6);
    expect(Math.abs((g.berry[0]?.[1] ?? 0) + (g.berry[1]?.[0] ?? 0))).toBeLessThan(1e-6);
    expect(g.berryMagnitude).toBeGreaterThan(1e-3); // a genuine Bloch-sphere monopole flux
    expect(Number.isFinite(g.volume)).toBe(true);
    expect(g.volume).toBeGreaterThan(0);
  });
});
