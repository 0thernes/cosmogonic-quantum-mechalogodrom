/**
 * Frozen Phase-A protocol primitives for organism-intelligence V4.
 *
 * This module deliberately does NOT run the evaluation or write a result. It fixes the seed families,
 * task fixtures, normalized outcomes, control construction, denominator rules, resampling algorithms,
 * and acceptance arithmetic that a later result generator must import unchanged. Committing this source
 * before result generation is repository preregistration only—not external preregistration or replication.
 */

import { mulberry32 } from '../src/math/rng';
import type { OrganismIntelligenceSignal } from '../src/types';

export const V4_PROTOCOL_VERSION =
  'organism-intelligence-v4-phase-a-semantic-cross-family' as const;
export const V4_PINNED_DEPENDENCIES = [
  {
    path: 'src/math/rng.ts',
    sha256: '87c880ed2b7f1e97c37f0c04cbdeb2d9e74a555a7fce22200ceaa756b7b6bcb0',
    symbols: ['mulberry32'],
  },
] as const;
export const V4_BOOTSTRAP_SAMPLES = 20_000;
export const V4_SIGN_FLIP_SAMPLES = 20_000;
export const V4_ALPHA = 0.05;
export const V4_MIN_NORMALIZED_GAIN = 0.05;
export const V4_MIN_PREDICTOR_RELATIVE_ERROR_REDUCTION = 0.05;
export const V4_WORST_SEED_POINT_LOSS_MIN = -0.2;

export const V4_EVALUATION_SEEDS = [
  3957713710, 331011675, 999276936, 1667542197, 2335807458, 3004072719, 3672337980, 45635945,
  713901206, 1382166467, 2050431728, 2718696989, 3386962250, 4055227511, 428525476, 1096790737,
  1765055998, 2433321259, 3101586520, 3769851781, 143149746, 811415007, 1479680268, 2147945529,
  2816210790, 3484476051, 4152741312, 526039277, 1194304538, 1862569799, 2530835060, 3199100321,
  3867365582, 240663547, 908928808, 1577194069, 2245459330, 2913724591, 3581989852, 4250255113,
  623553078, 1291818339, 1960083600, 2628348861, 3296614122, 3964879383, 338177348, 1006442609,
  1674707870, 2342973131, 3011238392, 3679503653, 52801618, 721066879, 1389332140, 2057597401,
  2725862662, 3394127923, 4062393184, 435691149, 1103956410, 1772221671, 2440486932, 3108752193,
] as const;

export const V4_SURROGATE_CALIBRATION_SEEDS = [
  3925305266, 5099363, 379860756, 754622149, 1129383542, 1504144935, 1878906328, 2253667721,
  2628429114, 3003190507, 3377951900, 3752713293, 4127474686, 207268783, 582030176, 956791569,
] as const;

export type V4FamilyId =
  'ordinary-organisms' | 'simple-mnist-ecology-predictor' | 'petri-digital-biologics' | 'titans';

export const V4_FAMILY_ORDER = [
  'ordinary-organisms',
  'simple-mnist-ecology-predictor',
  'petri-digital-biologics',
  'titans',
] as const satisfies readonly V4FamilyId[];

export const V4_SEED_XOR = {
  ordinaryBrain: 0xb4a1_f00d,
  predictorConstructor: 0x4ec0_10a1,
  petriRng: 0x0e10_c0de,
  titanEnvironment: 0x000d_1f10,
  ordinarySurrogate: 0x8bad_f00d,
  titanSurrogate: 0x071a_7a5,
} as const;

export function v4DerivedSeed(
  evaluationSeed: number,
  domain: keyof typeof V4_SEED_XOR,
  ordinal = 0,
): number {
  if (!Number.isSafeInteger(evaluationSeed) || evaluationSeed < 0 || evaluationSeed > 0xffff_ffff) {
    throw new RangeError('evaluation seed must be a uint32');
  }
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal > 0xffff_ffff) {
    throw new RangeError('seed ordinal must be a uint32');
  }
  return (evaluationSeed ^ V4_SEED_XOR[domain] ^ ordinal) >>> 0 || 1;
}

export type V4SemanticVector = readonly [
  resource: number,
  threat: number,
  exploration: number,
  social: number,
];

const bounded01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** One fixed right rotation. Named fields and the ordered channel vector move together. */
export function v4CyclicSemanticPermutation(vector: V4SemanticVector): V4SemanticVector {
  return [vector[3], vector[0], vector[1], vector[2]];
}

/** Build the exact runtime-shaped signal used by all Phase-A semantic fixtures. */
export function v4SemanticSignal(
  vector: V4SemanticVector,
  enabled = true,
): OrganismIntelligenceSignal {
  const channels = Float32Array.from(vector, bounded01);
  return {
    enabled,
    indicatorOnly: true,
    revision: 1,
    resourcePressure: channels[0] ?? 0,
    threatResponse: channels[1] ?? 0,
    exploration: channels[2] ?? 0,
    socialDrive: channels[3] ?? 0,
    plasticity: 0.5,
    forecast: 0.5,
    confidence: 1,
    corpusDrive: 0.5,
    ecologyRisk: 0.5,
    ecologySurprise: 0,
    channels,
    integratedRepoCount: 17,
    diagnosticAlert: false,
  } as const;
}

