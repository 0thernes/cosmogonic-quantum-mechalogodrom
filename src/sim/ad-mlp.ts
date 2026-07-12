/**
 * AD-MLP — a genuine multi-layer perceptron trained by EXACT reverse-mode automatic differentiation
 * (Eshkol Wengert tape, {@link ../math/eshkol-ad}). This is a real neural network, not a linear model:
 * an input layer → a nonlinear `tanh` hidden layer → a linear output, with backpropagation through
 * BOTH weight matrices read off the tape (never hand-coded gradients).
 *
 * WHY THIS EXISTS (the honest, falsifiable claim it licenses): a single linear unit — like the base
 * biologic learner {@link ./digital-biologics.biologicLearnStep} — provably CANNOT represent a
 * non-linearly-separable map (XOR is the textbook witness: no line separates its classes). An MLP with
 * one hidden layer is a universal approximator and learns XOR to near-zero error. So this module is a
 * QUALITATIVE expansion of the beings' cognition, and the gap is directly measurable: see
 * tests/ad-mlp-learning.test.ts, which trains this net to solve XOR while a linear AD baseline plateaus,
 * verifies the learning is load-bearing (freeze the weights → the loss never falls), and pins determinism.
 *
 * Determinism: the forward + backward passes are pure exact AD (no rng). The ONLY stochasticity is
 * seeded weight initialisation via an injected {@link Rng}; identical seed ⇒ identical bytes. The
 * per-step Wengert tape is a module singleton, reset each call — allocation-free on the hot path.
 *
 * Tsotchke provenance: the AD engine is a faithful port of tsotchke/Eshkol's `vm_autodiff.c`; this MLP
 * is a deeper consumption of it than the linear learner (backprop through a hidden nonlinearity).
 */

import type { Rng } from '../math/rng';
import {
  adTapeNew,
  adTapeReset,
  adVar,
  adConst,
  adMul,
  adAdd,
  adSub,
  adTanh,
  adBackward,
  adGradient,
  adValue,
  type AdTape,
} from '../math/eshkol-ad';

/**
 * A dense feed-forward network with one hidden layer. Weights are flat Float64Arrays for cache-friendly,
 * allocation-free training. Row-major: `w1[j*din + i]` = input i → hidden j; `w2[k*h + j]` = hidden j → output k.
 */
export interface Mlp {
  din: number;
  h: number;
  dout: number;
  w1: Float64Array; // h × din
  b1: Float64Array; // h
  w2: Float64Array; // dout × h
  b2: Float64Array; // dout
}

/** Module-scope reused tape — sized for nets up to ~8→16→4 without a resize; auto-grows if exceeded. */
const MLP_TAPE: AdTape = adTapeNew(1024);

/**
 * Create an MLP with seeded Glorot/Xavier-uniform weights: wᵢ ∈ U(−s, s), s = √(6/(fan_in+fan_out)),
 * biases 0. Deterministic given `rng` — the sole source of stochasticity in this module.
 */
export function createMlp(din: number, h: number, dout: number, rng: Rng): Mlp {
  const s1 = Math.sqrt(6 / (din + h));
  const s2 = Math.sqrt(6 / (h + dout));
  const w1 = new Float64Array(h * din);
  const w2 = new Float64Array(dout * h);
  for (let i = 0; i < w1.length; i++) w1[i] = (rng() * 2 - 1) * s1;
  for (let i = 0; i < w2.length; i++) w2[i] = (rng() * 2 - 1) * s2;
  return { din, h, dout, w1, b1: new Float64Array(h), w2, b2: new Float64Array(dout) };
}

/** Record the forward pass on the tape; returns the output node indices + the param node indices (for backprop). */
interface ForwardTrace {
  outNodes: number[];
  w1Nodes: number[];
  b1Nodes: number[];
  w2Nodes: number[];
  b2Nodes: number[];
}
function recordForward(tape: AdTape, net: Mlp, input: ArrayLike<number>): ForwardTrace {
  const { din, h, dout } = net;
  const xNodes: number[] = []; // inputs are DATA (constants) — no gradient flows to them
  for (let i = 0; i < din; i++) xNodes.push(adConst(tape, input[i] ?? 0));

  const w1Nodes: number[] = [];
  const b1Nodes: number[] = [];
  const hidNodes: number[] = [];
  for (let j = 0; j < h; j++) {
    const bj = adVar(tape, net.b1[j] ?? 0);
    b1Nodes.push(bj);
    let pre = bj;
    for (let i = 0; i < din; i++) {
      const w = adVar(tape, net.w1[j * din + i] ?? 0);
      w1Nodes.push(w);
      pre = adAdd(tape, pre, adMul(tape, w, xNodes[i]!));
    }
    hidNodes.push(adTanh(tape, pre)); // nonlinearity — the reason an MLP > a linear unit
  }

  const w2Nodes: number[] = [];
  const b2Nodes: number[] = [];
  const outNodes: number[] = [];
  for (let k = 0; k < dout; k++) {
    const bk = adVar(tape, net.b2[k] ?? 0);
    b2Nodes.push(bk);
    let out = bk;
    for (let j = 0; j < h; j++) {
      const w = adVar(tape, net.w2[k * h + j] ?? 0);
      w2Nodes.push(w);
      out = adAdd(tape, out, adMul(tape, w, hidNodes[j]!));
    }
    outNodes.push(out); // linear output (regression / logit)
  }
  return { outNodes, w1Nodes, b1Nodes, w2Nodes, b2Nodes };
}

