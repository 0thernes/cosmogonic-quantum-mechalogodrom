import { describe, expect, test } from 'bun:test';
import {
  AdaptiveProportionTest,
  RepetitionCountTest,
  SP80090B_APT_WINDOW_BINARY,
  SP80090B_DEFAULT_ALPHA_EXPONENT,
  adaptiveProportionCutoff,
  adaptiveProportionOverBuffer,
  binomialSurvival,
  repetitionCountCutoff,
  repetitionCountOverBuffer,
} from '../src/math/nist-sp800-90b';

describe('NIST SP 800-90B §4.4 cutoff formulas', () => {
  test('RCT cutoff C = 1 + ⌈-log₂(α)/H⌉ for the standard cases', () => {
    // α = 2^-20 ⇒ -log₂(α) = 20.
    expect(repetitionCountCutoff(1, 20)).toBe(21);
    expect(repetitionCountCutoff(1, 40)).toBe(41);
    expect(repetitionCountCutoff(0.5, 20)).toBe(41);
    expect(repetitionCountCutoff(2, 20)).toBe(11);
    expect(repetitionCountCutoff(8, 20)).toBe(4);
    // Default exponent is 2^-20.
    expect(repetitionCountCutoff(1)).toBe(
      repetitionCountCutoff(1, SP80090B_DEFAULT_ALPHA_EXPONENT),
    );
  });

  test('RCT cutoff rejects out-of-range parameters', () => {
    expect(() => repetitionCountCutoff(0, 20)).toThrow();
    expect(() => repetitionCountCutoff(1, 0)).toThrow();
    expect(() => repetitionCountCutoff(1, 61)).toThrow();
  });

  test('binomial survival is exact on small closed-form cases and monotone in k', () => {
    expect(binomialSurvival(2, 1, 0.5)).toBeCloseTo(0.75, 12); // 1 - P(0)
    expect(binomialSurvival(2, 2, 0.5)).toBeCloseTo(0.25, 12); // P(2)
    expect(binomialSurvival(4, 3, 0.5)).toBeCloseTo(5 / 16, 12); // P(3)+P(4)
    expect(binomialSurvival(10, 0, 0.5)).toBe(1);
    expect(binomialSurvival(10, 11, 0.5)).toBe(0);
    let previous = 1;
    for (let k = 1; k <= 10; k++) {
      const s = binomialSurvival(10, k, 0.5);
      expect(s).toBeLessThanOrEqual(previous);
      previous = s;
    }
  });

  test('APT cutoff is the defining binomial critical value: survival(C) ≤ α < survival(C-1)', () => {
    const W = SP80090B_APT_WINDOW_BINARY;
    const H = 1;
    const alpha = 2 ** -SP80090B_DEFAULT_ALPHA_EXPONENT;
    const p = 2 ** -H;
    const C = adaptiveProportionCutoff(W, H, SP80090B_DEFAULT_ALPHA_EXPONENT);
    // For a balanced binary source (p=0.5, mean 512, sd 16) at α≈9.5e-7 this lands near ~589.
    expect(C).toBeGreaterThan(560);
    expect(C).toBeLessThan(640);
    expect(binomialSurvival(W, C, p)).toBeLessThanOrEqual(alpha);
    expect(binomialSurvival(W, C - 1, p)).toBeGreaterThan(alpha);
  });
});

