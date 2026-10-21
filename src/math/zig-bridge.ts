/**
 * Zig 0.17.0 WebAssembly Kernel Bridge (`zig/src/root.zig` -> `cqm_kernels.wasm`)
 *
 * Provides deterministic, zero-GC-allocation systems & math kernels compiled
 * from Zig 0.17.0 (`wasm32-freestanding`, `ReleaseSmall`) for:
 *   1. `cqm_gray_scott_step` — 2D Gray-Scott reaction-diffusion PDE on a torus
 *   2. `cqm_tdse_step` — 1D symplectic/unitary Time-Dependent Schrödinger step
 *   3. `cqm_qgt_fubini_study` — Fubini-Study Quantum Geometric Tensor diagonal
 *   4. `cqm_rosette_fnv1a64` — Tsotchke `rosette-wire` canonical 64-bit FNV-1a digest
 *   5. `cqm_pq_wire_bytes` — Tsotchke `pq-consensus-bandwidth` BFT wire-footprint calculator
 *   6. `cqm_georefine_verify_frame` — Tsotchke `GeoRefine` dual-frame orientation determinant
 */

import {
  CQM_ZIG_COMPILER_VERSION,
  CQM_ZIG_WASM_BYTE_LENGTH,
  CQM_ZIG_WASM_SHA256,
  decodeZigWasmBytes,
} from './zig-wasm-binary';

export type PqSignatureSchemeId = 0 | 1 | 2;

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
}

export interface ZigKernelReceipt {
  compilerVersion: string;
  wasmByteLength: number;
  wasmSha256: string;
  exports: readonly string[];
  ready: boolean;
}

const SCRATCH_BASE_OFFSET = 65536; // 64 KiB reserved above stack

class ZigKernelBridge {
  readonly exports: ZigWasmExports;
  private f64View: Float64Array;
  private u8View: Uint8Array;

  constructor() {
    const bytes = decodeZigWasmBytes();
    const mod = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(mod, {});
    this.exports = instance.exports as unknown as ZigWasmExports;
    this.f64View = new Float64Array(this.exports.memory.buffer);
    this.u8View = new Uint8Array(this.exports.memory.buffer);
  }

  private ensureCapacity(requiredBytes: number): void {
    const totalNeeded = SCRATCH_BASE_OFFSET + requiredBytes;
    const currentBytes = this.exports.memory.buffer.byteLength;
    if (totalNeeded > currentBytes) {
      const missingPages = Math.ceil((totalNeeded - currentBytes) / 65536);
      this.exports.memory.grow(missingPages);
      this.f64View = new Float64Array(this.exports.memory.buffer);
      this.u8View = new Uint8Array(this.exports.memory.buffer);
    } else if (this.f64View.buffer !== this.exports.memory.buffer) {
      this.f64View = new Float64Array(this.exports.memory.buffer);
      this.u8View = new Uint8Array(this.exports.memory.buffer);
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

export function getZigKernelReceipt(): ZigKernelReceipt {
  const bridge = getZigKernelBridge();
  return {
    compilerVersion: CQM_ZIG_COMPILER_VERSION,
    wasmByteLength: CQM_ZIG_WASM_BYTE_LENGTH,
    wasmSha256: CQM_ZIG_WASM_SHA256,
    exports: [
      'cqm_gray_scott_step',
      'cqm_tdse_step',
      'cqm_qgt_fubini_study',
      'cqm_rosette_fnv1a64',
      'cqm_pq_wire_bytes',
      'cqm_georefine_verify_frame',
    ],
    ready: typeof bridge.exports.cqm_gray_scott_step === 'function',
  };
}
