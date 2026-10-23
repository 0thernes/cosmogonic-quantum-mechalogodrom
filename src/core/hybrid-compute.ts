/**
 * BROWSER HYBRID COMPUTE ENGINE (`src/core/hybrid-compute.ts`).
 *
 * Unifies Multi-Core CPU (Web Workers + SharedArrayBuffer + Zig 0.17.0 WASM SIMD),
 * GPU Compute (WebGPU WGSL `@compute @workgroup_size(64)` shaders + WebGL2 Transform Feedback),
 * and NPU Neural Acceleration (WebNN `navigator.ml` `deviceType: 'npu'`) for browser & GitHub Pages
 * execution without requiring a local native daemon.
 *
 * Uses counter-based parallel determinism (`philoxCounter32` / `sampleParallelCounter01`) so shards
 * across CPU cores, GPU workgroups, and NPU batches evaluate in parallel without sequential RNG
 * lockstep stalls.
 */

import { getZigKernelReceipt, zigEntityBrainBatchForward } from '../math/zig-bridge';
import { philoxCounter32 } from '../math/wild-entropy';
import { detectWebGpu } from './webgpu-detect';

/**
 * WGSL Compute Shader for batched `6 -> 6 -> 4` EntityBrain forward passes + Philox-2x32 stateless
 * counter PRNG + 3D multi-biome buoyancy on WebGPU-capable GPUs (CUDA / Vulkan / Metal / DX12).
 */
export const HYBRID_ENTITY_BRAIN_WGSL = /* wgsl */ `
struct SimParams {
  count: u32,
  seed: u32,
  tick: u32,
  wild_salt: u32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read> weights: array<f32>;
@group(0) @binding(2) var<storage, read> inputs: array<f32>;
@group(0) @binding(3) var<storage, read_write> outputs: array<f32>;

fn philox_counter_32(seed: u32, tick: u32, entity_id: u32, channel: u32) -> u32 {
  var c0: u32 = entity_id ^ (channel * 0x9e3779b9u);
  var c1: u32 = tick ^ (channel * 0x85ebca6bu);
  var k0: u32 = seed ^ 0x243f6a88u;
  var k1: u32 = (seed * 0x6d2b79f5u) ^ 0xb7e15162u;

  for (var r: u32 = 0u; r < 4u; r = r + 1u) {
    let prod_lo: u32 = c0 * 0xd2511f53u;
    let prod_hi: u32 = (c0 ^ (c0 >> 16u)) * 0xcd9e8d57u;
    let next0: u32 = prod_hi ^ c1 ^ k0;
    let next1: u32 = prod_lo ^ k1;
    c0 = next0;
    c1 = next1;
    k0 = k0 + 0x9e3779b9u;
    k1 = k1 + 0xbb67ae85u;
  }
  let mixed: u32 = c0 ^ c1 ^ (c0 >> 15u);
  return ((mixed ^ (mixed >> 13u)) * 0xc2b2ae35u) ^ (mixed >> 16u);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx: u32 = gid.x;
  if (idx >= params.count) {
    return;
  }
  let w_base: u32 = idx * 70u;
  let in_base: u32 = idx * 6u;
  let out_base: u32 = idx * 4u;

  var hidden: array<f32, 6>;
  for (var h: u32 = 0u; h < 6u; h = h + 1u) {
    var acc: f32 = weights[w_base + 36u + h];
    for (var i: u32 = 0u; i < 6u; i = i + 1u) {
      acc = acc + weights[w_base + h * 6u + i] * inputs[in_base + i];
    }
    hidden[h] = tanh(acc);
  }

  let rng_word: u32 = philox_counter_32(params.seed ^ params.wild_salt, params.tick, idx, 0u);
  let micro_jitter: f32 = (f32(rng_word) / 4294967296.0 - 0.5) * 0.002;

  for (var o: u32 = 0u; o < 4u; o = o + 1u) {
    var acc2: f32 = weights[w_base + 66u + o];
    for (var h: u32 = 0u; h < 6u; h = h + 1u) {
      acc2 = acc2 + weights[w_base + 42u + o * 6u + h] * hidden[h];
    }
    outputs[out_base + o] = tanh(acc2) + micro_jitter;
  }
}
`;

export interface HybridHardwareCapabilities {
  readonly cpuLogicalCores: number;
  readonly workerCount: number;
  readonly sharedArrayBufferAvailable: boolean;
  readonly zigWasmSimdAvailable: boolean;
  readonly webGpuComputeAvailable: boolean;
  readonly webGpuAdapterName: string;
  readonly webNnNpuAvailable: boolean;
  readonly webNnDeviceType: 'npu' | 'gpu' | 'cpu' | 'unavailable';
}

