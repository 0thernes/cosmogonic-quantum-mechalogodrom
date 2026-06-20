/**
 * CLASSICAL CONTRAST — REAL classical RNG + entropy contrast vs the Eshkol QRNG.
 *
 * Retires the audit's PROXY_STUB note (honest 0.45): the previous `classicalEntropyGap`
 * was a standard-deviation proxy and the advertised "contrast vs QRNG" was never
 * computed. This version adds (a) a real Murmur3 finalizer avalanche mixer
 * (`mixFast`, the quality step a real `classical_rng` port uses over a bare LCG),
 * (b) a real normalized Shannon entropy over a histogram of samples, and (c) the
 * genuine classical-vs-quantum CONTRAST the module is named for.
 *
 * DETERMINISM (Manhattan): pure integer/float math, NO `Rng`, NO `Date.now`.
 * MIT © tsotchke (classical_rng) — see THIRD-PARTY-NOTICES.md.
 */

/** LCG step (classical_rng style). O(1). */
export function classicalLcgStep(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

/** Murmur3 fmix32 avalanche finalizer — the real bit-mixing classical_rng uses. O(1). */
export function mixFast(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Normalized [0,1] LCG sample. O(1). */
export function classicalSample(state: number): { next: number; value: number } {
  const next = classicalLcgStep(state);
  return { next, value: (next >>> 0) / 0xffffffff };
}

/** Higher-quality sample: LCG advanced, then avalanche-mixed. O(1). */
export function classicalMixSample(state: number): { next: number; value: number } {
  const next = classicalLcgStep(state);
  return { next, value: mixFast(next) / 0xffffffff };
}

/** Normalized Shannon entropy H(p)/log2(bins) ∈ [0,1] of `n` mixed samples from `seed`. O(n). */
export function classicalShannonEntropy(seed: number, n: number): number {
  const lim = Math.max(8, Math.min(256, n | 0));
  const bins = 16;
  const hist = new Array(bins).fill(0) as number[];
  let s = seed >>> 0 || 1;
  for (let i = 0; i < lim; i++) {
    const r = classicalMixSample(s);
    s = r.next;
    const b = Math.min(bins - 1, Math.max(0, Math.floor(r.value * bins)));
    hist[b] = hist[b]! + 1;
  }
  let ent = 0;
  for (const c of hist) {
    if (c > 0) {
      const p = c / lim;
      ent -= p * Math.log2(p);
    }
  }
  const norm = ent / Math.log2(bins);
  return norm < 0 ? 0 : norm > 1 ? 1 : norm;
}

/** Entropy DEFICIT (1 − normalized Shannon) of the classical generator over `n` draws. O(n). */
export function classicalEntropyGap(seed: number, n: number): number {
  return 1 - classicalShannonEntropy(seed, n);
}

/**
 * REAL classical-vs-quantum contrast: how much more uniform the Eshkol QRNG is than
 * the classical generator, mapped to [0,1] (0.5 = parity, >0.5 = quantum more random).
 * `quantumEntropy` is the normalized Shannon entropy reported by the QRNG snapshot.
 */
export function classicalQuantumContrast(seed: number, n: number, quantumEntropy: number): number {
  const c = classicalShannonEntropy(seed, n);
  const q = quantumEntropy < 0 ? 0 : quantumEntropy > 1 ? 1 : quantumEntropy;
  const contrast = 0.5 + 0.5 * (q - c);
  return contrast < 0 ? 0 : contrast > 1 ? 1 : contrast;
}