/** Forward-only prediction. Pure (no weight change, no rng); reuses the exact same code path as training. */
export function mlpPredict(net: Mlp, input: ArrayLike<number>): number[] {
  const tape = MLP_TAPE;
  adTapeReset(tape);
  const t = recordForward(tape, net, input);
  return t.outNodes.map((n) => adValue(tape, n));
}

/**
 * One gradient-DESCENT step on the mean-squared error L = Σ_k (out_k − target_k)² via exact reverse-mode
 * AD. Updates every weight + bias in place (w ← w − lr·∂L/∂w, gradients read off the tape) and returns L
 * BEFORE the step, so a training loop observes L fall monotonically toward the network's capacity floor.
 * Deterministic — no rng, exact AD.
 */
export function mlpTrainStep(
  net: Mlp,
  input: ArrayLike<number>,
  target: ArrayLike<number>,
  lr = 0.1,
): number {
  const tape = MLP_TAPE;
  adTapeReset(tape);
  const { din, h, dout } = net;
  const t = recordForward(tape, net, input);

  let loss = adConst(tape, 0);
  for (let k = 0; k < dout; k++) {
    const d = adSub(tape, t.outNodes[k]!, adConst(tape, target[k] ?? 0));
    loss = adAdd(tape, loss, adMul(tape, d, d));
  }
  const lossValue = adValue(tape, loss);
  adBackward(tape, loss);

  // Gradient descent on every parameter. Node arrays were pushed in the SAME index order the weights are
  // laid out (b1 then its w1 row; b2 then its w2 row), so a single running cursor per matrix realigns them.
  for (let j = 0; j < h; j++) net.b1[j] = (net.b1[j] ?? 0) - lr * adGradient(tape, t.b1Nodes[j]!);
  for (let idx = 0; idx < h * din; idx++)
    net.w1[idx] = (net.w1[idx] ?? 0) - lr * adGradient(tape, t.w1Nodes[idx]!);
  for (let k = 0; k < dout; k++)
    net.b2[k] = (net.b2[k] ?? 0) - lr * adGradient(tape, t.b2Nodes[k]!);
  for (let idx = 0; idx < dout * h; idx++)
    net.w2[idx] = (net.w2[idx] ?? 0) - lr * adGradient(tape, t.w2Nodes[idx]!);

  return lossValue;
}

/** Total trainable parameter count — for telemetry / the "expanded network scale" claim. */
export function mlpParamCount(net: Mlp): number {
  return net.w1.length + net.b1.length + net.w2.length + net.b2.length;
}

// Module-scoped, auto-growing scratch for the curvature step: the flat per-parameter gradient and the
// exact Gauss-Newton curvature diagonal. Kept off the hot path's allocator (mirrors MLP_TAPE's reuse).
let CURV_G = new Float64Array(0);
let CURV_H = new Float64Array(0);
function ensureCurvScratch(p: number): void {
  if (CURV_G.length < p) {
    CURV_G = new Float64Array(p);
    CURV_H = new Float64Array(p);
  }
}

