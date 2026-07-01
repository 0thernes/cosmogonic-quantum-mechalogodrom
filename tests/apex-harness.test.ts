/**
 * APEX HARNESS tests — the falsifiability instrument (Wave E of the doctrine). These assert the
 * doctrine's two load-bearing claims as MACHINE-CHECKED facts:
 *   • DETERMINISM — same seed + same battery ⇒ identical behaviour hash (the determinism axiom).
 *   • NO DECORATION — ablating EACH of the eleven organs measurably changes behaviour (the kill test:
 *     "if a substrate can be removed with no downstream effect, it was decoration, not biology").
 * Plus: the offworld-dependence proxy is a real ratio in [0,1], and every ablated config is itself
 * reproducible.
 */
import { describe, expect, test } from 'bun:test';
import {
  runTrajectory,
  hashTrajectory,
  behaviorDistance,
  standardBattery,
  harnessReport,
  ALIEN_ORGANS,
  EARTHLY_ORGANS,
} from '../src/sim/apex-harness';
import { APEX_ORGAN_KEYS } from '../src/sim/apex-brain';

const SEED = 0x5eed_1234;

describe('determinism axiom', () => {
  test('same seed + battery ⇒ identical behaviour hash, twice', () => {
    const battery = standardBattery(80);
    const a = hashTrajectory(runTrajectory(SEED, battery));
    const b = hashTrajectory(runTrajectory(SEED, battery));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  test('an empty ablation set reproduces the full-brain baseline exactly', () => {
    const battery = standardBattery(60);
    const full = hashTrajectory(runTrajectory(SEED, battery));
    const emptyAblation = hashTrajectory(runTrajectory(SEED, battery, new Set()));
    expect(emptyAblation).toBe(full);
  });

  test('different seeds ⇒ different behaviour (no degenerate constant output)', () => {
    const battery = standardBattery(60);
    const a = hashTrajectory(runTrajectory(1, battery));
    const b = hashTrajectory(runTrajectory(2, battery));
    expect(a).not.toBe(b);
  });
});

describe('no decoration — every organ is load-bearing (the kill test)', () => {
  const report = harnessReport(SEED, 96);

  test('all eleven organs measurably change behaviour when ablated', () => {
    expect(report.ablations.length).toBe(APEX_ORGAN_KEYS.length);
    for (const a of report.ablations) {
      expect(a.distance).toBeGreaterThan(0); // removing it moved the creature
      expect(a.loadBearing).toBe(true);
    }
    expect(report.loadBearingCount).toBe(APEX_ORGAN_KEYS.length);
    expect(report.allLoadBearing).toBe(true);
  });

  test('every ablated configuration is itself deterministic', () => {
    const battery = standardBattery(70);
    for (const organ of APEX_ORGAN_KEYS) {
      const h1 = hashTrajectory(runTrajectory(SEED, battery, new Set([organ])));
      const h2 = hashTrajectory(runTrajectory(SEED, battery, new Set([organ])));
      expect(h1).toBe(h2);
    }
  });
});

describe('offworld dependence proxy', () => {
  test('the offworld dependence is a real ratio in [0,1] and the alien channels matter', () => {
    const report = harnessReport(SEED, 96);
    expect(report.offworldDependence).toBeGreaterThanOrEqual(0);
    expect(report.offworldDependence).toBeLessThanOrEqual(1);
    // The alien (non-Earth) organs carry genuine behavioural load.
    const battery = standardBattery(96);
    const baseline = runTrajectory(SEED, battery);
    const alienOff = behaviorDistance(
      baseline,
      runTrajectory(SEED, battery, new Set(ALIEN_ORGANS)),
    );
    expect(alienOff).toBeGreaterThan(0);
    const earthOff = behaviorDistance(
      baseline,
      runTrajectory(SEED, battery, new Set(EARTHLY_ORGANS)),
    );
    expect(earthOff).toBeGreaterThan(0);
  });
});

describe('report integrity', () => {
  test('the report is reproducible and well-formed', () => {
    const r1 = harnessReport(SEED, 64);
    const r2 = harnessReport(SEED, 64);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(r1.beats).toBe(64);
    expect(r1.determinismHash).toMatch(/^[0-9a-f]{8}$/);
    // The scientific report embeds the 1-of-1-by-combination rarity matrix.
    expect(r1.rarity.oneOfOneByCombination).toBe(true);
    expect(r1.rarity.apexAxisCount).toBe(8);
  });
});
