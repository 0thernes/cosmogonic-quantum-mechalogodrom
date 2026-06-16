/**
 * QUANTUM COHERENCE RESOURCES (V90 / Super Creature 1.1) — the resource theory of coherence
 * (Baumgratz–Cramer–Plenio 2014), the modern quantification of "quantumness" as a usable resource.
 * Coherence is basis-dependent superposition: a state diagonal in the computational basis is incoherent;
 * off-diagonal amplitude is the resource that powers interference, metrology, and quantum advantage.
 *
 * For a PURE state |ψ⟩ = Σ ψ_i |i⟩ (the apex creature's register) both canonical monotones reduce to
 * closed forms read straight off the amplitudes:
 *   • l1-norm of coherence:  C_l1(ρ) = Σ_{i≠j}|ρ_ij| = (Σ_i |ψ_i|)² − 1   (ρ_ij = ψ_i conj(ψ_j)).
 *   • relative entropy of coherence:  C_r(ρ) = S(ρ_diag) − S(ρ) = H({|ψ_i|²})  (S(ρ)=0 for a pure state),
 *     i.e. the Shannon entropy of the Born distribution.
 * Both are exact, eigensolver-free, and bounded: C_l1 ∈ [0, d−1], C_r ∈ [0, log₂ d]. We also return the
 * [0,1]-normalized forms for the boards. A computational-basis state ⇒ 0 (no resource); a uniform
 * superposition ⇒ the maximum. This is a real, measured quantum-resource readout, not flavor.
 *
 * Pure leaf module: imports nothing; deterministic (a pure function of the amplitudes). O(2ⁿ).
 */

/** Read-only coherence readout for the BRAIN view. */
export interface CoherenceSnapshot {
  /** l1-norm of coherence Σ_{i≠j}|ρ_ij| (≥ 0, up to d−1). */
  l1: number;
  /** l1 coherence normalized to [0,1] (÷ (d−1)) — usable superposition fraction. */
  l1Norm: number;
  /** Relative entropy of coherence = Shannon entropy of the Born distribution (bits, up to log₂ d). */
  relEntropy: number;
  /** Relative-entropy coherence normalized to [0,1] (÷ log₂ d). */
  relEntropyNorm: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const EPS = 1e-15;

/**
 * Coherence resources of the pure state given by `re`/`im` amplitudes over `dim = re.length` basis
 * states (assumed normalized). Deterministic, allocation-free, O(dim).
 */
export function quantumCoherence(re: ArrayLike<number>, im: ArrayLike<number>): CoherenceSnapshot {
  const dim = re.length;
  if (dim < 2) return { l1: 0, l1Norm: 0, relEntropy: 0, relEntropyNorm: 0 };
  let sumAbs = 0; // Σ |ψ_i|
  let h = 0; // Shannon entropy of |ψ_i|²
  for (let i = 0; i < dim; i++) {
    const r = re[i] ?? 0;
    const m = im[i] ?? 0;
    const p = r * r + m * m;
    sumAbs += Math.sqrt(p);
    if (p > EPS) h -= p * Math.log2(p);
  }
  const l1 = sumAbs * sumAbs - 1; // (Σ|ψ_i|)² − 1
  const maxL1 = dim - 1;
  const maxH = Math.log2(dim);
  return {
    l1: l1 < 0 ? 0 : l1,
    l1Norm: clamp01(maxL1 > 0 ? l1 / maxL1 : 0),
    relEntropy: h < 0 ? 0 : h,
    relEntropyNorm: clamp01(maxH > 0 ? h / maxH : 0),
  };
}
