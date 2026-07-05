/**
 * Wilderness Population System (ADR 0010)
 *
 * Best-effort ambient population that runs on worker threads.
 * NOT in the golden - explicitly excluded from determinism requirements.
 * Camera-streamed chunks load/unload by distance.
 * Renders from worker snapshots with 1-frame lag (acceptable for ambient entities).
 * Strictly one-way: core may seed/spawn INTO wilderness; wilderness NEVER writes back.
 */

import { mulberry32 } from '../math/rng';
import type { WorkerPool, WorkerTask } from '../core/worker-pool';

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
  private readonly rng: () => number;
  private readonly chunkSize = 100; // World units per chunk
  private frameCounter = 0; // Frame counter for timestamps (determinism-safe)
  private readonly maxChunks = 16; // Maximum active chunks
  private readonly entitiesPerChunk = 50; // Entities per chunk
  private nextEntityId = 0;
  /** Pre-allocated worker task buffers — one per max active chunk (parallel-safe). */
  private readonly taskBuffers: Float32Array[];

  constructor(workerPool: WorkerPool | null, baseSeed: number) {
    this.workerPool = workerPool;
    // Wilderness uses its OWN seeded sub-stream (ADR 0010)
    // so it's reproducible-ish per chunk but explicitly excluded from the global golden
    this.rng = mulberry32((baseSeed ^ 0x77777777) >>> 0 || 1);
    this.taskBuffers = Array.from(
      { length: this.maxChunks },
      () => new Float32Array(this.entitiesPerChunk * 8),
    );
  }

  /**
   * Update wilderness based on camera position
   * Loads/unloads chunks by distance (camera-streamed)
   */
  update(cameraX: number, cameraZ: number, dt: number): void {
    // Increment frame counter for deterministic timestamps
    this.frameCounter++;

    // Calculate current chunk
    const chunkX = Math.floor(cameraX / this.chunkSize);
    const chunkZ = Math.floor(cameraZ / this.chunkSize);

    // Load nearby chunks
    const loadRadius = 2; // Load chunks within 2 chunks of camera
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
    this.updateChunksOnWorkers(dt);
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

    // Create chunk with seeded entities
    const chunkSeed = this.rng();
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
  private updateChunksOnWorkers(dt: number): void {
    if (!this.workerPool) {
      this.updateChunksSync(dt);
      return;
    }

    const jobs: Promise<void>[] = [];
    let bi = 0;
    for (const [chunkId, chunk] of this.chunks) {
      if (!chunk.active) continue;
      const bufIndex = bi % this.taskBuffers.length;
      bi++;
      jobs.push(this.updateChunkOnWorker(chunkId, chunk, dt, bufIndex));
    }
    void Promise.all(jobs);
  }

  private async updateChunkOnWorker(
    chunkId: string,
    chunk: WildernessChunk,
    dt: number,
    bufIndex: number,
  ): Promise<void> {
    const n = chunk.entities.length;
    let data = this.taskBuffers[bufIndex]!;
    if (data.buffer.byteLength === 0) {
      data = new Float32Array(this.entitiesPerChunk * 8);
      this.taskBuffers[bufIndex] = data;
    }
    for (let i = 0; i < n; i++) {
      const e = chunk.entities[i];
      if (!e) continue;
      data[i * 8 + 0] = e.x;
      data[i * 8 + 1] = e.y;
      data[i * 8 + 2] = e.z;
      data[i * 8 + 3] = e.vx;
      data[i * 8 + 4] = e.vy;
      data[i * 8 + 5] = e.vz;
      data[i * 8 + 6] = e.type;
      data[i * 8 + 7] = e.seed;
    }

    const task: WorkerTask = {
      id: `wilderness-${chunkId}-${this.frameCounter}`,
      type: 'wilderness',
      data: data.subarray(0, n * 8),
      seed: chunk.entities[0]?.seed ?? 0,
      chunkId,
    };

    try {
      const result = await this.workerPool!.executeAsync(task);
      if (result.success) {
        this.updateEntitiesFromResult(chunk, result.data);
      }
    } catch (error) {
      console.error('Wilderness worker error:', error);
      this.updateChunkSync(chunk, dt);
    }
  }

  /**
   * Fallback: update chunks synchronously (no workers)
   */
  private updateChunksSync(dt: number): void {
    for (const chunk of this.chunks.values()) {
      this.updateChunkSync(chunk, dt);
    }
  }

  /**
   * Update a single chunk synchronously
   */
  private updateChunkSync(chunk: WildernessChunk, dt: number): void {
    for (const entity of chunk.entities) {
      // Simple physics: move by velocity
      entity.x = (entity.x ?? 0) + (entity.vx ?? 0) * dt;
      entity.y = (entity.y ?? 0) + (entity.vy ?? 0) * dt;
      entity.z = (entity.z ?? 0) + (entity.vz ?? 0) * dt;

      // Bounce off chunk boundaries
      const cx = Math.floor(entity.x / this.chunkSize);
      const cz = Math.floor(entity.z / this.chunkSize);
      const parts = chunk.chunkId.split(',').map(Number);
      const originalCx = parts[0] ?? 0;
      const originalCz = parts[1] ?? 0;

      if (cx !== originalCx || cz !== originalCz) {
        // Bounce back
        entity.vx = (entity.vx ?? 0) * -1;
        entity.vz = (entity.vz ?? 0) * -1;
        entity.x = originalCx * this.chunkSize + this.chunkSize / 2;
        entity.z = originalCz * this.chunkSize + this.chunkSize / 2;
      }
    }
    chunk.lastUpdate = this.frameCounter;
  }

  /**
   * Update entities from worker result
   */
  private updateEntitiesFromResult(chunk: WildernessChunk, data: Float32Array): void {
    for (let i = 0; i < chunk.entities.length; i++) {
      const e = chunk.entities[i];
      if (!e) continue;
      e.x = data[i * 8 + 0] ?? 0;
      e.y = data[i * 8 + 1] ?? 0;
      e.z = data[i * 8 + 2] ?? 0;
      e.vx = data[i * 8 + 3] ?? 0;
      e.vy = data[i * 8 + 4] ?? 0;
      e.vz = data[i * 8 + 5] ?? 0;
      // type and seed don't change
    }
    chunk.lastUpdate = this.frameCounter;
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
    this.chunks.clear();
  }
}
