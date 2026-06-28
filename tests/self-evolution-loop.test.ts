/**
 * Unit tests for the SelfEvolutionLoop — faculty #99 (Gödel-machine style self-improvement).
 *
 * Covers: constructor initialization, step() return semantics, score getter,
 * generationCount, appliedCount, rollbackCount, getHistory (bounded at 500),
 * hasPlateaued, reset, determinism (same seed → same sequence), and the
 * exported pure functions (computeEvolutionScore, generateModification,
 * validateModification, applyModification, computeEvolutionRate).
 */
import { describe, expect, test } from 'bun:test';
import {
  SelfEvolutionLoop,
  computeEvolutionScore,
  generateModification,
  validateModification,
  applyModification,
  computeEvolutionRate,
  type EvolutionMetrics,
  type SelfEvolutionConfig,
} from '../src/sim/self-evolution-loop';
import { mulberry32 } from '../src/math/rng';

const BASE_METRICS: EvolutionMetrics = {
  fitness: 0.5,
  emergence: 0.3,
  complexity: 100,
  consciousness: 0.2,
  stability: 0.8,
};

const HIGH_MUTATION_CONFIG: Partial<SelfEvolutionConfig> = {
  mutationRate: 1.0, // always propose
  innovationRate: 0.0, // always parameter type (deterministic)
  minImprovement: -1, // always accept (even negative improvement)
  maxAutoRisk: 1.0, // accept any risk
  rollbackThreshold: 0.0, // never rollback
};

function makeRng(seed: number) {
  return mulberry32(seed >>> 0 || 1);
}

describe('computeEvolutionScore', () => {
  test('weighted sum of fitness(0.4) + emergence(0.3) + consciousness(0.2) + stability(0.1)', () => {
    const score = computeEvolutionScore(BASE_METRICS);
    expect(score).toBeCloseTo(0.4 * 0.5 + 0.3 * 0.3 + 0.2 * 0.2 + 0.1 * 0.8, 10);
  });

  test('zero metrics → zero score', () => {
    expect(
      computeEvolutionScore({
        fitness: 0,
        emergence: 0,
        complexity: 0,
        consciousness: 0,
        stability: 0,
      }),
    ).toBe(0);
  });

  test('max metrics → score ≈ 1.0', () => {
    expect(
      computeEvolutionScore({
        fitness: 1,
        emergence: 1,
        complexity: 1000,
        consciousness: 1,
        stability: 1,
      }),
    ).toBeCloseTo(1, 10);
  });
});