export function v4OrdinarySegmentSignal(resourceCue: number, cyclic = false) {
  const semantic: V4SemanticVector = [bounded01(resourceCue), 0, 0, 0];
  return v4SemanticSignal(cyclic ? v4CyclicSemanticPermutation(semantic) : semantic);
}

export function v4PredictorInputAt(inputIndex: number): V4SemanticVector {
  if (!Number.isInteger(inputIndex) || inputIndex < 0 || inputIndex >= 240) {
    throw new RangeError('predictor input index must be an integer in [0,239]');
  }
  return inputIndex % 2 === 0 ? [0.1, 0.15, 0.2, 0.1] : [0.9, 0.85, 0.8, 0.9];
}

/** Target for the prediction created from input `inputIndex`; the next cadence supplies this label. */
function v4PredictorBaseTarget(sourceIndex: number): 0 | 1 {
  const stressed = sourceIndex % 2 === 1;
  const relationshipA = sourceIndex < 120;
  return (relationshipA ? stressed : !stressed) ? 1 : 0;
}

/** Ground-truth outcome used to score every predictor arm, including the shuffled-label control. */
export function v4PredictorTrueTargetForInput(inputIndex: number): 0 | 1 {
  if (!Number.isInteger(inputIndex) || inputIndex < 0 || inputIndex >= 240) {
    throw new RangeError('predictor target index must be an integer in [0,239]');
  }
  return v4PredictorBaseTarget(inputIndex);
}

/** Feedback used for SGD; only the target-shuffled arm receives the fixed permuted label. */
export function v4PredictorTrainingTargetForInput(inputIndex: number, shuffled: boolean): 0 | 1 {
  if (!Number.isInteger(inputIndex) || inputIndex < 0 || inputIndex >= 240) {
    throw new RangeError('predictor target index must be an integer in [0,239]');
  }
  return v4PredictorBaseTarget(shuffled ? (73 * inputIndex + 19) % 240 : inputIndex);
}

