import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  detectHybridHardware,
  executeHybridEntityBrainBatchWithReceipt,
  getBaselineHybridHardware,
  planHybridPartition,
} from '../src/core/hybrid-compute';
import {
  counterHash32,
  fillParallelCounterShard,
  philoxCounter32,
  prepareParallelCounterSeed,
} from '../src/math/wild-entropy';
import * as zigBridge from '../src/math/zig-bridge';
import { executeHybridShardWorkerKernel } from '../src/workers/simulation-worker';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

afterEach(() => {
  mock.restore();
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
});

function withNpuProbe(createContext: () => Promise<unknown>): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hardwareConcurrency: 8, ml: { createContext } },
  });
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: Error): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const nextTurn = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function neuralFixture(count = 12) {
  return {
    weights: Float32Array.from({ length: count * 70 }, (_, i) => Math.sin(i * 0.17) * 0.3),
    inputs: Float32Array.from({ length: count * 6 }, (_, i) => Math.cos(i * 0.23) * 0.7),
    outputs: new Float32Array(count * 4),
    plan: planHybridPartition(
      count,
      600_000,
      getBaselineHybridHardware({
        webGpuComputeAvailable: true,
        webNnNpuAvailable: true,
        workerCount: 4,
      }),
    ),
  };
}

describe('Hybrid proposals versus actual neural execution', () => {
  test('accelerator-labelled proposals execute the verified WASM export on the calling CPU thread', () => {
    const { weights, inputs, outputs, plan } = neuralFixture();
    const beforeWeights = weights.slice();
    const beforeInputs = inputs.slice();
    expect(plan.kind).toBe('proposal-only');
    expect(plan.gpuAssignedEntities).toBeGreaterThan(0);
    expect(plan.npuAssignedEntities).toBeGreaterThan(0);
    expect(getBaselineHybridHardware().zigWasmAvailable).toBe(true);
    expect(getBaselineHybridHardware({ zigWasmSimdAvailable: true }).zigWasmSimdAvailable).toBe(
      false,
    );
    const receipt = executeHybridEntityBrainBatchWithReceipt(weights, inputs, outputs, plan);
    expect(receipt).toMatchObject({
      kind: 'execution-receipt',
      backendUsed: 'cpu-zig-wasm',
      executionContext: 'calling-thread',
      kernelExport: 'cqm_entity_brain_batch_forward',
      processedEntities: 12,
      gpuExecutedEntities: 0,
      npuExecutedEntities: 0,
    });
    expect(receipt.outputs).toBe(outputs);
    expect(outputs.some((value) => value !== 0)).toBe(true);
    expect(outputs.every(Number.isFinite)).toBe(true);
    expect(weights).toEqual(beforeWeights);
    expect(inputs).toEqual(beforeInputs);
    const helper = executeHybridShardWorkerKernel(weights, inputs, 12, 17, 4);
    expect(helper.backendUsed).toBe('cpu-zig-wasm');
    expect(helper.executionContext).toBe('calling-thread');
    expect(helper.processedEntities).toBe(12);
    expect(helper.outputs).toEqual(outputs);
  });

  test('empty batches claim no execution and invalid buffers or coverage fail before output writes', () => {
    const empty = neuralFixture(0);
    const receipt = executeHybridEntityBrainBatchWithReceipt(
      empty.weights,
      empty.inputs,
      empty.outputs,
      empty.plan,
    );
    expect(receipt.backendUsed).toBe('none');
    expect(receipt.kernelExport).toBeNull();
    expect(receipt.processedEntities).toBe(0);
    const { weights, inputs, outputs, plan } = neuralFixture();
    outputs.fill(99);
    expect(() =>
      executeHybridEntityBrainBatchWithReceipt(weights.subarray(70), inputs, outputs, plan),
    ).toThrow(RangeError);
    expect(() =>
      executeHybridEntityBrainBatchWithReceipt(weights, inputs, outputs, {
        ...plan,
        shards: plan.shards.slice(1),
      }),
    ).toThrow(RangeError);
    expect(outputs.every((value) => value === 99)).toBe(true);
    expect(() => executeHybridShardWorkerKernel(weights, inputs, Infinity, 1, 1)).toThrow(
      RangeError,
    );
  });

  test('an incomplete WASM return cannot produce a success receipt', () => {
    const { weights, inputs, outputs, plan } = neuralFixture();
    spyOn(zigBridge, 'zigEntityBrainBatchForward').mockReturnValue(0);
    expect(() => executeHybridEntityBrainBatchWithReceipt(weights, inputs, outputs, plan)).toThrow(
      'incomplete batch',
    );
  });
});

