import { describe, expect, test } from 'bun:test';
import {
  getZigKernelBridge,
  getZigKernelReceipt,
  zigEntityBrainBatchForward,
  zigEshkolCyclotomic8Mul,
  zigEshkolDbspDeltaGemm,
  zigEshkolTaylorDiff,
  zigGeoRefineVerifyFrame,
  zigGlyphHebbianStep,
  zigGrayScottStep,
  zigGrayScottStepRgbaF32,
  zigLibirrepBdgSkyrmionMzm,
  zigMoonlabIsingAnneal,
  zigMoonlabQwzChernFhs,
  zigPqWireBytes,
  zigQgtFubiniStudy,
  zigQgtlFullTensor2D,
  zigQrngQuantumChaosStep,
  zigRosetteFnv1a64,
  zigSbnnMinsrStep,
  zigTdseStep,
} from '../src/math/zig-bridge';

describe('Zig 0.17.0 WASM Kernel Bridge (src/math/zig-bridge.ts)', () => {
  test('getZigKernelReceipt reports Zig 0.17.0 and all 18 exported kernels ready', () => {
    const receipt = getZigKernelReceipt();
    expect(receipt.compilerVersion).toBe('0.17.0');
    expect(receipt.wasmByteLength).toBeGreaterThan(500);
    expect(receipt.wasmSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.ready).toBe(true);
    expect(receipt.exports).toEqual([
      'cqm_gray_scott_step',
      'cqm_gray_scott_step_rgba_f32',
      'cqm_tdse_step',
      'cqm_qgt_fubini_study',
      'cqm_qgtl_full_tensor_2d',
      'cqm_moonlab_ising_anneal',
      'cqm_qrng_quantum_chaos_step',
      'cqm_eshkol_taylor_diff',
      'cqm_entity_brain_batch_forward',
      'cqm_glyph_hebbian_step',
      'cqm_rosette_fnv1a64',
      'cqm_pq_wire_bytes',
      'cqm_georefine_verify_frame',
      'cqm_eshkol_dbsp_delta_gemm',
      'cqm_eshkol_cyclotomic8_mul',
      'cqm_moonlab_qwz_chern_fhs',
      'cqm_libirrep_bdg_skyrmion_mzm',
      'cqm_sbnn_minsr_step',
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

  test('zigGrayScottStepRgbaF32 fuses f32 PDE steps and RGBA8 pixel rasterization', () => {
    const w = 8;
    const h = 8;
    const u = new Float32Array(w * h).fill(1.0);
    const v = new Float32Array(w * h).fill(0.0);
    const rgba = new Uint8Array(w * h * 4);
    v[3 * w + 3] = 0.5;
    u[3 * w + 3] = 0.5;

    const res = zigGrayScottStepRgbaF32(u, v, rgba, w, h, 2, 0.16, 0.08, 0.037, 0.06, 1.0);
    expect(res.meanV).toBeGreaterThan(0);
    expect(rgba[3]).toBe(255);
  });

  test('zigQgtlFullTensor2D, zigMoonlabIsingAnneal, zigQrngQuantumChaosStep, and zigEshkolTaylorDiff execute in WASM', () => {
    const psiRe = new Float64Array([1, 0]);
    const psiIm = new Float64Array([0, 0]);
    const dmuRe = new Float64Array([0, 1]);
    const dmuIm = new Float64Array([0, 0]);
    const dnuRe = new Float64Array([0, 0]);
    const dnuIm = new Float64Array([0, 1]);
    const qgtl = zigQgtlFullTensor2D(psiRe, psiIm, dmuRe, dmuIm, dnuRe, dnuIm, 0.05);
    expect(qgtl.gMuMu).toBeCloseTo(1.0, 9);
    expect(qgtl.gNuNu).toBeCloseTo(1.0, 9);
    expect(qgtl.berryCurvature).toBeCloseTo(-2.0, 9);
    expect(qgtl.oEps2Suppression).toBeLessThan(1.0);

    const jMat = new Float64Array([0, -1, -1, 0]);
    const hVec = new Float64Array([-0.5, -0.5]);
    const anneal = zigMoonlabIsingAnneal(2, jMat, hVec, 24, 3.0, 2);
    expect(anneal.expectedEnergy).toBeLessThan(-0.5);
    expect(anneal.groundOverlap).toBeGreaterThan(0.5);

    const state = new BigUint64Array([1n, 2n, 3n, 4n]);
    const samples = new Float64Array(8);
    const word = zigQrngQuantumChaosStep(state, samples, 0x9e3779b97f4a7c15n);
    expect(word).not.toBe(0n);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(1);
    }

    const esh = zigEshkolTaylorDiff(0.6, -0.3, 0.4, 1.5, 0.25);
    expect(Number.isFinite(esh.d1)).toBe(true);
    expect(Number.isFinite(esh.d4)).toBe(true);
    expect(Number.isFinite(esh.divergence)).toBe(true);
    expect(esh.curlMagnitude).toBeGreaterThanOrEqual(0);

    // Kernel 14: Eshkol v1.3.6-evolve DBSP Incremental Bilinear Delta Stream
    const aMat = new Float64Array([1.2, -0.4, 0.7, 1.5]);
    const bMat = new Float64Array([0.8, 0.3, -0.5, 1.1]);
    const cMat = new Float64Array([
      aMat[0]! * bMat[0]! + aMat[1]! * bMat[2]!,
      aMat[0]! * bMat[1]! + aMat[1]! * bMat[3]!,
      aMat[2]! * bMat[0]! + aMat[3]! * bMat[2]!,
      aMat[2]! * bMat[1]! + aMat[3]! * bMat[3]!,
    ]);
    const dbsp = zigEshkolDbspDeltaGemm(
      aMat,
      bMat,
      new Float64Array([0.05, -0.02, 0.03, 0.04]),
      new Float64Array([-0.01, 0.04, 0.02, -0.03]),
      cMat,
      2,
    );
    expect(dbsp.exactnessResidual).toBeLessThan(1e-14);
    expect(dbsp.linearTermNorm).toBeGreaterThan(0);
    expect(dbsp.crossTermNorm).toBeGreaterThan(0);

    // Kernel 15: Eshkol v1.3.6-evolve Exact Cyclotomic Field Z[zeta_8]
    const cycUnit = zigEshkolCyclotomic8Mul([0n, 1n, 0n, 0n], [0n, 0n, 0n, 1n]);
    expect(Array.from(cycUnit.product)).toEqual([-1n, 0n, 0n, 0n]);
    expect(cycUnit.exactFieldNorm).toBe(1n);
    const cycAlpha = zigEshkolCyclotomic8Mul([1n, 1n, 0n, 0n], [1n, 0n, 0n, 0n]);
    expect(cycAlpha.exactFieldNorm).toBe(2n);

    // Kernel 16: Moonlab v1.2.1 & QGTL v0.777 FHS Topological Chern Number on 2D QWZ Torus
    const chernMinus = zigMoonlabQwzChernFhs(-1.0, 12);
    const chernPlus = zigMoonlabQwzChernFhs(1.0, 12);
    const chernTrivial = zigMoonlabQwzChernFhs(3.0, 12);
    expect(chernMinus.quantizedChern).toBe(-1);
    expect(chernPlus.quantizedChern).toBe(1);
    expect(chernTrivial.quantizedChern).toBe(0);
    expect(chernMinus.minBandGap).toBeGreaterThan(1.5);

    // Kernel 17: libirrep v1.5.0 BdG-Skyrmion 2|Q| Majorana Zero-Mode Solver
    const bdgQ1 = zigLibirrepBdgSkyrmionMzm(12, 1, -3.0, 4.0, 1.0);
    const bdgQ2 = zigLibirrepBdgSkyrmionMzm(12, -2, -3.0, 4.0, 1.0);
    const bdgTrivial = zigLibirrepBdgSkyrmionMzm(12, 1, -3.0, 0.5, 1.0);
    expect(bdgQ1.mzmCount).toBe(2);
    expect(bdgQ1.topologicalProtected).toBe(true);
    expect(Math.abs(bdgQ1.topologicalCharge)).toBeGreaterThan(0.5);
    expect(bdgQ2.mzmCount).toBe(4);
    expect(bdgTrivial.mzmCount).toBe(0);
    expect(bdgTrivial.topologicalProtected).toBe(false);

    // Kernel 18: spin_based_neural_network v0.6 Sample-Space MinSR Neural Tangent Kernel
    const srGrads = new Float64Array([
      0.4, -0.2, 0.1, 0.3, -0.1, 0.5, -0.3, 0.2, 0.2, 0.1, 0.4, -0.5,
    ]);
    const srEnergies = new Float64Array([-1.8, -1.1, -2.2]);
    const minsr = zigSbnnMinsrStep(srGrads, srEnergies, 3, 4, 0.01, 0.05);
    expect(minsr.updateNorm).toBeGreaterThan(0);
    expect(minsr.energyVariance).toBeGreaterThan(0);
    expect(minsr.traceT).toBeGreaterThan(0);
    expect(minsr.delta).toHaveLength(4);
  });

  test('zigEntityBrainBatchForward and zigGlyphHebbianStep accelerate neural hot paths', () => {
    const weights = new Float32Array(70).fill(0.05);
    const senses = new Float32Array(6).fill(0.4);
    const hidden = new Float32Array(6);
    const actions = new Float32Array(4);
    const processed = zigEntityBrainBatchForward(weights, senses, hidden, actions, 1);
    expect(processed).toBe(1);
    expect(Number.isFinite(actions[0]!)).toBe(true);

    const hidden32 = new Float32Array(32).fill(0.25);
    const wMat = new Float32Array(32 * 32).fill(0.01);
    const meanAbs = zigGlyphHebbianStep(wMat, hidden32, 32, 0.01, 0.001);
    expect(meanAbs).toBeGreaterThan(0);
  });
});
