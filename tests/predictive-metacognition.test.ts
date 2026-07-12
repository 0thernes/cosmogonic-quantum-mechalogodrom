/**
 * GATE-PREDICTIVE-METACOG — proves the predictive-metacognition faculty
 * (`sim/predictive-metacognition.ts`) is real, exact, and operational, not decoration:
 *
 *   1. EXACT ARBITRARY-ORDER: fitting a known quartic reproduces its 0th–4th derivatives EXACTLY — the
 *      Eshkol v1.3 arbitrary-order Taylor extraction is correct, not a finite-difference approximation.
 *   2. HONEST REMAINDER: a trajectory a low-order model already fits (linear, cubic) reports remainder 0
 *      and full confidence; a volatile one reports positive remainder and reduced confidence.
 *   3. MONOTONE: stronger volatility ⇒ strictly lower confidence.
 *   4. OPERATIONAL: a low predictive-confidence DAMPS the VQE resolver's decisionCoherence under a real
 *      drive conflict — the two faculties are coupled, and the coupling is causal.
 *   5. HONEST NO-OP + DETERMINISTIC: confidence defaults to 1 (byte-identical resolver output); warmup is
 *      full-confidence; bounded; identical inputs ⇒ identical bytes.
 */
import { describe, expect, test } from 'bun:test';
import { PredictiveMetacognition } from '../src/sim/predictive-metacognition';
import { VqeDriveResolver, type DriveVector } from '../src/sim/vqe-drive-resolver';

/** Step an oldest-first series through the faculty, resolving every frame. */
function fit(order: number, oldestFirst: number[]): PredictiveMetacognition {
  const m = new PredictiveMetacognition({ order, cadenceFrames: 1 });
  oldestFirst.forEach((v, i) => m.step(v, i, true));
  return m;
}

describe('GATE-PREDICTIVE-METACOG: arbitrary-order Taylor confidence, wired to the resolver', () => {
  test('EXACT ARBITRARY-ORDER: recovers a known quartic derivatives 0..4 exactly', () => {
    const p = (t: number): number => 2 + 0.5 * t - 0.3 * t * t + 0.1 * t ** 3 - 0.05 * t ** 4;
    const m = fit(4, [-4, -3, -2, -1, 0].map(p));
    expect(m.derivative(0)).toBeCloseTo(2, 9); // p(0)
    expect(m.derivative(1)).toBeCloseTo(0.5, 9); // p'(0)
    expect(m.derivative(2)).toBeCloseTo(-0.6, 9); // p''(0)
    expect(m.derivative(3)).toBeCloseTo(0.6, 9); // p'''(0)
    expect(m.derivative(4)).toBeCloseTo(-1.2, 9); // p''''(0)
    // The remainder is exactly |c4| = 0.05 (the leading Taylor coefficient of the quartic).
    expect(m.signal.remainder).toBeCloseTo(0.05, 9);
  });

  test('HONEST REMAINDER: linear and cubic ⇒ remainder 0 / confidence 1', () => {
    const linear = fit(4, [0.2, 0.3, 0.4, 0.5, 0.6]);
    // A line has no high-order structure: remainder is float-noise-negligible, confidence rounds to 1.
    expect(linear.signal.remainder).toBeLessThan(1e-9);
    expect(linear.signal.predictiveConfidence).toBeGreaterThan(1 - 1e-9);
    const cubic = fit(
      4,
      [-2, -1, 0, 1, 2].map((t) => 0.5 + 0.05 * t + 0.01 * t ** 3),
    );
    // A cubic is captured below order 4: its 4th-order remainder is numerically negligible.
    expect(cubic.signal.remainder).toBeLessThan(1e-6);
    expect(cubic.signal.predictiveConfidence).toBeGreaterThan(1 - 1e-5);
  });

  test('HONEST REMAINDER: a volatile trajectory ⇒ positive remainder / confidence < 1', () => {
    const osc = fit(4, [0.1, 0.9, 0.1, 0.9, 0.1]);
    expect(osc.signal.remainder).toBeGreaterThan(0.1);
    expect(osc.signal.predictiveConfidence).toBeLessThan(0.8);
    expect(osc.signal.predictiveConfidence).toBeGreaterThan(0);
  });

  test('MONOTONE: stronger volatility ⇒ strictly lower confidence', () => {
    const mild = fit(4, [0.5, 0.55, 0.5, 0.55, 0.5]);
    const strong = fit(4, [0.2, 0.85, 0.15, 0.9, 0.1]);
    expect(strong.signal.predictiveConfidence).toBeLessThan(mild.signal.predictiveConfidence);
  });

  test('WARMUP + BOUNDED: full confidence before enough history; forecast/confidence bounded', () => {
    const m = new PredictiveMetacognition({ order: 4, cadenceFrames: 1 });
    for (let i = 0; i < 3; i++) {
      const s = m.step(0.3 + 0.1 * i, i, true);
      expect(s.predictiveConfidence).toBe(1); // not enough samples yet
      expect(s.remainder).toBe(0);
    }
    const full = m.step(0.9, 4, true);
    expect(full.forecast).toBeGreaterThanOrEqual(0);
    expect(full.forecast).toBeLessThanOrEqual(1);
    expect(full.predictiveConfidence).toBeGreaterThan(0);
    expect(full.predictiveConfidence).toBeLessThanOrEqual(1);
  });

  test('DETERMINISTIC: identical series ⇒ byte-identical signal', () => {
    const s = [0.11, 0.42, 0.27, 0.63, 0.38];
    const a = fit(4, s).signal;
    const b = fit(4, s).signal;
    expect(a.forecast).toBe(b.forecast);
    expect(a.remainder).toBe(b.remainder);
    expect(a.predictiveConfidence).toBe(b.predictiveConfidence);
  });

  test('OPERATIONAL: low confidence damps the resolver decisionCoherence (causal coupling)', () => {
    // A real drive conflict so decisionCoherence > 0 at full confidence.
    const drives: DriveVector = { resource: 0.2, threat: 0.95, exploration: 0.7, social: 0.15 };
    const full = new VqeDriveResolver().step(drives, 0, true, 1); // trusted world
    const damped = new VqeDriveResolver().step(drives, 0, true, 0.5); // volatile world

    expect(full.decisionCoherence).toBeGreaterThan(0);
    // Half the confidence ⇒ half the coherence (the commits/actionBias themselves are unchanged).
    expect(damped.decisionCoherence).toBeCloseTo(full.decisionCoherence * 0.5, 9);
    expect(damped.exploreCommit).toBe(full.exploreCommit);
    // Default confidence (3-arg call) is byte-identical to explicit 1 — a true no-op.
    const legacy = new VqeDriveResolver().step(drives, 0, true);
    expect(legacy.decisionCoherence).toBe(full.decisionCoherence);
  });
});
