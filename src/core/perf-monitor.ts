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
  private frameTimes: number[] = [];
  private readonly maxSamples: number;
  private lastFrameTime = performance.now();

  constructor(maxSamples = 60) {
    this.maxSamples = maxSamples;
  }

  /**
   * Record a frame time in milliseconds.
   */
  recordFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  /**
   * Get the average frame time in milliseconds.
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
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
    if (this.frameTimes.length === 0) return 0;
    return Math.min(...this.frameTimes);
  }

  /**
   * Get the maximum frame time in milliseconds.
   */
  getMaxFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return Math.max(...this.frameTimes);
  }

  /**
   * Get the 95th percentile frame time (removes outliers).
   */
  getPercentile95FrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }

  /**
   * Reset the tracker.
   */
  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
  }

  /**
   * Get the number of samples recorded.
   */
  getSampleCount(): number {
    return this.frameTimes.length;
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
