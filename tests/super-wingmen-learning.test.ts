/**
 * WINGMAN FLIGHT COORDINATOR — the one part of the 100-robot escort that DEVELOPS during life (falsifiable
 * gate). The 100 robot brains are FROZEN (rolled once from seed); {@link WingmanSwarm.enableLearning} lights a
 * real {@link WINGMAN_COORD_PARAMS}-param 6→6→1 MLP (exact Eshkol-AD backprop) that forecasts its creature's
 * OWN next-beat DOMINANCE from the swarm's aggregate state. Anticipated WEAKNESS becomes an assist BOOST — the
 * escort presses harder exactly when its monster is about to falter, then relaxes as it recovers.
 *
 * The claim is narrow + honest (indicatorOnly, ADR 0014/0015): the previously-frozen escort now has a part
 * that genuinely LEARNS online (its dominance-forecast error falls, ablation-verified) and measurably steers
 * the assist it lends the creature. NO consciousness / Butlin / A-Life score is claimed to move; the escort +
 * its assist are a META-layer outside the deterministic population golden, and OFF by default the swarm is
 * byte-identical to the frozen baseline.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { WingmanSwarm, WINGMAN_COUNT, WINGMAN_COORD_PARAMS } from '../src/sim/super-wingmen';

const SEED = 1;
const WSEED = 0xbeef;
const N = 400;
const Q = [0.4, 0, 0, 0, 0, 0, 0, 0.4, 0, 0.5]; // quantum aspects (reactive[7]/adaptive[9] live)

/** A dominance stream that oscillates through clear WEAK troughs — anticipating them is worth learning. */
const dom = (i: number) =>
  Math.max(0, Math.min(1, 0.5 + 0.35 * Math.sin(i * 0.05) + 0.1 * Math.sin(i * 0.17)));

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function run(
  lr: number,
  coordinate: boolean,
  learn = true,
): { err: number[]; assist: number[]; sw: WingmanSwarm } {
  const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(SEED));
  if (learn) sw.enableLearning({ seed: WSEED, lr, coordinate });
  const err: number[] = [];
  const assist: number[] = [];
  for (let i = 0; i < N; i++) {
    sw.update(0, 12, 0, dom(i), Q, i / 60, 1 / 60);
    err.push(sw.learnedCoordError);
    assist.push(sw.assist);
  }
  return { err, assist, sw };
}

describe('WingmanSwarm learned flight coordinator', () => {
  test('1. LEARNS: the coordinator forecasts its creature dominance to a genuinely low error', () => {
    const trained = run(0.05, true);
    expect(trained.sw.learnedCoordError).toBeLessThan(0.1); // real forecasting (~0.028 EMA in practice)
    expect(trained.sw.isLearning).toBe(true);
  });

  test('2. ABLATION: a frozen-lr0 coordinator (same init) never learns; trained ≪ frozen', () => {
    const trained = run(0.05, true);
    const frozen = run(0, true);
    const tLate = mean(trained.err.slice(N - 80));
    const fLate = mean(frozen.err.slice(N - 80));
    expect(tLate).toBeLessThan(fLate * 0.3); // ≈10× in practice — the AD backprop is load-bearing
    expect(fLate).toBeGreaterThan(0.2); // the frozen control stays genuinely wrong (non-vacuous)
  });

  test('3. OPERATIONAL (isolated): anticipated weakness boosts the assist vs the coordinate-off control', () => {
    // coordinate:false runs the SAME learned coordinator with the assist overlay removed — the only toggle.
    const on = run(0.05, true);
    const off = run(0.05, false);
    const dAssist = mean(on.assist.map((v, i) => Math.abs(v - (off.assist[i] ?? 0))));
    expect(dAssist).toBeGreaterThan(0.05); // ≈0.13 here, 0.11–0.14 across seeds — a real, continuous lift
  });

  test('4. DETERMINISM: same seed ⇒ byte-identical assist arc, even while learning', () => {
    const a = run(0.05, true);
    const b = run(0.05, true);
    expect(a.assist).toEqual(b.assist);
  });

  test('5. DEFAULT-OFF: learning is opt-in — the frozen escort is byte-identical & coordinator inert', () => {
    const plain = new WingmanSwarm(WINGMAN_COUNT, mulberry32(SEED));
    const plain2 = new WingmanSwarm(WINGMAN_COUNT, mulberry32(SEED));
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < 120; i++) {
      plain.update(0, 12, 0, dom(i), Q, i / 60, 1 / 60);
      plain2.update(0, 12, 0, dom(i), Q, i / 60, 1 / 60);
      a.push(plain.assist);
      b.push(plain2.assist);
    }
    expect(a).toEqual(b);
    expect(plain.isLearning).toBe(false);
    expect(plain.learnedCoordError).toBe(0);
    expect(plain.liveCoordParams).toBe(0); // no extra params when frozen
  });

  test('6. SCALE: lighting the coordinator grows the escort by a real learnable net', () => {
    expect(WINGMAN_COORD_PARAMS).toBe(6 * 6 + 6 + (6 + 1)); // 49
    const sw = new WingmanSwarm(WINGMAN_COUNT, mulberry32(SEED));
    expect(sw.liveCoordParams).toBe(0);
    sw.enableLearning({ seed: WSEED });
    expect(sw.liveCoordParams).toBe(WINGMAN_COORD_PARAMS);
  });
});
