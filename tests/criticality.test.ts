/**
 * NEURAL CRITICALITY (V93) — pins the edge-of-chaos homeostat: a silent mind self-excites, a richly
 * active one is held near the critical branching ratio σ̂ ≈ 1, susceptibility peaks at criticality, and
 * the whole controller is deterministic and bounded. Each test is a falsifiable claim (Physicist's law 4).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { Criticality } from '../src/sim/criticality';

const N = 16;
/** A deterministic varied activation vector (≈ a tanh latent), seeded. */
const variedDrive = (rng: () => number): number[] => Array.from({ length: N }, () => rng() * 2 - 1);

describe('Criticality (V93) — the self-organised-criticality homeostat', () => {
  test('same input sequence ⇒ identical homeostat (deterministic)', () => {
    const a = new Criticality();
    const b = new Criticality();
    const ra = mulberry32(7);
    const rb = mulberry32(7);
    for (let i = 0; i < 60; i++) {
      a.step(variedDrive(ra));
      b.step(variedDrive(rb));
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('a SILENT mind self-excites: a quiescent input drives the gain up (homeostatic excitation)', () => {
    const c = new Criticality();
    const quiet = Array.from({ length: N }, () => 0);
    for (let i = 0; i < 40; i++) c.step(quiet);
    expect(c.snapshot().gain).toBeGreaterThan(1); // the controller raises gain to wake a silent network
    expect(c.branching).toBeLessThan(1); // and reads itself as subcritical
  });

  test('a richly active mind is held NEAR criticality (σ̂ ≈ 1) by the homeostat', () => {
    const c = new Criticality();
    const r = mulberry32(11);
    for (let i = 0; i < 200; i++) c.step(variedDrive(r));
    const s = c.snapshot();
    expect(s.distanceToCritical).toBeLessThan(0.3); // stationary varied drive ⇒ branching ratio ≈ 1
    expect(s.proximity).toBeGreaterThan(0.6);
    expect(s.gain).toBeGreaterThanOrEqual(0.25);
    expect(s.gain).toBeLessThanOrEqual(4);
  });

  test('susceptibility PEAKS at criticality (max dynamic range there, low when far)', () => {
    const near = new Criticality();
    const rn = mulberry32(3);
    for (let i = 0; i < 200; i++) near.step(variedDrive(rn)); // converges to σ̂ ≈ 1
    const far = new Criticality();
    for (let i = 0; i < 40; i++) far.step(Array.from({ length: N }, () => 0)); // pushed subcritical (σ̂ → 0)
    expect(near.snapshot().susceptibility).toBeGreaterThan(far.snapshot().susceptibility);
  });

  test('bounded + NaN-free across a long, non-stationary run', () => {
    const c = new Criticality();
    for (let i = 0; i < 400; i++) {
      // a drifting drive (amplitude swells and collapses) to stress the controller
      const amp = 0.5 + 0.5 * Math.sin(i * 0.05);
      c.step(Array.from({ length: N }, (_, k) => amp * Math.sin(i * 0.1 + k)));
      const s = c.snapshot();
      expect(Number.isFinite(s.branching + s.gain + s.susceptibility)).toBe(true);
      expect(s.proximity).toBeGreaterThanOrEqual(0);
      expect(s.proximity).toBeLessThanOrEqual(1);
      expect(s.gain).toBeGreaterThanOrEqual(0.25);
      expect(s.gain).toBeLessThanOrEqual(4);
      expect(s.activeFraction).toBeGreaterThanOrEqual(0);
      expect(s.activeFraction).toBeLessThanOrEqual(1);
    }
  });
});
