/**
 * CHAOS MODE (V62) — the Lorenz-driven quantum storm. These pin the two properties the feature
 * lives or dies by: (1) it is **inert when off** — an inactive `update()` mutates nothing and draws
 * no rng, so the base sim stays byte-identical (the determinism law); (2) it is **deterministic when
 * on** — same seed + same frame/entity sequence ⇒ the same storm, and a different seed diverges
 * (sensitive dependence, not a vacuous constant). Pure logic — lightweight entity mocks, headless.
 */
import { describe, expect, test } from 'bun:test';
import { ChaosField } from '../src/sim/chaos-field';
import type { Entity, SimState } from '../src/types';

/** A colour stub whose `lerp` is a no-op (entanglement recolours; irrelevant to the signature). */
function mkColor(): { lerp: (o: unknown, a: number) => unknown } {
  return {
    lerp() {
      return this;
    },
  };
}
function mkEntity(x: number, y: number, z: number): Entity {
  return {
    position: { x, y, z },
    userData: { vel: { x: 0, y: 0, z: 0 }, qP: 0 },
    material: { color: mkColor() },
  } as unknown as Entity;
}
function mkList(n: number): Entity[] {
  const list: Entity[] = [];
  for (let i = 0; i < n; i++) list.push(mkEntity((i % 10) - 5, (i % 7) - 3, (i % 5) - 2));
  return list;
}
function mkState(): SimState {
  return { chaos: 0.5, frame: 0 } as unknown as SimState;
}
/** A scalar fingerprint of the whole population's positions + phases + velocities. */
function signature(list: readonly Entity[]): number {
  let s = 0;
  for (const e of list) {
    const u = e.userData;
    s += e.position.x * 1.1 + e.position.y * 1.7 + e.position.z * 2.3 + u.qP * 0.3 + u.vel.x;
  }
  return s;
}

function run(
  seed: number,
  frames: number,
): { sig: number; chaos: number; tunnels: number; intensity: number } {
  const f = new ChaosField(seed);
  f.toggle(); // engage the storm
  const list = mkList(120);
  const state = mkState();
  let tunnels = 0;
  for (let i = 0; i < frames; i++) {
    f.update(1 / 60, list, state);
    tunnels += f.tunnels;
    state.frame++;
  }
  return { sig: signature(list), chaos: state.chaos, tunnels, intensity: f.intensity };
}

describe('ChaosField (V62 CHAOS MODE)', () => {
  test('off ⇒ no-op: an inactive field mutates nothing and leaves chaos alone', () => {
    const f = new ChaosField(42);
    const list = mkList(50);
    const before = signature(list);
    const state = mkState();
    for (let i = 0; i < 30; i++) {
      f.update(1 / 60, list, state);
      state.frame++;
    }
    expect(signature(list)).toBe(before); // organisms untouched
    expect(state.chaos).toBe(0.5); // the chaos scalar untouched
    expect(f.active).toBe(false);
    expect(f.intensity).toBe(0);
  });

  test('same seed + same sequence ⇒ identical storm (determinism)', () => {
    expect(run(1234, 200)).toEqual(run(1234, 200));
  });

  test('a different seed diverges (sensitive, not vacuous)', () => {
    expect(run(1, 200).sig).not.toBe(run(2, 200).sig);
  });

  test('engaged ⇒ real chaos: intensity rises, chaos enters the storm band, tunnelling fires', () => {
    const a = run(777, 300);
    expect(a.intensity).toBeGreaterThan(0);
    expect(a.chaos).toBeGreaterThanOrEqual(5); // storm band floor
    expect(a.chaos).toBeLessThanOrEqual(10); // storm band ceiling
    expect(a.tunnels).toBeGreaterThan(0); // some creatures tunnelled over 300 frames
  });

  test('toggling off clears the storm and returns to a no-op', () => {
    const f = new ChaosField(9);
    expect(f.toggle()).toBe(true);
    const list = mkList(80);
    const state = mkState();
    for (let i = 0; i < 60; i++) {
      f.update(1 / 60, list, state);
      state.frame++;
    }
    expect(f.intensity).toBeGreaterThan(0);
    expect(f.toggle()).toBe(false);
    expect(f.intensity).toBe(0);
    const sig = signature(list);
    for (let i = 0; i < 10; i++) {
      f.update(1 / 60, list, state);
      state.frame++;
    }
    expect(signature(list)).toBe(sig); // inactive again ⇒ frozen
  });
});
