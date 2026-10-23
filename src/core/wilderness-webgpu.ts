/**
 * Complete, batched FP32 port of the non-golden wilderness movement kernel. Core simulation and
 * rendering stay unchanged. Caller calibration decides whether this device is accurate and faster.
 */
import { hashSeed } from '../math/rng';
import { normalizeWorkerDt, type WorkerResult, type WorkerTask } from './worker-pool';

/** Hard allocation/dispatch bounds; each chunk owns 128 packed eight-float organisms. */
export const WILDERNESS_GPU_MAX_TASKS = 128;
/** Maximum packed entity payload per task, in floats. */
export const WILDERNESS_GPU_TASK_FLOATS = 1024;
const PARAM_WORDS = 12;
const TIMEOUT_MS = 5_000;
const DATA_BYTES = WILDERNESS_GPU_MAX_TASKS * WILDERNESS_GPU_TASK_FLOATS * 4;

/** WGSL reference is intentionally public for browser compilation/parity evidence. */
export const WILDERNESS_WGSL = /* wgsl */ `
struct Params {
  count: u32, seed: u32, chunkX: f32, chunkZ: f32,
  dt: f32, frameScale: f32, damping: f32, resourceDrive: f32,
  threat: f32, explore: f32, pad0: u32, pad1: u32,
}
@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@group(0) @binding(1) var<storage, read> params: array<Params>;

// Exact JS ToUint32 for a finite Float32 value, including negative / rounded 2^32 seeds.
fn seedWord(value: f32) -> u32 {
  let bits = bitcast<u32>(value);
  let exponent = i32((bits >> 23u) & 255u) - 127;
  if (exponent < 0 || exponent >= 55) { return 0u; }
  let mantissa = (bits & 8388607u) | 8388608u;
  var word: u32;
  if (exponent >= 23) { word = mantissa << u32(exponent - 23); }
  else { word = mantissa >> u32(23 - exponent); }
  if ((bits & 2147483648u) != 0u) { return 0u - word; }
  return word;
}

// Jump directly to this entity's three mulberry32 draws without cross-invocation state.
fn draw(seed: u32, ordinal: u32, lane: u32) -> f32 {
  let a = seed + 0x6d2b79f5u * (3u * ordinal + lane + 1u);
  var t = (a ^ (a >> 15u)) * (a | 1u);
  t = t ^ (t + (t ^ (t >> 7u)) * (t | 61u));
  return f32(t ^ (t >> 14u)) * (1.0 / 4294967296.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = params[gid.y];
  let ordinal = gid.x;
  if (ordinal >= p.count || p.dt == 0.0) { return; }
  let i = gid.y * 1024u + ordinal * 8u;
  var x = data[i]; var y = data[i+1u]; var z = data[i+2u];
  var vx = data[i+3u]; var vy = data[i+4u]; var vz = data[i+5u];
  let adaptive = p.resourceDrive > 0.0 || p.threat > 0.0 || p.explore > 0.0;
  let gain = select(1.0, 0.82 + p.explore * 0.36, adaptive);
  vx += (draw(p.seed, ordinal, 0u) - 0.5) * 0.04 * gain * p.frameScale;
  vy += (draw(p.seed, ordinal, 1u) - 0.5) * 0.02 * gain * p.frameScale;
  vz += (draw(p.seed, ordinal, 2u) - 0.5) * 0.04 * gain * p.frameScale;
  if (adaptive) {
    let patchKey = seedWord(data[i+7u]) ^ ((ordinal + 1u) * 0x9e3779b1u);
    let patchU = f32(((patchKey * 1103515245u + 12345u) >> 8u) & 65535u) / 65536.0;
    let patchV = f32(((patchKey * 214013u + 2531011u) >> 8u) & 65535u) / 65536.0;
    let targetX = (p.chunkX + 0.12 + patchU * 0.76) * 100.0;
    let targetZ = (p.chunkZ + 0.12 + patchV * 0.76) * 100.0;
    vx += (targetX - x) * p.resourceDrive * 0.00008 * p.frameScale;
    vz += (targetZ - z) * p.resourceDrive * 0.00008 * p.frameScale;
    let localX = x - p.chunkX * 100.0;
    let localZ = z - p.chunkZ * 100.0;
    let horizon = p.dt * (6.0 + p.threat * 10.0);
    let predX = localX + vx * horizon;
    let predZ = localZ + vz * horizon;
    let avoid = p.threat * 0.012 * p.frameScale;
    let left = (16.0 - predX) / 16.0;
    let right = (predX - 84.0) / 16.0;
    let back = (16.0 - predZ) / 16.0;
    let front = (predZ - 84.0) / 16.0;
    if (left > 0.0) { vx += min(1.0, left) * avoid; }
    if (right > 0.0) { vx -= min(1.0, right) * avoid; }
    if (back > 0.0) { vz += min(1.0, back) * avoid; }
    if (front > 0.0) { vz -= min(1.0, front) * avoid; }
  }
  // Compare relative candidates before rounding the global position. floor(global / 100)
  // can round an outside point (-100.0000076) back into chunk -1 in FP32. Local bounds
  // preserve the boundary crossing in that case; backend calibration still gates FP32 drift.
  let nextLocalX = (x - p.chunkX * 100.0) + vx * p.dt;
  let nextLocalZ = (z - p.chunkZ * 100.0) + vz * p.dt;
  x += vx * p.dt; y += vy * p.dt; z += vz * p.dt;
  vx *= p.damping; vy *= p.damping; vz *= p.damping;
  if (nextLocalX < 0.0 || nextLocalX >= 100.0 || nextLocalZ < 0.0 || nextLocalZ >= 100.0) {
    vx = -vx; vz = -vz;
    x = p.chunkX * 100.0 + 50.0;
    z = p.chunkZ * 100.0 + 50.0;
  }
  data[i] = x; data[i+1u] = y; data[i+2u] = z;
  data[i+3u] = vx; data[i+4u] = vy; data[i+5u] = vz;
}
`;

