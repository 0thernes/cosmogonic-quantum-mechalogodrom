/**
 * ADR-0013 matched-seed causal benchmark.
 *
 * Generates one machine-readable receipt. It reports negative/tied controls without filtering them and
 * never changes public capability scores itself. Run with:
 *   bun run scripts/organism-intelligence-benchmark.ts
 */

import { cpus, totalmem } from 'node:os';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import { isBrainWired } from '../src/sim/tsotchke-brain-intake';
import { TsotchkeOrganismIntelligence } from '../src/sim/tsotchke-organism-intelligence';
import {
  TSOTCHKE_REPO_COUNT,
  getTsotchkeRepoByIndex,
  type TsotchkeRepoSlug,
} from '../src/sim/tsotchke-registry';
import type {
  Entity,
  EntityData,
  OrganismGoalField,
  OrganismIntelligenceSignal,
} from '../src/types';

const RECEIPT_PATH = 'docs/reports/assets/organism-intelligence-causal-benchmark-v3.json';
const TASK_VERSION = 'organism-intelligence-v3-goal-preserved-control';
const HELD_OUT_SEEDS = Array.from(
  { length: 30 },
  (_, i) => (0x7200_0001 + Math.imul(i + 1, 0x9e37_79b1)) >>> 0,
);
const BOOTSTRAP_SAMPLES = 10_000;
const ACCEPTANCE = Object.freeze({
  resourceMeanImprovementMinExclusive: 0,
  resourceBootstrapLowerBoundMinExclusive: 0,
  adaptationRelativeMedianImprovementMin: 0.05,
  adaptationBootstrapLowerBoundMinExclusive: 0,
  adaptationWorstSeedRelativeLossMin: -0.2,
  corpusDecisionEpsilon: 1e-9,
  integratedExternalRows: 17,
  excludedExternalRows: 5,
  sharedFieldP95MaxMs: 0.5,
  incrementalEntityMedianMaxMs: 3,
  performancePopulation: 50_000,
});

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);
const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};
const percentile = (values: readonly number[], q: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index] ?? 0;
};

function pairedBootstrap95(differences: readonly number[]): [number, number] {
  if (differences.length === 0) return [0, 0];
  const rng = mulberry32(0xb005_7a9);
  const samples = new Float64Array(BOOTSTRAP_SAMPLES);
  for (let b = 0; b < samples.length; b++) {
    let sum = 0;
    for (let i = 0; i < differences.length; i++) {
      sum += differences[Math.floor(rng() * differences.length)] ?? 0;
    }
    samples[b] = sum / differences.length;
  }
  samples.sort();
  return [
    samples[Math.floor(samples.length * 0.025)] ?? 0,
    samples[Math.floor(samples.length * 0.975)] ?? 0,
  ];
}

function cohenDz(differences: readonly number[]): number {
  if (differences.length < 2) return 0;
  const m = mean(differences);
  let variance = 0;
  for (const value of differences) variance += (value - m) ** 2;
  const sd = Math.sqrt(variance / (differences.length - 1));
  return sd > 0 ? m / sd : m === 0 ? 0 : Math.sign(m) * Infinity;
}

function fakeEntity(seed: number): Entity {
  const userData = {
    vel: new THREE.Vector3(),
    age: 40,
    life: 600,
    ph: ((seed % 997) / 997) * Math.PI * 2,
    energy: 50,
    payoff: 0,
    act: 0,
  } as unknown as EntityData;
  return { userData } as unknown as Entity;
}

function goalField(size: number, x = 1, z = 0): OrganismGoalField {
  return {
    directionX: new Float32Array(size).fill(x),
    directionZ: new Float32Array(size).fill(z),
    desire: new Float32Array(size).fill(1),
    cover: new Float32Array(size).fill(1),
    revision: new Uint32Array(size).fill(1),
  };
}

