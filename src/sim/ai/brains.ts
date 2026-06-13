/**
 * The deterministic classical-AI kernel (CONTRACTS V9 — "how AI was done before the transformer").
 *
 * This module is the running, tested embodiment of the pre-2016 game/A-Life AI toolbox the project
 * is built around (see docs research): finite-state machines, utility/needs scoring, tiny
 * fixed-weight neural nets, Markov chains, goal-oriented planning (GOAP), and bounded episodic
 * memory. Every routine is a PURE function of its inputs (+ an injected seeded {@link Rng} when it
 * needs a choice), performs NO `Math.random`/clock reads, and is allocation-free in steady state
 * (callers pass scratch buffers; nothing here allocates per-frame). That is what lets a 10k-agent
 * world stay bit-reproducible from one seed while each agent runs a recognizably different "mind".
 *
 * Leaf module: imports only the {@link Rng} type from `src/math`, nothing from the rest of `sim`,
 * so it stays unit-testable under `bun test` with no DOM and no three.js, and the dependency graph
 * stays acyclic (ARCHITECTURE.md rule). Sentience tiers, factions, and the user-launched NHI beings
 * all dispatch into these primitives.
 */
import type { Rng } from '../../math/rng';

// ── Utility / needs-based AI (The Sims, 2000) ────────────────────────────────

/**
 * Argmax over a score list — the utility-AI decision: "do the highest-scoring thing". Ties resolve
 * to the LOWEST index (a strict, deterministic order), so the choice is reproducible. Returns -1 for
 * an empty list. O(n), allocation-free.
 */
