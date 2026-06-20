/**
 * Golden tests: classical-contrast (real avalanche mixer + Shannon entropy +
 * classical-vs-quantum contrast) and perceptron-baseline (real 1-hidden-layer
 * ReLU MLP with backprop that actually learns).
 */
import { describe, expect, test } from 'bun:test';
import {
  mixFast,
  classicalShannonEntropy,
  classicalEntropyGap,
  classicalQuantumContrast,
} from '../src/sim/classical-contrast';
import { mlpNew, mlpForward, mlpTrainStep, perceptronTag } from '../src/sim/perceptron-baseline';

describe('classical-contrast: real mixer + entropy', () => {
  test('Murmur3 avalanche is deterministic and diffuses', () => {
    expect(mixFast(0)).toBe(mixFast(0));
    expect(mixFast(1)).not.toBe(mixFast(2));
    expect(mixFast(0)).not.toBe(0);
  });

  test('Shannon entropy is high for the mixed LCG and in [0,1]', () => {
    const h = classicalShannonEntropy(12345, 256);
    expect(h).toBeGreaterThan(0.7);
    expect(h).toBeLessThanOrEqual(1);
    expect(classicalEntropyGap(12345, 256)).toBeCloseTo(1 - h, 9);
  });

  test('contrast > 0.5 when the quantum source is more uniform', () => {
    const c = classicalShannonEntropy(7, 256);
    expect(classicalQuantumContrast(7, 256, Math.min(1, c + 0.2))).toBeGreaterThan(0.5);
    expect(classicalQuantumContrast(7, 256, Math.max(0, c - 0.2))).toBeLessThan(0.5);
  });
});

describe('perceptron-baseline: real ReLU MLP learns by backprop', () => {
  test('forward output is a probability in (0,1)', () => {
    const net = mlpNew(3, 4);
    net.w1.fill(0.1);
    net.w2.fill(0.1);
    net.b1.fill(0.1);
    const y = mlpForward(net, [1, 0, 1]).y;
    expect(y > 0 && y < 1).toBe(true);
  });

  test('training drives the output toward the target (gradient actually flows)', () => {
    const net = mlpNew(3, 4);
    net.w1.fill(0.1);
    net.w2.fill(0.1);
    net.b1.fill(0.1);
    const x = [1, 0, 1];
    const target = 0.9;
    const y0 = mlpForward(net, x).y;
    for (let i = 0; i < 500; i++) mlpTrainStep(net, x, target, 0.1);
    const y1 = mlpForward(net, x).y;
    expect(Math.abs(y1 - target)).toBeLessThan(Math.abs(y0 - target));
    expect(Math.abs(y1 - target)).toBeLessThan(0.05);
  });

  test('perceptronTag is a proper logistic in (0,1)', () => {
    const w = new Float32Array([0.5, -0.5, 0.5]);
    const x = new Float32Array([1, 1, 1]);
    const t = perceptronTag(w, x, 3);
    expect(t > 0 && t < 1).toBe(true);
  });
});
