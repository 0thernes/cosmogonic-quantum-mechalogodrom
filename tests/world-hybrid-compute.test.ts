/** Exercise the real World coordinator with real calibration/population, without a WebGL World boot. */
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { World } from '../src/world';
import { WildernessWebGpu } from '../src/core/wilderness-webgpu';
import type { WorkerPool, WorkerResult, WorkerTask } from '../src/core/worker-pool';
import { WildernessPopulation, simulateWildernessData } from '../src/sim/wilderness-population';

afterEach(() => mock.restore());

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function reference(task: WorkerTask): WorkerResult {
  const data = task.data.slice();
  simulateWildernessData(
    data,
    task.seed,
    task.chunkId!,
    task.dt,
    100,
    task.intelligenceResource,
    task.intelligenceThreat,
    task.intelligenceExplore,
  );
  return { id: task.id, type: task.type, data, success: true };
}

function candidate() {
  const result = {
    adapterDescription: 'production-boundary test device',
    calls: 0,
    disposals: 0,
    async executeBatch(tasks: readonly WorkerTask[]): Promise<WorkerResult[]> {
      result.calls++;
      return tasks.map(reference);
    },
    dispose(): void {
      result.disposals++;
    },
  };
  return result;
}

function harness(options: { wild?: boolean; paused?: boolean; pool?: WorkerPool } = {}) {
  const world = Object.create(World.prototype) as World;
  const abort = new AbortController();
  const population = new WildernessPopulation(options.pool ?? null, 1234);
  const records: { action: string; detail?: Record<string, unknown> }[] = [];
  Object.assign(world, {
    disposeAbort: abort,
    wilderness: population,
    workerPool: options.pool ?? null,
    state: { timeScale: options.paused ? 0 : 1 },
    browserComputeGeneration: 0,
    browserComputeCalibrating: false,
    browserComputePreference: 'cpu',
    browserComputeReason: 'CPU reference',
    browserComputeCalibration: null,
    isWildMode: () => options.wild !== false,
    audit: {
      record: (action: string, detail?: Record<string, unknown>) =>
        records.push({ action, detail }),
    },
    log: { warn: () => {} },
  });
  return { world, abort, population, records };
}

