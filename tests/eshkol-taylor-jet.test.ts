/**
 * Focused falsification tests for the bounded Eshkol-inspired Float64 Taylor-jet analogue.
 */
import { describe, expect, test } from 'bun:test';
import {
  ESHKOL_TAYLOR_COEFFICIENT_BOUND,
  ESHKOL_TAYLOR_MAX_ORDER,
  EshkolTaylorJet,
} from '../src/math/eshkol-taylor-jet';

function expectCoefficients(jet: EshkolTaylorJet, expected: readonly number[], digits = 12): void {
  expect(expected).toHaveLength(jet.order + 1);
  for (let k = 0; k <= jet.order; k++) expect(jet.coefficient(k)).toBeCloseTo(expected[k]!, digits);
}

describe('EshkolTaylorJet — bounded arbitrary-order runtime Taylor algebra', () => {
  test('enforces order, shape, finite-value, magnitude, and compatible-order boundaries', () => {
    expect(() => new EshkolTaylorJet(-1)).toThrow();
    expect(() => new EshkolTaylorJet(1.5)).toThrow();
    expect(() => new EshkolTaylorJet(ESHKOL_TAYLOR_MAX_ORDER + 1)).toThrow();

    const jet = new EshkolTaylorJet(2);
    expect(() => jet.setCoefficients([1, 2])).toThrow();
    expect(() => jet.setCoefficients([1, Number.NaN, 3])).toThrow();
    expect(() => jet.setConstant(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => jet.setConstant(ESHKOL_TAYLOR_COEFFICIENT_BOUND * 2)).toThrow();
    expect(() => jet.add(jet, new EshkolTaylorJet(3))).toThrow();
  });

  test('stores c[k]=f^(k)(x0)/k! and evaluates values plus arbitrary derivatives', () => {
    const x = new EshkolTaylorJet(4).setVariable(2);
    const cube = new EshkolTaylorJet(4).powInteger(x, 3);

    // (2+h)^3 = 8 + 12h + 6h^2 + h^3.
    expectCoefficients(cube, [8, 12, 6, 1, 0]);
    expect(cube.value).toBe(8);
    expect(cube.derivative(1)).toBe(12);
    expect(cube.derivative(2)).toBe(12);
    expect(cube.derivative(3)).toBe(6);
    expect(cube.derivative(4)).toBe(0);
    expect(cube.evaluate(0.5)).toBeCloseTo(15.625, 12);
    expect(cube.evaluateDerivative(0.5, 1)).toBeCloseTo(18.75, 12);
    expect(cube.evaluateDerivative(0.5, 2)).toBeCloseTo(15, 12);
  });

  test('add, subtract, and multiply are deterministic and input/output-alias safe', () => {
    const a = new EshkolTaylorJet(3).setCoefficients([2, 1, 0, 0]);
    const b = new EshkolTaylorJet(3).setCoefficients([3, -2, 1, 0]);
    const out = new EshkolTaylorJet(3);

    expect(out.add(a, b)).toBe(out);
    expectCoefficients(out, [5, -1, 1, 0]);
    expect(out.sub(out, b)).toBe(out); // aliases the first input
    expectCoefficients(out, [2, 1, 0, 0]);
    expect(out.mul(out, b)).toBe(out); // truncated (2+h)(3-2h+h^2)
    expectCoefficients(out, [6, -1, 0, 1]);

    const repeat = new EshkolTaylorJet(3).mul(a, b);
    const coefficients = new Float64Array(4);
    repeat.writeCoefficients(coefficients);
    expect([...coefficients]).toEqual([6, -1, 0, 1]);
  });

  test('reciprocal and division implement formal-series inversion without domain hiding', () => {
    const x = new EshkolTaylorJet(4).setVariable(2);
    const inverse = new EshkolTaylorJet(4).reciprocal(x);
    expectCoefficients(inverse, [1 / 2, -1 / 4, 1 / 8, -1 / 16, 1 / 32]);

    const quotient = new EshkolTaylorJet(4).div(x, x);
    expectCoefficients(quotient, [1, 0, 0, 0, 0]);
    expect(() => inverse.reciprocal(new EshkolTaylorJet(4))).toThrow();
  });

  test('exp and log recurrences round-trip a positive jet', () => {
    const x = new EshkolTaylorJet(6).setVariable(0);
    const exponential = new EshkolTaylorJet(6).exp(x);
    expectCoefficients(exponential, [1, 1, 1 / 2, 1 / 6, 1 / 24, 1 / 120, 1 / 720]);

    const roundTrip = new EshkolTaylorJet(6).log(exponential);
    expectCoefficients(roundTrip, [0, 1, 0, 0, 0, 0, 0]);
    expect(() => roundTrip.log(new EshkolTaylorJet(6).setConstant(0))).toThrow();
    expect(() => roundTrip.log(new EshkolTaylorJet(6).setConstant(-1))).toThrow();
  });

  test('sin and cos advance coupled recurrences and remain alias safe', () => {
    const x = new EshkolTaylorJet(7).setVariable(0);
    const sine = new EshkolTaylorJet(7).sin(x);
    const cosine = new EshkolTaylorJet(7).cos(x);
    expectCoefficients(sine, [0, 1, 0, -1 / 6, 0, 1 / 120, 0, -1 / 5040]);
    expectCoefficients(cosine, [1, 0, -1 / 2, 0, 1 / 24, 0, -1 / 720, 0]);

    x.sin(x);
    expectCoefficients(x, [0, 1, 0, -1 / 6, 0, 1 / 120, 0, -1 / 5040]);
  });

  test('tanh produces the known Maclaurin tower', () => {
    const x = new EshkolTaylorJet(7).setVariable(0);
    const result = new EshkolTaylorJet(7).tanh(x);
    expectCoefficients(result, [0, 1, 0, -1 / 3, 0, 2 / 15, 0, -17 / 315]);
  });

  test('integer powers support positive, zero, and negative exponents', () => {
    const onePlusX = new EshkolTaylorJet(5).setVariable(1);
    const inverseSquare = new EshkolTaylorJet(5).powInteger(onePlusX, -2);
    // (1+h)^-2 = 1 - 2h + 3h^2 - 4h^3 + ...
    expectCoefficients(inverseSquare, [1, -2, 3, -4, 5, -6]);

    expectCoefficients(new EshkolTaylorJet(5).powInteger(onePlusX, 0), [1, 0, 0, 0, 0, 0]);
    const zeroBased = new EshkolTaylorJet(5).setVariable(0);
    expectCoefficients(new EshkolTaylorJet(5).powInteger(zeroBased, 3), [0, 0, 0, 1, 0, 0]);
    expect(() => inverseSquare.powInteger(zeroBased, -1)).toThrow();
    expect(() => inverseSquare.powInteger(onePlusX, 0.5)).toThrow();
  });

  test('a small predictive policy composes operations and returns a finite curvature forecast', () => {
    // policy(h) = tanh(log(exp(0.4 + 0.2h)) + (1 + h)^-1)
    const state = new EshkolTaylorJet(4).setVariable(0.4, 0.2);
    const expState = new EshkolTaylorJet(4).exp(state);
    const recovered = new EshkolTaylorJet(4).log(expState);
    const horizon = new EshkolTaylorJet(4).setVariable(1);
    const discount = new EshkolTaylorJet(4).reciprocal(horizon);
    const drive = new EshkolTaylorJet(4).add(recovered, discount);
    const policy = new EshkolTaylorJet(4).tanh(drive);

    expect(Number.isFinite(policy.value)).toBe(true);
    expect(Number.isFinite(policy.derivative(1))).toBe(true);
    expect(Number.isFinite(policy.derivative(2))).toBe(true);
    expect(Number.isFinite(policy.evaluate(0.1))).toBe(true);
    expect(policy.value).toBeCloseTo(Math.tanh(1.4), 12);
  });

  test('overflowing recurrence and evaluation results fail explicitly', () => {
    const huge = new EshkolTaylorJet(2).setConstant(400);
    expect(() => new EshkolTaylorJet(2).exp(huge)).toThrow();

    const polynomial = new EshkolTaylorJet(2).setCoefficients([0, 0, 1]);
    expect(() => polynomial.evaluate(ESHKOL_TAYLOR_COEFFICIENT_BOUND)).toThrow();
  });
});
