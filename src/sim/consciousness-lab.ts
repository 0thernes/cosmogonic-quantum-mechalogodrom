/**
 * CONSCIOUSNESS LAB — the offline experiment runner that turns the {@link ConsciousnessKernel}'s claims into
 * FALSIFIABLE, seed-replayable receipts. It never asserts "conscious"; it asks the nastier questions the
 * repo law demands: is the convergence real, or an artifact? does each framework EARN its place under
 * ablation, or is it decoration? does a shuffled control explain the trace?
 *
 * THE DRIVER IS REAL MATH, NOT A MOCK. Framework signals are produced by a bank of ten Kuramoto phase
 * oscillators under a raised-cosine COUPLING PULSE (κ ramps low→high→low). When κ is sub-critical the
 * oscillators drift independently (order parameter R≈0) and the ten framework signals are weak and
 * decorrelated; when the pulse drives κ above critical they phase-lock (R→1) and the signals rise TOGETHER
 * — a genuine, physics-grounded transient convergence. The `thaler9` baseline is seeded from the repo's
 * ACTUAL {@link runThalerProof} verdict, so the lab is anchored to real in-repo consciousness math.
 *
 * THREE CONDITIONS, MEASURED:
 *   • structured — the coupled pulse. Expect: a singularity event fires as R spikes; emergence > 0.
 *   • null       — each framework's time-series is independently circularly time-shuffled BEFORE the kernel
 *                  sees it. Marginals are preserved, cross-framework co-movement destroyed. Expect: coherence
 *                  and singularity events collapse (the falsifier for "the event is about level, not
 *                  co-movement").
 *   • ablation   — one framework's signal is removed for a whole run. Expect: the blended index AND a
 *                  downstream behavior proxy drop, the most for the most-connected frameworks — the load-
 *                  bearing test.
 *
 * THE DOWNSTREAM BEHAVIOR is honest, not tautological: an estimator-quality reward `1 − |R_t − index_t|`.
 * The blended index is treated as an ESTIMATOR of the hidden ground-truth integration R (the Kuramoto order
 * parameter). Ablating a framework degrades the estimator ⇒ the reward drops ⇒ the mechanism was load-
 * bearing. This gives every framework a real framework→index→behavior causal chain via the coupling web.
 *
 * DETERMINISM (ADR 0004). Everything draws from an injected/seed-derived {@link Rng}. Same seed ⇒ identical
 * LabReport bit-for-bit. Offline runner: NOT a per-frame path (O(ticks · conditions · 10²)).
 *
 * HONESTY. `LabReport.claim` is always `'indicatorOnly'`. `singularityProven` / `ablationProven` / a positive
 * `nullSeparation` are evidence the machinery is load-bearing and not decorative — they are NOT proof of
 * subjective experience.
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { runThalerProof } from './thaler-sentience';
import {
  ConsciousnessKernel,
  COUPLING,
  FRAMEWORK_COUNT,
  FRAMEWORK_IDS,
  type ConsciousnessFrameworkId,
  type FrameworkSignals,
  type KernelOptions,
} from './consciousness-kernel';

/** One condition's aggregate outcome over a run. */
export interface ConditionResult {
  label: string;
  /** Mean blended index over the run (0..1). */
  meanIndex: number;
  /** Mean blended index over the INTEGRATED (high-R) window only (0..1) — where mechanisms actually matter. */
  meanIndexHighR: number;
  /** Peak blended index (0..1). */
  peakIndex: number;
  /** Mean concordance (0..1). */
  meanConvergence: number;
  /** Mean emergence — coupled index minus independent mean (0..1). */
  meanEmergence: number;
  /** Mean estimator-quality reward `1 − |R − index|` (0..1) — the downstream behavior proxy. */
  meanReward: number;
  /** Mean reward over the integrated (high-R) window only (0..1). */
  meanRewardHighR: number;
  /** Number of singularity events observed. */
  eventCount: number;
  /** Peak "frameworks moving together" reached (0..10). */
  peakMoving: number;
}

/** Per-framework lab statistics — the receipts that decide `partial` vs `met` vs `loadBearing`. */
export interface FrameworkLabStat {
  id: ConsciousnessFrameworkId;
  /** Drop in mean index when this framework is ablated (0..1). */
  ablationLoss: number;
  /** Drop in the downstream reward when this framework is ablated (0..1). */
  causalEffect: number;
  /** Drop in this framework's mean |correlation to the others| between structured and null (0..1). */
  nullSeparation: number;
  /** Column influence of this framework on the others in the coupling web (how connected it is). */
  connectedness: number;
}