function signalFor(
  seed: number,
  ablated?: ReadonlySet<TsotchkeRepoSlug>,
): OrganismIntelligenceSignal {
  const field = new TsotchkeOrganismIntelligence(seed ^ 0x51a7, { cadenceFrames: 12 });
  for (let i = 0; i < 4; i++) {
    field.step(
      {
        frame: i * 12,
        chaos: 0.42,
        entropy: 0.16,
        temperature: 27,
        population: 6_500,
        capacity: 10_000,
        meanMetabolicEnergy: 0.62 - i * 0.06,
        floraBiomass: 0.82 - i * 0.14,
      },
      ablated,
      true,
    );
  }
  return field.signal;
}

function cloneSignal(
  source: OrganismIntelligenceSignal,
  transform?: (channels: Float32Array) => void,
): OrganismIntelligenceSignal {
  const channels = new Float32Array(source.channels);
  transform?.(channels);
  return { ...source, channels };
}

function oneStepProgress(
  seed: number,
  mode: 'enhanced' | 'disabled' | 'legacy' | 'shuffled' | 'classical' | 'random',
): number {
  if (mode === 'random') return (mulberry32(seed ^ 0x8bad_f00d)() * 2 - 1) * 0.045;
  const brain = new EntityBrainField(1, mulberry32(seed ^ 0xb7a1_9e3d));
  const goal = goalField(1);
  if (mode === 'disabled') {
    // True substrate ablation: preserve the identical explicit flora goal/controller and remove only
    // the shared corpus signal. This avoids attributing the goal-loop addition to corpus intelligence.
    brain.attachAdaptiveField(null, goal);
  } else if (mode !== 'legacy') {
    const full = signalFor(seed);
    const signal =
      mode === 'shuffled'
        ? cloneSignal(full, (channels) => {
            const first = channels[0] ?? 0;
            channels[0] = channels[2] ?? 0;
            channels[2] = channels[1] ?? 0;
            channels[1] = channels[3] ?? 0;
            channels[3] = first;
          })
        : mode === 'classical'
          ? { ...cloneSignal(full), exploration: mulberry32(seed ^ 0xc1a5_51c)() }
          : full;
    brain.attachAdaptiveField(signal, goal);
  }
  const entity = fakeEntity(seed);
  brain.thinkAll([entity], 4.2, 1.25);
  return entity.userData.vel.x;
}

function adaptationReturn(
  seed: number,
  learning: boolean,
): { postReversal: number; total: number } {
  const brain = new EntityBrainField(1, mulberry32(seed ^ 0xadab_71e));
  const goals = goalField(1);
  brain.attachAdaptiveField(signalFor(seed), goals);
  brain.setOnlineLearningEnabled(learning);
  const entity = fakeEntity(seed);
  let total = 0;
  let postReversal = 0;
  for (let step = 0; step < 240; step++) {
    const direction = step < 120 ? 1 : -1;
    goals.directionX[0] = direction;
    goals.revision[0] = step + 1;
    entity.userData.vel.set(0, 0, 0);
    brain.thinkAll([entity], 3.5, step / 60);
    const progress = entity.userData.vel.x * direction;
    total += progress;
    if (step >= 120) postReversal += progress;
    entity.userData.payoff = progress * 10;
    entity.userData.energy = clamp01(entity.userData.energy / 100 + progress * 0.8 - 0.0005) * 100;
  }
  return { postReversal, total };
}

function corpusCausality(seed: number): {
  integrated: number;
  integratedChanged: number;
  excluded: number;
  excludedExactZero: number;
} {
  const baselineSignal = signalFor(seed);
  const baselineBrain = new EntityBrainField(1, mulberry32(seed ^ 0xfeed_2001));
  baselineBrain.attachAdaptiveField(baselineSignal, goalField(1));
  const baselineEntity = fakeEntity(seed);
  baselineBrain.thinkAll([baselineEntity], 4, 1);
  const base = baselineEntity.userData.vel;
  let integrated = 0;
  let integratedChanged = 0;
  let excluded = 0;
  let excludedExactZero = 0;
  for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
    const repo = getTsotchkeRepoByIndex(i);
    const brain = new EntityBrainField(1, mulberry32(seed ^ 0xfeed_2001));
    brain.attachAdaptiveField(signalFor(seed, new Set([repo.slug])), goalField(1));
    const entity = fakeEntity(seed);
    brain.thinkAll([entity], 4, 1);
    const velocity = entity.userData.vel;
    const distance =
      Math.abs(velocity.x - base.x) + Math.abs(velocity.y - base.y) + Math.abs(velocity.z - base.z);
    if (isBrainWired(repo)) {
      integrated++;
      if (distance > ACCEPTANCE.corpusDecisionEpsilon) integratedChanged++;
    } else {
      excluded++;
      if (distance === 0) excludedExactZero++;
    }
  }
  return { integrated, integratedChanged, excluded, excludedExactZero };
}

