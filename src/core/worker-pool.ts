/**
 * Phase 3.1: Web Worker Pool Manager
 *
 * Implements ADR 0010's offload harness for worker-based simulation.
 * Deterministic core work remains synchronous; asynchronous workers are a
 * best-effort wilderness-only boundary.
 */
import type { QualityTier } from '../types';

/** Maximum clock delta accepted by the ambient worker protocol. */
export const MAX_WORKER_DT = 0.05;

/** Normalize an untrusted frame delta before it crosses the worker boundary. */
export function normalizeWorkerDt(dt: number): number {
  if (!Number.isFinite(dt)) return 0;
  return Math.min(MAX_WORKER_DT, Math.max(0, dt));
}

export interface WorkerTask {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  seed: number;
  /** Finite simulation delta in seconds; the pool defensively normalizes it again. */
  dt: number;
  chunkId?: string;
}

export interface WorkerResult {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  success: boolean;
  error?: string;
}

export interface WorkerPoolConfig {
  /** Upper bound for spawned workers. The pool caps this to available hardware cores and at least one. */
  maxWorkers: number;
  useSharedArrayBuffer: boolean;
  qualityTier: QualityTier;
  /** Per-task deadline. A timed-out worker is terminated before its buffer can be reused. */
  taskTimeoutMs?: number;
  /**
   * Maximum consecutive replacements for one worker lineage. A valid worker reply resets that
   * lineage's budget; repeated startup/runtime failures exhaust it and leave sync fallback active.
   */
  maxReplacementAttempts?: number;
}

interface WorkerWireTask extends WorkerTask {
  /** Pool-owned identity, echoed by the worker to reject late replies from older tasks. */
  generation: number;
  useSharedArrayBuffer: boolean;
}

interface WorkerWireResult extends WorkerResult {
  generation: number;
}

interface ActiveTask {
  readonly generation: number;
  readonly task: WorkerTask;
  readonly worker: Worker;
  readonly resolve: (result: WorkerResult) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly sharedBuffer: SharedArrayBuffer | null;
}

interface WorkerWaiter {
  readonly resolve: (worker: Worker | null) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

const DEFAULT_TASK_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REPLACEMENT_ATTEMPTS = 2;
const HARD_MAX_REPLACEMENT_ATTEMPTS = 8;

/**
 * Worker pool manager for wilderness-only asynchronous work.
 *
 * Invariants:
 * - a worker owns at most one active task;
 * - a SharedArrayBuffer is leased to at most one active task;
 * - every active task and worker-acquisition waiter is settled on dispose;
 * - replies are accepted only from the worker + generation that owns the task.
 */
export class WorkerPool {
  private readonly workers: Worker[] = [];
  private readonly availableWorkers: Worker[] = [];
  private readonly activeTasks = new Map<number, ActiveTask>();
  private readonly activeByWorker = new Map<Worker, number>();
  /** Saturated callers receive a worker directly when one is released. */
  private readonly workerAvailableWaits: WorkerWaiter[] = [];
  private readonly config: WorkerPoolConfig;
  private readonly taskTimeoutMs: number;
  private readonly maxReplacementAttempts: number;
  private workerScriptUrl: string | null = null;
  /** Free SABs keyed by byte length. Checked-out buffers never remain in this map. */
  private readonly freeSharedBuffers = new Map<number, SharedArrayBuffer[]>();
  /** Consecutive failure count for each worker slot; reset after any valid reply. */
  private readonly replacementDepthByWorker = new Map<Worker, number>();
  private nextTaskGeneration = 1;
  private lifecycleGeneration = 1;
  private initializing = false;
  private disposed = false;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
    const timeout = Math.floor(config.taskTimeoutMs ?? DEFAULT_TASK_TIMEOUT_MS);
    this.taskTimeoutMs =
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TASK_TIMEOUT_MS;
    const replacements = Math.floor(
      config.maxReplacementAttempts ?? DEFAULT_MAX_REPLACEMENT_ATTEMPTS,
    );
    this.maxReplacementAttempts = Number.isFinite(replacements)
      ? Math.min(HARD_MAX_REPLACEMENT_ATTEMPTS, Math.max(0, replacements))
      : DEFAULT_MAX_REPLACEMENT_ATTEMPTS;
  }