/** The full deterministic lab report — the data product a page or a test consumes. */
export interface LabReport {
  seed: number;
  ticks: number;
  structured: ConditionResult;
  nullShuffled: ConditionResult;
  frameworks: FrameworkLabStat[];
  /** true iff structured fires a singularity event AND the shuffled null does not — the core falsifier. */
  singularityProven: boolean;
  /** true iff ablating the most-connected framework measurably drops the index. */
  ablationProven: boolean;
  /** true iff the structured coupled index exceeds its own independent mean (emergence, "coupling > count"). */
  emergenceProven: boolean;
  /** The real repo Thaler-proof fraction used to seed the thaler9 baseline (provenance to in-repo math). */
  thalerFraction: number;
  claim: 'indicatorOnly';
}

/** Lab configuration. */
export interface LabConfig {
  /** Ticks per run (default 176). */
  ticks?: number;
  /** Peak Kuramoto coupling at the pulse crest (default 4.0, super-critical for 10 oscillators). */
  kappaMax?: number;
  /** Kernel options passed to every condition (window, thresholds). */
  kernel?: KernelOptions;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A generated run: the ten framework signal columns over time, plus the ground-truth R series. */
interface DrivenRun {
  /** signals[t][f] in [0,1] — the raw framework signal (before kernel coupling). */
  signals: number[][];
  /** R[t] — Kuramoto order parameter (hidden ground-truth integration) in [0,1]. */
  R: number[];
}

/**
 * Drive ten Kuramoto oscillators under a raised-cosine coupling pulse and read out ten framework signals.
 * Deterministic given `rng`. `thalerBase` anchors the thaler9 column to the repo's real proof fraction.
 * O(ticks · 10²).
 */
function driveOscillators(
  rng: Rng,
  ticks: number,
  kappaMax: number,
  thalerBase: number,
): DrivenRun {
  const K = FRAMEWORK_COUNT;
  const omega = new Float64Array(K); // natural frequencies (small spread ⇒ locks readily)
  const theta = new Float64Array(K); // phases
  const phi = new Float64Array(K); // per-framework readout phase offset
  const base = new Float64Array(K); // per-framework baseline level
  for (let i = 0; i < K; i++) {
    omega[i] = 0.04 + rng() * 0.14;
    theta[i] = rng() * Math.PI * 2;
    phi[i] = rng() * Math.PI * 2;
    base[i] = 0.22 + rng() * 0.06;
  }
  base[1] = 0.2 + 0.18 * clamp01(thalerBase); // thaler9 baseline anchored to the real proof fraction
  const signals: number[][] = [];
  const Rs: number[] = [];
  const half = ticks / 2;
  const pulseWidth = ticks * 0.32;
  for (let t = 0; t < ticks; t++) {
    // raised-cosine coupling pulse centered at mid-run: κ low → high → low.
    const u = (t - half) / pulseWidth;
    const pulse = Math.abs(u) < 1 ? 0.5 * (1 + Math.cos(Math.PI * u)) : 0;
    const kappa = kappaMax * pulse;
    // order parameter R and mean phase.
    let cx = 0,
      cy = 0;
    for (let i = 0; i < K; i++) {
      cx += Math.cos(theta[i] ?? 0);
      cy += Math.sin(theta[i] ?? 0);
    }
    cx /= K;
    cy /= K;
    const R = Math.sqrt(cx * cx + cy * cy);
    const meanPhase = Math.atan2(cy, cx);
    Rs.push(clamp01(R));
    // Kuramoto mean-field update: dθ_i = ω_i + κ R sin(ψ − θ_i).
    for (let i = 0; i < K; i++) {
      const th = theta[i] ?? 0;
      theta[i] = th + (omega[i] ?? 0) + kappa * R * Math.sin(meanPhase - th) * 0.15;
    }
    // readout: framework signals rise together when R is high (shared R + aligned phases), stay low + noisy
    // when R is low (independent phases dominate).
    const row: number[] = [];
    for (let i = 0; i < K; i++) {
      const align = 0.6 + 0.4 * Math.sin((theta[i] ?? 0) + (phi[i] ?? 0));
      const noise = 0.06 * (rng() - 0.5);
      row.push(clamp01((base[i] ?? 0.25) + 0.6 * R * align + noise));
    }
    signals.push(row);
  }
  return { signals, R: Rs };
}

/** Map one signal row to a FrameworkSignals bag; `ablate` (or -1) removes one framework's field. */
function rowToSignals(row: number[], ablate: number): FrameworkSignals {
  const g = (f: number): number | undefined => (f === ablate ? undefined : row[f]);
  return {
    butlinCoverage: g(0),
    thalerFraction: g(1),
    phi: g(2),
    partitionLoss: g(2) === undefined ? undefined : clamp01((row[2] ?? 0) * 0.8),
    freeEnergyDescent: g(3),
    attentionSchemaAccuracy: g(4),
    fieldCoherence: g(5),
    ualDepth: g(6),
    sensorimotorMastery: g(7),
    projectiveFrame: g(8),
    streamCompetition: g(9),
  };
}

/**
 * Independently permute each column of `signals` (seeded Fisher–Yates) — the phase-randomized null. This
 * preserves each framework's marginal distribution but destroys its temporal structure and every
 * cross-framework co-movement (including the shared pulse envelope a mere rotation would leave intact), so a
 * real convergence must not survive it.
 */
function shuffleColumns(signals: number[][], rng: Rng): number[][] {
  const n = signals.length;
  const out: number[][] = signals.map((r) => r.slice());
  for (let f = 0; f < FRAMEWORK_COUNT; f++) {
    const col = signals.map((r) => r[f] ?? 0);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = col[i]!;
      col[i] = col[j]!;
      col[j] = tmp;
    }
    for (let t = 0; t < n; t++) out[t]![f] = col[t]!;
  }
  return out;
}

