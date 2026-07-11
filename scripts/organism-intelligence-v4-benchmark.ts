/**
 * Descendant result generator for the frozen organism-intelligence V4 protocol.
 *
 * This file is committed and reviewed before `--write` is allowed to generate results. It imports the
 * frozen protocol and the four live family evaluators, retains every row, runs exact replay, applies only
 * preregistered arithmetic, and emits one JSON receipt, one raw CSV, and one byte-stable forest SVG.
 */
import { cpus, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import {
  evaluateOrdinaryV4,
  type OrdinaryV4EvaluationResult,
} from './organism-intelligence-v4/ordinary';
import { runV4NumericalSafety } from './organism-intelligence-v4/numerical-safety';
import {
  runV4PerformanceEnvelope,
  V4_PERFORMANCE_CONFIG,
  V4_PERFORMANCE_POINT_ORDERS,
  V4_PERFORMANCE_PROCESS_COUNT,
  type V4PerformanceEnvelope,
} from './organism-intelligence-v4/performance';
import { runV4PetriEvaluation, type V4PetriEvaluation } from './organism-intelligence-v4/petri';
import {
  evaluateV4PredictorFamily,
  type V4PredictorFamilyEvaluation,
} from './organism-intelligence-v4/predictor';
import { evaluateTitanV4, type TitanV4Evaluation } from './organism-intelligence-v4/titans';
import {
  familyMagnitudePass,
  fixtureSha256,
  pairedDeltas,
  predictorAggregateRelativeErrorReduction,
  summarizeV4FamilyContrasts,
  V4_ACCEPTANCE,
  V4_ALPHA,
  V4_BOOTSTRAP_SAMPLES,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  V4_FAMILY_ORDER,
  V4_PINNED_DEPENDENCIES,
  type V4ContrastSummary,
  type V4FamilyId,
  V4_PROTOCOL_VERSION,
  V4_SIGN_FLIP_SAMPLES,
  V4_SURROGATE_CALIBRATION_SEEDS,
  weakestV4ContrastIndex,
} from './organism-intelligence-v4-protocol';

export const V4_RESULT_SCHEMA_VERSION = 'organism-intelligence-causal-benchmark-v4' as const;
export const V4_MANIFEST_COMMIT = '5b72a22fa9d0f87ccd29c3302a00e32eb77d237e' as const;
export const V4_RESULT_DATE = '2026-07-11' as const;
export const V4_RESULT_PATHS = {
  receipt: 'docs/reports/assets/organism-intelligence-causal-benchmark-v4.json',
  rawCsv: 'docs/reports/assets/cross-being-neural-causality-v1.csv',
  forestSvg: 'docs/reports/assets/organism-intelligence-v4-cross-being-forest.svg',
  manifest: 'docs/reports/assets/organism-intelligence-v4-phase-a-preregistration.json',
  protocol: 'scripts/organism-intelligence-v4-protocol.ts',
} as const;

const ROOT = resolve(import.meta.dir, '..');
const RESULT_AFFECTING_SOURCE_PATHS = [
  'scripts/organism-intelligence-v4-benchmark.ts',
  'scripts/organism-intelligence-v4/ordinary.ts',
  'scripts/organism-intelligence-v4/predictor.ts',
  'scripts/organism-intelligence-v4/petri.ts',
  'scripts/organism-intelligence-v4/titans.ts',
  'scripts/organism-intelligence-v4/performance.ts',
  'scripts/organism-intelligence-v4/numerical-safety.ts',
  V4_RESULT_PATHS.protocol,
  V4_RESULT_PATHS.manifest,
  ...V4_PINNED_DEPENDENCIES.map(({ path }) => path),
] as const;

export interface V4RawResultRow {
  schema_version: 1;
  protocol_version: typeof V4_PROTOCOL_VERSION;
  family: V4FamilyId;
  controller_type: 'neural' | 'ecological' | 'game-policy';
  neural_controller: boolean;
  neural_capacity_evaluated: false;
  evidence_tier:
    | 'live-action'
    | 'shared-cadence-online-prediction'
    | 'live-differential-selection'
    | 'live-diplomacy-payoff-world-state';
  seed: number;
  task: string;
  arm: string;
  live_capacity_tier: string;
  live_parameter_count: number;
  designed_parameter_count: number;
  parameter_count_semantics:
    | 'trainable-controller-parameters'
    | 'active-ad-fitness-weight-slots'
    | 'available-discrete-policy-strategies';
  primary_outcome: number;
  primary_mean_brier: number | null;
  fixture_sha256: string;
  initial_state_sha256: string;
  percept_sha256: string;
  task_schedule_sha256: string;
  environment_rng_evidence_kind: string;
  environment_rng_evidence_sha256: string;
  environment_rng_tape_sha256: string | null;
  environment_rng_draw_count: number;
  surrogate_rng_tape_sha256: string | null;
  surrogate_rng_draw_count: number;
  calibration_sha256: string | null;
  intervention_sha256: string | null;
  replay_fingerprint: string;
  replay_pass: boolean;
  latency_ms: number | null;
  latency_status: 'not-measured-per-row';
  memory_bytes: number | null;
  memory_scope:
    | 'incremental-semantic-context-only'
    | 'trainable-parameter-payload-only'
    | 'not-byte-accounted-js-object-state';
  failure_reason:
    | 'byte-replay-mismatch'
    | 'family-evidence-gate-failed'
    | 'family-inference-gate-failed'
    | 'family-magnitude-gate-failed'
    | 'family-inference-and-magnitude-gates-failed'
    | null;
  secondary_json: string;
}

export interface V4FamilyFailureGates {
  evidencePass: boolean;
  inferencePass: boolean;
  magnitudePass: boolean;
}

export interface V4ForestRow {
  family: V4FamilyId;
  label: string;
  controllerType: 'neural' | 'ecological' | 'game-policy';
  neuralController: boolean;
  contrast: string;
  meanDelta: number;
  lower95: number;
  upper95: number;
  holmSignFlipP: number;
  inferencePass: boolean;
  familyPass: boolean;
  claimAuthorized: boolean;
}

interface FamilyRunBundle {
  ordinary: OrdinaryV4EvaluationResult;
  predictor: V4PredictorFamilyEvaluation;
  petri: V4PetriEvaluation;
  titans: TitanV4Evaluation;
}

interface FamilyReplayBundle {
  first: FamilyRunBundle;
  second: FamilyRunBundle;
  evidence: Record<
    V4FamilyId,
    { firstSha256: string; secondSha256: string; byteIdentical: boolean }
  >;
}

interface FrozenAuthorityVerification {
  manifestSha256: string;
  protocolSha256: string;
  pinnedDependencies: Array<{
    path: string;
    sha256: string;
    symbols: readonly string[];
    verified: true;
  }>;
}

function sha256Bytes(value: string | Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function canonicalSha256(value: unknown): string {
  return sha256Bytes(JSON.stringify(value));
}

async function fileSha256(path: string): Promise<string> {
  return sha256Bytes(new Uint8Array(await Bun.file(resolve(ROOT, path)).arrayBuffer()));
}

async function resultAffectingSourceHashes(): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      RESULT_AFFECTING_SOURCE_PATHS.map(async (path) => [path, await fileSha256(path)] as const),
    ),
  );
}

