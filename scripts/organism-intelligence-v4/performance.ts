/**
 * V4 ordinary-organism performance harness.
 *
 * This module defines the measurement schema before the descendant V4 result is generated. It never
 * applies acceptance thresholds and never writes a receipt. The eventual generator owns those two
 * responsibilities. Default execution measures the four frozen population points in an isolated worker;
 * {@link runV4PerformanceEnvelope} repeats that worker in exactly three fresh Bun processes.
 */

import { mulberry32 } from '../../src/math/rng';
import { EntityBrainField } from '../../src/sim/entity-brain';
import type {
  Entity,
  EntityData,
  OrganismGoalField,
  OrganismIntelligenceSignal,
} from '../../src/types';
import {
  V4_ACCEPTANCE,
  v4SemanticSignal,
  type V4SemanticVector,
} from '../organism-intelligence-v4-protocol';

export const V4_PERFORMANCE_SCHEMA_VERSION =
  'organism-intelligence-v4-performance-envelope-v1' as const;
export const V4_PERFORMANCE_WORKER_FLAG = '--v4-performance-worker' as const;
export const V4_PERFORMANCE_DIAGNOSTIC_FLAG = '--diagnostic' as const;
export const V4_PERFORMANCE_PROCESS_ORDINAL_FLAG = '--v4-performance-process-ordinal' as const;
export const V4_PERFORMANCE_PROCESS_COUNT = 3 as const;
export const V4_PERFORMANCE_WORKER_TIMEOUT_MS = 60_000 as const;

export type V4PerformanceMode = 'full' | 'diagnostic';
export type V4PerformanceProcessOrdinal = 0 | 1 | 2;
export type V4PerformanceBranchOrder = 'legacy-first' | 'enhanced-first';

export interface V4PerformanceConfig {
  readonly points: readonly number[];
  readonly warmupCallsPerBranch: number;
  readonly batches: number;
  readonly samplesPerBranchPerBatch: number;
  readonly timedIterationsPerSample: number;
  readonly branchSeed: number;
  readonly chaos: number;
  readonly orderLaw: 'legacy-first on even sample ordinals; enhanced-first on odd sample ordinals';
  readonly clock: 'performance.now';
  readonly clockFloorMs: number;
}

const FULL_CONFIG: V4PerformanceConfig = Object.freeze({
  points: Object.freeze([...V4_ACCEPTANCE.populationCostRule.points]),
  warmupCallsPerBranch: 2,
  batches: 6,
  samplesPerBranchPerBatch: 4,
  timedIterationsPerSample: 1,
  branchSeed: 0x5050_4e34,
  chaos: 4,
  orderLaw: 'legacy-first on even sample ordinals; enhanced-first on odd sample ordinals',
  clock: 'performance.now',
  clockFloorMs: 1e-9,
});

const DIAGNOSTIC_CONFIG: V4PerformanceConfig = Object.freeze({
  points: Object.freeze([64, 256, 1024]),
  warmupCallsPerBranch: 2,
  batches: 2,
  samplesPerBranchPerBatch: 2,
  timedIterationsPerSample: 4,
  branchSeed: FULL_CONFIG.branchSeed,
  chaos: FULL_CONFIG.chaos,
  orderLaw: FULL_CONFIG.orderLaw,
  clock: FULL_CONFIG.clock,
  clockFloorMs: FULL_CONFIG.clockFloorMs,
});

export const V4_PERFORMANCE_CONFIG = FULL_CONFIG;
export const V4_PERFORMANCE_DIAGNOSTIC_CONFIG = DIAGNOSTIC_CONFIG;

/**
 * Three position-balanced orders for the three fresh workers. Every frozen population occupies three
 * distinct measurement positions, while each worker still returns its rows in canonical source order.
 */
export const V4_PERFORMANCE_POINT_ORDERS = Object.freeze([
  Object.freeze([1_000, 5_000, 10_000, 50_000]),
  Object.freeze([50_000, 10_000, 5_000, 1_000]),
  Object.freeze([5_000, 50_000, 1_000, 10_000]),
] as const);

export interface V4PerformanceMatchedSample {
  readonly ordinal: number;
  readonly order: V4PerformanceBranchOrder;
  readonly legacyMs: number;
  readonly enhancedMs: number;
  readonly incrementalMs: number;
}

export interface V4PerformancePointResult {
  readonly population: number;
  readonly warmupCallsPerBranch: number;
  readonly samplesPerBranch: number;
  readonly timedIterationsPerSample: number;
  readonly legacyFirstSamples: number;
  readonly enhancedFirstSamples: number;
  readonly legacyBatchMediansMs: readonly number[];
  readonly enhancedBatchMediansMs: readonly number[];
  /** Raw paired evidence, retained so every incremental batch median is independently reconstructible. */
  readonly matchedSamplesByBatch: readonly (readonly V4PerformanceMatchedSample[])[];
  readonly incrementalBatchMediansMs: readonly number[];
  readonly legacyMedianMs: number;
  readonly enhancedMedianMs: number;
  readonly incrementalMedianMs: number;
  readonly semanticStorageBytesTotal: number;
  readonly semanticStorageBytesPerEntity: number;
  readonly clockFloorAppliedSamples: number;
  readonly executionSha256: string;
}

