import { describe, expect, test } from 'bun:test';
import {
  annotateV4RawFailureReasons,
  assertV4RawMatrix,
  buildV4ForestSvg,
  buildV4RawCsv,
  evaluateV4PerformanceAcceptance,
  verifyV4FrozenAuthority,
  v4FamilyClaimReleaseGate,
  v4SurrogateCalibrationReceipt,
  type V4ForestRow,
  type V4RawResultRow,
} from '../scripts/organism-intelligence-v4-benchmark';
import { calibrateOrdinaryV4Surrogate } from '../scripts/organism-intelligence-v4/ordinary';
import {
  V4_PERFORMANCE_CONFIG,
  V4_PERFORMANCE_POINT_ORDERS,
  type V4PerformanceEnvelope,
} from '../scripts/organism-intelligence-v4/performance';
import { calibrateTitanV4Surrogate } from '../scripts/organism-intelligence-v4/titans';
import {
  fixtureSha256,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  V4_FAMILY_ORDER,
} from '../scripts/organism-intelligence-v4-protocol';

const SHA = 'a'.repeat(64);

function rawRow(overrides: Partial<V4RawResultRow> = {}): V4RawResultRow {
  return {
    schema_version: 1,
    protocol_version: 'organism-intelligence-v4-phase-a-semantic-cross-family',
    family: 'ordinary-organisms',
    controller_type: 'neural',
    neural_controller: true,
    neural_capacity_evaluated: false,
    evidence_tier: 'live-action',
    seed: 1,
    task: 'dropout-goal-aligned-action-score',
    arm: 'full-semantic-recurrent',
    live_capacity_tier: 'single-entity-fp32-70-parameter-controller',
    live_parameter_count: 70,
    designed_parameter_count: 70,
    parameter_count_semantics: 'trainable-controller-parameters',
    primary_outcome: 0.5,
    primary_mean_brier: null,
    fixture_sha256: SHA,
    initial_state_sha256: SHA,
    percept_sha256: SHA,
    task_schedule_sha256: SHA,
    environment_rng_evidence_kind: 'exact-empty-environment-tape',
    environment_rng_evidence_sha256: SHA,
    environment_rng_tape_sha256: SHA,
    environment_rng_draw_count: 0,
    surrogate_rng_tape_sha256: null,
    surrogate_rng_draw_count: 0,
    calibration_sha256: null,
    intervention_sha256: SHA,
    replay_fingerprint: SHA,
    replay_pass: true,
    latency_ms: null,
    latency_status: 'not-measured-per-row',
    memory_bytes: 17,
    memory_scope: 'incremental-semantic-context-only',
    failure_reason: null,
    secondary_json: '{"note":"comma, quote \\" retained"}',
    ...overrides,
  };
}

const FOREST_ROWS: V4ForestRow[] = [
  {
    family: 'ordinary-organisms',
    label: 'Ordinary organisms',
    controllerType: 'neural',
    neuralController: true,
    contrast: 'full minus recurrence-disabled',
    meanDelta: 0.01,
    lower95: 0.005,
    upper95: 0.02,
    holmSignFlipP: 0.001,
    inferencePass: true,
    familyPass: false,
    claimAuthorized: false,
  },
  {
    family: 'simple-mnist-ecology-predictor',
    label: 'Ecology predictor',
    controllerType: 'neural',
    neuralController: true,
    contrast: 'adaptive minus shuffled',
    meanDelta: -0.02,
    lower95: -0.03,
    upper95: -0.01,
    holmSignFlipP: 1,
    inferencePass: false,
    familyPass: false,
    claimAuthorized: false,
  },
  {
    family: 'petri-digital-biologics',
    label: 'Petri biologics',
    controllerType: 'ecological',
    neuralController: false,
    contrast: 'full minus cyclic',
    meanDelta: 0.01,
    lower95: 0.008,
    upper95: 0.012,
    holmSignFlipP: 0.001,
    inferencePass: true,
    familyPass: false,
    claimAuthorized: false,
  },
  {
    family: 'titans',
    label: 'Titans',
    controllerType: 'game-policy',
    neuralController: false,
    contrast: 'full minus surrogate',
    meanDelta: 0.1,
    lower95: 0.08,
    upper95: 0.12,
    holmSignFlipP: 0.001,
    inferencePass: true,
    familyPass: true,
    claimAuthorized: true,
  },
];