describe('NIST SP 800-90B §4.4.1 Repetition Count Test (streaming)', () => {
  test('alarms exactly when a value recurs C times in a row, and a change resets the run', () => {
    const rct = new RepetitionCountTest(4);
    // Three identical samples: run reaches 3 (< 4), no alarm.
    expect(rct.update(7)).toBe(false);
    expect(rct.update(7)).toBe(false);
    expect(rct.update(7)).toBe(false);
    expect(rct.currentRun).toBe(3);
    // Fourth identical sample: run hits the cutoff, alarm fires.
    expect(rct.update(7)).toBe(true);
    // A different value resets the run to 1.
    expect(rct.update(2)).toBe(false);
    expect(rct.currentRun).toBe(1);
    expect(rct.alarmCount).toBe(1);
    expect(rct.sampleCount).toBe(5);
  });

  test('C-1 repeats never alarm', () => {
    const rct = new RepetitionCountTest(21); // the default binary-source cutoff
    let alarms = 0;
    for (let i = 0; i < 20; i++) if (rct.update(0)) alarms++;
    expect(alarms).toBe(0);
    expect(rct.update(0)).toBe(true); // 21st identical sample
  });

  test('snapshot/restore continues the exact run state', () => {
    const a = new RepetitionCountTest(6);
    a.update(1);
    a.update(1);
    a.update(1);
    const b = new RepetitionCountTest(6);
    b.restore(a.snapshot());
    // Both need three more identical samples to reach the cutoff of 6.
    expect(a.update(1)).toBe(false);
    expect(b.update(1)).toBe(false);
    expect(a.update(1)).toBe(false);
    expect(b.update(1)).toBe(false);
    expect(a.update(1)).toBe(true);
    expect(b.update(1)).toBe(true);
  });
});

describe('NIST SP 800-90B §4.4.2 Adaptive Proportion Test (streaming)', () => {
  test('alarms when the window reference value reaches the cutoff, resets at the window edge', () => {
    const apt = new AdaptiveProportionTest(8, 6);
    // First sample fixes the reference value; recurrences accumulate.
    for (let i = 0; i < 5; i++) expect(apt.update(1)).toBe(false); // counts 1..5
    expect(apt.currentCount).toBe(5);
    expect(apt.update(1)).toBe(true); // 6th occurrence in the window
    // Finish the window (positions 7,8) then a fresh window begins with a new reference.
    apt.update(1);
    apt.update(1);
    expect(apt.windowCount).toBe(1);
    expect(apt.update(3)).toBe(false); // new window reference, count 1
    expect(apt.currentCount).toBe(1);
  });

  test('a balanced window under the cutoff never alarms', () => {
    const apt = new AdaptiveProportionTest(8, 6);
    let alarms = 0;
    // 4 zeros / 4 ones ⇒ reference (first sample=0) recurs 4 times < 6.
    for (const bit of [0, 1, 0, 1, 0, 1, 0, 1]) if (apt.update(bit)) alarms++;
    expect(alarms).toBe(0);
    expect(apt.windowCount).toBe(1);
  });
});

describe('NIST SP 800-90B windowed (bounded-buffer) application', () => {
  test('RCT over a buffer reports the longest run and the cutoff verdict', () => {
    const stuck = new Uint8Array(30); // all zeros ⇒ run of 30
    const v = repetitionCountOverBuffer(stuck, 21);
    expect(v.longestRun).toBe(30);
    expect(v.alarm).toBe(true);

    const alternating = Uint8Array.from({ length: 30 }, (_, i) => i % 2);
    const w = repetitionCountOverBuffer(alternating, 21);
    expect(w.longestRun).toBe(1);
    expect(w.alarm).toBe(false);
  });

  test('APT over a buffer needs a full window and flags a biased one', () => {
    const short = new Uint8Array(7);
    expect(adaptiveProportionOverBuffer(short, 8, 6).insufficientData).toBe(true);

    const stuck = new Uint8Array(16); // two all-zero windows
    const s = adaptiveProportionOverBuffer(stuck, 8, 6);
    expect(s.insufficientData).toBe(false);
    expect(s.windowsScanned).toBe(2);
    expect(s.worstCount).toBe(8);
    expect(s.alarm).toBe(true);

    const balanced = Uint8Array.from({ length: 16 }, (_, i) => i % 2);
    const b = adaptiveProportionOverBuffer(balanced, 8, 6);
    expect(b.alarm).toBe(false);
    expect(b.worstCount).toBe(4);
  });
});
