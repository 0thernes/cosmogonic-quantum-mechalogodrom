/**
 * Zig 0.17.0 WebAssembly Kernel Bridge (`zig/src/root.zig` -> `cqm_kernels.wasm`)
 *
 * Provides high-throughput, zero-GC-allocation systems & math kernels compiled
 * from Zig 0.17.0 (`wasm32-freestanding`, `ReleaseSmall`) for:
 *   1. `cqm_gray_scott_step` — 2D Gray-Scott reaction-diffusion PDE on a torus (f64)
 *   2. `cqm_gray_scott_step_rgba_f32` — Fused multi-step f32 Gray-Scott PDE + RGBA8 rasterizer
 *   3. `cqm_tdse_step` — 1D symplectic/unitary Time-Dependent Schrödinger step
 *   4. `cqm_qgt_fubini_study` — Fubini-Study Quantum Geometric Tensor diagonal
 *   5. `cqm_qgtl_full_tensor_2d` — Tsotchke QGTL v0.777 full 2D metric + Berry curvature + O(eps^2) suppression
 *   6. `cqm_moonlab_ising_anneal` — Tsotchke Moonlab v1.2.1 transverse-field Ising/QUBO quantum annealer
 *   7. `cqm_qrng_quantum_chaos_step` — Tsotchke `quantum_rng` / `Quantum-RNG-API` dual-mode Toeplitz stream
 *   8. `cqm_eshkol_taylor_diff` — Tsotchke Eshkol v1.3.6 Taylor-tower `derivative-n` + 3D divergence/curl
 *   9. `cqm_entity_brain_batch_forward` — Batch `6 -> 6 -> 4` recurrent MLP forward pass for `EntityBrainField`
 *  10. `cqm_glyph_hebbian_step` — Fused 32x32 Hebbian plastic matrix update for `GlyphBrain`
 *  11. `cqm_rosette_fnv1a64` — Tsotchke `rosette-wire` canonical 64-bit FNV-1a digest
 *  12. `cqm_pq_wire_bytes` — Tsotchke `pq-consensus-bandwidth` BFT wire-footprint calculator
 *  13. `cqm_georefine_verify_frame` — Tsotchke `GeoRefine` dual-frame orientation determinant
 *  14. `cqm_eshkol_dbsp_delta_gemm` — Tsotchke Eshkol v1.3.6 DBSP incremental bilinear delta update
 *  15. `cqm_eshkol_cyclotomic8_mul` — Tsotchke Eshkol v1.3.6 exact Z[zeta_8] Clifford+T multiply + norm
 *  16. `cqm_moonlab_qwz_chern_fhs` — Tsotchke Moonlab v1.2.1 / QGTL v0.777 FHS QWZ Chern number
 *  17. `cqm_libirrep_bdg_skyrmion_mzm` — Tsotchke libirrep v1.5.0-prerelease BdG skyrmion 2|Q| Majorana zero modes
 *  18. `cqm_sbnn_minsr_step` — Tsotchke `spin_based_neural_network` v0.5.0 MinSR stochastic reconfiguration
 */

import {
  CQM_ZIG_COMPILER_VERSION,
  CQM_ZIG_WASM_BYTE_LENGTH,
  CQM_ZIG_WASM_SHA256,
  decodeZigWasmBytes,
} from './zig-wasm-binary';

export type PqSignatureSchemeId = 0 | 1 | 2;
export type MoonlabAnnealScheduleId = 0 | 1 | 2;