export interface V4PerformanceWorkerResult {
  readonly schemaVersion: typeof V4_PERFORMANCE_SCHEMA_VERSION;
  readonly kind: 'isolated-process-worker';
  readonly mode: V4PerformanceMode;
  readonly processOrdinal: V4PerformanceProcessOrdinal;
  readonly measurementPointOrder: readonly number[];
  readonly config: V4PerformanceConfig;
  readonly branchStateIsolated: true;
  readonly orderCounterbalanced: true;
  readonly storageApi: 'EntityBrainField.semanticStorageBytes';
  readonly frozenSemanticStorageBytesPerEntity: number;
  readonly semanticStorageBytesPerEntity: number;
  readonly semanticStorageMatchesFrozenExact: boolean;
  readonly enhancedRuntimeLogLogSlope: number;
  readonly points: readonly V4PerformancePointResult[];
}

export interface V4PerformanceEnvelopePoint {
  readonly population: number;
  readonly legacyBatchMediansMs: readonly number[];
  readonly enhancedBatchMediansMs: readonly number[];
  readonly incrementalBatchMediansMs: readonly number[];
  readonly legacyMedianMs: number;
  readonly enhancedMedianMs: number;
  readonly incrementalMedianMs: number;
  readonly semanticStorageBytesPerEntity: number;
  readonly executionSha256: string;
}

