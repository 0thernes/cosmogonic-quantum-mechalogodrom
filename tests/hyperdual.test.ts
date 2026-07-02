/**
 * Hyper-dual second-order AD — proves exact first AND second derivatives (Fike & Alonso 2011),
 * cross-checked against closed-form analytic derivatives. Genuine calculus, no finite differences.
 */
import { describe, expect, test } from 'bun:test';
import {
  hdVar,
  hdConst,
  hdMul,
  hdAdd,
  hdSin,
  hdCos,
  hdExp,
  hdLog,
  hdSqrt,
  hdPow,
  hdDiv,
  hdRecip,
  hdTanh,
  hdSigmoid,
  derivatives2,
  type HyperDual,
} from '../src/math/hyperdual';

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps;

describe('hyperdual — polynomials', () => {
  test('f(x)=x³ at x=2 ⇒ 8, f′=12, f″=12', () => {
    const r = derivatives2((h) => hdMul(hdMul(h, h), h), 2);
    expect(near(r.value, 8)).toBe(true);
    expect(near(r.d1, 12)).toBe(true);
    expect(near(r.d2, 12)).toBe(true);
  });

  test('f(x)=x²+3x at x=5 ⇒ 40, f′=13, f″=2', () => {
    const r = derivatives2((h) => hdAdd(hdMul(h, h), hdMul(hdConst(3), h)), 5);
    expect(near(r.value, 40)).toBe(true);
    expect(near(r.d1, 13)).toBe(true);
    expect(near(r.d2, 2)).toBe(true);
  });
});

describe('hyperdual — transcendentals', () => {
  test('exp at 0 ⇒ 1,1,1', () => {
    const r = derivatives2(hdExp, 0);
    expect(near(r.value, 1)).toBe(true);
    expect(near(r.d1, 1)).toBe(true);
    expect(near(r.d2, 1)).toBe(true);
  });

  test('sin at 0 ⇒ 0,1,0', () => {
    const r = derivatives2(hdSin, 0);
    expect(near(r.value, 0)).toBe(true);
    expect(near(r.d1, 1)).toBe(true);
    expect(near(r.d2, 0)).toBe(true);
  });

  test('1/x at x=2 ⇒ 0.5, −0.25, 0.25', () => {
    const r = derivatives2((h) => hdDiv(hdConst(1), h), 2);
    expect(near(r.value, 0.5)).toBe(true);
    expect(near(r.d1, -0.25)).toBe(true);
    expect(near(r.d2, 0.25)).toBe(true);
  });

  test('√x at x=4 ⇒ 2, 0.25, −1/32', () => {
    const r = derivatives2(hdSqrt, 4);
    expect(near(r.value, 2)).toBe(true);
    expect(near(r.d1, 0.25)).toBe(true);
    expect(near(r.d2, -1 / 32)).toBe(true);
  });

  test('hdPow matches sqrt: x^0.5 at 4', () => {
    const r = derivatives2((h) => hdPow(h, 0.5), 4);
    expect(near(r.value, 2)).toBe(true);
    expect(near(r.d1, 0.25)).toBe(true);
    expect(near(r.d2, -1 / 32)).toBe(true);
  });
});

describe('hyperdual — composite vs closed form', () => {
  test('f(x)=exp(sin x): f″ = exp(sin x)(cos²x − sin x)', () => {
    const x = 1.0;
    const r = derivatives2((h) => hdExp(hdSin(h)), x);
    const es = Math.exp(Math.sin(x));
    const d1 = Math.cos(x) * es;
    const d2 = es * (Math.cos(x) * Math.cos(x) - Math.sin(x));
    expect(near(r.value, es)).toBe(true);
    expect(near(r.d1, d1)).toBe(true);
    expect(near(r.d2, d2)).toBe(true);
  });

  test('f(x)=x²·log(x): closed-form derivatives at x=3', () => {
    const x = 3;
    const r = derivatives2((h) => hdMul(hdMul(h, h), hdLog(h)), x);
    const v = x * x * Math.log(x);
    const d1 = 2 * x * Math.log(x) + x; // 2x ln x + x
    const d2 = 2 * Math.log(x) + 3; // 2 ln x + 3
    expect(near(r.value, v)).toBe(true);
    expect(near(r.d1, d1)).toBe(true);
    expect(near(r.d2, d2)).toBe(true);
  });
});

describe('hyperdual — activations', () => {
  test('tanh at 0 ⇒ 0,1,0', () => {
    const r = derivatives2(hdTanh, 0);
    expect(near(r.value, 0)).toBe(true);
    expect(near(r.d1, 1)).toBe(true);
    expect(near(r.d2, 0)).toBe(true);
  });

  test('sigmoid at 0 ⇒ 0.5, 0.25, 0', () => {
    const r = derivatives2(hdSigmoid, 0);
    expect(near(r.value, 0.5)).toBe(true);
    expect(near(r.d1, 0.25)).toBe(true);
    expect(near(r.d2, 0, 1e-9)).toBe(true);
  });
});

describe('hyperdual — determinism', () => {
  test('identical evaluations agree exactly', () => {
    const f = (h: HyperDual) => hdMul(hdCos(h), hdExp(h));
    const a = derivatives2(f, 0.7);
    const b = derivatives2(f, 0.7);
    expect(a.value).toBe(b.value);
    expect(a.d1).toBe(b.d1);
    expect(a.d2).toBe(b.d2);
  });

  test('hdVar seeds first-order parts (f′ exact for identity)', () => {
    const id = hdVar(3);
    expect(id.e1).toBe(1);
    expect(id.e2).toBe(1);
    expect(id.e12).toBe(0);
  });

  test('domain guard: hdRecip / hdDiv by zero stays finite across all three derivative orders', () => {
    // Before the guard, 1/x, -1/x², 2/x³ at x=0 are all ±Infinity and poison the second-order tape.
    // The sign-preserving HD_EPS clamp keeps every field finite.
    const r = hdRecip(hdVar(0));
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.e1)).toBe(true);
    expect(Number.isFinite(r.e12)).toBe(true);
    const d = hdDiv(hdConst(1), hdVar(0));
    expect(Number.isFinite(d.x)).toBe(true);
    expect(Number.isFinite(d.e12)).toBe(true);
  });
});
