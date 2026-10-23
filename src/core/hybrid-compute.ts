/**
 * Browser compute capability probes, routing proposals, and a CPU/WASM neural helper.
 *
 * Capability detection and proposed shard labels do not dispatch work. The entity-brain helper
 * executes the Zig WASM export synchronously on its calling CPU thread. This module does not
 * run a GPU pipeline, WebNN model, transform-feedback computation, or worker pool. The separate
 * wilderness-webgpu module owns the integrated, calibrated ambient GPU kernel.
 */

import { getZigKernelReceipt, zigEntityBrainBatchForward } from '../math/zig-bridge';
import { counterHash32 } from '../math/wild-entropy';
import { detectWebGpu } from './webgpu-detect';

/**
 * Unintegrated WGSL prototype for `6 -> 6 -> 4` forward passes plus counter-hash jitter.
 * No production pipeline dispatches this string, and it is not a numerical-parity receipt.
 * It does not implement biome dynamics or native CUDA/NPU execution.
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

fn counter_hash_32(seed: u32, tick: u32, entity_id: u32, channel: u32) -> u32 {
  var c0: u32 = entity_id ^ (channel * 0x9e3779b9u);
  var c1: u32 = tick ^ (channel * 0x85ebca6bu);
  var k0: u32 = seed ^ 0x243f6a88u;
  var k1: u32 = (seed * 0x6d2b79f5u) ^ 0xb7e15162u;

  for (var r: u32 = 0u; r < 4u; r = r + 1u) {
    let prod_lo: u32 = c0 * 0xd2511f53u;
    let mixed_hi: u32 = (c0 ^ (c0 >> 16u)) * 0xcd9e8d57u;
    let next0: u32 = mixed_hi ^ c1 ^ k0;
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

  let rng_word: u32 = counter_hash_32(params.seed ^ params.wild_salt, params.tick, idx, 0u);
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
  /** Suggested capacity, not the count of initialized workers. */
  readonly workerCount: number;
  readonly sharedArrayBufferAvailable: boolean;
  readonly zigWasmAvailable: boolean;
  /** @deprecated Unverified SIMD capability; always false in this module's probe results. */
  readonly zigWasmSimdAvailable: boolean;
  /** Adapter availability, not an executed compute workload. */
  readonly webGpuComputeAvailable: boolean;
  readonly webGpuAdapterName: string;
  /** An NPU-context request succeeded; the probe context was destroyed and no model ran. */
  readonly webNnNpuAvailable: boolean;
  readonly webNnDeviceType: 'npu' | 'gpu' | 'cpu' | 'unavailable';
}

export interface WorkerShardRange {
  readonly shardIndex: number;
  readonly startSlot: number;
  readonly endSlot: number;
  readonly count: number;
  /** Proposed destination only; the CPU helper does not dispatch to this processor. */
  readonly processor: 'cpu-worker' | 'gpu-compute' | 'npu-webnn';
}

export interface HybridWorkloadPlan {
  readonly kind: 'proposal-only';
  readonly totalEntities: number;
  /** Heuristic budget estimate; no camera query, rendering cull, or edge count measurement. */
  readonly proposedConnectomeLinks: number;
  /** @deprecated Compatibility alias of proposedConnectomeLinks; not active rendered links. */
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
 * Probe capabilities only. Optional adapter/context requests run concurrently with bounded
 * deadlines. No GPU device or model is created, and acquired WebNN contexts are destroyed,
 * including contexts whose request resolves after the deadline.
 */
export async function detectHybridHardware(timeoutMs = 1_000): Promise<HybridHardwareCapabilities> {
  const rawCores =
    typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)
      ? Math.max(1, Math.trunc(navigator.hardwareConcurrency))
      : 4;
  const workerCount = Math.max(1, Math.min(16, rawCores > 2 ? rawCores - 1 : rawCores));
  const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== 'undefined';
  const zigWasmAvailable = hasZigWasm();
  const deadline = Number.isFinite(timeoutMs) ? Math.min(5_000, Math.max(0, timeoutMs)) : 1_000;
  const [webGpu, webNnNpuAvailable] = await Promise.all([
    detectWebGpu(deadline),
    probeNpuContext(deadline),
  ]);

