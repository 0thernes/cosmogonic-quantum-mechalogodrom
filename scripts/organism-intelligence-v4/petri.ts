/**
 * Frozen V4 Petri-family evaluator.
 *
 * This is a headless evaluator, not a result artifact. It imports the preregistered protocol and
 * exercises the live Petri-dish and digital-biologic leaves. The uniform-flux control is deliberately
 * implemented here because it must bypass the runtime's per-strain semantic-affinity calculation while
 * retaining the same dish update and environment RNG tape.
 */

import { mulberry32, type Rng } from '../../src/math/rng';
import { stepBiologic, type Biologic } from '../../src/sim/digital-biologics';
import {
  createPetriDish,
  petriDishBeat,
  petriSharedEcologyFlux,
  type PetriDishState,
} from '../../src/sim/petri-dish';
import type { OrganismIntelligenceSignal } from '../../src/types';
import {
  fixtureSha256,
  mean,
  petriFavoredAdFitnessShare,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  V4_PROTOCOL_VERSION,
  v4CyclicSemanticPermutation,
  v4DerivedSeed,
  v4SemanticSignal,
  type V4SemanticVector,
} from '../organism-intelligence-v4-protocol';

const FAMILY = 'petri-digital-biologics' as const;
const FIXTURE = V4_FAMILY_FIXTURES[FAMILY];
const SPECIALIST_IDS = [FIXTURE.resourceSpecialist.id, FIXTURE.explorationSpecialist.id] as const;

export const V4_PETRI_ARMS = FIXTURE.arms;
export type V4PetriArm = (typeof V4_PETRI_ARMS)[number];

export interface V4PetriSpecialistSnapshot {
  id: number;
  form: string;
  adFitness: number;
  consciousness: number;
  alive: boolean;
  generation: number;
  speciation: number;
  vitality: number;
  fitnessWeights: readonly number[];
}

export interface V4PetriSecondaryOutcomes {
  /** Mean favored share of the two specialists' speciation values on the same 80 scored beats. */
  favoredSpeciationShare: number;
  /** Fraction of the two declared lineages present and alive across all 240 post-beat observations. */
  lineageRetentionRate: number;
  meanSelectionPressure: number;
  peakSelectionPressure: number;
  selectionPressureActiveBeatRate: number;
  finalSpecialists: {
    resource: V4PetriSpecialistSnapshot;
    exploration: V4PetriSpecialistSnapshot;
  };
  lineageTrajectorySha256: string;
  selectionTrajectorySha256: string;
  /**
   * Preregistered disabled-path compatibility diagnostic. The reference is a fresh, same-seed run
   * through the live optional-signal API with `undefined`, not a claimed version-independent golden.
   */
  legacyTrajectoryEquality: V4PetriLegacyTrajectoryEquality;
}

export interface V4PetriLegacyTrajectoryEquality {
  applicable: boolean;
  referenceBasis: 'same-seed-independent-live-undefined-signal-replay';
  referenceScope: 'behavioral-equivalence-not-version-independent-golden';
  observedTrajectorySha256: string;
  referenceTrajectorySha256: string | null;
  observedFinalStateSha256: string;
  referenceFinalStateSha256: string | null;
  exact: boolean | null;
}

export interface V4PetriArmHashes {
  fixtureSha256: string;
  initialStateSha256: string;
  perceptSha256: string;
  taskScheduleSha256: string;
  interventionSha256: string;
  environmentRngTapeSha256: string;
  environmentTrajectorySha256: string;
  trajectorySha256: string;
  finalStateSha256: string;
}

export interface V4PetriArmEvaluation {
  family: typeof FAMILY;
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  evaluationSeed: number;
  environmentSeed: number;
  arm: V4PetriArm;
  affinityBypassed: boolean;
  totalBeats: number;
  scoredBeats: number;
  primaryOutcome: number;
  secondary: V4PetriSecondaryOutcomes;
  environmentRngDrawCount: number;
  hashes: V4PetriArmHashes;
}

export interface V4PetriMatchedEvidence {
  exact: true;
  initialStateSha256: string;
  perceptSha256: string;
  taskScheduleSha256: string;
  environmentRngTapeSha256: string;
  environmentTrajectorySha256: string;
  environmentRngDrawCount: number;
}

