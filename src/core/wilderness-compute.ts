/** Bounded, transfer-inclusive routing evidence for the non-golden ambient population only. */
import type { WorkerPool, WorkerResult, WorkerTask } from './worker-pool';
import {
  simulateWildernessData,
  type WildernessBackend,
  type WildernessBatchExecutor,
} from '../sim/wilderness-population';
import { mulberry32 } from '../math/rng';

/** Declared FP32 error allowance; identity lanes must remain exactly unchanged. */
export const WILDERNESS_GPU_TOLERANCE = Object.freeze({
  positionAbsolute: 2e-4,
  velocityAbsolute: 2e-5,
  relative: 2e-6,
});

/** Complete awaited batch latency including upload, dispatch, readback and message delivery. */
export interface WildernessBatchTiming {
  samplesMs: number[];
  medianMs: number;
  p95Ms: number;
}

/** Device selection receipt; capability detection alone never creates this execution evidence. */
export interface WildernessComputeCalibration {
  schemaVersion: 1;
  measurement: 'startup-ambient-batch-transfer-inclusive-not-world-fps';
  preference: 'auto' | 'webgpu';
  selected: WildernessBackend;
  reason: string;
  adapter: string | null;
  parityPassed: boolean;
  /** Null: untested/no pool; true: completed worker batches matched exactly; false: retire the pool. */
  workerParityPassed: boolean | null;
  gpuTiming: WildernessBatchTiming | null;
  workerTiming: WildernessBatchTiming | null;
  maxPositionError: number;
  maxVelocityError: number;
  tolerance: typeof WILDERNESS_GPU_TOLERANCE;
  chunks: number;
  entities: number;
  warmupRounds: number;
  sampleRounds: number;
}

/** Testable bounds and monotonic clock; defaults represent the actual 49-chunk ambient workload. */
export interface WildernessCalibrationOptions {
  now?: () => number;
  /** Stop between awaited batches if the owning World/main lifecycle ended. */
  isActive?: () => boolean;
  warmupRounds?: number;
  sampleRounds?: number;
  taskTimeoutMs?: number;
}

/** Construct seeded fixtures covering all control channels, zero delta, boundaries and negative chunks. */
export function createWildernessCalibrationTasks(): WorkerTask[] {
  const tasks: WorkerTask[] = [];
  const rng = mulberry32(0x43514d47);
  for (let cx = -3; cx <= 3; cx++) {
    for (let cz = -3; cz <= 3; cz++) {
      const chunk = tasks.length;
      const data = new Float32Array(128 * 8);
      for (let i = 0; i < 128; i++) {
        const offset = i * 8;
        data[offset] = cx * 100 + (i % 3 === 0 ? 0.01 : i % 3 === 1 ? 99.99 : rng() * 100);
        data[offset + 1] = rng() * 4 - 2;
        data[offset + 2] = cz * 100 + rng() * 100;
        data[offset + 3] = rng() * 4 - 2;
        data[offset + 4] = rng() * 2 - 1;
        data[offset + 5] = rng() * 4 - 2;
        data[offset + 6] = i % 5;
        data[offset + 7] = (0xf1234567 + i + chunk * 128) >>> 0;
      }
      tasks.push({
        id: `wilderness-calibration-${chunk}`,
        type: 'wilderness',
        data,
        seed: (0x12345678 ^ Math.imul(chunk + 1, 0x9e3779b1)) >>> 0,
        chunkId: `${cx},${cz}`,
        dt: chunk % 7 === 0 ? 0 : chunk % 3 === 0 ? 0.05 : 1 / 60,
        intelligenceResource: chunk % 4 === 0 ? 0 : 0.8,
        intelligenceThreat: chunk % 4 === 1 ? 0 : 0.9,
        intelligenceExplore: chunk % 4 === 2 ? 0 : 0.7,
      });
    }
  }
  return tasks;
}

function cloneTasks(tasks: readonly WorkerTask[]): WorkerTask[] {
  return tasks.map((task) => ({ ...task, data: new Float32Array(task.data) }));
}

function reference(task: WorkerTask): WorkerResult {
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

function timing(samples: readonly number[]): WildernessBatchTiming | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    samplesMs: [...samples],
    medianMs: sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2,
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
  };
}

