/**
 * Deterministic online ecology predictor for the live simple_mnist Tsotchke lane.
 *
 * The leaf owns a small 4 -> 4 -> 1 MLP. At cadence t, `step(current, outcomeForPrevious)` first
 * applies the newly observed supervised outcome to the sample retained at cadence t - 1, then emits
 * and retains a prediction for `current`. This explicit one-cadence lag prevents the predictor from
 * training on information that was unavailable when its prediction was made.
 *
 * The shared organism field routes the prediction through simple_mnist's declared threat lane and uses
 * lagged error as bounded exploration/plasticity evidence. It is deterministic classical computation,
 * not consciousness, sentience, or physical quantum AI.
 */

import { mulberry32 } from '../math/rng';

export const TSOTCHKE_ECOLOGY_INPUTS = 4;
export const TSOTCHKE_ECOLOGY_HIDDEN = 4;

const DEFAULT_LEARNING_RATE = 0.08;
const PARAMETER_LIMIT = 8;

const clamp01 = (value: number): number =>
  !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

const clampParameter = (value: number): number =>
  !Number.isFinite(value)
    ? 0
    : value < -PARAMETER_LIMIT
      ? -PARAMETER_LIMIT
      : value > PARAMETER_LIMIT
        ? PARAMETER_LIMIT
        : value;

const sigmoid = (value: number): number => {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
};

const snapshotPrediction = (
  input: readonly number[],
  w1: readonly number[],
  b1: readonly number[],
  w2: readonly number[],
  b2: number,
): number => {
  let output = b2;
  for (let h = 0; h < TSOTCHKE_ECOLOGY_HIDDEN; h++) {
    let sum = b1[h] ?? 0;
    const base = h * TSOTCHKE_ECOLOGY_INPUTS;
    for (let i = 0; i < TSOTCHKE_ECOLOGY_INPUTS; i++) {
      sum += (w1[base + i] ?? 0) * (input[i] ?? 0);
    }
    output += (w2[h] ?? 0) * Math.tanh(sum);
  }
  return clamp01(sigmoid(output));
};

/** The four normalized observations consumed by the predictor. */
export interface TsotchkeEcologyInput {
  biomassDepletion: number;
  metabolicDepletion: number;
  crowding: number;
  chaosThermalStress: number;
}

export interface TsotchkeEcologyPredictorOptions {
  /** Frozen mode still predicts and scores lagged outcomes, but never changes parameters. */
  adaptive?: boolean;
  /** Fixed deterministic SGD rate. Must be finite and in (0, 1]. */
  learningRate?: number;
}

export interface TsotchkeEcologyPrediction {
  /** Predicted next-cadence ecological pressure in [0,1]. */
  prediction: number;
  /** Brier loss for the previous cadence, or null when no valid lagged label was available. */
  previousBrier: number | null;
  /** True only when this call applied an adaptive parameter update. */
  updated: boolean;
  revision: number;
  updateCount: number;
}

export interface TsotchkeEcologyPredictorSnapshot {
  schemaVersion: 1;
  model: 'tsotchke-ecology-predictor';
  seed: number;
  learningRate: number;
  adaptive: boolean;
  revision: number;
  updateCount: number;
  hasPending: boolean;
  pendingInput: number[];
  pendingPrediction: number;
  w1: number[];
  b1: number[];
  w2: number[];
  b2: number;
}

/** Stateful deterministic 4 -> 4 -> 1 online predictor. */
export class TsotchkeEcologyPredictor {
  private readonly seed: number;
  private readonly learningRate: number;
  private adaptive: boolean;

  /** Hidden-major matrix: 4 hidden rows x 4 input columns. */
  private readonly w1 = new Float64Array(TSOTCHKE_ECOLOGY_HIDDEN * TSOTCHKE_ECOLOGY_INPUTS);
  private readonly b1 = new Float64Array(TSOTCHKE_ECOLOGY_HIDDEN);
  private readonly w2 = new Float64Array(TSOTCHKE_ECOLOGY_HIDDEN);
  private b2 = 0;

  private readonly pendingInput = new Float64Array(TSOTCHKE_ECOLOGY_INPUTS);
  private readonly inputScratch = new Float64Array(TSOTCHKE_ECOLOGY_INPUTS);
  private readonly hiddenScratch = new Float64Array(TSOTCHKE_ECOLOGY_HIDDEN);
  private pendingPrediction = 0.5;
  private hasPending = false;
  private revision = 0;
  private updateCount = 0;

