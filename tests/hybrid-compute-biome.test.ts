import { describe, expect, test } from 'bun:test';
import {
  philoxCounter32,
  sampleParallelCounter01,
  fillParallelCounterShard,
  createParallelEntityRng,
} from '../src/math/wild-entropy';
import {
  detectHybridHardware,
  getBaselineHybridHardware,
  planHybridPartition,
  executeHybridEntityBrainBatch,
  type HybridHardwareCapabilities,
} from '../src/core/hybrid-compute';
import {
  BIOME_STRATA,
  computeHabitatEnvelope,
  resolveBiomeStratum,
  evaluateOrganismLifeStage,
  OrganismBioStatePool,
} from '../src/sim/biome-strata';
import { executeHybridShardWorkerKernel } from '../src/workers/simulation-worker';

describe('Track 1: Custom deterministic counter hash', () => {
  test('legacy hash alias and samples repeat, stay bounded, and distinguish the selected channels', () => {
    const u0 = sampleParallelCounter01(0x12345678, 42, 7, 0);
    const u1 = sampleParallelCounter01(0x12345678, 42, 7, 1);
    const u0Repeat = sampleParallelCounter01(0x12345678, 42, 7, 0);

    expect(u0).toBe(u0Repeat);
    expect(u0).toBeGreaterThanOrEqual(0);
    expect(u0).toBeLessThan(1);
    expect(u1).toBeGreaterThanOrEqual(0);
    expect(u1).toBeLessThan(1);
    expect(u0).not.toBe(u1);

    const raw = philoxCounter32(0x12345678, 42, 7, 0);
    expect(Number.isInteger(raw)).toBe(true);
    expect(raw).toBeGreaterThanOrEqual(0);
  });

  test('fillParallelCounterShard is 100% shard-count and execution-order invariant (1 shard vs 16 reversed shards)', () => {
    const N = 256;
    const seed = 0x9e3779b9;
    const tick = 120;
    const singleShard = new Float32Array(N);
    fillParallelCounterShard(singleShard, seed, tick, 0, N, 2, false);

    const multiShard = new Float32Array(N);
    const shards = 16;
    const span = N / shards;
    // Execute shards in reverse order to prove zero sequential lockstep dependency
    for (let s = shards - 1; s >= 0; s--) {
      const start = s * span;
      fillParallelCounterShard(
        multiShard.subarray(start, start + span),
        seed,
        tick,
        start,
        span,
        2,
        false,
      );
    }

    expect(multiShard).toEqual(singleShard);
  });

  test('createParallelEntityRng advances sub-draw channels deterministically per entity', () => {
    const rngA = createParallelEntityRng(777, 10, 99);
    const rngB = createParallelEntityRng(777, 10, 99);
    const rngOtherEntity = createParallelEntityRng(777, 10, 100);

    const seqA = [rngA(), rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB(), rngB()];
    const seqOther = [rngOtherEntity(), rngOtherEntity(), rngOtherEntity(), rngOtherEntity()];

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqOther);
  });
});

describe('Track 2 & Track 3: Capability proposals and synchronous CPU/WASM helpers', () => {
  test('capability detection and hypothetical CPU/GPU/NPU partition retain proposal semantics', async () => {
    const detected = await detectHybridHardware(50);
    expect(detected.cpuLogicalCores).toBeGreaterThanOrEqual(1);
    const baseline = getBaselineHybridHardware();
    expect(baseline.workerCount).toBeGreaterThanOrEqual(1);

    const fullCaps: HybridHardwareCapabilities = {
      cpuLogicalCores: 16,
      workerCount: 15,
      sharedArrayBufferAvailable: true,
      zigWasmAvailable: true,
      zigWasmSimdAvailable: false,
      webGpuComputeAvailable: true,
      webGpuAdapterName: 'NVIDIA RTX WebGPU',
      webNnNpuAvailable: true,
      webNnDeviceType: 'npu',
    };

    const plan = planHybridPartition(50_000, 600_000, fullCaps);
    expect(plan.kind).toBe('proposal-only');
    expect(plan.proposedConnectomeLinks).toBe(plan.activeConnectomeLinks);
    expect(plan.shards.length).toBeGreaterThanOrEqual(4);
    expect(plan.gpuAssignedEntities + plan.npuAssignedEntities + plan.cpuAssignedEntities).toBe(
      50_000,
    );
    expect(plan.gpuAssignedEntities).toBeGreaterThan(20_000);
    expect(plan.npuAssignedEntities).toBeGreaterThan(5_000);
    expect(plan.activeConnectomeLinks).toBeLessThan(600_000);
    expect(plan.connectomeCameraCullRatio).toBeLessThan(1.0);
  });

  test('direct CPU/WASM batch and shard helpers produce finite, shard-invariant outputs', () => {
    const count = 32;
    const weights = new Float32Array(count * 70);
    const inputs = new Float32Array(count * 6);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = Math.sin(i * 0.17) * 0.35;
    }
    for (let i = 0; i < inputs.length; i++) {
      inputs[i] = Math.cos(i * 0.23) * 0.8;
    }

    const planSingle = planHybridPartition(
      count,
      100,
      getBaselineHybridHardware({ workerCount: 1 }),
    );
    const fullOut = new Float32Array(count * 4);
    executeHybridEntityBrainBatch(weights, inputs, fullOut, planSingle, 1234, 10, false);
    for (let i = 0; i < fullOut.length; i++) {
      expect(Number.isFinite(fullOut[i])).toBe(true);
      expect(Math.abs(fullOut[i]!)).toBeLessThanOrEqual(2.0);
    }

    // Directly invoke two synchronous helpers; this is not a worker-dispatch test.
    const half = 16;
    const shard0 = executeHybridShardWorkerKernel(
      weights.subarray(0, half * 70),
      inputs.subarray(0, half * 6),
      half,
      1234,
      10,
      0,
    );
    const shard1 = executeHybridShardWorkerKernel(
      weights.subarray(half * 70, count * 70),
      inputs.subarray(half * 6, count * 6),
      half,
      1234,
      10,
      half,
    );

    const combinedOut = new Float32Array(count * 4);
    combinedOut.set(shard0.outputs, 0);
    combinedOut.set(shard1.outputs, half * 4);
    expect(combinedOut).toEqual(fullOut);
    expect(shard0.entropyProbe.length).toBe(half);
    expect(shard1.entropyProbe.length).toBe(half);
  });
});

