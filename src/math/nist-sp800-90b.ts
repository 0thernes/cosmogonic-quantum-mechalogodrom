/**
 * nist-sp800-90b.ts — faithful NIST SP 800-90B §4.4 continuous health-test algorithms
 * (leaf module, exclusive owner of the RCT/APT arithmetic).
 *
 * This is a direct, standard-faithful implementation of the two continuous health tests defined in
 * NIST SP 800-90B (January 2018), §4.4:
 *   - §4.4.1 Repetition Count Test (RCT)
 *   - §4.4.2 Adaptive Proportion Test (APT)
 *
 * The same tests are the ones Tsotchke's `quantum_rng` v3.0.0 runs continuously on its entropy
 * stream. Here they are the genuine algorithm with the standard cutoff formulas — cutoffs derived
 * from the assessed per-sample min-entropy `H` and the false-positive probability `α`, exactly as
 * the standard prescribes — so the behaviour is falsifiable: a value repeated `C` times MUST trip
 * the RCT and `C-1` times MUST NOT; a window whose first value recurs `C` times MUST trip the APT.
 *
 * HONEST BOUNDARY (binding). Implementing and running the SP 800-90B *test algorithm* is not the
 * same as *validating an entropy source* under SP 800-90B. Source validation additionally requires a
 * physical noise source, the full IID/non-IID estimator battery, and restart tests on real hardware.
 * Applying these two continuous tests to a deterministic, seed-driven simulation stream is a
 * conformance/diagnostic use of the real algorithm — not a certification, not physical entropy, and
 * not a CSPRNG claim. Callers must keep that boundary in their reporting.
 *
 * Determinism: every function is pure over its inputs and allocation-light; the streaming test
 * classes hold only three integer counters each and snapshot/restore exactly. No `Rng`,
 * `Math.random`, or `Date.now`.
 */

/** Default false-positive exponent: α = 2^-20, the SP 800-90B worked-example significance level. */
export const SP80090B_DEFAULT_ALPHA_EXPONENT = 20;

/** SP 800-90B §4.4.2 window size for a binary (1-bit) source. */
export const SP80090B_APT_WINDOW_BINARY = 1024;

/** SP 800-90B §4.4.2 window size for a non-binary source. */
export const SP80090B_APT_WINDOW_NONBINARY = 512;

/**
 * The standards boundary string every consumer should surface so a health *diagnostic* is never
 * mistaken for a validated entropy-source assessment.
 */
export const SP80090B_STANDARDS_BOUNDARY =
  'Faithful SP 800-90B §4.4 RCT/APT test algorithm applied to a deterministic simulation stream: a conformance diagnostic, not entropy-source validation, certification, or physical entropy.';

