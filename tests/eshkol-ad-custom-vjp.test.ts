/**
 * GATE-AD-CUSTOM-VJP — proves the reverse-mode tape's new opaque `adCustom` node (a faithful port of
 * Eshkol's custom-VJP AD nodes, PR #270) folds a caller-supplied vector-Jacobian product into the chain
 * rule correctly. Falsifiable / defensible:
 *   - COMPOSITION: a custom node with a known analytic VJP, wrapped in classical ops, backprops to the
 *     exact analytic gradient and matches finite differences;
 *   - MULTI-INPUT: a 2-input custom node routes gradients to BOTH inputs correctly;
 *   - RESET HYGIENE: adTapeReset clears the custom-VJP registry so a stale closure can never fire on a
 *     later all-classical graph;
 *   - DETERMINISM: identical bytes on repeat.
 */
import { describe, expect, test } from 'bun:test';
import {
  adTapeNew,
  adTapeReset,
  adVar,
  adConst,
  adMul,
  adAdd,
  adCustom,
  adBackward,
  adGradient,
  adValue,
  type AdTape,
} from '../src/math/eshkol-ad';

describe('GATE-AD-CUSTOM-VJP: opaque differentiable nodes compose under the chain rule', () => {
  test('COMPOSITION: f(x) = 3·customSin(x) backprops to 3·cos(x)', () => {
    for (const x of [-1.2, 0, 0.6, 2.1]) {
      const tape = adTapeNew(32);
      const xn = adVar(tape, x);
      // A black-box sin node: value = sin(x); VJP = gradOut·cos(x).
      const sinN = adCustom(tape, Math.sin(x), [xn], (g, [xv]) => [g * Math.cos(xv ?? 0)]);
      const f = adMul(tape, adConst(tape, 3), sinN);
      expect(adValue(tape, f)).toBeCloseTo(3 * Math.sin(x), 12);
      adBackward(tape, f);
      expect(adGradient(tape, xn)).toBeCloseTo(3 * Math.cos(x), 10); // exact analytic
    }
  });

  test('MULTI-INPUT: a custom x·y node routes ∂/∂x = y and ∂/∂y = x', () => {
    const tape = adTapeNew(32);
    const xn = adVar(tape, 2.5);
    const yn = adVar(tape, -4);
    const prod = adCustom(tape, 2.5 * -4, [xn, yn], (g, [xv, yv]) => [
      g * (yv ?? 0),
      g * (xv ?? 0),
    ]);
    // Wrap in a classical op so the custom node is not the output: L = prod + x
    const L = adAdd(tape, prod, xn);
    adBackward(tape, L);
    expect(adGradient(tape, xn)).toBeCloseTo(-4 + 1, 12); // ∂/∂x (x·y) = y, plus the +x term
    expect(adGradient(tape, yn)).toBeCloseTo(2.5, 12); // ∂/∂y (x·y) = x
  });

  test('FINITE-DIFFERENCE: a hybrid classical∘custom∘classical gradient matches central differences', () => {
    // L(x) = (customPow3(2x) − 5)² , where customPow3(u)=u³ with VJP 3u². True dL/dx via the tape.
    const build = (x: number): { tape: AdTape; xn: number; L: number } => {
      const tape = adTapeNew(64);
      const xn = adVar(tape, x);
      const u = adMul(tape, adConst(tape, 2), xn); // u = 2x (classical)
      const uv = adValue(tape, u);
      const cube = adCustom(tape, uv * uv * uv, [u], (g, [uu]) => [g * 3 * (uu ?? 0) * (uu ?? 0)]);
      const d = adAdd(tape, cube, adConst(tape, -5));
      const L = adMul(tape, d, d);
      return { tape, xn, L };
    };
    const val = (x: number): number => {
      const u = 2 * x;
      return (u * u * u - 5) ** 2;
    };
    for (const x of [0.4, 1.1, -0.8]) {
      const { tape, xn, L } = build(x);
      adBackward(tape, L);
      const analytic = adGradient(tape, xn);
      const h = 1e-6;
      const fd = (val(x + h) - val(x - h)) / (2 * h);
      expect(Math.abs(analytic - fd)).toBeLessThan(1e-4 + 1e-4 * Math.abs(fd));
    }
  });

  test('RESET HYGIENE: adTapeReset clears the custom registry (no stale closure fires later)', () => {
    const tape = adTapeNew(16);
    let fired = 0;
    const xn = adVar(tape, 1);
    adCustom(tape, 1, [xn], (g) => {
      fired++;
      return [g];
    });
    adTapeReset(tape);
    expect(tape.customVjps?.size ?? 0).toBe(0); // registry emptied
    // A fresh all-classical graph on the reused tape must not invoke the old closure.
    const a = adVar(tape, 3);
    const b = adMul(tape, a, a);
    adBackward(tape, b);
    expect(adGradient(tape, a)).toBeCloseTo(6, 12); // d/da a² = 2a
    expect(fired).toBe(0); // the stale custom VJP never ran
  });

  test('DETERMINISTIC: identical inputs ⇒ identical gradient bytes', () => {
    const run = (): number => {
      const tape = adTapeNew(16);
      const xn = adVar(tape, 0.77);
      const c = adCustom(tape, Math.exp(0.77), [xn], (g, [xv]) => [g * Math.exp(xv ?? 0)]);
      adBackward(tape, c);
      return adGradient(tape, xn);
    };
    expect(run()).toBe(run());
  });
});