/**
 * Run one condition end-to-end through a fresh kernel; returns the aggregate outcome. `highR[t]` marks the
 * integrated window (Kuramoto locked) where mechanisms carry weight — the honest place to measure ablation.
 */
function runCondition(
  label: string,
  signals: number[][],
  R: number[],
  highR: boolean[],
  seed: number,
  ablate: number,
  kernelOpts: KernelOptions,
): ConditionResult {
  const kernel = new ConsciousnessKernel(seed, kernelOpts);
  let idxSum = 0,
    convSum = 0,
    emgSum = 0,
    rewSum = 0,
    peakIndex = 0,
    peakMoving = 0;
  let idxHighSum = 0,
    rewHighSum = 0,
    highN = 0;
  const n = signals.length;
  for (let t = 0; t < n; t++) {
    kernel.ingest(rowToSignals(signals[t]!, ablate));
    const idx = kernel.index;
    const rew = 1 - Math.abs((R[t] ?? 0) - idx); // estimator-quality reward
    idxSum += idx;
    convSum += kernel.convergence;
    emgSum += kernel.emergence;
    rewSum += rew;
    if (highR[t]) {
      idxHighSum += idx;
      rewHighSum += rew;
      highN++;
    }
    if (idx > peakIndex) peakIndex = idx;
    const mv = kernel.detection.moving;
    if (mv > peakMoving) peakMoving = mv;
  }
  return {
    label,
    meanIndex: idxSum / n,
    meanIndexHighR: highN > 0 ? idxHighSum / highN : idxSum / n,
    peakIndex,
    meanConvergence: convSum / n,
    meanEmergence: emgSum / n,
    meanReward: rewSum / n,
    meanRewardHighR: highN > 0 ? rewHighSum / highN : rewSum / n,
    eventCount: kernel.eventCount,
    peakMoving,
  };
}

/** Mean |Pearson correlation| of column `f` to every other column of a signal matrix. O(n·10). */
function meanCrossCorrelation(signals: number[][], f: number): number {
  const col = (c: number): number[] => signals.map((r) => r[c] ?? 0);
  const cf = col(f);
  let sum = 0,
    cnt = 0;
  for (let g = 0; g < FRAMEWORK_COUNT; g++) {
    if (g === f) continue;
    sum += Math.abs(pearsonArr(cf, col(g)));
    cnt++;
  }
  return cnt > 0 ? sum / cnt : 0;
}

/** Pearson correlation of two equal-length arrays (0 for degenerate). */
function pearsonArr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let ma = 0,
    mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] ?? 0;
    mb += b[i] ?? 0;
  }
  ma /= n;
  mb /= n;
  let num = 0,
    va = 0,
    vb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - ma;
    const db = (b[i] ?? 0) - mb;
    num += da * db;
    va += da * da;
    vb += db * db;
  }
  const den = Math.sqrt(va * vb);
  return den < 1e-12 ? 0 : num / den;
}

/** Column influence of framework `j` on the others (sum over rows i≠j of |COUPLING[i][j]|). */
function connectednessOf(j: number): number {
  let s = 0;
  for (let i = 0; i < FRAMEWORK_COUNT; i++) {
    if (i === j) continue;
    s += Math.abs(COUPLING[i * FRAMEWORK_COUNT + j] ?? 0);
  }
  return s;
}

