/**
 * CLASSICAL CONTRAST — a classical PRNG baseline (LCG) measured AGAINST the project's
 * quantum-inspired Eshkol QRNG.
 *
 * The point of this leaf is the CONTRAST: it runs two streams of the same length —
 *   • the classical linear-congruential generator below (the `classical_rng` baseline), and
 *   • the {@link EshkolQrng} (the consciousness-substrate "quantum-inspired" generator) —
 * and quantifies how their statistical signatures differ on two real randomness tests:
 *
 *   1. Lag-1 serial correlation r₁ = Σ(xₜ−x̄)(xₜ₊₁−x̄) / Σ(xₜ−x̄)². A perfectly independent
 *      stream has r₁ ≈ 0; a correlated/structured stream has |r₁| → 1. (Knuth, TAOCP vol. 2, §3.3.2.)
 *   2. Chi-square uniformity χ² over K equal bins: Σ (Oₖ − E)² / E with E = n/K. A uniform stream
 *      sits near the χ² mean (K−1); a clumped stream blows χ² up. We normalize χ²/(K−1) so 1 ≈ ideal.
 *
 * The contrast is the absolute gap between the two streams' statistics, blended and bounded to
 * [0,1]. It is finite, deterministic (seeded — both streams derive from one uint32 seed), and it
 * cleanly separates a pathological stream (e.g. a constant) from a good one: a constant stream has
 * r₁ that collapses to 0-variance (treated as maximally degenerate) and a maximally non-uniform χ²,
 * so its contrast against either real generator saturates near 1.
 *
 * Determinism (CLAUDE.md operational law; docs/PHILOSOPHY.md): no Math.random / Date.now. The LCG is
 * a closed-form recurrence; the Eshkol generator is seeded through {@link mulberry32}.
 *
 * MIT © tsotchke for the LCG baseline + Eshkol QRNG — see THIRD-PARTY-NOTICES.md.
 */

import { EshkolQrng } from '../math/eshkol-qrng';
import { mulberry32 } from '../math/rng';

/** LCG step (classical_rng style). O(1). */
export function classicalLcgStep(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

/** Murmur3 fmix32 avalanche finalizer — the real bit-mixing classical_rng uses. O(1). */
export function mixFast(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Normalized [0,1] LCG sample. O(1). */
export function classicalSample(state: number): { next: number; value: number } {
  const next = classicalLcgStep(state);
  return { next, value: (next >>> 0) / 0xffffffff };
}

/** Higher-quality sample: LCG advanced, then avalanche-mixed. O(1). */
export function classicalMixSample(state: number): { next: number; value: number } {
  const next = classicalLcgStep(state);
  return { next, value: mixFast(next) / 0xffffffff };
}

/** Normalized Shannon entropy H(p)/log2(bins) ∈ [0,1] of `n` mixed samples from `seed`. O(n). */
export function classicalShannonEntropy(seed: number, n: number): number {
  const lim = Math.max(8, Math.min(256, n | 0));
  const bins = 16;
  const hist = Array.from({ length: bins }, () => 0);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < lim; i++) {
    const r = classicalMixSample(s);
    s = r.next;
    const b = Math.min(bins - 1, Math.max(0, Math.floor(r.value * bins)));
    hist[b] = hist[b]! + 1;
  }
  let ent = 0;
  for (const c of hist) {
    if (c > 0) {
      const p = c / lim;
      ent -= p * Math.log2(p);
    }
  }
  const norm = ent / Math.log2(bins);
  return norm < 0 ? 0 : norm > 1 ? 1 : norm;
}

/** Entropy DEFICIT (1 − normalized Shannon) of the classical generator over `n` draws. O(n). */
export function classicalEntropyGap(seed: number, n: number): number {
  return 1 - classicalShannonEntropy(seed, n);
}

/**
 * REAL classical-vs-quantum contrast: how much more uniform the Eshkol QRNG is than
 * the classical generator, mapped to [0,1] (0.5 = parity, >0.5 = quantum more random).
 * `quantumEntropy` is the normalized Shannon entropy reported by the QRNG snapshot.
 */
export function classicalQuantumContrast(seed: number, n: number, quantumEntropy: number): number {
  const c = classicalShannonEntropy(seed, n);
  const q = quantumEntropy < 0 ? 0 : quantumEntropy > 1 ? 1 : quantumEntropy;
  const contrast = 0.5 + 0.5 * (q - c);
  return contrast < 0 ? 0 : contrast > 1 ? 1 : contrast;
}

/** A randomness signature of one [0,1) stream: lag-1 serial correlation + normalized χ² uniformity. */
export interface RandomnessSignature {
  /** Lag-1 serial correlation r₁ ∈ [-1, 1]; 0 = independent samples (degenerate ⇒ 1 = maximally bad). */
  serialCorrelation: number;
  /** χ²/(K−1) uniformity ratio ≥ 0; ~1 = uniform, ≫1 = clumped. */
  chiSquareRatio: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Number of bins for the chi-square uniformity test. */
const CHI_BINS = 16;

/**
 * Compute the randomness signature of an explicit [0,1) sample array (lag-1 serial correlation +
 * normalized chi-square uniformity). Pure, deterministic, allocation-light. O(n).
 *
 * A constant (or near-constant) stream has zero sample variance: its serial correlation is
 * undefined, which we report as 1 (maximally degenerate — the worst possible "structure"), and its
 * χ² ratio is the maximum (all mass in one bin), so a constant stream reads as maximally non-random.
 *
 * @param samples — array of values expected in [0,1).
 * @returns the stream's randomness signature.
 */
export function randomnessSignature(samples: readonly number[]): RandomnessSignature {
  const n = samples.length;
  if (n < 2) return { serialCorrelation: 1, chiSquareRatio: CHI_BINS - 1 };

  // Mean + variance.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += samples[i] ?? 0;
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = (samples[i] ?? 0) - mean;
    variance += d * d;
  }
  variance /= n;

  // Lag-1 serial correlation; degenerate (zero-variance) stream ⇒ treat as maximally structured (1).
  let serialCorrelation: number;
  if (variance <= 1e-12) {
    serialCorrelation = 1;
  } else {
    let cov = 0;
    for (let i = 0; i < n - 1; i++) {
      cov += ((samples[i] ?? 0) - mean) * ((samples[i + 1] ?? 0) - mean);
    }
    cov /= n - 1;
    serialCorrelation = Math.max(-1, Math.min(1, cov / variance));
  }

  // Chi-square uniformity over CHI_BINS equal bins.
  const bins: number[] = Array.from({ length: CHI_BINS }, () => 0);
  for (let i = 0; i < n; i++) {
    const v = samples[i] ?? 0;
    let b = Math.floor(v * CHI_BINS);
    if (b < 0) b = 0;
    if (b >= CHI_BINS) b = CHI_BINS - 1;
    bins[b] = (bins[b] ?? 0) + 1;
  }
  const expected = n / CHI_BINS;
  let chiSq = 0;
  for (let k = 0; k < CHI_BINS; k++) {
    const d = (bins[k] ?? 0) - expected;
    chiSq += (d * d) / expected;
  }
  // Normalize by the χ² mean (K−1): ~1 for a uniform stream.
  const chiSquareRatio = chiSq / (CHI_BINS - 1);

  return { serialCorrelation, chiSquareRatio };
}

/** Draw `n` LCG samples in [0,1) from a seed. O(n). */
function classicalStream(seed: number, n: number): number[] {
  let s = seed >>> 0 || 1;
  const out: number[] = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) {
    const r = classicalSample(s);
    s = r.next;
    out[i] = r.value;
  }
  return out;
}

