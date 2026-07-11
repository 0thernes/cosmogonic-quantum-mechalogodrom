/** Publish-grade fault-injected numerical-safety receipt for every executable frozen V4 family. */
import * as THREE from 'three';
import type { AuditTrail } from '../../src/logging/audit';
import { HISTORY_WINDOW, payoff, PRISONERS_DILEMMA } from '../../src/math/games';
import { getQuantizationConfig } from '../../src/math/quantization';
import { mulberry32 } from '../../src/math/rng';
import { SpatialHash } from '../../src/math/spatial-hash';
import { stepBiologic, type Biologic } from '../../src/sim/digital-biologics';
import { EntityBrainField } from '../../src/sim/entity-brain';
import type { EntityManager } from '../../src/sim/entities';
import { createGeometryCache } from '../../src/sim/geometry-cache';
import { GENOME_LEN, TRAIT_GENES } from '../../src/sim/genome';
import {
  biologicSemanticAffinity,
  petriBiologicSelectionFlux,
  petriSharedEcologyFlux,
} from '../../src/sim/petri-dish';
import { GRID_CELL } from '../../src/sim/constants';
import {
  REL_ALLIANCE,
  REL_TRUCE,
  REL_WAR,
  TitanSystem,
  type TitanLore,
} from '../../src/sim/titans';
import {
  TsotchkeOrganismIntelligence,
  type TsotchkeOrganismInput,
  type TsotchkeOrganismIntelligenceSnapshot,
} from '../../src/sim/tsotchke-organism-intelligence';
import type {
  Entity,
  EntityData,
  OrganismGoalField,
  OrganismIntelligenceSignal,
  SimContext,
} from '../../src/types';
import {
  ordinaryActionScore,
  petriFavoredAdFitnessShare,
  titanCorrectMoveRate,
  V4_ACCEPTANCE,
  V4_FAMILY_FIXTURES,
  V4_PROTOCOL_VERSION,
  v4SemanticSignal,
  type V4SemanticVector,
} from '../organism-intelligence-v4-protocol';

const DEFAULT_FAULT_STEPS = 10_000;
const SIGNAL_SAMPLES_PER_STEP = 14;
const SEMANTIC_STATE_SAMPLES_PER_STEP = 4;
const ADAPTIVE_STATE_SAMPLES_PER_STEP = 5;
const PREDICTOR_PARAMETER_SAMPLES_PER_STEP = 25;
const PREDICTOR_STATE_SAMPLES_PER_STEP = 9;
const ACTION_SAMPLES_PER_STEP = 3;
const PARAMETER_ABSOLUTE_LIMIT = 8;
const ACTIVATION_BOUND = 4;
const ACTOR_VALUE_BOUND = 1;
const ACTOR_BIAS_BOUND = 0.35;
const PRE_GAIN_ACTION_BOUND = 1.5;
const ACTION_COMPONENT_BOUND =
  V4_FAMILY_FIXTURES['ordinary-organisms'].primaryOutcome.motorNormalization;
const HORIZONTAL_ACTION_RADIAL_BOUND = ACTION_COMPONENT_BOUND * Math.SQRT2;
const SPATIAL_ACTION_RADIAL_BOUND = ACTION_COMPONENT_BOUND * Math.sqrt(3);
const BOUND_EPSILON = 1e-12;
const PETRI_STATE_SAMPLES_PER_STEP = 34;
const PETRI_PARAMETER_SAMPLES_PER_STEP = 6;
const PETRI_ACTION_SAMPLES_PER_STEP = 2;
const TITAN_STATE_SAMPLES_PER_STEP = 20;
const TITAN_ACTION_SAMPLES_PER_STEP = 2;
const TITAN_PAYOFF_SAMPLES_PER_STEP = 2;
const SEMANTIC_SIGNAL_SAMPLES_PER_STEP = 14;
const TITAN_RESOURCE_CAP = 1000;
const TITAN_PAYOFF_MAX = 5;
const TITAN_GEOS = createGeometryCache();
const TITAN_MORPHS = Array.from({ length: 200 }, () => ({}));
const TITAN_LORE: TitanLore = {
  name: (kind, index) => `${kind}-${index}`,
  epithet: (kind, key) => `${kind}:${key}`,
};

export const V4_SEMANTIC_FAULT_INPUTS = ['resource', 'threat', 'exploration', 'social'] as const;

export const V4_NUMERICAL_FAULT_INPUTS = [
  'chaos',
  'entropy',
  'temperature',
  'population',
  'capacity',
  'meanMetabolicEnergy',
  'floraBiomass',
] as const satisfies readonly (keyof Omit<TsotchkeOrganismInput, 'frame'>)[];

export const V4_NUMERICAL_FAULT_CLASSES = [
  'nan',
  'positive-infinity',
  'negative-infinity',
  'negative-extreme',
  'positive-extreme',
] as const;

const FAULT_VALUES = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  -1e12,
  1e12,
] as const;

interface V4NumericalSampleCounts {
  signal: number;
  semanticState: number;
  adaptiveState: number;
  predictorParameter: number;
  predictorState: number;
  genomeParameter: number;
  action: number;
  outcome: number;
  activation: number;
  snapshot: number;
}

interface V4NumericalCampaign {
  forcedSteps: number;
  faultStepCount: number;
  faultEventCount: number;
  faultCoverageMatrix: number[][];
  faultCoverageComplete: boolean;
  signalSamples: number;
  semanticStateSamples: number;
  semanticReadyCount: number;
  adaptiveStateSamples: number;
  predictorParameterSamples: number;
  predictorStateSamples: number;
  genomeParameterSamples: number;
  actionSamples: number;
  outcomeSamples: number;
  activationSamples: number;
  snapshotSamples: number;
  snapshotRoundTripCount: number;
  thinkCount: number;
  expectedSampleCounts: V4NumericalSampleCounts;
  sampleCountsMatch: boolean;
  maximumAbsolutePredictorParameter: number;
  maximumAbsoluteGenomeParameter: number;
  maximumAbsoluteActionComponent: number;
  maximumAbsoluteGoalProjection: number;
  maximumHorizontalActionMagnitude: number;
  maximumSpatialActionMagnitude: number;
  minimumOutcome: number;
  maximumOutcome: number;
  maximumActivation: number;
  semanticStorageBytesPerEntity: number;
  genomeStorageBytesPerEntity: number;
  genomeStorageKind: ReturnType<EntityBrainField['genomeStorageKind']>;
  violationCount: number;
  firstViolations: string[];
  allFiniteAndBounded: boolean;
  finalFieldRevision: number;
  traceSha256: string;
}

interface V4PetriNumericalSampleCounts {
  sanitizedSignal: number;
  state: number;
  parameter: number;
  action: number;
  outcome: number;
  snapshot: number;
}

interface V4PetriNumericalCampaign {
  family: 'petri-digital-biologics';
  scope: 'live differential semantic flux into exact frozen specialists through stepBiologic';
  faultTarget: 'one raw pre-sanitization semantic lane per step';
  semanticLaneOrder: typeof V4_SEMANTIC_FAULT_INPUTS;
  faultClassOrder: typeof V4_NUMERICAL_FAULT_CLASSES;
  forcedSteps: number;
  faultStepCount: number;
  faultEventCount: number;
  faultCoverageMatrix: number[][];
  faultCoverageComplete: boolean;
  sanitizedSignalSamples: number;
  stateSamples: number;
  parameterSamples: number;
  actionSamples: number;
  outcomeSamples: number;
  snapshotSamples: number;
  snapshotRoundTripCount: number;
  expectedSampleCounts: V4PetriNumericalSampleCounts;
  sampleCountsMatch: boolean;
  maximumAdFitness: number;
  maximumAbsoluteFitnessWeight: number;
  maximumSelectionFlux: number;
  minimumOutcome: number;
  maximumOutcome: number;
  violationCount: number;
  firstViolations: string[];
  allFiniteAndBounded: boolean;
  traceSha256: string;
}

