/**
 * Performance monitoring utilities for tracking frame times and metrics.
 * This is an INVISIBLE optimization - it doesn't affect visual quality,
 * only provides visibility into performance characteristics.
 */

/**
 * Simple frame time tracker.
 * Tracks frame times and provides statistics.
 */
export class FrameTimeTracker {
  private readonly frameTimes: Float64Array;
  private readonly percentileScratch: Float64Array;
  private readonly maxSamples: number;
  private sampleCount = 0;
  private nextSample = 0;
  private frameTimeSum = 0;
  private lastFrameTime: number;
  private readonly now: () => number;

  constructor(maxSamples = 60, now: () => number = () => performance.now()) {
    this.maxSamples = Math.max(1, Math.floor(maxSamples));
    this.frameTimes = new Float64Array(this.maxSamples);
    this.percentileScratch = new Float64Array(this.maxSamples);
    this.now = now;
    this.lastFrameTime = this.now();
  }

  /**
   * Record a frame time in milliseconds.
   */
  recordFrame(): void {
    const now = this.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.sampleCount < this.maxSamples) {
      this.sampleCount++;
    } else {
      this.frameTimeSum -= this.frameTimes[this.nextSample] ?? 0;
    }

    this.frameTimes[this.nextSample] = frameTime;
    this.frameTimeSum += frameTime;
    this.nextSample = (this.nextSample + 1) % this.maxSamples;
  }

  /**
   * Get the average frame time in milliseconds.
   */
  getAverageFrameTime(): number {
    if (this.sampleCount === 0) return 0;
    return this.frameTimeSum / this.sampleCount;
  }

  /**
   * Get the current FPS based on recent frame times.
   */
  getFPS(): number {
    const avgTime = this.getAverageFrameTime();
    return avgTime > 0 ? 1000 / avgTime : 0;
  }

  /**
   * Get the minimum frame time in milliseconds.
   */
  getMinFrameTime(): number {
    if (this.sampleCount === 0) return 0;
    let min = Infinity;
    for (let i = 0; i < this.sampleCount; i++) min = Math.min(min, this.frameTimes[i] ?? Infinity);
    return min;
  }

  /**
   * Get the maximum frame time in milliseconds.
   */
  getMaxFrameTime(): number {
    if (this.sampleCount === 0) return 0;
    let max = -Infinity;
    for (let i = 0; i < this.sampleCount; i++) max = Math.max(max, this.frameTimes[i] ?? -Infinity);
    return max;
  }

  /**
   * Get the 95th percentile frame time (removes outliers).
   */
  getPercentile95FrameTime(): number {
    if (this.sampleCount === 0) return 0;
    for (let i = 0; i < this.sampleCount; i++) this.percentileScratch[i] = this.frameTimes[i] ?? 0;
    const sorted = this.percentileScratch.subarray(0, this.sampleCount).sort();
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[index] ?? 0;
  }

  /**
   * Reset the tracker.
   */
  reset(): void {
    this.sampleCount = 0;
    this.nextSample = 0;
    this.frameTimeSum = 0;
    this.lastFrameTime = this.now();
  }

  /**
   * Get the number of samples recorded.
   */
  getSampleCount(): number {
    return this.sampleCount;
  }
}

/**
 * Memory usage tracker.
 * Provides visibility into memory consumption.
 */
export class MemoryTracker {
  private lastMeasurement: number = 0;
  private readonly measurementInterval: number;

  constructor(measurementInterval = 1000) {
    this.measurementInterval = measurementInterval;
  }

  /**
   * Get current memory usage in MB.
   * Returns 0 if memory API is not available.
   */
  getCurrentMemoryMB(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get memory limit in MB.
   * Returns 0 if memory API is not available.
   */
  getMemoryLimitMB(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get memory usage as a percentage of the limit.
   */
  getMemoryUsagePercent(): number {
    const current = this.getCurrentMemoryMB();
    const limit = this.getMemoryLimitMB();
    return limit > 0 ? (current / limit) * 100 : 0;
  }

  /**
   * Check if it's time to measure memory again.
   */
  shouldMeasure(): boolean {
    const now = performance.now();
    if (now - this.lastMeasurement >= this.measurementInterval) {
      this.lastMeasurement = now;
      return true;
    }
    return false;
  }
}

/**
 * Performance metrics aggregator.
 * Combines frame time and memory tracking.
 */
export class PerformanceMonitor {
  private readonly frameTracker: FrameTimeTracker;
  private readonly memoryTracker: MemoryTracker;
  private enabled = true;

  constructor(maxFrameSamples = 60, memoryInterval = 1000) {
    this.frameTracker = new FrameTimeTracker(maxFrameSamples);
    this.memoryTracker = new MemoryTracker(memoryInterval);
  }

  /**
   * Record a frame (call this once per frame).
   */
  recordFrame(): void {
    if (!this.enabled) return;
    this.frameTracker.recordFrame();
  }

  /**
   * Get current performance metrics.
   */
  getMetrics() {
    return {
      fps: this.frameTracker.getFPS(),
      avgFrameTime: this.frameTracker.getAverageFrameTime(),
      minFrameTime: this.frameTracker.getMinFrameTime(),
      maxFrameTime: this.frameTracker.getMaxFrameTime(),
      p95FrameTime: this.frameTracker.getPercentile95FrameTime(),
      memoryMB: this.memoryTracker.getCurrentMemoryMB(),
      memoryLimitMB: this.memoryTracker.getMemoryLimitMB(),
      memoryPercent: this.memoryTracker.getMemoryUsagePercent(),
      sampleCount: this.frameTracker.getSampleCount(),
    };
  }

  /**
   * Enable or disable monitoring.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.frameTracker.reset();
  }

  /**
   * Check if memory should be measured this frame.
   */
  shouldMeasureMemory(): boolean {
    return this.enabled && this.memoryTracker.shouldMeasure();
  }
}
