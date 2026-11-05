/**
 * Parse a `?seed=` URL value into a uint32 seed (audit #303). Accepts hex (`0x1F`, `0X1f`) or
 * decimal (`12345`). Returns null when the value is absent, empty, or not a finite integer, so the
 * caller can fall back to its time-based seed.
 */
export function parseSeedParam(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const v = raw.trim();
  if (v.length === 0) return null;
  let n: number;
  if (/^0x[0-9a-f]+$/i.test(v)) {
    const hex = v.slice(2);
    if (!Number.isFinite(Number.parseInt(hex, 16))) return null;
    // Slice to the low 8 hex digits (32 bits) before parseInt so >53-bit hex literals
    // do not suffer IEEE-754 float rounding before `>>> 0` truncation.
    n = Number.parseInt(hex.slice(-8), 16);
  } else if (/^\d+$/.test(v)) {
    n = Number(v);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  return n >>> 0;
}