export interface ZigWasmExports {
  memory: WebAssembly.Memory;
  cqm_gray_scott_step: (
    uPtr: number,
    vPtr: number,
    uOutPtr: number,
    vOutPtr: number,
    width: number,
    height: number,
    du: number,
    dv: number,
    feed: number,
    kill: number,
    dt: number,
  ) => number;
  cqm_gray_scott_step_rgba_f32: (
    uPtr: number,
    vPtr: number,
    uScratchPtr: number,
    vScratchPtr: number,
    rgbaOutPtr: number,
    width: number,
    height: number,
    steps: number,
    du: number,
    dv: number,
    feed: number,
    kill: number,
    dt: number,
    outStatsPtr: number,
  ) => number;
  cqm_tdse_step: (
    rePtr: number,
    imPtr: number,
    potPtr: number,
    scratchRePtr: number,
    scratchImPtr: number,
    n: number,
    dt: number,
    dx: number,
  ) => number;
  cqm_qgt_fubini_study: (
    psiRePtr: number,
    psiImPtr: number,
    dpsiRePtr: number,
    dpsiImPtr: number,
    dim: number,
  ) => number;
  cqm_qgtl_full_tensor_2d: (
    psiRePtr: number,
    psiImPtr: number,
    dmuRePtr: number,
    dmuImPtr: number,
    dnuRePtr: number,
    dnuImPtr: number,
    dim: number,
    eps: number,
    outMetricsPtr: number,
  ) => number;
  cqm_moonlab_ising_anneal: (
    nQubits: number,
    jCouplingsPtr: number,
    hFieldsPtr: number,
    steps: number,
    totalTime: number,
    scheduleKind: number,
    outMagnetizationsPtr: number,
    outMetricsPtr: number,
  ) => number;
  cqm_qrng_quantum_chaos_step: (
    statePtr: number,
    jitterEntropy: bigint,
    outSamplesPtr: number,
    count: number,
  ) => bigint;
  cqm_eshkol_taylor_diff: (
    x: number,
    y: number,
    z: number,
    omega: number,
    coupling: number,
    outMetricsPtr: number,
  ) => number;
  cqm_entity_brain_batch_forward: (
    weightsPtr: number,
    inputsPtr: number,
    hiddenPtr: number,
    outputsPtr: number,
    count: number,
  ) => number;
  cqm_glyph_hebbian_step: (
    hebbianPtr: number,
    hiddenPtr: number,
    dim: number,
    lr: number,
    decay: number,
  ) => number;
  cqm_rosette_fnv1a64: (bytesPtr: number, len: number) => bigint;
  cqm_pq_wire_bytes: (validators: number, schemeId: number, batchSize: number) => bigint;
  cqm_georefine_verify_frame: (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => number;
  cqm_eshkol_dbsp_delta_gemm: (
    aPtr: number,
    bPtr: number,
    daPtr: number,
    dbPtr: number,
    cInOutPtr: number,
    outMetricsPtr: number,
    dim: number,
  ) => number;
  cqm_eshkol_cyclotomic8_mul: (
    aPtr: number,
    bPtr: number,
    outProdPtr: number,
    outMetricsPtr: number,
  ) => bigint;
  cqm_moonlab_qwz_chern_fhs: (mass: number, gridN: number, outMetricsPtr: number) => number;
  cqm_libirrep_bdg_skyrmion_mzm: (
    gridL: number,
    chargeQ: number,
    mu: number,
    jSd: number,
    delta0: number,
    outMetricsPtr: number,
  ) => number;
  cqm_sbnn_minsr_step: (
    gradsPtr: number,
    energiesPtr: number,
    nSamples: number,
    nParams: number,
    diagShift: number,
    learningRate: number,
    outDeltaPtr: number,
    outMetricsPtr: number,
  ) => number;
}

export interface ZigLibirrepBdgSkyrmionReport {
  mzmCount: number;
  topologicalCharge: number;
  minBulkGap: number;
  domainWallLocalization: number;
  topologicalProtected: boolean;
}

export interface ZigSbnnMinsrReport {
  delta: Float64Array;
  meanEnergy: number;
  energyVariance: number;
  updateNorm: number;
  traceT: number;
}

export interface ZigEshkolDbspDeltaReport {
  frobeniusNormC: number;
  linearTermNorm: number;
  crossTermNorm: number;
  exactnessResidual: number;
}

export interface ZigEshkolCyclotomic8Report {
  product: BigInt64Array;
  re: number;
  im: number;
  absSqReal: number;
  exactFieldNorm: bigint;
}

export interface ZigMoonlabQwzChernReport {
  chernNumber: number;
  quantizedChern: number;
  minBandGap: number;
  maxBandGap: number;
  meanAbsPlaquetteFlux: number;
  topologicalPhase: 'chern-plus' | 'chern-minus' | 'trivial';
}

export interface ZigQgtlTensor2DReport {
  gMuMu: number;
  gNuNu: number;
  gMuNu: number;
  berryCurvature: number;
  detG: number;
  traceG: number;
  oEps2Suppression: number;
  bogomolnyRatio: number;
}

export interface ZigMoonlabAnnealReport {
  nQubits: number;
  groundEnergy: number;
  expectedEnergy: number;
  groundOverlap: number;
  purityNorm: number;
  magnetizations: Float64Array;
}

export interface ZigEshkolTaylorReport {
  taylorTower: readonly [number, number, number, number, number];
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  divergence: number;
  curlMagnitude: number;
  actionProxy: number;
}

export interface ZigKernelReceipt {
  compilerVersion: string;
  wasmByteLength: number;
  wasmSha256: string;
  exports: readonly string[];
  ready: boolean;
}

const SCRATCH_BASE_OFFSET = 65536; // 64 KiB reserved above WASM stack

class ZigKernelBridge {
  readonly exports: ZigWasmExports;
  private f64View: Float64Array;
  private f32View: Float32Array;
  private u64View: BigUint64Array;
  private i64View: BigInt64Array;
  private u8View: Uint8Array;

  constructor() {
    const bytes = decodeZigWasmBytes();
    const mod = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(mod, {});
    this.exports = instance.exports as unknown as ZigWasmExports;
    const buf = this.exports.memory.buffer;
    this.f64View = new Float64Array(buf);
    this.f32View = new Float32Array(buf);
    this.u64View = new BigUint64Array(buf);
    this.i64View = new BigInt64Array(buf);
    this.u8View = new Uint8Array(buf);
  }

  private refreshViews(): void {
    const buf = this.exports.memory.buffer;
    this.f64View = new Float64Array(buf);
    this.f32View = new Float32Array(buf);
    this.u64View = new BigUint64Array(buf);
    this.i64View = new BigInt64Array(buf);
    this.u8View = new Uint8Array(buf);
  }

  private ensureCapacity(requiredBytes: number): void {
    const alignedRequired = (requiredBytes + 7) & ~7;
    const totalNeeded = SCRATCH_BASE_OFFSET + alignedRequired;
    const currentBytes = this.exports.memory.buffer.byteLength;
    if (totalNeeded > currentBytes) {
      const missingPages = Math.ceil((totalNeeded - currentBytes) / 65536);
      this.exports.memory.grow(missingPages);
      this.refreshViews();
    } else if (this.f64View.buffer !== this.exports.memory.buffer) {
      this.refreshViews();
    }
  }