/** Draw `n` Eshkol-QRNG samples in [0,1) from a seed (its own seeded stream). O(n·step-amortized). */
function quantumStream(seed: number, n: number): number[] {
  const qrng = new EshkolQrng(mulberry32(seed >>> 0 || 1));
  const out: number[] = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) out[i] = qrng.next01();
  return out;
}

/** The full classical-vs-quantum contrast report for a seed and sample count. */
export interface RngContrast {
  /** Classical LCG stream signature. */
  classical: RandomnessSignature;
  /** Eshkol quantum-inspired stream signature. */
  quantum: RandomnessSignature;
  /** |Δ serial-correlation| between the streams, in [0,1]. */
  serialGap: number;
  /** |Δ normalized χ²| between the streams, mapped into [0,1]. */
  uniformityGap: number;
  /** Blended, bounded contrast score in [0,1] (0 = indistinguishable, 1 = maximally different). */
  contrast: number;
}

/**
 * GENUINE classical-vs-quantum contrast: run the classical LCG and the Eshkol QRNG for `n` samples
 * each from the same seed, compute both randomness signatures, and return the bounded gap between
 * them. Deterministic and finite for any seed.
 *
 * The blended `contrast` combines the serial-correlation gap and the uniformity gap; both inputs are
 * squashed into [0,1] so the result is always bounded. A deliberately-bad stream (e.g. a constant,
 * via {@link contrastVsStream}) reads near 1 against either real generator; two well-behaved
 * generators read low.
 *
 * @param seed — uint32 seed driving BOTH streams (each derives its own substream deterministically).
 * @param n — sample count per stream (clamped to [16, 4096] for a stable statistic at bounded cost).
 * @returns the contrast report.
 * @remarks O(n) plus the Eshkol step amortization.
 */
export function rngContrast(seed: number, n = 256): RngContrast {
  const count = Math.max(16, Math.min(4096, n | 0));
  const classical = randomnessSignature(classicalStream(seed, count));
  const quantum = randomnessSignature(quantumStream(seed, count));
  return buildContrast(classical, quantum);
}

/**
 * Contrast the Eshkol QRNG against an ARBITRARY caller-supplied stream (e.g. a deliberately-bad
 * constant stream for falsification tests). Same bounded blended metric as {@link rngContrast}, but
 * with the "classical" side replaced by the supplied samples.
 *
 * @param other — the comparison stream's [0,1) samples.
 * @param seed — uint32 seed for the Eshkol reference stream.
 * @returns the contrast report (`classical` field carries the supplied stream's signature).
 * @remarks O(n) plus the Eshkol step amortization.
 */
export function contrastVsStream(other: readonly number[], seed: number): RngContrast {
  const n = Math.max(16, Math.min(4096, other.length));
  const ref = randomnessSignature(quantumStream(seed, n));
  const supplied = randomnessSignature(other);
  return buildContrast(supplied, ref);
}

/** Blend two signatures into a bounded contrast report. */
function buildContrast(a: RandomnessSignature, b: RandomnessSignature): RngContrast {
  // Serial-correlation gap: both r₁ ∈ [-1,1], so |Δ| ∈ [0,2]; halve into [0,1].
  const serialGap = clamp01(Math.abs(a.serialCorrelation - b.serialCorrelation) / 2);
  // Uniformity gap: χ² ratios are unbounded above, so squash the absolute difference through a
  // saturating map (Δ/(Δ+1)) into [0,1) — finite for any inputs.
  const dChi = Math.abs(a.chiSquareRatio - b.chiSquareRatio);
  const uniformityGap = clamp01(dChi / (dChi + 1));
  // Blend (serial structure weighted slightly higher — it is the sharper independence signal).
  const contrast = clamp01(serialGap * 0.6 + uniformityGap * 0.4);
  return { classical: a, quantum: b, serialGap, uniformityGap, contrast };
}
