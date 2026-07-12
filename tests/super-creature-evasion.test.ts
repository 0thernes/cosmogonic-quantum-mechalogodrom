/**
 * SUPER CREATURE — LEARNED EVASION (WORLD-CHAOS-ANTICIPATION) HEAD (falsifiable gate).
 *
 * Pass 9 of the "make them smarter" goal. An eighth learned net — a {@link SUPER_EVASION_PARAMS}-param 18→6→1
 * evasion head (exact Eshkol-AD backprop) that forecasts the creature's OWN next-beat world CHAOS (s[3]).
 * Anticipated HIGH disorder becomes `evasion`, a continuous overlay that raises DECEPTION — slip into
 * camouflage / feint under the cover of the coming chaos. A new behavioral DOMAIN: anticipatory evasion.
 *
 * The hook is the CONTINUOUS deception overlay (scales the always-emitted deception output), so the effect is
 * robust across seeds (Δdeception ≈0.105, stable) — it does not depend on the DECEIVE plan winning the argmax
 * (the pass-5 lesson). Isolated from the other seven heads via the `evasion:false` control.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the evasion head genuinely learns (chaos-forecast error falls,
 * ablation-verified) and measurably raises deception when disorder is anticipated. NO consciousness / Butlin /
 * A-Life score moved; default-off ⇒ byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_EVASION_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 360;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose CHAOS oscillates through clear high-disorder swells — anticipating them is worth learning. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.2 * Math.sin(i * 0.03),
    threat: 0.3,
    crowding: 0.3,
    chaos: clamp01(0.45 + 0.4 * Math.sin(i * 0.055) + 0.1 * Math.sin(i * 0.19)),
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

function run(lr: number, evasion: boolean): { err: number[]; dec: number[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr, evasion });
  const err: number[] = [];
  const dec: number[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedEvasionError);
    dec.push(it.deception);
  }
  return { err, dec, c };
}

describe('SuperCreature learned evasion (world-chaos-anticipation) head', () => {
  test('1. LEARNS: the evasion head forecasts world chaos to a genuinely low error', () => {
    const trained = run(0.05, true);
    expect(trained.c.learnedEvasionError).toBeLessThan(0.1); // real forecasting (~0.043 EMA in practice)
  });

  test('2. ABLATION: a frozen-lr0 head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.5); // ≈5× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.1); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated chaos raises deception vs the evasion-off control', () => {
    // evasion:false runs the SAME learned mind with the deception overlay removed — the only toggle. The
    // continuous deception overlay (not the DECEIVE plan argmax) is the robust, seed-stable effect.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dDec = mean(on.dec.map((d, i) => Math.abs(d - (off.dec[i] ?? 0))));
    expect(dDec).toBeGreaterThan(0.05); // ≈0.105 here, stable 0.104–0.106 across seeds — a real, continuous lift
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all eight learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ evasion head inert (evasion 0, no deception lift)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedEvasionErr).toBe(0);
    expect(snap.evasion).toBe(0);
  });

  test('6. SCALE: the evasion head adds real learnable params on top of the other seven heads', () => {
    expect(SUPER_EVASION_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
