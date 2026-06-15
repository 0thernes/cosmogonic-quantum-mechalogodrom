/**
 * Game-theory leaf tests (CONTRACTS V3.3): known equilibria of the iterated
 * strategies, history ring behavior, payoff bookkeeping, and replicator-dynamics
 * fixed points. Pure math — no DOM, no three.js.
 */
import { describe, expect, test } from 'bun:test';
import {
  COOPERATE,
  DEFECT,
  GTFT_GENEROSITY,
  HISTORY_WINDOW,
  PRISONERS_DILEMMA,
  STAG_HUNT,
  STRATEGIES,
  alwaysDefect,
  createHistory,
  defections,
  generousTitForTat,
  grimTrigger,
  meanPayoff,
  pavlov,
  payoff,
  playRound,
  pushHistory,
  replicatorStep,
  titForTat,
} from '../src/math/games';

describe('payoff matrices', () => {
  test('prisoners dilemma satisfies T > R > P > S and 2R > T + S', () => {
    const m = PRISONERS_DILEMMA;
    expect(m.dc).toBeGreaterThan(m.cc);
    expect(m.cc).toBeGreaterThan(m.dd);
    expect(m.dd).toBeGreaterThan(m.cd);
    expect(2 * m.cc).toBeGreaterThan(m.dc + m.cd);
  });

  test('payoff() reads the matrix from the row perspective', () => {
    expect(payoff(PRISONERS_DILEMMA, COOPERATE, COOPERATE)).toBe(3);
    expect(payoff(PRISONERS_DILEMMA, COOPERATE, DEFECT)).toBe(0);
    expect(payoff(PRISONERS_DILEMMA, DEFECT, COOPERATE)).toBe(5);
    expect(payoff(PRISONERS_DILEMMA, DEFECT, DEFECT)).toBe(1);
  });

  test('meanPayoff is the arithmetic mean of the four cells', () => {
    expect(meanPayoff(PRISONERS_DILEMMA)).toBeCloseTo((3 + 0 + 5 + 1) / 4, 12);
  });
});

describe('history ring', () => {
  test('pushHistory packs most-recent-first bits and saturates rounds at the window', () => {
    const h = createHistory();
    pushHistory(h, DEFECT, COOPERATE);
    pushHistory(h, COOPERATE, DEFECT);
    // bit 0 = most recent: A played D then C → movesA = 0b10.
    expect(h.movesA).toBe(0b10);
    expect(h.movesB).toBe(0b01);
    expect(h.rounds).toBe(2);
    for (let i = 0; i < HISTORY_WINDOW + 5; i++) pushHistory(h, DEFECT, DEFECT);
    expect(h.rounds).toBe(HISTORY_WINDOW);
    expect(defections(h.movesA, h.rounds)).toBe(HISTORY_WINDOW);
  });

  test('the window forgets: a defection scrolls out after WINDOW cooperative rounds', () => {
    const h = createHistory();
    pushHistory(h, DEFECT, COOPERATE);
    for (let i = 0; i < HISTORY_WINDOW; i++) pushHistory(h, COOPERATE, COOPERATE);
    expect(defections(h.movesA, h.rounds)).toBe(0);
  });

  test('window ≥ 32 is clamped, not wrapped: bits survive and defections stay countable', () => {
    // JS shift counts are taken mod 32, so an unclamped window = 32 would make `1 << 32` = 1,
    // mask = 0, and silently ERASE both rings on every push (and report ZERO defections) while
    // `rounds` kept saturating. Both pushHistory and defections clamp window to ≤ 30 to prevent
    // this. No caller passes a non-default window — this pins the defensive seal against regress.
    const h = createHistory();
    for (let i = 0; i < 40; i++) pushHistory(h, DEFECT, DEFECT, 32);
    // Clamped to a 30-bit ring, all visible rounds are defections — never a wrapped-to-0 mask.
    expect(h.movesA).toBeGreaterThan(0);
    expect(h.rounds).toBe(30);
    expect(defections(h.movesA, h.rounds, 32)).toBe(30);
    // The clamp is invisible on the live path: the default window matches an explicit small one.
    const g = createHistory();
    for (let i = 0; i < HISTORY_WINDOW + 3; i++) pushHistory(g, DEFECT, COOPERATE, HISTORY_WINDOW);
    expect(defections(g.movesA, g.rounds)).toBe(defections(g.movesA, g.rounds, HISTORY_WINDOW));
  });
});