export interface V4PetriSeedEvaluation {
  family: typeof FAMILY;
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  evaluationSeed: number;
  arms: readonly V4PetriArmEvaluation[];
  matched: V4PetriMatchedEvidence;
}

export interface V4PetriEvaluation {
  family: typeof FAMILY;
  protocolVersion: typeof V4_PROTOCOL_VERSION;
  fixtureSha256: string;
  evaluationSeeds: readonly number[];
  runs: readonly V4PetriSeedEvaluation[];
}

const NUMBER_BYTES = new ArrayBuffer(8);
const NUMBER_VIEW = new DataView(NUMBER_BYTES);

function exactNumberToken(value: number): string {
  NUMBER_VIEW.setFloat64(0, value, false);
  return `${NUMBER_VIEW.getUint32(0, false).toString(16).padStart(8, '0')}${NUMBER_VIEW.getUint32(
    4,
    false,
  )
    .toString(16)
    .padStart(8, '0')}`;
}

/** Deterministic, key-sorted, exact-float encoding used only for evaluator evidence hashes. */
function canonicalEncode(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      return `n${exactNumberToken(value)}`;
    case 'string':
      return `s${JSON.stringify(value)}`;
    case 'boolean':
      return value ? 'b1' : 'b0';
    case 'undefined':
      return 'u';
    case 'bigint':
      return `i${value.toString(10)}`;
    case 'object':
      break;
    default:
      throw new TypeError(`unsupported hash value: ${typeof value}`);
  }

  const object = value as object;
  if (seen.has(object)) throw new TypeError('cyclic values cannot be evidence-hashed');
  seen.add(object);
  try {
    if (Array.isArray(value)) {
      return `a[${value.map((entry) => canonicalEncode(entry, seen)).join(',')}]`;
    }
    if (ArrayBuffer.isView(value)) {
      if (value instanceof DataView) {
        return `vDataView:${canonicalEncode(
          Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)),
          seen,
        )}`;
      }
      const view = value as unknown as {
        constructor: { name: string };
        length: number;
        [n: number]: number;
      };
      return `v${view.constructor.name}:${canonicalEncode(
        Array.from({ length: view.length }, (_, index) => view[index]),
        seen,
      )}`;
    }
    const record = value as Record<string, unknown>;
    return `o{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalEncode(record[key], seen)}`)
      .join(',')}}`;
  } finally {
    seen.delete(object);
  }
}

function sha256(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(canonicalEncode(value)).digest('hex');
}

function updateHash(hasher: Bun.CryptoHasher, value: unknown): void {
  const encoded = canonicalEncode(value);
  hasher.update(`${encoded.length}:`);
  hasher.update(encoded);
}

function assertUint32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError(`${label} must be a uint32`);
  }
}

function assertFiniteTree(value: unknown, path = 'state', seen = new WeakSet<object>()): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError(`${path} contains a non-finite number`);
    return;
  }
  if (value === null || value === undefined || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (ArrayBuffer.isView(value)) {
    if (!(value instanceof DataView)) {
      const view = value as unknown as { length: number; [n: number]: number };
      for (let index = 0; index < view.length; index++) {
        assertFiniteTree(view[index], `${path}[${index}]`, seen);
      }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertFiniteTree(child, `${path}.${key}`, seen);
  }
}

function cloneFixtureSpecialist(
  source: typeof FIXTURE.resourceSpecialist | typeof FIXTURE.explorationSpecialist,
): Biologic {
  return { ...source, fitnessWeights: [...source.fitnessWeights] };
}

/**
 * Build the byte-matched initial state for one arm. The sole declared Petri seed initializes both the
 * deterministic dish and its environment RNG stream; no undeclared seed or hidden calibration enters.
 */
export function createV4PetriInitialState(evaluationSeed: number): PetriDishState {
  assertUint32(evaluationSeed, 'evaluation seed');
  const environmentSeed = v4DerivedSeed(evaluationSeed, 'petriRng');
  const state = createPetriDish(environmentSeed);
  state.biologics = [
    cloneFixtureSpecialist(FIXTURE.resourceSpecialist),
    cloneFixtureSpecialist(FIXTURE.explorationSpecialist),
  ];
  return state;
}

function regimeAtBeat(beat: number) {
  if (!Number.isInteger(beat) || beat < 0 || beat >= FIXTURE.totalBeats) {
    throw new RangeError(`Petri beat must be an integer in [0,${FIXTURE.totalBeats - 1}]`);
  }
  const regime = FIXTURE.regimes.find(
    (candidate) => beat >= candidate.firstBeat && beat <= candidate.lastBeat,
  );
  if (!regime) throw new Error(`frozen Petri protocol has no regime for beat ${beat}`);
  return regime;
}

function isScoredBeat(beat: number): boolean {
  return FIXTURE.scoringWindows.some(([first, last]) => beat >= first && beat <= last);
}

function signalForArm(beat: number, arm: V4PetriArm): OrganismIntelligenceSignal | undefined {
  const base = regimeAtBeat(beat).signal as V4SemanticVector;
  if (arm === 'shared-field-disabled') return undefined;
  if (arm === 'semantic-channel-cyclic-permutation') {
    return v4SemanticSignal(v4CyclicSemanticPermutation(base));
  }
  return v4SemanticSignal(base);
}

const PERCEPT_HASH = sha256(
  Array.from({ length: FIXTURE.totalBeats }, (_, beat) => {
    const regime = regimeAtBeat(beat);
    return {
      beat,
      favoredId: regime.favoredId,
      signal: v4SemanticSignal(regime.signal as V4SemanticVector),
    };
  }),
);

const TASK_SCHEDULE_HASH = sha256({
  dishArchonIndex: FIXTURE.dishArchonIndex,
  totalBeats: FIXTURE.totalBeats,
  regimes: FIXTURE.regimes,
  scoringWindows: FIXTURE.scoringWindows,
  primaryOutcome: FIXTURE.primaryOutcome,
});

function makeRecordedRng(seed: number): {
  rng: Rng;
  finish: () => { draws: number; sha256: string };
} {
  const source = mulberry32(seed);
  const hasher = new Bun.CryptoHasher('sha256');
  let draws = 0;
  let finished = false;
  return {
    rng: () => {
      if (finished) throw new Error('Petri environment RNG was used after its tape was finalized');
      const value = source();
      hasher.update(`${draws}:${exactNumberToken(value)};`);
      draws++;
      return value;
    },
    finish: () => {
      if (finished) throw new Error('Petri environment RNG tape may only be finalized once');
      finished = true;
      return { draws, sha256: hasher.digest('hex') };
    },
  };
}

function liveBiologic(
  entry: PetriDishState['biologics'][number],
): Biologic & { vitality?: number } {
  if (
    typeof entry.id !== 'number' ||
    typeof entry.form !== 'string' ||
    typeof entry.adFitness !== 'number' ||
    typeof entry.consciousness !== 'number' ||
    typeof entry.generation !== 'number' ||
    typeof entry.speciation !== 'number'
  ) {
    throw new Error('frozen Petri fixture lost a required full-biologic field');
  }
  return entry as Biologic & { vitality?: number };
}

function specialists(state: PetriDishState): readonly [Biologic, Biologic] {
  if (state.biologics.length !== 2) {
    throw new Error(
      `frozen Petri fixture must retain exactly two lineages, got ${state.biologics.length}`,
    );
  }
  const resource = state.biologics.find((entry) => entry.id === SPECIALIST_IDS[0]);
  const exploration = state.biologics.find((entry) => entry.id === SPECIALIST_IDS[1]);
  if (!resource || !exploration) throw new Error('frozen Petri specialist lineage was lost');
  const typedResource = liveBiologic(resource);
  const typedExploration = liveBiologic(exploration);
  if (
    typedResource.form !== FIXTURE.resourceSpecialist.form ||
    typedExploration.form !== FIXTURE.explorationSpecialist.form
  ) {
    throw new Error('frozen Petri specialist form changed');
  }
  return [typedResource, typedExploration];
}

function bridgeVitality(biologic: Biologic & { vitality?: number }): void {
  biologic.vitality = Math.min(
    3,
    Math.max(
      0.01,
      (biologic.vitality ?? biologic.consciousness) * 0.85 + biologic.consciousness * 0.15,
    ),
  );
}

/**
 * True uniform control: advance the live dish with the same signal and RNG tape while detaching the
 * two controlled strains from the runtime affinity loop, then give both strains the identical declared
 * shared scalar through the real `stepBiologic` function. The vitality bridge is the same live Petri
 * post-step law. Any spontaneous birth fails closed because it would break the frozen two-lineage task.
 */
function uniformFluxBeat(
  state: PetriDishState,
  beat: number,
  rng: Rng,
  signal: OrganismIntelligenceSignal,
): void {
  const controlled = state.biologics;
  state.biologics = [];
  petriDishBeat(state, FIXTURE.dishArchonIndex, beat, rng, signal);
  if (state.biologics.length !== 0) {
    throw new Error('uniform Petri control cannot admit an undeclared spontaneous lineage');
  }
  state.biologics = controlled;
  const uniformFlux = petriSharedEcologyFlux(signal);
  for (const entry of state.biologics) {
    const biologic = liveBiologic(entry);
    stepBiologic(biologic, uniformFlux, true);
    bridgeVitality(biologic);
  }
  state.biologics = state.biologics.filter((entry) => entry.alive !== false);
}

function specialistSnapshot(biologic: Biologic & { vitality?: number }): V4PetriSpecialistSnapshot {
  const fitnessWeights = biologic.fitnessWeights ?? [];
  return {
    id: biologic.id,
    form: biologic.form,
    adFitness: biologic.adFitness,
    consciousness: biologic.consciousness,
    alive: biologic.alive,
    generation: biologic.generation,
    speciation: biologic.speciation,
    vitality: biologic.vitality ?? biologic.consciousness,
    fitnessWeights: [...fitnessWeights],
  };
}

function environmentState(
  state: PetriDishState,
): Omit<
  PetriDishState,
  'biologics' | 'organismIntelligenceRevision' | 'organismSelectionPressure'
> {
  const {
    biologics: _biologics,
    organismIntelligenceRevision: _revision,
    organismSelectionPressure: _pressure,
    ...environment
  } = state;
  return environment;
}

function assertArm(arm: string): asserts arm is V4PetriArm {
  if (!(V4_PETRI_ARMS as readonly string[]).includes(arm)) {
    throw new RangeError(`unknown V4 Petri arm: ${arm}`);
  }
}

interface V4PetriLegacyReference {
  trajectorySha256: string;
  finalStateSha256: string;
  environmentRngTapeSha256: string;
  environmentRngDrawCount: number;
}

/**
 * Execute a fresh behavioral reference for the pre-semantic Petri path. This deliberately uses the
 * public live `petriDishBeat(..., undefined)` route and a separately constructed state/RNG recorder;
 * it establishes same-build disabled-path equivalence without pretending to be a cross-version hash.
 */
function runLegacyPetriReference(evaluationSeed: number): V4PetriLegacyReference {
  const environmentSeed = v4DerivedSeed(evaluationSeed, 'petriRng');
  const state = createV4PetriInitialState(evaluationSeed);
  const recordedRng = makeRecordedRng(environmentSeed);
  const trajectoryHasher = new Bun.CryptoHasher('sha256');
  for (let beat = 0; beat < FIXTURE.totalBeats; beat++) {
    petriDishBeat(state, FIXTURE.dishArchonIndex, beat, recordedRng.rng, undefined);
    specialists(state);
    assertFiniteTree(state);
    updateHash(trajectoryHasher, { beat, state });
  }
  const rngTape = recordedRng.finish();
  return {
    trajectorySha256: trajectoryHasher.digest('hex'),
    finalStateSha256: sha256(state),
    environmentRngTapeSha256: rngTape.sha256,
    environmentRngDrawCount: rngTape.draws,
  };
}

/** Run one frozen arm for one seed without writing a result artifact. */
export function runV4PetriArm(evaluationSeed: number, arm: V4PetriArm): V4PetriArmEvaluation {
  assertUint32(evaluationSeed, 'evaluation seed');
  assertArm(arm);
  const environmentSeed = v4DerivedSeed(evaluationSeed, 'petriRng');
  const state = createV4PetriInitialState(evaluationSeed);
  assertFiniteTree(state);
  const initialStateSha256 = sha256(state);
  const recordedRng = makeRecordedRng(environmentSeed);
  const trajectoryHasher = new Bun.CryptoHasher('sha256');
  const environmentHasher = new Bun.CryptoHasher('sha256');
  const lineageHasher = new Bun.CryptoHasher('sha256');
  const selectionHasher = new Bun.CryptoHasher('sha256');
  const interventionHasher = new Bun.CryptoHasher('sha256');
  const primaryScores: number[] = [];
  const speciationShares: number[] = [];
  const selectionPressures: number[] = [];
  let retainedLineages = 0;

  for (let beat = 0; beat < FIXTURE.totalBeats; beat++) {
    const signal = signalForArm(beat, arm);
    updateHash(interventionHasher, {
      beat,
      mode: arm === 'uniform-flux-no-affinity' ? 'uniform-affinity-bypass' : arm,
      signal: signal ?? null,
    });
    if (arm === 'uniform-flux-no-affinity') {
      if (!signal) throw new Error('uniform Petri arm requires the enabled base semantic signal');
      uniformFluxBeat(state, beat, recordedRng.rng, signal);
    } else {
      petriDishBeat(state, FIXTURE.dishArchonIndex, beat, recordedRng.rng, signal);
    }

    const [resource, exploration] = specialists(state);
    assertFiniteTree(state);
    if (resource.alive) retainedLineages++;
    if (exploration.alive) retainedLineages++;
    selectionPressures.push(state.organismSelectionPressure);
    updateHash(trajectoryHasher, { beat, state });
    updateHash(environmentHasher, { beat, state: environmentState(state) });
    updateHash(lineageHasher, {
      beat,
      resource: specialistSnapshot(resource),
      exploration: specialistSnapshot(exploration),
    });
    updateHash(selectionHasher, {
      beat,
      revision: state.organismIntelligenceRevision,
      pressure: state.organismSelectionPressure,
      resourceAdFitness: resource.adFitness,
      explorationAdFitness: exploration.adFitness,
    });

    if (isScoredBeat(beat)) {
      const favoredId = regimeAtBeat(beat).favoredId;
      const favored = favoredId === resource.id ? resource : exploration;
      const other = favored === resource ? exploration : resource;
      primaryScores.push(petriFavoredAdFitnessShare(favored.adFitness, other.adFitness));
      speciationShares.push(petriFavoredAdFitnessShare(favored.speciation, other.speciation));
    }
  }

  if (primaryScores.length !== 80 || speciationShares.length !== 80) {
    throw new Error(
      `frozen Petri scoring windows require 80 observations, got ${primaryScores.length}`,
    );
  }
  const [resource, exploration] = specialists(state);
  const rngTape = recordedRng.finish();
  const primaryOutcome = mean(primaryScores);
  if (!Number.isFinite(primaryOutcome) || primaryOutcome < 0 || primaryOutcome > 1) {
    throw new RangeError('Petri primary outcome escaped [0,1]');
  }
  const activeSelectionBeats = selectionPressures.filter((value) => value > 1e-12).length;
  const trajectorySha256 = trajectoryHasher.digest('hex');
  const finalStateSha256 = sha256(state);
  const legacyReference =
    arm === 'shared-field-disabled' ? runLegacyPetriReference(evaluationSeed) : null;
  if (
    legacyReference !== null &&
    (legacyReference.environmentRngDrawCount !== rngTape.draws ||
      legacyReference.environmentRngTapeSha256 !== rngTape.sha256)
  ) {
    throw new Error('Petri legacy reference did not replay the matched environment RNG tape');
  }

  return {
    family: FAMILY,
    protocolVersion: V4_PROTOCOL_VERSION,
    evaluationSeed,
    environmentSeed,
    arm,
    affinityBypassed: arm === 'uniform-flux-no-affinity',
    totalBeats: FIXTURE.totalBeats,
    scoredBeats: primaryScores.length,
    primaryOutcome,
    secondary: {
      favoredSpeciationShare: mean(speciationShares),
      lineageRetentionRate: retainedLineages / (FIXTURE.totalBeats * 2),
      meanSelectionPressure: mean(selectionPressures),
      peakSelectionPressure: Math.max(...selectionPressures),
      selectionPressureActiveBeatRate: activeSelectionBeats / FIXTURE.totalBeats,
      finalSpecialists: {
        resource: specialistSnapshot(resource),
        exploration: specialistSnapshot(exploration),
      },
      lineageTrajectorySha256: lineageHasher.digest('hex'),
      selectionTrajectorySha256: selectionHasher.digest('hex'),
      legacyTrajectoryEquality: {
        applicable: legacyReference !== null,
        referenceBasis: 'same-seed-independent-live-undefined-signal-replay',
        referenceScope: 'behavioral-equivalence-not-version-independent-golden',
        observedTrajectorySha256: trajectorySha256,
        referenceTrajectorySha256: legacyReference?.trajectorySha256 ?? null,
        observedFinalStateSha256: finalStateSha256,
        referenceFinalStateSha256: legacyReference?.finalStateSha256 ?? null,
        exact:
          legacyReference === null
            ? null
            : trajectorySha256 === legacyReference.trajectorySha256 &&
              finalStateSha256 === legacyReference.finalStateSha256,
      },
    },
    environmentRngDrawCount: rngTape.draws,
    hashes: {
      fixtureSha256: fixtureSha256(FAMILY),
      initialStateSha256,
      perceptSha256: PERCEPT_HASH,
      taskScheduleSha256: TASK_SCHEDULE_HASH,
      interventionSha256: interventionHasher.digest('hex'),
      environmentRngTapeSha256: rngTape.sha256,
      environmentTrajectorySha256: environmentHasher.digest('hex'),
      trajectorySha256,
      finalStateSha256,
    },
  };
}

function oneExactValue<T>(values: readonly T[], label: string): T {
  if (values.length === 0 || values.some((value) => value !== values[0])) {
    throw new Error(`V4 Petri matched-arm violation: ${label} differs across arms`);
  }
  return values[0]!;
}

/** Run and enforce all four matched arms for one evaluation seed. */
export function runV4PetriSeed(evaluationSeed: number): V4PetriSeedEvaluation {
  assertUint32(evaluationSeed, 'evaluation seed');
  const arms = V4_PETRI_ARMS.map((arm) => runV4PetriArm(evaluationSeed, arm));
  const matched: V4PetriMatchedEvidence = {
    exact: true,
    initialStateSha256: oneExactValue(
      arms.map((run) => run.hashes.initialStateSha256),
      'initial state hash',
    ),
    perceptSha256: oneExactValue(
      arms.map((run) => run.hashes.perceptSha256),
      'pre-intervention percept hash',
    ),
    taskScheduleSha256: oneExactValue(
      arms.map((run) => run.hashes.taskScheduleSha256),
      'task schedule hash',
    ),
    environmentRngTapeSha256: oneExactValue(
      arms.map((run) => run.hashes.environmentRngTapeSha256),
      'environment RNG tape hash',
    ),
    environmentTrajectorySha256: oneExactValue(
      arms.map((run) => run.hashes.environmentTrajectorySha256),
      'non-intervention environment trajectory hash',
    ),
    environmentRngDrawCount: oneExactValue(
      arms.map((run) => run.environmentRngDrawCount),
      'environment RNG draw count',
    ),
  };
  return {
    family: FAMILY,
    protocolVersion: V4_PROTOCOL_VERSION,
    evaluationSeed,
    arms,
    matched,
  };
}

/** Default execution covers exactly the frozen 64 evaluation seeds; subsets are accepted for diagnostics. */
export function runV4PetriEvaluation(
  evaluationSeeds: readonly number[] = V4_EVALUATION_SEEDS,
): V4PetriEvaluation {
  if (evaluationSeeds.length === 0)
    throw new RangeError('Petri evaluation requires at least one seed');
  const unique = new Set<number>();
  for (const seed of evaluationSeeds) {
    assertUint32(seed, 'evaluation seed');
    if (unique.has(seed)) throw new RangeError(`duplicate Petri evaluation seed: ${seed}`);
    unique.add(seed);
  }
  return {
    family: FAMILY,
    protocolVersion: V4_PROTOCOL_VERSION,
    fixtureSha256: fixtureSha256(FAMILY),
    evaluationSeeds: [...evaluationSeeds],
    runs: evaluationSeeds.map((seed) => runV4PetriSeed(seed)),
  };
}