function git(args: readonly string[]): string {
  const child = Bun.spawnSync(['git', ...args], { cwd: ROOT });
  if (child.exitCode !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${child.stderr.toString().trim() || `exit ${child.exitCode}`}`,
    );
  }
  return child.stdout.toString().trim();
}

function assertFrozenEvaluationSeeds(values: readonly number[], label: string): void {
  if (
    values.length !== V4_EVALUATION_SEEDS.length ||
    values.some((seed, index) => seed !== V4_EVALUATION_SEEDS[index])
  ) {
    throw new Error(`${label} did not return the exact ordered 64-seed family`);
  }
}

function runFamilies(): FamilyRunBundle {
  const ordinary = evaluateOrdinaryV4();
  const predictor = evaluateV4PredictorFamily();
  const petri = runV4PetriEvaluation();
  const titans = evaluateTitanV4();
  assertFrozenEvaluationSeeds(ordinary.seeds, 'ordinary evaluator');
  assertFrozenEvaluationSeeds(predictor.evaluationSeeds, 'predictor evaluator');
  assertFrozenEvaluationSeeds(petri.evaluationSeeds, 'Petri evaluator');
  const titanSeeds = Array.from(new Set(titans.rows.map(({ seed }) => seed)));
  assertFrozenEvaluationSeeds(titanSeeds, 'Titan evaluator');
  return { ordinary, predictor, petri, titans };
}

function runFamilyReplay(): FamilyReplayBundle {
  const first = runFamilies();
  const second = runFamilies();
  const pairs: Array<[V4FamilyId, unknown, unknown]> = [
    ['ordinary-organisms', first.ordinary, second.ordinary],
    ['simple-mnist-ecology-predictor', first.predictor, second.predictor],
    ['petri-digital-biologics', first.petri, second.petri],
    ['titans', first.titans, second.titans],
  ];
  const evidence = Object.fromEntries(
    pairs.map(([family, one, two]) => {
      const firstBytes = JSON.stringify(one);
      const secondBytes = JSON.stringify(two);
      return [
        family,
        {
          firstSha256: sha256Bytes(firstBytes),
          secondSha256: sha256Bytes(secondBytes),
          byteIdentical: firstBytes === secondBytes,
        },
      ];
    }),
  ) as FamilyReplayBundle['evidence'];
  return { first, second, evidence };
}

function rawRows(bundle: FamilyReplayBundle): V4RawResultRow[] {
  const rows: V4RawResultRow[] = [];
  const { first, second } = bundle;

  for (let seedIndex = 0; seedIndex < first.ordinary.results.length; seedIndex++) {
    const run = first.ordinary.results[seedIndex]!;
    const replay = second.ordinary.results[seedIndex]!;
    for (let armIndex = 0; armIndex < run.arms.length; armIndex++) {
      const arm = run.arms[armIndex]!;
      const replayArm = replay.arms[armIndex]!;
      const replayPass = JSON.stringify(arm) === JSON.stringify(replayArm);
      rows.push({
        schema_version: 1,
        protocol_version: V4_PROTOCOL_VERSION,
        family: 'ordinary-organisms',
        controller_type: 'neural',
        neural_controller: true,
        neural_capacity_evaluated: false,
        evidence_tier: 'live-action',
        seed: arm.seed,
        task: V4_FAMILY_FIXTURES['ordinary-organisms'].primaryOutcome.id,
        arm: arm.arm,
        live_capacity_tier: 'single-entity-fp32-70-parameter-controller',
        live_parameter_count: 70,
        designed_parameter_count: 70,
        parameter_count_semantics: 'trainable-controller-parameters',
        primary_outcome: arm.primaryOutcome,
        primary_mean_brier: null,
        fixture_sha256: arm.hashes.fixtureSha256,
        initial_state_sha256: arm.hashes.initialStateSha256,
        percept_sha256: arm.hashes.perceptSha256,
        task_schedule_sha256: arm.hashes.goalScheduleSha256,
        environment_rng_evidence_kind: 'exact-empty-environment-tape',
        environment_rng_evidence_sha256: arm.hashes.environmentRngTapeSha256,
        environment_rng_tape_sha256: arm.hashes.environmentRngTapeSha256,
        environment_rng_draw_count: arm.hashes.environmentRngDrawCount,
        surrogate_rng_tape_sha256:
          arm.hashes.surrogateRngDrawCount > 0 ? arm.hashes.surrogateRngTapeSha256 : null,
        surrogate_rng_draw_count: arm.hashes.surrogateRngDrawCount,
        calibration_sha256: arm.hashes.calibrationSha256,
        intervention_sha256: arm.hashes.interventionSha256,
        replay_fingerprint: arm.replayFingerprint,
        replay_pass: replayPass,
        latency_ms: null,
        latency_status: 'not-measured-per-row',
        memory_bytes: 17,
        memory_scope: 'incremental-semantic-context-only',
        failure_reason: replayPass ? null : 'byte-replay-mismatch',
        secondary_json: JSON.stringify({
          outcomes: arm.secondaryOutcomes,
          intervention: arm.intervention,
          initialGenomeSha256: arm.hashes.initialGenomeSha256,
          brainRngTapeSha256: arm.hashes.brainRngTapeSha256,
          brainRngDrawCount: arm.hashes.brainRngDrawCount,
        }),
      });
    }
  }

  for (let seedIndex = 0; seedIndex < first.predictor.rows.length; seedIndex++) {
    const run = first.predictor.rows[seedIndex]!;
    const replay = second.predictor.rows[seedIndex]!;
    for (let armIndex = 0; armIndex < run.arms.length; armIndex++) {
      const arm = run.arms[armIndex]!;
      const replayArm = replay.arms[armIndex]!;
      if (
        arm.scoredTrueLabelCount !== 95 ||
        arm.postReversalScored.count !== 95 ||
        arm.postReversalScored.firstLabelCadence !== 145 ||
        arm.postReversalScored.lastLabelCadence !== 239 ||
        arm.primaryMeanBrier !== arm.postReversalScored.meanBrier ||
        Math.abs(1 - arm.primaryOutcome - arm.primaryMeanBrier) > 1e-12
      ) {
        throw new Error(`predictor ${run.evaluationSeed}/${arm.arm} violated its frozen endpoint`);
      }
      const replayPass =
        arm.replay.byteIdentical && JSON.stringify(arm) === JSON.stringify(replayArm);
      rows.push({
        schema_version: 1,
        protocol_version: V4_PROTOCOL_VERSION,
        family: 'simple-mnist-ecology-predictor',
        controller_type: 'neural',
        neural_controller: true,
        neural_capacity_evaluated: false,
        evidence_tier: 'shared-cadence-online-prediction',
        seed: run.evaluationSeed,
        task: V4_FAMILY_FIXTURES['simple-mnist-ecology-predictor'].primaryOutcome.id,
        arm: arm.arm,
        live_capacity_tier: 'single-4-4-1-fp64-online-predictor',
        live_parameter_count: 25,
        designed_parameter_count: 25,
        parameter_count_semantics: 'trainable-controller-parameters',
        primary_outcome: arm.primaryOutcome,
        primary_mean_brier: arm.primaryMeanBrier,
        fixture_sha256: run.fixtureSha256,
        initial_state_sha256: arm.hashes.initialStateSha256,
        percept_sha256: arm.hashes.perceptScheduleSha256,
        task_schedule_sha256: arm.hashes.taskScheduleSha256,
        environment_rng_evidence_kind: arm.constructorRng.evidenceKind,
        environment_rng_evidence_sha256: arm.hashes.constructorRngEvidenceSha256,
        environment_rng_tape_sha256: arm.constructorRng.rawTapeSha256,
        environment_rng_draw_count: arm.constructorRng.drawCount,
        surrogate_rng_tape_sha256: null,
        surrogate_rng_draw_count: 0,
        calibration_sha256: null,
        intervention_sha256: arm.hashes.routedSignalTraceSha256,
        replay_fingerprint: arm.contentSha256,
        replay_pass: replayPass,
        latency_ms: null,
        latency_status: 'not-measured-per-row',
        memory_bytes: 25 * Float64Array.BYTES_PER_ELEMENT,
        memory_scope: 'trainable-parameter-payload-only',
        failure_reason: replayPass ? null : 'byte-replay-mismatch',
        secondary_json: JSON.stringify({
          preReversal: arm.preReversal,
          postReversalScored: arm.postReversalScored,
          recovery: arm.recovery,
          routing: arm.routing,
          bounds: arm.bounds,
          registryRoutingTraceSha256: arm.hashes.registryRoutingTraceSha256,
          finalSnapshotSha256: arm.hashes.finalSnapshotSha256,
        }),
      });
    }
  }

  for (let seedIndex = 0; seedIndex < first.petri.runs.length; seedIndex++) {
    const run = first.petri.runs[seedIndex]!;
    const replay = second.petri.runs[seedIndex]!;
    for (let armIndex = 0; armIndex < run.arms.length; armIndex++) {
      const arm = run.arms[armIndex]!;
      const replayArm = replay.arms[armIndex]!;
      const replayPass = JSON.stringify(arm) === JSON.stringify(replayArm);
      rows.push({
        schema_version: 1,
        protocol_version: V4_PROTOCOL_VERSION,
        family: 'petri-digital-biologics',
        controller_type: 'ecological',
        neural_controller: false,
        neural_capacity_evaluated: false,
        evidence_tier: 'live-differential-selection',
        seed: arm.evaluationSeed,
        task: V4_FAMILY_FIXTURES['petri-digital-biologics'].primaryOutcome.id,
        arm: arm.arm,
        live_capacity_tier: 'two-specialist-64-slot-petri-dish',
        live_parameter_count: 6,
        designed_parameter_count: 6,
        parameter_count_semantics: 'active-ad-fitness-weight-slots',
        primary_outcome: arm.primaryOutcome,
        primary_mean_brier: null,
        fixture_sha256: arm.hashes.fixtureSha256,
        initial_state_sha256: arm.hashes.initialStateSha256,
        percept_sha256: arm.hashes.perceptSha256,
        task_schedule_sha256: arm.hashes.taskScheduleSha256,
        environment_rng_evidence_kind: 'exact-recorded-mulberry32-tape',
        environment_rng_evidence_sha256: arm.hashes.environmentRngTapeSha256,
        environment_rng_tape_sha256: arm.hashes.environmentRngTapeSha256,
        environment_rng_draw_count: arm.environmentRngDrawCount,
        surrogate_rng_tape_sha256: null,
        surrogate_rng_draw_count: 0,
        calibration_sha256: null,
        intervention_sha256: arm.hashes.interventionSha256,
        replay_fingerprint: arm.hashes.trajectorySha256,
        replay_pass: replayPass,
        latency_ms: null,
        latency_status: 'not-measured-per-row',
        memory_bytes: null,
        memory_scope: 'not-byte-accounted-js-object-state',
        failure_reason: replayPass ? null : 'byte-replay-mismatch',
        secondary_json: JSON.stringify({
          outcomes: arm.secondary,
          affinityBypassed: arm.affinityBypassed,
          environmentTrajectorySha256: arm.hashes.environmentTrajectorySha256,
          finalStateSha256: arm.hashes.finalStateSha256,
        }),
      });
    }
  }

  const titanReplayByKey = new Map(
    second.titans.rows.map((row) => [`${row.seed}:${row.arm}`, row] as const),
  );
  for (const arm of first.titans.rows) {
    const replayArm = titanReplayByKey.get(`${arm.seed}:${arm.arm}`);
    if (replayArm === undefined) throw new Error('Titan replay row missing');
    const replayPass = JSON.stringify(arm) === JSON.stringify(replayArm);
    rows.push({
      schema_version: 1,
      protocol_version: V4_PROTOCOL_VERSION,
      family: 'titans',
      controller_type: 'game-policy',
      neural_controller: false,
      neural_capacity_evaluated: false,
      evidence_tier: 'live-diplomacy-payoff-world-state',
      seed: arm.seed,
      task: V4_FAMILY_FIXTURES.titans.primaryOutcome.id,
      arm: arm.arm,
      live_capacity_tier: 'two-titan-five-strategy-policy',
      live_parameter_count: 5,
      designed_parameter_count: 5,
      parameter_count_semantics: 'available-discrete-policy-strategies',
      primary_outcome: arm.primaryOutcome,
      primary_mean_brier: null,
      fixture_sha256: arm.hashes.fixtureSha256,
      initial_state_sha256: arm.hashes.initialStateSha256,
      percept_sha256: arm.hashes.perceptSha256,
      task_schedule_sha256: arm.hashes.goalScheduleSha256,
      environment_rng_evidence_kind: 'exact-recorded-mulberry32-tape',
      environment_rng_evidence_sha256: arm.hashes.environmentRngTapeSha256,
      environment_rng_tape_sha256: arm.hashes.environmentRngTapeSha256,
      environment_rng_draw_count: arm.secondaryOutcomes.environmentRngDrawCount,
      surrogate_rng_tape_sha256: arm.hashes.surrogateRngTapeSha256,
      surrogate_rng_draw_count: arm.secondaryOutcomes.surrogateRngDrawCount,
      calibration_sha256: arm.hashes.policySurrogateCalibrationSha256,
      intervention_sha256: null,
      replay_fingerprint: arm.replayFingerprint,
      replay_pass: replayPass,
      latency_ms: null,
      latency_status: 'not-measured-per-row',
      memory_bytes: null,
      memory_scope: 'not-byte-accounted-js-object-state',
      failure_reason: replayPass ? null : 'byte-replay-mismatch',
      secondary_json: JSON.stringify(arm.secondaryOutcomes),
    });
  }

  const expected =
    V4_EVALUATION_SEEDS.length *
    (V4_FAMILY_FIXTURES['ordinary-organisms'].arms.length +
      V4_FAMILY_FIXTURES['simple-mnist-ecology-predictor'].arms.length +
      V4_FAMILY_FIXTURES['petri-digital-biologics'].arms.length +
      V4_FAMILY_FIXTURES.titans.arms.length);
  if (rows.length !== expected || expected !== 1152) {
    throw new Error(`V4 raw data requires exactly 1152 rows, got ${rows.length}`);
  }
  assertV4RawMatrix(rows);
  return rows;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** Fail-closed structural and normalized-value validation for the complete raw publication matrix. */
export function assertV4RawMatrix(rows: readonly V4RawResultRow[]): void {
  let cursor = 0;
  for (const family of V4_FAMILY_ORDER) {
    const expectedController = controllerType(family);
    const expectedNeuralEligibility =
      family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor';
    const expectedEvidenceTier =
      family === 'ordinary-organisms'
        ? 'live-action'
        : family === 'simple-mnist-ecology-predictor'
          ? 'shared-cadence-online-prediction'
          : family === 'petri-digital-biologics'
            ? 'live-differential-selection'
            : 'live-diplomacy-payoff-world-state';
    const expectedCapacityTier =
      family === 'ordinary-organisms'
        ? 'single-entity-fp32-70-parameter-controller'
        : family === 'simple-mnist-ecology-predictor'
          ? 'single-4-4-1-fp64-online-predictor'
          : family === 'petri-digital-biologics'
            ? 'two-specialist-64-slot-petri-dish'
            : 'two-titan-five-strategy-policy';
    const expectedParameterCount =
      family === 'ordinary-organisms'
        ? 70
        : family === 'simple-mnist-ecology-predictor'
          ? 25
          : family === 'petri-digital-biologics'
            ? 6
            : 5;
    const expectedParameterSemantics =
      family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor'
        ? 'trainable-controller-parameters'
        : family === 'petri-digital-biologics'
          ? 'active-ad-fitness-weight-slots'
          : 'available-discrete-policy-strategies';
    const expectedMemoryBytes =
      family === 'ordinary-organisms'
        ? 17
        : family === 'simple-mnist-ecology-predictor'
          ? 25 * Float64Array.BYTES_PER_ELEMENT
          : null;
    const expectedMemoryScope =
      family === 'ordinary-organisms'
        ? 'incremental-semantic-context-only'
        : family === 'simple-mnist-ecology-predictor'
          ? 'trainable-parameter-payload-only'
          : 'not-byte-accounted-js-object-state';
    for (const seed of V4_EVALUATION_SEEDS) {
      for (const arm of V4_FAMILY_FIXTURES[family].arms) {
        const row = rows[cursor++];
        if (
          row === undefined ||
          row.schema_version !== 1 ||
          row.protocol_version !== V4_PROTOCOL_VERSION ||
          row.family !== family ||
          row.seed !== seed ||
          row.arm !== arm ||
          row.controller_type !== expectedController ||
          row.neural_controller !== expectedNeuralEligibility ||
          row.neural_capacity_evaluated !== false ||
          row.evidence_tier !== expectedEvidenceTier ||
          row.task !== V4_FAMILY_FIXTURES[family].primaryOutcome.id ||
          row.live_capacity_tier !== expectedCapacityTier ||
          row.live_parameter_count !== expectedParameterCount ||
          row.designed_parameter_count !== expectedParameterCount ||
          row.parameter_count_semantics !== expectedParameterSemantics ||
          row.memory_bytes !== expectedMemoryBytes ||
          row.memory_scope !== expectedMemoryScope
        ) {
          throw new Error(`raw V4 matrix differs at canonical row ${cursor - 1}`);
        }
        if (
          !Number.isFinite(row.primary_outcome) ||
          row.primary_outcome < 0 ||
          row.primary_outcome > 1 ||
          row.fixture_sha256 !== fixtureSha256(family) ||
          ![
            row.fixture_sha256,
            row.initial_state_sha256,
            row.percept_sha256,
            row.task_schedule_sha256,
            row.environment_rng_evidence_sha256,
            row.replay_fingerprint,
          ].every((value) => SHA256_PATTERN.test(value)) ||
          !Number.isSafeInteger(row.environment_rng_draw_count) ||
          row.environment_rng_draw_count < 0 ||
          !Number.isSafeInteger(row.surrogate_rng_draw_count) ||
          row.surrogate_rng_draw_count < 0 ||
          typeof row.replay_pass !== 'boolean' ||
          row.latency_ms !== null ||
          row.latency_status !== 'not-measured-per-row' ||
          (row.memory_bytes !== null &&
            (!Number.isSafeInteger(row.memory_bytes) || row.memory_bytes < 0)) ||
          (row.failure_reason !== null &&
            ![
              'byte-replay-mismatch',
              'family-evidence-gate-failed',
              'family-inference-gate-failed',
              'family-magnitude-gate-failed',
              'family-inference-and-magnitude-gates-failed',
            ].includes(row.failure_reason)) ||
          (!row.replay_pass && row.failure_reason !== 'byte-replay-mismatch') ||
          (row.replay_pass && row.failure_reason === 'byte-replay-mismatch') ||
          row.environment_rng_evidence_kind.length === 0 ||
          (row.environment_rng_tape_sha256 !== null &&
            !SHA256_PATTERN.test(row.environment_rng_tape_sha256)) ||
          (row.surrogate_rng_tape_sha256 !== null &&
            !SHA256_PATTERN.test(row.surrogate_rng_tape_sha256)) ||
          (row.calibration_sha256 !== null && !SHA256_PATTERN.test(row.calibration_sha256)) ||
          (row.intervention_sha256 !== null && !SHA256_PATTERN.test(row.intervention_sha256))
        ) {
          throw new Error(`raw V4 row ${cursor - 1} failed normalized/hash evidence validation`);
        }
        if ((row.surrogate_rng_draw_count === 0) !== (row.surrogate_rng_tape_sha256 === null)) {
          throw new Error(`raw V4 row ${cursor - 1} has inconsistent surrogate RNG evidence`);
        }
        let secondary: unknown;
        try {
          secondary = JSON.parse(row.secondary_json);
        } catch {
          throw new Error(`raw V4 row ${cursor - 1} has invalid secondary JSON`);
        }
        if (secondary === null || typeof secondary !== 'object') {
          throw new Error(`raw V4 row ${cursor - 1} has non-object secondary evidence`);
        }
        if (family === 'simple-mnist-ecology-predictor') {
          const predictorSecondary = secondary as {
            postReversalScored?: {
              firstLabelCadence?: number;
              lastLabelCadence?: number;
              count?: number;
              meanBrier?: number;
            };
          };
          const scored = predictorSecondary.postReversalScored;
          if (
            row.primary_mean_brier === null ||
            !Number.isFinite(row.primary_mean_brier) ||
            row.primary_mean_brier < 0 ||
            row.primary_mean_brier > 1 ||
            Math.abs(1 - row.primary_outcome - row.primary_mean_brier) > 1e-12 ||
            scored?.firstLabelCadence !== 145 ||
            scored.lastLabelCadence !== 239 ||
            scored.count !== 95 ||
            scored.meanBrier !== row.primary_mean_brier ||
            row.environment_rng_tape_sha256 !== null ||
            row.surrogate_rng_draw_count !== 0 ||
            row.calibration_sha256 !== null
          ) {
            throw new Error(`predictor raw row ${cursor - 1} has an invalid Brier denominator`);
          }
        } else if (row.primary_mean_brier !== null) {
          throw new Error(`non-predictor raw row ${cursor - 1} unexpectedly reports Brier error`);
        }
        const isOrdinarySurrogate =
          family === 'ordinary-organisms' && arm === 'action-distribution-matched-surrogate';
        const isTitanSurrogate =
          family === 'titans' && arm === 'action-rate-matched-policy-surrogate';
        const expectsSurrogate = isOrdinarySurrogate || isTitanSurrogate;
        if (
          expectsSurrogate !== row.surrogate_rng_draw_count > 0 ||
          expectsSurrogate !== (row.calibration_sha256 !== null) ||
          (family !== 'simple-mnist-ecology-predictor' &&
            row.environment_rng_tape_sha256 === null) ||
          (family === 'titans' && row.intervention_sha256 !== null) ||
          (family !== 'titans' && row.intervention_sha256 === null)
        ) {
          throw new Error(
            `raw V4 row ${cursor - 1} violates arm-specific RNG/intervention isolation`,
          );
        }
      }
    }
  }
  if (cursor !== rows.length || cursor !== 1152) {
    throw new Error(`raw V4 matrix must contain exactly 1152 canonical rows, got ${rows.length}`);
  }
}

/**
 * Retain every preregistered row while making family-level gate failures explicit.
 * Byte replay has precedence because it invalidates the row's evidence identity;
 * otherwise evidence, inference, and magnitude failures are reported independently.
 */
export function annotateV4RawFailureReasons(
  rows: readonly V4RawResultRow[],
  gates: Readonly<Record<V4FamilyId, V4FamilyFailureGates>>,
): V4RawResultRow[] {
  return rows.map((row) => {
    let failureReason: V4RawResultRow['failure_reason'];
    if (!row.replay_pass) {
      failureReason = 'byte-replay-mismatch';
    } else {
      const family = gates[row.family];
      if (!family.evidencePass) {
        failureReason = 'family-evidence-gate-failed';
      } else if (!family.inferencePass && !family.magnitudePass) {
        failureReason = 'family-inference-and-magnitude-gates-failed';
      } else if (!family.inferencePass) {
        failureReason = 'family-inference-gate-failed';
      } else if (!family.magnitudePass) {
        failureReason = 'family-magnitude-gate-failed';
      } else {
        failureReason = null;
      }
    }
    return { ...row, failure_reason: failureReason };
  });
}

/** Compact, self-decoding summaries of both action-rate-matched control calibrations. */
export function v4SurrogateCalibrationReceipt(
  ordinary: OrdinaryV4EvaluationResult['calibration'],
  titan: TitanV4Evaluation['calibration'],
) {
  const magnitudes = ordinary.calibration.sortedNonZeroMagnitudes;
  const exactCalibrationSeeds = JSON.stringify([...V4_SURROGATE_CALIBRATION_SEEDS]);
  const magnitudesValid =
    magnitudes.length > 0 &&
    magnitudes.every(
      (value, index) =>
        Number.isFinite(value) && value > 0 && (index === 0 || value >= magnitudes[index - 1]!),
    );
  const expectedTitanMoveCount =
    V4_SURROGATE_CALIBRATION_SEEDS.length *
    V4_FAMILY_FIXTURES.titans.regimes.length *
    V4_FAMILY_FIXTURES.titans.roundsPerRegime *
    2;
  if (
    JSON.stringify(ordinary.sourceSeeds) !== exactCalibrationSeeds ||
    ordinary.actionVectorCount <= 0 ||
    magnitudes.length > ordinary.actionVectorCount ||
    !magnitudesValid ||
    ordinary.calibration.actionFrequency !== magnitudes.length / ordinary.actionVectorCount ||
    !SHA256_PATTERN.test(ordinary.calibrationSha256) ||
    !SHA256_PATTERN.test(ordinary.replayFingerprint) ||
    ordinary.sourceReplayFingerprints.length !== V4_SURROGATE_CALIBRATION_SEEDS.length ||
    !ordinary.sourceReplayFingerprints.every((value) => SHA256_PATTERN.test(value)) ||
    !Number.isFinite(titan.cooperationRate) ||
    titan.cooperationRate < 0 ||
    titan.cooperationRate > 1 ||
    titan.sourceMoveCount !== expectedTitanMoveCount ||
    !SHA256_PATTERN.test(titan.sourceMovesSha256) ||
    !SHA256_PATTERN.test(titan.contentHash)
  ) {
    throw new Error('V4 surrogate calibration evidence is incomplete or malformed');
  }
  const middle = Math.floor(magnitudes.length / 2);
  const medianMagnitude =
    magnitudes.length % 2 === 0
      ? (magnitudes[middle - 1]! + magnitudes[middle]!) / 2
      : magnitudes[middle]!;
  return {
    ordinaryActionDistribution: {
      sourceArm: ordinary.sourceArm,
      sourceSeeds: [...ordinary.sourceSeeds],
      actionVectorCount: ordinary.actionVectorCount,
      nonZeroActionVectorCount: magnitudes.length,
      zeroActionVectorCount: ordinary.actionVectorCount - magnitudes.length,
      actionFrequency: ordinary.calibration.actionFrequency,
      nonZeroMagnitudeSummary: {
        count: magnitudes.length,
        minimum: magnitudes[0]!,
        median: medianMagnitude,
        maximum: magnitudes[magnitudes.length - 1]!,
      },
      calibrationSha256: ordinary.calibrationSha256,
      sourceReplayFingerprints: [...ordinary.sourceReplayFingerprints],
      replayFingerprint: ordinary.replayFingerprint,
    },
    titanPooledPolicy: {
      sourceArm: 'full-intelligence-diplomacy',
      sourceSeeds: [...V4_SURROGATE_CALIBRATION_SEEDS],
      sourceMoveOrder: 'calibration-seed -> frozen-regime -> round -> titan-index',
      regimeCount: V4_FAMILY_FIXTURES.titans.regimes.length,
      roundsPerRegime: V4_FAMILY_FIXTURES.titans.roundsPerRegime,
      movesPerRound: 2,
      ...titan,
    },
  } as const;
}

const CSV_COLUMNS = [
  'schema_version',
  'protocol_version',
  'family',
  'controller_type',
  'neural_controller',
  'neural_capacity_evaluated',
  'evidence_tier',
  'seed',
  'task',
  'arm',
  'live_capacity_tier',
  'live_parameter_count',
  'designed_parameter_count',
  'parameter_count_semantics',
  'primary_outcome',
  'primary_mean_brier',
  'fixture_sha256',
  'initial_state_sha256',
  'percept_sha256',
  'task_schedule_sha256',
  'environment_rng_evidence_kind',
  'environment_rng_evidence_sha256',
  'environment_rng_tape_sha256',
  'environment_rng_draw_count',
  'surrogate_rng_tape_sha256',
  'surrogate_rng_draw_count',
  'calibration_sha256',
  'intervention_sha256',
  'replay_fingerprint',
  'replay_pass',
  'latency_ms',
  'latency_status',
  'memory_bytes',
  'memory_scope',
  'failure_reason',
  'secondary_json',
] as const satisfies readonly (keyof V4RawResultRow)[];

function csvCell(value: unknown): string {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildV4RawCsv(rows: readonly V4RawResultRow[]): string {
  if (rows.length === 0) throw new RangeError('V4 raw CSV requires at least one row');
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) lines.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(','));
  return `${lines.join('\n')}\n`;
}

function armOutcomes(rows: readonly V4RawResultRow[], family: V4FamilyId, arm: string): number[] {
  const selected = rows.filter((row) => row.family === family && row.arm === arm);
  if (
    selected.length !== V4_EVALUATION_SEEDS.length ||
    selected.some((row, index) => row.seed !== V4_EVALUATION_SEEDS[index])
  ) {
    throw new Error(`${family}/${arm} is not an exact ordered 64-row series`);
  }
  return selected.map(({ primary_outcome }) => primary_outcome);
}

function brierOutcomes(rows: readonly V4RawResultRow[], arm: string): number[] {
  const selected = rows.filter(
    (row) => row.family === 'simple-mnist-ecology-predictor' && row.arm === arm,
  );
  if (
    selected.length !== V4_EVALUATION_SEEDS.length ||
    selected.some(
      (row, index) => row.seed !== V4_EVALUATION_SEEDS[index] || row.primary_mean_brier === null,
    )
  ) {
    throw new Error(`predictor/${arm} is not an exact ordered 64-row Brier series`);
  }
  return selected.map(({ primary_mean_brier }) => primary_mean_brier!);
}

function matchedArmEvidence(bundle: FamilyRunBundle): Record<V4FamilyId, boolean> {
  const ordinary = bundle.ordinary.results.every((run) => {
    const hashes = run.arms.map(({ hashes: value }) => value);
    return [
      'initialStateSha256',
      'perceptSha256',
      'goalScheduleSha256',
      'environmentRngTapeSha256',
      'environmentRngDrawCount',
      'brainRngTapeSha256',
      'brainRngDrawCount',
    ].every((key) => new Set(hashes.map((value) => value[key as keyof typeof value])).size === 1);
  });
  const predictor = bundle.predictor.rows.every((row) =>
    Object.entries(row.matchedEvidence)
      .filter(([key]) => key.endsWith('MatchedAcrossArms'))
      .every(([, value]) => value === true),
  );
  const petri = bundle.petri.runs.every((run) => run.matched.exact);
  const titanGroups = new Map<number, typeof bundle.titans.rows>();
  for (const row of bundle.titans.rows) {
    const group = titanGroups.get(row.seed) ?? [];
    group.push(row);
    titanGroups.set(row.seed, group);
  }
  const titans = [...titanGroups.values()].every(
    (group) =>
      group.length === V4_FAMILY_FIXTURES.titans.arms.length &&
      group.every((row, index) => row.arm === V4_FAMILY_FIXTURES.titans.arms[index]) &&
      [
        'initialStateSha256',
        'perceptSha256',
        'goalScheduleSha256',
        'environmentRngTapeSha256',
      ].every(
        (key) => new Set(group.map(({ hashes }) => hashes[key as keyof typeof hashes])).size === 1,
      ) &&
      new Set(group.map(({ secondaryOutcomes }) => secondaryOutcomes.environmentRngDrawCount))
        .size === 1 &&
      group.every(({ secondaryOutcomes }) => secondaryOutcomes.environmentRngDrawCount === 60) &&
      group.every((row) => {
        const surrogate = row.arm === 'action-rate-matched-policy-surrogate';
        return surrogate
          ? row.secondaryOutcomes.surrogateRngDrawCount === 60 &&
              row.hashes.surrogateRngTapeSha256 !== null &&
              row.hashes.policySurrogateCalibrationSha256 === bundle.titans.calibration.contentHash
          : row.secondaryOutcomes.surrogateRngDrawCount === 0 &&
              row.hashes.surrogateRngTapeSha256 === null &&
              row.hashes.policySurrogateCalibrationSha256 === null;
      }),
  );
  return {
    'ordinary-organisms': ordinary,
    'simple-mnist-ecology-predictor': predictor,
    'petri-digital-biologics': petri,
    titans,
  };
}

function familyLabels(family: V4FamilyId): string {
  switch (family) {
    case 'ordinary-organisms':
      return 'Ordinary organisms';
    case 'simple-mnist-ecology-predictor':
      return 'Ecology predictor';
    case 'petri-digital-biologics':
      return 'Petri biologics';
    case 'titans':
      return 'Titans';
  }
}

function controllerType(family: V4FamilyId): V4ForestRow['controllerType'] {
  if (family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor') {
    return 'neural';
  }
  return family === 'petri-digital-biologics' ? 'ecological' : 'game-policy';
}

/** Population-cost evidence is scoped to ordinary organisms; numerical safety is a shared release gate. */
export function v4FamilyClaimReleaseGate(
  family: V4FamilyId,
  familyPass: boolean,
  numericalSafetyPass: boolean,
  ordinaryPopulationCostPass: boolean,
): boolean {
  return (
    familyPass &&
    numericalSafetyPass &&
    (family !== 'ordinary-organisms' || ordinaryPopulationCostPass)
  );
}

function familyStatistics(
  rows: readonly V4RawResultRow[],
  family: V4FamilyId,
): {
  summaries: V4ContrastSummary[];
  deltas: number[][];
  magnitude: Array<Record<string, unknown> & { pass: boolean }>;
  inferencePass: boolean;
  magnitudePass: boolean;
  familyPass: boolean;
  weakestIndex: number;
} {
  let deltas: number[][];
  let magnitude: Array<Record<string, unknown> & { pass: boolean }>;
  if (family === 'ordinary-organisms') {
    const full = armOutcomes(rows, family, 'full-semantic-recurrent');
    const controls = [
      'recurrence-disabled-current-input',
      'semantic-channel-cyclic-permutation',
      'goal-preserved-shared-field-disabled',
      'action-distribution-matched-surrogate',
    ];
    deltas = controls.map((arm) => pairedDeltas(full, armOutcomes(rows, family, arm)));
    magnitude = deltas.map((values) => ({
      rule: 'median>=0.05-and-worst>=-0.20-normalized-points',
      pass: familyMagnitudePass(values),
    }));
  } else if (family === 'simple-mnist-ecology-predictor') {
    const full = armOutcomes(rows, family, 'adaptive');
    const controls = ['frozen-identical-initial-weights', 'target-shuffled'];
    deltas = controls.map((arm) => pairedDeltas(full, armOutcomes(rows, family, arm)));
    const adaptiveBrier = brierOutcomes(rows, 'adaptive');
    magnitude = controls.map((arm) => {
      const reduction = predictorAggregateRelativeErrorReduction(
        adaptiveBrier,
        brierOutcomes(rows, arm),
      );
      return {
        rule: 'aggregate-relative-true-label-Brier-reduction>=0.05',
        defined: reduction.defined,
        value: reduction.value,
        pass: reduction.defined && reduction.value >= 0.05,
      };
    });
  } else if (family === 'petri-digital-biologics') {
    const full = armOutcomes(rows, family, 'full-semantic-selection');
    const controls = [
      'shared-field-disabled',
      'semantic-channel-cyclic-permutation',
      'uniform-flux-no-affinity',
    ];
    deltas = controls.map((arm) => pairedDeltas(full, armOutcomes(rows, family, arm)));
    magnitude = deltas.map((values) => ({
      rule: 'median>=0.05-and-worst>=-0.20-normalized-points',
      pass: familyMagnitudePass(values),
    }));
  } else {
    const full = armOutcomes(rows, family, 'full-intelligence-diplomacy');
    const controls = [
      'shared-field-disabled',
      'semantic-channel-cyclic-permutation',
      'action-rate-matched-policy-surrogate',
    ];
    deltas = controls.map((arm) => pairedDeltas(full, armOutcomes(rows, family, arm)));
    magnitude = deltas.map((values) => ({
      rule: 'median>=0.05-and-worst>=-0.20-normalized-points',
      pass: familyMagnitudePass(values),
    }));
  }
  const summaries = summarizeV4FamilyContrasts(family, deltas);
  const inferencePass = summaries.every(({ inferencePass: pass }) => pass);
  const magnitudePass = magnitude.every(({ pass }) => pass);
  return {
    summaries,
    deltas,
    magnitude,
    inferencePass,
    magnitudePass,
    familyPass: inferencePass && magnitudePass,
    weakestIndex: weakestV4ContrastIndex(deltas),
  };
}

export function evaluateV4PerformanceAcceptance(performance: V4PerformanceEnvelope) {
  const rule = V4_ACCEPTANCE.populationCostRule;
  const expectedProcesses = V4_PERFORMANCE_PROCESS_COUNT;
  const expectedBatches = expectedProcesses * performance.config.batches;
  const exactPoints =
    performance.points.length === rule.points.length &&
    performance.points.every((point, index) => point.population === rule.points[index]);
  const slopeSeriesValid =
    performance.processEnhancedRuntimeLogLogSlopes.length === expectedProcesses &&
    performance.processEnhancedRuntimeLogLogSlopes.every(Number.isFinite) &&
    Number.isFinite(performance.enhancedRuntimeLogLogSlope);
  const everyProcessSlopeWithinBudget =
    slopeSeriesValid &&
    performance.processEnhancedRuntimeLogLogSlopes.every(
      (slope) => slope <= rule.maxLogLogRuntimeSlope,
    );
  const slopePass =
    slopeSeriesValid && performance.enhancedRuntimeLogLogSlope <= rule.maxLogLogRuntimeSlope;
  const medianPass =
    Number.isFinite(performance.fiftyThousand.incrementalMedianMs) &&
    performance.fiftyThousand.incrementalMedianMs < rule.maxIncrementalMedianMsAt50000;
  const batchSeriesValid =
    performance.fiftyThousand.everyIncrementalBatchMedianMs.length === expectedBatches &&
    performance.fiftyThousand.processIncrementalMediansMs.length === expectedProcesses &&
    performance.fiftyThousand.everyIncrementalBatchMedianMs.every(Number.isFinite) &&
    performance.fiftyThousand.processIncrementalMediansMs.every(Number.isFinite) &&
    performance.points.every(
      (point) =>
        point.legacyBatchMediansMs.length === expectedBatches &&
        point.enhancedBatchMediansMs.length === expectedBatches &&
        point.incrementalBatchMediansMs.length === expectedBatches &&
        [
          ...point.legacyBatchMediansMs,
          ...point.enhancedBatchMediansMs,
          ...point.incrementalBatchMediansMs,
        ].every(Number.isFinite),
    );
  const everyBatchPass =
    batchSeriesValid &&
    performance.fiftyThousand.everyIncrementalBatchMedianMs.every(
      (value) => value < rule.maxEveryCounterbalancedBatchMedianMsAt50000,
    );
  const storagePass =
    performance.semanticStorageMatchesFrozenExact &&
    performance.semanticStorageBytesPerEntity === rule.semanticStorageBytesPerEntity;
  const structurePass =
    performance.kind === 'three-fresh-process-envelope' &&
    JSON.stringify(performance.config) === JSON.stringify(V4_PERFORMANCE_CONFIG) &&
    performance.repeatProcesses === expectedProcesses &&
    performance.processRuns.length === expectedProcesses &&
    performance.processRuns.every(
      (run) => run.mode === 'full' && run.points.length === rule.points.length,
    ) &&
    performance.freshProcesses &&
    performance.branchStateIsolated &&
    performance.orderCounterbalanced &&
    performance.pointOrderCounterbalanced &&
    performance.processMeasurementPointOrders.length === expectedProcesses &&
    performance.processMeasurementPointOrders.every(
      (order, index) =>
        JSON.stringify(order) === JSON.stringify(V4_PERFORMANCE_POINT_ORDERS[index]),
    ) &&
    performance.points.every(({ executionSha256 }) => SHA256_PATTERN.test(executionSha256)) &&
    exactPoints;
  return {
    exactPoints,
    slopeSeriesValid,
    batchSeriesValid,
    everyProcessSlopeWithinBudget,
    slopePass,
    medianPass,
    everyBatchPass,
    storagePass,
    structurePass,
    accepted: slopePass && medianPass && everyBatchPass && storagePass && structurePass,
  };
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function fixed(value: number, digits = 6): string {
  const text = value.toFixed(digits);
  return text === '-0.000000' ? '0.000000' : text;
}

/** Pure deterministic SVG renderer; identical rows and receipt SHA produce identical bytes. */
export function buildV4ForestSvg(
  rows: readonly V4ForestRow[],
  receiptContentSha256: string,
): string {
  if (rows.length !== V4_FAMILY_ORDER.length) {
    throw new RangeError('V4 forest requires exactly one row per family');
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const expectedFamily = V4_FAMILY_ORDER[index]!;
    const expectedNeuralEligibility =
      expectedFamily === 'ordinary-organisms' ||
      expectedFamily === 'simple-mnist-ecology-predictor';
    const derivedInferencePass =
      row.meanDelta > 0 && row.lower95 > 0 && row.holmSignFlipP < V4_ALPHA;
    if (
      row.family !== expectedFamily ||
      row.controllerType !== controllerType(expectedFamily) ||
      row.neuralController !== expectedNeuralEligibility ||
      row.label.length === 0 ||
      row.contrast.length === 0 ||
      ![row.meanDelta, row.lower95, row.upper95, row.holmSignFlipP].every(Number.isFinite) ||
      row.meanDelta < -1 ||
      row.meanDelta > 1 ||
      row.lower95 < -1 ||
      row.upper95 > 1 ||
      row.lower95 > row.upper95 ||
      row.holmSignFlipP < 0 ||
      row.holmSignFlipP > 1 ||
      row.inferencePass !== derivedInferencePass ||
      (row.familyPass && !row.inferencePass) ||
      (row.claimAuthorized && !row.familyPass)
    ) {
      throw new RangeError(`V4 forest row ${index} is malformed or out of canonical order`);
    }
  }
  if (!/^[0-9a-f]{64}$/.test(receiptContentSha256)) {
    throw new RangeError('V4 forest requires a receipt SHA-256');
  }
  const width = 1480;
  const height = 430;
  const plotLeft = 390;
  const plotRight = 1020;
  const rowTop = 150;
  const rowGap = 62;
  const observedMin = Math.min(0, ...rows.map(({ lower95 }) => lower95));
  const observedMax = Math.max(0, ...rows.map(({ upper95 }) => upper95));
  const domainMin = Math.min(-0.05, Math.floor((observedMin - 0.02) / 0.05) * 0.05);
  const domainMax = Math.max(0.1, Math.ceil((observedMax + 0.02) / 0.05) * 0.05);
  const x = (value: number): number =>
    plotLeft + ((value - domainMin) / (domainMax - domainMin)) * (plotRight - plotLeft);
  const zeroX = x(0);
  const ticks: number[] = [];
  for (let value = domainMin; value <= domainMax + 1e-12; value += 0.05) {
    ticks.push(Number(value.toFixed(10)));
  }
  const metadata = xml(
    JSON.stringify({
      schemaVersion: 1,
      protocolVersion: V4_PROTOCOL_VERSION,
      receiptContentSha256,
      interval: 'unadjusted-paired-bootstrap-95',
      multiplicity: 'Holm-adjusted-one-sided-sign-flip-within-family',
      pooledCrossFamilyClaim: false,
    }),
  );
  const body: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="v4-forest-title v4-forest-desc">`,
    `<title id="v4-forest-title">Organism intelligence V4 weakest preregistered contrasts</title>`,
    `<desc id="v4-forest-desc">One weakest mean full-minus-control contrast per family. Intervals are unadjusted paired-bootstrap 95 percent intervals. Text separately reports Holm-adjusted sign-flip, complete inference, behavior-family acceptance, and claim authorization. Red means failed family acceptance; gray means a passing family is non-neural and ineligible for neural-scaling inference. No pooled cross-family claim is made.</desc>`,
    `<metadata>${metadata}</metadata>`,
    `<rect width="${width}" height="${height}" rx="16" fill="#07111f"/>`,
    `<text x="32" y="38" fill="#f8fafc" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">V4 cross-being causal forest · weakest declared contrast</text>`,
    `<text x="32" y="64" fill="#94a3b8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13">Mean normalized full−control delta; unadjusted 95% paired-bootstrap CI; Holm marker shown separately</text>`,
    `<text x="32" y="86" fill="#f59e0b" font-family="ui-monospace,monospace" font-size="12">No pooled cross-family or neural-scaling pass. No consciousness or sentience inference.</text>`,
    `<line x1="${fixed(zeroX)}" y1="116" x2="${fixed(zeroX)}" y2="${height - 56}" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="5 5"/>`,
  ];
  for (const tick of ticks) {
    const tx = x(tick);
    body.push(
      `<line x1="${fixed(tx)}" y1="116" x2="${fixed(tx)}" y2="${height - 56}" stroke="#1e293b" stroke-width="1"/>`,
      `<text x="${fixed(tx)}" y="${height - 32}" fill="#94a3b8" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11">${fixed(tick, 2)}</text>`,
    );
  }
  rows.forEach((row, index) => {
    const y = rowTop + index * rowGap;
    const displayContrast = row.contrast.replace(/^.*? minus /, 'vs ');
    // Failure-forward red takes precedence; gray is reserved for passing but non-neural/ineligible rows.
    const color = !row.familyPass ? '#ef4444' : !row.neuralController ? '#94a3b8' : '#22c55e';
    const holmPass = row.holmSignFlipP < V4_ALPHA;
    const marker = holmPass ? 'Holm ✓' : 'Holm ✕';
    const neuralNote = row.neuralController ? '' : ' · neural scaling N/A';
    body.push(
      `<text x="32" y="${y - 5}" fill="#e2e8f0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" font-weight="700">${xml(row.label)}</text>`,
      `<text x="32" y="${y + 14}" fill="#64748b" font-family="ui-sans-serif,system-ui,sans-serif" font-size="10">${xml(displayContrast)}</text>`,
      `<line x1="${fixed(x(row.lower95))}" y1="${y}" x2="${fixed(x(row.upper95))}" y2="${y}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`,
      `<line x1="${fixed(x(row.lower95))}" y1="${y - 7}" x2="${fixed(x(row.lower95))}" y2="${y + 7}" stroke="${color}" stroke-width="2"/>`,
      `<line x1="${fixed(x(row.upper95))}" y1="${y - 7}" x2="${fixed(x(row.upper95))}" y2="${y + 7}" stroke="${color}" stroke-width="2"/>`,
      `<circle cx="${fixed(x(row.meanDelta))}" cy="${y}" r="6" fill="${color}" stroke="#07111f" stroke-width="2"/>`,
      `<text x="1042" y="${y - 3}" fill="${color}" font-family="ui-monospace,monospace" font-size="12" font-weight="700">${fixed(row.meanDelta, 4)} [${fixed(row.lower95, 4)}, ${fixed(row.upper95, 4)}]</text>`,
      `<text x="1042" y="${y + 14}" fill="${row.inferencePass ? '#86efac' : '#fca5a5'}" font-family="ui-monospace,monospace" font-size="10">${marker} · p=${fixed(row.holmSignFlipP, 6)} · inference ${row.inferencePass ? 'PASS' : 'FAIL'} · behavior family ${row.familyPass ? 'PASS' : 'FAIL'} · claim ${row.claimAuthorized ? 'AUTHORIZED' : 'WITHHELD'}${neuralNote}</text>`,
    );
  });
  body.push(
    `<text x="32" y="${height - 18}" fill="#64748b" font-family="ui-monospace,monospace" font-size="10">receipt ${receiptContentSha256}</text>`,
    `</svg>`,
  );
  return `${body.join('\n')}\n`;
}

