/**
 * Deterministic causal-history ecology predictor.
 *
 * Every forecast is captured before the current observation enters the 16-tap history bank. The
 * history clock advances when a forecast is emitted, including forecasts whose labels are later
 * discarded. Training can therefore consume only the exact feature vector retained by its token.
 *
 * This is an isolated bounded classical learner. It is not production-wired and makes no claim of
 * ecological superiority, consciousness, or sentience.
 */

import { mulberry32 } from '../math/rng';

export const TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS = 5;
export const TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS = 16;
export const TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS =
  TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS * TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
export const TSOTCHKE_ECOLOGY_V3_VALIDITY_INPUTS = TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
export const TSOTCHKE_ECOLOGY_V3_INPUTS =
  TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS +
  TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS +
  TSOTCHKE_ECOLOGY_V3_VALIDITY_INPUTS;
export const TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT = 8;

export type TsotchkeEcologyPredictorV3Tier = 8 | 16 | 32;

const DEFAULT_TIER: TsotchkeEcologyPredictorV3Tier = 8;
const DEFAULT_LEARNING_RATE = 0.006;
const DEFAULT_RMS_DECAY = 0.95;
const DEFAULT_RMS_EPSILON = 1e-8;
const DEFAULT_GRADIENT_CLIP = 1;

const HISTORY_OFFSET = TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
const VALIDITY_OFFSET = HISTORY_OFFSET + TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS;

const isTier = (value: unknown): value is TsotchkeEcologyPredictorV3Tier =>
  value === 8 || value === 16 || value === 32;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const clamp01 = (value: unknown): number =>
  typeof value !== 'number' || !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

const clampParameter = (value: number): number =>
  !Number.isFinite(value)
    ? 0
    : value < -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT
      ? -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT
      : value > TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT
        ? TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT
        : value;

const sigmoid = (value: number): number => {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
};

const isFiniteInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

function validateNumberArray(
  value: unknown,
  length: number,
  minimum: number,
  maximum: number,
  label: string,
): asserts value is number[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new RangeError(`ecology predictor V3 ${label} is invalid`);
  }
  // Indexed validation is deliberate: Array#some skips sparse holes, while TypedArray#set turns a
  // restored hole into NaN. A checkpoint must prove every physical slot before any state mutates.
  for (let i = 0; i < length; i++) {
    if (!isFiniteInRange(value[i], minimum, maximum)) {
      throw new RangeError(`ecology predictor V3 ${label} is invalid`);
    }
  }
}

const snapshotPrediction = (
  input: readonly number[],
  tier: TsotchkeEcologyPredictorV3Tier,
  w1: readonly number[],
  b1: readonly number[],
  wSkip: readonly number[],
  w2: readonly number[],
  b2: number,
): number => {
  let logit = b2;
  for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
    logit += (wSkip[i] ?? 0) * (input[i] ?? 0);
  }
  for (let h = 0; h < tier; h++) {
    let activation = b1[h] ?? 0;
    const base = h * TSOTCHKE_ECOLOGY_V3_INPUTS;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
      activation += (w1[base + i] ?? 0) * (input[i] ?? 0);
    }
    logit += (w2[h] ?? 0) * Math.tanh(activation);
  }
  return sigmoid(logit);
};

/** Exact trainable scalar count for a skip-connected 101 -> H -> 1 tier. */
export function tsotchkeEcologyPredictorV3ParameterCount(
  tier: TsotchkeEcologyPredictorV3Tier,
): number {
  if (!isTier(tier)) throw new RangeError(`unsupported ecology predictor V3 tier: ${tier}`);
  return 103 * tier + 102;
}

/** Five normalized measurements available before the next ecological outcome is revealed. */
export interface TsotchkeEcologyPredictorV3Input {
  biomassDepletion?: number;
  metabolicDepletion?: number;
  crowding?: number;
  chaos?: number;
  thermalStress?: number;
}

export interface TsotchkeEcologyPredictorV3Options {
  tier?: TsotchkeEcologyPredictorV3Tier;
  /** Frozen controls still forecast, score, and advance the history clock. */
  adaptive?: boolean;
  /** When false, all 80 tap values and 16 validity bits are hidden from the model only. */
  historyInputs?: boolean;
  learningRate?: number;
  rmsDecay?: number;
  rmsEpsilon?: number;
  gradientClip?: number;
}

export interface TsotchkeEcologyForecastV3 {
  token: number;
  prediction: number;
  forecastCount: number;
  historyDepth: number;
}