export interface V4PerformanceEnvelope {
  readonly schemaVersion: typeof V4_PERFORMANCE_SCHEMA_VERSION;
  readonly kind: 'three-fresh-process-envelope';
  readonly repeatProcesses: typeof V4_PERFORMANCE_PROCESS_COUNT;
  readonly freshProcesses: true;
  readonly config: V4PerformanceConfig;
  readonly branchStateIsolated: boolean;
  readonly orderCounterbalanced: boolean;
  readonly pointOrderCounterbalanced: boolean;
  readonly processMeasurementPointOrders: readonly (readonly number[])[];
  readonly semanticStorageBytesPerEntity: number;
  readonly frozenSemanticStorageBytesPerEntity: number;
  readonly semanticStorageMatchesFrozenExact: boolean;
  readonly enhancedRuntimeLogLogSlope: number;
  readonly processEnhancedRuntimeLogLogSlopes: readonly number[];
  readonly points: readonly V4PerformanceEnvelopePoint[];
  readonly fiftyThousand: {
    readonly population: 50_000;
    readonly incrementalMedianMs: number;
    readonly everyIncrementalBatchMedianMs: readonly number[];
    readonly processIncrementalMediansMs: readonly number[];
  };
  readonly processRuns: readonly V4PerformanceWorkerResult[];
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

function assertProcessOrdinal(
  value: number,
  mode: V4PerformanceMode,
): asserts value is V4PerformanceProcessOrdinal {
  if (!Number.isSafeInteger(value) || value < 0 || value >= V4_PERFORMANCE_PROCESS_COUNT) {
    throw new RangeError('performance process ordinal is outside the declared envelope');
  }
  if (mode === 'diagnostic' && value !== 0) {
    throw new RangeError('diagnostic performance workers use process ordinal zero');
  }
}

function exactNumberSeries(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function declaredMeasurementPointOrder(
  mode: V4PerformanceMode,
  processOrdinal: V4PerformanceProcessOrdinal,
): readonly number[] {
  assertProcessOrdinal(processOrdinal, mode);
  return mode === 'full' ? V4_PERFORMANCE_POINT_ORDERS[processOrdinal] : DIAGNOSTIC_CONFIG.points;
}

function assertDeclaredFullPointOrders(): void {
  const frozen = FULL_CONFIG.points;
  for (const [orderIndex, order] of V4_PERFORMANCE_POINT_ORDERS.entries()) {
    const numericOrder: readonly number[] = order;
    if (
      order.length !== frozen.length ||
      frozen.some((population) => !numericOrder.includes(population))
    ) {
      throw new Error(`performance point order ${orderIndex} is not a frozen-point permutation`);
    }
  }
  for (const population of frozen) {
    const positions = new Set(
      V4_PERFORMANCE_POINT_ORDERS.map((order) => {
        const numericOrder: readonly number[] = order;
        return numericOrder.indexOf(population);
      }),
    );
    if (positions.size !== V4_PERFORMANCE_PROCESS_COUNT || positions.has(-1)) {
      throw new Error(`population ${population} is not position-counterbalanced across workers`);
    }
  }
}

function assertConfig(config: V4PerformanceConfig, mode: V4PerformanceMode): void {
  const declared = mode === 'full' ? FULL_CONFIG : DIAGNOSTIC_CONFIG;
  if (
    config.points.length !== declared.points.length ||
    config.points.some((point, index) => point !== declared.points[index]) ||
    config.warmupCallsPerBranch !== declared.warmupCallsPerBranch ||
    config.batches !== declared.batches ||
    config.samplesPerBranchPerBatch !== declared.samplesPerBranchPerBatch ||
    config.timedIterationsPerSample !== declared.timedIterationsPerSample ||
    config.branchSeed !== declared.branchSeed ||
    config.chaos !== declared.chaos ||
    config.orderLaw !== declared.orderLaw ||
    config.clock !== declared.clock ||
    config.clockFloorMs !== declared.clockFloorMs
  ) {
    throw new Error(`${mode} performance config differs from the declared schema`);
  }
  if (config.points.length < 2) throw new RangeError('performance requires at least two points');
  let prior = 0;
  for (const point of config.points) {
    assertPositiveInteger(point, 'performance point');
    if (point <= prior) throw new RangeError('performance points must be strictly increasing');
    prior = point;
  }
  for (const [label, value] of [
    ['warmup calls', config.warmupCallsPerBranch],
    ['batches', config.batches],
    ['samples per branch per batch', config.samplesPerBranchPerBatch],
    ['timed iterations per sample', config.timedIterationsPerSample],
  ] as const) {
    assertPositiveInteger(value, label);
  }
  if ((config.samplesPerBranchPerBatch & 1) !== 0) {
    throw new RangeError('counterbalancing requires an even sample count in every batch');
  }
  if (!Number.isFinite(config.chaos) || config.chaos < 0) {
    throw new RangeError('performance chaos must be finite and non-negative');
  }
  if (!Number.isFinite(config.clockFloorMs) || config.clockFloorMs <= 0) {
    throw new RangeError('clock floor must be finite and positive');
  }
  if (mode === 'full') {
    const frozen = V4_ACCEPTANCE.populationCostRule.points;
    if (
      config.points.length !== frozen.length ||
      config.points.some((point, index) => point !== frozen[index])
    ) {
      throw new Error('full V4 performance worker must use the four frozen population points');
    }
  }
}

export function v4PerformanceMedian(values: readonly number[]): number {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new RangeError('performance median requires a non-empty finite series');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle]!;
}

/** Median of matched enhanced-minus-legacy samples; never a difference of marginal medians. */
export function v4PairedIncrementalBatchMedian(
  legacyMs: readonly number[],
  enhancedMs: readonly number[],
): number {
  if (
    legacyMs.length === 0 ||
    legacyMs.length !== enhancedMs.length ||
    [...legacyMs, ...enhancedMs].some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new RangeError('paired performance samples must be equal, non-empty, positive series');
  }
  return v4PerformanceMedian(enhancedMs.map((value, index) => value - legacyMs[index]!));
}

/** Least-squares slope of log(runtime) on log(population), with an intercept. */
export function v4LogLogLeastSquaresSlope(
  populations: readonly number[],
  runtimesMs: readonly number[],
): number {
  if (
    populations.length < 2 ||
    populations.length !== runtimesMs.length ||
    populations.some((value) => !Number.isFinite(value) || value <= 0) ||
    runtimesMs.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new RangeError(
      'log-log slope requires equal positive finite series of length at least two',
    );
  }
  const x = populations.map(Math.log);
  const y = runtimesMs.map(Math.log);
  const xMean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < x.length; index++) {
    const dx = x[index]! - xMean;
    numerator += dx * (y[index]! - yMean);
    denominator += dx * dx;
  }
  if (denominator <= Number.EPSILON) {
    throw new RangeError('log-log slope requires distinct population points');
  }
  return numerator / denominator;
}

function benchmarkEntity(index: number): Entity {
  const userData = {
    vel: { x: 0, y: 0, z: 0 },
    age: 30 + (index % 120),
    life: 600,
    ph: ((index % 997) / 997) * Math.PI * 2,
    energy: 50 + (index % 17) * 0.25,
    payoff: ((index % 5) - 2) * 0.01,
    act: 0,
  } as unknown as EntityData;
  return { userData } as unknown as Entity;
}

function benchmarkEntities(population: number): Entity[] {
  return Array.from({ length: population }, (_, index) => benchmarkEntity(index));
}

function benchmarkGoals(population: number): OrganismGoalField {
  return {
    directionX: new Float32Array(population).fill(1),
    directionZ: new Float32Array(population),
    desire: new Float32Array(population).fill(1),
    cover: new Float32Array(population).fill(1),
    revision: new Uint32Array(population).fill(1),
  };
}