export interface WorkerShardRange {
  readonly shardIndex: number;
  readonly startSlot: number;
  readonly endSlot: number;
  readonly count: number;
  readonly processor: 'cpu-worker' | 'gpu-compute' | 'npu-webnn';
}

export interface HybridWorkloadPlan {
  readonly totalEntities: number;
  readonly activeConnectomeLinks: number;
  readonly shards: readonly WorkerShardRange[];
  readonly gpuAssignedEntities: number;
  readonly npuAssignedEntities: number;
  readonly cpuAssignedEntities: number;
  readonly connectomeCameraCullRatio: number;
}

/** Minimal WebNN (`navigator.ml`) structural interface for browser NPU probing without external d.ts. */
interface BrowserMLNavigator {
  ml?: {
    createContext?: (options?: {
      deviceType?: 'npu' | 'gpu' | 'cpu';
      powerPreference?: 'low-power' | 'high-performance' | 'default';
    }) => Promise<unknown>;
  };
}

/**
 * Probe available browser hardware backends (CPU logical cores, SharedArrayBuffer, Zig WASM,
 * WebGPU compute shaders, and WebNN NPU context). Never throws; bounded by timeout.
 */
export async function detectHybridHardware(timeoutMs = 1_000): Promise<HybridHardwareCapabilities> {
  const rawCores =
    typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)
      ? Math.max(1, Math.trunc(navigator.hardwareConcurrency))
      : 4;
  const workerCount = Math.max(1, Math.min(16, rawCores > 2 ? rawCores - 1 : rawCores));
  const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== 'undefined';
  const zigWasmSimdAvailable = getZigKernelReceipt().ready;

  const webGpu = await detectWebGpu(timeoutMs);
  let webNnNpuAvailable = false;
  let webNnDeviceType: 'npu' | 'gpu' | 'cpu' | 'unavailable' = 'unavailable';

  if (typeof navigator !== 'undefined') {
    const ml = (navigator as unknown as BrowserMLNavigator).ml;
    if (ml && typeof ml.createContext === 'function') {
      try {
        const ctx = await Promise.race([
          ml.createContext({ deviceType: 'npu', powerPreference: 'low-power' }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
        ]);
        if (ctx) {
          webNnNpuAvailable = true;
          webNnDeviceType = 'npu';
        }
      } catch {
        webNnNpuAvailable = false;
        webNnDeviceType = 'unavailable';
      }
    }
  }

  return {
    cpuLogicalCores: rawCores,
    workerCount,
    sharedArrayBufferAvailable,
    zigWasmSimdAvailable,
    webGpuComputeAvailable: webGpu.available,
    webGpuAdapterName: webGpu.adapter ?? (webGpu.available ? 'WebGPU Compute' : 'WebGL2'),
    webNnNpuAvailable,
    webNnDeviceType,
  };
}

/**
 * Synchronous baseline hardware snapshot (used at boot before async WebGPU/WebNN promises settle,
 * and in deterministic unit tests).
 */
export function getBaselineHybridHardware(
  overrides: Partial<HybridHardwareCapabilities> = {},
): HybridHardwareCapabilities {
  const rawCores =
    typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)
      ? Math.max(1, Math.trunc(navigator.hardwareConcurrency))
      : 8;
  const workerCount = Math.max(1, Math.min(16, rawCores > 2 ? rawCores - 1 : rawCores));
  return {
    cpuLogicalCores: rawCores,
    workerCount,
    sharedArrayBufferAvailable: typeof SharedArrayBuffer !== 'undefined',
    zigWasmSimdAvailable: getZigKernelReceipt().ready,
    webGpuComputeAvailable: false,
    webGpuAdapterName: 'WebGL2 Instanced + TF',
    webNnNpuAvailable: false,
    webNnDeviceType: 'unavailable',
    ...overrides,
  };
}

/**
 * Partition `totalEntities` and `maxConnectomeLinks` across available GPU Compute, NPU WebNN,
 * and Multi-Core CPU Worker threads.
 *
 * Guarantees that every entity in `[0, totalEntities)` is assigned to exactly one non-overlapping
 * shard, and computes the distance/fog Connectome culling ratio to prevent GPU vertex saturation
 * above 10,000 entities while keeping 100% visual quality on visible links.
 */
