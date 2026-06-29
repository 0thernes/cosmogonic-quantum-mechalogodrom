/**
 * Titan vitality lanes (PHILOSOPHY "Real math or no math").
 *
 * `titanVitalLanes` normalizes a titan's raw economy into the two shader lanes that drive its
 * V-TITAN-VITALS body effects — `uEnergy` (stellar-core forge) and `uEntropy` (waste-rot fissures) —
 * so a fed titan blazes a star-core and a wasteful one cracks. Falsifiable claims (property-based, so
 * they hold regardless of the exact RESOURCE_CAP / ENTROPY_WASTE_THRESHOLD constants):
 * - both lanes are finite and within [0,1]; zero in → zero out, huge in → clamps to 1;
 * - monotonic non-decreasing in their respective inputs;
 * - non-finite and negative inputs pack 0 (never NaN).
 */
import { describe, expect, test } from 'bun:test';
import { titanVitalLanes } from '../src/sim/titans';

describe('titanVitalLanes (pure)', () => {
  test('zero economy → zero lanes; huge economy → clamped to 1', () => {
    expect(titanVitalLanes(0, 0)).toEqual({ energyN: 0, entropyN: 0 });
    const big = titanVitalLanes(1e9, 1e9);
    expect(big.energyN).toBe(1);
    expect(big.entropyN).toBe(1);
  });

  test('both lanes always finite and within [0,1]', () => {
    for (const e of [0, 1, 10, 50, 100, 500, 1e6]) {
      for (const s of [0, 1, 5, 20, 100, 1e6]) {
        const { energyN, entropyN } = titanVitalLanes(e, s);
        expect(Number.isFinite(energyN)).toBe(true);
        expect(Number.isFinite(entropyN)).toBe(true);
        expect(energyN).toBeGreaterThanOrEqual(0);
        expect(energyN).toBeLessThanOrEqual(1);
        expect(entropyN).toBeGreaterThanOrEqual(0);
        expect(entropyN).toBeLessThanOrEqual(1);
      }
    }
  });

  test('monotonic non-decreasing in energy and in entropy', () => {
    let prevE = -1;
    for (let e = 0; e <= 400; e += 20) {
      const v = titanVitalLanes(e, 0).energyN;
      expect(v).toBeGreaterThanOrEqual(prevE);
      prevE = v;
    }
    let prevS = -1;
    for (let s = 0; s <= 200; s += 10) {
      const v = titanVitalLanes(0, s).entropyN;
      expect(v).toBeGreaterThanOrEqual(prevS);
      prevS = v;
    }
  });

  test('the lanes genuinely vary below saturation (not constant 0 or 1)', () => {
    // Spawn energy is ~60–80, entropy ~0–10, so mid-range inputs must land strictly inside (0,1).
    const mid = titanVitalLanes(40, 4);
    expect(mid.energyN).toBeGreaterThan(0);
    expect(mid.energyN).toBeLessThan(1);
    expect(mid.entropyN).toBeGreaterThan(0);
    expect(mid.entropyN).toBeLessThan(1);
  });

  test('non-finite and negative inputs pack 0, never NaN', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const v = titanVitalLanes(bad, bad);
      expect(v.energyN).toBe(0);
      expect(v.entropyN).toBe(0);
    }
    const neg = titanVitalLanes(-100, -100);
    expect(neg.energyN).toBe(0);
    expect(neg.entropyN).toBe(0);
  });
});
