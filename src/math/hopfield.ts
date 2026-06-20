/**
 * hopfield.ts — REAL Hopfield associative memory (leaf, exclusive owner).
 *
 * A genuine content-addressable attractor network: patterns are stored as minima
 * of an energy landscape and recalled by deterministic energy descent from a
 * noisy probe. This is the canonical NON-transformer memory substrate — recall
 * is gradient descent on E(s) = −½ sᵀWs, not token attention — and it is the
 * associative-memory organ behind the spin-glass instinct in the corpus
 * (`spin_based_neural_network` / `ising_model.c`, MIT © tsotchke). Pairs with
 * `src/sim/spin-glass.ts` (which models the disordered/SK regime); this leaf owns
 * the clean Hebbian attractor dynamics with provable fixed-point guarantees.
 *
 * States are bipolar vectors in {−1,+1}ⁿ. Storage is the Hebbian outer-product
 * rule with zero self-coupling; recall is asynchronous sign updates in a fixed
 * neuron order. DETERMINISM (Manhattan): pure, NO `Rng`, NO `Date.now`; the only
 * tie-break (zero local field) deterministically keeps the current spin, and the
 * async sweep order is fixed ascending. Same probe ⇒ same attractor, every run.
 *
 * Capacity ≈ 0.138·n random patterns; orthogonal patterns are exact fixed points
 * for any count P < n (Hebbian self-term (n−P)/n dominates). Refs: Hopfield,
 * PNAS 79 (1982); Amit, Gutfreund & Sompolinsky, Phys. Rev. A 32 (1985).
 */

/** Largest network size supported (keeps the O(n²) weight matrix bounded). */
export const HOPFIELD_MAX_N = 256;

/** A trained network: n neurons and a symmetric n×n weight matrix (row-major). */
export interface HopfieldNet {
  readonly n: number;
  readonly W: Float64Array;
}

/** Bipolar sign with a deterministic tie-break (0 → +1 is never used; callers pass `keep`). */
function bsign(x: number, keep: number): number {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return keep; // zero local field: hold the current spin (no spurious flip)
}

/**
 * Store patterns by the Hebbian outer-product rule: W = (1/n) Σ_p ξ_p ξ_pᵀ with
 * a zero diagonal (no self-coupling). W is symmetric by construction. O(P·n²).
 */
export function storeHebbian(patterns: readonly (readonly number[])[]): HopfieldNet {
  const n = patterns.length > 0 ? patterns[0]!.length : 0;
  if (n > HOPFIELD_MAX_N) throw new Error(`hopfield: n=${n} exceeds HOPFIELD_MAX_N=${HOPFIELD_MAX_N}`);
  const W = new Float64Array(n * n);
  for (const p of patterns) {
    for (let i = 0; i < n; i++) {
      const pi = p[i]!;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        W[i * n + j] += (pi * p[j]!) / n;
      }
    }
  }
  return { n, W };
}

/** Local field hᵢ = Σ_j Wᵢⱼ sⱼ acting on neuron i. */
export function localField(net: HopfieldNet, s: readonly number[], i: number): number {
  const { n, W } = net;
  let h = 0;
  for (let j = 0; j < n; j++) h += W[i * n + j]! * s[j]!;
  return h;
}

/** Network energy E(s) = −½ sᵀWs. Async sign updates never increase it (Lyapunov). */
export function energy(net: HopfieldNet, s: readonly number[]): number {
  const { n, W } = net;
  let e = 0;
  for (let i = 0; i < n; i++) {
    const si = s[i]!;
    for (let j = 0; j < n; j++) e += W[i * n + j]! * si * s[j]!;
  }
  return -0.5 * e;
}

/** One synchronous update: every neuron set to sign of its field at once. */
export function stepSync(net: HopfieldNet, s: readonly number[]): number[] {
  const out = new Array<number>(net.n);
  for (let i = 0; i < net.n; i++) out[i] = bsign(localField(net, s, i), s[i]!);
  return out;
}

/**
 * Recall: deterministic asynchronous descent. Sweep neurons in fixed ascending
 * order, updating each to the sign of its CURRENT local field, until a full
 * sweep makes no change (a fixed point) or `maxSweeps` is hit. Returns the
 * recovered attractor, the sweep count, and whether it converged.
 */
export function recall(
  net: HopfieldNet,
  probe: readonly number[],
  maxSweeps = 50,
): { state: number[]; sweeps: number; converged: boolean } {
  const s = probe.slice();
  for (let sweep = 1; sweep <= maxSweeps; sweep++) {
    let changed = false;
    for (let i = 0; i < net.n; i++) {
      const next = bsign(localField(net, s, i), s[i]!);
      if (next !== s[i]) {
        s[i] = next;
        changed = true;
      }
    }
    if (!changed) return { state: s, sweeps: sweep, converged: true };
  }
  return { state: s, sweeps: maxSweeps, converged: false };
}

/** Normalized overlap (cosine for bipolar) mₐᵦ = (1/n) Σ aᵢbᵢ ∈ [−1,1]; 1 ⇔ identical. */
export function overlap(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s / n;
}
