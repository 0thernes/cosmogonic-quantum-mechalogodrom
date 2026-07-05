/**
 * Runtime capability probe — answers "what can this browser tab actually use?" for the scaling
 * roadmap (ADR-0010 Stage 3) and the Gemini universal-compatibility checklist.
 *
 * Pure where possible; DOM/navigator reads are isolated here so sim logic stays headless-testable.
 * DETERMINISM-SAFE: never touches sim RNG or world state.
 */
import { resolveTier } from './quality';
import type { QualityTier } from '../types';

/** Graphics API the engine can target on this host (WebGPU is Stage 5; WebGL2 ships today). */
export type GraphicsApi = 'webgl2' | 'webgpu';

export interface RuntimeCapability {
  /** Logical CPU cores reported by the host (`hardwareConcurrency`, default 8). */
  cores: number;
  /** Chromium `deviceMemory` in GB when exposed; otherwise 8 (biases toward laptop-class). */
  memGB: number;
  /** Touch-first or sub-600px viewport — same rule as `detectQuality`. */
  isMobile: boolean;
  /** The tier this hardware COULD run (`resolveTier`); boot may still force `phone`. */
  hardwareTier: QualityTier;
  /** Whether `SharedArrayBuffer` is constructible (false on Safari without COOP/COEP). */
  sharedArrayBuffer: boolean;
  /** Worker pool size for future brain offload — leave one core for main + compositor. */
  workerCount: number;
  /** Best graphics API available synchronously at probe time. */
  graphicsApi: GraphicsApi;
}

const DEFAULT_CORES = 8;
const DEFAULT_MEM_GB = 8;

/** Clamp worker pool to [1, cores−1] so the main thread always retains a core. Pure. */
export function recommendedWorkerCount(cores: number): number {
  const c = Math.max(1, Math.floor(cores));
  return Math.max(1, c - 1);
}

/** True when cross-origin isolated shared memory is available (GitHub Pages: usually false). */
export function sharedArrayBufferAvailable(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') return false;
  try {
    // Constructing validates the constructor is usable (not just typed).
    new SharedArrayBuffer(8);
    return true;
  } catch {
    return false;
  }
}

/** Synchronous graphics probe — async adapter request is Stage 5 boot work. */
export function probeGraphicsApi(): GraphicsApi {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) return 'webgpu';
  return 'webgl2';
}

/**
 * Probe hardware tier from capability numbers — pure, testable without DOM.
 * `isMobile` should match `detectQuality`'s touch/viewport rule when called from the browser.
 */
export function probeHardwareTier(
  isMobile: boolean,
  cores = DEFAULT_CORES,
  memGB = DEFAULT_MEM_GB,
): QualityTier {
  return resolveTier(isMobile, cores, memGB);
}

/**
 * Full capability snapshot for boot diagnostics and future Worker gating.
 * Headless-safe: absent `navigator` ⇒ sane defaults (8 cores, 8 GB, no SAB).
 */
export function probeRuntimeCapability(opts?: {
  isMobile?: boolean;
  cores?: number;
  memGB?: number;
}): RuntimeCapability {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const cores = opts?.cores ?? nav?.hardwareConcurrency ?? DEFAULT_CORES;
  const memGB =
    opts?.memGB ??
    (nav && 'deviceMemory' in nav
      ? Number((nav as Navigator & { deviceMemory?: number }).deviceMemory)
      : DEFAULT_MEM_GB) ??
    DEFAULT_MEM_GB;
  const isMobile = opts?.isMobile ?? false;
  const hardwareTier = probeHardwareTier(isMobile, cores, memGB);
  return {
    cores,
    memGB,
    isMobile,
    hardwareTier,
    sharedArrayBuffer: sharedArrayBufferAvailable(),
    workerCount: recommendedWorkerCount(cores),
    graphicsApi: probeGraphicsApi(),
  };
}