function performanceReceipt(): {
  sharedFieldP95Ms: number;
  legacyEntityMedianMs: number;
  enhancedEntityMedianMs: number;
  incrementalEntityMedianMs: number;
  population: number;
} {
  const field = new TsotchkeOrganismIntelligence(0xdecafbad, { cadenceFrames: 1 });
  const sharedTimes: number[] = [];
  for (let i = 0; i < 300; i++) {
    const start = performance.now();
    field.step(
      {
        frame: i,
        chaos: 0.4,
        entropy: 0.2,
        temperature: 25,
        population: 50_000,
        capacity: 50_000,
        meanMetabolicEnergy: 0.55,
        floraBiomass: 0.6,
      },
      undefined,
      true,
    );
    sharedTimes.push(performance.now() - start);
  }

  const population = ACCEPTANCE.performancePopulation;
  const brain = new EntityBrainField(population, mulberry32(0x5050));
  const entities = Array.from({ length: population }, (_, i) => fakeEntity(i));
  const goals = goalField(population);
  const signal = signalFor(0x5050);
  const legacyTimes: number[] = [];
  const enhancedTimes: number[] = [];
  // One warm-up per branch, then alternating samples to reduce JIT/thermal ordering bias.
  brain.attachAdaptiveField(null, null);
  brain.thinkAll(entities, 4, 0);
  brain.attachAdaptiveField(signal, goals);
  brain.thinkAll(entities, 4, 1 / 60);
  for (let sample = 0; sample < 7; sample++) {
    for (const entity of entities) entity.userData.vel.set(0, 0, 0);
    brain.attachAdaptiveField(null, null);
    let start = performance.now();
    brain.thinkAll(entities, 4, (sample * 2 + 2) / 60);
    legacyTimes.push(performance.now() - start);

    for (const entity of entities) entity.userData.vel.set(0, 0, 0);
    brain.attachAdaptiveField(signal, goals);
    start = performance.now();
    brain.thinkAll(entities, 4, (sample * 2 + 3) / 60);
    enhancedTimes.push(performance.now() - start);
  }
  const legacyMedian = median(legacyTimes);
  const enhancedMedian = median(enhancedTimes);
  return {
    sharedFieldP95Ms: percentile(sharedTimes.slice(20), 0.95),
    legacyEntityMedianMs: legacyMedian,
    enhancedEntityMedianMs: enhancedMedian,
    incrementalEntityMedianMs: enhancedMedian - legacyMedian,
    population,
  };
}

function numericalSafetyReceipt(): {
  forcedSteps: number;
  allFiniteAndBounded: boolean;
  finalRevision: number;
} {
  const field = new TsotchkeOrganismIntelligence(0xf00d_10_00, { cadenceFrames: 1 });
  const faults = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1e12, 1e12];
  let allFiniteAndBounded = true;
  for (let frame = 0; frame < 10_000; frame++) {
    const fault = faults[frame % faults.length]!;
    const signal = field.step(
      {
        frame,
        chaos: frame % 7 === 0 ? fault : (frame % 101) / 100,
        entropy: frame % 11 === 0 ? fault : (frame % 97) / 96,
        temperature: frame % 13 === 0 ? fault : 20 + Math.sin(frame * 0.01) * 90,
        population: frame % 17 === 0 ? fault : frame * 10,
        capacity: frame % 19 === 0 ? fault : 50_000,
        meanMetabolicEnergy: frame % 23 === 0 ? fault : (frame % 89) / 88,
        floraBiomass: frame % 29 === 0 ? fault : (frame % 83) / 82,
      },
      undefined,
      true,
    );
    const values = [
      signal.resourcePressure,
      signal.threatResponse,
      signal.exploration,
      signal.socialDrive,
      signal.plasticity,
      signal.forecast,
      signal.confidence,
      signal.corpusDrive,
      ...signal.channels,
    ];
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      allFiniteAndBounded = false;
      break;
    }
  }
  return {
    forcedSteps: 10_000,
    allFiniteAndBounded,
    finalRevision: field.signal.revision,
  };
}

