/**
 * Five vertical habitat bands and a phenomenological organism physiology/memory model.
 * World executes this pool on the main CPU, with buoyancy and nutrient-energy coupling in live wild
 * mode. Three named neuromodulatory scalars and four recurrent traces are computational mechanisms,
 * not measurements of biological neurotransmitters or evidence of consciousness. Horizontal habitat,
 * drag, quantum coupling and developmental scale/speed fields are descriptors until a caller applies
 * them. The pool itself neither resizes rendered habitat nor dispatches GPU/NPU/worker computation.
 */

import { clamp, clamp01 } from '../math/scalar';
import { prepareParallelCounterSeed, sampleParallelCounter01 } from '../math/wild-entropy';

export type BiomeStratumId =
  'hadal_abyss' | 'benthic_reef' | 'quantum_thermocline' | 'photonic_canopy' | 'aetherial_crown';

export type OrganismLifeStage =
  'larval_spore' | 'juvenile_forager' | 'mature_symbiont' | 'elder_apex';

export interface BiomeStratumSpec {
  readonly id: BiomeStratumId;
  readonly index: 0 | 1 | 2 | 3 | 4;
  readonly label: string;
  readonly yMin: number;
  readonly yMax: number;
  readonly yCenter: number;
  /** Passive metabolic energy harvest rate per second in this stratum. */
  readonly nutrientFlux: number;
  /** Velocity damping multiplier (higher in deep abyss, lower in aetherial crown). */
  readonly dragFactor: number;
  /** Social cooperation / symbiosis payoff multiplier (highest in benthic reef). */
  readonly symbiosisGain: number;
  /** Quantum coherence & connectome propagation gain. */
  readonly quantumCoupling: number;
}

export const BIOME_STRATA: readonly BiomeStratumSpec[] = [
  {
    id: 'hadal_abyss',
    index: 0,
    label: 'Hadal Geothermal Abyss',
    yMin: -48,
    yMax: -14,
    yCenter: -26,
    nutrientFlux: 0.42,
    dragFactor: 0.94,
    symbiosisGain: 1.05,
    quantumCoupling: 1.15,
  },
  {
    id: 'benthic_reef',
    index: 1,
    label: 'Benthic Biomorphic Reef',
    yMin: -14,
    yMax: -3,
    yCenter: -8,
    nutrientFlux: 0.58,
    dragFactor: 0.96,
    symbiosisGain: 1.35,
    quantumCoupling: 1.1,
  },
  {
    id: 'quantum_thermocline',
    index: 2,
    label: 'Quantum Thermocline Mixing Layer',
    yMin: -3,
    yMax: 8,
    yCenter: 2.5,
    nutrientFlux: 0.48,
    dragFactor: 0.98,
    symbiosisGain: 1.18,
    quantumCoupling: 1.45,
  },
  {
    id: 'photonic_canopy',
    index: 3,
    label: 'Photonic Solar Canopy',
    yMin: 8,
    yMax: 24,
    yCenter: 15,
    nutrientFlux: 0.66,
    dragFactor: 0.985,
    symbiosisGain: 1.08,
    quantumCoupling: 1.2,
  },
  {
    id: 'aetherial_crown',
    index: 4,
    label: 'Aetherial Ionosphere Crown',
    yMin: 24,
    yMax: 64,
    yCenter: 38,
    nutrientFlux: 0.36,
    dragFactor: 0.992,
    symbiosisGain: 1.28,
    quantumCoupling: 1.6,
  },
] as const;

const STRATUM_INDEX: Readonly<Record<BiomeStratumId, number>> = {
  hadal_abyss: 0,
  benthic_reef: 1,
  quantum_thermocline: 2,
  photonic_canopy: 3,
  aetherial_crown: 4,
};

export interface HabitatEnvelope {
  /** Horizontal radius multiplier (1.0 at <= 10,000 entities; √(N/10000) above 10,000). */
  readonly horizontalScale: number;
  /** Vertical column multiplier (expands 3D strata depth at high populations). */
  readonly verticalScale: number;
  /** Effective arena radius in world units (base 540 * horizontalScale). */
  readonly effectiveRadius: number;
  /** Effective vertical half-span in world units. */
  readonly effectiveVerticalSpan: number;
  /** Relative 3D volume expansion factor (horizontalScale² × verticalScale). */
  readonly volumeFactor: number;
}

/**
 * Compute the 3D habitat expansion envelope.
 * Uses unit scales at <= 10,000 active entities; above that, horizontal scale is
 * min(2.5, √(N / 10000)) and vertical scale is min(2.2, 1 + 0.45 * log2(N / 10000)).
 * This numeric envelope does not itself expand rendered geometry or change query complexity.
 */
