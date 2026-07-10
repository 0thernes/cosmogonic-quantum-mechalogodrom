/** Cross-platform numeric contract for the tracked Consciousness/Sentience Lab JSON feeds. */

/**
 * The feeds are scientific indicators, not raw floating-point dumps. Twelve significant digits
 * preserve substantially more precision than the displayed/claimed measurements while absorbing
 * the last-bit libm drift propagated through reductions on Windows and Ubuntu. Keeping this at the
 * serialization boundary leaves the simulation and its in-memory tests unmodified.
 */
export const LAB_DATA_SIGNIFICANT_DIGITS = 12;

export function stabilizeLabNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`lab data contains a non-finite number: ${String(value)}`);
  }
  if (value === 0) return 0; // Canonicalize -0 as well as +0.
  if (Number.isInteger(value)) {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(`lab data contains an unsafe integer: ${String(value)}`);
    }
    return value; // Never round seeds, counters, IDs, or timestamps.
  }
  return Number(value.toPrecision(LAB_DATA_SIGNIFICANT_DIGITS));
}

export function labDataJsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'number' ? stabilizeLabNumber(value) : value;
}
