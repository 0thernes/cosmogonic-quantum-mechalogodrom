/**
 * WebGPU detection and progressive enhancement support.
 *
 * Detects adapter availability without creating a device or dispatching work.
 * Rendering continues through its existing WebGL path. Capability detection
 * alone establishes neither an active compute backend nor a performance gain.
 */

export interface WebGpuCapabilities {
  /** A WebGPU adapter was obtained; device/workload support remains untested. */
  available: boolean;
  /** Adapter information (if available) */
  adapter?: string;
  /** Reason for unavailability (if not available) */
  reason?: string;
}

/** Maximum time boot waits for an optional WebGPU adapter before continuing with WebGL. */
export const WEBGPU_ADAPTER_TIMEOUT_MS = 1_500;

/**
 * Detect WebGPU capabilities in the current browser environment.
 *
 * @returns WebGPU capabilities object
 */
export async function detectWebGpu(
  timeoutMs: number = WEBGPU_ADAPTER_TIMEOUT_MS,
): Promise<WebGpuCapabilities> {
  // Check if navigator.gpu exists (WebGPU API)
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      available: false,
      reason: 'WebGPU API not available in this browser',
    };
  }

  const gpu = (navigator as { gpu?: GPU }).gpu;
  if (!gpu) {
    return {
      available: false,
      reason: 'navigator.gpu not defined',
    };
  }

  try {
    // WebGPU is an OPTIONAL enhancement. A browser/driver implementation can expose navigator.gpu
    // yet leave requestAdapter() pending indefinitely; never let that stall the WebGL boot path.
    const boundedTimeout = Number.isFinite(timeoutMs)
      ? Math.max(0, Math.floor(timeoutMs))
      : WEBGPU_ADAPTER_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const resolved = await Promise.race([
      gpu.requestAdapter().then((adapter) => ({ adapter, timedOut: false })),
      new Promise<{ adapter: null; timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ adapter: null, timedOut: true }), boundedTimeout);
      }),
    ]).finally(() => {
      if (timer !== null) clearTimeout(timer);
    });
    if (resolved.timedOut) {
      return {
        available: false,
        reason: `WebGPU adapter request timed out after ${boundedTimeout} ms; using WebGL`,
      };
    }
    const adapter = resolved.adapter;
    if (!adapter) {
      return {
        available: false,
        reason: 'No WebGPU adapter found (GPU not supported)',
      };
    }

    // Adapter available - we won't request detailed info to avoid TypeScript compatibility issues
    // Adapter presence is capability evidence only; execution needs a separate device/workload probe.
    return {
      available: true,
      adapter: 'WebGPU Adapter Available',
    };
  } catch (error) {
    return {
      available: false,
      reason: `WebGPU adapter request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Synchronous check for WebGPU API presence (does not request adapter).
 * Use this for fast checks before async detection.
 *
 * @returns true if WebGPU API is present
 */
export function hasWebGpuApi(): boolean {
  return (
    typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as { gpu?: GPU }).gpu
  );
}

/**
 * Get a user-friendly capability description string.
 *
 * @param caps - WebGPU capabilities
 * @returns Human-readable description
 */
export function getCapabilityDescription(caps: WebGpuCapabilities): string {
  if (caps.available) {
    return `WebGPU available (${caps.adapter})`;
  }
  return `WebGPU unavailable: ${caps.reason || 'Unknown reason'}`;
}
