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

describe('moonlab-tensor: de-degeneracy — the retained-energy ratio is state-dependent', () => {
  // These pin the audit fix: keep ≤ d−1 and d ≥ 2 so the Eckart–Young truncation always drops a
  // singular value. Pre-fix `min(chi, d)` kept the full rank whenever chi ≥ d (every production call:
  // chi 3–4 vs a d≤2 matrix), making the ratio a fixed 1 regardless of the inputs — an inert constant.

  test('contract with chi ≥ d is NOT a fixed 1 and varies with the input', () => {
    // Length-4 ⇒ 2×2 product; chi=4 ≥ 2 kept both modes pre-fix ⇒ ratio ≡ 1 for ALL inputs.
    const r1 = moonlabTensorContract([0.9, 0.1, 0.2, 0.05], [0.9, 0.1, 0.2, 0.05], 4);
    const r2 = moonlabTensorContract([0.2, 0.8, 0.6, 0.7], [0.2, 0.8, 0.6, 0.7], 4);
    expect(r1 >= 0 && r1 <= 1).toBe(true);
    expect(r2 >= 0 && r2 <= 1).toBe(true);
    // A genuine truncation (strictly < 1) that differs across inputs ⇒ not a degenerate constant.
    expect(Math.min(r1, r2)).toBeLessThan(1 - 1e-6);
    expect(Math.abs(r1 - r2)).toBeGreaterThan(1e-6);
  });

  test('MPO step on a length-3 input reads BOTH features (a length-2 input is a rank-1 constant)', () => {
    // Same slot[0]; only slot[1] (+ its cross term) changes. Pre-fix a length-3 input reshaped to 1×1
    // (d = ⌊√3⌋ = 1), reading only slot[0] ⇒ identical output. Post-fix (d≥2) both features move it.
    const base = new Float32Array([0.7, 0.3, 0.7 * 0.3]);
    const changed = new Float32Array([0.7, 0.9, 0.7 * 0.9]);
    const r0 = moonlabMpoStep(base, 2);
    const r1 = moonlabMpoStep(changed, 2);
    expect(r0 >= 0 && r0 <= 1).toBe(true);
    expect(Math.abs(r0 - r1)).toBeGreaterThan(1e-6);
  });

  test('a length-2 MPO input stays bounded and deterministic (rank-1 by construction — safe)', () => {
    // We do NOT claim a length-2 input varies (its packed matrix is a rank-1 outer product); we only
    // require it stay in-range and deterministic so the kernel is safe for any legacy 2-vector caller.
    const s = new Float32Array([0.4, 0.6]);
    const v = moonlabMpoStep(s, 2);
    expect(v >= 0 && v <= 1).toBe(true);
    expect(moonlabMpoStep(s, 2)).toBe(v);
  });
});

describe('moonlab-tensor: ulg handoff coupling', () => {
  test('weighted blend, clamped', () => {
    expect(close(ulgHandoff(1, 1), 1)).toBe(true);
    expect(close(ulgHandoff(0, 0), 0)).toBe(true);
    expect(close(ulgHandoff(1, 0), 0.7)).toBe(true);
  });
});
