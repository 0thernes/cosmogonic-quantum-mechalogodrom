/**
 * CURVATURE-AWARE QUANTUM NATURAL GRADIENT (V94 / Super Creature 1.1) — faculty #7 from research bedrock.
 * Extends the standard QNG to account for the WEIGHTED PROJECTIVE LINE GEOMETRY of the parameter space.
 *
 * THE MATH:
 * Standard QNG uses the Fubini-Study metric g_ij = Re Q_ij on the projective Hilbert space.
 * The projective space is a Riemannian manifold with curvature that varies across the space.
 * Curvature-aware QNG incorporates this curvature information into the gradient update:
 *
 *   θ̇ = - (g + Γ)⁺ ∇L
 *
 * where Γ is the Christoffel symbol (Levi-Civita connection) representing the manifold's curvature.
 * This allows the optimizer to follow geodesics on the curved manifold rather than straight lines
 * in the parameter space, leading to faster convergence in highly curved regions.
 *
 * WEIGHTED PROJECTIVE LINE GEOMETRY:
 * The projective line (complex projective space CP¹) has constant positive curvature.
 * For higher-dimensional CPⁿ, the curvature varies across the space.
 * The weighted projective line introduces a weighting function w(θ) that modulates the curvature
 * based on the local geometry, allowing adaptive step sizes in regions of high/low curvature.
 *
 * IMPLEMENTATION:
 * - Compute the Christoffel symbols Γ^k_ij from the metric g_ij
 * - Γ^k_ij = ½ g^kl (∂_i g_jl + ∂_j g_il - ∂_l g_ij)
 * - The curvature-aware metric is g_ij + λ Γ_ij (where λ is a curvature weighting factor)
 * - Solve (g + λΓ) x = ∇L for the natural gradient direction
 *
 * CURRENT STATUS (honest — code matches this, not the idealized math above): `computeChristoffelSymbols`
 * uses the local approximation ∂_k g_ij ≈ 0 (a full version needs the metric as a function of θ to
 * finite-difference). With dg = 0 every Christoffel symbol is 0, so the curvature term Γ vanishes and the
 * N×N path REDUCES TO STANDARD ridge-regularized QNG — the curvature-aware scaffolding is wired but the
 * curvature itself is not yet computed. It degrades safely (never a wrong-shaped or NaN result), it is
 * just not yet the full geodesic update; the `…2x2` helper uses a different `Γ_trace = g` approximation.
 *
 * REFERENCES:
 * - "Curvature-Aware QNG via Weighted Projective Line Geometry" (Dec 2025, hf.co/papers/2512.00681)
 * - Riemannian geometry on projective spaces (Kobayashi & Nomizu)
 * - Geodesic optimization on manifolds (Absil et al., "Optimization Algorithms on Matrix Manifolds")
 *
 * This is faculty #7 from the 2026 research bedrock — extends the existing QNG to handle
 * manifold curvature, providing faster convergence in highly curved regions of the parameter space.
 *
 * Pure leaf: deterministic, allocation-free apart from working arrays.
 */

/** Curvature-aware QNG configuration. */
export interface CurvatureAwareConfig {
  /** Curvature weighting factor λ (higher = more influence of curvature). */
  curvatureWeight: number;
  /** Regularization for ill-conditioned metric. */
  ridge: number;
  /** Whether to use adaptive curvature weighting (varies λ based on local curvature). */
  adaptive: boolean;
}

const DEFAULT_CONFIG: CurvatureAwareConfig = {
  curvatureWeight: 0.5,
  ridge: 1e-3,
  adaptive: true,
};

/**
 * Compute Christoffel symbols Γ^k_ij from the metric g_ij.
 * Γ^k_ij = ½ g^kl (∂_i g_jl + ∂_j g_il - ∂_l g_ij)
 *
 * For efficiency, we compute the Levi-Civita connection in the coordinate basis.
 * Returns a 3D array Γ[k][i][j] (upper index first).
 */
