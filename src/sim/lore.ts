/**
 * Deterministic cosmic lore (V2). sha256(seed || kind || index) digests index a curated
 * syllable table to mint pronounceable names (2-4 syllables) plus epithets for puppet
 * masters, weather and quantum collapses. Pure leaf module: no DOM, no three.js, no
 * `src/types.ts` import, and ZERO randomness — every name is a pure function of the
 * constructor seed and the query arguments, so call order can never change a name.
 */
// @noble/hashes v2 maps ONLY './sha2.js'-style subpaths in its exports field — the
// extension is part of the public specifier, not a bundler quirk.
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * Curated syllable table the digest bytes index into. Lowercase a-z only, every entry
 * pronounceable on its own; exported so tests can verify name decomposition.
 */
export const LORE_SYLLABLES: readonly string[] = [
  'ae',
  'al',
  'an',
  'ar',
  'ash',
  'az',
  'bel',
  'bor',
  'ca',
  'cael',
  'cor',
  'cy',
  'da',
  'del',
  'dra',
  'dun',
  'el',
  'en',
  'er',
  'esh',
  'fa',
  'fen',
  'gal',
  'gor',
  'ha',
  'hel',
  'hy',
  'il',
  'ir',
  'ka',
  'kel',
  'kor',
  'ky',
  'la',
  'lor',
  'lu',
  'ma',
  'mor',
  'my',
  'na',
  'nar',
  'ne',
  'no',
  'nyx',
  'om',
  'on',
  'or',
  'pha',
  'phi',
  'qua',
  'quo',
  'ra',
  'rha',
  'ri',
  'ro',
  'sa',
  'sel',
  'sha',
  'sol',
  'ta',
  'tha',
  'thu',
  'ti',
  'tor',
  'ul',
  'um',
  'un',
  'ur',
  'va',
  'vel',
  'vo',
  'vy',
  'xa',
  'xen',
  'xi',
  'ya',
  'yl',
  'yr',
  'za',
  'zel',
  'zo',
  'zu',
];

/** Adjective half of every epithet (shared across kinds). */
const EPITHET_ADJECTIVES: readonly string[] = [
  'Silent',
  'Unraveling',
  'Hollow',
  'Radiant',
  'Forgotten',
  'Recursive',
  'Inverted',
  'Sleepless',
  'Veiled',
  'Burning',
  'Fractal',
  'Patient',
  'Devouring',
  'Luminous',
  'Spiraling',
  'Adamant',
];

/** Noun half of every epithet, flavored per kind. */
const EPITHET_NOUNS: Record<'puppet' | 'weather' | 'collapse', readonly string[]> = {
  puppet: [
    'Puppeteer',
    'Architect',
    'Warden',
    'Chorister',
    'Shepherd',
    'Cartographer',
    'Arbiter',
    'Gardener',
  ],
  weather: ['Tempest', 'Stillness', 'Aurora', 'Deluge', 'Vacuum', 'Mist', 'Zenith', 'Squall'],
  collapse: [
    'Eigenstate',
    'Measurement',
    'Decoherence',
    'Wavefall',
    'Census',
    'Verdict',
    'Superposition',
    'Threshold',
  ],
};

/** Pick a table entry by digest byte. O(1). */
function pick(table: readonly string[], byte: number): string {
  // Invariant: byte % table.length is in [0, table.length) — every table above is non-empty.
  return table[byte % table.length]!;
}

/**
 * Deterministic lore generator. Names and epithets are derived from
 * sha256(`seed:domain:kind:key`) and memoized in Maps, so repeated queries are O(1) and
 * return the identical string instance. Memory is bounded by the number of DISTINCT
 * queries (24 sectors, a handful of tribes/omens/epithets — tens of entries in practice).
 */
export class LoreEngine {
  /** Seed coerced to uint32 (same coercion as `mulberry32`) for stable stringification. */
  private readonly seed: number;
  private readonly names = new Map<string, string>();
  private readonly epithets = new Map<string, string>();

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /**
   * Syllabic name for `kind` #`index` (index is truncated to an integer for stability).
   * 2-4 syllables from {@link LORE_SYLLABLES}, capitalized. Memoized: O(1) amortized;
   * the first call per (kind, index) hashes one short message — O(1), construction-grade.
   */
  name(kind: 'sector' | 'tribe' | 'star' | 'omen', index: number): string {
    const key = `${kind}:${Math.trunc(index)}`;
    const hit = this.names.get(key);
    if (hit !== undefined) return hit;
    const d = sha256(utf8ToBytes(`${this.seed}:name:${key}`));
    const syllables = 2 + ((d[0] ?? 0) % 3);
    let s = '';
    for (let i = 0; i < syllables; i++) {
      s += pick(LORE_SYLLABLES, d[i + 1] ?? 0);
    }
    const out = s.charAt(0).toUpperCase() + s.slice(1);
    this.names.set(key, out);
    return out;
  }

  /**
   * Epithet for a named actor, e.g. `the Burning Cartographer` — lowercase leading "the"
   * so it composes mid-sentence ("AETHON the Burning Cartographer"). Adjective is shared
   * across kinds; the noun table is kind-flavored. Memoized: O(1) amortized.
   */
  epithet(kind: 'puppet' | 'weather' | 'collapse', key: string): string {
    const mk = `${kind}:${key}`;
    const hit = this.epithets.get(mk);
    if (hit !== undefined) return hit;
    const d = sha256(utf8ToBytes(`${this.seed}:epithet:${mk}`));
    const out = `the ${pick(EPITHET_ADJECTIVES, d[0] ?? 0)} ${pick(EPITHET_NOUNS[kind], d[1] ?? 0)}`;
    this.epithets.set(mk, out);
    return out;
  }
}
