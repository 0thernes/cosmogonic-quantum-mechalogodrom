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
  private readonly config: WorkerPoolConfig;
  private workerScriptUrl: string | null = null;

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

  /**
   * Get worker count based on quality tier
   */
  private getWorkerCount(): number {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    switch (this.config.qualityTier) {
      case 'mega':
      case 'ultra':
        return Math.min(hardwareConcurrency, 16);
      case 'desktop':
        return Math.min(hardwareConcurrency, 8);
      case 'tablet':
        return Math.min(hardwareConcurrency, 4);
      case 'laptop':
        return Math.min(hardwareConcurrency, 2);
      case 'phone':
        return 1; // Single-threaded fallback for mobile
      default:
        return 1;
    }
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
      console.error('Worker error:', error);
      this.handleWorkerError(worker, error);
    };

    return worker;
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, result: WorkerResult): void {
    // Mark worker as available
    const index = this.activeTasks.get(result.id);
    if (index === worker) {
      this.activeTasks.delete(result.id);
      this.availableWorkers.push(worker);
    }

    // Store result
    this.pendingResults.set(result.id, result);
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker error:', error);
    // Mark worker as available
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      const availableIndex = this.availableWorkers.indexOf(worker);
      if (availableIndex === -1) {
        this.availableWorkers.push(worker);
      }
    }
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

    // Create SharedArrayBuffer for zero-copy
    const buffer = new SharedArrayBuffer(task.data.byteLength);
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

    // Send task to worker with transferable buffer
    worker.postMessage(
      {
        id: task.id,
        type: task.type,
        data: task.data,
        seed: task.seed,
        chunkId: task.chunkId,
        useSharedArrayBuffer: false,
      },
      [task.data.buffer],
    );

    // Wait for result
    return this.waitForResult(task.id);
  }

  /**
   * Wait for an available worker
   */
  private async waitForAvailableWorker(): Promise<void> {
    while (this.availableWorkers.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Wait for task result
   */
  private async waitForResult(taskId: string): Promise<WorkerResult> {
    while (!this.pendingResults.has(taskId)) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    const result = this.pendingResults.get(taskId)!;
    this.pendingResults.delete(taskId);
    return result;
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
  }
}

/**
 * Create a worker pool with quality-tier-specific configuration
 */
export function createWorkerPool(qualityTier: QualityTier): WorkerPool {
  // Check for SharedArrayBuffer support
  const useSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  return new WorkerPool({
    maxWorkers: navigator.hardwareConcurrency || 4,
    useSharedArrayBuffer,
    qualityTier,
  });
}