  grayScottStep(
    u: Float64Array,
    v: Float64Array,
    uOut: Float64Array,
    vOut: Float64Array,
    width: number,
    height: number,
    du = 0.16,
    dv = 0.08,
    feed = 0.035,
    kill = 0.06,
    dt = 1.0,
  ): number {
    const cells = width * height;
    if (cells <= 0 || u.length < cells || v.length < cells) return 0;
    const bytesPerGrid = cells * 8;
    this.ensureCapacity(bytesPerGrid * 4);

    const uPtr = SCRATCH_BASE_OFFSET;
    const vPtr = uPtr + bytesPerGrid;
    const uOutPtr = vPtr + bytesPerGrid;
    const vOutPtr = uOutPtr + bytesPerGrid;

    this.f64View.set(u.subarray(0, cells), uPtr >> 3);
    this.f64View.set(v.subarray(0, cells), vPtr >> 3);

    const meanV = this.exports.cqm_gray_scott_step(
      uPtr,
      vPtr,
      uOutPtr,
      vOutPtr,
      width >>> 0,
      height >>> 0,
      du,
      dv,
      feed,
      kill,
      dt,
    );

    uOut.set(this.f64View.subarray(uOutPtr >> 3, (uOutPtr >> 3) + cells));
    vOut.set(this.f64View.subarray(vOutPtr >> 3, (vOutPtr >> 3) + cells));
    return meanV;
  }

  grayScottStepRgbaF32(
    u: Float32Array,
    v: Float32Array,
    pixels: Uint8Array,
    width: number,
    height: number,
    steps = 2,
    du = 0.16,
    dv = 0.08,
    feed = 0.037,
    kill = 0.06,
    dt = 1.0,
  ): { meanV: number; peakV: number } {
    const cells = width * height;
    if (cells <= 0 || u.length < cells || v.length < cells || pixels.length < cells * 4) {
      return { meanV: 0, peakV: 0 };
    }
    const bytesPerGrid = cells * 4;
    const rgbaBytes = cells * 4;
    const statsBytes = 16;
    this.ensureCapacity(bytesPerGrid * 4 + rgbaBytes + statsBytes);

    const uPtr = SCRATCH_BASE_OFFSET;
    const vPtr = uPtr + bytesPerGrid;
    const uScratchPtr = vPtr + bytesPerGrid;
    const vScratchPtr = uScratchPtr + bytesPerGrid;
    const rgbaOutPtr = vScratchPtr + bytesPerGrid;
    const statsPtr = rgbaOutPtr + rgbaBytes;

    this.f32View.set(u.subarray(0, cells), uPtr >> 2);
    this.f32View.set(v.subarray(0, cells), vPtr >> 2);

    this.exports.cqm_gray_scott_step_rgba_f32(
      uPtr,
      vPtr,
      uScratchPtr,
      vScratchPtr,
      rgbaOutPtr,
      width >>> 0,
      height >>> 0,
      Math.max(1, steps) >>> 0,
      du,
      dv,
      feed,
      kill,
      dt,
      statsPtr,
    );

    u.set(this.f32View.subarray(uPtr >> 2, (uPtr >> 2) + cells));
    v.set(this.f32View.subarray(vPtr >> 2, (vPtr >> 2) + cells));
    pixels.set(this.u8View.subarray(rgbaOutPtr, rgbaOutPtr + rgbaBytes));

    const meanV = this.f32View[statsPtr >> 2] ?? 0;
    const peakV = this.f32View[(statsPtr >> 2) + 1] ?? 0;
    return { meanV, peakV };
  }

  tdseStep(
    re: Float64Array,
    im: Float64Array,
    potential: Float64Array,
    dt = 0.01,
    dx = 1.0,
  ): number {
    const n = Math.min(re.length, im.length, potential.length);
    if (n < 3) return 0;
    const bytesPerVec = n * 8;
    this.ensureCapacity(bytesPerVec * 5);

    const rePtr = SCRATCH_BASE_OFFSET;
    const imPtr = rePtr + bytesPerVec;
    const potPtr = imPtr + bytesPerVec;
    const scratchRePtr = potPtr + bytesPerVec;
    const scratchImPtr = scratchRePtr + bytesPerVec;

    this.f64View.set(re.subarray(0, n), rePtr >> 3);
    this.f64View.set(im.subarray(0, n), imPtr >> 3);
    this.f64View.set(potential.subarray(0, n), potPtr >> 3);

    const normSq = this.exports.cqm_tdse_step(
      rePtr,
      imPtr,
      potPtr,
      scratchRePtr,
      scratchImPtr,
      n >>> 0,
      dt,
      dx,
    );

    re.set(this.f64View.subarray(rePtr >> 3, (rePtr >> 3) + n));
    im.set(this.f64View.subarray(imPtr >> 3, (imPtr >> 3) + n));
    return normSq;
  }

