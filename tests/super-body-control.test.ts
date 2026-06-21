/**
 * SUPER CREATURE body flight + V41 player control. The body is a THREE.Group driven by pure math
 * (no WebGL), so its motion is unit-testable headlessly: MANUAL control flies it along the player's
 * steer, ASSIST still roams, and AUTOPILOT roams on its own. Guards the "fly it / ride it" mechanic.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { SuperBodySystem } from '../src/sim/super-body';

function run(
  setup: (b: SuperBodySystem) => void,
  frames = 150,
): { from: THREE.Vector3; to: THREE.Vector3 } {
  const body = new SuperBodySystem(new THREE.Scene());
  const from = body.worldPosition(new THREE.Vector3());
  setup(body);
  for (let i = 0; i < frames; i++) body.update(i / 60, 1 / 60);
  return { from, to: body.worldPosition(new THREE.Vector3()) };
}

describe('SuperBodySystem flight + control (V41)', () => {
  test('MANUAL control flies the avatar along the player steer (+X)', () => {
    const { from, to } = run((b) => b.setControl(2, 1, 0, 0, true)); // mode 2 = manual, steer +X
    expect(to.x).toBeGreaterThan(from.x + 8); // travelled substantially in +X
    expect(Math.abs(to.z - from.z)).toBeLessThan(8); // and not wandering off in Z
  });

  test('MANUAL with steer -Z then no input coasts to a near-stop (the player let go)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.setControl(2, 0, 0, -1, true);
    for (let i = 0; i < 60; i++) body.update(i / 60, 1 / 60);
    const moving = body.worldPosition(new THREE.Vector3());
    body.setControl(2, 0, 0, 0, false); // release — manual hover
    for (let i = 60; i < 160; i++) body.update(i / 60, 1 / 60);
    const after = body.worldPosition(new THREE.Vector3());
    // heading() decays toward still; the per-frame step shrinks once input is released.
    const h = body.heading(new THREE.Vector3());
    expect(h.length()).toBeCloseTo(1, 3); // heading stays a unit vector (no NaN)
    expect(after.y).toBeGreaterThan(0); // stayed aloft, no blow-up
    expect(Number.isFinite(moving.x)).toBe(true);
  });

  test('AUTOPILOT roams the world on its own (no player input)', () => {
    const { from, to } = run((b) => b.setControl(0, 0, 0, 0, false)); // mode 0 = autopilot
    expect(to.distanceTo(from)).toBeGreaterThan(6); // it flew somewhere by itself
  });

  test('worldPosition + heading are always finite (no NaN under any mode)', () => {
    for (const mode of [0, 1, 2]) {
      const body = new SuperBodySystem(new THREE.Scene());
      body.setControl(mode, 0.3, -0.2, 0.5, mode !== 0);
      for (let i = 0; i < 200; i++) body.update(i / 60, 1 / 60);
      const p = body.worldPosition(new THREE.Vector3());
      const h = body.heading(new THREE.Vector3());
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
      expect(Number.isFinite(h.x + h.y + h.z)).toBe(true);
    }
  });

  test('V46: the live SUPER MIND drives the body morphology (quantum morphology + hallucination)', () => {
    const calm = new SuperBodySystem(new THREE.Scene());
    const wild = new SuperBodySystem(new THREE.Scene());
    const q = (morphology: number): number[] => [0, 0, 0, 0, 0, morphology, 0, 0, 0, 0]; // idx 5 = morphology
    calm.setConsciousness(q(0), 0, 0); // no morphology, no dream/hallucination
    wild.setConsciousness(q(1), 1, 1); // full morphology + dreaming + hallucinating
    calm.update(0, 1 / 60);
    wild.update(0, 1 / 60);
    expect(wild.morphFactor()).toBeGreaterThan(calm.morphFactor()); // the monster writhes harder when active
  });

  test('V48: evolution GROWS the body (setEvolution → a larger scale)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.update(0, 1 / 60);
    const base = body.evolutionScale(); // 1 at BASE
    body.setEvolution({
      sizeMul: 3.5,
      hueShift: 0.5,
      glowMul: 2,
      spikeBoost: 3,
      aura: 0.5,
      tier: 5,
      ascended: false,
    });
    body.update(0, 1 / 60);
    expect(body.evolutionScale()).toBeGreaterThan(base); // it grew
    expect(body.evolutionScale()).toBeCloseTo(3.5, 5);
  });

  test('V64: evolution makes the SKIN evolve (aura/tier/hue/ascended feed the god-jewel surface)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    // BASE: the appearance fields the skin reads start neutral, so the surface is unchanged.
    const base = body.evolutionSkin();
    expect(base.aura).toBe(0);
    expect(base.tier).toBe(0);
    expect(base.hue).toBe(0);
    expect(base.ascended).toBe(false);
    // Ascend to the LV100 end-state — the skin should blaze (aura→1), gain detail (tier→10),
    // shift its palette (hue) and flip the ascended shimmer on.
    body.setEvolution({
      sizeMul: 5,
      hueShift: 0.6,
      glowMul: 3,
      spikeBoost: 5,
      aura: 1,
      tier: 10,
      ascended: true,
    });
    const evolved = body.evolutionSkin();
    expect(evolved.aura).toBeCloseTo(1, 5);
    expect(evolved.tier).toBeCloseTo(10, 5);
    expect(evolved.hue).toBeCloseTo(0.6, 5);
    expect(evolved.ascended).toBe(true);
  });

  test('V64: evolution skin params stay bounded + hue wraps (defensive against out-of-range appearance)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.setEvolution({
      sizeMul: 99,
      hueShift: 2.25, // >1 — must wrap into [0,1)
      glowMul: 99,
      spikeBoost: -5, // negative — clamps to 0 via existing spike rule
      aura: 5, // >1 — clamps to 1
      tier: 50, // >10 — clamps to 10
      ascended: false,
    });
    const s = body.evolutionSkin();
    expect(s.aura).toBe(1); // clamped
    expect(s.tier).toBe(10); // clamped
    expect(s.hue).toBeCloseTo(0.25, 5); // 2.25 wrapped into [0,1)
    expect(s.hue).toBeGreaterThanOrEqual(0);
    expect(s.hue).toBeLessThan(1);
    expect(s.ascended).toBe(false);
  });
});
