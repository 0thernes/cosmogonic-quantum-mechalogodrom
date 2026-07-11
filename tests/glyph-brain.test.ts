import { describe, expect, test } from 'bun:test';
import {
  GlyphBrain,
  GlyphBrainBatch,
  writeGlyphEnvironmentalPercept,
} from '../src/sim/glyph-brain';
import { PANTHEON_GLYPH_BRAIN_PARAMS } from '../src/sim/apex-brain';
import type { OrganismIntelligenceSignal } from '../src/types';

const lifeSignal = (enabled: boolean): OrganismIntelligenceSignal => ({
  enabled,
  indicatorOnly: true,
  revision: 1,
  resourcePressure: 0.8,
  threatResponse: 0.9,
  exploration: 0.85,
  socialDrive: 0.75,
  plasticity: 0.7,
  forecast: 0.6,
  confidence: 0.9,
  corpusDrive: 0.8,
  ecologyRisk: 0.5,
  ecologySurprise: 0.25,
  channels: new Float32Array([0.2, 0.4, 0.6, 0.8]),
  integratedRepoCount: 17,
  diagnosticAlert: false,
});

describe('GlyphBrain — 25k visual-only pantheon minds', () => {
  test('designed param budget ≈ 25,000', () => {
    const b = new GlyphBrain(0, 12345);
    expect(PANTHEON_GLYPH_BRAIN_PARAMS).toBe(25_000);
    expect(b.paramCount).toBeGreaterThan(20_000);
    expect(b.paramCount).toBeLessThan(30_000);
  });

  test('think is deterministic and visual-only snapshot', () => {
    const b = new GlyphBrain(3, 99);
    const p = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const s1 = b.think(p);
    const s2 = b.think(p);
    expect(Number.isFinite(s1.activity)).toBe(true);
    expect(s1.activity).not.toBe(s2.activity); // beat advances
    const b2 = new GlyphBrain(3, 99);
    expect(b2.think(p).activity).toBe(s1.activity);
  });

  test('batch of 100 totals 2.5M designed params', () => {
    const batch = new GlyphBrainBatch(777);
    expect(batch.count).toBe(100);
    expect(batch.totalParams).toBeGreaterThan(2_000_000);
  });

  test('disabled field is exact legacy glyph input; enabled field changes final motion/activity', () => {
    const input = {
      weatherHue: 0.4,
      quantumEntropy: 0.6,
      reactionDiffusion: 0.3,
      treble: 0.2,
      visualChaos: 0.5,
      windEnergy: 0.4,
      mid: 0.3,
      level: 0.25,
      thermal: 0.55,
      apexVitality: 0.7,
    };
    const legacy = new Float32Array(8).fill(0.4);
    const disabled = new Float32Array(8).fill(0.4);
    const enhanced = new Float32Array(8).fill(0.4);
    writeGlyphEnvironmentalPercept(legacy, input);
    writeGlyphEnvironmentalPercept(disabled, input, lifeSignal(false));
    writeGlyphEnvironmentalPercept(enhanced, input, lifeSignal(true));
    expect(disabled).toEqual(legacy);
    expect(enhanced).not.toEqual(legacy);

    const baselineBrain = new GlyphBrain(7, 0x51a7);
    const enhancedBrain = new GlyphBrain(7, 0x51a7);
    const baselineOutput = baselineBrain.think(legacy);
    const enhancedOutput = enhancedBrain.think(enhanced);
    expect({
      activity: enhancedOutput.activity,
      motor: Array.from(enhancedOutput.motor),
    }).not.toEqual({
      activity: baselineOutput.activity,
      motor: Array.from(baselineOutput.motor),
    });
  });
});
