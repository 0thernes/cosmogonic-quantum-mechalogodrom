/**
 * PAIRWISE QUANTUM MUTUAL INFORMATION — which qubits of a pure n-qubit register share information.
 *
 * For qubits a, b of a pure state |ψ⟩ the quantum mutual information is
 *   I(a:b) = S(ρ_a) + S(ρ_b) − S(ρ_ab)   (von Neumann entropies, bits)
 * with ρ_ab the two-qubit reduced density matrix. It is 0 for an uncorrelated pair, 1 bit for any pair of
 * a GHZ state, and reaches its maximum 2 bits for a Bell pair (maximally entangled with each other and
 * with nothing else). It counts classical + quantum correlation together; for a pure GLOBAL state a
 * non-zero value means the pair is correlated through the register's entanglement structure.
 *
 * Single-qubit entropies come in closed form from the Bloch length; the 4×4 two-qubit spectrum uses the
 * standard real embedding ρ = A + iB ↦ [[A, −B], [B, A]] (8×8 real symmetric, each eigenvalue doubled)
 * diagonalised by cyclic Jacobi. Pure leaf module: imports nothing, deterministic, O(n²·2ⁿ).
 *
 * Qubit k is bit k of the basis index (mask 1 << k), matching `QuantumRegister.blochInto`.
 */

const EPS = 1e-12;

/** Shannon term −p·log₂p, 0 at p ≤ EPS. */
function h(p: number): number {
  return p > EPS ? -p * Math.log2(p) : 0;
}

/** Von Neumann entropy (bits) of a one-qubit state with Bloch length r: eigenvalues (1 ± r)/2. */
export function qubitEntropyFromBloch(r: number): number {
  const rr = r < 0 ? 0 : r > 1 ? 1 : r;
  return h((1 + rr) / 2) + h((1 - rr) / 2);
}

/** Rebuild complex amplitudes from Born probabilities and phases (the observatory snapshot form). */
export function amplitudesFromBorn(
  probs: ArrayLike<number>,
  phase: ArrayLike<number>,
): { re: Float64Array; im: Float64Array } {
  const n = probs.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const m = Math.sqrt(Math.max(0, probs[i] ?? 0));
    const ph = phase[i] ?? 0;
    re[i] = m * Math.cos(ph);
    im[i] = m * Math.sin(ph);
  }
  return { re, im };
}

/** Eigenvalues of a real symmetric n×n matrix (row-major, overwritten) by cyclic Jacobi rotations. */
function jacobiEigenvalues(m: Float64Array, n: number): Float64Array {
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += m[p * n + q]! ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = m[p * n + q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const app = m[p * n + p]!;
        const aqq = m[q * n + q]!;
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = m[k * n + p]!;
          const akq = m[k * n + q]!;
          m[k * n + p] = c * akp - s * akq;
          m[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = m[p * n + k]!;
          const aqk = m[q * n + k]!;
          m[p * n + k] = c * apk - s * aqk;
          m[q * n + k] = s * apk + c * aqk;
        }
      }
    }
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = m[i * n + i]!;
  return out;
}

/** Von Neumann entropy (bits) of the two-qubit reduced state ρ_ab of the pure state (re, im). */
function pairEntropy(re: Float64Array, im: Float64Array, a: number, b: number): number {
  // ρ_ab[x][y] = Σ_rest ψ(x,rest)·conj(ψ(y,rest)), x,y ∈ {0..3} encoding (bit a, bit b).
  const A = new Float64Array(16);
  const B = new Float64Array(16);
  const ma = 1 << a;
  const mb = 1 << b;
  const dim = re.length;
  for (let base = 0; base < dim; base++) {
    if ((base & ma) !== 0 || (base & mb) !== 0) continue;
    for (let x = 0; x < 4; x++) {
      const ix = base | (x & 1 ? ma : 0) | (x & 2 ? mb : 0);
      const xr = re[ix]!;
      const xi = im[ix]!;
      for (let y = 0; y < 4; y++) {
        const iy = base | (y & 1 ? ma : 0) | (y & 2 ? mb : 0);
        const yr = re[iy]!;
        const yi = im[iy]!;
        A[x * 4 + y]! += xr * yr + xi * yi;
        B[x * 4 + y]! += xi * yr - xr * yi;
      }
    }
  }
  const m = new Float64Array(64);
  for (let x = 0; x < 4; x++)
    for (let y = 0; y < 4; y++) {
      const ar = A[x * 4 + y]!;
      const bi = B[x * 4 + y]!;
      m[x * 8 + y] = ar;
      m[(x + 4) * 8 + (y + 4)] = ar;
      m[x * 8 + (y + 4)] = -bi;
      m[(x + 4) * 8 + y] = bi;
    }
  const ev = jacobiEigenvalues(m, 8);
  let s = 0;
  for (let i = 0; i < 8; i++) s += h(ev[i]!);
  return s / 2; // every eigenvalue of ρ appears twice in the real embedding
}

/** Pair index order used by {@link pairwiseMutualInformation}: (0,1), (0,2), …, (0,n−1), (1,2), … */
export function pairIndex(a: number, b: number, n: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo * n - (lo * (lo + 1)) / 2 + (hi - lo - 1);
}

/** Single-qubit reduced Bloch length of qubit q of the pure state (re, im). */
function blochLength(re: Float64Array, im: Float64Array, q: number): number {
  const mask = 1 << q;
  let p0 = 0;
  let p1 = 0;
  let cr = 0;
  let ci = 0;
  for (let i = 0; i < re.length; i++) {
    if ((i & mask) !== 0) continue;
    const j = i | mask;
    p0 += re[i]! ** 2 + im[i]! ** 2;
    p1 += re[j]! ** 2 + im[j]! ** 2;
    cr += re[i]! * re[j]! + im[i]! * im[j]!;
    ci += im[i]! * re[j]! - re[i]! * im[j]!;
  }
  return Math.sqrt((2 * cr) ** 2 + (2 * ci) ** 2 + (p0 - p1) ** 2);
}

export interface PairInformation {
  /** Qubit count n. */
  qubits: number;
  /** S(ρ_k) per qubit in bits, 0..1 (0 = unentangled with the rest, 1 = maximally entangled). */
  single: Float64Array;
  /** I(a:b) in bits per pair, 0..2, in {@link pairIndex} order (length n(n−1)/2). */
  mutual: Float64Array;
}

/**
 * Pairwise quantum mutual information of the normalized pure state (re, im) over n = log₂(length)
 * qubits. Values are clamped to their exact ranges to absorb ~1e-12 rounding.
 * @throws RangeError when the amplitude length is not a power of two ≥ 2.
 */
export function pairwiseMutualInformation(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
): PairInformation {
  const dim = re.length;
  const n = Math.round(Math.log2(dim));
  if (dim < 2 || 1 << n !== dim || im.length !== dim) {
    throw new RangeError(`pairwiseMutualInformation: need 2ⁿ amplitudes, got ${dim}`);
  }
  const r = Float64Array.from(re);
  const m = Float64Array.from(im);
  const single = new Float64Array(n);
  for (let q = 0; q < n; q++) single[q] = qubitEntropyFromBloch(blochLength(r, m, q));
  const mutual = new Float64Array((n * (n - 1)) / 2);
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const v = single[a]! + single[b]! - pairEntropy(r, m, a, b);
      mutual[pairIndex(a, b, n)] = v < 0 ? 0 : v > 2 ? 2 : v;
    }
  return { qubits: n, single, mutual };
}
