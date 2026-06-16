/**
 * THE QUANTUM GEOMETRIC TENSOR (V84) — a TypeScript port of the core primitive from the Tsotchke
 * Quantum-Geometric-Tensor library (QGTL) + Moonlab `quantum_geometry/qgt.c`, computed over a
 * parameterised quantum state. Given a state |ψ(θ)⟩ that depends on real parameters θ, the QGT is the
 * gauge-invariant complex tensor
 *
 *     Q_ij = ⟨∂_iψ|∂_jψ⟩ − ⟨∂_iψ|ψ⟩⟨ψ|∂_jψ⟩
 *
 * whose **real part is the Fubini–Study metric** g_ij = Re Q_ij (how far the state moves on the
 * projective Hilbert manifold per unit of parameter change) and whose **imaginary part is the Berry
 * curvature** Ω_ij = Im Q_ij (the geometric-phase holonomy). The metric trace is the "quantum volume"
 * (total state sensitivity to its own control parameters); four times the QGT is the quantum Fisher
 * information. Upstream computes the parameter derivatives by the parameter-shift rule / finite
 * difference (`quantum_geometric_metric.c`, `quantum_geometric_gradient.c`); we use the same central
 * finite difference, matched to the upstream ε fallback (1e-6, relaxed for f64 circuits).
 *
 * UPSTREAM (ported, with attribution — see NOTICE.md):
 *   tsotchke/quantum_geometric_tensor (QGTL) — `src/quantum_geometric/core/quantum_geometric_metric.c`
 *   + `…_curvature.c` + `…_gradient.c`, and Moonlab `src/algorithms/quantum_geometry/qgt.c` (both MIT,
 *   © 2024–2026 tsotchke). The QGT/Fubini–Study/Berry definitions and the parameter-shift derivative
 *   method are reproduced; the statevector itself is the project's own {@link QuantumRegister} (a
 *   Moonlab-style simulator), supplied via the `buildState` callback. References: Provost & Vallée
 *   (1980); Berry (1984); Fukui–Hatsugai–Suzuki (2005).
 *
 * Pure leaf module — imports nothing. One call rebuilds the state 2·P+1 times (P = parameter count);
 * the Super Creature evaluates it over P=2 behavioural drives at UI cadence, so the cost is a handful of
 * 64-amplitude circuit rebuilds — well within budget.
 */

/** The geometry of a parameterised quantum state at a point θ. */
export interface QuantumGeometry {
  /** Parameter count P (= side length of the square tensors). */
  params: number;
  /** Fubini–Study metric g_ij = Re Q_ij (P×P, symmetric, positive-semidefinite). */
  metric: number[][];
  /** Berry curvature Ω_ij = Im Q_ij (P×P, antisymmetric — the geometric phase). */
  berry: number[][];
  /** "Quantum volume" = trace(g): total state sensitivity to its control parameters (≥ 0). */
  volume: number;
  /** Quantum Fisher information (trace) = 4·volume. */
  fisher: number;
  /** Mean |Ω_ij| over i<j: how much geometric phase the parameter space carries (≥ 0). */
  berryMagnitude: number;
}

/** Hermitian inner product ⟨a|b⟩ = Σ conj(aᵢ)·bᵢ over `dim` complex components → [re, im]. */
function inner(
  aRe: Float64Array,
  aIm: Float64Array,
  bRe: Float64Array,
  bIm: Float64Array,
  dim: number,
  out: [number, number],
): void {
  let re = 0;
  let im = 0;
  for (let i = 0; i < dim; i++) {
    const ar = aRe[i] ?? 0;
    const ai = aIm[i] ?? 0;
    const br = bRe[i] ?? 0;
    const bi = bIm[i] ?? 0;
    re += ar * br + ai * bi; // Re(conj(a)·b)
    im += ar * bi - ai * br; // Im(conj(a)·b)
  }
  out[0] = re;
  out[1] = im;
}

