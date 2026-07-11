import { describe, expect, test } from 'bun:test';
import {
  cohenDz,
  familyMagnitudePass,
  holmAdjustedP,
  mean,
  ordinaryActionScore,
  pairedBootstrapMeanCi,
  pairedMedian,
  pairedSignFlipP,
  petriFavoredAdFitnessShare,
  predictionQuality,
  predictorAggregateRelativeErrorReduction,
  predictorRelativeErrorReduction,
  summarizeV4FamilyContrasts,
  titanCorrectMoveRate,
  v4CalibrateOrdinarySurrogate,
  v4CalibrateTitanCooperationRate,
  v4CyclicSemanticPermutation,
  v4DerivedSeed,
  V4_FAMILY_FIXTURES,
  v4OrdinarySegmentSignal,
  v4OrdinarySurrogateStep,
  v4PredictorInputAt,
  v4PredictorTrainingTargetForInput,
  v4PredictorTrueTargetForInput,
  v4ResamplingSeed,
  v4SemanticSignal,
  v4TitanSurrogateMove,
  weakestV4ContrastIndex,
} from '../scripts/organism-intelligence-v4-protocol';

describe('V4 executable protocol primitives', () => {
  test('seals the ordinary schedule, semantic construction, cyclic named-field rotation, and score', () => {
    const fixture = V4_FAMILY_FIXTURES['ordinary-organisms'];
    expect(fixture.segments.reduce((sum, segment) => sum + segment.steps, 0)).toBe(480);
    expect(
      fixture.segments.reduce((sum, segment) => sum + (segment.score ? segment.steps : 0), 0),
    ).toBe(240);
    expect(
      fixture.segments.map(({ goalX, resourceCue, score }) => [goalX, resourceCue, score]),
    ).toEqual([
      [1, 1, false],
      [1, 0, true],
      [-1, 1, false],
      [-1, 0, true],
      [1, 1, false],
      [1, 0, true],
      [-1, 1, false],
      [-1, 0, true],
    ]);

    expect(v4CyclicSemanticPermutation([1, 2, 3, 4])).toEqual([4, 1, 2, 3]);
    const direct = v4OrdinarySegmentSignal(1);
    expect([
      direct.resourcePressure,
      direct.threatResponse,
      direct.exploration,
      direct.socialDrive,
    ]).toEqual([1, 0, 0, 0]);
    expect([...direct.channels]).toEqual([1, 0, 0, 0]);
    const cyclic = v4OrdinarySegmentSignal(1, true);
    expect([
      cyclic.resourcePressure,
      cyclic.threatResponse,
      cyclic.exploration,
      cyclic.socialDrive,
    ]).toEqual([0, 1, 0, 0]);
    expect([...cyclic.channels]).toEqual([0, 1, 0, 0]);
    expect(v4SemanticSignal([Number.NaN, 2, -1, 0.25]).resourcePressure).toBe(0);

    expect(ordinaryActionScore(-0.12, 0, 1, 0)).toBe(0);
    expect(ordinaryActionScore(0, 0, 1, 0)).toBe(0.5);
    expect(ordinaryActionScore(0.12, 0, 1, 0)).toBe(1);
    expect(() => ordinaryActionScore(0, 0, 0, 0)).toThrow();
  });

  test('seals predictor initialization, delayed target schedule, permutation, and quality score', () => {
    const fixture = V4_FAMILY_FIXTURES['simple-mnist-ecology-predictor'];
    expect(4 * 4 + 4 + 4 * 1 + 1).toBe(fixture.trainableParameters);
    expect(fixture.scoredCadences).toEqual({ first: 145, last: 239, inclusive: true });
    expect(fixture.scoredCadences.last - fixture.scoredCadences.first + 1).toBe(95);
    expect(v4PredictorInputAt(0)).toEqual([0.1, 0.15, 0.2, 0.1]);
    expect(v4PredictorInputAt(1)).toEqual([0.9, 0.85, 0.8, 0.9]);
    expect([0, 1, 118, 119, 120, 121].map((index) => v4PredictorTrueTargetForInput(index))).toEqual(
      [0, 1, 0, 1, 1, 0],
    );
    expect(new Set(Array.from({ length: 240 }, (_, index) => (73 * index + 19) % 240)).size).toBe(
      240,
    );
    expect(v4PredictorTrainingTargetForInput(0, false)).toBe(v4PredictorTrueTargetForInput(0));
    expect(v4PredictorTrainingTargetForInput(0, true)).not.toBe(v4PredictorTrueTargetForInput(0));
    expect(predictionQuality([0, 1], [0, 1])).toBe(1);
    expect(predictionQuality([1, 0], [0, 1])).toBe(0);
    expect(v4DerivedSeed(123, 'predictorConstructor')).toBe(
      (123 ^ fixture.predictorConstructorSeedXor) >>> 0,
    );
  });

  test('seals Petri and Titan fixtures, normalized outcomes, and pooled policy surrogate', () => {
    const petri = V4_FAMILY_FIXTURES['petri-digital-biologics'];
    expect(petri.regimes).toEqual([
      { firstBeat: 0, lastBeat: 119, signal: [1, 0, 0, 0], favoredId: 61441 },
      { firstBeat: 120, lastBeat: 239, signal: [0, 0, 1, 0], favoredId: 61442 },
    ]);
    expect(petri.scoringWindows).toEqual([
      [80, 119],
      [200, 239],
    ]);
    expect(petri.resourceSpecialist.alive).toBe(true);
    expect(petri.explorationSpecialist.alive).toBe(true);
    expect(petriFavoredAdFitnessShare(3, 1)).toBe(0.75);

    const titan = V4_FAMILY_FIXTURES.titans;
    expect(titan.regimes.length * titan.roundsPerRegime * 2).toBe(60);
    expect(titan.policySurrogate.rate).toContain('no regime label enters the rate');
    expect(titanCorrectMoveRate(45)).toBe(0.75);
    const moves = Array.from({ length: 960 }, (_, index) => (index % 4 === 0 ? 0 : 1)) as (0 | 1)[];
    expect(v4CalibrateTitanCooperationRate(moves)).toBe(0.25);
    expect(v4TitanSurrogateMove(0.25, () => 0.249)).toBe(0);
    expect(v4TitanSurrogateMove(0.25, () => 0.25)).toBe(1);
  });

  test('constructs the ordinary matched surrogate with fixed calibration and three draws per step', () => {
    const actions = Array.from({ length: 16 * 480 }, (_, index) =>
      index % 2 === 0 ? ([0, 0] as const) : ([0.06, 0] as const),
    );
    const calibration = v4CalibrateOrdinarySurrogate(actions);
    expect(calibration.actionFrequency).toBe(0.5);
    expect(calibration.sortedNonZeroMagnitudes).toHaveLength(16 * 240);
    expect(calibration.sortedNonZeroMagnitudes[0]).toBe(0.06);

    let draws = 0;
    const zero = v4OrdinarySurrogateStep(calibration, () => {
      draws++;
      return 0.75;
    });
    expect(zero).toEqual([0, 0]);
    expect(draws).toBe(3);
    const actionDraws = [0.25, 0.5, 0];
    const action = v4OrdinarySurrogateStep(calibration, () => actionDraws.shift() ?? 0);
    expect(Math.hypot(...action)).toBeCloseTo(0.06, 12);
  });

  test('freezes finite paired statistics, resampling streams, Holm correction, and JSON-safe effects', () => {
    const deltas = [0.125, 0.0625, 0.03125, 0.09375, 0.109375, 0.046875, 0.078125, 0.0625];
    expect(mean(deltas)).toBe(0.076171875);
    expect(pairedMedian(deltas)).toBe(0.0703125);
    expect(pairedBootstrapMeanCi(deltas, 0x51a7_f00d)).toEqual([0.056640625, 0.095703125]);
    expect(pairedSignFlipP(deltas, 0x51a7_f00d)).toBe(0.004199790010499475);
    expect(holmAdjustedP([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06]);
    expect(cohenDz([1, 2, 3])).toEqual({ defined: true, value: 2, reason: null });
    expect(cohenDz([1, 1, 1])).toEqual({
      defined: false,
      value: null,
      reason: 'zero-variance',
    });
    expect(JSON.stringify(cohenDz([1, 1, 1]))).not.toContain('Infinity');
    expect(v4ResamplingSeed('ordinary-organisms', 0, 'bootstrap')).toBe(
      v4ResamplingSeed('ordinary-organisms', 0, 'bootstrap'),
    );
    expect(v4ResamplingSeed('ordinary-organisms', 0, 'bootstrap')).not.toBe(
      v4ResamplingSeed('ordinary-organisms', 0, 'sign-flip'),
    );
    expect(() => pairedBootstrapMeanCi([Number.NaN], 1)).toThrow();
    expect(() => pairedBootstrapMeanCi([1], 1, 1000, 1)).toThrow();
    expect(() => pairedSignFlipP([Number.POSITIVE_INFINITY], 1)).toThrow();
  });

  test('applies exact inference, magnitude, predictor denominator, and weakest-contrast boundaries', () => {
    const magnitudeBoundary = [
      ...Array.from({ length: 32 }, () => -0.2),
      ...Array.from({ length: 32 }, () => 0.3),
    ];
    expect(familyMagnitudePass(magnitudeBoundary)).toBe(true);
    expect(familyMagnitudePass([-0.2000001, ...magnitudeBoundary.slice(1)])).toBe(false);
    expect(() => familyMagnitudePass([-0.2, 0.3])).toThrow();
    expect(predictorRelativeErrorReduction(0.19, 0.2)).toEqual({
      defined: true,
      value: 0.050000000000000044,
    });
    expect(predictorRelativeErrorReduction(0, 1e-12)).toEqual({ defined: false, value: 0 });
    expect(
      predictorAggregateRelativeErrorReduction(
        Array.from({ length: 64 }, () => 0.19),
        Array.from({ length: 64 }, () => 0.2),
      ),
    ).toEqual({ defined: true, value: 0.04999999999999927 });
    expect(
      weakestV4ContrastIndex([
        [0.2, 0.2],
        [0.1, 0.1],
        [0.1, 0.1],
      ]),
    ).toBe(1);

    const positive = Array.from({ length: 64 }, () => 0.1);
    const summaries = summarizeV4FamilyContrasts('titans', [positive, positive, positive]);
    expect(summaries).toHaveLength(3);
    expect(summaries.every((summary) => summary.inferencePass)).toBe(true);
    expect(summaries.every((summary) => summary.bootstrap95[0] > 0)).toBe(true);
    expect(summaries.every((summary) => summary.holmSignFlipP < 0.05)).toBe(true);
    expect(() =>
      summarizeV4FamilyContrasts('titans', [positive.slice(0, 10), positive, positive]),
    ).toThrow();
    expect(() =>
      summarizeV4FamilyContrasts('titans', [[2, ...positive.slice(1)], positive, positive]),
    ).toThrow();
  });
});