export interface TsotchkeEcologyObservationV3 {
  token: number;
  outcome: number;
  prediction: number;
  signedResidual: number;
  softTargetSquaredError: number;
  updated: boolean;
  learningRate: number;
  observationCount: number;
  updateCount: number;
}

export interface TsotchkeEcologyPredictorV3Snapshot {
  schemaVersion: 1;
  model: 'tsotchke-ecology-predictor-v3';
  seed: number;
  tier: TsotchkeEcologyPredictorV3Tier;
  adaptive: boolean;
  config: {
    historyInputs: boolean;
    learningRate: number;
    rmsDecay: number;
    rmsEpsilon: number;
    gradientClip: number;
  };
  counters: {
    forecastCount: number;
    observationCount: number;
    updateCount: number;
    discardCount: number;
    episodeResetCount: number;
    episodeForecastCount: number;
    nextToken: number;
  };
  history: {
    /** Physical ring slots, five normalized values per slot. */
    ring: number[];
    /** Physical-slot validity bits. */
    validity: number[];
    /** Physical slot that will receive the next forecast input. */
    cursor: number;
  };
  pending: {
    active: boolean;
    token: number;
    /** Exact pre-insertion feature vector retained for training. */
    input: number[];
    prediction: number;
  };
  parameters: {
    w1: number[];
    b1: number[];
    wSkip: number[];
    w2: number[];
    b2: number;
  };
  optimizer: {
    rmsW1: number[];
    rmsB1: number[];
    rmsWSkip: number[];
    rmsW2: number[];
    rmsB2: number;
  };
}

/** Stateful deterministic 101 -> H -> 1 predictor with strict single-token ownership. */
export class TsotchkeEcologyPredictorV3 {
  private readonly seed: number;
  private readonly hiddenTier: TsotchkeEcologyPredictorV3Tier;
  private readonly adaptive: boolean;
  private readonly historyInputs: boolean;
  private readonly learningRate: number;
  private readonly rmsDecay: number;
  private readonly rmsEpsilon: number;
  private readonly gradientClip: number;

  private readonly w1: Float64Array;
  private readonly b1: Float64Array;
  private readonly wSkip = new Float64Array(TSOTCHKE_ECOLOGY_V3_INPUTS);
  private readonly w2: Float64Array;
  private b2 = 0;

  private readonly rmsW1: Float64Array;
  private readonly rmsB1: Float64Array;
  private readonly rmsWSkip = new Float64Array(TSOTCHKE_ECOLOGY_V3_INPUTS);
  private readonly rmsW2: Float64Array;
  private rmsB2 = 0;

  private readonly currentScratch = new Float64Array(TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS);
  private readonly inputScratch = new Float64Array(TSOTCHKE_ECOLOGY_V3_INPUTS);
  private readonly hiddenScratch: Float64Array;
  private readonly gradW1: Float64Array;
  private readonly gradB1: Float64Array;
  private readonly gradWSkip = new Float64Array(TSOTCHKE_ECOLOGY_V3_INPUTS);
  private readonly gradW2: Float64Array;

  private readonly historyRing = new Float64Array(TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS);
  private readonly historyValidity = new Uint8Array(TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS);
  private historyCursor = 0;

  private readonly pendingInput = new Float64Array(TSOTCHKE_ECOLOGY_V3_INPUTS);
  private pendingActive = false;
  private pendingToken = 0;
  private pendingPrediction = 0.5;

  private forecastCount = 0;
  private observationCount = 0;
  private updateCount = 0;
  private discardCount = 0;
  private episodeResetCount = 0;
  private episodeForecastCount = 0;
  private nextToken = 1;

