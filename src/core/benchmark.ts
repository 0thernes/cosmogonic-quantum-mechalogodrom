/**
 * Simple benchmark utilities for measuring operation performance.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only provides visibility into operation performance.
 */

/**
 * Measure the execution time of a function.
 * Returns the time in milliseconds.
 */
export function measureTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

/**
 * Measure the execution time of an async function.
 * Returns the time in milliseconds.
 */
export async function measureTimeAsync(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

/**
 * Run a function multiple times and return statistics.
 */
export function benchmark(
  fn: () => void,
  iterations = 100,
): {
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
} {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const time = measureTime(fn);
    times.push(time);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return { totalTime, avgTime, minTime, maxTime };
}

/**
 * Run an async function multiple times and return statistics.
 */
export async function benchmarkAsync(
  fn: () => Promise<void>,
  iterations = 100,
): Promise<{
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const time = await measureTimeAsync(fn);
    times.push(time);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return { totalTime, avgTime, minTime, maxTime };
}

/**
 * Compare two functions and return their relative performance.
 */
export function compare(
  fn1: () => void,
  fn2: () => void,
  iterations = 100,
): {
  fn1Stats: { totalTime: number; avgTime: number; minTime: number; maxTime: number };
  fn2Stats: { totalTime: number; avgTime: number; minTime: number; maxTime: number };
  speedup: number;
} {
  const fn1Stats = benchmark(fn1, iterations);
  const fn2Stats = benchmark(fn2, iterations);
  const speedup = fn1Stats.avgTime / fn2Stats.avgTime;

  return { fn1Stats, fn2Stats, speedup };
}

/**
 * Simple operation timer for ad-hoc measurements.
 */
export class OperationTimer {
  private startTime = 0;
  private endTime = 0;

  /**
   * Start timing an operation.
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * Stop timing an operation.
   */
  stop(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  /**
   * Get the elapsed time in milliseconds.
   */
  getElapsed(): number {
    return this.endTime - this.startTime;
  }

  /**
   * Reset the timer.
   */
  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
  }
}
