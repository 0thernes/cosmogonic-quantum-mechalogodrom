/**
 * Deterministic successor ecology predictor.
 *
 * A forecast is always made from information available before its outcome. The returned token must
 * be resolved exactly once with `observe`, or explicitly abandoned with `discardPending`. The model
 * is a skip-connected 9 -> H -> 1 network where H is one of the audited 4/8/16 tiers. Temporal inputs
 * are derived only from already revealed outcomes.
 *
 * This is a bounded classical online learner. It is intentionally not wired into the organism
 * intelligence integration yet and makes no consciousness, sentience, or superiority claim.
 */

import { mulberry32 } from '../math/rng';

export const TSOTCHKE_ECOLOGY_V2_CURRENT_INPUTS = 5;
export const TSOTCHKE_ECOLOGY_V2_TEMPORAL_INPUTS = 4;
export const TSOTCHKE_ECOLOGY_V2_INPUTS = 9;
export const TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT = 8;

export type TsotchkeEcologyPredictorV2Tier = 4 | 8 | 16;

const DEFAULT_TIER: TsotchkeEcologyPredictorV2Tier = 4;
const DEFAULT_SLOW_LEARNING_RATE = 0.004;
const DEFAULT_FAST_LEARNING_RATE = 0.04;
const DEFAULT_RMS_DECAY = 0.95;
const DEFAULT_RMS_EPSILON = 1e-8;
const DEFAULT_GRADIENT_CLIP = 1;
const DEFAULT_DRIFT_ALPHA = 0.08;

const isTier = (value: unknown): value is TsotchkeEcologyPredictorV2Tier =>
  value === 4 || value === 8 || value === 16;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const clamp01 = (value: unknown): number =>
  typeof value !== 'number' || !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

const clampParameter = (value: number): number =>
  !Number.isFinite(value)
    ? 0
    : value < -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT
      ? -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT
      : value > TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT
        ? TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT
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
  if (
    !Array.isArray(value) ||
    value.length !== length ||
    value.some((entry) => !isFiniteInRange(entry, minimum, maximum))
  ) {
    throw new RangeError(`ecology predictor V2 ${label} is invalid`);
  }
}

const snapshotPrediction = (
  input: readonly number[],
  tier: TsotchkeEcologyPredictorV2Tier,
  w1: readonly number[],
  b1: readonly number[],
  wSkip: readonly number[],
  w2: readonly number[],
  b2: number,
): number => {
  let logit = b2;
  for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
    logit += (wSkip[i] ?? 0) * (input[i] ?? 0);
  }
  for (let h = 0; h < tier; h++) {
    let activation = b1[h] ?? 0;
    const base = h * TSOTCHKE_ECOLOGY_V2_INPUTS;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
      activation += (w1[base + i] ?? 0) * (input[i] ?? 0);
    }
    logit += (w2[h] ?? 0) * Math.tanh(activation);
  }
  return sigmoid(logit);
};

/** Exact number of trainable scalars in a 9 -> H -> 1 tier, including the skip path. */
export function tsotchkeEcologyPredictorV2ParameterCount(
  tier: TsotchkeEcologyPredictorV2Tier,
): number {
  if (!isTier(tier)) throw new RangeError(`unsupported ecology predictor V2 tier: ${tier}`);
  return 11 * tier + 10;
}

/** Five normalized observations available before an ecological outcome is revealed. */
export interface TsotchkeEcologyPredictorV2Input {
  biomassDepletion?: number;
  metabolicDepletion?: number;
  crowding?: number;
  chaos?: number;
  thermalStress?: number;
}

export interface TsotchkeEcologyPredictorV2Options {
  tier?: TsotchkeEcologyPredictorV2Tier;
  /** Frozen controls still score observations and advance temporal/drift context. */
  adaptive?: boolean;
  /** When false, the four temporal features are zeroed while revealed context still advances. */
  temporalInputs?: boolean;
  slowLearningRate?: number;
  fastLearningRate?: number;
  rmsDecay?: number;
  rmsEpsilon?: number;
  gradientClip?: number;
  driftAlpha?: number;
}

