/**
 * ESHKOL AUTOMATIC DIFFERENTIATION (V2) — reverse-mode AD via Wengert tape.
 *
 * A faithful TypeScript port of the Eshkol AD primitive from the Tsotchke corpus
 * (lib/backend/vm_autodiff.c, lib/core/runtime_autodiff.cpp). Implements
 * reverse-mode automatic differentiation with a computational graph (tape) that
 * records operations during the forward pass and propagates gradients backward
 * during the backward pass via the chain rule.
 *
 * UPSTREAM (ported, with attribution — see NOTICE.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/backend/vm_autodiff.c (native call IDs 390-409)
 *   + lib/core/runtime_autodiff.cpp (arena allocation, tape management)
 *   (MIT, © 2024–2026 tsotchke; full local corpus Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo)
 *
 * The tape structure mirrors the C implementation: each node stores its operation
 * type, forward-pass value, accumulated gradient, parent indices, and a saved
 * auxiliary value for backward pass (e.g., divisor for division, exponent for pow).
 *
 * Supported operations (all exact derivatives, no numerical approximation):
 *   - Binary: ADD, SUB, MUL, DIV, POW
 *   - Unary: SIN, COS, EXP, LOG, SQRT, NEG, ABS
 *   - Activations: RELU, SIGMOID, TANH
 *   - Leaves: CONST (no gradient flow), VAR (gradient collection point)
 *
 * Determinism: All operations are deterministic; no stochastic elements.
 * Allocation: Preallocated tape and node arrays; no hot-path allocation.
 *
 * Usage pattern:
 *   1. Create tape with adTapeNew(maxNodes)
 *   2. Record leaf nodes with adConst / adVar
 *   3. Build computation graph with binary/unary ops
 *   4. Run backward pass with adBackward(outputNode)
 *   5. Read gradients with adGradient(node)
 *   6. Reset tape for reuse with adTapeReset(tape)
 *
 * Example: f(x) = x^2 at x=3 → gradient = 6
 *   const tape = adTapeNew(64);
 *   const x = adVar(tape, 3.0);
 *   const y = adMul(tape, x, x);
 *   adBackward(tape, y);
 *   const grad = adGradient(tape, x); // 6.0
 */

/** AD operation types (mirrors C enum AdOpType) */
export enum AdOpType {
  AD_ADD = 0 /* binary: left + right */,
  AD_SUB = 1 /* binary: left - right */,
  AD_MUL = 2 /* binary: left * right */,
  AD_DIV = 3 /* binary: left / right */,
  AD_SIN = 4 /* unary:  sin(left) */,
  AD_COS = 5 /* unary:  cos(left) */,
  AD_EXP = 6 /* unary:  exp(left) */,
  AD_LOG = 7 /* unary:  log(left) */,
  AD_SQRT = 8 /* unary:  sqrt(left) */,
  AD_POW = 9 /* binary: left ^ saved (exponent stored in saved) */,
  AD_NEG = 10 /* unary:  -left */,
  AD_ABS = 11 /* unary:  |left| */,
  AD_RELU = 12 /* unary:  max(0, left) */,
  AD_SIGMOID = 13 /* unary:  1/(1+exp(-left)) */,
  AD_TANH = 14 /* unary:  tanh(left) */,
  AD_CONST = 15 /* leaf:   constant value (no gradient flows through) */,
  AD_VAR = 16 /* leaf:   variable (gradient collection point) */,
  AD_CUSTOM = 17 /* opaque: forward value supplied by the caller; backward supplied as a VJP closure */,
}

/**
 * A custom vector-Jacobian-product node's backward rule: given the incoming adjoint `gradOut`
 * (= ∂output/∂thisNode) and the forward VALUES of this node's inputs, return the gradient
 * contribution to EACH input (aligned to `inputs`). This is the hook a black-box differentiable
 * op plugs into — e.g. the exact parameter-shift gradient of a quantum-circuit expectation.
 */
export type CustomVjpBackward = (gradOut: number, inputValues: number[]) => number[];

/** Bookkeeping for one {@link adCustom} node: its input node indices + its VJP closure. */
interface CustomVjpEntry {
  inputs: number[];
  backward: CustomVjpBackward;
}

/** Tape node structure (mirrors C struct AdNode) */
interface AdNode {
  op: AdOpType; /* operation type */
  value: number; /* forward-pass result */
  gradient: number; /* accumulated backward gradient (adjoint) */
  left: number; /* index of left parent (-1 if none) */
  right: number; /* index of right parent (-1 if none) */
  saved: number; /* auxiliary saved value for backward pass */
}