/** Verify the frozen source and every pinned dependency before any result row is evaluated. */
export async function verifyV4FrozenAuthority(): Promise<FrozenAuthorityVerification> {
  const manifestSha256 = await fileSha256(V4_RESULT_PATHS.manifest);
  const protocolSha256 = await fileSha256(V4_RESULT_PATHS.protocol);
  const manifest = (await Bun.file(resolve(ROOT, V4_RESULT_PATHS.manifest)).json()) as {
    protocolAuthority: {
      canonicalSource: string;
      canonicalSourceSha256: string;
      pinnedDependencies: Array<{ path: string; sha256: string; symbols: string[] }>;
    };
  };
  if (
    manifest.protocolAuthority.canonicalSource !== V4_RESULT_PATHS.protocol ||
    protocolSha256 !== manifest.protocolAuthority.canonicalSourceSha256
  ) {
    throw new Error('working protocol SHA differs from the committed manifest authority');
  }
  const pinnedDependencies: FrozenAuthorityVerification['pinnedDependencies'] = [];
  if (manifest.protocolAuthority.pinnedDependencies.length !== V4_PINNED_DEPENDENCIES.length) {
    throw new Error('manifest pinned-dependency count differs from the frozen protocol');
  }
  for (const expected of V4_PINNED_DEPENDENCIES) {
    const declared = manifest.protocolAuthority.pinnedDependencies.find(
      ({ path }) => path === expected.path,
    );
    const actualSha256 = await fileSha256(expected.path);
    if (
      declared === undefined ||
      declared.sha256 !== expected.sha256 ||
      actualSha256 !== expected.sha256 ||
      JSON.stringify(declared.symbols) !== JSON.stringify(expected.symbols)
    ) {
      throw new Error(`pinned V4 dependency drifted: ${expected.path}`);
    }
    pinnedDependencies.push({
      path: expected.path,
      sha256: actualSha256,
      symbols: [...expected.symbols],
      verified: true,
    });
  }
  return { manifestSha256, protocolSha256, pinnedDependencies };
}

