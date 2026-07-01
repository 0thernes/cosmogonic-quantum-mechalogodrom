/**
 * Leviathan surge (PHILOSOPHY "Real math or no math").
 *
 * `leviathanSurge` maps a colossus's REAL speed (velocity magnitude) to a [0,1] glow/aura surge,
 * replacing the old clock-driven `sin(t)` pulse so a diving/accelerating leviathan blazes and a gliding
 * one dims — a falsifiable readout of its motion, not a metronome. Falsifiable claims:
 * - 0 speed → 0 surge; the scale (0.8) reaches full surge at ~1.25 units/frame, clamps above;
 * - monotonic non-decreasing in speed; finite + within [0,1]; non-finite/negative → 0.
 */
import { describe, expect, test } from 'bun:test';
import { leviathanSurge } from '../src/sim/leviathans';

describe('leviathanSurge (pure)', () => {
  test('zero speed → zero; linear until saturation; clamps at 1', () => {
    expect(leviathanSurge(0)).toBe(0);
    expect(leviathanSurge(0.5)).toBeCloseTo(0.4, 6); // 0.5 × 0.8
    expect(leviathanSurge(1.25)).toBeCloseTo(1, 6); // saturation point
    expect(leviathanSurge(10)).toBe(1); // clamp above
  });

  test('monotonic non-decreasing in speed; always within [0,1]', () => {
    let prev = -1;
    for (let s = 0; s <= 3; s += 0.1) {
      const v = leviathanSurge(s);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });

  test('non-finite and negative speeds → 0, never NaN', () => {
    // NaN / ±Infinity are guarded to 0 by Number.isFinite; a negative speed clamps to 0.
    for (const bad of [NaN, Infinity, -Infinity, -5]) {
      const v = leviathanSurge(bad);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });
});