const modes = ['enhanced', 'disabled', 'legacy', 'shuffled', 'classical', 'random'] as const;
const resourceByMode = Object.fromEntries(modes.map((mode) => [mode, [] as number[]])) as Record<
  (typeof modes)[number],
  number[]
>;
const adaptive: number[] = [];
const frozen: number[] = [];
const catastrophicLosses: number[] = [];
for (const seed of HELD_OUT_SEEDS) {
  for (const mode of modes) resourceByMode[mode].push(oneStepProgress(seed, mode));
  const live = adaptationReturn(seed, true);
  const control = adaptationReturn(seed, false);
  adaptive.push(live.postReversal);
  frozen.push(control.postReversal);
  const denom = Math.max(1e-9, Math.abs(control.postReversal));
  catastrophicLosses.push((live.postReversal - control.postReversal) / denom);
}

const paired = (a: readonly number[], b: readonly number[]): number[] =>
  a.map((value, i) => value - (b[i] ?? 0));
const resourceDisabledDiff = paired(resourceByMode.enhanced, resourceByMode.disabled);
const goalOnlyLegacyDiff = paired(resourceByMode.disabled, resourceByMode.legacy);
const resourceShuffledDiff = paired(resourceByMode.enhanced, resourceByMode.shuffled);
const resourceClassicalDiff = paired(resourceByMode.enhanced, resourceByMode.classical);
const adaptationDiff = paired(adaptive, frozen);
const resourceDisabledCi = pairedBootstrap95(resourceDisabledDiff);
const goalOnlyLegacyCi = pairedBootstrap95(goalOnlyLegacyDiff);
const resourceShuffledCi = pairedBootstrap95(resourceShuffledDiff);
const resourceClassicalCi = pairedBootstrap95(resourceClassicalDiff);
const adaptationCi = pairedBootstrap95(adaptationDiff);
const benchmarkPerformance = performanceReceipt();
const numericalSafety = numericalSafetyReceipt();
const causalityRuns = HELD_OUT_SEEDS.map((seed) => corpusCausality(seed));
const causality = {
  evaluatedSeeds: causalityRuns.length,
  integrated: Math.min(...causalityRuns.map((run) => run.integrated)),
  integratedChanged: Math.min(...causalityRuns.map((run) => run.integratedChanged)),
  excluded: Math.min(...causalityRuns.map((run) => run.excluded)),
  excludedExactZero: Math.min(...causalityRuns.map((run) => run.excludedExactZero)),
};

const resourceAccepted =
  mean(resourceDisabledDiff) > ACCEPTANCE.resourceMeanImprovementMinExclusive &&
  resourceDisabledCi[0] > ACCEPTANCE.resourceBootstrapLowerBoundMinExclusive;
const goalControllerAccepted =
  mean(goalOnlyLegacyDiff) > ACCEPTANCE.resourceMeanImprovementMinExclusive &&
  goalOnlyLegacyCi[0] > ACCEPTANCE.resourceBootstrapLowerBoundMinExclusive;
const adaptationRelative =
  (median(adaptive) - median(frozen)) / Math.max(1e-9, Math.abs(median(frozen)));
const adaptationAccepted =
  adaptationRelative >= ACCEPTANCE.adaptationRelativeMedianImprovementMin &&
  adaptationCi[0] > ACCEPTANCE.adaptationBootstrapLowerBoundMinExclusive &&
  catastrophicLosses.every((loss) => loss >= ACCEPTANCE.adaptationWorstSeedRelativeLossMin);
