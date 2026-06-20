import { describe, expect, test } from 'bun:test';
import {
  TSOTCHKE_REPO_MAP,
  eshkolEvalProgram,
  eshkolProgramFingerprint,
  eshkolApplyProgramEffect,
} from '../src/sim/eshkol-vm';
import { getGodformBias } from '../src/sim/godform';

describe('eshkol-vm — corpus program evaluator', () => {
  test('TSOTCHKE_REPO_MAP lists core scientific repos and excludes LLM hot path', () => {
    expect(TSOTCHKE_REPO_MAP.eshkol).toContain('Eshkol');
    expect(TSOTCHKE_REPO_MAP.moonlab).toContain('Moonlab');
    expect(TSOTCHKE_REPO_MAP.gpt2_basic).toContain('BOUNDARY');
    expect(TSOTCHKE_REPO_MAP.llm_arbitrator).toContain('BOUNDARY');
  });

  test('fingerprint is stable and in [0,1]', () => {
    const p = getGodformBias(0).eshkolProgram;
    const a = eshkolProgramFingerprint(p);
    const b = eshkolProgramFingerprint(p);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  test('godform dialect programs modulate distinct substrates', () => {
    const oracle = eshkolEvalProgram(getGodformBias(0).eshkolProgram, 0.6);
    const stark = eshkolEvalProgram(getGodformBias(1).eshkolProgram, 0.6);
    expect(oracle.workspace).toBeGreaterThan(stark.workspace);
    expect(stark.reasoning).toBeGreaterThan(oracle.reasoning);
  });

  test('apply effect keeps substrates bounded', () => {
    const eff = eshkolEvalProgram("(define (x) (kb x 'logic))", 0.5);
    const out = eshkolApplyProgramEffect(0.5, 0.5, 0.5, eff);
    for (const v of [out.logic, out.inference, out.workspace]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