export const V4_FAMILY_FIXTURES = {
  'ordinary-organisms': {
    controllerType: 'neural',
    initialEntity: {
      mi: 0,
      velocity: [0, 0, 0],
      age: 40,
      life: 600,
      ph: 0.37,
      sc: 1,
      beh: 'flock',
      spd: 1,
      wf: 1,
      wa: 0,
      sT: 600,
      belly: 0,
      sortVal: 0,
      nW: 0.5,
      act: 0,
      qP: 0,
      energy: 45,
      strategy: 0,
      typeId: 0,
      setGroup: 0,
      payoff: 0,
      phylum: -1,
      beh2: null,
      alive: true,
    },
    worldChaos: 3,
    initialSimulationTime: 0,
    inheritedTinyMlpParameters: 70,
    recurrentContextStates: 4,
    recurrentContextTrainableParameters: 0,
    brainRngSeedXor: V4_SEED_XOR.ordinaryBrain,
    brainRngSeedLaw: 'v4DerivedSeed(evaluationSeed, ordinaryBrain)',
    genomeStorage: 'fp32',
    onlineActorCriticLearning: false,
    simulationHz: 60,
    totalSteps: 480,
    segments: [
      { steps: 60, goalX: 1, resourceCue: 1, score: false },
      { steps: 60, goalX: 1, resourceCue: 0, score: true },
      { steps: 60, goalX: -1, resourceCue: 1, score: false },
      { steps: 60, goalX: -1, resourceCue: 0, score: true },
      { steps: 60, goalX: 1, resourceCue: 1, score: false },
      { steps: 60, goalX: 1, resourceCue: 0, score: true },
      { steps: 60, goalX: -1, resourceCue: 1, score: false },
      { steps: 60, goalX: -1, resourceCue: 0, score: true },
    ],
    signalLaw:
      'at each step call v4OrdinarySegmentSignal(segment.resourceCue, arm is semantic-channel-cyclic-permutation); goalX is passed separately and never permuted or hidden',
    primaryOutcome: {
      id: 'dropout-goal-aligned-action-score',
      scale: '[0,1]',
      formula:
        'mean over scored steps of ordinaryActionScore(deltaVelocityX,deltaVelocityZ,goalX,goalZ)',
      motorNormalization: 0.12,
    },
    arms: [
      'full-semantic-recurrent',
      'recurrence-disabled-current-input',
      'semantic-channel-cyclic-permutation',
      'goal-preserved-shared-field-disabled',
      'exact-legacy',
      'action-distribution-matched-surrogate',
    ],
    armInterventions: {
      'full-semantic-recurrent': 'enabled semantic field and recurrent context enabled',
      'recurrence-disabled-current-input':
        'same enabled field with recurrent context disabled and cleared before step zero',
      'semantic-channel-cyclic-permutation':
        'same enabled field with [resource,threat,exploration,social] mapped to [social,resource,threat,exploration]',
      'goal-preserved-shared-field-disabled':
        'goal schedule unchanged; organism-intelligence field disabled; recurrent state cleared before step zero',
      'exact-legacy': 'omit the organism-intelligence signal and semantic recurrent storage path',
      'action-distribution-matched-surrogate':
        'replace neural horizontal delta-velocity with the frozen calibration law while preserving task and motor bound',
    },
  },
  'simple-mnist-ecology-predictor': {
    controllerType: 'neural',
    architecture: [4, 4, 1],
    trainableParameters: 25,
    learningRate: 0.08,
    predictorConstructorSeedXor: V4_SEED_XOR.predictorConstructor,
    predictorConstructorSeedLaw: 'v4DerivedSeed(evaluationSeed, predictorConstructor)',
    resetLaw: 'new predictor instance from the same derived seed for every arm',
    totalCadences: 240,
    reversalCadence: 120,
    scoredCadences: { first: 145, last: 239, inclusive: true },
    inputs: {
      calm: [0.1, 0.15, 0.2, 0.1],
      stressed: [0.9, 0.85, 0.8, 0.9],
      schedule: 'v4PredictorInputAt(inputIndex): calm on even input index, stressed on odd',
    },
    labels: {
      relationshipA: 'input indices 0..119: calm=0, stressed=1',
      relationshipB: 'input indices 120..239: calm=1, stressed=0',
      delayedLaw:
        'at cadence t>=1, v4PredictorTrainingTargetForInput(t-1, arm is target-shuffled) supplies SGD feedback for the prediction retained from input t-1; cadence 0 has no feedback',
      scoringLaw:
        'every arm is scored against v4PredictorTrueTargetForInput(t-1), never against a shuffled target',
      shuffledControl:
        'training feedback for pending input index i is the fixed base target at source index (73*i+19)%240; reported Brier and quality still use the true target at i',
    },
    primaryOutcome: {
      id: 'post-reversal-prediction-quality',
      scale: '[0,1]',
      formula: 'predictionQuality(predictions,labels) over inclusive label cadences 145..239',
    },
    arms: ['adaptive', 'frozen-identical-initial-weights', 'target-shuffled', 'row-ablated'],
    armInterventions: {
      adaptive: 'online Brier updates enabled after each valid one-cadence delayed label',
      'frozen-identical-initial-weights':
        'identical initial weights and predictions with all parameter updates disabled',
      'target-shuffled':
        'adaptive updates receive fixed-permuted training labels; reported Brier and quality use unshuffled true labels',
      'row-ablated':
        'predictor is stepped for raw diagnostics, but its risk/surprise routes and simple_mnist registry contribution are causally zero',
    },
  },
  'petri-digital-biologics': {
    controllerType: 'ecological',
    dishArchonIndex: 0,
    rngSeedXor: V4_SEED_XOR.petriRng,
    rngSeedLaw: 'v4DerivedSeed(evaluationSeed, petriRng)',
    resetLaw: 'deep-clone the exact two-specialist initial fixture for every arm',
    totalBeats: 240,
    regimes: [
      { firstBeat: 0, lastBeat: 119, signal: [1, 0, 0, 0], favoredId: 61441 },
      { firstBeat: 120, lastBeat: 239, signal: [0, 0, 1, 0], favoredId: 61442 },
    ],
    resourceSpecialist: {
      id: 61441,
      form: 'PINN_PHYSICS',
      program: 61441,
      adFitness: 1.8,
      gwtIgnition: 0.1,
      spinOrder: 0.1,
      qgtCurvature: 0.1,
      irrepSymmetry: 0.1,
      quakeAliveness: 0.1,
      ulgLawfulness: 0.1,
      logoMorph: 0.1,
      metalCompute: 1,
      qrngEntropy: 0.1,
      pinnResidual: 1,
      pimcPath: 0.1,
      asteroidDynamics: 0.1,
      consciousness: 0.4,
      alive: true,
      generation: 0,
      speciation: 0,
      fitnessWeights: [0.4, 0.4, 0.4],
    },
    explorationSpecialist: {
      id: 61442,
      form: 'QRNG_ENTROPY',
      program: 61442,
      adFitness: 0.1,
      gwtIgnition: 0.1,
      spinOrder: 0.1,
      qgtCurvature: 0.1,
      irrepSymmetry: 0.1,
      quakeAliveness: 0.1,
      ulgLawfulness: 0.1,
      logoMorph: 1,
      metalCompute: 0.1,
      qrngEntropy: 1,
      pinnResidual: 0.1,
      pimcPath: 1,
      asteroidDynamics: 1,
      consciousness: 0.4,
      alive: true,
      generation: 0,
      speciation: 0,
      fitnessWeights: [0.4, 0.4, 0.4],
    },
    scoringWindows: [
      [80, 119],
      [200, 239],
    ],
    primaryOutcome: {
      id: 'favored-adfitness-share',
      scale: '[0,1]',
      formula: 'mean across scored beats and regimes of petriFavoredAdFitnessShare(favored,other)',
    },
    arms: [
      'full-semantic-selection',
      'shared-field-disabled',
      'semantic-channel-cyclic-permutation',
      'uniform-flux-no-affinity',
    ],
    armInterventions: {
      'full-semantic-selection': 'enabled regime signal with strain-specific semantic affinity',
      'shared-field-disabled': 'omit the organism-intelligence signal',
      'semantic-channel-cyclic-permutation':
        'pass v4CyclicSemanticPermutation(regime.signal) through v4SemanticSignal so named fields and channels rotate together',
      'uniform-flux-no-affinity':
        'bypass strain affinity and pass the same petriSharedEcologyFlux(regime signal) scalar to every stepBiologic call',
    },
  },
  titans: {
    controllerType: 'game-policy',
    titanPair: [0, 1],
    roundsPerRegime: 15,
    resetLaw:
      'each regime and arm starts from a fresh exact initial state; arms within a regime share byte-identical state and environment RNG tape',
    environmentRngSeedXor: V4_SEED_XOR.titanEnvironment,
    environmentRngSeedLaw: 'v4DerivedSeed(evaluationSeed, titanEnvironment, regimeIndex)',
    initialState: {
      energy: [60, 60],
      matter: [25, 25],
      entropy: [0.2, 0.2],
      strategiesFromRegime: true,
      histories: { movesA: 0, movesB: 0, rounds: 0 },
      strategyFitness: [3, 3, 3, 3, 3],
      relation: 'TRUCE',
      externalEconomyDisabled: true,
    },
    regimes: [
      {
        id: 'social-cooperation',
        strategies: ['ALWAYS-DEFECT', 'ALWAYS-DEFECT'],
        signal: { resource: 0, threat: 0, exploration: 0, social: 1, confidence: 1 },
        correctMove: 'COOPERATE',
      },
      {
        id: 'defensive-pressure',
        strategies: ['TIT-FOR-TAT', 'TIT-FOR-TAT'],
        signal: { resource: 1, threat: 1, exploration: 0, social: 0, confidence: 1 },
        correctMove: 'DEFECT',
      },
    ],
    initialHistory: { movesA: 0, movesB: 0, rounds: 0 },
    rngTape:
      'two unconditional samples per round from mulberry32(v4DerivedSeed(evaluationSeed,titanEnvironment,regimeIndex)), reused by strategy and semantic shift',
    primaryOutcome: {
      id: 'regime-correct-move-rate',
      scale: '[0,1]',
      formula: 'titanCorrectMoveRate(number of regime-correct played moves,60)',
    },
    arms: [
      'full-intelligence-diplomacy',
      'shared-field-disabled',
      'semantic-channel-cyclic-permutation',
      'action-rate-matched-policy-surrogate',
    ],
    armInterventions: {
      'full-intelligence-diplomacy':
        'enabled regime signal shifts each already-sampled strategy move',
      'shared-field-disabled': 'omit the organism-intelligence signal',
      'semantic-channel-cyclic-permutation':
        'pass v4CyclicSemanticPermutation(regime signal vector) through v4SemanticSignal so named fields and channels rotate together',
      'action-rate-matched-policy-surrogate':
        'replace each played move with the frozen single pooled calibration cooperation rate using the dedicated surrogate stream',
    },
    policySurrogate: {
      calibrationSeeds: V4_SURROGATE_CALIBRATION_SEEDS,
      rate: 'one pooled cooperation probability from both regimes and all 2 titans * 15 rounds * 16 calibration seeds in the full arm; no regime label enters the rate',
      streamSeedXor: V4_SEED_XOR.titanSurrogate,
      streamSeedLaw: 'v4DerivedSeed(evaluationSeed, titanSurrogate)',
      drawLaw:
        'one unconditional dedicated-stream draw per played move in regime, round, then titan-index order; cooperate iff draw < the single pooled calibration rate',
      environmentRngUnaffected: true,
    },
  },
} as const;

