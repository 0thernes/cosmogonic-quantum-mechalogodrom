/**
 * Runtime capability probe — SharedArrayBuffer gating, worker pool sizing, hardware tier mapping.
 */
import { describe, expect, test } from 'bun:test';
import {
  probeGraphicsApi,
  probeHardwareTier,
  probeRuntimeCapability,
  recommendedWorkerCount,
  sharedArrayBufferAvailable,
} from '../src/core/runtime-capability';
import { brainSlicesForTier } from '../src/sim/entity-brain';

describe('runtime capability — pure probes', () => {
  test('recommendedWorkerCount leaves one core for the main thread', () => {
    expect(recommendedWorkerCount(1)).toBe(1);
    expect(recommendedWorkerCount(4)).toBe(3);
    expect(recommendedWorkerCount(24)).toBe(23);
  });

  test('probeHardwareTier maps the six-rung ladder from cores/memory', () => {
    expect(probeHardwareTier(false, 4, 4)).toBe('tablet');
    expect(probeHardwareTier(false, 8, 8)).toBe('laptop');
    expect(probeHardwareTier(false, 12, 8)).toBe('desktop');
    expect(probeHardwareTier(false, 16, 4)).toBe('ultra'); // 16 cores but < 8 GB mem
    expect(probeHardwareTier(false, 16, 16)).toBe('mega');
    expect(probeHardwareTier(true, 32, 32)).toBe('phone');
  });

  test('probeRuntimeCapability returns a coherent snapshot', () => {
    const cap = probeRuntimeCapability({ isMobile: false, cores: 24, memGB: 16 });
    expect(cap.hardwareTier).toBe('mega');
    expect(cap.workerCount).toBe(23);
    expect(cap.graphicsApi).toBe(probeGraphicsApi());
    expect(cap.sharedArrayBuffer).toBe(sharedArrayBufferAvailable());
  });

  test('sharedArrayBufferAvailable is a boolean (headless may be true or false)', () => {
    expect(typeof sharedArrayBufferAvailable()).toBe('boolean');
  });
});

describe('brainSlicesForTier — tier-scaled cadence', () => {
  test('higher population tiers use deeper round-robin slices', () => {
    expect(brainSlicesForTier('phone')).toBe(8);
    expect(brainSlicesForTier('desktop')).toBe(10);
    expect(brainSlicesForTier('ultra')).toBe(12);
    expect(brainSlicesForTier('mega')).toBe(16);
  });
});
