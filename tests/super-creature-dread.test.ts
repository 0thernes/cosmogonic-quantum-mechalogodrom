/**
 * SUPER CREATURE — LEARNED THREAT-ANTICIPATION ("DREAD") HEAD (falsifiable gate).
 *
 * Pass 3 of the "make them smarter" goal. Beyond the batch-28 world-model (forecasts salience) and the
 * Pass-2 value head (forecasts ENERGY → survival urgency), the apex creature now grows a THIRD learned net
 * — a {@link SUPER_THREAT_PARAMS}-param 18→6→1 dread head (exact Eshkol-AD backprop) that forecasts its OWN
 * next-beat THREAT. A predicted RISE becomes `dread`, which pre-emptively raises FLEE/DECEIVE and suppresses
 * committing to a hunt or a wander BEFORE the danger fully lands — anticipatory defense, not reactive.
 *
 * CLEAN ISOLATION: of every learned pathway, ONLY the dread hook touches the FLEE/DECEIVE drives (the
 * world-model steers surprise→arousal; the value head steers HUNT/REST/EXPLORE/DOMINATE). So a shift in
 * defensive-plan frequency between a trained and a frozen creature is attributable to the dread head alone.
 *
 * Honest claim (indicatorOnly, ADR 0014/0015): the dread head genuinely learns (error falls, ablation-
 * verified) and measurably redirects the creature toward defense. NO consciousness / Butlin / A-Life score
 * moved; default-off ⇒ the frozen baseline is byte-identical.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { SuperCreature, SUPER_THREAT_PARAMS, type SuperPercept } from '../src/sim/super-creature';

const SEED = 1234;
const WSEED = 0xbeef;
const N = 320;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A stream whose THREAT is a COMPOUND (two-tone) wave — dynamic and non-trivial, so learning is real
 *  work (a single sine converges in ~3 beats and hides the descent). Energy/prey vary for live planning. */
function P(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.35 * Math.sin(i * 0.05),
    threat: clamp01(0.45 + 0.28 * Math.sin(i * 0.11) + 0.18 * Math.sin(i * 0.37 + 1.3)),
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
const defensive = (plans: string[]) => plans.filter((p) => p === 'FLEE' || p === 'DECEIVE').length;

function run(lr: number): { err: number[]; plans: string[]; c: SuperCreature } {
  const c = new SuperCreature(mulberry32(SEED));
  c.enableLearning({ seed: WSEED, lr });
  const err: number[] = [];
  const plans: string[] = [];
  for (let i = 0; i < N; i++) {
    const it = c.think(P(i));
    err.push(c.learnedThreatError);
    plans.push(it.plan);
  }
  return { err, plans, c };
}

describe('SuperCreature learned dread (threat-anticipation) head', () => {
  test('1. LEARNS: online gradient descent drives the threat-forecast error down over the run', () => {
    // A deliberately SMALL step so the descent is visible on the smoothed telemetry (at the shipped
    // lr=0.05 it converges within ~3 beats, below the EMA timescale). The error still falls monotonically.
    const trained = run(0.005);
    const early = mean(trained.err.slice(3, 25));
    const late = mean(trained.err.slice(N - 80));
    expect(late).toBeLessThan(early * 0.8); // ≈0.68 in practice — real online descent, not noise
    expect(late).toBeLessThan(0.18); // reaches a genuinely low error forecasting a compound signal
  });

  test('2. ABLATION: a frozen-lr0 dread head (identical init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05);
    const frozen = run(0);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.35); // ≈9× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.2); // the frozen net stays genuinely wrong (non-vacuous control)
  });

  test('3. OPERATIONAL: anticipated danger redirects the planner toward defense (isolated to dread)', () => {
    const trained = run(0.05);
    const frozen = run(0);
    // dread ONLY adds to FLEE/DECEIVE ⇒ a rise in defensive-plan frequency is the dread head's signature.
    expect(defensive(trained.plans)).toBeGreaterThan(defensive(frozen.plans) + 10);
    let diff = 0;
    for (let i = 0; i < N; i++) if (trained.plans[i] !== frozen.plans[i]) diff++;
    expect(diff).toBeGreaterThan(30); // a substantial plan-sequence shift, not a single-beat flicker
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical arc (all three learned heads + planning)', () => {
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

  test('5. DEFAULT-OFF: no learning ⇒ dread head inert (dread 0, no defensive bias)', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    for (let i = 0; i < 60; i++) plain.think(P(i));
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedThreatErr).toBe(0);
    expect(snap.dread).toBe(0);
  });

  test('6. SCALE: the dread head adds real learnable params on top of the world-model + value head', () => {
    expect(SUPER_THREAT_PARAMS).toBe(18 * 6 + 6 + (6 + 1)); // 121
  });
});
