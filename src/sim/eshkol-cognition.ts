/**
 * ESHKOL COGNITION — an Archon literally THINKS in Eshkol (executes bytecode).
 *
 * This is the first end-to-end "digital biologic computes in Eshkol" path: an
 * Archon's Tsotchke substrate vector is COMPILED into a real {@link EshProgram}
 * (constant pool + opcodes) and EXECUTED on the {@link eshVMRun} stack VM — a
 * genuine program run over the WHOLE 5-dim substrate with a nonlinear drive
 * (additive + multiplicative terms) and nested control-flow branches, committing
 * a graded EXPLOIT / BALANCED / EXPLORE plan. No source-string hashing, no heuristic
 * blend: the decision is the output of running a program, the way Eshkol intends
 * computation to be first-class.
 *
 * DETERMINISM (Manhattan): pure compilation + pure VM execution, NO `Rng`, NO
 * `Date.now`. Same substrate + beat ⇒ same compiled program ⇒ same decision.
 */

import { clamp } from '../math/scalar';
import { EshOp, eshVMRun, type EshProgram } from './eshkol-vm';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** The plan values the compiled program can commit to (high → decisive exploit, mid → balanced). */
export const ESHKOL_EXPLOIT = 0.85;
export const ESHKOL_BALANCED = 0.55;
export const ESHKOL_EXPLORE = 0.3;

/** Result of an Archon executing its Eshkol thought-program. */
export interface ArchonThought {
  /** Plan bias in [0,1] — the value the program HALTed with (EXPLOIT / BALANCED / EXPLORE). */
  planBias: number;
  /** True when the program took the strong EXPLOIT branch (drive cleared the high threshold). */
  decisive: boolean;
  /** VM opcodes executed (proves the program actually ran). */
  steps: number;
}

/**
 * Compile an Archon's substrate vector + beat into a real Eshkol bytecode program. The Archon reads
 * its WHOLE 5-dim substrate (was only the first 3) through a genuine nonlinear drive:
 *   drive = s0 + s1 + s2 + s3·s4      (three additive drives + one multiplicative interaction)
 * and a TWO-LEVEL graded decision (not a bare binary):
 *   drive > thrHigh            → commit EXPLOIT  (decisive)
 *   thrLow < drive ≤ thrHigh   → commit BALANCED (hedged)
 *   drive ≤ thrLow             → commit EXPLORE
 * Both thresholds drift with the beat phase, so the same Archon changes its mind over time. The
 * program therefore exercises PUSH/ADD/MUL/GT/JZ/HALT across nested branches — a deeper Eshkol
 * computation than the old sum-3-and-compare. Pure; returns a fresh program.
 */
export function compileArchonProgram(substrate: Float32Array, beat: number): EshProgram {
  const s0 = clamp01(substrate[0] ?? 0.5);
  const s1 = clamp01(substrate[1] ?? 0.5);
  const s2 = clamp01(substrate[2] ?? 0.5);
  const s3 = clamp01(substrate[3] ?? 0.5);
  const s4 = clamp01(substrate[4] ?? 0.5);
  const phase = (((beat % 64) + 64) % 64) / 64;
  // drive ∈ [0, 4]; thresholds scaled to that range and drifting with the phase.
  const thrHigh = (0.55 + phase * 0.2) * 4;
  const thrLow = (0.28 + phase * 0.15) * 4;
  const consts = [
    s0,
    s1,
    s2,
    s3,
    s4,
    thrHigh,
    thrLow,
    ESHKOL_EXPLOIT,
    ESHKOL_BALANCED,
    ESHKOL_EXPLORE,
  ];
  // Reusable block that leaves `drive = s0 + s1 + s2 + s3*s4` on the stack top.
  const DRIVE = [
    EshOp.PUSH,
    0,
    EshOp.PUSH,
    1,
    EshOp.ADD, // s0 + s1
    EshOp.PUSH,
    2,
    EshOp.ADD, //               + s2
    EshOp.PUSH,
    3,
    EshOp.PUSH,
    4,
    EshOp.MUL,
    EshOp.ADD, // + s3*s4  → drive
  ];
  // Level 1: drive > thrHigh ? EXPLOIT : fall through to the low check. (The drive is recomputed for
  // the second comparison — the VM has no local slots — which also keeps each branch self-contained.)
  const head = [
    ...DRIVE,
    EshOp.PUSH,
    5,
    EshOp.GT,
    EshOp.JZ,
    /*→Llow, patched*/ 0,
    EshOp.PUSH,
    7,
    EshOp.HALT,
  ];
  const llow = head.length; // address where the low-check block begins
  const mid = [
    ...DRIVE,
    EshOp.PUSH,
    6,
    EshOp.GT,
    EshOp.JZ,
    /*→Lexplore, patched*/ 0,
    EshOp.PUSH,
    8,
    EshOp.HALT,
  ];
  const lexplore = llow + mid.length; // address of the EXPLORE tail
  const tail = [EshOp.PUSH, 9, EshOp.HALT];
  const code = [...head, ...mid, ...tail];
  code[head.indexOf(EshOp.JZ) + 1] = llow; // patch level-1 JZ target
  code[llow + mid.indexOf(EshOp.JZ) + 1] = lexplore; // patch level-2 JZ target
  return { code, consts };
}

/**
 * Run an Archon's compiled Eshkol program and report the decision. This is the
 * load-bearing "think in Eshkol" call: a real VM execution decides the plan.
 */
export function archonThink(substrate: Float32Array, beat: number): ArchonThought {
  const prog = compileArchonProgram(substrate, beat);
  const r = eshVMRun(prog);
  const planBias = clamp01(r.result);
  const decisive = Math.abs(planBias - ESHKOL_EXPLOIT) < Math.abs(planBias - ESHKOL_EXPLORE);
  return { planBias, decisive, steps: r.steps };
}
