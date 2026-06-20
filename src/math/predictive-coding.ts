/**
 * predictive-coding.ts — REAL hierarchical predictive coding (leaf, exclusive owner).
 *
 * A genuine non-transformer perception substrate: each layer predicts the layer
 * below via generative weights, the mismatch is a precision-weighted prediction
 * error, and inference is gradient descent on the variational free energy
 * F = Σ_l ½·Π_l·‖ε_l‖² — i.e. the brain-style "perception = explaining away
 * sensory input by inferring its hidden causes." No tokens, no attention, no
 * softmax: belief states settle into the causes that best predict the input.
 * This is the Route-D generative core the integration blueprint calls for — the
 * organ that turns `active-inference.ts` from a point-estimate faculty into a
 * real hierarchical model.
 *
 * Linear-Gaussian formulation (Rao–Ballard); weights are supplied by the caller
 * (learned elsewhere), so this leaf is pure inference: NO `Rng`, NO `Date.now`,
 * fixed iteration order, deterministic convergence. Layer 0 is the clamped
 * observation; the top layer is pulled toward an empirical prior.
 *
 * Refs: Rao & Ballard, *Nature Neuroscience* 2 (1999); Friston, *Phil. Trans.
 * R. Soc. B* 360 (2005) — free-energy principle; Bogacz, *J. Math. Psychol.* 76
 * (2017) — a tutorial derivation of the update equations implemented here.
 */

/** Hierarchical generative model. `weights[l]` (size sizes[l] × sizes[l+1]) predicts layer l from l+1. */
export interface PCNet {
  readonly sizes: readonly number[]; // [n0 (observation), n1, …, n_{L-1}]
  readonly weights: readonly (readonly (readonly number[])[])[]; // length L-1
  readonly precisions: readonly number[]; // length L
  readonly prior: readonly number[]; // top-layer prior, length sizes[L-1]
}

/** W·x for W given as rows. */
function matVec(W: readonly (readonly number[])[], x: readonly number[]): number[] {
  return W.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j]! * x[j]!;
    return s;
  });
}

/** Wᵀ·y (y indexed over rows of W). */
function matVecT(W: readonly (readonly number[])[], y: readonly number[]): number[] {
  const cols = W.length > 0 ? W[0]!.length : 0;
  const out = Array.from({ length: cols }, () => 0);
  for (let i = 0; i < W.length; i++) {
    const row = W[i]!;
    const yi = y[i]!;
    for (let j = 0; j < cols; j++) out[j]! += row[j]! * yi;
  }
  return out;
}

/** Prediction errors per layer ε_l (layer 0 uses `obs`; top uses the prior). */
function errors(
  net: PCNet,
  beliefs: readonly (readonly number[])[],
  obs: readonly number[],
): number[][] {
  const L = net.sizes.length;
  const eps: number[][] = [];
  for (let l = 0; l < L; l++) {
    const here = l === 0 ? obs : beliefs[l]!;
    let pred: readonly number[];
    if (l < L - 1) pred = matVec(net.weights[l]!, beliefs[l + 1]!);
    else pred = net.prior;
    eps.push(here.map((v, i) => v - pred[i]!));
  }
  return eps;
}

/** Variational free energy F = Σ_l ½·Π_l·‖ε_l‖² (the quantity inference minimizes). */
export function freeEnergy(
  net: PCNet,
  beliefs: readonly (readonly number[])[],
  observation: readonly number[],
): number {
  const eps = errors(net, beliefs, observation);
  let F = 0;
  for (let l = 0; l < eps.length; l++) {
    let sq = 0;
    for (const e of eps[l]!) sq += e * e;
    F += 0.5 * net.precisions[l]! * sq;
  }
  return F;
}

/** Zeroed belief states (layer 0 will be clamped to the observation during inference). */
export function initBeliefs(net: PCNet): number[][] {
  return net.sizes.map((n) => Array.from({ length: n }, () => 0));
}

/**
 * One inference step: gradient descent on F over the hidden beliefs (layer 0
 * clamped to the observation). ∂F/∂xₗ = Πₗεₗ − W_{l-1}ᵀ·Π_{l-1}·ε_{l-1}.
 * Returns the updated belief stack. O(Σ sizes²).
 */
export function inferStep(
  net: PCNet,
  beliefs: readonly (readonly number[])[],
  observation: readonly number[],
  rate: number,
): number[][] {
  const L = net.sizes.length;
  const eps = errors(net, beliefs, observation);
  const out: number[][] = beliefs.map((b) => b.slice());
  out[0] = observation.slice(); // clamp the sensory layer
  for (let l = 1; l < L; l++) {
    const own = eps[l]!.map((e) => net.precisions[l]! * e);
    const below = eps[l - 1]!.map((e) => net.precisions[l - 1]! * e);
    const topDown = matVecT(net.weights[l - 1]!, below);
    const b = out[l]!;
    for (let i = 0; i < b.length; i++) b[i] = b[i]! - rate * (own[i]! - topDown[i]!);
  }
  return out;
}

/**
 * Run inference to convergence: iterate {@link inferStep} until the free energy
 * change drops below `tol` or `maxIters` is reached. Deterministic.
 */
export function infer(
  net: PCNet,
  observation: readonly number[],
  opts: { rate?: number; maxIters?: number; tol?: number } = {},
): { beliefs: number[][]; freeEnergy: number; iters: number; converged: boolean } {
  const rate = opts.rate ?? 0.1;
  const maxIters = opts.maxIters ?? 500;
  const tol = opts.tol ?? 1e-10;
  let beliefs = initBeliefs(net);
  beliefs[0] = observation.slice();
  let prev = freeEnergy(net, beliefs, observation);
  for (let it = 1; it <= maxIters; it++) {
    beliefs = inferStep(net, beliefs, observation, rate);
    const F = freeEnergy(net, beliefs, observation);
    if (Math.abs(prev - F) < tol) return { beliefs, freeEnergy: F, iters: it, converged: true };
    prev = F;
  }
  return { beliefs, freeEnergy: prev, iters: maxIters, converged: false };
}
