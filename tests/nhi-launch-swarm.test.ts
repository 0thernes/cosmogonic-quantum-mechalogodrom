/**
 * NHI launch toss + swarm birth rate seals — pure leaf + structural wiring.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { nhiLaunchVelocityFromLook, nhiMinionKickVelocity } from '../src/sim/nhi-launch';

describe('nhiLaunchVelocityFromLook (shipped pure leaf)', () => {
  test('forward look produces strong outward velocity with cone fan-out', () => {
    const a = nhiLaunchVelocityFromLook(0, 0, 1, 0.1, 0.2, 0.3, 0.4);
    const b = nhiLaunchVelocityFromLook(0, 0, 1, 0.9, 0.8, 0.7, 0.6);
    expect(Math.hypot(a.x, a.y, a.z)).toBeGreaterThan(5);
    expect(Math.hypot(b.x, b.y, b.z)).toBeGreaterThan(5);
    expect(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)).toBeGreaterThan(0.5);
    expect(a.z).toBeGreaterThan(Math.abs(a.x) * 0.4);
  });

  test('minion kick is multi-directional and non-zero', () => {
    const kicks = [0.05, 0.25, 0.5, 0.75, 0.95].map((u) =>
      nhiMinionKickVelocity(u, 1 - u, u * 0.5),
    );
    for (const k of kicks) {
      expect(Math.hypot(k.x, k.y, k.z)).toBeGreaterThan(1.5);
    }
    expect(new Set(kicks.map((k) => Math.sign(k.x || 0.001))).size).toBeGreaterThan(1);
  });
});

describe('NHI world wiring seals', () => {
  test('world uses pure leaf + grace + swarm caps + long minion life', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    expect(src.includes('nhiLaunchVelocityFromLook')).toBe(true);
    expect(src.includes('nhiMinionKickVelocity')).toBe(true);
    expect(src.includes('NHI_SWARM_MAX_PER_ACTION = 1')).toBe(true);
    expect(src.includes('NHI_MINION_LIVE_CAP')).toBe(true);
    expect(src.includes('nhiMinion = true')).toBe(true);
    expect(src.includes('NHI_MINION_LIFE_MIN = 27000')).toBe(true);
    expect(src.includes('NHI_LAUNCH_GRACE_FRAMES = 180')).toBe(true);
  });

  test('entities coast NHI during toss and block minion mitosis', () => {
    const src = readFileSync('src/sim/entities.ts', 'utf8');
    expect(src.includes('nhiTossFrames')).toBe(true);
    expect(src.includes('0.999')).toBe(true);
    expect(src.includes('!u.nhiMinion')).toBe(true);
  });

  test('mind SPAWN_SWARM request is at most 1 child', () => {
    const src = readFileSync('src/sim/nhi.ts', 'utf8');
    expect(src.includes('Math.min(1, Math.round')).toBe(true);
  });
});