describe('Track 4: Expanded 3D Multi-Biome Strata & Deep Organism Bio-State', () => {
  test('computeHabitatEnvelope preserves 1.0 scale at <= 10,000 entities and expands by sqrt(N/10000) at ultra/mega', () => {
    expect(BIOME_STRATA.length).toBe(5);

    const envDesktop = computeHabitatEnvelope(10_000);
    expect(envDesktop.horizontalScale).toBe(1.0);
    expect(envDesktop.verticalScale).toBe(1.0);

    const envUltra = computeHabitatEnvelope(25_000);
    expect(envUltra.horizontalScale).toBeCloseTo(Math.sqrt(2.5), 5);
    expect(envUltra.effectiveRadius).toBeGreaterThan(envDesktop.effectiveRadius);

    const envMega = computeHabitatEnvelope(50_000);
    expect(envMega.horizontalScale).toBeCloseTo(Math.sqrt(5.0), 5);
    expect(envMega.effectiveVerticalSpan).toBeGreaterThan(envDesktop.effectiveVerticalSpan);
    expect(envMega.volumeFactor).toBeGreaterThan(5.0);
  });

  test('resolveBiomeStratum maps vertical altitudes across all 5 ecological strata and evaluateOrganismLifeStage covers all 4 stages', () => {
    const abyss = resolveBiomeStratum(30);
    const benthic = resolveBiomeStratum(100);
    const thermocline = resolveBiomeStratum(200);
    const canopy = resolveBiomeStratum(350);
    const crown = resolveBiomeStratum(560);

    expect(abyss.id).toBe('hadal_abyss');
    expect(benthic.id).toBe('benthic_reef');
    expect(thermocline.id).toBe('quantum_thermocline');
    expect(canopy.id).toBe('photonic_canopy');
    expect(crown.id).toBe('aetherial_crown');

    expect(evaluateOrganismLifeStage(50, 1000, 60).stage).toBe('larval_spore');
    expect(evaluateOrganismLifeStage(300, 1000, 60).stage).toBe('juvenile_forager');
    expect(evaluateOrganismLifeStage(600, 1000, 60).stage).toBe('mature_symbiont');
    expect(evaluateOrganismLifeStage(900, 1000, 85).stage).toBe('elder_apex');
  });

  test('OrganismBioStatePool.stepShard updates neuromodulators and 4-channel working memory with exact shard-count invariance', () => {
    const N = 64;
    const yPos = new Float32Array(N);
    const energies = new Float32Array(N);
    const ages = new Float32Array(N);
    const lives = new Float32Array(N);
    const acts = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      yPos[i] = -30 + (i / N) * 80;
      energies[i] = 35 + 60 * ((i % 7) / 6);
      ages[i] = (i * 18) % 1000;
      lives[i] = 1000;
      acts[i] = Math.sin(i * 0.3) * 2;
    }

    const poolSingle = new OrganismBioStatePool(N);
    const velYSingle = new Float32Array(N);
    const eDeltaSingle = new Float32Array(N);
    const scaleSingle = new Float32Array(N);
    poolSingle.stepShard(
      yPos,
      energies,
      ages,
      lives,
      acts,
      velYSingle,
      eDeltaSingle,
      scaleSingle,
      0,
      N,
      999,
      12,
      2.5,
      0.016,
      false,
    );
    const summarySingle = poolSingle.summarize(N);

    const poolSharded = new OrganismBioStatePool(N);
    const velYSharded = new Float32Array(N);
    const eDeltaSharded = new Float32Array(N);
    const scaleSharded = new Float32Array(N);
    for (let s = 3; s >= 0; s--) {
      poolSharded.stepShard(
        yPos,
        energies,
        ages,
        lives,
        acts,
        velYSharded,
        eDeltaSharded,
        scaleSharded,
        s * 16,
        (s + 1) * 16,
        999,
        12,
        2.5,
        0.016,
        false,
      );
    }
    const summarySharded = poolSharded.summarize(N);

    expect(poolSharded.dopamine).toEqual(poolSingle.dopamine);
    expect(poolSharded.serotonin).toEqual(poolSingle.serotonin);
    expect(poolSharded.noradrenaline).toEqual(poolSingle.noradrenaline);
    expect(poolSharded.memoryTrace).toEqual(poolSingle.memoryTrace);
    expect(velYSharded).toEqual(velYSingle);
    expect(eDeltaSharded).toEqual(eDeltaSingle);
    expect(scaleSharded).toEqual(scaleSingle);
    expect(summarySharded).toEqual(summarySingle);
    expect(summarySingle.stratumCounts.reduce((a, b) => a + b, 0)).toBe(N);
    expect(summarySingle.stageCounts.reduce((a, b) => a + b, 0)).toBe(N);
  });
});
