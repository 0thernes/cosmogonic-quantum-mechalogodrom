/**
 * Golden tests for the moonlab-tensor leaf — proves it now performs REAL
 * SVD-based tensor-network math (entanglement entropy + bond-χ truncation via
 * math/mps-svd.ts), not the old truncated-dot-product stub.
 */
import { describe, expect, test } from 'bun:test';
import {
  moonlabTensorContract,
  moonlabTensorQualia,
  moonlabMpoStep,
  moonlabMpoApply,
  ulgHandoff,
} from '../src/sim/moonlab-tensor';

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

describe('moonlab-tensor: real entanglement-entropy qualia', () => {
  test('rank-1 (product) state ⇒ qualia ≈ 0', () => {
    // [1,1,1,1] → [[1,1],[1,1]], singular values {2,0}, von-Neumann entropy 0
    expect(close(moonlabTensorQualia([1, 1, 1, 1], 4), 0)).toBe(true);
  });

  test('maximally entangled (identity) state ⇒ qualia ≈ 1', () => {
    // [1,0,0,1] → [[1,0],[0,1]], singular values {1,1}, entropy ln2/ln2 = 1
    expect(close(moonlabTensorQualia([1, 0, 0, 1], 4), 1)).toBe(true);
  });

  test('partially entangled state is strictly between 0 and 1', () => {
    const q = moonlabTensorQualia([1, 0, 0, 0.3], 4);
    expect(q > 0 && q < 1).toBe(true);
  });
});

describe('moonlab-tensor: bond-χ contraction + MPO are bounded & deterministic', () => {
  const a = [0.2, 0.5, -0.3, 0.8, 0.1, 0.4, -0.6, 0.7, 0.2];
  const b = [0.9, -0.1, 0.3, 0.5, 0.2, 0.6, 0.0, -0.4, 0.8];

  test('contraction ∈ [0,1] and deterministic', () => {
    const c1 = moonlabTensorContract(a, b, 4, 2);
    const c2 = moonlabTensorContract(a, b, 4, 2);
    expect(c1).toBe(c2);
    expect(c1 >= 0 && c1 <= 1).toBe(true);
  });

  test('larger χ retains at least as much energy as smaller χ', () => {
    const lo = moonlabTensorContract(a, b, 1, 2);
    const hi = moonlabTensorContract(a, b, 3, 2);
    expect(hi >= lo - 1e-9).toBe(true);
  });

  test('MPO step ∈ [0,1] and deterministic', () => {
    const s = new Float32Array(a);
    expect(moonlabMpoStep(s, 2, 4)).toBe(moonlabMpoStep(s, 2, 4));
    expect(moonlabMpoStep(s, 2, 4) >= 0 && moonlabMpoStep(s, 2, 4) <= 1).toBe(true);
  });

  test('MPO apply preserves length and stays in [0,1]', () => {
    const s = new Float32Array(a);
    const out = moonlabMpoApply(s, 2, 4);
    expect(out.length).toBe(s.length);
    for (const v of out) expect(v >= 0 && v <= 1).toBe(true);
  });
});

describe('moonlab-tensor: ulg handoff coupling', () => {
  test('weighted blend, clamped', () => {
    expect(close(ulgHandoff(1, 1), 1)).toBe(true);
    expect(close(ulgHandoff(0, 0), 0)).toBe(true);
    expect(close(ulgHandoff(1, 0), 0.7)).toBe(true);
  });
});