  qgtFubiniStudy(
    psiRe: Float64Array,
    psiIm: Float64Array,
    dpsiRe: Float64Array,
    dpsiIm: Float64Array,
  ): number {
    const dim = Math.min(psiRe.length, psiIm.length, dpsiRe.length, dpsiIm.length);
    if (dim <= 0) return 0;
    const bytesPerVec = dim * 8;
    this.ensureCapacity(bytesPerVec * 4);

    const prPtr = SCRATCH_BASE_OFFSET;
    const piPtr = prPtr + bytesPerVec;
    const drPtr = piPtr + bytesPerVec;
    const diPtr = drPtr + bytesPerVec;

    this.f64View.set(psiRe.subarray(0, dim), prPtr >> 3);
    this.f64View.set(psiIm.subarray(0, dim), piPtr >> 3);
    this.f64View.set(dpsiRe.subarray(0, dim), drPtr >> 3);
    this.f64View.set(dpsiIm.subarray(0, dim), diPtr >> 3);

    return this.exports.cqm_qgt_fubini_study(prPtr, piPtr, drPtr, diPtr, dim >>> 0);
  }

  qgtlFullTensor2D(
    psiRe: Float64Array,
    psiIm: Float64Array,
    dmuRe: Float64Array,
    dmuIm: Float64Array,
    dnuRe: Float64Array,
    dnuIm: Float64Array,
    eps = 0.05,
  ): ZigQgtlTensor2DReport {
    const dim = Math.min(
      psiRe.length,
      psiIm.length,
      dmuRe.length,
      dmuIm.length,
      dnuRe.length,
      dnuIm.length,
    );
    if (dim <= 0) {
      return {
        gMuMu: 0,
        gNuNu: 0,
        gMuNu: 0,
        berryCurvature: 0,
        detG: 0,
        traceG: 0,
        oEps2Suppression: 0,
        bogomolnyRatio: 0,
      };
    }
    const bytesPerVec = dim * 8;
    const metricsBytes = 8 * 8;
    this.ensureCapacity(bytesPerVec * 6 + metricsBytes);

    const prPtr = SCRATCH_BASE_OFFSET;
    const piPtr = prPtr + bytesPerVec;
    const mrPtr = piPtr + bytesPerVec;
    const miPtr = mrPtr + bytesPerVec;
    const nrPtr = miPtr + bytesPerVec;
    const niPtr = nrPtr + bytesPerVec;
    const outPtr = niPtr + bytesPerVec;

    this.f64View.set(psiRe.subarray(0, dim), prPtr >> 3);
    this.f64View.set(psiIm.subarray(0, dim), piPtr >> 3);
    this.f64View.set(dmuRe.subarray(0, dim), mrPtr >> 3);
    this.f64View.set(dmuIm.subarray(0, dim), miPtr >> 3);
    this.f64View.set(dnuRe.subarray(0, dim), nrPtr >> 3);
    this.f64View.set(dnuIm.subarray(0, dim), niPtr >> 3);

    this.exports.cqm_qgtl_full_tensor_2d(
      prPtr,
      piPtr,
      mrPtr,
      miPtr,
      nrPtr,
      niPtr,
      dim >>> 0,
      eps,
      outPtr,
    );

    const base = outPtr >> 3;
    return {
      gMuMu: this.f64View[base] ?? 0,
      gNuNu: this.f64View[base + 1] ?? 0,
      gMuNu: this.f64View[base + 2] ?? 0,
      berryCurvature: this.f64View[base + 3] ?? 0,
      detG: this.f64View[base + 4] ?? 0,
      traceG: this.f64View[base + 5] ?? 0,
      oEps2Suppression: this.f64View[base + 6] ?? 0,
      bogomolnyRatio: this.f64View[base + 7] ?? 0,
    };
  }

  moonlabIsingAnneal(
    nQubits: number,
    jCouplings: Float64Array,
    hFields: Float64Array,
    steps = 32,
    totalTime = 4.0,
    scheduleKind: MoonlabAnnealScheduleId = 2,
  ): ZigMoonlabAnnealReport {
    const nQ = Math.max(1, Math.min(6, Math.floor(nQubits)));
    const jBytes = nQ * nQ * 8;
    const hBytes = nQ * 8;
    const magBytes = nQ * 8;
    const metricsBytes = 4 * 8;
    this.ensureCapacity(jBytes + hBytes + magBytes + metricsBytes);

    const jPtr = SCRATCH_BASE_OFFSET;
    const hPtr = jPtr + jBytes;
    const magPtr = hPtr + hBytes;
    const metricsPtr = magPtr + magBytes;

    this.f64View.fill(0, jPtr >> 3, (jPtr + jBytes) >> 3);
    this.f64View.fill(0, hPtr >> 3, (hPtr + hBytes) >> 3);
    this.f64View.set(jCouplings.subarray(0, Math.min(jCouplings.length, nQ * nQ)), jPtr >> 3);
    this.f64View.set(hFields.subarray(0, Math.min(hFields.length, nQ)), hPtr >> 3);

    this.exports.cqm_moonlab_ising_anneal(
      nQ >>> 0,
      jPtr,
      hPtr,
      Math.max(1, Math.floor(steps)) >>> 0,
      totalTime,
      scheduleKind >>> 0,
      magPtr,
      metricsPtr,
    );

    const magnetizations = new Float64Array(nQ);
    magnetizations.set(this.f64View.subarray(magPtr >> 3, (magPtr >> 3) + nQ));
    const mBase = metricsPtr >> 3;
    return {
      nQubits: nQ,
      groundEnergy: this.f64View[mBase] ?? 0,
      expectedEnergy: this.f64View[mBase + 1] ?? 0,
      groundOverlap: this.f64View[mBase + 2] ?? 0,
      purityNorm: this.f64View[mBase + 3] ?? 1,
      magnetizations,
    };
  }