export function computeHabitatEnvelope(
  population: number,
  baseRadius = 540,
  baseVerticalSpan = 48,
): HabitatEnvelope {
  const safePop = Number.isFinite(population) ? Math.max(1, population) : 1000;
  const horizontalScale = safePop > 10_000 ? Math.min(2.5, Math.sqrt(safePop / 10_000)) : 1.0;
  const verticalScale =
    safePop > 10_000 ? Math.min(2.2, 1 + 0.45 * Math.log2(safePop / 10_000)) : 1.0;
  const effectiveRadius = baseRadius * horizontalScale;
  const effectiveVerticalSpan = baseVerticalSpan * verticalScale;
  return {
    horizontalScale,
    verticalScale,
    effectiveRadius,
    effectiveVerticalSpan,
    volumeFactor: horizontalScale * horizontalScale * verticalScale,
  };
}

/** Classify any world Y coordinate into its 3D ecological biome stratum. O(1). */
export function resolveBiomeStratum(y: number, verticalScale = 1): BiomeStratumSpec {
  const scale = Number.isFinite(verticalScale) && verticalScale > 0 ? verticalScale : 1;
  const normalizedY = Number.isFinite(y) ? y / scale : 0;
  if (normalizedY < -14) return BIOME_STRATA[0]!;
  if (normalizedY < -3) return BIOME_STRATA[1]!;
  if (normalizedY < 8) return BIOME_STRATA[2]!;
  if (normalizedY < 24) return BIOME_STRATA[3]!;
  return BIOME_STRATA[4]!;
}

export interface OrganismLifeStageProfile {
  readonly stage: OrganismLifeStage;
  readonly stageIndex: 0 | 1 | 2 | 3;
  readonly maturity: number;
  readonly morphScaleMultiplier: number;
  readonly speedMultiplier: number;
  readonly connectomeGain: number;
  readonly memoryRetention: number;
  readonly preferredStratum: BiomeStratumId;
}

type MutableLifeStageProfile = {
  -readonly [Key in keyof OrganismLifeStageProfile]: OrganismLifeStageProfile[Key];
};

/** Write a profile without allocating inside the organism loop. O(1). */
function writeLifeStageProfile(
  out: MutableLifeStageProfile,
  stage: OrganismLifeStage,
  stageIndex: 0 | 1 | 2 | 3,
  maturity: number,
  morphScaleMultiplier: number,
  speedMultiplier: number,
  connectomeGain: number,
  memoryRetention: number,
  preferredStratum: BiomeStratumId,
): OrganismLifeStageProfile {
  out.stage = stage;
  out.stageIndex = stageIndex;
  out.maturity = maturity;
  out.morphScaleMultiplier = morphScaleMultiplier;
  out.speedMultiplier = speedMultiplier;
  out.connectomeGain = connectomeGain;
  out.memoryRetention = memoryRetention;
  out.preferredStratum = preferredStratum;
  return out;
}

/**
 * Determine an organism's developmental life stage and physiological multipliers from its
 * normalized maturity (`age / life`), energy reserve (`0..100`), and neural firing (`act`).
 */
export function evaluateOrganismLifeStage(
  age: number,
  life: number,
  energy: number,
  act = 0,
): OrganismLifeStageProfile {
  return evaluateLifeStageInto(age, life, energy, act, {
    stage: 'larval_spore',
    stageIndex: 0,
    maturity: 0,
    morphScaleMultiplier: 1,
    speedMultiplier: 1,
    connectomeGain: 1,
    memoryRetention: 0,
    preferredStratum: 'benthic_reef',
  });
}

function evaluateLifeStageInto(
  age: number,
  life: number,
  energy: number,
  act: number,
  out: MutableLifeStageProfile,
): OrganismLifeStageProfile {
  const safeLife = Number.isFinite(life) && life > 0 ? life : 1000;
  const maturity = clamp01((Number.isFinite(age) ? age : 0) / safeLife);
  const wealth = clamp01((Number.isFinite(energy) ? energy : 50) / 100);
  const neural = clamp01(Math.abs(Number.isFinite(act) ? act : 0) / 4);

  if (maturity < 0.15) {
    return writeLifeStageProfile(
      out,
      'larval_spore',
      0,
      maturity,
      0.72 + 0.12 * wealth,
      1.08 + 0.08 * neural,
      0.75,
      0.82,
      wealth < 0.4 ? 'hadal_abyss' : 'benthic_reef',
    );
  }
  if (maturity < 0.45) {
    return writeLifeStageProfile(
      out,
      'juvenile_forager',
      1,
      maturity,
      0.9 + 0.15 * maturity,
      1.18 + 0.1 * wealth,
      1,
      0.88,
      wealth > 0.55 ? 'photonic_canopy' : 'quantum_thermocline',
    );
  }
  if (maturity < 0.8 || wealth < 0.45) {
    return writeLifeStageProfile(
      out,
      'mature_symbiont',
      2,
      maturity,
      1.05 + 0.18 * wealth,
      1.02 + 0.06 * neural,
      1.25,
      0.93,
      'benthic_reef',
    );
  }
  return writeLifeStageProfile(
    out,
    'elder_apex',
    3,
    maturity,
    1.24 + 0.16 * wealth + 0.06 * neural,
    0.94 + 0.12 * neural,
    1.5,
    0.97,
    'aetherial_crown',
  );
}