  return {
    cpuLogicalCores: rawCores,
    workerCount,
    sharedArrayBufferAvailable,
    zigWasmAvailable,
    zigWasmSimdAvailable: false,
    webGpuComputeAvailable: webGpu.available,
    webGpuAdapterName:
      webGpu.adapter ?? (webGpu.available ? 'WebGPU adapter available' : 'Unavailable'),
    webNnNpuAvailable,
    webNnDeviceType: webNnNpuAvailable ? 'npu' : 'unavailable',
  };
}

function hasZigWasm(): boolean {
  try {
    return getZigKernelReceipt().ready;
  } catch {
    return false;
  }
}

async function probeNpuContext(timeoutMs: number): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const ml = (navigator as unknown as BrowserMLNavigator).ml;
  const createContext = ml?.createContext;
  if (!ml || typeof createContext !== 'function') return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // This handler remains attached after timeout so late resources are still released.
  const request = Promise.resolve()
    .then(() => createContext.call(ml, { deviceType: 'npu', powerPreference: 'low-power' }))
    .then((context) => {
      if (
        context === null ||
        typeof context !== 'object' ||
        !('destroy' in context) ||
        typeof context.destroy !== 'function'
      )
        return false;
      context.destroy();
      return true;
    })
    .catch(() => false);
  try {
    return await Promise.race([
      request,
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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
    zigWasmAvailable: hasZigWasm(),
    webGpuComputeAvailable: false,
    webGpuAdapterName: 'Not probed',
    webNnNpuAvailable: false,
    webNnDeviceType: 'unavailable',
    ...overrides,
    zigWasmSimdAvailable: false,
  };
}

/**
 * Hypothetical partition of entities across capability labels. Every entity is assigned once,
 * but nothing is dispatched. Ratios are fixed heuristics, not benchmark-derived optimization.
 * The connectome estimate has no camera/fog inputs and is not applied to rendering.
 */
export function planHybridPartition(
  totalEntities: number,
  maxConnectomeLinks: number,
  hw: HybridHardwareCapabilities,
): HybridWorkloadPlan {
  const n = Number.isFinite(totalEntities) ? Math.max(0, Math.trunc(totalEntities)) : 0;
  const links = Number.isFinite(maxConnectomeLinks)
    ? Math.max(0, Math.trunc(maxConnectomeLinks))
    : 0;
  if (n === 0) {
    return {
      kind: 'proposal-only',
      totalEntities: 0,
      proposedConnectomeLinks: 0,
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

  // Hypothetical 55% GPU / 20% NPU budgets, not execution or performance measurements.
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

  // Partition the remaining proposed CPU workload; this does not initialize workers.
  const remaining = n - cursor;
  const requestedWorkers = Number.isFinite(hw.workerCount) ? Math.trunc(hw.workerCount) : 1;
  const workers = Math.max(1, Math.min(16, requestedWorkers, remaining));
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

  // Legacy heuristic budget only. No camera visibility or rendering edges are changed.
  const connectomeCameraCullRatio =
    links <= 120_000 ? 1.0 : Math.max(0.35, Math.min(1.0, Math.sqrt(120_000 / links)));

  return {
    kind: 'proposal-only',
    totalEntities: n,
    proposedConnectomeLinks: Math.round(links * connectomeCameraCullRatio),
    activeConnectomeLinks: Math.round(links * connectomeCameraCullRatio),
    shards,
    gpuAssignedEntities: gpuCount,
    npuAssignedEntities: npuCount,
    cpuAssignedEntities: remaining,
    connectomeCameraCullRatio,
  };
}

/**
 * Compatibility wrapper for the synchronous calling-thread CPU/WASM helper below.
 * Proposed GPU/NPU/worker labels do not select a different execution backend.
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
  return executeHybridEntityBrainBatchWithReceipt(
    weights,
    inputs,
    outputs,
    plan,
    seed,
    tick,
    applyCounterJitter,
  ).outputs;
}

export interface HybridEntityBrainExecution {
  readonly kind: 'execution-receipt';
  readonly outputs: Float32Array;
  readonly backendUsed: 'cpu-zig-wasm' | 'none';
  readonly executionContext: 'calling-thread';
  readonly kernelExport: 'cqm_entity_brain_batch_forward' | null;
  readonly processedEntities: number;
  readonly gpuExecutedEntities: 0;
  readonly npuExecutedEntities: 0;
}

/** Execute the actual WASM export on the calling CPU thread and verify its processed count. */
export function executeHybridEntityBrainBatchWithReceipt(
  weights: Float32Array,
  inputs: Float32Array,
  outputs: Float32Array,
  plan: HybridWorkloadPlan,
  seed = 0,
  tick = 0,
  applyCounterJitter = false,
): HybridEntityBrainExecution {
  const count = plan.totalEntities;
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    weights.length < count * 70 ||
    inputs.length < count * 6 ||
    outputs.length < count * 4
  )
    throw new RangeError('Entity-brain batch count exceeds its input/output buffers');
  let covered = 0;
  for (const shard of [...plan.shards].sort((a, b) => a.startSlot - b.startSlot)) {
    if (
      !Number.isSafeInteger(shard.startSlot) ||
      !Number.isSafeInteger(shard.endSlot) ||
      shard.startSlot !== covered ||
      shard.endSlot < shard.startSlot ||
      shard.endSlot > count ||
      shard.count !== shard.endSlot - shard.startSlot
    )
      throw new RangeError('Entity-brain shards must cover the batch exactly once');
    covered = shard.endSlot;
  }
  if (covered !== count) throw new RangeError('Entity-brain shards do not cover the batch');
  const scratchHidden = new Float32Array(Math.max(6, count * 6));
  let processedEntities = 0;

  for (const shard of plan.shards) {
    if (shard.count <= 0) continue;
    const wSub = weights.subarray(shard.startSlot * 70, shard.endSlot * 70);
    const inSub = inputs.subarray(shard.startSlot * 6, shard.endSlot * 6);
    const hidSub = scratchHidden.subarray(shard.startSlot * 6, shard.endSlot * 6);
    const outSub = outputs.subarray(shard.startSlot * 4, shard.endSlot * 4);

    const processed = zigEntityBrainBatchForward(wSub, inSub, hidSub, outSub, shard.count);
    if (processed !== shard.count)
      throw new Error('Entity-brain WASM export returned an incomplete batch');
    processedEntities += processed;

    if (applyCounterJitter) {
      for (let i = 0; i < shard.count; i++) {
        const entityId = shard.startSlot + i;
        const word = counterHash32(seed, tick, entityId, 0);
        const jitter = (word / 4294967296 - 0.5) * 0.002;
        const base = i * 4;
        outSub[base] = outSub[base]! + jitter;
        outSub[base + 1] = outSub[base + 1]! + jitter;
        outSub[base + 2] = outSub[base + 2]! + jitter;
        outSub[base + 3] = outSub[base + 3]! + jitter;
      }
    }
  }

  return {
    kind: 'execution-receipt',
    outputs,
    backendUsed: processedEntities > 0 ? 'cpu-zig-wasm' : 'none',
    executionContext: 'calling-thread',
    kernelExport: processedEntities > 0 ? 'cqm_entity_brain_batch_forward' : null,
    processedEntities,
    gpuExecutedEntities: 0,
    npuExecutedEntities: 0,
  };
}
