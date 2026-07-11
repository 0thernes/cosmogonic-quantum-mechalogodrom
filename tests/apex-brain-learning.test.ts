/**
 * APEX ABOMINATION — ONLINE SELF-MODEL LEARNING (falsifiable ablation gate).
 *
 * The eleven organs of the Entropic Tesseract Hydra hold ZERO trainable parameters — their plan signal
 * is hand-coded. This gate proves the ONE part that now LEARNS: the online self-model lit by
 * {@link ApexBrain.enableLearning}, a real 8→6→1 MLP trained by exact reverse-mode Eshkol-AD backprop
 * that forecasts the brain's OWN next-beat vitality, correcting itself every beat; its forecast error
 * then colours `agony` as a bounded metacognitive ache.
 *
 * The honest claim (indicatorOnly, ADR 0014/0015): the previously all-frozen Abomination now learns a
 * self-model online, provably reducing its own vitality-forecast error, and that error is felt (agony).
 * NO consciousness / Butlin / A-Life score is claimed to move.
 *
 * Design note — the ablation is CONFOUND-FREE: `agony` does not feed back into the organ cascade, so a
 * trained brain and a frozen-lr0 brain have an IDENTICAL vitality trajectory (the regression target).
 * The only difference between them is how well the net forecasts that shared target. The Abomination is
 * entropic — vitality decays toward 0 — so the non-vacuous learnable signal lives in the DYNAMIC early
 * window; measuring there (with a vitality-variance guard) keeps the test from rewarding a dead target.
 */
import { describe, expect, test } from 'bun:test';
import { ApexBrain, APEX_SELFMODEL_PARAMS, type ApexPercept } from '../src/sim/apex-brain';

const SEED = 0xabcdef;
const N = 70;
const W: readonly [number, number] = [20, 60]; // the dynamic window (vitality still alive + varying)

/** A smooth, moderate percept stream — keeps drive low enough that vitality stays dynamic in W. */
function ap(i: number): ApexPercept {
  return {
    threat: 0.3 + 0.25 * Math.sin(i * 0.06),
    energy: 0.5,
    chaos: 0.25 + 0.2 * Math.cos(i * 0.045),
    novelty: 0.35 + 0.25 * Math.sin(i * 0.028),
    level: 150,
  };
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};

/** Run a learning ApexBrain over the stream; return per-beat self-model error + vitality. */
function run(
  lr: number,
  seed = SEED,
): { err: number[]; vit: number[]; agony: number[]; brain: ApexBrain } {
  const b = new ApexBrain(seed);
  b.enableLearning({ lr });
  const err: number[] = [];
  const vit: number[] = [];
  const agony: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = b.tick(ap(i));
    err.push(b.selfModelError);
    vit.push(t.vitality);
    agony.push(t.agony);
  }
  return { err, vit, agony, brain: b };
}

const win = (a: number[]) => a.slice(W[0], W[1]);

describe('ApexBrain online self-model', () => {
  test('1. LEARNING + ABLATION: trained forecast ≪ a frozen-lr0 net on an IDENTICAL, dynamic target', () => {
    const trained = run(0.05);
    const frozen = run(0); // the ablation control: forecasts but never learns

    // the target trajectory is genuinely dynamic in the window (not a dead/constant signal) …
    expect(sd(win(trained.vit))).toBeGreaterThan(0.08);
    // … and IDENTICAL for trained vs frozen (agony does not feed the organs ⇒ confound-free ablation).
    expect(JSON.stringify(trained.vit)).toBe(JSON.stringify(frozen.vit));

    const tErr = mean(win(trained.err));
    const fErr = mean(win(frozen.err));
    expect(tErr).toBeLessThan(fErr * 0.4); // AD backprop is load-bearing (≈7× better in practice)
    expect(trained.brain.isLearning).toBe(true);
  });

  test('2. OPERATIONAL: learning colours agony — a learning brain ≠ a plain brain (not decorative)', () => {
    const trained = run(0.05, 0x999);
    const plain = new ApexBrain(0x999); // never learns
    const plainAgony: number[] = [];
    for (let i = 0; i < N; i++) plainAgony.push(plain.tick(ap(i)).agony);
    // the metacognitive ache actually moved agony somewhere in the run.
    expect(JSON.stringify(trained.agony)).not.toBe(JSON.stringify(plainAgony));
  });

  test('3. ORGANS UNTOUCHED: the self-model writes nothing back — vitality+motor identical to baseline', () => {
    const plain = new ApexBrain(SEED); // never learns
    const lr0 = new ApexBrain(SEED);
    lr0.enableLearning({ lr: 0 }); // machinery on, weights frozen
    for (let i = 0; i < N; i++) {
      const a = plain.tick(ap(i));
      const b = lr0.tick(ap(i));
      expect(b.vitality).toBe(a.vitality); // organ cascade byte-identical (no rng draw, no writeback)
      expect(b.motor).toEqual(a.motor);
    }
  });

  test('4. DETERMINISM: two learning brains, same seed ⇒ byte-identical snapshots', () => {
    const x = new ApexBrain(0x777);
    const y = new ApexBrain(0x777);
    x.enableLearning({ lr: 0.05 });
    y.enableLearning({ lr: 0.05 });
    let last = '';
    for (let i = 0; i < N; i++) {
      x.tick(ap(i));
      y.tick(ap(i));
      last = JSON.stringify(x.snapshot());
      expect(last).toBe(JSON.stringify(y.snapshot()));
    }
    expect(last.length).toBeGreaterThan(0);
  });

  test('5. DEFAULT-OFF: learning is opt-in — plain brain is frozen baseline & param-stable', () => {
    const a = new ApexBrain(SEED);
    const b = new ApexBrain(SEED);
    let last = '';
    for (let i = 0; i < N; i++) {
      a.tick(ap(i));
      b.tick(ap(i));
      last = JSON.stringify(a.snapshot());
      expect(last).toBe(JSON.stringify(b.snapshot()));
    }
    const snap = a.snapshot();
    expect(snap.learning).toBe(false);
    expect(snap.selfModelErr).toBe(0);
    expect(a.liveParameterCount()).toBe(a.parameterCount()); // no extra params when frozen
  });

  test('6. SCALE: lighting learning grows the live network by the self-model params', () => {
    expect(APEX_SELFMODEL_PARAMS).toBe(8 * 6 + 6 + (6 + 1)); // 61: (in·h+h)+(h+1)
    const sc = new ApexBrain(SEED);
    const base = sc.liveParameterCount();
    sc.enableLearning();
    expect(sc.liveParameterCount()).toBe(base + APEX_SELFMODEL_PARAMS);
  });
});
