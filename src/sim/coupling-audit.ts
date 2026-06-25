/**
 * COUPLING AUDIT — measuring whether the faculties actually INTERACT (EMERGENCE-BLOCKERS #10 + #14).
 *
 * The project's thesis is COUPLING > COUNT: a hundred faculties that don't densely interact are a pile,
 * not a mind. The pre-mortem names two failure modes this instrument is built to catch — #10 "faculties
 * that don't couple (read-only, no write-back)" and #14 "decorative faculties (named after a theory, no
 * real mechanism)". This turns "are they coupled?" from a slogan into a measured receipt: feed it a
 * recorded run of per-beat faculty activations and it reports how statistically interdependent the
 * assembly is, and which faculties (if any) move independently of everyone else.
 *
 * HONESTY (the hard part — do not repeat the SOC overclaim): this measures statistical INTERDEPENDENCE
 * (Pearson co-variation), NOT proven causal read/write. Correlation is not causation; two faculties can
 * co-vary because they share an input rather than because one writes to the other. The lagged measure
 * ({@link laggedInfluence}) is a lead-lag DIRECTIONAL HINT, not a causal claim. The causal gold standard
 * is ablation/perturbation (knock a faculty out, see what downstream changes) — that is future work; this
 * is the cheaper, always-deterministic screening layer that flags decoupled/decorative candidates.
 *
 * PURE: no rng, no clock, no DOM, no input mutation — determinism-law-safe and headlessly testable.
 */

/**
 * PEARSON correlation of two equal-length series, in [-1, 1]. Returns 0 when either series is constant
 * (no linear relationship is detectable) or when lengths differ / are < 2. Pure.
 */
export function pearson(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] ?? 0;
    mb += b[i] ?? 0;
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - ma;
    const db = (b[i] ?? 0) - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va <= 1e-12 || vb <= 1e-12) return 0; // a constant series has no linear coupling signature
  const r = cov / Math.sqrt(va * vb);
  return r < -1 ? -1 : r > 1 ? 1 : r;
}

/**
 * LAGGED INFLUENCE — a directional LEAD-LAG hint: `pearson(a[0 .. T-lag-1], b[lag .. T-1])`, i.e. how
 * faculty `a` at time t lines up with faculty `b` at time t+lag. High |value| suggests `a` tends to lead
 * `b` by `lag` beats (a write-then-read pattern). This is a HINT toward direction, NOT a causal proof
 * (cf. Granger/transfer-entropy caveats). Pure; lag ≤ 0 falls back to the instantaneous correlation.
 */
export function laggedInfluence(a: readonly number[], b: readonly number[], lag = 1): number {
  if (lag <= 0) return pearson(a, b);
  const n = Math.min(a.length, b.length);
  if (n - lag < 2) return 0;
  return pearson(a.slice(0, n - lag), b.slice(lag, n));
}

/** A measured report on how interdependent a faculty assembly is over a recorded run. */
export interface CouplingReport {
  /** Number of faculties audited. */
  readonly n: number;
  /** N×N Pearson correlation matrix (diagonal = 1 for non-constant faculties, else 0). */
  readonly correlation: number[][];
  /** Per-faculty embeddedness: the mean |correlation| with every OTHER faculty. */
  readonly perFaculty: number[];
  /** Fraction of distinct faculty PAIRS whose |correlation| ≥ threshold (overall coupling density). */
  readonly density: number;
  /** Mean |correlation| over all distinct off-diagonal pairs. */
  readonly meanAbsCoupling: number;
  /** Faculties whose strongest |correlation| with ANY other is below threshold — decoupled/decorative
   *  candidates (the #10/#14 red flags). An empty array means every faculty is coupled to the assembly. */
  readonly isolated: number[];
}

/**
 * COUPLING REPORT — audit an assembly from `series[f]` = faculty f's per-beat activation time-series
 * (all the same length T). Computes the correlation matrix, per-faculty embeddedness, overall density,
 * and the isolated/decoupled faculties at the given |correlation| `threshold`. Pure; inputs untouched.
 */
export function couplingReport(
  series: readonly (readonly number[])[],
  threshold = 0.3,
): CouplingReport {
  const n = series.length;
  const correlation: number[][] = [];
  for (let i = 0; i < n; i++) {
    correlation[i] = Array.from({ length: n }, () => 0);
  }
  for (let i = 0; i < n; i++) {
    const row = correlation[i]!;
    row[i] = pearson(series[i] ?? [], series[i] ?? []); // 1 for a varying faculty, 0 for a constant one
    for (let j = i + 1; j < n; j++) {
      const c = pearson(series[i] ?? [], series[j] ?? []);
      row[j] = c;
      correlation[j]![i] = c;
    }
  }

  const perFaculty = Array.from({ length: n }, () => 0);
  let pairCount = 0;
  let coupledPairs = 0;
  let absSum = 0;
  for (let i = 0; i < n; i++) {
    let sumAbs = 0;
    let maxAbs = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = Math.abs(correlation[i]![j] ?? 0);
      sumAbs += a;
      if (a > maxAbs) maxAbs = a;
    }
    perFaculty[i] = n > 1 ? sumAbs / (n - 1) : 0;
    correlation[i]![i] = correlation[i]![i] ?? 0; // keep diag well-defined
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = Math.abs(correlation[i]![j] ?? 0);
      pairCount++;
      absSum += a;
      if (a >= threshold) coupledPairs++;
    }
  }
  const isolated: number[] = [];
  for (let i = 0; i < n; i++) {
    let maxAbs = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = Math.abs(correlation[i]![j] ?? 0);
      if (a > maxAbs) maxAbs = a;
    }
    if (maxAbs < threshold) isolated.push(i);
  }

  return {
    n,
    correlation,
    perFaculty,
    density: pairCount > 0 ? coupledPairs / pairCount : 0,
    meanAbsCoupling: pairCount > 0 ? absSum / pairCount : 0,
    isolated,
  };
}
