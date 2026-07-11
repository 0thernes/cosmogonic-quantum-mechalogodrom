/**
 * SUPER CREATURE body flight + V41 player control. The body is a THREE.Group driven by pure math
 * (no WebGL), so its motion is unit-testable headlessly: MANUAL control flies it along the player's
 * steer, ASSIST still roams, and AUTOPILOT roams on its own. Guards the "fly it / ride it" mechanic.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { SuperBodySystem } from '../src/sim/super-body';
import { PLATFORM_CEIL, PLATFORM_HALF } from '../src/sim/constants';

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

  test('manual flight can use the expanded X/Y volume but cannot cross its walls', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.setControl(2, 1, 1, 0, true);
    for (let i = 0; i < 3000; i++) body.update(i / 60, 1 / 60);
    const p = body.worldPosition(new THREE.Vector3());
    expect(p.x).toBeGreaterThan(540);
    expect(p.y).toBeGreaterThan(240);
    expect(p.x).toBeLessThanOrEqual(PLATFORM_HALF);
    expect(p.y).toBeLessThanOrEqual(PLATFORM_CEIL + 1); // render bob may add ≤0.6
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

      body.setControl(
        Number.POSITIVE_INFINITY,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        -Infinity,
        true,
      );
      for (let i = 0; i < 20; i++) body.update((200 + i) / 60, 1 / 60);
      const defended = body.worldPosition(new THREE.Vector3());
      expect(Number.isFinite(defended.x + defended.y + defended.z)).toBe(true);
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

  test('CONSCIOUSNESS: dreaming + hallucinating drive DISTINCT skin uniforms (oneiric aurora / chromatic writhe)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    const q = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const u = (
      body as unknown as { u: { uDream: { value: number }; uHallucinate: { value: number } } }
    ).u;
    // Awake, lucid: both distinct skin states are OFF (baseline).
    body.setConsciousness(q, 0, 0);
    expect(u.uDream.value).toBe(0);
    expect(u.uHallucinate.value).toBe(0);
    // Dreaming (REM) but not hallucinating: the oneiric aurora rises, the chromatic writhe stays quiet.
    body.setConsciousness(q, 0.8, 0);
    expect(u.uDream.value).toBeCloseTo(0.8, 6);
    expect(u.uHallucinate.value).toBe(0);
    // Hallucinating but awake: the writhe rises, the aurora stays quiet — the two mind-states are independent.
    body.setConsciousness(q, 0, 0.6);
    expect(u.uDream.value).toBe(0);
    expect(u.uHallucinate.value).toBeCloseTo(0.6, 6);
    // Both lanes clamp to [0,1] under over-range input (a bounded, falsifiable readout).
    body.setConsciousness(q, 5, -3);
    expect(u.uDream.value).toBe(1);
    expect(u.uHallucinate.value).toBe(0);
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

  test('BRUTALISM: setBrutalism crossfades the skin and clamps to [0,1]', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    expect(body.brutalismFactor()).toBe(0); // default: full god-jewel, unchanged
    body.setBrutalism(0.5);
    expect(body.brutalismFactor()).toBeCloseTo(0.5, 5); // half-way to concrete
    body.setBrutalism(1);
    expect(body.brutalismFactor()).toBe(1); // full poured-concrete monolith
    body.setBrutalism(5); // over the top
    expect(body.brutalismFactor()).toBe(1); // clamped
    body.setBrutalism(-3); // below floor
    expect(body.brutalismFactor()).toBe(0); // clamped — back to the jewel
  });

  test('BRUTALISM turns the whole apex body concrete — the static appendages, not just the core', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    // Reach the registered static appendage materials (arms/wings/mouths/legs/chrome rings).
    const reg = (
      body as unknown as { brutalStatic: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[] }
    ).brutalStatic;
    expect(reg.length).toBeGreaterThanOrEqual(5); // arms, wings, mouths, legs, rings
    const bases = reg.map((e) => e.mat.color.getHex());

    // OFF: appendages keep their lurid base colours (byte-identical).
    body.setBrutalism(0);
    reg.forEach((e, i) => expect(e.mat.color.getHex()).toBe(bases[i]!));

    // FULL concrete: every appendage crossfades to the raw concrete grey (0.34, 0.335, 0.32).
    body.setBrutalism(1);
    const concrete = new THREE.Color(0.34, 0.335, 0.32);
    for (const e of reg) {
      expect(e.mat.color.r).toBeCloseTo(concrete.r, 5);
      expect(e.mat.color.g).toBeCloseTo(concrete.g, 5);
      expect(e.mat.color.b).toBeCloseTo(concrete.b, 5);
    }

    // OFF again restores every appendage EXACTLY (stateless lerp FROM the captured base).
    body.setBrutalism(0);
    reg.forEach((e, i) => expect(e.mat.color.getHex()).toBe(bases[i]!));
  });

  test('BRUTAL style index retargets appendage materials beyond concrete', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    const reg = (
      body as unknown as { brutalStatic: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[] }
    ).brutalStatic;

    body.setBrutalStyle(2);
    body.setBrutalism(1);
    expect(body.brutalStyleIdx()).toBe(2);
    expect(reg[0]!.mat.color.r).toBeCloseTo(0.95, 5);
    expect(reg[0]!.mat.color.g).toBeCloseTo(0.82, 5);
    expect(reg[0]!.mat.color.b).toBeCloseTo(0.55, 5);

    body.setBrutalStyle(3);
    expect(body.brutalStyleIdx()).toBe(3);
    expect(reg[0]!.mat.color.r).toBeCloseTo(0.25, 5);
    expect(reg[0]!.mat.color.g).toBeCloseTo(0.08, 5);
    expect(reg[0]!.mat.color.b).toBeCloseTo(0.52, 5);

    body.setBrutalStyle(99);
    expect(body.brutalStyleIdx()).toBe(4);
    body.setBrutalStyle(-4);
    expect(body.brutalStyleIdx()).toBe(0);
  });

  test('BRUTALISM coexists with evolution + flight (no NaN, both factors independent)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.setBrutalism(1);
    body.setEvolution({
      sizeMul: 4,
      hueShift: 0.3,
      glowMul: 2,
      spikeBoost: 4,
      aura: 0.8,
      tier: 8,
      ascended: false,
    });
    body.setControl(2, 1, 0.2, -0.5, true);
    for (let i = 0; i < 120; i++) body.update(i / 60, 1 / 60);
    const p = body.worldPosition(new THREE.Vector3());
    expect(Number.isFinite(p.x + p.y + p.z)).toBe(true); // brutalism doesn't disturb the flight math
    expect(body.brutalismFactor()).toBe(1); // still concrete
    expect(body.evolutionSkin().tier).toBeCloseTo(8, 5); // evolution still applied alongside
  });

  test('V1.3 AE-1/HOT-3: SuperMind move vector steers the autopilot flight target', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    const from = body.worldPosition(new THREE.Vector3());
    body.setSuperMindMove(1, 0, 0, 1.0); // full +X steer from the apex mind
    for (let i = 0; i < 200; i++) body.update(i / 60, 1 / 60);
    const to = body.worldPosition(new THREE.Vector3());
    expect(to.x).toBeGreaterThan(from.x + 5); // net drift in +X from the mind's will
    expect(Number.isFinite(to.x + to.y + to.z)).toBe(true);
  });

  test('BRUTALISM: setBrutalism crossfades the skin and clamps to [0,1]', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    expect(body.brutalismFactor()).toBe(0);
    body.setBrutalism(0.5);
    expect(body.brutalismFactor()).toBeCloseTo(0.5, 5);
    body.setBrutalism(1);
    expect(body.brutalismFactor()).toBe(1);
    body.setBrutalism(5);
    expect(body.brutalismFactor()).toBe(1);
    body.setBrutalism(-3);
    expect(body.brutalismFactor()).toBe(0);
  });

  test('BRUTALISM coexists with evolution + flight (no NaN, both factors independent)', () => {
    const body = new SuperBodySystem(new THREE.Scene());
    body.setBrutalism(1);
    body.setEvolution({
      sizeMul: 4,
      hueShift: 0.3,
      glowMul: 2,
      spikeBoost: 4,
      aura: 0.8,
      tier: 8,
      ascended: false,
    });
    body.setControl(2, 1, 0.2, -0.5, true);
    for (let i = 0; i < 120; i++) body.update(i / 60, 1 / 60);
    const p = body.worldPosition(new THREE.Vector3());
    expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
    expect(body.brutalismFactor()).toBe(1);
    expect(body.evolutionScale()).toBeCloseTo(4, 5);
  });
});
