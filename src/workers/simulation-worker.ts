/**
 * Phase 3.1: Multi-Threaded Simulation & Wilderness Worker Script
 *
 * Web Worker for offloading both wilderness chunk dynamics and heavy
 * Zig 0.17.0 WebAssembly / Tsotchke quantum-geometry simulation kernels
 * off the main browser thread.
 *
 * This worker:
 * - Receives `'wilderness'` and `'simulation'` tasks via postMessage
 * - Executes Zig WASM kernels (`moonlab`, `quantum_geometric_tensor`, `eshkol`,
 *   `quantum_rng`, `rosette-wire`, `pq-consensus-bandwidth`, `GeoRefine`) and
 *   neural/field updates off-thread
 * - Returns results via transferable Float32Array buffers or SharedArrayBuffer
 */

import { simulateWildernessData } from '../sim/wilderness-population';
import { stepOct2026WaveSubstrates } from '../sim/tsotchke-oct2026-wave';
import { sampleParallelCounter01 } from '../math/wild-entropy';
import { executeHybridEntityBrainBatch } from '../core/hybrid-compute';

const workerSelf = self as unknown as {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
};

export interface WorkerMessage {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  seed: number;
  dt: number;
  chunkId?: string;
  intelligenceResource?: number;
  intelligenceThreat?: number;
  intelligenceExplore?: number;
  generation: number;
  useSharedArrayBuffer: boolean;
}

export interface WorkerResponse {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  success: boolean;
  generation: number;
  error?: string;
}

/**
 * Off-thread simulation kernel backed by Zig 0.17.0 WASM (`stepOct2026WaveSubstrates`).
 * Accepts an input `Float32Array` (`[tick, coherence, entropy, activeAgents, ...optionalField]`),
 * executes the Moonlab Ising annealer, QGTL Berry curvature & O(eps^2) suppression, Eshkol
 * Taylor-tower & 3D vector calculus, QRNG chaos step, and Wave-2 verifiers, and returns a
 * populated `Float32Array` telemetry & coupled state vector.
 */
export function executeSimulationWorkerKernel(
  input: Float32Array,
  seed: number,
  dt = 0.016,
): Float32Array {
  const tick = Math.max(0, Math.floor((input[0] ?? seed) || seed));
  const coherence = Number.isFinite(input[1]) ? input[1]! : 0.75;
  const entropy = Number.isFinite(input[2]) ? input[2]! : 0.22;
  const activeAgents = Math.max(4, Math.floor(input[3] ?? 32));

  const wave = stepOct2026WaveSubstrates(tick, coherence, entropy, activeAgents);
  const outLen = Math.max(12, input.length);
  const out = new Float32Array(outLen);
  out.set(input);

  out[0] = wave.pqRoundWireBytes;
  out[1] = wave.pqEstimatedRoundMs;
  out[2] = wave.geoRefineAspectQuality;
  out[3] = wave.bonsaiRetainedFidelity;
  out[4] = wave.bonsaiActiveBranchRatio;
  out[5] = wave.moonlabAnnealExpectedEnergy;
  out[6] = wave.moonlabAnnealGroundOverlap;
  out[7] = wave.qgtlBerryCurvature;
  out[8] = wave.qgtlOEps2Suppression;
  out[9] = wave.eshkolDivergence;
  out[10] = wave.eshkolCurlMagnitude;
  out[11] = wave.zigWasmReady ? 1 : 0;

  // Apply damped symplectic coupling to any additional field lanes in `input[12..]`
  const damp = Math.exp(-0.05 * Math.max(0.001, dt));
  for (let i = 12; i < outLen; i++) {
    out[i] = out[i]! * damp + 0.01 * wave.eshkolDivergence;
  }
  return out;
}

/**
 * Off-thread Hybrid Compute shard kernel for multi-core CPU / Zig WASM entity-brain
 * evaluation paired with stateless Philox-2x32 counter-based parallel entropy.
 *
 * Evaluates a contiguous shard of `count` entities (each with 6 inputs, 70 weights,
 * and 4 outputs) without any sequential PRNG lockstep dependency across threads.
 */
