/**
 * GATE-RNG-PROVENANCE — the simulation's deterministic RNG substrate is MEASURED, not assumed.
 *
 * The whole sim's reproducibility rests on seeded `mulberry32` streams (Math.random / Date.now are banned in
 * sim logic). Dr. Manhattan's law: "if it is not measured, it is not real." This gate wires the previously-
 * ISOLATED `math/rng-stats` randomness battery (a port of the Tsotchke `quantum_rng` `quantum_stats.c` suite)
 * into a live provenance receipt (`core/rng-provenance.ts`) that the Xenomimic population measures at
 * construction and surfaces through its telemetry, and it proves the instrument is REAL observability:
 *
 *   1. The sim's generator MEASURES high quality (mulberry32 → composite quality > 0.95, entropy → ~8 bits,
 *      serial correlation → ~0, monobit → ~0.5).
 *   2. The instrument DISCRIMINATES — a degenerate stream scores far lower under the SAME battery, so the
 *      number reflects a real property; it cannot be a rubber stamp that would pass anything.
 *   3. The measurement is DETERMINISTIC provenance — the same seed yields a byte-identical receipt.
 *   4. FIDELITY — the value the population surfaces equals a fresh recompute from the receipt's own seed.
 *
 * This grounds instrumentation moving 4.3 -> 4.4 (`scripts/alife-codeground-sensitivity.ts`): `rng-stats.ts`
 * is no longer isolated — it has a live consumer that turns it into surfaced, falsifiable observability.
 * HONESTY: a classical statistical battery over a classical PRNG — a provenance/reproducibility receipt, NOT
 * a physical-entropy or cryptographic-security claim.
 */
import { describe, expect, test } from 'bun:test';
import { measureRngProvenance } from '../src/core/rng-provenance';
import { randomnessReport } from '../src/math/rng-stats';
import { XenomimicPopulation } from '../src/sim/xenomimics';

describe('GATE-RNG-PROVENANCE — the seeded RNG substrate is measured', () => {
  test('the sim generator (mulberry32) MEASURES high randomness quality across seeds', () => {
    for (const seed of [1, 42, 4242, 12345, 999]) {
      const p = measureRngProvenance(seed);
      expect(p.quality).toBeGreaterThan(0.95); // measured ≈0.99
      expect(p.entropy).toBeGreaterThan(7.9); // ≈8 bits for a byte source
      expect(Math.abs(p.serialCorrelation)).toBeLessThan(0.05);
      expect(p.monobit).toBeGreaterThan(0.45);
      expect(p.monobit).toBeLessThan(0.55);
    }
  });

  test('the instrument DISCRIMINATES good from degenerate streams (not a rubber stamp)', () => {
    const good = measureRngProvenance(4242).quality;
    // An all-constant buffer scored by the SAME battery — the pathological control.
    const zerosQ = randomnessReport(new Uint8Array(4096), {
      symbols: 256,
      bins: 256,
      bits: 8,
    }).quality;
    // A low-symbol stream (only four distinct bytes) — also degenerate.
    const low = new Uint8Array(4096);
    for (let i = 0; i < low.length; i++) low[i] = i & 0x03;
    const lowQ = randomnessReport(low, { symbols: 256, bins: 256, bits: 8 }).quality;
    expect(good).toBeGreaterThan(zerosQ + 0.3); // measured gap ≈0.74
    expect(good).toBeGreaterThan(lowQ + 0.3); // measured gap ≈0.57
  });

  test('the measurement is DETERMINISTIC provenance — same seed → identical receipt', () => {
    expect(measureRngProvenance(7)).toEqual(measureRngProvenance(7));
    // The seed genuinely drives the measurement (it is not a constant).
    expect(measureRngProvenance(7).quality).not.toBe(measureRngProvenance(8).quality);
  });

  test('a live population SURFACES its measured provenance with fidelity (reported == recomputed)', () => {
    const pop = new XenomimicPopulation(4242);
    const receipt = pop.rngProvenanceReceipt();
    // The population measured a real, high-quality generator…
    expect(receipt.quality).toBeGreaterThan(0.95);
    // …the receipt is a faithful measurement — recompute from its own recorded seed matches byte-for-byte…
    expect(measureRngProvenance(receipt.seed)).toEqual(receipt);
    // …and telemetry surfaces exactly that measured value (observability with no drift)…
    expect(pop.telemetry().rngQuality).toBe(receipt.quality);
    // …and two populations with the same seed measure identical provenance (reproducible).
    expect(new XenomimicPopulation(4242).telemetry().rngQuality).toBe(pop.telemetry().rngQuality);
  });
});