export const V4_SURROGATE_CALIBRATION = {
  sourceSeeds: V4_SURROGATE_CALIBRATION_SEEDS,
  sourceArm: 'full-semantic-recurrent',
  actionFrequency:
    'count(horizontal delta-velocity magnitude > 1e-12) / all calibration task steps',
  nonZeroThreshold: 1e-12,
  magnitudeDistribution:
    'ascending magnitudes strictly above 1e-12 from all calibration task steps',
  drawLaw:
    'each evaluation step consumes three unconditional draws a,b,c; emit zero when no magnitudes exist or a >= actionFrequency, otherwise select sortedMagnitude[min(n-1,floor(b*n))] and angle 2*pi*c',
  streamSeedXor: V4_SEED_XOR.ordinarySurrogate,
  streamSeedLaw: 'v4DerivedSeed(evaluationSeed, ordinarySurrogate)',
  motorBound: 0.12,
  calibrationSeedsMayNotEnterEvaluation: true,
} as const;

export interface V4OrdinarySurrogateCalibration {
  actionFrequency: number;
  sortedNonZeroMagnitudes: readonly number[];
}

export function v4CalibrateOrdinarySurrogate(
  horizontalActions: readonly (readonly [number, number])[],
): V4OrdinarySurrogateCalibration {
  const expected = V4_SURROGATE_CALIBRATION_SEEDS.length * 480;
  if (horizontalActions.length !== expected) {
    throw new RangeError(`ordinary calibration requires exactly ${expected} action vectors`);
  }
  const magnitudes: number[] = [];
  for (const [x, z] of horizontalActions) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      throw new RangeError('ordinary calibration actions must be finite');
    }
    const magnitude = Math.min(0.12, Math.hypot(x, z));
    if (magnitude > V4_SURROGATE_CALIBRATION.nonZeroThreshold) magnitudes.push(magnitude);
  }
  magnitudes.sort((a, b) => a - b);
  return {
    actionFrequency: magnitudes.length / horizontalActions.length,
    sortedNonZeroMagnitudes: magnitudes,
  };
}

