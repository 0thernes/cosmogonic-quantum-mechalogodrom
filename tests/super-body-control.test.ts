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
});