function assertPositiveInteger(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer, received ${value}`);
  }
  return value;
}

function assertMinEntropy(H: number): number {
  if (!Number.isFinite(H) || H <= 0 || H > 64) {
    throw new RangeError(`min-entropy H must be a finite value in (0, 64], received ${H}`);
  }
  return H;
}

function assertAlphaExponent(alphaExponent: number): number {
  if (!Number.isInteger(alphaExponent) || alphaExponent < 1 || alphaExponent > 60) {
    throw new RangeError(
      `false-positive exponent must be an integer in [1, 60] (α = 2^-exponent), received ${alphaExponent}`,
    );
  }
  return alphaExponent;
}

/**
 * Growable cache of ln(k!) = Σ_{j=2}^{k} ln(j). Exact-as-Float64 (a running sum of logarithms, not a
 * Lanczos approximation), deterministic, and monotone in `n`. Used for the binomial survival needed
 * by the APT cutoff.
 */
let logFactorialTable = new Float64Array(2); // ln(0!)=0, ln(1!)=0
let logFactorialFilled = 1;

function logFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n))
    throw new RangeError(`log-factorial needs n>=0 integer, got ${n}`);
  if (n <= logFactorialFilled) return logFactorialTable[n]!;
  if (n >= logFactorialTable.length) {
    const grown = new Float64Array(Math.max(n + 1, logFactorialTable.length * 2));
    grown.set(logFactorialTable);
    logFactorialTable = grown;
  }
  for (let k = logFactorialFilled + 1; k <= n; k++) {
    logFactorialTable[k] = logFactorialTable[k - 1]! + Math.log(k);
  }
  logFactorialFilled = n;
  return logFactorialTable[n]!;
}

/** ln of the binomial pmf P(X = i) for X ~ Binomial(n, p), with 0 < p < 1. */
function binomialLogPmf(n: number, i: number, p: number): number {
  if (i < 0 || i > n) return Number.NEGATIVE_INFINITY;
  return (
    logFactorial(n) -
    logFactorial(i) -
    logFactorial(n - i) +
    i * Math.log(p) +
    (n - i) * Math.log1p(-p)
  );
}

/**
 * Upper-tail survival P(X ≥ k) for X ~ Binomial(n, p). Summed in log-space with the log-sum-exp
 * trick so it stays accurate even when the individual pmf terms underflow (e.g. p=1/2, n=1024,
 * where P(X=n)=2^-1024). Returns a probability in [0, 1].
 */
export function binomialSurvival(n: number, k: number, p: number): number {
  assertPositiveInteger('n', n);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new RangeError(`binomial p must be in (0, 1), received ${p}`);
  }
  if (k <= 0) return 1;
  if (k > n) return 0;
  let maxLog = Number.NEGATIVE_INFINITY;
  for (let i = k; i <= n; i++) {
    const lp = binomialLogPmf(n, i, p);
    if (lp > maxLog) maxLog = lp;
  }
  if (maxLog === Number.NEGATIVE_INFINITY) return 0;
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += Math.exp(binomialLogPmf(n, i, p) - maxLog);
  }
  const survival = Math.exp(maxLog) * sum;
  return survival < 0 ? 0 : survival > 1 ? 1 : survival;
}

/**
 * SP 800-90B §4.4.1 Repetition Count Test cutoff.
 *
 *   C = 1 + ⌈ -log₂(α) / H ⌉   with α = 2^-alphaExponent, so -log₂(α) = alphaExponent.
 *
 * The RCT raises an alarm the moment a single sample value has occurred `C` times in a row.
 */
export function repetitionCountCutoff(
  minEntropyPerSample: number,
  alphaExponent: number = SP80090B_DEFAULT_ALPHA_EXPONENT,
): number {
  const H = assertMinEntropy(minEntropyPerSample);
  const e = assertAlphaExponent(alphaExponent);
  return 1 + Math.ceil(e / H);
}

const adaptiveProportionCutoffCache = new Map<string, number>();

/**
 * SP 800-90B §4.4.2 Adaptive Proportion Test cutoff: the smallest integer `C` such that, under the
 * per-value probability p = 2^-H, the chance of seeing the window's reference value at least `C`
 * times in `W` samples is ≤ α. Equivalent to the standard's `1 + CRITBINOM(W, 2^-H, 1-α)`.
 */
export function adaptiveProportionCutoff(
  windowSize: number,
  minEntropyPerSample: number,
  alphaExponent: number = SP80090B_DEFAULT_ALPHA_EXPONENT,
): number {
  const W = assertPositiveInteger('APT window size', windowSize);
  const H = assertMinEntropy(minEntropyPerSample);
  const e = assertAlphaExponent(alphaExponent);
  // The cutoff is a deterministic function of (W, H, e); memoise so repeated generator construction
  // does not repeat the O(W²) binomial search (the standard (1024, 1, 20) triple is by far the norm).
  const key = `${W}|${H}|${e}`;
  const cached = adaptiveProportionCutoffCache.get(key);
  if (cached !== undefined) return cached;
  const p = Math.pow(2, -H);
  const alpha = Math.pow(2, -e);
  // Survival P(X ≥ C) is strictly decreasing in C, so the first C meeting the bound is the cutoff.
  let cutoff = W + 1; // Unreachable for the intended parameters; means "no attainable count can alarm".
  for (let C = 1; C <= W; C++) {
    if (binomialSurvival(W, C, p) <= alpha) {
      cutoff = C;
      break;
    }
  }
  adaptiveProportionCutoffCache.set(key, cutoff);
  return cutoff;
}

/** Streaming counter state that snapshots and restores exactly. */
export interface RepetitionCountTestState {
  cutoff: number;
  referenceValue: number | null;
  runLength: number;
  totalSamples: number;
  alarms: number;
}

/**
 * SP 800-90B §4.4.1 Repetition Count Test as a streaming detector. Feed samples one at a time; the
 * detector raises an alarm on the update that pushes a consecutive-repeat run to the cutoff.
 */
export class RepetitionCountTest {
  readonly cutoff: number;
  private referenceValue: number | null = null;
  private runLength = 0;
  private totalSamples = 0;
  private alarms = 0;

  constructor(cutoff: number) {
    this.cutoff = assertPositiveInteger('RCT cutoff', cutoff);
    if (cutoff < 2) throw new RangeError('RCT cutoff must be at least 2 to be meaningful');
  }

  /** Advance by one sample; returns true iff this sample raised a repetition alarm. */
  update(sample: number): boolean {
    this.totalSamples++;
    if (this.referenceValue === sample) {
      this.runLength++;
    } else {
      this.referenceValue = sample;
      this.runLength = 1;
    }
    if (this.runLength >= this.cutoff) {
      this.alarms++;
      return true;
    }
    return false;
  }

  /** Current consecutive-repeat run length of the reference value. */
  get currentRun(): number {
    return this.runLength;
  }

  get sampleCount(): number {
    return this.totalSamples;
  }

  get alarmCount(): number {
    return this.alarms;
  }

  reset(): void {
    this.referenceValue = null;
    this.runLength = 0;
    this.totalSamples = 0;
    this.alarms = 0;
  }

  snapshot(): RepetitionCountTestState {
    return {
      cutoff: this.cutoff,
      referenceValue: this.referenceValue,
      runLength: this.runLength,
      totalSamples: this.totalSamples,
      alarms: this.alarms,
    };
  }

  restore(state: RepetitionCountTestState): void {
    if (state.cutoff !== this.cutoff) {
      throw new RangeError('RCT snapshot cutoff does not match this detector');
    }
    if (
      !Number.isInteger(state.runLength) ||
      state.runLength < 0 ||
      !Number.isSafeInteger(state.totalSamples) ||
      state.totalSamples < 0 ||
      !Number.isSafeInteger(state.alarms) ||
      state.alarms < 0
    ) {
      throw new RangeError('RCT snapshot counters are invalid');
    }
    this.referenceValue = state.referenceValue;
    this.runLength = state.runLength;
    this.totalSamples = state.totalSamples;
    this.alarms = state.alarms;
  }
}

/** Streaming APT state that snapshots and restores exactly. */
export interface AdaptiveProportionTestState {
  windowSize: number;
  cutoff: number;
  referenceValue: number | null;
  referenceCount: number;
  positionInWindow: number;
  windowsCompleted: number;
  alarms: number;
}

/**
 * SP 800-90B §4.4.2 Adaptive Proportion Test as a streaming detector. Each window of `W` samples
 * fixes its first sample as the reference value, counts recurrences of it across the window, and
 * raises an alarm the moment the count reaches the cutoff.
 */
export class AdaptiveProportionTest {
  readonly windowSize: number;
  readonly cutoff: number;
  private referenceValue: number | null = null;
  private referenceCount = 0;
  private positionInWindow = 0;
  private windowsCompleted = 0;
  private alarms = 0;

  constructor(windowSize: number, cutoff: number) {
    this.windowSize = assertPositiveInteger('APT window size', windowSize);
    this.cutoff = assertPositiveInteger('APT cutoff', cutoff);
  }

  /** Advance by one sample; returns true iff this sample raised a proportion alarm. */
  update(sample: number): boolean {
    if (this.positionInWindow === 0) {
      // First sample of a new window becomes the reference value.
      this.referenceValue = sample;
      this.referenceCount = 1;
      this.positionInWindow = 1;
    } else {
      if (sample === this.referenceValue) this.referenceCount++;
      this.positionInWindow++;
    }
    let alarm = false;
    if (this.referenceCount >= this.cutoff) {
      this.alarms++;
      alarm = true;
    }
    if (this.positionInWindow >= this.windowSize) {
      this.windowsCompleted++;
      this.positionInWindow = 0;
      this.referenceValue = null;
      this.referenceCount = 0;
    }
    return alarm;
  }

  get currentCount(): number {
    return this.referenceCount;
  }

  get windowCount(): number {
    return this.windowsCompleted;
  }

  get alarmCount(): number {
    return this.alarms;
  }

  reset(): void {
    this.referenceValue = null;
    this.referenceCount = 0;
    this.positionInWindow = 0;
    this.windowsCompleted = 0;
    this.alarms = 0;
  }

  snapshot(): AdaptiveProportionTestState {
    return {
      windowSize: this.windowSize,
      cutoff: this.cutoff,
      referenceValue: this.referenceValue,
      referenceCount: this.referenceCount,
      positionInWindow: this.positionInWindow,
      windowsCompleted: this.windowsCompleted,
      alarms: this.alarms,
    };
  }

  restore(state: AdaptiveProportionTestState): void {
    if (state.windowSize !== this.windowSize || state.cutoff !== this.cutoff) {
      throw new RangeError('APT snapshot configuration does not match this detector');
    }
    if (
      !Number.isInteger(state.referenceCount) ||
      state.referenceCount < 0 ||
      !Number.isInteger(state.positionInWindow) ||
      state.positionInWindow < 0 ||
      state.positionInWindow >= this.windowSize ||
      !Number.isSafeInteger(state.windowsCompleted) ||
      state.windowsCompleted < 0 ||
      !Number.isSafeInteger(state.alarms) ||
      state.alarms < 0
    ) {
      throw new RangeError('APT snapshot counters are invalid');
    }
    this.referenceValue = state.referenceValue;
    this.referenceCount = state.referenceCount;
    this.positionInWindow = state.positionInWindow;
    this.windowsCompleted = state.windowsCompleted;
    this.alarms = state.alarms;
  }
}

/** Verdict of a windowed (bounded-buffer) application of the RCT algorithm. */
export interface WindowedRepetitionVerdict {
  cutoff: number;
  longestRun: number;
  alarm: boolean;
}

/**
 * Apply the RCT algorithm to a bounded, already-materialised sample buffer (e.g. a health ring
 * buffer). Reports the longest consecutive-repeat run and whether it reaches the cutoff. O(n).
 */
export function repetitionCountOverBuffer(
  samples: ArrayLike<number>,
  cutoff: number,
): WindowedRepetitionVerdict {
  assertPositiveInteger('RCT cutoff', cutoff);
  let longestRun = 0;
  let run = 0;
  let previous = Number.NaN;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i]!;
    if (value === previous) run++;
    else {
      previous = value;
      run = 1;
    }
    if (run > longestRun) longestRun = run;
  }
  return { cutoff, longestRun, alarm: longestRun >= cutoff };
}

/** Verdict of a windowed (bounded-buffer) application of the APT algorithm. */
export interface WindowedAdaptiveProportionVerdict {
  windowSize: number;
  cutoff: number;
  windowsScanned: number;
  worstCount: number;
  alarm: boolean;
  insufficientData: boolean;
}

/**
 * Apply the APT algorithm to a bounded sample buffer by partitioning it into non-overlapping
 * windows of `windowSize`. Reports the worst (largest) reference-value count seen and whether any
 * window reached the cutoff. If fewer than one full window is available the verdict is
 * `insufficientData`. O(n).
 */
export function adaptiveProportionOverBuffer(
  samples: ArrayLike<number>,
  windowSize: number,
  cutoff: number,
): WindowedAdaptiveProportionVerdict {
  const W = assertPositiveInteger('APT window size', windowSize);
  assertPositiveInteger('APT cutoff', cutoff);
  const n = samples.length;
  const windows = Math.floor(n / W);
  if (windows === 0) {
    return {
      windowSize: W,
      cutoff,
      windowsScanned: 0,
      worstCount: 0,
      alarm: false,
      insufficientData: true,
    };
  }
  let worstCount = 0;
  let alarm = false;
  for (let w = 0; w < windows; w++) {
    const base = w * W;
    const reference = samples[base]!;
    let count = 1;
    for (let i = 1; i < W; i++) {
      if (samples[base + i]! === reference) count++;
    }
    if (count > worstCount) worstCount = count;
    if (count >= cutoff) alarm = true;
  }
  return {
    windowSize: W,
    cutoff,
    windowsScanned: windows,
    worstCount,
    alarm,
    insufficientData: false,
  };
}
