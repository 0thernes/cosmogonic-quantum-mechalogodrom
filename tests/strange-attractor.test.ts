/**
 * STRANGE ATTRACTOR (BRUTALISM) — deterministic, headless tests for the tri-attractor chaos field now wired
 * live into SuperMind (stepped by arousal each beat, its chaos index lifting curiosity). Three coupled
 * strange attractors (Lorenz / Rössler / Rabinovich) integrated by RK4, with a self-tuning Lorenz sigma.
 * step() draws no rng/clock and the constructor is seedless, so every result is a pure function of the
 * external-drive history. NOT a sentience claim — a functional deterministic-chaos faculty.
 */
import { describe, expect, test } from 'bun:test';
import { StrangeAttractor } from '../src/sim/strange-attractor';

describe('StrangeAttractor — tri-attractor chaos faculty', () => {
  test('seedless + deterministic: identical drive history ⇒ byte-identical snapshot', () => {
    const a = new StrangeAttractor();
    const b = new StrangeAttractor();
    for (let i = 0; i < 80; i++) {
      const drive = (Math.sin(i * 0.21) + 1) / 2;
      a.step(drive);
      b.step(drive);
    }
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(b.chaos).toBe(a.chaos);
  });

  test('every published index stays in [0,1] and finite over 300 steps', () => {
    const c = new StrangeAttractor();
    for (let i = 0; i < 300; i++) {
      c.step((i % 5) / 5);
      const s = c.snapshot();
      for (const v of [s.chaosIndex, s.phaseCoherence, s.lyapunovProxy]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(Number.isFinite(v)).toBe(true);
      }
      for (const vec of [s.lorenz, s.rossler, s.rabinovich]) {
        expect(Number.isFinite(vec.x)).toBe(true);
        expect(Number.isFinite(vec.y)).toBe(true);
        expect(Number.isFinite(vec.z)).toBe(true);
      }
      const bias = c.cognitiveBias();
      expect(bias).toHaveLength(8);
      for (const b of bias) expect(b).toBeGreaterThanOrEqual(0);
    }
  });

  test('the external drive is load-bearing (distinct drives ⇒ distinct chaos)', () => {
    // Unlike the drive-RIGID discrete-time crystal, the attractor drive tunes sigma + phase coherence, so
    // different drive histories must produce different chaos — this is what makes the curiosity coupling real.
    const lo = new StrangeAttractor();
    const hi = new StrangeAttractor();
    for (let i = 0; i < 120; i++) {
      lo.step(0.05);
      hi.step(0.95);
    }
    expect(hi.chaos).not.toBe(lo.chaos);
  });

  test('the chaos index genuinely varies over time (not a degenerate constant)', () => {
    const c = new StrangeAttractor();
    const idx: number[] = [];
    for (let i = 0; i < 60; i++) {
      c.step(0.5);
      idx.push(c.chaos);
    }
    expect(Math.max(...idx) - Math.min(...idx)).toBeGreaterThan(0.01);
  });
});
