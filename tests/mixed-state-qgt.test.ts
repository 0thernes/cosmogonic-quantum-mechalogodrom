/**
 * MIXED-STATE QGT (research faculty #8) — locks in the module's previously UNVERIFIED math so its in-code
 * audit fixes (the d²-vs-dim linear-entropy fix and the ρ-transpose Im-sign fix) can no longer silently
 * rot. Exercises the Hermitian density-matrix construction, depolarizing-channel trace preservation, and
 * the finite-difference Bures QGT over a genuine parameter family — proving the geometry is real and
 * STATE-DEPENDENT (non-degenerate), not a constant. Pure math; no rng/clock. NOT a sentience claim.
 */
import { describe, expect, test } from 'bun:test';
import {
  computePurity,
  computeEntropy,
  mixedStateQuantumGeometricTensor,
  statevectorToDensityMatrix,
  applyDepolarizingNoise,
} from '../src/math/mixed-state-qgt';

/** |ψ(θ)⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ as flat re/im arrays (single qubit, d = 2). */
function qubit(theta: number, phi: number): { re: Float64Array; im: Float64Array } {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return {
    re: Float64Array.from([c, s * Math.cos(phi)]),
    im: Float64Array.from([0, s * Math.sin(phi)]),
  };
}

describe('mixed-state QGT — Hermitian ρ + depolarizing channel', () => {
  test('statevectorToDensityMatrix builds a Hermitian, trace-1 ρ with the correct Im sign', () => {
    const { re, im } = qubit(1.2, 0.7); // a genuinely complex amplitude so the Im sign matters
    const rhoRe = new Float64Array(4);
    const rhoIm = new Float64Array(4);
    statevectorToDensityMatrix(re, im, 2, rhoRe, rhoIm);
    // Trace = 1
    expect(rhoRe[0]! + rhoRe[3]!).toBeCloseTo(1, 10);
    // Hermitian: ρ_10 = conj(ρ_01) ⇒ equal real, opposite imag.
    expect(rhoRe[1]!).toBeCloseTo(rhoRe[2]!, 12);
    expect(rhoIm[1]!).toBeCloseTo(-rhoIm[2]!, 12);
    // The ACTUAL Im SIGN — this is what pins the ρ-transpose fix. ρ_01 = ψ_0·conj(ψ_1) so for
    // |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩, Im(ρ_01) = −cos(θ/2)·sin(θ/2)·sin(φ) (strictly negative
    // here). The pre-fix `ar·bi − ai·br` would give the OPPOSITE (positive) sign, so an anti-symmetry- or
    // magnitude-only check (the earlier assertion) passed for BOTH ρ and ρᵀ — this does not.
    const expectedIm01 = -Math.cos(1.2 / 2) * Math.sin(1.2 / 2) * Math.sin(0.7);
    expect(expectedIm01).toBeLessThan(0);
    expect(rhoIm[1]!).toBeCloseTo(expectedIm01, 10);
    expect(rhoIm[1]!).toBeLessThan(0);
  });

  test('a pure state has purity 1 / linear-entropy 0 (locks the d²-vs-dim fix); depolarizing lowers it', () => {
    const { re, im } = qubit(0.9, 0.4);
    const rhoRe = new Float64Array(4);
    const rhoIm = new Float64Array(4);
    statevectorToDensityMatrix(re, im, 2, rhoRe, rhoIm);
    // Pure ⇒ Tr(ρ²) = 1 over ALL d² = 4 entries. Summing only `dim` = 2 (the old bug) would miss the
    // off-diagonals and give the wrong value, so this pins the fix.
    expect(computePurity(rhoRe, rhoIm, 4)).toBeCloseTo(1, 10);
    expect(computeEntropy(rhoRe, rhoIm, 4)).toBeCloseTo(0, 10);

    applyDepolarizingNoise(rhoRe, rhoIm, 2, 0.5);
    // Trace preserved, purity strictly dropped, entropy risen but bounded by 1 − 1/d.
    expect(rhoRe[0]! + rhoRe[3]!).toBeCloseTo(1, 10);
    expect(computePurity(rhoRe, rhoIm, 4)).toBeLessThan(1);
    const s = computeEntropy(rhoRe, rhoIm, 4);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1 - 1 / 2 + 1e-9);
  });
});

describe('mixed-state QGT — finite-difference Bures geometry', () => {
  const dim = 2;
  // ρ(θ, φ): the pure single-qubit state as a density matrix — a real 2-parameter family.
  const build = (p: readonly number[], outRe: Float64Array, outIm: Float64Array): void => {
    const { re, im } = qubit(p[0] ?? 0, p[1] ?? 0);
    statevectorToDensityMatrix(re, im, dim, outRe, outIm);
  };

  test('metric is symmetric + PSD and the Berry curvature is antisymmetric with zero diagonal', () => {
    const g = mixedStateQuantumGeometricTensor([0.8, 0.3], build, dim);
    expect(g.params).toBe(2);
    // Metric g = Re Q is symmetric with a non-negative diagonal and a PSD 2×2 minor (det ≥ 0).
    expect(g.metric[0]![1]).toBeCloseTo(g.metric[1]![0]!, 9);
    expect(g.metric[0]![0]!).toBeGreaterThanOrEqual(-1e-9);
    expect(g.metric[1]![1]!).toBeGreaterThanOrEqual(-1e-9);
    const det = g.metric[0]![0]! * g.metric[1]![1]! - g.metric[0]![1]! * g.metric[1]![0]!;
    expect(det).toBeGreaterThanOrEqual(-1e-9);
    // Berry curvature Ω = Im Q must be antisymmetric with a zero diagonal — a genuine sign-sensitive
    // property of the imaginary part (NOT the tautological fisher = 4·volume identity), so it also
    // exercises the Im-sign path at the QGT level.
    expect(g.berry[0]![0]!).toBeCloseTo(0, 9);
    expect(g.berry[1]![1]!).toBeCloseTo(0, 9);
    expect(g.berry[0]![1]!).toBeCloseTo(-g.berry[1]![0]!, 9);
    expect(Number.isFinite(g.volume)).toBe(true);
  });

  test('the geometry is genuinely STATE-DEPENDENT (not a degenerate constant)', () => {
    // Different points on the Bloch sphere have different parameter-sensitivity, so their QGT volumes
    // must differ — this is exactly what a real geometric faculty provides and a degenerate one cannot.
    const near = mixedStateQuantumGeometricTensor([0.05, 0.0], build, dim).volume;
    const equator = mixedStateQuantumGeometricTensor([Math.PI / 2, 0.0], build, dim).volume;
    expect(Math.abs(equator - near)).toBeGreaterThan(1e-3);
  });

  test('deterministic: same params ⇒ identical geometry', () => {
    const a = mixedStateQuantumGeometricTensor([0.8, 0.3], build, dim);
    const b = mixedStateQuantumGeometricTensor([0.8, 0.3], build, dim);
    expect(b).toEqual(a);
  });
});
