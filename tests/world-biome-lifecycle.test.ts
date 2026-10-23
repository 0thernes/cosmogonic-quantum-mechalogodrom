/** Actual World biology coordinator + real EntityManager lifecycle, without a WebGL boot. */
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import * as THREE from 'three';
import { World } from '../src/world';
import { EntityManager } from '../src/sim/entities';
import { EntityBrainField } from '../src/sim/entity-brain';
import { OrganismBioStatePool } from '../src/sim/biome-strata';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { getQuantizationConfig } from '../src/math/quantization';
import { getBaselineHybridHardware } from '../src/core/hybrid-compute';
import * as hybrid from '../src/core/hybrid-compute';
import * as entropy from '../src/math/wild-entropy';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

type BioCoordinator = {
  attachOrganismBioLifecycle(): void;
  advanceOrganismBiome(dt: number, stride: number): void;
  probeOrganismHardware(): Promise<void>;
  bioElapsed: number;
  bioVelYDelta: Float32Array;
  bioEntityIds: Uint32Array;
};

const cleanup: (() => void)[] = [];
afterEach(() => {
  mock.restore();
  for (const fn of cleanup.splice(0)) fn();
});

function harness(count = 5, capacity = 16, wild = false) {
  const rng = mulberry32(123);
  const geos = createGeometryCache();
  const state: SimState = {
    chaos: 0.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
  const context: SimContext = {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone',
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: capacity,
      targetEntities: capacity,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state,
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
  const entities = new EntityManager(context);
  const brains = new EntityBrainField(capacity, mulberry32(456));
  const pool = new OrganismBioStatePool(capacity);
  const abort = new AbortController();
  const world = Object.create(World.prototype) as World;
  Object.assign(world, {
    entities,
    entityBrains: brains,
    organismBioPool: pool,
    disposeAbort: abort,
    state,
    persisted: { seed: 123 },
    computeCadence: { tsotchkeWaveStride: 3 },
    isWildMode: () => wild,
    bioYPositions: new Float32Array(capacity),
    bioEntityIds: new Uint32Array(capacity),
    bioEnergies: new Float32Array(capacity),
    bioAges: new Float32Array(capacity),
    bioLives: new Float32Array(capacity),
    bioActivations: new Float32Array(capacity),
    bioVelYDelta: new Float32Array(capacity),
    bioEnergyDelta: new Float32Array(capacity),
    bioScaleMul: new Float32Array(capacity),
    bioElapsed: 0,
    latestBiomeSummary: null,
    latestBiomeExecution: null,
    latestHybridPlan: null,
    hybridHardware: getBaselineHybridHardware({
      webGpuComputeAvailable: true,
      webNnNpuAvailable: true,
      webNnDeviceType: 'npu',
      workerCount: 8,
    }),
    connectome: { links: 200_000 },
  });
  const coordinator = world as unknown as BioCoordinator;
  coordinator.attachOrganismBioLifecycle();
  entities.reset(count);
  cleanup.push(() => {
    entities.reset(0);
    for (const geometry of geos) geometry.dispose();
  });
  return { world, coordinator, pool, brains, entities, state, abort };
}

function markIdentities(h: ReturnType<typeof harness>) {
  for (let i = 0; i < h.entities.list.length; i++) {
    h.pool.dopamine[i] = (i + 1) / 16;
    h.pool.memoryTrace[i * 4] = i + 10;
    h.brains.genomeAt(i)[0] = i + 100;
  }
}

describe('World organism biology lifecycle and execution truth', () => {
  test('real single death moves each survivor biology and brain with its entity identity', () => {
    const h = harness();
    markIdentities(h);
    const survivors = h.entities.list.slice(1);
    h.entities.disposeAt(0);
    expect(h.entities.list).toEqual(survivors);
    for (let i = 0; i < survivors.length; i++) {
      expect(h.pool.dopamine[i]).toBe((i + 2) / 16);
      expect(h.pool.memoryTrace[i * 4]).toBe(i + 11);
      expect(h.brains.genomeAt(i)[0]).toBe(i + 101);
    }
    expect(h.pool.dopamine[4]).toBe(0.5);
    expect(h.pool.memoryTrace[16]).toBe(0);
  });

  test('real mass compaction preserves separate survivor histories and clears retired slots', () => {
    const h = harness(6);
    markIdentities(h);
    const survivors = [h.entities.list[0]!, h.entities.list[2]!, h.entities.list[4]!];
    expect(h.entities.disposeManyDescending([5, 3, 1])).toBe(3);
    expect(h.entities.list).toEqual(survivors);
    for (let i = 0; i < 3; i++) {
      expect(h.pool.memoryTrace[i * 4]).toBe(10 + i * 2);
      expect(h.brains.genomeAt(i)[0]).toBe(100 + i * 2);
    }
    expect(Array.from(h.pool.memoryTrace.slice(12, 24))).toEqual(Array(12).fill(0));
  });

  test('a newborn reusing a vacated list slot cannot inherit deceased biology', () => {
    const h = harness(3);
    markIdentities(h);
    const oldId = h.entities.list[2]!.userData.ecologyId;
    h.entities.disposeAt(2);
    const newborn = h.entities.spawn(new THREE.Vector3(0, 10, 0), 0)!;
    expect(newborn.userData.ecologyId).not.toBe(oldId);
    expect(h.pool.dopamine[2]).toBe(0.5);
    expect(Array.from(h.pool.memoryTrace.slice(8, 12))).toEqual([0, 0, 0, 0]);
    expect(h.brains.adaptiveStateAt(2).ready).toBe(false);
  });

  test('Genesis through EntityManager resets memory, identity epoch, pending time and receipts', () => {
    const h = harness();
    h.state.frame = 3;
    h.coordinator.advanceOrganismBiome(0.03, 3);
    expect(h.world.getBiomeExecution()).not.toBeNull();
    h.state.frame = 4;
    h.coordinator.advanceOrganismBiome(0.02, 3);
    expect(h.coordinator.bioElapsed).toBe(0.02);
    h.entities.reset(1);
    expect(h.entities.list[0]!.userData.ecologyId).toBe(1);
    expect(h.coordinator.bioElapsed).toBe(0);
    expect(h.world.getBiomeSummary()).toBeNull();
    expect(h.world.getBiomeExecution()).toBeNull();
    expect(h.world.getHybridWorkloadPlan()).toBeNull();
    expect(h.pool.memoryTrace.every((value) => value === 0)).toBe(true);
    h.state.frame = 6;
    h.coordinator.advanceOrganismBiome(0.01, 3);
    expect(h.world.getBiomeExecution()?.elapsedSimulationSeconds).toBe(0.01);
  });

  test('unequal frame deltas accumulate actual simulation time instead of last delta times stride', () => {
    const h = harness();
    for (const [frame, dt] of [
      [1, 0.01],
      [2, 0.02],
    ] as const) {
      h.state.frame = frame;
      h.coordinator.advanceOrganismBiome(dt, 3);
      expect(h.world.getBiomeExecution()).toBeNull();
    }
    h.state.frame = 3;
    h.coordinator.advanceOrganismBiome(0.04, 3);
    expect(h.world.getBiomeExecution()?.elapsedSimulationSeconds).toBeCloseTo(0.07, 12);
    expect(h.coordinator.bioElapsed).toBe(0);
  });

  test('allocated capacity does not expand the habitat occupied by a small active population', () => {
    const h = harness(2, 20_000);
    for (const e of h.entities.list) e.position.y = 10;
    h.state.frame = 1;
    h.coordinator.advanceOrganismBiome(0.01, 1);
    expect(h.world.getBiomeSummary()?.population).toBe(2);
    expect(h.world.getBiomeSummary()?.habitatEnvelope.verticalScale).toBe(1);
    expect(h.world.getBiomeSummary()?.stratumCounts).toEqual([0, 0, 0, 2, 0]);
  });

  test('GPU/NPU proposals do not masquerade as execution: one actual CPU range and zero accelerator entities', () => {
    const h = harness(10);
    const step = spyOn(h.pool, 'stepShard');
    h.state.frame = 1;
    h.coordinator.advanceOrganismBiome(0.01, 1);
    expect(h.world.getHybridWorkloadPlan()?.kind).toBe('proposal-only');
    expect(h.world.getHybridWorkloadPlan()?.gpuAssignedEntities).toBe(5);
    expect(h.world.getHybridWorkloadPlan()?.npuAssignedEntities).toBe(2);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step.mock.calls[0]![8]).toBe(0);
    expect(step.mock.calls[0]![9]).toBe(10);
    expect(h.world.getBiomeExecution()).toMatchObject({
      kind: 'execution',
      backend: 'cpu-main',
      frame: 1,
      population: 10,
      gpuExecutedEntities: 0,
      npuExecutedEntities: 0,
      coupledEntities: 0,
    });
    expect(Object.isFrozen(h.world.getBiomeExecution())).toBe(true);
  });

  test('Wild coupling samples one batch seed, respects NHI authority and adds no five-energy floor', () => {
    const h = harness(5, 16, true);
    const seed = spyOn(entropy, 'prepareParallelCounterSeed').mockReturnValue(9876);
    const nhi = h.entities.list[4]!;
    nhi.userData.isNhi = true;
    for (const e of h.entities.list) {
      e.userData.energy = 0;
      e.userData.vel.y = 0;
      e.position.y = 10;
    }
    h.state.frame = 1;
    h.coordinator.advanceOrganismBiome(0.01, 1);
    // The pool may normalize the supplied seed with wild=false; only this outer call harvests salt.
    expect(seed.mock.calls.filter((args) => args[2] === true)).toHaveLength(1);
    expect(seed).toHaveBeenCalledWith(123, 1, true);
    for (const e of h.entities.list.slice(0, 4)) {
      expect(e.userData.vel.y).not.toBe(0);
      expect(e.userData.energy).toBeGreaterThanOrEqual(0);
      expect(e.userData.energy).toBeLessThan(5);
    }
    expect(nhi.userData.energy).toBe(0);
    expect(nhi.userData.vel.y).toBe(0);
    expect(h.world.getBiomeExecution()).toMatchObject({
      entropyMode: 'wild-batch',
      batchSeed: 9876,
      coupledEntities: 4,
    });
  });

  test('seeded biology updates state without changing reference organism energy or velocity', () => {
    const h = harness(3);
    const before = h.entities.list.map((e) => [e.userData.energy, e.userData.vel.y]);
    h.state.frame = 1;
    h.coordinator.advanceOrganismBiome(0.02, 1);
    expect(h.entities.list.map((e) => [e.userData.energy, e.userData.vel.y])).toEqual(before);
    expect(h.pool.memoryTrace.some((value) => value !== 0)).toBe(true);
    expect(h.world.getBiomeExecution()?.coupledEntities).toBe(0);
  });

  test('the survivor counter stream remains stable after real list compaction', () => {
    const reference = harness(3);
    const compacted = harness(3);
    for (const h of [reference, compacted]) {
      h.state.frame = 1;
      h.coordinator.advanceOrganismBiome(0.02, 1);
    }
    const survivorId = compacted.entities.list[1]!.userData.ecologyId;
    compacted.entities.disposeAt(0);
    for (const h of [reference, compacted]) {
      h.state.frame = 2;
      h.coordinator.advanceOrganismBiome(0.03, 1);
    }
    expect(compacted.entities.list[0]!.userData.ecologyId).toBe(survivorId);
    expect(compacted.coordinator.bioEntityIds[0]).toBe(reference.coordinator.bioEntityIds[1]!);
    expect(compacted.coordinator.bioVelYDelta[0]).toBe(reference.coordinator.bioVelYDelta[1]!);
    expect(compacted.pool.dopamine[0]).toBe(reference.pool.dopamine[1]!);
  });

  test('zero/invalid time, pause and disposal leave biology and entropy untouched', () => {
    const h = harness(3, 16, true);
    const seed = spyOn(entropy, 'prepareParallelCounterSeed');
    h.state.frame = 1;
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      h.coordinator.advanceOrganismBiome(dt, 1);
    }
    h.state.timeScale = 0;
    h.coordinator.advanceOrganismBiome(0.1, 1);
    h.state.timeScale = 1;
    h.abort.abort();
    h.coordinator.advanceOrganismBiome(0.1, 1);
    expect(seed).not.toHaveBeenCalled();
    expect(h.coordinator.bioElapsed).toBe(0);
    expect(h.world.getBiomeExecution()).toBeNull();
    expect(h.pool.memoryTrace.every((value) => value === 0)).toBe(true);
  });

  test('an empty batch produces a zero-population receipt without harvesting entropy', () => {
    const h = harness(0, 16, true);
    const seed = spyOn(entropy, 'prepareParallelCounterSeed');
    h.state.frame = 1;
    h.coordinator.advanceOrganismBiome(0.02, 1);
    expect(seed).not.toHaveBeenCalled();
    expect(h.world.getBiomeExecution()).toMatchObject({
      population: 0,
      batchSeed: null,
      coupledEntities: 0,
    });
    expect(h.world.getBiomeSummary()?.population).toBe(0);
  });

  test('actual World suspended and frozen branches do not reach biology execution', () => {
    const h = harness(3, 16, true);
    const advance = spyOn(h.coordinator, 'advanceOrganismBiome');
    let suspended = 0;
    let frozen = 0;
    Object.assign(h.world, {
      wilderness: { setPaused: () => undefined },
      browserComputeCalibrating: false,
      frozenAll: false,
      pauseVisualClock: 0,
      stepSuspended: () => {
        suspended++;
      },
      stepFrozen: () => {
        frozen++;
      },
    });
    h.state.timeScale = 0;
    h.world.step(0.02);
    Object.assign(h.world, { frozenAll: true });
    h.world.step(0.02);
    expect(suspended).toBe(1);
    expect(frozen).toBe(1);
    expect(advance).not.toHaveBeenCalled();
    expect(h.world.getBiomeExecution()).toBeNull();
  });

  test('a late hardware probe cannot publish capabilities into a disposed World', async () => {
    const h = harness();
    const baseline = h.world.getHybridHardware();
    let resolve!: (caps: hybrid.HybridHardwareCapabilities) => void;
    const pending = new Promise<hybrid.HybridHardwareCapabilities>((done) => {
      resolve = done;
    });
    const probe = spyOn(hybrid, 'detectHybridHardware').mockReturnValue(pending);
    const active = h.coordinator.probeOrganismHardware();
    h.abort.abort();
    resolve(getBaselineHybridHardware({ webGpuAdapterName: 'late probe' }));
    await active;
    expect(h.world.getHybridHardware()).toBe(baseline);
    await h.coordinator.probeOrganismHardware();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  test('mode transitions retain physiology but never carry old-mode time into new live coupling', () => {
    const h = harness(3);
    const previousMode = entropy.isWildEntropyMode();
    try {
      entropy.setWildEntropyMode(false);
      Reflect.deleteProperty(h.world, 'isWildMode'); // exercise the production mode getter/setter
      Object.assign(h.world, {
        wilderness: {
          invalidatePending: () => undefined,
          setBatchExecutor: () => undefined,
          setPaused: () => undefined,
        },
        browserComputeGeneration: 0,
        audit: { record: () => undefined },
      });
      h.pool.memoryTrace[0] = 0.25;
      h.state.frame = 1;
      h.coordinator.advanceOrganismBiome(0.02, 3);
      h.world.setWildMode(false); // a redundant selection is not a time discontinuity
      expect(h.coordinator.bioElapsed).toBe(0.02);
      h.world.setWildMode(true);
      expect(h.coordinator.bioElapsed).toBe(0);
      expect(h.pool.memoryTrace[0]).toBe(0.25);
      h.state.frame = 3;
      h.coordinator.advanceOrganismBiome(0.01, 3);
      expect(h.world.getBiomeExecution()).toMatchObject({
        entropyMode: 'wild-batch',
        elapsedSimulationSeconds: 0.01,
        coupledEntities: 3,
      });
    } finally {
      entropy.setWildEntropyMode(previousMode);
    }
  });
});