/** Tape structure (mirrors C struct AdTape) */
export interface AdTape {
  nodes: AdNode[]; /* preallocated node array */
  len: number; /* number of nodes on tape */
  cap: number; /* capacity */
  /** Backward closures for AD_CUSTOM nodes, keyed by node index. Lazily created; cleared on reset.
   *  Empty (undefined) for the common all-classical tape ⇒ zero overhead for every existing consumer. */
  customVjps?: Map<number, CustomVjpEntry>;
}

/** Initial tape capacity (mirrors C AD_TAPE_INIT_CAP) */
const AD_TAPE_INIT_CAP = 64;

/**
 * Create a fresh AD tape with preallocated node array.
 *
 * @param initialCapacity - initial capacity (default 64)
 * @returns new tape
 */
export function adTapeNew(initialCapacity = AD_TAPE_INIT_CAP): AdTape {
  const cap = initialCapacity > 0 ? initialCapacity : AD_TAPE_INIT_CAP;
  const nodes: AdNode[] = Array.from<AdNode>({ length: cap });
  for (let i = 0; i < cap; i++) {
    nodes[i] = {
      op: AdOpType.AD_CONST,
      value: 0,
      gradient: 0,
      left: -1,
      right: -1,
      saved: 0,
    };
  }
  return { nodes, len: 0, cap };
}

/**
 * Append a node to the tape. Returns the node index, or -1 on error.
 *
 * @param tape - tape to append to
 * @param op - operation type
 * @param value - forward-pass value
 * @param left - index of left parent (-1 if none)
 * @param right - index of right parent (-1 if none)
 * @param saved - auxiliary saved value for backward pass
 * @returns node index, or -1 if tape is full
 */
function adTapePush(
  tape: AdTape,
  op: AdOpType,
  value: number,
  left: number,
  right: number,
  saved = 0.0,
): number {
  if (tape.len >= tape.cap) {
    // Auto-resize: double the capacity and allocate new nodes
    const newCap = tape.cap * 2;
    for (let i = tape.cap; i < newCap; i++) {
      tape.nodes.push({
        op: AdOpType.AD_CONST,
        value: 0,
        gradient: 0,
        left: -1,
        right: -1,
        saved: 0,
      });
    }
    tape.cap = newCap;
  }
  const idx = tape.len++;
  const node = tape.nodes[idx]!;
  node.op = op;
  node.value = value;
  node.gradient = 0.0;
  node.left = left;
  node.right = right;
  node.saved = saved;
  return idx;
}

/**
 * Record a constant (gradient does not flow through).
 *
 * @param tape - tape to record on
 * @param value - constant value
 * @returns node index
 */
export function adConst(tape: AdTape, value: number): number {
  return adTapePush(tape, AdOpType.AD_CONST, value, -1, -1, 0.0);
}

/**
 * Record a variable (gradient collection point).
 *
 * @param tape - tape to record on
 * @param value - variable value
 * @returns node index
 */
export function adVar(tape: AdTape, value: number): number {
  return adTapePush(tape, AdOpType.AD_VAR, value, -1, -1, 0.0);
}

/**
 * Record an OPAQUE differentiable node: a black box whose forward value `value` is computed by the
 * caller and whose gradient w.r.t. its `inputs` is supplied by a custom VJP closure `backward`. This
 * is the reverse-mode AD extension point — a faithful port of Eshkol's custom-VJP AD nodes (upstream
 * `feat(ad): custom-VJP AD nodes` PR #270, commit d4154f6, observed at HEAD 4d94ab6, v1.3.3-evolve),
 * whose flagship use is differentiating through a Moonlab VQE circuit by wrapping its exact adjoint.
 *
 * During {@link adBackward}, when this node's adjoint `g` is reached, `backward(g, inputValues)` is
 * invoked and its returned per-input gradients are ACCUMULATED into the corresponding input leaves —
 * so a black-box op (e.g. a quantum-circuit expectation differentiated by the exact parameter-shift
 * rule) composes with the surrounding classical tape under one unified chain rule.
 *
 * The inputs must already be on the tape (created before this node) so reverse topological order holds.
 * {@link adHvp} does not propagate second-order derivatives through custom nodes (they are treated as
 * having zero curvature); use custom nodes for gradients, the smooth classical ops for Hessian work.
 *
 * @param tape tape to record on
 * @param value the forward value f(inputs), computed by the caller
 * @param inputs node indices this custom value depends on (gradient flows back to these)
 * @param backward VJP closure: (gradOut, inputValues) → gradient contribution to each input
 * @returns the new node index
 */
