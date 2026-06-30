/**
 * GLYPH EXTERIOR SIGNATURE — deterministic per-letter physical-outside identity.
 *
 * Each of the 100 pantheon creatures gets a unique exterior shell kind + param set
 * derived from its archetype (index, seed, bias) — no rng, no clones.
 *
 * Visual-only; intelligence remains in GlyphBrain + Tsotchke.
 */
import type { AlphabetArchetype } from './alphabet-pantheon';

/** Fifteen distinct exterior shell topologies (each instanced by kind for draw-call budget). */
export const GLYPH_EXTERIOR_KINDS = [
  'tesseract_cage',
  'crystal_shard',
  'dodeca_tunnel',
  'mandala_ring',
  'prismatic_knot',
  'void_orb',
  'tile_fragment',
  'neural_icosa',
  'stripe_box',
  'portal_ring',
  'stellated_star',
  'beam_vortex',
  'gear_disc',
  'mandala_orb',
  'portal_frame',
] as const;

export type GlyphExteriorKind = (typeof GLYPH_EXTERIOR_KINDS)[number];

export const GLYPH_EXTERIOR_KIND_COUNT = GLYPH_EXTERIOR_KINDS.length;

/** How the body wanders — avoids lockstep racing loops. */
export type GlyphMotionStyle = 'hover' | 'lissajous' | 'breathe' | 'drift' | 'pulse';

export interface GlyphExteriorSignature {
  readonly kind: GlyphExteriorKind;
  readonly kindIdx: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly shellScale: number;
  readonly rotBias: number;
  readonly hueOffset: number;
  readonly satBoost: number;
  readonly wanderAx: number;
  readonly wanderAy: number;
  readonly wanderAz: number;
  readonly wanderPhase: number;
  readonly motionStyle: GlyphMotionStyle;
  readonly phenId: number;
  /** Per-glyph accent mote scale (stellated micro-shell). */
  readonly accentScale: number;
  readonly accentHue: number;
}

const MOTION_STYLES: readonly GlyphMotionStyle[] = [
  'hover',
  'lissajous',
  'breathe',
  'drift',
  'pulse',
];

function kindIndex(a: AlphabetArchetype): number {
  return (
    (a.index * 7 +
      (a.seed % 13) +
      (a.isVowel ? 3 : 0) +
      (a.script === 'greek' ? 1 : 2) +
      (a.letterCase === 'upper' ? 0 : 5)) %
    GLYPH_EXTERIOR_KIND_COUNT
  );
}

/** Pure function of archetype fields — identical roster ⇒ identical signatures. */
export function glyphExteriorSignature(a: AlphabetArchetype): GlyphExteriorSignature {
  const kindIdx = kindIndex(a);
  const s = a.seed;
  const b = a.bias;
  const fi = (n: number, mod: number) => ((s >>> n) % mod) / mod;
  return {
    kind: GLYPH_EXTERIOR_KINDS[kindIdx]!,
    kindIdx,
    scaleX: 0.72 + fi(3, 40) * 0.56 + b.generative * 0.12,
    scaleY: 0.68 + fi(5, 37) * 0.62 + b.empowerment * 0.14,
    scaleZ: 0.7 + fi(9, 41) * 0.54 + b.quantum * 0.16,
    shellScale: 1.05 + fi(11, 30) * 0.55 + b.order * 0.2,
    rotBias: fi(13, 628) * Math.PI * 2,
    hueOffset: fi(17, 360) * 0.08 - 0.04 + b.narrative * 0.06,
    satBoost: 0.08 + b.quantum * 0.22,
    wanderAx: 0.11 + fi(19, 50) * 0.19 + b.chaos * 0.08,
    wanderAy: 0.09 + fi(21, 43) * 0.15 + b.curiosity * 0.07,
    wanderAz: 0.13 + fi(23, 47) * 0.17 + b.social * 0.06,
    wanderPhase: fi(25, 6283),
    motionStyle: MOTION_STYLES[(a.index + (s % 5)) % MOTION_STYLES.length]!,
    phenId: (a.index * 137 + (s % 1000)) % 1000,
    accentScale: 0.55 + fi(27, 35) * 0.9 + b.aggression * 0.15,
    accentHue: (b.hue + fi(29, 360) * 0.12) % 1,
  };
}

/**
 * Bounded wander offset — anchor stays near the dome slot; NO wide racing loops.
 *
 * Each axis is a sum of two INCOMMENSURATE harmonics (base freq + golden-ratio·freq). Because φ is
 * irrational the path never closes into a visible repeating circle — the body drifts dynamically,
 * organically, and chaotically while staying inside a small radius. Amplitude is normalised to ≈1
 * (0.68 + 0.32) so the bound holds.
 */
const WANDER_PHI = 1.6180339887;

export function glyphWanderOffset(
  ph: number,
  sig: GlyphExteriorSignature,
  mx: number,
  my: number,
  mz: number,
  chaos: number,
  activity: number,
): { x: number; y: number; z: number } {
  // Small radius — breathe around the slot, never sprint across the sky.
  const r = 6 + activity * 12 + chaos * 8;
  const p = sig.wanderPhase;
  // Quasi-periodic oscillator: base + golden-ratio harmonic ⇒ no closed loop.
  const q = (f: number, ph0: number): number =>
    Math.sin(ph * f + ph0) * 0.68 + Math.sin(ph * f * WANDER_PHI + ph0 * 1.7) * 0.32;
  const ax = sig.wanderAx;
  const ay = sig.wanderAy;
  const az = sig.wanderAz;
  switch (sig.motionStyle) {
    case 'hover':
      return {
        x: q(ax, p) * r * 0.35 + mx * 16,
        y: q(ay, p * 1.3) * (4 + activity * 7) + my * 11,
        z: q(az, p * 0.7 + 1.1) * r * 0.35 + mz * 16,
      };
    case 'lissajous':
      return {
        x: q(ax, p) * r + mx * 20,
        y: q(ay * 1.7, p) * (6 + activity * 9) + my * 13,
        z: q(az * 1.3, p + 2.0) * r * 0.85 + mz * 20,
      };
    case 'breathe':
      return {
        x: q(0.21, p) * r * 0.25 + mx * 9,
        y: q(0.17, p) * (8 + activity * 11) + my * 9,
        z: q(0.19, p + 1.6) * r * 0.25 + mz * 9,
      };
    case 'drift':
      return {
        x: q(ax * 0.4, p) * r * 0.5 + Math.cos(ph * 0.09 * WANDER_PHI + p) * r * 0.18 + mx * 14,
        y: q(0.13, my) * (5 + activity * 8) + my * 10,
        z:
          q(az * 0.45, p + 0.8) * r * 0.46 +
          Math.sin(ph * 0.11 * WANDER_PHI + p) * r * 0.14 +
          mz * 14,
      };
    default:
      return {
        x: Math.sin(ph * 0.13 * WANDER_PHI + p) * r * 0.12 + mx * 8,
        y: q(0.25, p) * (3 + activity * 6) + my * 8,
        z: Math.cos(ph * 0.12 * WANDER_PHI + p) * r * 0.12 + mz * 8,
      };
  }
}