function benchmarkSignal(): OrganismIntelligenceSignal {
  const semantic: V4SemanticVector = [0.72, 0.31, 0.58, 0.44];
  return v4SemanticSignal(semantic);
}

function resetEntities(entities: readonly Entity[]): void {
  for (const entity of entities) {
    entity.userData.vel.x = 0;
    entity.userData.vel.y = 0;
    entity.userData.vel.z = 0;
    entity.userData.act = 0;
  }
}

function executionSha256(
  config: V4PerformanceConfig,
  population: number,
  legacy: readonly Entity[],
  enhanced: readonly Entity[],
): string {
  if (legacy.length !== population || enhanced.length !== population) {
    throw new Error('execution evidence must cover the complete measured population');
  }
  // Canonical little-endian FP64 packing covers every final action output from both matched branches.
  const valuesPerEntity = 8;
  const packed = new ArrayBuffer(population * valuesPerEntity * Float64Array.BYTES_PER_ELEMENT);
  const view = new DataView(packed);
  let byteOffset = 0;
  for (let index = 0; index < population; index++) {
    const legacyData = legacy[index]!.userData;
    const enhancedData = enhanced[index]!.userData;
    for (const value of [
      legacyData.vel.x,
      legacyData.vel.y,
      legacyData.vel.z,
      legacyData.act,
      enhancedData.vel.x,
      enhancedData.vel.y,
      enhancedData.vel.z,
      enhancedData.act,
    ]) {
      if (!Number.isFinite(value))
        throw new Error('execution evidence contains a non-finite output');
      view.setFloat64(byteOffset, value, true);
      byteOffset += Float64Array.BYTES_PER_ELEMENT;
    }
  }
  return new Bun.CryptoHasher('sha256')
    .update(
      JSON.stringify({
        population,
        warmupCallsPerBranch: config.warmupCallsPerBranch,
        batches: config.batches,
        samplesPerBranchPerBatch: config.samplesPerBranchPerBatch,
        timedIterationsPerSample: config.timedIterationsPerSample,
      }),
    )
    .update(new Uint8Array(packed))
    .digest('hex');
}

function runPoint(config: V4PerformanceConfig, population: number): V4PerformancePointResult {
  const legacyBrain = new EntityBrainField(population, mulberry32(config.branchSeed));
  const enhancedBrain = new EntityBrainField(population, mulberry32(config.branchSeed));
  const legacyEntities = benchmarkEntities(population);
  const enhancedEntities = benchmarkEntities(population);
  const goals = benchmarkGoals(population);
  const signal = benchmarkSignal();
  legacyBrain.attachAdaptiveField(null, null);
  enhancedBrain.attachAdaptiveField(signal, goals);

  const runUntimed = (brain: EntityBrainField, entities: readonly Entity[], time: number): void => {
    resetEntities(entities);
    const thought = brain.thinkAll(entities, config.chaos, time);
    if (thought !== population) throw new Error(`expected ${population} thoughts, got ${thought}`);
  };
  for (let warmup = 0; warmup < config.warmupCallsPerBranch; warmup++) {
    const time = (warmup + 1) / 60;
    if ((warmup & 1) === 0) {
      runUntimed(legacyBrain, legacyEntities, time);
      runUntimed(enhancedBrain, enhancedEntities, time);
    } else {
      runUntimed(enhancedBrain, enhancedEntities, time);
      runUntimed(legacyBrain, legacyEntities, time);
    }
  }

  let clockFloorAppliedSamples = 0;
  const measure = (
    brain: EntityBrainField,
    entities: readonly Entity[],
    baseTime: number,
  ): number => {
    resetEntities(entities);
    let thoughts = 0;
    const started = performance.now();
    for (let iteration = 0; iteration < config.timedIterationsPerSample; iteration++) {
      thoughts += brain.thinkAll(entities, config.chaos, baseTime + iteration / 60);
    }
    const elapsed = (performance.now() - started) / config.timedIterationsPerSample;
    if (thoughts !== population * config.timedIterationsPerSample) {
      throw new Error('performance branch skipped an entity');
    }
    if (elapsed > 0) return elapsed;
    clockFloorAppliedSamples++;
    return config.clockFloorMs;
  };

  const legacyBatchMediansMs: number[] = [];
  const enhancedBatchMediansMs: number[] = [];
  const matchedSamplesByBatch: V4PerformanceMatchedSample[][] = [];
  const incrementalBatchMediansMs: number[] = [];
  let legacyFirstSamples = 0;
  let enhancedFirstSamples = 0;
  for (let batch = 0; batch < config.batches; batch++) {
    const legacyTimes: number[] = [];
    const enhancedTimes: number[] = [];
    const matchedSamples: V4PerformanceMatchedSample[] = [];
    for (let sample = 0; sample < config.samplesPerBranchPerBatch; sample++) {
      const ordinal = batch * config.samplesPerBranchPerBatch + sample;
      const time =
        (config.warmupCallsPerBranch + ordinal * config.timedIterationsPerSample + 1) / 60;
      let legacyMs: number;
      let enhancedMs: number;
      let order: V4PerformanceBranchOrder;
      if ((ordinal & 1) === 0) {
        legacyFirstSamples++;
        order = 'legacy-first';
        legacyMs = measure(legacyBrain, legacyEntities, time);
        enhancedMs = measure(enhancedBrain, enhancedEntities, time);
      } else {
        enhancedFirstSamples++;
        order = 'enhanced-first';
        enhancedMs = measure(enhancedBrain, enhancedEntities, time);
        legacyMs = measure(legacyBrain, legacyEntities, time);
      }
      legacyTimes.push(legacyMs);
      enhancedTimes.push(enhancedMs);
      matchedSamples.push({
        ordinal,
        order,
        legacyMs,
        enhancedMs,
        incrementalMs: enhancedMs - legacyMs,
      });
    }
    const legacyMedianMs = v4PerformanceMedian(legacyTimes);
    const enhancedMedianMs = v4PerformanceMedian(enhancedTimes);
    legacyBatchMediansMs.push(legacyMedianMs);
    enhancedBatchMediansMs.push(enhancedMedianMs);
    matchedSamplesByBatch.push(matchedSamples);
    incrementalBatchMediansMs.push(v4PairedIncrementalBatchMedian(legacyTimes, enhancedTimes));
  }

  const semanticStorageBytesTotal = enhancedBrain.semanticStorageBytes();
  if (semanticStorageBytesTotal % population !== 0) {
    throw new Error('semantic storage is not an exact whole-byte per-entity quantity');
  }
  return {
    population,
    warmupCallsPerBranch: config.warmupCallsPerBranch,
    samplesPerBranch: config.batches * config.samplesPerBranchPerBatch,
    timedIterationsPerSample: config.timedIterationsPerSample,
    legacyFirstSamples,
    enhancedFirstSamples,
    legacyBatchMediansMs,
    enhancedBatchMediansMs,
    matchedSamplesByBatch,
    incrementalBatchMediansMs,
    legacyMedianMs: v4PerformanceMedian(legacyBatchMediansMs),
    enhancedMedianMs: v4PerformanceMedian(enhancedBatchMediansMs),
    incrementalMedianMs: v4PerformanceMedian(incrementalBatchMediansMs),
    semanticStorageBytesTotal,
    semanticStorageBytesPerEntity: semanticStorageBytesTotal / population,
    clockFloorAppliedSamples,
    executionSha256: executionSha256(config, population, legacyEntities, enhancedEntities),
  };
}

