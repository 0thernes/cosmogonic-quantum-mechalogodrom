/**
 * STAGE 1 — perf HUD readout helpers (pure) + headless-safety.
 *
 * The chip itself is render-layer DOM (driven from main.ts's rAF loop), but its decision helpers are
 * pure and unit-testable, and the mount must be headless-safe (no-op without a DOM) so importing it
 * under `bun test` never throws.
 */
import { describe, expect, test } from 'bun:test';
import { qualityLabel, fpsBucket, mountPerfHud } from '../src/ui/perf-hud';
import { Level } from '../src/core/frame-governor';

describe('perf HUD — pure readout helpers', () => {
  test('qualityLabel maps every governor level', () => {
    expect(qualityLabel(Level.FULL)).toBe('full');
    expect(qualityLabel(Level.DPR_85)).toBe('dpr 85%');
    expect(qualityLabel(Level.DPR_65)).toBe('dpr 65%');
    expect(qualityLabel(Level.FX_OFF)).toBe('fx off');
    expect(qualityLabel(Level.SHADOWS_OFF)).toBe('shadows off');
  });

  test('fpsBucket buckets by health (good >= 50, ok >= 25, else bad)', () => {
    expect(fpsBucket(60)).toBe('good');
    expect(fpsBucket(50)).toBe('good');
    expect(fpsBucket(49)).toBe('ok');
    expect(fpsBucket(25)).toBe('ok');
    expect(fpsBucket(24)).toBe('bad');
    expect(fpsBucket(5)).toBe('bad');
  });

  test('mountPerfHud is headless-safe — no DOM yields a no-op updater that never throws', () => {
    const hud = mountPerfHud('mega');
    expect(() => hud.update(60, Level.FULL)).not.toThrow();
  });
});
