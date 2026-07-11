/**
 * ESHKOL VM — a working minimal stack bytecode interpreter (leaf, exclusive owner).
 *
 * Retires the audit's PROXY_STUB note that "eshkol-vm.ts is NOT a VM" — it was a
 * pure re-export facade. This module now also ships a stack-based bytecode
 * interpreter inspired by the Tsotchke Eshkol `vm_core.c` execution
 * loop): a constant pool, an operand stack, arithmetic + comparison opcodes, and
 * executable control flow (JMP/JZ) with a bounded step budget. This is the first step of
 * the "digital biologics think in Eshkol" thesis — creatures/Archons can carry a
 * compiled `EshProgram` and EXECUTE it deterministically inside the sim loop, not
 * just hash a source string.
 *
 * The original program-heuristic evaluator (keyword/FNV salience) is preserved and
 * re-exported below for existing callers; it is honestly a SALIENCE HEURISTIC, while
 * the bytecode VM here is the actual local opcode executor. It is a bounded subset, not full Eshkol.
 *
 * DETERMINISM (Manhattan): pure interpreter, NO `Rng`, NO `Date.now`, fixed step
 * cap → always halts. Same program ⇒ same result, bit for bit.
 */

export {
  eshkolProgramFingerprint,
  eshkolEvalProgram,
  eshkolApplyProgramEffect,
} from './eshkol-bridge';
export type { EshkolProgramEffect } from './eshkol-bridge';

/** Core scientific repos vs fenced LLM boundaries (metadata only). */
export const TSOTCHKE_REPO_MAP = {
  eshkol: 'EshkolConsciousness — AD primitive, logic KB, GWT workspace, factor graphs',
  moonlab: 'MoonlabSim — Clifford, tensor/MPO, Bloch, QGT geometry',
  libirrep: 'LibirrepSym — SO(3)/SU(2) irreps, Clebsch–Gordan, equivariance',
  quantum_quake: 'QuantumQuake — QGE aliveness, lattice perturbations',
  quantum_rng:
    'QRNG — deterministic state-vector adaptation (eshkol-qrng.ts; not physical entropy)',
  ulg: 'ULG-Browser — triad handoff / hybrid aliveness',
  qgt: 'QGTLGeo — quantum geometry & topological curvature',
  spin_nets: 'SpinNets — spin-glass instinct lattices',
  tensorcore_metal: 'TensorCore-Metal — GPU tensor kernels (facade bias only)',
  gpt2_basic: 'gpt2-basic — BOUNDARY ONLY (shell/Copilot, never sim hot path)',
  llm_arbitrator: 'llm-arbitrator — BOUNDARY ONLY (never sim hot path)',
} as const;

export type TsotchkeRepoKey = keyof typeof TSOTCHKE_REPO_MAP;

/** Eshkol VM opcodes (stack machine). Operand-carrying ops read the next code word. */
export enum EshOp {
  PUSH = 0, // PUSH <constIndex>: push consts[idx]
  ADD = 1,
  SUB = 2,
  MUL = 3,
  DIV = 4,
  NEG = 5,
  DUP = 6,
  SWAP = 7,
  LT = 8, // a<b → 1 else 0
  GT = 9, // a>b → 1 else 0
  JMP = 10, // JMP <addr>
  JZ = 11, // JZ <addr>: pop; if 0 jump
  HALT = 12,
}

/** A compiled Eshkol program: flat opcode/operand stream + a constant pool. */
export interface EshProgram {
  readonly code: readonly number[];
  readonly consts: readonly number[];
}

/** Result of running an EshProgram. */
export interface EshVMResult {
  result: number; // top of stack at halt (0 if empty)
  steps: number; // opcodes executed
  halted: boolean; // true if HALT/end reached within the step budget
  stack: number[]; // final stack (bottom→top)
}

/**
 * Execute a compiled Eshkol bytecode program on a stack machine. Deterministic and
 * guaranteed to terminate within `maxSteps`. Stack underflow yields 0 (defensive).
 * O(steps).
 */
export function eshVMRun(prog: EshProgram, maxSteps = 4096): EshVMResult {
  const { code, consts } = prog;
  const stack: number[] = [];
  const pop = (): number => (stack.length > 0 ? stack.pop()! : 0);
  let pc = 0;
  let steps = 0;
  while (pc < code.length && steps < maxSteps) {
    steps++;
    const op = code[pc++]!;
    switch (op) {
      case EshOp.PUSH:
        stack.push(consts[code[pc++]!] ?? 0);
        break;
      case EshOp.ADD: {
        const b = pop();
        stack.push(pop() + b);
        break;
      }
      case EshOp.SUB: {
        const b = pop();
        stack.push(pop() - b);
        break;
      }
      case EshOp.MUL: {
        const b = pop();
        stack.push(pop() * b);
        break;
      }
      case EshOp.DIV: {
        const b = pop();
        const a = pop();
        stack.push(b === 0 ? 0 : a / b);
        break;
      }
      case EshOp.NEG:
        stack.push(-pop());
        break;
      case EshOp.DUP: {
        const a = pop();
        stack.push(a, a);
        break;
      }
      case EshOp.SWAP: {
        const b = pop();
        const a = pop();
        stack.push(b, a);
        break;
      }
      case EshOp.LT: {
        const b = pop();
        stack.push(pop() < b ? 1 : 0);
        break;
      }
      case EshOp.GT: {
        const b = pop();
        stack.push(pop() > b ? 1 : 0);
        break;
      }
      case EshOp.JMP:
        pc = code[pc]!;
        break;
      case EshOp.JZ: {
        const addr = code[pc++]!;
        if (pop() === 0) pc = addr;
        break;
      }
      case EshOp.HALT:
        return { result: stack.length ? stack[stack.length - 1]! : 0, steps, halted: true, stack };
      default:
        return { result: stack.length ? stack[stack.length - 1]! : 0, steps, halted: false, stack };
    }
  }
  return {
    result: stack.length ? stack[stack.length - 1]! : 0,
    steps,
    halted: pc >= code.length,
    stack,
  };
}
