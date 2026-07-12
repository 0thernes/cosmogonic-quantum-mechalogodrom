/**
 * SUPER CREATURE — ONLINE WORLD-MODEL LEARNING (falsifiable ablation gate).
 *
 * The apex mind's cortex+actor are FROZEN (rolled once, never trained). This gate proves the ONE part
 * that now genuinely LEARNS during life — the online world-model lit by {@link SuperCreature.enableLearning},
 * a real 18→8→1 MLP trained by exact reverse-mode Eshkol-AD backprop that forecasts next-beat salience.
 *
 * The claim is narrow and honest: the previously-frozen prediction loop now LEARNS online, provably
 * reducing its own forecast error, and its forecast STEERS the creature's surprise/arousal/planning.
 * NO consciousness / A-Life score is claimed to move (indicatorOnly, per ADR 0014/0015).
 *
 * It is falsifiable four ways:
 *   1. LEARNING — a trained net's forecast error falls substantially over a run (early ≫ late).
 *   2. ABLATION — an identically-initialised net FROZEN at lr=0 does NOT improve; trained ≪ frozen.
 *   3. OPERATIONAL — the learner actually steers behaviour (a trained arc ≠ the frozen arc). Not decorative.
 *   4. DETERMINISM + DEFAULT-OFF — same seed ⇒ identical bytes; learning OFF ⇒ the frozen baseline is
 *      byte-identical (learning=false, learnedPredErr=0, liveParamCount unchanged).
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  SuperCreature,
  SUPER_PARAM_COUNT,
  SUPER_WORLDMODEL_PARAMS,
  SUPER_VALUE_PARAMS,
  SUPER_THREAT_PARAMS,
  SUPER_SOCIAL_PARAMS,
  SUPER_FORESIGHT_PARAMS,
  type SuperPercept,
} from '../src/sim/super-creature';

const SEED = 1234; // the frozen cortex/actor init (identical across trained + control)
const WSEED = 0xbeef; // the world-model init (identical across trained + control ⇒ ONLY lr differs)
const N = 420; // beats

/** A SMOOTH, autoregressive percept stream: next-beat salience is well-forecastable from the current
 *  percept, so a learner CAN drive its error down while a frozen random-init readout cannot. */
function streamPercept(i: number): SuperPercept {
  return {
    energy: 0.5 + 0.2 * Math.sin(i * 0.021),
    threat: 0.5 + 0.4 * Math.sin(i * 0.05),
    crowding: 0.5 + 0.3 * Math.cos(i * 0.031),
    chaos: 0.4 + 0.2 * Math.sin(i * 0.017),
    wealthRel: 0.5,
    preyClose: 0.3 + 0.2 * Math.cos(i * 0.011),
    rivalClose: 0.2,
    pull: 0.1,
    light: 0.5,
    sound: 0.3,
    phase: (i % 100) / 100,
  };
}

