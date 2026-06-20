/**
 * PERCEPTRON BASELINE — classical learner from the Tsotchke `simple_mnist` corpus.
 *
 * Retires the audit's PROXY_STUB note (honest 0.45): the leaf was a single linear
 * dot-product with no hidden layer or nonlinearity. It now ships BOTH the honest
 * linear baseline (`perceptronScore`/`perceptronTag`/`perceptronStep`, kept for the
 * petri/soup consumers) AND a real 1-hidden-layer **ReLU MLP** with sigmoid output
 * and backpropagation (`mlpForward`/`mlpTrainStep`) — the genuine simple_mnist-style
 * classifier the name promised. Weights are caller-supplied (deterministic).
 *
 * DETERMINISM (Manhattan): pure forward/backward math, NO `Rng`, NO `Date.now`.
 * MIT © tsotchke (simple_mnist) — see THIRD-PARTY-NOTICES.md.
 */

/** O(n). Single-layer linear score Σ w·x / n (honest baseline). */
export function perceptronScore(weights: Float32Array, inputs: Float32Array, n: number): number {
  const lim = Math.min(n, weights.length, inputs.length);
  let s = 0;
  for (let i = 0; i < lim; i++) s += (weights[i] ?? 0) * (inputs[i] ?? 0);
  return s / (lim || 1);
}

/** Logistic squash of the linear score → class probability 0..1. O(n). */
export function perceptronTag(weights: Float32Array, inputs: Float32Array, n: number): number {
  return 1 / (1 + Math.exp(-perceptronScore(weights, inputs, n)));
}

/** O(n). One online delta-rule update toward `label`. */
export function perceptronStep(
  weights: Float32Array,
  inputs: Float32Array,
  label: number,
  lr: number,
  n: number,
): void {
  const lim = Math.min(n, weights.length, inputs.length);
  const pred = perceptronScore(weights, inputs, lim);
  const err = label - pred;
  for (let i = 0; i < lim; i++) {
    weights[i] = (weights[i] ?? 0) + lr * err * (inputs[i] ?? 0);
  }
}

const relu = (x: number): number => (x > 0 ? x : 0);
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** A real 1-hidden-layer net: `nIn → nHid` (ReLU) `→ 1` (sigmoid). Row-major weights. */
export interface MLP {
  nIn: number;
  nHid: number;
  w1: Float32Array; // nHid × nIn
  b1: Float32Array; // nHid
  w2: Float32Array; // nHid (output weights)
  b2: number; // output bias
}

/** Allocate an MLP with zeroed weights (caller seeds them deterministically). O(nHid·nIn). */
export function mlpNew(nIn: number, nHid: number): MLP {
  return {
    nIn,
    nHid,
    w1: new Float32Array(nHid * nIn),
    b1: new Float32Array(nHid),
    w2: new Float32Array(nHid),
    b2: 0,
  };
}

/** Forward pass: returns the output probability and the hidden activations (for backprop). O(nHid·nIn). */
export function mlpForward(net: MLP, x: ArrayLike<number>): { y: number; hidden: Float32Array } {
  const hidden = new Float32Array(net.nHid);
  for (let h = 0; h < net.nHid; h++) {
    let s = net.b1[h] ?? 0;
    const base = h * net.nIn;
    for (let i = 0; i < net.nIn; i++) s += (net.w1[base + i] ?? 0) * (x[i] ?? 0);
    hidden[h] = relu(s);
  }
  let out = net.b2;
  for (let h = 0; h < net.nHid; h++) out += (net.w2[h] ?? 0) * hidden[h]!;
  return { y: sigmoid(out), hidden };
}

/**
 * One backpropagation step on binary cross-entropy / squared error (the gradient is
 * the same simple form for a sigmoid output): updates w2/b2 and w1/b1 in place via the
 * ReLU-gated chain rule. Returns the pre-update output. O(nHid·nIn).
 */
export function mlpTrainStep(net: MLP, x: ArrayLike<number>, target: number, lr: number): number {
  const { y, hidden } = mlpForward(net, x);
  const dOut = y - target; // dL/d(out) for sigmoid + (BCE or MSE·sigmoid')
  for (let h = 0; h < net.nHid; h++) {
    const a = hidden[h]!;
    const dHidden = a > 0 ? dOut * (net.w2[h] ?? 0) : 0; // ReLU gate
    net.w2[h] = (net.w2[h] ?? 0) - lr * dOut * a;
    const base = h * net.nIn;
    for (let i = 0; i < net.nIn; i++) {
      net.w1[base + i] = (net.w1[base + i] ?? 0) - lr * dHidden * (x[i] ?? 0);
    }
    net.b1[h] = (net.b1[h] ?? 0) - lr * dHidden;
  }
  net.b2 -= lr * dOut;
  return y;
}