async function deadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Calibration deadline ${timeoutMs} ms exceeded`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function checkResults(
  tasks: readonly WorkerTask[],
  inputs: readonly WorkerTask[],
  expected: readonly WorkerResult[],
  results: readonly WorkerResult[],
  receipt: WildernessComputeCalibration,
  exact: boolean,
): void {
  if (!Array.isArray(results) || results.length !== tasks.length)
    throw new Error('Batch result count mismatch');
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const result = results[i];
    if (
      !result ||
      result.success !== true ||
      result.id !== task.id ||
      result.type !== task.type ||
      !(result.data instanceof Float32Array) ||
      result.data.length !== task.data.length
    ) {
      throw new Error(`Invalid result envelope at chunk ${i}`);
    }
    const source = inputs[i]!.data;
    for (let j = 0; j < task.data.length; j++) {
      if (!Object.is(source[j], task.data[j])) throw new Error(`Backend mutated input ${i}:${j}`);
      const value = result.data[j]!;
      const control = expected[i]!.data[j]!;
      if (!Number.isFinite(value)) throw new Error(`Non-finite result ${i}:${j}`);
      const lane = j % 8;
      if (exact || lane >= 6 || task.dt === 0) {
        if (!Object.is(value, control)) throw new Error(`Exact lane mismatch ${i}:${j}`);
        continue;
      }
      const error = Math.abs(value - control);
      if (lane < 3) receipt.maxPositionError = Math.max(receipt.maxPositionError, error);
      else receipt.maxVelocityError = Math.max(receipt.maxVelocityError, error);
      const absolute =
        lane < 3
          ? WILDERNESS_GPU_TOLERANCE.positionAbsolute
          : WILDERNESS_GPU_TOLERANCE.velocityAbsolute;
      if (error > absolute + WILDERNESS_GPU_TOLERANCE.relative * Math.abs(control)) {
        throw new Error(`Numerical tolerance exceeded ${i}:${j}: ${error}`);
      }
    }
  }
}

/**
 * Compare actual backend execution against the serial CPU reference and an actual CPU-worker batch.
 * Auto selection requires parity, >=10% median improvement and no worse p95; explicit WebGPU still
 * requires parity but may select a slower route. No result claims whole-world FPS or core acceleration.
 * O(rounds × chunks × entities); caller owns the candidate and disposes it if not selected.
 */
export async function calibrateWildernessCompute(
  executor: WildernessBatchExecutor,
  pool: Pick<WorkerPool, 'executeAsync'> | null,
  preference: 'auto' | 'webgpu' = 'auto',
  options: WildernessCalibrationOptions = {},
): Promise<WildernessComputeCalibration> {
  const now = options.now ?? (() => performance.now());
  const warmupRounds = options.warmupRounds ?? 2;
  const sampleRounds = options.sampleRounds ?? 5;
  const timeoutMs = options.taskTimeoutMs ?? 10000;
  if (
    !Number.isInteger(warmupRounds) ||
    warmupRounds < 0 ||
    warmupRounds > 8 ||
    !Number.isInteger(sampleRounds) ||
    sampleRounds < 1 ||
    sampleRounds > 16 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 30000
  ) {
    throw new RangeError('Invalid wilderness calibration bounds');
  }
  const tasks = createWildernessCalibrationTasks();
  const expected = tasks.map(reference);
  const receipt: WildernessComputeCalibration = {
    schemaVersion: 1,
    measurement: 'startup-ambient-batch-transfer-inclusive-not-world-fps',
    preference,
    selected: pool ? 'cpu-workers' : 'cpu-main',
    reason: 'Calibration incomplete',
    adapter: executor.adapterDescription ?? null,
    parityPassed: false,
    workerParityPassed: null,
    gpuTiming: null,
    workerTiming: null,
    maxPositionError: 0,
    maxVelocityError: 0,
    tolerance: WILDERNESS_GPU_TOLERANCE,
    chunks: tasks.length,
    entities: tasks.reduce((sum, task) => sum + task.data.length / 8, 0),
    warmupRounds,
    sampleRounds,
  };
  const gpuSamples: number[] = [];
  const workerSamples: number[] = [];
  let workerFailure: string | null = null;
  const checkActive = (): void => {
    if (options.isActive?.() === false) throw new Error('Calibration owner disposed or replaced');
  };
  const runGpu = async (measured: boolean): Promise<void> => {
    checkActive();
    const inputs = cloneTasks(tasks);
    const start = now();
    const results = await deadline(executor.executeBatch(inputs), timeoutMs);
    checkActive();
    const elapsed = now() - start;
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid calibration clock');
    checkResults(tasks, inputs, expected, results, receipt, false);
    if (measured) gpuSamples.push(elapsed);
  };
  const runWorkers = async (measured: boolean): Promise<void> => {
    checkActive();
    if (!pool || workerFailure) return;
    try {
      const inputs = cloneTasks(tasks);
      const start = now();
      const results = await deadline(
        Promise.all(inputs.map((task) => pool.executeAsync(task))),
        timeoutMs,
      );
      checkActive();
      const elapsed = now() - start;
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid calibration clock');
      checkResults(tasks, inputs, expected, results, receipt, true);
      receipt.workerParityPassed = true;
      if (measured) workerSamples.push(elapsed);
    } catch (error) {
      receipt.workerParityPassed = false;
      receipt.selected = 'cpu-main';
      workerFailure = String(error).slice(0, 300);
    }
  };
  try {
    for (let round = 0; round < warmupRounds + sampleRounds; round++) {
      const measured = round >= warmupRounds;
      // Alternate order to reduce systematic warm-cache/competing-device bias.
      if (round % 2 === 0) {
        await runWorkers(measured);
        await runGpu(measured);
      } else {
        await runGpu(measured);
        await runWorkers(measured);
      }
    }
    receipt.parityPassed = true;
  } catch (error) {
    receipt.reason = `GPU calibration rejected: ${String(error).slice(0, 300)}`;
    executor.dispose?.();
  }
  receipt.gpuTiming = timing(gpuSamples);
  receipt.workerTiming = timing(workerSamples);
  if (!receipt.parityPassed) return receipt;
  const gpu = receipt.gpuTiming;
  const worker = receipt.workerTiming;
  const faster =
    receipt.workerParityPassed === true &&
    gpu &&
    worker &&
    gpu.medianMs < worker.medianMs * 0.9 &&
    gpu.p95Ms <= worker.p95Ms;
  if (preference === 'webgpu') {
    receipt.selected = 'webgpu';
    receipt.reason = faster
      ? 'Explicit WebGPU: parity passed and transfer-inclusive startup batch was faster'
      : 'Explicit WebGPU: parity passed; a performance advantage is not established';
  } else if (faster) {
    receipt.selected = 'webgpu';
    receipt.reason =
      'Auto WebGPU: parity passed, median improved by over 10%, and p95 did not worsen';
  } else {
    receipt.reason = workerFailure
      ? `Main CPU selected: worker comparison failed (${workerFailure})`
      : !pool
        ? 'CPU route retained: no actual CPU-worker baseline was available'
        : 'CPU route retained: WebGPU did not meet the transfer-inclusive latency threshold';
  }
  return receipt;
}