export function utilityPick(scores: ArrayLike<number>): number {
  let best = -1;
  let bestVal = -Infinity;
  for (let i = 0; i < scores.length; i++) {
    const v = scores[i] ?? -Infinity;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

/**
 * Seeded softmax-weighted choice over `scores` (temperature `temp` > 0). Higher scores are more
 * likely but not certain — the "fuzzy" decision that keeps a population from moving in lockstep.
 * Deterministic given the same `rng` state. O(n), allocation-free (two passes, no temp array).
 */
export function softmaxPick(scores: ArrayLike<number>, rng: Rng, temp = 1): number {
  const n = scores.length;
  if (n === 0) return -1;
  const t = temp > 1e-6 ? temp : 1e-6;
  let max = -Infinity;
  for (let i = 0; i < n; i++) max = Math.max(max, scores[i] ?? -Infinity);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.exp(((scores[i] ?? -Infinity) - max) / t);
  let r = rng() * sum;
  for (let i = 0; i < n; i++) {
    r -= Math.exp(((scores[i] ?? -Infinity) - max) / t);
    if (r <= 0) return i;
  }
  return n - 1; // float-shortfall fallback: the last bucket
}

// ── Tiny neural network (perceptron / MLP — 1958/1986; Creatures Norns, 1996) ─

/**
 * A tiny single-hidden-layer perceptron: `in → hidden(tanh) → out(tanh)`. Weights are a flat
 * `Float32Array` laid out `[hidden×(in+1) bias-augmented] ++ [out×(hidden+1)]`, so a whole "brain"
 * is a few hundred floats — small enough to be an inheritable GENE. `forward` writes into the
 * caller's `hiddenScratch`/`out` buffers and allocates nothing.
 */
export class TinyMLP {
  readonly nIn: number;
  readonly nHidden: number;
  readonly nOut: number;
  /** `nHidden*(nIn+1) + nOut*(nHidden+1)` weights, bias-augmented per layer. */
  readonly weights: Float32Array;

  constructor(nIn: number, nHidden: number, nOut: number, weights?: Float32Array) {
    this.nIn = nIn;
    this.nHidden = nHidden;
    this.nOut = nOut;
    const size = nHidden * (nIn + 1) + nOut * (nHidden + 1);
    this.weights = weights && weights.length === size ? weights : new Float32Array(size);
  }

  /** Total weight count for `(nIn, nHidden, nOut)` — the gene length a genome must carry. */
  static weightCount(nIn: number, nHidden: number, nOut: number): number {
    return nHidden * (nIn + 1) + nOut * (nHidden + 1);
  }

  /**
   * Feed `inputs` (length nIn) forward, writing the hidden activations into `hiddenScratch`
   * (length ≥ nHidden) and the outputs into `out` (length ≥ nOut). Pure, allocation-free.
   * O(nIn·nHidden + nHidden·nOut).
   */
  forward(inputs: ArrayLike<number>, hiddenScratch: Float32Array, out: Float32Array): void {
    const { nIn, nHidden, nOut, weights } = this;
    let w = 0;
    for (let h = 0; h < nHidden; h++) {
      let acc = weights[w++] ?? 0; // bias
      for (let i = 0; i < nIn; i++) acc += (weights[w++] ?? 0) * (inputs[i] ?? 0);
      hiddenScratch[h] = Math.tanh(acc);
    }
    for (let o = 0; o < nOut; o++) {
      let acc = weights[w++] ?? 0; // bias
      for (let h = 0; h < nHidden; h++) acc += (weights[w++] ?? 0) * (hiddenScratch[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }
}

// ── Markov chain (Shannon 1948; the real shape of most pre-2016 "chatbots") ───

/**
 * A first-order Markov chain over `n` states, backed by a flat row-major `n×n` transition-weight
 * matrix. `next` samples the successor of `state` proportional to its row weights, using the seeded
 * {@link Rng} — deterministic. The Oracle faction "speaks"/acts by walking such a chain. O(n) per
 * step, allocation-free.
 */
export class MarkovChain {
  readonly n: number;
  /** Row-major `n*n` non-negative transition weights. */
  readonly weights: Float32Array;

  constructor(n: number, weights?: Float32Array) {
    this.n = n;
    this.weights = weights && weights.length === n * n ? weights : new Float32Array(n * n);
  }

  /** Sample the next state after `state`. Falls back to `state` when the row is all-zero. */
  next(state: number, rng: Rng): number {
    const { n, weights } = this;
    if (state < 0 || state >= n) return 0;
    const base = state * n;
    let sum = 0;
    for (let j = 0; j < n; j++) sum += weights[base + j] ?? 0;
    if (sum <= 0) return state; // dead row — stay put
    let r = rng() * sum;
    for (let j = 0; j < n; j++) {
      r -= weights[base + j] ?? 0;
      if (r <= 0) return j;
    }
    return n - 1;
  }
}

// ── Finite-state machine (Pac-Man 1980 → everywhere) ─────────────────────────

/** One FSM edge: in `from`, if `guard(signal)` holds, move to `to`. Lower index wins on ties. */
export interface FsmEdge<Sig> {
  from: number;
  to: number;
  guard: (signal: Sig) => boolean;
}

/**
 * Evaluate one FSM tick: return the first edge's `to` whose `from === state` and whose guard
 * passes, else stay in `state`. Edge order is the priority (deterministic). O(edges).
 */
export function fsmStep<Sig>(state: number, edges: readonly FsmEdge<Sig>[], signal: Sig): number {
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e && e.from === state && e.guard(signal)) return e.to;
  }
  return state;
}

// ── GOAP — goal-oriented action planning (F.E.A.R., 2005) ─────────────────────

/**
 * A planning action over a small symbolic world modeled as a bitmask of ≤31 boolean facts:
 * `pre`/`preMask` say which facts must (not) hold to apply it, and `set`/`clear` say which it
 * flips. `cost` drives the search toward cheap plans.
 */
export interface GoapAction {
  /** Bits that must be SET for this action to apply. */
  pre: number;
  /** Bits that must be CLEAR for this action to apply. */
  preClear: number;
  /** Bits this action turns on. */
  set: number;
  /** Bits this action turns off. */
  clear: number;
  cost: number;
}

/**
 * Plan a sequence of action indices that drives the world bitmask from `start` to satisfy every bit
 * in `goal`, minimizing total cost (uniform-cost / Dijkstra over the reachable bitmask graph,
 * bounded by `maxStates`). Writes the action indices into `outPlan` and returns the plan length, or
 * -1 if no plan is found within the bound. Allocation note: uses small fixed scratch maps sized by
 * `maxStates`; intended for SLOW-cadence planning (a few times per agent per second), not per-frame.
 * Determinism: ties break by lower (cost, action-index, state), so the plan is reproducible.
 */
export function goapPlan(
  start: number,
  goal: number,
  actions: readonly GoapAction[],
  outPlan: Int32Array,
  maxStates = 4096,
): number {
  const satisfied = (s: number): boolean => (s & goal) === goal;
  if (satisfied(start)) return 0;
  // Dijkstra over bitmask nodes. Visited cost + back-pointers in plain Maps (slow path).
  const dist = new Map<number, number>();
  const prevState = new Map<number, number>();
  const prevAction = new Map<number, number>();
  dist.set(start, 0);
  // Simple array-as-frontier; pop the min-cost unvisited each round (states are small).
  const frontier: number[] = [start];
  const done = new Set<number>();
  let guard = 0;
  while (frontier.length > 0 && guard++ < maxStates) {
    // Extract-min by cost (linear scan — state count stays small for these tiny fact sets).
    let bi = 0;
    let bcost = Infinity;
    for (let i = 0; i < frontier.length; i++) {
      const st = frontier[i] ?? 0;
      const c = dist.get(st) ?? Infinity;
      if (c < bcost) {
        bcost = c;
        bi = i;
      }
    }
    const cur = frontier[bi] ?? start;
    frontier.splice(bi, 1);
    if (done.has(cur)) continue;
    done.add(cur);
    if (satisfied(cur)) {
      // Reconstruct (reversed), bounded by outPlan length.
      let len = 0;
      let s = cur;
      const tmp: number[] = [];
      while (s !== start) {
        const a = prevAction.get(s);
        const p = prevState.get(s);
        if (a === undefined || p === undefined) break;
        tmp.push(a);
        s = p;
      }
      for (let i = tmp.length - 1; i >= 0 && len < outPlan.length; i--)
        outPlan[len++] = tmp[i] ?? 0;
      return len;
    }
    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (!a) continue;
      if ((cur & a.pre) !== a.pre) continue;
      if ((cur & a.preClear) !== 0) continue;
      const nxt = (cur | a.set) & ~a.clear;
      const nd = bcost + a.cost;
      if (nd < (dist.get(nxt) ?? Infinity)) {
        dist.set(nxt, nd);
        prevState.set(nxt, cur);
        prevAction.set(nxt, ai);
        if (!done.has(nxt)) frontier.push(nxt);
      }
    }
  }
  return -1;
}

// ── Bounded episodic memory (Halo 2 blackboard / working memory, 2004) ────────

/**
 * A fixed-capacity ring of recent percepts (numbers) — an agent's short-term memory. Push is O(1)
 * and allocation-free after construction; `recent(k)` reads the k-th most-recent entry. This is the
 * "complex unique memory" each agent carries: last threat seen, last meal, last kin, etc.
 */
export class MemoryRing {
  private readonly buf: Float32Array;
  private head = 0;
  private len = 0;

  constructor(capacity: number) {
    this.buf = new Float32Array(Math.max(1, capacity));
  }

  /** Append a value, evicting the oldest at capacity. O(1). */
  push(v: number): void {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.buf.length;
    if (this.len < this.buf.length) this.len++;
  }

  /** Number of stored entries (≤ capacity). */
  get size(): number {
    return this.len;
  }

  /** The k-th most-recent value (0 = newest), or `undefined` when out of range. O(1). */
  recent(k: number): number | undefined {
    if (k < 0 || k >= this.len) return undefined;
    return this.buf[(this.head - 1 - k + this.buf.length) % this.buf.length];
  }

  /** Mean of all stored values (0 when empty) — a cheap "running mood". O(size). */
  mean(): number {
    if (this.len === 0) return 0;
    let s = 0;
    for (let k = 0; k < this.len; k++) s += this.recent(k) ?? 0;
    return s / this.len;
  }

  /** Forget everything (keeps capacity). O(1). */
  clear(): void {
    this.head = 0;
    this.len = 0;
  }
}
