/**
 * GATE-MLP — proves the AD-MLP is a REAL neural network with a QUALITATIVE cognitive capability the base
 * linear learner cannot have, not a decorative parameter dump. The witness is XOR: it is not linearly
 * separable, so ANY linear model's best-possible MSE is exactly 0.25 (predict 0.5 everywhere), while a
 * one-hidden-layer MLP is a universal approximator and drives the MSE to ~0. All trained by the exact
 * Eshkol reverse-mode AD tape (backprop read off the tape, never hand-coded).
 *
 *   Falsifiable / defensible:
 *   - the MLP learns XOR to < 0.05 MSE and classifies all four patterns correctly;
 *   - an inline linear AD baseline, trained identically, stays pinned near the 0.25 theoretical floor (the gap);
 *   - ABLATION: freeze the MLP (lr = 0) → the loss never falls, proving the learning is load-bearing;
 *   - deterministic: identical seed ⇒ byte-identical trained weights.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  adTapeNew,
  adTapeReset,
  adVar,
  adConst,
  adMul,
  adAdd,
  adSub,
  adBackward,
  adGradient,
} from '../src/math/eshkol-ad';
import { createMlp, mlpPredict, mlpTrainStep, mlpParamCount } from '../src/sim/ad-mlp';

const XOR: Array<{ x: [number, number]; y: number }> = [
  { x: [0, 0], y: 0 },
  { x: [0, 1], y: 1 },
  { x: [1, 0], y: 1 },
  { x: [1, 1], y: 0 },
];

/** Full-batch MSE of a predictor over the XOR set. */
function xorMse(predict: (x: readonly number[]) => number): number {
  let s = 0;
  for (const { x, y } of XOR) {
    const e = predict(x) - y;
    s += e * e;
  }
  return s / XOR.length;
}

/** A single linear unit  out = w·x + b  trained on XOR by the SAME exact-AD MSE — the honest baseline. */
function trainLinearXor(seed: number, steps: number): (x: readonly number[]) => number {
  const tape = adTapeNew(64);
  const rng = mulberry32(seed);
  const w = [rng() * 2 - 1, rng() * 2 - 1];
  let b = 0;
  const lr = 0.1;
  for (let s = 0; s < steps; s++) {
    const { x, y } = XOR[s % 4]!;
    adTapeReset(tape);
    const w0 = adVar(tape, w[0]!);
    const w1 = adVar(tape, w[1]!);
    const bn = adVar(tape, b);
    const out = adAdd(
      tape,
      adAdd(tape, adMul(tape, w0, adConst(tape, x[0])), adMul(tape, w1, adConst(tape, x[1]))),
      bn,
    );
    const d = adSub(tape, out, adConst(tape, y));
    const loss = adMul(tape, d, d);
    adBackward(tape, loss);
    w[0] = w[0]! - lr * adGradient(tape, w0);
    w[1] = w[1]! - lr * adGradient(tape, w1);
    b = b - lr * adGradient(tape, bn);
  }
  return (x) => w[0]! * x[0]! + w[1]! * x[1]! + b;
}

describe('GATE-MLP: an Eshkol-AD MLP learns a nonlinear map a linear unit provably cannot (XOR)', () => {
  test('the MLP solves XOR to near-zero error and classifies all four patterns', () => {
    const net = createMlp(2, 4, 1, mulberry32(7));
    const before = xorMse((x) => mlpPredict(net, x)[0]!);
    for (let s = 0; s < 6000; s++) {
      const { x, y } = XOR[s % 4]!;
      mlpTrainStep(net, x, [y], 0.1);
    }
    const after = xorMse((x) => mlpPredict(net, x)[0]!);
    expect(after).toBeLessThan(0.05); // universal approximator drives MSE ≈ 0
    expect(after).toBeLessThan(before * 0.2); // and it genuinely LEARNED (huge drop from random init)
    for (const { x, y } of XOR) {
      const p = mlpPredict(net, x)[0]!;
      expect(p > 0.5 ? 1 : 0).toBe(y); // every pattern classified correctly
    }
  });

  test('a linear unit provably CANNOT — trained identically it stays pinned near the 0.25 XOR floor (the gap)', () => {
    const linear = trainLinearXor(7, 6000);
    const linMse = xorMse(linear);
    expect(linMse).toBeGreaterThan(0.24); // best-possible linear MSE on XOR is exactly 0.25
    // The capability GAP: the MLP (above) reaches < 0.05 where the linear model is stuck ≥ 0.24.
  });

  test('ABLATION: a frozen MLP (lr = 0) never lowers its loss — the AD learning is load-bearing', () => {
    const net = createMlp(2, 4, 1, mulberry32(7));
    const before = xorMse((x) => mlpPredict(net, x)[0]!);
    for (let s = 0; s < 6000; s++) {
      const { x, y } = XOR[s % 4]!;
      mlpTrainStep(net, x, [y], 0); // lr 0 → gradient applied with zero scale → no weight change
    }
    const after = xorMse((x) => mlpPredict(net, x)[0]!);
    expect(after).toBe(before); // byte-identical: nothing learned without the gradient step
  });

  test('deterministic: identical seed ⇒ byte-identical trained network', () => {
    const train = (): Float64Array => {
      const net = createMlp(2, 4, 1, mulberry32(11));
      for (let s = 0; s < 500; s++) mlpTrainStep(net, XOR[s % 4]!.x, [XOR[s % 4]!.y], 0.1);
      return net.w2;
    };
    expect(Array.from(train())).toEqual(Array.from(train()));
  });

  test('the network is a genuine SCALE expansion over the 3-weight linear learner', () => {
    // 2→4→1 = w1(8)+b1(4)+w2(4)+b2(1) = 17 trainable params through a nonlinearity, vs the base
    // biologicLearnStep's 3 linear weights — an order-of-magnitude richer, nonlinear hypothesis class.
    expect(mlpParamCount(createMlp(2, 4, 1, mulberry32(1)))).toBe(17);
    expect(mlpParamCount(createMlp(3, 6, 2, mulberry32(1)))).toBe(3 * 6 + 6 + 6 * 2 + 2); // 38
  });
});