function oneExactNumber(values: readonly number[], label: string): number {
  if (values.length === 0 || values.some((value) => value !== values[0])) {
    throw new Error(`${label} differs across performance rows`);
  }
  return values[0]!;
}

function oneExactString(values: readonly string[], label: string): string {
  if (values.length === 0 || values.some((value) => value !== values[0])) {
    throw new Error(`${label} differs across performance rows`);
  }
  return values[0]!;
}

/** Execute one worker in the current process. Result generation should normally use the envelope. */
export function runV4PerformanceWorker(
  mode: V4PerformanceMode = 'full',
  processOrdinal: V4PerformanceProcessOrdinal = 0,
): V4PerformanceWorkerResult {
  const config = mode === 'full' ? FULL_CONFIG : DIAGNOSTIC_CONFIG;
  assertConfig(config, mode);
  assertProcessOrdinal(processOrdinal, mode);
  if (mode === 'full') assertDeclaredFullPointOrders();
  const measurementPointOrder = declaredMeasurementPointOrder(mode, processOrdinal);
  const measuredPoints = measurementPointOrder.map((population) => runPoint(config, population));
  const byPopulation = new Map(measuredPoints.map((point) => [point.population, point]));
  if (byPopulation.size !== config.points.length) {
    throw new Error('performance measurement order produced duplicate or missing points');
  }
  // Canonical source order is stable even though actual measurement order is counterbalanced.
  const points = config.points.map((population) => {
    const point = byPopulation.get(population);
    if (!point) throw new Error(`performance measurement omitted population ${population}`);
    return point;
  });
  const semanticStorageBytesPerEntity = oneExactNumber(
    points.map((point) => point.semanticStorageBytesPerEntity),
    'semantic bytes per entity',
  );
  if (!points.every((point) => point.legacyFirstSamples === point.enhancedFirstSamples)) {
    throw new Error('performance order was not counterbalanced');
  }
  return {
    schemaVersion: V4_PERFORMANCE_SCHEMA_VERSION,
    kind: 'isolated-process-worker',
    mode,
    processOrdinal,
    measurementPointOrder,
    config,
    branchStateIsolated: true,
    orderCounterbalanced: true,
    storageApi: 'EntityBrainField.semanticStorageBytes',
    frozenSemanticStorageBytesPerEntity:
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity,
    semanticStorageBytesPerEntity,
    semanticStorageMatchesFrozenExact:
      semanticStorageBytesPerEntity ===
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity,
    enhancedRuntimeLogLogSlope: v4LogLogLeastSquaresSlope(
      points.map((point) => point.population),
      points.map((point) => point.enhancedMedianMs),
    ),
    points,
  };
}

