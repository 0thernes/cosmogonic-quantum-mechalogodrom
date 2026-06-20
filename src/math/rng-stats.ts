/**
 * rng-stats.ts — deterministic randomness-quality battery (leaf, exclusive owner).
 *
 * A faithful TypeScript reimplementation of the Tsotchke `quantum_rng` statistical
 * test suite (`tests/quantum_stats.c` + `tests/statistical/statistical_tests.h`,
 * MIT © 2024–2026 tsotchke). The C original draws live samples from a `qrng_ctx`;
 * this port instead operates on a **already-materialised sample buffer**, so it is
 * pure, allocation-light, and free of any entropy source of its own — it never
 * calls `Rng`, `Math.random`, or `Date.now`. The same buffer always yields the
 * same report (Manhattan: determinism is divinity).
 *
 * It exists so Cosmogonic can *measure the quality* of its own seeded entropy
 * streams (`eshkol-qrng.ts`, `rng.ts`) instead of asserting it — a real provenance
 * gate rather than a magic constant. Every figure here is computed from the buffer.
 *
 * Upstream metric provenance (`quantum_stats.c`):
 *  - `calculate_entropy`        → {@link shannonEntropy}
 *  - `chi_square_test`          → {@link chiSquareUniform}
 *  - `serial_correlation`       → {@link serialCorrelation}
 *  - `bit_distribution`/monobit → {@link monobitFraction}
 *  - `longest_run`              → {@link longestRunBits}
 *  - `collapse_consistency`/`superposition_measure` (mean Hamming of consecutive
 *    draws / bit-width, ideal ≈0.5) → {@link hammingFlow}
 *  - `entanglement_score` (windowed −log2 of XOR popcount fraction) →
 *    {@link windowedXorEntropy}
 *  - `quantum_correlation` (mean product of consecutive normalised draws) →
 *    {@link productCorrelation}
 */

/** Population-count of the low `bits` bits of a non-negative safe integer. O(bits). */
export function popcount(value: number, bits = 32): number {
  // Work in two 26-bit halves to stay inside exact f64 integer range for bits>32.
  let v = Math.trunc(Math.abs(value));
  let count = 0;
  for (let i = 0; i < bits && v > 0; i++) {
    count += v % 2;
    v = Math.floor(v / 2);
  }
  return count;
}

/**
 * Shannon entropy (bits) of the symbol distribution of `values`, each value taken
 * modulo `symbols`. Max = log2(symbols) for a perfectly flat distribution; 0 for a
 * constant stream. Default `symbols = 256` measures byte-entropy (ideal ≈8). O(n).
 */
