/**
 * CLASSICAL CONTRAST — genuine classical-LCG vs quantum-inspired-Eshkol-QRNG contrast.
 *
 * Falsifiable claims under test:
 *   • the contrast metric (and its components) is finite and bounded in [0,1];
 *   • both real streams pass a basic uniformity sanity check (near-zero serial correlation, χ² near 1);
 *   • deterministic: identical seed ⇒ identical contrast report;
 *   • the metric SEPARATES a deliberately-bad (constant) stream from a good one;
 *   • the preserved LCG contracts (classicalSample / classicalEntropyGap) still replay.
 */
import { describe, expect, test } from 'bun:test';
import {
  mixFast,
  classicalShannonEntropy,
  classicalEntropyGap,
  classicalQuantumContrast,
  classicalSample,
  contrastVsStream,
  randomnessSignature,
  rngContrast,
} from '../src/sim/classical-contrast';
import { mlpNew, mlpForward, mlpTrainStep, perceptronTag } from '../src/sim/perceptron-baseline';

describe('classical-contrast: genuine quantum-vs-classical contrast', () => {
  test('contrast and its components are finite and bounded in [0,1]', () => {
    for (const seed of [1, 42, 1337, 0xabcdef]) {
      const c = rngContrast(seed, 256);
      for (const v of [c.contrast, c.serialGap, c.uniformityGap]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(c.classical.chiSquareRatio)).toBe(true);
      expect(Number.isFinite(c.quantum.chiSquareRatio)).toBe(true);
    }
  });

  test('both real streams pass a basic uniformity sanity check', () => {
    // A decent sample count keeps the statistics stable.
    const c = rngContrast(20260620, 1024);
    for (const sig of [c.classical, c.quantum]) {
      // Independent-ish samples: lag-1 serial correlation near 0.
      expect(Math.abs(sig.serialCorrelation)).toBeLessThan(0.2);
      // Roughly uniform: χ²/(K−1) within a generous band around the ideal 1.
      expect(sig.chiSquareRatio).toBeGreaterThan(0.2);
      expect(sig.chiSquareRatio).toBeLessThan(3);
    }
    // Two good generators are not wildly different.
    expect(c.contrast).toBeLessThan(0.5);
  });

  test('deterministic: same seed ⇒ identical contrast report', () => {
    const a = rngContrast(777, 256);
    const b = rngContrast(777, 256);
    expect(a.contrast).toBe(b.contrast);
    expect(a.serialGap).toBe(b.serialGap);
    expect(a.uniformityGap).toBe(b.uniformityGap);
    expect(a.classical.serialCorrelation).toBe(b.classical.serialCorrelation);
    expect(a.quantum.chiSquareRatio).toBe(b.quantum.chiSquareRatio);
  });

  test('the metric distinguishes a deliberately-bad (constant) stream from a good one', () => {
    const n = 512;
    const constant: number[] = Array.from({ length: n }, () => 0.5); // zero variance, one χ² bin
    const badSig = randomnessSignature(constant);
    // A constant stream is maximally degenerate: serial correlation reported as 1, χ² maximal.
    expect(badSig.serialCorrelation).toBe(1);
    expect(badSig.chiSquareRatio).toBeGreaterThan(5);

    const badContrast = contrastVsStream(constant, 12345).contrast;
    // A good comparison stream (the same Eshkol reference vs itself's seed) is far less contrasted.
    const goodContrast = rngContrast(12345, n).contrast;
    expect(badContrast).toBeGreaterThan(goodContrast);
    expect(badContrast).toBeGreaterThan(0.4);
  });

  test('preserved LCG contracts still replay deterministically', () => {
    const a = classicalSample(12345);
    const b = classicalSample(12345);
    expect(a.value).toBe(b.value);
    expect(classicalEntropyGap(99, 8)).toBe(classicalEntropyGap(99, 8));
  });
});

describe('classical-contrast: real mixer + entropy', () => {
  test('Murmur3 avalanche is deterministic and diffuses', () => {
    expect(mixFast(123)).toBe(mixFast(123)); // deterministic
    expect(mixFast(1)).not.toBe(mixFast(2)); // distinct inputs diverge
    expect(mixFast(123)).not.toBe(123); // a nonzero input is diffused (fmix32(0)=0 by design)
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