function isFiniteNumberArray(value: unknown, expectedLength: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === expectedLength &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

/** Fail-closed parser for fresh-process JSON before it can enter the V4 result receipt. */
export function assertV4PerformanceWorkerResult(
  value: unknown,
  expectedMode?: V4PerformanceMode,
  expectedProcessOrdinal?: V4PerformanceProcessOrdinal,
): asserts value is V4PerformanceWorkerResult {
  if (value === null || typeof value !== 'object')
    throw new TypeError('worker result must be an object');
  const result = value as Partial<V4PerformanceWorkerResult>;
  if (
    result.schemaVersion !== V4_PERFORMANCE_SCHEMA_VERSION ||
    result.kind !== 'isolated-process-worker' ||
    (result.mode !== 'full' && result.mode !== 'diagnostic') ||
    (expectedMode !== undefined && result.mode !== expectedMode) ||
    typeof result.processOrdinal !== 'number' ||
    (expectedProcessOrdinal !== undefined && result.processOrdinal !== expectedProcessOrdinal) ||
    !Array.isArray(result.measurementPointOrder) ||
    result.branchStateIsolated !== true ||
    result.orderCounterbalanced !== true ||
    result.storageApi !== 'EntityBrainField.semanticStorageBytes' ||
    !result.config ||
    !Array.isArray(result.points)
  ) {
    throw new Error('worker result failed its top-level schema');
  }
  assertProcessOrdinal(result.processOrdinal, result.mode);
  assertConfig(result.config, result.mode);
  const declaredPointOrder = declaredMeasurementPointOrder(result.mode, result.processOrdinal);
  if (!exactNumberSeries(result.measurementPointOrder, declaredPointOrder)) {
    throw new Error('worker result has an invalid measurement point order');
  }
  const points = result.points as unknown as readonly V4PerformancePointResult[];
  if (points.length !== result.config.points.length) {
    throw new Error('worker result has the wrong number of points');
  }
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    const batches = result.config.batches;
    if (
      point.population !== result.config.points[index] ||
      point.warmupCallsPerBranch !== result.config.warmupCallsPerBranch ||
      point.samplesPerBranch !== batches * result.config.samplesPerBranchPerBatch ||
      point.timedIterationsPerSample !== result.config.timedIterationsPerSample ||
      point.legacyFirstSamples !== point.enhancedFirstSamples ||
      point.legacyFirstSamples + point.enhancedFirstSamples !== point.samplesPerBranch ||
      !isFiniteNumberArray(point.legacyBatchMediansMs, batches) ||
      !isFiniteNumberArray(point.enhancedBatchMediansMs, batches) ||
      !Array.isArray(point.matchedSamplesByBatch) ||
      point.matchedSamplesByBatch.length !== batches ||
      !isFiniteNumberArray(point.incrementalBatchMediansMs, batches) ||
      point.legacyBatchMediansMs.some((entry) => entry <= 0) ||
      point.enhancedBatchMediansMs.some((entry) => entry <= 0) ||
      point.semanticStorageBytesTotal !== point.population * point.semanticStorageBytesPerEntity ||
      !Number.isSafeInteger(point.semanticStorageBytesTotal) ||
      point.semanticStorageBytesTotal < 0 ||
      !Number.isSafeInteger(point.semanticStorageBytesPerEntity) ||
      point.semanticStorageBytesPerEntity < 0 ||
      !Number.isSafeInteger(point.clockFloorAppliedSamples) ||
      point.clockFloorAppliedSamples < 0 ||
      point.clockFloorAppliedSamples > point.samplesPerBranch * 2 ||
      !/^[0-9a-f]{64}$/.test(point.executionSha256)
    ) {
      throw new Error(`worker point ${index} failed its schema`);
    }
    let derivedLegacyFirstSamples = 0;
    let derivedEnhancedFirstSamples = 0;
    for (let batch = 0; batch < batches; batch++) {
      const matchedSamples = point.matchedSamplesByBatch[batch];
      if (
        !Array.isArray(matchedSamples) ||
        matchedSamples.length !== result.config.samplesPerBranchPerBatch
      ) {
        throw new Error(`worker point ${index} batch ${batch} lost matched samples`);
      }
      const legacySamples: number[] = [];
      const enhancedSamples: number[] = [];
      for (let sampleIndex = 0; sampleIndex < matchedSamples.length; sampleIndex++) {
        const sample = matchedSamples[sampleIndex] as Partial<V4PerformanceMatchedSample>;
        const expectedOrdinal = batch * result.config.samplesPerBranchPerBatch + sampleIndex;
        const expectedOrder: V4PerformanceBranchOrder =
          (expectedOrdinal & 1) === 0 ? 'legacy-first' : 'enhanced-first';
        if (
          sample.ordinal !== expectedOrdinal ||
          sample.order !== expectedOrder ||
          typeof sample.legacyMs !== 'number' ||
          !Number.isFinite(sample.legacyMs) ||
          sample.legacyMs <= 0 ||
          typeof sample.enhancedMs !== 'number' ||
          !Number.isFinite(sample.enhancedMs) ||
          sample.enhancedMs <= 0 ||
          typeof sample.incrementalMs !== 'number' ||
          !Number.isFinite(sample.incrementalMs) ||
          Math.abs(sample.incrementalMs - (sample.enhancedMs - sample.legacyMs)) > 1e-12
        ) {
          throw new Error(`worker point ${index} batch ${batch} has invalid paired evidence`);
        }
        if (sample.order === 'legacy-first') derivedLegacyFirstSamples++;
        else derivedEnhancedFirstSamples++;
        legacySamples.push(sample.legacyMs);
        enhancedSamples.push(sample.enhancedMs);
      }
      const expectedIncremental = v4PairedIncrementalBatchMedian(legacySamples, enhancedSamples);
      if (
        point.legacyBatchMediansMs[batch] !== v4PerformanceMedian(legacySamples) ||
        point.enhancedBatchMediansMs[batch] !== v4PerformanceMedian(enhancedSamples) ||
        Math.abs(point.incrementalBatchMediansMs[batch]! - expectedIncremental) > 1e-12
      ) {
        throw new Error(`worker point ${index} has an invalid incremental batch median`);
      }
    }
    if (
      derivedLegacyFirstSamples !== point.legacyFirstSamples ||
      derivedEnhancedFirstSamples !== point.enhancedFirstSamples
    ) {
      throw new Error(`worker point ${index} has invalid counterbalance counts`);
    }
    if (
      point.legacyMedianMs !== v4PerformanceMedian(point.legacyBatchMediansMs) ||
      point.enhancedMedianMs !== v4PerformanceMedian(point.enhancedBatchMediansMs) ||
      point.incrementalMedianMs !== v4PerformanceMedian(point.incrementalBatchMediansMs)
    ) {
      throw new Error(`worker point ${index} has an invalid aggregate median`);
    }
  }
  const storage = oneExactNumber(
    points.map((point) => point.semanticStorageBytesPerEntity),
    'semantic bytes per entity',
  );
  if (
    result.semanticStorageBytesPerEntity !== storage ||
    result.frozenSemanticStorageBytesPerEntity !==
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity ||
    result.semanticStorageMatchesFrozenExact !==
      (storage === V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity)
  ) {
    throw new Error('worker result has invalid semantic-storage evidence');
  }
  const slope = v4LogLogLeastSquaresSlope(
    points.map((point) => point.population),
    points.map((point) => point.enhancedMedianMs),
  );
  if (
    typeof result.enhancedRuntimeLogLogSlope !== 'number' ||
    !Number.isFinite(result.enhancedRuntimeLogLogSlope) ||
    Math.abs(result.enhancedRuntimeLogLogSlope - slope) > 1e-12
  ) {
    throw new Error('worker result has an invalid enhanced-runtime slope');
  }
}