export interface TsotchkeEcologyForecastV2 {
  token: number;
  prediction: number;
  forecastCount: number;
}

export interface TsotchkeEcologyObservationV2 {
  token: number;
  outcome: number;
  gradientTarget: number;
  prediction: number;
  signedResidual: number;
  softTargetSquaredError: number;
  updated: boolean;
  learningRate: number;
  driftScore: number;
  observationCount: number;
  updateCount: number;
}

export interface TsotchkeEcologyPredictorV2Snapshot {
  schemaVersion: 1;
  model: 'tsotchke-ecology-predictor-v2';
  seed: number;
  tier: TsotchkeEcologyPredictorV2Tier;
  adaptive: boolean;
  config: {
    temporalInputs: boolean;
    slowLearningRate: number;
    fastLearningRate: number;
    rmsDecay: number;
    rmsEpsilon: number;
    gradientClip: number;
    driftAlpha: number;
  };
  counters: {
    forecastCount: number;
    observationCount: number;
    updateCount: number;
    discardCount: number;
    nextToken: number;
  };
  context: {
    valid: boolean;
    lastRevealedOutcome: number;
    lastSignedResidual: number;
    lastOutcomeDelta: number;
    driftScore: number;
  };
  pending: {
    active: boolean;
    token: number;
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

/** Stateful deterministic skip-connected online predictor with strict token ownership. */
export class TsotchkeEcologyPredictorV2 {
  private readonly seed: number;
  private readonly hiddenTier: TsotchkeEcologyPredictorV2Tier;
  private readonly adaptive: boolean;
  private readonly temporalInputs: boolean;
  private readonly slowLearningRate: number;
  private readonly fastLearningRate: number;
  private readonly rmsDecay: number;
  private readonly rmsEpsilon: number;
  private readonly gradientClip: number;
  private readonly driftAlpha: number;

  private readonly w1: Float64Array;
  private readonly b1: Float64Array;
  private readonly wSkip = new Float64Array(TSOTCHKE_ECOLOGY_V2_INPUTS);
  private readonly w2: Float64Array;
  private b2 = 0;

  private readonly rmsW1: Float64Array;
  private readonly rmsB1: Float64Array;
  private readonly rmsWSkip = new Float64Array(TSOTCHKE_ECOLOGY_V2_INPUTS);
  private readonly rmsW2: Float64Array;
  private rmsB2 = 0;

  private readonly inputScratch = new Float64Array(TSOTCHKE_ECOLOGY_V2_INPUTS);
  private readonly hiddenScratch: Float64Array;
  private readonly gradW1: Float64Array;
  private readonly gradB1: Float64Array;
  private readonly gradWSkip = new Float64Array(TSOTCHKE_ECOLOGY_V2_INPUTS);
  private readonly gradW2: Float64Array;

  private readonly pendingInput = new Float64Array(TSOTCHKE_ECOLOGY_V2_INPUTS);
  private pendingActive = false;
  private pendingToken = 0;
  private pendingPrediction = 0.5;

  private contextValid = false;
  private lastRevealedOutcome = 0;
  private lastSignedResidual = 0;
  private lastOutcomeDelta = 0;
  private driftScore = 0;

  private forecastCount = 0;
  private observationCount = 0;
  private updateCount = 0;
  private discardCount = 0;
  private nextToken = 1;

  constructor(seed: number, options: TsotchkeEcologyPredictorV2Options = {}) {
    if (!Number.isSafeInteger(seed) || seed <= 0 || seed >= 0x1_0000_0000) {
      throw new RangeError(`ecology predictor V2 seed must be a nonzero uint32; received ${seed}`);
    }
    this.seed = seed;
    const tier = options.tier ?? DEFAULT_TIER;
    if (!isTier(tier)) throw new RangeError(`unsupported ecology predictor V2 tier: ${tier}`);
    this.hiddenTier = tier;

    const adaptive = options.adaptive ?? true;
    if (typeof adaptive !== 'boolean') {
      throw new TypeError('ecology predictor V2 adaptive control must be boolean');
    }
    this.adaptive = adaptive;

    const temporalInputs = options.temporalInputs ?? true;
    if (typeof temporalInputs !== 'boolean') {
      throw new TypeError('ecology predictor V2 temporalInputs control must be boolean');
    }
    this.temporalInputs = temporalInputs;

    this.slowLearningRate = options.slowLearningRate ?? DEFAULT_SLOW_LEARNING_RATE;
    this.fastLearningRate = options.fastLearningRate ?? DEFAULT_FAST_LEARNING_RATE;
    this.rmsDecay = options.rmsDecay ?? DEFAULT_RMS_DECAY;
    this.rmsEpsilon = options.rmsEpsilon ?? DEFAULT_RMS_EPSILON;
    this.gradientClip = options.gradientClip ?? DEFAULT_GRADIENT_CLIP;
    this.driftAlpha = options.driftAlpha ?? DEFAULT_DRIFT_ALPHA;
    this.validateConfiguration();

    this.w1 = new Float64Array(tier * TSOTCHKE_ECOLOGY_V2_INPUTS);
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

  /** Rebuild an exact continuation, including a forecast that is awaiting its outcome. */
  static fromSnapshot(snapshot: TsotchkeEcologyPredictorV2Snapshot): TsotchkeEcologyPredictorV2 {
    if (!isRecord(snapshot) || !isRecord(snapshot.config)) {
      throw new TypeError('unsupported ecology predictor V2 snapshot');
    }
    const predictor = new TsotchkeEcologyPredictorV2(snapshot.seed, {
      tier: snapshot.tier,
      adaptive: snapshot.adaptive,
      temporalInputs: snapshot.config.temporalInputs,
      slowLearningRate: snapshot.config.slowLearningRate,
      fastLearningRate: snapshot.config.fastLearningRate,
      rmsDecay: snapshot.config.rmsDecay,
      rmsEpsilon: snapshot.config.rmsEpsilon,
      gradientClip: snapshot.config.gradientClip,
      driftAlpha: snapshot.config.driftAlpha,
    });
    predictor.restore(snapshot);
    return predictor;
  }

  get tier(): TsotchkeEcologyPredictorV2Tier {
    return this.hiddenTier;
  }

  get trainableParameterCount(): number {
    return tsotchkeEcologyPredictorV2ParameterCount(this.hiddenTier);
  }

  get isAdaptive(): boolean {
    return this.adaptive;
  }

  get usesTemporalInputs(): boolean {
    return this.temporalInputs;
  }

  get hasPendingForecast(): boolean {
    return this.pendingActive;
  }

  get currentDriftScore(): number {
    return this.driftScore;
  }

  /**
   * Emit one pre-outcome prediction. Missing, non-finite, and out-of-range observations are
   * deterministically clamped into [0,1]. A second forecast is forbidden until this token closes.
   */
  forecast(input: TsotchkeEcologyPredictorV2Input = {}): TsotchkeEcologyForecastV2 {
    if (this.pendingActive) {
      throw new Error(`ecology predictor V2 token ${this.pendingToken} is still unresolved`);
    }
    if (!Number.isSafeInteger(this.nextToken) || this.nextToken >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('ecology predictor V2 token space is exhausted');
    }

    this.normalizeInto(this.inputScratch, input);
    const prediction = this.forward(this.inputScratch);
    const token = this.nextToken;
    this.nextToken++;
    this.forecastCount++;
    this.pendingActive = true;
    this.pendingToken = token;
    this.pendingInput.set(this.inputScratch);
    this.pendingPrediction = prediction;
    return { token, prediction, forecastCount: this.forecastCount };
  }

  /**
   * Score a token against a revealed finite soft outcome in [0,1], then (for adaptive arms) mutate
   * parameters against an optional gradient-only target. Revealed outcome/context/drift state never
   * reads that gradient target. Invalid values leave the pending forecast untouched.
   */
  observe(observation: {
    token: number;
    outcome: number;
    gradientTarget?: number;
  }): TsotchkeEcologyObservationV2 {
    if (
      !isRecord(observation) ||
      !Number.isSafeInteger(observation.token) ||
      observation.token <= 0
    ) {
      throw new TypeError('ecology predictor V2 observation token is absent or invalid');
    }
    const token = observation.token;
    if (!this.pendingActive) {
      if (token < this.nextToken) {
        throw new Error(`ecology predictor V2 token ${token} is stale or already resolved`);
      }
      throw new Error('ecology predictor V2 has no pending forecast');
    }
    if (token !== this.pendingToken) {
      if (token < this.pendingToken) {
        throw new Error(`ecology predictor V2 token ${token} is stale or already resolved`);
      }
      throw new Error(
        `ecology predictor V2 token ${token} does not match pending token ${this.pendingToken}`,
      );
    }
    if (!isFiniteInRange(observation.outcome, 0, 1)) {
      throw new RangeError('ecology predictor V2 outcome must be finite and in [0,1]');
    }
    const gradientTarget = observation.gradientTarget ?? observation.outcome;
    if (!isFiniteInRange(gradientTarget, 0, 1)) {
      throw new RangeError('ecology predictor V2 gradient target must be finite and in [0,1]');
    }

    // These scores are deliberately captured from the forecast before any state mutation.
    const outcome = observation.outcome;
    const prediction = this.pendingPrediction;
    const signedResidual = outcome - prediction;
    const softTargetSquaredError = signedResidual * signedResidual;
    const nextDriftScore = clamp01(
      (1 - this.driftAlpha) * this.driftScore + this.driftAlpha * Math.abs(signedResidual),
    );
    const learningRate =
      this.slowLearningRate + (this.fastLearningRate - this.slowLearningRate) * nextDriftScore;

    let updated = false;
    if (this.adaptive) {
      this.trainPending(gradientTarget, learningRate);
      this.updateCount++;
      updated = true;
    }

    const previousOutcome = this.lastRevealedOutcome;
    this.lastOutcomeDelta = this.contextValid ? outcome - previousOutcome : 0;
    this.lastRevealedOutcome = outcome;
    this.lastSignedResidual = signedResidual;
    this.driftScore = nextDriftScore;
    this.contextValid = true;
    this.observationCount++;
    this.clearPendingState();

    return {
      token,
      outcome,
      gradientTarget,
      prediction,
      signedResidual,
      softTargetSquaredError,
      updated,
      learningRate,
      driftScore: this.driftScore,
      observationCount: this.observationCount,
      updateCount: this.updateCount,
    };
  }

  /**
   * Close an unresolved token without fabricating a label. Setting `resetContext` also clears the
   * four temporal features and residual EWMA; learned parameters and RMSProp state are retained.
   */
  discardPending(resetContext = false): boolean {
    if (typeof resetContext !== 'boolean') {
      throw new TypeError('ecology predictor V2 resetContext must be boolean');
    }
    const discarded = this.pendingActive;
    if (discarded) {
      this.discardCount++;
      this.clearPendingState();
    }
    if (resetContext) this.resetTemporalContext();
    return discarded;
  }

  /** Allocation is confined to the control/evidence plane, never the forecast hot path. */
  snapshot(): TsotchkeEcologyPredictorV2Snapshot {
    return {
      schemaVersion: 1,
      model: 'tsotchke-ecology-predictor-v2',
      seed: this.seed,
      tier: this.hiddenTier,
      adaptive: this.adaptive,
      config: {
        temporalInputs: this.temporalInputs,
        slowLearningRate: this.slowLearningRate,
        fastLearningRate: this.fastLearningRate,
        rmsDecay: this.rmsDecay,
        rmsEpsilon: this.rmsEpsilon,
        gradientClip: this.gradientClip,
        driftAlpha: this.driftAlpha,
      },
      counters: {
        forecastCount: this.forecastCount,
        observationCount: this.observationCount,
        updateCount: this.updateCount,
        discardCount: this.discardCount,
        nextToken: this.nextToken,
      },
      context: {
        valid: this.contextValid,
        lastRevealedOutcome: this.lastRevealedOutcome,
        lastSignedResidual: this.lastSignedResidual,
        lastOutcomeDelta: this.lastOutcomeDelta,
        driftScore: this.driftScore,
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

  /** Validate the complete receipt before changing a single field of the live predictor. */
  restore(snapshot: TsotchkeEcologyPredictorV2Snapshot): void {
    this.validateSnapshot(snapshot);

    this.forecastCount = snapshot.counters.forecastCount;
    this.observationCount = snapshot.counters.observationCount;
    this.updateCount = snapshot.counters.updateCount;
    this.discardCount = snapshot.counters.discardCount;
    this.nextToken = snapshot.counters.nextToken;
    this.contextValid = snapshot.context.valid;
    this.lastRevealedOutcome = snapshot.context.lastRevealedOutcome;
    this.lastSignedResidual = snapshot.context.lastSignedResidual;
    this.lastOutcomeDelta = snapshot.context.lastOutcomeDelta;
    this.driftScore = snapshot.context.driftScore;
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
    if (
      !isFiniteInRange(this.slowLearningRate, Number.MIN_VALUE, 1) ||
      !isFiniteInRange(this.fastLearningRate, this.slowLearningRate, 1)
    ) {
      throw new RangeError(
        'ecology predictor V2 learning rates must satisfy 0 < slow <= fast <= 1',
      );
    }
    if (!isFiniteInRange(this.rmsDecay, 0, 1) || this.rmsDecay === 1) {
      throw new RangeError('ecology predictor V2 rmsDecay must be in [0,1)');
    }
    if (!isFiniteInRange(this.rmsEpsilon, Number.MIN_VALUE, 1)) {
      throw new RangeError('ecology predictor V2 rmsEpsilon must be in (0,1]');
    }
    if (!isFiniteInRange(this.gradientClip, Number.MIN_VALUE, 100)) {
      throw new RangeError('ecology predictor V2 gradientClip must be in (0,100]');
    }
    if (!isFiniteInRange(this.driftAlpha, Number.MIN_VALUE, 1)) {
      throw new RangeError('ecology predictor V2 driftAlpha must be in (0,1]');
    }
  }

  private initializeParameters(): void {
    const rng = mulberry32((this.seed ^ 0x72c4_9a31 ^ this.hiddenTier) >>> 0);
    const hiddenScale = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_V2_INPUTS + this.hiddenTier));
    const outputScale = Math.sqrt(6 / (this.hiddenTier + 1));
    const skipScale = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_V2_INPUTS + 1));
    for (let i = 0; i < this.w1.length; i++) this.w1[i] = (rng() * 2 - 1) * hiddenScale;
    for (let i = 0; i < this.wSkip.length; i++) this.wSkip[i] = (rng() * 2 - 1) * skipScale;
    for (let i = 0; i < this.w2.length; i++) this.w2[i] = (rng() * 2 - 1) * outputScale;
  }

  private normalizeInto(target: Float64Array, input: TsotchkeEcologyPredictorV2Input): void {
    const source = isRecord(input) ? input : {};
    target[0] = clamp01(source.biomassDepletion);
    target[1] = clamp01(source.metabolicDepletion);
    target[2] = clamp01(source.crowding);
    target[3] = clamp01(source.chaos);
    target[4] = clamp01(source.thermalStress);
    const exposeContext = this.temporalInputs && this.contextValid;
    target[5] = exposeContext ? this.lastRevealedOutcome : 0;
    target[6] = exposeContext ? this.lastSignedResidual : 0;
    target[7] = exposeContext ? this.lastOutcomeDelta : 0;
    target[8] = exposeContext ? 1 : 0;
  }

  private forward(input: ArrayLike<number>): number {
    let logit = this.b2;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
      logit += (this.wSkip[i] ?? 0) * (input[i] ?? 0);
    }
    for (let h = 0; h < this.hiddenTier; h++) {
      let activation = this.b1[h] ?? 0;
      const base = h * TSOTCHKE_ECOLOGY_V2_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
        activation += (this.w1[base + i] ?? 0) * (input[i] ?? 0);
      }
      const hidden = Math.tanh(activation);
      this.hiddenScratch[h] = hidden;
      logit += (this.w2[h] ?? 0) * hidden;
    }
    return sigmoid(logit);
  }