describe('Counter hash compatibility and bounded batch entropy', () => {
  test('deprecated Philox name is an exact alias and deterministic batch preparation harvests nothing', () => {
    const harvest = spyOn(globalThis.crypto, 'getRandomValues');
    expect(philoxCounter32).toBe(counterHash32);
    expect(prepareParallelCounterSeed(-1, 3, false)).toBe(0xffffffff);
    const empty = new Float32Array(8);
    fillParallelCounterShard(empty, 8, 3, 0, 0, 0, true);
    expect(empty).toEqual(new Float32Array(8));
    expect(harvest).not.toHaveBeenCalled();
  });

  test('one wild salt reused across reversed shards preserves every seeded sample without further harvests', () => {
    const harvest = spyOn(globalThis.crypto, 'getRandomValues');
    const seed = prepareParallelCounterSeed(1234, 88, true);
    const single = new Float32Array(256);
    const split = new Float32Array(256);
    fillParallelCounterShard(single, seed, 88, 0, 256, 2, false);
    for (let start = 240; start >= 0; start -= 16) {
      fillParallelCounterShard(split.subarray(start, start + 16), seed, 88, start, 16, 2, false);
    }
    expect(harvest).toHaveBeenCalledTimes(1);
    expect(split).toEqual(single);
  });
});

describe('WebNN capability probe ownership', () => {
  test('a successful context is destroyed before reporting capability and its timer is cleared', async () => {
    const destroy = mock(() => {});
    const create = mock(async () => ({ destroy }));
    withNpuProbe(create);
    const clear = spyOn(globalThis, 'clearTimeout');
    const capabilities = await detectHybridHardware(100);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ deviceType: 'npu', powerPreference: 'low-power' });
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(capabilities.webNnNpuAvailable).toBe(true);
    expect(capabilities.webNnDeviceType).toBe('npu');
    expect(capabilities.webGpuComputeAvailable).toBe(false);
    expect(capabilities.zigWasmAvailable).toBe(true);
    expect(capabilities.zigWasmSimdAvailable).toBe(false);
  });

  test('a context resolving after deadline is destroyed without changing the unavailable snapshot', async () => {
    const request = deferred<unknown>();
    const destroy = mock(() => {});
    withNpuProbe(() => request.promise);
    const capabilities = await detectHybridHardware(1);
    expect(capabilities.webNnNpuAvailable).toBe(false);
    request.resolve({ destroy });
    await nextTurn();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(capabilities.webNnDeviceType).toBe('unavailable');
  });

  test('late rejection and malformed contexts stay unavailable without an unhandled rejection', async () => {
    const request = deferred<unknown>();
    withNpuProbe(() => request.promise);
    expect((await detectHybridHardware(1)).webNnNpuAvailable).toBe(false);
    request.reject(new Error('NPU driver unavailable'));
    await nextTurn();
    withNpuProbe(async () => ({ unexpected: true }));
    expect((await detectHybridHardware(50)).webNnNpuAvailable).toBe(false);
    const destroy = mock(() => {
      throw new Error('lost context');
    });
    withNpuProbe(async () => ({ destroy }));
    expect((await detectHybridHardware(50)).webNnNpuAvailable).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
