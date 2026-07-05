/**
 * Phase 5.2: Transform Feedback for Brain State Updates
 *
 * GPU-based brain state updates using WebGL2 Transform Feedback to eliminate
 * CPU-GPU round-trips. Brain states are computed entirely on the GPU and
 * written back to buffers without CPU intervention.
 *
 * Architecture:
 * - TransformFeedbackManager: Manages TF objects and buffers
 * - BrainStateTF: Specific TF pass for brain state updates
 * - GPUBufferPool: Manages GPU memory for brain states
 */
import * as THREE from 'three';

export interface TransformFeedbackConfig {
  enabled: boolean;
  bufferSize: number;
  varyings: string[];
}

/**
 * Transform Feedback manager for WebGL2
 *
 * Manages transform feedback objects and buffers for GPU-based computation.
 */
export class TransformFeedbackManager {
  private readonly gl: WebGL2RenderingContext;
  private readonly tfObjects: Map<string, WebGLTransformFeedback> = new Map();
  private readonly buffers: Map<string, WebGLBuffer> = new Map();

  constructor(renderer: THREE.WebGLRenderer) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl) {
      throw new Error('WebGL2 context required for Transform Feedback');
    }
    this.gl = gl;
  }

  /**
   * Create a transform feedback object
   */
  createTransformFeedback(name: string): WebGLTransformFeedback {
    if (this.tfObjects.has(name)) {
      return this.tfObjects.get(name)!;
    }

    const tf = this.gl.createTransformFeedback();
    if (!tf) {
      throw new Error(`Failed to create transform feedback: ${name}`);
    }

    this.tfObjects.set(name, tf);
    return tf;
  }

  /**
   * Create a GPU buffer for transform feedback output
   */
  createBuffer(
    name: string,
    size: number,
    usage: number = WebGL2RenderingContext.DYNAMIC_COPY,
  ): WebGLBuffer {
    if (this.buffers.has(name)) {
      return this.buffers.get(name)!;
    }

    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error(`Failed to create buffer: ${name}`);
    }

    this.gl.bindBuffer(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, buffer);
    this.gl.bufferData(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, size, usage);
    this.gl.bindBuffer(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, null);

    this.buffers.set(name, buffer);
    return buffer;
  }

  /**
   * Bind a buffer to a transform feedback varying
   */
  bindBufferBase(tf: WebGLTransformFeedback, index: number, buffer: WebGLBuffer): void {
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, tf);
    this.gl.bindBufferBase(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, index, buffer);
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, null);
  }

  /**
   * Begin transform feedback pass
   */
  beginTransformFeedback(tf: WebGLTransformFeedback, primitiveMode: number): void {
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, tf);
    this.gl.beginTransformFeedback(primitiveMode);
  }

  /**
   * End transform feedback pass
   */
  endTransformFeedback(): void {
    this.gl.endTransformFeedback();
    this.gl.bindTransformFeedback(WebGL2RenderingContext.TRANSFORM_FEEDBACK, null);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const tf of this.tfObjects.values()) {
      this.gl.deleteTransformFeedback(tf);
    }
    for (const buffer of this.buffers.values()) {
      this.gl.deleteBuffer(buffer);
    }
    this.tfObjects.clear();
    this.buffers.clear();
  }
}

/**
 * Brain state transform feedback pass
 *
 * Computes brain state updates entirely on the GPU using transform feedback.
 */
export class BrainStateTF {
  private readonly manager: TransformFeedbackManager;
  private readonly tf: WebGLTransformFeedback;
  private readonly stateBuffer: WebGLBuffer;
  private readonly config: TransformFeedbackConfig;

  constructor(renderer: THREE.WebGLRenderer, config: TransformFeedbackConfig) {
    this.config = config;
    this.manager = new TransformFeedbackManager(renderer);
    this.tf = this.manager.createTransformFeedback('brain-state');
    this.stateBuffer = this.manager.createBuffer('brain-state', config.bufferSize);

    // Bind buffer to transform feedback
    this.manager.bindBufferBase(this.tf, 0, this.stateBuffer);
  }

  /**
   * Execute brain state update pass
   */
  execute(primitiveMode: number = WebGL2RenderingContext.POINTS): void {
    if (!this.config.enabled) return;

    this.manager.beginTransformFeedback(this.tf, primitiveMode);
    // Draw call would go here (shader execution)
    this.manager.endTransformFeedback();
  }

  /**
   * Get the output buffer (for reading back if needed)
   */
  getOutputBuffer(): WebGLBuffer {
    return this.stateBuffer;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.manager.dispose();
  }
}

/**
 * GPU buffer pool for brain state management
 *
 * Manages double-buffered GPU memory for brain states to enable
 * ping-pong between read and write buffers.
 */
export class GPUBufferPool {
  private readonly gl: WebGL2RenderingContext;
  private readonly buffers: WebGLBuffer[] = [];
  private currentIndex = 0;

  constructor(renderer: THREE.WebGLRenderer, size: number, count: number = 2) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl) {
      throw new Error('WebGL2 context required for GPU buffer pool');
    }
    this.gl = gl;

    // Create double-buffered buffers
    const bufferCount = Math.max(1, count);
    for (let i = 0; i < bufferCount; i++) {
      const buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error('Failed to create GPU buffer');
      }
      gl.bindBuffer(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, buffer);
      gl.bufferData(
        WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER,
        size,
        WebGL2RenderingContext.DYNAMIC_COPY,
      );
      gl.bindBuffer(WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER, null);
      this.buffers.push(buffer);
    }
  }

  /**
   * Get current read buffer
   */
  getReadBuffer(): WebGLBuffer {
    return this.bufferAt(this.currentIndex);
  }

  /**
   * Get current write buffer
   */
  getWriteBuffer(): WebGLBuffer {
    return this.bufferAt((this.currentIndex + 1) % this.buffers.length);
  }

  /**
   * Swap read/write buffers (ping-pong)
   */
  swap(): void {
    this.currentIndex = (this.currentIndex + 1) % this.buffers.length;
  }

  /**
   * Dispose of all buffers
   */
  dispose(): void {
    for (const buffer of this.buffers) {
      this.gl.deleteBuffer(buffer);
    }
    this.buffers.length = 0;
  }

  private bufferAt(index: number): WebGLBuffer {
    const buffer = this.buffers[index];
    if (!buffer) throw new Error('GPU buffer pool is empty');
    return buffer;
  }
}
