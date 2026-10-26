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
  if (/^0x[0-9a-f]+$/i.test(v)) n = Number.parseInt(v.slice(2), 16);
  else if (/^\d+$/.test(v)) n = Number(v);
  else return null;
  if (!Number.isFinite(n)) return null;
  return n >>> 0;
}