interface V4TitanNumericalSampleCounts {
  sanitizedSignal: number;
  state: number;
  action: number;
  payoff: number;
  outcome: number;
  snapshot: number;
  environmentRngDraw: number;
}

interface V4TitanNumericalCampaign {
  family: 'titans';
  scope: 'live TitanSystem pair-0 diplomacy with frozen regime strategies';
  faultTarget: 'one raw pre-sanitization semantic lane per diplomacy step';
  semanticLaneOrder: typeof V4_SEMANTIC_FAULT_INPUTS;
  faultClassOrder: typeof V4_NUMERICAL_FAULT_CLASSES;
  forcedSteps: number;
  faultStepCount: number;
  faultEventCount: number;
  faultCoverageMatrix: number[][];
  faultCoverageComplete: boolean;
  sanitizedSignalSamples: number;
  stateSamples: number;
  actionSamples: number;
  payoffSamples: number;
  outcomeSamples: number;
  snapshotSamples: number;
  snapshotRoundTripCount: number;
  environmentRngDrawCount: number;
  environmentRngTapeSha256: string;
  expectedSampleCounts: V4TitanNumericalSampleCounts;
  sampleCountsMatch: boolean;
  maximumEnergy: number;
  maximumFitness: number;
  minimumOutcome: number;
  maximumOutcome: number;
  violationCount: number;
  firstViolations: string[];
  allFiniteAndBounded: boolean;
  traceSha256: string;
}

interface V4FamilyNumericalScopeReceipt<TCampaign> {
  campaign: TCampaign;
  replayTraceSha256: string;
  replayViolationCount: number;
  replayMatched: boolean;
  gateMet: boolean;
  accepted: boolean;
}

export interface V4NumericalSafetyReceipt extends V4NumericalCampaign {
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  faultInputOrder: typeof V4_NUMERICAL_FAULT_INPUTS;
  faultClassOrder: typeof V4_NUMERICAL_FAULT_CLASSES;
  actionBounds: {
    semantics: string;
    absoluteComponent: number;
    absoluteGoalProjection: number;
    horizontalRadialDerived: number;
    spatialRadialDerived: number;
  };
  predictorParameterAbsoluteBound: number;
  activationBound: number;
  replayCheckedSteps: number;
  replayTraceSha256: string;
  replayViolationCount: number;
  replayMatched: boolean;
  familyScopes: {
    sharedOrdinaryPredictor: V4FamilyNumericalScopeReceipt<V4NumericalCampaign>;
    petri: V4FamilyNumericalScopeReceipt<V4PetriNumericalCampaign>;
    titans: V4FamilyNumericalScopeReceipt<V4TitanNumericalCampaign>;
  };
  aggregateViolationCount: number;
  gateMet: boolean;
  accepted: boolean;
  contentSha256: string;
}

function createEntity(): Entity {
  const data: EntityData = {
    mi: 0,
    vel: new THREE.Vector3(),
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
  } as unknown as EntityData;
  return { userData: data } as Entity;
}

function createGoalField(): OrganismGoalField {
  return {
    directionX: new Float32Array(1),
    directionZ: new Float32Array(1),
    desire: new Float32Array(1).fill(1),
    cover: new Float32Array(1).fill(1),
    revision: new Uint32Array(1),
  };
}

function bounded(value: number, low: number, high: number): boolean {
  return Number.isFinite(value) && value >= low && value <= high;
}

function bounded01(value: number): boolean {
  return bounded(value, 0, 1);
}

function predictorParameters(snapshot: TsotchkeOrganismIntelligenceSnapshot): number[] {
  const predictor = snapshot.ecologyPredictor;
  return [...predictor.w1, ...predictor.b1, ...predictor.w2, predictor.b2];
}

function predictorStructureFiniteAndBounded(
  snapshot: TsotchkeOrganismIntelligenceSnapshot,
  expectedRevision: number,
): boolean {
  const predictor = snapshot.ecologyPredictor;
  const parameters = predictorParameters(snapshot);
  return (
    predictor.schemaVersion === 1 &&
    predictor.model === 'tsotchke-ecology-predictor' &&
    Number.isSafeInteger(predictor.seed) &&
    predictor.seed >= 1 &&
    predictor.seed <= 0xffff_ffff &&
    bounded(predictor.learningRate, Number.MIN_VALUE, 1) &&
    predictor.adaptive === true &&
    predictor.revision === expectedRevision &&
    predictor.updateCount === Math.max(0, expectedRevision - 1) &&
    predictor.hasPending === true &&
    predictor.pendingInput.length === 4 &&
    predictor.pendingInput.every(bounded01) &&
    bounded01(predictor.pendingPrediction) &&
    predictor.w1.length === 16 &&
    predictor.b1.length === 4 &&
    predictor.w2.length === 4 &&
    parameters.length === PREDICTOR_PARAMETER_SAMPLES_PER_STEP &&
    parameters.every((value) => bounded(value, -PARAMETER_ABSOLUTE_LIMIT, PARAMETER_ABSOLUTE_LIMIT))
  );
}

function expectedSampleCounts(steps: number): V4NumericalSampleCounts {
  return {
    signal: steps * SIGNAL_SAMPLES_PER_STEP,
    semanticState: steps * SEMANTIC_STATE_SAMPLES_PER_STEP,
    adaptiveState: steps * ADAPTIVE_STATE_SAMPLES_PER_STEP,
    predictorParameter: steps * PREDICTOR_PARAMETER_SAMPLES_PER_STEP,
    predictorState: steps * PREDICTOR_STATE_SAMPLES_PER_STEP,
    genomeParameter: steps * GENOME_LEN,
    action: steps * ACTION_SAMPLES_PER_STEP,
    outcome: steps,
    activation: steps,
    snapshot: steps,
  };
}

function sampleCountsMatch(
  campaign: Pick<
    V4NumericalCampaign,
    | 'signalSamples'
    | 'semanticStateSamples'
    | 'adaptiveStateSamples'
    | 'predictorParameterSamples'
    | 'predictorStateSamples'
    | 'genomeParameterSamples'
    | 'actionSamples'
    | 'outcomeSamples'
    | 'activationSamples'
    | 'snapshotSamples'
  >,
  expected: V4NumericalSampleCounts,
): boolean {
  return (
    campaign.signalSamples === expected.signal &&
    campaign.semanticStateSamples === expected.semanticState &&
    campaign.adaptiveStateSamples === expected.adaptiveState &&
    campaign.predictorParameterSamples === expected.predictorParameter &&
    campaign.predictorStateSamples === expected.predictorState &&
    campaign.genomeParameterSamples === expected.genomeParameter &&
    campaign.actionSamples === expected.action &&
    campaign.outcomeSamples === expected.outcome &&
    campaign.activationSamples === expected.activation &&
    campaign.snapshotSamples === expected.snapshot
  );
}

