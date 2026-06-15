/**
 * THE WINGMAN SWARM (V47) — the 100-robot escort, each a ~250-param brain. Pins the count + per-robot
 * budget, determinism, the bounded orbit formation, the assist signal, NaN-freedom, and that the swarm
 * tracks its creature as it flies.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { WingmanSwarm, WINGMAN_COUNT, WINGMAN_PARAMS_EACH } from '../src/sim/super-wingmen';

const Q0 = [0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0.4]; // a sample quantum-aspect vector

function hdist(pos: Float32Array, i: number, cx: number, cz: number): number {
  return Math.hypot(pos[i * 3]! - cx, pos[i * 3 + 2]! - cz);
}

describe('WingmanSwarm (V47)', () => {
  test('100 robots, each a ~250-parameter brain', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(1));
    expect(sw.count).toBe(100);
    expect(WINGMAN_PARAMS_EACH).toBeGreaterThanOrEqual(200);
    expect(WINGMAN_PARAMS_EACH).toBeLessThanOrEqual(300);
    expect(sw.paramsTotal).toBe(100 * WINGMAN_PARAMS_EACH);
    expect(sw.positions).toHaveLength(300); // 100 × xyz
  });

  test('same seed ⇒ identical swarm (deterministic positions + assist)', () => {
    const a = new WingmanSwarm(40, mulberry32(7));
    const b = new WingmanSwarm(40, mulberry32(7));
    for (let f = 0; f < 20; f++) {
      a.update(0, 12, 0, 0.8, Q0, f / 60, 1 / 60);
      b.update(0, 12, 0, 0.8, Q0, f / 60, 1 / 60);
    }
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(a.assist).toBe(b.assist);
  });

  test('robots hold a bounded orbit formation around the creature', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(3));
    for (let f = 0; f < 60; f++) sw.update(0, 12, 0, 0.7, Q0, f / 60, 1 / 60);
    for (let i = 0; i < sw.count; i++) {
      const d = hdist(sw.positions, i, 0, 0);
      expect(d).toBeGreaterThan(4); // never collapses into the core
      expect(d).toBeLessThan(28); // never flies off
    }
  });

  test('assist is a bounded 0..1 lift', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(5));
    for (let f = 0; f < 30; f++) {
      sw.update(0, 12, 0, 0.9, Q0, f / 60, 1 / 60);
      expect(sw.assist).toBeGreaterThanOrEqual(0);
      expect(sw.assist).toBeLessThanOrEqual(1);
    }
  });

  test('the swarm tracks its creature as it flies (positions follow the centre)', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(9));
    for (let f = 0; f < 30; f++) sw.update(0, 12, 0, 0.6, Q0, f / 60, 1 / 60);
    // move the creature far away and let the swarm re-centre on it
    for (let f = 30; f < 60; f++) sw.update(120, 30, -80, 0.6, Q0, f / 60, 1 / 60);
    for (let i = 0; i < sw.count; i++) {
      expect(hdist(sw.positions, i, 120, -80)).toBeLessThan(28); // orbiting the NEW locus
    }
  });

  test('no NaN under a long run', () => {
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(11));
    for (let f = 0; f < 400; f++)
      sw.update(Math.sin(f) * 50, 14, Math.cos(f) * 50, 0.5, Q0, f / 60, 1 / 60);
    for (const v of sw.positions) expect(Number.isFinite(v)).toBe(true);
    expect(Number.isFinite(sw.assist)).toBe(true);
  });
});
