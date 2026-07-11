/** Frozen V4 Titan diplomacy evaluator. Imports the committed protocol without changing it. */
import * as THREE from 'three';
import {
  defections,
  HISTORY_WINDOW,
  meanPayoff,
  payoff,
  PRISONERS_DILEMMA,
  pushHistory,
} from '../../src/math/games';
import { getQuantizationConfig } from '../../src/math/quantization';
import { mulberry32 } from '../../src/math/rng';
import { SpatialHash } from '../../src/math/spatial-hash';
import { GRID_CELL } from '../../src/sim/constants';
import type { EntityManager } from '../../src/sim/entities';
import { createGeometryCache } from '../../src/sim/geometry-cache';
import {
  REL_ALLIANCE,
  REL_TRUCE,
  REL_WAR,
  TitanSystem,
  type TitanLore,
} from '../../src/sim/titans';
import type { AuditTrail } from '../../src/logging/audit';
import type { Entity, OrganismIntelligenceSignal, SimContext } from '../../src/types';
import {
  fixtureSha256,
  titanCorrectMoveRate,
  v4CalibrateTitanCooperationRate,
  v4CyclicSemanticPermutation,
  v4DerivedSeed,
  V4_EVALUATION_SEEDS,
  V4_FAMILY_FIXTURES,
  v4SemanticSignal,
  v4TitanSurrogateMove,
  V4_SURROGATE_CALIBRATION_SEEDS,
} from '../organism-intelligence-v4-protocol';

const FIXTURE = V4_FAMILY_FIXTURES.titans;
const RESOURCE_CAP = 1000;
const PAYOFF_STAKE_BASE = 0.4;
const PAYOFF_STAKE_SCALE = 0.004;
const FITNESS_DECAY = 0.95;
const PD_MEAN = meanPayoff(PRISONERS_DILEMMA);
const TITAN_GEOS = createGeometryCache();
const TITAN_MORPHS = Array.from({ length: 200 }, () => ({}));
const TITAN_LORE: TitanLore = {
  name: (kind, index) => `${kind}-${index}`,
  epithet: (kind, key) => `${kind}:${key}`,
};

export type TitanV4Arm = (typeof FIXTURE.arms)[number];
export const TITAN_V4_ARMS: readonly TitanV4Arm[] = Object.freeze([...FIXTURE.arms]);

interface TitanPrivate {
  energy: number;
  matter: number;
  entropy: number;
  strategy: number;
  warCount: number;
}

interface PairHistoryView {
  movesA: number;
  movesB: number;
  rounds: number;
}

interface TitanHarness {
  diplomacy(pairIndex: number): void;
  econWealth: ((titanIndex: number) => number) | null;
  titans: TitanPrivate[];
  histories: PairHistoryView[];
  stratFitness: Float64Array;
}

interface RegimeTrace {
  id: string;
  moves: (0 | 1)[];
  correctMoves: number;
  pairPayoff: TitanV4RegimePairPayoff;
  energy: readonly [number, number];
  relation: number;
  strategyFitness: number[];
  warCounts: readonly [number, number];
  environmentDraws: number[];
  surrogateDraws: number[];
  initialStateHash: string;
  perceptHash: string;
}

export interface TitanV4PairPayoffSummary {
  titanA: number;
  titanB: number;
  pairTotal: number;
  pairMeanPerRound: number;
  meanPerPlayedMove: number;
}

export interface TitanV4RegimePairPayoff extends TitanV4PairPayoffSummary {
  regimeId: string;
  rounds: number;
}

interface TitanSurrogateStream {
  readonly rng: () => number;
}

export interface TitanV4Calibration {
  cooperationRate: number;
  sourceMoveCount: number;
  sourceMovesSha256: string;
  contentHash: string;
}

export interface TitanV4ArmResult {
  family: 'titans';
  controllerType: 'game-policy';
  seed: number;
  arm: TitanV4Arm;
  primaryOutcome: number;
  secondaryOutcomes: {
    correctMoves: number;
    totalMoves: 60;
    pairPayoff: {
      perRegime: readonly [TitanV4RegimePairPayoff, TitanV4RegimePairPayoff];
      aggregate: TitanV4PairPayoffSummary & { rounds: number };
    };
    finalEnergy: readonly [readonly [number, number], readonly [number, number]];
    finalRelations: readonly [number, number];
    strategyFitness: readonly [number[], number[]];
    finalWarCounts: readonly [readonly [number, number], readonly [number, number]];
    environmentRngDrawCount: number;
    surrogateRngDrawCount: number;
  };
  hashes: {
    fixtureSha256: string;
    initialStateSha256: string;
    perceptSha256: string;
    goalScheduleSha256: string;
    environmentRngTapeSha256: string;
    surrogateRngTapeSha256: string | null;
    policySurrogateCalibrationSha256: string | null;
  };
  replayFingerprint: string;
}

