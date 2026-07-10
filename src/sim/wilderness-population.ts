/**
 * Wilderness Population System (ADR 0010)
 *
 * Best-effort ambient population that runs on worker threads.
 * NOT in the golden - explicitly excluded from determinism requirements.
 * Camera-streamed chunks load/unload by distance.
 * Renders from worker snapshots with 1-frame lag (acceptable for ambient entities).
 * Strictly one-way: core may seed/spawn INTO wilderness; wilderness NEVER writes back.
 */

import { hashSeed, mulberry32 } from '../math/rng';
import {
  normalizeWorkerDt,
  type WorkerPool,
  type WorkerResult,
  type WorkerTask,
} from '../core/worker-pool';
import { chunkSeed as coordinateChunkSeed } from './wilderness-chunks';

/** Packed wilderness entity layout: xyz, velocity xyz, type, seed. */
export const WILDERNESS_ENTITY_STRIDE = 8;
const WILDERNESS_DAMPING_60HZ = 0.985;

/**
 * Shared worker/main-thread wilderness kernel. Mutates `data` in place and draws exactly three
 * seeded random values per entity when dt > 0. O(entities), allocation-free after RNG creation.
 */
export function simulateWildernessData(
  data: Float32Array,
  seed: number,
  chunkId: string,
  dt: number,
  chunkSize = 100,
): Float32Array {
  if (data.length % WILDERNESS_ENTITY_STRIDE !== 0) {
    throw new Error(`Malformed wilderness payload length: ${data.length}`);
  }

  const safeDt = normalizeWorkerDt(dt);
  const comma = chunkId.indexOf(',');
  const parsedCx = comma >= 0 ? Number(chunkId.slice(0, comma)) : 0;
  const parsedCz = comma >= 0 ? Number(chunkId.slice(comma + 1)) : 0;
  const chunkX = Number.isFinite(parsedCx) ? Math.trunc(parsedCx) : 0;
  const chunkZ = Number.isFinite(parsedCz) ? Math.trunc(parsedCz) : 0;
  const frameScale = safeDt * 60;
  const damping = Math.pow(WILDERNESS_DAMPING_60HZ, frameScale);
  const rng = safeDt > 0 ? mulberry32((seed ^ hashSeed(chunkId)) >>> 0) : null;

  for (let i = 0; i < data.length; i += WILDERNESS_ENTITY_STRIDE) {
    let x = data[i] ?? 0;
    let y = data[i + 1] ?? 0;
    let z = data[i + 2] ?? 0;
    let vx = data[i + 3] ?? 0;
    let vy = data[i + 4] ?? 0;
    let vz = data[i + 5] ?? 0;
    const type = data[i + 6] ?? 0;
    const entitySeed = data[i + 7] ?? 0;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z) ||
      !Number.isFinite(vx) ||
      !Number.isFinite(vy) ||
      !Number.isFinite(vz) ||
      !Number.isFinite(type) ||
      !Number.isFinite(entitySeed)
    ) {
      throw new Error(`Non-finite wilderness input at entity ${i / WILDERNESS_ENTITY_STRIDE}`);
    }

    if (rng) {
      vx += (rng() - 0.5) * 0.04 * frameScale;
      vy += (rng() - 0.5) * 0.02 * frameScale;
      vz += (rng() - 0.5) * 0.04 * frameScale;
      x += vx * safeDt;
      y += vy * safeDt;
      z += vz * safeDt;
      vx *= damping;
      vy *= damping;
      vz *= damping;

      if (Math.floor(x / chunkSize) !== chunkX || Math.floor(z / chunkSize) !== chunkZ) {
        vx = -vx;
        vz = -vz;
        x = chunkX * chunkSize + chunkSize / 2;
        z = chunkZ * chunkSize + chunkSize / 2;
      }
    }

    data[i] = x;
    data[i + 1] = y;
    data[i + 2] = z;
    data[i + 3] = vx;
    data[i + 4] = vy;
    data[i + 5] = vz;
  }

  return data;
}

export interface WildernessEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type: number;
  seed: number;
}

export interface WildernessChunk {
  chunkId: string;
  entities: Array<WildernessEntity>;
  lastUpdate: number;
  active: boolean;
}

export interface WildernessSnapshot {
  chunkId: string;
  positions: Float32Array; // [x, y, z, vx, vy, vz, type, seed] per entity
  count: number;
}