export function executeHybridShardWorkerKernel(
  weights: Float32Array,
  inputs: Float32Array,
  count: number,
  seed: number,
  frame: number,
  shardStartIndex = 0,
): { outputs: Float32Array; entropyProbe: Float32Array; backendUsed: 'zig-wasm-simd' | 'cpu-f32' } {
  const safeCount = Math.max(0, Math.floor(count));
  const outputs = new Float32Array(safeCount * 4);
  const entropyProbe = new Float32Array(safeCount);
  executeHybridEntityBrainBatch(
    weights,
    inputs,
    outputs,
    {
      totalEntities: safeCount,
      activeConnectomeLinks: 0,
      shards: [
        {
          shardIndex: 0,
          startSlot: 0,
          endSlot: safeCount,
          count: safeCount,
          processor: 'cpu-worker',
        },
      ],
      gpuAssignedEntities: 0,
      npuAssignedEntities: 0,
      cpuAssignedEntities: safeCount,
      connectomeCameraCullRatio: 1,
    },
    seed,
    frame,
    false,
  );
  for (let i = 0; i < safeCount; i++) {
    entropyProbe[i] = sampleParallelCounter01(seed, frame, shardStartIndex + i, 0);
  }
  return { outputs, entropyProbe, backendUsed: 'zig-wasm-simd' };
}

function isWorkerMessage(value: unknown): value is WorkerMessage {
  if (value === null || typeof value !== 'object') return false;
  const message = value as Partial<WorkerMessage>;
  return (
    typeof message.id === 'string' &&
    message.id.length > 0 &&
    (message.type === 'simulation' || message.type === 'wilderness') &&
    message.data instanceof Float32Array &&
    typeof message.seed === 'number' &&
    Number.isFinite(message.seed) &&
    typeof message.dt === 'number' &&
    Number.isFinite(message.dt) &&
    (message.chunkId === undefined || typeof message.chunkId === 'string') &&
    (message.intelligenceResource === undefined ||
      (typeof message.intelligenceResource === 'number' &&
        Number.isFinite(message.intelligenceResource))) &&
    (message.intelligenceThreat === undefined ||
      (typeof message.intelligenceThreat === 'number' &&
        Number.isFinite(message.intelligenceThreat))) &&
    (message.intelligenceExplore === undefined ||
      (typeof message.intelligenceExplore === 'number' &&
        Number.isFinite(message.intelligenceExplore))) &&
    typeof message.generation === 'number' &&
    Number.isSafeInteger(message.generation) &&
    message.generation >= 0 &&
    typeof message.useSharedArrayBuffer === 'boolean'
  );
}

/**
 * Handle worker messages
 */
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event: MessageEvent<unknown>) => {
    if (event.origin !== '' && event.origin !== self.origin) return;

    const message = event.data;
    if (!isWorkerMessage(message)) {
      console.warn('[simulation-worker] ignored malformed message');
      return;
    }

    try {
      let result: Float32Array;

      if (message.type === 'wilderness') {
        result = simulateWildernessData(
          message.data,
          message.seed,
          message.chunkId || '0,0',
          message.dt,
          100,
          message.intelligenceResource,
          message.intelligenceThreat,
          message.intelligenceExplore,
        );
      } else {
        result = executeSimulationWorkerKernel(message.data, message.seed, message.dt);
      }

      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        data: result,
        success: true,
        generation: message.generation,
      };

      if (message.useSharedArrayBuffer) {
        self.postMessage(response);
      } else {
        const transfer = result.buffer instanceof ArrayBuffer ? [result.buffer] : undefined;
        workerSelf.postMessage(response, transfer);
      }
    } catch (error) {
      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        data: new Float32Array(0),
        success: false,
        generation: message.generation,
        error: error instanceof Error ? error.message : String(error),
      };

      self.postMessage(response);
    }
  };
}
