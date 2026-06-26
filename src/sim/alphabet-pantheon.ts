/**
 * Alphabet Pantheon — 100 deterministic, genuinely-differentiated super-creature archetypes
 * keyed to the Greek (24) and Latin (26) alphabets in both cases: 24 + 24 + 26 + 26 = 100.
 *
 * This EXTENDS the 25-Archon godform pantheon (`godform.ts`), whose apex are already Greek
 * capitals — ORACLE-Σ, STARKILLER-Ω, MANHATTAN-Φ, BROLY-Ψ, VOID-Λ. Those five apex archetypes
 * inherit their established faculty emphases (clifford / generative / narrative-integration /
 * chaos / social-manipulation); the other 95 derive a DISTINCT bias profile from real letter
 * properties — script (greek/latin), case (upper/lower), vowel/consonant, alphabet ordinal,
 * codepoint — plus an independent seeded residual per bias dimension. No two archetypes are
 * clones: `alphabet-pantheon.test.ts` proves it with a pairwise-diversity metric and per-axis
 * variance (the same honesty bar the ToM pantheon had to clear — not one filter cloned N×).
 *
 * Determinism law: every value flows from a seeded `mulberry32(hashSeed(id))` — no `Math.random`,
 * no `Date.now`. Same build ⇒ identical roster, bit for bit. Glyphs are built via
 * `String.fromCharCode` from explicit codepoint tables so the source stays ASCII-clean.
 *
 * NOT sentient — 100 functional, parameterized creature archetypes.
 */
import { mulberry32, hashSeed } from '../math/rng';

export type AlphabetScript = 'greek' | 'latin';
export type LetterCase = 'upper' | 'lower';

/** A creature archetype's behavioural bias — each axis maps to a real apex faculty/substrate. */
export interface ArchetypeBias {
  /** Stabilizer / measurement-reflex weight (Clifford). */
  clifford: number;
  /** Generative top-down / hallucination weight (HOT-1). */
  generative: number;
  /** Chaos / regime-shift / Lyapunov weight. */
  chaos: number;
  /** Narrative / symbol / myth weight. */
  narrative: number;
  /** Social / theory-of-mind / coalition weight. */
  social: number;
  /** Curiosity / novelty-seeking (reservoir) weight. */
  curiosity: number;
  /** Empowerment / agency-hunger weight (Blahut–Arimoto). */
  empowerment: number;
  /** Quantum affinity — Born-collapse temperature / QNG step scale. */
  quantum: number;
  /** Order setpoint (criticality / spin temperature): 0 calm .. 1 wild. */
  order: number;
  /** Aggression / dominance baseline. */
  aggression: number;
  /** Base body hue in [0,1). */
  hue: number;
}

/** Ordered axis keys of {@link ArchetypeBias} (the 10 behavioural dims; `hue` excluded — it is colour). */
export const BIAS_AXES = [
  'clifford',
  'generative',
  'chaos',
  'narrative',
  'social',
  'curiosity',
  'empowerment',
  'quantum',
  'order',
  'aggression',
] as const;

export interface AlphabetArchetype {
  /** Stable index 0..99 (greek-upper, greek-lower, latin-upper, latin-lower). */
  index: number;
  /** The literal letter, e.g. "Σ", "a". */
  glyph: string;
  /** Display name, e.g. "Sigma" (greek) or "A" (latin). */
  name: string;
  script: AlphabetScript;
  letterCase: LetterCase;
  codepoint: number;
  /** 0-based position within its own alphabet (0..23 greek, 0..25 latin). */
  ordinal: number;
  isVowel: boolean;
  /** Deterministic uint32 seed = hashSeed(`${script}-${letterCase}-${name}`). */
  seed: number;
  bias: ArchetypeBias;
}