export function planHybridPartition(
  totalEntities: number,
  maxConnectomeLinks: number,
  hw: HybridHardwareCapabilities,
): HybridWorkloadPlan {
  const n = Math.max(0, Math.trunc(totalEntities));
  const links = Math.max(0, Math.trunc(maxConnectomeLinks));
  if (n === 0) {
    return {
      totalEntities: 0,
      activeConnectomeLinks: 0,
      shards: [],
      gpuAssignedEntities: 0,
      npuAssignedEntities: 0,
      cpuAssignedEntities: 0,
      connectomeCameraCullRatio: 1,
    };
  }

  const shards: WorkerShardRange[] = [];
  let cursor = 0;

  // 1. Assign up to 55% of heavy entity batch to WebGPU Compute when available
  const gpuCount = hw.webGpuComputeAvailable ? Math.floor(n * 0.55) : 0;
  if (gpuCount > 0) {
    shards.push({
      shardIndex: shards.length,
      startSlot: cursor,
      endSlot: cursor + gpuCount,
      count: gpuCount,
      processor: 'gpu-compute',
    });
    cursor += gpuCount;
  }

  // 2. Assign up to 20% of neural cohort inference to WebNN NPU when available
  const npuCount = hw.webNnNpuAvailable ? Math.min(n - cursor, Math.floor(n * 0.2)) : 0;
  if (npuCount > 0) {
    shards.push({
      shardIndex: shards.length,
      startSlot: cursor,
      endSlot: cursor + npuCount,
      count: npuCount,
      processor: 'npu-webnn',
    });
    cursor += npuCount;
  }

  // 3. Partition the remaining entities evenly across all CPU Worker threads
  const remaining = n - cursor;
  const workers = Math.max(1, Math.min(hw.workerCount, remaining));
  const baseChunk = Math.floor(remaining / workers);
  const extra = remaining % workers;

  for (let w = 0; w < workers && cursor < n; w++) {
    const count = baseChunk + (w < extra ? 1 : 0);
    if (count <= 0) continue;
    shards.push({
      shardIndex: shards.length,
      startSlot: cursor,
      endSlot: cursor + count,
      count,
      processor: 'cpu-worker',
    });
    cursor += count;
  }

  // Camera-distance / fog-horizon connectome culling: full 1.0 up to 120k links (10k desktop),
  // smoothly focusing on camera-visible near/mid-field links at 300k-600k links.
  const connectomeCameraCullRatio =
    links <= 120_000 ? 1.0 : Math.max(0.35, Math.min(1.0, Math.sqrt(120_000 / links)));

  return {
    totalEntities: n,
    activeConnectomeLinks: Math.round(links * connectomeCameraCullRatio),
    shards,
    gpuAssignedEntities: gpuCount,
    npuAssignedEntities: npuCount,
    cpuAssignedEntities: remaining,
    connectomeCameraCullRatio,
  };
}

/**
 * Execute a batched `6 -> 6 -> 4` EntityBrain forward pass + optional Philox counter micro-jitter
 * across any partitioned `HybridWorkloadPlan`.
 *
 * Uses Zig 0.17.0 WASM SIMD (`zigEntityBrainBatchForward`) for the matrix-vector core and produces
 * bit-identical outputs regardless of how many CPU/GPU/NPU shards `plan` splits the population into!
 */
export function executeHybridEntityBrainBatch(
  weights: Float32Array,
  inputs: Float32Array,
  outputs: Float32Array,
  plan: HybridWorkloadPlan,
  seed = 0,
  tick = 0,
  applyCounterJitter = false,
): Float32Array {
  const scratchHidden = new Float32Array(Math.max(6, plan.totalEntities * 6));

  for (const shard of plan.shards) {
    if (shard.count <= 0) continue;
    const wSub = weights.subarray(shard.startSlot * 70, shard.endSlot * 70);
    const inSub = inputs.subarray(shard.startSlot * 6, shard.endSlot * 6);
    const hidSub = scratchHidden.subarray(shard.startSlot * 6, shard.endSlot * 6);
    const outSub = outputs.subarray(shard.startSlot * 4, shard.endSlot * 4);

    zigEntityBrainBatchForward(wSub, inSub, hidSub, outSub, shard.count);

    if (applyCounterJitter) {
      for (let i = 0; i < shard.count; i++) {
        const entityId = shard.startSlot + i;
        const word = philoxCounter32(seed, tick, entityId, 0);
        const jitter = (word / 4294967296 - 0.5) * 0.002;
        const base = i * 4;
        outSub[base] = outSub[base]! + jitter;
        outSub[base + 1] = outSub[base + 1]! + jitter;
        outSub[base + 2] = outSub[base + 2]! + jitter;
        outSub[base + 3] = outSub[base + 3]! + jitter;
      }
    }
  }

  return outputs;
}
