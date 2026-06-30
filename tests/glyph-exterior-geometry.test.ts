import { describe, expect, test } from 'bun:test';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import { glyphGeoBucketKey } from '../src/sim/glyph-exterior-geometry';
import { glyphExteriorSignature } from '../src/sim/glyph-exterior-signature';

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
});
