/**
 * QUANTUM NATURAL GRADIENT (V93 / Super Creature 1.1 — quantum self-optimization). Stokes, Izaac,
 * Killoran & Carleo, "Quantum Natural Gradient", _Quantum_ 4, 269 (2020),
 * https://doi.org/10.22331/q-2020-05-25-269 (building on Amari's natural gradient, 1998, and the
 * parameter-shift rule — Mitarai et al. 2018, Schuld et al. 2019).
 *
 * Ordinary gradient descent on a variational quantum circuit steps in the flat EUCLIDEAN parameter
 * space, oblivious to how the underlying state |ψ(θ)⟩ actually moves. The NATURAL gradient steps on the
 * curved projective Hilbert manifold instead, preconditioning the Euclidean gradient by the inverse
 * Fubini–Study metric (= the real part of the Quantum Geometric Tensor, = ¼·the quantum Fisher
 * information):
 *
 *     θ̇ = − g⁺ ∇L ,      g = Re Q   (the Fubini–Study / quantum-Fisher metric).
 *
 * It is the steepest descent in the geometry the state truly inhabits — provably faster, and the
 * standard modern optimiser for variational quantum eigensolvers. The Super Creature already computes
 * its QGT each beat ({@link quantumGeometricTensor}); this module turns that geometry into the
 * preconditioner, so the apex mind can DESCEND its own thought-space, not merely feel its curvature.
 *
 * The metric can be singular (degenerate directions / barren spots), so we solve the TIKHONOV-regularised
 * system (g + λI) x = ∇L — the standard QNG ridge that keeps the step finite where g loses rank. The
 * solver is Gauss–Jordan with partial pivoting: a 2×2 solve for the mind's two cognition knobs, but
 * general N×N for the tests and any future knobs.
 *
 * Pure leaf: imports nothing; deterministic (a pure function of its inputs); allocation-free apart from
 * the small working copies a solve needs.
 */

/**
 * Solve the symmetric, Tikhonov-regularised linear system (A + ridge·I)·x = b for x, by Gauss–Jordan
 * elimination with partial pivoting. `a` is an N×N matrix (row-major nested arrays); `b` is length N;
 * `ridge` ≥ 0 is added to the diagonal (regularising a singular/ill-conditioned A). Returns a fresh
 * length-N array. If a pivot is still ~0 after regularisation, that row's unknown is left at 0 (the
 * safe, finite fallback — no NaN/∞ ever leaves this function).
 */
export function solveSymmetric(
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
  ridge = 0,
): number[] {
  const n = b.length;
  // Augmented matrix [A+ridge·I | b], deep-copied so the inputs are never mutated.
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: n + 1 }, () => 0);
    for (let j = 0; j < n; j++) row[j] = (a[i]?.[j] ?? 0) + (i === j ? ridge : 0);
    row[n] = b[i] ?? 0;
    m.push(row);
  }
  for (let col = 0; col < n; col++) {
    // partial pivot: the row (at/below col) with the largest |entry| in this column
    let piv = col;
    let best = Math.abs(m[col]?.[col] ?? 0);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(m[r]?.[col] ?? 0);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-12) continue; // singular column even after ridge → leave x[col] = 0 (finite fallback)
    if (piv !== col) {
      const t = m[col]!;
      m[col] = m[piv]!;
      m[piv] = t;
    }
    const pivRow = m[col]!;
    const pivVal = pivRow[col] ?? 1;
    for (let j = col; j <= n; j++) pivRow[j] = (pivRow[j] ?? 0) / pivVal;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const row = m[r]!;
      const f = row[col] ?? 0;
      if (f === 0) continue;
      for (let j = col; j <= n; j++) row[j] = (row[j] ?? 0) - f * (pivRow[j] ?? 0);
    }
  }
  const x = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) x[i] = m[i]?.[n] ?? 0;
  return x;
}

/**
 * The QUANTUM NATURAL GRADIENT direction g⁺·∇L: the Euclidean gradient `grad` preconditioned by the
 * (regularised) inverse Fubini–Study metric `metric`. Returns the natural-gradient vector — the caller
 * picks the sign (subtract it to MINIMISE a loss, add it to MAXIMISE an objective such as the Born
 * probability of an intended thought). With an identity metric and ridge 0 this is exactly `grad`
 * (flat space ⇒ natural = ordinary); with a diagonal metric it rescales each axis by 1/g_ii — the
 * defining property of the natural gradient. Because g (+λI) is symmetric positive-definite, the
 * natural gradient stays in the ascent half-space of `grad` (grad·ng ≥ 0): it never reverses the
 * objective, only re-weights it by the state-space geometry.
 */
export function naturalGradient(
  metric: ReadonlyArray<ReadonlyArray<number>>,
  grad: ReadonlyArray<number>,
  ridge = 1e-3,
): number[] {
  return solveSymmetric(metric, grad, ridge);
}

/** Euclidean L2 norm of a vector — a small shared helper for natural-gradient telemetry. */
export function vecNorm(v: ReadonlyArray<number>): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i] ?? 0;
    s += x * x;
  }
  return Math.sqrt(s);
}

/** Dot product of two equal-length vectors (the predicted ascent rate ∇L·ng for QNG telemetry). */
export function vecDot(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  let s = 0;
  const n = a.length < b.length ? a.length : b.length;
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