export interface OrganismBioTelemetry {
  readonly population: number;
  readonly stratumCounts: readonly [number, number, number, number, number];
  readonly stageCounts: readonly [number, number, number, number];
  readonly meanDopamine: number;
  readonly meanSerotonin: number;
  readonly meanNoradrenaline: number;
  readonly meanWorkingMemoryNorm: number;
  readonly habitatEnvelope: HabitatEnvelope;
}

/**
 * Structure-of-Arrays (SoA) pool holding per-organism neuromodulators (`dopamine`, `serotonin`,
 * `noradrenaline`), 4-channel recurrent working memory (`nutrient`, `threat`, `socialTrust`,
 * `stratumAffinity`), classified life-stage index, and current 3D biome stratum index.
 *
 * Persistent arrays and one profile scratch are allocated at construction. Each shard allocates an
 * envelope snapshot, but no objects inside its organism loop. Separate disjoint ranges can reuse a
 * captured batch seed; the current World caller executes one range synchronously on the main CPU.
 */
export class OrganismBioStatePool {
  readonly capacity: number;
  readonly dopamine: Float32Array;
  readonly serotonin: Float32Array;
  readonly noradrenaline: Float32Array;
  readonly prevEnergy: Float32Array;
  /** 4 floats per slot: [nutrientTrace, threatTrace, socialTrustTrace, stratumAffinityTrace]. */
  readonly memoryTrace: Float32Array;
  readonly stratumIndex: Uint8Array;
  readonly lifeStageIndex: Uint8Array;
  private readonly stageScratch: MutableLifeStageProfile = {
    stage: 'larval_spore',
    stageIndex: 0,
    maturity: 0,
    morphScaleMultiplier: 1,
    speedMultiplier: 1,
    connectomeGain: 1,
    memoryRetention: 0,
    preferredStratum: 'benthic_reef',
  };

  constructor(capacity: number) {
    this.capacity = Math.max(1, Math.trunc(capacity));
    this.dopamine = new Float32Array(this.capacity);
    this.serotonin = new Float32Array(this.capacity);
    this.noradrenaline = new Float32Array(this.capacity);
    this.prevEnergy = new Float32Array(this.capacity);
    this.memoryTrace = new Float32Array(this.capacity * 4);
    this.stratumIndex = new Uint8Array(this.capacity);
    this.lifeStageIndex = new Uint8Array(this.capacity);
    this.resetEntitySlots();
  }

  /** Exchange every physiology/memory lane when the entity list compacts. O(1). */
  swapEntitySlots(a: number, b: number): void {
    this.assertSlot(a);
    this.assertSlot(b);
    if (a === b) return;
    this.swapValue(this.dopamine, a, b);
    this.swapValue(this.serotonin, a, b);
    this.swapValue(this.noradrenaline, a, b);
    this.swapValue(this.prevEnergy, a, b);
    this.swapValue(this.stratumIndex, a, b);
    this.swapValue(this.lifeStageIndex, a, b);
    for (let channel = 0; channel < 4; channel++)
      this.swapValue(this.memoryTrace, a * 4 + channel, b * 4 + channel);
  }

  /** Remove a retired identity's recurrent state before a newborn reuses its slot. O(1). */
  clearEntitySlot(slot: number): void {
    this.assertSlot(slot);
    this.dopamine[slot] = 0.5;
    this.serotonin[slot] = 0.5;
    this.noradrenaline[slot] = 0.25;
    this.prevEnergy[slot] = 50;
    this.stratumIndex[slot] = 0;
    this.lifeStageIndex[slot] = 0;
    this.memoryTrace.fill(0, slot * 4, slot * 4 + 4);
  }