const causalityAccepted = causalityRuns.every(
  (run) =>
    run.integrated === ACCEPTANCE.integratedExternalRows &&
    run.integratedChanged === ACCEPTANCE.integratedExternalRows &&
    run.excluded === ACCEPTANCE.excludedExternalRows &&
    run.excludedExactZero === ACCEPTANCE.excludedExternalRows,
);
const performanceAccepted =
  benchmarkPerformance.sharedFieldP95Ms < ACCEPTANCE.sharedFieldP95MaxMs &&
  benchmarkPerformance.incrementalEntityMedianMs < ACCEPTANCE.incrementalEntityMedianMaxMs;
const numericalSafetyAccepted =
  numericalSafety.allFiniteAndBounded &&
  numericalSafety.finalRevision === numericalSafety.forcedSteps;
// Direct matched counterfactuals exist for six live consumer classes. The four specialist aggregate
// systems below have deterministic source paths but still lack full-class matched controls, so the
// preregistered every-class coverage gate remains explicitly open rather than being inferred from prose.
const consumerCoverage = {
  directMatchedCounterfactuals: [
    'ordinary-entities',
    'alien-flora',
    'nhi',
    'glyph-beings',
    'wilderness-fauna',
    'primordial-digital-biologics',
  ],
  sourcePathOnly: ['shoggoths', 'puppeteers', 'titans', 'leviathans'],
  existingDeepPathsOutsideThisGate: ['archon-apex', 'mechalogodrom'],
  accepted: false,
} as const;
const shuffledSpecific = resourceShuffledCi[0] > 0;
const quantumSpecific = resourceClassicalCi[0] > 0;

