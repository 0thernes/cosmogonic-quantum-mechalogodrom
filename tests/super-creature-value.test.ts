/**
 * SUPER CREATURE — LEARNED VALUE HEAD + SURVIVAL-AWARE PLANNING (falsifiable gate).
 *
 * Pass 2 of the "make them smarter" goal. Beyond the batch-28 world-model (which forecasts salience), the
 * apex creature now grows a second learned net — a {@link SUPER_VALUE_PARAMS}-param 18→6→1 value head
 * (exact Eshkol-AD backprop) that forecasts its OWN next-beat ENERGY. A predicted energy DROP becomes
 * "survival urgency" that biases the GOAP planner toward feeding/conserving and away from risky wandering.
 * Reactive instinct becomes learned, value-directed goal selection — a qualitative intelligence upgrade.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the value head genuinely learns (error falls, ablation-
 * verified) and measurably redirects the creature's plans. NO consciousness / Butlin / A-Life score moved.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_VALUE_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 300;

/** A stream whose ENERGY oscillates (dynamic ⇒ learnable) with varying threat/prey for real planning. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.4 * Math.sin(i * 0.06),
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

function run(lr: number): { err: number[]; plans: string[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr });
  const err: number[] = [];
  const plans: string[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedValueError);
    plans.push(it.plan);
  }
  return { err, plans, c };
}

describe('SuperCreature learned value head', () => {
  test('1. LEARNS: the value head drives its energy-forecast error down (early ≫ late)', () => {
    const trained = run(0.05);
    const early = mean(trained.err.slice(5, 40));
    const late = mean(trained.err.slice(N - 80));
    expect(late).toBeLessThan(early * 0.5); // ≥50% error reduction — it learns survival value
    expect(trained.c.learnedValueError).toBeLessThan(0.05);
  });

  test('2. ABLATION: a frozen-lr0 value head never learns; trained ≪ frozen', () => {
    const trained = run(0.05);
    const frozen = run(0);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.2); // ≈28× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.1); // frozen stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL: survival value redirects the planner — plans differ trained vs frozen', () => {
    const trained = run(0.05);
    const frozen = run(0);
    expect(JSON.stringify(trained.plans)).not.toBe(JSON.stringify(frozen.plans));
    // the shift is substantial, not a single-beat flicker.
    let diff = 0;
    for (let i = 0; i < N; i++) if (trained.plans[i] !== frozen.plans[i]) diff++;
    expect(diff).toBeGreaterThan(20);
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (value head + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ value head inert (survivalUrgency 0, no plan bias)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedValueErr).toBe(0);
    expect(snap.survivalUrgency).toBe(0);
  });

  test('6. SCALE: the value head adds real learnable params on top of the world-model', () => {
    expect(SUPER_VALUE_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