/**
 * Wilderness population manager
 *
 * Manages ambient entities that run on worker threads.
 * Camera-streamed chunks load/unload by distance.
 * One-way boundary: core → wilderness only.
 */
export class WildernessPopulation {
  private readonly chunks = new Map<string, WildernessChunk>();
  private readonly workerPool: WorkerPool | null;
  private readonly baseSeed: number;
  private readonly chunkSize = 100; // World units per chunk
  private frameCounter = 0; // Frame counter for timestamps (determinism-safe)
  private readonly maxChunks = 64; // Camera-streamed active chunks (ADR 0010 — not golden)
  private readonly entitiesPerChunk = 128; // Entities per chunk
  private nextEntityId = 0;
  /** Pre-allocated worker task buffers — one per max active chunk (parallel-safe). */
  private readonly taskBuffers: Float32Array[];
  /** Backpressure: exactly one active worker frame plus one replaceable latest request. */
  private workerFrameRunning = false;
  private workerFrameQueued = false;
  private latestWorkerDt = 0;
  private latestWorkerFrame = 0;
  private disposed = false;

  constructor(workerPool: WorkerPool | null, baseSeed: number) {
    this.workerPool = workerPool;
    // Coordinate-derived wilderness seeds never draw from or perturb the core RNG stream.
    this.baseSeed = (baseSeed ^ 0x77777777) >>> 0 || 1;
    this.taskBuffers = Array.from(
      { length: this.maxChunks },
      () => new Float32Array(this.entitiesPerChunk * WILDERNESS_ENTITY_STRIDE),
    );
  }

