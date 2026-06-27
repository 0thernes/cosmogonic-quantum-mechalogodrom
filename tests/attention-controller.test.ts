import { describe, expect, test } from 'bun:test';
import { AttentionController } from '../src/sim/attention-controller';
import { SUPER_PLANS, type SuperPlan } from '../src/sim/super-creature';

function drives(v = 0.1): Record<SuperPlan, number> {
  return {
    HUNT: v,
    FLEE: v,
    DOMINATE: v,
    DECEIVE: v,
    SPAWN: v,
    EXPLORE: v,
    REST: v,
  };
}

describe('GWT-4 attention controller', () => {
  test('allocates threat attention into FLEE and writes bounded gain into drives', () => {
    const c = new AttentionController();
    const d = drives();
    const sal = [0.05, 1, 0.05, 0.4, 0.05, 0.1, 0.1];
    c.updateAndApply(d, sal, {
      energy: 0.2,
      threat: 1,
      novelty: 0.1,
      surprise: 0.8,
      ignition: 0.1,
      workspace: 0.2,
      confidence: 0.25,
      acetylcholine: 0.2,
    });
    const s = c.snapshot();
    expect(s.dominantPlan).toBe('FLEE');
    expect(d.FLEE).toBeGreaterThan(d.HUNT);
    expect(s.focus).toHaveLength(SUPER_PLANS.length);
    expect(s.focus.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(s.appliedGain).toBeGreaterThan(0);
    expect(s.appliedGain).toBeLessThan(0.2);
  });

  test('allocates novelty and acetylcholine into EXPLORE', () => {
    const c = new AttentionController();
    const d = drives();
    const sal = [0.05, 0.05, 0.05, 0.05, 0.1, 1, 0.1];
    c.updateAndApply(d, sal, {
      energy: 0.7,
      threat: 0,
      novelty: 1,
      surprise: 0.9,
      ignition: 0.2,
      workspace: 0.3,
      confidence: 0.2,
      acetylcholine: 1,
    });
    expect(c.snapshot().dominantPlan).toBe('EXPLORE');
    expect(d.EXPLORE).toBeGreaterThan(d.REST);
  });

  test('same sequence replays the same attention state', () => {
    const a = new AttentionController();
    const b = new AttentionController();
    const sa = [0.1, 0.8, 0.2, 0.3, 0.1, 0.4, 0.2];
    const sb = [0.1, 0.2, 0.3, 0.1, 0.7, 0.6, 0.2];
    for (const sal of [sa, sb, sa]) {
      const da = drives(0.2);
      const db = drives(0.2);
      const cues = {
        energy: sal[4] ?? 0,
        threat: sal[1] ?? 0,
        novelty: sal[5] ?? 0,
        surprise: sal[3] ?? 0,
        ignition: 0.33,
        workspace: 0.44,
        confidence: 0.55,
        acetylcholine: sal[5] ?? 0,
      };
      a.updateAndApply(da, sal, cues);
      b.updateAndApply(db, sal, cues);
      expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
      expect(JSON.stringify(da)).toBe(JSON.stringify(db));
    }
  });
});
