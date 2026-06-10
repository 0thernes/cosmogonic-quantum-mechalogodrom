import { describe, expect, test } from 'bun:test';
import { LORE_SYLLABLES, LoreEngine } from '../src/sim/lore';

const NAME_KINDS = ['sector', 'tribe', 'star', 'omen'] as const;
const EPITHET_KINDS = ['puppet', 'weather', 'collapse'] as const;

/**
 * All syllable counts `word` can be decomposed into using `table` entries, via memoized
 * DFS — robust even though the curated table is not prefix-free.
 */
function decompositionCounts(word: string, table: readonly string[]): Set<number> {
  const memo = new Map<number, Set<number>>();
  const go = (i: number): Set<number> => {
    const hit = memo.get(i);
    if (hit) return hit;
    const out = new Set<number>();
    if (i === word.length) {
      out.add(0);
    } else {
      for (const syl of table) {
        if (word.startsWith(syl, i)) {
          for (const c of go(i + syl.length)) out.add(c + 1);
        }
      }
    }
    memo.set(i, out);
    return out;
  };
  return go(0);
}

describe('LoreEngine.name', () => {
  test('same seed + args produce the same name (determinism)', () => {
    const a = new LoreEngine(0xc05a06);
    const b = new LoreEngine(0xc05a06);
    for (const kind of NAME_KINDS) {
      for (let i = 0; i < 32; i++) {
        expect(a.name(kind, i)).toBe(b.name(kind, i));
      }
    }
  });

  test('repeated queries return the identical memoized string instance', () => {
    const lore = new LoreEngine(7);
    const first = lore.name('sector', 3);
    expect(lore.name('sector', 3)).toBe(first);
  });

  test('names are independent of query order', () => {
    const a = new LoreEngine(99);
    const b = new LoreEngine(99);
    const forward = NAME_KINDS.map((kind) => a.name(kind, 11));
    const reversed = [...NAME_KINDS].reverse().map((kind) => b.name(kind, 11));
    reversed.reverse();
    expect(reversed).toEqual(forward);
  });

  test('different seeds diverge', () => {
    const a = new LoreEngine(1);
    const b = new LoreEngine(2);
    let differing = 0;
    let total = 0;
    for (const kind of NAME_KINDS) {
      for (let i = 0; i < 10; i++) {
        total++;
        if (a.name(kind, i) !== b.name(kind, i)) differing++;
      }
    }
    expect(differing).toBeGreaterThanOrEqual(Math.floor(total * 0.8));
  });

  test('seed is coerced to uint32 — s and s + 2^32 name identically', () => {
    const a = new LoreEngine(7);
    const b = new LoreEngine(7 + 2 ** 32);
    expect(a.name('star', 4)).toBe(b.name('star', 4));
  });

  test('kinds occupy separate namespaces (same index, different digests)', () => {
    const lore = new LoreEngine(42);
    const names = NAME_KINDS.map((kind) => lore.name(kind, 0));
    expect(new Set(names).size).toBeGreaterThan(1);
  });

  test('names are 2-4 syllables from the curated table, capitalized', () => {
    const lore = new LoreEngine(0xdecafbad);
    for (const kind of NAME_KINDS) {
      for (let i = 0; i < 24; i++) {
        const name = lore.name(kind, i);
        expect(name).toMatch(/^[A-Z][a-z]+$/);
        const counts = decompositionCounts(name.toLowerCase(), LORE_SYLLABLES);
        const inRange = [...counts].some((c) => c >= 2 && c <= 4);
        expect(inRange).toBeTrue();
      }
    }
  });

  test('syllable table itself is lowercase a-z and pronounceable (has a vowel)', () => {
    for (const syl of LORE_SYLLABLES) {
      expect(syl).toMatch(/^[a-z]{2,4}$/);
      expect(syl).toMatch(/[aeiouy]/);
    }
  });

  test('fractional indices truncate to a stable integer key', () => {
    const lore = new LoreEngine(5);
    expect(lore.name('sector', 3.7)).toBe(lore.name('sector', 3));
  });
});

describe('LoreEngine.epithet', () => {
  test('same seed + args produce the same epithet (determinism)', () => {
    const a = new LoreEngine(314159);
    const b = new LoreEngine(314159);
    for (const kind of EPITHET_KINDS) {
      for (const key of ['AETHON', 'SELENE', 'KRONOS', 'STORM', '17']) {
        expect(a.epithet(kind, key)).toBe(b.epithet(kind, key));
      }
    }
  });

  test('different seeds diverge across a sample of epithets', () => {
    const a = new LoreEngine(10);
    const b = new LoreEngine(11);
    let differing = 0;
    const keys = ['AETHON', 'SELENE', 'KRONOS', 'CLEAR', 'VOID', 'c0', 'c1', 'c2'];
    for (const kind of EPITHET_KINDS) {
      for (const key of keys) {
        if (a.epithet(kind, key) !== b.epithet(kind, key)) differing++;
      }
    }
    expect(differing).toBeGreaterThan(0);
  });

  test('epithets read as "the <Adjective> <Noun>" and are memoized', () => {
    const lore = new LoreEngine(2026);
    for (const kind of EPITHET_KINDS) {
      const e = lore.epithet(kind, 'AETHON');
      expect(e).toMatch(/^the [A-Z][a-z]+ [A-Z][a-z]+$/);
      expect(lore.epithet(kind, 'AETHON')).toBe(e);
    }
  });
});