  /**
   * Update wilderness based on camera position
   * Loads/unloads chunks by distance (camera-streamed)
   */
  update(cameraX: number, cameraZ: number, dt: number): void {
    if (this.disposed) return;
    // Increment frame counter for deterministic timestamps
    this.frameCounter++;

    // Calculate current chunk
    const chunkX = Math.floor(cameraX / this.chunkSize);
    const chunkZ = Math.floor(cameraZ / this.chunkSize);

    // Load nearby chunks
    const loadRadius = 3; // Load chunks within 3 chunks of camera (denser ambient field)
    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dz = -loadRadius; dz <= loadRadius; dz++) {
        const cx = chunkX + dx;
        const cz = chunkZ + dz;
        const chunkId = `${cx},${cz}`;
        this.loadChunk(chunkId, cx, cz);
      }
    }

    // Unload distant chunks
    this.unloadDistantChunks(chunkX, chunkZ, loadRadius + 1);

    // Update active chunks on workers
    this.updateChunksOnWorkers(normalizeWorkerDt(dt), this.frameCounter);
  }

  /**
   * Load a chunk if not already loaded
   */
  private loadChunk(chunkId: string, cx: number, cz: number): void {
    if (this.chunks.has(chunkId)) {
      return; // Already loaded
    }

    if (this.chunks.size >= this.maxChunks) {
      return; // Max chunks reached
    }

    // Create chunk from a coordinate-derived substream. Load order and camera history cannot alter it.
    const chunkSeed = coordinateChunkSeed(this.baseSeed, cx, cz);
    const entities: WildernessEntity[] = [];

    for (let i = 0; i < this.entitiesPerChunk; i++) {
      const entitySeed = (chunkSeed + i) >>> 0;
      const entityRng = mulberry32(entitySeed);

      entities.push({
        id: this.nextEntityId++,
        x: cx * this.chunkSize + entityRng() * this.chunkSize,
        y: 0,
        z: cz * this.chunkSize + entityRng() * this.chunkSize,
        vx: (entityRng() - 0.5) * 2,
        vy: 0,
        vz: (entityRng() - 0.5) * 2,
        type: Math.floor(entityRng() * 5), // 5 entity types
        seed: entitySeed,
      });
    }

    this.chunks.set(chunkId, {
      chunkId,
      entities,
      lastUpdate: 0,
      active: true,
    });
  }

  /**
   * Unload chunks that are too far from camera
   */
  private unloadDistantChunks(chunkX: number, chunkZ: number, unloadRadius: number): void {
    for (const [chunkId, chunk] of this.chunks) {
      const parts = chunkId.split(',').map(Number);
      const cx = parts[0] ?? 0;
      const cz = parts[1] ?? 0;
      const dx = Math.abs(cx - chunkX);
      const dz = Math.abs(cz - chunkZ);

      if (dx > unloadRadius || dz > unloadRadius) {
        chunk.active = false;
        this.chunks.delete(chunkId);
      }
    }
  }

  /**
   * Update chunks on worker threads (parallel dispatch — all active chunks at once).
   */
  private updateChunksOnWorkers(dt: number, scheduledFrame: number): void {
    if (!this.workerPool) {
      this.updateChunksSync(dt, scheduledFrame);
      return;
    }

    this.latestWorkerDt = dt;
    this.latestWorkerFrame = scheduledFrame;
    this.workerFrameQueued = true;
    if (!this.workerFrameRunning) {
      this.workerFrameRunning = true;
      void this.drainWorkerFrames();
    }
  }

  /** Drain one active request and, if frames arrived meanwhile, only the newest coalesced request. */
  private async drainWorkerFrames(): Promise<void> {
    try {
      while (!this.disposed && this.workerFrameQueued) {
        const dt = this.latestWorkerDt;
        const scheduledFrame = this.latestWorkerFrame;
        this.workerFrameQueued = false;
        try {
          await this.runWorkerUpdates(dt, scheduledFrame);
        } catch (error) {
          console.error('Wilderness worker frame error:', error);
        }
      }
    } finally {
      this.workerFrameRunning = false;
      // No await occurs between the loop check and this assignment, but keep the restart guard explicit
      // for disposal/HMR callers that may synchronously enqueue from error hooks.
      if (!this.disposed && this.workerFrameQueued) {
        this.workerFrameRunning = true;
        void this.drainWorkerFrames();
      }
    }
  }

  private async runWorkerUpdates(dt: number, scheduledFrame: number): Promise<void> {
    const jobs: Promise<void>[] = [];
    let bi = 0;
    for (const [chunkId, chunk] of this.chunks) {
      if (!chunk.active) continue;
      const bufIndex = bi % this.taskBuffers.length;
      bi++;
      jobs.push(this.updateChunkOnWorker(chunkId, chunk, dt, scheduledFrame, bufIndex));
    }
    await Promise.all(jobs);
  }

  private async updateChunkOnWorker(
    chunkId: string,
    chunk: WildernessChunk,
    dt: number,
    scheduledFrame: number,
    bufIndex: number,
  ): Promise<void> {
    const task = this.packTask(chunkId, chunk, dt, scheduledFrame, bufIndex);
    let result: WorkerResult | null = null;
    try {
      result = await this.workerPool!.executeAsync(task);
    } catch (error) {
      console.error('Wilderness worker error:', error);
    }

    if (this.disposed || !chunk.active || this.chunks.get(chunkId) !== chunk) return;

    if (result && this.isValidResult(task, result)) {
      this.updateEntitiesFromResult(chunk, result.data, scheduledFrame);
      return;
    }

    // Any worker-level failure or malformed payload falls back through the exact same pure kernel.
    try {
      simulateWildernessData(task.data, task.seed, chunkId, task.dt, this.chunkSize);
      if (this.isValidData(task.data, task.data.length)) {
        this.updateEntitiesFromResult(chunk, task.data, scheduledFrame);
      }
    } catch (error) {
      console.error('Wilderness fallback error:', error);
    }
  }

  /** Pack one chunk into its frame-exclusive task buffer. */
  private packTask(
    chunkId: string,
    chunk: WildernessChunk,
    dt: number,
    scheduledFrame: number,
    bufIndex: number,
  ): WorkerTask {
    const n = chunk.entities.length;
    let data = this.taskBuffers[bufIndex]!;
    if (data.buffer.byteLength === 0) {
      data = new Float32Array(this.entitiesPerChunk * WILDERNESS_ENTITY_STRIDE);
      this.taskBuffers[bufIndex] = data;
    }
    for (let i = 0; i < n; i++) {
      const e = chunk.entities[i];
      if (!e) continue;
      const o = i * WILDERNESS_ENTITY_STRIDE;
      data[o] = e.x;
      data[o + 1] = e.y;
      data[o + 2] = e.z;
      data[o + 3] = e.vx;
      data[o + 4] = e.vy;
      data[o + 5] = e.vz;
      data[o + 6] = e.type;
      data[o + 7] = e.seed;
    }

    return {
      id: `wilderness-${chunkId}-${scheduledFrame}`,
      type: 'wilderness',
      data: data.subarray(0, n * WILDERNESS_ENTITY_STRIDE),
      seed:
        ((chunk.entities[0]?.seed ?? this.baseSeed) ^ hashSeed(`frame:${scheduledFrame}`)) >>> 0,
      dt,
      chunkId,
    };
  }

  /**
   * Fallback: update chunks synchronously (no workers)
   */
  private updateChunksSync(dt: number, scheduledFrame: number): void {
    let bi = 0;
    for (const [chunkId, chunk] of this.chunks) {
      this.updateChunkSync(chunkId, chunk, dt, scheduledFrame, bi % this.taskBuffers.length);
      bi++;
    }
  }

  /**
   * Update a single chunk synchronously
   */
  private updateChunkSync(
    chunkId: string,
    chunk: WildernessChunk,
    dt: number,
    scheduledFrame: number,
    bufIndex: number,
  ): void {
    const task = this.packTask(chunkId, chunk, dt, scheduledFrame, bufIndex);
    try {
      simulateWildernessData(task.data, task.seed, chunkId, task.dt, this.chunkSize);
      this.updateEntitiesFromResult(chunk, task.data, scheduledFrame);
    } catch (error) {
      console.error('Wilderness synchronous update error:', error);
    }
  }

  private isValidResult(task: WorkerTask, result: WorkerResult): boolean {
    return (
      result.success === true &&
      result.id === task.id &&
      result.type === task.type &&
      result.data instanceof Float32Array &&
      this.isValidData(result.data, task.data.length)
    );
  }

  private isValidData(data: Float32Array, expectedLength: number): boolean {
    if (data.length !== expectedLength) return false;
    for (let i = 0; i < data.length; i++) {
      if (!Number.isFinite(data[i])) return false;
    }
    return true;
  }

  /**
   * Update entities from worker result
   */
  private updateEntitiesFromResult(
    chunk: WildernessChunk,
    data: Float32Array,
    scheduledFrame: number,
  ): void {
    for (let i = 0; i < chunk.entities.length; i++) {
      const e = chunk.entities[i];
      if (!e) continue;
      const o = i * WILDERNESS_ENTITY_STRIDE;
      e.x = data[o] ?? 0;
      e.y = data[o + 1] ?? 0;
      e.z = data[o + 2] ?? 0;
      e.vx = data[o + 3] ?? 0;
      e.vy = data[o + 4] ?? 0;
      e.vz = data[o + 5] ?? 0;
      // type and seed don't change
    }
    chunk.lastUpdate = scheduledFrame;
  }

  /**
   * Iterate every live wilderness entity (render + telemetry). O(n) over ambient count only.
   */
  forEachEntity(fn: (entity: WildernessEntity) => void): void {
    for (const chunk of this.chunks.values()) {
      for (const e of chunk.entities) fn(e);
    }
  }

  /** Active chunk count (telemetry). */
  getActiveChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Get snapshot for rendering (1-frame lag acceptable)
   */
  getSnapshot(chunkId: string): WildernessSnapshot | null {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return null;

    const positions = new Float32Array(chunk.entities.length * 8);
    for (let i = 0; i < chunk.entities.length; i++) {
      const e = chunk.entities[i];
      if (!e) continue;
      positions[i * 8 + 0] = e.x;
      positions[i * 8 + 1] = e.y;
      positions[i * 8 + 2] = e.z;
      positions[i * 8 + 3] = e.vx;
      positions[i * 8 + 4] = e.vy;
      positions[i * 8 + 5] = e.vz;
      positions[i * 8 + 6] = e.type;
      positions[i * 8 + 7] = e.seed;
    }

    return {
      chunkId,
      positions,
      count: chunk.entities.length,
    };
  }

  /**
   * Get all active chunks
   */
  getActiveChunks(): string[] {
    return Array.from(this.chunks.keys());
  }

  /**
   * Get total entity count
   */
  getEntityCount(): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      count += chunk.entities.length;
    }
    return count;
  }

  /**
   * Dispose wilderness population
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.workerFrameQueued = false;
    this.chunks.clear();
  }
}