export function v4OrdinarySurrogateStep(
  calibration: V4OrdinarySurrogateCalibration,
  rng: () => number,
): readonly [number, number] {
  if (
    !Number.isFinite(calibration.actionFrequency) ||
    calibration.actionFrequency < 0 ||
    calibration.actionFrequency > 1 ||
    calibration.sortedNonZeroMagnitudes.some(
      (value, index, values) =>
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 0.12 ||
        (index > 0 && value < values[index - 1]!),
    )
  ) {
    throw new RangeError('ordinary surrogate calibration is outside its frozen bounds');
  }
  const activity = rng();
  const quantile = rng();
  const angleDraw = rng();
  if (
    [activity, quantile, angleDraw].some(
      (value) => !Number.isFinite(value) || value < 0 || value >= 1,
    )
  ) {
    throw new RangeError('ordinary surrogate RNG draws must be in [0,1)');
  }
  const magnitudes = calibration.sortedNonZeroMagnitudes;
  if (magnitudes.length === 0 || activity >= calibration.actionFrequency) return [0, 0];
  const index = Math.min(magnitudes.length - 1, Math.floor(quantile * magnitudes.length));
  const magnitude = magnitudes[index]!;
  const angle = Math.PI * 2 * angleDraw;
  return [Math.cos(angle) * magnitude, Math.sin(angle) * magnitude];
}

export function v4CalibrateTitanCooperationRate(fullArmMoves: readonly (0 | 1)[]): number {
  const expected = V4_SURROGATE_CALIBRATION_SEEDS.length * 2 * 15 * 2;
  if (fullArmMoves.length !== expected) {
    throw new RangeError(`Titan calibration requires exactly ${expected} played moves`);
  }
  return fullArmMoves.reduce<number>((count, move) => count + (move === 0 ? 1 : 0), 0) / expected;
}

export function v4TitanSurrogateMove(cooperationRate: number, rng: () => number): 0 | 1 {
  if (!Number.isFinite(cooperationRate) || cooperationRate < 0 || cooperationRate > 1) {
    throw new RangeError('Titan cooperation rate must be in [0,1]');
  }
  const draw = rng();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new RangeError('Titan surrogate RNG draw must be in [0,1)');
  }
  return draw < cooperationRate ? 0 : 1;
}

export const V4_EXCLUSIONS = [
  ['alien-flora', 'ecological rate consumer lacks a frozen Phase-A primary task'],
  ['primordial-soup', 'separate from live Petri biologics and lacks a frozen Phase-A outcome'],
  ['wilderness-fauna', 'policy kernel has no frozen beneficial-outcome task'],
  ['nhi', 'native neural/GOAP controller requires an independent world-state task'],
  ['glyph-beings', 'current downstream consequence is visual-only'],
  ['shoggoths', 'heuristic/economy task not yet frozen'],
  ['puppeteers', 'intervention task not yet frozen'],
  ['leviathans', 'navigation-gain consumer has no native neural state'],
  ['archons', 'SuperMind path is outside the Phase-A shared-field evaluation'],
  ['apex', 'native ApexBrain task and capacity tiers are not frozen'],
  ['mechalogodrom', 'native fusion/STDP task and capacity tiers are not frozen'],
  ['wingmen', 'neural assist outcome is not frozen'],
  ['hero-and-twins', 'native SuperCreature task is not frozen'],
  ['light-archons', 'scalar-memory policy task is not frozen'],
  ['foundationals', 'current output is telemetry-only'],
  ['god-colossus', 'visual architecture is not a neural controller'],
] as const;

export const V4_HISTORICAL_SEED_SOURCES = [
  {
    path: 'docs/reports/assets/organism-intelligence-causal-benchmark.json',
    jsonPointer: '/protocol/heldOutSeeds',
    sha256: 'a8954e7925087b554a3e17573899dd86eaa8979143df8bbbf755838607afb60c',
  },
  {
    path: 'docs/reports/assets/organism-intelligence-causal-benchmark-v2.json',
    jsonPointer: '/protocol/heldOutSeeds',
    sha256: '3a0ee6aa9f1aa1f21b412aa36b30b6f507114253d8768fd10098e200c717a940',
  },
  {
    path: 'docs/reports/assets/organism-intelligence-causal-benchmark-v3.json',
    jsonPointer: '/protocol/evaluationSeeds',
    sha256: '32f527a009a0b0da6f430c411d2bda9bea8cb92b8b779293877cc3128c8ef15d',
  },
] as const;

