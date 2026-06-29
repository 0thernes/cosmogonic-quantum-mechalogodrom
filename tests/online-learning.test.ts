/**
 * Online-learning primitives (the Stratum-X gap): bounded, deterministic weight adaptation. Tested
 * headlessly — convergence (LMS reduces error), Hebbian correlation, eligibility-trace delayed credit,
 * boundedness (no divergence), NaN/Inf sealing, and replay determinism (same inputs → same weights).
 */
import { describe, expect, test } from 'bun:test';
import {
  EligibilityLearner,
  deltaRuleUpdate,
  hebbianUpdate,
  weightNorm,
  type LearnConfig,
} from '../src/sim/online-learning';

const CFG: LearnConfig = { rate: 0.1, decay: 0.0, clamp: 8 };
const dot = (a: readonly number[], b: readonly number[]): number =>
  a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

describe('online learning — bounded deterministic adaptation', () => {
  test('LMS delta rule CONVERGES: a linear unit learns a target mapping', () => {
    // Learn w·x ≈ y for a fixed teacher over repeated presentations of 3 patterns.
    const teacher = [1.5, -0.5, 2.0];
    const patterns = [
      [1, 0, 0],
      [0, 1, 0],
      [0.5, 0.5, 1],
    ];
    const w = [0, 0, 0];
    let lastErr = Infinity;
    for (let epoch = 0; epoch < 400; epoch++) {
      let sse = 0;
      for (const x of patterns) {
        const out = dot(w, x);
        const target = dot(teacher, x);
        const err = target - out;
        deltaRuleUpdate(w, x, err, CFG);
        sse += err * err;
      }
      lastErr = sse;
    }
    expect(lastErr).toBeLessThan(1e-3); // it actually learned (weights are no longer frozen)
    for (let i = 0; i < 3; i++) expect(w[i]).toBeCloseTo(teacher[i]!, 1);
  });

  test('weights stay BOUNDED under a relentless one-sided error (no divergence)', () => {
    const w = [0, 0, 0, 0];
    const x = [1, 1, 1, 1];
    const cfg: LearnConfig = { rate: 0.5, decay: 0.01, clamp: 3 };
    for (let i = 0; i < 10_000; i++) deltaRuleUpdate(w, x, 100, cfg); // huge constant error
    for (const wi of w) expect(Math.abs(wi)).toBeLessThanOrEqual(3 + 1e-9); // clamped, never blew up
    expect(Number.isFinite(weightNorm(w))).toBe(true);
  });

  test('NaN / Inf inputs are sealed to 0 (no poison propagates)', () => {
    const w = [0.5, 0.5];
    deltaRuleUpdate(w, [Infinity, NaN], NaN, { rate: 0.1, decay: 0, clamp: 5 });
    for (const wi of w) expect(Number.isFinite(wi)).toBe(true);
  });

  test('Hebbian rule wires co-active units together (positive correlation)', () => {
    const w = [0, 0, 0];
    const pre = [1, 0, 1];
    for (let i = 0; i < 50; i++) hebbianUpdate(w, pre, 1, { rate: 0.05, decay: 0.001, clamp: 5 });
    expect(w[0]!).toBeGreaterThan(0); // co-active with post
    expect(w[2]!).toBeGreaterThan(0);
    expect(Math.abs(w[1]!)).toBeLessThan(1e-6); // silent input stayed unwired
  });

  test('eligibility trace assigns DELAYED credit to recently-active weights', () => {
    const learner = new EligibilityLearner(3, 0.9);
    const w = [0, 0, 0];
    // Activate only input 0 for several steps with zero reward (builds eligibility, no weight change yet).
    for (let i = 0; i < 5; i++) learner.step(w, [1, 0, 0], 0, CFG);
    expect(w[0]).toBe(0); // no reward → no change yet
    // Now a reward arrives with NO current input — only the trace carries the credit.
    learner.step(w, [0, 0, 0], 1, CFG);
    expect(w[0]!).toBeGreaterThan(0); // delayed credit reached the formerly-active weight
    expect(w[1]).toBe(0); // never active → never credited
    learner.reset();
    expect(learner.trace.every((e) => e === 0)).toBe(true);
  });

  test('DETERMINISM: identical inputs produce bit-identical learned weights (replayable)', () => {
    const run = (): number[] => {
      const w = [0.1, -0.2, 0.3];
      const learner = new EligibilityLearner(3, 0.8);
      for (let i = 0; i < 100; i++) {
        deltaRuleUpdate(w, [Math.sin(i), Math.cos(i), 0.5], 0.3 - w[0]!, CFG);
        learner.step(w, [0.2, 0.1, i % 2], (i % 7) - 3, CFG);
      }
      return w;
    };
    expect(run()).toEqual(run()); // same seed/inputs → same cosmos: learning is determinism-safe
  });
});
