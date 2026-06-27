/**
 * Causal graph — direct Pearl do-calculus contract test.
 *
 * `src/sim/causal-graph.ts` is now load-bearing: it drives `latent-substrates.ts` → the apex
 * `super-mind` snapshot. Until this file it was covered ONLY indirectly (through the clamp01-bounded
 * `latentSubstrateStep` wrapper), which cannot catch a regression in the *do-operator* itself. The
 * defining property of an intervention `do(X=x)` — graph surgery cuts every edge INTO X, so X is held
 * at x and its parents can no longer influence it — is exactly the kind of contract a wrapper test
 * hides. This pins it (and the twin-network counterfactual, determinism, bounds, AD gradient).
 */
import { describe, expect, test } from 'bun:test';
import { CausalGraph, CAUSAL_VARS } from '../src/sim/causal-graph';

/** Observe in canonical CAUSAL_VARS order; override individual scalars via the patch. */
function observed(patch: Partial<Record<(typeof CAUSAL_VARS)[number], number>> = {}): CausalGraph {
  const g = new CausalGraph();
  const v = {
    ignition: 0.5,
    phi: 0.5,
    workspace: 0.5,
    surprise: 0.5,
    novelty: 0.5,
    selfAware: 0.5,
    reasoning: 0.5,
    qualiaTone: 0.5,
    ...patch,
  };
  g.observe(
    v.ignition,
    v.phi,
    v.workspace,
    v.surprise,
    v.novelty,
    v.selfAware,
    v.reasoning,
    v.qualiaTone,
  );
  return g;
}

describe('causal-graph — do-operator graph surgery (the defining contract)', () => {
  test('do(X=x) holds X at x: a change to X’s PARENT cannot reach Y through X', () => {
    // surprise → ignition → workspace is the ONLY path from surprise to workspace.
    // Intervening do(ignition=0.8) cuts surprise→ignition, so surprise must become irrelevant to
    // workspace. If surgery were dropped (treating do like observe), these would differ.
    const eLowParent = observed({ surprise: 0 }).do('ignition', 0.8, 'workspace').effect;
    const eHighParent = observed({ surprise: 1 }).do('ignition', 0.8, 'workspace').effect;
    expect(eLowParent).toBe(eHighParent);
  });

  test('the intervened value itself genuinely propagates to Y (monotone, not frozen)', () => {
    const low = observed().do('ignition', 0.1, 'workspace').effect;
    const high = observed().do('ignition', 0.9, 'workspace').effect;
    expect(high).toBeGreaterThan(low); // ignition→workspace weight is positive
  });
});

describe('causal-graph — counterfactual twin network', () => {
  test('counterfactual of do(X=x) equals the factual effect of do(X=1−x)', () => {
    const g = observed({ novelty: 0.3, phi: 0.7 });
    const r = g.do('ignition', 0.8, 'workspace'); // twin world flips ignition → 0.2
    const flipped = observed({ novelty: 0.3, phi: 0.7 }).do('ignition', 0.2, 'workspace').effect;
    expect(r.counterfactual).toBe(flipped); // identical dynamics, identical bytes
    expect(r.counterfactual).not.toBe(r.effect);
  });
});

describe('causal-graph — gradient, bounds, determinism', () => {
  test('effect & counterfactual are bounded [0,1]; grad is finite', () => {
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      const r = observed({ surprise: x }).do('surprise', x, 'qualiaTone'); // direct edge ⇒ AD path
      expect(r.effect).toBeGreaterThanOrEqual(0);
      expect(r.effect).toBeLessThanOrEqual(1);
      expect(r.counterfactual).toBeGreaterThanOrEqual(0);
      expect(r.counterfactual).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.grad)).toBe(true);
    }
  });

  test('fully deterministic — same observe+do ⇒ identical {effect, grad, counterfactual}', () => {
    const a = observed({ reasoning: 0.2 }).do('phi', 0.6, 'qualiaTone');
    const b = observed({ reasoning: 0.2 }).do('phi', 0.6, 'qualiaTone');
    expect(a).toEqual(b);
  });

  test('intervening on an unknown→known pair with no direct edge still returns a finite grad', () => {
    // surprise→workspace has no DIRECT edge → exercises the indirect eshkolDual branch.
    const r = observed().do('surprise', 0.7, 'workspace');
    expect(Number.isFinite(r.grad)).toBe(true);
  });
});

describe('causal-graph — snapshot & online weight learning', () => {
  test('snapshot records intervention count, full value vector, and the do-effect key', () => {
    const g = observed();
    g.do('ignition', 0.7, 'workspace');
    g.do('phi', 0.3, 'qualiaTone');
    const snap = g.snapshot();
    expect(snap.interventionCount).toBe(2);
    expect(snap.values).toHaveLength(CAUSAL_VARS.length);
    expect(Object.keys(snap.effects).length).toBeGreaterThan(0);
  });

  test('updateWeight nudges a real edge within [0.01,0.99] and shifts the downstream effect', () => {
    const before = observed({ ignition: 0.9 }).do('ignition', 0.9, 'workspace').effect;
    const g = observed({ ignition: 0.9 });
    // Push the ignition→workspace edge upward repeatedly, then re-measure.
    for (let i = 0; i < 25; i++) g.updateWeight('ignition', 'workspace', 1);
    const after = g.do('ignition', 0.9, 'workspace').effect;
    expect(after).toBeGreaterThan(before); // a stronger edge raises workspace under the same do
  });

  test('updateWeight on a non-existent edge is a safe no-op', () => {
    const g = observed();
    expect(() => g.updateWeight('selfAware', 'surprise', 0.5)).not.toThrow();
  });
});
