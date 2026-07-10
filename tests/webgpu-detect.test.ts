import { afterEach, describe, expect, test } from 'bun:test';
import { detectWebGpu } from '../src/core/webgpu-detect';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function installNavigator(value: unknown): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete (globalThis as { navigator?: Navigator }).navigator;
});

describe('detectWebGpu — optional adapter fallback', () => {
  test('returns promptly when requestAdapter never settles', async () => {
    installNavigator({
      gpu: {
        requestAdapter: () => new Promise<GPUAdapter | null>(() => {}),
      },
    });

    const result = await detectWebGpu(5);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('timed out after 5 ms');
  });

  test('reports an absent adapter without waiting for the timeout', async () => {
    installNavigator({ gpu: { requestAdapter: async () => null } });
    const result = await detectWebGpu(100);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('No WebGPU adapter');
  });

  test('accepts a resolved adapter', async () => {
    installNavigator({ gpu: { requestAdapter: async () => ({}) as GPUAdapter } });
    await expect(detectWebGpu(100)).resolves.toMatchObject({ available: true });
  });
});
