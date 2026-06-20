/**
 * Golden tests for the tensorcore leaf — proves real dense GEMM + softmax
 * attention, not the old 1-D dot / bare-score / affine stubs.
 */
import { describe, expect, test } from 'bun:test';
import { metalGemmBias, attentionScore, tensorcoreMorphBias } from '../src/sim/tensorcore-facade';

const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

describe('tensorcore: real dense GEMM', () => {
  test('I·B = B ⇒ mean element correct', () => {
    // a = 2×2 identity, b = [[1,2],[3,4]] → C = B, mean = (1+2+3+4)/4 = 2.5
    expect(close(metalGemmBias([1, 0, 0, 1], [1, 2, 3, 4], 4), 2.5)).toBe(true);
  });

  test('genuine matrix product (not a dot product)', () => {
    // [[1,2],[3,4]]·[[5,6],[7,8]] = [[19,22],[43,50]] → mean = 33.5
    expect(close(metalGemmBias([1, 2, 3, 4], [5, 6, 7, 8], 4), 33.5)).toBe(true);
  });
});

describe('tensorcore: real softmax attention', () => {
  test('identical keys ⇒ uniform softmax ⇒ output = key', () => {
    // q=[1,0], two identical keys [1,0],[1,0]; out=[1,0], ||out||/(||q||+1)=1/2
    expect(
      close(attentionScore(new Float32Array([1, 0]), new Float32Array([1, 0, 1, 0]), 2), 0.5),
    ).toBe(true);
  });

  test('deterministic + finite', () => {
    const q = new Float32Array([0.3, 0.7, 0.1]);
    const k = new Float32Array([0.2, 0.5, 0.9, 0.1, 0.4, 0.6]);
    const s = attentionScore(q, k, 3);
    expect(s).toBe(attentionScore(q, k, 3));
    expect(Number.isFinite(s)).toBe(true);
  });
});

describe('tensorcore: morph bias from real GEMM', () => {
  test('bounded [0,1] and GEMM-derived', () => {
    // chi=16,adDepth=32 ⇒ a=[1,1,1,1], C mean = 1.0
    expect(close(tensorcoreMorphBias(16, 32), 1)).toBe(true);
    const b = tensorcoreMorphBias(4, 8);
    expect(b >= 0 && b <= 1).toBe(true);
  });
});