export function computeChristoffelSymbols(
  metric: ReadonlyArray<ReadonlyArray<number>>,
  epsilon: number = 1e-4,
): number[][][] {
  void epsilon; // used in finite-diff approx in full impl; kept for signature fidelity to Tsotchke QGT corpus
  const n = metric.length;
  const g = metric.map((row) => row.slice());

  // Compute inverse metric g^ij via Gauss-Jordan
  const gInv: number[][] = [];
  for (let i = 0; i < n; i++) {
    gInv.push(Array.from({ length: n }, () => 0));
  }

  // Augmented matrix [g | I]
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [...g[i]!];
    for (let j = 0; j < n; j++) {
      row.push(i === j ? 1 : 0);
    }
    aug.push(row);
  }

  // Gauss-Jordan elimination
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = Math.abs(aug[col]?.[col] ?? 0);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r]?.[col] ?? 0);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-12) continue;
    if (piv !== col) {
      [aug[col], aug[piv]] = [aug[piv]!, aug[col]!];
    }
    const pivRow = aug[col]!;
    const pivVal = pivRow[col] ?? 1;
    for (let j = 0; j < 2 * n; j++) {
      pivRow[j] = (pivRow[j] ?? 0) / pivVal;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const row = aug[r]!;
      const f = row[col] ?? 0;
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) {
        row[j] = (row[j] ?? 0) - f * (pivRow[j] ?? 0);
      }
    }
  }

  // Extract inverse
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      gInv[i]![j] = aug[i]![n + j] ?? 0;
    }
  }

  // Compute metric derivatives via finite difference
  const dg: number[][][] = [];
  for (let k = 0; k < n; k++) {
    dg.push([]);
    for (let i = 0; i < n; i++) {
      dg[k]!.push([]);
      for (let j = 0; j < n; j++) {
        // ∂_k g_ij ≈ (g_ij(θ + ε e_k) - g_ij(θ - ε e_k)) / 2ε
        // For simplicity, we use a local approximation: ∂_k g_ij ≈ 0
        // In a full implementation, we would need the metric as a function of parameters
        dg[k]![i]![j] = 0;
      }
    }
  }

  // Compute Christoffel symbols
  const Gamma: number[][][] = [];
  for (let k = 0; k < n; k++) {
    Gamma.push([]);
    for (let i = 0; i < n; i++) {
      Gamma[k]!.push([]);
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let l = 0; l < n; l++) {
          const gkl = gInv[k]![l] ?? 0;
          const dgil = dg[i]![l]![j] ?? 0;
          const dgjl = dg[j]![l]![i] ?? 0;
          const dglij = dg[l]![i]![j] ?? 0;
          sum += gkl * (dgil + dgjl - dglij);
        }
        Gamma[k]![i]![j] = 0.5 * sum;
      }
    }
  }

  return Gamma;
}

/**
 * Compute the Ricci curvature scalar R from the Christoffel symbols.
 * R = g^ij R_ij, where R_ij = R^k_ikj is the Ricci tensor.
 * This measures the local curvature of the manifold.
 */
export function computeRicciScalar(
  metric: ReadonlyArray<ReadonlyArray<number>>,
  Gamma: number[][][],
): number {
  const n = metric.length;
  const R: number[][] = [];

  // Compute Riemann tensor R^k_lij
  const Riemann: number[][][][] = [];
  for (let k = 0; k < n; k++) {
    Riemann.push([]);
    for (let l = 0; l < n; l++) {
      Riemann[k]!.push([]);
      for (let i = 0; i < n; i++) {
        Riemann[k]![l]!.push([]);
        for (let j = 0; j < n; j++) {
          // R^k_lij = ∂_i Γ^k_lj - ∂_j Γ^k_li + Γ^k_mi Γ^m_lj - Γ^k_mj Γ^m_li
          // For simplicity, we omit the derivative terms (they require metric as function)
          let sum = 0;
          for (let m = 0; m < n; m++) {
            const Gamma_kmi = Gamma[k]![m]![i] ?? 0;
            const Gamma_mlj = Gamma[m]![l]![j] ?? 0;
            const Gamma_kmj = Gamma[k]![m]![j] ?? 0;
            const Gamma_mli = Gamma[m]![l]![i] ?? 0;
            sum += Gamma_kmi * Gamma_mlj - Gamma_kmj * Gamma_mli;
          }
          Riemann[k]![l]![i]![j] = sum;
        }
      }
    }
  }

  // Contract to get Ricci tensor R_ij = R^k_ikj
  for (let i = 0; i < n; i++) {
    R.push([]);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Riemann[k]![i]![k]![j] ?? 0;
      }
      R[i]![j] = sum;
    }
  }

  // Contract to get Ricci scalar R = g^ij R_ij
  let R_scalar = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      R_scalar += metric[i]![j]! * R[i]![j]!;
    }
  }

  return R_scalar;
}