// ── letter tables (explicit codepoints so the source is ASCII-only) ──────────────
// Greek uppercase Α..Ω (24): 0x3A2 is unassigned and skipped between Ρ and Σ.
const GREEK_UPPER_CP = [
  0x391, 0x392, 0x393, 0x394, 0x395, 0x396, 0x397, 0x398, 0x399, 0x39a, 0x39b, 0x39c, 0x39d, 0x39e,
  0x39f, 0x3a0, 0x3a1, 0x3a3, 0x3a4, 0x3a5, 0x3a6, 0x3a7, 0x3a8, 0x3a9,
];
// Greek lowercase α..ω (24): 0x3C2 (final sigma ς) skipped in favour of σ 0x3C3.
const GREEK_LOWER_CP = [
  0x3b1, 0x3b2, 0x3b3, 0x3b4, 0x3b5, 0x3b6, 0x3b7, 0x3b8, 0x3b9, 0x3ba, 0x3bb, 0x3bc, 0x3bd, 0x3be,
  0x3bf, 0x3c0, 0x3c1, 0x3c3, 0x3c4, 0x3c5, 0x3c6, 0x3c7, 0x3c8, 0x3c9,
];
const GREEK_NAMES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omicron',
  'Pi',
  'Rho',
  'Sigma',
  'Tau',
  'Upsilon',
  'Phi',
  'Chi',
  'Psi',
  'Omega',
];
/** Greek vowels (by name). */
const GREEK_VOWELS = new Set(['Alpha', 'Epsilon', 'Eta', 'Iota', 'Omicron', 'Upsilon', 'Omega']);
/** Latin vowels (by uppercase letter). */
const LATIN_VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const round = (x: number): number => Math.round(x * 1e4) / 1e4;

/**
 * Derive a genuinely-differentiated bias from real letter features + an independent seeded
 * residual per axis. The feature terms give *structured* differences (vowels vs consonants,
 * upper vs lower, greek vs latin, early vs late ordinal); the per-axis residual (`r()` drawn
 * once per axis) guarantees no two archetypes collide. The five Greek-capital apex letters are
 * then nudged toward their established godform emphasis.
 */
function deriveBias(
  script: AlphabetScript,
  letterCase: LetterCase,
  name: string,
  codepoint: number,
  ordinal: number,
  alphabetSize: number,
  isVowel: boolean,
  seed: number,
): ArchetypeBias {
  const r = mulberry32(seed);
  const o = alphabetSize > 1 ? ordinal / (alphabetSize - 1) : 0; // 0..1 within alphabet
  const greek = script === 'greek' ? 1 : 0;
  const upper = letterCase === 'upper' ? 1 : 0;
  const vow = isVowel ? 1 : 0;
  const jit = (): number => 0.3 * (r() - 0.5); // independent residual per axis

  const bias: ArchetypeBias = {
    clifford: clamp01(0.3 + 0.25 * upper + 0.2 * (1 - vow) + jit()),
    generative: clamp01(0.3 + 0.25 * vow + 0.2 * o + jit()),
    chaos: clamp01(0.25 + 0.3 * (1 - upper) + 0.2 * o + jit()),
    narrative: clamp01(0.3 + 0.25 * greek + 0.2 * (1 - o) + jit()),
    social: clamp01(0.3 + 0.25 * (1 - greek) + 0.2 * vow + jit()),
    curiosity: clamp01(0.3 + 0.25 * o + 0.2 * vow + jit()),
    empowerment: clamp01(0.3 + 0.25 * upper + 0.2 * o + jit()),
    quantum: clamp01(0.3 + 0.3 * greek + 0.2 * (1 - vow) + jit()),
    order: clamp01(0.3 + 0.25 * upper + 0.2 * (1 - o) + jit()),
    aggression: clamp01(0.25 + 0.3 * (1 - vow) + 0.2 * (1 - greek) + jit()),
    hue: (codepoint * 0.0137 + ordinal * 0.04 + greek * 0.5) % 1,
  };

  // Apex anchors — keep the five individuated godform capitals consistent with their faculty
  // emphasis (ORACLE-Σ clifford, STARKILLER-Ω generative, MANHATTAN-Φ narrative/integration,
  // BROLY-Ψ chaos, VOID-Λ social-manipulation + low aggression).
  if (script === 'greek' && letterCase === 'upper') {
    if (name === 'Sigma') bias.clifford = Math.max(bias.clifford, 0.9);
    else if (name === 'Omega') bias.generative = Math.max(bias.generative, 0.9);
    else if (name === 'Phi') bias.narrative = Math.max(bias.narrative, 0.9);
    else if (name === 'Psi') bias.chaos = Math.max(bias.chaos, 0.95);
    else if (name === 'Lambda') {
      bias.social = Math.max(bias.social, 0.9);
      bias.aggression = Math.min(bias.aggression, 0.25);
    }
  }

  for (const k of BIAS_AXES) bias[k] = round(bias[k]);
  bias.hue = round(bias.hue);
  return bias;
}

