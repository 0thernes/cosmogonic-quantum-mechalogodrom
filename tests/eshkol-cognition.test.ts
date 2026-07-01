/**
 * Golden tests: an Archon thinks in Eshkol by compiling its substrate into a real
 * bytecode program and executing it on the VM to choose explore vs exploit.
 */
import { describe, expect, test } from 'bun:test';
import {
  archonThink,
  compileArchonProgram,
  ESHKOL_EXPLOIT,
  ESHKOL_BALANCED,
  ESHKOL_EXPLORE,
} from '../src/sim/eshkol-cognition';
import { eshVMRun } from '../src/sim/eshkol-vm';

describe('eshkol-cognition: Archon executes a compiled program', () => {
  test('high substrate drive ⇒ EXPLOIT branch', () => {
    const t = archonThink(new Float32Array([0.9, 0.9, 0.9, 0.9, 0.9]), 0);
    expect(t.planBias).toBeCloseTo(ESHKOL_EXPLOIT, 6);
    expect(t.decisive).toBe(true);
    expect(t.steps).toBeGreaterThan(5); // it actually ran the program
  });

  test('mid substrate drive ⇒ BALANCED branch (the new graded middle band)', () => {
    // drive = 0.5+0.5+0.5+0.5*0.5 = 1.75, between thrLow(1.12) and thrHigh(2.2) at beat 0
    const t = archonThink(new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]), 0);
    expect(t.planBias).toBeCloseTo(ESHKOL_BALANCED, 6);
    expect(t.decisive).toBe(false); // hedged, not a strong exploit commit
  });

  test('low substrate drive ⇒ EXPLORE branch', () => {
    const t = archonThink(new Float32Array([0.1, 0.1, 0.1, 0.1, 0.1]), 0);
    expect(t.planBias).toBeCloseTo(ESHKOL_EXPLORE, 6);
    expect(t.decisive).toBe(false);
  });

  test('the whole 5-dim substrate matters: s3/s4 change the committed plan', () => {
    // same s0..s2, different s3/s4 → different drive → the interaction term is genuinely wired
    const lowInteraction = archonThink(new Float32Array([0.6, 0.6, 0.6, 0.0, 0.0]), 0);
    const highInteraction = archonThink(new Float32Array([0.6, 0.6, 0.6, 1.0, 1.0]), 0);
    expect(lowInteraction.planBias).not.toBe(highInteraction.planBias);
  });

  test('the compiled program is a real EshProgram (constants + opcodes)', () => {
    const p = compileArchonProgram(new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]), 3);
    expect(p.consts.length).toBe(10);
    expect(p.code.length).toBeGreaterThan(10);
    // executing it independently yields the same committed value
    expect(eshVMRun(p).result).toBe(
      archonThink(new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]), 3).planBias,
    );
  });

  test('deterministic: same substrate + beat ⇒ same thought', () => {
    const a = archonThink(new Float32Array([0.6, 0.4, 0.7]), 12);
    const b = archonThink(new Float32Array([0.6, 0.4, 0.7]), 12);
    expect(a.planBias).toBe(b.planBias);
    expect(a.steps).toBe(b.steps);
  });
});