const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD']).stdout.toString().trim();
const receiptBase = {
  schemaVersion: 1,
  taskVersion: TASK_VERSION,
  generatedDate: '2026-07-10',
  predecessorReceipt: 'docs/reports/assets/organism-intelligence-causal-benchmark-v2.json',
  predecessorOutcome:
    'v2 improved the goal-local actor trace but its disabled arm removed both corpus signal and explicit goal, confounding goal-controller and corpus effects. v3 supersedes that resource claim with a goal-preserved substrate ablation and evaluates corpus causality across all 30 held-out seeds.',
  indicatorOnly: true,
  claimBoundary:
    'Measures deterministic task behavior only; not phenomenal consciousness, sentience, physical quantum entropy, CSPRNG security, or general intelligence.',
  provenance: {
    cosmogonicBaseCommit: commit,
    eshkolReference: {
      tag: 'v1.3.2-evolve',
      commit: '8443ddaeecec579c60ac858348a23cf1912d7a78',
      relationship: 'bounded-float64-runtime-analogue-not-native-parity',
    },
    quantumRngReference: {
      tag: 'v3.0.1',
      commit: 'a00ad483cbbef31ea7536f09ae99409d81c9a823',
      relationship: 'deterministic-classical-statevector-adaptation-not-csprng-or-physical-entropy',
    },
  },
  protocol: {
    heldOutSeeds: HELD_OUT_SEEDS,
    bootstrapSamples: BOOTSTRAP_SAMPLES,
    controls: [
      'substrate-disabled-goal-preserved',
      'legacy-no-goal-context',
      'repo-channel-permutation',
      'entropy-matched-classical',
      'random-policy',
    ],
    resourceTask: 'one-step x-axis progress toward identical flora goal',
    adaptationTask:
      '240 steps with resource-goal reversal after step 120; online trace vs frozen trace',
    acceptanceRules: {
      resourceSeeking: 'paired mean enhanced-minus-disabled > 0 and 95% bootstrap lower bound > 0',
      goalController: 'paired mean goal-only-minus-legacy > 0 and 95% bootstrap lower bound > 0',
      adaptation:
        'median post-reversal return >= 5% above frozen trace, 95% bootstrap lower bound > 0, and no seed loss below -20%',
      corpusCausality:
        'all 17 integrated external rows change final velocity > 1e-9; four fences plus one meta row are exactly inert',
      performance:
        'shared-field p95 < 0.5 ms and incremental 50,000-entity median < 3 ms on the receipt machine',
      scoreUplift:
        'corpus-conditioned resource, adaptation, causality, numerical safety, every-class consumer coverage, performance, and shuffled-substrate specificity must all pass',
    },
  },
  acceptanceCriteria: ACCEPTANCE,
  resourceSeeking: {
    means: Object.fromEntries(modes.map((mode) => [mode, mean(resourceByMode[mode])])),
    enhancedMinusDisabled: {
      mean: mean(resourceDisabledDiff),
      bootstrap95: resourceDisabledCi,
      cohenDz: cohenDz(resourceDisabledDiff),
    },
    goalOnlyMinusLegacy: {
      mean: mean(goalOnlyLegacyDiff),
      bootstrap95: goalOnlyLegacyCi,
      cohenDz: cohenDz(goalOnlyLegacyDiff),
    },
    enhancedMinusShuffled: {
      mean: mean(resourceShuffledDiff),
      bootstrap95: resourceShuffledCi,
      cohenDz: cohenDz(resourceShuffledDiff),
    },
    enhancedMinusClassical: {
      mean: mean(resourceClassicalDiff),
      bootstrap95: resourceClassicalCi,
      cohenDz: cohenDz(resourceClassicalDiff),
    },
    acceptedAgainstDisabled: resourceAccepted,
    substrateSpecific: shuffledSpecific,
    quantumSpecific,
  },
  adaptation: {
    requiredRelativeMedianImprovement: ACCEPTANCE.adaptationRelativeMedianImprovementMin,
    maximumAllowedSeedRelativeLoss: ACCEPTANCE.adaptationWorstSeedRelativeLossMin,
    medianPostReversalEnhanced: median(adaptive),
    medianPostReversalFrozen: median(frozen),
    relativeMedianImprovement: adaptationRelative,
    enhancedMinusFrozen: {
      mean: mean(adaptationDiff),
      bootstrap95: adaptationCi,
      cohenDz: cohenDz(adaptationDiff),
    },
    worstSeedRelativeLoss: Math.min(...catastrophicLosses),
    accepted: adaptationAccepted,
  },
  corpusCausality: { ...causality, accepted: causalityAccepted },
  numericalSafety: { ...numericalSafety, accepted: numericalSafetyAccepted },
  performance: { ...benchmarkPerformance, accepted: performanceAccepted },
  consumerCoverage,
  claims: {
    goalControllerUplift: goalControllerAccepted,
    corpusConditionedGoalUplift: resourceAccepted,
    operationalGoalUplift: resourceAccepted,
    adaptivePostReversalUplift: adaptationAccepted,
    allIntegratedReposCausal: causalityAccepted,
    numericalSafetyGateMet: numericalSafetyAccepted,
    everyConsumerCounterfactualGateMet: consumerCoverage.accepted,
    performanceBudgetMet: performanceAccepted,
    substrateSpecificUplift: shuffledSpecific,
    quantumSpecificUplift: quantumSpecific,
    numericScoreUpliftAllowed:
      resourceAccepted &&
      adaptationAccepted &&
      causalityAccepted &&
      numericalSafetyAccepted &&
      consumerCoverage.accepted &&
      performanceAccepted &&
      shuffledSpecific,
  },
  machine: {
    platform: process.platform,
    architecture: process.arch,
    bun: Bun.version,
    logicalCpus: cpus().length,
    cpuModel: cpus()[0]?.model ?? 'unknown',
    totalMemoryBytes: totalmem(),
  },
};
const canonical = JSON.stringify(receiptBase);
const contentSha256 = new Bun.CryptoHasher('sha256').update(canonical).digest('hex');
const receipt = { ...receiptBase, contentSha256 };
await Bun.write(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      path: RECEIPT_PATH,
      claims: receipt.claims,
      performance: benchmarkPerformance,
      contentSha256,
    },
    null,
    2,
  ),
);
