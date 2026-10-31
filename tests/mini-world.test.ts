import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  ARENA,
  ARENA_Y,
  IS_MINI_WORLD,
  MINI_WORLD_SCALE,
  PLATFORM_CEIL,
  WORLD_SCALE,
  scaleCount,
  worldScaleFromSearch,
} from '../src/sim/constants';
import { QUALITY_LADDER, miniWorldProfile } from '../src/core/quality';

describe('Mini World — one central world-scale factor', () => {
  test('the URL flag selects 0.1; anything else (and tests) is exactly 1', () => {
    expect(MINI_WORLD_SCALE).toBe(0.1);
    expect(worldScaleFromSearch('?world=mini')).toBe(0.1);
    expect(worldScaleFromSearch('?tier=mega&world=mini')).toBe(0.1);
    expect(worldScaleFromSearch('?world=minix')).toBe(1);
    expect(worldScaleFromSearch('')).toBe(1);
    expect(WORLD_SCALE).toBe(1);
    expect(IS_MINI_WORLD).toBe(false);
  });
  test('main world dimensions are unchanged (goldens)', () => {
    expect(ARENA).toBe(5);
    expect(ARENA_Y).toBe(2);
    expect(PLATFORM_CEIL).toBe(720);
    expect(scaleCount(60_000)).toBe(60_000);
  });
  test('Mini World profile: caps / 10, every fidelity knob at max', () => {
    const p = miniWorldProfile(null as never);
    const top = QUALITY_LADDER.mega;
    expect(p.tier).toBe('mega');
    expect(p.dprCap).toBe(Number.POSITIVE_INFINITY);
    expect(p.shadows).toBe(true);
    expect(p.instanced).toBe(true);
    expect(p.simRate).toBe(60);
    expect(p.isMobile).toBe(false);
    // scaleCount is identity under test; the profile shape uses it, so assert via the pure factor.
    expect(p.maxEntities).toBe(scaleCount(top.maxEntities));
    expect(Math.round(top.maxEntities * MINI_WORLD_SCALE)).toBe(5000);
  });
});

describe('Mini World — structures scale through WORLD_SCALE (audit)', () => {
  const read = (f: string): string => readFileSync(f, 'utf8');
  test.each([
    ['src/sim/mechalogodrom.ts', /DIAMETER_SCALE = HABITAT_XZ_SCALE \* WORLD_SCALE/],
    ['src/sim/mechalogodrom.ts', /ALTITUDE = 252 \* HABITAT_Y_SCALE \* WORLD_SCALE/],
    ['src/sim/mechalogodrom.ts', /MECHA_SATELLITE_COUNT = scaleCount\(400\)/],
    ['src/sim/titans.ts', /TITAN_COUNT = scaleCount\(20\)/],
    ['src/sim/titans.ts', /COLOSSAL = 3 \* WORLD_SCALE/],
    ['src/sim/abomination-architecture.ts', /ARCH_COUNT = scaleCount\(72\)/],
    ['src/sim/cosmic-web.ts', /RADIUS = 680 \* WORLD_SCALE/],
    ['src/sim/shoggoths.ts', /SHOG_COUNT_DESKTOP = scaleCount\(100\)/],
    ['src/sim/puppet-masters.ts', /PUPPET_COUNT_DESKTOP = scaleCount\(100\)/],
    ['src/sim/super-wingmen.ts', /WINGMAN_COUNT = scaleCount\(100\)/],
  ])('%s routes through the central factor', (file, re) => {
    expect(read(file)).toMatch(re);
  });
  test('god-colossus (Mandelbrot deity) is sized purely from ARENA_RADIUS (already ×WORLD_SCALE)', () => {
    const src = read('src/sim/god-colossus.ts');
    expect(src).toContain('const half = ARENA_RADIUS * 0.82;');
  });
});
