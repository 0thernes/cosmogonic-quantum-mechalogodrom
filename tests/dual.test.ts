/**
 * Forward-mode dual numbers — proves exact first derivatives, cross-checked against analytic
 * values and against the hyper-dual second-order engine's first-derivative part.
 */
import { describe, expect, test } from 'bun:test';
import {
  dConst,
  dAdd,
  dMul,
  dDiv,
  dSin,
  dExp,
  derivative,
  type Dual,
} from '../src/math/dual';
import { hdExp, hdSin, derivatives2 } from '../src/math/hyperdual';

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps;

describe('dual — derivatives', () => {
  test('x³ at 2 ⇒ 8, 12', () => {
    const r = derivative((d) => dMul(dMul(d, d), d), 2);
    expect(near(r.value, 8)).toBe(true);
    expect(near(r.d1, 12)).toBe(true);
  });

  test('x²+3x at 5 ⇒ 40, 13', () => {
    const r = derivative((d) => dAdd(dMul(d, d), dMul(dConst(3), d)), 5);
    expect(near(r.value, 40)).toBe(true);
    expect(near(r.d1, 13)).toBe(true);
  });

  test('sin at 0 ⇒ 0, 1', () => {
    const r = derivative(dSin, 0);
    expect(near(r.value, 0)).toBe(true);
    expect(near(r.d1, 1)).toBe(true);
  });

  test('1/x at 2 ⇒ 0.5, −0.25', () => {
    const r = derivative((d) => dDiv(dConst(1), d), 2);
    expect(near(r.value, 0.5)).toBe(true);
    expect(near(r.d1, -0.25)).toBe(true);
  });
});

describe('dual — agrees with hyper-dual first derivative', () => {
  test('exp(sin x) at x=1.3', () => {
    const x = 1.3;
    const fwd = derivative((d) => dExp(dSin(d)), x);
    const hd = derivatives2((h) => hdExp(hdSin(h)), x);
    expect(near(fwd.value, hd.value)).toBe(true);
    expect(near(fwd.d1, hd.d1)).toBe(true);
  });
});

describe('dual — determinism', () => {
  test('identical evaluations agree exactly', () => {
    const f = (d: Dual) => dExp(dMul(d, d));
    const a = derivative(f, 0.6);
    const b = derivative(f, 0.6);
    expect(a.value).toBe(b.value);
    expect(a.d1).toBe(b.d1);
  });
});
