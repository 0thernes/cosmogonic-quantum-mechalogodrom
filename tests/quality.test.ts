/**
 * Quality tier ladder tests (CONTRACTS V3.1): pure tier resolution and the
 * documented budget table. `detectQuality` itself is browser-only; the ladder
 * and resolver carry all the logic and are DOM-free.
 */
import { describe, expect, test } from 'bun:test';
import { QUALITY_LADDER, resolveTier } from '../src/core/quality';

describe('resolveTier', () => {
  test('mobile always wins regardless of cores/memory', () => {
    expect(resolveTier(true, 32, 64)).toBe('phone');
    expect(resolveTier(true, 4, 4)).toBe('phone');
  });

  test('V123 capability ladder: mega ≥16c+≥8GB, ultra ≥16c, desktop ≥10c, laptop ≥8c, tablet below', () => {
    expect(resolveTier(false, 16, 8)).toBe('mega');
    expect(resolveTier(false, 24, 32)).toBe('mega');
    expect(resolveTier(false, 16, 4)).toBe('ultra'); // 16 cores but memory-starved: the 25k rung
    expect(resolveTier(false, 12, 16)).toBe('desktop');
    expect(resolveTier(false, 10, 8)).toBe('desktop');
    expect(resolveTier(false, 8, 16)).toBe('laptop');
    expect(resolveTier(false, 6, 8)).toBe('tablet');
    expect(resolveTier(false, 4, 8)).toBe('tablet');
  });
});

describe('QUALITY_LADDER', () => {
  test('V123 entity budgets: 1k · 2k · 5k · 10k · 25k · 50k (USER #6)', () => {
    expect(QUALITY_LADDER.phone.maxEntities).toBe(1000);
    expect(QUALITY_LADDER.tablet.maxEntities).toBe(2000);
    expect(QUALITY_LADDER.laptop.maxEntities).toBe(5000);
    expect(QUALITY_LADDER.desktop.maxEntities).toBe(10000);
    expect(QUALITY_LADDER.ultra.maxEntities).toBe(25000);
    expect(QUALITY_LADDER.mega.maxEntities).toBe(50000);
  });

  test('every tier keeps full render fidelity', () => {
    for (const t of ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const) {
      expect(QUALITY_LADDER[t].instanced).toBeTrue();
      expect(QUALITY_LADDER[t].shadows).toBeTrue();
      expect(QUALITY_LADDER[t].dprCap).toBe(Number.POSITIVE_INFINITY);
      expect(QUALITY_LADDER[t].simRate).toBe(60);
    }
  });

  test('targetEntities === maxEntities on EVERY tier (the contested 0.5.0 contract fix)', () => {
    for (const tier of ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const) {
      expect(QUALITY_LADDER[tier].targetEntities).toBe(QUALITY_LADDER[tier].maxEntities);
    }
  });

  test('maxLinks scales 4× with maxEntities on every tier (population-proportional neural web)', () => {
    for (const tier of ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const) {
      expect(QUALITY_LADDER[tier].maxLinks).toBe(QUALITY_LADDER[tier].maxEntities * 4);
    }
  });

  test('ambience + entity budgets are monotone up the six-rung ladder', () => {
    const tiers = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const;
    for (let i = 1; i < tiers.length; i++) {
      const lo = QUALITY_LADDER[tiers[i - 1]!];
      const hi = QUALITY_LADDER[tiers[i]!];
      expect(hi.maxEntities).toBeGreaterThan(lo.maxEntities);
      expect(hi.quantumCount).toBeGreaterThanOrEqual(lo.quantumCount);
      expect(hi.maxLinks).toBeGreaterThanOrEqual(lo.maxLinks);
      expect(hi.starCount).toBeGreaterThanOrEqual(lo.starCount);
    }
  });

  test('mega is the 50k ceiling AND the auto top capability tier (V55 restored)', () => {
    expect(QUALITY_LADDER.mega.maxEntities).toBe(50000);
    expect(QUALITY_LADDER.mega.targetEntities).toBe(QUALITY_LADDER.mega.maxEntities);
    expect(QUALITY_LADDER.mega.instanced).toBeTrue();
    expect(QUALITY_LADDER.mega.maxEntities).toBeGreaterThan(QUALITY_LADDER.ultra.maxEntities);
    expect(resolveTier(false, 64, 64)).toBe('mega');
    expect(resolveTier(false, 128, 256)).toBe('mega');
    // …but mobile never gets it, and memory-starved drops off mega.
    expect(resolveTier(true, 64, 64)).toBe('phone');
    expect(resolveTier(false, 16, 4)).not.toBe('mega');
  });
});