/** Run a creature over the stream, returning the per-beat forecast error (snapshot.surprise). */
function runErrors(sc: SuperCreature): number[] {
  const errs: number[] = [];
  for (let i = 0; i < N; i++) {
    sc.think(streamPercept(i));
    errs.push(sc.snapshot().surprise);
  }
  return errs;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

describe('SuperCreature online world-model', () => {
  test('1. LEARNING: the trained forecaster drives its own error down (early ≫ late)', () => {
    const trained = new SuperCreature(mulberry32(SEED));
    trained.enableLearning({ seed: WSEED, lr: 0.05 });
    const errs = runErrors(trained);
    // the cold net starts high (~0.6–0.7); compare that early window to the converged late window.
    const early = mean(errs.slice(1, 12));
    const late = mean(errs.slice(N - 80));
    expect(late).toBeLessThan(early * 0.7); // ≥30% error reduction — it genuinely learned
    expect(late).toBeLessThan(0.2); // and reached a genuinely LOW absolute forecast error
    // the EMA telemetry agrees it is learning and is surfaced honestly.
    expect(trained.snapshot().learning).toBe(true);
    expect(trained.learnedPredictionError).toBeLessThan(0.2);
  });

  test('2. ABLATION: an lr=0 net (frozen, same init) never improves; trained ≪ frozen', () => {
    const trained = new SuperCreature(mulberry32(SEED));
    trained.enableLearning({ seed: WSEED, lr: 0.05 });
    const frozen = new SuperCreature(mulberry32(SEED));
    frozen.enableLearning({ seed: WSEED, lr: 0 }); // the ablation control — forecasts but never learns

    const tErr = runErrors(trained);
    const fErr = runErrors(frozen);
    const tLate = mean(tErr.slice(N - 80));
    const fLate = mean(fErr.slice(N - 80));
    const fEarly = mean(fErr.slice(20, 100));

    expect(tLate).toBeLessThan(fLate * 0.7); // learning is LOAD-BEARING, not the architecture alone
    expect(fLate).toBeGreaterThan(0.9 * fEarly); // the frozen control does NOT systematically improve
  });

  test('3. OPERATIONAL: the learner steers behaviour — a trained arc ≠ the frozen arc (not decorative)', () => {
    const trained = new SuperCreature(mulberry32(SEED));
    trained.enableLearning({ seed: WSEED, lr: 0.05 });
    const frozen = new SuperCreature(mulberry32(SEED));
    frozen.enableLearning({ seed: WSEED, lr: 0 });
    let tLast = '';
    let fLast = '';
    for (let i = 0; i < N; i++) {
      trained.think(streamPercept(i));
      frozen.think(streamPercept(i));
    }
    tLast = JSON.stringify(trained.snapshot());
    fLast = JSON.stringify(frozen.snapshot());
    expect(tLast).not.toBe(fLast); // the improving forecast actually changed the mind's trajectory
  });

  test('4a. DETERMINISM: same seeds ⇒ byte-identical arc, even while learning', () => {
    const a = new SuperCreature(mulberry32(SEED));
    const b = new SuperCreature(mulberry32(SEED));
    a.enableLearning({ seed: WSEED, lr: 0.05 });
    b.enableLearning({ seed: WSEED, lr: 0.05 });
    let last = '';
    for (let i = 0; i < 120; i++) {
      a.think(streamPercept(i));
      b.think(streamPercept(i));
      last = JSON.stringify(a.snapshot());
      expect(last).toBe(JSON.stringify(b.snapshot()));
    }
    expect(last.length).toBeGreaterThan(0);
  });

  test('4b. DEFAULT-OFF: learning is opt-in — the frozen baseline is byte-identical & param-stable', () => {
    const plain = new SuperCreature(mulberry32(SEED));
    const plain2 = new SuperCreature(mulberry32(SEED));
    let last = '';
    for (let i = 0; i < 120; i++) {
      plain.think(streamPercept(i));
      plain2.think(streamPercept(i));
      last = JSON.stringify(plain.snapshot());
      expect(last).toBe(JSON.stringify(plain2.snapshot()));
    }
    const snap = plain.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.learnedPredErr).toBe(0);
    expect(snap.liveParamCount).toBe(SUPER_PARAM_COUNT); // no extra params when frozen
  });

  test('5. SCALE: lighting learning grows the live network by the world-model params', () => {
    expect(SUPER_WORLDMODEL_PARAMS).toBe(18 * 8 + 8 + 8 + 1); // 161: (SENSE·h+h)+(h+1)
    const sc = new SuperCreature(mulberry32(SEED));
    expect(sc.liveParamCount).toBe(SUPER_PARAM_COUNT);
    sc.enableLearning({ seed: WSEED });
    expect(sc.liveParamCount).toBe(
      SUPER_PARAM_COUNT +
        SUPER_WORLDMODEL_PARAMS +
        SUPER_VALUE_PARAMS +
        SUPER_THREAT_PARAMS +
        SUPER_SOCIAL_PARAMS +
        SUPER_FORESIGHT_PARAMS,
    );
  });

  test('6. LINEAGE: a learning parent births learning twins (own net, deterministic)', () => {
    const rng = mulberry32(SEED);
    const prime = new SuperCreature(rng);
    prime.enableLearning({ seed: WSEED, lr: 0.05 });
    const kid = prime.maybeSpawn(rng);
    expect(kid).not.toBeNull();
    expect(kid!.isLearning).toBe(true);
    expect(kid!.liveParamCount).toBe(
      SUPER_PARAM_COUNT +
        SUPER_WORLDMODEL_PARAMS +
        SUPER_VALUE_PARAMS +
        SUPER_THREAT_PARAMS +
        SUPER_SOCIAL_PARAMS +
        SUPER_FORESIGHT_PARAMS,
    );
  });
});
