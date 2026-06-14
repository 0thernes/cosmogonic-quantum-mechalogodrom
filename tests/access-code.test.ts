/**
 * ACCESS CODE (V34) — the cryptographic puzzle's pure solve logic. Pins the Roman mapping, the seed
 * reading, and that the checker accepts both intended solutions while rejecting everything else.
 */
import { describe, expect, test } from 'bun:test';
import { ACCESS_SEED, toRoman, seedRomans, checkAccessCode } from '../src/ui/access-code';

describe('access code', () => {
  test('digits map to Roman numerals I–X (line-count logic, up to X)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(toRoman)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
    ]);
    expect(toRoman(0)).toBe('N'); // the medieval nulla
  });

  test('the seed reads as ten Roman line-counts', () => {
    const romans = seedRomans();
    expect(romans).toHaveLength(ACCESS_SEED.length);
    expect(romans).toEqual(['III', 'IV', 'V', 'V', 'IV', 'V', 'VI', 'VII', 'V', 'IV']);
  });

  test('the checker accepts the Roman reading in any spacing/case', () => {
    expect(checkAccessCode('III IV V V IV V VI VII V IV')).toBe(true);
    expect(checkAccessCode('iiiivvvivvvivii viv'.toUpperCase())).toBe(true);
    expect(checkAccessCode('III-IV-V-V-IV-V-VI-VII-V-IV')).toBe(true);
    expect(checkAccessCode('IIIIVVVIVVVIVIIVIV')).toBe(true); // fully run together
  });

  test('the checker also accepts the raw seed digits (kinder fallback)', () => {
    expect(checkAccessCode('3455456754')).toBe(true);
    expect(checkAccessCode('3 4 5 5 4 5 6 7 5 4')).toBe(true);
  });

  test('it rejects wrong codes, partials, and empty input', () => {
    expect(checkAccessCode('')).toBe(false);
    expect(checkAccessCode('   ')).toBe(false);
    expect(checkAccessCode('1234567890')).toBe(false);
    expect(checkAccessCode('III IV V')).toBe(false); // partial
    expect(checkAccessCode('SPQR')).toBe(false);
    expect(checkAccessCode('3455456755')).toBe(false); // one digit off
  });
});
