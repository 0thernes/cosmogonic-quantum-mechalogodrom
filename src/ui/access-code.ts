/**
 * ACCESS CODE — the pure, testable heart of the cryptographic access puzzle (V34). "Only the Romans
 * know": the hidden answer is the seed **3455456754** read as ten line-counts, each spoken as a Roman
 * numeral (I–X). The GUI ([access-puzzle.ts](./access-puzzle.ts)) renders the shimmering cipher — ten
 * lines whose tally-mark counts ARE the seed digits — and this DOM-free module owns the numeral math +
 * the answer check, so the puzzle is unit-tested independently of the browser. Deterministic; no rng.
 */

/** The fixed access seed (directive: "Code seed: 3455456754"). Ten digits, each 1–7 → all ≤ X. */
export const ACCESS_SEED = '3455456754';

// 0..10 → Roman; 0 is the medieval `N` (nulla). The seed has no 0, so N never appears in the answer.
const ROMAN = ['N', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

/** A single line-count 0..10 → its Roman numeral. Out-of-range → ''. */
export function toRoman(n: number): string {
  return ROMAN[n] ?? '';
}

/** The seed's digits as Roman numerals — one per cipher line (the canonical reading order). */
export function seedRomans(seed: string = ACCESS_SEED): string[] {
  return seed.split('').map((d) => toRoman(Number(d)));
}

/** Keep only A–Z / 0–9, uppercased — so spacing, case, and punctuation never matter to the check. */
function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Is `input` the access code? Accepts EITHER the raw seed digits (`3455456754`) OR the ten line-counts
 * spoken in Roman (`III IV V V IV V VI VII V IV` → `IIIIVVVIVVVIVIIVIV`), in any spacing/case. The
 * Roman reading is the intended "only the Romans know" solution; the digit form is a kinder fallback.
 */
export function checkAccessCode(input: string, seed: string = ACCESS_SEED): boolean {
  const n = normalize(input);
  if (n.length === 0) return false;
  if (n === seed) return true; // the line-counts themselves, as digits
  return n === seedRomans(seed).join(''); // the line-counts spoken in the old tongue
}