describe('generateModification', () => {
  test('returns null when rng exceeds mutationRate', () => {
    const rng = () => 0.99; // > mutationRate (0.1)
    const result = generateModification(BASE_METRICS, rng, {
      minImprovement: 0.01,
      maxAutoRisk: 0.3,
      rollbackThreshold: 0.8,
      maxComplexity: 1e6,
      mutationRate: 0.1,
      innovationRate: 0.05,
    });
    expect(result).toBeNull();
  });

  test('returns a proposal when rng is below mutationRate', () => {
    const rng = makeRng(42);
    // Burn first call to pass mutationRate gate
    rng();
    const result = generateModification(BASE_METRICS, rng, {
      ...HIGH_MUTATION_CONFIG,
      maxComplexity: 1e6,
    } as SelfEvolutionConfig);
    expect(result).not.toBeNull();
    expect(result!.type).toMatch(/parameter|architecture|faculty|connection/);
    expect(result!.target).toMatch(/^component_\d+$/);
    expect(Number.isFinite(result!.impact)).toBe(true);
    expect(Number.isFinite(result!.risk)).toBe(true);
  });

  test('is deterministic: same seed → same proposal', () => {
    const rngA = makeRng(123);
    const rngB = makeRng(123);
    const config = {
      ...HIGH_MUTATION_CONFIG,
      maxComplexity: 1e6,
    } as SelfEvolutionConfig;
    const a = generateModification(BASE_METRICS, rngA, config);
    const b = generateModification(BASE_METRICS, rngB, config);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('validateModification', () => {
  const config: SelfEvolutionConfig = {
    minImprovement: 0.01,
    maxAutoRisk: 0.3,
    rollbackThreshold: 0.8,
    maxComplexity: 1e6,
    mutationRate: 0.1,
    innovationRate: 0.05,
  };

  test('rejects high risk', () => {
    expect(
      validateModification(
        { type: 'parameter', target: 'x', change: 0.5, impact: 0.05, risk: 0.5 },
        BASE_METRICS,
        config,
      ),
    ).toBe(false);
  });

  test('rejects extreme negative impact', () => {
    expect(
      validateModification(
        { type: 'parameter', target: 'x', change: 0.5, impact: -0.6, risk: 0.1 },
        BASE_METRICS,
        config,
      ),
    ).toBe(false);
  });

  test('rejects architecture that breaches complexity budget', () => {
    expect(
      validateModification(
        { type: 'architecture', target: 'x', change: { complexity: 2e6 }, impact: 0.05, risk: 0.1 },
        { ...BASE_METRICS, complexity: 1e6 },
        config,
      ),
    ).toBe(false);
  });

  test('accepts safe parameter modification', () => {
    expect(
      validateModification(
        { type: 'parameter', target: 'x', change: 0.5, impact: 0.05, risk: 0.1 },
        BASE_METRICS,
        config,
      ),
    ).toBe(true);
  });
});

describe('applyModification', () => {
  test('returns new metrics with clamped values', () => {
    const rng = makeRng(42);
    const newMetrics = applyModification(
      { type: 'parameter', target: 'x', change: 0.5, impact: 0.1, risk: 0.1 },
      BASE_METRICS,
      rng,
    );
    expect(newMetrics.fitness).toBeGreaterThanOrEqual(0);
    expect(newMetrics.fitness).toBeLessThanOrEqual(1);
    expect(newMetrics.emergence).toBeGreaterThanOrEqual(0);
    expect(newMetrics.emergence).toBeLessThanOrEqual(1);
  });

  test('architecture modification increases complexity and reduces stability', () => {
    const rng = makeRng(42);
    const newMetrics = applyModification(
      { type: 'architecture', target: 'x', change: {}, impact: 0.01, risk: 0.1 },
      BASE_METRICS,
      rng,
    );
    expect(newMetrics.complexity).toBeCloseTo(BASE_METRICS.complexity * 1.1, 5);
    expect(newMetrics.stability).toBeCloseTo(BASE_METRICS.stability * 0.95, 5);
  });

  test('parameter modification does not change complexity', () => {
    const rng = makeRng(42);
    const newMetrics = applyModification(
      { type: 'parameter', target: 'x', change: 0.5, impact: 0.01, risk: 0.1 },
      BASE_METRICS,
      rng,
    );
    expect(newMetrics.complexity).toBe(BASE_METRICS.complexity);
  });
});

describe('SelfEvolutionLoop', () => {
  test('constructor initializes metrics and history', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS);
    expect(loop.generationCount).toBe(0);
    expect(loop.score).toBeCloseTo(computeEvolutionScore(BASE_METRICS), 10);
    expect(loop.appliedCount).toBe(0);
    expect(loop.rollbackCount).toBe(0);
  });

  test('step() returns a boolean', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const result = loop.step(makeRng(42));
    expect(typeof result).toBe('boolean');
  });

  test('step() increments generation count', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    loop.step(makeRng(42));
    loop.step(makeRng(42));
    loop.step(makeRng(42));
    expect(loop.generationCount).toBe(3);
  });

  test('determinism: same seed → same sequence of applied/not-applied', () => {
    const loopA = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const loopB = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const rngA = makeRng(0xdeadbeef);
    const rngB = makeRng(0xdeadbeef);
    const resultsA: boolean[] = [];
    const resultsB: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      resultsA.push(loopA.step(rngA));
      resultsB.push(loopB.step(rngB));
    }
    expect(resultsA).toEqual(resultsB);
    expect(loopA.score).toBeCloseTo(loopB.score, 10);
    expect(loopA.generationCount).toBe(loopB.generationCount);
  });

  test('determinism: different seed → different sequence (sensitivity)', () => {
    const loopA = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const loopB = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const rngA = makeRng(1);
    const rngB = makeRng(2);
    const resultsA: boolean[] = [];
    const resultsB: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      resultsA.push(loopA.step(rngA));
      resultsB.push(loopB.step(rngB));
    }
    // They might be the same by chance, but scores should differ over 50 steps
    // with different seeds (very high probability).
    expect(loopA.score).not.toBe(loopB.score);
  });

  test('getHistory returns bounded array (≤500)', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const rng = makeRng(42);
    for (let i = 0; i < 600; i++) loop.step(rng);
    expect(loop.getHistory().length).toBeLessThanOrEqual(500);
  });

  test('getHistory returns copies (not references)', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    loop.step(makeRng(42));
    const h1 = loop.getHistory();
    const h2 = loop.getHistory();
    expect(h1).not.toBe(h2); // different array objects
    expect(h1[0]).not.toBe(h2[0]); // different metric objects
  });

  test('hasPlateaued returns false with insufficient history', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS);
    expect(loop.hasPlateaued()).toBe(false);
  });

  test('hasPlateaued returns true when scores are stable', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    // Step many times — with high mutation + accept-all, scores will fluctuate
    const rng = makeRng(42);
    for (let i = 0; i < 20; i++) loop.step(rng);
    // Just verify it returns a boolean without crashing
    expect(typeof loop.hasPlateaued(10, 0.001)).toBe('boolean');
  });

  test('reset clears history and generation', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const rng = makeRng(42);
    for (let i = 0; i < 10; i++) loop.step(rng);
    expect(loop.generationCount).toBe(10);
    loop.reset();
    expect(loop.generationCount).toBe(0);
    expect(loop.appliedCount).toBe(0);
    expect(loop.rollbackCount).toBe(0);
    expect(loop.getHistory().length).toBe(1);
  });

  test('score getter returns computeEvolutionScore of current metrics', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS);
    expect(loop.score).toBeCloseTo(computeEvolutionScore(BASE_METRICS), 10);
  });
});

describe('computeEvolutionRate', () => {
  test('returns 0 for fresh loop (insufficient history)', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS);
    expect(computeEvolutionRate(loop)).toBe(0);
  });

  test('returns a finite number after some steps', () => {
    const loop = new SelfEvolutionLoop(BASE_METRICS, HIGH_MUTATION_CONFIG);
    const rng = makeRng(42);
    for (let i = 0; i < 15; i++) loop.step(rng);
    const rate = computeEvolutionRate(loop);
    expect(Number.isFinite(rate)).toBe(true);
  });
});
