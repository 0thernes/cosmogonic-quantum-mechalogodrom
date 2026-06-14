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

  test('ultra requires ≥16 cores AND ≥8 GB', () => {
    expect(resolveTier(false, 16, 8)).toBe('ultra');
    expect(resolveTier(false, 24, 32)).toBe('ultra');
    expect(resolveTier(false, 16, 4)).toBe('desktop'); // memory-starved: drops one rung
  });

  test('desktop at ≥10 cores, laptop below', () => {
    expect(resolveTier(false, 12, 16)).toBe('desktop');
    expect(resolveTier(false, 10, 8)).toBe('desktop');
    expect(resolveTier(false, 8, 16)).toBe('laptop');
    expect(resolveTier(false, 4, 8)).toBe('laptop');
  });
});

describe('QUALITY_LADDER', () => {
  test('entity budgets follow the V3.1 mandate', () => {
    expect(QUALITY_LADDER.phone.maxEntities).toBe(650);
    expect(QUALITY_LADDER.laptop.maxEntities).toBe(2000);
    expect(QUALITY_LADDER.desktop.maxEntities).toBe(5000);
    expect(QUALITY_LADDER.ultra.maxEntities).toBe(10000);
  });

  test('only the phone tier keeps the per-mesh path', () => {
    expect(QUALITY_LADDER.phone.instanced).toBeFalse();
    expect(QUALITY_LADDER.laptop.instanced).toBeTrue();
    expect(QUALITY_LADDER.desktop.instanced).toBeTrue();
    expect(QUALITY_LADDER.ultra.instanced).toBeTrue();
  });

  test('targetEntities === maxEntities on EVERY tier (the contested 0.5.0 contract fix)', () => {
    // The ultra 6,500 adaptive throttle was retired in 0.5.0 on user feedback; this pin
    // guards the explicitly contested decision (audit: "the 0.5.0 contract fix is unguarded").
    for (const tier of ['phone', 'laptop', 'desktop', 'ultra'] as const) {
      expect(QUALITY_LADDER[tier].targetEntities).toBe(QUALITY_LADDER[tier].maxEntities);
    }
  });

  test('ambience budgets are monotone up the ladder', () => {
    const tiers = ['phone', 'laptop', 'desktop', 'ultra'] as const;
    for (let i = 1; i < tiers.length; i++) {
      const lo = QUALITY_LADDER[tiers[i - 1]!];
      const hi = QUALITY_LADDER[tiers[i]!];
      expect(hi.maxEntities).toBeGreaterThan(lo.maxEntities);
      expect(hi.quantumCount).toBeGreaterThan(lo.quantumCount);
      expect(hi.maxLinks).toBeGreaterThan(lo.maxLinks);
      expect(hi.starCount).toBeGreaterThan(lo.starCount);
    }
  });

  test('mega is the opt-in 50k ceiling — never auto-resolved (V38)', () => {
    expect(QUALITY_LADDER.mega.maxEntities).toBe(50000);
    expect(QUALITY_LADDER.mega.targetEntities).toBe(QUALITY_LADDER.mega.maxEntities);
    expect(QUALITY_LADDER.mega.instanced).toBeTrue();
    expect(QUALITY_LADDER.mega.maxEntities).toBeGreaterThan(QUALITY_LADDER.ultra.maxEntities);
    // resolveTier tops out at ultra — mega is reachable only via the `?tier=mega` boot override.
    expect(resolveTier(false, 64, 64)).not.toBe('mega');
    expect(resolveTier(false, 128, 256)).not.toBe('mega');
    expect(resolveTier(true, 64, 64)).not.toBe('mega');
  });
});
