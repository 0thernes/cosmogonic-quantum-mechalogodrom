/**
 * Global Workspace Theory engine — real softmax competition + winner broadcast + ignition.
 * Verifies the ported Eshkol consciousness primitive is genuine math, not a heuristic blend.
 */
import { describe, expect, test } from 'bun:test';
import {
  gwtSoftmax,
  gwtEntropy,
  gwtCompete,
  gwtCompeteScalar,
  type GwtModule,
} from '../src/math/global-workspace';

const mod = (salience: number, proposal: number[]): GwtModule => ({
  salience,
  proposal: Float32Array.from(proposal),
});

describe('gwt — softmax', () => {
  test('normalizes to 1 and stays positive', () => {
    const out = new Float32Array(3);
    gwtSoftmax([0.1, 0.9, 0.3], out, 3);
    expect(out[0]! + out[1]! + out[2]!).toBeCloseTo(1, 6);
    for (const w of out) expect(w).toBeGreaterThan(0);
    // monotone: higher salience ⇒ higher weight
    expect(out[1]!).toBeGreaterThan(out[2]!);
    expect(out[2]!).toBeGreaterThan(out[0]!);
  });

  test('is numerically stable for huge saliences (no overflow/NaN)', () => {
    const out = new Float32Array(2);
    gwtSoftmax([1000, 1001], out, 2);
    expect(Number.isFinite(out[0]!)).toBe(true);
    expect(Number.isFinite(out[1]!)).toBe(true);
    expect(out[1]!).toBeGreaterThan(out[0]!);
  });

  test('higher temperature flattens the distribution', () => {
    const cold = new Float32Array(3);
    const hot = new Float32Array(3);
    gwtSoftmax([0, 1, 2], cold, 3, 0.5);
    gwtSoftmax([0, 1, 2], hot, 3, 5);
    expect(gwtEntropy(hot, 3)).toBeGreaterThan(gwtEntropy(cold, 3));
  });
});

describe('gwt — entropy', () => {
  test('one-hot ⇒ ~0, uniform ⇒ ~1', () => {
    expect(gwtEntropy([1, 0, 0, 0], 4)).toBeCloseTo(0, 6);
    expect(gwtEntropy([0.25, 0.25, 0.25, 0.25], 4)).toBeCloseTo(1, 6);
  });
  test('single module ⇒ 0', () => {
    expect(gwtEntropy([1], 1)).toBe(0);
  });
});

describe('gwt — competition + broadcast', () => {
  test('winner is the most salient module', () => {
    const r = gwtCompete([mod(0.1, [1, 0]), mod(0.9, [0, 1]), mod(0.3, [1, 1])]);
    expect(r.winner).toBe(1);
  });

  test('ties broken deterministically by lowest index', () => {
    const r = gwtCompete([mod(1, [1]), mod(1, [2])]);
    expect(r.winner).toBe(0);
  });

  test('broadcast is a copy of the winner proposal (winner-take-all)', () => {
    const win = Float32Array.from([0.2, 0.7, 0.1]);
    const r = gwtCompete([mod(0.1, [1, 0, 0]), { salience: 5, proposal: win }]);
    expect(r.winner).toBe(1);
    expect(Array.from(r.broadcast)).toEqual(Array.from(win));
    expect(r.broadcast).not.toBe(win); // genuine copy, not aliased
  });

  test('a dominant module ignites with low entropy', () => {
    const r = gwtCompete([mod(10, [1]), mod(0, [0]), mod(0, [0])], 0.5);
    expect(r.ignited).toBe(true);
    expect(r.access).toBeGreaterThan(0.9);
    expect(r.entropy).toBeLessThan(0.2);
    expect(r.margin).toBeGreaterThan(0.8);
  });

  test('a flat field does not ignite (max entropy, zero margin)', () => {
    const r = gwtCompete([mod(1, [1]), mod(1, [1]), mod(1, [1])], 0.5);
    expect(r.ignited).toBe(false);
    expect(r.entropy).toBeGreaterThan(0.95);
    expect(r.margin).toBeCloseTo(0, 5);
  });

  test('weights sum to 1', () => {
    const r = gwtCompete([mod(0.2, [1]), mod(0.5, [1]), mod(0.8, [1])]);
    let s = 0;
    for (const w of r.weights) s += w;
    expect(s).toBeCloseTo(1, 6);
  });

  test('empty workspace is inert', () => {
    const r = gwtCompete([]);
    expect(r.winner).toBe(-1);
    expect(r.ignited).toBe(false);
    expect(r.broadcast.length).toBe(0);
    expect(r.entropy).toBe(0);
  });

  test('deterministic across identical calls', () => {
    const make = () => gwtCompete([mod(0.3, [1, 2]), mod(0.7, [3, 4]), mod(0.5, [5, 6])], 0.4, 1.5);
    const a = make();
    const b = make();
    expect(a.winner).toBe(b.winner);
    expect(Array.from(a.weights)).toEqual(Array.from(b.weights));
    expect(a.entropy).toBe(b.entropy);
  });
});

describe('gwt — scalar path agrees with full competition', () => {
  test('same winner / ignition / access / entropy', () => {
    const sal = [0.1, 0.9, 0.3];
    const full = gwtCompete(sal.map((s) => mod(s, [0])));
    const s = gwtCompeteScalar(sal, 3);
    expect(s.winner).toBe(full.winner);
    expect(s.ignited).toBe(full.ignited);
    expect(s.access).toBeCloseTo(full.access, 6);
    expect(s.entropy).toBeCloseTo(full.entropy, 6);
  });
});
