/**
 * Post-FX full-fidelity contract (V-GOV × V60). The frame monitor must never suspend the composer:
 * no DPR/post-FX/shadow shed is allowed as an optimization. The low-level `postFxShouldRender()`
 * helper still documents engine behavior if a caller explicitly suspends FX, but the governor plans
 * must keep FX on at every nominal level.
 */
import { describe, expect, test } from 'bun:test';
import { postFxShouldRender } from '../src/core/engine';
import { planForLevel, Level } from '../src/core/frame-governor';

describe('post-FX stays full-fidelity under the frame monitor', () => {
  test('postFxShouldRender truth table: render iff (not governor-suspended) OR (lens active)', () => {
    expect(postFxShouldRender(false, false)).toBe(true); // not suspended, idle → normal post-FX
    expect(postFxShouldRender(false, true)).toBe(true); // not suspended, lens up → post-FX
    expect(postFxShouldRender(true, true)).toBe(true); // SUSPENDED but a singularity lens is active → STILL renders (THE FIX)
    expect(postFxShouldRender(true, false)).toBe(false); // suspended, idle → composer fully skipped (governor's GPU relief intact)
  });

  test('governor plans never suspend post-FX, even at nominal shed levels', () => {
    for (const level of [Level.FULL, Level.DPR_85, Level.DPR_65, Level.FX_OFF, Level.SHADOWS_OFF]) {
      const plan = planForLevel(level, true);
      expect(plan.fxOn).toBe(true);
      expect(postFxShouldRender(!plan.fxOn, false)).toBe(true);
      expect(postFxShouldRender(!plan.fxOn, true)).toBe(true);
    }
  });
});
