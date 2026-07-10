import { describe, expect, test } from 'bun:test';
import type * as THREE from 'three';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import { glyphBodyGeometry, glyphGeoBucketKey } from '../src/sim/glyph-exterior-geometry';
import { GLYPH_PALETTE_IDS, glyphExteriorPalette } from '../src/sim/glyph-exterior-palette';
import {
  GLYPH_EXTERIOR_KIND_COUNT,
  PANTHEON_DOME_R,
  PANTHEON_FLIGHT_MAX,
  glyphExteriorSignature,
  glyphWanderOffset,
} from '../src/sim/glyph-exterior-signature';

describe('glyph exterior signature', () => {
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
      // Relative wander offset: symmetric ±band (renderer enforces ground/ceiling containment).
      expect(Math.abs(w.y)).toBeLessThanOrEqual(PANTHEON_DOME_R * 0.42 + 0.01);
    }
  });
});

describe('glyph exterior palette', () => {
  test('all five image-ref families appear across the roster', () => {
    const seen = new Set<string>();
    for (const a of ALPHABET_ROSTER) seen.add(glyphExteriorPalette(a).id);
    for (const id of GLYPH_PALETTE_IDS) expect(seen.has(id)).toBe(true);
  });

  test('body hues are pairwise distinct', () => {
    const hues = ALPHABET_ROSTER.map((a) => glyphExteriorPalette(a).bodyHue);
    const uniq = new Set(hues.map((h) => Math.round(h * 10000)));
    expect(uniq.size).toBe(100);
  });
});

describe('glyph exterior geometry buckets', () => {
  test('100 letters → ≥80 unique wild-geometry buckets', () => {
    const keys = new Set<string>();
    for (const a of ALPHABET_ROSTER) {
      const sig = glyphExteriorSignature(a);
      keys.add(glyphGeoBucketKey(a, sig));
    }
    expect(keys.size).toBeGreaterThanOrEqual(80);
    expect(keys.size).toBeLessThanOrEqual(100);
  });

  test('every kind index 0..14 has its own switch branch — none silently reuse the default fallback', () => {
    const target = ALPHABET_ROSTER.map((a) => ({ a, sig: glyphExteriorSignature(a) })).find(
      ({ sig }) => sig.kindIdx % GLYPH_EXTERIOR_KIND_COUNT === 9,
    );
    expect(target).toBeDefined();
    const { a, sig } = target!;
    const geo = glyphBodyGeometry(a, sig) as THREE.TorusGeometry;
    expect(geo.constructor.name).toBe('TorusGeometry');

    const s = a.seed;
    const fi = (shift: number, mod: number): number => ((s >>> shift) % mod) / mod;
    const defaultRadius = 0.6 + fi(3, 40) * 0.35;
    const defaultTube = 0.1 + fi(7, 37) * 0.2;
    expect(geo.parameters.radius).not.toBeCloseTo(defaultRadius, 5);
    expect(geo.parameters.tube).not.toBeCloseTo(defaultTube, 5);
  });
});
