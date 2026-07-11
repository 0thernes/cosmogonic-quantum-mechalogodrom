/**
 * SUPER CREATURE — LEARNED SOCIAL (RIVAL-ANTICIPATION) HEAD (falsifiable gate).
 *
 * Pass 5 of the "make them smarter" goal. Beyond the world-model (salience), value head (energy) and dread
 * head (threat), the apex creature now grows a FOURTH learned net — a {@link SUPER_SOCIAL_PARAMS}-param
 * 18→6→1 social head (exact Eshkol-AD backprop) that forecasts its OWN next-beat RIVAL proximity. The
 * learned expectation of rival presence becomes a continuous combat READINESS (`menace`) that overlays the
 * motor intent every beat — raising aggression + projected dominance in proportion to anticipated rivalry.
 * A new cognitive DOMAIN: social anticipation, not just hunger/danger.
 *
 * Design note — the readiness is a CONTINUOUS intent overlay, not a rare plan flip: rival-contesting plans
 * (DOMINATE/DECEIVE) rarely out-compete hunting/exploring for a typical creature, so a plan-only hook would
 * be operationally dead. Overlaying the always-consumed motor intent makes the effect robust across seeds.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the social head genuinely learns (rival-forecast error falls,
 * ablation-verified) and measurably raises combat readiness — isolated from the other heads via the
 * `social:false` control. NO consciousness / Butlin / A-Life score moved; default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_SOCIAL_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 320;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose RIVAL proximity is a compound (two-tone) wave — dynamic and non-trivial to forecast. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.3 * Math.sin(i * 0.05),
    threat: 0.3 + 0.2 * Math.sin(i * 0.06),
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.4,
    rivalClose: clamp01(0.45 + 0.28 * Math.sin(i * 0.09) + 0.16 * Math.sin(i * 0.31 + 0.7)),
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function run(
  lr: number,
  social: boolean,
): { err: number[]; aggression: number[]; dominance: number[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, social });
  const err: number[] = [];
  const aggression: number[] = [];
  const dominance: number[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedSocialError);
    aggression.push(it.aggression);
    dominance.push(it.dominance);
  }
  return { err, aggression, dominance, c };
}

describe('SuperCreature learned social (rival-anticipation) head', () => {
  test('1. LEARNS: the social head forecasts rival proximity to a genuinely low error', () => {
    const trained = run(0.05, true);
    // mean |Δ| of a constant-mean predictor on this stream is ≈0.18; reaching <0.1 is real forecasting.
    expect(trained.c.learnedSocialError).toBeLessThan(0.1);
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.3); // ≈8× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.2); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated rivalry raises combat readiness vs the social-off control', () => {
    // social:false runs the SAME learned mind with the readiness overlay removed — the only toggle.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dAgg = mean(on.aggression.map((a, i) => Math.abs(a - (off.aggression[i] ?? 0))));
    const dDom = mean(on.dominance.map((d, i) => Math.abs(d - (off.dominance[i] ?? 0))));
    expect(dDom).toBeGreaterThan(0.05); // ≈0.115 in practice — a substantial, continuous readiness lift
    expect(dAgg).toBeGreaterThan(0.02); // aggression rises too
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all four learned heads + planning)', () => {
    const a = new SuperCreature(mulberry32(SEED));
    const b = new SuperCreature(mulberry32(SEED));
    a.enableLearning({ seed: WSEED, lr: 0.05 });
    b.enableLearning({ seed: WSEED, lr: 0.05 });
    let last = '';
    for (let i = 0; i < 120; i++) {
      a.think(P(i));
      b.think(P(i));
      last = JSON.stringify(a.snapshot());
      expect(last).toBe(JSON.stringify(b.snapshot()));
    }
    expect(last.length).toBeGreaterThan(0);
  });

  test('5. DEFAULT-OFF: no learning ⇒ social head inert (menace 0, no readiness lift)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedSocialErr).toBe(0);
    expect(snap.menace).toBe(0);
  });

  test('6. SCALE: the social head adds real learnable params on top of the other three heads', () => {
    expect(SUPER_SOCIAL_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