function bounded<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onLate?: (value: T) => void,
): Promise<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.then((value) => {
      if (expired) onLate?.(value);
      return value;
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(new Error('Wilderness WebGPU deadline exceeded'));
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function signal(value: number | undefined): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value! : 0));
}

function chunkCoordinate(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

/**
 * One reusable compute allocation and one outstanding batch. O(total organisms) pack/upload/kernel/
 * readback; no per-organism GPU submissions. Any GPU failure retires the executor before CPU fallback.
 */
export class WildernessWebGpu {
  private readonly data = new Float32Array(DATA_BYTES / 4);
  private readonly paramBytes = new ArrayBuffer(WILDERNESS_GPU_MAX_TASKS * PARAM_WORDS * 4);
  private readonly paramFloats = new Float32Array(this.paramBytes);
  private readonly paramWords = new Uint32Array(this.paramBytes);
  private readonly stateBuffer: GPUBuffer;
  private readonly paramBuffer: GPUBuffer;
  private readonly readback: GPUBuffer;
  private readonly bindings: GPUBindGroup;
  private inFlight = false;
  private retired: string | null = null;
  private rejectStopped: (error: Error) => void = () => {};
  private readonly stopped = new Promise<never>((_, reject) => {
    this.rejectStopped = reject;
  });

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPUComputePipeline,
    /** Browser-provided adapter description, never inferred from a capability API alone. */
    readonly adapterDescription: string,
    private readonly timeoutMs: number,
  ) {
    // Numeric standard WebGPU flags avoid requiring browser enum globals in headless tests.
    this.stateBuffer = device.createBuffer({ size: DATA_BYTES, usage: 128 | 8 | 4 });
    this.paramBuffer = device.createBuffer({ size: this.paramBytes.byteLength, usage: 128 | 8 });
    this.readback = device.createBuffer({ size: DATA_BYTES, usage: 1 | 8 });
    this.bindings = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.paramBuffer } },
      ],
    });
    void this.stopped.catch(() => {});
    void device.lost.then((info) => this.retire(`Wilderness WebGPU device lost: ${info.message}`));
  }

  /** Request and compile a real compute device; absence, software fallback, or failure rejects. */
  static async create(options: { timeoutMs?: number } = {}): Promise<WildernessWebGpu> {
    const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid GPU timeout');
    const gpu = (globalThis.navigator as (Navigator & { gpu?: GPU }) | undefined)?.gpu;
    if (!gpu) throw new Error('WebGPU API unavailable');
    const adapter = await bounded(
      gpu.requestAdapter({ powerPreference: 'high-performance' }),
      timeoutMs,
    );
    if (!adapter || adapter.info.isFallbackAdapter) throw new Error('No hardware WebGPU adapter');
    const device = await bounded(adapter.requestDevice(), timeoutMs, (late) => late.destroy());
    try {
      const module = device.createShaderModule({
        label: 'CQM wilderness complete kernel',
        code: WILDERNESS_WGSL,
      });
      const pipeline = await bounded(
        device.createComputePipelineAsync({
          layout: 'auto',
          compute: { module, entryPoint: 'main' },
        }),
        timeoutMs,
      );
      const info = adapter.info;
      const description =
        [info.description, info.vendor, info.architecture, info.device]
          .filter(Boolean)
          .join(' / ') || 'Hardware WebGPU adapter (details withheld)';
      return new WildernessWebGpu(device, pipeline, description, timeoutMs);
    } catch (error) {
      device.destroy();
      throw error;
    }
  }

  /** Execute bounded wilderness tasks without mutating their input arrays or identity lanes. */
  async executeBatch(tasks: readonly WorkerTask[]): Promise<WorkerResult[]> {
    if (this.retired) throw new Error(this.retired);
    if (this.inFlight) throw new Error('Wilderness WebGPU batch already in flight');
    if (tasks.length > WILDERNESS_GPU_MAX_TASKS) throw new Error('Too many wilderness GPU tasks');
    if (tasks.length === 0) return [];
    for (const task of tasks) {
      if (
        task.type !== 'wilderness' ||
        typeof task.id !== 'string' ||
        typeof task.chunkId !== 'string' ||
        !Number.isFinite(task.seed)
      )
        throw new Error('Invalid wilderness GPU task');
      if (
        !(task.data instanceof Float32Array) ||
        task.data.length > WILDERNESS_GPU_TASK_FLOATS ||
        task.data.length % 8 !== 0
      )
        throw new Error('Malformed wilderness GPU payload');
      for (const value of task.data)
        if (!Number.isFinite(value)) throw new Error('Non-finite wilderness GPU input');
    }
    // Validation precedes packing so a malformed later task cannot start a partial batch.
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index]!;
      const offset = index * PARAM_WORDS;
      const chunkId = task.chunkId!;
      const comma = chunkId.indexOf(',');
      const dt = normalizeWorkerDt(task.dt);
      const chunkX = comma < 0 ? 0 : chunkCoordinate(chunkId.slice(0, comma));
      const chunkZ = comma < 0 ? 0 : chunkCoordinate(chunkId.slice(comma + 1));
      if (Math.fround(chunkX) !== chunkX || Math.fround(chunkZ) !== chunkZ) {
        throw new Error('Wilderness chunk cannot be represented exactly in FP32');
      }
      this.data.set(task.data, index * WILDERNESS_GPU_TASK_FLOATS);
      this.paramWords[offset] = task.data.length / 8;
      this.paramWords[offset + 1] = (task.seed ^ hashSeed(chunkId)) >>> 0;
      this.paramFloats[offset + 2] = chunkX;
      this.paramFloats[offset + 3] = chunkZ;
      this.paramFloats[offset + 4] = dt;
      this.paramFloats[offset + 5] = dt * 60;
      this.paramFloats[offset + 6] = Math.pow(0.985, dt * 60);
      this.paramFloats[offset + 7] = signal(task.intelligenceResource);
      this.paramFloats[offset + 8] = signal(task.intelligenceThreat);
      this.paramFloats[offset + 9] = signal(task.intelligenceExplore);
    }
    const descriptions = tasks.map((task) => ({
      id: task.id,
      type: task.type,
      length: task.data.length,
    }));
    this.inFlight = true;
    const byteLength = tasks.length * WILDERNESS_GPU_TASK_FLOATS * 4;
    try {
      this.device.queue.writeBuffer(this.stateBuffer, 0, this.data, 0, byteLength / 4);
      this.device.queue.writeBuffer(
        this.paramBuffer,
        0,
        this.paramBytes,
        0,
        tasks.length * PARAM_WORDS * 4,
      );
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindings);
      pass.dispatchWorkgroups(2, tasks.length);
      pass.end();
      encoder.copyBufferToBuffer(this.stateBuffer, 0, this.readback, 0, byteLength);
      this.device.queue.submit([encoder.finish()]);
      await bounded(
        Promise.race([this.readback.mapAsync(1, 0, byteLength), this.stopped]),
        this.timeoutMs,
      );
      if (this.retired) throw new Error(this.retired);
      const mapped = new Float32Array(this.readback.getMappedRange(0, byteLength));
      return descriptions.map((task, index) => {
        const begin = index * WILDERNESS_GPU_TASK_FLOATS;
        const data = mapped.slice(begin, begin + task.length);
        for (let lane = 0; lane < data.length; lane++) {
          if (!Number.isFinite(data[lane])) throw new Error('Non-finite wilderness GPU result');
          if (lane % 8 >= 6 && !Object.is(data[lane], this.data[begin + lane])) {
            throw new Error('Wilderness GPU changed an identity lane');
          }
        }
        return { id: task.id, type: task.type, success: true, data };
      });
    } catch (error) {
      this.retire(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      if (this.readback.mapState === 'mapped') this.readback.unmap();
      this.inFlight = false;
    }
  }

  private retire(reason: string): void {
    if (this.retired) return;
    this.retired = reason;
    this.rejectStopped(new Error(reason));
    this.stateBuffer.destroy();
    this.paramBuffer.destroy();
    this.readback.destroy();
    this.device.destroy();
  }

  /** Permanently stop this executor and release all GPU resources, including an outstanding map. */
  dispose(): void {
    this.retire('Wilderness WebGPU disposed');
  }
}
