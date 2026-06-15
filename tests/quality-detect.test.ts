/**
 * detectQuality() — the boot-time device→tier resolver in core/quality.ts. resolveTier (the pure
 * core) is covered in quality.test.ts, but detectQuality's DOM plumbing — the `?tier=` dev/QA
 * override (early return, all five rungs) and the isMobile derivation from matchMedia + viewport —
 * had no coverage. A wrong tier here means a crash or wrong perf budget at boot, so it is worth
 * pinning. `window` is stubbed on globalThis (navigator stays bun's real one) and restored each case.
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
function stubWindow(opts: { search?: string; hoverNone?: boolean; w?: number; h?: number }): void {
  (globalThis as { window?: unknown }).window = {
    location: { search: opts.search ?? '' },
    matchMedia: () => ({ matches: opts.hoverNone ?? false }),
    innerWidth: opts.w ?? 1920,
    innerHeight: opts.h ?? 1080,
  };
}

describe('detectQuality — ?tier= dev/QA override', () => {
  test('each forced tier returns its ladder rung verbatim (early return, no probing)', () => {
    const tiers: QualityTier[] = ['phone', 'laptop', 'desktop', 'ultra', 'mega'];
    for (const t of tiers) {
      stubWindow({ search: `?tier=${t}`, hoverNone: false, w: 1920 });
      const p = detectQuality();
      expect(p.tier).toBe(t);
      expect(p.isMobile).toBe(t === 'phone'); // only the forced phone tier reports mobile
      expect(p.maxEntities).toBe(QUALITY_LADDER[t].maxEntities);
    }
  });

  test('an unrecognized ?tier value falls through to auto-detect (no crash, valid profile)', () => {
    stubWindow({ search: '?tier=bananas', hoverNone: false, w: 1920, h: 1080 });
    const p = detectQuality();
    expect(['phone', 'laptop', 'desktop', 'ultra', 'mega']).toContain(p.tier);
    // Self-consistent: the spread came from this tier's own ladder rung.
    expect(p.maxEntities).toBe(QUALITY_LADDER[p.tier].maxEntities);
    expect(p.isMobile).toBe(false); // hover-capable, large viewport ⇒ not mobile
  });
});

describe('detectQuality — auto-detect isMobile derivation', () => {
  test('a touch-first pointer (hover:none / pointer:coarse) forces the phone tier', () => {
    stubWindow({ hoverNone: true, w: 1920, h: 1080 }); // big screen, but touch ⇒ battery-honest
    const p = detectQuality();
    expect(p.isMobile).toBe(true);
    expect(p.tier).toBe('phone');
  });

  test('a sub-600px viewport in either dimension forces the phone tier', () => {
    for (const dim of [
      { w: 500, h: 1080 },
      { w: 1080, h: 500 },
    ]) {
      stubWindow({ hoverNone: false, ...dim });
      const p = detectQuality();
      expect(p.isMobile).toBe(true);
      expect(p.tier).toBe('phone');
    }
  });

  test('a hover-capable large viewport is never mobile', () => {
    stubWindow({ hoverNone: false, w: 1440, h: 900 });
    expect(detectQuality().isMobile).toBe(false);
  });
});
