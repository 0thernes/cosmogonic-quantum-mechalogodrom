/**
 * Lens-survives-the-shed contract (V-GOV × V60). The render-side frame governor sheds post-FX at
 * Level.FX_OFF under sustained slow frames — the heavy regime at 25k+ entities, where the ~60-120ms
 * ENTITY pipeline (not the now-O(k) singularity) dominates the frame and trips the governor. That
 * shed would otherwise kill the gravitational lens — the singularity's signature "real physics"
 * screen-warp — which is exactly the "a threshold is met and the visual turns off" symptom.
 *
 * The fix: `postFxShouldRender()` keeps the cheap, brief lens running while a singularity is active,
 * so the warp NEVER vanishes under load; the heavy bloom (and DPR + shadows) are still shed for GPU
 * relief. Pure decision logic — headless, no WebGL — mirroring tests/frame-governor.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import { postFxShouldRender } from '../src/core/engine';
import { planForLevel, Level } from '../src/core/frame-governor';

describe('post-FX lens survives the render-governor shed', () => {
  test('postFxShouldRender truth table: render iff (not governor-suspended) OR (lens active)', () => {
    expect(postFxShouldRender(false, false)).toBe(true); // not suspended, idle → normal post-FX
    expect(postFxShouldRender(false, true)).toBe(true); // not suspended, lens up → post-FX
    expect(postFxShouldRender(true, true)).toBe(true); // SUSPENDED but a singularity lens is active → STILL renders (THE FIX)
    expect(postFxShouldRender(true, false)).toBe(false); // suspended, idle → composer fully skipped (governor's GPU relief intact)
  });

  test('at the governor FX_OFF / SHADOWS_OFF levels an ACTIVE singularity lens still renders; idle is shed', () => {
    // The governor's plan at FX_OFF turns post-FX off (fxOn=false ⇒ the engine suspends the composer)…
    expect(planForLevel(Level.FX_OFF, false).fxOn).toBe(false);
    const suspended = !planForLevel(Level.FX_OFF, false).fxOn; // engine.fxSuspended === true
    // …yet a summoned singularity keeps its warp through the shed, while an idle world is fully skipped.
    expect(postFxShouldRender(suspended, true)).toBe(true); // lens active ⇒ survives
    expect(postFxShouldRender(suspended, false)).toBe(false); // idle ⇒ fully shed
    // Shedding deeper (SHADOWS_OFF, shadow-capable tier) leaves FX already off — the lens exemption holds.
    const deeperSuspended = !planForLevel(Level.SHADOWS_OFF, true).fxOn;
    expect(deeperSuspended).toBe(true);
    expect(postFxShouldRender(deeperSuspended, true)).toBe(true);
  });
});
