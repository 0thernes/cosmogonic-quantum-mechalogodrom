/**
 * Phase 2.1: Graphics Abstraction Layer tests.
 *
 * Verifies that:
 * 1. Capability detection works correctly
 * 2. WebGL2 context can be created (when DOM available)
 * 3. Quality-tier-specific backend selection works
 * 4. Context disposal works correctly
 *
 * Note: Context creation tests require DOM environment and are skipped in headless mode.
 */
import { describe, expect, test } from 'bun:test';
import {
  GraphicsBackend,
  detectGraphicsCapabilities,
  createGraphicsContext,
} from '../src/core/graphics-abstraction';

describe('Phase 2.1: Graphics Abstraction Layer', () => {
  test('detectGraphicsCapabilities returns WebGL2 backend', () => {
    const capabilities = detectGraphicsCapabilities();
    expect(capabilities.backend).toBe(GraphicsBackend.WebGL2);
  });

  test('detectGraphicsCapabilities reports correct WebGL2 capabilities', () => {
    const capabilities = detectGraphicsCapabilities();
    expect(capabilities.computeShaders).toBe(false);
    expect(capabilities.transformFeedback).toBe(true);
    expect(capabilities.maxTextureSize).toBeGreaterThan(0);
    expect(capabilities.maxUniformBufferBindings).toBeGreaterThan(0);
    expect(capabilities.timestampQuery).toBe(false);
  });

  test('createGraphicsContext creates WebGL2 context for all quality tiers', () => {
    // Skip in headless environment (no DOM)
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    const tiers = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const;

    for (const tier of tiers) {
      const context = createGraphicsContext(canvas, tier);
      expect(context.backend).toBe(GraphicsBackend.WebGL2);
      expect(context.renderer).toBeDefined();
      context.dispose();
    }
  });

  test('createGraphicsContext respects preferred backend when WebGL2', () => {
    // Skip in headless environment (no DOM)
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    const context = createGraphicsContext(canvas, 'desktop', GraphicsBackend.WebGL2);
    expect(context.backend).toBe(GraphicsBackend.WebGL2);
    context.dispose();
  });

  test('GraphicsContext dispose cleans up renderer', () => {
    // Skip in headless environment (no DOM)
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    const context = createGraphicsContext(canvas, 'desktop');
    expect(context.renderer).toBeDefined();

    // Should not throw
    context.dispose();
  });

  test('GraphicsContext exposes capabilities', () => {
    // Skip in headless environment (no DOM)
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    const context = createGraphicsContext(canvas, 'desktop');
    expect(context.capabilities).toBeDefined();
    expect(context.capabilities.backend).toBe(GraphicsBackend.WebGL2);
    context.dispose();
  });
});
