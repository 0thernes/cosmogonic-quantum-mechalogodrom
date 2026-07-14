import { describe, expect, test } from 'bun:test';
import {
  CHAOS_LEVELS,
  CHAOS_MAX,
  CHAOS_MIN,
  ENTROPY_MAX,
  ENTROPY_STEP,
  RENDER_MODES,
  RENDER_MODE_DYN,
  SPACE_FOVS,
  TIME_SCALES,
  TRACKING_VIEWS,
  VIEW_MODES,
} from '../src/sim/constants';

describe('F-RENDER-DYN — render-mode dynamics table', () => {
  test('covers every render mode exactly once', () => {
    const keys = Object.keys(RENDER_MODE_DYN);
    expect(new Set(keys).size).toBe(RENDER_MODES.length);
    for (const mode of RENDER_MODES) expect(RENDER_MODE_DYN[mode]).toBeDefined();
  });

  test('solid is the exact identity (default + every test runs solid → byte-identical)', () => {
    expect(RENDER_MODE_DYN.solid).toEqual({ speed: 1, vision: 1, social: 1, jitter: 1 });
  });

  test('every multiplier is finite, positive, and within a sane bounded range', () => {
    for (const mode of RENDER_MODES) {
      const d = RENDER_MODE_DYN[mode];
      for (const v of [d.speed, d.vision, d.social, d.jitter]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(2); // "slight" dynamics — never wild
        expect(v).toBeGreaterThanOrEqual(0.5);
      }
    }
  });
});

describe('F-CAM5 — motion camera views', () => {
  test('keeps the four legacy views first, then appends motion, reliquary, and Xenomimic views', () => {
    expect([...VIEW_MODES].slice(0, 4)).toEqual(['free', 'orbit', 'fly', 'top']);
    expect(VIEW_MODES.length).toBe(12);
    expect(new Set(VIEW_MODES).size).toBe(12);
    // F-RELIQUARY appends the macro specimen-plate view at the end (append-only: persisted viewIdx
    // must keep pointing at the same mode it always did).
    expect(VIEW_MODES[VIEW_MODES.length - 3]).toBe('specimen');
    expect(VIEW_MODES[VIEW_MODES.length - 2]).toBe('mimic');
    expect(VIEW_MODES[VIEW_MODES.length - 1]).toBe('tree');
    const views: readonly string[] = VIEW_MODES;
    for (const m of [
      'follow',
      'chase',
      'cinematic',
      'vortex',
      'titan',
      'specimen',
      'mimic',
      'tree',
    ]) {
      expect(views).toContain(m);
    }
  });

  test('every tracking view is a real view mode', () => {
    for (const v of TRACKING_VIEWS) expect(VIEW_MODES).toContain(v);
    // follow/chase/titan/mimic track a subject; the remaining automatic views use parametric paths.
    expect([...TRACKING_VIEWS].sort()).toEqual(['chase', 'follow', 'mimic', 'titan']);
  });
});

describe('F-TIME — time-dilation steps', () => {
  test('includes a true pause (0) and realtime (1)', () => {
    expect(TIME_SCALES).toContain(0);
    expect(TIME_SCALES).toContain(1);
  });

  test('preserves the legacy 0.2 and 3 scales (existing behaviour/tests unchanged)', () => {
    expect(TIME_SCALES).toContain(0.2);
    expect(TIME_SCALES).toContain(3);
  });

  test('is strictly ascending and all non-negative finite (no divide-by-zero hazard beyond pause)', () => {
    for (let i = 0; i < TIME_SCALES.length; i++) {
      const v = TIME_SCALES[i]!;
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(v).toBeGreaterThan(TIME_SCALES[i - 1]!);
    }
  });
});

describe('F-CHAOS-ENTROPY — chaos levels + entropy axis', () => {
  test('CHAOS_LEVELS is strictly ascending and spans the chaos clamp', () => {
    expect(CHAOS_LEVELS[0]).toBe(CHAOS_MIN);
    expect(CHAOS_LEVELS[CHAOS_LEVELS.length - 1]).toBe(CHAOS_MAX);
    for (let i = 1; i < CHAOS_LEVELS.length; i++) {
      expect(CHAOS_LEVELS[i]!).toBeGreaterThan(CHAOS_LEVELS[i - 1]!);
    }
  });

  test('every chaos level sits within the clamp', () => {
    for (const lv of CHAOS_LEVELS) {
      expect(lv).toBeGreaterThanOrEqual(CHAOS_MIN);
      expect(lv).toBeLessThanOrEqual(CHAOS_MAX);
    }
  });

  test('entropy axis: positive max, and the step takes several presses to fill (not a single jump)', () => {
    expect(ENTROPY_MAX).toBeGreaterThan(0);
    expect(ENTROPY_STEP).toBeGreaterThan(0);
    expect(ENTROPY_STEP).toBeLessThanOrEqual(ENTROPY_MAX);
    expect(Math.ceil(ENTROPY_MAX / ENTROPY_STEP)).toBeGreaterThanOrEqual(2);
  });
});

describe('F-SPACE — camera FOV dilation levels', () => {
  test('SPACE_FOVS are ascending, plausible FOV degrees, and include the 68 boot default', () => {
    expect(SPACE_FOVS).toContain(68);
    for (let i = 0; i < SPACE_FOVS.length; i++) {
      const f = SPACE_FOVS[i]!;
      expect(f).toBeGreaterThan(10);
      expect(f).toBeLessThan(170);
      if (i > 0) expect(f).toBeGreaterThan(SPACE_FOVS[i - 1]!);
    }
  });
});
