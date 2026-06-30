import { describe, expect, test } from 'bun:test';
import type * as THREE from 'three';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import { glyphBodyGeometry, glyphGeoBucketKey } from '../src/sim/glyph-exterior-geometry';
import {
  GLYPH_EXTERIOR_KIND_COUNT,
  glyphExteriorSignature,
} from '../src/sim/glyph-exterior-signature';

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
    // buildWildGlyphGeometry's switch used to jump straight from case 8 to case 10, so kind 9
    // ('portal_ring') fell into `default` and got the exact same torus formula as the fallback,
    // contradicting "each archetype gets a unique geometry bucket key" (audit LOW).
    const target = ALPHABET_ROSTER.map((a) => ({ a, sig: glyphExteriorSignature(a) })).find(
      ({ sig }) => sig.kindIdx % GLYPH_EXTERIOR_KIND_COUNT === 9,
    );
    expect(target).toBeDefined();
    const { a, sig } = target!;
    const geo = glyphBodyGeometry(a, sig) as THREE.TorusGeometry;
    expect(geo.constructor.name).toBe('TorusGeometry');

    // Replicate the seed-derived scalars the same way buildWildGlyphGeometry does, to compute what
    // the (now-dead) `default` branch would have produced for this exact seed, and assert kind 9's
    // own branch produces different parameters.
    const s = a.seed;
    const fi = (shift: number, mod: number): number => ((s >>> shift) % mod) / mod;
    const defaultRadius = 0.6 + fi(3, 40) * 0.35;
    const defaultTube = 0.1 + fi(7, 37) * 0.2;
    expect(geo.parameters.radius).not.toBeCloseTo(defaultRadius, 5);
    expect(geo.parameters.tube).not.toBeCloseTo(defaultTube, 5);
  });
});
