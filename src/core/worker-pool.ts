/**
 * Phase 3.1: Web Worker Pool Manager
 *
 * Implements ADR 0010's offload harness for worker-based simulation.
 * Provides SYNC executor (default, deterministic) and ASYNC worker executor
 * (wilderness only, best-effort) with typed message protocol using transferable
 * Float32Array buffers.
 *
 * Architecture:
 * - WorkerPool: Manages worker spawning, task distribution, result collection
 * - WorkerTask: Represents a unit of work to be executed
 * - WorkerResult: Represents the result of a worker task
 * - SharedArrayBuffer support with transferable fallback
 * - Quality-tier-specific worker counts
 */
import type { QualityTier } from '../types';

export interface WorkerTask {
  id: string;
  type: 'simulation' | 'wilderness';
  data: Float32Array;
  seed: number;
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
}

/**
 * Worker pool manager for offloading simulation to Web Workers
 *
 * Implements ADR 0010's offload harness with:
 * - SYNC executor (default, deterministic)
 * - ASYNC worker executor (wilderness only)
 * - Typed message protocol with transferable Float32Array buffers
 * - SharedArrayBuffer support with transferable fallback
 */
export class WorkerPool {
  private readonly workers: Worker[] = [];
  private readonly availableWorkers: Worker[] = [];
  private readonly activeTasks = new Map<string, Worker>();
  private readonly pendingResults = new Map<string, WorkerResult>();
  /** Event-driven waiters — avoids 1 ms polling in waitForResult. */
  private readonly pendingWaits = new Map<string, (result: WorkerResult) => void>();
  /** Event-driven waiters for saturated pools — avoids 10 ms polling for an available worker. */
  private readonly workerAvailableWaits: (() => void)[] = [];
  private readonly config: WorkerPoolConfig;
  private workerScriptUrl: string | null = null;
  /** Reused SharedArrayBuffers keyed by byte length (SAB path only). */
  private readonly sabPool = new Map<number, SharedArrayBuffer>();

  constructor(config: WorkerPoolConfig) {
    this.config = config;
  }

