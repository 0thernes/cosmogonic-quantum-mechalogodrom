/**
 * hopfield.test.ts — behavioral-oracle tests for the REAL Hopfield associative
 * memory (src/math/hopfield.ts). ADR-F stub-honesty: these assert the defining
 * properties of an attractor memory that a placeholder cannot fake — symmetric
 * zero-diagonal weights, stored patterns as exact fixed points, energy as a
 * Lyapunov function (never increases under async descent), error-correcting
 * recall from a corrupted probe, convergence, and determinism.
 */
import { describe, expect, test } from 'bun:test';
import {
  storeHebbian,
  stepSync,
  recall,
  energy,
  overlap,
  localField,
  type HopfieldNet,
} from '../src/math/hopfield';

// Three mutually orthogonal (Walsh) bipolar patterns over n = 8 (P = 3 < n ⇒ exact fixed points).
const XI1 = [1, 1, 1, 1, 1, 1, 1, 1];
const XI2 = [1, -1, 1, -1, 1, -1, 1, -1];
const XI3 = [1, 1, -1, -1, 1, 1, -1, -1];
const PATTERNS = [XI1, XI2, XI3];

function net(): HopfieldNet {
  return storeHebbian(PATTERNS);
}

describe('Hebbian storage', () => {
  test('weight matrix is symmetric with zero diagonal', () => {
    const { n, W } = net();
    for (let i = 0; i < n; i++) {
      expect(W[i * n + i]).toBe(0);
      for (let j = 0; j < n; j++) {
        expect(Math.abs(W[i * n + j]! - W[j * n + i]!)).toBeLessThan(1e-12);
      }
    }
  });
});

describe('attractor dynamics', () => {
  test('every stored pattern is an exact fixed point (sync update returns it)', () => {
    const h = net();
    for (const xi of PATTERNS) {
      expect(stepSync(h, xi)).toEqual(xi);
    }
  });

  test('stored patterns sit at a local energy minimum (any single flip raises E)', () => {
    const h = net();
    for (const xi of PATTERNS) {
      const e0 = energy(h, xi);
      for (let i = 0; i < xi.length; i++) {
        const flipped = xi.slice();
        flipped[i] = -flipped[i]!;
        expect(energy(h, flipped)).toBeGreaterThan(e0 - 1e-12);
      }
    }
  });

  test('energy is a Lyapunov function: recall never increases it', () => {
    const h = net();
    const probe = [-1, -1, 1, -1, 1, -1, 1, -1]; // XI2 with bit 0 corrupted
    const e0 = energy(h, probe);
    const { state } = recall(h, probe);
    expect(energy(h, state)).toBeLessThanOrEqual(e0 + 1e-12);
  });
});

describe('error-correcting recall', () => {
  test('a one-bit-corrupted probe is cleaned to the stored pattern', () => {
    const h = net();
    const probe = XI3.slice();
    probe[2] = -probe[2]!; // flip one bit
    const { state, converged } = recall(h, probe);
    expect(converged).toBe(true);
    expect(overlap(state, XI3)).toBeCloseTo(1, 10);
  });

  test('deep-basin recall: a single stored pattern is recovered from heavy (3-bit) corruption', () => {
    // With one stored pattern the basin is the whole majority half-space, so a
    // probe that is still >half aligned must converge back to it exactly.
    const h = storeHebbian([XI3]);
    const probe = XI3.slice();
    probe[0] = -probe[0]!;
    probe[3] = -probe[3]!;
    probe[5] = -probe[5]!; // 3 of 8 flipped ⇒ overlap +0.25, still in basin
    const { state, converged } = recall(h, probe);
    expect(converged).toBe(true);
    expect(overlap(state, XI3)).toBeCloseTo(1, 10);
  });

  test('recall converges to a fixed point (localField sign-aligned with state)', () => {
    const h = net();
    const { state, converged } = recall(h, [1, -1, -1, 1, -1, 1, 1, -1]);
    expect(converged).toBe(true);
    for (let i = 0; i < state.length; i++) {
      const fld = localField(h, state, i);
      if (Math.abs(fld) > 1e-9) expect(Math.sign(fld)).toBe(state[i]!);
    }
  });

  test('deterministic: same probe ⇒ same attractor', () => {
    const h = net();
    const probe = [1, 1, 1, -1, -1, -1, 1, 1];
    expect(recall(h, probe).state).toEqual(recall(h, probe).state);
  });
});
