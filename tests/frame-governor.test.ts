/**
 * RENDER-SIDE FRAME-TIME GOVERNOR — pure decision-logic tests.
 *
 * The governor watches wall-clock frame time and, when frames get dangerously slow, sheds render
 * quality (DPR → post-FX → shadows) so the GPU never gets a frame heavy enough to trip the driver
 * watchdog (the TDR black-screen freeze under apocalypse / CHAOS spam at 50k). It restores quality
 * when frames recover. The decision logic ({@link decideLevel}/{@link planForLevel}) is PURE — no
 * renderer, no DOM, no clock — so it is fully unit-testable headlessly. The engine-application side
 * (setPixelRatioScale / setPostFxSuspended / setShadowsEnabled) touches ONLY renderer settings and so
 * never perturbs the seeded, deterministic sim.
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

describe('frame governor — render-side load shedding (determinism-safe)', () => {
  test('sustained slow frames shed quality up to the max level', () => {
    const s = run(arr(200, 50)); // 50ms/frame >> shedMs(33)
    expect(s.level).toBe(Level.SHADOWS_OFF); // climbs to the cap (boot shadows allowed)
  });

  test('the shed cap respects boot shadows — a no-shadow tier caps at FX_OFF', () => {
    const s = run(arr(300, 200), initialState(), deriveMaxLevel(false));
    expect(s.level).toBe(Level.FX_OFF);
    expect(deriveMaxLevel(true)).toBe(Level.SHADOWS_OFF);
  });

  test('sustained fast frames restore quality back to full', () => {
    const hot = run(arr(300, 200)); // drive it to the cap
    expect(hot.level).toBe(Level.SHADOWS_OFF);
    const cool = run(arr(2000, 8), hot); // 8ms/frame << restoreMs(20)
    expect(cool.level).toBe(Level.FULL);
  });

  test('a single panic frame sheds immediately, no dwell wait', () => {
    const warm = run(arr(10, 16)); // settled at FULL
    const panic = decideLevel(warm, 350, DEFAULT_CONFIG); // >= panicMs(320), < tabGapMs(1000)
    expect(panic.level).toBe(Level.DPR_85);
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

  test('planForLevel maps levels to render settings correctly', () => {
    expect(planForLevel(Level.FULL, true)).toEqual({ dprScale: 1.0, fxOn: true, shadowsOn: true });
    expect(planForLevel(Level.FX_OFF, true).fxOn).toBe(false);
    expect(planForLevel(Level.SHADOWS_OFF, true).shadowsOn).toBe(false);
  });
});