export function adCustom(
  tape: AdTape,
  value: number,
  inputs: number[],
  backward: CustomVjpBackward,
): number {
  const node = adTapePush(tape, AdOpType.AD_CUSTOM, value, inputs[0] ?? -1, inputs[1] ?? -1, 0.0);
  if (!tape.customVjps) tape.customVjps = new Map();
  tape.customVjps.set(node, { inputs: inputs.slice(), backward });
  return node;
}

/**
 * Binary addition: left + right.
 *
 * @param tape - tape to record on
 * @param left - index of left operand
 * @param right - index of right operand
 * @returns node index
 */
export function adAdd(tape: AdTape, left: number, right: number): number {
  const v = tape.nodes[left]!.value + tape.nodes[right]!.value;
  return adTapePush(tape, AdOpType.AD_ADD, v, left, right, 0.0);
}

/**
 * Binary subtraction: left - right.
 *
 * @param tape - tape to record on
 * @param left - index of left operand
 * @param right - index of right operand
 * @returns node index
 */
export function adSub(tape: AdTape, left: number, right: number): number {
  const v = tape.nodes[left]!.value - tape.nodes[right]!.value;
  return adTapePush(tape, AdOpType.AD_SUB, v, left, right, 0.0);
}

/**
 * Binary multiplication: left * right.
 *
 * @param tape - tape to record on
 * @param left - index of left operand
 * @param right - index of right operand
 * @returns node index
 */
export function adMul(tape: AdTape, left: number, right: number): number {
  const lv = tape.nodes[left]!.value;
  const rv = tape.nodes[right]!.value;
  return adTapePush(tape, AdOpType.AD_MUL, lv * rv, left, right, 0.0);
}

/**
 * Binary division: left / right.
 *
 * @param tape - tape to record on
 * @param left - index of left operand
 * @param right - index of right operand
 * @returns node index
 */
export function adDiv(tape: AdTape, left: number, right: number): number {
  const lv = tape.nodes[left]!.value;
  const rv = tape.nodes[right]!.value;
  return adTapePush(tape, AdOpType.AD_DIV, lv / rv, left, right, rv);
}

/**
 * Binary power: left ^ right (saves exponent for backward pass).
 *
 * @param tape - tape to record on
 * @param base - index of base operand
 * @param exponent - index of exponent operand
 * @returns node index
 */
export function adPow(tape: AdTape, base: number, exponent: number): number {
  const bv = tape.nodes[base]!.value;
  const ev = tape.nodes[exponent]!.value;
  const v = Math.pow(bv, ev);
  return adTapePush(tape, AdOpType.AD_POW, v, base, exponent, ev);
}

/**
 * Unary sine: sin(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adSin(tape: AdTape, input: number): number {
  const v = Math.sin(tape.nodes[input]!.value);
  return adTapePush(tape, AdOpType.AD_SIN, v, input, -1, 0.0);
}

/**
 * Unary cosine: cos(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adCos(tape: AdTape, input: number): number {
  const v = Math.cos(tape.nodes[input]!.value);
  return adTapePush(tape, AdOpType.AD_COS, v, input, -1, 0.0);
}

/**
 * Unary exponential: exp(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adExp(tape: AdTape, input: number): number {
  const v = Math.exp(tape.nodes[input]!.value);
  return adTapePush(tape, AdOpType.AD_EXP, v, input, -1, 0.0);
}

/**
 * Unary natural log: log(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adLog(tape: AdTape, input: number): number {
  // log's domain is (0, ∞); clamp a non-positive base to a tiny epsilon so a mis-fed input can never
  // poison the tape's forward value with -Infinity/NaN (same domain-guard discipline as AD_POW).
  const x = tape.nodes[input]!.value;
  const v = Math.log(x > 0 ? x : 1e-12);
  return adTapePush(tape, AdOpType.AD_LOG, v, input, -1, 0.0);
}

/**
 * Unary square root: sqrt(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adSqrt(tape: AdTape, input: number): number {
  // sqrt's domain is [0, ∞); clamp a negative base to 0 so a mis-fed input can never poison the
  // forward value with NaN (a rounding-error negative is the common case).
  const x = tape.nodes[input]!.value;
  const v = Math.sqrt(x > 0 ? x : 0);
  return adTapePush(tape, AdOpType.AD_SQRT, v, input, -1, 0.0);
}

/**
 * Unary negation: -input.
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adNeg(tape: AdTape, input: number): number {
  const v = -tape.nodes[input]!.value;
  return adTapePush(tape, AdOpType.AD_NEG, v, input, -1, 0.0);
}

/**
 * Unary absolute value: |input|.
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adAbs(tape: AdTape, input: number): number {
  const v = Math.abs(tape.nodes[input]!.value);
  return adTapePush(tape, AdOpType.AD_ABS, v, input, -1, 0.0);
}

/**
 * Unary ReLU: max(0, input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adRelu(tape: AdTape, input: number): number {
  const iv = tape.nodes[input]!.value;
  const v = iv > 0.0 ? iv : 0.0;
  return adTapePush(tape, AdOpType.AD_RELU, v, input, -1, 0.0);
}

/**
 * Unary sigmoid: 1 / (1 + exp(-input)).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adSigmoid(tape: AdTape, input: number): number {
  const v = 1.0 / (1.0 + Math.exp(-tape.nodes[input]!.value));
  return adTapePush(tape, AdOpType.AD_SIGMOID, v, input, -1, 0.0);
}

/**
 * Unary tanh: tanh(input).
 *
 * @param tape - tape to record on
 * @param input - index of operand
 * @returns node index
 */
