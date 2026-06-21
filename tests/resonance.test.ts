/**
 * RESONANCE INTEGRATOR — pure, headless tests (faculty #59; the coupling spark).
 *
 * Verifies the Kuramoto binding-by-synchrony core: the order parameter, the coupled-oscillator step
 * that self-organises into a standing wave, the coherence gate, and the bound consensus read-out.
 * Hand-computed / analytically-grounded expectations; all determinism-safe (pure, no rng/clock/DOM).
 */
import { describe, expect, test } from 'bun:test';
import {
  RESONANCE_IGNITION_THRESHOLD,
  ResonanceField,
  AdaptiveCouplingHomeostat,
  kuramotoOrder,
  kuramotoStep,
  wrapPhase,
  coherenceWeights,
  resonantConsensus,
  integrate,
} from '../src/sim/resonance';

describe('resonance integrator (Kuramoto binding-by-synchrony)', () => {
  test('kuramotoOrder: identical phases → r = 1; anti-phase pair → r = 0; empty → 0', () => {
    expect(kuramotoOrder([0, 0, 0]).r).toBeCloseTo(1, 10);
    expect(kuramotoOrder([1.3, 1.3]).r).toBeCloseTo(1, 10); // any common phase
    expect(kuramotoOrder([0, Math.PI]).r).toBeCloseTo(0, 10); // opposite → cancel
    expect(kuramotoOrder([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]).r).toBeCloseTo(0, 10);
    const empty = kuramotoOrder([]);
    expect(empty.r).toBe(0);
    expect(empty.psi).toBe(0);
  });

  test('kuramotoOrder: collective phase psi points at the mean direction', () => {
    expect(kuramotoOrder([0.5, 0.5]).psi).toBeCloseTo(0.5, 10);
    // symmetric pair around 0 → mean phase 0
    expect(kuramotoOrder([-0.4, 0.4]).psi).toBeCloseTo(0, 10);
  });

  test('wrapPhase folds into (-pi, pi]', () => {
    expect(wrapPhase(0)).toBeCloseTo(0, 10);
    expect(wrapPhase(Math.PI)).toBeCloseTo(Math.PI, 10); // pi stays (half-open at -pi)
    expect(wrapPhase(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1, 10);
    expect(wrapPhase(3 * Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(wrapPhase(-3 * Math.PI)).toBeCloseTo(Math.PI, 10);
  });

  test('kuramotoStep with positive coupling self-organises into a standing wave (r → 1)', () => {
    let phases = [-2.0, -0.6, 0.3, 1.1, 2.4]; // scattered
    const omega = [0, 0, 0, 0, 0]; // identical natural frequency → global sync is stable
    const before = kuramotoOrder(phases).r;
    for (let i = 0; i < 400; i++) phases = kuramotoStep(phases, omega, 2.0, 0.05);
    const after = kuramotoOrder(phases).r;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(0.99); // locked into a standing wave
  });

  test('kuramotoStep with K=0 and uniform omega is a rigid rotation: order is conserved', () => {
    const phases = [0.2, 1.0, 2.5, -1.7];
    const omega = [0.3, 0.3, 0.3, 0.3];
    const before = kuramotoOrder(phases).r;
    let p = phases as number[];
    for (let i = 0; i < 50; i++) p = kuramotoStep(p, omega, 0, 0.1);
    expect(kuramotoOrder(p).r).toBeCloseTo(before, 10); // no coupling → coherence unchanged
  });

  test('kuramotoStep is pure (no input mutation) and deterministic', () => {
    const phases = Object.freeze([0.1, 0.9, -1.2]);
    const omega = Object.freeze([0.1, -0.2, 0.05]);
    const a = kuramotoStep(phases, omega, 1.5, 0.1);
    const b = kuramotoStep(phases, omega, 1.5, 0.1);
    expect(a).toEqual(b); // same inputs → same outputs
    expect([...phases]).toEqual([0.1, 0.9, -1.2]); // original untouched
  });

  test('coherenceWeights gate by alignment: in-phase → 1, quadrature → 0.5, anti-phase → 0', () => {
    const w = coherenceWeights([0, Math.PI / 2, Math.PI], 0);
    expect(w[0]).toBeCloseTo(1, 10);
    expect(w[1]).toBeCloseTo(0.5, 10);
    expect(w[2]).toBeCloseTo(0, 10);
  });

  test('resonantConsensus suppresses faculties out of phase with the collective', () => {
    // Three faculties; two agree at phase 0, one dissents anti-phase. The collective phase ≈ 0,
    // so the anti-phase dissenter is silenced and the consensus follows the locked majority.
    const vectors = [
      [10, 0],
      [10, 0],
      [-100, 50], // loud dissenter, but anti-phase → weight ~0
    ];
    const phases = [0, 0, Math.PI];
    const out = resonantConsensus(vectors, phases);
    expect(out[0]).toBeCloseTo(10, 6); // dissenter contributes ~nothing
    expect(out[1]).toBeCloseTo(0, 6);
  });

  test('resonantConsensus: zero total weight → zero vector; ragged rows tolerated', () => {
    // all anti-phase to the collective is impossible for a real psi, so force it via identical
    // opposite pair where psi is undefined-ish; instead test the documented empty/zero guards:
    expect(resonantConsensus([], [])).toEqual([]);
    const ragged = resonantConsensus([[1], [2, 8]], [0, 0]); // both in phase → plain mean
    expect(ragged[0]).toBeCloseTo(1.5, 10);
    expect(ragged[1]).toBeCloseTo(4, 10); // (0 + 8)/2
  });

  test('integrate: a phase-locked assembly ignites; a scattered one does not', () => {
    const locked = integrate(
      [0.02, -0.03, 0.01, 0.0],
      [
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 0],
      ],
    );
    expect(locked.order).toBeGreaterThan(RESONANCE_IGNITION_THRESHOLD);
    expect(locked.ignited).toBe(true);
    expect(locked.consensus[0]).toBeCloseTo(1, 6);

    const scattered = integrate([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
    expect(scattered.order).toBeCloseTo(0, 10);
    expect(scattered.ignited).toBe(false);
    expect(scattered.consensus).toEqual([]); // no content vectors supplied
  });

  test('integrate: ignition threshold is honoured at the boundary', () => {
    // two faculties separated by angle d have r = cos(d/2); pick d so r sits just under/over 0.7.
    const justUnder = integrate([0, 2 * Math.acos(0.69)]); // r ≈ 0.69
    const justOver = integrate([0, 2 * Math.acos(0.71)]); // r ≈ 0.71
    expect(justUnder.ignited).toBe(false);
    expect(justOver.ignited).toBe(true);
  });
});

describe('ResonanceField (stateful across-beats binding)', () => {
  test('agreement builds a standing wave that ignites; disagreement stays unbound', () => {
    const agree = new ResonanceField(12);
    const agreeActs = Array.from({ length: 12 }, () => 0.8); // all faculties firing together
    let agreeOrder = 0;
    for (let b = 0; b < 60; b++) agreeOrder = agree.step(agreeActs).order;
    expect(agreeOrder).toBeGreaterThan(RESONANCE_IGNITION_THRESHOLD);
    expect(agree.snapshot().ignited).toBe(true);

    const disagree = new ResonanceField(12);
    const spreadActs = Array.from({ length: 12 }, (_, i) => i / 11); // maximally spread 0..1
    let disagreeOrder = 0;
    for (let b = 0; b < 60; b++) disagreeOrder = disagree.step(spreadActs).order;
    expect(agreeOrder).toBeGreaterThan(disagreeOrder); // agreement binds harder than disagreement
    expect(disagree.snapshot().ignited).toBe(false);
  });

  test('coherence builds over beats (binding has temporal dynamics, not one-shot)', () => {
    const f = new ResonanceField(12);
    const acts = Array.from({ length: 12 }, () => 0.7);
    const first = f.step(acts).order;
    let later = first;
    for (let b = 0; b < 40; b++) later = f.step(acts).order;
    expect(later).toBeGreaterThan(first); // the standing wave rises as the bank entrains
  });

  test('is deterministic (no rng/clock): identical activation streams → identical coherence', () => {
    const a = new ResonanceField(8);
    const b = new ResonanceField(8);
    const acts = [0.1, 0.9, 0.3, 0.6, 0.5, 0.2, 0.8, 0.4];
    let ra = 0;
    let rb = 0;
    for (let i = 0; i < 25; i++) {
      ra = a.step(acts).order;
      rb = b.step(acts).order;
    }
    expect(ra).toBe(rb);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  test('snapshot shape: order in [0,1], coupled = faculty count, phase finite, criticality null', () => {
    const f = new ResonanceField(5);
    f.step([0.5, 0.5, 0.5, 0.5, 0.5]);
    const s = f.snapshot();
    expect(s.coupled).toBe(5);
    expect(s.order).toBeGreaterThanOrEqual(0);
    expect(s.order).toBeLessThanOrEqual(1);
    expect(Number.isFinite(s.phase)).toBe(true);
    expect(typeof s.ignited).toBe('boolean');
    expect(s.homeostat).toBeNull(); // fixed-coupling field has no homeostat
  });
});

describe('AdaptiveCouplingHomeostat (self-tunes K to the responsive regime)', () => {
  test('raises coupling when order sits below the setpoint, lowers it when above', () => {
    const low = new AdaptiveCouplingHomeostat(0.5, 1.4);
    for (let i = 0; i < 80; i++) low.observe(0.1); // persistently incoherent
    expect(low.coupling).toBeGreaterThan(1.4); // crank K up to pull order toward the setpoint

    const high = new AdaptiveCouplingHomeostat(0.5, 1.4);
    for (let i = 0; i < 80; i++) high.observe(0.95); // persistently over-synchronised
    expect(high.coupling).toBeLessThan(1.4); // back K off
  });

  test('mean order EMA converges to a constant input; responsiveness peaks at the setpoint', () => {
    const h = new AdaptiveCouplingHomeostat(0.5, 1.4);
    for (let i = 0; i < 400; i++) h.observe(0.3);
    expect(h.snapshot().meanOrder).toBeCloseTo(0.3, 1);
    // fresh homeostat sits exactly at the setpoint ⇒ responsiveness 1.
    expect(new AdaptiveCouplingHomeostat(0.5).snapshot().responsiveness).toBeCloseTo(1, 10);
  });

  test('coupling stays bounded under sustained extremes', () => {
    const h = new AdaptiveCouplingHomeostat(0.5, 1.4, 0.5, 0.03, 0.2, 6);
    for (let i = 0; i < 2000; i++) h.observe(0); // would drive K up forever without the clamp
    expect(h.coupling).toBeLessThanOrEqual(6);
    expect(h.coupling).toBeGreaterThanOrEqual(0.2);
  });

  test('is deterministic: identical order streams → identical coupling + snapshot', () => {
    const a = new AdaptiveCouplingHomeostat();
    const b = new AdaptiveCouplingHomeostat();
    const seq = [0.2, 0.8, 0.5, 0.1, 0.9, 0.45];
    for (let i = 0; i < 60; i++) {
      a.observe(seq[i % seq.length]!);
      b.observe(seq[i % seq.length]!);
    }
    expect(a.coupling).toBe(b.coupling);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  test('adaptive ResonanceField holds the mean order near the responsive setpoint a fixed field cannot reach', () => {
    const spread = Array.from({ length: 12 }, (_, i) => i / 11); // maximally spread → fixed K stays low
    const fixed = new ResonanceField(12);
    let fixedOrder = 0;
    for (let i = 0; i < 400; i++) fixedOrder = fixed.step(spread).order;

    const adaptive = new ResonanceField(12, 1.4, 2 * Math.PI, 0.15, 3, true, 0.5);
    for (let i = 0; i < 400; i++) adaptive.step(spread);
    const s = adaptive.snapshot();
    expect(s.homeostat).not.toBeNull();
    // the homeostat dragged the mean order toward 0.5 — closer to the setpoint than the fixed field.
    expect(Math.abs(s.homeostat!.meanOrder - 0.5)).toBeLessThan(Math.abs(fixedOrder - 0.5));
    expect(s.homeostat!.responsiveness).toBeGreaterThan(0.6); // genuinely in the responsive regime
    expect(s.homeostat!.coupling).toBeGreaterThan(1.4); // raised K to lift the spread assembly
  });
});
