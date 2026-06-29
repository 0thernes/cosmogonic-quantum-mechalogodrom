import { describe, expect, test } from 'bun:test';
import { GlyphBrain, GlyphBrainBatch } from '../src/sim/glyph-brain';
import { PANTHEON_GLYPH_BRAIN_PARAMS } from '../src/sim/apex-brain';

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
});
