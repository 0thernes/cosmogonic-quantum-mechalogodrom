/**
 * WebGPU detection and progressive enhancement support.
 *
 * Detects WebGPU availability at runtime and provides fallback to WebGL2.
 * This enables invisible performance improvements on capable devices while
 * maintaining full compatibility across all platforms.
 */

export interface WebGpuCapabilities {
  /** WebGPU is available and can be used */
  available: boolean;
  /** Adapter information (if available) */
  adapter?: string;
  /** Reason for unavailability (if not available) */
  reason?: string;
}

/**
 * Detect WebGPU capabilities in the current browser environment.
 *
 * @returns WebGPU capabilities object
 */
export async function detectWebGpu(): Promise<WebGpuCapabilities> {
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
    // Try to request an adapter (this is the actual capability check)
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        reason: 'No WebGPU adapter found (GPU not supported)',
      };
    }

    // Adapter available - we won't request detailed info to avoid TypeScript compatibility issues
    // The presence of an adapter is sufficient for progressive enhancement
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