export function shannonEntropy(values: ArrayLike<number>, symbols = 256): number {
  const n = values.length;
  if (n === 0 || symbols <= 1) return 0;
  const counts = new Float64Array(symbols);
  for (let i = 0; i < n; i++) {
    const s = ((Math.trunc(values[i]!) % symbols) + symbols) % symbols;
    counts[s]! += 1;
  }
  let h = 0;
  for (let s = 0; s < symbols; s++) {
    const c = counts[s]!;
    if (c > 0) {
      const p = c / n;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

/**
 * Pearson χ² statistic for a uniform null over `bins` equiprobable buckets (values
 * taken modulo `bins`). 0 = perfectly uniform; grows with deviation. The expected
 * count per bin is n/bins; degrees of freedom = bins−1. O(n + bins).
 */
export function chiSquareUniform(values: ArrayLike<number>, bins = 256): number {
  const n = values.length;
  if (n === 0 || bins <= 1) return 0;
  const obs = new Float64Array(bins);
  for (let i = 0; i < n; i++) {
    const b = ((Math.trunc(values[i]!) % bins) + bins) % bins;
    obs[b]! += 1;
  }
  const expected = n / bins;
  let chi = 0;
  for (let b = 0; b < bins; b++) {
    const diff = obs[b]! - expected;
    chi += (diff * diff) / expected;
  }
  return chi;
}

/**
 * Lag-1 serial (auto)correlation coefficient in [−1, 1]. 0 = no linear dependence
 * between consecutive samples; ±1 = perfect. Pearson form over the pairs
 * (xᵢ, xᵢ₊₁). Returns 0 for constant or <2-element input. O(n).
 */
export function serialCorrelation(values: ArrayLike<number>): number {
  const n = values.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  const m = n - 1;
  for (let i = 0; i < m; i++) {
    const x = values[i]!;
    const y = values[i + 1]!;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const cov = m * sxy - sx * sy;
  const vx = m * sxx - sx * sx;
  const vy = m * syy - sy * sy;
  const denom = Math.sqrt(vx * vy);
  return denom <= 0 ? 0 : cov / denom;
}

/**
 * Monobit fraction: the share of 1-bits across the low `bits` bits of every value,
 * in [0, 1]. Ideal ≈0.5 (NIST SP 800-22 frequency test). O(n·bits).
 */
export function monobitFraction(values: ArrayLike<number>, bits = 8): number {
  const n = values.length;
  if (n === 0 || bits <= 0) return 0;
  let ones = 0;
  for (let i = 0; i < n; i++) ones += popcount(values[i]!, bits);
  return ones / (n * bits);
}

/**
 * Longest run of identical consecutive bits across the concatenated low-`bits`-bit
 * expansion of the stream (MSB-first within each value). A diagnostic for "sticky"
 * generators. O(n·bits).
 */
export function longestRunBits(values: ArrayLike<number>, bits = 8): number {
  const n = values.length;
  if (n === 0 || bits <= 0) return 0;
  let longest = 0;
  let run = 0;
  let prev = -1;
  for (let i = 0; i < n; i++) {
    const v = Math.trunc(values[i]!);
    for (let b = bits - 1; b >= 0; b--) {
      const bit = Math.floor(v / 2 ** b) % 2;
      if (bit === prev) {
        run += 1;
      } else {
        run = 1;
        prev = bit;
      }
      if (run > longest) longest = run;
    }
  }
  return longest;
}

/**
 * Mean normalised Hamming distance between consecutive samples:
 * `mean(popcount(xᵢ ⊕ xᵢ₊₁) / bits)`. This is the upstream
 * `collapse_consistency` / `superposition_measure`: for an ideal stream half the
 * bits flip between draws, so the value sits at ≈0.5; a frozen stream gives 0.
 * O(n·bits).
 */
export function hammingFlow(values: ArrayLike<number>, bits = 8): number {
  const n = values.length;
  if (n < 2) return 0;
  let acc = 0;
  const m = n - 1;
  for (let i = 0; i < m; i++) {
    const x = Math.trunc(values[i]!);
    const y = Math.trunc(values[i + 1]!);
    acc += popcount(x ^ y, bits) / bits;
  }
  return acc / m;
}

/**
 * Windowed XOR-entropy (the upstream `entanglement_score`): over a sliding window,
 * accumulate `−log2(popcount(xᵢ ⊕ xᵢ₊₁) / bits)` and average. Higher = more
 * structure flips per step. Returns 0 if fewer than `window+1` samples. O(n·window)
 * in the naive form; here O(n) with a single pass since windows fully overlap and
 * each term is reused. We compute the per-step term once and average over all
 * valid steps (equivalent to the upstream mean of per-window means).
 */
export function windowedXorEntropy(values: ArrayLike<number>, bits = 8): number {
  const n = values.length;
  if (n < 2) return 0;
  let acc = 0;
  let used = 0;
  const m = n - 1;
  for (let i = 0; i < m; i++) {
    const x = Math.trunc(values[i]!);
    const y = Math.trunc(values[i + 1]!);
    const frac = popcount(x ^ y, bits) / bits;
    if (frac > 0) {
      acc += -Math.log2(frac);
      used += 1;
    }
  }
  return used === 0 ? 0 : acc / used;
}

/**
 * Mean product of consecutive samples after scaling each into [0, 1) by `scale`
 * (the upstream `quantum_correlation`). For an i.i.d. uniform stream this tends to
 * ≈0.25 (= E[U]²); large deviations flag dependence. O(n).
 */
export function productCorrelation(values: ArrayLike<number>, scale: number): number {
  const n = values.length;
  if (n < 2 || scale <= 0) return 0;
  let acc = 0;
  const m = n - 1;
  for (let i = 0; i < m; i++) {
    acc += (values[i]! / scale) * (values[i + 1]! / scale);
  }
  return acc / m;
}

/** Full randomness-quality report over a sample buffer. */
export interface RandomnessReport {
  readonly n: number;
  /** Shannon entropy in bits over `symbols` (ideal = log2(symbols)). */
  readonly entropy: number;
  /** Maximum attainable entropy = log2(symbols). */
  readonly entropyMax: number;
  /** χ² uniformity statistic (0 = flat). */
  readonly chiSquare: number;
  /** Lag-1 serial correlation in [−1, 1] (0 = ideal). */
  readonly serialCorrelation: number;
  /** Fraction of 1-bits (0.5 = ideal). */
  readonly monobit: number;
  /** Longest identical-bit run. */
  readonly longestRun: number;
  /** Mean normalised consecutive Hamming distance (0.5 = ideal). */
  readonly hammingFlow: number;
  /** Composite quality score in [0, 1]; 1 = indistinguishable-from-ideal on these tests. */
  readonly quality: number;
}

/**
 * Aggregate the battery into one {@link RandomnessReport}. `symbols`/`bins` set the
 * entropy & χ² resolution (default byte-wise); `bits` is the per-sample bit-width
 * for the bit-level tests. The composite `quality` is the mean of four normalised,
 * clamped sub-scores (entropy ratio, monobit closeness, |serial-corr| closeness,
 * Hamming-flow closeness) — each in [0, 1], so `quality ∈ [0, 1]`. Deterministic;
 * O(n·bits + symbols).
 */
export function randomnessReport(
  values: ArrayLike<number>,
  opts: { symbols?: number; bins?: number; bits?: number } = {},
): RandomnessReport {
  const symbols = opts.symbols ?? 256;
  const bins = opts.bins ?? 256;
  const bits = opts.bits ?? 8;
  const n = values.length;

  const entropy = shannonEntropy(values, symbols);
  const entropyMax = Math.log2(symbols);
  const chiSquare = chiSquareUniform(values, bins);
  const serial = serialCorrelation(values);
  const monobit = monobitFraction(values, bits);
  const longestRun = longestRunBits(values, bits);
  const flow = hammingFlow(values, bits);

  // Normalised sub-scores in [0, 1].
  const sEntropy = entropyMax > 0 ? Math.min(1, entropy / entropyMax) : 0;
  const sMonobit = 1 - Math.min(1, Math.abs(monobit - 0.5) / 0.5);
  const sSerial = 1 - Math.min(1, Math.abs(serial));
  const sFlow = 1 - Math.min(1, Math.abs(flow - 0.5) / 0.5);
  const quality = (sEntropy + sMonobit + sSerial + sFlow) / 4;

  return {
    n,
    entropy,
    entropyMax,
    chiSquare,
    serialCorrelation: serial,
    monobit,
    longestRun,
    hammingFlow: flow,
    quality,
  };
}
