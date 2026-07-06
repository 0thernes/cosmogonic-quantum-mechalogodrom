/**
 * Phase 3.1: Simulation Worker Script
 *
 * Web Worker for offloading simulation tasks.
 * Implements ADR 0010's worker kernel for wilderness simulation.
 *
 * This worker:
 * - Receives simulation tasks via postMessage
 * - Executes brain evaluation logic off-thread
 * - Returns results via transferable Float32Array buffers
 * - Supports SharedArrayBuffer for zero-copy where available
 */

import { mulberry32, hashSeed } from '../math/rng';

const workerSelf = self as unknown as {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
};

export interface WorkerMessage {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  seed: number;
  chunkId?: string;
  useSharedArrayBuffer: boolean;
}

export interface WorkerResponse {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  success: boolean;
  error?: string;
}

/**
 * Simple simulation kernel for wilderness entities
 *
 * This is a placeholder implementation that will be extended with
 * actual brain evaluation logic. For now, it performs basic
 * position updates to demonstrate the worker infrastructure.
 */
function simulateWilderness(data: Float32Array, seed: number, chunkId: string): Float32Array {
  const rng = mulberry32(seed ^ hashSeed(chunkId));
  const STRIDE = 8;
  const dt = 1 / 60;

  for (let i = 0; i + STRIDE <= data.length; i += STRIDE) {
    let vx = data[i + 3] ?? 0;
    let vy = data[i + 4] ?? 0;
    let vz = data[i + 5] ?? 0;
    const pulse = rng();
    vx += (pulse - 0.5) * 0.04;
    vy += (rng() - 0.5) * 0.02;
    vz += (rng() - 0.5) * 0.04;
    data[i] = (data[i] ?? 0) + vx * dt;
    data[i + 1] = (data[i + 1] ?? 0) + vy * dt;
    data[i + 2] = (data[i + 2] ?? 0) + vz * dt;
    data[i + 3] = vx * 0.985;
    data[i + 4] = vy * 0.985;
    data[i + 5] = vz * 0.985;
  }

  return data;
}

/**
 * Handle worker messages
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  try {
    let result: Float32Array;

    if (message.type === 'wilderness') {
      result = simulateWilderness(message.data, message.seed, message.chunkId || 'default');
    } else {
      // Simulation type - placeholder
      result = new Float32Array(message.data);
    }

    const response: WorkerResponse = {
      id: message.id,
      type: message.type,
      data: result,
      success: true,
    };

    // Send response with transferable buffer
    if (message.useSharedArrayBuffer) {
      // SharedArrayBuffer: no transfer needed (it's shared memory)
      self.postMessage(response);
    } else {
      // Transferable: transfer buffer ownership
      const transfer = result.buffer instanceof ArrayBuffer ? [result.buffer] : undefined;
      workerSelf.postMessage(response, transfer);
    }
  } catch (error) {
    const response: WorkerResponse = {
      id: message.id,
      type: message.type,
      data: new Float32Array(0),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};