function canonicalRawMatrix(): V4RawResultRow[] {
  const rows: V4RawResultRow[] = [];
  for (const family of V4_FAMILY_ORDER) {
    const controller =
      family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor'
        ? 'neural'
        : family === 'petri-digital-biologics'
          ? 'ecological'
          : 'game-policy';
    for (const seed of V4_EVALUATION_SEEDS) {
      for (const arm of V4_FAMILY_FIXTURES[family].arms) {
        const predictor = family === 'simple-mnist-ecology-predictor';
        const surrogate =
          arm === 'action-distribution-matched-surrogate' ||
          arm === 'action-rate-matched-policy-surrogate';
        rows.push(
          rawRow({
            family,
            controller_type: controller,
            neural_controller:
              family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor',
            neural_capacity_evaluated: false,
            evidence_tier:
              family === 'ordinary-organisms'
                ? 'live-action'
                : family === 'simple-mnist-ecology-predictor'
                  ? 'shared-cadence-online-prediction'
                  : family === 'petri-digital-biologics'
                    ? 'live-differential-selection'
                    : 'live-diplomacy-payoff-world-state',
            seed,
            task: V4_FAMILY_FIXTURES[family].primaryOutcome.id,
            arm,
            live_capacity_tier:
              family === 'ordinary-organisms'
                ? 'single-entity-fp32-70-parameter-controller'
                : family === 'simple-mnist-ecology-predictor'
                  ? 'single-4-4-1-fp64-online-predictor'
                  : family === 'petri-digital-biologics'
                    ? 'two-specialist-64-slot-petri-dish'
                    : 'two-titan-five-strategy-policy',
            live_parameter_count:
              family === 'ordinary-organisms'
                ? 70
                : family === 'simple-mnist-ecology-predictor'
                  ? 25
                  : family === 'petri-digital-biologics'
                    ? 6
                    : 5,
            designed_parameter_count:
              family === 'ordinary-organisms'
                ? 70
                : family === 'simple-mnist-ecology-predictor'
                  ? 25
                  : family === 'petri-digital-biologics'
                    ? 6
                    : 5,
            parameter_count_semantics:
              family === 'ordinary-organisms' || family === 'simple-mnist-ecology-predictor'
                ? 'trainable-controller-parameters'
                : family === 'petri-digital-biologics'
                  ? 'active-ad-fitness-weight-slots'
                  : 'available-discrete-policy-strategies',
            fixture_sha256: fixtureSha256(family),
            primary_mean_brier: predictor ? 0.5 : null,
            environment_rng_evidence_kind: predictor
              ? 'transformed-initial-parameter-outputs'
              : 'exact-recorded-mulberry32-tape',
            environment_rng_tape_sha256: predictor ? null : SHA,
            environment_rng_draw_count: predictor ? 20 : 0,
            surrogate_rng_tape_sha256: surrogate ? SHA : null,
            surrogate_rng_draw_count: surrogate ? 1 : 0,
            calibration_sha256: surrogate ? SHA : null,
            intervention_sha256: family === 'titans' ? null : SHA,
            memory_bytes: family === 'ordinary-organisms' ? 17 : predictor ? 25 * 8 : null,
            memory_scope:
              family === 'ordinary-organisms'
                ? 'incremental-semantic-context-only'
                : predictor
                  ? 'trainable-parameter-payload-only'
                  : 'not-byte-accounted-js-object-state',
            secondary_json: predictor
              ? JSON.stringify({
                  postReversalScored: {
                    firstLabelCadence: 145,
                    lastLabelCadence: 239,
                    count: 95,
                    meanBrier: 0.5,
                  },
                })
              : '{}',
          }),
        );
      }
    }
  }
  return rows;
}

function acceptedPerformanceFixture(): V4PerformanceEnvelope {
  const batchValues = Array.from({ length: 18 }, () => 1);
  const points = V4_PERFORMANCE_CONFIG.points.map((population) => ({
    population,
    legacyBatchMediansMs: batchValues,
    enhancedBatchMediansMs: batchValues,
    incrementalBatchMediansMs: batchValues,
    legacyMedianMs: 1,
    enhancedMedianMs: 1,
    incrementalMedianMs: 1,
    semanticStorageBytesPerEntity: 17,
    executionSha256: SHA,
  }));
  return {
    schemaVersion: 'organism-intelligence-v4-performance-envelope-v1',
    kind: 'three-fresh-process-envelope',
    repeatProcesses: 3,
    freshProcesses: true,
    config: V4_PERFORMANCE_CONFIG,
    branchStateIsolated: true,
    orderCounterbalanced: true,
    pointOrderCounterbalanced: true,
    processMeasurementPointOrders: V4_PERFORMANCE_POINT_ORDERS,
    semanticStorageBytesPerEntity: 17,
    frozenSemanticStorageBytesPerEntity: 17,
    semanticStorageMatchesFrozenExact: true,
    enhancedRuntimeLogLogSlope: 1,
    processEnhancedRuntimeLogLogSlopes: [2, 1, 1],
    points,
    fiftyThousand: {
      population: 50_000,
      incrementalMedianMs: 1,
      everyIncrementalBatchMedianMs: batchValues,
      processIncrementalMediansMs: [1, 1, 1],
    },
    processRuns: Array.from({ length: 3 }, () => ({ mode: 'full', points })) as never,
  };
}