function semanticSignalValues(signal: OrganismIntelligenceSignal): number[] {
  return [
    signal.resourcePressure,
    signal.threatResponse,
    signal.exploration,
    signal.socialDrive,
    signal.plasticity,
    signal.forecast,
    signal.confidence,
    signal.corpusDrive,
    signal.ecologyRisk,
    signal.ecologySurprise,
    ...signal.channels,
  ];
}

function faultedSemanticSignal(
  frame: number,
  nominal: V4SemanticVector,
): {
  signal: OrganismIntelligenceSignal;
  faultInputIndex: number;
  faultClassIndex: number;
} {
  const faultInputIndex = frame % V4_SEMANTIC_FAULT_INPUTS.length;
  const faultClassIndex = Math.floor(frame / V4_SEMANTIC_FAULT_INPUTS.length) % FAULT_VALUES.length;
  const raw: [number, number, number, number] = [...nominal];
  raw[faultInputIndex] = FAULT_VALUES[faultClassIndex]!;
  const signal: OrganismIntelligenceSignal = v4SemanticSignal(raw);
  signal.revision = frame + 1;
  return { signal, faultInputIndex, faultClassIndex };
}

function semanticFaultCoverageComplete(
  matrix: readonly (readonly number[])[],
  steps: number,
): boolean {
  return (
    matrix.length === V4_SEMANTIC_FAULT_INPUTS.length &&
    matrix.every(
      (row) => row.length === V4_NUMERICAL_FAULT_CLASSES.length && row.every((count) => count > 0),
    ) &&
    matrix.flat().reduce((sum, count) => sum + count, 0) === steps
  );
}

function cloneFrozenPetriSpecialist(
  source:
    | (typeof V4_FAMILY_FIXTURES)['petri-digital-biologics']['resourceSpecialist']
    | (typeof V4_FAMILY_FIXTURES)['petri-digital-biologics']['explorationSpecialist'],
): Biologic {
  return { ...source, fitnessWeights: [...source.fitnessWeights] };
}

function biologicFiniteAndBounded(biologic: Biologic, expectedGeneration: number): boolean {
  const boundedSubstrates = [
    biologic.gwtIgnition,
    biologic.spinOrder,
    biologic.qgtCurvature,
    biologic.irrepSymmetry,
    biologic.quakeAliveness,
    biologic.ulgLawfulness,
    biologic.logoMorph,
    biologic.metalCompute,
    biologic.qrngEntropy,
    biologic.pinnResidual,
    biologic.pimcPath,
    biologic.asteroidDynamics,
    biologic.consciousness,
    biologic.speciation,
  ];
  return (
    Number.isSafeInteger(biologic.id) &&
    biologic.id >= 0 &&
    bounded(biologic.adFitness, 0, 2) &&
    boundedSubstrates.every(bounded01) &&
    biologic.alive === true &&
    biologic.generation === expectedGeneration &&
    Number.isSafeInteger(biologic.generation) &&
    biologic.fitnessWeights?.length === 3 &&
    biologic.fitnessWeights.every(bounded01) &&
    (biologic.selfModelErr === undefined || bounded01(biologic.selfModelErr))
  );
}

function runPetriCampaign(steps: number): V4PetriNumericalCampaign {
  const fixture = V4_FAMILY_FIXTURES['petri-digital-biologics'];
  const resource = cloneFrozenPetriSpecialist(fixture.resourceSpecialist);
  const exploration = cloneFrozenPetriSpecialist(fixture.explorationSpecialist);
  const traceHasher = new Bun.CryptoHasher('sha256');
  traceHasher.update(
    JSON.stringify({
      semanticLaneOrder: V4_SEMANTIC_FAULT_INPUTS,
      faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
    }),
  );
  const faultCoverageMatrix = V4_SEMANTIC_FAULT_INPUTS.map(() =>
    V4_NUMERICAL_FAULT_CLASSES.map(() => 0),
  );
  const violations: string[] = [];
  let violationCount = 0;
  let faultStepCount = 0;
  let faultEventCount = 0;
  let sanitizedSignalSamples = 0;
  let stateSamples = 0;
  let parameterSamples = 0;
  let actionSamples = 0;
  let outcomeSamples = 0;
  let snapshotSamples = 0;
  let snapshotRoundTripCount = 0;
  let maximumAdFitness = 0;
  let maximumAbsoluteFitnessWeight = 0;
  let maximumSelectionFlux = 0;
  let minimumOutcome = Number.POSITIVE_INFINITY;
  let maximumOutcome = Number.NEGATIVE_INFINITY;
  const fail = (step: number, label: string): void => {
    violationCount++;
    if (violations.length < 32) violations.push(`${step}:${label}`);
  };

  for (let step = 0; step < steps; step++) {
    const regime = fixture.regimes[step % fixture.totalBeats < 120 ? 0 : 1]!;
    const { signal, faultInputIndex, faultClassIndex } = faultedSemanticSignal(
      step,
      regime.signal as V4SemanticVector,
    );
    faultCoverageMatrix[faultInputIndex]![faultClassIndex]!++;
    faultStepCount++;
    faultEventCount++;
    const signalValues = semanticSignalValues(signal);
    sanitizedSignalSamples += signalValues.length;
    if (
      signalValues.length !== SEMANTIC_SIGNAL_SAMPLES_PER_STEP ||
      signalValues.some((value) => !bounded01(value))
    ) {
      fail(step, 'petri-sanitized-signal-out-of-bounds');
    }

    const baseFlux = petriSharedEcologyFlux(signal);
    const resourceAffinity = biologicSemanticAffinity(resource, signal);
    const explorationAffinity = biologicSemanticAffinity(exploration, signal);
    const resourceFlux = petriBiologicSelectionFlux(baseFlux, resource, signal);
    const explorationFlux = petriBiologicSelectionFlux(baseFlux, exploration, signal);
    const fluxes = [resourceFlux, explorationFlux];
    actionSamples += fluxes.length;
    maximumSelectionFlux = Math.max(maximumSelectionFlux, ...fluxes);
    if (
      !bounded01(baseFlux) ||
      !bounded01(resourceAffinity) ||
      !bounded01(explorationAffinity) ||
      fluxes.length !== PETRI_ACTION_SAMPLES_PER_STEP ||
      fluxes.some((value) => !bounded(value, 0, 2))
    ) {
      fail(step, 'petri-selection-action-out-of-bounds');
    }

    stepBiologic(resource, resourceFlux, true);
    stepBiologic(exploration, explorationFlux, true);
    stateSamples += PETRI_STATE_SAMPLES_PER_STEP;
    parameterSamples += PETRI_PARAMETER_SAMPLES_PER_STEP;
    maximumAdFitness = Math.max(maximumAdFitness, resource.adFitness, exploration.adFitness);
    for (const weight of [
      ...(resource.fitnessWeights ?? []),
      ...(exploration.fitnessWeights ?? []),
    ]) {
      maximumAbsoluteFitnessWeight = Math.max(maximumAbsoluteFitnessWeight, Math.abs(weight));
    }
    if (
      resource.id !== fixture.resourceSpecialist.id ||
      resource.form !== fixture.resourceSpecialist.form ||
      exploration.id !== fixture.explorationSpecialist.id ||
      exploration.form !== fixture.explorationSpecialist.form ||
      !biologicFiniteAndBounded(resource, step + 1) ||
      !biologicFiniteAndBounded(exploration, step + 1)
    ) {
      fail(step, 'petri-biologic-state-out-of-bounds');
    }

    const favored = regime.favoredId === resource.id ? resource : exploration;
    const other = favored === resource ? exploration : resource;
    let outcome = Number.NaN;
    try {
      outcome = petriFavoredAdFitnessShare(favored.adFitness, other.adFitness);
    } catch {
      fail(step, 'petri-outcome-evaluation-failed');
    }
    outcomeSamples++;
    minimumOutcome = Math.min(minimumOutcome, outcome);
    maximumOutcome = Math.max(maximumOutcome, outcome);
    if (!bounded01(outcome)) fail(step, 'petri-outcome-out-of-bounds');

    const snapshot = {
      step,
      favoredId: regime.favoredId,
      sanitizedSignal: signalValues,
      baseFlux,
      affinities: [resourceAffinity, explorationAffinity],
      selectionFluxes: fluxes,
      outcome,
      specialists: [
        { ...resource, fitnessWeights: [...(resource.fitnessWeights ?? [])] },
        { ...exploration, fitnessWeights: [...(exploration.fitnessWeights ?? [])] },
      ],
    };
    snapshotSamples++;
    const snapshotJson = JSON.stringify(snapshot);
    try {
      if (JSON.stringify(JSON.parse(snapshotJson)) === snapshotJson) snapshotRoundTripCount++;
      else fail(step, 'petri-snapshot-round-trip-mismatch');
    } catch {
      fail(step, 'petri-snapshot-invalid');
    }
    traceHasher.update(`${step}:${faultInputIndex}:${faultClassIndex}:`);
    traceHasher.update(snapshotJson);
  }

  const expectedSampleCounts: V4PetriNumericalSampleCounts = {
    sanitizedSignal: steps * SEMANTIC_SIGNAL_SAMPLES_PER_STEP,
    state: steps * PETRI_STATE_SAMPLES_PER_STEP,
    parameter: steps * PETRI_PARAMETER_SAMPLES_PER_STEP,
    action: steps * PETRI_ACTION_SAMPLES_PER_STEP,
    outcome: steps,
    snapshot: steps,
  };
  const countsMatch =
    sanitizedSignalSamples === expectedSampleCounts.sanitizedSignal &&
    stateSamples === expectedSampleCounts.state &&
    parameterSamples === expectedSampleCounts.parameter &&
    actionSamples === expectedSampleCounts.action &&
    outcomeSamples === expectedSampleCounts.outcome &&
    snapshotSamples === expectedSampleCounts.snapshot;
  if (!countsMatch) fail(steps, 'petri-sample-count-mismatch');
  const faultCoverageComplete =
    faultStepCount === steps &&
    faultEventCount === steps &&
    semanticFaultCoverageComplete(faultCoverageMatrix, steps);

  return {
    family: 'petri-digital-biologics',
    scope: 'live differential semantic flux into exact frozen specialists through stepBiologic',
    faultTarget: 'one raw pre-sanitization semantic lane per step',
    semanticLaneOrder: V4_SEMANTIC_FAULT_INPUTS,
    faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
    forcedSteps: steps,
    faultStepCount,
    faultEventCount,
    faultCoverageMatrix,
    faultCoverageComplete,
    sanitizedSignalSamples,
    stateSamples,
    parameterSamples,
    actionSamples,
    outcomeSamples,
    snapshotSamples,
    snapshotRoundTripCount,
    expectedSampleCounts,
    sampleCountsMatch: countsMatch,
    maximumAdFitness,
    maximumAbsoluteFitnessWeight,
    maximumSelectionFlux,
    minimumOutcome,
    maximumOutcome,
    violationCount,
    firstViolations: violations,
    allFiniteAndBounded: violationCount === 0,
    traceSha256: traceHasher.digest('hex'),
  };
}