describe('World browser hybrid production boundary', () => {
  test('disposed, explicit CPU, and seeded configurations never request a GPU', async () => {
    const create = spyOn(WildernessWebGpu, 'create').mockRejectedValue(new Error('must not probe'));
    const disposed = harness();
    disposed.abort.abort();
    await disposed.world.configureBrowserCompute('auto');
    const cpu = harness();
    await cpu.world.configureBrowserCompute('cpu');
    const seeded = harness({ wild: false });
    await seeded.world.configureBrowserCompute('webgpu');
    expect(create).not.toHaveBeenCalled();
    expect(cpu.world.getBrowserComputeStatus().reason).toBe('CPU requested');
    expect(seeded.world.getBrowserComputeStatus().reason).toBe('Seeded reference mode');
    expect(seeded.world.getBrowserComputeStatus().calibrating).toBe(false);
    for (const item of [disposed, cpu, seeded]) item.population.dispose();
  });

  test('actual calibration rejects and retires a numerically wrong worker pool', async () => {
    let poolDisposals = 0;
    const pool = {
      getStats: () => ({ activeTasks: 0 }),
      async executeAsync(task: WorkerTask): Promise<WorkerResult> {
        const result = reference(task);
        result.data[0] = result.data[0]! + 1;
        return result;
      },
      dispose: () => {
        poolDisposals++;
      },
    } as unknown as WorkerPool;
    const gpu = candidate();
    spyOn(WildernessWebGpu, 'create').mockResolvedValue(gpu as unknown as WildernessWebGpu);
    const { world, population, records } = harness({ pool });
    await world.configureBrowserCompute('auto');
    const status = world.getBrowserComputeStatus();
    expect(status.calibration?.workerParityPassed).toBe(false);
    expect(status.calibration?.parityPassed).toBe(true);
    expect(status.calibration?.selected).toBe('cpu-main');
    expect(status.backend).toBe('cpu-main');
    expect(world.workerPool).toBeNull();
    expect(poolDisposals).toBe(1);
    expect(gpu.disposals).toBe(1);
    expect(status.calibrating).toBe(false);
    expect(status.paused).toBe(false);
    expect(records.some((entry) => entry.action === 'ambient-compute-calibration')).toBe(true);
    population.dispose();
  });

  test('a stale asynchronous GPU creation cannot override a newer CPU selection', async () => {
    const gate = deferred<WildernessWebGpu>();
    const gpu = candidate();
    spyOn(WildernessWebGpu, 'create').mockReturnValue(gate.promise);
    const { world, population } = harness();
    const original = world.configureBrowserCompute('webgpu');
    expect(world.getBrowserComputeStatus().calibrating).toBe(true);
    await world.configureBrowserCompute('cpu');
    gate.resolve(gpu as unknown as WildernessWebGpu);
    await original;
    const status = world.getBrowserComputeStatus();
    expect(gpu.calls).toBe(0);
    expect(gpu.disposals).toBe(1);
    expect(status.backend).toBe('cpu-main');
    expect(status.preference).toBe('cpu');
    expect(status.reason).toBe('CPU requested');
    expect(status.calibration).toBeNull();
    expect(status.paused).toBe(false);
    population.dispose();
  });

  test('obsolete probe completion cannot clear a newer calibration hold', async () => {
    const firstGate = deferred<WildernessWebGpu>();
    const secondGate = deferred<WildernessWebGpu>();
    const firstGpu = candidate();
    spyOn(WildernessWebGpu, 'create')
      .mockReturnValueOnce(firstGate.promise)
      .mockReturnValueOnce(secondGate.promise);
    const { world, population } = harness();
    const first = world.configureBrowserCompute('auto');
    const second = world.configureBrowserCompute('webgpu');
    firstGate.resolve(firstGpu as unknown as WildernessWebGpu);
    await first;
    expect(firstGpu.disposals).toBe(1);
    expect(world.getBrowserComputeStatus().calibrating).toBe(true);
    expect(world.getBrowserComputeStatus().paused).toBe(true);
    expect(world.getBrowserComputeStatus().preference).toBe('webgpu');
    secondGate.reject(new Error('injected second adapter failure'));
    await second;
    expect(world.getBrowserComputeStatus().calibrating).toBe(false);
    expect(world.getBrowserComputeStatus().paused).toBe(false);
    expect(world.getBrowserComputeStatus().reason).toBe('injected second adapter failure');
    population.dispose();
  });

  test('a selected executor transfers ownership and calibration preserves user pause', async () => {
    const gpu = candidate();
    spyOn(WildernessWebGpu, 'create').mockResolvedValue(gpu as unknown as WildernessWebGpu);
    const { world, population } = harness({ paused: true });
    await world.configureBrowserCompute('webgpu');
    const status = world.getBrowserComputeStatus();
    expect(status.calibration?.parityPassed).toBe(true);
    expect(status.backend).toBe('webgpu');
    expect(status.paused).toBe(true);
    expect(status.calibrating).toBe(false);
    expect(status.acceptedBackend).toBeNull(); // calibration is not a published population frame
    expect(gpu.disposals).toBe(0);
    expect(gpu.calls).toBe(7);
    await world.configureBrowserCompute('cpu');
    expect(gpu.disposals).toBe(1);
    expect(world.getBrowserComputeStatus().paused).toBe(true);
    expect(world.getBrowserComputeStatus().backend).toBe('cpu-main');
    population.dispose();
    expect(gpu.disposals).toBe(1);
  });

  test('disposal while creation is pending releases the late candidate without calibration', async () => {
    const gate = deferred<WildernessWebGpu>();
    const gpu = candidate();
    spyOn(WildernessWebGpu, 'create').mockReturnValue(gate.promise);
    const { world, population, abort, records } = harness();
    const active = world.configureBrowserCompute('auto');
    abort.abort(); // real World disposal uses this lifetime sentinel before population disposal
    population.dispose();
    gate.resolve(gpu as unknown as WildernessWebGpu);
    await active;
    expect(gpu.calls).toBe(0);
    expect(gpu.disposals).toBe(1);
    expect(records).toHaveLength(0);
    expect(world.getBrowserComputeStatus().disposed).toBe(true);
    expect(world.getBrowserComputeStatus().calibration).toBeNull();
  });
});