  constructor(seed: number, options: TsotchkeEcologyPredictorV3Options = {}) {
    if (!Number.isSafeInteger(seed) || seed <= 0 || seed >= 0x1_0000_0000) {
      throw new RangeError(`ecology predictor V3 seed must be a nonzero uint32; received ${seed}`);
    }
    this.seed = seed;

    const tier = options.tier ?? DEFAULT_TIER;
    if (!isTier(tier)) throw new RangeError(`unsupported ecology predictor V3 tier: ${tier}`);
    this.hiddenTier = tier;

    const adaptive = options.adaptive ?? true;
    if (typeof adaptive !== 'boolean') {
      throw new TypeError('ecology predictor V3 adaptive control must be boolean');
    }
    this.adaptive = adaptive;

    const historyInputs = options.historyInputs ?? true;
    if (typeof historyInputs !== 'boolean') {
      throw new TypeError('ecology predictor V3 historyInputs control must be boolean');
    }
    this.historyInputs = historyInputs;

    this.learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE;
    this.rmsDecay = options.rmsDecay ?? DEFAULT_RMS_DECAY;
    this.rmsEpsilon = options.rmsEpsilon ?? DEFAULT_RMS_EPSILON;
    this.gradientClip = options.gradientClip ?? DEFAULT_GRADIENT_CLIP;
    this.validateConfiguration();

    this.w1 = new Float64Array(tier * TSOTCHKE_ECOLOGY_V3_INPUTS);
    this.b1 = new Float64Array(tier);
    this.w2 = new Float64Array(tier);
    this.rmsW1 = new Float64Array(this.w1.length);
    this.rmsB1 = new Float64Array(tier);
    this.rmsW2 = new Float64Array(tier);
    this.hiddenScratch = new Float64Array(tier);
    this.gradW1 = new Float64Array(this.w1.length);
    this.gradB1 = new Float64Array(tier);
    this.gradW2 = new Float64Array(tier);
    this.initializeParameters();
  }

  /** Rebuild an exact continuation, including an unresolved retained feature vector. */
  static fromSnapshot(snapshot: TsotchkeEcologyPredictorV3Snapshot): TsotchkeEcologyPredictorV3 {
    if (!isRecord(snapshot) || !isRecord(snapshot.config)) {
      throw new TypeError('unsupported ecology predictor V3 snapshot');
    }
    const predictor = new TsotchkeEcologyPredictorV3(snapshot.seed, {
      tier: snapshot.tier,
      adaptive: snapshot.adaptive,
      historyInputs: snapshot.config.historyInputs,
      learningRate: snapshot.config.learningRate,
      rmsDecay: snapshot.config.rmsDecay,
      rmsEpsilon: snapshot.config.rmsEpsilon,
      gradientClip: snapshot.config.gradientClip,
    });
    predictor.restore(snapshot);
    return predictor;
  }

  get tier(): TsotchkeEcologyPredictorV3Tier {
    return this.hiddenTier;
  }

  get trainableParameterCount(): number {
    return tsotchkeEcologyPredictorV3ParameterCount(this.hiddenTier);
  }

  get isAdaptive(): boolean {
    return this.adaptive;
  }

  get usesHistoryInputs(): boolean {
    return this.historyInputs;
  }

  get hasPendingForecast(): boolean {
    return this.pendingActive;
  }

  get historyDepth(): number {
    return Math.min(this.episodeForecastCount, TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS);
  }

  /**
   * Capture one prediction from the current input and the preceding 16 forecast inputs. Only after
   * capture is the current normalized input inserted into the ring.
   */
  forecast(input: TsotchkeEcologyPredictorV3Input = {}): TsotchkeEcologyForecastV3 {
    if (this.pendingActive) {
      throw new Error(`ecology predictor V3 token ${this.pendingToken} is still unresolved`);
    }
    if (!Number.isSafeInteger(this.nextToken) || this.nextToken >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('ecology predictor V3 token space is exhausted');
    }

    this.normalizeCurrentInto(this.currentScratch, input);
    this.capturePreInsertionFeatures();
    const prediction = this.forward(this.inputScratch);
    const token = this.nextToken;

    this.nextToken++;
    this.forecastCount++;
    this.pendingActive = true;
    this.pendingToken = token;
    this.pendingInput.set(this.inputScratch);
    this.pendingPrediction = prediction;
    this.insertCurrentIntoHistory();

    return {
      token,
      prediction,
      forecastCount: this.forecastCount,
      historyDepth: Math.min(this.episodeForecastCount - 1, TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS),
    };
  }

  /** Score and optionally train exactly once against the retained pre-insertion feature vector. */
  observe(observation: { token: number; outcome: number }): TsotchkeEcologyObservationV3 {
    if (
      !isRecord(observation) ||
      !Number.isSafeInteger(observation.token) ||
      observation.token <= 0
    ) {
      throw new TypeError('ecology predictor V3 observation token is absent or invalid');
    }
    const token = observation.token;
    if (!this.pendingActive) {
      if (token < this.nextToken) {
        throw new Error(`ecology predictor V3 token ${token} is stale or already resolved`);
      }
      throw new Error('ecology predictor V3 has no pending forecast');
    }
    if (token !== this.pendingToken) {
      if (token < this.pendingToken) {
        throw new Error(`ecology predictor V3 token ${token} is stale or already resolved`);
      }
      throw new Error(
        `ecology predictor V3 token ${token} does not match pending token ${this.pendingToken}`,
      );
    }
    if (!isFiniteInRange(observation.outcome, 0, 1)) {
      throw new RangeError('ecology predictor V3 outcome must be finite and in [0,1]');
    }

    const outcome = observation.outcome;
    const prediction = this.pendingPrediction;
    const signedResidual = outcome - prediction;
    const softTargetSquaredError = signedResidual * signedResidual;
    let updated = false;
    if (this.adaptive) {
      this.trainPending(outcome);
      this.updateCount++;
      updated = true;
    }
    this.observationCount++;
    this.clearPendingState();

    return {
      token,
      outcome,
      prediction,
      signedResidual,
      softTargetSquaredError,
      updated,
      learningRate: this.learningRate,
      observationCount: this.observationCount,
      updateCount: this.updateCount,
    };
  }

