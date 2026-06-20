/**
 * CLASSICAL CONTRAST — PRNG baseline from Tsotchke mirrors/classical_rng.
 * Measures entropy gap vs Eshkol QRNG (consciousness substrate contrast, not LLM).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** LCG step (classical_rng style). O(1). */
export function classicalLcgStep(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

/** Normalized [0,1] sample from LCG. O(1). */
export function classicalSample(state: number): { next: number; value: number } {
  const next = classicalLcgStep(state);
  return { next, value: (next >>> 0) / 0xffffffff };
}

/** Bit entropy proxy over n LCG draws vs uniform. O(n), n small. */
export function classicalEntropyGap(seed: number, n: number): number {
  let s = seed >>> 0 || 1;
  let sum = 0;
  const lim = Math.max(4, Math.min(32, n | 0));
  for (let i = 0; i < lim; i++) {
    const r = classicalSample(s);
    s = r.next;
    sum += r.value;
  }
  const mean = sum / lim;
  let varAcc = 0;
  s = seed >>> 0 || 1;
  for (let i = 0; i < lim; i++) {
    const r = classicalSample(s);
    s = r.next;
    const d = r.value - mean;
    varAcc += d * d;
  }
  return Math.max(0, Math.min(1, Math.sqrt(varAcc / lim) * 2));
}
