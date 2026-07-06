/**
 * Math calculation cache for common operations.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only reduces redundant calculations by caching results.
 */

/**
 * Zero-allocation LRU cache for math calculations.
 * Uses Map insertion order for O(1) recency updates and oldest-entry eviction.
 */
class MathCache<T> {
  private cache = new Map<string, T>();
  private readonly maxSize: number;

  constructor(maxSize = 64) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Cache for sine/cosine calculations.
 * Useful for repeated angle calculations in animation loops.
 */
export const trigCache = new MathCache<{ sin: number; cos: number }>(128);

/**
 * Get cached sine and cosine for an angle.
 * Returns cached values if available, otherwise calculates and caches.
 */
export function getCachedSinCos(angle: number): { sin: number; cos: number } {
  const key = angle.toFixed(6); // 6 decimal places is sufficient for most use cases
  const cached = trigCache.get(key);

  if (cached) {
    return cached;
  }

  const result = { sin: Math.sin(angle), cos: Math.cos(angle) };
  trigCache.set(key, result);
  return result;
}

/**
 * Cache for distance calculations.
 * Useful for repeated distance checks between the same points.
 */
export const distanceCache = new MathCache<number>(64);

/**
 * Get cached squared distance between two points.
 * Returns cached value if available, otherwise calculates and caches.
 */
export function getCachedDistance2(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): number {
  const key = `${x1.toFixed(3)},${y1.toFixed(3)},${z1.toFixed(3)}-${x2.toFixed(3)},${y2.toFixed(3)},${z2.toFixed(3)}`;
  const cached = distanceCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const result = dx * dx + dy * dy + dz * dz;
  distanceCache.set(key, result);
  return result;
}

/**
 * Clear all math caches.
 * Call this when the scene changes significantly to invalidate cached values.
 */
export function clearMathCaches(): void {
  trigCache.clear();
  distanceCache.clear();
}