  /** Initialize the worker pool exactly once. */
  async initialize(workerScript: string): Promise<void> {
    if (this.disposed) throw new Error('Worker pool disposed');
    if (this.initializing || this.workers.length > 0)
      throw new Error('Worker pool already initialized or initializing');
    // Set synchronously before the first await: concurrent callers must not both pass the empty
    // workers check and exceed maxWorkers.
    this.initializing = true;
    this.workerScriptUrl = workerScript;

    try {
      const lifecycle = this.lifecycleGeneration;
      const workerCount = this.getWorkerCount();
      for (let i = 0; i < workerCount; i++) {
        const worker = await this.spawnWorker(0);
        if (this.disposed || lifecycle !== this.lifecycleGeneration) {
          this.replacementDepthByWorker.delete(worker);
          worker.terminate();
          return;
        }
        // A test worker may report a queued startup failure before this await continuation. Never
        // resurrect a worker that its error handler already retired.
        if (!this.replacementDepthByWorker.has(worker)) continue;
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      }
    } finally {
      this.initializing = false;
    }
  }

  /** Get worker count from config, capped by available cores and floored to one. */
  private getWorkerCount(): number {
    const configured = Math.floor(this.config.maxWorkers);
    const requested = Number.isFinite(configured) && configured > 0 ? configured : 1;
    const nav = globalThis.navigator as Navigator | undefined;
    const cores = Math.max(1, Math.floor(nav?.hardwareConcurrency ?? requested));
    return Math.max(1, Math.min(requested, cores));
  }

  /** Spawn one worker and bind its replies to that worker identity. */
  private async spawnWorker(replacementDepth: number): Promise<Worker> {
    if (!this.workerScriptUrl) throw new Error('Worker pool not initialized');

    const worker = new Worker(this.workerScriptUrl, { type: 'module' });
    worker.onmessage = (event) => {
      this.handleWorkerMessage(worker, event.data);
    };
    worker.onerror = (error) => {
      this.handleWorkerError(worker, error);
    };
    this.replacementDepthByWorker.set(worker, replacementDepth);
    return worker;
  }

  /** Accept only the reply owned by this worker's current task generation. */
  private handleWorkerMessage(worker: Worker, value: unknown): void {
    const currentGeneration = this.activeByWorker.get(worker);
    if (currentGeneration === undefined) return; // retired/disposed/late worker

    const result = value as Partial<WorkerWireResult> | null;
    if (!result || result.generation !== currentGeneration) return; // stale generation

    const active = this.activeTasks.get(currentGeneration);
    if (!active || active.worker !== worker) return;

    const validEnvelope =
      result.id === active.task.id &&
      result.type === active.task.type &&
      typeof result.success === 'boolean' &&
      result.data instanceof Float32Array;

    if (!validEnvelope) {
      this.retireFailedWorker(worker);
      this.finishTask(active, this.failure(active.task, 'Malformed worker response'), false);
      return;
    }

    // A structurally valid round-trip proves this replacement is healthy, even when the kernel
    // itself reports `success: false`; a later worker failure starts a fresh bounded lineage.
    this.replacementDepthByWorker.set(worker, 0);
    const validResult = result as WorkerWireResult;
    this.finishTask(
      active,
      {
        id: validResult.id,
        type: validResult.type,
        data: validResult.data,
        success: validResult.success,
        ...(typeof validResult.error === 'string' ? { error: validResult.error } : {}),
      },
      true,
    );
  }