export const V4_MATCHED_ARM_LAW = [
  'initial world state hash equal',
  'percept hash equal before intervention',
  'goal/task schedule hash equal',
  'population and capacity equal',
  'action bounds equal',
  'update cadence equal',
  'environment RNG tape hash and draw count equal',
  'dedicated surrogate RNG stream is isolated and hash-recorded where declared',
  'only the declared controller arm differs',
] as const;

export const V4_ACCEPTANCE = {
  outcomeScale: '[0,1] for every family primary outcome',
  primaryContrasts: {
    'ordinary-organisms': [
      'full-semantic-recurrent minus recurrence-disabled-current-input',
      'full-semantic-recurrent minus semantic-channel-cyclic-permutation',
      'full-semantic-recurrent minus goal-preserved-shared-field-disabled',
      'full-semantic-recurrent minus action-distribution-matched-surrogate',
    ],
    'simple-mnist-ecology-predictor': [
      'adaptive quality minus frozen quality',
      'adaptive quality minus target-shuffled quality',
    ],
    'petri-digital-biologics': [
      'full-semantic-selection minus shared-field-disabled',
      'full-semantic-selection minus semantic-channel-cyclic-permutation',
      'full-semantic-selection minus uniform-flux-no-affinity',
    ],
    titans: [
      'full-intelligence-diplomacy minus shared-field-disabled',
      'full-intelligence-diplomacy minus semantic-channel-cyclic-permutation',
      'full-intelligence-diplomacy minus action-rate-matched-policy-surrogate',
    ],
  },
  normalizedGainRule:
    'for ordinary, Petri, and Titans, every declared contrast has median paired full-minus-control outcome >= 0.05 normalized outcome points; this is absolute, not a percent ratio',
  predictorErrorRule:
    'compute one mean Brier per seed over true labels at scored cadences, then take each arm mean across all 64 seeds; (controlMeanBrier-adaptiveMeanBrier)/controlMeanBrier >= 0.05; if controlMeanBrier <= 1e-12 the contrast fails as undefined',
  worstSeedRule:
    'for ordinary, Petri, and Titans, every declared contrast has minimum paired full-minus-control outcome >= -0.20 normalized outcome points; no relative denominator',
  inferenceRule:
    'each primary contrast requires paired mean > 0, unadjusted paired-bootstrap 95% lower bound > 0, and Holm-adjusted one-sided sign-flip p < 0.05 within family',
  familyPassRule:
    'every declared primary contrast and the family-specific magnitude rule must pass',
  forestContrastRule:
    'plot the declared primary contrast with the smallest across-seed mean full-minus-control delta; ties resolve by source order; interval is unadjusted and the marker separately reports Holm-adjusted sign-flip pass/fail',
  replayRule: 'same seed, family, task, and arm must replay byte-identically',
  numericalSafetyRule:
    'all signals, states, parameters, actions, outcomes, and snapshots remain finite and in declared bounds for 10000 fault-injected steps',
  populationCostRule: {
    points: [1000, 5000, 10000, 50000],
    maxLogLogRuntimeSlope: 1.15,
    maxIncrementalMedianMsAt50000: 3,
    maxEveryCounterbalancedBatchMedianMsAt50000: 3,
    semanticStorageBytesPerEntity: 17,
  },
  neuralCapacityRule:
    'not evaluated in Phase A because no family has three live preregistered capacity tiers',
  crossFamilyRule: 'Phase A forbids a pooled cross-family or neural-scaling pass',
} as const;

export function canonicalFixtureJson(family: V4FamilyId): string {
  return JSON.stringify(V4_FAMILY_FIXTURES[family]);
}

export function fixtureSha256(family: V4FamilyId): string {
  return new Bun.CryptoHasher('sha256').update(canonicalFixtureJson(family)).digest('hex');
}

function assertFiniteSeries(values: readonly number[], label: string): void {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new RangeError(`${label} requires a non-empty finite series`);
  }
}

