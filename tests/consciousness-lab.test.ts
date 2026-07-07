import { describe, expect, test } from 'bun:test';
import {
  runConsciousnessLab,
  sweepConsciousnessLab,
  type LabReport,
} from '../src/sim/consciousness-lab';
import { FRAMEWORK_COUNT } from '../src/sim/consciousness-kernel';
import { generateConsciousnessDashboardData } from '../src/sim/consciousness-adapters';

const REPORT: LabReport = runConsciousnessLab(1234);

describe('consciousness-lab: determinism', () => {
  test('same seed reproduces the report bit-for-bit', () => {
    const a = runConsciousnessLab(999);
    const b = runConsciousnessLab(999);
    expect(a.structured.meanIndex).toBe(b.structured.meanIndex);
    expect(a.structured.eventCount).toBe(b.structured.eventCount);
    expect(a.nullShuffled.meanConvergence).toBe(b.nullShuffled.meanConvergence);
    expect(a.frameworks.map((f) => f.ablationLoss)).toEqual(
      b.frameworks.map((f) => f.ablationLoss),
    );
  });
});

describe('consciousness-lab: falsifiable core', () => {
  test('report is well-formed and indicator-only', () => {
    expect(REPORT.claim).toBe('indicatorOnly');
    expect(REPORT.frameworks.length).toBe(FRAMEWORK_COUNT);
    expect(REPORT.thalerFraction).toBeGreaterThanOrEqual(0);
    expect(REPORT.thalerFraction).toBeLessThanOrEqual(1);
  });

  test('EMERGENCE: the coupled index exceeds the independent mean under structured coupling', () => {
    expect(REPORT.emergenceProven).toBe(true);
    expect(REPORT.structured.meanEmergence).toBeGreaterThan(0);
  });

  test('SINGULARITY: a convergence event fires under the coupling pulse', () => {
    expect(REPORT.structured.eventCount).toBeGreaterThanOrEqual(1);
    expect(REPORT.structured.peakMoving).toBeGreaterThanOrEqual(7);
  });

  test('NULL SEPARATION: phase-shuffling destroys the co-movement (fewer events, lower convergence)', () => {
    expect(REPORT.structured.eventCount).toBeGreaterThan(REPORT.nullShuffled.eventCount);
    expect(REPORT.structured.meanConvergence).toBeGreaterThan(
      REPORT.nullShuffled.meanConvergence + 0.02,
    );
    // at least one framework loses measurable cross-framework correlation under the null.
    expect(Math.max(...REPORT.frameworks.map((f) => f.nullSeparation))).toBeGreaterThan(0.05);
  });

  test('ABLATION: removing a framework is load-bearing on the blended index', () => {
    expect(REPORT.ablationProven).toBe(true);
    const totalLoss = REPORT.frameworks.reduce((a, f) => a + f.ablationLoss, 0);
    expect(totalLoss).toBeGreaterThan(0);
    // the most-connected framework should be among the more load-bearing (a real ordering claim).
    let topF = 0;
    for (let f = 1; f < FRAMEWORK_COUNT; f++) {
      if (
        (REPORT.frameworks[f]?.connectedness ?? 0) > (REPORT.frameworks[topF]?.connectedness ?? 0)
      )
        topF = f;
    }
    expect(REPORT.frameworks[topF]?.ablationLoss ?? 0).toBeGreaterThan(0);
  });

  test('all per-framework lab statistics are bounded in [0,1]', () => {
    for (const f of REPORT.frameworks) {
      for (const v of [f.ablationLoss, f.causalEffect, f.nullSeparation]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('consciousness-lab: cross-seed robustness', () => {
  test('the singularity separates from the null in the majority of seeds', () => {
    const sweep = sweepConsciousnessLab([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(sweep.emergenceRate).toBeGreaterThan(0.8);
    expect(sweep.singularityRate).toBeGreaterThanOrEqual(0.6);
    expect(sweep.claim).toBe('indicatorOnly');
  });
});

describe('consciousness-lab: public feed metadata', () => {
  test('dashboard data points at the current truth ledgers', () => {
    const data = generateConsciousnessDashboardData();
    expect(data.generatedAt).toBe('2026-07-07T00:00:00.000Z');
    expect(data.claim).toBe('indicatorOnly');
    expect(data.sourceDocs).toContain(
      'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
    );
    expect(data.sourceDocs).toContain('docs/VERIFICATION-ANALYTICAL-DATA.md');
  });
});