describe('V4 benchmark artifact builders', () => {
  test('emits deterministic RFC-style CSV with nulls and embedded punctuation preserved', () => {
    const rows = [rawRow(), rawRow({ seed: 2, primary_outcome: 0.25 })];
    const first = buildV4RawCsv(rows);
    expect(buildV4RawCsv(rows)).toBe(first);
    expect(first.split('\n')).toHaveLength(4);
    expect(first).toContain('secondary_json');
    expect(first).toContain('"{""note""');
    expect(first).not.toContain('null');
  });

  test('renders one accessible deterministic forest row per family with receipt binding', () => {
    const first = buildV4ForestSvg(FOREST_ROWS, SHA);
    expect(buildV4ForestSvg(FOREST_ROWS, SHA)).toBe(first);
    expect(first).toContain('role="img"');
    expect(first).toContain('<title id="v4-forest-title">');
    expect(first).toContain(`receipt ${SHA}`);
    expect(first).toContain('&quot;pooledCrossFamilyClaim&quot;:false');
    expect(first.match(/<circle /g)).toHaveLength(4);
    expect(first).toContain('#ef4444');
    expect(first).toContain('#94a3b8');
    expect(first).toMatch(/Petri biologics[\s\S]{0,600}stroke="#ef4444"/);
    expect(first).toMatch(/Titans[\s\S]{0,600}stroke="#94a3b8"/);
  });

  test('fails closed on incomplete forests, malformed SHA values, and empty CSV input', () => {
    expect(() => buildV4ForestSvg(FOREST_ROWS.slice(0, 3), SHA)).toThrow();
    expect(() => buildV4ForestSvg(FOREST_ROWS, 'not-a-sha')).toThrow();
    expect(() =>
      buildV4ForestSvg([FOREST_ROWS[1]!, FOREST_ROWS[0]!, FOREST_ROWS[2]!, FOREST_ROWS[3]!], SHA),
    ).toThrow('canonical order');
    expect(() =>
      buildV4ForestSvg(
        FOREST_ROWS.map((row, index) => (index === 0 ? { ...row, lower95: Number.NaN } : row)),
        SHA,
      ),
    ).toThrow('malformed');
    expect(() =>
      buildV4ForestSvg(
        FOREST_ROWS.map((row, index) => (index === 0 ? { ...row, inferencePass: false } : row)),
        SHA,
      ),
    ).toThrow('malformed');
    expect(() => buildV4RawCsv([])).toThrow();
  });

  test('seals the complete 1,152-row matrix while retaining replay failures', () => {
    const rows = canonicalRawMatrix();
    expect(rows).toHaveLength(1152);
    expect(() => assertV4RawMatrix(rows)).not.toThrow();
    rows[0] = {
      ...rows[0]!,
      replay_pass: false,
      failure_reason: 'byte-replay-mismatch',
    };
    expect(() => assertV4RawMatrix(rows)).not.toThrow();
    expect(buildV4RawCsv(rows)).toContain(',false,');

    const wrongArm = [...rows];
    wrongArm[1] = { ...wrongArm[1]!, arm: wrongArm[0]!.arm };
    expect(() => assertV4RawMatrix(wrongArm)).toThrow('canonical row 1');
    const wrongBrier = [...rows];
    const predictorIndex =
      V4_EVALUATION_SEEDS.length * V4_FAMILY_FIXTURES['ordinary-organisms'].arms.length;
    wrongBrier[predictorIndex] = { ...wrongBrier[predictorIndex]!, primary_mean_brier: 0.25 };
    expect(() => assertV4RawMatrix(wrongBrier)).toThrow('Brier denominator');
  });

  test('annotates failure-forward rows with replay, evidence, inference, and magnitude precedence', () => {
    const gates = {
      'ordinary-organisms': {
        evidencePass: true,
        inferencePass: true,
        magnitudePass: false,
      },
      'simple-mnist-ecology-predictor': {
        evidencePass: true,
        inferencePass: false,
        magnitudePass: false,
      },
      'petri-digital-biologics': {
        evidencePass: false,
        inferencePass: true,
        magnitudePass: true,
      },
      titans: {
        evidencePass: true,
        inferencePass: true,
        magnitudePass: true,
      },
    } as const;
    const rows = [
      rawRow(),
      rawRow({
        family: 'simple-mnist-ecology-predictor',
        replay_pass: false,
      }),
      rawRow({ family: 'petri-digital-biologics' }),
      rawRow({ family: 'titans' }),
      rawRow({ family: 'simple-mnist-ecology-predictor' }),
    ];
    expect(annotateV4RawFailureReasons(rows, gates).map((row) => row.failure_reason)).toEqual([
      'family-magnitude-gate-failed',
      'byte-replay-mismatch',
      'family-evidence-gate-failed',
      null,
      'family-inference-and-magnitude-gates-failed',
    ]);
  });

  test('publishes compact replay-bound surrogate calibration provenance', () => {
    const ordinaryCalibration = calibrateOrdinaryV4Surrogate();
    const titanCalibration = calibrateTitanV4Surrogate();
    const receipt = v4SurrogateCalibrationReceipt(ordinaryCalibration, titanCalibration);
    const ordinary = receipt.ordinaryActionDistribution;
    expect(ordinary.actionVectorCount).toBe(16 * 480);
    expect(ordinary.nonZeroActionVectorCount + ordinary.zeroActionVectorCount).toBe(
      ordinary.actionVectorCount,
    );
    expect(ordinary.actionFrequency).toBe(
      ordinary.nonZeroActionVectorCount / ordinary.actionVectorCount,
    );
    expect(ordinary.nonZeroMagnitudeSummary.minimum).toBeLessThanOrEqual(
      ordinary.nonZeroMagnitudeSummary.median,
    );
    expect(ordinary.nonZeroMagnitudeSummary.median).toBeLessThanOrEqual(
      ordinary.nonZeroMagnitudeSummary.maximum,
    );
    expect(receipt.titanPooledPolicy.sourceMoveCount).toBe(16 * 2 * 15 * 2);
    expect(receipt.titanPooledPolicy.cooperationRate).toBe(0.2125);
    expect(receipt.titanPooledPolicy.sourceMoveOrder).toBe(
      'calibration-seed -> frozen-regime -> round -> titan-index',
    );
    expect(() =>
      v4SurrogateCalibrationReceipt(
        { ...ordinaryCalibration, calibrationSha256: 'malformed' },
        titanCalibration,
      ),
    ).toThrow('calibration evidence');
    expect(() =>
      v4SurrogateCalibrationReceipt(
        { ...ordinaryCalibration, sourceSeeds: [...ordinaryCalibration.sourceSeeds].reverse() },
        titanCalibration,
      ),
    ).toThrow('calibration evidence');
    expect(() =>
      v4SurrogateCalibrationReceipt(ordinaryCalibration, {
        ...titanCalibration,
        sourceMoveCount: titanCalibration.sourceMoveCount - 1,
      }),
    ).toThrow('calibration evidence');
  });

  test('does not let empty performance evidence pass by vacuous truth', () => {
    const empty = {
      config: { batches: 6 },
      points: [],
      processEnhancedRuntimeLogLogSlopes: [],
      enhancedRuntimeLogLogSlope: 0,
      fiftyThousand: {
        incrementalMedianMs: 0,
        everyIncrementalBatchMedianMs: [],
        processIncrementalMediansMs: [],
      },
      semanticStorageMatchesFrozenExact: true,
      semanticStorageBytesPerEntity: 17,
      repeatProcesses: 3,
      processRuns: [],
      freshProcesses: true,
      branchStateIsolated: true,
      orderCounterbalanced: true,
    } as unknown as V4PerformanceEnvelope;
    const result = evaluateV4PerformanceAcceptance(empty);
    expect(result.slopeSeriesValid).toBe(false);
    expect(result.batchSeriesValid).toBe(false);
    expect(result.structurePass).toBe(false);
    expect(result.accepted).toBe(false);
  });

  test('uses the singular aggregate slope gate and scopes population cost to ordinary claims', () => {
    const performance = evaluateV4PerformanceAcceptance(acceptedPerformanceFixture());
    expect(performance.everyProcessSlopeWithinBudget).toBe(false);
    expect(performance.slopePass).toBe(true);
    expect(performance.accepted).toBe(true);
    expect(v4FamilyClaimReleaseGate('ordinary-organisms', true, true, false)).toBe(false);
    expect(v4FamilyClaimReleaseGate('titans', true, true, false)).toBe(true);
    expect(v4FamilyClaimReleaseGate('titans', true, false, true)).toBe(false);
    expect(v4FamilyClaimReleaseGate('titans', false, true, true)).toBe(false);
  });

  test('verifies the canonical protocol and every manifest-pinned dependency live', async () => {
    const authority = await verifyV4FrozenAuthority();
    expect(authority.protocolSha256).toBe(
      '120318627c437ac08b1c752015b586b306d68bbc843c676948c3c7eec5721541',
    );
    expect(authority.pinnedDependencies).toHaveLength(1);
    expect(authority.pinnedDependencies[0]).toMatchObject({
      path: 'src/math/rng.ts',
      sha256: '87c880ed2b7f1e97c37f0c04cbdeb2d9e74a555a7fce22200ceaa756b7b6bcb0',
      verified: true,
    });
  });
});
