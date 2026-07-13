/**
 * rng-provenance.ts — a MEASURED provenance receipt for the sim's deterministic RNG substrate.
 *
 * The whole simulation's reproducibility rests on seeded `mulberry32` streams (Math.random / Date.now are
 * banned in sim logic). Dr. Manhattan's law: "if it is not measured, it is not real" — so the quality of
 * that substrate should not be ASSUMED, it should be MEASURED. This module is the first live consumer of the
 * otherwise-isolated `math/rng-stats` battery (a port of the Tsotchke `quantum_rng` `quantum_stats.c` suite):
 * it materialises a fixed sample of a seeded generator and runs the real randomness battery over it, yielding
 * a bounded provenance receipt a running system can surface and a gate can falsify.
 *
 * It measures a DEDICATED sample of the generator (a fresh `mulberry32` instance at the given seed), so it
 * never consumes or perturbs any live simulation stream — the receipt is a faithful, reproducible statement
 * about the generator at that seed, not a tap on the live draws. DETERMINISM: pure — the sampling generator
 * and the battery are both seed-pure with no `Math.random` / `Date.now`; the same seed always yields the same
 * receipt, bit for bit.
 */
import { mulberry32 } from '../math/rng';
import { randomnessReport } from '../math/rng-stats';

/** A bounded, reproducible measurement of a seeded generator's statistical quality. */
export interface RngProvenance {
  /** The exact 32-bit seed the sampled `mulberry32` generator was measured at (recompute → same receipt). */
  seed: number;
  /** Number of byte draws the battery was run over. */
  samples: number;
  /** rng-stats composite quality in [0,1] — mean of entropy / monobit / serial-corr / Hamming-flow scores. */
  quality: number;
  /** Shannon entropy of the byte stream in bits (→ 8 for an ideal byte source). */
  entropy: number;
  /** Lag-1 serial correlation (→ 0 for an ideal source). */
  serialCorrelation: number;
  /** NIST monobit frequency (→ 0.5 for an ideal source). */
  monobit: number;
}

/** Default battery sample size — enough for a stable byte-histogram (256 bins) without construction cost. */
export const RNG_PROVENANCE_SAMPLES = 4096;

/**
 * Measure the statistical quality of the `mulberry32` generator at `seed` by running the {@link randomnessReport}
 * battery over {@link RNG_PROVENANCE_SAMPLES} (or `samples`) byte draws. Pure + deterministic; uses its own
 * generator instance so it never disturbs a live stream. The returned receipt carries its own `seed`, so a
 * verifier can recompute `measureRngProvenance(receipt.seed)` and assert byte-identical fidelity.
 */
export function measureRngProvenance(
  seed: number,
  samples = RNG_PROVENANCE_SAMPLES,
): RngProvenance {
  const s = seed >>> 0 || 1;
  const rng = mulberry32(s);
  const buf = new Uint8Array(samples);
  for (let i = 0; i < samples; i++) buf[i] = Math.floor(rng() * 256) & 0xff;
  const r = randomnessReport(buf, { symbols: 256, bins: 256, bits: 8 });
  return {
    seed: s,
    samples,
    quality: r.quality,
    entropy: r.entropy,
    serialCorrelation: r.serialCorrelation,
    monobit: r.monobit,
  };
}