export interface TitanV4Evaluation {
  family: 'titans';
  fixtureSha256: string;
  calibration: TitanV4Calibration;
  rows: TitanV4ArmResult[];
  contentHash: string;
}

function sha256(value: unknown): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(value)).digest('hex');
}

function strategyIndex(name: string): number {
  if (name === 'TIT-FOR-TAT') return 0;
  if (name === 'ALWAYS-DEFECT') return 3;
  throw new Error(`unsupported frozen Titan strategy: ${name}`);
}

function makeContext(seed: number, signal?: OrganismIntelligenceSignal): SimContext {
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

function relationOf(history: PairHistoryView): number {
  const window = Math.min(history.rounds, HISTORY_WINDOW);
  if (window === 0) return REL_TRUCE;
  const defectA = defections(history.movesA, history.rounds);
  const defectB = defections(history.movesB, history.rounds);
  if (defectA === 0 && defectB === 0 && history.rounds >= 3) return REL_ALLIANCE;
  const half = (window + 1) >> 1;
  return defectA >= half || defectB >= half ? REL_WAR : REL_TRUCE;
}

function signalForRegime(
  regime: (typeof FIXTURE.regimes)[number],
  arm: TitanV4Arm,
): OrganismIntelligenceSignal | undefined {
  if (arm === 'shared-field-disabled' || arm === 'action-rate-matched-policy-surrogate') {
    return undefined;
  }
  const vector = [
    regime.signal.resource,
    regime.signal.threat,
    regime.signal.exploration,
    regime.signal.social,
  ] as const;
  return v4SemanticSignal(
    arm === 'semantic-channel-cyclic-permutation' ? v4CyclicSemanticPermutation(vector) : vector,
  );
}

function resetHarness(
  system: TitanSystem,
  harness: TitanHarness,
  regime: (typeof FIXTURE.regimes)[number],
): void {
  const initial = FIXTURE.initialState;
  for (let index = 0; index < 2; index++) {
    const titan = harness.titans[index]!;
    titan.energy = initial.energy[index]!;
    titan.matter = initial.matter[index]!;
    titan.entropy = initial.entropy[index]!;
    titan.strategy = strategyIndex(regime.strategies[index]!);
    titan.warCount = 0;
  }
  const history = harness.histories[0]!;
  history.movesA = 0;
  history.movesB = 0;
  history.rounds = 0;
  harness.stratFitness.set(initial.strategyFitness);
  system.warMatrix[1] = REL_TRUCE;
  system.warMatrix[20] = REL_TRUCE;
  if (harness.econWealth !== null) {
    throw new Error('frozen Titan fixture requires the external economy to remain disabled');
  }
}

function applySurrogateRound(
  system: TitanSystem,
  harness: TitanHarness,
  moveA: 0 | 1,
  moveB: 0 | 1,
): void {
  const titanA = harness.titans[0]!;
  const titanB = harness.titans[1]!;
  const history = harness.histories[0]!;
  pushHistory(history, moveA, moveB);
  const payoffA = payoff(PRISONERS_DILEMMA, moveA, moveB);
  const payoffB = payoff(PRISONERS_DILEMMA, moveB, moveA);
  const stake = PAYOFF_STAKE_BASE + PAYOFF_STAKE_SCALE * Math.min(titanA.energy, titanB.energy);
  titanA.energy = Math.max(0, Math.min(RESOURCE_CAP, titanA.energy + (payoffA - PD_MEAN) * stake));
  titanB.energy = Math.max(0, Math.min(RESOURCE_CAP, titanB.energy + (payoffB - PD_MEAN) * stake));
  const fit = harness.stratFitness;
  fit[titanA.strategy] =
    (fit[titanA.strategy] ?? 0) * FITNESS_DECAY + payoffA * (1 - FITNESS_DECAY);
  fit[titanB.strategy] =
    (fit[titanB.strategy] ?? 0) * FITNESS_DECAY + payoffB * (1 - FITNESS_DECAY);
  const relation = relationOf(history);
  const previous = system.warMatrix[1] ?? REL_TRUCE;
  if (relation !== previous) {
    system.warMatrix[1] = relation;
    system.warMatrix[20] = relation;
    if (previous === REL_WAR) {
      titanA.warCount--;
      titanB.warCount--;
    }
    if (relation === REL_WAR) {
      titanA.warCount++;
      titanB.warCount++;
    }
  }
}

function runRegime(
  seed: number,
  regimeIndex: number,
  arm: TitanV4Arm,
  cooperationRate: number | null,
  surrogateStream: TitanSurrogateStream | null,
): RegimeTrace {
  const regime = FIXTURE.regimes[regimeIndex]!;
  const signal = signalForRegime(regime, arm);
  const environmentSeed = v4DerivedSeed(seed, 'titanEnvironment', regimeIndex);
  const context = makeContext(environmentSeed, signal);
  const system = new TitanSystem(context, {} as EntityManager, TITAN_LORE, {
    perturb: () => undefined,
  });
  const harness = system as unknown as TitanHarness;
  resetHarness(system, harness, regime);
  const initialState = {
    titans: harness.titans.slice(0, 2).map(({ energy, matter, entropy, strategy, warCount }) => ({
      energy,
      matter,
      entropy,
      strategy,
      warCount,
    })),
    history: { ...harness.histories[0]! },
    strategyFitness: [...harness.stratFitness],
    relation: system.warMatrix[1] ?? REL_TRUCE,
    externalEconomyDisabled: harness.econWealth === null,
  };

  const environmentDraws: number[] = [];
  const environmentRng = mulberry32(environmentSeed);
  context.rng = () => {
    const draw = environmentRng();
    environmentDraws.push(draw);
    return draw;
  };
  const surrogateDraws: number[] = [];
  const moves: (0 | 1)[] = [];
  let correctMoves = 0;
  let payoffA = 0;
  let payoffB = 0;

  for (let round = 0; round < FIXTURE.roundsPerRegime; round++) {
    if (arm === 'action-rate-matched-policy-surrogate') {
      // Preserve the environment tape even though the declared isolated surrogate chooses the moves.
      context.rng();
      context.rng();
      if (cooperationRate === null) throw new Error('Titan surrogate requires frozen calibration');
      if (surrogateStream === null) throw new Error('Titan surrogate requires its isolated stream');
      const drawMove = (): 0 | 1 => {
        const draw = surrogateStream.rng();
        surrogateDraws.push(draw);
        return v4TitanSurrogateMove(cooperationRate, () => draw);
      };
      const moveA = drawMove();
      const moveB = drawMove();
      applySurrogateRound(system, harness, moveA, moveB);
    } else {
      harness.diplomacy(0);
    }
    const history = harness.histories[0]!;
    const moveA = (history.movesA & 1) as 0 | 1;
    const moveB = (history.movesB & 1) as 0 | 1;
    moves.push(moveA, moveB);
    payoffA += payoff(PRISONERS_DILEMMA, moveA, moveB);
    payoffB += payoff(PRISONERS_DILEMMA, moveB, moveA);
    const correct = regime.correctMove === 'COOPERATE' ? 0 : 1;
    if (moveA === correct) correctMoves++;
    if (moveB === correct) correctMoves++;
  }

  const result: RegimeTrace = {
    id: regime.id,
    moves,
    correctMoves,
    pairPayoff: {
      regimeId: regime.id,
      rounds: FIXTURE.roundsPerRegime,
      titanA: payoffA,
      titanB: payoffB,
      pairTotal: payoffA + payoffB,
      pairMeanPerRound: (payoffA + payoffB) / FIXTURE.roundsPerRegime,
      meanPerPlayedMove: (payoffA + payoffB) / (FIXTURE.roundsPerRegime * 2),
    },
    energy: [harness.titans[0]!.energy, harness.titans[1]!.energy],
    relation: system.warMatrix[1]!,
    strategyFitness: [...harness.stratFitness],
    warCounts: [harness.titans[0]!.warCount, harness.titans[1]!.warCount],
    environmentDraws,
    surrogateDraws,
    initialStateHash: sha256(initialState),
    // The matched-arm percept is the raw regime fixture before the declared controller intervention.
    perceptHash: sha256({ id: regime.id, signal: regime.signal }),
  };
  system.dispose();
  return result;
}

function runFullMoves(seed: number): (0 | 1)[] {
  return FIXTURE.regimes.flatMap(
    (_, regimeIndex) =>
      runRegime(seed, regimeIndex, 'full-intelligence-diplomacy', null, null).moves,
  );
}

let frozenTitanCalibration: TitanV4Calibration | null = null;

export function calibrateTitanV4Surrogate(): TitanV4Calibration {
  if (frozenTitanCalibration !== null) return frozenTitanCalibration;
  const moves = V4_SURROGATE_CALIBRATION_SEEDS.flatMap(runFullMoves);
  const cooperationRate = v4CalibrateTitanCooperationRate(moves);
  const body = {
    cooperationRate,
    sourceMoveCount: moves.length,
    sourceMovesSha256: sha256(moves),
  };
  frozenTitanCalibration = Object.freeze({ ...body, contentHash: sha256(body) });
  return frozenTitanCalibration;
}

function assertEvaluationSeed(seed: number): void {
  if (!V4_EVALUATION_SEEDS.some((candidate) => candidate === seed)) {
    throw new RangeError('Titan evaluator requires one of the 64 frozen V4 evaluation seeds');
  }
}

function assertCanonicalCalibration(calibration: TitanV4Calibration): void {
  const expected = calibrateTitanV4Surrogate();
  if (
    calibration.cooperationRate !== expected.cooperationRate ||
    calibration.sourceMoveCount !== expected.sourceMoveCount ||
    calibration.sourceMovesSha256 !== expected.sourceMovesSha256 ||
    calibration.contentHash !== expected.contentHash
  ) {
    throw new Error('Titan evaluator requires the exact frozen pooled-policy calibration');
  }
}

export function evaluateTitanV4Seed(
  seed: number,
  calibration: TitanV4Calibration,
): TitanV4ArmResult[] {
  assertEvaluationSeed(seed);
  assertCanonicalCalibration(calibration);
  return TITAN_V4_ARMS.map((arm) => {
    // One dedicated stream spans both regimes in regime, round, then titan-index order.
    const surrogateStream: TitanSurrogateStream | null =
      arm === 'action-rate-matched-policy-surrogate'
        ? { rng: mulberry32(v4DerivedSeed(seed, 'titanSurrogate')) }
        : null;
    const traces = FIXTURE.regimes.map((_, regimeIndex) =>
      runRegime(seed, regimeIndex, arm, calibration.cooperationRate, surrogateStream),
    ) as [RegimeTrace, RegimeTrace];
    const correctMoves = traces[0].correctMoves + traces[1].correctMoves;
    const aggregatePayoffA = traces[0].pairPayoff.titanA + traces[1].pairPayoff.titanA;
    const aggregatePayoffB = traces[0].pairPayoff.titanB + traces[1].pairPayoff.titanB;
    const aggregatePairPayoff = aggregatePayoffA + aggregatePayoffB;
    const traceBody = {
      seed,
      arm,
      calibrationSha256:
        arm === 'action-rate-matched-policy-surrogate' ? calibration.contentHash : null,
      traces,
    };
    return {
      family: 'titans',
      controllerType: 'game-policy',
      seed,
      arm,
      primaryOutcome: titanCorrectMoveRate(correctMoves),
      secondaryOutcomes: {
        correctMoves,
        totalMoves: 60,
        pairPayoff: {
          perRegime: [traces[0].pairPayoff, traces[1].pairPayoff],
          aggregate: {
            rounds: 30,
            titanA: aggregatePayoffA,
            titanB: aggregatePayoffB,
            pairTotal: aggregatePairPayoff,
            pairMeanPerRound: aggregatePairPayoff / 30,
            meanPerPlayedMove: aggregatePairPayoff / 60,
          },
        },
        finalEnergy: [traces[0].energy, traces[1].energy],
        finalRelations: [traces[0].relation, traces[1].relation],
        strategyFitness: [traces[0].strategyFitness, traces[1].strategyFitness],
        finalWarCounts: [traces[0].warCounts, traces[1].warCounts],
        environmentRngDrawCount:
          traces[0].environmentDraws.length + traces[1].environmentDraws.length,
        surrogateRngDrawCount: traces[0].surrogateDraws.length + traces[1].surrogateDraws.length,
      },
      hashes: {
        fixtureSha256: fixtureSha256('titans'),
        initialStateSha256: sha256(traces.map(({ initialStateHash }) => initialStateHash)),
        perceptSha256: sha256(traces.map(({ perceptHash }) => perceptHash)),
        goalScheduleSha256: sha256(
          FIXTURE.regimes.map(({ id, correctMove }) => ({ id, correctMove })),
        ),
        environmentRngTapeSha256: sha256(
          traces.flatMap(({ environmentDraws }) => environmentDraws),
        ),
        surrogateRngTapeSha256:
          arm === 'action-rate-matched-policy-surrogate'
            ? sha256(traces.flatMap(({ surrogateDraws }) => surrogateDraws))
            : null,
        policySurrogateCalibrationSha256:
          arm === 'action-rate-matched-policy-surrogate' ? calibration.contentHash : null,
      },
      replayFingerprint: sha256(traceBody),
    };
  });
}

export function evaluateTitanV4(seeds: readonly number[] = V4_EVALUATION_SEEDS): TitanV4Evaluation {
  if (
    seeds.length !== V4_EVALUATION_SEEDS.length ||
    seeds.some((seed, index) => seed !== V4_EVALUATION_SEEDS[index])
  ) {
    throw new RangeError('Titan publication evaluation requires the exact ordered 64-seed family');
  }
  const calibration = calibrateTitanV4Surrogate();
  const rows = seeds.flatMap((seed) => evaluateTitanV4Seed(seed, calibration));
  const body = {
    family: 'titans' as const,
    fixtureSha256: fixtureSha256('titans'),
    calibration,
    rows,
  };
  return { ...body, contentHash: sha256(body) };
}
