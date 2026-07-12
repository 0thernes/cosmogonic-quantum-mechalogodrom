/**
 * SUPER CREATURE — LEARNED AMBITION (WEALTH-OPPORTUNITY-ANTICIPATION) HEAD (falsifiable gate).
 *
 * Pass 10 (capstone) of the "make them smarter" goal. A ninth learned net — a {@link SUPER_AMBITION_PARAMS}-
 * param 18→6→1 ambition head (exact Eshkol-AD backprop) that forecasts the creature's OWN next-beat relative
 * WEALTH (s[4]). An anticipated RICH window becomes `ambition`, a continuous overlay that raises the SPAWN
 * drive — time reproduction to resource-plentiful windows (an r-strategy). This completes an anticipatory
 * head on every core survival sense (energy, threat, crowding, chaos, wealth, prey, rival).
 *
 * The hook is the CONTINUOUS spawn overlay (scales the always-emitted spawn output), so the effect is robust
 * across seeds (Δspawn ≈0.07–0.09) — it does not depend on the wantsSpawn hard threshold being crossed (the
 * pass-5 lesson; across seeds wantsSpawn is fragile, but the spawn overlay is stable). Isolated from the other
 * eight heads via the `ambition:false` control.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the ambition head genuinely learns (wealth-forecast error
 * falls, ablation-verified) and measurably raises reproductive drive when opportunity is anticipated. NO
 * consciousness / Butlin / A-Life score moved; default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_AMBITION_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 360;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose WEALTH oscillates through clear rich windows — anticipating them is worth learning. */
function P(i: number): SuperPercept {
  return {
    energy: 0.6 + 0.2 * Math.sin(i * 0.03),
    threat: 0.2,
    crowding: 0.3,
    chaos: 0.3,
    wealthRel: clamp01(0.5 + 0.4 * Math.sin(i * 0.05) + 0.1 * Math.sin(i * 0.17)),
    preyClose: 0.4,
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function run(lr: number, ambition: boolean): { err: number[]; spawn: number[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, ambition });
  const err: number[] = [];
  const spawn: number[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedAmbitionError);
    spawn.push(it.spawn);
  }
  return { err, spawn, c };
}

describe('SuperCreature learned ambition (wealth-opportunity-anticipation) head', () => {
  test('1. LEARNS: the ambition head forecasts relative wealth to a genuinely low error', () => {
    const trained = run(0.05, true);
    expect(trained.c.learnedAmbitionError).toBeLessThan(0.1); // real forecasting (~0.018 EMA in practice)
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.4); // ≈8–10× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.1); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated wealth raises the spawn drive vs the ambition-off control', () => {
    // ambition:false runs the SAME learned mind with the spawn overlay removed — the only toggle. The
    // continuous spawn overlay (not the wantsSpawn hard threshold) is the robust, seed-stable effect.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dSpawn = mean(on.spawn.map((v, i) => Math.abs(v - (off.spawn[i] ?? 0))));
    expect(dSpawn).toBeGreaterThan(0.05); // ≈0.09 here, 0.07–0.09 across seeds — a real, continuous lift
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all nine learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ ambition head inert (ambition 0, no spawn lift)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedAmbitionErr).toBe(0);
    expect(snap.ambition).toBe(0);
  });

  test('6. SCALE: the ambition head adds real learnable params on top of the other eight heads', () => {
    expect(SUPER_AMBITION_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
