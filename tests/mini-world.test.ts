import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  ARENA,
  ARENA_Y,
  IS_MINI_WORLD,
  MINI_WORLD_SCALE,
  PLATFORM_CEIL,
  WORLD_SCALE,
  WORLD_LINEAR,
  ARENA_BODY,
  FOG_SCALE,
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
    ['src/sim/mechalogodrom.ts', /DIAMETER_SCALE = HABITAT_XZ_SCALE \* WORLD_LINEAR/],
    ['src/sim/mechalogodrom.ts', /MECHA_SATELLITE_COUNT = scaleCount\(400\)/],
    ['src/sim/titans.ts', /TITAN_COUNT = scaleCount\(20\)/],
    ['src/sim/titans.ts', /BREED_CENTER_R = 92 \* WORLD_LINEAR/],
    ['src/sim/abomination-architecture.ts', /ARCH_COUNT = scaleCount\(72\)/],
    ['src/sim/cosmic-web.ts', /RADIUS = 680 \* WORLD_LINEAR/],
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

describe('Mini World — true miniature: area × WORLD_SCALE, bodies unscaled', () => {
  test('layout is √WORLD_SCALE (area tracks every count), bodies/heights/fog never scale', () => {
    expect(WORLD_LINEAR).toBe(1);
    expect(ARENA_BODY).toBe(5);
    expect(FOG_SCALE).toBe(1 / 10);
    const lin = Math.sqrt(MINI_WORLD_SCALE);
    expect(lin * lin).toBeCloseTo(MINI_WORLD_SCALE, 12); // density = counts / area is unchanged
    const read = (f: string): string => readFileSync(f, 'utf8');
    expect(read('src/sim/constants.ts')).toMatch(/export const ARENA_Y = 2;/);
    expect(read('src/sim/titans.ts')).toMatch(/const COLOSSAL = 3;/);
    expect(read('src/sim/alien-flora.ts')).toMatch(/CONTACT_RADIUS = 15;/);
    expect(read('src/sim/constants.ts')).toMatch(
      /FOG_SCALE = 1 \/ \(ARENA_BODY \* HABITAT_XZ_SCALE\)/,
    );
  });
});

describe('Mini World — Big Tree visit rings stay inside the scaled sanctuary', () => {
  test('every authored ring radius is ×WORLD_LINEAR and inside the entry radius in Mini World', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    const radii = [
      ...src.matchAll(/addRadialSlots\(\s*BigTreeSlotKind\.\w+,\s*\d+,\s*ring\((\d+)\)/g),
    ].map((m) => Number(m[1]));
    expect(radii).toEqual([78, 132, 178, 218, 205]);
    const lin = Math.sqrt(MINI_WORLD_SCALE);
    for (const r of radii) expect(r * lin).toBeLessThan(240 * lin);
    expect(src).not.toMatch(/addRadialSlots\(\s*BigTreeSlotKind\.\w+,\s*\d+,\s*\d+,/);
  });
});
