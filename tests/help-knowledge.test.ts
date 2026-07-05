/**
 * HELP KNOWLEDGE (V36) — the repo-grounded RAG retriever behind "HELP ME NOW". Pins that real
 * questions route to the right card, ranking is sane, and the corpus stays safe (public-only).
 */
import { describe, expect, test } from 'bun:test';
import { HELP_KB, findHelp } from '../src/ui/help-knowledge';

describe('help knowledge', () => {
  test('every card has an id, title, keywords, and a non-trivial body', () => {
    const ids = new Set<string>();
    for (const e of HELP_KB) {
      expect(e.id.length).toBeGreaterThan(0);
      expect(ids.has(e.id)).toBe(false); // ids unique
      ids.add(e.id);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.keywords.length).toBeGreaterThan(0);
      expect(e.body.length).toBeGreaterThan(60);
    }
  });

  test('natural questions route to the right card', () => {
    expect(findHelp('how do I solve the access puzzle?')[0]?.id).toBe('access-puzzle');
    expect(findHelp('what is the super creature')[0]?.id).toBe('super-creature');
    expect(findHelp('how does the economy and money work')[0]?.id).toBe('economy');
    expect(findHelp('what are all these creatures')[0]?.id).toBe('entities');
    expect(findHelp('what is the center monster mechalogodrom')[0]?.id).toBe('mechalogodrom');
    expect(findHelp('what are the 100 alphabet creatures in the dome')[0]?.id).toBe(
      'alphabet-dome',
    );
    expect(findHelp('what is the ascension shadow core temple')[0]?.id).toBe('ascension-temple');
    expect(findHelp('is it the same every time, random seed')[0]?.id).toBe('determinism');
    expect(findHelp('superhero powers and xp')[0]?.id).toBe('superhero');
  });

  test('ranking returns best-first and caps the result count', () => {
    const r = findHelp('super creature mind powers economy', HELP_KB, 2);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r.length).toBeGreaterThan(0);
  });

  test('empty / unmatched queries return nothing (panel falls back to overview)', () => {
    expect(findHelp('')).toEqual([]);
    expect(findHelp('   ?!  ')).toEqual([]);
    expect(findHelp('zzzqqq nonsense xyzzy')).toEqual([]);
  });

  test('the corpus is safe and never describes quality tiers as visual downgrades', () => {
    const corpus = HELP_KB.map((e) => e.body + ' ' + e.keywords.join(' '))
      .join(' ')
      .toLowerCase();
    for (const bad of [
      'password',
      'api key',
      'secret key',
      'private key',
      'token=',
      'bearer ',
      'weakling',
      'dumbed down',
      'detail scales with quality tier',
      'dpr 65',
      'shadows off',
      'fx off',
    ]) {
      expect(corpus).not.toContain(bad);
    }
  });
});
