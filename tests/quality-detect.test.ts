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
    const tiers: QualityTier[] = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'];
    for (const t of tiers) {
      stubWindow({ search: `?tier=${t}`, hoverNone: false, w: 1920 });
      const p = detectQuality();
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
    // Every instanced rung fills its ceiling; only phone stays on the per-mesh path.
    expect(QUALITY_LADDER.phone.instanced).toBe(false);
    for (const t of ['tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const) {
      expect(QUALITY_LADDER[t].instanced).toBe(true);
      expect(QUALITY_LADDER[t].targetEntities).toBe(QUALITY_LADDER[t].maxEntities);
    }
  });

  test('an unrecognized ?tier value falls through to the phone boot default (fast first load)', () => {
    stubWindow({ search: '?tier=bananas', hoverNone: false, w: 1920, h: 1080 });
    const p = detectQuality();
    // V123 (USER #6): everyone boots phone for a fast first paint — the perf chip climbs the ladder.
    expect(p.tier).toBe('phone');
    expect(p.maxEntities).toBe(QUALITY_LADDER.phone.maxEntities);
    expect(p.isMobile).toBe(false); // hover-capable, large viewport ⇒ not mobile, but still boots phone
  });
});

describe('detectQuality — V123 boots phone for everyone (USER #6)', () => {
  test('a desktop (hover-capable, large viewport) still boots the phone rung', () => {
    stubWindow({ hoverNone: false, w: 1920, h: 1080 });
    const p = detectQuality();
    expect(p.tier).toBe('phone');
    expect(p.isMobile).toBe(false);
  });

  test('a touch-first pointer boots phone AND reports mobile', () => {
    stubWindow({ hoverNone: true, w: 1920, h: 1080 });
    const p = detectQuality();
    expect(p.isMobile).toBe(true);
    expect(p.tier).toBe('phone');
  });

  test('a sub-600px viewport reports mobile', () => {
    for (const dim of [
      { w: 500, h: 1080 },
      { w: 1080, h: 500 },
    ]) {
      stubWindow({ hoverNone: false, ...dim });
      expect(detectQuality().isMobile).toBe(true);
    }
  });
});