  /** Cross-entropy logit gradient is exactly p-y; RMSProp is deterministic and globally clipped. */
  private trainPending(outcome: number, learningRate: number): void {
    const prediction = this.forward(this.pendingInput);
    const logitGradient = prediction - outcome;
    let normSquared = logitGradient * logitGradient;

    for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
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
      const base = h * TSOTCHKE_ECOLOGY_V2_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_INPUTS; i++) {
        const gradient = hiddenGradient * (this.pendingInput[i] ?? 0);
        this.gradW1[base + i] = gradient;
        normSquared += gradient * gradient;
      }
    }

    const gradientNorm = Math.sqrt(normSquared);
    const scale = gradientNorm > this.gradientClip ? this.gradientClip / gradientNorm : 1;
    this.applyRmsProp(this.w1, this.rmsW1, this.gradW1, scale, learningRate);
    this.applyRmsProp(this.b1, this.rmsB1, this.gradB1, scale, learningRate);
    this.applyRmsProp(this.wSkip, this.rmsWSkip, this.gradWSkip, scale, learningRate);
    this.applyRmsProp(this.w2, this.rmsW2, this.gradW2, scale, learningRate);

    const clippedB2Gradient = logitGradient * scale;
    this.rmsB2 =
      this.rmsDecay * this.rmsB2 + (1 - this.rmsDecay) * clippedB2Gradient * clippedB2Gradient;
    this.b2 = clampParameter(
      this.b2 - (learningRate * clippedB2Gradient) / (Math.sqrt(this.rmsB2) + this.rmsEpsilon),
    );
  }

  private applyRmsProp(
    parameters: Float64Array,
    optimizer: Float64Array,
    gradients: Float64Array,
    scale: number,
    learningRate: number,
  ): void {
    for (let i = 0; i < parameters.length; i++) {
      const gradient = (gradients[i] ?? 0) * scale;
      const rms = this.rmsDecay * (optimizer[i] ?? 0) + (1 - this.rmsDecay) * gradient * gradient;
      optimizer[i] = rms;
      parameters[i] = clampParameter(
        (parameters[i] ?? 0) - (learningRate * gradient) / (Math.sqrt(rms) + this.rmsEpsilon),
      );
    }
  }

  private clearPendingState(): void {
    this.pendingActive = false;
    this.pendingToken = 0;
    this.pendingInput.fill(0);
    this.pendingPrediction = 0.5;
  }

  private resetTemporalContext(): void {
    this.contextValid = false;
    this.lastRevealedOutcome = 0;
    this.lastSignedResidual = 0;
    this.lastOutcomeDelta = 0;
    this.driftScore = 0;
  }

  private validateSnapshot(snapshot: TsotchkeEcologyPredictorV2Snapshot): void {
    if (
      !isRecord(snapshot) ||
      snapshot.schemaVersion !== 1 ||
      snapshot.model !== 'tsotchke-ecology-predictor-v2'
    ) {
      throw new TypeError('unsupported ecology predictor V2 snapshot');
    }
    if (
      snapshot.seed !== this.seed ||
      snapshot.tier !== this.hiddenTier ||
      snapshot.adaptive !== this.adaptive
    ) {
      throw new RangeError(
        'ecology predictor V2 snapshot tier/control does not match this instance',
      );
    }
    if (
      !isRecord(snapshot.config) ||
      snapshot.config.temporalInputs !== this.temporalInputs ||
      snapshot.config.slowLearningRate !== this.slowLearningRate ||
      snapshot.config.fastLearningRate !== this.fastLearningRate ||
      snapshot.config.rmsDecay !== this.rmsDecay ||
      snapshot.config.rmsEpsilon !== this.rmsEpsilon ||
      snapshot.config.gradientClip !== this.gradientClip ||
      snapshot.config.driftAlpha !== this.driftAlpha
    ) {
      throw new RangeError(
        'ecology predictor V2 snapshot configuration does not match this instance',
      );
    }
    if (
      !isRecord(snapshot.counters) ||
      !isNonNegativeSafeInteger(snapshot.counters.forecastCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.observationCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.updateCount) ||
      !isNonNegativeSafeInteger(snapshot.counters.discardCount) ||
      !Number.isSafeInteger(snapshot.counters.nextToken) ||
      snapshot.counters.nextToken <= 0
    ) {
      throw new RangeError('ecology predictor V2 snapshot counters are invalid');
    }
    if (!isRecord(snapshot.context) || typeof snapshot.context.valid !== 'boolean') {
      throw new RangeError('ecology predictor V2 snapshot context is invalid');
    }
    if (
      !isFiniteInRange(snapshot.context.lastRevealedOutcome, 0, 1) ||
      !isFiniteInRange(snapshot.context.lastSignedResidual, -1, 1) ||
      !isFiniteInRange(snapshot.context.lastOutcomeDelta, -1, 1) ||
      !isFiniteInRange(snapshot.context.driftScore, 0, 1)
    ) {
      throw new RangeError('ecology predictor V2 snapshot context values are invalid');
    }
    if (
      !snapshot.context.valid &&
      (snapshot.context.lastRevealedOutcome !== 0 ||
        snapshot.context.lastSignedResidual !== 0 ||
        snapshot.context.lastOutcomeDelta !== 0 ||
        snapshot.context.driftScore !== 0)
    ) {
      throw new RangeError('ecology predictor V2 cleared context is internally inconsistent');
    }
    if (snapshot.context.valid && snapshot.counters.observationCount === 0) {
      throw new RangeError('ecology predictor V2 valid context requires a revealed observation');
    }
    if (!isRecord(snapshot.pending) || typeof snapshot.pending.active !== 'boolean') {
      throw new RangeError('ecology predictor V2 snapshot pending state is invalid');
    }
    validateNumberArray(snapshot.pending.input, TSOTCHKE_ECOLOGY_V2_INPUTS, -1, 1, 'pending input');
    if (
      !Number.isSafeInteger(snapshot.pending.token) ||
      snapshot.pending.token < 0 ||
      !isFiniteInRange(snapshot.pending.prediction, 0, 1)
    ) {
      throw new RangeError('ecology predictor V2 snapshot pending token/prediction is invalid');
    }
    for (let i = 0; i < TSOTCHKE_ECOLOGY_V2_CURRENT_INPUTS; i++) {
      if (!isFiniteInRange(snapshot.pending.input[i], 0, 1)) {
        throw new RangeError('ecology predictor V2 current pending features are invalid');
      }
    }
    if (!isFiniteInRange(snapshot.pending.input[5], 0, 1)) {
      throw new RangeError('ecology predictor V2 pending outcome feature is invalid');
    }
    if (snapshot.pending.input[8] !== 0 && snapshot.pending.input[8] !== 1) {
      throw new RangeError('ecology predictor V2 pending context flag is invalid');
    }

    if (!isRecord(snapshot.parameters) || !isRecord(snapshot.optimizer)) {
      throw new RangeError('ecology predictor V2 snapshot model state is invalid');
    }
    const hiddenWeights = this.hiddenTier * TSOTCHKE_ECOLOGY_V2_INPUTS;
    validateNumberArray(
      snapshot.parameters.w1,
      hiddenWeights,
      -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      'w1',
    );
    validateNumberArray(
      snapshot.parameters.b1,
      this.hiddenTier,
      -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      'b1',
    );
    validateNumberArray(
      snapshot.parameters.wSkip,
      TSOTCHKE_ECOLOGY_V2_INPUTS,
      -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      'skip weights',
    );
    validateNumberArray(
      snapshot.parameters.w2,
      this.hiddenTier,
      -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      'w2',
    );
    if (
      !isFiniteInRange(
        snapshot.parameters.b2,
        -TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
        TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      )
    ) {
      throw new RangeError('ecology predictor V2 b2 is invalid');
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
        'ecology predictor V2 frozen parameters must match deterministic initialization',
      );
    }

    const rmsLimit = this.gradientClip * this.gradientClip + 1e-12;
    validateNumberArray(snapshot.optimizer.rmsW1, hiddenWeights, 0, rmsLimit, 'RMS w1');
    validateNumberArray(snapshot.optimizer.rmsB1, this.hiddenTier, 0, rmsLimit, 'RMS b1');
    validateNumberArray(
      snapshot.optimizer.rmsWSkip,
      TSOTCHKE_ECOLOGY_V2_INPUTS,
      0,
      rmsLimit,
      'RMS skip weights',
    );
    validateNumberArray(snapshot.optimizer.rmsW2, this.hiddenTier, 0, rmsLimit, 'RMS w2');
    if (!isFiniteInRange(snapshot.optimizer.rmsB2, 0, rmsLimit)) {
      throw new RangeError('ecology predictor V2 RMS b2 is invalid');
    }

    const closedCount = snapshot.counters.observationCount + snapshot.counters.discardCount;
    if (
      snapshot.counters.forecastCount !== closedCount + (snapshot.pending.active ? 1 : 0) ||
      snapshot.counters.nextToken !== snapshot.counters.forecastCount + 1 ||
      snapshot.counters.updateCount !== (this.adaptive ? snapshot.counters.observationCount : 0)
    ) {
      throw new RangeError('ecology predictor V2 snapshot counter relationships are invalid');
    }
    if (snapshot.pending.active) {
      if (
        snapshot.pending.token !== snapshot.counters.forecastCount ||
        snapshot.pending.input[5] !==
          (this.temporalInputs && snapshot.context.valid
            ? snapshot.context.lastRevealedOutcome
            : 0) ||
        snapshot.pending.input[6] !==
          (this.temporalInputs && snapshot.context.valid
            ? snapshot.context.lastSignedResidual
            : 0) ||
        snapshot.pending.input[7] !==
          (this.temporalInputs && snapshot.context.valid ? snapshot.context.lastOutcomeDelta : 0) ||
        snapshot.pending.input[8] !== (this.temporalInputs && snapshot.context.valid ? 1 : 0)
      ) {
        throw new RangeError('ecology predictor V2 pending context is internally inconsistent');
      }
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
        throw new RangeError('ecology predictor V2 pending prediction does not match parameters');
      }
    } else if (
      snapshot.pending.token !== 0 ||
      snapshot.pending.prediction !== 0.5 ||
      snapshot.pending.input.some((value) => value !== 0)
    ) {
      throw new RangeError('ecology predictor V2 cleared pending state is internally inconsistent');
    }
    if (
      !this.adaptive &&
      (snapshot.optimizer.rmsB2 !== 0 ||
        snapshot.optimizer.rmsW1.some((value) => value !== 0) ||
        snapshot.optimizer.rmsB1.some((value) => value !== 0) ||
        snapshot.optimizer.rmsWSkip.some((value) => value !== 0) ||
        snapshot.optimizer.rmsW2.some((value) => value !== 0))
    ) {
      throw new RangeError('ecology predictor V2 frozen optimizer must remain unchanged');
    }
  }
}