function provenance(
  runtimeCommit: string,
  rawDataSha256: string,
  authority: FrozenAuthorityVerification,
  sourceSha256: Record<string, string>,
) {
  const benchmarkScriptPath = 'scripts/organism-intelligence-v4-benchmark.ts';
  const evaluatorSourceSha256 = Object.fromEntries(
    Object.entries(sourceSha256).filter(
      ([path]) => path.startsWith('scripts/organism-intelligence-v4/') && path.endsWith('.ts'),
    ),
  );
  return {
    repositoryPreregistrationOnly: true,
    externallyPreregistered: false,
    independentlyReplicated: false,
    manifestCommit: V4_MANIFEST_COMMIT,
    resultCommitMustDescendFromManifestCommit: true,
    runtimeBaseCommit: runtimeCommit,
    manifestPath: V4_RESULT_PATHS.manifest,
    manifestSha256: authority.manifestSha256,
    canonicalProtocolPath: V4_RESULT_PATHS.protocol,
    canonicalProtocolSha256: authority.protocolSha256,
    pinnedDependencies: authority.pinnedDependencies,
    benchmarkScriptPath,
    benchmarkScriptSha256: sourceSha256[benchmarkScriptPath],
    evaluatorSourceSha256,
    resultAffectingSourceSha256: sourceSha256,
    rawDataPath: V4_RESULT_PATHS.rawCsv,
    rawDataSha256,
    familyFixtureSha256: Object.fromEntries(
      V4_FAMILY_ORDER.map((family) => [family, fixtureSha256(family)]),
    ),
  };
}

