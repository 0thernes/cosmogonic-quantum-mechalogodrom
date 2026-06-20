/**
 * ESHKOL AD TAPE (V2) — reverse-mode automatic differentiation ported from Tsotchke corpus.
 * Proves exact gradients, tape reuse, and determinism (digital biologic primitive, not LLM).
 */
import { describe, expect, test } from 'bun:test';
import {
  adAdd,
  adBackward,
  adConst,
  adGradient,
  adMul,
  adPow,
  adTapeNew,
  adTapeReset,
  adVar,
  adTapeLen,
} from '../src/math/eshkol-ad';

describe('Eshkol AD tape (Tsotchke vm_autodiff port)', () => {
  test('x^2 at x=3 → gradient 6 (classic sanity)', () => {
    const tape = adTapeNew(16);
    const x = adVar(tape, 3);
    const y = adMul(tape, x, x);
    adBackward(tape, y);
    expect(adGradient(tape, x)).toBeCloseTo(6, 5);
  });

  test('(x + 2)^2 at x=1 → gradient 6', () => {
    const tape = adTapeNew(32);
    const x = adVar(tape, 1);
    const c = adConst(tape, 2);
    const s = adAdd(tape, x, c);
    const y = adMul(tape, s, s);
    adBackward(tape, y);
    expect(adGradient(tape, x)).toBeCloseTo(6, 5);
  });

  test('x^3 at x=2 → gradient 12', () => {
    const tape = adTapeNew(16);
    const x = adVar(tape, 2);
    const e = adConst(tape, 3);
    const y = adPow(tape, x, e);
    adBackward(tape, y);
    expect(adGradient(tape, x)).toBeCloseTo(12, 4);
  });

  test('tape reset allows reuse without alloc churn', () => {
    const tape = adTapeNew(8);
    for (let run = 0; run < 5; run++) {
      adTapeReset(tape);
      const x = adVar(tape, run + 1);
      const y = adMul(tape, x, x);
      adBackward(tape, y);
      expect(adGradient(tape, x)).toBeCloseTo(2 * (run + 1), 5);
    }
    expect(adTapeLen(tape)).toBe(2);
    adTapeReset(tape);
    expect(adTapeLen(tape)).toBe(0);
    expect(tape.cap).toBe(8);
  });

  test('identical computation ⇒ identical gradients (determinism)', () => {
    const run = () => {
      const tape = adTapeNew(16);
      const x = adVar(tape, 1.5);
      const y = adPow(tape, x, 2);
      adBackward(tape, y);
      return adGradient(tape, x);
    };
    expect(run()).toBe(run());
  });
});
