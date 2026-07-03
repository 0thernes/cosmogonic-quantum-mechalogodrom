import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  ConsciousnessKernel,
  COUPLING,
  FRAMEWORK_COUNT,
  FRAMEWORK_IDS,
  FRAMEWORKS,
  synergyBlend,
  type FrameworkSignals,
} from '../src/sim/consciousness-kernel';

/** A deterministic pseudo-signal bag from a seeded rng (all ten fields populated). */
function randomSignals(rng: () => number): FrameworkSignals {
  return {
    butlinCoverage: rng(),
    thalerFraction: rng(),
    phi: rng(),
    partitionLoss: rng(),
    freeEnergyDescent: rng(),
    attentionSchemaAccuracy: rng(),
    fieldCoherence: rng(),
    ualDepth: rng(),
    sensorimotorMastery: rng(),
    projectiveFrame: rng(),
    streamCompetition: rng(),
  };
}

describe('consciousness-kernel: metadata & provenance', () => {
  test('exactly ten frameworks, each with a real source anchor and a falsifier', () => {
    expect(FRAMEWORK_COUNT).toBe(10);
    expect(FRAMEWORK_IDS.length).toBe(10);
    for (const id of FRAMEWORK_IDS) {
      const meta = FRAMEWORKS[id];
      expect(meta.source.length).toBeGreaterThan(8);
      expect(meta.falsifier.length).toBeGreaterThan(8);
      expect(meta.weirdness).toBeGreaterThanOrEqual(1);
      expect(meta.weirdness).toBeLessThanOrEqual(10);
    }
  });

  test('coupling matrix is 10x10 and every framework both reads and is read (no isolated node)', () => {
    expect(COUPLING.length).toBe(FRAMEWORK_COUNT * FRAMEWORK_COUNT);
    for (let i = 0; i < FRAMEWORK_COUNT; i++) {
      let rowSum = 0;
      let colSum = 0;
      for (let j = 0; j < FRAMEWORK_COUNT; j++) {
        rowSum += Math.abs(COUPLING[i * FRAMEWORK_COUNT + j] ?? 0);
        colSum += Math.abs(COUPLING[j * FRAMEWORK_COUNT + i] ?? 0);
      }
      // every framework READS at least one other (rowSum>0) and is READ by at least one (colSum>0):
      // the repo law "every system reads AND writes another system".
      expect(rowSum).toBeGreaterThan(0);
      expect(colSum).toBeGreaterThan(0);
      // no self-coupling on the diagonal.
      expect(COUPLING[i * FRAMEWORK_COUNT + i] ?? 0).toBe(0);
    }
  });
});

describe('consciousness-kernel: synergy blend', () => {
  test('all coupled scores and the index stay in [0,1] for arbitrary signals', () => {
    const rng = mulberry32(7);
    for (let trial = 0; trial < 200; trial++) {
      const r = synergyBlend(randomSignals(rng));
      expect(r.index).toBeGreaterThanOrEqual(0);
      expect(r.index).toBeLessThanOrEqual(1);
      for (const c of r.coupled) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
      expect(r.convergence).toBeGreaterThanOrEqual(0);
      expect(r.convergence).toBeLessThanOrEqual(1);
    }
  });

  test('absent frameworks (undefined signals) do not count toward the active set', () => {
    const r = synergyBlend({ phi: 0.5 });
    expect(r.activeCount).toBe(1);
    // only iit4 (index 2) is present.
    expect(r.present[2]).toBe(true);
    expect(r.present[0]).toBe(false);
    expect(r.present[9]).toBe(false);
  });

  test('emergence > 0 when frameworks are jointly high (coupling > count, not a mean)', () => {
    const high: FrameworkSignals = {
      butlinCoverage: 0.6,
      thalerFraction: 0.6,
      phi: 0.6,
      freeEnergyDescent: 0.6,
      attentionSchemaAccuracy: 0.6,
      fieldCoherence: 0.6,
      ualDepth: 0.6,
      sensorimotorMastery: 0.6,
      projectiveFrame: 0.6,
      streamCompetition: 0.6,
    };
    const r = synergyBlend(high);
    expect(r.activeCount).toBe(10);
    // positive coupling amplifies a jointly-high state above its own independent mean.
    expect(r.index).toBeGreaterThan(r.independentMean);
    expect(r.emergence).toBeGreaterThan(0);
  });

  test('a single isolated-high framework is NOT amplified into a high index (no free lunch)', () => {
    const r = synergyBlend({ phi: 0.9 });
    // one framework alone cannot manufacture a high blended index across the whole stack.
    expect(r.index).toBeLessThan(0.9);
  });
});

describe('consciousness-kernel: determinism & snapshot', () => {
  test('same seed + same signal stream reproduce the index trace and events bit-for-bit', () => {
    const streamRng = mulberry32(123);
    const stream: FrameworkSignals[] = [];
    for (let t = 0; t < 120; t++) stream.push(randomSignals(streamRng));
    const a = new ConsciousnessKernel(42);
    const b = new ConsciousnessKernel(42);
    const ia: number[] = [];
    const ib: number[] = [];
    for (const s of stream) {
      a.ingest(s);
      b.ingest(s);
      ia.push(a.index);
      ib.push(b.index);
    }
    expect(ia).toEqual(ib);
    expect(a.eventCount).toBe(b.eventCount);
  });

  test('buildSnapshot exposes ten frameworks, valid statuses, and the indicator-only claim', () => {
    const k = new ConsciousnessKernel(5);
    const rng = mulberry32(9);
    for (let t = 0; t < 40; t++) k.ingest(randomSignals(rng));
    const snap = k.buildSnapshot('apex-0', 'apex', 5);
    expect(snap.claim).toBe('indicatorOnly');
    expect(snap.frameworks.length).toBe(10);
    const statuses = new Set(['absent', 'structural', 'partial', 'met', 'loadBearing']);
    for (const f of snap.frameworks) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(1);
      expect(statuses.has(f.status)).toBe(true);
      expect(f.codeReceipt).toBe('src/sim/consciousness-kernel.ts');
      expect(f.sourceReceipt.length).toBeGreaterThan(8);
    }
  });

  test('a framework whose signal is absent reports status "absent" (never inflated)', () => {
    const k = new ConsciousnessKernel(1);
    // feed a stream that omits projective (index 8) and ctm (index 9).
    for (let t = 0; t < 20; t++) {
      k.ingest({ phi: 0.6, freeEnergyDescent: 0.6, fieldCoherence: 0.6 });
    }
    const snap = k.buildSnapshot('plant-3', 'plant', 1);
    const projective = snap.frameworks.find((f) => f.id === 'projective');
    const ctm = snap.frameworks.find((f) => f.id === 'ctm');
    expect(projective?.status).toBe('absent');
    expect(ctm?.status).toBe('absent');
  });
});
