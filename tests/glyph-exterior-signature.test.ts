import { describe, expect, test } from 'bun:test';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import {
  GLYPH_EXTERIOR_KIND_COUNT,
  PANTHEON_DOME_R,
  PANTHEON_FLIGHT_MAX,
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

  test('wander offset stays inside dome shell (V116 containment)', () => {
    const sig = glyphExteriorSignature(ALPHABET_ROSTER[42]!);
    const out = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 400; i++) {
      const mx = Math.sin(i * 0.13) * 0.9;
      const my = Math.cos(i * 0.11) * 0.9;
      const mz = Math.sin(i * 0.09) * 0.9;
      const w = glyphWanderOffset(out, i * 0.1, sig, mx, my, mz, 0.8, 0.7);
      const r = Math.sqrt(w.x * w.x + w.z * w.z);
      expect(r).toBeLessThanOrEqual(PANTHEON_FLIGHT_MAX + 0.01);
      expect(w.y).toBeGreaterThanOrEqual(6);
      expect(w.y).toBeLessThanOrEqual(PANTHEON_DOME_R * 0.42 + 0.01);
    }
  });
});
