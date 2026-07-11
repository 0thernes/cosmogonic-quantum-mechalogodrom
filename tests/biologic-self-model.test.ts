/**
 * GATE-SELFMODEL — proves the digital biologic's online MLP self-model ({@link ../src/sim/ad-mlp}, wired
 * into stepBiologic's `learn=true` path) is a REAL adaptive faculty, not decorative: each biologic trains a
 * one-hidden-layer network by exact Eshkol-AD backprop to predict the `consciousness` it reaches from the
 * substrate it started the beat with, and its prediction error FALLS over life. Falsifiable / defensible:
 *   - live: selfModelErr collapses across a run (the brain learns to anticipate itself);
 *   - ABLATION: a frozen brain (never trained) predicts the SAME stream far worse — the AD step is load-bearing;
 *   - deterministic: identical birth + identical drive ⇒ identical selfModelErr;
 *   - golden-safe: `learn=false` never touches the brain or selfModelErr (byte-identical to the prior sim).
 */
import { describe, expect, test } from 'bun:test';
import { birthBiologic, stepBiologic } from '../src/sim/digital-biologics';
import { createMlp, mlpPredict } from '../src/sim/ad-mlp';
import { mulberry32 } from '../src/math/rng';

describe('GATE-SELFMODEL: a digital biologic learns to predict its own consciousness online', () => {
  test('selfModelErr collapses over a live learn=true run (the self-model adapts)', () => {
    const b = birthBiologic(2, 17);
    let early = 0;
    for (let t = 0; t < 400; t++) {
      stepBiologic(b, 0.6, true);
      if (t === 49) early = b.selfModelErr ?? 0; // error after a short warm-up
    }
    const late = b.selfModelErr ?? 0;
    expect(early).toBeGreaterThan(0); // it was making real (nonzero) errors early
    expect(late).toBeLessThan(0.01); // and learned to anticipate itself precisely
    expect(late).toBeLessThan(early * 0.3); // a large, unambiguous reduction — genuine learning
  });

  test('ABLATION: a frozen brain predicts the same stream far worse — the AD backprop is load-bearing', () => {
    const b = birthBiologic(2, 17);
    // A frozen brain with byte-identical init to b.brain (same id-derived seed) — never trained.
    const frozen = createMlp(4, 5, 1, mulberry32(((17 * 31 + 2) ^ 0x9e3779b9) >>> 0));
    let frozenErr = 0;
    let trainedErr = 0;
    let n = 0;
    for (let t = 0; t < 400; t++) {
      const pre: [number, number, number, number] = [
        b.spinOrder,
        b.qgtCurvature,
        b.quakeAliveness,
        b.adFitness * 0.5,
      ];
      stepBiologic(b, 0.6, true); // trains b.brain, updates b.consciousness
      if (t >= 200) {
        frozenErr += Math.abs((mlpPredict(frozen, pre)[0] ?? 0) - b.consciousness);
        trainedErr += Math.abs((mlpPredict(b.brain!, pre)[0] ?? 0) - b.consciousness);
        n++;
      }
    }
    expect(trainedErr / n).toBeLessThan(0.05); // the trained self-model is accurate
    expect(frozenErr / n).toBeGreaterThan(0.3); // the frozen one is not
    expect(frozenErr).toBeGreaterThan(trainedErr * 5); // a decisive load-bearing gap
  });

  test('deterministic: identical birth + drive ⇒ identical selfModelErr', () => {
    const run = (): number => {
      const b = birthBiologic(2, 17);
      for (let t = 0; t < 120; t++) stepBiologic(b, 0.6, true);
      return b.selfModelErr ?? -1;
    };
    expect(run()).toBe(run());
  });

  test('golden-safe: learn=false never touches the brain or selfModelErr', () => {
    const b = birthBiologic(2, 17);
    const w2Before = Array.from(b.brain!.w2);
    for (let t = 0; t < 50; t++) stepBiologic(b, 0.6); // learn defaults false
    expect(b.selfModelErr).toBeUndefined(); // never tracked
    expect(Array.from(b.brain!.w2)).toEqual(w2Before); // brain weights unchanged — byte-identical path
  });
});