  qrngQuantumChaosStep(
    stateWords: BigUint64Array,
    outSamples: Float64Array,
    jitterEntropy = 0n,
  ): bigint {
    const count = outSamples.length;
    if (count <= 0) return 0n;
    const stateBytes = 32;
    const sampleBytes = count * 8;
    this.ensureCapacity(stateBytes + sampleBytes);

    const statePtr = SCRATCH_BASE_OFFSET;
    const samplesPtr = statePtr + stateBytes;

    this.u64View.set(stateWords.subarray(0, Math.min(4, stateWords.length)), statePtr >> 3);
    const word = this.exports.cqm_qrng_quantum_chaos_step(
      statePtr,
      BigInt.asUintN(64, jitterEntropy),
      samplesPtr,
      count >>> 0,
    );
    stateWords.set(
      this.u64View.subarray(statePtr >> 3, (statePtr >> 3) + Math.min(4, stateWords.length)),
    );
    outSamples.set(this.f64View.subarray(samplesPtr >> 3, (samplesPtr >> 3) + count));
    return BigInt.asUintN(64, word);
  }

  eshkolTaylorDiff(
    x: number,
    y: number,
    z: number,
    omega = 1.618033988749895,
    coupling = 0.25,
  ): ZigEshkolTaylorReport {
    this.ensureCapacity(64);
    const outPtr = SCRATCH_BASE_OFFSET;
    this.exports.cqm_eshkol_taylor_diff(x, y, z, omega, coupling, outPtr);
    const base = outPtr >> 3;
    const d0 = this.f64View[base] ?? 0;
    const d1 = this.f64View[base + 1] ?? 0;
    const d2 = this.f64View[base + 2] ?? 0;
    const d3 = this.f64View[base + 3] ?? 0;
    const d4 = this.f64View[base + 4] ?? 0;
    return {
      taylorTower: [d0, d1, d2, d3, d4],
      d0,
      d1,
      d2,
      d3,
      d4,
      divergence: this.f64View[base + 5] ?? 0,
      curlMagnitude: this.f64View[base + 6] ?? 0,
      actionProxy: this.f64View[base + 7] ?? 0,
    };
  }

  entityBrainBatchForward(
    weights: Float32Array,
    inputs: Float32Array,
    hidden: Float32Array,
    outputs: Float32Array,
    count: number,
  ): number {
    if (count <= 0) return 0;
    const wFloats = count * 70;
    const inFloats = count * 6;
    const outFloats = count * 4;
    if (
      weights.length < wFloats ||
      inputs.length < inFloats ||
      hidden.length < inFloats ||
      outputs.length < outFloats
    ) {
      return 0;
    }
    const wBytes = wFloats * 4;
    const inBytes = inFloats * 4;
    const hidBytes = inFloats * 4;
    const outBytes = outFloats * 4;
    this.ensureCapacity(wBytes + inBytes + hidBytes + outBytes);

    const wPtr = SCRATCH_BASE_OFFSET;
    const inPtr = wPtr + wBytes;
    const hidPtr = inPtr + inBytes;
    const outPtr = hidPtr + hidBytes;

    this.f32View.set(weights.subarray(0, wFloats), wPtr >> 2);
    this.f32View.set(inputs.subarray(0, inFloats), inPtr >> 2);
    this.f32View.set(hidden.subarray(0, inFloats), hidPtr >> 2);

    const processed = this.exports.cqm_entity_brain_batch_forward(
      wPtr,
      inPtr,
      hidPtr,
      outPtr,
      count >>> 0,
    );

    hidden.set(this.f32View.subarray(hidPtr >> 2, (hidPtr >> 2) + inFloats));
    outputs.set(this.f32View.subarray(outPtr >> 2, (outPtr >> 2) + outFloats));
    return processed;
  }

  glyphHebbianStep(
    hebbian: Float32Array,
    hidden: Float32Array,
    dim = 32,
    lr = 0.005,
    decay = 0.002,
  ): number {
    const matLen = dim * dim;
    if (dim <= 0 || hebbian.length < matLen || hidden.length < dim) return 0;
    const matBytes = matLen * 4;
    const hidBytes = dim * 4;
    this.ensureCapacity(matBytes + hidBytes);

    const matPtr = SCRATCH_BASE_OFFSET;
    const hidPtr = matPtr + matBytes;

    this.f32View.set(hebbian.subarray(0, matLen), matPtr >> 2);
    this.f32View.set(hidden.subarray(0, dim), hidPtr >> 2);

    const meanAbs = this.exports.cqm_glyph_hebbian_step(matPtr, hidPtr, dim >>> 0, lr, decay);
    hebbian.set(this.f32View.subarray(matPtr >> 2, (matPtr >> 2) + matLen));
    return meanAbs;
  }

  rosetteFnv1a64(payload: Uint8Array | string): bigint {
    const bytes = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
    this.ensureCapacity(bytes.byteLength);
    const ptr = SCRATCH_BASE_OFFSET;
    this.u8View.set(bytes, ptr);
    const signed = this.exports.cqm_rosette_fnv1a64(ptr, bytes.byteLength >>> 0);
    return BigInt.asUintN(64, signed);
  }

