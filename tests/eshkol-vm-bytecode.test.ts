/**
 * Golden tests for the REAL Eshkol bytecode VM — proves it executes opcodes with
 * arithmetic + control flow, not just hashes a source string.
 */
import { describe, expect, test } from 'bun:test';
import { EshOp, eshVMRun, type EshProgram } from '../src/sim/eshkol-vm';

describe('eshkol-vm: real bytecode execution', () => {
  test('arithmetic: (3 * 4) + 5 = 17', () => {
    const prog: EshProgram = {
      consts: [3, 4, 5],
      code: [EshOp.PUSH, 0, EshOp.PUSH, 1, EshOp.MUL, EshOp.PUSH, 2, EshOp.ADD, EshOp.HALT],
    };
    const r = eshVMRun(prog);
    expect(r.result).toBe(17);
    expect(r.halted).toBe(true);
  });

  test('control flow: JZ takes the branch when top is 0', () => {
    // PUSH consts[0]; JZ 7; PUSH 99; HALT; (7:) PUSH 42; HALT
    const code = [EshOp.PUSH, 0, EshOp.JZ, 7, EshOp.PUSH, 2, EshOp.HALT, EshOp.PUSH, 1, EshOp.HALT];
    expect(eshVMRun({ consts: [0, 42, 99], code }).result).toBe(42); // 0 → jump → 42
    expect(eshVMRun({ consts: [1, 42, 99], code }).result).toBe(99); // 1 → fall through → 99
  });

  test('comparison opcodes produce booleans', () => {
    expect(
      eshVMRun({ consts: [2, 5], code: [EshOp.PUSH, 0, EshOp.PUSH, 1, EshOp.LT, EshOp.HALT] })
        .result,
    ).toBe(1); // 2 < 5
    expect(
      eshVMRun({ consts: [2, 5], code: [EshOp.PUSH, 0, EshOp.PUSH, 1, EshOp.GT, EshOp.HALT] })
        .result,
    ).toBe(0); // 2 > 5 false
  });

  test('loop via JMP/JZ: decrement i=3 to 0 (real backward jump)', () => {
    // i=3; while (i != 0) i -= 1;  → halts with i == 0
    // [0]PUSH consts[0]=3  [2]DUP  [3]JZ 10  [5]PUSH consts[1]=1  [7]SUB  [8]JMP 2  [10]HALT
    const consts = [3, 1];
    const code = [
      EshOp.PUSH,
      0, // i = 3
      EshOp.DUP, // (loop@2)
      EshOp.JZ,
      10, // if i==0 → done
      EshOp.PUSH,
      1, // push 1
      EshOp.SUB, // i -= 1
      EshOp.JMP,
      2, // loop
      EshOp.HALT, // (done@10) result = i = 0
    ];
    const r = eshVMRun({ consts, code }, 10000);
    expect(r.result).toBe(0);
    expect(r.halted).toBe(true);
    expect(r.steps).toBeGreaterThan(3); // it actually looped
  });

  test('step budget guarantees termination on an infinite loop', () => {
    // JMP 0 forever → bounded by maxSteps
    const r = eshVMRun({ consts: [], code: [EshOp.JMP, 0] }, 100);
    expect(r.steps).toBeLessThanOrEqual(100);
  });
});
