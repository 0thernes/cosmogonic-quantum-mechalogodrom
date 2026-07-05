/**
 * Generic object pool for reducing GC pauses by reusing objects.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only reduces memory allocation and garbage collection overhead.
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;
  private readonly maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}

/**
 * Vector3 pool for THREE.Vector3 objects.
 * Reduces allocation in hot loops where vectors are used as scratch space.
 */
import * as THREE from 'three';

export const vector3Pool = new ObjectPool<THREE.Vector3>(
  () => new THREE.Vector3(),
  (v) => v.set(0, 0, 0),
  50,
);

/**
 * Color pool for THREE.Color objects.
 * Reduces allocation in hot loops where colors are used as scratch space.
 */
export const colorPool = new ObjectPool<THREE.Color>(
  () => new THREE.Color(),
  (c) => c.set(0, 0, 0),
  20,
);

/**
 * Helper to use a pooled vector in a callback.
 * Automatically releases the vector back to the pool after use.
 */
export function withVector3<T>(callback: (v: THREE.Vector3) => T): T {
  const v = vector3Pool.acquire();
  try {
    return callback(v);
  } finally {
    vector3Pool.release(v);
  }
}

/**
 * Helper to use a pooled color in a callback.
 * Automatically releases the color back to the pool after use.
 */
export function withColor<T>(callback: (c: THREE.Color) => T): T {
  const c = colorPool.acquire();
  try {
    return callback(c);
  } finally {
    colorPool.release(c);
  }
}