  /** Close an unresolved token without fabricating a label; its forecast input remains in history. */
  discardPending(): boolean {
    const discarded = this.pendingActive;
    if (discarded) {
      this.discardCount++;
      this.clearPendingState();
    }
    return discarded;
  }

  /** Clear only episode history. Learned state and global token/counters remain continuous. */
  resetEpisode(): void {
    if (this.pendingActive) {
      throw new Error(`ecology predictor V3 token ${this.pendingToken} is still unresolved`);
    }
    this.historyRing.fill(0);
    this.historyValidity.fill(0);
    this.historyCursor = 0;
    this.episodeForecastCount = 0;
    this.episodeResetCount++;
  }

  /** Allocation is confined to the evidence/control plane, never the forecast hot path. */
  snapshot(): TsotchkeEcologyPredictorV3Snapshot {
    return {
      schemaVersion: 1,
      model: 'tsotchke-ecology-predictor-v3',
      seed: this.seed,
      tier: this.hiddenTier,
      adaptive: this.adaptive,
      config: {
        historyInputs: this.historyInputs,
        learningRate: this.learningRate,
        rmsDecay: this.rmsDecay,
        rmsEpsilon: this.rmsEpsilon,
        gradientClip: this.gradientClip,
      },
      counters: {
        forecastCount: this.forecastCount,
        observationCount: this.observationCount,
        updateCount: this.updateCount,
        discardCount: this.discardCount,
        episodeResetCount: this.episodeResetCount,
        episodeForecastCount: this.episodeForecastCount,
        nextToken: this.nextToken,
      },
      history: {
        ring: Array.from(this.historyRing),
        validity: Array.from(this.historyValidity),
        cursor: this.historyCursor,
      },
      pending: {
        active: this.pendingActive,
        token: this.pendingToken,
        input: Array.from(this.pendingInput),
        prediction: this.pendingPrediction,
      },
      parameters: {
        w1: Array.from(this.w1),
        b1: Array.from(this.b1),
        wSkip: Array.from(this.wSkip),
        w2: Array.from(this.w2),
        b2: this.b2,
      },
      optimizer: {
        rmsW1: Array.from(this.rmsW1),
        rmsB1: Array.from(this.rmsB1),
        rmsWSkip: Array.from(this.rmsWSkip),
        rmsW2: Array.from(this.rmsW2),
        rmsB2: this.rmsB2,
      },
    };
  }

  /** Validate the complete JSON receipt before mutating any live field. */
  restore(snapshot: TsotchkeEcologyPredictorV3Snapshot): void {
    this.validateSnapshot(snapshot);

    this.forecastCount = snapshot.counters.forecastCount;
    this.observationCount = snapshot.counters.observationCount;
    this.updateCount = snapshot.counters.updateCount;
    this.discardCount = snapshot.counters.discardCount;
    this.episodeResetCount = snapshot.counters.episodeResetCount;
    this.episodeForecastCount = snapshot.counters.episodeForecastCount;
    this.nextToken = snapshot.counters.nextToken;
    this.historyRing.set(snapshot.history.ring);
    this.historyValidity.set(snapshot.history.validity);
    this.historyCursor = snapshot.history.cursor;
    this.pendingActive = snapshot.pending.active;
    this.pendingToken = snapshot.pending.token;
    this.pendingInput.set(snapshot.pending.input);
    this.pendingPrediction = snapshot.pending.prediction;
    this.w1.set(snapshot.parameters.w1);
    this.b1.set(snapshot.parameters.b1);
    this.wSkip.set(snapshot.parameters.wSkip);
    this.w2.set(snapshot.parameters.w2);
    this.b2 = snapshot.parameters.b2;
    this.rmsW1.set(snapshot.optimizer.rmsW1);
    this.rmsB1.set(snapshot.optimizer.rmsB1);
    this.rmsWSkip.set(snapshot.optimizer.rmsWSkip);
    this.rmsW2.set(snapshot.optimizer.rmsW2);
    this.rmsB2 = snapshot.optimizer.rmsB2;
  }

