/**
 * Game-theory leaf for the TITAN diplomacy layer (CONTRACTS V3.3).
 *
 * Pure functions only — no DOM, no three.js, no `src/types.ts`, and no allocation in the
 * round-playing hot path (the round result is a module-level REUSED record). Histories use a
 * compact bit encoding: one uint per player, bit 0 = most recent round, bit value 1 = DEFECT.
 * A per-pair ring buffer is therefore a single shift-and-mask, cheap enough to keep all 45
 * titan pairs in flight with zero garbage.
 *
 * Strategies are pure functions of `(own, opp, rounds, u)` where `u` is an externally supplied
 * uniform sample in [0, 1) — stochastic strategies (generous tit-for-tat) stay deterministic
 * because the CALLER draws `u` from the seeded `Rng` on its own cadence (contract rule 7).
 */

/** A single move: 0 = cooperate, 1 = defect. The bit encoding of histories relies on this. */
export type Move = 0 | 1;

/** The cooperative move (history bit 0). */
export const COOPERATE: Move = 0;

/** The defecting move (history bit 1). */
export const DEFECT: Move = 1;

/**
 * Symmetric 2×2 payoff matrix from the ROW player's perspective:
 * `cc` both cooperate (R), `cd` I cooperate / opponent defects (S),
 * `dc` I defect / opponent cooperates (T), `dd` both defect (P).
 */
export interface PayoffMatrix {
  readonly name: string;
  readonly cc: number;
  readonly cd: number;
  readonly dc: number;
  readonly dd: number;
}

/** Prisoner's dilemma, canonical T=5 > R=3 > P=1 > S=0 with 2R > T+S. */
export const PRISONERS_DILEMMA: PayoffMatrix = {
  name: 'PRISONERS-DILEMMA',
  cc: 3,
  cd: 0,
  dc: 5,
  dd: 1,
};

/** Stag hunt: cooperation (stag) pareto-dominates, defection (hare) is risk-dominant. */
export const STAG_HUNT: PayoffMatrix = { name: 'STAG-HUNT', cc: 4, cd: 0, dc: 3, dd: 2 };

/** Hawk-dove (chicken), V=4, C=6: mutual escalation is the worst outcome. */
export const HAWK_DOVE: PayoffMatrix = { name: 'HAWK-DOVE', cc: 2, cd: 0, dc: 4, dd: -1 };

/** Row-player payoff for `my` vs `opp`. O(1), branch-only. */
export function payoff(m: PayoffMatrix, my: Move, opp: Move): number {
  return my === COOPERATE ? (opp === COOPERATE ? m.cc : m.cd) : opp === COOPERATE ? m.dc : m.dd;
}

/** Arithmetic mean of the four matrix cells — the zero line for resource-flow coupling. O(1). */
export function meanPayoff(m: PayoffMatrix): number {
  return (m.cc + m.cd + m.dc + m.dd) / 4;
}

/** Default ring-buffer depth (rounds) a strategy can see. Must stay ≤ 30 (bit encoding). */
export const HISTORY_WINDOW = 8;

/**
 * Mutable per-pair history record. `movesA`/`movesB` are window-masked bit rings
 * (bit 0 = most recent round, 1 = defect); `rounds` is the observable depth,
 * capped at the window (0 ⇒ no round played yet).
 */
export interface PairHistory {
  movesA: number;
  movesB: number;
  rounds: number;
}

/** Fresh empty history (boot-time allocation; reuse the record afterwards). O(1). */
export function createHistory(): PairHistory {
  return { movesA: 0, movesB: 0, rounds: 0 };
}

/**
 * Push one played round into the ring (shift left, mask to `window` rounds). Mutates `h`
 * in place; `rounds` saturates at `window`, which means long-memory strategies such as
 * grim trigger "forget" grudges older than the window — an honest property of the compact
 * encoding, relied on by the titan diplomacy cycle. O(1), allocation-free.
 */
export function pushHistory(h: PairHistory, a: Move, b: Move, window = HISTORY_WINDOW): void {
  const mask = (1 << window) - 1;
  h.movesA = ((h.movesA << 1) | a) & mask;
  h.movesB = ((h.movesB << 1) | b) & mask;
  h.rounds = h.rounds < window ? h.rounds + 1 : window;
}

/** Branch-free 32-bit population count (Hacker's Delight). O(1). */
function popcount32(x: number): number {
  let v = x | 0;
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return Math.imul(v, 0x01010101) >>> 24;
}

/**
 * Number of defections visible in `moves` over the last `min(rounds, window)` rounds.
 * O(1), allocation-free — safe on diplomacy cadences.
 */
export function defections(moves: number, rounds: number, window = HISTORY_WINDOW): number {
  const depth = rounds < window ? rounds : window;
  return popcount32(moves & ((1 << depth) - 1));
}

/**
 * An iterated-game strategy: a pure function of the visible history from THIS player's
 * perspective. `own`/`opp` are window-masked move rings (bit 0 = most recent, 1 = defect),
 * `rounds` is the observable depth (0 ⇒ opening round), `u` is a caller-supplied uniform
 * sample in [0, 1) consumed only by stochastic strategies. O(1) each.
 */
export type StrategyFn = (own: number, opp: number, rounds: number, u: number) => Move;

/** Open with cooperation, then mirror the opponent's last move. O(1). */
export const titForTat: StrategyFn = (_own, opp, rounds, _u) => {
  if (rounds === 0) return COOPERATE;
  return (opp & 1) === 1 ? DEFECT : COOPERATE;
};

