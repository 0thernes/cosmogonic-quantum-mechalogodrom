import { describe, expect, test } from 'bun:test';
import {
  calibrateWildernessCompute,
  createWildernessCalibrationTasks,
} from '../src/core/wilderness-compute';
import { chooseWorkerBudget, type WorkerTask, type WorkerResult } from '../src/core/worker-pool';
import { simulateWildernessData } from '../src/sim/wilderness-population';

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
  return { id: task.id, type: task.type, success: true, data };
}

describe('ambient compute calibration', () => {
  test('fixtures cover the actual batch shape, adaptive controls, zero delta and diverse identities', () => {
    const tasks = createWildernessCalibrationTasks();
    expect(tasks).toHaveLength(49);
    expect(tasks.every((task) => task.data.length === 1024)).toBe(true);
    expect(tasks.some((task) => task.dt === 0)).toBe(true);
    expect(tasks.some((task) => task.dt === 0.05)).toBe(true);
    expect(tasks.some((task) => task.chunkId?.startsWith('-'))).toBe(true);
    expect(new Set(tasks.map((task) => task.seed)).size).toBe(49);
    expect(createWildernessCalibrationTasks()).toEqual(tasks);
  });

  test('auto routes only on measured full-batch parity and transfer-inclusive improvement', async () => {
    let time = 0;
    let gpuCalls = 0;
    let workerCalls = 0;
    const gpu = {
      adapterDescription: 'test device',
      executeBatch: async (tasks: readonly WorkerTask[]) => {
        gpuCalls++;
        time += 10;
        return tasks.map(resultFor);
      },
    };
    const pool = {
      executeAsync: async (task: WorkerTask) => {
        workerCalls++;
        time += 1;
        return resultFor(task);
      },
    };
    const receipt = await calibrateWildernessCompute(gpu, pool, 'auto', {
      now: () => time,
      warmupRounds: 1,
      sampleRounds: 3,
    });
    expect(receipt.selected).toBe('webgpu');
    expect(receipt.parityPassed).toBe(true);
    expect(receipt.workerParityPassed).toBe(true);
    expect(receipt.gpuTiming?.samplesMs).toEqual([10, 10, 10]);
    expect(receipt.workerTiming?.samplesMs).toEqual([49, 49, 49]);
    expect(receipt.maxPositionError).toBe(0);
    expect(receipt.maxVelocityError).toBe(0);
    expect(receipt.entities).toBe(6272);
    expect(gpuCalls).toBe(4);
    expect(workerCalls).toBe(196);
  });

  test('auto keeps CPU if slower, while an explicit parity-passing choice discloses no speed advantage', async () => {
    for (const preference of ['auto', 'webgpu'] as const) {
      let time = 0;
      const receipt = await calibrateWildernessCompute(
        {
          executeBatch: async (tasks) => {
            time += 100;
            return tasks.map(resultFor);
          },
        },
        {
          executeAsync: async (task) => {
            time++;
            return resultFor(task);
          },
        },
        preference,
        { now: () => time, warmupRounds: 0, sampleRounds: 1 },
      );
      expect(receipt.parityPassed).toBe(true);
      expect(receipt.selected).toBe(preference === 'auto' ? 'cpu-workers' : 'webgpu');
      expect(receipt.reason).toContain(
        preference === 'auto' ? 'latency threshold' : 'not established',
      );
    }
  });

  test('no worker baseline cannot establish an automatic speed advantage', async () => {
    const gpu = { executeBatch: async (tasks: readonly WorkerTask[]) => tasks.map(resultFor) };
    const receipt = await calibrateWildernessCompute(gpu, null, 'auto', {
      warmupRounds: 0,
      sampleRounds: 1,
    });
    expect(receipt.parityPassed).toBe(true);
    expect(receipt.workerParityPassed).toBeNull();
    expect(receipt.selected).toBe('cpu-main');
    expect(receipt.reason).toContain('no actual CPU-worker baseline');
  });

  test('even explicit selection rejects corrupted numbers, identities, envelopes and mutated input', async () => {
    for (const failure of [
      'position',
      'velocity',
      'nan',
      'identity',
      'envelope',
      'input',
      'count',
      'zero',
    ] as const) {
      let disposed = 0;
      const receipt = await calibrateWildernessCompute(
        {
          executeBatch: async (tasks) => {
            const results = tasks.map(resultFor);
            const result = results[1]!;
            if (failure === 'position') result.data[0] = result.data[0]! + 1;
            if (failure === 'velocity') result.data[3] = result.data[3]! + 1;
            if (failure === 'nan') result.data[0] = Number.NaN;
            if (failure === 'identity') result.data[6] = result.data[6]! + 1;
            if (failure === 'envelope') result.id = 'wrong';
            if (failure === 'input') tasks[1]!.data[0] = 999;
            if (failure === 'count') results.pop();
            if (failure === 'zero') results[0]!.data[0] = results[0]!.data[0]! + 0.0001;
            return results;
          },
          dispose: () => {
            disposed++;
          },
        },
        null,
        'webgpu',
        { warmupRounds: 0, sampleRounds: 1 },
      );
      expect(receipt.parityPassed).toBe(false);
      expect(receipt.selected).toBe('cpu-main');
      expect(receipt.reason).toContain('rejected');
      expect(disposed).toBe(1);
    }
  });

  test('finite but incorrect worker dynamics retire the route; explicit valid GPU requires CPU-main fallback', async () => {
    for (const preference of ['auto', 'webgpu'] as const) {
      const receipt = await calibrateWildernessCompute(
        { executeBatch: async (tasks) => tasks.map(resultFor) },
        {
          executeAsync: async (task) => {
            const result = resultFor(task);
            // A valid envelope with plausible, finite, wrong dynamics must not remain a fallback.
            result.data[3] = result.data[3]! + 0.25;
            return result;
          },
        },
        preference,
        { warmupRounds: 0, sampleRounds: 1 },
      );
      expect(receipt.parityPassed).toBe(true);
      expect(receipt.workerParityPassed).toBe(false);
      expect(receipt.selected).toBe(preference === 'auto' ? 'cpu-main' : 'webgpu');
      expect(receipt.reason).toContain(
        preference === 'auto' ? 'comparison failed' : 'not established',
      );
    }
  });

  test('a numerical difference within declared FP32 tolerance remains measured, never called exact', async () => {
    const receipt = await calibrateWildernessCompute(
      {
        executeBatch: async (tasks) => {
          const results = tasks.map(resultFor);
          results[1]!.data[0] = results[1]!.data[0]! + 0.0001;
          results[1]!.data[3] = results[1]!.data[3]! + 0.000005;
          return results;
        },
      },
      null,
      'webgpu',
      { warmupRounds: 0, sampleRounds: 1 },
    );
    expect(receipt.selected).toBe('webgpu');
    expect(receipt.maxPositionError).toBeGreaterThan(0);
    expect(receipt.maxVelocityError).toBeGreaterThan(0);
    expect(receipt.tolerance.positionAbsolute).toBe(2e-4);
  });

  test('device rejection, timeout and lifecycle cancellation settle and retire the candidate', async () => {
    for (const mode of ['throw', 'timeout', 'cancel'] as const) {
      let disposed = 0;
      const receipt = await calibrateWildernessCompute(
        {
          executeBatch: async () => {
            if (mode === 'throw') throw new Error('lost device');
            return new Promise<WorkerResult[]>(() => undefined);
          },
          dispose: () => {
            disposed++;
          },
        },
        null,
        'auto',
        { warmupRounds: 0, sampleRounds: 1, taskTimeoutMs: 5, isActive: () => mode !== 'cancel' },
      );
      expect(receipt.parityPassed).toBe(false);
      expect(receipt.selected).toBe('cpu-main');
      expect(disposed).toBe(1);
    }
  });

  test('invalid round and timeout budgets fail before backend execution', async () => {
    let calls = 0;
    const gpu = {
      executeBatch: async (): Promise<WorkerResult[]> => {
        calls++;
        return [];
      },
    };
    for (const options of [
      { warmupRounds: -1 },
      { warmupRounds: 9 },
      { sampleRounds: 0 },
      { sampleRounds: 17 },
      { taskTimeoutMs: 0 },
      { taskTimeoutMs: Number.NaN },
    ]) {
      await expect(calibrateWildernessCompute(gpu, null, 'auto', options)).rejects.toThrow(
        'bounds',
      );
    }
    expect(calls).toBe(0);
  });
});

describe('worker concurrency budget', () => {
  test('reserves presentation capacity and permits a bounded explicit override', () => {
    expect(chooseWorkerBudget(24)).toBe(22);
    expect(chooseWorkerBudget(8)).toBe(6);
    expect(chooseWorkerBudget(2)).toBe(1);
    expect(chooseWorkerBudget(1)).toBe(1);
    expect(chooseWorkerBudget(Number.NaN)).toBe(2);
    expect(chooseWorkerBudget(24, 4)).toBe(4);
    expect(chooseWorkerBudget(8, 100)).toBe(8);
    expect(chooseWorkerBudget(8, 0)).toBe(6);
    expect(chooseWorkerBudget(8, Number.NaN)).toBe(6);
  });
});
