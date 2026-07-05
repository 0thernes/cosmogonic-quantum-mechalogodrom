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

  for (let i = 0; i < data.length; i += 3) {
    const rngValue = rng();
    const x = data[i] || 0;
    data[i] = x + (rngValue - 0.5) * 0.1;

    if (i + 1 < data.length) {
      const rngValue2 = rng();
      const y = data[i + 1] || 0;
      data[i + 1] = y + (rngValue2 - 0.5) * 0.1;
    }

    if (i + 2 < data.length) {
      const rngValue3 = rng();
      const z = data[i + 2] || 0;
      data[i + 2] = z + (rngValue3 - 0.5) * 0.1;
    }
  }

  return data;
}

/**
 * Mulberry32 PRNG for deterministic wilderness simulation
 */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ ((t >>> 14) * (t | 1))) >>> 0) / 4294967296;
  };
}

/**
 * Simple hash function for chunk seeding
 */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
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
      // @ts-ignore - Bun's Transferable type differs from Web standard
      self.postMessage(response, [result.buffer]);
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
