/**
 * Phase-B per-organism resource head.
 *
 * This leaf is intentionally disconnected from {@link EntityBrainField}: integration and any
 * confirmatory behaviour claim require a separately frozen protocol. It provides a compact,
 * deterministic actor/value readout over an interpretable diagonal leaky reservoir:
 *
 * - 8 bounded inputs: four named semantic lanes, a two-axis goal cue, energy, and speed;
 * - H = 2/4/8 common-prefix tiers;
 * - 8H input + H diagonal recurrent + 3H output + 3 bias = 12H + 3 parameters;
 * - fixed simulation-time half-lives, which are constants rather than counted parameters; and
 * - one mutable seeded actor/value readout, bounded around inheritance and updated only by reward.
 *
 * Construction, observation, reward, reset, and cached reads consume no external RNG. The hot path
 * allocates nothing after construction. Snapshotting is a low-cadence diagnostic/persistence path and
 * deliberately allocates plain arrays.
 */

export type EntityResourceHeadTier = 2 | 4 | 8;

export const ENTITY_RESOURCE_HEAD_INPUTS = 8;
export const LEGACY_ENTITY_BRAIN_PARAMETERS = 70;

/**
 * Effective simulation-time half-lives for the common-prefix reservoir units. The exponential leak
 * is integrated analytically, so a constant drive over equal simulated time is cadence-independent
 * apart from FP32 storage rounding.
 */
export const ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16] as const;

const OUTPUTS = 3;
const ACTOR_X = 0;
const ACTOR_Z = 1;
const VALUE = 2;
const DEFAULT_LEARNING_RATE = 0.025;
const DEFAULT_MAX_OUTPUT_OFFSET = 0.35;
const MAX_DT_SECONDS = 1;
const SNAPSHOT_VERSION = 1 as const;
const INPUT_STREAM = 0x52c0_1001;
const RECURRENT_STREAM = 0x52c0_2002;
const OUTPUT_STREAM = 0x52c0_3003;
const BIAS_STREAM = 0x52c0_4004;
const INPUT_SCALE = 0.42;
const RECURRENT_SCALE = 0.2;
const OUTPUT_SCALE = 0.32;
const BIAS_SCALE = 0.08;

const clampSigned = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return value <= -1 ? -1 : value >= 1 ? 1 : value;
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= 1 ? 1 : value;
};

const clampToInheritedRange = (value: number, inherited: number, offset: number): number => {
  const lower = Math.fround(inherited - offset);
  const upper = Math.fround(inherited + offset);
  return value <= lower ? lower : value >= upper ? upper : Math.fround(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTier = (value: unknown): value is EntityResourceHeadTier =>
  value === 2 || value === 4 || value === 8;

const assertRevision = (revision: number, label: string): void => {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
};

/** Coordinate-addressed uint32 mixer. Adding a wider tier never advances or perturbs a smaller one. */
const coordinateUnit = (seed: number, stream: number, index: number): number => {
  let value = (seed ^ stream ^ Math.imul(index + 1, 0x9e37_79b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0_aaad) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x735a_2d97) >>> 0;
  return ((value ^ (value >>> 15)) >>> 0) / 4_294_967_296;
};

const seededWeight = (seed: number, stream: number, index: number, scale: number): number =>
  Math.fround((coordinateUnit(seed, stream, index) * 2 - 1) * scale);

const assertFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
  return value;
};

const assertBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
};

const copyFiniteArray = (
  value: unknown,
  length: number,
  label: string,
  bound: number,
): Float32Array => {
  if (!Array.isArray(value) || value.length !== length) {
    throw new RangeError(`${label} must contain exactly ${length} values`);
  }
  const copy = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const entry = assertFiniteNumber(value[i], `${label}[${i}]`);
    if (Math.abs(entry) > bound) throw new RangeError(`${label}[${i}] is outside ±${bound}`);
    copy[i] = entry;
  }
  return copy;
};

