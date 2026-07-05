/**
 * detectQuality() — the boot-time device→tier resolver in core/quality.ts. resolveTier (the pure
 * core) is covered in quality.test.ts, but detectQuality's DOM plumbing — the `?tier=` dev/QA
 * override (early return, all five rungs) and the isMobile derivation from matchMedia + viewport —
 * had no coverage. A wrong tier here means a crash or wrong perf budget at boot, so it is worth
 * pinning. `window` is stubbed on globalThis and restored each case.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { detectQuality, QUALITY_LADDER } from '../src/core/quality';
import type { QualityTier } from '../src/types';

const hadWindow = 'window' in globalThis;
const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (hadWindow) (globalThis as { window?: unknown }).window = originalWindow;
  else delete (globalThis as { window?: unknown }).window;
});

/** Install a minimal `window` shaped exactly as detectQuality reads it. */
function stubWindow(opts: {
  search?: string;
  hoverNone?: boolean;
  w?: number;
  h?: number;
  cores?: number;
  memGB?: number;
}): void {
  (globalThis as { window?: unknown }).window = {
    location: { search: opts.search ?? '' },
    matchMedia: () => ({ matches: opts.hoverNone ?? false }),
    innerWidth: opts.w ?? 1920,
    innerHeight: opts.h ?? 1080,
    navigator: {
      hardwareConcurrency: opts.cores ?? 12,
      deviceMemory: opts.memGB ?? 16,
    },
  };
}

describe('detectQuality — ?tier= dev/QA override', () => {
  test('each forced tier returns its ladder rung verbatim (early return, no probing)', async () => {
    const tiers: QualityTier[] = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'];
    for (const t of tiers) {
      stubWindow({ search: `?tier=${t}`, hoverNone: false, w: 1920 });
      const p = await detectQuality();
      expect(p.tier).toBe(t);
      expect(p.isMobile).toBe(t === 'phone'); // only the forced phone tier reports mobile
      expect(p.maxEntities).toBe(QUALITY_LADDER[t].maxEntities);
    }
  });

  test('V123 ladder: the six rungs climb 1k → 2k → 5k → 10k → 25k → 50k (USER #6)', () => {
    expect(QUALITY_LADDER.phone.maxEntities).toBe(1000);
    expect(QUALITY_LADDER.tablet.maxEntities).toBe(2000);
    expect(QUALITY_LADDER.laptop.maxEntities).toBe(5000);
    expect(QUALITY_LADDER.desktop.maxEntities).toBe(10000);
    expect(QUALITY_LADDER.ultra.maxEntities).toBe(25000);
    expect(QUALITY_LADDER.mega.maxEntities).toBe(50000);
    // Every rung fills its ceiling and keeps the full-fidelity instanced render path.
    for (const t of ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const) {
      expect(QUALITY_LADDER[t].instanced).toBe(true);
      expect(QUALITY_LADDER[t].targetEntities).toBe(QUALITY_LADDER[t].maxEntities);
    }
  });

  test('an unrecognized ?tier value falls through to capability detection', async () => {
    stubWindow({
      search: '?tier=bananas',
      hoverNone: false,
      w: 1920,
      h: 1080,
      cores: 12,
      memGB: 16,
    });
    const p = await detectQuality();
    expect(p.tier).toBe('desktop');
    expect(p.maxEntities).toBe(QUALITY_LADDER.desktop.maxEntities);
    expect(p.isMobile).toBe(false);
  });
});

describe('detectQuality — capability boot without fidelity downgrade', () => {
  test('a desktop (hover-capable, large viewport) boots its capability rung', async () => {
    stubWindow({ hoverNone: false, w: 1920, h: 1080, cores: 12, memGB: 16 });
    const p = await detectQuality();
    expect(p.tier).toBe('desktop');
    expect(p.isMobile).toBe(false);
  });

  test('a touch-first pointer boots phone AND reports mobile without visual-quality shedding', async () => {
    stubWindow({ hoverNone: true, w: 1920, h: 1080, cores: 32, memGB: 64 });
    const p = await detectQuality();
    expect(p.isMobile).toBe(true);
    expect(p.tier).toBe('phone');
    expect(p.dprCap).toBe(Number.POSITIVE_INFINITY);
    expect(p.shadows).toBe(true);
    expect(p.instanced).toBe(true);
    expect(p.simRate).toBe(60);
  });

  test('a sub-600px viewport reports mobile', async () => {
    for (const dim of [
      { w: 500, h: 1080 },
      { w: 1080, h: 500 },
    ]) {
      stubWindow({ hoverNone: false, ...dim });
      expect((await detectQuality()).isMobile).toBe(true);
    }
  });
});
