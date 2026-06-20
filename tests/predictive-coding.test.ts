/**
 * predictive-coding.test.ts — behavioral-oracle tests for the REAL hierarchical
 * predictive coder (src/math/predictive-coding.ts). ADR-F stub-honesty: these
 * assert the defining properties of free-energy inference that a placeholder
 * cannot fake — free energy is non-negative, it decreases monotonically under
 * inference (Lyapunov), inference converges to a fixed point, and it recovers
 * the hidden cause that generated a consistent observation.
 */
import { describe, expect, test } from 'bun:test';
import {
  freeEnergy,
  inferStep,
  infer,
  initBeliefs,
  type PCNet,
} from '../src/math/predictive-coding';

// 2-layer linear-Gaussian model: 2 hidden causes → 4 observations.
// Columns of W are orthogonal so the generative mapping is well-conditioned.
const W0 = [
  [1, 0],
  [0, 1],
  [1, 0],
  [0, 1],
];
const NET: PCNet = {
  sizes: [4, 2],
  weights: [W0],
  precisions: [1, 0.1], // strong likelihood, weak prior
  prior: [0, 0],
};
const CAUSE = [1, -1];
const OBS = [1, -1, 1, -1]; // = W0 · CAUSE  (a perfectly explainable observation)

describe('free energy', () => {
  test('is non-negative', () => {
    const b = initBeliefs(NET);
    b[0] = OBS.slice();
    expect(freeEnergy(NET, b, OBS)).toBeGreaterThanOrEqual(0);
  });

  test('decreases monotonically under inference (Lyapunov descent)', () => {
    let b = initBeliefs(NET);
    b[0] = OBS.slice();
    let prev = freeEnergy(NET, b, OBS);
    for (let i = 0; i < 200; i++) {
      b = inferStep(NET, b, OBS, 0.1);
      const F = freeEnergy(NET, b, OBS);
      expect(F).toBeLessThanOrEqual(prev + 1e-12);
      prev = F;
    }
  });
});

describe('inference', () => {
  test('converges to a fixed point', () => {
    const { converged, iters } = infer(NET, OBS, { rate: 0.1 });
    expect(converged).toBe(true);
    expect(iters).toBeGreaterThan(1);
  });

  test('recovers the hidden cause that generated the observation', () => {
    const { beliefs } = infer(NET, OBS, { rate: 0.1, maxIters: 2000, tol: 1e-12 });
    // Analytic fixed point: 2.1·x = Wᵀ·obs = [2,−2] ⇒ x = [0.952…, −0.952…].
    expect(beliefs[1]![0]!).toBeGreaterThan(0.9);
    expect(beliefs[1]![0]!).toBeLessThan(1.0);
    expect(beliefs[1]![1]!).toBeLessThan(-0.9);
    expect(beliefs[1]![1]!).toBeGreaterThan(-1.0);
    // Recovered cause must point the same way as the true cause.
    expect(Math.sign(beliefs[1]![0]!)).toBe(Math.sign(CAUSE[0]!));
    expect(Math.sign(beliefs[1]![1]!)).toBe(Math.sign(CAUSE[1]!));
  });

  test('at the fixed point a further step barely moves the belief', () => {
    const { beliefs } = infer(NET, OBS, { rate: 0.1, maxIters: 3000, tol: 1e-13 });
    const stepped = inferStep(NET, beliefs, OBS, 0.1);
    let drift = 0;
    for (let i = 0; i < stepped[1]!.length; i++) {
      drift = Math.max(drift, Math.abs(stepped[1]![i]! - beliefs[1]![i]!));
    }
    expect(drift).toBeLessThan(1e-4);
  });

  test('deterministic: same observation ⇒ same beliefs', () => {
    const a = infer(NET, OBS, { rate: 0.1 });
    const b = infer(NET, OBS, { rate: 0.1 });
    expect(a.beliefs).toEqual(b.beliefs);
    expect(a.freeEnergy).toBe(b.freeEnergy);
  });
});