describe('strategy equilibria', () => {
  test('PD lock-in: TFT vs ALWAYS-DEFECT converges to mutual defection forever', () => {
    const h = createHistory();
    // Round 1: TFT opens cooperatively, gets suckered.
    let r = playRound(PRISONERS_DILEMMA, titForTat, alwaysDefect, h);
    expect(r.a).toBe(COOPERATE);
    expect(r.b).toBe(DEFECT);
    pushHistory(h, r.a, r.b);
    // All later rounds: defect-defect absorbing state.
    for (let i = 0; i < 20; i++) {
      r = playRound(PRISONERS_DILEMMA, titForTat, alwaysDefect, h);
      expect(r.a).toBe(DEFECT);
      expect(r.b).toBe(DEFECT);
      expect(r.payoffA).toBe(PRISONERS_DILEMMA.dd);
      pushHistory(h, r.a, r.b);
    }
  });

  test('mutual TFT sustains full cooperation', () => {
    const h = createHistory();
    for (let i = 0; i < 20; i++) {
      const r = playRound(PRISONERS_DILEMMA, titForTat, titForTat, h);
      expect(r.a).toBe(COOPERATE);
      expect(r.b).toBe(COOPERATE);
      pushHistory(h, r.a, r.b);
    }
  });

  test('grim trigger punishes within the window and forgives once it scrolls out', () => {
    const h = createHistory();
    pushHistory(h, COOPERATE, DEFECT); // opponent defects once
    expect(grimTrigger(h.movesA, h.movesB, h.rounds, 0)).toBe(DEFECT);
    for (let i = 0; i < HISTORY_WINDOW; i++) pushHistory(h, DEFECT, COOPERATE);
    // The original betrayal aged out of the ring — the grudge dissolves.
    expect(grimTrigger(h.movesA, h.movesB, h.rounds, 0)).toBe(COOPERATE);
  });

  test('pavlov: win-stay/lose-shift fixed points', () => {
    const h = createHistory();
    pushHistory(h, COOPERATE, COOPERATE); // matched ⇒ stay cooperative
    expect(pavlov(h.movesA, h.movesB, h.rounds, 0)).toBe(COOPERATE);
    pushHistory(h, COOPERATE, DEFECT); // mismatched ⇒ shift
    expect(pavlov(h.movesA, h.movesB, h.rounds, 0)).toBe(DEFECT);
  });

  test('generous TFT forgives exactly when u < g (stag-hunt coordination recovers)', () => {
    const h = createHistory();
    pushHistory(h, COOPERATE, DEFECT);
    expect(generousTitForTat(h.movesA, h.movesB, h.rounds, GTFT_GENEROSITY - 1e-9)).toBe(COOPERATE);
    expect(generousTitForTat(h.movesA, h.movesB, h.rounds, GTFT_GENEROSITY + 1e-9)).toBe(DEFECT);
    // Coordination: one forgiving move returns mutual stag hunting.
    pushHistory(h, COOPERATE, COOPERATE);
    const r = playRound(STAG_HUNT, generousTitForTat, titForTat, h, 0, 0);
    expect(r.a).toBe(COOPERATE);
    expect(r.b).toBe(COOPERATE);
    expect(r.payoffA).toBe(STAG_HUNT.cc);
  });

  test('registry order is stable API (titan strategy ids)', () => {
    expect(STRATEGIES.map((s) => s.name)).toEqual([
      'TIT-FOR-TAT',
      'GRIM-TRIGGER',
      'PAVLOV',
      'ALWAYS-DEFECT',
      'GENEROUS-TFT',
    ]);
  });
});

describe('replicator dynamics', () => {
  test('uniform fitness is a fixed point', () => {
    const shares = new Float64Array([0.25, 0.25, 0.25, 0.25]);
    replicatorStep(shares, new Float64Array([2, 2, 2, 2]));
    for (const s of shares) expect(s).toBeCloseTo(0.25, 12);
  });

  test('higher fitness grows its share; shares stay a distribution', () => {
    const shares = new Float64Array([0.5, 0.5]);
    replicatorStep(shares, new Float64Array([3, 1]), 0.5);
    expect(shares[0]).toBeGreaterThan(0.5);
    expect((shares[0] ?? 0) + (shares[1] ?? 0)).toBeCloseTo(1, 12);
  });

  test('extinct strategies are absorbing (mutation-free corner states)', () => {
    const shares = new Float64Array([0, 1]);
    replicatorStep(shares, new Float64Array([100, 1]));
    expect(shares[0]).toBe(0);
    expect(shares[1]).toBeCloseTo(1, 12);
  });

  test('degenerate all-zero result resets to uniform; non-finite fitness is sealed', () => {
    // Both shares START at 0 → every update stays 0 → total 0 → the reset branch
    // (games.ts: `if (total <= 0 || !isFinite) { share = 1/n }`) fires and restores uniform.
    // (The earlier [0.5, 0.5] + uniform-negative-fitness case never reset — uniform fitness is
    // an ordinary fixed point, total stayed 1 — so it tested the wrong branch.)
    const shares = new Float64Array([0, 0]);
    replicatorStep(shares, new Float64Array([-10, -10]), 1);
    expect(shares[0]).toBeCloseTo(0.5, 12);
    expect(shares[1]).toBeCloseTo(0.5, 12);
    const s2 = new Float64Array([0.5, 0.5]);
    replicatorStep(s2, new Float64Array([Number.NaN, 1]), 0.5);
    let total = 0;
    for (const s of s2) {
      expect(Number.isFinite(s)).toBeTrue();
      total += s;
    }
    expect(total).toBeCloseTo(1, 12);
  });
});
