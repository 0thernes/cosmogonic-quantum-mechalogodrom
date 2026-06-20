/**
 * Corpus leaf ports — logo-lab, asteroids, classical_rng, simple_mnist, audit receipts.
 */
import { describe, expect, test } from 'bun:test';
import { logoMorphScalar, logoSymmetryOrder, turtleNew } from '../src/sim/logo-turtle';
import {
  asteroidEnergy,
  asteroidSpawn,
  asteroidStep,
  asteroidThrust,
} from '../src/sim/asteroids-physics';
import { classicalEntropyGap, classicalSample } from '../src/sim/classical-contrast';
import { perceptronTag } from '../src/sim/perceptron-baseline';
import {
  TSOTCHKE_ESK_COUNT,
  TSOTCHKE_FILE_COUNT,
  TSOTCHKE_MIRROR_REPO_COUNT,
  auditWiringReceipt,
} from '../src/sim/corpus-audit-receipts';

describe('logo-turtle (logo-lab port)', () => {
  test('morph scalar stays bounded', () => {
    const t = turtleNew(42);
    const m = logoMorphScalar(t, 10, 6);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(1);
    expect(logoSymmetryOrder(t, 8)).toBeGreaterThanOrEqual(1);
  });
});

describe('asteroids-physics port', () => {
  test('thrust raises kinetic energy', () => {
    const b = asteroidSpawn(7);
    const e0 = asteroidEnergy(b);
    asteroidThrust(b, 0.5);
    asteroidStep(b, 1);
    expect(asteroidEnergy(b)).toBeGreaterThanOrEqual(e0);
  });
});

describe('classical-contrast port', () => {
  test('LCG is deterministic', () => {
    const a = classicalSample(12345);
    const b = classicalSample(12345);
    expect(a.value).toBe(b.value);
    expect(classicalEntropyGap(99, 8)).toBe(classicalEntropyGap(99, 8));
  });
});

describe('perceptron-baseline (simple_mnist port)', () => {
  test('tag is bounded', () => {
    const w = new Float32Array([0.5, -0.2, 0.1, 0.3]);
    const x = new Float32Array([1, 0.5, 0.2, 0.8]);
    const t = perceptronTag(w, x, 4);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(1);
  });
});

describe('corpus audit receipts', () => {
  test('audit census matches deep-dive CSV', () => {
    expect(TSOTCHKE_FILE_COUNT).toBe(12444);
    expect(TSOTCHKE_ESK_COUNT).toBe(721);
    expect(TSOTCHKE_MIRROR_REPO_COUNT).toBe(20);
    expect(auditWiringReceipt(17)).toBeGreaterThan(0.8);
  });
});
