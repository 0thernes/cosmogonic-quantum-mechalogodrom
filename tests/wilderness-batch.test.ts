import { describe, expect, test } from 'bun:test';
import {
  WildernessPopulation,
  simulateWildernessData,
  type WildernessBatchExecutor,
} from '../src/sim/wilderness-population';
import type { WorkerTask, WorkerResult, WorkerPool } from '../src/core/worker-pool';

function resultFor(task: WorkerTask): WorkerResult {
  const data = new Float32Array(task.data);
  simulateWildernessData(
    data,
    task.seed,
    task.chunkId ?? '0,0',
    task.dt,
    100,
    task.intelligenceResource,
    task.intelligenceThreat,
    task.intelligenceExplore,
  );
  return { id: task.id, type: task.type, data, success: true };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function deferredBatch(): {
  executor: WildernessBatchExecutor;
  calls: { tasks: readonly WorkerTask[]; resolve: (results: WorkerResult[]) => void }[];
  disposed: () => number;
} {
  const calls: { tasks: readonly WorkerTask[]; resolve: (results: WorkerResult[]) => void }[] = [];
  let disposed = 0;
  return {
    calls,
    disposed: () => disposed,
    executor: {
      adapterDescription: 'test GPU',
      executeBatch: (tasks) =>
        new Promise((resolve) => {
          calls.push({ tasks, resolve });
        }),
      dispose: () => {
        disposed++;
      },
    },
  };
}

describe('wilderness batch ownership and fallback', () => {
  test('the selected GPU batch replaces CPU execution and publishes one matching frame', async () => {
    let workerCalls = 0;
    let gpuCalls = 0;
    const pool = {
      executeAsync: async (task: WorkerTask) => {
        workerCalls++;
        return resultFor(task);
      },
    } as unknown as WorkerPool;
    const gpu: WildernessBatchExecutor = {
      adapterDescription: 'validated device',
      executeBatch: async (tasks) => {
        gpuCalls++;
        expect(tasks).toHaveLength(49);
        return tasks.map(resultFor);
      },
    };
    const sync = new WildernessPopulation(null, 42);
    const pop = new WildernessPopulation(pool, 42);
    pop.setBatchExecutor(gpu);
    sync.update(0, 0, 1 / 60);
    pop.update(0, 0, 1 / 60);
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(sync.getSnapshot('0,0')!.positions);
    expect(gpuCalls).toBe(1);
    expect(workerCalls).toBe(0);
    expect(pop.getComputeStatus()).toMatchObject({
      backend: 'webgpu',
      acceptedBackend: 'webgpu',
      acceptedFrame: 1,
      completedFrames: 1,
      inFlight: false,
      queued: 0,
      adapter: 'validated device',
    });
    sync.dispose();
    pop.dispose();
  });

  test('a corrupt backend cannot poison original inputs; CPU workers replace it without double stepping', async () => {
    let gpuCalls = 0;
    let workerCalls = 0;
    let disposed = 0;
    const pool = {
      executeAsync: async (task: WorkerTask) => {
        workerCalls++;
        return resultFor(task);
      },
    } as unknown as WorkerPool;
    const pop = new WildernessPopulation(pool, 123);
    const sync = new WildernessPopulation(null, 123);
    pop.setBatchExecutor({
      executeBatch: async (tasks) => {
        gpuCalls++;
        tasks[0]!.data.fill(Number.NaN);
        throw new Error('device lost');
      },
      dispose: () => {
        disposed++;
      },
    });
    pop.update(0, 0, 1 / 60);
    sync.update(0, 0, 1 / 60);
    await settle();
    for (const id of pop.getActiveChunks())
      expect(pop.getSnapshot(id)!.positions).toEqual(sync.getSnapshot(id)!.positions);
    expect(pop.getComputeStatus()).toMatchObject({
      backend: 'cpu-workers',
      acceptedBackend: 'cpu-workers',
      gpuFailures: 1,
      workerFailures: 0,
      completedFrames: 1,
    });
    expect(disposed).toBe(1);
    pop.update(0, 0, 1 / 60);
    await settle();
    expect(gpuCalls).toBe(1);
    expect(workerCalls).toBe(98);
    pop.dispose();
    sync.dispose();
  });

  test('malformed GPU metadata then invalid workers fall back exactly once to the complete CPU kernel', async () => {
    const pool = {
      executeAsync: async (task: WorkerTask) => ({
        ...resultFor(task),
        data: new Float32Array(1),
      }),
    } as unknown as WorkerPool;
    const pop = new WildernessPopulation(pool, 99);
    const sync = new WildernessPopulation(null, 99);
    pop.setBatchExecutor({
      executeBatch: async (tasks) => {
        const results = tasks.map(resultFor);
        results[0]!.data[6] = 999;
        return results;
      },
    });
    pop.update(0, 0, 0.05);
    sync.update(0, 0, 0.05);
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(sync.getSnapshot('0,0')!.positions);
    expect(pop.getComputeStatus()).toMatchObject({
      acceptedBackend: 'cpu-main',
      gpuFailures: 1,
      workerFailures: 49,
      fallbackTasks: 49,
      acceptedFrame: 1,
    });
    pop.dispose();
    sync.dispose();
  });

  test('backend epochs reject late frames and retain only the newest queued request', async () => {
    const old = deferredBatch();
    const next = deferredBatch();
    const pop = new WildernessPopulation(null, 73);
    pop.setBatchExecutor(old.executor);
    pop.update(0, 0, 1 / 60);
    const initial = pop.getSnapshot('0,0')!.positions;
    for (let i = 0; i < 100; i++) pop.update(0, 0, 1 / 60);
    expect(old.calls).toHaveLength(1);
    expect(pop.getComputeStatus()).toMatchObject({ inFlight: true, queued: 1 });
    pop.setBatchExecutor(next.executor);
    old.calls[0]!.resolve(old.calls[0]!.tasks.map(resultFor));
    await settle();
    expect(old.disposed()).toBe(1);
    expect(pop.getSnapshot('0,0')!.positions).toEqual(initial);
    expect(next.calls).toHaveLength(1);
    expect(next.calls[0]!.tasks[0]!.id).toContain('-101');
    next.calls[0]!.resolve(next.calls[0]!.tasks.map(resultFor));
    await settle();
    expect(pop.getComputeStatus()).toMatchObject({
      acceptedFrame: 101,
      completedFrames: 1,
      staleResults: 49,
      inFlight: false,
      queued: 0,
    });
    pop.dispose();
    expect(next.disposed()).toBe(1);
  });

  test('pause and explicit reset invalidation preserve frozen state until a new accepted request', async () => {
    const batch = deferredBatch();
    const pop = new WildernessPopulation(null, 42);
    pop.setBatchExecutor(batch.executor);
    pop.update(0, 0, 1 / 60);
    const initial = pop.getSnapshot('0,0')!.positions;
    pop.setPaused(true);
    pop.update(0, 0, 1 / 60);
    batch.calls[0]!.resolve(batch.calls[0]!.tasks.map(resultFor));
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(initial);
    expect(pop.getComputeStatus()).toMatchObject({
      paused: true,
      acceptedFrame: 0,
      requestedFrame: 1,
    });
    pop.setPaused(false);
    pop.update(0, 0, 1 / 60);
    pop.invalidatePending();
    batch.calls[1]!.resolve(batch.calls[1]!.tasks.map(resultFor));
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(initial);
    expect(pop.getComputeStatus().paused).toBe(false);
    pop.update(0, 0, 1 / 60);
    batch.calls[2]!.resolve(batch.calls[2]!.tasks.map(resultFor));
    await settle();
    expect(pop.getComputeStatus().acceptedFrame).toBe(3);
    expect(pop.getSnapshot('0,0')!.positions).not.toEqual(initial);
    pop.dispose();
  });

  test('unload and disposal reject late results, including reuse of a chunk coordinate', async () => {
    const batch = deferredBatch();
    const pop = new WildernessPopulation(null, 42);
    pop.setBatchExecutor(batch.executor);
    pop.update(0, 0, 1 / 60);
    pop.update(10000, 10000, 1 / 60);
    expect(pop.getSnapshot('0,0')).toBeNull();
    pop.update(0, 0, 1 / 60);
    const reloaded = pop.getSnapshot('0,0')!.positions;
    batch.calls[0]!.resolve(batch.calls[0]!.tasks.map(resultFor));
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(reloaded);
    expect(pop.getComputeStatus().staleResults).toBe(49);
    pop.dispose();
    batch.calls[1]!.resolve(batch.calls[1]!.tasks.map(resultFor));
    await settle();
    expect(pop.getEntityCount()).toBe(0);
    expect(pop.getComputeStatus()).toMatchObject({
      disposed: true,
      completedFrames: 0,
      inFlight: false,
    });
    let released = 0;
    pop.setBatchExecutor({
      executeBatch: async () => [],
      dispose: () => {
        released++;
      },
    });
    expect(released).toBe(1);
  });

  test('worker replacement invalidates old replies before committing the new route', async () => {
    const pending: { task: WorkerTask; resolve: (result: WorkerResult) => void }[] = [];
    const old = {
      executeAsync: (task: WorkerTask) =>
        new Promise<WorkerResult>((resolve) => {
          pending.push({ task, resolve });
        }),
    } as unknown as WorkerPool;
    const pop = new WildernessPopulation(old, 42);
    pop.update(0, 0, 1 / 60);
    const initial = pop.getSnapshot('0,0')!.positions;
    pop.setWorkerPool(null);
    for (const job of pending) job.resolve(resultFor(job.task));
    await settle();
    expect(pop.getSnapshot('0,0')!.positions).toEqual(initial);
    expect(pop.getComputeStatus().acceptedFrame).toBe(0);
    pop.update(0, 0, 1 / 60);
    expect(pop.getComputeStatus()).toMatchObject({
      backend: 'cpu-main',
      acceptedBackend: 'cpu-main',
      acceptedFrame: 2,
    });
    pop.dispose();
  });
});