export function adTanh(tape: AdTape, input: number): number {
  const v = Math.tanh(tape.nodes[input]!.value);
  return adTapePush(tape, AdOpType.AD_TANH, v, input, -1, 0.0);
}

/**
 * Reverse-mode gradient propagation.
 *
 * Seeds the output node with gradient 1.0, then walks the tape in reverse
 * topological order (guaranteed by construction since nodes are appended in
 * evaluation order), distributing gradients to parents according to the local
 * derivative of each operation.
 *
 * @param tape - tape to backpropagate on
 * @param output - index of output node to seed gradient
 */
export function adBackward(tape: AdTape, output: number): void {
  if (output < 0 || output >= tape.len) return;

  // Zero all gradients
  for (let i = 0; i < tape.len; i++) {
    tape.nodes[i]!.gradient = 0.0;
  }

  // Seed output
  tape.nodes[output]!.gradient = 1.0;

  // Walk tape in reverse
  for (let i = output; i >= 0; i--) {
    const n = tape.nodes[i]!;
    const g = n.gradient;
    if (g === 0.0) continue; // optimization: skip zero-gradient nodes

    const L = n.left;
    const R = n.right;

    switch (n.op) {
      case AdOpType.AD_ADD:
        // d/dL (L+R) = 1, d/dR (L+R) = 1
        tape.nodes[L]!.gradient += g;
        tape.nodes[R]!.gradient += g;
        break;

      case AdOpType.AD_SUB:
        // d/dL (L-R) = 1, d/dR (L-R) = -1
        tape.nodes[L]!.gradient += g;
        tape.nodes[R]!.gradient -= g;
        break;

      case AdOpType.AD_MUL:
        // d/dL (L*R) = R, d/dR (L*R) = L
        tape.nodes[L]!.gradient += g * tape.nodes[R]!.value;
        tape.nodes[R]!.gradient += g * tape.nodes[L]!.value;
        break;

      case AdOpType.AD_DIV:
        // d/dL (L/R) = 1/R, d/dR (L/R) = -L/R^2
        {
          const rv = n.saved; // saved = right.value at forward time
          tape.nodes[L]!.gradient += g / rv;
          tape.nodes[R]!.gradient -= (g * tape.nodes[L]!.value) / (rv * rv);
        }
        break;

      case AdOpType.AD_SIN:
        // d/dL sin(L) = cos(L)
        tape.nodes[L]!.gradient += g * Math.cos(tape.nodes[L]!.value);
        break;

      case AdOpType.AD_COS:
        // d/dL cos(L) = -sin(L)
        tape.nodes[L]!.gradient += g * -Math.sin(tape.nodes[L]!.value);
        break;

      case AdOpType.AD_EXP:
        // d/dL exp(L) = exp(L) = output.value
        tape.nodes[L]!.gradient += g * n.value;
        break;

      case AdOpType.AD_LOG:
        // d/dL log(L) = 1/L — L>0 on the log domain; guard L==0 so it contributes 0, not ±Infinity,
        // rather than poisoning the whole reverse sweep (same discipline as AD_POW below).
        {
          const lv = tape.nodes[L]!.value;
          if (lv > 0) tape.nodes[L]!.gradient += g / lv;
        }
        break;

      case AdOpType.AD_SQRT:
        // d/dL sqrt(L) = 1/(2*sqrt(L)) = 1/(2*output.value) — guard output==0 (sqrt(0)) so it
        // contributes 0 rather than ±Infinity.
        if (n.value > 0) tape.nodes[L]!.gradient += g / (2.0 * n.value);
        break;

      case AdOpType.AD_POW:
        // d/dL (L^e) = e * L^(e-1), saved = exponent
        {
          const ev = n.saved;
          const lv = tape.nodes[L]!.value;
          tape.nodes[L]!.gradient += g * ev * Math.pow(lv, ev - 1.0);
          // d/dR (L^R) = L^R * ln(L) — for variable exponent. ln(L) is undefined for L<=0, so guard
          // against a NaN gradient poisoning the whole reverse sweep (the exponent-derivative simply
          // does not exist for a non-positive base; contribute 0 rather than NaN).
          if (R >= 0 && lv > 0) {
            tape.nodes[R]!.gradient += g * n.value * Math.log(lv);
          }
        }
        break;

      case AdOpType.AD_NEG:
        // d/dL (-L) = -1
        tape.nodes[L]!.gradient -= g;
        break;

      case AdOpType.AD_ABS:
        // d/dL |L| = sign(L)
        {
          const lv = tape.nodes[L]!.value;
          const sign = lv > 0.0 ? 1.0 : lv < 0.0 ? -1.0 : 0.0;
          tape.nodes[L]!.gradient += g * sign;
        }
        break;

      case AdOpType.AD_RELU:
        // d/dL relu(L) = (L > 0) ? 1 : 0
        if (tape.nodes[L]!.value > 0.0) {
          tape.nodes[L]!.gradient += g;
        }
        break;

      case AdOpType.AD_SIGMOID:
        // d/dL sigma(L) = sigma(L) * (1 - sigma(L)) = out * (1 - out)
        tape.nodes[L]!.gradient += g * n.value * (1.0 - n.value);
        break;

      case AdOpType.AD_TANH:
        // d/dL tanh(L) = 1 - tanh(L)^2 = 1 - out^2
        tape.nodes[L]!.gradient += g * (1.0 - n.value * n.value);
        break;

      case AdOpType.AD_CUSTOM: {
        // Opaque node: fold in the caller-supplied VJP. grads[k] = ∂output/∂input_k, accumulated onto
        // each input leaf — the seam where a black-box gradient (e.g. exact parameter-shift on a quantum
        // circuit) joins the classical chain rule. Absent entry ⇒ no gradient flows (treated as constant).
        const entry = tape.customVjps?.get(i);
        if (entry) {
          const inputValues = entry.inputs.map((idx) => (idx >= 0 ? tape.nodes[idx]!.value : 0));
          const grads = entry.backward(g, inputValues);
          for (let k = 0; k < entry.inputs.length; k++) {
            const inNode = entry.inputs[k]!;
            if (inNode >= 0) tape.nodes[inNode]!.gradient += grads[k] ?? 0;
          }
        }
        break;
      }

      case AdOpType.AD_CONST:
      case AdOpType.AD_VAR:
        // Leaf nodes — no parents to propagate to
        break;
    }
  }
}

