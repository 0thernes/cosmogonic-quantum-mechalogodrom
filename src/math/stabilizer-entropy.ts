/**
 * STABILIZER RÉNYI ENTROPY — the "MAGIC" (non-stabilizerness) of a quantum state (V99). The genuinely
 * bleeding-edge resource measure of quantum-COMPUTATIONAL power: stabilizer (Clifford) states are
 * efficiently classically simulable (the Gottesman–Knill theorem), so a state's DISTANCE from the
 * stabilizer polytope — its *magic* — is exactly the resource a quantum computer needs to do anything a
 * classical one cannot. It is distinct from entanglement and from coherence (a highly-entangled GHZ state
 * has ZERO magic; magic is what T-gates / non-Clifford rotations inject).
 *
 * For an n-qubit pure state |ψ⟩, the Pauli spectrum W(P) = ⟨ψ|P|ψ⟩² / 2ⁿ over all 4ⁿ Pauli strings P is a
 * probability distribution (Σ_P W(P) = 1, by Parseval on the Pauli basis). The **linear stabilizer
 * entropy** (the α→2 / "stabilizer purity" form, the cheapest faithful magic monotone-density) is
 *
 *     M_lin = 1 − 2ⁿ · Σ_P W(P)²  =  1 − (1/2ⁿ) Σ_P ⟨ψ|P|ψ⟩⁴   ∈ [0, 1),
 *
 * which is **exactly 0 for every stabilizer state** (|0…0⟩, |+…+⟩, any GHZ / graph state) and grows toward
 * 1 as the state becomes maximally magical (e.g. the single-qubit T-state |T⟩ = T|+⟩ gives M = 1/4, the
 * 1-qubit maximum). Source: Leone, Oliviero & Hamma, "Stabilizer Rényi Entropy", PRL 128, 050402 (2022).
 *
 * Operates directly on the {@link ../sim/quantum} (Moonlab-style) statevector amplitudes. Pure leaf,
 * deterministic (no RNG), allocation-free. Cost O(4ⁿ · 2ⁿ) — for the apex 6-qubit mind that is 4096 Pauli
 * strings × 64 amplitudes ≈ 0.26 M ops, evaluated at UI cadence (NOT per beat), well within budget.
 */

/** Number of set bits in a 32-bit integer (Pauli-string bookkeeping). */
function popcount(v: number): number {
  let x = v - ((v >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >>> 24;
}

/**
 * The linear stabilizer entropy (magic) of an n-qubit pure state given its `2ⁿ` complex amplitudes
 * (`re`/`im`). Returns M_lin ∈ [0, 1): 0 for stabilizer states, larger for more "magical" states. Assumes
 * a normalised statevector (a unitary circuit on |0…0⟩ guarantees it). NaN-guarded; clamped to [0, 1).
 *
 * A Pauli string is addressed by its symplectic pair (x, z), each an n-bit mask: x marks the X/Y qubits,
 * z marks the Z/Y qubits. The Hermitian string is P = i^{|x∧z|} · Xˣ Zᶻ, so
 *     ⟨ψ|P|ψ⟩ = Re( i^{|x∧z|} · Σ_j (−1)^{|z∧j|} · conj(ψ_{j⊕x})·ψ_j ).
 */
export function stabilizerLinearEntropy(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  n: number,
): number {
  const dim = 1 << n;
  let sumP4 = 0; // Σ_P ⟨P⟩⁴
  for (let x = 0; x < dim; x++) {
    for (let z = 0; z < dim; z++) {
      let sr = 0; // real part of Σ_j (−1)^{|z∧j|} conj(ψ_{j⊕x})·ψ_j
      let si = 0; // imag part
      for (let j = 0; j < dim; j++) {
        const jx = j ^ x;
        const sign = (popcount(z & j) & 1) === 0 ? 1 : -1;
        const ar = re[jx] ?? 0;
        const ai = im[jx] ?? 0;
        const br = re[j] ?? 0;
        const bi = im[j] ?? 0;
        // conj(a)·b = (ar·br + ai·bi) + i(ar·bi − ai·br)
        sr += sign * (ar * br + ai * bi);
        si += sign * (ar * bi - ai * br);
      }
      // multiply by i^c and take the real part (the expectation of a Hermitian Pauli is real)
      const c = popcount(x & z) & 3;
      const expP = c === 0 ? sr : c === 1 ? -si : c === 2 ? -sr : si;
      const p2 = expP * expP;
      sumP4 += p2 * p2;
    }
  }
  const m = 1 - sumP4 / dim;
  return Number.isFinite(m) ? (m < 0 ? 0 : m > 1 ? 1 : m) : 0;
}