  private validateConfiguration(): void {
    if (!isFiniteInRange(this.learningRate, Number.MIN_VALUE, 1)) {
      throw new RangeError('ecology predictor V3 learningRate must be in (0,1]');
    }
    if (!isFiniteInRange(this.rmsDecay, 0, 1) || this.rmsDecay === 1) {
      throw new RangeError('ecology predictor V3 rmsDecay must be in [0,1)');
    }
    if (!isFiniteInRange(this.rmsEpsilon, Number.MIN_VALUE, 1)) {
      throw new RangeError('ecology predictor V3 rmsEpsilon must be in (0,1]');
    }
    if (!isFiniteInRange(this.gradientClip, Number.MIN_VALUE, 100)) {
      throw new RangeError('ecology predictor V3 gradientClip must be in (0,100]');
    }
  }

  /** Independent family streams preserve exact shared prefixes across all three hidden tiers. */
  private initializeParameters(): void {
    const hiddenRng = mulberry32((this.seed ^ 0x349a_13e7) >>> 0);
    const skipRng = mulberry32((this.seed ^ 0xb71f_602d) >>> 0);
    const outputRng = mulberry32((this.seed ^ 0x62c8_d945) >>> 0);
    const hiddenScale = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_V3_INPUTS + 32));
    const skipScale = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_V3_INPUTS + 1));
    const outputScale = Math.sqrt(6 / 33);
    for (let i = 0; i < this.w1.length; i++) this.w1[i] = (hiddenRng() * 2 - 1) * hiddenScale;
    for (let i = 0; i < this.wSkip.length; i++) this.wSkip[i] = (skipRng() * 2 - 1) * skipScale;
    for (let i = 0; i < this.w2.length; i++) this.w2[i] = (outputRng() * 2 - 1) * outputScale;
  }

  private normalizeCurrentInto(target: Float64Array, input: TsotchkeEcologyPredictorV3Input): void {
    const source = isRecord(input) ? input : {};
    target[0] = clamp01(source.biomassDepletion);
    target[1] = clamp01(source.metabolicDepletion);
    target[2] = clamp01(source.crowding);
    target[3] = clamp01(source.chaos);
    target[4] = clamp01(source.thermalStress);
  }

  private capturePreInsertionFeatures(): void {
    this.inputScratch.fill(0);
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
      this.inputScratch[i] = this.currentScratch[i] ?? 0;
    }
    if (!this.historyInputs) return;

    for (let tap = 0; tap < TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS; tap++) {
      const slot =
        (this.historyCursor - 1 - tap + TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS * 2) %
        TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
      const valid = this.historyValidity[slot] === 1;
      if (!valid) continue;
      const ringBase = slot * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
      const featureBase = HISTORY_OFFSET + tap * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
        this.inputScratch[featureBase + i] = this.historyRing[ringBase + i] ?? 0;
      }
      this.inputScratch[VALIDITY_OFFSET + tap] = 1;
    }
  }

  private insertCurrentIntoHistory(): void {
    const base = this.historyCursor * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
      this.historyRing[base + i] = this.currentScratch[i] ?? 0;
    }
    this.historyValidity[this.historyCursor] = 1;
    this.historyCursor = (this.historyCursor + 1) % TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
    this.episodeForecastCount++;
  }

  private forward(input: ArrayLike<number>): number {
    let logit = this.b2;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
      logit += (this.wSkip[i] ?? 0) * (input[i] ?? 0);
    }
    for (let h = 0; h < this.hiddenTier; h++) {
      let activation = this.b1[h] ?? 0;
      const base = h * TSOTCHKE_ECOLOGY_V3_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
        activation += (this.w1[base + i] ?? 0) * (input[i] ?? 0);
      }
      const hidden = Math.tanh(activation);
      this.hiddenScratch[h] = hidden;
      logit += (this.w2[h] ?? 0) * hidden;
    }
    return sigmoid(logit);
  }

  /** Cross-entropy logit gradient is p-y; RMSProp is globally clipped at a constant rate. */
  private trainPending(outcome: number): void {
    const prediction = this.forward(this.pendingInput);
    const logitGradient = prediction - outcome;
    let normSquared = logitGradient * logitGradient;

    for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
      const gradient = logitGradient * (this.pendingInput[i] ?? 0);
      this.gradWSkip[i] = gradient;
      normSquared += gradient * gradient;
    }
    for (let h = 0; h < this.hiddenTier; h++) {
      const hidden = this.hiddenScratch[h] ?? 0;
      const outputGradient = logitGradient * hidden;
      this.gradW2[h] = outputGradient;
      normSquared += outputGradient * outputGradient;
      const hiddenGradient = logitGradient * (this.w2[h] ?? 0) * (1 - hidden * hidden);
      this.gradB1[h] = hiddenGradient;
      normSquared += hiddenGradient * hiddenGradient;
      const base = h * TSOTCHKE_ECOLOGY_V3_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
        const gradient = hiddenGradient * (this.pendingInput[i] ?? 0);
        this.gradW1[base + i] = gradient;
        normSquared += gradient * gradient;
      }
    }

    const norm = Math.sqrt(normSquared);
    const scale = norm > this.gradientClip ? this.gradientClip / norm : 1;
    this.applyRmsProp(this.w1, this.rmsW1, this.gradW1, scale);
    this.applyRmsProp(this.b1, this.rmsB1, this.gradB1, scale);
    this.applyRmsProp(this.wSkip, this.rmsWSkip, this.gradWSkip, scale);
    this.applyRmsProp(this.w2, this.rmsW2, this.gradW2, scale);

    const clippedB2Gradient = logitGradient * scale;
    this.rmsB2 =
      this.rmsDecay * this.rmsB2 + (1 - this.rmsDecay) * clippedB2Gradient * clippedB2Gradient;
    this.b2 = clampParameter(
      this.b2 - (this.learningRate * clippedB2Gradient) / (Math.sqrt(this.rmsB2) + this.rmsEpsilon),
    );
  }

  private applyRmsProp(
    parameters: Float64Array,
    optimizer: Float64Array,
    gradients: Float64Array,
    scale: number,
  ): void {
    for (let i = 0; i < parameters.length; i++) {
      const gradient = (gradients[i] ?? 0) * scale;
      const rms = this.rmsDecay * (optimizer[i] ?? 0) + (1 - this.rmsDecay) * gradient * gradient;
      optimizer[i] = rms;
      parameters[i] = clampParameter(
        (parameters[i] ?? 0) - (this.learningRate * gradient) / (Math.sqrt(rms) + this.rmsEpsilon),
      );
    }
  }

  private clearPendingState(): void {
    this.pendingActive = false;
    this.pendingToken = 0;
    this.pendingInput.fill(0);
    this.pendingPrediction = 0.5;
  }

  private validateSnapshot(snapshot: TsotchkeEcologyPredictorV3Snapshot): void {
    if (
      !isRecord(snapshot) ||
      snapshot.schemaVersion !== 1 ||
      snapshot.model !== 'tsotchke-ecology-predictor-v3'
    ) {
      throw new TypeError('unsupported ecology predictor V3 snapshot');
    }
    if (
      snapshot.seed !== this.seed ||
      snapshot.tier !== this.hiddenTier ||
      snapshot.adaptive !== this.adaptive
    ) {
      throw new RangeError(
        'ecology predictor V3 snapshot tier/control does not match this instance',
      );
    }
    if (
      !isRecord(snapshot.config) ||
      snapshot.config.historyInputs !== this.historyInputs ||
      snapshot.config.learningRate !== this.learningRate ||
      snapshot.config.rmsDecay !== this.rmsDecay ||
      snapshot.config.rmsEpsilon !== this.rmsEpsilon ||
      snapshot.config.gradientClip !== this.gradientClip
    ) {
      throw new RangeError(
        'ecology predictor V3 snapshot configuration does not match this instance',
      );
    }
    if (
      !isRecord(snapshot.counters) ||
      !isNonNegativeSafeInteger(snapshot.counters.forecastCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.observationCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.updateCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.discardCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.episodeResetCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.episodeForecastCount) ||
      !Number.isSafeInteger(snapshot.counters.nextToken) ||
      snapshot.counters.nextToken <= 0
    ) {
      throw new RangeError('ecology predictor V3 snapshot counters are invalid');
    }
    if (
      snapshot.counters.episodeForecastCount > snapshot.counters.forecastCount ||
      snapshot.counters.episodeForecastCount < (snapshot.pending.active ? 1 : 0)
    ) {
      throw new RangeError('ecology predictor V3 episode counters are inconsistent');
    }
    if (!isRecord(snapshot.history)) {
      throw new RangeError('ecology predictor V3 snapshot history is invalid');
    }
    validateNumberArray(
      snapshot.history.ring,
      TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS,
      0,
      1,
      'history ring',
    );
    validateNumberArray(
      snapshot.history.validity,
      TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS,
      0,
      1,
      'history validity',
    );
    if (
      snapshot.history.validity.some((value) => value !== 0 && value !== 1) ||
      !Number.isSafeInteger(snapshot.history.cursor) ||
      snapshot.history.cursor < 0 ||
      snapshot.history.cursor >= TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS
    ) {
      throw new RangeError('ecology predictor V3 history cursor/validity is invalid');
    }
    const expectedCursor =
      snapshot.counters.episodeForecastCount % TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
    if (snapshot.history.cursor !== expectedCursor) {
      throw new RangeError('ecology predictor V3 history cursor is internally inconsistent');
    }
    const expectedValidCount = Math.min(
      snapshot.counters.episodeForecastCount,
      TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS,
    );
    for (let slot = 0; slot < TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS; slot++) {
      const expectedValid =
        expectedValidCount === TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS || slot < expectedValidCount;
      if (snapshot.history.validity[slot] !== (expectedValid ? 1 : 0)) {
        throw new RangeError('ecology predictor V3 history validity is internally inconsistent');
      }
      if (!expectedValid) {
        const base = slot * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
        for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
          if (snapshot.history.ring[base + i] !== 0) {
            throw new RangeError('ecology predictor V3 invalid history slots must be cleared');
          }
        }
      }
    }

    if (!isRecord(snapshot.pending) || typeof snapshot.pending.active !== 'boolean') {
      throw new RangeError('ecology predictor V3 snapshot pending state is invalid');
    }
    validateNumberArray(snapshot.pending.input, TSOTCHKE_ECOLOGY_V3_INPUTS, 0, 1, 'pending input');
    if (
      !Number.isSafeInteger(snapshot.pending.token) ||
      snapshot.pending.token < 0 ||
      !isFiniteInRange(snapshot.pending.prediction, 0, 1)
    ) {
      throw new RangeError('ecology predictor V3 snapshot pending token/prediction is invalid');
    }
    for (let tap = 0; tap < TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS; tap++) {
      const validity = snapshot.pending.input[VALIDITY_OFFSET + tap];
      if (validity !== 0 && validity !== 1) {
        throw new RangeError('ecology predictor V3 pending validity feature is invalid');
      }
    }

    if (!isRecord(snapshot.parameters) || !isRecord(snapshot.optimizer)) {
      throw new RangeError('ecology predictor V3 snapshot model state is invalid');
    }
    const hiddenWeights = this.hiddenTier * TSOTCHKE_ECOLOGY_V3_INPUTS;
    validateNumberArray(
      snapshot.parameters.w1,
      hiddenWeights,
      -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      'w1',
    );
    validateNumberArray(
      snapshot.parameters.b1,
      this.hiddenTier,
      -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      'b1',
    );
    validateNumberArray(
      snapshot.parameters.wSkip,
      TSOTCHKE_ECOLOGY_V3_INPUTS,
      -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      'skip weights',
    );
    validateNumberArray(
      snapshot.parameters.w2,
      this.hiddenTier,
      -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      'w2',
    );
    if (
      !isFiniteInRange(
        snapshot.parameters.b2,
        -TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
        TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      )
    ) {
      throw new RangeError('ecology predictor V3 b2 is invalid');
    }
    if (
      !this.adaptive &&
      (snapshot.parameters.b2 !== this.b2 ||
        snapshot.parameters.w1.some((value, index) => value !== this.w1[index]) ||
        snapshot.parameters.b1.some((value, index) => value !== this.b1[index]) ||
        snapshot.parameters.wSkip.some((value, index) => value !== this.wSkip[index]) ||
        snapshot.parameters.w2.some((value, index) => value !== this.w2[index]))
    ) {
      throw new RangeError(
        'ecology predictor V3 frozen parameters must match deterministic initialization',
      );
    }

    const rmsLimit = this.gradientClip * this.gradientClip + 1e-12;
    validateNumberArray(snapshot.optimizer.rmsW1, hiddenWeights, 0, rmsLimit, 'RMS w1');
    validateNumberArray(snapshot.optimizer.rmsB1, this.hiddenTier, 0, rmsLimit, 'RMS b1');
    validateNumberArray(
      snapshot.optimizer.rmsWSkip,
      TSOTCHKE_ECOLOGY_V3_INPUTS,
      0,
      rmsLimit,
      'RMS skip weights',
    );
    validateNumberArray(snapshot.optimizer.rmsW2, this.hiddenTier, 0, rmsLimit, 'RMS w2');
    if (!isFiniteInRange(snapshot.optimizer.rmsB2, 0, rmsLimit)) {
      throw new RangeError('ecology predictor V3 RMS b2 is invalid');
    }

    const closedCount = snapshot.counters.observationCount + snapshot.counters.discardCount;
    if (
      snapshot.counters.forecastCount !== closedCount + (snapshot.pending.active ? 1 : 0) ||
      snapshot.counters.nextToken !== snapshot.counters.forecastCount + 1 ||
      snapshot.counters.updateCount !== (this.adaptive ? snapshot.counters.observationCount : 0)
    ) {
      throw new RangeError('ecology predictor V3 snapshot counter relationships are invalid');
    }
    if (snapshot.pending.active) {
      if (
        snapshot.pending.token !== snapshot.counters.forecastCount ||
        snapshot.counters.episodeForecastCount === 0
      ) {
        throw new RangeError('ecology predictor V3 pending token is internally inconsistent');
      }
      const insertedSlot =
        (snapshot.history.cursor - 1 + TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS) %
        TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
      const insertedBase = insertedSlot * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
        if (snapshot.history.ring[insertedBase + i] !== snapshot.pending.input[i]) {
          throw new RangeError('ecology predictor V3 pending current input was not inserted');
        }
      }
      this.validatePendingHistory(snapshot);
      const expectedPrediction = snapshotPrediction(
        snapshot.pending.input,
        this.hiddenTier,
        snapshot.parameters.w1,
        snapshot.parameters.b1,
        snapshot.parameters.wSkip,
        snapshot.parameters.w2,
        snapshot.parameters.b2,
      );
      if (Math.abs(expectedPrediction - snapshot.pending.prediction) > 1e-12) {
        throw new RangeError('ecology predictor V3 pending prediction does not match parameters');
      }
    } else if (
      snapshot.pending.token !== 0 ||
      snapshot.pending.prediction !== 0.5 ||
      snapshot.pending.input.some((value) => value !== 0)
    ) {
      throw new RangeError('ecology predictor V3 cleared pending state is internally inconsistent');
    }
    if (
      !this.adaptive &&
      (snapshot.optimizer.rmsB2 !== 0 ||
        snapshot.optimizer.rmsW1.some((value) => value !== 0) ||
        snapshot.optimizer.rmsB1.some((value) => value !== 0) ||
        snapshot.optimizer.rmsWSkip.some((value) => value !== 0) ||
        snapshot.optimizer.rmsW2.some((value) => value !== 0))
    ) {
      throw new RangeError('ecology predictor V3 frozen optimizer must remain unchanged');
    }
  }

  private validatePendingHistory(snapshot: TsotchkeEcologyPredictorV3Snapshot): void {
    if (!this.historyInputs) {
      for (let i = HISTORY_OFFSET; i < TSOTCHKE_ECOLOGY_V3_INPUTS; i++) {
        if (snapshot.pending.input[i] !== 0) {
          throw new RangeError('ecology predictor V3 ablated pending history must be zero');
        }
      }
      return;
    }

    const precedingForecasts = snapshot.counters.episodeForecastCount - 1;
    for (let tap = 0; tap < TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS; tap++) {
      const expectedValid = tap < Math.min(precedingForecasts, TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS);
      if (snapshot.pending.input[VALIDITY_OFFSET + tap] !== (expectedValid ? 1 : 0)) {
        throw new RangeError('ecology predictor V3 pending history validity is inconsistent');
      }
      const featureBase = HISTORY_OFFSET + tap * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
      if (!expectedValid) {
        for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
          if (snapshot.pending.input[featureBase + i] !== 0) {
            throw new RangeError('ecology predictor V3 invalid pending history must be zero');
          }
        }
        continue;
      }

      // Once full, insertion overwrites the sixteenth prior tap. The retained pending vector is the
      // only surviving exact copy of that oldest value; the newer fifteen taps remain cross-checkable.
      if (tap === TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS - 1) continue;
      const slot =
        (snapshot.history.cursor - 2 - tap + TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS * 2) %
        TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS;
      const ringBase = slot * TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS; i++) {
        if (snapshot.pending.input[featureBase + i] !== snapshot.history.ring[ringBase + i]) {
          throw new RangeError('ecology predictor V3 pending history is inconsistent with ring');
        }
      }
    }
  }
}
