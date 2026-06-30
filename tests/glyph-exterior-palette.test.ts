import { describe, expect, test } from 'bun:test';
import { ALPHABET_ROSTER } from '../src/sim/alphabet-pantheon';
import { GLYPH_PALETTE_IDS, glyphExteriorPalette } from '../src/sim/glyph-exterior-palette';

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
