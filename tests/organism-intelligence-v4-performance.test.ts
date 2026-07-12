import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import { V4_ACCEPTANCE } from '../scripts/organism-intelligence-v4-protocol';
import {
  V4_PERFORMANCE_CONFIG,
  V4_PERFORMANCE_DIAGNOSTIC_CONFIG,
  V4_PERFORMANCE_POINT_ORDERS,
  V4_PERFORMANCE_PROCESS_COUNT,
  V4_PERFORMANCE_SCHEMA_VERSION,
  V4_PERFORMANCE_WORKER_TIMEOUT_MS,
  assertV4PerformanceWorkerResult,
  runV4PerformanceEnvelope,
  spawnV4PerformanceWorker,
  v4LogLogLeastSquaresSlope,
  v4PairedIncrementalBatchMedian,
  v4PerformanceMedian,
} from '../scripts/organism-intelligence-v4/performance';

describe('organism-intelligence V4 performance harness', () => {
  test('freezes the declared full schema before measurement', () => {
    expect(V4_PERFORMANCE_SCHEMA_VERSION).toBe('organism-intelligence-v4-performance-envelope-v1');
    expect(V4_PERFORMANCE_CONFIG.points).toEqual([1_000, 5_000, 10_000, 50_000]);
    expect(V4_PERFORMANCE_CONFIG.points).toEqual([...V4_ACCEPTANCE.populationCostRule.points]);
    expect(V4_PERFORMANCE_CONFIG.warmupCallsPerBranch).toBeGreaterThan(0);
    expect(V4_PERFORMANCE_CONFIG.batches).toBeGreaterThan(1);
    expect(V4_PERFORMANCE_CONFIG.samplesPerBranchPerBatch % 2).toBe(0);
    expect(V4_PERFORMANCE_CONFIG.timedIterationsPerSample).toBe(1);
    expect(V4_PERFORMANCE_CONFIG.orderLaw).toContain('legacy-first on even');
    expect(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.points.at(-1)).toBeLessThan(50_000);
    expect(V4_PERFORMANCE_CONFIG.warmupCallsPerBranch % 2).toBe(0);
    expect(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.warmupCallsPerBranch % 2).toBe(0);
    expect(V4_PERFORMANCE_POINT_ORDERS).toHaveLength(V4_PERFORMANCE_PROCESS_COUNT);
    for (const population of V4_PERFORMANCE_CONFIG.points) {
      expect(
        new Set(
          V4_PERFORMANCE_POINT_ORDERS.map((order) => {
            const numericOrder: readonly number[] = order;
            return numericOrder.indexOf(population);
          }),
        ).size,
      ).toBe(V4_PERFORMANCE_PROCESS_COUNT);
    }
    expect(V4_PERFORMANCE_WORKER_TIMEOUT_MS).toBeGreaterThan(0);
  });

  test('computes medians and log-log least-squares slopes exactly', () => {
    expect(v4PerformanceMedian([3, 1, 2])).toBe(2);
    expect(v4PerformanceMedian([4, 1, 3, 2])).toBe(2.5);
    expect(v4LogLogLeastSquaresSlope([1, 10, 100], [2, 20, 200])).toBeCloseTo(1, 12);
    expect(v4LogLogLeastSquaresSlope([1, 10, 100], [3, 300, 30_000])).toBeCloseTo(2, 12);
    expect(() => v4PerformanceMedian([])).toThrow();
    expect(() => v4LogLogLeastSquaresSlope([1, 1], [1, 2])).toThrow();
    expect(() => v4LogLogLeastSquaresSlope([1, 2], [1, 0])).toThrow();
  });

  test('uses the median of paired deltas rather than a false-passing marginal-median difference', () => {
    const legacy = [1, 2, 101, 102];
    const enhanced = [5, 6, 105, 2];
    expect(enhanced.map((value, index) => value - legacy[index]!)).toEqual([4, 4, 4, -100]);
    expect(v4PairedIncrementalBatchMedian(legacy, enhanced)).toBe(4);
    expect(v4PerformanceMedian(enhanced) - v4PerformanceMedian(legacy)).toBe(-46);
    expect(() => v4PairedIncrementalBatchMedian([1], [])).toThrow();
  });

  test('reads exact recurrent semantic storage from the live EntityBrainField API', () => {
    const population = 37;
    const field = new EntityBrainField(population, mulberry32(0x17));
    expect(field.semanticStorageBytes()).toBe(population * 17);
    expect(field.semanticStorageBytes() / population).toBe(
      V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity,
    );
  });

  test(
    'runs a small fresh-process diagnostic worker with isolated, counterbalanced branches',
    () => {
      const result = spawnV4PerformanceWorker('diagnostic');
      expect(() => assertV4PerformanceWorkerResult(result, 'diagnostic')).not.toThrow();
      expect(result.mode).toBe('diagnostic');
      expect(result.processOrdinal).toBe(0);
      expect(result.measurementPointOrder).toEqual(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.points);
      expect(result.points.map((point) => point.population)).toEqual([
        ...V4_PERFORMANCE_DIAGNOSTIC_CONFIG.points,
      ]);
      expect(result.branchStateIsolated).toBe(true);
      expect(result.orderCounterbalanced).toBe(true);
      expect(result.semanticStorageBytesPerEntity).toBe(17);
      expect(result.semanticStorageMatchesFrozenExact).toBe(true);
      expect(Number.isFinite(result.enhancedRuntimeLogLogSlope)).toBe(true);
      for (const point of result.points) {
        expect(point.legacyFirstSamples).toBe(point.enhancedFirstSamples);
        expect(point.legacyBatchMediansMs).toHaveLength(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.batches);
        expect(point.enhancedBatchMediansMs).toHaveLength(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.batches);
        expect(point.matchedSamplesByBatch).toHaveLength(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.batches);
        expect(point.incrementalBatchMediansMs).toHaveLength(
          V4_PERFORMANCE_DIAGNOSTIC_CONFIG.batches,
        );
        expect(point.semanticStorageBytesTotal).toBe(point.population * 17);
        expect(point.executionSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(point.clockFloorAppliedSamples).toBeLessThanOrEqual(point.samplesPerBranch * 2);
        expect(point.legacyBatchMediansMs.every((value) => value > 0)).toBe(true);
        expect(point.enhancedBatchMediansMs.every((value) => value > 0)).toBe(true);
        point.matchedSamplesByBatch.forEach((samples, batchIndex) => {
          expect(samples).toHaveLength(V4_PERFORMANCE_DIAGNOSTIC_CONFIG.samplesPerBranchPerBatch);
          samples.forEach((sample) => {
            expect(sample.incrementalMs).toBe(sample.enhancedMs - sample.legacyMs);
            expect(sample.order).toBe(
              (sample.ordinal & 1) === 0 ? 'legacy-first' : 'enhanced-first',
            );
          });
          expect(point.incrementalBatchMediansMs[batchIndex]).toBe(
            v4PairedIncrementalBatchMedian(
              samples.map((sample) => sample.legacyMs),
              samples.map((sample) => sample.enhancedMs),
            ),
          );
        });
      }

      const firstPoint = result.points[0]!;
      const firstBatch = firstPoint.matchedSamplesByBatch[0]!;
      const firstSample = firstBatch[0]!;
      const pairedTamper = {
        ...result,
        points: [
          {
            ...firstPoint,
            matchedSamplesByBatch: [
              [
                { ...firstSample, incrementalMs: firstSample.incrementalMs + 1 },
                ...firstBatch.slice(1),
              ],
              ...firstPoint.matchedSamplesByBatch.slice(1),
            ],
          },
          ...result.points.slice(1),
        ],
      };
      expect(() => assertV4PerformanceWorkerResult(pairedTamper, 'diagnostic')).toThrow(
        'invalid paired evidence',
      );

      const floorTamper = {
        ...result,
        points: [
          { ...firstPoint, clockFloorAppliedSamples: firstPoint.samplesPerBranch * 2 + 1 },
          ...result.points.slice(1),
        ],
      };
      expect(() => assertV4PerformanceWorkerResult(floorTamper, 'diagnostic')).toThrow(
        'failed its schema',
      );
    },
    // Schema/assertion path is light cold; under full-suite coverage still give headroom.
    { timeout: 45_000 },
  );

  test(
    'runs the full three-process envelope with point-order counterbalancing and stable structure',
    () => {
      const result = runV4PerformanceEnvelope();
      expect(result.repeatProcesses).toBe(V4_PERFORMANCE_PROCESS_COUNT);
      expect(result.freshProcesses).toBe(true);
      expect(result.branchStateIsolated).toBe(true);
      expect(result.orderCounterbalanced).toBe(true);
      expect(result.pointOrderCounterbalanced).toBe(true);
      expect(result.processMeasurementPointOrders.map((order) => [...order])).toEqual(
        V4_PERFORMANCE_POINT_ORDERS.map((order) => [...order]),
      );
      expect(result.processRuns).toHaveLength(V4_PERFORMANCE_PROCESS_COUNT);
      result.processRuns.forEach((run, processOrdinal) => {
        expect(() => assertV4PerformanceWorkerResult(run, 'full')).not.toThrow();
        expect(Number(run.processOrdinal)).toBe(processOrdinal);
        expect([...run.measurementPointOrder]).toEqual([
          ...V4_PERFORMANCE_POINT_ORDERS[processOrdinal]!,
        ]);
        expect(run.points.map((point) => point.population)).toEqual([
          ...V4_PERFORMANCE_CONFIG.points,
        ]);
      });
      expect(result.points.map((point) => point.population)).toEqual([
        ...V4_PERFORMANCE_CONFIG.points,
      ]);
      for (const [pointIndex, point] of result.points.entries()) {
        expect(point.legacyBatchMediansMs).toHaveLength(
          V4_PERFORMANCE_CONFIG.batches * V4_PERFORMANCE_PROCESS_COUNT,
        );
        expect(point.enhancedBatchMediansMs).toHaveLength(
          V4_PERFORMANCE_CONFIG.batches * V4_PERFORMANCE_PROCESS_COUNT,
        );
        expect(point.incrementalBatchMediansMs).toHaveLength(
          V4_PERFORMANCE_CONFIG.batches * V4_PERFORMANCE_PROCESS_COUNT,
        );
        expect(point.executionSha256).toMatch(/^[0-9a-f]{64}$/);
        expect(
          result.processRuns.every(
            (run) => run.points[pointIndex]!.executionSha256 === point.executionSha256,
          ),
        ).toBe(true);
      }
      expect(result.fiftyThousand.everyIncrementalBatchMedianMs).toHaveLength(
        V4_PERFORMANCE_CONFIG.batches * V4_PERFORMANCE_PROCESS_COUNT,
      );
      expect(Number.isFinite(result.enhancedRuntimeLogLogSlope)).toBe(true);
      expect(Number.isFinite(result.fiftyThousand.incrementalMedianMs)).toBe(true);
    },
    { timeout: 60_000 },
  );

  test('rejects a tampered worker schema without relying on timing thresholds', () => {
    expect(() =>
      assertV4PerformanceWorkerResult({
        schemaVersion: V4_PERFORMANCE_SCHEMA_VERSION,
        kind: 'isolated-process-worker',
        mode: 'diagnostic',
        branchStateIsolated: true,
        orderCounterbalanced: false,
      }),
    ).toThrow();
  });
});
