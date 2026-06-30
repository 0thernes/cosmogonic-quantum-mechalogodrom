/**
 * GLYPH EXTERIOR PALETTE — image-inspired colour + texture identity per letter.
 *
 * Five reference families (iteration 4 refs): teal spore filaments · neural monochrome ·
 * crystal void bioluminescence · wire plasma ziggurat · gold fractal nebula.
 *
 * Deterministic from archetype seed — no rng.
 */
import type { AlphabetArchetype } from './alphabet-pantheon';

export const GLYPH_PALETTE_IDS = [
  'teal_spore',
  'neural_mono',
  'crystal_void',
  'wire_plasma',
  'gold_fractal',
] as const;

export type GlyphPaletteId = (typeof GLYPH_PALETTE_IDS)[number];

export interface GlyphExteriorPalette {
  readonly id: GlyphPaletteId;
  /** Primary body hue (0..1). */
  readonly bodyHue: number;
  readonly bodySat: number;
  readonly bodyLit: number;
  /** Energy filament / tether hue. */
  readonly filamentHue: number;
  /** Spore / particle accent. */
  readonly sporeHue: number;
  /** Diagram / logic overlay tint. */
  readonly diagramHue: number;
  readonly filamentLit: number;
}

const PALETTE_TABLE: Record<
  GlyphPaletteId,
  Omit<GlyphExteriorPalette, 'id' | 'bodyHue'> & { baseHue: number }
> = {
  teal_spore: {
    baseHue: 0.52,
    bodySat: 0.72,
    bodyLit: 0.42,
    filamentHue: 0.58,
    sporeHue: 0.48,
    diagramHue: 0.08,
    filamentLit: 0.62,
  },
  neural_mono: {
    baseHue: 0.62,
    bodySat: 0.08,
    bodyLit: 0.78,
    filamentHue: 0.65,
    sporeHue: 0.7,
    diagramHue: 0.55,
    filamentLit: 0.85,
  },
  crystal_void: {
    baseHue: 0.49,
    bodySat: 0.55,
    bodyLit: 0.28,
    filamentHue: 0.51,
    sporeHue: 0.46,
    diagramHue: 0.12,
    filamentLit: 0.55,
  },
  wire_plasma: {
    baseHue: 0.58,
    bodySat: 0.85,
    bodyLit: 0.48,
    filamentHue: 0.62,
    sporeHue: 0.55,
    diagramHue: 0.66,
    filamentLit: 0.7,
  },
  gold_fractal: {
    baseHue: 0.12,
    bodySat: 0.88,
    bodyLit: 0.52,
    filamentHue: 0.78,
    sporeHue: 0.08,
    diagramHue: 0.72,
    filamentLit: 0.65,
  },
};

export function glyphPaletteId(a: AlphabetArchetype): GlyphPaletteId {
  const mix =
    (a.index * 3 +
      (a.seed % 5) +
      (a.script === 'greek' ? 0 : 2) +
      (a.isVowel ? 1 : 0) +
      (a.letterCase === 'upper' ? 0 : 3)) %
    GLYPH_PALETTE_IDS.length;
  return GLYPH_PALETTE_IDS[mix]!;
}

/** Per-letter colour identity — bias-modulated, never two letters identical. */
export function glyphExteriorPalette(a: AlphabetArchetype): GlyphExteriorPalette {
  const id = glyphPaletteId(a);
  const row = PALETTE_TABLE[id];
  const s = a.seed;
  const fi = (n: number, mod: number) => ((s >>> n) % mod) / mod;
  const hueJitter = fi(31, 360) * 0.06 - 0.03 + a.bias.narrative * 0.04;
  const bodyHue = (row.baseHue + a.bias.hue * 0.15 + hueJitter + 1) % 1;
  return {
    id,
    bodyHue,
    bodySat: Math.min(1, row.bodySat + a.bias.quantum * 0.2),
    bodyLit: row.bodyLit + a.bias.generative * 0.18 + fi(33, 20) * 0.08,
    filamentHue: (row.filamentHue + fi(35, 100) * 0.05) % 1,
    sporeHue: (row.sporeHue + fi(37, 80) * 0.06) % 1,
    diagramHue: (row.diagramHue + fi(39, 60) * 0.04) % 1,
    filamentLit: row.filamentLit + a.bias.empowerment * 0.12,
  };
}
