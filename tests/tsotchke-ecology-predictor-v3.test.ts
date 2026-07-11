import { describe, expect, test } from 'bun:test';
import {
  TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS,
  TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS,
  TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS,
  TSOTCHKE_ECOLOGY_V3_INPUTS,
  TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
  TSOTCHKE_ECOLOGY_V3_VALIDITY_INPUTS,
  TsotchkeEcologyPredictorV3,
  tsotchkeEcologyPredictorV3ParameterCount,
  type TsotchkeEcologyPredictorV3Input,
  type TsotchkeEcologyPredictorV3Snapshot,
  type TsotchkeEcologyPredictorV3Tier,
} from '../src/sim/tsotchke-ecology-predictor-v3';

const TIERS: readonly TsotchkeEcologyPredictorV3Tier[] = [8, 16, 32];
const HISTORY_OFFSET = TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS;
const VALIDITY_OFFSET = HISTORY_OFFSET + TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS;

const CURRENT: TsotchkeEcologyPredictorV3Input = {
  biomassDepletion: 0.27,
  metabolicDepletion: 0.43,
  crowding: 0.61,
  chaos: 0.18,
  thermalStress: 0.76,
};

const currentVector = (input: TsotchkeEcologyPredictorV3Input): number[] => [
  input.biomassDepletion ?? 0,
  input.metabolicDepletion ?? 0,
  input.crowding ?? 0,
  input.chaos ?? 0,
  input.thermalStress ?? 0,
];

const inputAt = (step: number): TsotchkeEcologyPredictorV3Input => ({
  biomassDepletion: (((step * 17) % 89) + 1) / 90,
  metabolicDepletion: (((step * 29) % 83) + 1) / 84,
  crowding: (((step * 31) % 79) + 1) / 80,
  chaos: (((step * 37) % 73) + 1) / 74,
  thermalStress: (((step * 41) % 67) + 1) / 68,
});

const outcomeAt = (step: number): number => ((step * 43 + 11) % 101) / 100;

const flatParameters = (snapshot: TsotchkeEcologyPredictorV3Snapshot): number[] => [
  ...snapshot.parameters.w1,
  ...snapshot.parameters.b1,
  ...snapshot.parameters.wSkip,
  ...snapshot.parameters.w2,
  snapshot.parameters.b2,
];

const flatOptimizer = (snapshot: TsotchkeEcologyPredictorV3Snapshot): number[] => [
  ...snapshot.optimizer.rmsW1,
  ...snapshot.optimizer.rmsB1,
  ...snapshot.optimizer.rmsWSkip,
  ...snapshot.optimizer.rmsW2,
  snapshot.optimizer.rmsB2,
];

