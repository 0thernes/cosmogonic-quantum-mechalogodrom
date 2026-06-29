/**
 * Determinism test for the 4 modules wired into driveSuper (V-APEX, V-BREED, V-SELFEVO, V-BEDAU).
 *
 * The existing golden test (determinism.test.ts) only covers EntityManager.update — it does NOT
 * exercise driveSuper, ApexBrain.tick, breedAt, SelfEvolutionLoop.step, or bedauPackardActivity.
 * This test verifies that each of these modules is bit-for-bit deterministic from the same seed,
 * and that different seeds produce different outputs (the test is sensitive, not vacuous).
 *
 * Together with determinism-law.test.ts (which scans for banned Math.random/Date.now calls),
 * this closes the determinism gap identified in the 7th-pass audit.
 */
import { describe, expect, test } from 'bun:test';
import { ApexBrain, type ApexPercept } from '../src/sim/apex-brain';
import { breedAt, PANTHEON_TOTAL } from '../src/sim/pantheon-breeding';
import { SelfEvolutionLoop, type EvolutionMetrics } from '../src/sim/self-evolution-loop';
import { shannonDiversity, bedauPackardActivity } from '../src/sim/open-endedness';
import { mulberry32 } from '../src/math/rng';

const PERCEPT: ApexPercept = {
  threat: 0.3,
  energy: 0.7,
  chaos: 0.4,
  novelty: 0.2,
  level: 50,
};

const BASE_METRICS: EvolutionMetrics = {
  fitness: 0.5,
  emergence: 0.3,
  complexity: 100,
  consciousness: 0.2,
  stability: 0.8,
};

