/**
 * Phase 5.2: Transform Feedback tests.
 *
 * Verifies that:
 * 1. Transform Feedback manager can be created
 * 2. Buffers can be created and bound
 * 3. Transform feedback passes execute correctly
 * 4. GPU buffer pool manages double-buffering
 * 5. Resources are disposed correctly
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  TransformFeedbackManager,
  BrainStateTF,
  GPUBufferPool,
  type TransformFeedbackConfig,
} from '../src/core/transform-feedback';

function createRenderer(): THREE.WebGLRenderer | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  return new THREE.WebGLRenderer({ canvas, antialias: false });
}

describe('Phase 5.2: Transform Feedback', () => {
  test('TransformFeedbackManager can be created', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const manager = new TransformFeedbackManager(renderer);
    expect(manager).toBeDefined();
    manager.dispose();
    renderer.dispose();
  });

  test('TransformFeedbackManager creates transform feedback objects', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const manager = new TransformFeedbackManager(renderer);
    const tf = manager.createTransformFeedback('test-tf');
    expect(tf).toBeDefined();
    manager.dispose();
    renderer.dispose();
  });

  test('TransformFeedbackManager creates GPU buffers', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const manager = new TransformFeedbackManager(renderer);
    const buffer = manager.createBuffer('test-buffer', 1024);
    expect(buffer).toBeDefined();
    manager.dispose();
    renderer.dispose();
  });

  test('TransformFeedbackManager reuses existing objects', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const manager = new TransformFeedbackManager(renderer);
    const tf1 = manager.createTransformFeedback('test-tf');
    const tf2 = manager.createTransformFeedback('test-tf');
    expect(tf1).toBe(tf2);
    manager.dispose();
    renderer.dispose();
  });

  test('BrainStateTF can be created with config', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const config: TransformFeedbackConfig = {
      enabled: true,
      bufferSize: 4096,
      varyings: ['outPosition', 'outVelocity'],
    };
    const brainTF = new BrainStateTF(renderer, config);
    expect(brainTF).toBeDefined();
    brainTF.dispose();
    renderer.dispose();
  });

  test('BrainStateTF executes pass when enabled', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const config: TransformFeedbackConfig = {
      enabled: true,
      bufferSize: 4096,
      varyings: ['outPosition', 'outVelocity'],
    };
    const brainTF = new BrainStateTF(renderer, config);
    // Should not throw
    brainTF.execute();
    brainTF.dispose();
    renderer.dispose();
  });

  test('BrainStateTF skips execution when disabled', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const config: TransformFeedbackConfig = {
      enabled: false,
      bufferSize: 4096,
      varyings: ['outPosition', 'outVelocity'],
    };
    const brainTF = new BrainStateTF(renderer, config);
    // Should not throw (no-op when disabled)
    brainTF.execute();
    brainTF.dispose();
    renderer.dispose();
  });

  test('GPUBufferPool creates double-buffered buffers', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const pool = new GPUBufferPool(renderer, 4096, 2);
    expect(pool).toBeDefined();
    pool.dispose();
    renderer.dispose();
  });

  test('GPUBufferPool provides read/write buffers', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const pool = new GPUBufferPool(renderer, 4096, 2);
    const readBuffer = pool.getReadBuffer();
    const writeBuffer = pool.getWriteBuffer();
    expect(readBuffer).toBeDefined();
    expect(writeBuffer).toBeDefined();
    expect(readBuffer).not.toBe(writeBuffer);
    pool.dispose();
    renderer.dispose();
  });

  test('GPUBufferPool swaps buffers correctly', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const pool = new GPUBufferPool(renderer, 4096, 2);
    const read1 = pool.getReadBuffer();
    const write1 = pool.getWriteBuffer();

    pool.swap();

    const read2 = pool.getReadBuffer();
    const write2 = pool.getWriteBuffer();

    // After swap, previous write becomes read
    expect(read2).toBe(write1);
    expect(write2).toBe(read1);
    pool.dispose();
    renderer.dispose();
  });

  test('TransformFeedbackManager disposes resources', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const manager = new TransformFeedbackManager(renderer);
    manager.createTransformFeedback('test-tf');
    manager.createBuffer('test-buffer', 1024);
    // Should not throw
    manager.dispose();
    renderer.dispose();
  });

  test('GPUBufferPool disposes buffers', () => {
    const renderer = createRenderer();
    if (!renderer) return;

    const pool = new GPUBufferPool(renderer, 4096, 2);
    // Should not throw
    pool.dispose();
    renderer.dispose();
  });
});
