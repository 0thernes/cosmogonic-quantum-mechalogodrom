/**
 * Cross-platform numeric identity law for Phase-B development evidence.
 *
 * The simulations still execute with ordinary IEEE-754 doubles. At the evidence boundary, every
 * finite non-integer number is rounded to an absolute 1e-6 quantum before it can enter a returned
 * row, a derived statistic, a gate decision, a digest, or a rendered artifact. This quantum is
 * four orders of magnitude finer than the smallest non-zero temporal gate threshold (0.01). Every
 * observed metric in the sealed result is also more than one quantum from its own comparison boundary,
 * including the strict zero bootstrap boundary, so canonicalization did not change this sealed verdict.
 * A future near-threshold result must establish that property again rather than inherit it.
 */

export const PHASE_B_EVIDENCE_PRECISION_LAW = Object.freeze({
  id: 'phase-b-fixed-decimal-1e-6-v1',
  decimalPlaces: 6,
  absoluteQuantum: 1e-6,
  rawComputation: 'ieee-754-binary64',
  boundary: 'before-returned-rows-derived-statistics-gates-digests-json-csv-and-svg',
} as const);

/** Canonicalize one finite evidence number under the Phase-B fixed-decimal law. */
export function canonicalizePhaseBEvidenceNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('Phase-B evidence precision law rejects non-finite numbers');
  }
  if (Object.is(value, -0)) return 0;
  if (Number.isSafeInteger(value)) return value;
  const canonical = Number(value.toFixed(PHASE_B_EVIDENCE_PRECISION_LAW.decimalPlaces));
  return Object.is(canonical, -0) ? 0 : canonical;
}

/**
 * Return a JSON-shaped deep copy whose numeric leaves obey the Phase-B evidence precision law.
 * The generic return preserves the caller's readonly/literal TypeScript surface.
 */
export function canonicalizePhaseBEvidence<T>(value: T): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return canonicalizePhaseBEvidenceNumber(value) as T;
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizePhaseBEvidence(entry)) as T;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, canonicalizePhaseBEvidence(entry)]),
    ) as T;
  }
  throw new TypeError(`Phase-B evidence precision law rejects ${typeof value}`);
}
