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
});
