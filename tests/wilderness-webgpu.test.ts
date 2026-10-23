/** Host protocol/lifetime tests. Real WGSL parity is separately exercised in the browser receipt. */
import { afterEach, describe, expect, test } from 'bun:test';
import { hashSeed } from '../src/math/rng';
import { WildernessWebGpu, WILDERNESS_GPU_MAX_TASKS } from '../src/core/wilderness-webgpu';
import type { WorkerTask } from '../src/core/worker-pool';
import { simulateWildernessData } from '../src/sim/wilderness-population';

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => {
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
  else Reflect.deleteProperty(globalThis, 'navigator');
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

class FakeBuffer {
  readonly bytes: ArrayBuffer;
  mapState: GPUBufferMapState = 'unmapped';
  destroyed = false;
  mapGate: Promise<void> = Promise.resolve();
  constructor(readonly size: number) {
    this.bytes = new ArrayBuffer(size);
  }
  async mapAsync(): Promise<void> {
    this.mapState = 'pending';
    await this.mapGate;
    if (this.destroyed) throw new Error('Buffer destroyed');
    this.mapState = 'mapped';
  }
  getMappedRange(offset: number, size: number): ArrayBuffer {
    return this.bytes.slice(offset, offset + size);
  }
  unmap(): void {
    this.mapState = 'unmapped';
  }
  destroy(): void {
    this.destroyed = true;
    this.mapState = 'unmapped';
  }
}

/** Emulates only transport, with the independent CPU kernel replacing GPU dispatch. */
class FakeDevice {
  readonly buffers: FakeBuffer[] = [];
  readonly lostGate = deferred<GPUDeviceLostInfo>();
  readonly lost = this.lostGate.promise;
  destroyed = false;
  submissions = 0;
  pipelineFailure = false;
  execute = true;
  poison = false;
  poisonIdentity = false;
  private batchSize = 0;
  private copySize = 0;
  readonly queue = {
    writeBuffer: (
      destination: FakeBuffer,
      offset: number,
      source: ArrayBuffer | ArrayBufferView,
      sourceOffset = 0,
      size?: number,
    ): void => {
      const view = ArrayBuffer.isView(source);
      const width = source instanceof Float32Array ? 4 : 1;
      const buffer = view ? source.buffer : source;
      const begin = (view ? source.byteOffset : 0) + sourceOffset * width;
      const count = size === undefined ? source.byteLength : size * width;
      new Uint8Array(destination.bytes, offset, count).set(new Uint8Array(buffer, begin, count));
    },
    submit: (): void => {
      this.submissions++;
      const state = new Float32Array(this.buffers[0]!.bytes);
      const parameters = new Float32Array(this.buffers[1]!.bytes);
      const words = new Uint32Array(this.buffers[1]!.bytes);
      if (this.execute) {
        for (let chunk = 0; chunk < this.batchSize; chunk++) {
          const p = chunk * 12;
          const chunkId = `${parameters[p + 2]},${parameters[p + 3]}`;
          simulateWildernessData(
            state.subarray(chunk * 1024, chunk * 1024 + words[p]! * 8),
            words[p + 1]! ^ hashSeed(chunkId),
            chunkId,
            parameters[p + 4]!,
            100,
            parameters[p + 7]!,
            parameters[p + 8]!,
            parameters[p + 9]!,
          );
        }
      }
      if (this.poison) state[0] = NaN;
      if (this.poisonIdentity) state[6] = 99;
      new Uint8Array(this.buffers[2]!.bytes, 0, this.copySize).set(
        new Uint8Array(this.buffers[0]!.bytes, 0, this.copySize),
      );
    },
  };
  createBuffer(descriptor: GPUBufferDescriptor): FakeBuffer {
    const buffer = new FakeBuffer(descriptor.size);
    this.buffers.push(buffer);
    return buffer;
  }
  createShaderModule(): object {
    return {};
  }
  async createComputePipelineAsync(): Promise<object> {
    if (this.pipelineFailure) throw new Error('Shader compilation failed');
    return { getBindGroupLayout: () => ({}) };
  }
  createBindGroup(): object {
    return {};
  }
  createCommandEncoder(): object {
    return {
      beginComputePass: () => ({
        setPipeline: () => {},
        setBindGroup: () => {},
        dispatchWorkgroups: (_x: number, y: number) => {
          this.batchSize = y;
        },
        end: () => {},
      }),
      copyBufferToBuffer: (_a: unknown, _b: number, _c: unknown, _d: number, size: number) => {
        this.copySize = size;
      },
      finish: () => ({}),
    };
  }
  destroy(): void {
    this.destroyed = true;
    for (const buffer of this.buffers) buffer.destroy();
  }
}

function install(device = new FakeDevice(), fallback = false): FakeDevice {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      gpu: {
        requestAdapter: async () => ({
          info: {
            description: 'Test GPU',
            vendor: 'test',
            architecture: 'fake',
            device: '',
            isFallbackAdapter: fallback,
          },
          requestDevice: async () => device,
        }),
      },
    },
  });
  return device;
}