  /** A worker error settles its task, retires the worker, then restores pool capacity. */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const generation = this.activeByWorker.get(worker);
    const active = generation === undefined ? undefined : this.activeTasks.get(generation);
    this.retireFailedWorker(worker);
    if (active) {
      this.finishTask(active, this.failure(active.task, error.message || 'Worker error'), false);
    }
  }

  /** Retire one failed worker and replace it only while its consecutive-failure budget remains. */
  private retireFailedWorker(worker: Worker): void {
    const depth = this.replacementDepthByWorker.get(worker) ?? 0;
    const nextDepth = depth + 1;
    this.retireWorker(worker, nextDepth <= this.maxReplacementAttempts ? nextDepth : null);
  }

  /** Resolve a task exactly once and release its exclusive resources. */
  private finishTask(active: ActiveTask, result: WorkerResult, releaseWorker: boolean): void {
    if (this.activeTasks.get(active.generation) !== active) return;

    this.activeTasks.delete(active.generation);
    this.activeByWorker.delete(active.worker);
    clearTimeout(active.timeout);

    let stableResult = result;
    if (active.sharedBuffer && result.data instanceof Float32Array) {
      // Promise callbacks run after this handler returns. Copy before returning the SAB to the free
      // list so a newly-dispatched task cannot overwrite data the consumer has not read yet.
      stableResult = { ...result, data: new Float32Array(result.data) };
      this.releaseSharedBuffer(active.sharedBuffer);
    }

    if (releaseWorker) this.releaseWorker(active.worker);
    active.resolve(stableResult);
  }

  /** Remove and terminate a worker; optionally spawn a replacement for queued work. */
  private retireWorker(worker: Worker, replacementDepth: number | null): void {
    const wi = this.workers.indexOf(worker);
    if (wi >= 0) this.workers.splice(wi, 1);
    const ai = this.availableWorkers.indexOf(worker);
    if (ai >= 0) this.availableWorkers.splice(ai, 1);
    this.replacementDepthByWorker.delete(worker);
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();

    if (replacementDepth === null || this.disposed || !this.workerScriptUrl) {
      // No worker can ever satisfy queued acquisitions once the last lineage is exhausted.
      if (this.workers.length === 0) this.settleWorkerWaiters(null);
      return;
    }
    const lifecycle = this.lifecycleGeneration;
    void this.spawnWorker(replacementDepth)
      .then((replacement) => {
        if (this.disposed || lifecycle !== this.lifecycleGeneration) {
          this.replacementDepthByWorker.delete(replacement);
          replacement.terminate();
          return;
        }
        // An asynchronously reported startup failure may retire the worker before this continuation.
        if (!this.replacementDepthByWorker.has(replacement)) return;
        this.workers.push(replacement);
        this.releaseWorker(replacement);
      })
      .catch(() => {
        // If the pool has no remaining capacity, settle queued acquisitions instead of hanging them.
        if (this.workers.length === 0 && this.activeTasks.size === 0) {
          this.settleWorkerWaiters(null);
        }
      });
  }

  /** Hand a healthy worker directly to one waiter, or return it to the idle stack. */
  private releaseWorker(worker: Worker): void {
    if (this.disposed || !this.workers.includes(worker)) return;
    const waiter = this.workerAvailableWaits.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiter.resolve(worker);
    } else this.availableWorkers.push(worker);
  }

  /** Settle every saturated caller, used by dispose and terminal replacement failure. */
  private settleWorkerWaiters(worker: Worker | null): void {
    let next = worker;
    while (this.workerAvailableWaits.length > 0) {
      const waiter = this.workerAvailableWaits.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.resolve(next);
      }
      // A concrete worker can satisfy only one acquisition.
      next = null;
    }
  }

  /** Acquire an idle worker or wait until one is handed off. */
  private acquireWorker(): Promise<Worker | null> {
    if (this.disposed) return Promise.resolve(null);
    const worker = this.availableWorkers.pop();
    if (worker) return Promise.resolve(worker);
    return new Promise((resolve) => {
      const waiter: WorkerWaiter = {
        resolve,
        timeout: setTimeout(() => {
          const index = this.workerAvailableWaits.indexOf(waiter);
          if (index < 0) return;
          this.workerAvailableWaits.splice(index, 1);
          resolve(null);
        }, this.taskTimeoutMs),
      };
      this.workerAvailableWaits.push(waiter);
    });
  }

  /** Check out an exclusive SharedArrayBuffer of the requested size. */
  private acquireSharedBuffer(byteLength: number): SharedArrayBuffer {
    const free = this.freeSharedBuffers.get(byteLength);
    const buffer = free?.pop();
    return buffer ?? new SharedArrayBuffer(byteLength);
  }

  /** Return a no-longer-observable SharedArrayBuffer to the size-class free list. */
  private releaseSharedBuffer(buffer: SharedArrayBuffer): void {
    if (this.disposed) return;
    const byteLength = buffer.byteLength;
    let free = this.freeSharedBuffers.get(byteLength);
    if (!free) {
      free = [];
      this.freeSharedBuffers.set(byteLength, free);
    }
    free.push(buffer);
  }

  private failure(task: WorkerTask, error: string): WorkerResult {
    return {
      id: task.id,
      type: task.type,
      data: new Float32Array(0),
      success: false,
      error,
    };
  }

  /** Execute deterministic core work synchronously on the main thread. */
  executeSync(task: WorkerTask, executor: (task: WorkerTask) => Float32Array): Float32Array {
    return executor({ ...task, dt: normalizeWorkerDt(task.dt) });
  }

  /** Execute wilderness work asynchronously. Every return path settles with a WorkerResult. */
  async executeAsync(task: WorkerTask): Promise<WorkerResult> {
    if (task.type !== 'wilderness') {
      return this.failure(
        task,
        'ASYNC worker executor is wilderness-only; deterministic simulation tasks must use executeSync',
      );
    }
    if (this.disposed) return this.failure(task, 'Worker pool disposed');
    if (this.workers.length === 0) return this.failure(task, 'Worker pool not initialized');

    const worker = await this.acquireWorker();
    if (!worker || this.disposed || !this.workers.includes(worker)) {
      return this.failure(
        task,
        this.disposed
          ? 'Worker pool disposed'
          : `Worker task timed out waiting for capacity after ${this.taskTimeoutMs}ms`,
      );
    }

    const normalizedTask: WorkerTask = { ...task, dt: normalizeWorkerDt(task.dt) };
    return this.dispatch(worker, normalizedTask);
  }

  /** Register the task before postMessage so even synchronous test workers cannot outrun the waiter. */
  private dispatch(worker: Worker, task: WorkerTask): Promise<WorkerResult> {
    const generation = this.nextTaskGeneration++;
    const useSharedArrayBuffer =
      this.config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined';
    const sharedBuffer = useSharedArrayBuffer
      ? this.acquireSharedBuffer(task.data.byteLength)
      : null;
    const payload = sharedBuffer ? new Float32Array(sharedBuffer) : new Float32Array(task.data); // caller-owned buffers are never transferred/detached
    if (sharedBuffer) payload.set(task.data);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const active = this.activeTasks.get(generation);
        if (!active) return;
        // Terminate before the exclusive SAB is returned to the free list. A late callback from the
        // retired worker is ignored by worker identity + generation.
        this.retireFailedWorker(worker);
        this.finishTask(
          active,
          this.failure(task, `Worker task timed out after ${this.taskTimeoutMs}ms`),
          false,
        );
      }, this.taskTimeoutMs);

      const active: ActiveTask = {
        generation,
        task,
        worker,
        resolve,
        timeout,
        sharedBuffer,
      };
      this.activeTasks.set(generation, active);
      this.activeByWorker.set(worker, generation);

      const message: WorkerWireTask = {
        ...task,
        data: payload,
        generation,
        useSharedArrayBuffer,
      };

      try {
        if (sharedBuffer) worker.postMessage(message);
        else worker.postMessage(message, [payload.buffer]);
      } catch (error) {
        this.finishTask(
          active,
          this.failure(task, error instanceof Error ? error.message : String(error)),
          true,
        );
      }
    });
  }

  /** Worker-pool telemetry. `pendingResults` remains for API compatibility; delivery is now direct. */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    activeTasks: number;
    pendingResults: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      pendingResults: 0,
    };
  }

  /** Dispose idempotently and settle all active and queued asynchronous calls. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lifecycleGeneration++;
    this.settleWorkerWaiters(null);

    for (const active of Array.from(this.activeTasks.values())) {
      this.finishTask(active, this.failure(active.task, 'Worker pool disposed'), false);
    }
    for (const worker of this.workers) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }
    this.workers.length = 0;
    this.availableWorkers.length = 0;
    this.activeTasks.clear();
    this.activeByWorker.clear();
    this.freeSharedBuffers.clear();
    this.replacementDepthByWorker.clear();
  }
}

/** Create a worker pool using all available cores up to the configured hardware count. */
export function createWorkerPool(qualityTier: QualityTier): WorkerPool {
  const useSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const nav = globalThis.navigator as Navigator | undefined;
  return new WorkerPool({
    maxWorkers: nav?.hardwareConcurrency || 4,
    useSharedArrayBuffer,
    qualityTier,
  });
}