interface NumericalTitanPrivate {
  energy: number;
  matter: number;
  entropy: number;
  strategy: number;
  warCount: number;
}

interface NumericalTitanHistory {
  movesA: number;
  movesB: number;
  rounds: number;
}

interface NumericalTitanHarness {
  diplomacy(pairIndex: number): void;
  econWealth: ((titanIndex: number) => number) | null;
  titans: NumericalTitanPrivate[];
  histories: NumericalTitanHistory[];
  stratFitness: Float64Array;
}

function makeTitanContext(seed: number, signal: OrganismIntelligenceSignal): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop',
      isMobile: false,
      instanced: true,
      dprCap: 1,
      maxEntities: 1,
      targetEntities: 1,
      quantumCount: 1,
      maxLinks: 1,
      shadows: false,
      starCount: 1,
      quantization: getQuantizationConfig('phone'),
      simRate: 15,
    },
    rng: mulberry32(seed),
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs: TITAN_MORPHS as SimContext['morphs'],
    geos: TITAN_GEOS,
    state: {
      chaos: 1.5,
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
    },
    organismIntelligence: signal,
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

function runTitanCampaign(steps: number): V4TitanNumericalCampaign {
  const fixture = V4_FAMILY_FIXTURES.titans;
  const initialSignal = v4SemanticSignal([0, 0, 0, 0]);
  const context = makeTitanContext(0x71a4_4004, initialSignal);
  const system = new TitanSystem(context, {} as EntityManager, TITAN_LORE, {
    perturb: () => undefined,
  });
  const harness = system as unknown as NumericalTitanHarness;
  const initial = fixture.initialState;
  for (let index = 0; index < 2; index++) {
    const titan = harness.titans[index]!;
    titan.energy = initial.energy[index]!;
    titan.matter = initial.matter[index]!;
    titan.entropy = initial.entropy[index]!;
    titan.strategy = 3;
    titan.warCount = 0;
  }
  const history = harness.histories[0]!;
  history.movesA = 0;
  history.movesB = 0;
  history.rounds = 0;
  harness.stratFitness.set(initial.strategyFitness);
  system.warMatrix[1] = REL_TRUCE;
  system.warMatrix[20] = REL_TRUCE;

  const rngSource = mulberry32(0xd1f1_4004);
  const rngHasher = new Bun.CryptoHasher('sha256');
  let environmentRngDrawCount = 0;
  context.rng = () => {
    const value = rngSource();
    rngHasher.update(`${environmentRngDrawCount}:${value};`);
    environmentRngDrawCount++;
    return value;
  };
  const traceHasher = new Bun.CryptoHasher('sha256');
  traceHasher.update(
    JSON.stringify({
      semanticLaneOrder: V4_SEMANTIC_FAULT_INPUTS,
      faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
    }),
  );
  const faultCoverageMatrix = V4_SEMANTIC_FAULT_INPUTS.map(() =>
    V4_NUMERICAL_FAULT_CLASSES.map(() => 0),
  );
  const violations: string[] = [];
  let violationCount = 0;
  let faultStepCount = 0;
  let faultEventCount = 0;
  let sanitizedSignalSamples = 0;
  let stateSamples = 0;
  let actionSamples = 0;
  let payoffSamples = 0;
  let outcomeSamples = 0;
  let snapshotSamples = 0;
  let snapshotRoundTripCount = 0;
  let maximumEnergy = 0;
  let maximumFitness = 0;
  let minimumOutcome = Number.POSITIVE_INFINITY;
  let maximumOutcome = Number.NEGATIVE_INFINITY;
  const fail = (step: number, label: string): void => {
    violationCount++;
    if (violations.length < 32) violations.push(`${step}:${label}`);
  };

  try {
    for (let step = 0; step < steps; step++) {
      const regime = fixture.regimes[step % 240 < 120 ? 0 : 1]!;
      const nominal: V4SemanticVector = [
        regime.signal.resource,
        regime.signal.threat,
        regime.signal.exploration,
        regime.signal.social,
      ];
      const { signal, faultInputIndex, faultClassIndex } = faultedSemanticSignal(step, nominal);
      context.organismIntelligence = signal;
      faultCoverageMatrix[faultInputIndex]![faultClassIndex]!++;
      faultStepCount++;
      faultEventCount++;
      const signalValues = semanticSignalValues(signal);
      sanitizedSignalSamples += signalValues.length;
      if (
        signalValues.length !== SEMANTIC_SIGNAL_SAMPLES_PER_STEP ||
        signalValues.some((value) => !bounded01(value))
      ) {
        fail(step, 'titan-sanitized-signal-out-of-bounds');
      }

      const strategy = regime.id === 'social-cooperation' ? 3 : 0;
      system.setStrategy(0, strategy);
      system.setStrategy(1, strategy);
      harness.diplomacy(0);
      const moveA = history.movesA & 1;
      const moveB = history.movesB & 1;
      const moves = [moveA, moveB];
      actionSamples += moves.length;
      if (
        moves.length !== TITAN_ACTION_SAMPLES_PER_STEP ||
        moves.some((move) => move !== 0 && move !== 1)
      ) {
        fail(step, 'titan-move-out-of-bounds');
      }

      const payoffA = payoff(PRISONERS_DILEMMA, moveA as 0 | 1, moveB as 0 | 1);
      const payoffB = payoff(PRISONERS_DILEMMA, moveB as 0 | 1, moveA as 0 | 1);
      const payoffs = [payoffA, payoffB];
      payoffSamples += payoffs.length;
      if (
        payoffs.length !== TITAN_PAYOFF_SAMPLES_PER_STEP ||
        payoffs.some((value) => !bounded(value, 0, TITAN_PAYOFF_MAX))
      ) {
        fail(step, 'titan-payoff-out-of-bounds');
      }

      const correctMove = regime.correctMove === 'COOPERATE' ? 0 : 1;
      const correctMoves = Number(moveA === correctMove) + Number(moveB === correctMove);
      let outcome = Number.NaN;
      try {
        outcome = titanCorrectMoveRate(correctMoves, 2);
      } catch {
        fail(step, 'titan-outcome-evaluation-failed');
      }
      outcomeSamples++;
      minimumOutcome = Math.min(minimumOutcome, outcome);
      maximumOutcome = Math.max(maximumOutcome, outcome);
      if (!bounded01(outcome)) fail(step, 'titan-outcome-out-of-bounds');

      const titanA = harness.titans[0]!;
      const titanB = harness.titans[1]!;
      const fitness = [...harness.stratFitness];
      const relation = system.warMatrix[1]!;
      const reverseRelation = system.warMatrix[20]!;
      const numericState = [
        titanA.energy,
        titanA.matter,
        titanA.entropy,
        titanA.strategy,
        titanA.warCount,
        titanB.energy,
        titanB.matter,
        titanB.entropy,
        titanB.strategy,
        titanB.warCount,
        history.movesA,
        history.movesB,
        history.rounds,
        ...fitness,
        relation,
        reverseRelation,
      ];
      stateSamples += numericState.length;
      maximumEnergy = Math.max(maximumEnergy, titanA.energy, titanB.energy);
      maximumFitness = Math.max(maximumFitness, ...fitness);
      const historyMask = (1 << history.rounds) - 1;
      const relationValid =
        (relation === REL_TRUCE || relation === REL_ALLIANCE || relation === REL_WAR) &&
        reverseRelation === relation;
      const warCountExpected = relation === REL_WAR ? 1 : 0;
      if (
        numericState.length !== TITAN_STATE_SAMPLES_PER_STEP ||
        !bounded(titanA.energy, 0, TITAN_RESOURCE_CAP) ||
        !bounded(titanB.energy, 0, TITAN_RESOURCE_CAP) ||
        !bounded(titanA.matter, 0, TITAN_RESOURCE_CAP) ||
        !bounded(titanB.matter, 0, TITAN_RESOURCE_CAP) ||
        !bounded(titanA.entropy, 0, TITAN_RESOURCE_CAP) ||
        !bounded(titanB.entropy, 0, TITAN_RESOURCE_CAP) ||
        !Number.isInteger(titanA.strategy) ||
        titanA.strategy < 0 ||
        titanA.strategy > 4 ||
        !Number.isInteger(titanB.strategy) ||
        titanB.strategy < 0 ||
        titanB.strategy > 4 ||
        !Number.isInteger(history.rounds) ||
        history.rounds < 1 ||
        history.rounds > HISTORY_WINDOW ||
        !Number.isInteger(history.movesA) ||
        !Number.isInteger(history.movesB) ||
        (history.movesA & ~historyMask) !== 0 ||
        (history.movesB & ~historyMask) !== 0 ||
        fitness.length !== 5 ||
        fitness.some((value) => !bounded(value, 0, TITAN_PAYOFF_MAX)) ||
        !relationValid ||
        titanA.warCount !== warCountExpected ||
        titanB.warCount !== warCountExpected
      ) {
        fail(step, 'titan-state-out-of-bounds');
      }

      const snapshot = {
        step,
        regime: regime.id,
        sanitizedSignal: signalValues,
        moves,
        payoffs,
        outcome,
        titans: [
          {
            energy: titanA.energy,
            matter: titanA.matter,
            entropy: titanA.entropy,
            strategy: titanA.strategy,
            warCount: titanA.warCount,
          },
          {
            energy: titanB.energy,
            matter: titanB.matter,
            entropy: titanB.entropy,
            strategy: titanB.strategy,
            warCount: titanB.warCount,
          },
        ],
        history: { ...history },
        strategyFitness: fitness,
        relation,
        reverseRelation,
      };
      snapshotSamples++;
      const snapshotJson = JSON.stringify(snapshot);
      try {
        if (JSON.stringify(JSON.parse(snapshotJson)) === snapshotJson) snapshotRoundTripCount++;
        else fail(step, 'titan-snapshot-round-trip-mismatch');
      } catch {
        fail(step, 'titan-snapshot-invalid');
      }
      traceHasher.update(`${step}:${faultInputIndex}:${faultClassIndex}:`);
      traceHasher.update(snapshotJson);
    }
  } finally {
    system.dispose();
  }

  const expectedSampleCounts: V4TitanNumericalSampleCounts = {
    sanitizedSignal: steps * SEMANTIC_SIGNAL_SAMPLES_PER_STEP,
    state: steps * TITAN_STATE_SAMPLES_PER_STEP,
    action: steps * TITAN_ACTION_SAMPLES_PER_STEP,
    payoff: steps * TITAN_PAYOFF_SAMPLES_PER_STEP,
    outcome: steps,
    snapshot: steps,
    environmentRngDraw: steps * 2,
  };
  const countsMatch =
    sanitizedSignalSamples === expectedSampleCounts.sanitizedSignal &&
    stateSamples === expectedSampleCounts.state &&
    actionSamples === expectedSampleCounts.action &&
    payoffSamples === expectedSampleCounts.payoff &&
    outcomeSamples === expectedSampleCounts.outcome &&
    snapshotSamples === expectedSampleCounts.snapshot &&
    environmentRngDrawCount === expectedSampleCounts.environmentRngDraw;
  if (!countsMatch) fail(steps, 'titan-sample-count-mismatch');
  const faultCoverageComplete =
    faultStepCount === steps &&
    faultEventCount === steps &&
    semanticFaultCoverageComplete(faultCoverageMatrix, steps);

  return {
    family: 'titans',
    scope: 'live TitanSystem pair-0 diplomacy with frozen regime strategies',
    faultTarget: 'one raw pre-sanitization semantic lane per diplomacy step',
    semanticLaneOrder: V4_SEMANTIC_FAULT_INPUTS,
    faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
    forcedSteps: steps,
    faultStepCount,
    faultEventCount,
    faultCoverageMatrix,
    faultCoverageComplete,
    sanitizedSignalSamples,
    stateSamples,
    actionSamples,
    payoffSamples,
    outcomeSamples,
    snapshotSamples,
    snapshotRoundTripCount,
    environmentRngDrawCount,
    environmentRngTapeSha256: rngHasher.digest('hex'),
    expectedSampleCounts,
    sampleCountsMatch: countsMatch,
    maximumEnergy,
    maximumFitness,
    minimumOutcome,
    maximumOutcome,
    violationCount,
    firstViolations: violations,
    allFiniteAndBounded: violationCount === 0,
    traceSha256: traceHasher.digest('hex'),
  };
}

