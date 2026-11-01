/**
 * QUANTUM MAGIC — STABILIZER RÉNYI ENTROPY (Super Creature 1.1). "Magic" (non-stabilizerness) is the
 * deepest, most genuinely bleeding-edge quantum resource: the quantity (Leone, Oliviero & Hamma, PRL
 * 128, 050402, 2022) that measures the quantumness a state carries BEYOND entanglement — precisely the
 * resource that makes a quantum state hard for any classical (Clifford/stabilizer) computer to simulate.
 * Stabilizer states — everything a Clifford circuit reaches (|0…0⟩, |+…+⟩, GHZ, Bell pairs) — have ZERO
 * magic; a state needs magic (a T-gate, a non-Clifford rotation) before a quantum computer is even
 * universal. So this is, literally, the measure of how far the apex creature's thought has stepped
 * OUTSIDE the classically-simulable — the "beyond the beyond" of its quantum cognition.
 *
 * THE MATH (exact, falsifiable). For a pure n-qubit state |ψ⟩ (d = 2ⁿ), take the Pauli spectrum over all
 * 4ⁿ Pauli strings P ∈ {I,X,Y,Z}^⊗n:  Ξ_P = ⟨ψ|P|ψ⟩² / d  — a probability distribution (Σ_P Ξ_P = 1 for
 * any pure state, since Σ_P ⟨ψ|P|ψ⟩² = d). The STABILIZER 2-RÉNYI ENTROPY is
 *     M₂(ψ) = −log₂( d · Σ_P Ξ_P² )  =  −log₂( (1/d) Σ_P ⟨ψ|P|ψ⟩⁴ ).
 * M₂ ≥ 0, with M₂ = 0 iff |ψ⟩ is a stabilizer state, and M₂ > 0 for magic states — an additive monotone,
 * non-increasing under Clifford operations and computational-basis measurement. We return M₂, the
 * normalized M₂/log₂d ∈ [0,1), and a `stabilizer` flag (M₂ ≈ 0). Closed-form checks: any stabilizer
 * state → 0; a single T|+⟩ qubit → M₂ = log₂(4/3) ≈ 0.415.
 *
 * Cost: 4ⁿ Pauli expectations, each O(n·2ⁿ) to apply the string — for n = 6 that is 4096 strings ≈ 2M
 * real mults, computed at the Observatory UI/cognitive cadence for the LONE apex creature, never per
 * simulation beat. Pure leaf module: imports nothing; deterministic (a pure function of the amplitudes).
 * Eshkol/Moonlab/QGTL lineage: it reads the Moonlab-style statevector through the Pauli group that QGTL's
 * RX/RY/RZ/CNOT gate set is generated from.
 */

/** Read-only magic (non-stabilizerness) readout for the BRAIN view. */
export interface MagicSnapshot {
  /** Qubit count the measure was taken over. */
  qubits: number;
  /** Stabilizer 2-Rényi entropy M₂ ≥ 0 — non-stabilizerness ("magic"); 0 = a Clifford/stabilizer state. */
  magic: number;
  /** M₂ normalized by log₂(d) ∈ [0,1) — how deep into the non-(classically-)simulable the state sits. */
  magicNorm: number;
  /** Whether the state is (numerically) a stabilizer state — zero magic. */
  stabilizer: boolean;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const MAGIC_EPS = 1e-9;

/** Reused copies of the amplitudes as doubles (the exact same values the reads produced). */
let scratchRe = new Float64Array(64);
let scratchIm = new Float64Array(64);

function popcount(v: number): number {
  let x = v - ((v >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Stabilizer 2-Rényi entropy (quantum "magic") of the pure state given by the `re`/`im` amplitudes over
 * `1<<nQubits` basis states (assumed normalized). Sums ⟨ψ|P|ψ⟩⁴ over all 4ⁿ Pauli strings by applying
 * each string to a reused work buffer (X = bit-swap, Y = swap+phase, Z = phase). Deterministic and allocation-free
 * apart from the returned snapshot. For n < 1, magic = 0.
 */
export function quantumMagic(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  nQubits: number,
): MagicSnapshot {
  const dim = 1 << nQubits;
  if (nQubits < 1) return { qubits: nQubits, magic: 0, magicNorm: 0, stabilizer: true };
  const total = 4 ** nQubits; // number of Pauli strings
  if (scratchRe.length < dim) {
    scratchRe = new Float64Array(dim);
    scratchIm = new Float64Array(dim);
  }
  const sr = scratchRe;
  const si = scratchIm;
  for (let i = 0; i < dim; i++) {
    sr[i] = re[i] ?? 0;
    si[i] = im[i] ?? 0;
  }
  // (Pψ)_i = phase(i)·ψ_{i⊕x}: each factor only swaps (X/Y) or multiplies by ±1/±i (Y/Z) the bit it acts on,
  // so the applied string is read straight off the masks — the same exact values the old in-place
  // application produced (sign flips and swaps are exact), summed in the same order: bit-identical.
  let sum4 = 0; // Σ_P ⟨ψ|P|ψ⟩⁴
  for (let s = 0; s < total; s++) {
    let xm = 0;
    let ym = 0;
    let zm = 0;
    for (let q = 0; q < nQubits; q++) {
      const p = (s >> (2 * q)) & 3;
      if (p === 1) xm |= 1 << q;
      else if (p === 2) {
        xm |= 1 << q;
        ym |= 1 << q;
      } else if (p === 3) zm |= 1 << q;
    }
    // Y on bit 1 → ·i, on bit 0 → ·(−i) ≡ ·i³; Z on bit 1 → ·(−1) ≡ ·i². Summed mod 4 that is a constant
    // i^(3·|Y|) times (−1)^parity(i & (Y⊕Z)) — exact rotations and sign flips only.
    const k0 = (3 * popcount(ym)) & 3;
    const pm = ym ^ zm;
    let exp = 0;
    for (let i = 0; i < dim; i++) {
      const j = i ^ xm;
      const r = sr[j]!;
      const c = si[j]!;
      const k = (k0 + 2 * (popcount(pm & i) & 1)) & 3;
      let wr: number;
      let wi: number;
      if (k === 0) {
        wr = r;
        wi = c;
      } else if (k === 1) {
        wr = -c;
        wi = r;
      } else if (k === 2) {
        wr = -r;
        wi = -c;
      } else {
        wr = c;
        wi = -r;
      }
      exp += sr[i]! * wr + si[i]! * wi;
    }
    sum4 += exp * exp * exp * exp;
  }
  // M₂ = −log₂( (1/d) Σ ⟨P⟩⁴ ); a stabilizer state has Σ⟨P⟩⁴ = d ⇒ M₂ = 0.
  const ratio = sum4 / dim;
  let magic = ratio > 0 ? -Math.log2(ratio) : 0;
  if (magic < 0) magic = 0; // float guard (ratio can land at 1+ε for stabilizer states)
  const magicNorm = clamp01(nQubits > 0 ? magic / nQubits : 0); // log₂(d) = nQubits
  return { qubits: nQubits, magic, magicNorm, stabilizer: magic < MAGIC_EPS };
}