/**
 * Read the accumulated gradient of a node.
 *
 * @param tape - tape to read from
 * @param node - node index
 * @returns gradient value
 */
export function adGradient(tape: AdTape, node: number): number {
  if (node < 0 || node >= tape.len) return 0.0;
  return tape.nodes[node]!.gradient;
}

/**
 * Read the forward value of a node.
 *
 * @param tape - tape to read from
 * @param node - node index
 * @returns forward value
 */
export function adValue(tape: AdTape, node: number): number {
  if (node < 0 || node >= tape.len) return 0.0;
  return tape.nodes[node]!.value;
}

/**
 * Reset tape for reuse (zeros gradients, resets length).
 *
 * @param tape - tape to reset
 */
export function adTapeReset(tape: AdTape): void {
  for (let i = 0; i < tape.len; i++) {
    tape.nodes[i]!.gradient = 0.0;
  }
  tape.len = 0;
  if (tape.customVjps) tape.customVjps.clear();
}

/**
 * Get current tape length.
 *
 * @param tape - tape to query
 * @returns number of nodes on tape
 */
export function adTapeLen(tape: AdTape): number {
  return tape.len;
}

/* ===========================================================================================
 * EXACT SECOND ORDER — forward-over-reverse Hessian·vector products (Pearlmutter R-operator).
 *
 * This is the reverse-mode companion to the univariate hyper-dual engine in `math/hyperdual.ts`:
 * where hyper-dual numbers give an exact second derivative of a SCALAR function in one forward
 * pass, this gives an exact Hessian-times-vector product `H·v` of a MULTIVARIATE tape function in
 * one extra sweep pair — the machinery real curvature-aware optimisers (Gauss-Newton, natural
 * gradient, Newton-CG) are built on, with NO finite-difference truncation error.
 *
 * Method (Pearlmutter, "Fast Exact Multiplication by the Hessian", Neural Computation 6(1), 1994):
 * apply the directional-derivative operator Rᵥ{·} = d/dr[·](x + r·v)|_{r=0} to the reverse-mode
 * adjoint recurrence. Concretely, alongside the usual forward value and backward adjoint we carry
 *   • valueDot[i]  = Rᵥ{value[i]}    — the forward tangent (how node i moves as x moves along v);
 *   • adjDot[i]    = Rᵥ{adjoint[i]}  — the tangent of the adjoint.
 * Seeding the tangent with `v` at the VAR leaves and reading `adjDot` back at those leaves yields
 * exactly (H·v)_i, while `adj` yields the ordinary gradient ∇f_i for free.
 *
 * UPSTREAM lineage (Tsotchke/Eshkol — see THIRD-PARTY-NOTICES.md): this extends the ported
 * reverse-mode tape (`vm_autodiff.c`) with the same exact forward-over-reverse second-order path
 * Eshkol added upstream in its AD fix campaign — "exact jacobian/hessian through inner forward-mode
 * derivatives" (ESH-0120 / ESH-0121, PR #246) and the "custom-VJP AD nodes" that differentiate
 * through Moonlab VQE circuits (PR #270, commit d4154f6), observed at eshkol HEAD 4d94ab6
 * (2026-07-12, v1.3.3-evolve). Per-op tangent formulas mirror the exact second derivatives already
 * proven in `hyperdual.ts` (Fike & Alonso), so the two engines cross-check each other.
 *
 * Determinism: pure — no Rng, no Date.now, no Math.random. Exact analytic derivatives throughout.
 * =========================================================================================== */

