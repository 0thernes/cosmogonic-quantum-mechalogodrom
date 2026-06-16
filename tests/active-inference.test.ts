/**
 * ACTIVE INFERENCE (V90) — pins the Free-Energy core of Super Creature 1.1: a Bayesian belief update that
 * minimises variational free energy, and an expected-free-energy policy evaluator that trades epistemic
 * value (curiosity) against pragmatic value (preference). Each test is a falsifiable claim, per the
 * Physicist's law 4.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { ActiveInference, AIF_SITUATIONS, AIF_OBS } from '../src/sim/active-inference';

const OBS = [0.6, -0.3, 0.2, 0.1, -0.5, 0.4];

describe('ActiveInference (V90) — the Free-Energy Principle core', () => {
  test('PERCEIVE is Bayesian: a consistent world sharpens the belief and lowers free energy', () => {
    const m = new ActiveInference(mulberry32(1));
    const first = m.perceive(OBS);
    let last = first;
    for (let i = 0; i < 24; i++) last = m.perceive(OBS);
    // a repeatedly-confirmed observation concentrates the posterior (entropy falls)…
    expect(last.beliefEntropy).toBeLessThan(first.beliefEntropy);
    // …and the world becomes less surprising: free energy does not grow, surprise stays finite
    expect(last.freeEnergy).toBeLessThanOrEqual(first.freeEnergy + 1e-9);
    expect(Number.isFinite(last.surprise)).toBe(true);
  });

  test('same seed + same observations ⇒ identical inference (deterministic)', () => {
    const a = new ActiveInference(mulberry32(42));
    const b = new ActiveInference(mulberry32(42));
    for (let i = 0; i < 12; i++) {
      const o = OBS.map((v, k) => v * Math.cos(i * 0.3 + k));
      a.perceive(o);
      b.perceive(o);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('a familiar world is LESS surprising than a conflicting one', () => {
    const train = (): ActiveInference => {
      const m = new ActiveInference(mulberry32(7));
      for (let i = 0; i < 15; i++) m.perceive(OBS);
      return m;
    };
    const familiar = train().perceive(OBS).surprise;
    const conflicting = train().perceive(OBS.map((v) => -v)).surprise;
    expect(conflicting).toBeGreaterThan(familiar);
  });

  test('expected free energy is PRAGMATIC: a preferred outcome lowers G (goal-seeking)', () => {
    const m = new ActiveInference(mulberry32(3));
    m.perceive(OBS);
    m.setPreference([3, 0, 0, 0, 0, 0]); // strongly prefer high feature-0
    const aligned = [1, 0, 0, 0, 0, 0]; // predicted obs that satisfies the preference
    const against = [-1, 0, 0, 0, 0, 0]; // predicted obs that violates it
    const g: number[] = [0, 0];
    m.expectedFreeEnergy([aligned, against], g);
    // lower expected free energy = better policy; the preferred outcome must win
    expect(g[0]).toBeLessThan(g[1] ?? 0);
  });

  test('expected free energy is EPISTEMIC: with no preference, the more informative policy wins', () => {
    const m = new ActiveInference(mulberry32(9)); // fresh, diffuse belief
    m.setPreference([0, 0, 0, 0, 0, 0]); // no goal ⇒ G = −epistemic (pure curiosity)
    const informative = [1, -1, 1, -1, 1, -1]; // an extreme obs that strongly discriminates situations
    const bland = [0, 0, 0, 0, 0, 0]; // a flat obs that barely updates the belief
    const g: number[] = [0, 0];
    m.expectedFreeEnergy([informative, bland], g);
    const s = m.snapshot();
    expect(g[0]).toBeLessThanOrEqual(g[1] ?? 0); // curiosity prefers the information-rich policy
    // the discriminating obs genuinely SHARPENS the belief, so HERE the one-sample info-gain surrogate
    // is ≥ 0 — but it is NOT ≥ 0 in general (a belief-blurring ô can make it negative; see the module
    // docstring + the F == surprise closed-form pin below), which is why this is a scenario assertion.
    expect(s.epistemic).toBeGreaterThanOrEqual(0);
  });

  test('closed form: at the exact Bayesian posterior, F = the Bayesian surprise (−log evidence)', () => {
    // The single strongest exact identity the core satisfies: with q the exact softmax posterior,
    // the variational free energy F = E_q[−logLik] + KL(q‖prior) collapses to the negative log-evidence
    // (the Bayesian surprise) to machine precision. This pins the accuracy+complexity decomposition
    // against the independent log-sum-exp marginal-likelihood path — a regression that desynced them
    // (wrong KL sign, prototype/precision mismatch) would break it.
    const m = new ActiveInference(mulberry32(11));
    for (let i = 0; i < 8; i++) {
      const o = OBS.map((v, k) => v * Math.sin(i * 0.4 + k));
      const r = m.perceive(o);
      expect(Math.abs(r.freeEnergy - r.surprise)).toBeLessThan(1e-9);
    }
  });

  test('no NaN; the posterior stays normalised and the entropy bounded across a long varied run', () => {
    const m = new ActiveInference(mulberry32(5));
    expect(m.situations).toBe(AIF_SITUATIONS);
    for (let i = 0; i < 200; i++) {
      const o = Array.from({ length: AIF_OBS }, (_, k) => Math.sin(i * 0.11 + k * 1.7));
      const r = m.perceive(o);
      const s = m.snapshot();
      let sum = 0;
      for (const p of s.posterior) {
        expect(p).toBeGreaterThanOrEqual(0);
        sum += p;
      }
      expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
      expect(s.beliefEntropy).toBeGreaterThanOrEqual(0);
      expect(s.beliefEntropy).toBeLessThanOrEqual(1 + 1e-9);
      expect(Number.isFinite(r.freeEnergy + r.surprise)).toBe(true);
    }
  });
});