  /** Genesis reset clears every identity, including inactive tail storage. O(capacity). */
  resetEntitySlots(): void {
    this.dopamine.fill(0.5);
    this.serotonin.fill(0.5);
    this.noradrenaline.fill(0.25);
    this.prevEnergy.fill(50);
    this.memoryTrace.fill(0);
    this.stratumIndex.fill(0);
    this.lifeStageIndex.fill(0);
  }

  /** Independent copy of all persistent state, for simulation forks/controlled comparisons. O(capacity). */
  clone(): OrganismBioStatePool {
    const copy = new OrganismBioStatePool(this.capacity);
    copy.dopamine.set(this.dopamine);
    copy.serotonin.set(this.serotonin);
    copy.noradrenaline.set(this.noradrenaline);
    copy.prevEnergy.set(this.prevEnergy);
    copy.memoryTrace.set(this.memoryTrace);
    copy.stratumIndex.set(this.stratumIndex);
    copy.lifeStageIndex.set(this.lifeStageIndex);
    return copy;
  }

  private assertSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity)
      throw new RangeError(`bio slot must be an integer in [0,${this.capacity - 1}]`);
  }

  private swapValue(values: Float32Array | Uint8Array, a: number, b: number): void {
    const value = values[a]!;
    values[a] = values[b]!;
    values[b] = value;
  }

  /**
   * Step a contiguous shard [startSlot, endSlot) in O(end-start). Active count describes the living
   * population, not scratch capacity. Stable entityIds preserve noise after compaction. Capture one
   * prepareParallelCounterSeed outside a partitioned wild batch and pass wild=false to every shard;
   * direct wild=true callers harvest once per call. Nonpositive/invalid dt leaves state unchanged and
   * writes neutral deltas. Filters use the original 16ms retention raised to elapsed/0.016; sampled
   * environmental targets are held over that duration. This cadence approximation is not equivalent
   * to observing changing inputs at every frame. Velocity impulses retain their original ±0.08 cap.
   */
  stepShard(
    positionsY: ArrayLike<number>,
    energies: ArrayLike<number>,
    ages: ArrayLike<number>,
    lives: ArrayLike<number>,
    activations: ArrayLike<number>,
    outVelocityYDelta: Float32Array,
    outEnergyDelta: Float32Array,
    outScaleMultiplier: Float32Array,
    startSlot: number,
    endSlot: number,
    seed: number,
    tick: number,
    chaos = 0,
    dt = 0.016,
    wild = false,
    activeCount = positionsY.length,
    entityIds?: ArrayLike<number>,
  ): void {
    const population = Number.isFinite(activeCount)
      ? Math.max(0, Math.min(this.capacity, positionsY.length, Math.trunc(activeCount)))
      : 0;
    const n = Number.isFinite(endSlot) ? Math.min(population, Math.max(0, Math.trunc(endSlot))) : 0;
    const start = Number.isFinite(startSlot) ? Math.max(0, Math.min(n, Math.trunc(startSlot))) : n;
    if (start === n) return;
    if (!Number.isFinite(dt) || dt <= 0) {
      outVelocityYDelta.fill(0, start, n);
      outEnergyDelta.fill(0, start, n);
      outScaleMultiplier.fill(1, start, n);
      return;
    }
    const envelope = computeHabitatEnvelope(population);
    const batchSeed = prepareParallelCounterSeed(seed, tick, wild);
    const elapsedSteps = dt / 0.016;
    const daRetain = Math.pow(0.9, elapsedSteps);
    const serRetain = Math.pow(0.92, elapsedSteps);
    const naRetain = Math.pow(0.88, elapsedSteps);
    const chaosNorm = clamp01((Number.isFinite(chaos) ? chaos : 0) / 10);

    for (let i = start; i < n; i++) {
      const y = Number.isFinite(positionsY[i]) ? positionsY[i]! : 0;
      const energy = Number.isFinite(energies[i]) ? energies[i]! : 50;
      const age = Number.isFinite(ages[i]) ? ages[i]! : 0;
      const life = Number.isFinite(lives[i]) && lives[i]! > 0 ? lives[i]! : 1000;
      const act = Number.isFinite(activations[i]) ? activations[i]! : 0;

      const stratum = resolveBiomeStratum(y, envelope.verticalScale);
      const stageProfile = evaluateLifeStageInto(age, life, energy, act, this.stageScratch);
      this.stratumIndex[i] = stratum.index;
      this.lifeStageIndex[i] = stageProfile.stageIndex;

      // Phenomenological energy-change/nutrient feedback; no learned reward predictor is present.
      const prevE = this.prevEnergy[i]!;
      this.prevEnergy[i] = energy;
      const energyFeedback = clamp(
        (energy - prevE) * 0.08 + (stratum.nutrientFlux - 0.45) * 0.2,
        -1,
        1,
      );
      const da = clamp01(
        this.dopamine[i]! * daRetain + (0.5 + 0.45 * energyFeedback) * (1 - daRetain),
      );
      const ser = clamp01(
        this.serotonin[i]! * serRetain +
          (0.35 * clamp01(energy / 100) + 0.45 * (stratum.symbiosisGain - 0.8)) * (1 - serRetain),
      );
      const na = clamp01(
        this.noradrenaline[i]! * naRetain +
          (0.6 * chaosNorm + 0.4 * Math.abs(energyFeedback) + 0.2 * clamp01(Math.abs(act) / 4)) *
            (1 - naRetain),
      );

      this.dopamine[i] = da;
      this.serotonin[i] = ser;
      this.noradrenaline[i] = na;

      // 4-channel recurrent working memory trace update
      const mBase = i * 4;
      const retain = Math.pow(stageProfile.memoryRetention, elapsedSteps);
      const invRetain = 1 - retain;
      const targetStratumSpec = BIOME_STRATA[STRATUM_INDEX[stageProfile.preferredStratum]]!;
      const targetY = targetStratumSpec.yCenter * envelope.verticalScale;
      const stratumError = clamp((targetY - y) / 40, -1, 1);

      this.memoryTrace[mBase] =
        this.memoryTrace[mBase]! * retain + invRetain * (stratum.nutrientFlux * da);
      this.memoryTrace[mBase + 1] =
        this.memoryTrace[mBase + 1]! * retain + invRetain * (na * (0.5 + 0.5 * chaosNorm));
      this.memoryTrace[mBase + 2] =
        this.memoryTrace[mBase + 2]! * retain + invRetain * (ser * stratum.symbiosisGain * 0.7);
      this.memoryTrace[mBase + 3] =
        this.memoryTrace[mBase + 3]! * retain + invRetain * stratumError;

      // Stateless counter-based stochastic micro-foraging exploratory impulse (parallel-safe)
      const entityId = entityIds?.[i];
      const counterId = Number.isSafeInteger(entityId) && entityId! >= 0 ? entityId! : i;
      const jitter01 = sampleParallelCounter01(batchSeed, tick, counterId, 0, false) - 0.5;
      const buoyancy = stratumError * (0.018 + 0.014 * da) + jitter01 * 0.008 * (0.4 + na);

      if (i < outVelocityYDelta.length) {
        outVelocityYDelta[i] = clamp(buoyancy * dt * 60, -0.08, 0.08);
      }
      if (i < outEnergyDelta.length) {
        outEnergyDelta[i] = (stratum.nutrientFlux * (0.7 + 0.6 * da) - 0.22 * (1 + 0.4 * na)) * dt;
      }
      if (i < outScaleMultiplier.length) {
        outScaleMultiplier[i] = stageProfile.morphScaleMultiplier;
      }
    }
  }

  /** Aggregate telemetry snapshot across `[0, activeCount)` for HUD / Observatory inspection. */
  summarize(activeCount: number): OrganismBioTelemetry {
    const n = Number.isFinite(activeCount)
      ? Math.max(0, Math.min(this.capacity, Math.trunc(activeCount)))
      : 0;
    const stratumCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const stageCounts: [number, number, number, number] = [0, 0, 0, 0];
    let sumDa = 0;
    let sumSer = 0;
    let sumNa = 0;
    let sumMem = 0;

    for (let i = 0; i < n; i++) {
      const st = (this.stratumIndex[i] ?? 0) % 5;
      const sg = (this.lifeStageIndex[i] ?? 0) % 4;
      stratumCounts[st] = (stratumCounts[st] ?? 0) + 1;
      stageCounts[sg] = (stageCounts[sg] ?? 0) + 1;
      sumDa += this.dopamine[i]!;
      sumSer += this.serotonin[i]!;
      sumNa += this.noradrenaline[i]!;
      const mBase = i * 4;
      sumMem += Math.hypot(
        this.memoryTrace[mBase]!,
        this.memoryTrace[mBase + 1]!,
        this.memoryTrace[mBase + 2]!,
        this.memoryTrace[mBase + 3]!,
      );
    }

    const denom = Math.max(1, n);
    return {
      population: n,
      stratumCounts,
      stageCounts,
      meanDopamine: n > 0 ? sumDa / denom : 0,
      meanSerotonin: n > 0 ? sumSer / denom : 0,
      meanNoradrenaline: n > 0 ? sumNa / denom : 0,
      meanWorkingMemoryNorm: n > 0 ? sumMem / denom : 0,
      habitatEnvelope: computeHabitatEnvelope(n),
    };
  }
}
