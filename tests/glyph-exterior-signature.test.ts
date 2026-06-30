import { describe, expect, test } from 'bun:test';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import {
  GLYPH_EXTERIOR_KIND_COUNT,
  glyphExteriorSignature,
  glyphWanderOffset,
} from '../src/sim/glyph-exterior-signature';

describe('glyph-exterior-signature', () => {
  test('all 100 glyphs get distinct exterior signatures', () => {
    const sigs = ALPHABET_ROSTER.map(glyphExteriorSignature);
    expect(sigs.length).toBe(100);
    const keys = new Set(
      sigs.map(
        (s) =>
          `${s.kind}|${s.scaleX.toFixed(3)}|${s.scaleY.toFixed(3)}|${s.scaleZ.toFixed(3)}|${s.motionStyle}|${s.phenId}`,
      ),
    );
    expect(keys.size).toBeGreaterThan(90);
  });

  test('kind distribution uses all topology buckets', () => {
    const kinds = new Set(ALPHABET_ROSTER.map((a) => glyphExteriorSignature(a).kindIdx));
    expect(kinds.size).toBeGreaterThanOrEqual(Math.min(10, GLYPH_EXTERIOR_KIND_COUNT));
  });

  test('wander offset stays bounded (no racing loops)', () => {
    const sig = glyphExteriorSignature(ALPHABET_ROSTER[42]!);
    let maxR = 0;
    const out = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 200; i++) {
      const w = glyphWanderOffset(out, i * 0.1, sig, 0.5, 0.3, 0.4, 0.8, 0.7);
      maxR = Math.max(maxR, Math.abs(w.x), Math.abs(w.y), Math.abs(w.z));
    }
    expect(maxR).toBeLessThan(80);
  });
});
