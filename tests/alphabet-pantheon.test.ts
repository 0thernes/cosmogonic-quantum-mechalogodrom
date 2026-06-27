/**
 * Alphabet Pantheon — honesty + correctness gate.
 *
 * The repo's standing failure mode (per the 2026-06-21 NHSI honesty audit) is "one filter cloned
 * N× with names not matched by algorithms" (faculties-pantheon, the pre-fix tom-pantheon). This
 * suite makes that impossible for the 100 alphabet archetypes: it proves the roster is the right
 * size + composition, every glyph is unique, every bias value is bounded, the five godform apex
 * capitals carry their established emphasis, and — the load-bearing test — the archetypes are
 * GENUINELY DIFFERENTIATED (a positive minimum pairwise distance and real spread on every axis),
 * not clones. Determinism is structurally enforced by tests/determinism-law (seeded RNG only);
 * here we pin the seed derivation and the referential stability of the frozen roster.
 */
import { describe, expect, test } from 'bun:test';
import { hashSeed } from '../src/math/rng';
import {
  ALPHABET_ROSTER,
  ALPHABET_PANTHEON_SIZE,
  BIAS_AXES,
  alphabetArchetypeAt,
  alphabetArchetypeByGlyph,
  rosterDiversity,
} from '../src/sim/alphabet-pantheon';

const greekUpper = (cp: number): string => String.fromCharCode(cp);

describe('alphabet pantheon — size + composition', () => {
  test('exactly 100 archetypes', () => {
    expect(ALPHABET_PANTHEON_SIZE).toBe(100);
    expect(ALPHABET_ROSTER.length).toBe(100);
  });

  test('composition is 24 greek-upper + 24 greek-lower + 26 latin-upper + 26 latin-lower', () => {
    const tally = (s: string, c: string): number =>
      ALPHABET_ROSTER.filter((a) => a.script === s && a.letterCase === c).length;
    expect(tally('greek', 'upper')).toBe(24);
    expect(tally('greek', 'lower')).toBe(24);
    expect(tally('latin', 'upper')).toBe(26);
    expect(tally('latin', 'lower')).toBe(26);
  });

  test('every glyph is unique (100 distinct letters)', () => {
    expect(new Set(ALPHABET_ROSTER.map((a) => a.glyph)).size).toBe(100);
  });

  test('indices are 0..99 in order', () => {
    ALPHABET_ROSTER.forEach((a, i) => expect(a.index).toBe(i));
  });
});

describe('alphabet pantheon — determinism + lookups', () => {
  test('seed is the deterministic FNV hash of the identity', () => {
    for (const a of ALPHABET_ROSTER) {
      expect(a.seed).toBe(hashSeed(`${a.script}-${a.letterCase}-${a.name}`));
    }
  });

  test('index addressing wraps modulo 100 and is referentially stable', () => {
    for (let i = 0; i < 5; i++) {
      expect(alphabetArchetypeAt(i)).toBe(ALPHABET_ROSTER[i]!);
      expect(alphabetArchetypeAt(i + 100)).toBe(ALPHABET_ROSTER[i]!);
      expect(alphabetArchetypeAt(i - 100)).toBe(ALPHABET_ROSTER[i]!);
    }
  });

  test('glyph lookup resolves the right letter', () => {
    const sigma = alphabetArchetypeByGlyph(greekUpper(0x3a3));
    expect(sigma?.name).toBe('Sigma');
    expect(sigma?.script).toBe('greek');
    expect(sigma?.letterCase).toBe('upper');
    expect(alphabetArchetypeByGlyph('A')?.script).toBe('latin');
    expect(alphabetArchetypeByGlyph('z')?.letterCase).toBe('lower');
    expect(alphabetArchetypeByGlyph('!')).toBeUndefined();
  });
});

describe('alphabet pantheon — bounded + apex-anchored', () => {
  test('every bias axis is within [0,1]', () => {
    for (const a of ALPHABET_ROSTER) {
      for (const k of BIAS_AXES) {
        expect(a.bias[k]).toBeGreaterThanOrEqual(0);
        expect(a.bias[k]).toBeLessThanOrEqual(1);
      }
      expect(a.bias.hue).toBeGreaterThanOrEqual(0);
      expect(a.bias.hue).toBeLessThan(1);
    }
  });

  test('the five godform apex capitals carry their established emphasis', () => {
    const byName = (name: string) =>
      ALPHABET_ROSTER.find(
        (a) => a.script === 'greek' && a.letterCase === 'upper' && a.name === name,
      )!;
    expect(byName('Sigma').bias.clifford).toBeGreaterThanOrEqual(0.9); // ORACLE-Σ
    expect(byName('Omega').bias.generative).toBeGreaterThanOrEqual(0.9); // STARKILLER-Ω
    expect(byName('Phi').bias.narrative).toBeGreaterThanOrEqual(0.9); // MANHATTAN-Φ
    expect(byName('Psi').bias.chaos).toBeGreaterThanOrEqual(0.95); // BROLY-Ψ
    expect(byName('Lambda').bias.social).toBeGreaterThanOrEqual(0.9); // VOID-Λ
    expect(byName('Lambda').bias.aggression).toBeLessThanOrEqual(0.25);
  });
});

describe('alphabet pantheon — genuine differentiation (NOT clones)', () => {
  const div = rosterDiversity();

  test('all 100 glyphs distinct and a positive minimum pairwise distance', () => {
    expect(div.uniqueGlyphs).toBe(100);
    // A positive floor proves no two archetypes share a bias vector (the clone failure mode).
    expect(div.minPairDistance).toBeGreaterThan(0.05);
  });

  test('the roster genuinely spreads — mean pairwise distance is substantial', () => {
    expect(div.meanPairDistance).toBeGreaterThan(0.5);
  });

  test('every behavioural axis genuinely varies (no constant/cloned column)', () => {
    for (const k of BIAS_AXES) {
      expect(div.axisSpread[k]).toBeGreaterThan(0.3);
    }
  });

  test('no two archetypes have an identical bias vector', () => {
    const keys = new Set(
      ALPHABET_ROSTER.map((a) => BIAS_AXES.map((k) => a.bias[k].toFixed(4)).join('|')),
    );
    expect(keys.size).toBe(100);
  });
});
