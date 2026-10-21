import { describe, expect, test } from 'bun:test';
import {
  getZigKernelBridge,
  getZigKernelReceipt,
  zigGeoRefineVerifyFrame,
  zigGrayScottStep,
  zigPqWireBytes,
  zigQgtFubiniStudy,
  zigRosetteFnv1a64,
  zigTdseStep,
} from '../src/math/zig-bridge';

describe('Zig 0.17.0 WASM Kernel Bridge (src/math/zig-bridge.ts)', () => {
  test('getZigKernelReceipt reports Zig 0.17.0 and all 6 exported kernels ready', () => {
    const receipt = getZigKernelReceipt();
    expect(receipt.compilerVersion).toBe('0.17.0');
    expect(receipt.wasmByteLength).toBeGreaterThan(500);
    expect(receipt.wasmSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.ready).toBe(true);
    expect(receipt.exports).toEqual([
      'cqm_gray_scott_step',
      'cqm_tdse_step',
      'cqm_qgt_fubini_study',
      'cqm_rosette_fnv1a64',
      'cqm_pq_wire_bytes',
      'cqm_georefine_verify_frame',
    ]);
  });

  test('zigGrayScottStep evolves a 2D reaction-diffusion grid deterministically within [0, 1]', () => {
    const w = 8;
    const h = 8;
    const u = new Float64Array(w * h).fill(1.0);
    const v = new Float64Array(w * h).fill(0.0);
    // Seed a central 2x2 perturbation
    v[3 * w + 3] = 0.5;
    v[3 * w + 4] = 0.5;
    v[4 * w + 3] = 0.5;
    v[4 * w + 4] = 0.5;
    u[3 * w + 3] = 0.5;

    const uOut = new Float64Array(w * h);
    const vOut = new Float64Array(w * h);

    const meanV = zigGrayScottStep(u, v, uOut, vOut, w, h, 0.16, 0.08, 0.035, 0.06, 1.0);
    expect(meanV).toBeGreaterThan(0);
    expect(meanV).toBeLessThan(1);
    // Neighboring cell (2, 3) must gain v via diffusion
    expect(vOut[2 * w + 3]!).toBeGreaterThan(0);
    for (let i = 0; i < w * h; i++) {
      expect(uOut[i]!).toBeGreaterThanOrEqual(0);
      expect(uOut[i]!).toBeLessThanOrEqual(1);
      expect(vOut[i]!).toBeGreaterThanOrEqual(0);
      expect(vOut[i]!).toBeLessThanOrEqual(1);
    }
  });

  test('zigTdseStep evolves a 1D wavefunction and preserves unit L2 norm', () => {
    const n = 16;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    const pot = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = i - n / 2;
      re[i] = Math.exp((-x * x) / 4);
      pot[i] = 0.05 * x * x;
    }

    const preNormSq = zigTdseStep(re, im, pot, 0.02, 1.0);
    expect(preNormSq).toBeGreaterThan(0);

    let postNormSq = 0;
    let imEnergy = 0;
    for (let i = 0; i < n; i++) {
      postNormSq += re[i]! * re[i]! + im[i]! * im[i]!;
      imEnergy += im[i]! * im[i]!;
    }
    expect(postNormSq).toBeCloseTo(1.0, 12);
    expect(imEnergy).toBeGreaterThan(0);
  });

  test('zigQgtFubiniStudy computes exact Fubini-Study metric diagonal', () => {
    // Orthogonal tangent: |psi> = |0>, |dpsi> = |1> => g = 1 - 0 = 1
    const psiRe = new Float64Array([1, 0]);
    const psiIm = new Float64Array([0, 0]);
    const dpsiRe = new Float64Array([0, 1]);
    const dpsiIm = new Float64Array([0, 0]);
    expect(zigQgtFubiniStudy(psiRe, psiIm, dpsiRe, dpsiIm)).toBeCloseTo(1.0, 12);

    // Parallel tangent (pure global phase derivative): |dpsi> = i |psi> => g = 1 - |i|^2 = 0
    const dpsiParallelRe = new Float64Array([0, 0]);
    const dpsiParallelIm = new Float64Array([1, 0]);
    expect(zigQgtFubiniStudy(psiRe, psiIm, dpsiParallelRe, dpsiParallelIm)).toBeCloseTo(0.0, 12);
  });

  test('zigRosetteFnv1a64 matches canonical 64-bit FNV-1a test vectors', () => {
    expect(zigRosetteFnv1a64('')).toBe(0xcbf29ce484222325n);
    expect(zigRosetteFnv1a64('a')).toBe(0xaf63dc4c8601ec8cn);
    expect(zigRosetteFnv1a64('foobar')).toBe(0x85944171f73967e8n);
  });

  test('zigPqWireBytes orders Falcon-512 < ML-DSA-65 < SLH-DSA-128f and amortizes batches', () => {
    const mlDsa = zigPqWireBytes(64, 0, 8);
    const falcon = zigPqWireBytes(64, 1, 8);
    const slhDsa = zigPqWireBytes(64, 2, 8);
    expect(falcon).toBeLessThan(mlDsa);
    expect(mlDsa).toBeLessThan(slhDsa);

    const unbatched = zigPqWireBytes(64, 0, 1);
    expect(mlDsa).toBeLessThan(unbatched);
  });

  test('zigGeoRefineVerifyFrame classifies ccw, cw, and collinear simplices', () => {
    const ccw = zigGeoRefineVerifyFrame(0, 0, 1, 0, 0, 1);
    expect(ccw.orientation).toBe('ccw');
    expect(ccw.certified).toBe(true);
    expect(ccw.determinant).toBeCloseTo(1.0, 12);

    const cw = zigGeoRefineVerifyFrame(0, 0, 0, 1, 1, 0);
    expect(cw.orientation).toBe('cw');
    expect(cw.certified).toBe(true);
    expect(cw.determinant).toBeCloseTo(-1.0, 12);

    const col = zigGeoRefineVerifyFrame(0, 0, 1, 1, 2, 2);
    expect(col.orientation).toBe('collinear');
    expect(col.certified).toBe(false);
    expect(getZigKernelBridge()).toBeDefined();
  });
});
