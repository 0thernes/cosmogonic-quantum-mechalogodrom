import { describe, expect, test } from 'bun:test';
import { moonlabTensorQualia, moonlabMpoStep, moonlabMpoApply } from '../src/sim/moonlab-tensor';
import {
  type Mat,
  mat,
  matMul,
  svd,
  lowRankApprox,
  frobenius,
  MPS_MAX_DIM,
} from '../src/math/mps-svd';
import { clamp } from '../src/math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

// Pre-pooling forms (fresh matrices and svd()/lowRankApprox() per call), verbatim.
function squareSide(len: number): number {
  let d = Math.floor(Math.sqrt(Math.max(0, len)));
  if (d < 1) d = 1;
  return d > MPS_MAX_DIM ? MPS_MAX_DIM : d;
}

function packMatrix(a: ArrayLike<number>, rows: number, cols: number): Mat {
  const m = mat(rows, cols);
  const lim = rows * cols;
  for (let k = 0; k < lim; k++) m.data[k] = a[k] ?? 0;
  return m;
}

function transferOperator(d: number, bond: number): Mat {
  const t = mat(d, d);
  const w = 1 / (Math.max(1, bond) + 1);
  for (let i = 0; i < d; i++) {
    t.data[i * d + i] = 0.5;
    if (i > 0) t.data[i * d + (i - 1)] = w;
    if (i < d - 1) t.data[i * d + (i + 1)] = w;
  }
  return t;
}

function liftShortVector(v: ArrayLike<number>): ArrayLike<number> {
  if (v.length !== 3) return v;
  const v0 = v[0] ?? 0;
  const v1 = v[1] ?? 0;
  const v2 = v[2] ?? 0;
  return [
    v0,
    v1 - v0 * 0.5,
    v2 - v1 * 0.5,
    v1,
    v2,
    v0 - v2 * 0.5,
    v2,
    v0 - v1 * 0.5,
    v1 - v2 * 0.5,
  ];
}

function refQualia(v: ArrayLike<number>, chi: number): number {
  const lifted = liftShortVector(v);
  // Pack into at least a 2x2 (packMatrix zero-pads) so length-3 inputs form a real [[v0,v1],[v2,0]]
  // and yield genuine entropy. The old `if (d < 2) return 0` made every length-<4 call return 0 — and
  // all 5 production call sites pass length-3 arrays, so the 'qualia tensor' coupling was inert (always
  // 0), violating "real math under every effect" (audit). The all-zero case is still caught by the
  // `total <= 1e-12` guard below.
  const d = Math.max(2, squareSide(lifted.length));
  const k = Math.max(2, Math.min(chi || 4, d));
  const { S } = svd(packMatrix(lifted, d, d));
  let total = 0;
  for (let i = 0; i < k; i++) total += S[i]! * S[i]!;
  if (total <= 1e-12) return 0;
  let entropy = 0;
  for (let i = 0; i < k; i++) {
    const p = (S[i]! * S[i]!) / total;
    if (p > 1e-12) entropy -= p * Math.log(p);
  }
  return clamp01(entropy / Math.log(k));
}

function refMpoStep(state: Float32Array, bond: number, chi = 4): number {
  const lifted = liftShortVector(state);
  // d≥2 (read past state[0]) + keep ≤ d−1 (force a real truncation) — same de-degeneracy as contract.
  // NOTE: a length-2 state still packs to a rank-1 M (the transfer column ⊗ state outer product), so its
  // ratio stays ~1 by construction; the two length-2 call sites (world.superMpoInput, godform) were
  // widened to length-3 with a cross-term so the packed matrix is genuinely rank-2.
  const d = Math.max(2, squareSide(lifted.length));
  const S = packMatrix(lifted, d, d);
  const M = matMul(transferOperator(d, bond), S);
  const full = frobenius(M);
  if (full <= 1e-12) return 0;
  const { approx } = lowRankApprox(M, Math.max(1, Math.min(chi, d - 1)));
  return clamp01(frobenius(approx) / (full + 1e-12));
}

function refMpoApply(state: Float32Array, bond: number, chi = 4): Float32Array {
  const out = new Float32Array(state.length);
  // d≥2 + keep ≤ d−1: same de-degeneracy — a full-rank keep left the transformed block unchanged.
  const d = Math.max(2, squareSide(state.length));
  const M = matMul(transferOperator(d, bond), packMatrix(state, d, d));
  const { approx } = lowRankApprox(M, Math.max(1, Math.min(chi, d - 1)));
  const block = d * d;
  for (let i = 0; i < state.length; i++) {
    out[i] = clamp01(i < block ? approx.data[i]! : (state[i] ?? 0));
  }
  return out;
}

describe('moonlab qualia / MPO kernels on reused buffers', () => {
  test('bit-identical to the fresh-allocation forms across lengths, chi and bond, in mixed order', () => {
    let s = 21;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    let n = 0;
    for (let rep = 0; rep < 30; rep++) {
      for (const len of [3, 4, 9, 2, 16, 3, 25, 10, 1, 0]) {
        const v = new Float32Array(len).map(() => (rep % 9 === 0 ? 0 : rnd() * 2 - 1));
        for (const chi of [0, 1, 2, 4]) {
          expect(Object.is(moonlabTensorQualia(v, chi), refQualia(v, chi))).toBe(true);
          for (const bond of [1, 2, 3.5]) {
            expect(Object.is(moonlabMpoStep(v, bond, chi), refMpoStep(v, bond, chi))).toBe(true);
            const a = moonlabMpoApply(v, bond, chi);
            const b = refMpoApply(v, bond, chi);
            expect(a.length).toBe(b.length);
            for (let i = 0; i < a.length; i++) expect(Object.is(a[i], b[i])).toBe(true);
            n++;
          }
        }
      }
    }
    expect(n).toBe(30 * 10 * 4 * 3);
  });
});