  pqWireBytes(validators: number, schemeId: PqSignatureSchemeId = 0, batchSize = 1): number {
    const raw = this.exports.cqm_pq_wire_bytes(
      Math.max(0, Math.floor(validators)) >>> 0,
      schemeId >>> 0,
      Math.max(1, Math.floor(batchSize)) >>> 0,
    );
    return Number(BigInt.asUintN(64, raw));
  }

  geoRefineVerifyFrame(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ): { determinant: number; orientation: 'ccw' | 'cw' | 'collinear'; certified: boolean } {
    const det = this.exports.cqm_georefine_verify_frame(ax, ay, bx, by, cx, cy);
    const eps = 1e-12;
    const orientation = det > eps ? 'ccw' : det < -eps ? 'cw' : 'collinear';
    return {
      determinant: det,
      orientation,
      certified: orientation !== 'collinear' && Number.isFinite(det),
    };
  }

  eshkolDbspDeltaGemm(
    a: Float64Array,
    b: Float64Array,
    da: Float64Array,
    db: Float64Array,
    cInOut: Float64Array,
    dim: number,
  ): ZigEshkolDbspDeltaReport {
    const d = Math.max(1, Math.min(16, Math.floor(dim)));
    const cells = d * d;
    if (
      a.length < cells ||
      b.length < cells ||
      da.length < cells ||
      db.length < cells ||
      cInOut.length < cells
    ) {
      return { frobeniusNormC: 0, linearTermNorm: 0, crossTermNorm: 0, exactnessResidual: 0 };
    }
    const matBytes = cells * 8;
    const metricsBytes = 32;
    this.ensureCapacity(matBytes * 5 + metricsBytes);

    const aPtr = SCRATCH_BASE_OFFSET;
    const bPtr = aPtr + matBytes;
    const daPtr = bPtr + matBytes;
    const dbPtr = daPtr + matBytes;
    const cPtr = dbPtr + matBytes;
    const metricsPtr = cPtr + matBytes;

    this.f64View.set(a.subarray(0, cells), aPtr >> 3);
    this.f64View.set(b.subarray(0, cells), bPtr >> 3);
    this.f64View.set(da.subarray(0, cells), daPtr >> 3);
    this.f64View.set(db.subarray(0, cells), dbPtr >> 3);
    this.f64View.set(cInOut.subarray(0, cells), cPtr >> 3);

    this.exports.cqm_eshkol_dbsp_delta_gemm(aPtr, bPtr, daPtr, dbPtr, cPtr, metricsPtr, d >>> 0);

    a.set(this.f64View.subarray(aPtr >> 3, (aPtr >> 3) + cells));
    b.set(this.f64View.subarray(bPtr >> 3, (bPtr >> 3) + cells));
    cInOut.set(this.f64View.subarray(cPtr >> 3, (cPtr >> 3) + cells));

    const mBase = metricsPtr >> 3;
    return {
      frobeniusNormC: this.f64View[mBase] ?? 0,
      linearTermNorm: this.f64View[mBase + 1] ?? 0,
      crossTermNorm: this.f64View[mBase + 2] ?? 0,
      exactnessResidual: this.f64View[mBase + 3] ?? 0,
    };
  }

  eshkolCyclotomic8Mul(
    a: BigInt64Array | readonly [bigint, bigint, bigint, bigint],
    b: BigInt64Array | readonly [bigint, bigint, bigint, bigint],
  ): ZigEshkolCyclotomic8Report {
    this.ensureCapacity(32 * 4);
    const aPtr = SCRATCH_BASE_OFFSET;
    const bPtr = aPtr + 32;
    const prodPtr = bPtr + 32;
    const metricsPtr = prodPtr + 32;

    const aBase = aPtr >> 3;
    const bBase = bPtr >> 3;
    for (let i = 0; i < 4; i++) {
      this.i64View[aBase + i] = a[i] ?? 0n;
      this.i64View[bBase + i] = b[i] ?? 0n;
    }

    const norm = this.exports.cqm_eshkol_cyclotomic8_mul(aPtr, bPtr, prodPtr, metricsPtr);
    const product = new BigInt64Array(4);
    product.set(this.i64View.subarray(prodPtr >> 3, (prodPtr >> 3) + 4));
    const mBase = metricsPtr >> 3;

    return {
      product,
      re: this.f64View[mBase] ?? 0,
      im: this.f64View[mBase + 1] ?? 0,
      absSqReal: this.f64View[mBase + 2] ?? 0,
      exactFieldNorm: norm,
    };
  }

  moonlabQwzChernFhs(mass: number, gridN = 12): ZigMoonlabQwzChernReport {
    this.ensureCapacity(32);
    const metricsPtr = SCRATCH_BASE_OFFSET;
    const chern = this.exports.cqm_moonlab_qwz_chern_fhs(
      mass,
      Math.max(6, Math.min(32, Math.floor(gridN))) >>> 0,
      metricsPtr,
    );
    const mBase = metricsPtr >> 3;
    const quantizedChern = Math.round(chern) || 0;
    const topologicalPhase =
      quantizedChern > 0 ? 'chern-plus' : quantizedChern < 0 ? 'chern-minus' : 'trivial';
    return {
      chernNumber: chern,
      quantizedChern,
      minBandGap: this.f64View[mBase + 1] ?? 0,
      maxBandGap: this.f64View[mBase + 2] ?? 0,
      meanAbsPlaquetteFlux: this.f64View[mBase + 3] ?? 0,
      topologicalPhase,
    };
  }

