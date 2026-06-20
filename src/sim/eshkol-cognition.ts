/**
 * ESHKOL COGNITION — an Archon literally THINKS in Eshkol (executes bytecode).
 *
 * This is the first end-to-end "digital biologic computes in Eshkol" path: an
 * Archon's Tsotchke substrate vector is COMPILED into a real {@link EshProgram}
 * (constant pool + opcodes) and EXECUTED on the {@link eshVMRun} stack VM — a
 * genuine program run with arithmetic, a comparison, and a control-flow branch —
 * to decide explore vs exploit. No source-string hashing, no heuristic blend: the
 * decision is the output of running a program, the way Eshkol intends computation
 * to be first-class.
 *
 * DETERMINISM (Manhattan): pure compilation + pure VM execution, NO `Rng`, NO
 * `Date.now`. Same substrate + beat ⇒ same compiled program ⇒ same decision.
 */

import { clamp } from '../math/scalar';
import { EshOp, eshVMRun, type EshProgram } from './eshkol-vm';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** The exploit / explore plan values the compiled program can commit to. */
export const ESHKOL_EXPLOIT = 0.85;
export const ESHKOL_EXPLORE = 0.3;

/** Result of an Archon executing its Eshkol thought-program. */
export interface ArchonThought {
  /** Plan bias in [0,1] — the value the program HALTed with. */
  planBias: number;
  /** True when the program took the exploit branch (substrate drive exceeded threshold). */
  decisive: boolean;
  /** VM opcodes executed (proves the program actually ran). */
  steps: number;
}

/**
 * Compile an Archon's substrate vector + beat into a real Eshkol bytecode program:
 *   sum = s0 + s1 + s2
 *   if (sum > threshold·3) commit EXPLOIT else commit EXPLORE
 * The threshold drifts with the beat phase, so the same Archon can change its mind
 * over time. Pure; returns a fresh program.
 */
export function compileArchonProgram(substrate: Float32Array, beat: number): EshProgram {
  const s0 = clamp01(substrate[0] ?? 0.5);
  const s1 = clamp01(substrate[1] ?? 0.5);
  const s2 = clamp01(substrate[2] ?? 0.5);
  const phase = (((beat % 64) + 64) % 64) / 64;
  const thr3 = (0.5 + phase * 0.2) * 3; // threshold·3, compared against the 3-term sum
  const consts = [s0, s1, s2, thr3, ESHKOL_EXPLOIT, ESHKOL_EXPLORE];
  // Hand-assembled: sum the three substrate terms, compare to thr3, branch.
  const code = [
    EshOp.PUSH,
    0, // s0
    EshOp.PUSH,
    1, // s1
    EshOp.ADD,
    EshOp.PUSH,
    2, // s2
    EshOp.ADD, // stack: [sum]
    EshOp.PUSH,
    3, // thr3
    EshOp.GT, // sum > thr3 ? 1 : 0
    EshOp.JZ,
    16, // if not greater → EXPLORE branch at addr 16
    EshOp.PUSH,
    4, // EXPLOIT
    EshOp.HALT,
    EshOp.PUSH,
    5, // (addr 16) EXPLORE
    EshOp.HALT,
  ];
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