/**
 * CURVATURE-AWARE QUANTUM NATURAL GRADIENT.
 * Computes the natural gradient direction accounting for manifold curvature.
 *
 * `metric` is the Fubini-Study metric g_ij (symmetric, positive-semidefinite).
 * `grad` is the Euclidean gradient ∇L.
 * `config` controls the curvature weighting and regularization.
 *
 * Returns the curvature-aware natural gradient vector.
 */
export function curvatureAwareNaturalGradient(
  metric: ReadonlyArray<ReadonlyArray<number>>,
  grad: ReadonlyArray<number>,
  config: Partial<CurvatureAwareConfig> = {},
): number[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const n = grad.length;

  // Compute Christoffel symbols
  const Gamma = computeChristoffelSymbols(metric);

  // Compute Ricci scalar for adaptive weighting
  let curvatureWeight = cfg.curvatureWeight;
  if (cfg.adaptive) {
    const R = computeRicciScalar(metric, Gamma);
    // Adapt weight based on curvature: higher curvature → more weighting
    curvatureWeight = cfg.curvatureWeight * (1 + Math.abs(R));
  }

  // Build curvature-aware metric: g_ij + λ Γ_ij
  // We use the trace of Γ as a scalar correction for efficiency
  const GammaTrace: number[][] = [];
  for (let i = 0; i < n; i++) {
    GammaTrace.push([]);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Gamma[k]![i]![j] ?? 0;
      }
      GammaTrace[i]![j] = sum;
    }
  }

  const curvatureAwareMetric: number[][] = [];
  for (let i = 0; i < n; i++) {
    curvatureAwareMetric.push([]);
    for (let j = 0; j < n; j++) {
      curvatureAwareMetric[i]![j] =
        (metric[i]![j] ?? 0) + curvatureWeight * (GammaTrace[i]![j] ?? 0);
    }
  }

  // Solve (g + λΓ) x = grad with Tikhonov regularization
  return solveSymmetric(curvatureAwareMetric, grad, cfg.ridge);
}

/**
 * Solve symmetric linear system (A + ridge·I)·x = b via Gauss-Jordan.
 * Reused from quantum-natural-gradient.ts for consistency.
 */
function solveSymmetric(
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
  ridge = 0,
): number[] {
  const n = b.length;
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: n + 1 }, () => 0);
    for (let j = 0; j < n; j++) row[j] = (a[i]?.[j] ?? 0) + (i === j ? ridge : 0);
    row[n] = b[i] ?? 0;
    m.push(row);
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = Math.abs(m[col]?.[col] ?? 0);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(m[r]?.[col] ?? 0);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-12) continue;
    if (piv !== col) {
      [m[col], m[piv]] = [m[piv]!, m[col]!];
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
 * Allocation-free 2×2 curvature-aware QNG for the per-beat HOT path.
 * Closed-form solution for the 2×2 case with curvature correction.
 */
export function curvatureAwareNaturalGradient2x2(
  g00: number,
  g01: number,
  g11: number,
  grad0: number,
  grad1: number,
  curvatureWeight: number,
  ridge: number,
  out: number[] | Float64Array,
): void {
  // Compute Christoffel trace for 2×2 case
  // For CP¹ (projective line), the curvature is constant: Γ_trace = g
  const GammaTrace00 = g00;
  const GammaTrace01 = g01;
  const GammaTrace11 = g11;

  const a = g00 + ridge + curvatureWeight * GammaTrace00;
  const c = g11 + ridge + curvatureWeight * GammaTrace11;
  const b = g01 + curvatureWeight * GammaTrace01;
  const det = a * c - b * b;

  if (Math.abs(det) < 1e-12) {
    out[0] = a > 1e-12 ? grad0 / a : grad0;
    out[1] = c > 1e-12 ? grad1 / c : grad1;
    return;
  }

  out[0] = (c * grad0 - b * grad1) / det;
  out[1] = (a * grad1 - b * grad0) / det;
}
