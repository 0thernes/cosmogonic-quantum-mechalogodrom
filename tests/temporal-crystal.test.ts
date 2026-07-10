/**
 * TEMPORAL CRYSTAL (BRUTALISM 5/9) — deterministic, headless tests for the discrete-time-crystal oscillator
 * now wired live into SuperMind (stepped by arousal each beat, its order re-entering the workspace). Covers
 * seeded determinism, boundedness of every published order parameter, and that the Floquet drive actually
 * advances. step() draws no rng/clock — every result is a pure function of (seed, external-field history).
 * NOT a sentience claim — a functional period-doubling spin dynamics faculty.
 */
import { describe, expect, test } from 'bun:test';
import { TemporalCrystal } from '../src/sim/temporal-crystal';
import { mulberry32 } from '../src/math/rng';

const SEED = 0x7c0a1d;

describe('TemporalCrystal — discrete-time-crystal faculty', () => {
  test('same seed + same drive ⇒ byte-identical snapshot after N steps', () => {
    const a = new TemporalCrystal(mulberry32(SEED));
    const b = new TemporalCrystal(mulberry32(SEED));
    for (let i = 0; i < 64; i++) {
      const drive = Math.sin(i * 0.3) * 0.5 + 0.5;
      a.step(drive);
      b.step(drive);
    }
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.order).toBe(a.order);
    expect(b.phase).toBe(a.phase);
  });

  test('every published order parameter stays in-range over 200 steps', () => {
    const c = new TemporalCrystal(mulberry32(SEED));
    for (let i = 0; i < 200; i++) {
      c.step((i % 7) / 7);
      const s = c.snapshot();
      expect(s.orderParameter).toBeGreaterThanOrEqual(0);
      expect(s.orderParameter).toBeLessThanOrEqual(1);
      expect(s.periodDoublingStrength).toBeGreaterThanOrEqual(0);
      expect(s.periodDoublingStrength).toBeLessThanOrEqual(1);
      expect(s.z2Symmetry).toBeGreaterThanOrEqual(0);
      expect(s.z2Symmetry).toBeLessThanOrEqual(1);
      expect(s.crystalPhase).toBeGreaterThanOrEqual(0);
      expect(s.crystalPhase).toBeLessThanOrEqual(2 * Math.PI);
      expect(Number.isFinite(s.orderParameter)).toBe(true);
      for (const spin of s.spins) expect(Math.abs(spin)).toBeLessThanOrEqual(1);
    }
  });

  test('the Floquet drive actually advances the cycle counter', () => {
    const c = new TemporalCrystal(mulberry32(SEED));
    const before = c.snapshot().floquetCycle;
    c.step(0.5);
    expect(c.snapshot().floquetCycle).toBeGreaterThan(before);
  });

  test('the order parameter is a genuine time-varying oscillator (not a degenerate constant)', () => {
    // A real MBL discrete-time-crystal is RIGID against small drive perturbations (that robustness is the
    // defining physics), so the order does NOT track the external field — but it must still oscillate on its
    // own, otherwise the SuperMind workspace coupling that reads it would be a dead constant.
    const c = new TemporalCrystal(mulberry32(SEED));
    const orders: number[] = [];
    for (let i = 0; i < 40; i++) {
      c.step((i % 7) / 7);
      orders.push(c.order);
    }
    const span = Math.max(...orders) - Math.min(...orders);
    expect(span).toBeGreaterThan(0.005); // genuinely varies beat-to-beat
  });
});
