/**
 * Phase 3.1: Worker Pool tests.
 *
 * Verifies that:
 * 1. Worker pool can be created with quality-tier-specific configuration
 * 2. SYNC executor works correctly (deterministic)
 * 3. Worker pool statistics are accurate
 * 4. Worker pool disposes correctly
 *
 * Note: Full worker integration tests require browser environment with Web Workers.
 * These tests focus on the SYNC executor path and pool management.
 */
import { describe, expect, test } from 'bun:test';
import { createWorkerPool, WorkerPool, type WorkerTask } from '../src/core/worker-pool';
import { WildernessPopulation } from '../src/sim/wilderness-population';
import type { QualityTier } from '../src/types';

describe('Phase 3.1: Worker Pool', () => {
  test('createWorkerPool creates pool with quality-tier-specific config', () => {
    const tiers: QualityTier[] = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'];

    for (const tier of tiers) {
      const pool = createWorkerPool(tier);
      expect(pool).toBeDefined();
      pool.dispose();
    }
  });

  test('WorkerPool executes SYNC tasks correctly', () => {
    const pool = createWorkerPool('desktop');

    const task: WorkerTask = {
      id: 'test-task-1',
      type: 'simulation',
      data: new Float32Array([1, 2, 3, 4, 5, 6]),
      seed: 12345,
      dt: 1 / 60,
    };

    const executor = (t: WorkerTask) => {
      // Simple executor: return data multiplied by 2
      const result = new Float32Array(t.data.length);
      for (let i = 0; i < t.data.length; i++) {
        const value = t.data[i];
        if (value !== undefined) {
          result[i] = value * 2;
        }
      }
      return result;
    };

    const result = pool.executeSync(task, executor);
    expect(result).toEqual(new Float32Array([2, 4, 6, 8, 10, 12]));

    pool.dispose();
  });

  test('WorkerPool SYNC executor is deterministic', () => {
    const pool = createWorkerPool('desktop');

    const task: WorkerTask = {
      id: 'test-task-2',
      type: 'simulation',
      data: new Float32Array([1, 2, 3]),
      seed: 12345,
      dt: 1 / 60,
    };

    const executor = (t: WorkerTask) => {
      // Deterministic executor based on seed
      const result = new Float32Array(t.data.length);
      for (let i = 0; i < t.data.length; i++) {
        const value = t.data[i];
        if (value !== undefined) {
          result[i] = value + t.seed;
        }
      }
      return result;
    };

    const result1 = pool.executeSync(task, executor);
    const result2 = pool.executeSync(task, executor);

    expect(result1).toEqual(result2);
    expect(result1).toEqual(new Float32Array([12346, 12347, 12348]));

    pool.dispose();
  });

  test('WorkerPool getStats returns correct statistics', () => {
    const pool = createWorkerPool('desktop');

    const stats = pool.getStats();
    expect(stats.totalWorkers).toBeGreaterThanOrEqual(0);
    expect(stats.availableWorkers).toBeGreaterThanOrEqual(0);
    expect(stats.activeTasks).toBe(0);
    expect(stats.pendingResults).toBe(0);

    pool.dispose();
  });

  test('WorkerPool dispose cleans up resources', () => {
    const pool = createWorkerPool('desktop');

    // Should not throw
    pool.dispose();

    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(0);
    expect(stats.availableWorkers).toBe(0);
    expect(stats.activeTasks).toBe(0);
    expect(stats.pendingResults).toBe(0);
  });

  test('WorkerPool handles empty data arrays', async () => {
    const pool = createWorkerPool('desktop');

    const task: WorkerTask = {
      id: 'test-task-empty',
      type: 'simulation',
      data: new Float32Array(0),
      seed: 12345,
      dt: 1 / 60,
    };

    const executor = (t: WorkerTask) => {
      return new Float32Array(t.data.length);
    };

    const result = pool.executeSync(task, executor);
    expect(result).toEqual(new Float32Array(0));

    const asyncResult = await pool.executeAsync(task);
    expect(asyncResult.success).toBe(false);
    expect(asyncResult.error).toContain('wilderness-only');

    const wildernessTask: WorkerTask = {
      id: 'test-wilderness-uninit',
      type: 'wilderness',
      data: new Float32Array(8),
      seed: 12345,
      dt: 1 / 60,
      chunkId: '0,0',
    };
    const uninitResult = await pool.executeAsync(wildernessTask);
    expect(uninitResult.success).toBe(false);
    expect(uninitResult.error).toContain('not initialized');

    pool.dispose();
  });

  test('WorkerPool handles large data arrays', () => {
    const pool = createWorkerPool('desktop');

    const largeData = new Float32Array(10000);
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i;
    }

    const task: WorkerTask = {
      id: 'test-task-large',
      type: 'simulation',
      data: largeData,
      seed: 12345,
      dt: 1 / 60,
    };

    const executor = (t: WorkerTask) => {
      return new Float32Array(t.data);
    };

    const result = pool.executeSync(task, executor);
    expect(result).toEqual(largeData);

    pool.dispose();
  });

  test('WorkerPool honors maxWorkers while capping to hardware concurrency', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;
    const workers: { terminate: () => void }[] = [];

    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      constructor(_url: string, _options?: WorkerOptions) {
        workers.push(this);
      }
      postMessage(): void {}
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: FakeWorker,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 8 },
    });

    const pool = new WorkerPool({
      maxWorkers: 3,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await pool.initialize('/fake-worker.js');
    expect(pool.getStats().totalWorkers).toBe(3);
    pool.dispose();

    const concurrent = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    const initializing = concurrent.initialize('/fake-worker.js');
    await expect(concurrent.initialize('/fake-worker.js')).rejects.toThrow(/initializ/);
    await initializing;
    expect(concurrent.getStats().totalWorkers).toBe(1);
    concurrent.dispose();

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 2 },
    });
    const capped = new WorkerPool({
      maxWorkers: 9,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await capped.initialize('/fake-worker.js');
    expect(capped.getStats().totalWorkers).toBe(2);
    capped.dispose();

    // Missing navigator fallback
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: undefined,
    });
    const noNav = new WorkerPool({
      maxWorkers: 4,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await noNav.initialize('/fake-worker.js');
    expect(noNav.getStats().totalWorkers).toBe(4);
    noNav.dispose();

    // Undefined hardwareConcurrency fallback
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    const noCores = new WorkerPool({
      maxWorkers: 5,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await noCores.initialize('/fake-worker.js');
    expect(noCores.getStats().totalWorkers).toBe(5);
    noCores.dispose();

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: originalWorker,
    });
  });

  test('executeWithTransferable does not detach caller-owned buffer views', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;

    class TransferWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(msg: WorkerTask & { generation: number; useSharedArrayBuffer: boolean }): void {
        const out = new Float32Array(msg.data);
        for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + 1;
        this.onmessage?.({
          data: {
            id: msg.id,
            type: msg.type,
            data: out,
            success: true,
            generation: msg.generation,
          },
        } as MessageEvent);
      }
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: TransferWorker,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 2 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await pool.initialize('/fake-worker.js');

    const owned = new Float32Array([1, 2, 3, 4]);
    const task: WorkerTask = {
      id: 'detach-guard',
      type: 'wilderness',
      data: owned,
      seed: 99,
      dt: 1 / 60,
      chunkId: '0,0',
    };

    const result = await pool.executeAsync(task);
    expect(result.success).toBe(true);
    expect(owned.byteLength).toBe(16);
    expect(owned[0]).toBe(1);

    pool.dispose();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: originalWorker,
    });
  });

  test('worker onerror settles the in-flight task (no hung waitForResult)', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;

    class ErrorWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(): void {
        this.onerror?.({ message: 'boom' } as ErrorEvent);
      }
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: ErrorWorker,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await pool.initialize('/fake-worker.js');

    const result = await pool.executeAsync({
      id: 'error-task',
      type: 'wilderness',
      data: new Float32Array(4),
      seed: 1,
      dt: 1 / 60,
      chunkId: '0,0',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('boom');
    expect(pool.getStats().activeTasks).toBe(0);

    pool.dispose();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: originalWorker,
    });
  });

  test('WorkerPool async path with event-driven resolution and queuing', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;

    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      constructor(_url: string, _options?: WorkerOptions) {}
      postMessage(msg: WorkerTask & { generation: number; useSharedArrayBuffer: boolean }): void {
        // Mock processing the message and replying asynchronously
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                id: msg.id,
                type: msg.type,
                data: msg.data,
                success: true,
                generation: msg.generation,
              },
            } as MessageEvent);
          }
        }, 10);
      }
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: FakeWorker,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 }, // exactly 1 worker
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
    });
    await pool.initialize('/fake-worker.js');

    const task1: WorkerTask = {
      id: 'async-task-1',
      type: 'wilderness',
      data: new Float32Array([10, 20]),
      seed: 99,
      dt: 1 / 60,
    };

    const promise = pool.executeAsync(task1);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.id).toBe('async-task-1');
    expect(result.data).toEqual(new Float32Array([10, 20]));

    const task2: WorkerTask = {
      id: 'queued-task-1',
      type: 'wilderness',
      data: new Float32Array([10]),
      seed: 1,
      dt: 1 / 60,
    };
    const task3: WorkerTask = {
      id: 'queued-task-2',
      type: 'wilderness',
      data: new Float32Array([20]),
      seed: 2,
      dt: 1 / 60,
    };

    const p1 = pool.executeAsync(task2);
    const p2 = pool.executeAsync(task3);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.success).toBe(true);
    expect(r1.id).toBe('queued-task-1');
    expect(r2.success).toBe(true);
    expect(r2.id).toBe('queued-task-2');

    pool.dispose();

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: originalWorker,
    });
  });

  test('equal-size SharedArrayBuffer tasks receive exclusive leases and stable results', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;
    const seenBuffers: Array<ArrayBufferLike> = [];

    class SabWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(msg: {
        id: string;
        type: 'wilderness';
        data: Float32Array;
        generation: number;
      }): void {
        seenBuffers.push(msg.data.buffer);
        const initial = msg.data[0] ?? 0;
        const reply = this.onmessage;
        setTimeout(
          () => {
            for (let i = 0; i < msg.data.length; i++) msg.data[i] = (msg.data[i] ?? 0) + 10;
            reply?.({
              data: {
                id: msg.id,
                type: msg.type,
                data: msg.data,
                success: true,
                generation: msg.generation,
              },
            } as MessageEvent);
          },
          initial === 1 ? 10 : 0,
        );
      }
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: SabWorker });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 2 },
    });

    const pool = new WorkerPool({
      maxWorkers: 2,
      useSharedArrayBuffer: true,
      qualityTier: 'desktop',
      taskTimeoutMs: 100,
    });

    try {
      await pool.initialize('/fake-worker.js');
      const first = pool.executeAsync({
        id: 'sab-a',
        type: 'wilderness',
        data: new Float32Array([1, 1]),
        seed: 1,
        dt: 1 / 60,
        chunkId: '0,0',
      });
      const second = pool.executeAsync({
        id: 'sab-b',
        type: 'wilderness',
        data: new Float32Array([2, 2]),
        seed: 2,
        dt: 1 / 60,
        chunkId: '1,0',
      });

      const [a, b] = await Promise.all([first, second]);
      expect(seenBuffers).toHaveLength(2);
      expect(seenBuffers[0]).not.toBe(seenBuffers[1]);
      expect(a.data).toEqual(new Float32Array([11, 11]));
      expect(b.data).toEqual(new Float32Array([12, 12]));

      // A later lease may reuse a free SAB, but previously resolved data must remain immutable.
      await pool.executeAsync({
        id: 'sab-c',
        type: 'wilderness',
        data: new Float32Array([3, 3]),
        seed: 3,
        dt: 1 / 60,
        chunkId: '2,0',
      });
      expect(a.data).toEqual(new Float32Array([11, 11]));
    } finally {
      pool.dispose();
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: originalWorker,
      });
    }
  });

  test('dispose settles both an active task and a saturated acquisition waiter', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;

    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(): void {}
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: HangingWorker });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
      taskTimeoutMs: 1000,
    });

    try {
      await pool.initialize('/fake-worker.js');
      const active = pool.executeAsync({
        id: 'dispose-active',
        type: 'wilderness',
        data: new Float32Array(8),
        seed: 1,
        dt: 1 / 60,
        chunkId: '0,0',
      });
      const queued = pool.executeAsync({
        id: 'dispose-queued',
        type: 'wilderness',
        data: new Float32Array(8),
        seed: 2,
        dt: 1 / 60,
        chunkId: '1,0',
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(pool.getStats().activeTasks).toBe(1);

      pool.dispose();
      const [activeResult, queuedResult] = await Promise.all([active, queued]);
      expect(activeResult.success).toBe(false);
      expect(activeResult.error).toContain('disposed');
      expect(queuedResult.success).toBe(false);
      expect(queuedResult.error).toContain('disposed');
      expect(pool.getStats()).toEqual({
        totalWorkers: 0,
        availableWorkers: 0,
        activeTasks: 0,
        pendingResults: 0,
      });
    } finally {
      pool.dispose();
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: originalWorker,
      });
    }
  });

  test('a saturated acquisition waiter has the same bounded deadline as active work', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;

    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(): void {}
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: HangingWorker });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
      taskTimeoutMs: 5,
    });

    try {
      await pool.initialize('/fake-worker.js');
      const active = pool.executeAsync({
        id: 'deadline-active',
        type: 'wilderness',
        data: new Float32Array(8),
        seed: 1,
        dt: 1 / 60,
        chunkId: '0,0',
      });
      const queued = pool.executeAsync({
        id: 'deadline-queued',
        type: 'wilderness',
        data: new Float32Array(8),
        seed: 2,
        dt: 1 / 60,
        chunkId: '1,0',
      });

      const queuedResult = await queued;
      const activeResult = await active;
      expect(queuedResult.success).toBe(false);
      expect(queuedResult.error).toContain('waiting for capacity');
      expect(activeResult.success).toBe(false);
      expect(activeResult.error).toContain('timed out');
    } finally {
      pool.dispose();
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: originalWorker,
      });
    }
  });

  test('timeout retires the worker and ignores its late generation before ID reuse', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;
    let instanceCount = 0;

    class GenerationWorker {
      readonly index = instanceCount++;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(msg: {
        id: string;
        type: 'wilderness';
        data: Float32Array;
        generation: number;
      }): void {
        const reply = this.onmessage;
        const response = {
          id: msg.id,
          type: msg.type,
          data: new Float32Array(msg.data),
          success: true,
          generation: msg.generation,
        };
        if (this.index === 0) setTimeout(() => reply?.({ data: response } as MessageEvent), 30);
        else setTimeout(() => reply?.({ data: response } as MessageEvent), 0);
      }
      terminate(): void {}
    }

    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: GenerationWorker });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
      taskTimeoutMs: 5,
    });

    try {
      await pool.initialize('/fake-worker.js');
      const timedOut = await pool.executeAsync({
        id: 'reused-id',
        type: 'wilderness',
        data: new Float32Array([1]),
        seed: 1,
        dt: Number.POSITIVE_INFINITY,
        chunkId: '0,0',
      });
      expect(timedOut.success).toBe(false);
      expect(timedOut.error).toContain('timed out');

      await new Promise((resolve) => setTimeout(resolve, 0));
      const replacement = await pool.executeAsync({
        id: 'reused-id',
        type: 'wilderness',
        data: new Float32Array([2]),
        seed: 2,
        dt: 10,
        chunkId: '0,0',
      });
      expect(replacement.success).toBe(true);
      expect(replacement.data).toEqual(new Float32Array([2]));

      await new Promise((resolve) => setTimeout(resolve, 35));
      expect(pool.getStats().activeTasks).toBe(0);
      expect(pool.getStats().pendingResults).toBe(0);
    } finally {
      pool.dispose();
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: originalWorker,
      });
    }
  });

  test('repeated asynchronous startup errors exhaust replacement budget and preserve sync fallback', async () => {
    const originalWorker = globalThis.Worker;
    const originalNavigator = globalThis.navigator;
    let constructed = 0;

    class StartupErrorWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      private terminated = false;

      constructor() {
        constructed++;
        // Browser worker script/CSP failures are asynchronous: construction succeeds, then `error`
        // fires after the pool has admitted the worker.
        setTimeout(() => {
          if (!this.terminated)
            this.onerror?.({ message: 'worker script failed to load' } as ErrorEvent);
        }, 0);
      }

      postMessage(): void {}

      terminate(): void {
        this.terminated = true;
      }
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: StartupErrorWorker,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { hardwareConcurrency: 1 },
    });

    const pool = new WorkerPool({
      maxWorkers: 1,
      useSharedArrayBuffer: false,
      qualityTier: 'desktop',
      taskTimeoutMs: 100,
      maxReplacementAttempts: 2,
    });
    const wilderness = new WildernessPopulation(pool, 0x1234abcd);

    try {
      await pool.initialize('/missing-worker.js');
      for (let i = 0; i < 40; i++) {
        if (constructed === 3 && pool.getStats().totalWorkers === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // One initial worker + exactly two replacements, then the failed slot remains retired.
      expect(constructed).toBe(3);
      expect(pool.getStats()).toEqual({
        totalWorkers: 0,
        availableWorkers: 0,
        activeTasks: 0,
        pendingResults: 0,
      });
      await new Promise((resolve) => setTimeout(resolve, 15));
      expect(constructed).toBe(3);

      const unavailable = await pool.executeAsync({
        id: 'startup-exhausted',
        type: 'wilderness',
        data: new Float32Array(8),
        seed: 1,
        dt: 1 / 60,
        chunkId: '0,0',
      });
      expect(unavailable.success).toBe(false);
      expect(unavailable.error).toContain('not initialized');

      // Wilderness consumes that failure through its shared main-thread kernel instead of stalling.
      wilderness.update(0, 0, 1 / 60);
      const before = wilderness.getSnapshot('0,0');
      expect(before).not.toBeNull();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const after = wilderness.getSnapshot('0,0');
      expect(after).not.toBeNull();
      let changed = false;
      for (let i = 0; i < (before?.positions.length ?? 0); i++) {
        if (before?.positions[i] !== after?.positions[i]) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    } finally {
      wilderness.dispose();
      pool.dispose();
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: originalWorker,
      });
    }
  });
});