async function assertRuntimeEvidenceUnchanged(
  runtimeCommit: string,
  authority: FrozenAuthorityVerification,
  sourceSha256: Record<string, string>,
): Promise<void> {
  if (git(['rev-parse', 'HEAD']) !== runtimeCommit || git(['status', '--porcelain']) !== '') {
    throw new Error('V4 runtime HEAD/worktree changed during result evaluation');
  }
  const currentAuthority = await verifyV4FrozenAuthority();
  const currentSources = await resultAffectingSourceHashes();
  if (
    JSON.stringify(currentAuthority) !== JSON.stringify(authority) ||
    JSON.stringify(currentSources) !== JSON.stringify(sourceSha256)
  ) {
    throw new Error('V4 result-affecting source bytes changed during result evaluation');
  }
}

/** Generate and write the descendant result artifacts. Requires a clean committed harness checkout. */
export async function generateV4BenchmarkArtifacts(): Promise<{
  receiptPath: string;
  rawCsvPath: string;
  forestSvgPath: string;
  receiptContentSha256: string;
  rawDataSha256: string;
  claims: Record<string, boolean>;
}> {
  const status = git(['status', '--porcelain']);
  if (status !== '') {
    throw new Error('V4 result generation requires a clean committed harness worktree');
  }
  const runtimeCommit = git(['rev-parse', 'HEAD']);
  git(['merge-base', '--is-ancestor', V4_MANIFEST_COMMIT, runtimeCommit]);
  const frozenProtocolBlob = git([
    'rev-parse',
    `${V4_MANIFEST_COMMIT}:${V4_RESULT_PATHS.protocol}`,
  ]);
  const workingProtocolBlob = git(['hash-object', V4_RESULT_PATHS.protocol]);
  const frozenManifestBlob = git([
    'rev-parse',
    `${V4_MANIFEST_COMMIT}:${V4_RESULT_PATHS.manifest}`,
  ]);
  const workingManifestBlob = git(['hash-object', V4_RESULT_PATHS.manifest]);
  if (frozenProtocolBlob !== workingProtocolBlob || frozenManifestBlob !== workingManifestBlob) {
    throw new Error('frozen V4 protocol or manifest differs from the manifest commit');
  }

  const authority = await verifyV4FrozenAuthority();
  const sourceSha256 = await resultAffectingSourceHashes();
  const replay = runFamilyReplay();
  let rows = rawRows(replay);
  const matched = matchedArmEvidence(replay.first);
  const familyStats = Object.fromEntries(
    V4_FAMILY_ORDER.map((family) => [family, familyStatistics(rows, family)]),
  ) as Record<V4FamilyId, ReturnType<typeof familyStatistics>>;
  const failureGates = Object.fromEntries(
    V4_FAMILY_ORDER.map((family) => [
      family,
      {
        evidencePass:
          matched[family] &&
          replay.evidence[family].byteIdentical &&
          rows.filter((row) => row.family === family).every((row) => row.replay_pass),
        inferencePass: familyStats[family].inferencePass,
        magnitudePass: familyStats[family].magnitudePass,
      },
    ]),
  ) as Record<V4FamilyId, V4FamilyFailureGates>;
  rows = annotateV4RawFailureReasons(rows, failureGates);
  assertV4RawMatrix(rows);
  const csv = buildV4RawCsv(rows);
  const rawDataSha256 = sha256Bytes(csv);
  const numericalSafety = runV4NumericalSafety();
  const performance = runV4PerformanceEnvelope();
  const performanceGate = evaluateV4PerformanceAcceptance(performance);
  const numericalSafetyAccepted = numericalSafety.gateMet;

  const manifest = (await Bun.file(resolve(ROOT, V4_RESULT_PATHS.manifest)).json()) as {
    families: Array<{ id: V4FamilyId; eligibleClaims: string[] }>;
    excludedFamilies: Array<{ id: string; reason: string }>;
    claimLaw: Record<string, boolean>;
  };
  const eligibleClaims = Object.fromEntries(
    manifest.families.map(({ id, eligibleClaims: values }) => [id, values]),
  ) as Record<V4FamilyId, string[]>;

  const familyReceipts = V4_FAMILY_ORDER.map((family) => {
    const stat = familyStats[family];
    const replayPass = replay.evidence[family].byteIdentical;
    const rawReplayPass = rows
      .filter((row) => row.family === family)
      .every((row) => row.replay_pass);
    const evidencePass = matched[family] && replayPass && rawReplayPass;
    const familyPass = stat.familyPass && evidencePass;
    const weakest = stat.summaries[stat.weakestIndex]!;
    const neuralController =
      family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor';
    const populationCostRequired = family === 'ordinary-organisms';
    const numericalSafetyRequired = true;
    const claimReleaseGatePass = v4FamilyClaimReleaseGate(
      family,
      familyPass,
      numericalSafetyAccepted,
      performanceGate.accepted,
    );
    return {
      id: family,
      label: familyLabels(family),
      controllerType: controllerType(family),
      neuralController,
      neuralCapacityEvaluated: false,
      seedCount: V4_EVALUATION_SEEDS.length,
      armCount: V4_FAMILY_FIXTURES[family].arms.length,
      rowCount: rows.filter((row) => row.family === family).length,
      fixtureSha256: fixtureSha256(family),
      matchedArmPass: matched[family],
      replay: replay.evidence[family],
      rawRowReplayPass: rawReplayPass,
      contrasts: stat.summaries.map((summary, index) => ({
        ...summary,
        magnitude: stat.magnitude[index]!,
        magnitudePass: stat.magnitude[index]!.pass,
        negativeSeedRows: stat.deltas[index]!.filter((delta) => delta < 0).length,
      })),
      inferencePass: stat.inferencePass,
      magnitudePass: stat.magnitudePass,
      statisticalFamilyPass: stat.familyPass,
      evidencePass,
      familyPass,
      claimReleaseGates: {
        numericalSafetyRequired,
        numericalSafetyPass: numericalSafetyAccepted,
        ordinaryPopulationCostRequired: populationCostRequired,
        ordinaryPopulationCostPass: performanceGate.accepted,
        pass: claimReleaseGatePass,
      },
      weakestForestContrast: {
        sourceOrderIndex: stat.weakestIndex,
        ...weakest,
      },
      eligibleClaims: eligibleClaims[family],
      authorizedClaims: familyPass && claimReleaseGatePass ? eligibleClaims[family] : [],
      withheldClaims: familyPass && claimReleaseGatePass ? [] : eligibleClaims[family],
    };
  });
  const familyById = Object.fromEntries(
    familyReceipts.map((family) => [family.id, family]),
  ) as Record<V4FamilyId, (typeof familyReceipts)[number]>;
  const claims = {
    ordinarySemanticTaskResponse:
      familyById['ordinary-organisms'].authorizedClaims.includes('semantic task response'),
    ordinaryRecurrentContextBenefit: familyById['ordinary-organisms'].authorizedClaims.includes(
      'recurrent context benefit',
    ),
    adaptiveNextCadencePressurePrediction: familyById[
      'simple-mnist-ecology-predictor'
    ].authorizedClaims.includes('adaptive next-cadence pressure prediction'),
    ecologicalSemanticSelectionCausality: familyById[
      'petri-digital-biologics'
    ].authorizedClaims.includes('ecological semantic-selection causality'),
    gamePolicySemanticCausality: familyById.titans.authorizedClaims.includes(
      'game-policy semantic causality',
    ),
    numericalSafetyGateMet: numericalSafetyAccepted,
    populationCostGateMet: performanceGate.accepted,
    neuralCapacityScaling: false,
    pooledCrossFamilyNeuralScaling: false,
    numericScoreUpliftAllowed: false,
    v4VersusV3UpliftAllowed: false,
    consciousnessUpliftAllowed: false,
    sentienceUpliftAllowed: false,
    generalIntelligenceClaimAllowed: false,
    physicalQuantumClaimAllowed: false,
    securityClaimAllowed: false,
  };

  const receiptBase = {
    schemaVersion: 1,
    resultVersion: V4_RESULT_SCHEMA_VERSION,
    protocolVersion: V4_PROTOCOL_VERSION,
    generatedDate: V4_RESULT_DATE,
    status: 'result-generated-awaiting-post-write-integrity-verification',
    verificationStatusAtGeneration: 'post-write-integrity-gate-required',
    publicationStatusAtGeneration: 'not-yet-publication-ready',
    indicatorOnly: true,
    claimBoundary:
      'Evaluates causal contrasts for bounded preregistered task behavior, semantic routing, recurrent context, online prediction, ecological selection, and game-policy behavior, plus replay, numerical safety, and machine-local ordinary-population cost. It does not establish phenomenal consciousness, sentience, general intelligence, physical quantum advantage, CSPRNG security, neural-capacity scaling, or pooled cross-family scaling.',
    provenance: provenance(runtimeCommit, rawDataSha256, authority, sourceSha256),
    protocol: {
      evaluationSeeds: [...V4_EVALUATION_SEEDS],
      seedCount: V4_EVALUATION_SEEDS.length,
      negativeRowsRetained: true,
      missingRowsAllowed: false,
      rawRowCount: rows.length,
      familyOrder: [...V4_FAMILY_ORDER],
      bootstrapSamples: V4_BOOTSTRAP_SAMPLES,
      signFlipSamples: V4_SIGN_FLIP_SAMPLES,
      alpha: V4_ALPHA,
      frozenAcceptance: V4_ACCEPTANCE,
    },
    surrogateCalibrations: v4SurrogateCalibrationReceipt(
      replay.first.ordinary.calibration,
      replay.first.titans.calibration,
    ),
    replay: replay.evidence,
    matchedArmEvidence: matched,
    families: familyReceipts,
    familyOutcomeCounts: {
      evaluated: familyReceipts.length,
      passed: familyReceipts.filter(({ familyPass }) => familyPass).length,
      failed: familyReceipts.filter(({ familyPass }) => !familyPass).length,
    },
    numericalSafety,
    performance: {
      measurement: performance,
      gates: performanceGate,
    },
    crossFamily: {
      status: 'not-evaluated',
      pooledPassAllowed: false,
      neuralCapacityRuleEvaluated: false,
      reason:
        'Frozen Phase A has no family with three live preregistered parameter tiers and forbids pooled cross-family inference.',
    },
    excludedFamilies: manifest.excludedFamilies,
    claims,
    claimOutcomeCounts: {
      authorizedEligibleClaims: familyReceipts.reduce(
        (count, family) => count + family.authorizedClaims.length,
        0,
      ),
      withheldEligibleClaims: familyReceipts.reduce(
        (count, family) => count + family.withheldClaims.length,
        0,
      ),
    },
    claimLaw: manifest.claimLaw,
    publication: {
      receipt: V4_RESULT_PATHS.receipt,
      rawCsv: V4_RESULT_PATHS.rawCsv,
      forestSvg: V4_RESULT_PATHS.forestSvg,
      forestRows: familyReceipts.map(({ id, weakestForestContrast }) => ({
        family: id,
        contrast: weakestForestContrast.contrast,
      })),
      generatedVisualByteStableForIdenticalInputs: true,
      failedGatesRemainVisible: true,
    },
    machine: {
      platform: process.platform,
      architecture: process.arch,
      osRelease: release(),
      bun: Bun.version,
      nodeCompatibility: process.version,
      logicalCpus: cpus().length,
      cpuModel: cpus()[0]?.model ?? 'unknown',
      totalMemoryBytes: totalmem(),
    },
  };
  const receiptContentSha256 = canonicalSha256(receiptBase);
  const receipt = { ...receiptBase, contentSha256: receiptContentSha256 };
  const forestRows: V4ForestRow[] = familyReceipts.map((family) => {
    const weakest = family.weakestForestContrast;
    return {
      family: family.id,
      label: family.label,
      controllerType: family.controllerType,
      neuralController: family.neuralController,
      contrast: weakest.contrast,
      meanDelta: weakest.meanDelta,
      lower95: weakest.bootstrap95[0],
      upper95: weakest.bootstrap95[1],
      holmSignFlipP: weakest.holmSignFlipP,
      inferencePass: weakest.inferencePass,
      familyPass: family.familyPass,
      claimAuthorized: family.authorizedClaims.length > 0,
    };
  });
  const forest = buildV4ForestSvg(forestRows, receiptContentSha256);
  await assertRuntimeEvidenceUnchanged(runtimeCommit, authority, sourceSha256);
  await Bun.write(resolve(ROOT, V4_RESULT_PATHS.rawCsv), csv);
  await Bun.write(resolve(ROOT, V4_RESULT_PATHS.receipt), `${JSON.stringify(receipt, null, 2)}\n`);
  await Bun.write(resolve(ROOT, V4_RESULT_PATHS.forestSvg), forest);
  return {
    receiptPath: V4_RESULT_PATHS.receipt,
    rawCsvPath: V4_RESULT_PATHS.rawCsv,
    forestSvgPath: V4_RESULT_PATHS.forestSvg,
    receiptContentSha256,
    rawDataSha256,
    claims,
  };
}

if (import.meta.main) {
  if (!process.argv.includes('--write')) {
    throw new Error(
      'Result generation is explicit: run with --write from a clean committed harness',
    );
  }
  console.log(JSON.stringify(await generateV4BenchmarkArtifacts(), null, 2));
}
