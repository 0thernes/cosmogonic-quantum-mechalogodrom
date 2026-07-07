import { describe, expect, test } from 'bun:test';
import { FRAMEWORK_COUNT } from '../src/sim/consciousness-kernel';
import { CONSCIOUSNESS_ENTITY_KINDS } from '../src/sim/consciousness-adapters';
import { generateSentienceLabData, sentienceSeedBatch } from '../src/sim/sentience-lab';

describe('sentience-lab: seed batch', () => {
  test('seed batches are deterministic and unique enough for sweep reporting', () => {
    const a = sentienceSeedBatch(0xabc, 12);
    const b = sentienceSeedBatch(0xabc, 12);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('sentience-lab: headless analytics feed', () => {
  test('feed is deterministic and keeps the honesty boundary at the top level', () => {
    const a = generateSentienceLabData(0x20260704, 8);
    const b = generateSentienceLabData(0x20260704, 8);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.version).toBe('sentience-lab-v1');
    expect(a.generatedAt).toBe('2026-07-07T00:00:00.000Z');
    expect(a.claim).toBe('indicatorOnly');
    expect(a.proofBoundary).toContain('not proof of phenomenal sentience');
    expect(a.sourceDocs).toContain('docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md');
    expect(a.sourceDocs).toContain('docs/VERIFICATION-ANALYTICAL-DATA.md');
  });

  test('sweep statistics are bounded and report real structured-vs-null separation', () => {
    const data = generateSentienceLabData(0x20260704, 8);
    expect(data.sweep.runs).toBe(8);
    expect(data.runSummaries.length).toBe(8);
    for (const value of [
      data.sweep.singularityRate,
      data.sweep.ablationRate,
      data.sweep.emergenceRate,
      data.sweep.meanStructuredIndex,
      data.sweep.meanNullIndex,
      data.sweep.meanNullGap,
      data.sweep.meanConvergenceGap,
      data.sweep.meanRewardGap,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(data.sweep.meanConvergenceGap).toBeGreaterThan(0);
    expect(data.sweep.meanRewardGap).toBeGreaterThan(0);
    expect(data.sweep.emergenceRate).toBeGreaterThan(0.8);
  });

  test('framework aggregates cover the full ten-framework stack', () => {
    const data = generateSentienceLabData(0x20260704, 8);
    expect(data.frameworkAggregates.length).toBe(FRAMEWORK_COUNT);
    for (const f of data.frameworkAggregates) {
      expect(f.meanAblationLoss).toBeGreaterThanOrEqual(0);
      expect(f.meanAblationLoss).toBeLessThanOrEqual(1);
      expect(f.meanNullSeparation).toBeGreaterThanOrEqual(0);
      expect(f.meanNullSeparation).toBeLessThanOrEqual(1);
      expect(f.loadBearingRate).toBeGreaterThanOrEqual(0);
      expect(f.loadBearingRate).toBeLessThanOrEqual(1);
    }
  });

  test('entity traces cover every promised entity class without invoking the visual dome', () => {
    const data = generateSentienceLabData(0x20260704, 8);
    expect(data.entityTelemetry.length).toBe(CONSCIOUSNESS_ENTITY_KINDS.length);
    expect(new Set(data.entityTelemetry.map((e) => e.kind))).toEqual(
      new Set(CONSCIOUSNESS_ENTITY_KINDS),
    );
    for (const entity of data.entityTelemetry) {
      expect(entity.trace.length).toBeGreaterThan(10);
      expect(entity.meanIndex).toBeGreaterThanOrEqual(0);
      expect(entity.meanIndex).toBeLessThanOrEqual(1);
      expect(entity.peakIndex).toBeGreaterThanOrEqual(entity.meanIndex);
      expect(entity.activeFrameworks).toBeGreaterThan(0);
    }
    expect(data.entityFrameworkEdges.length).toBeGreaterThan(data.entityTelemetry.length);
  });
});