function runCampaign(steps: number): V4NumericalCampaign {
  const field = new TsotchkeOrganismIntelligence(0xf00d_4004, { cadenceFrames: 1 });
  const brain = new EntityBrainField(1, mulberry32(0xb4a1_5004));
  brain.setOnlineLearningEnabled(false);
  const entity = createEntity();
  const goals = createGoalField();
  const violations: string[] = [];
  const traceHasher = new Bun.CryptoHasher('sha256');
  const faultCoverageMatrix = V4_NUMERICAL_FAULT_INPUTS.map(() =>
    V4_NUMERICAL_FAULT_CLASSES.map(() => 0),
  );
  let violationCount = 0;
  let faultStepCount = 0;
  let faultEventCount = 0;
  let signalSamples = 0;
  let semanticStateSamples = 0;
  let semanticReadyCount = 0;
  let adaptiveStateSamples = 0;
  let predictorParameterSamples = 0;
  let predictorStateSamples = 0;
  let genomeParameterSamples = 0;
  let actionSamples = 0;
  let outcomeSamples = 0;
  let activationSamples = 0;
  let snapshotSamples = 0;
  let snapshotRoundTripCount = 0;
  let thinkCount = 0;
  let maximumAbsolutePredictorParameter = 0;
  let maximumAbsoluteGenomeParameter = 0;
  let maximumAbsoluteActionComponent = 0;
  let maximumAbsoluteGoalProjection = 0;
  let maximumHorizontalActionMagnitude = 0;
  let maximumSpatialActionMagnitude = 0;
  let minimumOutcome = Number.POSITIVE_INFINITY;
  let maximumOutcome = Number.NEGATIVE_INFINITY;
  let maximumActivation = 0;

  const fail = (frame: number, label: string): void => {
    violationCount++;
    if (violations.length < 32) violations.push(`${frame}:${label}`);
  };

  for (let frame = 0; frame < steps; frame++) {
    // Exactly one input is faulted on every step. The coprime 7-input/5-fault rotation covers the
    // complete 7x5 matrix every 35 steps without conflating a clean frame with a faulted cadence.
    const faultInputIndex = frame % V4_NUMERICAL_FAULT_INPUTS.length;
    const faultClassIndex =
      Math.floor(frame / V4_NUMERICAL_FAULT_INPUTS.length) % FAULT_VALUES.length;
    const faultInput = V4_NUMERICAL_FAULT_INPUTS[faultInputIndex]!;
    const fault = FAULT_VALUES[faultClassIndex]!;
    faultCoverageMatrix[faultInputIndex]![faultClassIndex]!++;
    faultStepCount++;
    faultEventCount++;
    const inject = (input: (typeof V4_NUMERICAL_FAULT_INPUTS)[number], nominal: number): number =>
      faultInput === input ? fault : nominal;

    const signal = field.step({
      frame,
      chaos: inject('chaos', (frame % 101) / 100),
      entropy: inject('entropy', (frame % 97) / 96),
      temperature: inject('temperature', 20 + Math.sin(frame * 0.01) * 90),
      population: inject('population', frame * 10),
      capacity: inject('capacity', 50_000),
      meanMetabolicEnergy: inject('meanMetabolicEnergy', (frame % 89) / 88),
      floraBiomass: inject('floraBiomass', (frame % 83) / 82),
    });
    const signalValues = [
      signal.resourcePressure,
      signal.threatResponse,
      signal.exploration,
      signal.socialDrive,
      signal.plasticity,
      signal.forecast,
      signal.confidence,
      signal.corpusDrive,
      signal.ecologyRisk,
      signal.ecologySurprise,
      ...signal.channels,
    ];
    signalSamples += signalValues.length;
    if (
      signalValues.length !== SIGNAL_SAMPLES_PER_STEP ||
      signalValues.some((value) => !bounded01(value))
    ) {
      fail(frame, 'signal-out-of-bounds');
    }
    if (
      signal.enabled !== true ||
      signal.indicatorOnly !== true ||
      signal.revision !== frame + 1 ||
      !Number.isInteger(signal.integratedRepoCount) ||
      signal.integratedRepoCount < 0 ||
      signal.integratedRepoCount > 22 ||
      typeof signal.diagnosticAlert !== 'boolean'
    ) {
      fail(frame, 'signal-structure-invalid');
    }

    goals.directionX[0] = frame % 2 === 0 ? 1 : -1;
    goals.directionZ[0] = 0;
    goals.revision[0] = frame + 1;
    entity.userData.vel.set(0, 0, 0);
    brain.attachAdaptiveField(signal, goals);
    const thought = brain.thinkAll([entity], 3, frame / 60);
    thinkCount += thought;
    if (thought !== 1) fail(frame, 'ordinary-controller-did-not-run');

    const actionX = entity.userData.vel.x;
    const actionY = entity.userData.vel.y;
    const actionZ = entity.userData.vel.z;
    const actions = [actionX, actionY, actionZ];
    const horizontalActionMagnitude = Math.hypot(actionX, actionZ);
    const spatialActionMagnitude = Math.hypot(actionX, actionY, actionZ);
    const goalX = goals.directionX[0]!;
    const goalZ = goals.directionZ[0]!;
    const goalMagnitude = Math.hypot(goalX, goalZ);
    const goalProjection = (actionX * goalX + actionZ * goalZ) / goalMagnitude;
    actionSamples += actions.length;
    maximumAbsoluteActionComponent = Math.max(
      maximumAbsoluteActionComponent,
      ...actions.map(Math.abs),
    );
    maximumAbsoluteGoalProjection = Math.max(
      maximumAbsoluteGoalProjection,
      Math.abs(goalProjection),
    );
    maximumHorizontalActionMagnitude = Math.max(
      maximumHorizontalActionMagnitude,
      horizontalActionMagnitude,
    );
    maximumSpatialActionMagnitude = Math.max(maximumSpatialActionMagnitude, spatialActionMagnitude);
    if (
      actions.length !== ACTION_SAMPLES_PER_STEP ||
      actions.some(
        (value) =>
          !Number.isFinite(value) || Math.abs(value) > ACTION_COMPONENT_BOUND + BOUND_EPSILON,
      ) ||
      !Number.isFinite(goalProjection) ||
      Math.abs(goalProjection) > ACTION_COMPONENT_BOUND + BOUND_EPSILON ||
      horizontalActionMagnitude > HORIZONTAL_ACTION_RADIAL_BOUND + BOUND_EPSILON ||
      spatialActionMagnitude > SPATIAL_ACTION_RADIAL_BOUND + BOUND_EPSILON
    ) {
      fail(frame, 'ordinary-action-out-of-bounds');
    }

    let outcome = Number.NaN;
    try {
      outcome = ordinaryActionScore(actionX, actionZ, goalX, goalZ);
    } catch {
      fail(frame, 'ordinary-outcome-evaluation-failed');
    }
    outcomeSamples++;
    minimumOutcome = Math.min(minimumOutcome, outcome);
    maximumOutcome = Math.max(maximumOutcome, outcome);
    if (!bounded01(outcome)) fail(frame, 'ordinary-outcome-out-of-bounds');

    const activation = entity.userData.act;
    activationSamples++;
    maximumActivation = Math.max(maximumActivation, activation);
    if (!bounded(activation, 0, ACTIVATION_BOUND)) fail(frame, 'ordinary-activation-out-of-bounds');

    const semantic = brain.semanticStateAt(0);
    const semanticValues = [
      semantic.resource,
      semantic.threat,
      semantic.exploration,
      semantic.social,
    ];
    semanticStateSamples += semanticValues.length;
    if (
      semanticValues.length !== SEMANTIC_STATE_SAMPLES_PER_STEP ||
      semanticValues.some((value) => !bounded01(value))
    ) {
      fail(frame, 'semantic-state-out-of-bounds');
    }
    if (semantic.ready) semanticReadyCount++;
    else fail(frame, 'semantic-state-not-ready');

    const adaptive = brain.adaptiveStateAt(0);
    const adaptiveValues = [
      adaptive.value,
      adaptive.biasX,
      adaptive.biasZ,
      adaptive.lastActionX,
      adaptive.lastActionZ,
    ];
    adaptiveStateSamples += adaptiveValues.length;
    if (
      adaptiveValues.length !== ADAPTIVE_STATE_SAMPLES_PER_STEP ||
      !bounded(adaptive.value, -ACTOR_VALUE_BOUND, ACTOR_VALUE_BOUND) ||
      !bounded(adaptive.biasX, -ACTOR_BIAS_BOUND, ACTOR_BIAS_BOUND) ||
      !bounded(adaptive.biasZ, -ACTOR_BIAS_BOUND, ACTOR_BIAS_BOUND) ||
      !bounded(adaptive.lastActionX, -PRE_GAIN_ACTION_BOUND, PRE_GAIN_ACTION_BOUND) ||
      !bounded(adaptive.lastActionZ, -PRE_GAIN_ACTION_BOUND, PRE_GAIN_ACTION_BOUND) ||
      adaptive.ready !== false
    ) {
      fail(frame, 'adaptive-state-out-of-bounds');
    }

    const genome = brain.genomeAt(0);
    genomeParameterSamples += genome.length;
    if (genome.length !== GENOME_LEN) fail(frame, 'ordinary-genome-length-mismatch');
    for (let index = 0; index < genome.length; index++) {
      const parameter = genome[index] ?? Number.NaN;
      maximumAbsoluteGenomeParameter = Math.max(
        maximumAbsoluteGenomeParameter,
        Math.abs(parameter),
      );
      const valid = index < TRAIT_GENES ? bounded01(parameter) : bounded(parameter, -1, 1);
      if (!valid) {
        fail(frame, 'ordinary-genome-parameter-out-of-bounds');
        break;
      }
    }

    const snapshot = field.snapshot();
    snapshotSamples++;
    const parameters = predictorParameters(snapshot);
    predictorParameterSamples += parameters.length;
    predictorStateSamples += PREDICTOR_STATE_SAMPLES_PER_STEP;
    for (const parameter of parameters) {
      maximumAbsolutePredictorParameter = Math.max(
        maximumAbsolutePredictorParameter,
        Math.abs(parameter),
      );
    }
    if (!predictorStructureFiniteAndBounded(snapshot, frame + 1)) {
      fail(frame, 'predictor-state-out-of-bounds');
    }

    const snapshotJson = JSON.stringify(snapshot);
    try {
      const restoredSnapshot = TsotchkeOrganismIntelligence.fromSnapshot(snapshot).snapshot();
      if (JSON.stringify(restoredSnapshot) === snapshotJson) snapshotRoundTripCount++;
      else fail(frame, 'snapshot-round-trip-mismatch');
    } catch {
      fail(frame, 'snapshot-structurally-invalid');
    }

    // The trace commits to every relevant dynamic value, the complete shared-field/predictor/state-vector
    // snapshot, and the complete ordinary genome on every step—not merely maxima or pending prediction.
    traceHasher.update(`${frame}:${faultInputIndex}:${faultClassIndex}:`);
    traceHasher.update(snapshotJson);
    traceHasher.update(JSON.stringify(Array.from(genome)));
    traceHasher.update(
      JSON.stringify([
        goalX,
        goalZ,
        goals.desire[0],
        goals.cover[0],
        goals.revision[0],
        actionX,
        actionY,
        actionZ,
        goalProjection,
        outcome,
        activation,
        ...semanticValues,
        semantic.ready,
        ...adaptiveValues,
        adaptive.ready,
        thought,
      ]),
    );
  }

  const semanticStorageBytesPerEntity = brain.semanticStorageBytes();
  if (
    semanticStorageBytesPerEntity !== V4_ACCEPTANCE.populationCostRule.semanticStorageBytesPerEntity
  ) {
    fail(steps, 'semantic-storage-byte-mismatch');
  }
  const genomeStorageBytesPerEntity = brain.genomeStorageBytes();
  const genomeStorageKind = brain.genomeStorageKind();
  if (
    genomeStorageBytesPerEntity !== GENOME_LEN * Float32Array.BYTES_PER_ELEMENT ||
    genomeStorageKind !== V4_FAMILY_FIXTURES['ordinary-organisms'].genomeStorage
  ) {
    fail(steps, 'ordinary-genome-storage-mismatch');
  }

  const expected = expectedSampleCounts(steps);
  const actualCounts = {
    signalSamples,
    semanticStateSamples,
    adaptiveStateSamples,
    predictorParameterSamples,
    predictorStateSamples,
    genomeParameterSamples,
    actionSamples,
    outcomeSamples,
    activationSamples,
    snapshotSamples,
  };
  const countsMatch = sampleCountsMatch(actualCounts, expected);
  if (!countsMatch) fail(steps, 'sample-count-mismatch');
  const faultCoverageComplete =
    faultStepCount === steps &&
    faultEventCount === steps &&
    faultCoverageMatrix.every(
      (row) => row.length === V4_NUMERICAL_FAULT_CLASSES.length && row.every((count) => count > 0),
    );

  return {
    forcedSteps: steps,
    faultStepCount,
    faultEventCount,
    faultCoverageMatrix,
    faultCoverageComplete,
    signalSamples,
    semanticStateSamples,
    semanticReadyCount,
    adaptiveStateSamples,
    predictorParameterSamples,
    predictorStateSamples,
    genomeParameterSamples,
    actionSamples,
    outcomeSamples,
    activationSamples,
    snapshotSamples,
    snapshotRoundTripCount,
    thinkCount,
    expectedSampleCounts: expected,
    sampleCountsMatch: countsMatch,
    maximumAbsolutePredictorParameter,
    maximumAbsoluteGenomeParameter,
    maximumAbsoluteActionComponent,
    maximumAbsoluteGoalProjection,
    maximumHorizontalActionMagnitude,
    maximumSpatialActionMagnitude,
    minimumOutcome,
    maximumOutcome,
    maximumActivation,
    semanticStorageBytesPerEntity,
    genomeStorageBytesPerEntity,
    genomeStorageKind,
    violationCount,
    firstViolations: violations,
    allFiniteAndBounded: violationCount === 0,
    finalFieldRevision: field.signal.revision,
    traceSha256: traceHasher.digest('hex'),
  };
}

