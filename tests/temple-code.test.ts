/**
 * TEMPLE CODE — the DOM-free check behind the trans-dimensional temple access box. Falsifiable claims:
 * - the password is exactly the anime sigil `uwu`;
 * - it accepts case + surrounding-whitespace variants (`UwU`, `  uwu `, `UWU`);
 * - it rejects everything else, including near-misses (`owo`, `uwuu`, ``) and non-strings.
 */
import { describe, expect, test } from 'bun:test';
import { checkTempleCode, TEMPLE_PASSWORD } from '../src/ui/temple-code';

describe('temple access code (UwU)', () => {
  test('the password is the lowercase anime sigil', () => {
    expect(TEMPLE_PASSWORD).toBe('uwu');
  });

  test('accepts UwU in any case, trimmed of stray whitespace', () => {
    for (const ok of ['UwU', 'uwu', 'UWU', '  uwu', 'uwu  ', '  UwU  ', '\tUwU\n']) {
      expect(checkTempleCode(ok)).toBe(true);
    }
  });

  test('rejects near-misses, empties, and non-strings', () => {
    for (const bad of ['owo', 'uwuu', 'uw u', 'u w u', 'uvu', '', ' ', 'UwU!', 'password']) {
      expect(checkTempleCode(bad)).toBe(false);
    }
    for (const bad of [undefined, null, 42, {}, ['uwu']]) {
      expect(checkTempleCode(bad)).toBe(false);
    }
  });
});
