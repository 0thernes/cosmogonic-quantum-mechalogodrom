import { describe, expect, test } from 'bun:test';
import {
  TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
  TsotchkeEcologyPredictorV2,
  tsotchkeEcologyPredictorV2ParameterCount,
  type TsotchkeEcologyPredictorV2Input,
  type TsotchkeEcologyPredictorV2Snapshot,
  type TsotchkeEcologyPredictorV2Tier,
} from '../src/sim/tsotchke-ecology-predictor-v2';

const TIERS: readonly TsotchkeEcologyPredictorV2Tier[] = [4, 8, 16];

const CURRENT: TsotchkeEcologyPredictorV2Input = {
  biomassDepletion: 0.27,
  metabolicDepletion: 0.43,
  crowding: 0.61,
  chaos: 0.18,
  thermalStress: 0.76,
};

const inputAt = (step: number): TsotchkeEcologyPredictorV2Input => ({
  biomassDepletion: (((step * 17) % 89) + 1) / 90,
  metabolicDepletion: (((step * 29) % 83) + 1) / 84,
  crowding: (((step * 31) % 79) + 1) / 80,
  chaos: (((step * 37) % 73) + 1) / 74,
  thermalStress: (((step * 41) % 67) + 1) / 68,
});

const outcomeAt = (step: number): number => ((step * 43 + 11) % 101) / 100;

const flatParameters = (snapshot: TsotchkeEcologyPredictorV2Snapshot): number[] => [
  ...snapshot.parameters.w1,
  ...snapshot.parameters.b1,
  ...snapshot.parameters.wSkip,
  ...snapshot.parameters.w2,
  snapshot.parameters.b2,
];

const flatOptimizer = (snapshot: TsotchkeEcologyPredictorV2Snapshot): number[] => [
  ...snapshot.optimizer.rmsW1,
  ...snapshot.optimizer.rmsB1,
  ...snapshot.optimizer.rmsWSkip,
  ...snapshot.optimizer.rmsW2,
  snapshot.optimizer.rmsB2,
];

const runResolvedSequence = (
  predictor: TsotchkeEcologyPredictorV2,
  length: number,
  offset = 0,
): unknown[] => {
  const trace: unknown[] = [];
  for (let step = 0; step < length; step++) {
    const index = step + offset;
    const forecast = predictor.forecast(inputAt(index));
    trace.push(forecast, predictor.observe({ token: forecast.token, outcome: outcomeAt(index) }));
  }
  return trace;
};