/** Reusable scratch for {@link adHvp}: forward tangent + adjoint + adjoint-tangent, one slot/node. */
export interface HvpScratch {
  /** valueDot[i] = Rᵥ{value[i]} — forward directional derivative of each node. */
  valueDot: Float64Array;
  /** adj[i] = ∂output/∂value[i] — the ordinary reverse-mode adjoint (gradient at the leaves). */
  adj: Float64Array;
  /** adjDot[i] = Rᵥ{adj[i]} — the directional derivative of the adjoint; = (H·v) at the VAR leaves. */
  adjDot: Float64Array;
}

/** Allocate HVP scratch for a tape of up to `cap` nodes (grow with the tape as needed). */
export function adHvpScratch(cap: number): HvpScratch {
  const n = cap > 0 ? cap : 1;
  return { valueDot: new Float64Array(n), adj: new Float64Array(n), adjDot: new Float64Array(n) };
}

/**
 * Exact Hessian·vector product by forward-over-reverse AD over an already-recorded tape.
 *
 * Computes both the gradient ∇f and the Hessian-vector product H·v of the scalar tape output
 * `output` with respect to every VAR leaf, in one forward-tangent sweep + one reverse sweep. The
 * perturbation direction is supplied per node in `dir` (length ≥ tape.len; nonzero only at the VAR
 * leaves you are perturbing — CONST leaves ignore their entry). Results are written into `scratch`
 * (allocated to fit if omitted or too small) and also returned by reference:
 *   • `scratch.adj[node]`    = ∂f/∂value[node]  (the gradient at a VAR leaf);
 *   • `scratch.adjDot[node]` = (H·v)_node       (the Hessian-vector product at a VAR leaf).
 *
 * Pure and exact (analytic per-op tangents; no finite differences). O(tape.len).
 *
 * @param tape recorded forward tape (call the forward ops, then this — do NOT call adBackward first)
 * @param output index of the scalar output node
 * @param dir per-node perturbation direction v (length ≥ tape.len)
 * @param scratch optional reusable scratch; grown/allocated to fit
 * @returns the scratch holding `adj` (gradient) and `adjDot` (H·v)
 */
