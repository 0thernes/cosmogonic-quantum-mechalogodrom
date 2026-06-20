/**
 * PERCEPTRON BASELINE — simple_mnist-style classical learner from Tsotchke corpus.
 * Tiny deterministic dot-product classifier for petri nutrient tagging (not deep learning).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** O(n). Single-layer score Σ w·x. */
export function perceptronScore(weights: Float32Array, inputs: Float32Array, n: number): number {
  const lim = Math.min(n, weights.length, inputs.length);
  let s = 0;
  for (let i = 0; i < lim; i++) s += (weights[i] ?? 0) * (inputs[i] ?? 0);
  return s / (lim || 1);
}

/** Heaviside activation → nutrient class 0..1. O(n). */
export function perceptronTag(weights: Float32Array, inputs: Float32Array, n: number): number {
  const s = perceptronScore(weights, inputs, n);
  return s > 0 ? Math.min(1, s) : Math.max(0, 0.5 + s * 0.5);
}

/** O(n). One online update (simple_mnist SGD step). */
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
