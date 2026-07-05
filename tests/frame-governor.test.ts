/**
 * RENDER-SIDE FRAME MONITOR — pure decision-logic tests.
 *
 * Hard owner contract: frame monitoring may expose FPS, but it must never shed DPR, post-FX,
 * shadows, color, detail or sim cadence. If performance is poor, fix the real bottleneck.
 */
import { describe, expect, test } from 'bun:test';
import {
  decideLevel,
  initialState,
  planForLevel,
  deriveMaxLevel,
  DEFAULT_CONFIG,
  Level,
} from '../src/core/frame-governor';

const arr = (n: number, v: number): number[] => Array.from({ length: n }, () => v);
function run(samplesMs: number[], state = initialState(), maxLevel: Level = Level.SHADOWS_OFF) {
  for (const ms of samplesMs) state = decideLevel(state, ms, DEFAULT_CONFIG, maxLevel);
  return state;
}

describe('frame governor — monitor-only quality lock', () => {
  test('sustained slow frames never shed quality', () => {
    const s = run(arr(200, 50)); // 50ms/frame >> shedMs(33)
    expect(s.level).toBe(Level.FULL);
    expect(s.ema).toBeGreaterThan(33);
  });

  test('the shed cap is locked to FULL for every boot tier', () => {
    const s = run(arr(300, 200), initialState(), deriveMaxLevel(false));
    expect(s.level).toBe(Level.FULL);
    expect(deriveMaxLevel(false)).toBe(Level.FULL);
    expect(deriveMaxLevel(true)).toBe(Level.FULL);
  });

  test('sustained fast frames keep quality full', () => {
    const hot = run(arr(300, 200));
    expect(hot.level).toBe(Level.FULL);
    const cool = run(arr(2000, 8), hot);
    expect(cool.level).toBe(Level.FULL);
  });

  test('a single panic frame does not shed', () => {
    const warm = run(arr(10, 16)); // settled at FULL
    const panic = decideLevel(warm, 350, DEFAULT_CONFIG); // >= panicMs(320), < tabGapMs(1000)
    expect(panic.level).toBe(Level.FULL);
  });

  test('a tab-switch gap is ignored — no shed, dwell reset', () => {
    const warm = run(arr(40, 50)); // building shed dwell
    const gap = decideLevel(warm, 5000, DEFAULT_CONFIG); // >= tabGapMs(1000)
    expect(gap.level).toBe(warm.level);
    expect(gap.dwell).toBe(0);
  });

  test('the decision is pure/deterministic — same samples, same state', () => {
    expect(run(arr(120, 40))).toEqual(run(arr(120, 40)));
  });

  test('planForLevel keeps full visual settings for every nominal level', () => {
    expect(planForLevel(Level.FULL, true)).toEqual({ dprScale: 1.0, fxOn: true, shadowsOn: true });
    expect(planForLevel(Level.DPR_85, true)).toEqual({
      dprScale: 1.0,
      fxOn: true,
      shadowsOn: true,
    });
    expect(planForLevel(Level.DPR_65, true)).toEqual({
      dprScale: 1.0,
      fxOn: true,
      shadowsOn: true,
    });
    expect(planForLevel(Level.FX_OFF, true)).toEqual({
      dprScale: 1.0,
      fxOn: true,
      shadowsOn: true,
    });
    expect(planForLevel(Level.SHADOWS_OFF, true)).toEqual({
      dprScale: 1.0,
      fxOn: true,
      shadowsOn: true,
    });
  });
});
