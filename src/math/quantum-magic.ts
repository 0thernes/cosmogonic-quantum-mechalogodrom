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

/**
 * Per-shift pair products for small registers (dim ≤ PAIR_TABLE_MAX_DIM): for xm and i, with j = i ⊕ xm,
 * pairT[xm·dim + i] = sr_i·sr_j + si_i·si_j and pairU[xm·dim + i] = −(sr_i·si_j) + si_i·sr_j. Since g = ±1
 * and round-to-nearest is sign-symmetric, sr_i·(g·sr_j) + si_i·(g·si_j) === g·pairT exactly (same for the
 * odd-phase form and pairU), so each Pauli string's term is ±pairT/±pairU: bit-identical, 2 fewer muls.
 */
const PAIR_TABLE_MAX_DIM = 256;
let pairT = new Float64Array(0);
let pairU = new Float64Array(0);

/** parity(i) = popcount(i) & 1 for i < its length (grown on demand). */
let parityTable = new Uint8Array(0);

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
  if (!Number.isInteger(nQubits) || nQubits < 1 || nQubits > 6) {
    return { qubits: nQubits, magic: 0, magicNorm: 0, stabilizer: true };
  }
  const dim = 1 << nQubits;
  if (re.length < dim || im.length < dim) {
    return { qubits: nQubits, magic: 0, magicNorm: 0, stabilizer: true };
  }
  const total = 4 ** nQubits; // number of Pauli strings
  if (scratchRe.length < dim) {
    scratchRe = new Float64Array(dim);
    scratchIm = new Float64Array(dim);
  }
  if (parityTable.length < dim) {
    parityTable = new Uint8Array(dim);
    for (let i = 0; i < dim; i++) parityTable[i] = popcount(i) & 1;
  }
  const parity = parityTable;
  const sr = scratchRe;
  const si = scratchIm;
  for (let i = 0; i < dim; i++) {
    sr[i] = re[i] ?? 0;
    si[i] = im[i] ?? 0;
  }
  // (Pψ)_i = phase(i)·ψ_{i⊕x}: each factor only swaps (X/Y) or multiplies by ±1/±i (Y/Z) the bit it acts on,
  // so the applied string is read straight off the masks — the same exact values the old in-place
  // application produced (sign flips and swaps are exact), summed in the same order: bit-identical.
  if (dim <= PAIR_TABLE_MAX_DIM) {
    const need = dim * dim;
    if (pairT.length < need) {
      pairT = new Float64Array(need);
      pairU = new Float64Array(need);
    }
    const pt = pairT;
    const pu = pairU;
    for (let xm = 0; xm < dim; xm++) {
      const row = xm * dim;
      for (let i = 0; i < dim; i++) {
        const j = i ^ xm;
        const ri = sr[i]!;
        const ii = si[i]!;
        const rj = sr[j]!;
        const ij = si[j]!;
        pt[row + i] = ri * rj + ii * ij;
        pu[row + i] = -(ri * ij) + ii * rj;
      }
    }
    let sum4 = 0;
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
      const k0 = (3 * popcount(ym)) & 3;
      const pm = ym ^ zm;
      const flip = k0 === 0 || k0 === 1 ? 0 : 1; // base = −1 ⇔ flip
      const tab = (k0 & 1) === 0 ? pt : pu;
      const row = xm * dim;
      let exp = 0;
      for (let i = 0; i < dim; i++) {
        const v = tab[row + i]!;
        exp += (parity[pm & i]! ^ flip) === 0 ? v : -v;
      }
      sum4 += exp * exp * exp * exp;
    }
    return magicSnapshot(nQubits, sum4, dim);
  }
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
    // k = k0 + 2·parity(pm & i) (mod 4). For even k0 the factor is ±1 on (r, c); for odd k0 it is ±1 on
    // (−c, r). Multiplying by ±1 is exact (same value, same signed zero as unary minus), so a per-i sign
    // read from a parity table replaces the 4-way branch: bit-identical.
    const base = k0 === 0 || k0 === 1 ? 1 : -1;
    let exp = 0;
    if ((k0 & 1) === 0) {
      for (let i = 0; i < dim; i++) {
        const j = i ^ xm;
        const g = parity[pm & i] === 0 ? base : -base;
        exp += sr[i]! * (g * sr[j]!) + si[i]! * (g * si[j]!);
      }
    } else {
      for (let i = 0; i < dim; i++) {
        const j = i ^ xm;
        const g = parity[pm & i] === 0 ? base : -base;
        exp += sr[i]! * (g * -si[j]!) + si[i]! * (g * sr[j]!);
      }
    }
    sum4 += exp * exp * exp * exp;
  }
  return magicSnapshot(nQubits, sum4, dim);
}

function magicSnapshot(nQubits: number, sum4: number, dim: number): MagicSnapshot {
  // M₂ = −log₂( (1/d) Σ ⟨P⟩⁴ ); a stabilizer state has Σ⟨P⟩⁴ = d ⇒ M₂ = 0.
  const ratio = sum4 / dim;
  let magic = ratio > 0 ? -Math.log2(ratio) : 0;
  if (magic < 0) magic = 0; // float guard (ratio can land at 1+ε for stabilizer states)
  const magicNorm = clamp01(nQubits > 0 ? magic / nQubits : 0); // log₂(d) = nQubits
  return { qubits: nQubits, magic, magicNorm, stabilizer: magic < MAGIC_EPS };
}
