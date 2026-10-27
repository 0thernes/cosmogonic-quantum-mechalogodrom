import { describe, expect, spyOn, test } from 'bun:test';
import { OrganismBioStatePool, evaluateOrganismLifeStage } from '../src/sim/biome-strata';
import { prepareParallelCounterSeed } from '../src/math/wild-entropy';

function fixture(capacity: number) {
  return {
    y: new Float32Array(capacity),
    energy: new Float32Array(capacity).fill(50),
    age: new Float32Array(capacity).fill(600),
    life: new Float32Array(capacity).fill(1000),
    act: new Float32Array(capacity),
    velocity: new Float32Array(capacity),
    energyDelta: new Float32Array(capacity),
    scale: new Float32Array(capacity),
    ids: Uint32Array.from({ length: capacity }, (_, i) => 101 + i),
  };
}

function step(
  pool: OrganismBioStatePool,
  input: ReturnType<typeof fixture>,
  dt = 0.016,
  start = 0,
  end = input.y.length,
  activeCount = input.y.length,
  seed = 173,
  wild = false,
): void {
  pool.stepShard(
    input.y,
    input.energy,
    input.age,
    input.life,
    input.act,
    input.velocity,
    input.energyDelta,
    input.scale,
    start,
    end,
    seed,
    73,
    0,
    dt,
    wild,
    activeCount,
    input.ids,
  );
}

function lanes(pool: OrganismBioStatePool) {
  return [
    pool.dopamine,
    pool.serotonin,
    pool.noradrenaline,
    pool.prevEnergy,
    pool.memoryTrace,
    pool.stratumIndex,
    pool.lifeStageIndex,
  ];
}

function slot(pool: OrganismBioStatePool, i: number): number[] {
  return [
    pool.dopamine[i]!,
    pool.serotonin[i]!,
    pool.noradrenaline[i]!,
    pool.prevEnergy[i]!,
    ...pool.memoryTrace.slice(i * 4, i * 4 + 4),
    pool.stratumIndex[i]!,
    pool.lifeStageIndex[i]!,
  ];
}

function markIdentities(pool: OrganismBioStatePool): void {
  for (let i = 0; i < pool.capacity; i++) {
    pool.dopamine[i] = 0.1 * i;
    pool.serotonin[i] = 0.2 + 0.1 * i;
    pool.noradrenaline[i] = 0.3 + 0.1 * i;
    pool.prevEnergy[i] = 10 + i;
    pool.stratumIndex[i] = i % 5;
    pool.lifeStageIndex[i] = i % 4;
    for (let c = 0; c < 4; c++) pool.memoryTrace[i * 4 + c] = i * 4 + c + 0.125;
  }
}