function task(id = 'one', overrides: Partial<WorkerTask> = {}): WorkerTask {
  return {
    id,
    type: 'wilderness',
    chunkId: '-1,2',
    seed: 12345,
    dt: 1 / 60,
    data: new Float32Array([
      -50, 1, 250, 0.5, -0.2, 0.8, 4, 0xfffffff0, -99, -2, 299, -3, 2, 8, 2, -37,
    ]),
    ...overrides,
  };
}

describe('wilderness WebGPU transport and ownership', () => {
  test('absence, software adapters, and invalid deadlines fail explicitly', async () => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    await expect(WildernessWebGpu.create()).rejects.toThrow('unavailable');
    await expect(WildernessWebGpu.create({ timeoutMs: 0 })).rejects.toThrow('Invalid');
    install(new FakeDevice(), true);
    await expect(WildernessWebGpu.create()).rejects.toThrow('hardware');
  });

  test('compile failure destroys its device and a late device is also destroyed', async () => {
    const broken = install();
    broken.pipelineFailure = true;
    await expect(WildernessWebGpu.create()).rejects.toThrow('compilation');
    expect(broken.destroyed).toBe(true);
    const late = new FakeDevice();
    const gate = deferred<FakeDevice>();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        gpu: { requestAdapter: async () => ({ info: {}, requestDevice: () => gate.promise }) },
      },
    });
    await expect(WildernessWebGpu.create({ timeoutMs: 5 })).rejects.toThrow('deadline');
    gate.resolve(late);
    await Promise.resolve();
    expect(late.destroyed).toBe(true);
  });

  test('packs complete adaptive tasks, returns owned output, and reuses all three buffers', async () => {
    const device = install();
    const executor = await WildernessWebGpu.create();
    const tasks = [
      task(),
      task('adaptive', {
        intelligenceResource: 0.75,
        intelligenceThreat: 1,
        intelligenceExplore: 0.25,
      }),
      task('zero', { dt: 0 }),
    ];
    const originals = tasks.map((item) => item.data.slice());
    const result = await executor.executeBatch(tasks);
    expect(executor.adapterDescription).toContain('Test GPU');
    for (let index = 0; index < tasks.length; index++) {
      const item = tasks[index]!;
      const expected = simulateWildernessData(
        item.data.slice(),
        item.seed,
        item.chunkId!,
        item.dt,
        100,
        item.intelligenceResource,
        item.intelligenceThreat,
        item.intelligenceExplore,
      );
      expect(item.data).toEqual(originals[index]!);
      expect(result[index]!.id).toBe(item.id);
      expect(result[index]!.success).toBe(true);
      for (let lane = 0; lane < expected.length; lane++)
        expect(result[index]!.data[lane]!).toBeCloseTo(expected[lane]!, 4);
      expect(result[index]!.data.buffer).not.toBe(item.data.buffer);
    }
    const first = result[0]!.data.slice();
    await executor.executeBatch([task('second')]);
    expect(result[0]!.data).toEqual(first);
    expect(device.buffers.length).toBe(3);
    expect(device.submissions).toBe(2);
    executor.dispose();
  });

  test('zero delta preserves every bit including negative zero and seed identity', async () => {
    install();
    const executor = await WildernessWebGpu.create();
    const input = task('zero', { dt: 0, data: new Float32Array([-0, 2, 3, -0, 0, 0, -0, -0]) });
    const result = await executor.executeBatch([input]);
    expect(new Uint32Array(result[0]!.data.buffer)).toEqual(new Uint32Array(input.data.buffer));
    expect(await executor.executeBatch([])).toEqual([]);
    executor.dispose();
  });

  test('malformed batches never submit, and a later valid batch still works', async () => {
    const device = install();
    const executor = await WildernessWebGpu.create();
    const invalid = [
      task('bad-type', { type: 'simulation' }),
      task('bad-size', { data: new Float32Array(9) }),
      task('too-long', { data: new Float32Array(1032) }),
      task('bad-seed', { seed: NaN }),
      task('bad-data', { data: new Float32Array([NaN, 0, 0, 0, 0, 0, 0, 0]) }),
      task('bad-chunk', { chunkId: '1e100,0' }),
    ];
    for (const bad of invalid) await expect(executor.executeBatch([task(), bad])).rejects.toThrow();
    await expect(
      executor.executeBatch(Array.from({ length: WILDERNESS_GPU_MAX_TASKS + 1 }, () => task())),
    ).rejects.toThrow('Too many');
    expect(device.submissions).toBe(0);
    expect((await executor.executeBatch([task()]))[0]!.success).toBe(true);
    executor.dispose();
  });

  test('backpressure rejects concurrent calls without changing either input', async () => {
    const device = install();
    const executor = await WildernessWebGpu.create();
    const gate = deferred<void>();
    device.buffers[2]!.mapGate = gate.promise;
    const first = task();
    const original = first.data.slice();
    const active = executor.executeBatch([first]);
    await expect(executor.executeBatch([task('other')])).rejects.toThrow('in flight');
    expect(first.data).toEqual(original);
    gate.resolve();
    await active;
    expect(first.data).toEqual(original);
    executor.dispose();
  });

  test('dispatch snapshots task descriptors and rejects corrupted identity lanes', async () => {
    const device = install();
    const executor = await WildernessWebGpu.create();
    const gate = deferred<void>();
    device.buffers[2]!.mapGate = gate.promise;
    const input = task('original-id');
    const active = executor.executeBatch([input]);
    input.id = 'changed-after-submit';
    input.data = new Float32Array(0);
    gate.resolve();
    const result = await active;
    expect(result[0]!.id).toBe('original-id');
    expect(result[0]!.data.length).toBe(16);
    device.poisonIdentity = true;
    await expect(executor.executeBatch([task()])).rejects.toThrow('identity lane');
    expect(device.destroyed).toBe(true);
  });

  test('loss retires the device, rejects the outstanding batch, and releases buffers', async () => {
    const device = install();
    const executor = await WildernessWebGpu.create();
    device.buffers[2]!.mapGate = new Promise(() => {});
    const active = executor.executeBatch([task()]);
    device.lostGate.resolve({ reason: 'unknown', message: 'removed' });
    await expect(active).rejects.toThrow('device lost');
    expect(device.buffers.every((buffer) => buffer.destroyed)).toBe(true);
    await expect(executor.executeBatch([task()])).rejects.toThrow('device lost');
    executor.dispose();
  });

  test('timeout, explicit disposal, and invalid output fail closed with originals intact', async () => {
    for (const mode of ['timeout', 'dispose', 'invalid'] as const) {
      const device = install();
      const executor = await WildernessWebGpu.create({ timeoutMs: 8 });
      if (mode !== 'invalid') device.buffers[2]!.mapGate = new Promise(() => {});
      else device.poison = true;
      const input = task();
      const original = input.data.slice();
      const active = executor.executeBatch([input]);
      if (mode === 'dispose') executor.dispose();
      await expect(active).rejects.toThrow(
        mode === 'timeout' ? 'deadline' : mode === 'dispose' ? 'disposed' : 'Non-finite',
      );
      expect(input.data).toEqual(original);
      expect(device.buffers.every((buffer) => buffer.destroyed)).toBe(true);
      expect(device.destroyed).toBe(true);
    }
  });
});