export function mean(values: readonly number[]): number {
  assertFiniteSeries(values, 'mean');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function pairedDeltas(full: readonly number[], control: readonly number[]): number[] {
  if (full.length === 0 || full.length !== control.length) {
    throw new RangeError('paired outcomes require equal non-empty lengths');
  }
  assertFiniteSeries(full, 'full outcomes');
  assertFiniteSeries(control, 'control outcomes');
  return full.map((value, index) => value - control[index]!);
}

export function pairedMedian(values: readonly number[]): number {
  assertFiniteSeries(values, 'median');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : sorted[mid]!;
}

export function pairedBootstrapMeanCi(
  deltas: readonly number[],
  seed: number,
  samples = V4_BOOTSTRAP_SAMPLES,
  alpha = V4_ALPHA,
): readonly [number, number] {
  assertFiniteSeries(deltas, 'bootstrap');
  if (
    !Number.isInteger(samples) ||
    samples < 1000 ||
    !Number.isFinite(alpha) ||
    alpha <= 0 ||
    alpha >= 1
  ) {
    throw new RangeError('bootstrap requires at least 1000 samples and alpha strictly in (0,1)');
  }
  const rng = mulberry32(seed >>> 0 || 1);
  const draws = new Float64Array(samples);
  for (let sample = 0; sample < samples; sample++) {
    let sum = 0;
    for (let i = 0; i < deltas.length; i++) sum += deltas[Math.floor(rng() * deltas.length)]!;
    draws[sample] = sum / deltas.length;
  }
  draws.sort();
  const lower = draws[Math.floor((alpha / 2) * (samples - 1))] ?? 0;
  const upper = draws[Math.ceil((1 - alpha / 2) * (samples - 1))] ?? 0;
  return [lower, upper];
}

export function pairedSignFlipP(
  deltas: readonly number[],
  seed: number,
  samples = V4_SIGN_FLIP_SAMPLES,
): number {
  assertFiniteSeries(deltas, 'sign-flip test');
  if (!Number.isInteger(samples) || samples < 1000) {
    throw new RangeError('sign-flip test requires at least 1000 samples');
  }
  const observed = mean(deltas);
  const rng = mulberry32(seed >>> 0 || 1);
  let atLeastObserved = 0;
  for (let sample = 0; sample < samples; sample++) {
    let sum = 0;
    for (const delta of deltas) sum += (rng() < 0.5 ? -1 : 1) * delta;
    if (sum / deltas.length >= observed) atLeastObserved++;
  }
  return (atLeastObserved + 1) / (samples + 1);
}

export function holmAdjustedP(values: readonly number[]): number[] {
  if (
    values.length === 0 ||
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new RangeError('Holm adjustment requires a non-empty p-value series in [0,1]');
  }
  const ranked = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const adjusted = Array.from({ length: values.length }, () => 0);
  let running = 0;
  for (let rank = 0; rank < ranked.length; rank++) {
    const row = ranked[rank]!;
    running = Math.max(running, Math.min(1, (ranked.length - rank) * row.value));
    adjusted[row.index] = running;
  }
  return adjusted;
}

export type V4EffectSize =
  | { defined: true; value: number; reason: null }
  | { defined: false; value: null; reason: 'fewer-than-two-pairs' | 'zero-variance' };

/** JSON-safe paired Cohen dz. Zero variance is undefined, never Infinity or a fabricated zero. */
export function cohenDz(deltas: readonly number[]): V4EffectSize {
  assertFiniteSeries(deltas, 'Cohen dz');
  if (deltas.length < 2) return { defined: false, value: null, reason: 'fewer-than-two-pairs' };
  const center = mean(deltas);
  const variance =
    deltas.reduce((sum, value) => sum + (value - center) ** 2, 0) / (deltas.length - 1);
  const sd = Math.sqrt(variance);
  return sd > 1e-12
    ? { defined: true, value: center / sd, reason: null }
    : { defined: false, value: null, reason: 'zero-variance' };
}

export function predictorRelativeErrorReduction(
  adaptive: number,
  control: number,
): {
  defined: boolean;
  value: number;
} {
  if (
    !Number.isFinite(adaptive) ||
    !Number.isFinite(control) ||
    adaptive < 0 ||
    adaptive > 1 ||
    control < 0 ||
    control > 1
  ) {
    throw new RangeError('mean Brier errors must be finite and in [0,1]');
  }
  if (control <= 1e-12) return { defined: false, value: 0 };
  return { defined: true, value: (control - adaptive) / control };
}

/** Predictor magnitude gate: mean Brier is aggregated across all 64 seed-level errors per arm. */
export function predictorAggregateRelativeErrorReduction(
  adaptiveBrierBySeed: readonly number[],
  controlBrierBySeed: readonly number[],
): { defined: boolean; value: number } {
  for (const [label, values] of [
    ['adaptive', adaptiveBrierBySeed],
    ['control', controlBrierBySeed],
  ] as const) {
    if (
      values.length !== V4_EVALUATION_SEEDS.length ||
      values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    ) {
      throw new RangeError(`${label} Brier series must contain exactly 64 values in [0,1]`);
    }
  }
  return predictorRelativeErrorReduction(mean(adaptiveBrierBySeed), mean(controlBrierBySeed));
}

export function familyMagnitudePass(deltas: readonly number[]): boolean {
  assertV4EvaluationDeltas(deltas);
  const tolerance = 1e-12;
  return (
    pairedMedian(deltas) + tolerance >= V4_MIN_NORMALIZED_GAIN &&
    Math.min(...deltas) + tolerance >= V4_WORST_SEED_POINT_LOSS_MIN
  );
}

export type V4ResamplingKind = 'bootstrap' | 'sign-flip';

/** Fixed seed law: no result generator may choose a favorable Monte Carlo stream. */
export function v4ResamplingSeed(
  family: V4FamilyId,
  contrastIndex: number,
  kind: V4ResamplingKind,
): number {
  const familyIndex = V4_FAMILY_ORDER.indexOf(family);
  const contrastCount = V4_ACCEPTANCE.primaryContrasts[family].length;
  if (
    familyIndex < 0 ||
    !Number.isInteger(contrastIndex) ||
    contrastIndex < 0 ||
    contrastIndex >= contrastCount
  ) {
    throw new RangeError('resampling seed requires a declared family contrast index');
  }
  const base = kind === 'bootstrap' ? 0xb007_57a9 : 0x519f_11a9;
  return (
    (base ^ Math.imul(familyIndex + 1, 0x9e37_79b1) ^ Math.imul(contrastIndex + 1, 0x85eb_ca6b)) >>>
      0 || 1
  );
}

export interface V4ContrastSummary {
  contrast: string;
  meanDelta: number;
  medianDelta: number;
  worstSeedDelta: number;
  bootstrap95: readonly [number, number];
  rawSignFlipP: number;
  holmSignFlipP: number;
  effectSize: V4EffectSize;
  inferencePass: boolean;
}

function assertV4EvaluationDeltas(deltas: readonly number[]): void {
  if (
    deltas.length !== V4_EVALUATION_SEEDS.length ||
    deltas.some((value) => !Number.isFinite(value) || value < -1 || value > 1)
  ) {
    throw new RangeError('each primary contrast requires exactly 64 normalized deltas in [-1,1]');
  }
}

/** Run the complete frozen within-family inferential pipeline in declared source order. */
export function summarizeV4FamilyContrasts(
  family: V4FamilyId,
  deltasByContrast: readonly (readonly number[])[],
): V4ContrastSummary[] {
  const contrasts = V4_ACCEPTANCE.primaryContrasts[family];
  if (deltasByContrast.length !== contrasts.length) {
    throw new RangeError('one paired-delta vector is required for every declared family contrast');
  }
  for (const deltas of deltasByContrast) assertV4EvaluationDeltas(deltas);
  const rawP = deltasByContrast.map((deltas, index) =>
    pairedSignFlipP(deltas, v4ResamplingSeed(family, index, 'sign-flip')),
  );
  const adjustedP = holmAdjustedP(rawP);
  return deltasByContrast.map((deltas, index) => {
    const bootstrap95 = pairedBootstrapMeanCi(deltas, v4ResamplingSeed(family, index, 'bootstrap'));
    const meanDelta = mean(deltas);
    const holmSignFlipP = adjustedP[index]!;
    return {
      contrast: contrasts[index]!,
      meanDelta,
      medianDelta: pairedMedian(deltas),
      worstSeedDelta: Math.min(...deltas),
      bootstrap95,
      rawSignFlipP: rawP[index]!,
      holmSignFlipP,
      effectSize: cohenDz(deltas),
      inferencePass: meanDelta > 0 && bootstrap95[0] > 0 && holmSignFlipP < V4_ALPHA,
    };
  });
}

/** Conservative forest row: smallest mean benefit, with declared-order tie breaking. */
export function weakestV4ContrastIndex(deltasByContrast: readonly (readonly number[])[]): number {
  if (deltasByContrast.length === 0) throw new RangeError('at least one contrast is required');
  let selected = 0;
  let selectedMean = mean(deltasByContrast[0]!);
  for (let index = 1; index < deltasByContrast.length; index++) {
    const candidate = mean(deltasByContrast[index]!);
    if (candidate < selectedMean) {
      selected = index;
      selectedMean = candidate;
    }
  }
  return selected;
}

export function ordinaryActionScore(
  deltaVelocityX: number,
  deltaVelocityZ: number,
  goalX: number,
  goalZ: number,
): number {
  if (![deltaVelocityX, deltaVelocityZ, goalX, goalZ].every(Number.isFinite)) {
    throw new RangeError('ordinary score inputs must be finite');
  }
  const goalMagnitude = Math.hypot(goalX, goalZ);
  if (goalMagnitude <= 1e-12) throw new RangeError('ordinary score requires a non-zero goal');
  const projection = (deltaVelocityX * goalX + deltaVelocityZ * goalZ) / goalMagnitude;
  return bounded01((projection / 0.12 + 1) / 2);
}

export function predictionQuality(
  predictions: readonly number[],
  labels: readonly number[],
): number {
  if (predictions.length === 0 || predictions.length !== labels.length) {
    throw new RangeError('prediction quality requires equal non-empty series');
  }
  if (
    [...predictions, ...labels].some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new RangeError('prediction quality inputs must be in [0,1]');
  }
  return 1 - mean(predictions.map((prediction, index) => (prediction - labels[index]!) ** 2));
}

export function petriFavoredAdFitnessShare(favored: number, other: number): number {
  if (![favored, other].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new RangeError('Petri adFitness values must be finite and non-negative');
  }
  return bounded01(favored / Math.max(1e-12, favored + other));
}

export function titanCorrectMoveRate(correctMoves: number, totalMoves = 60): number {
  if (
    !Number.isInteger(correctMoves) ||
    !Number.isInteger(totalMoves) ||
    totalMoves <= 0 ||
    correctMoves < 0 ||
    correctMoves > totalMoves
  ) {
    throw new RangeError('Titan move counts must be bounded non-negative integers');
  }
  return correctMoves / totalMoves;
}
