/**
 * STAGE 1+ — perf HUD readout helpers (pure) + headless-safety.
 */
import { describe, expect, test } from 'bun:test';
import {
  qualityLabel,
  fpsBucket,
  mountPerfHud,
  formatTimingLine,
  formatPopulationLine,
  formatWorkerLine,
  EMPTY_WORLD,
} from '../src/ui/perf-hud';
import { Level } from '../src/core/frame-governor';

describe('perf HUD — pure readout helpers', () => {
  test('qualityLabel stays locked to full for every governor level', () => {
    expect(qualityLabel(Level.FULL)).toBe('full');
    expect(qualityLabel(Level.DPR_85)).toBe('full');
    expect(qualityLabel(Level.DPR_65)).toBe('full');
    expect(qualityLabel(Level.FX_OFF)).toBe('full');
    expect(qualityLabel(Level.SHADOWS_OFF)).toBe('full');
  });

  test('fpsBucket buckets by health (good >= 50, ok >= 25, else bad)', () => {
    expect(fpsBucket(60)).toBe('good');
    expect(fpsBucket(50)).toBe('good');
    expect(fpsBucket(49)).toBe('ok');
    expect(fpsBucket(25)).toBe('ok');
    expect(fpsBucket(24)).toBe('bad');
    expect(fpsBucket(5)).toBe('bad');
  });

  test('formatTimingLine includes ms, optional p95, optional heap', () => {
    expect(formatTimingLine(16.4, 0, 0)).toBe('16 ms');
    expect(formatTimingLine(16.4, 22.1, 412.5)).toBe('16 ms · p95 22 ms · 413 MB');
  });

  test('formatPopulationLine shows entity budget, links, and wilderness chunks', () => {
    expect(
      formatPopulationLine({
        ...EMPTY_WORLD,
        entities: 10000,
        maxEntities: 50000,
        connectomeLinks: 40120,
        wildernessEntities: 640,
        wildernessChunks: 12,
      }),
    ).toBe('n 10,000/50,000 · links 40,120 · wild 640 (12 ch)');
  });

  test('formatWorkerLine shows cores and worker pool state', () => {
    expect(
      formatWorkerLine({ ...EMPTY_WORLD, hardwareCores: 16, workersReady: false, workerTotal: 0 }),
    ).toBe('cpu 16c · workers off');
    expect(
      formatWorkerLine({
        ...EMPTY_WORLD,
        hardwareCores: 16,
        workersReady: true,
        workerTotal: 16,
        workerActive: 2,
      }),
    ).toBe('cpu 16c · workers 16 (2 act)');
  });

  test('mountPerfHud is headless-safe — no DOM yields a no-op updater that never throws', () => {
    const hud = mountPerfHud('mega');
    expect(() =>
      hud.update({
        fps: 60,
        level: Level.FULL,
        frameMs: 16,
        p95Ms: 20,
        heapMb: 400,
        tier: 'mega',
        world: EMPTY_WORLD,
      }),
    ).not.toThrow();
  });
});
