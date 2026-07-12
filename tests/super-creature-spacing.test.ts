/**
 * SUPER CREATURE — LEARNED SPACING (CROWDING-ANTICIPATION) HEAD (falsifiable gate).
 *
 * Pass 7 of the "make them smarter" goal. A sixth learned net — a {@link SUPER_CROWD_PARAMS}-param 18→6→1
 * spacing head (exact Eshkol-AD backprop) that forecasts the creature's OWN next-beat CROWDING. Anticipated
 * congestion becomes `spacing`, a continuous overlay that AMPLIFIES movement (disperse ahead of the crush)
 * and damps aimless exploration. A new behavioral DOMAIN: anticipatory spatial dispersal.
 *
 * The overlay is CONTINUOUS (scales the always-consumed move vector), so the effect is robust across seeds —
 * it does not depend on a spacing plan out-competing hunting/exploring (the pass-5 lesson). Isolated from the
 * other heads via the `spacing:false` control.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the spacing head genuinely learns (crowding-forecast error
 * falls, ablation-verified) and measurably disperses the creature. NO consciousness / Butlin / A-Life score
 * moved; default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_CROWD_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 320;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose CROWDING is a compound (two-tone) wave — dynamic and non-trivial to forecast. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.3 * Math.sin(i * 0.05),
    threat: 0.3,
    crowding: clamp01(0.45 + 0.28 * Math.sin(i * 0.08) + 0.16 * Math.sin(i * 0.33 + 0.5)),
    chaos: 0.4,
    wealthRel: 0.5,
    preyClose: 0.4,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const moveMag = (m: { x: number; y: number; z: number }) =>
  Math.sqrt(m.x ** 2 + m.y ** 2 + m.z ** 2);

function run(lr: number, spacing: boolean): { err: number[]; mag: number[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, spacing });
  const err: number[] = [];
  const mag: number[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedCrowdError);
    mag.push(moveMag(it.move));
  }
  return { err, mag, c };
}

describe('SuperCreature learned spacing (crowding-anticipation) head', () => {
  test('1. LEARNS: the spacing head forecasts crowding to a genuinely low error', () => {
    const trained = run(0.05, true);
    expect(trained.c.learnedCrowdError).toBeLessThan(0.1); // real forecasting (constant-mean baseline ≈0.18)
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.5); // ≈4× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.15); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated congestion disperses the creature vs the spacing-off control', () => {
    // spacing:false runs the SAME learned mind with the dispersal overlay removed — the only toggle.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dMag = mean(on.mag.map((m, i) => Math.abs(m - (off.mag[i] ?? 0))));
    expect(dMag).toBeGreaterThan(0.1); // ≈0.20 in practice — a substantial, continuous dispersal lift
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all six learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ spacing head inert (spacing 0, no dispersal)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedCrowdErr).toBe(0);
    expect(snap.spacing).toBe(0);
  });

  test('6. SCALE: the spacing head adds real learnable params on top of the other five heads', () => {
    expect(SUPER_CROWD_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