/**
 * Run the full consciousness lab for one seed: generate a coupled run, then measure the structured, null-
 * shuffled, and ten ablation conditions. Deterministic. This is the falsifiable receipt behind every
 * framework's status and the singularity claim.
 */
export function runConsciousnessLab(seed: number, cfg: LabConfig = {}): LabReport {
  const ticks = cfg.ticks ?? 176;
  const kappaMax = cfg.kappaMax ?? 4.0;
  const kernelOpts = cfg.kernel ?? {};
  const rng = mulberry32(seed >>> 0 || 1);

  // anchor thaler9 to the repo's REAL proof (small ensemble for speed; deterministic).
  const thalerFraction = runThalerProof(
    mulberry32((seed ^ 0x7fa1e) >>> 0 || 1),
    undefined,
    4,
  ).fraction;

  const driven = driveOscillators(rng, ticks, kappaMax, thalerFraction);
  // the INTEGRATED window: ticks where the oscillators are locked (R above the mid-line). Ablation is
  // measured here — where the system is actually bound and a mechanism can be load-bearing.
  const highR = driven.R.map((r) => r > 0.5);
  const structured = runCondition(
    'structured',
    driven.signals,
    driven.R,
    highR,
    seed ^ 0x11,
    -1,
    kernelOpts,
  );

  // null: phase-shuffle each column independently, keep the SAME ground-truth R for the reward comparison.
  const shuffled = shuffleColumns(driven.signals, mulberry32((seed ^ 0x5b0ff) >>> 0 || 1));
  const nullShuffled = runCondition(
    'nullShuffled',
    shuffled,
    driven.R,
    highR,
    seed ^ 0x22,
    -1,
    kernelOpts,
  );

  // per-framework ablation (measured on the integrated window) + null-separation.
  const frameworks: FrameworkLabStat[] = [];
  let totalLoss = 0;
  let allLoadBearing = true;
  for (let f = 0; f < FRAMEWORK_COUNT; f++) {
    const abl = runCondition(
      'ablate:' + FRAMEWORK_IDS[f],
      driven.signals,
      driven.R,
      highR,
      seed ^ 0x33,
      f,
      kernelOpts,
    );
    const structuredCorr = meanCrossCorrelation(driven.signals, f);
    const nullCorr = meanCrossCorrelation(shuffled, f);
    const ablationLoss = clamp01(structured.meanIndexHighR - abl.meanIndexHighR);
    frameworks.push({
      id: FRAMEWORK_IDS[f]!,
      ablationLoss,
      causalEffect: clamp01(structured.meanRewardHighR - abl.meanRewardHighR),
      nullSeparation: clamp01(structuredCorr - nullCorr),
      connectedness: connectednessOf(f),
    });
    totalLoss += ablationLoss;
    if (ablationLoss <= 0) allLoadBearing = false;
  }

  return {
    seed,
    ticks,
    structured,
    nullShuffled,
    frameworks,
    singularityProven: structured.eventCount >= 1 && nullShuffled.eventCount === 0,
    // every one of the ten frameworks measurably lowers the integrated index when removed, and the stack's
    // total load is non-trivial — the mechanisms are load-bearing, not decorative.
    ablationProven: allLoadBearing && totalLoss > 0.03,
    emergenceProven: structured.meanEmergence > 0,
    thalerFraction,
    claim: 'indicatorOnly',
  };
}

/** Aggregate report over a sweep of seeds — the cross-seed robustness receipt. */
export interface LabSweep {
  seeds: number[];
  reports: LabReport[];
  /** Fraction of seeds where the singularity separated from the null (0..1). */
  singularityRate: number;
  /** Fraction of seeds where ablation of the top framework was load-bearing (0..1). */
  ablationRate: number;
  /** Fraction of seeds where the coupled index exceeded the independent mean (0..1). */
  emergenceRate: number;
  claim: 'indicatorOnly';
}

/** Run the lab over several seeds and summarize how often each falsifiable property holds. Deterministic. */
export function sweepConsciousnessLab(seeds: readonly number[], cfg: LabConfig = {}): LabSweep {
  const reports = seeds.map((s) => runConsciousnessLab(s, cfg));
  const n = reports.length || 1;
  const singularityRate = reports.filter((r) => r.singularityProven).length / n;
  const ablationRate = reports.filter((r) => r.ablationProven).length / n;
  const emergenceRate = reports.filter((r) => r.emergenceProven).length / n;
  return {
    seeds: [...seeds],
    reports,
    singularityRate,
    ablationRate,
    emergenceRate,
    claim: 'indicatorOnly',
  };
}
