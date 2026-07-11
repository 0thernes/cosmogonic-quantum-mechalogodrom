import { describe, expect, test } from 'bun:test';
import {
  ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS,
  EntityResourceHead,
  type EntityResourceHeadObservation,
  type EntityResourceHeadSnapshot,
  type EntityResourceHeadTier,
} from '../src/sim/entity-resource-head';

const OBSERVATION: Omit<EntityResourceHeadObservation, 'revision' | 'dtSeconds'> = {
  resource: 0.72,
  threat: -0.18,
  exploration: 0.41,
  social: 0.27,
  goalX: 0.8,
  goalZ: -0.6,
  desire: 0.75,
  cover: 0.9,
  energy: 0.66,
  speed: 0.32,
};

const observe = (
  head: EntityResourceHead,
  revision: number,
  dtSeconds = 1 / 60,
  overrides: Partial<EntityResourceHeadObservation> = {},
): void => {
  head.observe({ ...OBSERVATION, revision, dtSeconds, ...overrides });
};

const everyFinite = (values: readonly number[]): boolean => values.every(Number.isFinite);

const maxDelta = (actual: readonly number[], inherited: readonly number[]): number =>
  Math.max(...actual.map((value, index) => Math.abs(value - (inherited[index] ?? 0))));

describe('EntityResourceHead Phase-B leaf', () => {
  test('rejects malformed runtime control flags instead of coercing experiment arms', () => {
    for (const invalidSeed of [0, -1, 0x1_0000_0000, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new EntityResourceHead(invalidSeed)).toThrow(/nonzero uint32/);
    }
    expect(
      () =>
        new EntityResourceHead(1, 4, {
          onlineLearningEnabled: 'yes' as never,
        }),
    ).toThrow(TypeError);
    expect(
      () =>
        new EntityResourceHead(1, 4, {
          recurrenceEnabled: 1 as never,
        }),
    ).toThrow(TypeError);

    const head = new EntityResourceHead(1);
    expect(() => head.setOnlineLearningEnabled('yes' as never)).toThrow(TypeError);
    expect(() => head.setRecurrenceEnabled(1 as never)).toThrow(TypeError);
  });

  test('has exact tier counts, intended legacy totals, storage accounting, and common-prefix parameters', () => {
    const expected = new Map<EntityResourceHeadTier, readonly [number, number, number]>([
      [2, [27, 97, 148]],
      [4, [51, 121, 252]],
      [8, [99, 169, 460]],
    ]);
    const snapshots = new Map<EntityResourceHeadTier, EntityResourceHeadSnapshot>();
    for (const tier of [2, 4, 8] as const) {
      const head = new EntityResourceHead(0x52c0_2026, tier);
      const [parameters, total, bytes] = expected.get(tier)!;
      expect(head.parameterCount()).toBe(parameters);
      expect(head.totalParameterCount()).toBe(total);
      expect(head.storageBytes()).toBe(bytes);
      const snapshot = head.snapshot();
      expect(
        snapshot.parameters.input.length +
          snapshot.parameters.recurrent.length +
          snapshot.parameters.output.length +
          snapshot.parameters.bias.length,
      ).toBe(parameters);
      snapshots.set(tier, snapshot);
    }

    const small = snapshots.get(2)!;
    const medium = snapshots.get(4)!;
    const large = snapshots.get(8)!;
    for (const wider of [medium, large]) {
      expect(wider.parameters.input.slice(0, small.parameters.input.length)).toEqual(
        Array.from(small.parameters.input),
      );
      expect(wider.parameters.recurrent.slice(0, small.parameters.recurrent.length)).toEqual(
        Array.from(small.parameters.recurrent),
      );
      expect(wider.parameters.output.slice(0, small.parameters.output.length)).toEqual(
        Array.from(small.parameters.output),
      );
      expect(wider.parameters.bias).toEqual(small.parameters.bias);
    }
    expect(large.parameters.input.slice(0, medium.parameters.input.length)).toEqual(
      Array.from(medium.parameters.input),
    );
    expect(large.parameters.recurrent.slice(0, medium.parameters.recurrent.length)).toEqual(
      Array.from(medium.parameters.recurrent),
    );
    expect(large.parameters.output.slice(0, medium.parameters.output.length)).toEqual(
      Array.from(medium.parameters.output),
    );

    expect(Math.max(...large.parameters.input.map(Math.abs))).toBeLessThanOrEqual(0.42);
    expect(Math.max(...large.parameters.recurrent.map(Math.abs))).toBeLessThanOrEqual(0.2);
    expect(Math.max(...large.parameters.output.map(Math.abs))).toBeLessThanOrEqual(0.32);
    expect(Math.max(...large.parameters.bias.map(Math.abs))).toBeLessThanOrEqual(0.08);
    expect(large.halfLivesSeconds).toEqual(ENTITY_RESOURCE_HEAD_HALF_LIVES_SECONDS);
  });

  test('is seed deterministic and cached reads neither allocate nor advance state', () => {
    const a = new EntityResourceHead(0x1234_abcd, 8);
    const b = new EntityResourceHead(0x1234_abcd, 8);
    const cached = a.readAction();
    for (let revision = 0; revision < 80; revision++) {
      const overrides = {
        resource: Math.sin(revision * 0.13),
        threat: Math.cos(revision * 0.07),
        goalX: Math.sin(revision * 0.03),
        goalZ: Math.cos(revision * 0.05),
      };
      observe(a, revision, 1 / 60, overrides);
      observe(b, revision, 1 / 60, overrides);
      if (revision % 9 === 0) {
        const reward = revision % 18 === 0 ? 0.8 : -0.25;
        a.applyFoodReward(revision, reward);
        b.applyFoodReward(revision, reward);
      }
      expect(a.readAction()).toBe(cached);
      expect(a.readAction()).toEqual(b.readAction());
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  test('uses simulation-time half-lives consistently at 30/60/120 Hz', () => {
    const run = (hz: number): EntityResourceHeadSnapshot => {
      const head = new EntityResourceHead(0xcade_2026, 8);
      for (let step = 0; step < hz * 2; step++) observe(head, step, 1 / hz);
      return head.snapshot();
    };
    const at30 = run(30);
    const at60 = run(60);
    const at120 = run(120);
    for (let i = 0; i < 8; i++) {
      expect(at30.hidden[i]!).toBeCloseTo(at60.hidden[i]!, 5);
      expect(at60.hidden[i]!).toBeCloseTo(at120.hidden[i]!, 5);
    }
    expect(at30.cachedAction.x).toBeCloseTo(at120.cachedAction.x, 5);
    expect(at30.cachedAction.z).toBeCloseTo(at120.cachedAction.z, 5);
    expect(at30.cachedAction.value).toBeCloseTo(at120.cachedAction.value, 5);
  });

  test('clamps semantic contract lanes to [0, 1] while retaining signed goal cues', () => {
    const negative = new EntityResourceHead(505, 4, { recurrenceEnabled: false });
    const zero = new EntityResourceHead(505, 4, { recurrenceEnabled: false });
    const positive = new EntityResourceHead(505, 4, { recurrenceEnabled: false });
    observe(negative, 0, 1 / 60, {
      resource: -1,
      threat: -100,
      exploration: Number.NEGATIVE_INFINITY,
      social: -0.1,
      goalX: -0.75,
    });
    observe(zero, 0, 1 / 60, {
      resource: 0,
      threat: 0,
      exploration: 0,
      social: 0,
      goalX: -0.75,
    });
    observe(positive, 0, 1 / 60, {
      resource: 1,
      threat: 1,
      exploration: 1,
      social: 1,
      goalX: -0.75,
    });
    expect(negative.snapshot().hidden).toEqual(zero.snapshot().hidden);
    expect(negative.readAction()).toEqual(zero.readAction());
    expect(positive.snapshot().hidden).not.toEqual(zero.snapshot().hidden);
  });

  test('separates leaky recurrence from current-input control and clears state on controls/reset', () => {
    const recurrent = new EntityResourceHead(404, 4);
    const currentOnly = new EntityResourceHead(404, 4, { recurrenceEnabled: false });
    observe(recurrent, 0, 1, { goalX: 1, goalZ: 1 });
    observe(currentOnly, 0, 1, { goalX: 1, goalZ: 1 });
    observe(recurrent, 1, 0.001, { goalX: -1, goalZ: -1, resource: -1 });
    observe(currentOnly, 1, 0.001, { goalX: -1, goalZ: -1, resource: -1 });
    expect(recurrent.snapshot().hidden).not.toEqual(currentOnly.snapshot().hidden);

    recurrent.setRecurrenceEnabled(false);
    expect(recurrent.snapshot().hidden).toEqual([0, 0, 0, 0]);
    observe(recurrent, 2, Number.NaN, { goalX: 0.25 });
    expect(recurrent.snapshot().hidden.some((value) => value !== 0)).toBe(true);
    recurrent.setRecurrenceEnabled(true);
    expect(recurrent.snapshot().hidden).toEqual([0, 0, 0, 0]);

    const inheritedReadout = recurrent.snapshot().parameters;
    recurrent.applyFoodReward(2, 1);
    expect(recurrent.snapshot().parameters.bias).not.toEqual(inheritedReadout.bias);
    recurrent.resetAdaptiveState();
    const reset = recurrent.snapshot();
    expect(reset.hidden).toEqual([0, 0, 0, 0]);
    expect(reset.parameters.output).toEqual(inheritedReadout.output);
    expect(reset.parameters.bias).toEqual(inheritedReadout.bias);
    expect(reset.cachedAction).toEqual({ x: 0, z: 0, value: 0, revision: -1 });
    expect(reset.observedRevision).toBe(-1);
    expect(reset.consumedRewardRevision).toBeNull();
    expect(reset.controls).toEqual({ onlineLearningEnabled: true, recurrenceEnabled: true });
  });

  test('consumes actual food reward exactly once and bounds output-only plasticity', () => {
    const head = new EntityResourceHead(91, 8, { learningRate: 0.5, maxOutputOffset: 0.1 });
    observe(head, 7, 0.5);
    const before = head.snapshot();
    head.applyFoodReward(7, 99); // finite real input is explicitly bounded to +1
    const after = head.snapshot();
    expect(after.parameters.input).toEqual(before.parameters.input);
    expect(after.parameters.recurrent).toEqual(before.parameters.recurrent);
    expect(after.hidden).toEqual(before.hidden);
    expect(after.parameters.output).not.toEqual(before.parameters.output);
    expect(after.parameters.bias).not.toEqual(before.parameters.bias);
    expect(maxDelta(after.parameters.output, before.parameters.output)).toBeLessThanOrEqual(
      0.1 + 1e-7,
    );
    expect(maxDelta(after.parameters.bias, before.parameters.bias)).toBeLessThanOrEqual(0.1 + 1e-7);
    expect(after.consumedRewardRevision).toBe(7);

    const once = JSON.stringify(after);
    expect(() => head.applyFoodReward(7, 1)).toThrow(/already consumed/);
    expect(JSON.stringify(head.snapshot())).toBe(once);
    expect(() => head.applyFoodReward(6, 1)).toThrow(/latest observed revision/);
    expect(() => head.applyFoodReward(7, Number.NaN)).toThrow(/already consumed/);
  });

  test('no reward and frozen-learning arms leave every inherited/adaptive weight invariant', () => {
    const noReward = new EntityResourceHead(222, 4);
    const frozen = new EntityResourceHead(222, 4, { onlineLearningEnabled: false });
    const initial = noReward.snapshot();
    for (let revision = 0; revision < 40; revision++) {
      const overrides = { resource: revision / 40, goalZ: Math.sin(revision) };
      observe(noReward, revision, 1 / 60, overrides);
      observe(frozen, revision, 1 / 60, overrides);
      frozen.applyFoodReward(revision, revision % 2 === 0 ? 1 : -1);
      expect(noReward.readAction()).toEqual(frozen.readAction());
    }
    const a = noReward.snapshot();
    const b = frozen.snapshot();
    expect(a.parameters).toEqual(initial.parameters);
    expect(b.parameters).toEqual(initial.parameters);
  });

  test('JSON snapshot/restore has byte-identical continuation including controls and reward revision', () => {
    const source = new EntityResourceHead(0xbeef_1024, 8, {
      learningRate: 0.04,
      maxOutputOffset: 0.2,
    });
    for (let revision = 0; revision < 12; revision++) {
      observe(source, revision, 1 / 30, { goalX: Math.sin(revision), energy: revision / 12 });
      if (revision % 3 === 0) source.applyFoodReward(revision, 0.6 - revision * 0.04);
    }
    source.setOnlineLearningEnabled(false);
    const encoded = JSON.stringify(source.snapshot());
    const restored = EntityResourceHead.fromSnapshot(
      JSON.parse(encoded) as EntityResourceHeadSnapshot,
    );
    expect(JSON.stringify(restored.snapshot())).toBe(encoded);

    for (let revision = 12; revision < 32; revision++) {
      const overrides = { threat: Math.cos(revision * 0.2), speed: revision / 31 };
      observe(source, revision, 1 / 120, overrides);
      observe(restored, revision, 1 / 120, overrides);
      source.applyFoodReward(revision, -0.3);
      restored.applyFoodReward(revision, -0.3);
      expect(source.readAction()).toEqual(restored.readAction());
    }
    expect(JSON.stringify(restored.snapshot())).toBe(JSON.stringify(source.snapshot()));
  });

  test('rejects malformed/tier-incompatible snapshots before mutating the target', () => {
    const source = new EntityResourceHead(808, 4);
    observe(source, 0);
    source.applyFoodReward(0, 0.5);
    const target = new EntityResourceHead(808, 4);
    observe(target, 0, 0.2, { resource: -0.8 });
    const before = JSON.stringify(target.snapshot());

    const malformed = structuredClone(source.snapshot()) as EntityResourceHeadSnapshot & {
      hidden: number[];
    };
    malformed.hidden[1] = Number.NaN;
    expect(() => target.restore(malformed)).toThrow(/hidden\[1\].*finite/);
    expect(JSON.stringify(target.snapshot())).toBe(before);

    const corruptParameter = structuredClone(source.snapshot()) as EntityResourceHeadSnapshot & {
      parameters: { input: number[] };
    };
    corruptParameter.parameters.input[0] = 0;
    expect(() => target.restore(corruptParameter)).toThrow(/deterministic seed\/tier/);
    expect(JSON.stringify(target.snapshot())).toBe(before);

    const outOfRange = structuredClone(source.snapshot()) as EntityResourceHeadSnapshot & {
      parameters: { output: number[] };
    };
    outOfRange.parameters.output[0] = 2;
    expect(() => target.restore(outOfRange)).toThrow(/inherited/);
    expect(JSON.stringify(target.snapshot())).toBe(before);

    const forgedAction = structuredClone(source.snapshot()) as EntityResourceHeadSnapshot & {
      cachedAction: { x: number };
    };
    forgedAction.cachedAction.x = -forgedAction.cachedAction.x + 0.25;
    expect(() => target.restore(forgedAction)).toThrow(/cached action.*hidden\/readout/);
    expect(JSON.stringify(target.snapshot())).toBe(before);

    const forgedUnobserved = structuredClone(
      new EntityResourceHead(808, 4).snapshot(),
    ) as EntityResourceHeadSnapshot & { hidden: number[] };
    forgedUnobserved.hidden[0] = 0.25;
    expect(() => target.restore(forgedUnobserved)).toThrow(/unobserved snapshot hidden/);
    expect(JSON.stringify(target.snapshot())).toBe(before);

    const wrongTier = new EntityResourceHead(808, 8);
    const wrongTierBefore = JSON.stringify(wrongTier.snapshot());
    expect(() => wrongTier.restore(source.snapshot())).toThrow(/tier mismatch/);
    expect(JSON.stringify(wrongTier.snapshot())).toBe(wrongTierBefore);
  });

  test('10k hostile observations/rewards remain finite and bounded', () => {
    const head = new EntityResourceHead(0xfa17_2026, 8, {
      learningRate: 0.2,
      maxOutputOffset: 0.3,
    });
    const inherited = head.snapshot().parameters;
    const faults = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e300, -1e300];
    for (let revision = 0; revision < 10_000; revision++) {
      const fault = faults[revision % faults.length]!;
      observe(head, revision, fault, {
        resource: fault,
        threat: -fault,
        exploration: revision % 2 === 0 ? 1e300 : -1e300,
        social: Number.NaN,
        goalX: fault,
        goalZ: -fault,
        desire: fault,
        cover: revision % 3 === 0 ? Number.POSITIVE_INFINITY : 0.5,
        energy: fault,
        speed: -fault,
      });
      if (revision % 3 === 0) head.applyFoodReward(revision, revision % 2 === 0 ? 1e300 : -1e300);
      const action = head.readAction();
      expect(Number.isFinite(action.x)).toBe(true);
      expect(Number.isFinite(action.z)).toBe(true);
      expect(Number.isFinite(action.value)).toBe(true);
      expect(Math.abs(action.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(action.z)).toBeLessThanOrEqual(1);
      expect(Math.abs(action.value)).toBeLessThanOrEqual(1);
    }
    const snapshot = head.snapshot();
    expect(everyFinite(snapshot.hidden)).toBe(true);
    expect(everyFinite(snapshot.parameters.output)).toBe(true);
    expect(everyFinite(snapshot.parameters.bias)).toBe(true);
    expect(snapshot.parameters.input).toEqual(inherited.input);
    expect(snapshot.parameters.recurrent).toEqual(inherited.recurrent);
    expect(Math.max(...snapshot.hidden.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(maxDelta(snapshot.parameters.output, inherited.output)).toBeLessThanOrEqual(0.3 + 1e-7);
    expect(maxDelta(snapshot.parameters.bias, inherited.bias)).toBeLessThanOrEqual(0.3 + 1e-7);
  });
});