/**
 * Compute the quantum geometric tensor of a parameterised state at the point `params`.
 *
 * `buildState(p, outRe, outIm)` must write the `dim` complex amplitudes of |ψ(p)⟩ into the caller's
 * buffers (the state is assumed normalised, as a unitary circuit on |0…0⟩ guarantees). It is invoked
 * with shifted copies of `params`; it must not retain the arrays. `epsilon` is the central-difference
 * step (default 1e-4). Allocation happens once per call (UI/cognitive cadence).
 */
export function quantumGeometricTensor(
  params: readonly number[],
  buildState: (p: readonly number[], outRe: Float64Array, outIm: Float64Array) => void,
  dim: number,
  epsilon = 1e-4,
): QuantumGeometry {
  const P = params.length;
  const baseRe = new Float64Array(dim);
  const baseIm = new Float64Array(dim);
  buildState(params, baseRe, baseIm);

  // ∂_iψ via central difference: [ψ(θ+ε eᵢ) − ψ(θ−ε eᵢ)] / 2ε.
  const dRe: Float64Array[] = [];
  const dIm: Float64Array[] = [];
  const plusRe = new Float64Array(dim);
  const plusIm = new Float64Array(dim);
  const minusRe = new Float64Array(dim);
  const minusIm = new Float64Array(dim);
  const shifted = params.slice();
  for (let i = 0; i < P; i++) {
    const base = params[i] ?? 0;
    shifted[i] = base + epsilon;
    buildState(shifted, plusRe, plusIm);
    shifted[i] = base - epsilon;
    buildState(shifted, minusRe, minusIm);
    shifted[i] = base;
    const gr = new Float64Array(dim);
    const gi = new Float64Array(dim);
    const inv = 1 / (2 * epsilon);
    for (let k = 0; k < dim; k++) {
      gr[k] = ((plusRe[k] ?? 0) - (minusRe[k] ?? 0)) * inv;
      gi[k] = ((plusIm[k] ?? 0) - (minusIm[k] ?? 0)) * inv;
    }
    dRe.push(gr);
    dIm.push(gi);
  }

  // ⟨∂_iψ|ψ⟩ for every i (used in the connection-subtraction term).
  const diPsi: [number, number][] = [];
  const tmp: [number, number] = [0, 0];
  for (let i = 0; i < P; i++) {
    inner(dRe[i]!, dIm[i]!, baseRe, baseIm, dim, tmp);
    diPsi.push([tmp[0], tmp[1]]);
  }

  const metric: number[][] = [];
  const berry: number[][] = [];
  let volume = 0;
  let berrySum = 0;
  let berryCount = 0;
  for (let i = 0; i < P; i++) {
    metric.push(Array.from({ length: P }, () => 0));
    berry.push(Array.from({ length: P }, () => 0));
  }
  for (let i = 0; i < P; i++) {
    for (let j = 0; j < P; j++) {
      inner(dRe[i]!, dIm[i]!, dRe[j]!, dIm[j]!, dim, tmp);
      const qiqjRe = tmp[0];
      const qiqjIm = tmp[1];
      // ⟨∂_iψ|ψ⟩·⟨ψ|∂_jψ⟩, where ⟨ψ|∂_jψ⟩ = conj(⟨∂_jψ|ψ⟩).
      const ai = diPsi[i]![0];
      const bi = diPsi[i]![1];
      const aj = diPsi[j]![0];
      const bj = -diPsi[j]![1];
      const prodRe = ai * aj - bi * bj;
      const prodIm = ai * bj + bi * aj;
      const re = qiqjRe - prodRe; // Re Q_ij → Fubini–Study metric
      const im = qiqjIm - prodIm; // Im Q_ij → Berry curvature
      metric[i]![j] = re;
      berry[i]![j] = im;
      if (i === j) volume += re;
      if (i < j) {
        berrySum += Math.abs(im);
        berryCount++;
      }
    }
  }

  return {
    params: P,
    metric,
    berry,
    volume,
    fisher: 4 * volume,
    berryMagnitude: berryCount > 0 ? berrySum / berryCount : 0,
  };
}
