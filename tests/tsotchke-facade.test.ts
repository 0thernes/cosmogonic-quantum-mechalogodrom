/**
 * TSOTCHKE CORPUS — facade primitives, full repo registry, primordial Petri dish.
 */
import { describe, expect, test } from 'bun:test';
import {
  corpusPulse,
  corpusCoverageRatio,
  getTsotchkeBias,
  gwtBroadcast,
  moonlabTensorContract,
  quakePerturb,
  TSOTCHKE_ARCHETYPES,
  TSOTCHKE_REPO_BINDINGS,
} from '../src/sim/tsotchke-facade';
import { consciousnessTriple } from '../src/sim/eshkol-bridge';
import { mulberry32 } from '../src/math/rng';
import { PrimordialSoup } from '../src/sim/primordial-soup';
import { TSOTCHKE_REPO_COUNT, tsotchkeWiringCoverage } from '../src/sim/tsotchke-registry';

describe('Tsotchke facade (corpus primitives)', () => {
  test('8 archetypes cover full corpus families', () => {
    expect(TSOTCHKE_ARCHETYPES.length).toBe(8);
  });

  test('getTsotchkeBias is deterministic per index', () => {
    const a = getTsotchkeBias(3);
    const b = getTsotchkeBias(3);
    expect(a).toEqual(b);
    expect(a.eshkolLogic).toBeGreaterThan(0);
    expect(a.eshkolInference).toBeGreaterThan(0);
    expect(a.eshkolWorkspace).toBeGreaterThan(0);
  });

  test('corpusPulse mixes seed + form without NaN', () => {
    const p = corpusPulse(4242, 2);
    expect(Number.isFinite(p.cliffordEnt)).toBe(true);
    expect(Number.isFinite(p.quakeAliveness)).toBe(true);
    expect(Number.isFinite(p.adGradient)).toBe(true);
    expect(p.cliffordEnt).toBeGreaterThanOrEqual(0);
    expect(p.cliffordEnt).toBeLessThanOrEqual(1);
  });

  test('corpusPulse scales with registry wiring weight', () => {
    const wired = corpusPulse(1, 0);
    const fenced = corpusPulse(1, 7);
    expect(wired.adGradient).toBeGreaterThan(fenced.adGradient);
  });

  test('moonlabTensorContract is deterministic', () => {
    const a = [1, 2, 3, 4];
    expect(moonlabTensorContract(a, a, 4)).toBe(moonlabTensorContract(a, a, 4));
  });

  test('gwtBroadcast winner-take-all boosts one channel', () => {
    const out = gwtBroadcast([0.2, 0.9, 0.1], [0.1, 0.8, 0.1]);
    expect(out.length).toBeGreaterThan(0);
    expect(Math.max(...out)).toBeGreaterThan(0);
  });

  test('quakePerturb is deterministic from seed', () => {
    expect(quakePerturb(0.8, 99)).toBe(quakePerturb(0.8, 99));
  });
});

describe('Tsotchke corpus registry (all repos wired)', () => {
  test('bindings cover 20 corpus mirrors', () => {
    expect(TSOTCHKE_REPO_BINDINGS.length).toBe(20);
  });

  test('registry tracks 21 repos (user + org)', () => {
    expect(TSOTCHKE_REPO_COUNT).toBe(21);
  });

  test('wiring coverage is majority wired (not fenced)', () => {
    expect(tsotchkeWiringCoverage()).toBeGreaterThan(0.4);
    expect(corpusCoverageRatio()).toBeGreaterThan(0.3);
  });

  test('consciousness triple assigns logic/inference/workspace per Archon', () => {
    for (let i = 0; i < 5; i++) {
      const t = consciousnessTriple(i);
      expect(t.logic).toBeGreaterThan(0);
      expect(t.inference).toBeGreaterThan(0);
      expect(t.workspace).toBeGreaterThan(0);
    }
  });

  test('eshkol binding maps to eshkol-bridge leaf', () => {
    const e = TSOTCHKE_REPO_BINDINGS.find((r) => r.id === 'eshkol');
    expect(e?.cosmogonicLeaf).toContain('eshkol-bridge');
  });
});

describe('Primordial soup (Petri dish growth)', () => {
  test('same seed produces identical soup telemetry', () => {
    const a = new PrimordialSoup(777);
    const b = new PrimordialSoup(777);
    const rng = mulberry32(777);
    for (let i = 0; i < 20; i++) {
      a.update(0, i, rng);
      b.update(0, i, rng);
    }
    expect(a.snapshot().tick).toBe(b.snapshot().tick);
    expect(a.snapshot().meanVitality).toBe(b.snapshot().meanVitality);
    expect(a.snapshot().liveCount).toBe(b.snapshot().liveCount);
  });
});