describe('Tsotchke ecology predictor V2', () => {
  test('constructor rejects seed coercion and aliasing outside nonzero uint32', () => {
    for (const seed of [0, -1, 1.5, 0x1_0000_0000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new TsotchkeEcologyPredictorV2(seed)).toThrow(/nonzero uint32/);
    }
    expect(new TsotchkeEcologyPredictorV2(1).snapshot().seed).toBe(1);
    expect(new TsotchkeEcologyPredictorV2(0xffff_ffff).snapshot().seed).toBe(0xffff_ffff);
    const xorToZero = new TsotchkeEcologyPredictorV2(0x72c4_9a35).forecast(CURRENT);
    const xorToOne = new TsotchkeEcologyPredictorV2(0x72c4_9a34).forecast(CURRENT);
    expect(xorToZero.prediction).not.toBe(xorToOne.prediction);
  });

  test('4/8/16 tiers have exact audited counts and every trainable scalar receives gradient', () => {
    expect(tsotchkeEcologyPredictorV2ParameterCount(4)).toBe(54);
    expect(tsotchkeEcologyPredictorV2ParameterCount(8)).toBe(98);
    expect(tsotchkeEcologyPredictorV2ParameterCount(16)).toBe(186);

    for (const tier of TIERS) {
      const predictor = new TsotchkeEcologyPredictorV2(0x47a1 + tier, { tier });
      const before = predictor.snapshot();
      runResolvedSequence(predictor, 180);
      const after = predictor.snapshot();
      const initialParameters = flatParameters(before);
      const learnedParameters = flatParameters(after);
      const optimizer = flatOptimizer(after);

      expect(predictor.trainableParameterCount).toBe(11 * tier + 10);
      expect(initialParameters).toHaveLength(11 * tier + 10);
      expect(learnedParameters).toHaveLength(11 * tier + 10);
      expect(learnedParameters.every((value, index) => value !== initialParameters[index])).toBe(
        true,
      );
      expect(optimizer).toHaveLength(11 * tier + 10);
      expect(optimizer.every((value) => value > 0)).toBe(true);
    }
  });

  test('same seed, tier, and ordered evidence produce an exact deterministic trace', () => {
    const a = new TsotchkeEcologyPredictorV2(0x5eed, { tier: 8 });
    const b = new TsotchkeEcologyPredictorV2(0x5eed, { tier: 8 });

    expect(runResolvedSequence(a, 240)).toEqual(runResolvedSequence(b, 240));
    expect(a.snapshot()).toEqual(b.snapshot());

    const differentSeed = new TsotchkeEcologyPredictorV2(0x5eee, { tier: 8 });
    expect(differentSeed.forecast(CURRENT).prediction).not.toBe(
      new TsotchkeEcologyPredictorV2(0x5eed, { tier: 8 }).forecast(CURRENT).prediction,
    );
  });

  test('token ownership rejects absent, unresolved, mismatched, duplicate, and discarded evidence', () => {
    const predictor = new TsotchkeEcologyPredictorV2(99);
    expect(() => predictor.observe({ token: 1, outcome: 0.5 })).toThrow(/no pending/);
    expect(() =>
      predictor.observe({ token: undefined as unknown as number, outcome: 0.5 }),
    ).toThrow(/absent or invalid/);

    const forecast = predictor.forecast(CURRENT);
    expect(() => predictor.forecast(CURRENT)).toThrow(/unresolved/);
    const pending = predictor.snapshot();
    expect(() => predictor.observe({ token: forecast.token + 1, outcome: 0.5 })).toThrow(
      /does not match/,
    );
    expect(predictor.snapshot()).toEqual(pending);
    expect(() => predictor.observe({ token: forecast.token, outcome: Number.NaN })).toThrow(
      /finite and in \[0,1\]/,
    );
    expect(() => predictor.observe({ token: forecast.token, outcome: 1.01 })).toThrow(
      /finite and in \[0,1\]/,
    );
    expect(() =>
      predictor.observe({ token: forecast.token, outcome: 0.5, gradientTarget: Number.NaN }),
    ).toThrow(/gradient target must be finite/);
    expect(predictor.snapshot()).toEqual(pending);

    predictor.observe({ token: forecast.token, outcome: 0.5 });
    expect(() => predictor.observe({ token: forecast.token, outcome: 0.5 })).toThrow(
      /stale or already resolved/,
    );

    const discarded = predictor.forecast(CURRENT);
    expect(predictor.discardPending()).toBe(true);
    expect(predictor.discardPending()).toBe(false);
    expect(() => predictor.observe({ token: discarded.token, outcome: 0.5 })).toThrow(
      /stale or already resolved/,
    );
  });

  test('frozen controls score and advance context/drift without changing parameters or RMSProp', () => {
    const predictor = new TsotchkeEcologyPredictorV2(0xf20e, {
      tier: 16,
      adaptive: false,
    });
    const before = predictor.snapshot();
    const forecast = predictor.forecast(CURRENT);
    const observation = predictor.observe({ token: forecast.token, outcome: 0.87 });
    const after = predictor.snapshot();

    expect(observation.prediction).toBe(forecast.prediction);
    expect(observation.softTargetSquaredError).toBe((0.87 - forecast.prediction) ** 2);
    expect(observation.gradientTarget).toBe(0.87);
    expect(observation.updated).toBe(false);
    expect(observation.updateCount).toBe(0);
    expect(after.parameters).toEqual(before.parameters);
    expect(after.optimizer).toEqual(before.optimizer);
    expect(after.context.valid).toBe(true);
    expect(after.context.lastRevealedOutcome).toBe(0.87);
    expect(after.context.lastSignedResidual).toBe(0.87 - forecast.prediction);
    expect(after.context.driftScore).toBeGreaterThan(0);
  });

  test('revealed outcomes causally alter temporal features and residual-EWMA drift', () => {
    const low = new TsotchkeEcologyPredictorV2(0xc451, { adaptive: false });
    const high = new TsotchkeEcologyPredictorV2(0xc451, { adaptive: false });
    const lowFirst = low.forecast(CURRENT);
    const highFirst = high.forecast(CURRENT);
    expect(lowFirst).toEqual(highFirst);

    const lowObserved = low.observe({ token: lowFirst.token, outcome: 0 });
    const highObserved = high.observe({ token: highFirst.token, outcome: 1 });
    expect(lowObserved.driftScore).not.toBe(highObserved.driftScore);

    const lowNext = low.forecast(CURRENT);
    const highNext = high.forecast(CURRENT);
    const lowPending = low.snapshot().pending.input;
    const highPending = high.snapshot().pending.input;
    expect(lowPending.slice(5)).toEqual([0, -lowFirst.prediction, 0, 1]);
    expect(highPending.slice(5)).toEqual([1, 1 - highFirst.prediction, 0, 1]);
    expect(lowNext.prediction).not.toBe(highNext.prediction);

    low.observe({ token: lowNext.token, outcome: 0.75 });
    high.observe({ token: highNext.token, outcome: 0.25 });
    expect(low.snapshot().context.lastOutcomeDelta).toBe(0.75);
    expect(high.snapshot().context.lastOutcomeDelta).toBe(-0.75);

    const pendingBeforeReset = low.forecast(CURRENT);
    expect(pendingBeforeReset.token).toBeGreaterThan(0);
    expect(low.discardPending(true)).toBe(true);
    expect(low.snapshot().context).toEqual({
      valid: false,
      lastRevealedOutcome: 0,
      lastSignedResidual: 0,
      lastOutcomeDelta: 0,
      driftScore: 0,
    });
    expect(low.forecast(CURRENT).prediction).toBe(
      new TsotchkeEcologyPredictorV2(0xc451, { adaptive: false }).forecast(CURRENT).prediction,
    );
  });

  test('gradient-only targets change weights without directly changing revealed context or drift', () => {
    const direct = new TsotchkeEcologyPredictorV2(0x6c61_626c, { tier: 8 });
    const reservoirLag = new TsotchkeEcologyPredictorV2(0x6c61_626c, { tier: 8 });
    const directForecast = direct.forecast(CURRENT);
    const lagForecast = reservoirLag.forecast(CURRENT);
    expect(lagForecast).toEqual(directForecast);

    const directObservation = direct.observe({ token: directForecast.token, outcome: 0.82 });
    const lagObservation = reservoirLag.observe({
      token: lagForecast.token,
      outcome: 0.82,
      gradientTarget: 0.14,
    });
    expect(lagObservation.outcome).toBe(directObservation.outcome);
    expect(lagObservation.prediction).toBe(directObservation.prediction);
    expect(lagObservation.signedResidual).toBe(directObservation.signedResidual);
    expect(lagObservation.driftScore).toBe(directObservation.driftScore);
    expect(lagObservation.gradientTarget).toBe(0.14);
    expect(reservoirLag.snapshot().context).toEqual(direct.snapshot().context);
    expect(reservoirLag.snapshot().parameters).not.toEqual(direct.snapshot().parameters);

    direct.forecast(CURRENT);
    reservoirLag.forecast(CURRENT);
    expect(reservoirLag.snapshot().pending.input.slice(5)).toEqual(
      direct.snapshot().pending.input.slice(5),
    );
  });

  test('temporal-input ablation zeros model inputs while revealed context and drift still advance', () => {
    const visible = new TsotchkeEcologyPredictorV2(0xab1a_7100, {
      tier: 8,
      adaptive: false,
    });
    const ablated = new TsotchkeEcologyPredictorV2(0xab1a_7100, {
      tier: 8,
      adaptive: false,
      temporalInputs: false,
    });
    expect(visible.forecast(CURRENT)).toEqual(ablated.forecast(CURRENT));
    visible.observe({ token: 1, outcome: 0.77 });
    ablated.observe({ token: 1, outcome: 0.77 });
    expect(ablated.snapshot().context).toEqual(visible.snapshot().context);
    expect(ablated.snapshot().context.valid).toBe(true);
    expect(ablated.currentDriftScore).toBeGreaterThan(0);
    expect(ablated.usesTemporalInputs).toBe(false);

    visible.forecast(CURRENT);
    ablated.forecast(CURRENT);
    expect(visible.snapshot().pending.input.slice(5)).not.toEqual([0, 0, 0, 0]);
    expect(ablated.snapshot().pending.input.slice(5)).toEqual([0, 0, 0, 0]);
    expect(TsotchkeEcologyPredictorV2.fromSnapshot(ablated.snapshot()).snapshot()).toEqual(
      ablated.snapshot(),
    );
  });

  test('snapshots continue exactly both before outcome resolution and during elevated drift', () => {
    const source = new TsotchkeEcologyPredictorV2(0xa11ce, {
      tier: 8,
      slowLearningRate: 0.003,
      fastLearningRate: 0.06,
      driftAlpha: 0.12,
    });
    runResolvedSequence(source, 75);

    const pendingForecast = source.forecast(inputAt(75));
    const pendingSnapshot = source.snapshot();
    const pendingRestored = TsotchkeEcologyPredictorV2.fromSnapshot(pendingSnapshot);
    const sourceResolution = source.observe({
      token: pendingForecast.token,
      outcome: outcomeAt(75),
    });
    const restoredResolution = pendingRestored.observe({
      token: pendingForecast.token,
      outcome: outcomeAt(75),
    });
    expect(restoredResolution).toEqual(sourceResolution);
    expect(pendingRestored.snapshot()).toEqual(source.snapshot());

    expect(runResolvedSequence(pendingRestored, 120, 76)).toEqual(
      runResolvedSequence(source, 120, 76),
    );
    expect(pendingRestored.currentDriftScore).toBeGreaterThan(0);

    const driftingRestored = TsotchkeEcologyPredictorV2.fromSnapshot(source.snapshot());
    expect(runResolvedSequence(driftingRestored, 80, 196)).toEqual(
      runResolvedSequence(source, 80, 196),
    );
    expect(driftingRestored.snapshot()).toEqual(source.snapshot());
  });

  test('restore rejects malformed state and tier/control crossover without partial mutation', () => {
    const predictor = new TsotchkeEcologyPredictorV2(0x5a4e, { tier: 4 });
    runResolvedSequence(predictor, 20);
    const valid = predictor.snapshot();
    const before = predictor.snapshot();

    const malformed = structuredClone(valid);
    malformed.parameters.w1[0] = Number.NaN;
    expect(() => predictor.restore(malformed)).toThrow(/w1/);
    expect(predictor.snapshot()).toEqual(before);

    const forgedOptimizer = structuredClone(valid);
    forgedOptimizer.optimizer.rmsB2 = -1;
    expect(() => predictor.restore(forgedOptimizer)).toThrow(/RMS b2/);
    expect(predictor.snapshot()).toEqual(before);

    const pending = predictor.forecast(CURRENT);
    const forgedPending = predictor.snapshot();
    forgedPending.pending.prediction = pending.prediction > 0.5 ? 0 : 1;
    const beforePendingRestore = predictor.snapshot();
    expect(() => predictor.restore(forgedPending)).toThrow(/pending prediction/);
    expect(predictor.snapshot()).toEqual(beforePendingRestore);
    predictor.discardPending();

    expect(() => new TsotchkeEcologyPredictorV2(0x5a4e, { tier: 8 }).restore(valid)).toThrow(
      /tier\/control/,
    );
    expect(() =>
      new TsotchkeEcologyPredictorV2(0x5a4e, { tier: 4, adaptive: false }).restore(valid),
    ).toThrow(/tier\/control/);

    const differentConfig = new TsotchkeEcologyPredictorV2(0x5a4e, {
      tier: 4,
      slowLearningRate: 0.002,
    });
    expect(() => differentConfig.restore(valid)).toThrow(/configuration/);
    expect(() =>
      new TsotchkeEcologyPredictorV2(0x5a4e, { tier: 4, temporalInputs: false }).restore(valid),
    ).toThrow(/configuration/);
    expect(() => new TsotchkeEcologyPredictorV2(0x5a4e, { temporalInputs: 'no' as never })).toThrow(
      /temporalInputs control/,
    );

    const frozen = new TsotchkeEcologyPredictorV2(0xf20e, { tier: 8, adaptive: false });
    runResolvedSequence(frozen, 12);
    const forgedFrozenParameters = frozen.snapshot();
    forgedFrozenParameters.parameters.b2 = 0.25;
    const frozenBeforeRestore = frozen.snapshot();
    expect(() => frozen.restore(forgedFrozenParameters)).toThrow(
      /frozen parameters must match deterministic initialization/,
    );
    expect(frozen.snapshot()).toEqual(frozenBeforeRestore);

    const fresh = new TsotchkeEcologyPredictorV2(0xc07e, { tier: 4 });
    const forgedUnreachableContext = fresh.snapshot();
    forgedUnreachableContext.context.valid = true;
    const freshBeforeRestore = fresh.snapshot();
    expect(() => fresh.restore(forgedUnreachableContext)).toThrow(
      /valid context requires a revealed observation/,
    );
    expect(fresh.snapshot()).toEqual(freshBeforeRestore);
    expect(() => TsotchkeEcologyPredictorV2.fromSnapshot({} as never)).toThrow(/unsupported/);
  });

  test('10k faulted inputs remain finite, bounded, deterministic, and restorable', () => {
    const predictor = new TsotchkeEcologyPredictorV2(0xb0aded, { tier: 16 });
    const faults: readonly unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1e12,
      1e12,
    ];
    let allForecastsBounded = true;
    let allScoresBounded = true;

    for (let step = 0; step < 10_000; step++) {
      const fault = faults[step % faults.length];
      const forecast = predictor.forecast({
        biomassDepletion: step % 7 === 0 ? (fault as number) : (step % 101) / 100,
        metabolicDepletion: step % 11 === 0 ? (fault as number) : (step % 97) / 96,
        crowding: step % 13 === 0 ? (fault as number) : (step % 89) / 88,
        chaos: step % 17 === 0 ? (fault as number) : (step % 83) / 82,
        thermalStress: step % 19 === 0 ? (fault as number) : (step % 79) / 78,
      });
      allForecastsBounded &&=
        Number.isFinite(forecast.prediction) &&
        forecast.prediction >= 0 &&
        forecast.prediction <= 1;

      if (step % 997 === 0) {
        const pending = predictor.snapshot();
        expect(() =>
          predictor.observe({ token: forecast.token, outcome: Number.POSITIVE_INFINITY }),
        ).toThrow(/finite and in \[0,1\]/);
        expect(predictor.snapshot()).toEqual(pending);
      }
      const scored = predictor.observe({ token: forecast.token, outcome: outcomeAt(step) });
      allScoresBounded &&=
        Number.isFinite(scored.softTargetSquaredError) &&
        scored.softTargetSquaredError >= 0 &&
        scored.softTargetSquaredError <= 1 &&
        Number.isFinite(scored.driftScore) &&
        scored.driftScore >= 0 &&
        scored.driftScore <= 1 &&
        Number.isFinite(scored.learningRate);
    }

    const snapshot = predictor.snapshot();
    const parameters = flatParameters(snapshot);
    const optimizer = flatOptimizer(snapshot);
    expect(allForecastsBounded).toBe(true);
    expect(allScoresBounded).toBe(true);
    expect(snapshot.counters.forecastCount).toBe(10_000);
    expect(snapshot.counters.observationCount).toBe(10_000);
    expect(snapshot.counters.updateCount).toBe(10_000);
    expect(
      parameters.every(
        (value) => Number.isFinite(value) && Math.abs(value) <= TSOTCHKE_ECOLOGY_V2_PARAMETER_LIMIT,
      ),
    ).toBe(true);
    expect(optimizer.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
      true,
    );
    expect(TsotchkeEcologyPredictorV2.fromSnapshot(snapshot).snapshot()).toEqual(snapshot);
  });
});