function buildRoster(): AlphabetArchetype[] {
  const out: AlphabetArchetype[] = [];
  let index = 0;
  const push = (
    script: AlphabetScript,
    letterCase: LetterCase,
    codepoint: number,
    name: string,
    ordinal: number,
    alphabetSize: number,
    isVowel: boolean,
  ): void => {
    const seed = hashSeed(`${script}-${letterCase}-${name}`);
    out.push({
      index: index++,
      glyph: String.fromCharCode(codepoint),
      name,
      script,
      letterCase,
      codepoint,
      ordinal,
      isVowel,
      seed,
      bias: deriveBias(script, letterCase, name, codepoint, ordinal, alphabetSize, isVowel, seed),
    });
  };

  // Greek uppercase (24)
  GREEK_UPPER_CP.forEach((cp, i) =>
    push('greek', 'upper', cp, GREEK_NAMES[i]!, i, 24, GREEK_VOWELS.has(GREEK_NAMES[i]!)),
  );
  // Greek lowercase (24)
  GREEK_LOWER_CP.forEach((cp, i) =>
    push(
      'greek',
      'lower',
      cp,
      GREEK_NAMES[i]!.toLowerCase(),
      i,
      24,
      GREEK_VOWELS.has(GREEK_NAMES[i]!),
    ),
  );
  // Latin uppercase A..Z (26)
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(0x41 + i);
    push('latin', 'upper', 0x41 + i, ch, i, 26, LATIN_VOWELS.has(ch));
  }
  // Latin lowercase a..z (26)
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(0x61 + i);
    push('latin', 'lower', 0x61 + i, ch, i, 26, LATIN_VOWELS.has(String.fromCharCode(0x41 + i)));
  }
  return out;
}

/** The frozen 100-archetype roster (24 greek-upper, 24 greek-lower, 26 latin-upper, 26 latin-lower). */
export const ALPHABET_ROSTER: readonly AlphabetArchetype[] = Object.freeze(buildRoster());

/** Total roster size (100). */
export const ALPHABET_PANTHEON_SIZE = ALPHABET_ROSTER.length;

const BY_GLYPH = new Map<string, AlphabetArchetype>(ALPHABET_ROSTER.map((a) => [a.glyph, a]));

/** Look up an archetype by its literal glyph (e.g. "Σ"); undefined if not in the roster. */
export function alphabetArchetypeByGlyph(glyph: string): AlphabetArchetype | undefined {
  return BY_GLYPH.get(glyph);
}

/** Index-addressable archetype (wraps modulo 100, so any integer is valid). */
export function alphabetArchetypeAt(i: number): AlphabetArchetype {
  const n = ALPHABET_PANTHEON_SIZE;
  return ALPHABET_ROSTER[((i % n) + n) % n]!;
}

/**
 * Pairwise diversity of the roster over the 10 behavioural axes — the honesty proof that these
 * are NOT clones. Returns the minimum and mean Euclidean distance between any two archetypes and
 * the per-axis spread (max − min). Used by the test; cheap enough for a one-shot telemetry read.
 */
export function rosterDiversity(): {
  minPairDistance: number;
  meanPairDistance: number;
  axisSpread: Record<(typeof BIAS_AXES)[number], number>;
  uniqueGlyphs: number;
} {
  const vecs = ALPHABET_ROSTER.map((a) => BIAS_AXES.map((k) => a.bias[k]));
  let min = Infinity;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < vecs.length; i++) {
    for (let j = i + 1; j < vecs.length; j++) {
      let d = 0;
      for (let k = 0; k < BIAS_AXES.length; k++) d += (vecs[i]![k]! - vecs[j]![k]!) ** 2;
      d = Math.sqrt(d);
      if (d < min) min = d;
      sum += d;
      pairs++;
    }
  }
  const axisSpread = {} as Record<(typeof BIAS_AXES)[number], number>;
  for (let k = 0; k < BIAS_AXES.length; k++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of vecs) {
      if (v[k]! < lo) lo = v[k]!;
      if (v[k]! > hi) hi = v[k]!;
    }
    axisSpread[BIAS_AXES[k]!] = round(hi - lo);
  }
  return {
    minPairDistance: round(min),
    meanPairDistance: round(sum / pairs),
    axisSpread,
    uniqueGlyphs: new Set(ALPHABET_ROSTER.map((a) => a.glyph)).size,
  };
}
