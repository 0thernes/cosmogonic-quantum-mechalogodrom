import { describe, expect, test } from 'bun:test';
import {
  TsotchkeEcologyPredictor,
  type TsotchkeEcologyInput,
} from '../src/sim/tsotchke-ecology-predictor';

const CALM: TsotchkeEcologyInput = {
  biomassDepletion: 0.1,
  metabolicDepletion: 0.15,
  crowding: 0.2,
  chaosThermalStress: 0.1,
};

const STRESSED: TsotchkeEcologyInput = {
  biomassDepletion: 0.9,
  metabolicDepletion: 0.85,
  crowding: 0.8,
  chaosThermalStress: 0.9,
};

function runSequence(predictor: TsotchkeEcologyPredictor, offset = 0): unknown[] {
  const out: unknown[] = [];
  let previousTarget: number | undefined;
  for (let step = 0; step < 80; step++) {
    const input = (step + offset) % 2 === 0 ? CALM : STRESSED;
    out.push(predictor.step(input, previousTarget));
    previousTarget = input === STRESSED ? 1 : 0;
  }
  return out;
}

describe('Tsotchke deterministic online ecology predictor', () => {
  test('same seed and cadence history produce identical learning traces', () => {
    const a = new TsotchkeEcologyPredictor(0x5eed);
    const b = new TsotchkeEcologyPredictor(0x5eed);

    expect(runSequence(a)).toEqual(runSequence(b));
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.snapshot().updateCount).toBe(79);
  });

  test('the label at cadence t updates only the retained t-1 sample; frozen mode only scores it', () => {
    const adaptive = new TsotchkeEcologyPredictor(77, { adaptive: true });
    const frozen = new TsotchkeEcologyPredictor(77, { adaptive: false });

    const firstAdaptive = adaptive.step(CALM);
    const firstFrozen = frozen.step(CALM);
    expect(firstAdaptive).toEqual(firstFrozen);
    const frozenBefore = frozen.snapshot();

    const secondAdaptive = adaptive.step(STRESSED, 0);
    const secondFrozen = frozen.step(STRESSED, 0);
    expect(secondAdaptive.previousBrier).toBe((firstAdaptive.prediction - 0) ** 2);
    expect(secondFrozen.previousBrier).toBe((firstFrozen.prediction - 0) ** 2);
    expect(secondAdaptive.updated).toBe(true);
    expect(secondFrozen.updated).toBe(false);
    expect(adaptive.snapshot().updateCount).toBe(1);
    expect(frozen.snapshot().updateCount).toBe(0);
    expect(frozen.snapshot().w1).toEqual(frozenBefore.w1);
    expect(frozen.snapshot().w2).toEqual(frozenBefore.w2);
  });

  test('snapshot restore resumes parameters, lag state, counters, and future outputs exactly', () => {
    const source = new TsotchkeEcologyPredictor(0xc0ffee, { learningRate: 0.06 });
    runSequence(source);
    const restored = TsotchkeEcologyPredictor.fromSnapshot(source.snapshot());

    let previousTarget = 1;
    for (let step = 0; step < 60; step++) {
      const input = step % 3 === 0 ? STRESSED : CALM;
      expect(restored.step(input, previousTarget)).toEqual(source.step(input, previousTarget));
      previousTarget = input === STRESSED ? 1 : 0;
    }
    expect(restored.snapshot()).toEqual(source.snapshot());
  });

  test('snapshot restore rejects arm crossover and internally inconsistent pending evidence', () => {
    const adaptive = new TsotchkeEcologyPredictor(0x5a4e);
    adaptive.step(CALM);
    const snapshot = adaptive.snapshot();
    const frozen = new TsotchkeEcologyPredictor(0x5a4e, { adaptive: false });
    expect(() => frozen.restore(snapshot)).toThrow(/adaptive mode/);

    const forgedPrediction = {
      ...snapshot,
      pendingPrediction: snapshot.pendingPrediction > 0.5 ? 0 : 1,
    };
    expect(() => adaptive.restore(forgedPrediction)).toThrow(/pending prediction/);

    const initial = new TsotchkeEcologyPredictor(0x5a4e).snapshot();
    expect(() => adaptive.restore({ ...initial, hasPending: true })).toThrow(/counters/);
  });

  test('clearing a discontinuity prevents a stale sample from receiving a future label', () => {
    const predictor = new TsotchkeEcologyPredictor(0x6a9);
    predictor.step(CALM);
    predictor.clearPending();
    const cleared = predictor.snapshot();
    expect(cleared.hasPending).toBe(false);
    expect(cleared.pendingInput).toEqual([0, 0, 0, 0]);
    expect(cleared.pendingPrediction).toBe(0.5);
    const resumed = predictor.step(STRESSED, 1);
    expect(resumed.previousBrier).toBeNull();
    expect(resumed.updated).toBe(false);
  });

  test('adaptive predictor relearns a reversed ecology relation and beats the frozen control', () => {
    const adaptive = new TsotchkeEcologyPredictor(0xdecafbad, {
      adaptive: true,
      learningRate: 0.1,
    });
    const frozen = new TsotchkeEcologyPredictor(0xdecafbad, {
      adaptive: false,
      learningRate: 0.1,
    });
    const adaptiveTail: number[] = [];
    const frozenTail: number[] = [];
    let previousTarget: number | undefined;

    for (let step = 0; step < 800; step++) {
      const input = step % 2 === 0 ? CALM : STRESSED;
      const a = adaptive.step(input, previousTarget);
      const f = frozen.step(input, previousTarget);
      if (step >= 700 && a.previousBrier !== null && f.previousBrier !== null) {
        adaptiveTail.push(a.previousBrier);
        frozenTail.push(f.previousBrier);
      }
      const stressed = input === STRESSED;
      previousTarget = step < 400 ? (stressed ? 1 : 0) : stressed ? 0 : 1;
    }

    const mean = (values: readonly number[]): number =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const adaptiveBrier = mean(adaptiveTail);
    const frozenBrier = mean(frozenTail);
    expect(adaptiveTail).toHaveLength(100);
    expect(adaptiveBrier).toBeLessThan(frozenBrier * 0.6);
    expect(adaptiveBrier).toBeLessThan(0.12);
  });

  test('long faulted runs keep predictions, losses, and serialized parameters finite and bounded', () => {
    const predictor = new TsotchkeEcologyPredictor(1234);
    const faults = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1e9, 1e9];
    let previousTarget: number | undefined;

    for (let step = 0; step < 20_000; step++) {
      const fault = faults[step % faults.length]!;
      const result = predictor.step(
        {
          biomassDepletion: step % 11 === 0 ? fault : (step % 101) / 100,
          metabolicDepletion: step % 13 === 0 ? fault : (step % 97) / 96,
          crowding: step % 17 === 0 ? fault : (step % 89) / 88,
          chaosThermalStress: step % 19 === 0 ? fault : (step % 83) / 82,
        },
        previousTarget,
      );
      expect(Number.isFinite(result.prediction)).toBe(true);
      expect(result.prediction).toBeGreaterThanOrEqual(0);
      expect(result.prediction).toBeLessThanOrEqual(1);
      if (result.previousBrier !== null) {
        expect(Number.isFinite(result.previousBrier)).toBe(true);
        expect(result.previousBrier).toBeGreaterThanOrEqual(0);
        expect(result.previousBrier).toBeLessThanOrEqual(1);
      }
      previousTarget = step % 23 === 0 ? fault : step & 1;
    }

    const snapshot = predictor.snapshot();
    expect(snapshot.revision).toBe(20_000);
    expect(
      [...snapshot.w1, ...snapshot.b1, ...snapshot.w2, snapshot.b2].every(Number.isFinite),
    ).toBe(true);
    expect(TsotchkeEcologyPredictor.fromSnapshot(snapshot).snapshot()).toEqual(snapshot);
  });
});