export function adHvp(
  tape: AdTape,
  output: number,
  dir: ArrayLike<number>,
  scratch?: HvpScratch,
): HvpScratch {
  const len = tape.len;
  const s =
    scratch && scratch.valueDot.length >= len ? scratch : adHvpScratch(Math.max(len, tape.cap));
  const vd = s.valueDot;
  const adj = s.adj;
  const adjDot = s.adjDot;
  const nodes = tape.nodes;

  // --- Forward tangent sweep: valueDot[i] = Rᵥ{value[i]}, parents-before-children by construction.
  for (let i = 0; i < len; i++) {
    const n = nodes[i]!;
    const L = n.left;
    const R = n.right;
    const lv = L >= 0 ? nodes[L]!.value : 0;
    const rv = R >= 0 ? nodes[R]!.value : 0;
    const lvd = L >= 0 ? vd[L]! : 0;
    const rvd = R >= 0 ? vd[R]! : 0;
    let d = 0;
    switch (n.op) {
      case AdOpType.AD_ADD:
        d = lvd + rvd;
        break;
      case AdOpType.AD_SUB:
        d = lvd - rvd;
        break;
      case AdOpType.AD_MUL:
        d = lvd * rv + lv * rvd;
        break;
      case AdOpType.AD_DIV: {
        const r = rv;
        if (r !== 0) d = lvd / r - (lv * rvd) / (r * r);
        break;
      }
      case AdOpType.AD_SIN:
        d = Math.cos(lv) * lvd;
        break;
      case AdOpType.AD_COS:
        d = -Math.sin(lv) * lvd;
        break;
      case AdOpType.AD_EXP:
        d = n.value * lvd; // exp(lv) = n.value
        break;
      case AdOpType.AD_LOG:
        if (lv > 0) d = lvd / lv;
        break;
      case AdOpType.AD_SQRT:
        if (n.value > 0) d = lvd / (2 * n.value);
        break;
      case AdOpType.AD_POW: {
        const ev = n.saved; // exponent value at forward time
        d = ev * Math.pow(lv, ev - 1) * lvd;
        if (R >= 0 && lv > 0) d += n.value * Math.log(lv) * rvd; // variable-exponent term
        break;
      }
      case AdOpType.AD_NEG:
        d = -lvd;
        break;
      case AdOpType.AD_ABS:
        d = (lv > 0 ? 1 : lv < 0 ? -1 : 0) * lvd;
        break;
      case AdOpType.AD_RELU:
        d = lv > 0 ? lvd : 0;
        break;
      case AdOpType.AD_SIGMOID: {
        const sg = n.value;
        d = sg * (1 - sg) * lvd;
        break;
      }
      case AdOpType.AD_TANH: {
        const t = n.value;
        d = (1 - t * t) * lvd;
        break;
      }
      case AdOpType.AD_VAR:
        d = i < dir.length ? (dir[i] ?? 0) : 0; // seed the perturbation direction
        break;
      case AdOpType.AD_CONST:
      default:
        d = 0;
        break;
    }
    vd[i] = d;
    adj[i] = 0;
    adjDot[i] = 0;
  }

  if (output < 0 || output >= len) return s;

  // --- Reverse sweep carrying BOTH the adjoint and its tangent (the R-operator applied to backprop).
  adj[output] = 1;
  adjDot[output] = 0;
  for (let i = output; i >= 0; i--) {
    const g = adj[i]!;
    const gd = adjDot[i]!;
    if (g === 0 && gd === 0) continue; // neither the adjoint nor its tangent flows through here
    const n = nodes[i]!;
    const L = n.left;
    const R = n.right;
    const lv = L >= 0 ? nodes[L]!.value : 0;
    const rv = R >= 0 ? nodes[R]!.value : 0;
    const lvd = L >= 0 ? vd[L]! : 0;
    const rvd = R >= 0 ? vd[R]! : 0;

    switch (n.op) {
      case AdOpType.AD_ADD:
        adj[L]! += g;
        adj[R]! += g;
        adjDot[L]! += gd;
        adjDot[R]! += gd;
        break;
      case AdOpType.AD_SUB:
        adj[L]! += g;
        adj[R]! -= g;
        adjDot[L]! += gd;
        adjDot[R]! -= gd;
        break;
      case AdOpType.AD_MUL:
        // ∂/∂L = rv, ∂/∂R = lv ; Rᵥ{rv}=rvd, Rᵥ{lv}=lvd
        adj[L]! += g * rv;
        adj[R]! += g * lv;
        adjDot[L]! += gd * rv + g * rvd;
        adjDot[R]! += gd * lv + g * lvd;
        break;
      case AdOpType.AD_DIV: {
        const r = n.saved; // rv at forward time
        if (r !== 0) {
          const r2 = r * r;
          // ∂/∂L = 1/r ; Rᵥ{1/r} = -rvd/r²
          adj[L]! += g / r;
          adjDot[L]! += gd / r + g * (-rvd / r2);
          // ∂/∂R = -lv/r² ; Rᵥ{-lv/r²} = -lvd/r² + 2·lv·rvd/r³
          adj[R]! += (-g * lv) / r2;
          adjDot[R]! += gd * (-lv / r2) + g * (-lvd / r2 + (2 * lv * rvd) / (r2 * r));
        }
        break;
      }
      case AdOpType.AD_SIN: {
        const c = Math.cos(lv);
        adj[L]! += g * c;
        adjDot[L]! += gd * c + g * (-Math.sin(lv) * lvd);
        break;
      }
      case AdOpType.AD_COS: {
        const sn = Math.sin(lv);
        adj[L]! += g * -sn;
        adjDot[L]! += gd * -sn + g * (-Math.cos(lv) * lvd);
        break;
      }
      case AdOpType.AD_EXP: {
        const e = n.value; // exp(lv)
        adj[L]! += g * e;
        adjDot[L]! += gd * e + g * (e * lvd);
        break;
      }
      case AdOpType.AD_LOG:
        if (lv > 0) {
          adj[L]! += g / lv;
          adjDot[L]! += gd / lv + g * (-lvd / (lv * lv));
        }
        break;
      case AdOpType.AD_SQRT: {
        const sq = n.value;
        if (sq > 0) {
          adj[L]! += g / (2 * sq);
          adjDot[L]! += gd / (2 * sq) + g * (-lvd / (4 * sq * sq * sq));
        }
        break;
      }
      case AdOpType.AD_POW: {
        const ev = n.saved;
        const p1 = ev * Math.pow(lv, ev - 1); // ∂/∂L
        const p1dot = ev * (ev - 1) * Math.pow(lv, ev - 2) * lvd; // Rᵥ{∂/∂L} (base term)
        adj[L]! += g * p1;
        adjDot[L]! += gd * p1 + g * p1dot;
        if (R >= 0 && lv > 0) {
          const lnL = Math.log(lv);
          const q = n.value * lnL; // ∂/∂R = L^R·ln L
          // Rᵥ{L^R} = L^R·(R/L·lvd + lnL·rvd); Rᵥ{ln L} = lvd/L
          const powDot = n.value * ((ev / lv) * lvd + lnL * rvd);
          const qdot = powDot * lnL + n.value * (lvd / lv);
          adj[R]! += g * q;
          adjDot[R]! += gd * q + g * qdot;
        }
        break;
      }
      case AdOpType.AD_NEG:
        adj[L]! -= g;
        adjDot[L]! -= gd;
        break;
      case AdOpType.AD_ABS: {
        const sgn = lv > 0 ? 1 : lv < 0 ? -1 : 0;
        adj[L]! += g * sgn;
        adjDot[L]! += gd * sgn; // second derivative 0 a.e.
        break;
      }
      case AdOpType.AD_RELU:
        if (lv > 0) {
          adj[L]! += g;
          adjDot[L]! += gd; // slope 1, curvature 0 on the active side
        }
        break;
      case AdOpType.AD_SIGMOID: {
        const sg = n.value;
        const d1 = sg * (1 - sg);
        adj[L]! += g * d1;
        adjDot[L]! += gd * d1 + g * ((1 - 2 * sg) * d1 * lvd);
        break;
      }
      case AdOpType.AD_TANH: {
        const t = n.value;
        const d1 = 1 - t * t;
        adj[L]! += g * d1;
        adjDot[L]! += gd * d1 + g * (-2 * t * d1 * lvd);
        break;
      }
      case AdOpType.AD_CONST:
      case AdOpType.AD_VAR:
        break; // leaves — gradient/tangent collect here, nothing to propagate
    }
  }

  return s;
}

/**
 * Exact Hessian DIAGONAL of a scalar tape output w.r.t. a chosen set of VAR leaves, by `varNodes.length`
 * unit-direction {@link adHvp} calls (H_ii = eᵢᵀ·H·eᵢ). O(k·tape.len) for k probed vars — intended for
 * verification and small nets, not the per-frame hot path (curvature-aware training uses the cheaper
 * PSD Gauss-Newton diagonal instead; see `sim/ad-mlp.mlpTrainStepCurvature`).
 *
 * @param tape recorded forward tape
 * @param output scalar output node index
 * @param varNodes the VAR leaf node indices whose Hessian diagonal entries are wanted
 * @returns array `H_ii` aligned to `varNodes`
 */
export function adHessianDiag(tape: AdTape, output: number, varNodes: number[]): number[] {
  const dir = new Float64Array(tape.len);
  const scratch = adHvpScratch(tape.cap);
  const out: number[] = [];
  for (let k = 0; k < varNodes.length; k++) {
    const node = varNodes[k]!;
    dir.fill(0);
    dir[node] = 1;
    adHvp(tape, output, dir, scratch);
    out.push(scratch.adjDot[node] ?? 0);
  }
  return out;
}