const assertExactArray = (actual: Float32Array, expected: Float32Array, label: string): void => {
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${label}[${i}] does not match the deterministic seed/tier parameters`);
    }
  }
};

const assertWithinInheritedRange = (
  actual: Float32Array,
  seed: number,
  stream: number,
  scale: number,
  offset: number,
  label: string,
): void => {
  for (let i = 0; i < actual.length; i++) {
    const inherited = seededWeight(seed, stream, i, scale);
    const lower = Math.fround(inherited - offset);
    const upper = Math.fround(inherited + offset);
    const value = actual[i] ?? 0;
    if (value < lower || value > upper) {
      throw new RangeError(`${label}[${i}] is outside its inherited ±${offset} range`);
    }
  }
};

export interface EntityResourceHeadObservation {
  /** Monotonic ecology-goal revision. One reservoir update is permitted per revision. */
  readonly revision: number;
  /** Elapsed simulation time, not wall-clock time. Sanitized to [0, 1] second. */
  readonly dtSeconds: number;
  /** Four OrganismIntelligenceSignal-compatible semantic lanes, each sanitized to [0, 1]. */
  readonly resource: number;
  readonly threat: number;
  readonly exploration: number;
  readonly social: number;
  /** Signed goal direction; multiplied by bounded desire and cover before entering the head. */
  readonly goalX: number;
  readonly goalZ: number;
  readonly desire: number;
  readonly cover: number;
  readonly energy: number;
  readonly speed: number;
}

export interface EntityResourceHeadAction {
  /** Bounded steering suggestion in [-1, 1]. */
  readonly x: number;
  /** Bounded steering suggestion in [-1, 1]. */
  readonly z: number;
  /** Bounded food-return estimate in [-1, 1]. */
  readonly value: number;
  /** Observation revision that produced this cached action, or -1 before the first observation. */
  readonly revision: number;
}

interface MutableEntityResourceHeadAction {
  x: number;
  z: number;
  value: number;
  revision: number;
}

export interface EntityResourceHeadConfig {
  readonly learningRate?: number;
  readonly maxOutputOffset?: number;
  readonly onlineLearningEnabled?: boolean;
  readonly recurrenceEnabled?: boolean;
}

export interface EntityResourceHeadSnapshot {
  readonly version: typeof SNAPSHOT_VERSION;
  readonly seed: number;
  readonly tier: EntityResourceHeadTier;
  readonly config: {
    readonly learningRate: number;
    readonly maxOutputOffset: number;
  };
  readonly controls: {
    readonly onlineLearningEnabled: boolean;
    readonly recurrenceEnabled: boolean;
  };
  readonly halfLivesSeconds: readonly number[];
  readonly parameters: {
    readonly input: readonly number[];
    readonly recurrent: readonly number[];
    readonly output: readonly number[];
    readonly bias: readonly number[];
  };
  readonly hidden: readonly number[];
  readonly cachedAction: EntityResourceHeadAction;
  readonly observedRevision: number;
  readonly consumedRewardRevision: number | null;
}

interface ValidatedSnapshotState {
  readonly hidden: Float32Array;
  readonly outputWeights: Float32Array;
  readonly outputBias: Float32Array;
  readonly actionX: number;
  readonly actionZ: number;
  readonly actionValue: number;
  readonly actionRevision: number;
  readonly observedRevision: number;
  readonly consumedRewardRevision: number | null;
  readonly onlineLearningEnabled: boolean;
  readonly recurrenceEnabled: boolean;
}

/**
 * A compact deterministic resource actor/value head. This is a mechanism, not evidence of behavioural
 * benefit, general intelligence, consciousness, or sentience.
 */
export class EntityResourceHead {
  readonly seed: number;
  readonly tier: EntityResourceHeadTier;

  private readonly learningRate: number;
  private readonly maxOutputOffset: number;
  private onlineLearningEnabled: boolean;
  private recurrenceEnabled: boolean;

  /** Neuron-major: [neuron × 8 + input]. */
  private readonly inputWeights: Float32Array;
  /** Stable diagonal self-connection; kept in (-1, 1). */
  private readonly recurrentWeights: Float32Array;
  /** Neuron-major mutable readout: [neuron × 3 + output]. */
  private readonly outputWeights: Float32Array;
  /** Mutable output biases. Together with outputWeights, this is the only online-plastic set. */
  private readonly outputBias: Float32Array;

  private readonly hidden: Float32Array;
  private readonly inputs = new Float32Array(ENTITY_RESOURCE_HEAD_INPUTS);
  private readonly cachedAction: MutableEntityResourceHeadAction = {
    x: 0,
    z: 0,
    value: 0,
    revision: -1,
  };
  private observedRevision = -1;
  private consumedRewardRevision: number | null = null;

  constructor(
    seed: number,
    tier: EntityResourceHeadTier = 4,
    config: EntityResourceHeadConfig = {},
  ) {
    if (!Number.isSafeInteger(seed) || seed <= 0 || seed > 0xffff_ffff) {
      throw new RangeError('seed must be a nonzero uint32');
    }
    if (!isTier(tier)) throw new RangeError('tier must be 2, 4, or 8');
    const learningRate = config.learningRate ?? DEFAULT_LEARNING_RATE;
    const maxOutputOffset = config.maxOutputOffset ?? DEFAULT_MAX_OUTPUT_OFFSET;
    if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 1) {
      throw new RangeError('learningRate must be finite and in (0, 1]');
    }
    if (!Number.isFinite(maxOutputOffset) || maxOutputOffset <= 0 || maxOutputOffset > 1) {
      throw new RangeError('maxOutputOffset must be finite and in (0, 1]');
    }

    this.seed = seed;
    this.tier = tier;
    this.learningRate = learningRate;
    this.maxOutputOffset = maxOutputOffset;
    this.onlineLearningEnabled = config.onlineLearningEnabled ?? true;
    this.recurrenceEnabled = config.recurrenceEnabled ?? true;
    assertBoolean(this.onlineLearningEnabled, 'onlineLearningEnabled');
    assertBoolean(this.recurrenceEnabled, 'recurrenceEnabled');

    this.inputWeights = new Float32Array(tier * ENTITY_RESOURCE_HEAD_INPUTS);
    this.recurrentWeights = new Float32Array(tier);
    this.outputWeights = new Float32Array(tier * OUTPUTS);
    this.outputBias = new Float32Array(OUTPUTS);
    this.hidden = new Float32Array(tier);

    for (let i = 0; i < this.inputWeights.length; i++) {
      this.inputWeights[i] = seededWeight(this.seed, INPUT_STREAM, i, INPUT_SCALE);
    }
    for (let i = 0; i < this.recurrentWeights.length; i++) {
      // Strictly stable diagonal recurrence; no spectral-radius estimation or hidden allocation.
      this.recurrentWeights[i] = seededWeight(this.seed, RECURRENT_STREAM, i, RECURRENT_SCALE);
    }
    this.resetReadoutParameters();
  }

  /** Exact live architecture count. Fixed leak half-lives and runtime state are not parameters. */
  parameterCount(): number {
    return 12 * this.tier + 3;
  }

  /** Intended combined count when layered beside the existing 70-parameter organism brain. */
  totalParameterCount(): number {
    return LEGACY_ENTITY_BRAIN_PARAMETERS + this.parameterCount();
  }

  /** Bytes in all typed-array storage owned by this head (parameters, state, and scratch). */
  storageBytes(): number {
    return (
      this.inputWeights.byteLength +
      this.recurrentWeights.byteLength +
      this.outputWeights.byteLength +
      this.outputBias.byteLength +
      this.hidden.byteLength +
      this.inputs.byteLength
    );
  }

  setOnlineLearningEnabled(enabled: boolean): void {
    this.onlineLearningEnabled = assertBoolean(enabled, 'onlineLearningEnabled');
  }

  /**
   * Switch between leaky recurrent state and a current-input counterfactual. A transition clears the
   * hidden state so re-enabling recurrence cannot revive pre-control memory.
   */
  setRecurrenceEnabled(enabled: boolean): void {
    assertBoolean(enabled, 'recurrenceEnabled');
    if (enabled === this.recurrenceEnabled) return;
    this.recurrenceEnabled = enabled;
    this.hidden.fill(0);
  }

  /**
   * Update the reservoir and cache one action for a new goal revision. The caller can read that action
   * repeatedly without advancing state. Semantic/cue faults are neutralized; revision faults throw.
   */
  observe(observation: EntityResourceHeadObservation): void {
    assertRevision(observation.revision, 'observation revision');
    if (observation.revision <= this.observedRevision) {
      throw new RangeError('observation revision must increase monotonically');
    }

    const desireCover = clamp01(observation.desire) * clamp01(observation.cover);
    this.inputs[0] = clamp01(observation.resource);
    this.inputs[1] = clamp01(observation.threat);
    this.inputs[2] = clamp01(observation.exploration);
    this.inputs[3] = clamp01(observation.social);
    this.inputs[4] = Math.fround(clampSigned(observation.goalX) * desireCover);
    this.inputs[5] = Math.fround(clampSigned(observation.goalZ) * desireCover);
    this.inputs[6] = clamp01(observation.energy);
    this.inputs[7] = clamp01(observation.speed);

    const dt = clamp01(observation.dtSeconds / MAX_DT_SECONDS) * MAX_DT_SECONDS;
    for (let neuron = 0; neuron < this.tier; neuron++) {
      const base = neuron * ENTITY_RESOURCE_HEAD_INPUTS;
      let drive = 0;
      for (let input = 0; input < ENTITY_RESOURCE_HEAD_INPUTS; input++) {
        drive += (this.inputWeights[base + input] ?? 0) * (this.inputs[input] ?? 0);
      }
      const current = Math.tanh(drive);
      if (!this.recurrenceEnabled) {
        this.hidden[neuron] = current;
        continue;
      }

      // Exact integration of a stable diagonal linear reservoir around the current bounded drive.
      const recurrent = this.recurrentWeights[neuron] ?? 0;
      const equilibrium = clampSigned(current / (1 - recurrent));
      const halfLife = ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS[neuron] ?? 1;
      const retention = 2 ** (-dt / halfLife);
      const previous = this.hidden[neuron] ?? 0;
      this.hidden[neuron] = clampSigned(equilibrium + (previous - equilibrium) * retention);
    }

    let actorX = this.outputBias[ACTOR_X]!;
    let actorZ = this.outputBias[ACTOR_Z]!;
    let value = this.outputBias[VALUE]!;
    for (let neuron = 0; neuron < this.tier; neuron++) {
      const activation = this.hidden[neuron] ?? 0;
      const base = neuron * OUTPUTS;
      actorX += activation * (this.outputWeights[base + ACTOR_X] ?? 0);
      actorZ += activation * (this.outputWeights[base + ACTOR_Z] ?? 0);
      value += activation * (this.outputWeights[base + VALUE] ?? 0);
    }

    this.cachedAction.x = clampSigned(Math.tanh(actorX));
    this.cachedAction.z = clampSigned(Math.tanh(actorZ));
    this.cachedAction.value = clampSigned(Math.tanh(value));
    this.cachedAction.revision = observation.revision;
    this.observedRevision = observation.revision;
  }

  /** Allocation-free read: the same stable object identity is returned until and after each update. */
  readAction(): Readonly<EntityResourceHeadAction> {
    return this.cachedAction;
  }

  /**
   * Consume one externally measured, bounded food reward for the latest cached action. No inferred
   * energy delta or proxy can enter this API. A revision is consumed even when learning is disabled.
   */
  applyFoodReward(revision: number, reward: number): void {
    assertRevision(revision, 'reward revision');
    if (revision !== this.observedRevision) {
      throw new RangeError('food reward must target the latest observed revision');
    }
    if (this.consumedRewardRevision === revision) {
      throw new Error(`food reward revision ${revision} was already consumed`);
    }
    if (!Number.isFinite(reward)) throw new TypeError('food reward must be finite');
    const boundedReward = clampSigned(reward);
    this.consumedRewardRevision = revision;
    if (!this.onlineLearningEnabled) return;

    const advantage = boundedReward - this.cachedAction.value;
    const actorGradientX = advantage * this.cachedAction.x;
    const actorGradientZ = advantage * this.cachedAction.z;
    for (let neuron = 0; neuron < this.tier; neuron++) {
      const activation = this.hidden[neuron] ?? 0;
      const base = neuron * OUTPUTS;
      this.updateOutputWeight(base + ACTOR_X, actorGradientX * activation);
      this.updateOutputWeight(base + ACTOR_Z, actorGradientZ * activation);
      this.updateOutputWeight(base + VALUE, advantage * activation);
    }
    this.updateOutputBias(ACTOR_X, actorGradientX);
    this.updateOutputBias(ACTOR_Z, actorGradientZ);
    this.updateOutputBias(VALUE, advantage);
  }

  /** Clear all within-life state for birth/recycle/reset while retaining seed-derived inheritance. */
  resetAdaptiveState(): void {
    this.hidden.fill(0);
    this.inputs.fill(0);
    this.resetReadoutParameters();
    this.cachedAction.x = 0;
    this.cachedAction.z = 0;
    this.cachedAction.value = 0;
    this.cachedAction.revision = -1;
    this.observedRevision = -1;
    this.consumedRewardRevision = null;
  }

  snapshot(): EntityResourceHeadSnapshot {
    return {
      version: SNAPSHOT_VERSION,
      seed: this.seed,
      tier: this.tier,
      config: {
        learningRate: this.learningRate,
        maxOutputOffset: this.maxOutputOffset,
      },
      controls: {
        onlineLearningEnabled: this.onlineLearningEnabled,
        recurrenceEnabled: this.recurrenceEnabled,
      },
      halfLivesSeconds: Array.from(ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS.slice(0, this.tier)),
      parameters: {
        input: Array.from(this.inputWeights),
        recurrent: Array.from(this.recurrentWeights),
        output: Array.from(this.outputWeights),
        bias: Array.from(this.outputBias),
      },
      hidden: Array.from(this.hidden),
      cachedAction: { ...this.cachedAction },
      observedRevision: this.observedRevision,
      consumedRewardRevision: this.consumedRewardRevision,
    };
  }

  /** Validate the complete snapshot before mutating any live state. */
  restore(snapshot: EntityResourceHeadSnapshot): void {
    const validated = this.validateSnapshot(snapshot);
    this.hidden.set(validated.hidden);
    this.outputWeights.set(validated.outputWeights);
    this.outputBias.set(validated.outputBias);
    this.cachedAction.x = validated.actionX;
    this.cachedAction.z = validated.actionZ;
    this.cachedAction.value = validated.actionValue;
    this.cachedAction.revision = validated.actionRevision;
    this.observedRevision = validated.observedRevision;
    this.consumedRewardRevision = validated.consumedRewardRevision;
    this.onlineLearningEnabled = validated.onlineLearningEnabled;
    this.recurrenceEnabled = validated.recurrenceEnabled;
    this.inputs.fill(0);
  }

  static fromSnapshot(snapshot: EntityResourceHeadSnapshot): EntityResourceHead {
    if (!isRecord(snapshot)) throw new TypeError('resource-head snapshot must be an object');
    const seed = assertFiniteNumber(snapshot.seed, 'snapshot seed');
    if (!Number.isSafeInteger(seed)) throw new RangeError('snapshot seed must be a safe integer');
    if (!isTier(snapshot.tier)) throw new RangeError('snapshot tier must be 2, 4, or 8');
    if (!isRecord(snapshot.config)) throw new TypeError('snapshot config must be an object');
    const learningRate = assertFiniteNumber(snapshot.config.learningRate, 'snapshot learningRate');
    const maxOutputOffset = assertFiniteNumber(
      snapshot.config.maxOutputOffset,
      'snapshot maxOutputOffset',
    );
    const head = new EntityResourceHead(seed, snapshot.tier, { learningRate, maxOutputOffset });
    head.restore(snapshot);
    return head;
  }

  private resetReadoutParameters(): void {
    for (let i = 0; i < this.outputWeights.length; i++) {
      this.outputWeights[i] = seededWeight(this.seed, OUTPUT_STREAM, i, OUTPUT_SCALE);
    }
    for (let i = 0; i < this.outputBias.length; i++) {
      this.outputBias[i] = seededWeight(this.seed, BIAS_STREAM, i, BIAS_SCALE);
    }
  }

  private updateOutputWeight(index: number, gradient: number): void {
    const inherited = seededWeight(this.seed, OUTPUT_STREAM, index, OUTPUT_SCALE);
    this.outputWeights[index] = clampToInheritedRange(
      (this.outputWeights[index] ?? inherited) + this.learningRate * gradient,
      inherited,
      this.maxOutputOffset,
    );
  }

  private updateOutputBias(index: number, gradient: number): void {
    const inherited = seededWeight(this.seed, BIAS_STREAM, index, BIAS_SCALE);
    this.outputBias[index] = clampToInheritedRange(
      (this.outputBias[index] ?? inherited) + this.learningRate * gradient,
      inherited,
      this.maxOutputOffset,
    );
  }

  private validateSnapshot(snapshot: EntityResourceHeadSnapshot): ValidatedSnapshotState {
    if (!isRecord(snapshot)) throw new TypeError('resource-head snapshot must be an object');
    if (snapshot.version !== SNAPSHOT_VERSION)
      throw new Error('unsupported resource-head snapshot version');
    if (snapshot.seed !== this.seed) throw new Error('resource-head snapshot seed mismatch');
    if (snapshot.tier !== this.tier) throw new Error('resource-head snapshot tier mismatch');
    if (!isRecord(snapshot.config)) throw new TypeError('snapshot config must be an object');
    if (snapshot.config.learningRate !== this.learningRate) {
      throw new Error('resource-head snapshot learningRate mismatch');
    }
    if (snapshot.config.maxOutputOffset !== this.maxOutputOffset) {
      throw new Error('resource-head snapshot maxOutputOffset mismatch');
    }
    if (!isRecord(snapshot.controls)) throw new TypeError('snapshot controls must be an object');
    const onlineLearningEnabled = assertBoolean(
      snapshot.controls.onlineLearningEnabled,
      'snapshot onlineLearningEnabled',
    );
    const recurrenceEnabled = assertBoolean(
      snapshot.controls.recurrenceEnabled,
      'snapshot recurrenceEnabled',
    );

    if (
      !Array.isArray(snapshot.halfLivesSeconds) ||
      snapshot.halfLivesSeconds.length !== this.tier
    ) {
      throw new RangeError(`snapshot halfLivesSeconds must contain exactly ${this.tier} values`);
    }
    for (let i = 0; i < this.tier; i++) {
      if (snapshot.halfLivesSeconds[i] !== ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS[i]) {
        throw new Error(`snapshot halfLivesSeconds[${i}] mismatch`);
      }
    }

    if (!isRecord(snapshot.parameters))
      throw new TypeError('snapshot parameters must be an object');
    const input = copyFiniteArray(
      snapshot.parameters.input,
      this.inputWeights.length,
      'snapshot parameters.input',
      1,
    );
    const recurrent = copyFiniteArray(
      snapshot.parameters.recurrent,
      this.recurrentWeights.length,
      'snapshot parameters.recurrent',
      1,
    );
    const output = copyFiniteArray(
      snapshot.parameters.output,
      this.outputWeights.length,
      'snapshot parameters.output',
      2,
    );
    const bias = copyFiniteArray(
      snapshot.parameters.bias,
      this.outputBias.length,
      'snapshot parameters.bias',
      2,
    );
    assertExactArray(input, this.inputWeights, 'snapshot parameters.input');
    assertExactArray(recurrent, this.recurrentWeights, 'snapshot parameters.recurrent');
    assertWithinInheritedRange(
      output,
      this.seed,
      OUTPUT_STREAM,
      OUTPUT_SCALE,
      this.maxOutputOffset,
      'snapshot parameters.output',
    );
    assertWithinInheritedRange(
      bias,
      this.seed,
      BIAS_STREAM,
      BIAS_SCALE,
      this.maxOutputOffset,
      'snapshot parameters.bias',
    );

    const hidden = copyFiniteArray(snapshot.hidden, this.tier, 'snapshot hidden', 1);
    if (!isRecord(snapshot.cachedAction))
      throw new TypeError('snapshot cachedAction must be an object');
    const actionX = assertFiniteNumber(snapshot.cachedAction.x, 'snapshot cachedAction.x');
    const actionZ = assertFiniteNumber(snapshot.cachedAction.z, 'snapshot cachedAction.z');
    const actionValue = assertFiniteNumber(
      snapshot.cachedAction.value,
      'snapshot cachedAction.value',
    );
    if (Math.abs(actionX) > 1 || Math.abs(actionZ) > 1 || Math.abs(actionValue) > 1) {
      throw new RangeError('snapshot cached action is outside [-1, 1]');
    }
    const actionRevision = assertFiniteNumber(
      snapshot.cachedAction.revision,
      'snapshot cachedAction.revision',
    );
    const observedRevision = assertFiniteNumber(
      snapshot.observedRevision,
      'snapshot observedRevision',
    );
    if (!Number.isSafeInteger(actionRevision) || actionRevision < -1) {
      throw new RangeError('snapshot cachedAction.revision is invalid');
    }
    if (!Number.isSafeInteger(observedRevision) || observedRevision < -1) {
      throw new RangeError('snapshot observedRevision is invalid');
    }
    if (actionRevision !== observedRevision) {
      throw new Error('snapshot cached and observed revisions must match');
    }
    const consumed = snapshot.consumedRewardRevision;
    if (
      consumed !== null &&
      (!Number.isSafeInteger(consumed) || consumed < 0 || consumed > observedRevision)
    ) {
      throw new RangeError('snapshot consumedRewardRevision is invalid');
    }
    if (observedRevision < 0) {
      for (let i = 0; i < hidden.length; i++) {
        if (hidden[i] !== 0) throw new Error('unobserved snapshot hidden state must be zero');
      }
      if (actionX !== 0 || actionZ !== 0 || actionValue !== 0 || consumed !== null) {
        throw new Error('unobserved snapshot action/reward state must be empty');
      }
    } else {
      let expectedX = bias[ACTOR_X] ?? 0;
      let expectedZ = bias[ACTOR_Z] ?? 0;
      let expectedValue = bias[VALUE] ?? 0;
      for (let neuron = 0; neuron < this.tier; neuron++) {
        const activation = hidden[neuron] ?? 0;
        const base = neuron * OUTPUTS;
        expectedX += activation * (output[base + ACTOR_X] ?? 0);
        expectedZ += activation * (output[base + ACTOR_Z] ?? 0);
        expectedValue += activation * (output[base + VALUE] ?? 0);
      }
      expectedX = clampSigned(Math.tanh(expectedX));
      expectedZ = clampSigned(Math.tanh(expectedZ));
      expectedValue = clampSigned(Math.tanh(expectedValue));
      if (
        Math.abs(actionX - expectedX) > 1e-12 ||
        Math.abs(actionZ - expectedZ) > 1e-12 ||
        Math.abs(actionValue - expectedValue) > 1e-12
      ) {
        throw new Error('snapshot cached action does not match restored hidden/readout state');
      }
    }

    return {
      hidden,
      outputWeights: output,
      outputBias: bias,
      actionX,
      actionZ,
      actionValue,
      actionRevision,
      observedRevision,
      consumedRewardRevision: consumed,
      onlineLearningEnabled,
      recurrenceEnabled,
    };
  }
}
