/**
 * Phase 2.1: Graphics Abstraction Layer
 *
 * Unified interface for graphics operations supporting both WebGPU and WebGL2.
 * Provides capability detection, context initialization, and quality-tier-specific
 * API selection for progressive enhancement.
 *
 * Note: WebGPU support in Three.js is experimental as of v0.184.0. This abstraction
 * layer is designed for future WebGPU integration but currently defaults to WebGL2
 * for stability. Compute operations will use WebGL2 transform feedback as a bridge.
 *
 * Architecture:
 * - GraphicsBackend: Enum for supported backends (WebGPU, WebGL2)
 * - GraphicsCapabilities: Detected capabilities of the current backend
 * - GraphicsContext: Unified context interface
 * - WebGL2Context: WebGL2-specific implementation (current production path)
 * - WebGPUContext: WebGPU-specific implementation (future progressive enhancement)
 */
import * as THREE from 'three';

export enum GraphicsBackend {
  WebGPU = 'webgpu',
  WebGL2 = 'webgl2',
}

export interface GraphicsCapabilities {
  backend: GraphicsBackend;
  computeShaders: boolean;
  transformFeedback: boolean;
  maxTextureSize: number;
  maxUniformBufferBindings: number;
  maxStorageBufferBindings: number;
  timestampQuery: boolean;
}

export interface GraphicsContext {
  readonly backend: GraphicsBackend;
  readonly capabilities: GraphicsCapabilities;
  readonly renderer: THREE.WebGLRenderer;
  dispose(): void;
}

/**
 * Detect available graphics capabilities and select the best backend
 *
 * Note: WebGPU detection is conservative - Three.js WebGPU support is experimental.
 * This will return WebGL2 for production stability until WebGPU is mature.
 */
export function detectGraphicsCapabilities(): GraphicsCapabilities {
  // Check for WebGL2 support (current production path). In Bun's DOM-free test runtime we keep the
  // optimistic static limits so capability tests can exercise the abstraction without a browser.
  let webgl2Available = typeof document === 'undefined';
  if (typeof document !== 'undefined' && typeof WebGL2RenderingContext !== 'undefined') {
    const canvas = document.createElement('canvas');
    webgl2Available = !!canvas.getContext('webgl2');
  }

  // Currently default to WebGL2 for stability
  // WebGPU will be enabled via progressive enhancement when mature
  const backend = GraphicsBackend.WebGL2;

  // Return WebGL2 capabilities
  return {
    backend,
    computeShaders: false, // Will use transform feedback instead
    transformFeedback: webgl2Available, // WebGL2 supports transform feedback
    maxTextureSize: 16384, // Typical WebGL2 limit
    maxUniformBufferBindings: 16,
    maxStorageBufferBindings: 0, // WebGL2 doesn't have storage buffers
    timestampQuery: false,
  };
}

/**
 * Create a graphics context based on quality tier and detected capabilities
 *
 * Quality-tier-specific selection:
 * - Desktop/ultra/mega: WebGL2 (WebGPU future progressive enhancement)
 * - Tablet: WebGL2
 * - Phone/laptop: WebGL2
 */
export function createGraphicsContext(
  canvas: HTMLCanvasElement,
  qualityTier: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'ultra' | 'mega',
  preferredBackend?: GraphicsBackend,
): GraphicsContext {
  const capabilities = detectGraphicsCapabilities();

  // Currently all tiers use WebGL2 for stability
  // WebGPU will be added as progressive enhancement in future
  const webgpuEligibleTier =
    qualityTier === 'desktop' || qualityTier === 'ultra' || qualityTier === 'mega';
  const selectedBackend =
    preferredBackend === GraphicsBackend.WebGPU && webgpuEligibleTier
      ? GraphicsBackend.WebGPU
      : GraphicsBackend.WebGL2;

  if (
    selectedBackend === GraphicsBackend.WebGPU &&
    capabilities.backend === GraphicsBackend.WebGPU
  ) {
    return new WebGPUContext(canvas, capabilities);
  }
  return new WebGL2Context(canvas, capabilities);
}

/**
 * WebGL2-specific context implementation (current production path)
 */
class WebGL2Context implements GraphicsContext {
  readonly backend = GraphicsBackend.WebGL2;
  readonly capabilities: GraphicsCapabilities;
  readonly renderer: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement, capabilities: GraphicsCapabilities) {
    this.capabilities = capabilities;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

/**
 * WebGPU-specific context implementation (future progressive enhancement)
 *
 * This class is a placeholder for future WebGPU integration when Three.js
 * WebGPU support is production-ready. Currently not used.
 */
class WebGPUContext implements GraphicsContext {
  readonly backend = GraphicsBackend.WebGPU;
  readonly capabilities: GraphicsCapabilities;
  readonly renderer: THREE.WebGLRenderer; // Will be THREE.WebGPURenderer in future

  constructor(canvas: HTMLCanvasElement, capabilities: GraphicsCapabilities) {
    this.capabilities = capabilities;
    // Placeholder: will use THREE.WebGPURenderer when mature
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