  constructor(seed: number, options: TsotchkeEcologyPredictorOptions = {}) {
    this.seed = seed >>> 0 || 1;
    const learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE;
    if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 1) {
      throw new RangeError(`ecology predictor learningRate must be in (0,1], got ${learningRate}`);
    }
    this.learningRate = learningRate;
    this.adaptive = options.adaptive ?? true;
    this.initialize();
  }

  /** Rebuild an exact deterministic continuation from a validated snapshot. */
  static fromSnapshot(snapshot: TsotchkeEcologyPredictorSnapshot): TsotchkeEcologyPredictor {
    const predictor = new TsotchkeEcologyPredictor(snapshot.seed, {
      adaptive: snapshot.adaptive,
      learningRate: snapshot.learningRate,
    });
    predictor.restore(snapshot);
    return predictor;
  }

  get isAdaptive(): boolean {
    return this.adaptive;
  }

  setAdaptive(adaptive: boolean): void {
    this.adaptive = adaptive;
  }

  /** End a discontinuous sampling interval without inventing a future label for the stale sample. */
  clearPending(): void {
    this.hasPending = false;
    this.pendingInput.fill(0);
    this.pendingPrediction = 0.5;
  }

  /** Pure prediction with respect to learned state; no lag/counter state is changed. */
  predict(input: TsotchkeEcologyInput): number {
    this.normalizeInto(this.inputScratch, input);
    return this.forward(this.inputScratch);
  }

  /**
   * Process one cadence.
   *
   * `outcomeForPrevious` is a soft or binary target in [0,1] for the observation supplied to the
   * preceding call. Non-finite labels are treated as unavailable rather than as ecological evidence.
   */
  step(input: TsotchkeEcologyInput, outcomeForPrevious?: number): TsotchkeEcologyPrediction {
    let previousBrier: number | null = null;
    let updated = false;
    if (
      this.hasPending &&
      outcomeForPrevious !== undefined &&
      Number.isFinite(outcomeForPrevious)
    ) {
      const target = clamp01(outcomeForPrevious);
      const error = this.pendingPrediction - target;
      previousBrier = error * error;
      if (this.adaptive) {
        this.trainPending(target);
        this.updateCount++;
        updated = true;
      }
    }

    this.normalizeInto(this.inputScratch, input);
    const prediction = this.forward(this.inputScratch);
    this.pendingInput.set(this.inputScratch);
    this.pendingPrediction = prediction;
    this.hasPending = true;
    this.revision++;

    return {
      prediction,
      previousBrier,
      updated,
      revision: this.revision,
      updateCount: this.updateCount,
    };
  }

  /** Allocation is deliberate: snapshots are evidence/control-plane data, never a hot-path result. */
  snapshot(): TsotchkeEcologyPredictorSnapshot {
    return {
      schemaVersion: 1,
      model: 'tsotchke-ecology-predictor',
      seed: this.seed,
      learningRate: this.learningRate,
      adaptive: this.adaptive,
      revision: this.revision,
      updateCount: this.updateCount,
      hasPending: this.hasPending,
      pendingInput: Array.from(this.pendingInput),
      pendingPrediction: this.pendingPrediction,
      w1: Array.from(this.w1),
      b1: Array.from(this.b1),
      w2: Array.from(this.w2),
      b2: this.b2,
    };
  }

  /** Validate completely before mutating live state. */
  restore(snapshot: TsotchkeEcologyPredictorSnapshot): void {
    if (snapshot.schemaVersion !== 1 || snapshot.model !== 'tsotchke-ecology-predictor') {
      throw new TypeError('unsupported ecology predictor snapshot');
    }
    if (snapshot.seed !== this.seed || snapshot.learningRate !== this.learningRate) {
      throw new RangeError('ecology predictor snapshot configuration does not match this instance');
    }
    if (
      typeof snapshot.adaptive !== 'boolean' ||
      typeof snapshot.hasPending !== 'boolean' ||
      !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 0 ||
      !Number.isSafeInteger(snapshot.updateCount) ||
      snapshot.updateCount < 0 ||
      snapshot.updateCount > Math.max(0, snapshot.revision - 1) ||
      (snapshot.hasPending && snapshot.revision === 0)
    ) {
      throw new RangeError('ecology predictor snapshot counters are invalid');
    }
    if (
      snapshot.pendingInput.length !== TSOTCHKE_ECOLOGY_INPUTS ||
      snapshot.w1.length !== this.w1.length ||
      snapshot.b1.length !== this.b1.length ||
      snapshot.w2.length !== this.w2.length
    ) {
      throw new RangeError('ecology predictor snapshot dimensions are invalid');
    }
    if (
      snapshot.pendingInput.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
      !Number.isFinite(snapshot.pendingPrediction) ||
      snapshot.pendingPrediction < 0 ||
      snapshot.pendingPrediction > 1
    ) {
      throw new RangeError('ecology predictor pending state is invalid');
    }
    const parameters = [...snapshot.w1, ...snapshot.b1, ...snapshot.w2, snapshot.b2];
    if (parameters.some((value) => !Number.isFinite(value) || Math.abs(value) > PARAMETER_LIMIT)) {
      throw new RangeError('ecology predictor parameters are invalid');
    }
    if (snapshot.adaptive !== this.adaptive) {
      throw new RangeError('ecology predictor snapshot adaptive mode does not match this instance');
    }
    if (
      !snapshot.hasPending &&
      (snapshot.pendingPrediction !== 0.5 || snapshot.pendingInput.some((value) => value !== 0))
    ) {
      throw new RangeError('ecology predictor cleared pending state is internally inconsistent');
    }
    if (snapshot.hasPending) {
      const expectedPrediction = snapshotPrediction(
        snapshot.pendingInput,
        snapshot.w1,
        snapshot.b1,
        snapshot.w2,
        snapshot.b2,
      );
      if (Math.abs(expectedPrediction - snapshot.pendingPrediction) > 1e-12) {
        throw new RangeError('ecology predictor pending prediction does not match its parameters');
      }
    }

    this.revision = snapshot.revision;
    this.updateCount = snapshot.updateCount;
    this.hasPending = snapshot.hasPending;
    this.pendingInput.set(snapshot.pendingInput);
    this.pendingPrediction = snapshot.pendingPrediction;
    this.w1.set(snapshot.w1);
    this.b1.set(snapshot.b1);
    this.w2.set(snapshot.w2);
    this.b2 = snapshot.b2;
  }

  private initialize(): void {
    const rng = mulberry32((this.seed ^ 0x51a7_ec01) >>> 0 || 1);
    const scale1 = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_INPUTS + TSOTCHKE_ECOLOGY_HIDDEN));
    const scale2 = Math.sqrt(6 / (TSOTCHKE_ECOLOGY_HIDDEN + 1));
    for (let i = 0; i < this.w1.length; i++) this.w1[i] = (rng() * 2 - 1) * scale1;
    for (let i = 0; i < this.w2.length; i++) this.w2[i] = (rng() * 2 - 1) * scale2;
  }

  private normalizeInto(target: Float64Array, input: TsotchkeEcologyInput): void {
    target[0] = clamp01(input.biomassDepletion);
    target[1] = clamp01(input.metabolicDepletion);
    target[2] = clamp01(input.crowding);
    target[3] = clamp01(input.chaosThermalStress);
  }

  private forward(input: ArrayLike<number>): number {
    for (let h = 0; h < TSOTCHKE_ECOLOGY_HIDDEN; h++) {
      let sum = this.b1[h] ?? 0;
      const base = h * TSOTCHKE_ECOLOGY_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_INPUTS; i++) {
        sum += (this.w1[base + i] ?? 0) * (input[i] ?? 0);
      }
      this.hiddenScratch[h] = Math.tanh(sum);
    }
    let output = this.b2;
    for (let h = 0; h < TSOTCHKE_ECOLOGY_HIDDEN; h++) {
      output += (this.w2[h] ?? 0) * (this.hiddenScratch[h] ?? 0);
    }
    return clamp01(sigmoid(output));
  }

  /** One exact Brier-loss SGD update against the retained previous-cadence observation. */
  private trainPending(target: number): void {
    const prediction = this.forward(this.pendingInput);
    const outputGradient = 2 * (prediction - target) * prediction * (1 - prediction);
    for (let h = 0; h < TSOTCHKE_ECOLOGY_HIDDEN; h++) {
      const hidden = this.hiddenScratch[h] ?? 0;
      const oldOutputWeight = this.w2[h] ?? 0;
      const hiddenGradient = outputGradient * oldOutputWeight * (1 - hidden * hidden);
      this.w2[h] = clampParameter(oldOutputWeight - this.learningRate * outputGradient * hidden);
      const base = h * TSOTCHKE_ECOLOGY_INPUTS;
      for (let i = 0; i < TSOTCHKE_ECOLOGY_INPUTS; i++) {
        this.w1[base + i] = clampParameter(
          (this.w1[base + i] ?? 0) -
            this.learningRate * hiddenGradient * (this.pendingInput[i] ?? 0),
        );
      }
      this.b1[h] = clampParameter((this.b1[h] ?? 0) - this.learningRate * hiddenGradient);
    }
    this.b2 = clampParameter(this.b2 - this.learningRate * outputGradient);
  }
}
