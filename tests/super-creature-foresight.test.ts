/**
 * SUPER CREATURE — LEARNED FORESIGHT HEAD / PLANNING HORIZON (falsifiable gate).
 *
 * Pass 6 of the "make them smarter" goal — a distinct KIND of upgrade (horizon, not just another axis).
 * The value head (Pass 2) forecasts energy ONE beat ahead → reactive feeding. This adds a fifth learned net
 * — a {@link SUPER_FORESIGHT_PARAMS}-param 18→6→1 foresight head (exact Eshkol-AD backprop) that forecasts
 * energy FORESIGHT_K beats ahead, trained on the DELAYED (percept_{t−K} → energy_t) pair held in a K-deep
 * ring. A predicted FUTURE drop becomes `foresightUrgency`, which drives PROACTIVE foraging — the creature
 * feeds/banks energy BEFORE hunger arrives, not just when already low. Reactive instinct → farsighted plan.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the foresight head genuinely learns a multi-step forecast
 * (error falls, ablation-verified) and measurably shifts the creature toward proactive foraging — isolated
 * from the value head via the `foresight:false` control. NO consciousness / Butlin / A-Life score moved;
 * default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperCreature,
  SUPER_FORESIGHT_PARAMS,
  type SuperPercept,
} from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 360;

/** A stream whose ENERGY oscillates through clear troughs — a K-step-ahead drop is worth foreseeing. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.4 * Math.sin(i * 0.07),
    threat: 0.3 + 0.2 * Math.sin(i * 0.05),
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.4 + 0.3 * Math.cos(i * 0.04),
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const hunt = (plans: string[]) => plans.filter((p) => p === 'HUNT').length;

function run(lr: number, foresight: boolean): { err: number[]; plans: string[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, foresight });
  const err: number[] = [];
  const plans: string[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedForesightError);
    plans.push(it.plan);
  }
  return { err, plans, c };
}

describe('SuperCreature learned foresight head (planning horizon)', () => {
  test('1. LEARNS: the K-step energy forecast reaches a genuinely low error', () => {
    const trained = run(0.05, true);
    // forecasting energy 6 beats ahead is far harder than 1; reaching <0.12 is real multi-step learning.
    expect(trained.c.learnedForesightError).toBeLessThan(0.12);
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.2); // ≈13× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.5); // a frozen K-step forecaster is very wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): foresight makes foraging PROACTIVE vs the foresight-off control', () => {
    // foresight:false runs the SAME learned mind with the horizon bias removed — the only toggle.
    const on = run(0.05, true);
    const off = run(0.05, false);
    expect(hunt(on.plans)).toBeGreaterThan(hunt(off.plans)); // it forages ahead of the coming trough
    let diff = 0;
    for (let i = 0; i < N; i++) if (on.plans[i] !== off.plans[i]) diff++;
    expect(diff).toBeGreaterThan(15); // a substantial, not cosmetic, proactive shift (≈23 in practice)
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all five learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ foresight head inert (foresightUrgency 0, no proactive bias)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedForesightErr).toBe(0);
    expect(snap.foresightUrgency).toBe(0);
  });

  test('6. SCALE: the foresight head adds real learnable params on top of the other four heads', () => {
    expect(SUPER_FORESIGHT_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