  libirrepBdgSkyrmionMzm(
    gridL = 12,
    chargeQ = 1,
    mu = -3.0,
    jSd = 4.0,
    delta0 = 1.0,
  ): ZigLibirrepBdgSkyrmionReport {
    this.ensureCapacity(32);
    const metricsPtr = SCRATCH_BASE_OFFSET;
    const mzmCount = this.exports.cqm_libirrep_bdg_skyrmion_mzm(
      Math.max(6, Math.min(20, Math.floor(gridL))) >>> 0,
      Math.max(-4, Math.min(4, Math.trunc(chargeQ))) | 0,
      mu,
      jSd,
      delta0,
      metricsPtr,
    );
    const mBase = metricsPtr >> 3;
    return {
      mzmCount,
      topologicalCharge: this.f64View[mBase + 1] ?? 0,
      minBulkGap: this.f64View[mBase + 2] ?? 0,
      domainWallLocalization: this.f64View[mBase + 3] ?? 0,
      topologicalProtected: mzmCount > 0,
    };
  }

  sbnnMinsrStep(
    grads: Float64Array,
    energies: Float64Array,
    nSamples: number,
    nParams: number,
    diagShift = 1e-2,
    learningRate = 0.05,
  ): ZigSbnnMinsrReport {
    const ns = Math.max(2, Math.min(8, Math.floor(nSamples)));
    const np = Math.max(1, Math.min(32, Math.floor(nParams)));
    const delta = new Float64Array(np);
    if (grads.length < ns * np || energies.length < ns) {
      return { delta, meanEnergy: 0, energyVariance: 0, updateNorm: 0, traceT: 0 };
    }
    const gradsBytes = ns * np * 8;
    const energiesBytes = ns * 8;
    const deltaBytes = np * 8;
    const metricsBytes = 32;
    this.ensureCapacity(gradsBytes + energiesBytes + deltaBytes + metricsBytes);

    const gradsPtr = SCRATCH_BASE_OFFSET;
    const energiesPtr = gradsPtr + gradsBytes;
    const deltaPtr = energiesPtr + energiesBytes;
    const metricsPtr = deltaPtr + deltaBytes;

    this.f64View.set(grads.subarray(0, ns * np), gradsPtr >> 3);
    this.f64View.set(energies.subarray(0, ns), energiesPtr >> 3);

    const updateNorm = this.exports.cqm_sbnn_minsr_step(
      gradsPtr,
      energiesPtr,
      ns >>> 0,
      np >>> 0,
      diagShift,
      learningRate,
      deltaPtr,
      metricsPtr,
    );

    delta.set(this.f64View.subarray(deltaPtr >> 3, (deltaPtr >> 3) + np));
    const mBase = metricsPtr >> 3;
    return {
      delta,
      meanEnergy: this.f64View[mBase] ?? 0,
      energyVariance: this.f64View[mBase + 1] ?? 0,
      updateNorm,
      traceT: this.f64View[mBase + 3] ?? 0,
    };
  }
}

let _singleton: ZigKernelBridge | null = null;

export function getZigKernelBridge(): ZigKernelBridge {
  if (!_singleton) {
    _singleton = new ZigKernelBridge();
  }
  return _singleton;
}

export function zigGrayScottStep(
  u: Float64Array,
  v: Float64Array,
  uOut: Float64Array,
  vOut: Float64Array,
  width: number,
  height: number,
  du = 0.16,
  dv = 0.08,
  feed = 0.035,
  kill = 0.06,
  dt = 1.0,
): number {
  return getZigKernelBridge().grayScottStep(
    u,
    v,
    uOut,
    vOut,
    width,
    height,
    du,
    dv,
    feed,
    kill,
    dt,
  );
}

export function zigGrayScottStepRgbaF32(
  u: Float32Array,
  v: Float32Array,
  pixels: Uint8Array,
  width: number,
  height: number,
  steps = 2,
  du = 0.16,
  dv = 0.08,
  feed = 0.037,
  kill = 0.06,
  dt = 1.0,
): { meanV: number; peakV: number } {
  return getZigKernelBridge().grayScottStepRgbaF32(
    u,
    v,
    pixels,
    width,
    height,
    steps,
    du,
    dv,
    feed,
    kill,
    dt,
  );
}

export function zigTdseStep(
  re: Float64Array,
  im: Float64Array,
  potential: Float64Array,
  dt = 0.01,
  dx = 1.0,
): number {
  return getZigKernelBridge().tdseStep(re, im, potential, dt, dx);
}

export function zigQgtFubiniStudy(
  psiRe: Float64Array,
  psiIm: Float64Array,
  dpsiRe: Float64Array,
  dpsiIm: Float64Array,
): number {
  return getZigKernelBridge().qgtFubiniStudy(psiRe, psiIm, dpsiRe, dpsiIm);
}

export function zigQgtlFullTensor2D(
  psiRe: Float64Array,
  psiIm: Float64Array,
  dmuRe: Float64Array,
  dmuIm: Float64Array,
  dnuRe: Float64Array,
  dnuIm: Float64Array,
  eps = 0.05,
): ZigQgtlTensor2DReport {
  return getZigKernelBridge().qgtlFullTensor2D(psiRe, psiIm, dmuRe, dmuIm, dnuRe, dnuIm, eps);
}

export function zigMoonlabIsingAnneal(
  nQubits: number,
  jCouplings: Float64Array,
  hFields: Float64Array,
  steps = 32,
  totalTime = 4.0,
  scheduleKind: MoonlabAnnealScheduleId = 2,
): ZigMoonlabAnnealReport {
  return getZigKernelBridge().moonlabIsingAnneal(
    nQubits,
    jCouplings,
    hFields,
    steps,
    totalTime,
    scheduleKind,
  );
}

export function zigQrngQuantumChaosStep(
  stateWords: BigUint64Array,
  outSamples: Float64Array,
  jitterEntropy = 0n,
): bigint {
  return getZigKernelBridge().qrngQuantumChaosStep(stateWords, outSamples, jitterEntropy);
}

export function zigEshkolTaylorDiff(
  x: number,
  y: number,
  z: number,
  omega = 1.618033988749895,
  coupling = 0.25,
): ZigEshkolTaylorReport {
  return getZigKernelBridge().eshkolTaylorDiff(x, y, z, omega, coupling);
}

export function zigEntityBrainBatchForward(
  weights: Float32Array,
  inputs: Float32Array,
  hidden: Float32Array,
  outputs: Float32Array,
  count: number,
): number {
  return getZigKernelBridge().entityBrainBatchForward(weights, inputs, hidden, outputs, count);
}

export function zigGlyphHebbianStep(
  hebbian: Float32Array,
  hidden: Float32Array,
  dim = 32,
  lr = 0.005,
  decay = 0.002,
): number {
  return getZigKernelBridge().glyphHebbianStep(hebbian, hidden, dim, lr, decay);
}

export function zigRosetteFnv1a64(payload: Uint8Array | string): bigint {
  return getZigKernelBridge().rosetteFnv1a64(payload);
}

export function zigPqWireBytes(
  validators: number,
  schemeId: PqSignatureSchemeId = 0,
  batchSize = 1,
): number {
  return getZigKernelBridge().pqWireBytes(validators, schemeId, batchSize);
}

export function zigGeoRefineVerifyFrame(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): { determinant: number; orientation: 'ccw' | 'cw' | 'collinear'; certified: boolean } {
  return getZigKernelBridge().geoRefineVerifyFrame(ax, ay, bx, by, cx, cy);
}

export function zigEshkolDbspDeltaGemm(
  a: Float64Array,
  b: Float64Array,
  da: Float64Array,
  db: Float64Array,
  cInOut: Float64Array,
  dim: number,
): ZigEshkolDbspDeltaReport {
  return getZigKernelBridge().eshkolDbspDeltaGemm(a, b, da, db, cInOut, dim);
}

export function zigEshkolCyclotomic8Mul(
  a: BigInt64Array | readonly [bigint, bigint, bigint, bigint],
  b: BigInt64Array | readonly [bigint, bigint, bigint, bigint],
): ZigEshkolCyclotomic8Report {
  return getZigKernelBridge().eshkolCyclotomic8Mul(a, b);
}

export function zigMoonlabQwzChernFhs(mass: number, gridN = 12): ZigMoonlabQwzChernReport {
  return getZigKernelBridge().moonlabQwzChernFhs(mass, gridN);
}

export function zigLibirrepBdgSkyrmionMzm(
  gridL = 12,
  chargeQ = 1,
  mu = -3.0,
  jSd = 4.0,
  delta0 = 1.0,
): ZigLibirrepBdgSkyrmionReport {
  return getZigKernelBridge().libirrepBdgSkyrmionMzm(gridL, chargeQ, mu, jSd, delta0);
}

export function zigSbnnMinsrStep(
  grads: Float64Array,
  energies: Float64Array,
  nSamples: number,
  nParams: number,
  diagShift = 1e-2,
  learningRate = 0.05,
): ZigSbnnMinsrReport {
  return getZigKernelBridge().sbnnMinsrStep(
    grads,
    energies,
    nSamples,
    nParams,
    diagShift,
    learningRate,
  );
}

export function getZigKernelReceipt(): ZigKernelReceipt {
  const bridge = getZigKernelBridge();
  return {
    compilerVersion: CQM_ZIG_COMPILER_VERSION,
    wasmByteLength: CQM_ZIG_WASM_BYTE_LENGTH,
    wasmSha256: CQM_ZIG_WASM_SHA256,
    exports: [
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
    ],
    ready:
      typeof bridge.exports.cqm_gray_scott_step === 'function' &&
      typeof bridge.exports.cqm_moonlab_ising_anneal === 'function' &&
      typeof bridge.exports.cqm_qgtl_full_tensor_2d === 'function' &&
      typeof bridge.exports.cqm_eshkol_dbsp_delta_gemm === 'function' &&
      typeof bridge.exports.cqm_eshkol_cyclotomic8_mul === 'function' &&
      typeof bridge.exports.cqm_moonlab_qwz_chern_fhs === 'function' &&
      typeof bridge.exports.cqm_libirrep_bdg_skyrmion_mzm === 'function' &&
      typeof bridge.exports.cqm_sbnn_minsr_step === 'function',
  };
}
