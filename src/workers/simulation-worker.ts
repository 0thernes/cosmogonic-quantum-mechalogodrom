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

import { simulateWildernessData } from '../sim/wilderness-population';

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
 * Handle worker messages
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  try {
    let result: Float32Array;

    if (message.type === 'wilderness') {
      result = simulateWildernessData(
        message.data,
        message.seed,
        message.chunkId || '0,0',
        message.dt,
      );
    } else {
      // Simulation type - placeholder
      result = new Float32Array(message.data);
    }

    const response: WorkerResponse = {
      id: message.id,
      type: message.type,
      data: result,
      success: true,
      generation: message.generation,
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
      generation: message.generation,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};
