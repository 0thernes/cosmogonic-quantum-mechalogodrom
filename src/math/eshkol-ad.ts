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
  const v = Math.log(tape.nodes[input]!.value);
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
  const v = Math.sqrt(tape.nodes[input]!.value);
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
        // d/dL log(L) = 1/L
        tape.nodes[L]!.gradient += g / tape.nodes[L]!.value;
        break;

      case AdOpType.AD_SQRT:
        // d/dL sqrt(L) = 1/(2*sqrt(L)) = 1/(2*output.value)
        tape.nodes[L]!.gradient += g / (2.0 * n.value);
        break;

      case AdOpType.AD_POW:
        // d/dL (L^e) = e * L^(e-1), saved = exponent
        {
          const ev = n.saved;
          const lv = tape.nodes[L]!.value;
          tape.nodes[L]!.gradient += g * ev * Math.pow(lv, ev - 1.0);
          // d/dR (L^R) = L^R * ln(L) — for variable exponent
          if (R >= 0) {
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