describe('V-APEX: ApexBrain.tick determinism', () => {
  test('bit-for-bit deterministic across identical seeds + inputs (300 ticks)', () => {
    const a = new ApexBrain(0xabcdef);
    const b = new ApexBrain(0xabcdef);
    const traceA: number[] = [];
    const traceB: number[] = [];
    for (let t = 0; t < 300; t++) {
      const ta = a.tick(PERCEPT);
      const tb = b.tick(PERCEPT);
      traceA.push(ta.vitality, ta.agony, ta.transcendence, ta.simulation);
      traceB.push(tb.vitality, tb.agony, tb.transcendence, tb.simulation);
    }
    expect(traceB).toEqual(traceA);
  });

  test('different seed diverges', () => {
    const a = new ApexBrain(0xabcdef);
    const b = new ApexBrain(0x12345678);
    const traceA: number[] = [];
    const traceB: number[] = [];
    for (let t = 0; t < 50; t++) {
      const ta = a.tick(PERCEPT);
      const tb = b.tick(PERCEPT);
      traceA.push(ta.vitality, ta.agony, ta.transcendence);
      traceB.push(tb.vitality, tb.agony, tb.transcendence);
    }
    expect(traceB).not.toEqual(traceA);
  });

  test('snapshot is deterministic after 300 ticks', () => {
    const a = new ApexBrain(0x999);
    const b = new ApexBrain(0x999);
    for (let t = 0; t < 300; t++) {
      a.tick(PERCEPT);
      b.tick(PERCEPT);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });
});

describe('V-BREED: breedAt determinism', () => {
  test('same (i, j, nonce) → identical BabyGenome', () => {
    for (let nonce = 0; nonce < 20; nonce++) {
      const i = (nonce * 7 + 3) % PANTHEON_TOTAL;
      let j = (nonce * 13 + 17) % PANTHEON_TOTAL;
      if (j === i) j = (j + 1) % PANTHEON_TOTAL;
      const a = breedAt(i, j, nonce);
      const b = breedAt(i, j, nonce);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  test('different nonce → different child (sensitivity)', () => {
    const a = breedAt(3, 17, 0);
    const b = breedAt(3, 17, 1);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  test('self-fertilization guard: i===j never occurs with the guard', () => {
    // Simulate the exact driveSuper breeding logic for 200 nonces
    for (let nonce = 0; nonce < 200; nonce++) {
      const i = (nonce * 7 + 3) % PANTHEON_TOTAL;
      let j = (nonce * 13 + 17) % PANTHEON_TOTAL;
      if (j === i) j = (j + 1) % PANTHEON_TOTAL;
      expect(i).not.toBe(j);
    }
  });
});

describe('V-SELFEVO: SelfEvolutionLoop.step determinism', () => {
  test('bit-for-bit deterministic across 50 steps with same seed', () => {
    const loopA = new SelfEvolutionLoop(BASE_METRICS, {
      mutationRate: 1.0,
      innovationRate: 0.0,
      minImprovement: -1,
      maxAutoRisk: 1.0,
      rollbackThreshold: 0.0,
      maxComplexity: 1e6,
    });
    const loopB = new SelfEvolutionLoop(BASE_METRICS, {
      mutationRate: 1.0,
      innovationRate: 0.0,
      minImprovement: -1,
      maxAutoRisk: 1.0,
      rollbackThreshold: 0.0,
      maxComplexity: 1e6,
    });
    const rngA = mulberry32(0xc0ffee42 >>> 0);
    const rngB = mulberry32(0xc0ffee42 >>> 0);
    const traceA: number[] = [];
    const traceB: number[] = [];
    for (let s = 0; s < 50; s++) {
      const ra = loopA.step(rngA);
      const rb = loopB.step(rngB);
      traceA.push(ra ? 1 : 0, loopA.score, loopA.generationCount);
      traceB.push(rb ? 1 : 0, loopB.score, loopB.generationCount);
    }
    expect(traceB).toEqual(traceA);
  });

  test('different seed → different trajectory', () => {
    const loopA = new SelfEvolutionLoop(BASE_METRICS, {
      mutationRate: 1.0,
      innovationRate: 0.0,
      minImprovement: -1,
      maxAutoRisk: 1.0,
      rollbackThreshold: 0.0,
      maxComplexity: 1e6,
    });
    const loopB = new SelfEvolutionLoop(BASE_METRICS, {
      mutationRate: 1.0,
      innovationRate: 0.0,
      minImprovement: -1,
      maxAutoRisk: 1.0,
      rollbackThreshold: 0.0,
      maxComplexity: 1e6,
    });
    const rngA = mulberry32(0xc0ffee42 >>> 0);
    const rngB = mulberry32(0xdeadbeef >>> 0);
    for (let s = 0; s < 50; s++) {
      loopA.step(rngA);
      loopB.step(rngB);
    }
    // With different seeds, the scores should diverge (very high probability)
    expect(loopA.score).not.toBe(loopB.score);
  });
});

describe('V-BEDAU: shannonDiversity + bedauPackardActivity determinism', () => {
  test('shannonDiversity is pure (same input → same output)', () => {
    const counts = [3, 5, 2, 0, 7, 1];
    const a = shannonDiversity(counts);
    const b = shannonDiversity(counts);
    expect(a).toBe(b);
  });

  test('bedauPackardActivity is pure (same input → same output)', () => {
    const snapshots: number[] = [];
    for (let i = 0; i < 20; i++) snapshots.push(0.5 + i * 0.03);
    const a = bedauPackardActivity(snapshots, 8);
    const b = bedauPackardActivity(snapshots, 8);
    expect(a).toBe(b);
  });

  test('bedauPackardActivity returns 0 for insufficient history (< window+1)', () => {
    expect(bedauPackardActivity([0.5, 0.6], 8)).toBe(0);
  });

  test('bedauPackardActivity returns non-zero for sufficient rising history', () => {
    const snapshots: number[] = [];
    for (let i = 0; i < 20; i++) snapshots.push(0.5 + i * 0.05);
    expect(bedauPackardActivity(snapshots, 8)).toBeGreaterThan(0);
  });

  test('full V-BEDAU pipeline: 40 diversity snapshots → deterministic activity', () => {
    // Simulate the driveSuper V-BEDAU pipeline: accumulate diversity snapshots
    // over 40 epochs (12000 frames at 300f cadence) and verify determinism.
    const snapshotsA: number[] = [];
    const snapshotsB: number[] = [];
    // Deterministic morphotype counts (simulating entity distribution)
    for (let epoch = 0; epoch < 40; epoch++) {
      const morphCounts = Array.from({ length: 26 }, (_, k) => {
        // Deterministic count: varies by epoch + morphotype
        return Math.floor(10 + 5 * Math.sin(epoch * 0.3 + k * 0.7) + 3 * Math.cos(epoch * 0.2));
      });
      const divA = shannonDiversity(morphCounts);
      const divB = shannonDiversity(morphCounts);
      snapshotsA.push(divA);
      snapshotsB.push(divB);
      if (snapshotsA.length > 32) snapshotsA.shift();
      if (snapshotsB.length > 32) snapshotsB.shift();
    }
    const activityA = bedauPackardActivity(snapshotsA, 8);
    const activityB = bedauPackardActivity(snapshotsB, 8);
    expect(activityA).toBe(activityB);
    expect(activityA).toBeGreaterThanOrEqual(0);
    expect(activityA).toBeLessThanOrEqual(1);
  });
});
