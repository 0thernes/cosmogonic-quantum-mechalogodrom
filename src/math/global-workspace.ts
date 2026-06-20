/**
 * GLOBAL WORKSPACE THEORY engine — faithful TypeScript port of Eshkol's consciousness-engine
 * workspace primitive (lib/backend/vm_workspace.c: make-workspace / ws-register! / ws-step!).
 *
 * Global Workspace Theory (Baars) / the global neuronal workspace (Dehaene): many specialist
 * modules each emit a SALIENCE (a bottom-up bid for access) and a candidate content vector
 * (a proposal). They COMPETE; a numerically-stable softmax over saliences yields competition
 * weights; the most salient module IGNITES and its content is BROADCAST as the new shared
 * workspace state, becoming globally available to every module on the next cycle. Low
 * weight-entropy ⇒ a decisive winner (conscious access / ignition); high entropy ⇒ no clear
 * winner (sub-ignition, "unconscious" parallel processing).
 *
 * This is the genuine algorithm, not a heuristic blend: real max-subtracted softmax, real
 * deterministic arg-max winner, real normalized Shannon entropy, real winner-take-all
 * broadcast — matching the Eshkol C primitive the audit verified runnable.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/backend/vm_workspace.c (softmax competition + step),
 *   lib/core/workspace.cpp, inc/eshkol/core/workspace.h.
 *   (MIT, © 2024–2026 tsotchke; full local corpus Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo)
 *
 * Determinism: pure — no Rng, no Date.now, no Math.random. Numerically stable. The scalar path
 * (gwtCompeteScalar) allocates only one small weights buffer sized to the module count.
 */

/** A specialist module's bid into the workspace: how loud, and what it proposes to broadcast. */
export interface GwtModule {
  /** Bottom-up salience / bid for access (any finite real; higher = louder). */
  salience: number;
  /** Candidate content this specialist proposes to broadcast if it wins. */
  proposal: Float32Array;
}

/** Outcome of one Global-Workspace competition cycle. */
export interface GwtResult {
  /** Index of the igniting (winning) module; -1 only when there are no modules. */
  winner: number;
  /** True when the winner's competition weight ≥ ignitionThreshold (conscious access / ignition). */
  ignited: boolean;
  /** Softmax competition weights over the modules (sums to 1). */
  weights: Float32Array;
  /** Winner-take-all broadcast content (a copy of the winner's proposal); empty if no modules. */
  broadcast: Float32Array;
  /** Winner's competition weight — the peak of the distribution — in [0,1]. */
  access: number;
  /** Gap between winner and runner-up weight in [0,1]: the decisiveness of ignition. */
  margin: number;
  /** Normalized Shannon entropy of the weights in [0,1]: 0 = one-hot (decisive), 1 = uniform (no winner). */
  entropy: number;
}

/** Scalar outcome (no proposals / broadcast) for cheap per-faculty competition. */
export interface GwtScalarResult {
  winner: number;
  ignited: boolean;
  access: number;
  margin: number;
  entropy: number;
}

/**
 * Numerically-stable softmax of `saliences[0..n)` written into `out[0..n)`.
 * Subtracts the max before exponentiating, so large saliences never overflow.
 *
 * @param temperature softmax temperature (>0). Higher ⇒ flatter/more diffuse competition.
 */
export function gwtSoftmax(
  saliences: ArrayLike<number>,
  out: Float32Array,
  n: number,
  temperature = 1,
): void {
  if (n <= 0) return;
  const t = temperature > 1e-9 ? temperature : 1e-9;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const s = saliences[i] ?? 0;
    if (s > max) max = s;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.exp(((saliences[i] ?? 0) - max) / t);
    out[i] = e;
    sum += e;
  }
  const inv = sum > 0 ? 1 / sum : 0;
  for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) * inv;
}

/**
 * Normalized Shannon entropy in [0,1] of a probability vector `weights[0..n)`.
 * Returns 0 for n ≤ 1 (a single module is trivially decisive).
 */
export function gwtEntropy(weights: ArrayLike<number>, n: number): number {
  if (n <= 1) return 0;
  let h = 0;
  for (let i = 0; i < n; i++) {
    const p = weights[i] ?? 0;
    if (p > 0) h -= p * Math.log(p);
  }
  const norm = h / Math.log(n);
  return norm < 0 ? 0 : norm > 1 ? 1 : norm;
}

/** Deterministic arg-max over `weights[0..n)` (lowest index wins ties). Returns winner + runner-up weight. */
function argmaxWithSecond(
  weights: ArrayLike<number>,
  n: number,
): { winner: number; best: number; second: number } {
  let winner = 0;
  let best = weights[0] ?? 0;
  let second = -Infinity;
  for (let i = 1; i < n; i++) {
    const w = weights[i] ?? 0;
    if (w > best) {
      second = best;
      best = w;
      winner = i;
    } else if (w > second) {
      second = w;
    }
  }
  return { winner, best, second: second === -Infinity ? 0 : second };
}

/**
 * Run one full Global-Workspace competition cycle over `modules`, broadcasting the winner's content.
 *
 * @param ignitionThreshold winner weight required to declare ignition / conscious access (0,1].
 * @param temperature softmax temperature (>0).
 */
export function gwtCompete(
  modules: readonly GwtModule[],
  ignitionThreshold = 0.5,
  temperature = 1,
): GwtResult {
  const n = modules.length;
  if (n === 0) {
    return {
      winner: -1,
      ignited: false,
      weights: new Float32Array(0),
      broadcast: new Float32Array(0),
      access: 0,
      margin: 0,
      entropy: 0,
    };
  }
  const sal = new Float32Array(n);
  for (let i = 0; i < n; i++) sal[i] = modules[i]!.salience;
  const weights = new Float32Array(n);
  gwtSoftmax(sal, weights, n, temperature);

  const { winner, best, second } = argmaxWithSecond(weights, n);
  const entropy = gwtEntropy(weights, n);
  const wp = modules[winner]!.proposal;
  const broadcast = new Float32Array(wp.length);
  broadcast.set(wp);

  return {
    winner,
    ignited: best >= ignitionThreshold,
    weights,
    broadcast,
    access: best,
    margin: best - second < 0 ? 0 : best - second,
    entropy,
  };
}

/**
 * Scalar competition over raw `saliences[0..n)` — no proposals, no broadcast. For faculties that
 * only need "who won, how strongly, how decisively" each beat.
 */
export function gwtCompeteScalar(
  saliences: ArrayLike<number>,
  n: number,
  ignitionThreshold = 0.5,
  temperature = 1,
): GwtScalarResult {
  if (n <= 0) return { winner: -1, ignited: false, access: 0, margin: 0, entropy: 0 };
  const weights = new Float32Array(n);
  gwtSoftmax(saliences, weights, n, temperature);
  const { winner, best, second } = argmaxWithSecond(weights, n);
  return {
    winner,
    ignited: best >= ignitionThreshold,
    access: best,
    margin: best - second < 0 ? 0 : best - second,
    entropy: gwtEntropy(weights, n),
  };
}