/**
 * One CURVATURE-AWARE training step: exact Gauss-Newton (generalized Gauss-Newton) DIAGONAL
 * preconditioning of the same MSE objective as {@link mlpTrainStep}, with Levenberg–Marquardt damping.
 *
 * Where {@link mlpTrainStep} takes a fixed-rate first-order step `θ ← θ − lr·gᵢ`, this rescales each
 * parameter by the local curvature of the loss:  `θ ← θ − lr·gᵢ / (Hᵍⁿᵢᵢ + damping)`. The curvature
 * used is the GENERALIZED GAUSS-NEWTON diagonal — the positive-semidefinite part of the Hessian for a
 * squared-error objective — computed EXACTLY (no finite differences) as
 *   Hᵍⁿᵢᵢ = Σ_k (∂fₖ/∂θᵢ)² · ∂²L/∂fₖ²  =  2·Σ_k (∂fₖ/∂θᵢ)²,
 * i.e. one extra exact reverse-mode pass seeded at each network OUTPUT (the output-Jacobian) on top of
 * the loss-gradient pass. Being PSD, it never flips the descent direction; damping bounds the step when
 * curvature is tiny. This is the diagonal natural-gradient / Fisher preconditioner for squared loss —
 * on an ill-conditioned objective it converges in far fewer steps than fixed-rate SGD (proved in
 * tests/ad-mlp-curvature.test.ts), so a being's online self-model becomes accurate faster.
 *
 * Exact, deterministic (no rng), allocation-free on the hot path. Returns the pre-step loss, same
 * contract as {@link mlpTrainStep}. {@link mlpTrainStep} itself is untouched — every existing consumer
 * keeps its byte-identical first-order trajectory; only callers that opt into this get curvature.
 *
 * Provenance: the exact output-Jacobian / second-order path mirrors Eshkol's upstream AD second-order
 * work — "exact jacobian/hessian through inner forward-mode derivatives" (ESH-0120/0121) and the
 * custom-VJP nodes bridging Moonlab VQE gradients (PR #270) — see math/eshkol-ad.adHvp.
 */
export function mlpTrainStepCurvature(
  net: Mlp,
  input: ArrayLike<number>,
  target: ArrayLike<number>,
  lr = 0.1,
  damping = 1e-3,
): number {
  const tape = MLP_TAPE;
  adTapeReset(tape);
  const { din, h, dout } = net;
  const t = recordForward(tape, net, input);

  let loss = adConst(tape, 0);
  for (let k = 0; k < dout; k++) {
    const d = adSub(tape, t.outNodes[k]!, adConst(tape, target[k] ?? 0));
    loss = adAdd(tape, loss, adMul(tape, d, d));
  }
  const lossValue = adValue(tape, loss);

  const P = h + h * din + dout + dout * h;
  ensureCurvScratch(P);

  // Pass 1: exact loss gradient gᵢ = ∂L/∂θᵢ, flattened in the weight layout order (b1, w1, b2, w2).
  adBackward(tape, loss);
  {
    let p = 0;
    for (let j = 0; j < h; j++) CURV_G[p++] = adGradient(tape, t.b1Nodes[j]!);
    for (let idx = 0; idx < h * din; idx++) CURV_G[p++] = adGradient(tape, t.w1Nodes[idx]!);
    for (let k = 0; k < dout; k++) CURV_G[p++] = adGradient(tape, t.b2Nodes[k]!);
    for (let idx = 0; idx < dout * h; idx++) CURV_G[p++] = adGradient(tape, t.w2Nodes[idx]!);
  }

  // Pass 2..(1+dout): exact output-Jacobian per output → accumulate the PSD Gauss-Newton diagonal.
  // adBackward re-zeroes and reseeds, so each call yields ∂fₖ/∂θ cleanly; ∂²L/∂fₖ² = 2 for MSE.
  for (let i = 0; i < P; i++) CURV_H[i] = 0;
  for (let k = 0; k < dout; k++) {
    adBackward(tape, t.outNodes[k]!);
    let p = 0;
    for (let j = 0; j < h; j++) {
      const jc = adGradient(tape, t.b1Nodes[j]!);
      CURV_H[p++]! += 2 * jc * jc;
    }
    for (let idx = 0; idx < h * din; idx++) {
      const jc = adGradient(tape, t.w1Nodes[idx]!);
      CURV_H[p++]! += 2 * jc * jc;
    }
    for (let kk = 0; kk < dout; kk++) {
      const jc = adGradient(tape, t.b2Nodes[kk]!);
      CURV_H[p++]! += 2 * jc * jc;
    }
    for (let idx = 0; idx < dout * h; idx++) {
      const jc = adGradient(tape, t.w2Nodes[idx]!);
      CURV_H[p++]! += 2 * jc * jc;
    }
  }

  // Preconditioned descent: θ ← θ − lr·gᵢ / (Hᵍⁿᵢᵢ + damping). PSD denominator ⇒ always a descent step.
  {
    let p = 0;
    for (let j = 0; j < h; j++, p++)
      net.b1[j] = (net.b1[j] ?? 0) - (lr * CURV_G[p]!) / (CURV_H[p]! + damping);
    for (let idx = 0; idx < h * din; idx++, p++)
      net.w1[idx] = (net.w1[idx] ?? 0) - (lr * CURV_G[p]!) / (CURV_H[p]! + damping);
    for (let k = 0; k < dout; k++, p++)
      net.b2[k] = (net.b2[k] ?? 0) - (lr * CURV_G[p]!) / (CURV_H[p]! + damping);
    for (let idx = 0; idx < dout * h; idx++, p++)
      net.w2[idx] = (net.w2[idx] ?? 0) - (lr * CURV_G[p]!) / (CURV_H[p]! + damping);
  }

  return lossValue;
}