/** Spawn one genuinely fresh Bun process and parse its fail-closed JSON result. */
export function spawnV4PerformanceWorker(
  mode: V4PerformanceMode = 'full',
  processOrdinal: V4PerformanceProcessOrdinal = 0,
): V4PerformanceWorkerResult {
  assertProcessOrdinal(processOrdinal, mode);
  const args = [
    process.execPath,
    import.meta.path,
    V4_PERFORMANCE_WORKER_FLAG,
    V4_PERFORMANCE_PROCESS_ORDINAL_FLAG,
    String(processOrdinal),
  ];
  if (mode === 'diagnostic') args.push(V4_PERFORMANCE_DIAGNOSTIC_FLAG);
  const child = Bun.spawnSync(args, {
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: V4_PERFORMANCE_WORKER_TIMEOUT_MS,
  });
  if (child.exitCode !== 0) {
    throw new Error(
      `V4 performance worker failed: ${child.stderr.toString().trim() || `exit ${child.exitCode}`}`,
    );
  }
  const raw = child.stdout.toString().trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`V4 performance worker emitted invalid JSON: ${String(error)}`);
  }
  assertV4PerformanceWorkerResult(parsed, mode, processOrdinal);
  return parsed;
}

/** Run the frozen V4 performance envelope in exactly three sequential fresh processes. */
export function runV4PerformanceEnvelope(): V4PerformanceEnvelope {
  assertDeclaredFullPointOrders();
  const processRuns = Array.from({ length: V4_PERFORMANCE_PROCESS_COUNT }, (_, processOrdinal) => {
    assertProcessOrdinal(processOrdinal, 'full');
    return spawnV4PerformanceWorker('full', processOrdinal);
  });
  const pointOrderCounterbalanced = FULL_CONFIG.points.every((population) => {
    const positions = new Set(
      processRuns.map((run) => run.measurementPointOrder.indexOf(population)),
    );
    return positions.size === V4_PERFORMANCE_PROCESS_COUNT && !positions.has(-1);
  });
  if (!pointOrderCounterbalanced) {
    throw new Error('performance population point order was not position-counterbalanced');
  }
  const points: V4PerformanceEnvelopePoint[] = FULL_CONFIG.points.map((population, pointIndex) => {
    const rows = processRuns.map((run) => run.points[pointIndex]!);
    const legacyBatchMediansMs = rows.flatMap((row) => row.legacyBatchMediansMs);
    const enhancedBatchMediansMs = rows.flatMap((row) => row.enhancedBatchMediansMs);
    const incrementalBatchMediansMs = rows.flatMap((row) => row.incrementalBatchMediansMs);
    return {
      population,
      legacyBatchMediansMs,
      enhancedBatchMediansMs,
      incrementalBatchMediansMs,
      legacyMedianMs: v4PerformanceMedian(legacyBatchMediansMs),
      enhancedMedianMs: v4PerformanceMedian(enhancedBatchMediansMs),
      incrementalMedianMs: v4PerformanceMedian(incrementalBatchMediansMs),
      semanticStorageBytesPerEntity: oneExactNumber(
        rows.map((row) => row.semanticStorageBytesPerEntity),
        `semantic bytes per entity at ${population}`,
      ),
      executionSha256: oneExactString(
        rows.map((row) => row.executionSha256),
        `execution fingerprint at ${population}`,
      ),
    };
  });
  const semanticStorageBytesPerEntity = oneExactNumber(
    points.map((point) => point.semanticStorageBytesPerEntity),
    'envelope semantic bytes per entity',
  );
  const fiftyThousandIndex = FULL_CONFIG.points.indexOf(50_000);
  if (fiftyThousandIndex < 0) throw new Error('frozen performance points lost the 50,000 row');
  const fiftyThousand = points[fiftyThousandIndex]!;
  return {
    schemaVersion: V4_PERFORMANCE_SCHEMA_VERSION,
    kind: 'three-fresh-process-envelope',
    repeatProcesses: V4_PERFORMANCE_PROCESS_COUNT,
    freshProcesses: true,
    config: FULL_CONFIG,
    branchStateIsolated: processRuns.every((run) => run.branchStateIsolated),
    orderCounterbalanced: processRuns.every((run) => run.orderCounterbalanced),
    pointOrderCounterbalanced,
    processMeasurementPointOrders: processRuns.map((run) => run.measurementPointOrder),
    semanticStorageBytesPerEntity,
    frozenSemanticStorageBytesPerEntity:
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity,
    semanticStorageMatchesFrozenExact:
      semanticStorageBytesPerEntity ===
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity,
    enhancedRuntimeLogLogSlope: v4LogLogLeastSquaresSlope(
      points.map((point) => point.population),
      points.map((point) => point.enhancedMedianMs),
    ),
    processEnhancedRuntimeLogLogSlopes: processRuns.map((run) => run.enhancedRuntimeLogLogSlope),
    points,
    fiftyThousand: {
      population: 50_000,
      incrementalMedianMs: fiftyThousand.incrementalMedianMs,
      everyIncrementalBatchMedianMs: fiftyThousand.incrementalBatchMediansMs,
      processIncrementalMediansMs: processRuns.map(
        (run) => run.points[fiftyThousandIndex]!.incrementalMedianMs,
      ),
    },
    processRuns,
  };
}

function performanceProcessOrdinalFromArgv(mode: V4PerformanceMode): V4PerformanceProcessOrdinal {
  const flagIndex = process.argv.indexOf(V4_PERFORMANCE_PROCESS_ORDINAL_FLAG);
  const parsed = flagIndex < 0 ? 0 : Number(process.argv[flagIndex + 1]);
  assertProcessOrdinal(parsed, mode);
  return parsed;
}

if (import.meta.main && process.argv.includes(V4_PERFORMANCE_WORKER_FLAG)) {
  const mode: V4PerformanceMode = process.argv.includes(V4_PERFORMANCE_DIAGNOSTIC_FLAG)
    ? 'diagnostic'
    : 'full';
  const processOrdinal = performanceProcessOrdinalFromArgv(mode);
  process.stdout.write(`${JSON.stringify(runV4PerformanceWorker(mode, processOrdinal))}\n`);
}
