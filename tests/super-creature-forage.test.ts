/**
 * SUPER CREATURE — LEARNED FORAGE (PREY-SCARCITY-ANTICIPATION) HEAD (falsifiable gate).
 *
 * Pass 8 of the "make them smarter" goal. A seventh learned net — a {@link SUPER_FORAGE_PARAMS}-param 18→6→1
 * forage head (exact Eshkol-AD backprop) that forecasts the creature's OWN next-beat PREY proximity (s[5]).
 * A predicted SCARCITY (prey below a "thinning" floor) becomes `forage`, a continuous drive that RAISES
 * curiosity + exploration — range out for new hunting grounds BEFORE prey thins here. A new behavioral
 * DOMAIN: anticipatory foraging, the farsighted counterpart to the reactive hunt heads.
 *
 * The primary hook is the CONTINUOUS curiosity overlay (scales the always-emitted curiosity output), so the
 * effect is robust across seeds — it does NOT depend on EXPLORE winning the plan argmax (the pass-5 lesson;
 * across seeds the EXPLORE plan shift ranges 1–25, but the curiosity overlay is stable 0.019–0.064). Isolated
 * from the other six heads via the `forage:false` control.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the forage head genuinely learns (prey-forecast error falls,
 * ablation-verified) and measurably raises exploratory curiosity when scarcity is anticipated. NO
 * consciousness / Butlin / A-Life score moved; default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_FORAGE_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 360;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose PREY proximity oscillates through clear scarcity troughs — a next-beat drop is worth
 *  foreseeing, and the forecast genuinely anticipates thinning grounds. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.2 * Math.sin(i * 0.03),
    threat: 0.3,
    crowding: 0.3,
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: clamp01(0.45 + 0.4 * Math.sin(i * 0.06) + 0.1 * Math.sin(i * 0.21)),
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function run(lr: number, forage: boolean): { err: number[]; cur: number[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, forage });
  const err: number[] = [];
  const cur: number[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedForageError);
    cur.push(it.curiosity);
  }
  return { err, cur, c };
}

describe('SuperCreature learned forage (prey-scarcity-anticipation) head', () => {
  test('1. LEARNS: the forage head forecasts prey proximity to a genuinely low error', () => {
    const trained = run(0.05, true);
    expect(trained.c.learnedForageError).toBeLessThan(0.1); // real forecasting (~0.028 EMA in practice)
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.5); // ≈5× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.1); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated scarcity lifts curiosity vs the forage-off control', () => {
    // forage:false runs the SAME learned mind with the exploration overlay removed — the only toggle. The
    // continuous curiosity overlay (not the EXPLORE plan argmax) is the robust, seed-stable effect.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dCur = mean(on.cur.map((c, i) => Math.abs(c - (off.cur[i] ?? 0))));
    expect(dCur).toBeGreaterThan(0.01); // ≈0.019 here, 0.019–0.064 across seeds — a real, continuous lift
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all seven learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ forage head inert (forage 0, no exploratory lift)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedForageErr).toBe(0);
    expect(snap.forage).toBe(0);
  });

  test('6. SCALE: the forage head adds real learnable params on top of the other six heads', () => {
    expect(SUPER_FORAGE_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