  /**
   * Initialize the worker pool
   */
  async initialize(workerScript: string): Promise<void> {
    this.workerScriptUrl = workerScript;

    // Spawn workers based on quality tier
    const workerCount = this.getWorkerCount();
    for (let i = 0; i < workerCount; i++) {
      const worker = await this.spawnWorker();
      this.workers.push(worker);
      this.availableWorkers.push(worker);
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

  /**
   * Spawn a new worker
   */
  private async spawnWorker(): Promise<Worker> {
    if (!this.workerScriptUrl) {
      throw new Error('Worker pool not initialized');
    }

    const worker = new Worker(this.workerScriptUrl, {
      type: 'module',
    });

    worker.onmessage = (event) => {
      this.handleWorkerMessage(worker, event.data);
    };

    worker.onerror = (error) => {
      this.handleWorkerError(worker, error);
    };

    return worker;
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, result: WorkerResult): void {
    if (this.activeTasks.get(result.id) === worker) {
      this.activeTasks.delete(result.id);
      this.availableWorkers.push(worker);
      this.notifyWorkerAvailable();
    }

    this.deliverResult(result);
  }

  /**
   * Handle worker error — must settle any in-flight task or waitForResult hangs forever.
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker error:', error);

    let taskId: string | undefined;
    for (const [id, activeWorker] of this.activeTasks) {
      if (activeWorker === worker) {
        taskId = id;
        break;
      }
    }

    if (taskId !== undefined) {
      this.activeTasks.delete(taskId);
      this.deliverResult({
        id: taskId,
        type: 'wilderness',
        data: new Float32Array(0),
        success: false,
        error: error.message || 'Worker error',
      });
    }

    if (!this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker);
      this.notifyWorkerAvailable();
    }
  }

  /** Resolve a registered waiter or stash for a late poll. */
  private deliverResult(result: WorkerResult): void {
    const waiter = this.pendingWaits.get(result.id);
    if (waiter) {
      this.pendingWaits.delete(result.id);
      waiter(result);
      return;
    }
    this.pendingResults.set(result.id, result);
  }

  /** Wake one task that is waiting for a worker slot. */
  private notifyWorkerAvailable(): void {
    const waiter = this.workerAvailableWaits.shift();
    if (waiter) waiter();
  }

  /**
   * Execute a task synchronously (SYNC executor - deterministic)
   *
   This is the default path for deterministic core simulation.
   Falls back to main thread when Workers/SharedArrayBuffer are unavailable.
   */
  executeSync(task: WorkerTask, executor: (task: WorkerTask) => Float32Array): Float32Array {
    // SYNC executor: run on main thread
    return executor(task);
  }

  /**
   * Execute a task asynchronously (ASYNC worker executor - wilderness only)
   *
   This is for wilderness simulation only, which is explicitly outside the golden.
   */
  async executeAsync(task: WorkerTask): Promise<WorkerResult> {
    if (task.type !== 'wilderness') {
      return {
        id: task.id,
        type: task.type,
        data: new Float32Array(0),
        success: false,
        error:
          'ASYNC worker executor is wilderness-only; deterministic simulation tasks must use executeSync',
      };
    }

    if (this.workers.length === 0) {
      return {
        id: task.id,
        type: task.type,
        data: new Float32Array(0),
        success: false,
        error: 'Worker pool not initialized',
      };
    }

    // Check if SharedArrayBuffer is available
    if (this.config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined') {
      return this.executeWithSharedArrayBuffer(task);
    } else {
      return this.executeWithTransferable(task);
    }
  }

  /**
   * Execute task with SharedArrayBuffer (zero-copy)
   */
  private async executeWithSharedArrayBuffer(task: WorkerTask): Promise<WorkerResult> {
    const worker = this.availableWorkers.pop();
    if (!worker) {
      // No available workers, fall back to transferable
      return this.executeWithTransferable(task);
    }

    this.activeTasks.set(task.id, worker);

    const byteLen = task.data.byteLength;
    let buffer = this.sabPool.get(byteLen);
    if (!buffer) {
      buffer = new SharedArrayBuffer(byteLen);
      this.sabPool.set(byteLen, buffer);
    }
    const sharedArray = new Float32Array(buffer);
    sharedArray.set(task.data);

    // Send task to worker
    worker.postMessage({
      id: task.id,
      type: task.type,
      data: sharedArray,
      seed: task.seed,
      chunkId: task.chunkId,
      useSharedArrayBuffer: true,
    });

    // Wait for result
    return this.waitForResult(task.id);
  }

  /**
   * Execute task with transferable objects
   */
  private async executeWithTransferable(task: WorkerTask): Promise<WorkerResult> {
    const worker = this.availableWorkers.pop();
    if (!worker) {
      // No available workers, queue task
      await this.waitForAvailableWorker();
      return this.executeWithTransferable(task);
    }

    this.activeTasks.set(task.id, worker);

    // Copy before transfer so caller-owned pooled buffers (wilderness taskBuffers) are not detached.
    const payload = new Float32Array(task.data);

    // Send task to worker with transferable buffer
    worker.postMessage(
      {
        id: task.id,
        type: task.type,
        data: payload,
        seed: task.seed,
        chunkId: task.chunkId,
        useSharedArrayBuffer: false,
      },
      [payload.buffer],
    );

    // Wait for result
    return this.waitForResult(task.id);
  }

  /**
   * Wait for an available worker
   */
  private waitForAvailableWorker(): Promise<void> {
    if (this.availableWorkers.length > 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.workerAvailableWaits.push(resolve);
    });
  }

  /**
   * Wait for task result (event-driven; no busy polling).
   */
  private waitForResult(taskId: string): Promise<WorkerResult> {
    const cached = this.pendingResults.get(taskId);
    if (cached) {
      this.pendingResults.delete(taskId);
      return Promise.resolve(cached);
    }

    return new Promise((resolve) => {
      this.pendingWaits.set(taskId, resolve);
    });
  }

  /**
   * Get worker pool statistics
   */
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
      pendingResults: this.pendingResults.size,
    };
  }

  /**
   * Dispose of all workers
   */
  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
    this.availableWorkers.length = 0;
    this.activeTasks.clear();
    this.pendingResults.clear();
    this.pendingWaits.clear();
    this.workerAvailableWaits.length = 0;
  }
}

/**
 * Create a worker pool with quality-tier-specific configuration
 */
export function createWorkerPool(qualityTier: QualityTier): WorkerPool {
  // Check for SharedArrayBuffer support
  const useSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const nav = globalThis.navigator as Navigator | undefined;

  return new WorkerPool({
    maxWorkers: nav?.hardwareConcurrency || 4,
    useSharedArrayBuffer,
    qualityTier,
  });
}
