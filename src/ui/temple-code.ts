/**
 * TEMPLE CODE (V124) — the DOM-free, unit-tested check behind the trans-dimensional temple access box
 * ({@link ./temple-access}). The password is the anime sigil of adoration, **UwU** — kept here, apart
 * from any DOM, so it can be verified headlessly (mirrors how {@link ./access-code} backs the cipher
 * terminal).
 */

/** The trans-dimensional password: `uwu` (matched case- and whitespace-insensitively). */
export const TEMPLE_PASSWORD = 'uwu';

/**
 * Does `input` crack the trans-dimensional lock? Trims + lowercases, so `UwU`, `uwu`, `UWU`, and
 * surrounding spaces all pass; anything else (empty, `owo`, `uwuu`, non-strings) fails.
 */
export function checkTempleCode(input: unknown): boolean {
  return typeof input === 'string' && input.trim().toLowerCase() === TEMPLE_PASSWORD;
}
