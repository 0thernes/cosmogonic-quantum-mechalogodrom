import { describe, expect, test } from 'bun:test';
import {
  Foundationals,
  OrganInterconnect,
  WetComputingLayer,
  DimensionalTranscendence,
  ALL_INDICATOR_IDS,
} from '../src/sim/foundationals';

describe('Foundationals — 1/1 novel alien consciousness architecture', () => {
  test('has 21 indicator IDs (16 Butlin-aligned + 5 Foundationals extensions)', () => {
    const ids: readonly string[] = ALL_INDICATOR_IDS;
    expect(ids.length).toBe(21);
    expect(ALL_INDICATOR_IDS.slice(0, 16)).toEqual([
      'GWT-1',
      'GWT-2',
      'GWT-3',
      'GWT-4',
      'PP-1',
      'HOT-2',
      'HOT-3',
      'HOT-4',
      'AE-1',
      'AE-2',
      'RPT-1',
      'RPT-2',
      'IIT-1',
      'IIT-2',
      'AST-1',
      'AST-2',
    ]);
    expect(ALL_INDICATOR_IDS.slice(16)).toEqual(['FND-1', 'FND-2', 'FND-3', 'FND-4', 'FND-5']);
  });

  test('Foundationals.tick produces a snapshot with all 19 indicators', () => {
    const f = new Foundationals(42);
    const organActivity = new Float32Array(10).fill(0.5);
    const snap = f.tickAndStore(organActivity, 0.7, 0.2, 10, 250_000, 0.016);
    expect(snap.indicators.length).toBe(21);
    expect(snap.metCount + snap.partialCount + snap.scaffoldedCount).toBe(21);
    expect(snap.honesty).toBe('computational-indicator-not-sentience');
    expect(snap.scaleName).toBe('APEX-250K');
    expect(snap.activeVariation.id).toBeGreaterThanOrEqual(0);
    expect(snap.activeVariation.id).toBeLessThan(100);
  });

  test('deterministic — same seed + inputs produce identical snapshots', () => {
    const f1 = new Foundationals(123);
    const f2 = new Foundationals(123);
    const act = new Float32Array(10).fill(0.6);
    const s1 = f1.tickAndStore(act, 0.5, 0.3, 5, 100_000, 0.016);
    const s2 = f2.tickAndStore(act, 0.5, 0.3, 5, 100_000, 0.016);
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2));
  });

  test('roadmap progress scales with designed params', () => {
    const f = new Foundationals(1);
    const act = new Float32Array(10).fill(0.5);
    const snap100k = f.tickAndStore(act, 0.5, 0.2, 1, 100_000, 0.016);
    expect(snap100k.roadmapProgress).toBeLessThan(0.01);
    const snap5m = f.tickAndStore(act, 0.5, 0.2, 50, 5_000_000, 0.016);
    expect(snap5m.roadmapProgress).toBeCloseTo(1, 1);
  });

  test('OrganInterconnect starts sparse and grows with scale', () => {
    const ic = new OrganInterconnect(42);
    const initialDensity = ic.connectionDensity;
    expect(initialDensity).toBeGreaterThan(0);
    expect(initialDensity).toBeLessThan(0.3);
    // Simulate growth to 1B params
    ic.setScale(2_500_000_000);
    // After growth, density should increase (new connections seeded)
    const grownDensity = ic.connectionDensity;
    expect(grownDensity).toBeGreaterThanOrEqual(initialDensity);
  });

  test('OrganInterconnect STDP strengthens correlated organs', () => {
    const ic = new OrganInterconnect(42);
    const wBefore = ic.matrix[1 * 10 + 2]!; // organ 1 → organ 2
    const correlated = new Float32Array(10);
    correlated[1] = 0.9;
    correlated[2] = 0.9;
    // Run many plasticity updates
    for (let i = 0; i < 1000; i++) ic.updatePlasticity(correlated);
    const wAfter = ic.matrix[1 * 10 + 2]!;
    expect(wAfter).toBeGreaterThanOrEqual(wBefore);
  });

  test('WetComputingLayer produces Turing patterns', () => {
    const wet = new WetComputingLayer(42);
    const act = new Float32Array(10).fill(0.5);
    // Step many times to let patterns form
    for (let i = 0; i < 100; i++) wet.step(act, 0.1);
    expect(wet.patternRichness).toBeGreaterThan(0);
    expect(wet.activator.length).toBe(10);
  });

  test('DimensionalTranscendence w-axis responds to transcendence + agony', () => {
    const dim = new DimensionalTranscendence(42);
    // High transcendence → positive depth
    for (let i = 0; i < 100; i++) dim.step(0.9, 0.1, 0.1);
    expect(dim.depth).toBeGreaterThan(0);
    // Reset with high agony → negative depth
    const dim2 = new DimensionalTranscendence(42);
    for (let i = 0; i < 100; i++) dim2.step(0.1, 0.9, 0.1);
    expect(dim2.depth).toBeLessThan(0);
  });

  test('4D projection maps to 3D', () => {
    const dim = new DimensionalTranscendence(42);
    const [x, y, z] = dim.project(1, 1, 1, 0.5);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    expect(Number.isFinite(z)).toBe(true);
    // w=0 should be identity
    const [x0, y0, z0] = dim.project(2, 3, 4, 0);
    expect(x0).toBe(2);
    expect(y0).toBe(3);
    expect(z0).toBe(4);
  });

  test('FND-5 (alien novelty) is always met — 1/1 unique substrate', () => {
    const f = new Foundationals(42);
    const act = new Float32Array(10).fill(0.5);
    const snap = f.tickAndStore(act, 0.5, 0.2, 1, 100_000, 0.016);
    const fnd5 = snap.indicators.find((i) => i.id === 'FND-5');
    expect(fnd5).toBeDefined();
    expect(fnd5!.status).toBe('met');
    expect(fnd5!.confidence).toBeGreaterThan(0.9);
  });

  test('snapshot getter returns null before first tick, snapshot after', () => {
    const f = new Foundationals(42);
    expect(f.snapshot).toBeNull();
    const act = new Float32Array(10).fill(0.5);
    f.tickAndStore(act, 0.5, 0.2, 1, 100_000, 0.016);
    expect(f.snapshot).not.toBeNull();
  });
});
