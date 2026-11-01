/**
 * Mini World keeps the full world's shape: its vertical column shrinks by the same √0.1 as its layout,
 * so width:height matches the full world (2160:714). Runs in a child process because WORLD_SCALE is
 * fixed at module load from `location.search`.
 */
import { describe, expect, test } from 'bun:test';
import * as full from '../src/sim/constants';
import { BIOME_STRATA } from '../src/sim/biome-strata';

const PROBE = `
globalThis.location = { search: '?world=mini' };
const c = await import('./src/sim/constants.ts');
const s = await import('./src/sim/biome-strata.ts');
console.log(JSON.stringify({ half: c.PLATFORM_HALF, floor: c.PLATFORM_FLOOR, ceil: c.PLATFORM_CEIL,
  h: c.PLATFORM_HEIGHT, ys: c.HABITAT_Y_SCALE, strata: s.BIOME_STRATA.map((b) => [b.yMin, b.yMax, b.yCenter]) }));
`;

describe('Mini World shape', () => {
  test('full world column is unchanged', () => {
    expect(full.PLATFORM_CEIL).toBe(720);
    expect(full.HABITAT_Y_SCALE).toBe(3);
    expect(BIOME_STRATA[4]!.yMax).toBe(720);
  });

  test('mini column shrinks with the layout so width:height matches the full world', () => {
    const r = Bun.spawnSync([process.execPath, '-e', PROBE], { cwd: process.cwd() });
    expect(r.exitCode).toBe(0);
    const m = JSON.parse(r.stdout.toString().trim().split('\n').pop()!);
    const fullRatio = (2 * full.PLATFORM_HALF) / full.PLATFORM_HEIGHT;
    expect((2 * m.half) / m.h).toBeCloseTo(fullRatio, 9);
    expect(m.floor).toBe(6);
    expect(m.ceil).toBeCloseTo(6 + 714 * Math.sqrt(0.1), 9);
    expect(m.ys).toBeCloseTo(3 * Math.sqrt(0.1), 12);
    // Every stratum lies inside the new column and the top band ends at the ceiling.
    for (const [lo, hi, mid] of m.strata) {
      expect(lo).toBeGreaterThanOrEqual(m.floor);
      expect(hi).toBeLessThanOrEqual(m.ceil + 1e-9);
      expect(mid).toBeGreaterThan(lo);
      expect(mid).toBeLessThan(hi);
    }
    expect(m.strata[4][1]).toBeCloseTo(m.ceil, 9);
  }, 60_000);
});
