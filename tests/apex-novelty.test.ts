/**
 * APEX NOVELTY ARCHIVE tests — the machine-checked form of Experiment 3 ("Internal Civil War
 * Stability" / open-endedness, Wave E). Assert the ensemble avoids the four doctrine failure modes:
 *   • not a monoculture (distinct behaviours emerge across seeds);
 *   • not frozen (behaviour evolves within a single life);
 *   • bounded (no runaway / NaN);
 *   • reproducible (structured, not unstructured noise — same seeds ⇒ same archive).
 * These are proxies, NOT a capability/sentience claim.
 */
import { describe, expect, test } from 'bun:test';
import { noveltyArchive, noveltyReport } from '../src/sim/apex-novelty';
import { standardBattery } from '../src/sim/apex-harness';

describe('novelty archive', () => {
  test('admits behaviourally-distinct runs and is deterministic', () => {
    const seeds = [1, 2, 3, 4, 5, 6];
    const battery = standardBattery(64);
    const a = noveltyArchive(seeds, battery, 0.02);
    const b = noveltyArchive(seeds, battery, 0.02);
    expect(a.entries.length).toBeGreaterThan(1); // distinct behaviours retained
    expect(a.entries.length).toBeLessThanOrEqual(seeds.length); // bounded by the ensemble
    expect(JSON.stringify(a.entries)).toBe(JSON.stringify(b.entries)); // deterministic
  });

  test('a higher threshold retains no more behaviours than a lower one (monotone admission)', () => {
    const seeds = [10, 20, 30, 40, 50, 60, 70, 80];
    const battery = standardBattery(64);
    const loose = noveltyArchive(seeds, battery, 0.005).entries.length;
    const strict = noveltyArchive(seeds, battery, 0.2).entries.length;
    expect(strict).toBeLessThanOrEqual(loose);
  });
});

describe('open-endedness report (Experiment 3 failure modes)', () => {
  const report = noveltyReport(12, 80);

  test('not a monoculture — distinct behaviours emerge across the ensemble', () => {
    expect(report.notMonoculture).toBe(true);
    expect(report.archiveSize).toBeGreaterThan(1);
    expect(report.meanNearestNeighbor).toBeGreaterThan(0);
  });

  test('not frozen — behaviour evolves within a single life', () => {
    expect(report.notFrozen).toBe(true);
    expect(report.minPlanDiversity).toBeGreaterThanOrEqual(2);
  });

  test('bounded — no runaway self-destruction / NaN', () => {
    expect(report.bounded).toBe(true);
  });

  test('reproducible — structured, not unstructured noise', () => {
    expect(report.reproducible).toBe(true);
    const again = noveltyReport(12, 80);
    expect(JSON.stringify(report)).toBe(JSON.stringify(again));
  });
});
