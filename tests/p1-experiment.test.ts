/**
 * P1 keystone regression guard. The quantum-vs-classical experiment is a manual script, so nothing
 * caught a silent break in runArm, the survival model, or the setQuantumAblated wiring — until this.
 * These assertions pin the experiment's MECHANICS (not any performance claim): it runs, produces finite
 * bounded statistics, is deterministic, the ablation genuinely moves the arms apart, and the PRESSURE
 * regime actually kills agents (so it has the power the CAPACITY task lacks). A green run here does NOT
 * assert a quantum advantage — the honest result is null; this only keeps the harness itself honest.
 *
 * Small seed/beat counts + explicit timeouts keep it fast: each beat is one heavy SuperMind.think().
 */
import { describe, expect, test } from 'bun:test';
import { runRegime, pairedPermutationP } from '../scripts/p1-quantum-classical-experiment';

const T = { timeout: 30000 };

describe('P1 experiment harness — mechanics regression guard', () => {
  test(
    'CAPACITY regime: runs, finite bounded stats, near-saturating survival',
    () => {
      const B = 100;
      const r = runRegime(0.008, 4, B);
      for (const s of [r.classicalSurvival, r.fullSurvival, r.minSurvival]) {
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(B);
      }
      expect(r.survivalP).toBeGreaterThan(0);
      expect(r.survivalP).toBeLessThanOrEqual(1);
      expect(r.empowermentP).toBeGreaterThan(0);
      expect(r.empowermentP).toBeLessThanOrEqual(1);
      // near-saturating: almost nobody dies before the horizon
      expect(r.classicalSurvival).toBeGreaterThan(0.8 * B);
      expect(r.fullSurvival).toBeGreaterThan(0.8 * B);
    },
    T,
  );

  test(
    'PRESSURE regime actually kills agents — it has power the CAPACITY task lacks',
    () => {
      const B = 120;
      const cap = runRegime(0.008, 4, B);
      const pressure = runRegime(0.02, 4, B);
      // a harder drain must lower mean survival substantially (real differential mortality)
      expect(pressure.fullSurvival).toBeLessThan(cap.fullSurvival);
      expect(pressure.fullSurvival).toBeLessThan(0.7 * B);
    },
    T,
  );

  test(
    'deterministic: same regime args ⇒ identical statistics (seeded, replayable)',
    () => {
      const a = runRegime(0.02, 3, 80);
      const b = runRegime(0.02, 3, 80);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    },
    T,
  );

  test(
    'the ablation is LIVE: the arms are not trivially identical',
    () => {
      // Full vs classical differ because setQuantumAblated actually changes the decision path. If the
      // wiring regressed to a no-op, every seed would match and every delta would be exactly 0.
      const r = runRegime(0.02, 6, 120);
      const someDelta =
        Math.abs(r.survivalDelta) > 0 ||
        Math.abs(r.empowermentDelta) > 1e-9 ||
        r.classicalSurvival !== r.fullSurvival;
      expect(someDelta).toBe(true);
    },
    T,
  );

  test('pairedPermutationP is re-exported and usable from the harness module', () => {
    // sanity tie-in: a strong constant effect is significant (guards against an accidental unexport)
    expect(pairedPermutationP([2, 2, 2, 2, 2, 2, 2, 2], 1)).toBeLessThan(0.05);
  });
});