/**
 * Cooperate until the opponent defects ANYWHERE in the visible window, then defect.
 * With a ring window the grudge fades once the defection scrolls out — see
 * {@link pushHistory}. O(1).
 */
export const grimTrigger: StrategyFn = (_own, opp, rounds, _u) => {
  if (rounds === 0) return COOPERATE;
  return opp !== 0 ? DEFECT : COOPERATE;
};

/**
 * Win-stay / lose-shift: repeat the last move after a "win" (R or T ⇔ moves matched),
 * switch after a "loss" (S or P ⇔ moves differed). Classic 2-bit Pavlov. O(1).
 */
export const pavlov: StrategyFn = (own, opp, rounds, _u) => {
  if (rounds === 0) return COOPERATE;
  return ((own ^ opp) & 1) === 0 ? COOPERATE : DEFECT;
};

/** Unconditional defection — the diplomacy stress test. O(1). */
export const alwaysDefect: StrategyFn = (_own, _opp, _rounds, _u) => DEFECT;

/** Forgiveness probability of {@link generousTitForTat} (Nowak–Sigmund g for the canonical PD). */
export const GTFT_GENEROSITY = 1 / 3;

/**
 * Tit-for-tat that forgives a defection with probability {@link GTFT_GENEROSITY}: when the
 * opponent defected last round, cooperate iff `u < g`. Deterministic given `u`. O(1).
 */
export const generousTitForTat: StrategyFn = (_own, opp, rounds, u) => {
  if (rounds === 0) return COOPERATE;
  if ((opp & 1) === 0) return COOPERATE;
  return u < GTFT_GENEROSITY ? COOPERATE : DEFECT;
};

/** Named strategy registry entry (index doubles as the titan strategy id). */
export interface StrategySpec {
  readonly name: string;
  readonly move: StrategyFn;
}

/**
 * The 5 iterated strategies, in the canonical order the titan replicator runs over.
 * Indices are stable API: 0 TFT, 1 GRIM, 2 PAVLOV, 3 ALWAYS-DEFECT, 4 GENEROUS-TFT.
 */
export const STRATEGIES: readonly StrategySpec[] = [
  { name: 'TIT-FOR-TAT', move: titForTat },
  { name: 'GRIM-TRIGGER', move: grimTrigger },
  { name: 'PAVLOV', move: pavlov },
  { name: 'ALWAYS-DEFECT', move: alwaysDefect },
  { name: 'GENEROUS-TFT', move: generousTitForTat },
];

/** Result of one played round. REUSED by {@link playRound} — copy fields to retain. */
export interface RoundResult {
  a: Move;
  b: Move;
  payoffA: number;
  payoffB: number;
}

/** Module-level scratch returned by {@link playRound} (valid until the next call). */
const ROUND: RoundResult = { a: COOPERATE, b: COOPERATE, payoffA: 0, payoffB: 0 };

/**
 * Play one round of `matrix` between strategies `sa` (player A) and `sb` (player B) against
 * the shared pair history. Does NOT mutate `h` — callers record the result with
 * {@link pushHistory} when they accept the round. Deterministic given its arguments
 * (`uA`/`uB` feed the stochastic strategies; default 0 ⇒ fully deterministic).
 * Returns the module-level REUSED {@link RoundResult}. O(1), allocation-free.
 */
export function playRound(
  matrix: PayoffMatrix,
  sa: StrategyFn,
  sb: StrategyFn,
  h: PairHistory,
  uA = 0,
  uB = 0,
): RoundResult {
  const ma = sa(h.movesA, h.movesB, h.rounds, uA);
  const mb = sb(h.movesB, h.movesA, h.rounds, uB);
  ROUND.a = ma;
  ROUND.b = mb;
  ROUND.payoffA = payoff(matrix, ma, mb);
  ROUND.payoffB = payoff(matrix, mb, ma);
  return ROUND;
}

/**
 * One discrete-time replicator-dynamics step over population `shares`, in place:
 * `x_i ← x_i · (1 + dt · (f_i − f̄))` with `f̄ = Σ x_i f_i`, clamped at 0 and renormalized
 * to sum 1. Non-finite fitness entries are treated as 0; a degenerate (all-zero) result
 * resets to the uniform distribution. Extinct strategies (share 0) stay extinct — the
 * dynamics are mutation-free, so corner states are absorbing. O(n), allocation-free.
 */
export function replicatorStep(shares: Float64Array, fitness: Float64Array, dt = 1): void {
  const n = Math.min(shares.length, fitness.length);
  if (n === 0) return;
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const f = fitness[i] ?? 0;
    mean += (shares[i] ?? 0) * (Number.isFinite(f) ? f : 0);
  }
  let total = 0;
  for (let i = 0; i < n; i++) {
    const fRaw = fitness[i] ?? 0;
    const f = Number.isFinite(fRaw) ? fRaw : 0;
    let next = (shares[i] ?? 0) * (1 + dt * (f - mean));
    if (!(next > 0)) next = 0; // clamps negatives AND NaN in one comparison
    shares[i] = next;
    total += next;
  }
  if (total <= 0 || !Number.isFinite(total)) {
    const u = 1 / n;
    for (let i = 0; i < n; i++) shares[i] = u;
    return;
  }
  const inv = 1 / total;
  for (let i = 0; i < n; i++) shares[i] = (shares[i] ?? 0) * inv;
}
