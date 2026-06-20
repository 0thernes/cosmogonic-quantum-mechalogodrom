/**
 * TSOTCHKE CORPUS FACADE — re-exports from exclusive leaves + archetype bias tables.
 * Full registry: tsotchke-corpus.ts · consciousness: eshkol-bridge.ts
 * Petri dish: primordial-soup.ts
 */

import { getTsotchkeRepoByIndex } from './tsotchke-registry';

export {
  TSOTCHKE_CORPUS_ROOT,
  TSOTCHKE_REPO_BINDINGS,
  corpusCoverageRatio,
} from './tsotchke-corpus';
export type { TsotchkeRepoBinding } from './tsotchke-corpus';

export {
  EshkolConsciousnessEngine,
  eshkolADGradient,
  eshkolDual,
  eshkolApplyAD,
  makeEshkolDual,
  dualAdd,
  dualMul,
  gwtBroadcast,
  eshkolProgramFingerprint,
  eshkolEvalProgram,
  eshkolApplyProgramEffect,
} from './eshkol-bridge';
export type {
  EshkolConsciousnessSnapshot,
  EshkolStepInput,
  EshkolDual,
  EshkolProgramEffect,
} from './eshkol-bridge';

export {
  moonlabTensorContract,
  moonlabTensorQualia,
  moonlabMpoStep,
  moonlabMpoApply,
  ulgHandoff,
} from './moonlab-tensor';

export {
  libirrepSymmetry,
  libirrepClebsch,
  libirrepWigner,
  su2Dimension,
  symmetryModes,
} from './irrep-symmetry';

export { quakeQgeFactor, quakePerturb, qgeHybridEnergy, qgePullMod } from './qge-physics';

export { grayScottResidual, pinnLoss } from './pinn-residual';
export { pathAction, pathMetropolisStep, pathWeight } from './pimc-paths';
export { logoMorphScalar, logoSymmetryOrder, turtleNew } from './logo-turtle';
export { asteroidEnergy, asteroidSpawn, asteroidStep, asteroidThrust } from './asteroids-physics';
export { classicalEntropyGap, classicalSample } from './classical-contrast';
export { perceptronScore, perceptronTag } from './perceptron-baseline';
export { metalGemmBias, tensorcoreMorphBias } from './tensorcore-facade';
export { ulgFieldSample, ulgTriadHandoff } from './ulg-bridge';
export {
  TSOTCHKE_FILE_COUNT,
  TSOTCHKE_ESK_COUNT,
  TSOTCHKE_MIRROR_REPO_COUNT,
  auditWiringReceipt,
} from './corpus-audit-receipts';

export { createPetriDish, petriDishBeat, petriGrowthMultiplier } from './petri-dish';
export type { PetriDishState } from './petri-dish';

export { PrimordialSoup, SOUP_SLOTS, SOUP_GENOME_LEN } from './primordial-soup';
export type { SoupStrain, SoupSnapshot } from './primordial-soup';

export {
  TSOTCHKE_REPO_COUNT,
  getTsotchkeRepo,
  getTsotchkeRepoByIndex,
  tsotchkeWiringCoverage,
  substrateVectorForArchon,
  corpusBeatForArchon,
} from './tsotchke-registry';
export type { TsotchkeRepoSlug, TsotchkeRepoEntry, SubstrateKind } from './tsotchke-registry';

export const TSOTCHKE_ARCHETYPES = [
  'ESHKOL-AD',
  'MOONLAB-TENSOR',
  'QUANTUM-QUAKE',
  'LIBIRREP-SYM',
  'TENSORCORE-METAL',
  'ULG-BROWSER',
  'QGT-GEO',
  'QRNG-ENTROPY',
] as const;

export type TsotchkeArchetype = (typeof TSOTCHKE_ARCHETYPES)[number];

export type CorpusBias = ReturnType<typeof getTsotchkeBias>;

/** Extended bias pulling from full corpus (Eshkol/Moonlab/Quake/irrep etc). */
export function getTsotchkeBias(i: number): {
  cliffordWeight: number;
  generative: number;
  chaos: number;
  narrative: number;
  colorHue: number;
  eshkolLogic: number;
  eshkolInference: number;
  eshkolWorkspace: number;
  quakeFactor: number;
  irrepDegree: number;
  adDepth: number;
  tensorChi: number;
} {
  const n = TSOTCHKE_ARCHETYPES.length;
  const idx = ((i % n) + n) % n;
  const cw = [0.9, 0.3, 0.4, 0.2, 0.5, 0.6, 0.7, 0.4];
  const gen = [0.3, 0.85, 0.5, 0.4, 0.6, 0.5, 0.3, 0.8];
  const ch = [0.2, 0.4, 0.3, 0.95, 0.5, 0.7, 0.6, 0.3];
  const nar = [0.4, 0.5, 0.6, 0.3, 0.9, 0.4, 0.5, 0.6];
  const hue = [0.75, 0.42, 0.58, 0.12, 0.0, 0.25, 0.9, 0.55];
  const eshL = [0.8, 0.4, 0.5, 0.3, 0.6, 0.5, 0.7, 0.4];
  const eshI = [0.5, 0.9, 0.6, 0.4, 0.7, 0.6, 0.5, 0.8];
  const eshW = [0.9, 0.5, 0.7, 0.6, 0.4, 0.7, 0.6, 0.5];
  return {
    cliffordWeight: cw[idx]!,
    generative: gen[idx]!,
    chaos: ch[idx]!,
    narrative: nar[idx]!,
    colorHue: hue[idx]!,
    eshkolLogic: eshL[idx]!,
    eshkolInference: eshI[idx]!,
    eshkolWorkspace: eshW[idx]!,
    quakeFactor: [0.1, 0.2, 0.9, 0.3, 0.4, 0.6, 0.5, 0.2][idx]!,
    irrepDegree: [2, 3, 1, 4, 2, 3, 1, 5][idx]!,
    adDepth: [4, 8, 2, 1, 3, 6, 5, 7][idx]!,
    tensorChi: [4, 8, 16, 2, 6, 10, 12, 5][idx]!,
  };
}

export interface TsotchkeQuantumPulse {
  cliffordEnt: number;
  qgtVolume: number;
  rngEntropy: number;
  quakeAliveness: number;
  adGradient: number;
}

export function corpusPulse(seed: number, formIdx: number): TsotchkeQuantumPulse {
  const b = getTsotchkeBias(formIdx);
  const repo = getTsotchkeRepoByIndex(formIdx);
  const s = (seed % 10000) / 10000;
  const scale = repo.wiring > 0 ? 0.5 + repo.wiring * 0.5 : 0.05;
  const c01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  return {
    cliffordEnt: c01((b.cliffordWeight + s * 0.1) * scale),
    qgtVolume: c01((b.generative + b.chaos * 0.5) * scale),
    rngEntropy: c01((b.narrative * 0.7 + s) * scale),
    quakeAliveness: c01(b.quakeFactor * (0.6 + repo.hue * 0.4)),
    adGradient: c01((b.adDepth / 8) * (0.5 + s * 0.5) * scale),
  };
}
