/**
 * Cache warming utilities for pre-allocating buffers at startup.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only reduces first-frame allocation hiccups by pre-warming caches.
 */

/**
 * Pre-allocate a Float32Array with a specific size and fill it with zeros.
 * This warms up the memory allocator so first-frame allocations are faster.
 */
export function warmFloat32Array(size: number): Float32Array {
  return new Float32Array(size);
}

/**
 * Pre-allocate a Uint32Array with a specific size and fill it with zeros.
 * This warms up the memory allocator so first-frame allocations are faster.
 */
export function warmUint32Array(size: number): Uint32Array {
  return new Uint32Array(size);
}

/**
 * Pre-allocate a Uint16Array with a specific size and fill it with zeros.
 * This warms up the memory allocator so first-frame allocations are faster.
 */
export function warmUint16Array(size: number): Uint16Array {
  return new Uint16Array(size);
}

/**
 * Pre-allocate a Int32Array with a specific size and fill it with zeros.
 * This warms up the memory allocator so first-frame allocations are faster.
 */
export function warmInt32Array(size: number): Int32Array {
  return new Int32Array(size);
}

/**
 * Warm up typed array allocators by creating and discarding arrays of common sizes.
 * This reduces first-frame allocation hiccups by ensuring the allocator is warmed up.
 */
export function warmTypedArrayAllocators(): void {
  // Common sizes used throughout the codebase
  const commonSizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192];

  for (const size of commonSizes) {
    warmFloat32Array(size);
    warmUint32Array(size);
    warmUint16Array(size);
    warmInt32Array(size);
  }
}

/**
 * Pre-warm object pools by creating a minimum number of objects.
 * This ensures pools are ready for use without first-frame allocation delays.
 */
export function warmObjectPools(_minSize: number = 10): void {
  // This is a placeholder - actual pool warming would be done by the pool implementations
  // The object-pool.ts module handles its own warming when needed
}