describe('organism bio-state identity and duration', () => {
  test('compaction swaps every physiology and memory lane and clearing cannot contaminate a survivor', () => {
    const pool = new OrganismBioStatePool(4);
    markIdentities(pool);
    const before = [0, 1, 2, 3].map((i) => slot(pool, i));
    pool.swapEntitySlots(1, 0);
    pool.swapEntitySlots(2, 1);
    pool.swapEntitySlots(3, 2);
    pool.clearEntitySlot(3);
    expect([0, 1, 2].map((i) => slot(pool, i))).toEqual(before.slice(1));
    expect(slot(pool, 3)).toEqual(slot(new OrganismBioStatePool(1), 0));
    const survivor = slot(pool, 1);
    pool.swapEntitySlots(1, 1);
    expect(slot(pool, 1)).toEqual(survivor);
  });

  test('Genesis clears inactive tail state as well as active slots', () => {
    const pool = new OrganismBioStatePool(8);
    markIdentities(pool);
    pool.resetEntitySlots();
    expect(lanes(pool)).toEqual(lanes(new OrganismBioStatePool(8)));
  });

  test('clone owns independent buffers and its own reusable profile scratch', () => {
    const pool = new OrganismBioStatePool(4);
    markIdentities(pool);
    const clone = pool.clone();
    expect(lanes(clone)).toEqual(lanes(pool));
    for (let i = 0; i < lanes(pool).length; i++) {
      expect(lanes(clone)[i]!.buffer).not.toBe(lanes(pool)[i]!.buffer);
    }
    const before = lanes(pool).map((lane) => Array.from(lane));
    step(clone, fixture(4));
    clone.clearEntitySlot(1);
    expect(lanes(pool).map((lane) => Array.from(lane))).toEqual(before);
    clone.resetEntitySlots();
    expect(lanes(pool).map((lane) => Array.from(lane))).toEqual(before);
  });

  test('invalid lifecycle slots fail before exchanging any state', () => {
    const pool = new OrganismBioStatePool(2);
    markIdentities(pool);
    const before = lanes(pool).map((lane) => Array.from(lane));
    for (const bad of [-1, 2, 0.5, NaN, Infinity]) {
      expect(() => pool.swapEntitySlots(0, bad)).toThrow(RangeError);
      expect(() => pool.clearEntitySlot(bad)).toThrow(RangeError);
    }
    expect(lanes(pool).map((lane) => Array.from(lane))).toEqual(before);
  });

  test('active population controls habitat classification and excludes unused scratch capacity', () => {
    const big = new OrganismBioStatePool(20_000);
    const small = new OrganismBioStatePool(1);
    const padded = fixture(20_000);
    const compact = fixture(1);
    padded.y[0] = compact.y[0] = 350; // audit #202: platform-scale canopy band
    padded.velocity.fill(123);
    step(big, padded, 0.016, 0, 20_000, 1);
    step(small, compact);
    expect(slot(big, 0)).toEqual(slot(small, 0));
    expect(big.stratumIndex[0]).toBe(3);
    expect(padded.velocity[0]).toBe(compact.velocity[0]);
    expect(padded.velocity[1]).toBe(123);
    expect(padded.velocity[19_999]).toBe(123);
    expect(big.summarize(1)).toEqual(small.summarize(1));
  });

  test('zero, negative and nonfinite dt cannot advance memory, physiology or entropy', () => {
    const pool = new OrganismBioStatePool(4);
    markIdentities(pool);
    const before = lanes(pool).map((lane) => Array.from(lane));
    const input = fixture(4);
    const entropy = spyOn(globalThis.crypto, 'getRandomValues');
    try {
      for (const dt of [0, -0.01, NaN, Infinity]) {
        input.velocity.fill(7);
        input.energyDelta.fill(8);
        input.scale.fill(9);
        step(pool, input, dt, 1, 3, 4, 173, true);
        expect(lanes(pool).map((lane) => Array.from(lane))).toEqual(before);
        expect(Array.from(input.velocity)).toEqual([7, 0, 0, 7]);
        expect(Array.from(input.energyDelta)).toEqual([8, 0, 0, 8]);
        expect(Array.from(input.scale)).toEqual([9, 1, 1, 9]);
      }
      expect(entropy).not.toHaveBeenCalled();
    } finally {
      entropy.mockRestore();
    }
  });

  test('cadenced filters and independent affinity trace advance for the full elapsed duration', () => {
    const batched = new OrganismBioStatePool(1);
    const incremental = new OrganismBioStatePool(1);
    const batchInput = fixture(1);
    const frameInput = fixture(1);
    step(batched, batchInput, 12 * 0.016);
    for (let frame = 0; frame < 12; frame++) step(incremental, frameInput, 0.016);
    expect(batched.dopamine[0]).toBeCloseTo(incremental.dopamine[0]!, 6);
    expect(batched.serotonin[0]).toBeCloseTo(incremental.serotonin[0]!, 6);
    expect(batched.noradrenaline[0]).toBeCloseTo(incremental.noradrenaline[0]!, 6);
    expect(batched.memoryTrace[3]).toBeCloseTo(incremental.memoryTrace[3]!, 6);
    const da = batched.dopamine[0]!;
    const na = batched.noradrenaline[0]!;
    const expectedEnergy = (0.42 * (0.7 + 0.6 * da) - 0.22 * (1 + 0.4 * na)) * 0.192;
    expect(batchInput.energyDelta[0]).toBeCloseTo(expectedEnergy, 7);
    expect(batchInput.energyDelta[0]).toBeGreaterThan(frameInput.energyDelta[0]! * 10);
  });

  test('sub-millisecond dt is not promoted to a larger simulation step', () => {
    const pool = new OrganismBioStatePool(1);
    const input = fixture(1);
    step(pool, input, 0.0001);
    expect(input.energyDelta[0]).toBeGreaterThan(0);
    expect(input.energyDelta[0]).toBeLessThan(0.0001);
    expect(Math.abs(pool.dopamine[0]! - 0.5)).toBeLessThan(0.00001);
  });

  test('stable entity identity keeps stochastic impulse unchanged by earlier deaths', () => {
    const original = new OrganismBioStatePool(2);
    const shifted = original.clone();
    const input = fixture(2);
    input.ids[1] = 9876;
    const compact = fixture(1);
    compact.ids[0] = input.ids[1]!;
    shifted.swapEntitySlots(1, 0);
    shifted.clearEntitySlot(1);
    step(original, input);
    step(shifted, compact, 0.016, 0, 1, 1);
    expect(input.velocity[1]).toBe(compact.velocity[0]);
    expect(slot(original, 1)).toEqual(slot(shifted, 0));
    const other = fixture(1);
    step(new OrganismBioStatePool(1), other);
    expect(other.velocity[0]).not.toBe(compact.velocity[0]);
  });

  test('one captured wild seed gives exact forward versus reverse shard results without more entropy', () => {
    const entropy = spyOn(globalThis.crypto, 'getRandomValues');
    try {
      const seed = prepareParallelCounterSeed(173, 73, true);
      expect(entropy).toHaveBeenCalledTimes(1);
      const full = new OrganismBioStatePool(16);
      const partitioned = new OrganismBioStatePool(16);
      const allInput = fixture(16);
      const shardInput = fixture(16);
      for (let i = 0; i < 16; i++) {
        allInput.y[i] = shardInput.y[i] = i * 4 - 20;
        allInput.age[i] = shardInput.age[i] = i * 60;
      }
      step(full, allInput, 0.2, 0, 16, 16, seed);
      for (let start = 12; start >= 0; start -= 4)
        step(partitioned, shardInput, 0.2, start, start + 4, 16, seed);
      expect(lanes(partitioned)).toEqual(lanes(full));
      expect(shardInput.velocity).toEqual(allInput.velocity);
      expect(shardInput.energyDelta).toEqual(allInput.energyDelta);
      expect(shardInput.scale).toEqual(allInput.scale);
      expect(entropy).toHaveBeenCalledTimes(1);
    } finally {
      entropy.mockRestore();
    }
  });

  test('direct wild shard call samples once, regardless of its organism count', () => {
    const entropy = spyOn(globalThis.crypto, 'getRandomValues');
    try {
      step(new OrganismBioStatePool(128), fixture(128), 0.2, 0, 128, 128, 173, true);
      expect(entropy).toHaveBeenCalledTimes(1);
      step(new OrganismBioStatePool(1), fixture(1), 0.2, 0, 0, 0, 173, true);
      expect(entropy).toHaveBeenCalledTimes(1);
    } finally {
      entropy.mockRestore();
    }
  });

  test('developmental profiles preserve original physiological values across all four categories', () => {
    const cases = [
      [50, 60, 'larval_spore', 0, 0.792, 1.12, 0.75, 0.82, 'benthic_reef'],
      [300, 60, 'juvenile_forager', 1, 0.945, 1.24, 1, 0.88, 'photonic_canopy'],
      [600, 60, 'mature_symbiont', 2, 1.158, 1.05, 1.25, 0.93, 'benthic_reef'],
      [900, 85, 'elder_apex', 3, 1.406, 1, 1.5, 0.97, 'aetherial_crown'],
    ] as const;
    const input = fixture(cases.length);
    const pool = new OrganismBioStatePool(cases.length);
    for (const [i, c] of cases.entries()) {
      const profile = evaluateOrganismLifeStage(c[0], 1000, c[1], 2);
      expect(profile.stage).toBe(c[2]);
      expect(profile.stageIndex).toBe(c[3]);
      expect(profile.morphScaleMultiplier).toBeCloseTo(c[4], 12);
      expect(profile.speedMultiplier).toBeCloseTo(c[5], 12);
      expect(profile.connectomeGain).toBe(c[6]);
      expect(profile.memoryRetention).toBe(c[7]);
      expect(profile.preferredStratum).toBe(c[8]);
      input.age[i] = c[0];
      input.energy[i] = c[1];
      input.act[i] = 2;
    }
    step(pool, input);
    for (let i = 0; i < cases.length; i++) {
      expect(input.scale[i]).toBe(Math.fround(cases[i]![4]));
      expect(pool.lifeStageIndex[i]).toBe(cases[i]![3]);
    }
    const saved = evaluateOrganismLifeStage(50, 1000, 60, 2);
    evaluateOrganismLifeStage(900, 1000, 85, 2);
    expect(saved.stage).toBe('larval_spore');
  });
});