const runResolvedSequence = (
  predictor: TsotchkeEcologyPredictorV3,
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

describe('Tsotchke ecology predictor V3', () => {
  test('exposes the exact 101-input and 926/1750/3398-parameter architecture', () => {
    expect(TSOTCHKE_ECOLOGY_V3_CURRENT_INPUTS).toBe(5);
    expect(TSOTCHKE_ECOLOGY_V3_HISTORY_TAPS).toBe(16);
    expect(TSOTCHKE_ECOLOGY_V3_HISTORY_INPUTS).toBe(80);
    expect(TSOTCHKE_ECOLOGY_V3_VALIDITY_INPUTS).toBe(16);
    expect(TSOTCHKE_ECOLOGY_V3_INPUTS).toBe(101);
    expect(tsotchkeEcologyPredictorV3ParameterCount(8)).toBe(926);
    expect(tsotchkeEcologyPredictorV3ParameterCount(16)).toBe(1_750);
    expect(tsotchkeEcologyPredictorV3ParameterCount(32)).toBe(3_398);

    for (const tier of TIERS) {
      const predictor = new TsotchkeEcologyPredictorV3(0x8123 + tier, { tier });
      const snapshot = predictor.snapshot();
      expect(predictor.trainableParameterCount).toBe(103 * tier + 102);
      expect(flatParameters(snapshot)).toHaveLength(103 * tier + 102);
      expect(flatOptimizer(snapshot)).toHaveLength(103 * tier + 102);
    }
    expect(() => tsotchkeEcologyPredictorV3ParameterCount(4 as never)).toThrow(/unsupported/);
  });

  test('initialization preserves exact shared scalar prefixes across hidden tiers', () => {
    const tier8 = new TsotchkeEcologyPredictorV3(0xc011_ab1e, { tier: 8 }).snapshot();
    const tier16 = new TsotchkeEcologyPredictorV3(0xc011_ab1e, { tier: 16 }).snapshot();
    const tier32 = new TsotchkeEcologyPredictorV3(0xc011_ab1e, { tier: 32 }).snapshot();

    expect(tier16.parameters.w1.slice(0, tier8.parameters.w1.length)).toEqual(tier8.parameters.w1);
    expect(tier32.parameters.w1.slice(0, tier16.parameters.w1.length)).toEqual(
      tier16.parameters.w1,
    );
    expect(tier16.parameters.w2.slice(0, tier8.parameters.w2.length)).toEqual(tier8.parameters.w2);
    expect(tier32.parameters.w2.slice(0, tier16.parameters.w2.length)).toEqual(
      tier16.parameters.w2,
    );
    expect(tier8.parameters.wSkip).toEqual(tier16.parameters.wSkip);
    expect(tier16.parameters.wSkip).toEqual(tier32.parameters.wSkip);
    expect(tier8.parameters.b1.every((value) => value === 0)).toBe(true);
    expect(tier32.parameters.b1.every((value) => value === 0)).toBe(true);
  });

  test('captures taps before insertion and advances history even when labels are discarded', () => {
    const predictor = new TsotchkeEcologyPredictorV3(0xca05_a1);
    const firstInput = inputAt(0);
    const secondInput = inputAt(1);
    const thirdInput = inputAt(2);

    const first = predictor.forecast(firstInput);
    const firstPending = predictor.snapshot();
    expect(first.historyDepth).toBe(0);
    expect(firstPending.pending.input.slice(0, 5)).toEqual(currentVector(firstInput));
    expect(firstPending.pending.input.slice(HISTORY_OFFSET, VALIDITY_OFFSET)).toEqual(
      Array(80).fill(0),
    );
    expect(firstPending.pending.input.slice(VALIDITY_OFFSET)).toEqual(Array(16).fill(0));
    expect(firstPending.history.ring.slice(0, 5)).toEqual(currentVector(firstInput));
    expect(firstPending.history.validity).toEqual([1, ...Array(15).fill(0)]);
    expect(predictor.discardPending()).toBe(true);

    const second = predictor.forecast(secondInput);
    const secondPending = predictor.snapshot();
    expect(second.historyDepth).toBe(1);
    expect(secondPending.pending.input.slice(HISTORY_OFFSET, HISTORY_OFFSET + 5)).toEqual(
      currentVector(firstInput),
    );
    expect(secondPending.pending.input.slice(VALIDITY_OFFSET)).toEqual([1, ...Array(15).fill(0)]);
    expect(secondPending.history.ring.slice(5, 10)).toEqual(currentVector(secondInput));
    predictor.discardPending();

    predictor.forecast(thirdInput);
    const thirdPending = predictor.snapshot();
    expect(thirdPending.pending.input.slice(HISTORY_OFFSET, HISTORY_OFFSET + 5)).toEqual(
      currentVector(secondInput),
    );
    expect(thirdPending.pending.input.slice(HISTORY_OFFSET + 5, HISTORY_OFFSET + 10)).toEqual(
      currentVector(firstInput),
    );
    expect(thirdPending.pending.input.slice(VALIDITY_OFFSET, VALIDITY_OFFSET + 3)).toEqual([
      1, 1, 0,
    ]);
    expect(thirdPending.counters.discardCount).toBe(2);
  });

  test('retains the overwritten sixteenth tap in a pending JSON snapshot', () => {
    const predictor = new TsotchkeEcologyPredictorV3(0x16_7a9, { adaptive: false });
    for (let step = 0; step < 16; step++) {
      predictor.forecast(inputAt(step));
      predictor.discardPending();
    }

    const seventeenth = predictor.forecast(inputAt(16));
    const snapshot = JSON.parse(
      JSON.stringify(predictor.snapshot()),
    ) as TsotchkeEcologyPredictorV3Snapshot;
    expect(seventeenth.historyDepth).toBe(16);
    expect(snapshot.pending.input.slice(HISTORY_OFFSET, HISTORY_OFFSET + 5)).toEqual(
      currentVector(inputAt(15)),
    );
    expect(snapshot.pending.input.slice(HISTORY_OFFSET + 75, HISTORY_OFFSET + 80)).toEqual(
      currentVector(inputAt(0)),
    );
    expect(snapshot.pending.input.slice(VALIDITY_OFFSET)).toEqual(Array(16).fill(1));
    expect(snapshot.history.ring.slice(0, 5)).toEqual(currentVector(inputAt(16)));
    expect(TsotchkeEcologyPredictorV3.fromSnapshot(snapshot).snapshot()).toEqual(snapshot);
  });

  test('history ablation zeros all 96 historical features without stopping ring state', () => {
    const visible = new TsotchkeEcologyPredictorV3(0xab1a_7103, {
      adaptive: false,
    });
    const ablated = new TsotchkeEcologyPredictorV3(0xab1a_7103, {
      adaptive: false,
      historyInputs: false,
    });

    expect(visible.forecast(CURRENT)).toEqual(ablated.forecast(CURRENT));
    visible.discardPending();
    ablated.discardPending();
    const visibleSecond = visible.forecast(inputAt(4));
    const ablatedSecond = ablated.forecast(inputAt(4));
    const visibleSnapshot = visible.snapshot();
    const ablatedSnapshot = ablated.snapshot();

    expect(visibleSecond.prediction).not.toBe(ablatedSecond.prediction);
    expect(visibleSnapshot.history).toEqual(ablatedSnapshot.history);
    expect(visibleSnapshot.pending.input.slice(HISTORY_OFFSET)).not.toEqual(Array(96).fill(0));
    expect(ablatedSnapshot.pending.input.slice(HISTORY_OFFSET)).toEqual(Array(96).fill(0));
    expect(ablated.usesHistoryInputs).toBe(false);
    expect(TsotchkeEcologyPredictorV3.fromSnapshot(ablatedSnapshot).snapshot()).toEqual(
      ablatedSnapshot,
    );
  });

  test('enforces strict token ownership and permits episode reset only without pending work', () => {
    const predictor = new TsotchkeEcologyPredictorV3(99);
    expect(() => predictor.observe({ token: 1, outcome: 0.5 })).toThrow(/no pending/);
    expect(() =>
      predictor.observe({ token: undefined as unknown as number, outcome: 0.5 }),
    ).toThrow(/absent or invalid/);

    const forecast = predictor.forecast(CURRENT);
    const pending = predictor.snapshot();
    expect(() => predictor.forecast(CURRENT)).toThrow(/unresolved/);
    expect(() => predictor.resetEpisode()).toThrow(/unresolved/);
    expect(() => predictor.observe({ token: forecast.token + 1, outcome: 0.5 })).toThrow(
      /does not match/,
    );
    expect(() => predictor.observe({ token: forecast.token, outcome: Number.NaN })).toThrow(
      /finite and in \[0,1\]/,
    );
    expect(predictor.snapshot()).toEqual(pending);

    predictor.observe({ token: forecast.token, outcome: 0.5 });
    expect(() => predictor.observe({ token: forecast.token, outcome: 0.5 })).toThrow(/stale/);
    predictor.resetEpisode();
    const reset = predictor.snapshot();
    expect(reset.history.ring).toEqual(Array(80).fill(0));
    expect(reset.history.validity).toEqual(Array(16).fill(0));
    expect(reset.history.cursor).toBe(0);
    expect(reset.counters.episodeForecastCount).toBe(0);
    expect(reset.counters.episodeResetCount).toBe(1);
    expect(reset.counters.forecastCount).toBe(1);
    expect(reset.counters.observationCount).toBe(1);

    const discarded = predictor.forecast(inputAt(9));
    expect(predictor.discardPending()).toBe(true);
    expect(predictor.discardPending()).toBe(false);
    expect(() => predictor.observe({ token: discarded.token, outcome: 0.5 })).toThrow(/stale/);
  });

  test('uses bounded constant-rate RMSProp and reaches every trainable scalar', () => {
    for (const tier of TIERS) {
      const predictor = new TsotchkeEcologyPredictorV3(0x7000 + tier, {
        tier,
        learningRate: 0.017,
      });
      const before = predictor.snapshot();
      const trace = runResolvedSequence(predictor, 96);
      const after = predictor.snapshot();
      const parametersBefore = flatParameters(before);
      const parametersAfter = flatParameters(after);
      const optimizer = flatOptimizer(after);

      expect(
        trace
          .filter((_, index) => index % 2 === 1)
          .every((entry) => (entry as { learningRate: number }).learningRate === 0.017),
      ).toBe(true);
      expect(parametersAfter.every((value, index) => value !== parametersBefore[index])).toBe(true);
      expect(optimizer.every((value) => value > 0 && value <= 1 + 1e-12)).toBe(true);
    }
  });

  test('frozen control scores and advances history without mutating parameters or optimizer', () => {
    const predictor = new TsotchkeEcologyPredictorV3(0xf20e_0003, {
      tier: 32,
      adaptive: false,
    });
    const before = predictor.snapshot();
    const forecast = predictor.forecast(CURRENT);
    const observation = predictor.observe({ token: forecast.token, outcome: 0.87 });
    const after = predictor.snapshot();

    expect(observation.prediction).toBe(forecast.prediction);
    expect(observation.softTargetSquaredError).toBe((0.87 - forecast.prediction) ** 2);
    expect(observation.updated).toBe(false);
    expect(observation.updateCount).toBe(0);
    expect(after.parameters).toEqual(before.parameters);
    expect(after.optimizer).toEqual(before.optimizer);
    expect(after.history.validity[0]).toBe(1);
    expect(after.counters.episodeForecastCount).toBe(1);
  });

  test('same evidence is deterministic and pending/restored continuations are exact', () => {
    const a = new TsotchkeEcologyPredictorV3(0x5eed_0003, { tier: 16 });
    const b = new TsotchkeEcologyPredictorV3(0x5eed_0003, { tier: 16 });
    expect(runResolvedSequence(a, 80)).toEqual(runResolvedSequence(b, 80));
    expect(a.snapshot()).toEqual(b.snapshot());

    const pending = a.forecast(inputAt(80));
    b.forecast(inputAt(80));
    const restored = TsotchkeEcologyPredictorV3.fromSnapshot(
      JSON.parse(JSON.stringify(a.snapshot())) as TsotchkeEcologyPredictorV3Snapshot,
    );
    expect(restored.snapshot()).toEqual(a.snapshot());
    expect(restored.observe({ token: pending.token, outcome: outcomeAt(80) })).toEqual(
      a.observe({ token: pending.token, outcome: outcomeAt(80) }),
    );
    b.observe({ token: pending.token, outcome: outcomeAt(80) });
    expect(runResolvedSequence(restored, 100, 81)).toEqual(runResolvedSequence(a, 100, 81));
    expect(restored.snapshot()).toEqual(a.snapshot());

    expect(
      new TsotchkeEcologyPredictorV3(0x5eed_0004, { tier: 16 }).forecast(CURRENT).prediction,
    ).not.toBe(
      new TsotchkeEcologyPredictorV3(0x5eed_0003, { tier: 16 }).forecast(CURRENT).prediction,
    );
  });

  test('restore rejects forged JSON state and control crossover without partial mutation', () => {
    const predictor = new TsotchkeEcologyPredictorV3(0x5a4e_0003, { tier: 8 });
    runResolvedSequence(predictor, 24);
    predictor.forecast(inputAt(24));
    const valid = predictor.snapshot();
    const before = predictor.snapshot();

    const malformedRing = structuredClone(valid);
    malformedRing.history.ring[0] = Number.NaN;
    expect(() => predictor.restore(malformedRing)).toThrow(/history ring/);
    expect(predictor.snapshot()).toEqual(before);

    const sparseWeights = structuredClone(valid);
    Reflect.deleteProperty(sparseWeights.parameters.w1, '0');
    expect(() => predictor.restore(sparseWeights)).toThrow(/w1/);
    expect(predictor.snapshot()).toEqual(before);

    const forgedCursor = structuredClone(valid);
    forgedCursor.history.cursor = (forgedCursor.history.cursor + 1) % 16;
    expect(() => predictor.restore(forgedCursor)).toThrow(/cursor/);
    expect(predictor.snapshot()).toEqual(before);

    const forgedPendingHistory = structuredClone(valid);
    forgedPendingHistory.pending.input[HISTORY_OFFSET] =
      forgedPendingHistory.pending.input[HISTORY_OFFSET] === 0 ? 1 : 0;
    expect(() => predictor.restore(forgedPendingHistory)).toThrow(/pending history/);
    expect(predictor.snapshot()).toEqual(before);

    const forgedPrediction = structuredClone(valid);
    forgedPrediction.pending.prediction = valid.pending.prediction > 0.5 ? 0 : 1;
    expect(() => predictor.restore(forgedPrediction)).toThrow(/pending prediction/);
    expect(predictor.snapshot()).toEqual(before);

    const forgedOptimizer = structuredClone(valid);
    forgedOptimizer.optimizer.rmsB2 = -1;
    expect(() => predictor.restore(forgedOptimizer)).toThrow(/RMS b2/);
    expect(predictor.snapshot()).toEqual(before);

    const closed = structuredClone(valid);
    predictor.discardPending();
    closed.pending.active = false;
    closed.pending.token = 0;
    closed.pending.input.fill(0);
    closed.pending.prediction = 0.5;
    closed.counters.discardCount++;
    const frozen = new TsotchkeEcologyPredictorV3(0x5a4e_0003, {
      tier: 8,
      adaptive: false,
    });
    expect(() => frozen.restore(closed)).toThrow(/tier\/control/);
    expect(() =>
      new TsotchkeEcologyPredictorV3(0x5a4e_0003, {
        tier: 8,
        learningRate: 0.02,
      }).restore(closed),
    ).toThrow(/configuration/);
    expect(() => TsotchkeEcologyPredictorV3.fromSnapshot({} as never)).toThrow(/unsupported/);
  });

  test('rejects invalid construction and keeps 2k faulted updates finite and bounded', () => {
    for (const seed of [0, -1, 1.5, 0x1_0000_0000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new TsotchkeEcologyPredictorV3(seed)).toThrow(/nonzero uint32/);
    }
    expect(() => new TsotchkeEcologyPredictorV3(1, { tier: 4 as never })).toThrow(/unsupported/);
    expect(() => new TsotchkeEcologyPredictorV3(1, { historyInputs: 'no' as never })).toThrow(
      /historyInputs control/,
    );
    expect(() => new TsotchkeEcologyPredictorV3(1, { learningRate: 0 })).toThrow(/learningRate/);

    const predictor = new TsotchkeEcologyPredictorV3(0xb0ad_ed03, { tier: 32 });
    const faults: readonly unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1e12,
      1e12,
    ];
    let bounded = true;
    for (let step = 0; step < 2_000; step++) {
      const fault = faults[step % faults.length];
      const forecast = predictor.forecast({
        biomassDepletion: step % 7 === 0 ? (fault as number) : (step % 101) / 100,
        metabolicDepletion: step % 11 === 0 ? (fault as number) : (step % 97) / 96,
        crowding: step % 13 === 0 ? (fault as number) : (step % 89) / 88,
        chaos: step % 17 === 0 ? (fault as number) : (step % 83) / 82,
        thermalStress: step % 19 === 0 ? (fault as number) : (step % 79) / 78,
      });
      bounded &&=
        Number.isFinite(forecast.prediction) &&
        forecast.prediction >= 0 &&
        forecast.prediction <= 1;
      const observed = predictor.observe({ token: forecast.token, outcome: outcomeAt(step) });
      bounded &&=
        Number.isFinite(observed.softTargetSquaredError) &&
        observed.softTargetSquaredError >= 0 &&
        observed.softTargetSquaredError <= 1;
    }

    const snapshot = predictor.snapshot();
    expect(bounded).toBe(true);
    expect(snapshot.counters.forecastCount).toBe(2_000);
    expect(snapshot.counters.observationCount).toBe(2_000);
    expect(
      flatParameters(snapshot).every(
        (value) => Number.isFinite(value) && Math.abs(value) <= TSOTCHKE_ECOLOGY_V3_PARAMETER_LIMIT,
      ),
    ).toBe(true);
    expect(flatOptimizer(snapshot).every((value) => Number.isFinite(value) && value >= 0)).toBe(
      true,
    );
    expect(TsotchkeEcologyPredictorV3.fromSnapshot(snapshot).snapshot()).toEqual(snapshot);
  });
});
