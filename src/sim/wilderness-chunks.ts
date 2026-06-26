/**
 * STAGE 3 (per ADR 0010) — the wilderness CHUNK GRID.
 *
 * The deterministic spatial skeleton the streamed best-effort "wilderness" is built on: world
 * position → chunk, a per-chunk seed (its OWN substream, excluded from the core determinism
 * golden), and the camera-streaming load/unload plan. PURE math — no rng DRAWS, no `Date.now`,
 * no DOM — so it is determinism-safe (it never touches the seeded core stream) and fully
 * unit-testable headlessly. Consumed later by the worker wilderness sim (3b) and the streaming
 * integration (3c). See `docs/adr/0010-worker-offload-and-streamed-hybrid-world-2026-06-26.md`.
 */
import { hashSeed } from '../math/rng';

/** World units per wilderness chunk edge (square chunks on the XZ plane). */
export const CHUNK_SIZE = 256;

export interface ChunkCoord {
  cx: number;
  cz: number;
}

/** World (x, z) → integer chunk coordinate. Pure. */
export function chunkCoord(x: number, z: number, size = CHUNK_SIZE): ChunkCoord {
  return { cx: Math.floor(x / size), cz: Math.floor(z / size) };
}

/** Stable string key for a chunk (Set/Map key). Pure. */
export function chunkKey(cx: number, cz: number): string {
  return cx + ',' + cz;
}

/**
 * Per-chunk seed — the chunk's OWN substream off the world seed (ADR 0010), so the wilderness is
 * reproducible-per-chunk yet explicitly excluded from the core golden. Pure + deterministic: it
 * COMPUTES a seed, it does not DRAW from the core rng stream, so it cannot perturb determinism.
 */
export function chunkSeed(worldSeed: number, cx: number, cz: number): number {
  return (hashSeed('wilderness:' + chunkKey(cx, cz)) ^ (worldSeed >>> 0)) >>> 0;
}

/** Every chunk within Chebyshev `radius` of the camera chunk (the desired load set). Pure; O((2r+1)^2). */
export function chunksInRadius(camCx: number, camCz: number, radius: number): ChunkCoord[] {
  const out: ChunkCoord[] = [];
  const r = Math.max(0, Math.floor(radius));
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      out.push({ cx: camCx + dx, cz: camCz + dz });
    }
  }
  return out;
}

export interface StreamPlan {
  load: ChunkCoord[];
  unload: ChunkCoord[];
}

/**
 * Diff the currently-loaded chunk keys against the in-radius set around the camera chunk: what to
 * LOAD (in range, not loaded) and UNLOAD (loaded, now out of range). Pure — never mutates inputs.
 * Called on chunk-boundary crossings (throttled), not the per-frame hot path, so allocation is fine.
 */
export function streamPlan(
  loaded: ReadonlySet<string>,
  camCx: number,
  camCz: number,
  radius: number,
): StreamPlan {
  const want = chunksInRadius(camCx, camCz, radius);
  const wantKeys = new Set(want.map((c) => chunkKey(c.cx, c.cz)));
  const load: ChunkCoord[] = [];
  for (const c of want) {
    if (!loaded.has(chunkKey(c.cx, c.cz))) load.push(c);
  }
  const unload: ChunkCoord[] = [];
  for (const key of loaded) {
    if (!wantKeys.has(key)) {
      const comma = key.indexOf(',');
      unload.push({ cx: Number(key.slice(0, comma)), cz: Number(key.slice(comma + 1)) });
    }
  }
  return { load, unload };
}
