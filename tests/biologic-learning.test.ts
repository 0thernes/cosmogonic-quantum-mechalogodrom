/**
 * GATE-BIOLOGIC-LEARN — proves the base digital-life population genuinely LEARNS via the exact Eshkol
 * reverse-mode AD tape, not a passive EMA. The honest, non-tuning-dependent claims (gradient ascent on a
 * concave objective): (1) the fitness F(θ) climbs MONOTONICALLY to its analytic plateau ½‖x‖²/reg — a
 * property of gradient ascent, true regardless of constants; (2) ABLATING the gradient (lr = 0) freezes
 * F, so the gradient — not the scaffolding — is what improves fitness. Fully deterministic (exact AD).
 */
import { describe, expect, test } from 'bun:test';
import { biologicLearnStep } from '../src/sim/digital-biologics';

describe('GATE-BIOLOGIC-LEARN: exact-AD gradient ascent on a biologic fitness', () => {
  test('F(θ) climbs monotonically to the analytic plateau ½‖x‖²/reg (optimization, not decay)', () => {
    const inputs = [0.8, 0.4, 0.6];
    const reg = 1;
    const w = [0, 0, 0];
    let prev = -Infinity;
    const fs: number[] = [];
    for (let i = 0; i < 250; i++) {
      const f = biologicLearnStep(w, inputs, 0.1, reg);
      fs.push(f);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12); // monotone non-decreasing (concave F, lr < 2/reg)
      prev = f;
    }
    const plateau = (0.5 * (0.8 ** 2 + 0.4 ** 2 + 0.6 ** 2)) / reg; // = 0.58
    expect(fs[fs.length - 1]!).toBeCloseTo(plateau, 3); // converged to the true optimum
    expect(fs[fs.length - 1]!).toBeGreaterThan(fs[0]! + 0.3); // real improvement from the start
    expect(w[0]!).toBeCloseTo(0.8, 2); // θ* = x/reg — the AD gradient found the optimum
    expect(w[1]!).toBeCloseTo(0.4, 2);
    expect(w[2]!).toBeCloseTo(0.6, 2);
  });

  test('ABLATION: lr = 0 freezes F and the weights (the gradient step is load-bearing)', () => {
    const inputs = [0.8, 0.4, 0.6];
    const w = [0.1, 0.1, 0.1];
    const first = biologicLearnStep(w, inputs, 0, 1);
    let last = first;
    for (let i = 0; i < 250; i++) last = biologicLearnStep(w, inputs, 0, 1);
    expect(last).toBeCloseTo(first, 9); // no improvement without the gradient step
    expect(w).toEqual([0.1, 0.1, 0.1]); // weights untouched
  });

  test('deterministic: identical inputs ⇒ identical learned fitness', () => {
    const run = (): number => {
      const w = [0, 0, 0];
      let f = 0;
      for (let i = 0; i < 50; i++) f = biologicLearnStep(w, [0.5, 0.3, 0.7], 0.1, 1);
      return f;
    };
    expect(run()).toBe(run());
  });
});
