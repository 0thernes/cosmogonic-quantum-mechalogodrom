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
import type { OrganismIntelligenceSignal } from '../src/types';

const OPERATIONAL_SIGNAL: OrganismIntelligenceSignal = {
  enabled: true,
  indicatorOnly: true,
  revision: 1,
  resourcePressure: 1,
  threatResponse: 0.3,
  exploration: 0.7,
  socialDrive: 1,
  plasticity: 1,
  forecast: 1,
  confidence: 1,
  corpusDrive: 1,
  channels: new Float32Array([1, 1, 1, 1]),
  integratedRepoCount: 17,
  diagnosticAlert: false,
};

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

describe('Tsotchke legacy mirror bindings and current registry', () => {
  test('legacy bindings cover 20 local corpus mirrors', () => {
    expect(TSOTCHKE_REPO_BINDINGS.length).toBe(20);
  });

  test('canonical registry tracks the exact live 22-repository external ledger', () => {
    expect(TSOTCHKE_REPO_COUNT).toBe(22);
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
    // Each soup must be driven by its OWN identically-seeded stream. Sharing one rng across both
    // (a.update then b.update in the same iteration) hands them different slices of the stream, so
    // once the heredity-rebirth path is live (ADR-0009) they desync — the determinism this test
    // checks is per-seed, not per-shared-cursor.
    const rngA = mulberry32(777);
    const rngB = mulberry32(777);
    for (let i = 0; i < 20; i++) {
      a.update(0, i, rngA);
      b.update(0, i, rngB);
    }
    expect(a.snapshot().tick).toBe(b.snapshot().tick);
    expect(a.snapshot().meanVitality).toBe(b.snapshot().meanVitality);
    expect(a.snapshot().liveCount).toBe(b.snapshot().liveCount);
  });

  test('strain vitality does not ratchet to the clamp (metabolic upkeep de-saturates it)', () => {
    // Regression for the vitality ratchet: growth had an unconditional +0.001 floor and pinnFactor was
    // too small to ever make the per-beat delta negative, so EVERY strain climbed monotonically to the
    // 1.0 clamp and pinned there — meanVitality → 1 and vitality carried no fitness signal. With the
    // metabolic-upkeep leak, vitality settles at a fitness-dependent equilibrium below the clamp. After
    // enough beats to have saturated the old code, meanVitality must be meaningfully under 1.
    const soup = new PrimordialSoup(4242);
    const rng = mulberry32(4242);
    for (let i = 0; i < 900; i++) soup.update(0, i, rng);
    const snap = soup.snapshot();
    expect(snap.liveCount).toBeGreaterThan(0); // strains did not all die
    expect(snap.meanVitality).toBeLessThan(0.98); // de-ratcheted — not pinned at the clamp
    expect(snap.meanVitality).toBeGreaterThan(0.02); // still a live, non-collapsed population
    // Not every strain sits at the ceiling.
    expect(snap.strains.some((s) => s.alive && s.vitality < 0.95)).toBe(true);
  });

  test('operational field changes soup vitality under a matched-seed counterfactual', () => {
    const run = (operational: boolean): { vitality: number; indicator: number } => {
      const soup = new PrimordialSoup(777);
      const rng = mulberry32(777);
      for (let beat = 0; beat < 120; beat++) {
        soup.update(0, beat, rng, operational ? OPERATIONAL_SIGNAL : undefined);
      }
      const snapshot = soup.snapshot();
      return {
        vitality: snapshot.meanVitality,
        indicator: snapshot.strains[0]?.consciousness ?? 0,
      };
    };

    const baseline = run(false);
    const operational = run(true);
    expect(operational).toEqual(run(true));
    expect(operational.vitality).toBeGreaterThan(baseline.vitality);
    expect(operational.indicator).toBeGreaterThan(baseline.indicator);
  });
});