/**
 * Run a deterministic campaign and an independent same-seed replay. Diagnostic prefixes may report
 * bounded state, but only the exact frozen 10,000-step campaign can set `gateMet`/`accepted` true.
 */
export function runV4NumericalSafety(steps = DEFAULT_FAULT_STEPS): V4NumericalSafetyReceipt {
  if (!Number.isInteger(steps) || steps < 1 || steps > DEFAULT_FAULT_STEPS) {
    throw new RangeError('V4 numerical safety steps must be an integer in [1,10000]');
  }
  const campaign = runCampaign(steps);
  const replay = runCampaign(steps);
  const sharedReplayMatched =
    campaign.traceSha256 === replay.traceSha256 &&
    JSON.stringify(campaign) === JSON.stringify(replay);
  const petriCampaign = runPetriCampaign(steps);
  const petriReplay = runPetriCampaign(steps);
  const petriReplayMatched =
    petriCampaign.traceSha256 === petriReplay.traceSha256 &&
    JSON.stringify(petriCampaign) === JSON.stringify(petriReplay);
  const titanCampaign = runTitanCampaign(steps);
  const titanReplay = runTitanCampaign(steps);
  const titanReplayMatched =
    titanCampaign.traceSha256 === titanReplay.traceSha256 &&
    JSON.stringify(titanCampaign) === JSON.stringify(titanReplay);
  const sharedGateMet =
    steps === DEFAULT_FAULT_STEPS &&
    campaign.allFiniteAndBounded &&
    replay.allFiniteAndBounded &&
    campaign.violationCount === 0 &&
    replay.violationCount === 0 &&
    campaign.faultCoverageComplete &&
    campaign.faultStepCount === DEFAULT_FAULT_STEPS &&
    campaign.faultEventCount === DEFAULT_FAULT_STEPS &&
    campaign.sampleCountsMatch &&
    campaign.finalFieldRevision === DEFAULT_FAULT_STEPS &&
    campaign.semanticReadyCount === DEFAULT_FAULT_STEPS &&
    campaign.snapshotRoundTripCount === DEFAULT_FAULT_STEPS &&
    campaign.thinkCount === DEFAULT_FAULT_STEPS &&
    sharedReplayMatched;
  const petriGateMet =
    steps === DEFAULT_FAULT_STEPS &&
    petriCampaign.allFiniteAndBounded &&
    petriReplay.allFiniteAndBounded &&
    petriCampaign.faultCoverageComplete &&
    petriCampaign.faultStepCount === DEFAULT_FAULT_STEPS &&
    petriCampaign.faultEventCount === DEFAULT_FAULT_STEPS &&
    petriCampaign.sampleCountsMatch &&
    petriCampaign.snapshotRoundTripCount === DEFAULT_FAULT_STEPS &&
    petriReplayMatched;
  const titanGateMet =
    steps === DEFAULT_FAULT_STEPS &&
    titanCampaign.allFiniteAndBounded &&
    titanReplay.allFiniteAndBounded &&
    titanCampaign.faultCoverageComplete &&
    titanCampaign.faultStepCount === DEFAULT_FAULT_STEPS &&
    titanCampaign.faultEventCount === DEFAULT_FAULT_STEPS &&
    titanCampaign.sampleCountsMatch &&
    titanCampaign.snapshotRoundTripCount === DEFAULT_FAULT_STEPS &&
    titanReplayMatched;
  const replayMatched = sharedReplayMatched && petriReplayMatched && titanReplayMatched;
  const gateMet = sharedGateMet && petriGateMet && titanGateMet;
  const primaryViolationCount =
    campaign.violationCount + petriCampaign.violationCount + titanCampaign.violationCount;
  const replayViolationCount =
    replay.violationCount + petriReplay.violationCount + titanReplay.violationCount;
  const aggregateTraceSha256 = new Bun.CryptoHasher('sha256')
    .update(
      JSON.stringify([campaign.traceSha256, petriCampaign.traceSha256, titanCampaign.traceSha256]),
    )
    .digest('hex');
  const aggregateReplayTraceSha256 = new Bun.CryptoHasher('sha256')
    .update(JSON.stringify([replay.traceSha256, petriReplay.traceSha256, titanReplay.traceSha256]))
    .digest('hex');
  const familyScopes = {
    sharedOrdinaryPredictor: {
      campaign,
      replayTraceSha256: replay.traceSha256,
      replayViolationCount: replay.violationCount,
      replayMatched: sharedReplayMatched,
      gateMet: sharedGateMet,
      accepted: sharedGateMet,
    },
    petri: {
      campaign: petriCampaign,
      replayTraceSha256: petriReplay.traceSha256,
      replayViolationCount: petriReplay.violationCount,
      replayMatched: petriReplayMatched,
      gateMet: petriGateMet,
      accepted: petriGateMet,
    },
    titans: {
      campaign: titanCampaign,
      replayTraceSha256: titanReplay.traceSha256,
      replayViolationCount: titanReplay.violationCount,
      replayMatched: titanReplayMatched,
      gateMet: titanGateMet,
      accepted: titanGateMet,
    },
  };
  const body = {
    protocolVersion: V4_PROTOCOL_VERSION,
    faultInputOrder: V4_NUMERICAL_FAULT_INPUTS,
    faultClassOrder: V4_NUMERICAL_FAULT_CLASSES,
    actionBounds: {
      semantics:
        '0.12 is the frozen ordinary goal-projection/component ceiling; radial ceilings are the Euclidean bounds derived from two or three independently bounded components',
      absoluteComponent: ACTION_COMPONENT_BOUND,
      absoluteGoalProjection: ACTION_COMPONENT_BOUND,
      horizontalRadialDerived: HORIZONTAL_ACTION_RADIAL_BOUND,
      spatialRadialDerived: SPATIAL_ACTION_RADIAL_BOUND,
    },
    predictorParameterAbsoluteBound: PARAMETER_ABSOLUTE_LIMIT,
    activationBound: ACTIVATION_BOUND,
    ...campaign,
    traceSha256: aggregateTraceSha256,
    violationCount: primaryViolationCount,
    firstViolations: [
      ...campaign.firstViolations.map((entry) => `shared:${entry}`),
      ...petriCampaign.firstViolations.map((entry) => `petri:${entry}`),
      ...titanCampaign.firstViolations.map((entry) => `titans:${entry}`),
    ].slice(0, 32),
    allFiniteAndBounded:
      campaign.allFiniteAndBounded &&
      petriCampaign.allFiniteAndBounded &&
      titanCampaign.allFiniteAndBounded,
    replayCheckedSteps: replay.forcedSteps,
    replayTraceSha256: aggregateReplayTraceSha256,
    replayViolationCount,
    replayMatched,
    familyScopes,
    aggregateViolationCount: primaryViolationCount + replayViolationCount,
    gateMet,
    accepted: gateMet,
  };
  return {
    ...body,
    contentSha256: new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex'),
  };
}
