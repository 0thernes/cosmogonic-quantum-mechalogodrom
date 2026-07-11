/**
 * Phase-B development-only seed firewall.
 *
 * These families may be used to build and reject mechanisms. They are not confirmatory evidence and
 * are never promoted into a result receipt. A future evaluation family must be derived only after a
 * new protocol/manifest commit freezes code, task, controls, thresholds, and dependency closure.
 */

import {
  V4_EVALUATION_SEEDS,
  V4_SURROGATE_CALIBRATION_SEEDS,
} from '../organism-intelligence-v4-protocol';

const UINT32_MODULUS = 0x1_0000_0000;
const GOLDEN_STEP = 0x9e37_79b1;

/** V1/V2 held-out families reconstructed exactly from their committed receipt sequences. */
const V1_SEEDS = Array.from(
  { length: 30 },
  (_, index) => (255_293_874 + Math.imul(index, GOLDEN_STEP)) >>> 0,
);
const V2_SEEDS = Array.from(
  { length: 30 },
  (_, index) => (272_071_090 + Math.imul(index, GOLDEN_STEP)) >>> 0,
);
/** V3 source law from scripts/organism-intelligence-benchmark.ts. */
const V3_SEEDS = Array.from(
  { length: 30 },
  (_, index) => (0x9d00_0001 + Math.imul(index + 1, 0x85eb_ca6b)) >>> 0,
);

/** Every historical evaluation or surrogate-calibration seed that Phase B must reject. */
export const HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS = Object.freeze([
  ...V1_SEEDS,
  ...V2_SEEDS,
  ...V3_SEEDS,
  ...V4_EVALUATION_SEEDS,
  ...V4_SURROGATE_CALIBRATION_SEEDS,
]);

const HISTORICAL_SEED_SET = new Set<number>(HISTORICAL_ORGANISM_INTELLIGENCE_SEEDS);

export type PhaseBDevelopmentSeedNamespace =
  | 'nhi-train'
  | 'nhi-validation'
  | 'nhi-surrogate'
  | 'nhi-fault'
  | 'predictor-development'
  | 'predictor-calibration'
  | 'predictor-fault'
  | 'predictor-v3-task-train'
  | 'predictor-v3-task-selection'
  | 'predictor-v3-task-validation'
  | 'predictor-v3-model-development'
  | 'predictor-v3-model-validation'
  | 'predictor-v3-fault'
  | 'ordinary-train'
  | 'ordinary-validation'
  | 'ordinary-surrogate'
  | 'ordinary-fault'
  | 'ordinary-v2-train'
  | 'ordinary-v2-validation'
  | 'ordinary-v2-model'
  | 'ordinary-v2-surrogate'
  | 'ordinary-v2-fault';

const DOMAIN: Record<PhaseBDevelopmentSeedNamespace, string> = {
  'nhi-train': 'cqm/nhi-phase-b/dev-train/v1',
  'nhi-validation': 'cqm/nhi-phase-b/dev-validation/v1',
  'nhi-surrogate': 'cqm/nhi-phase-b/dev-surrogate/v1',
  'nhi-fault': 'cqm/nhi-phase-b/dev-fault/v1',
  'predictor-development': 'cqm/predictor-phase-b/dev-development/v1',
  'predictor-calibration': 'cqm/predictor-phase-b/dev-calibration/v1',
  'predictor-fault': 'cqm/predictor-phase-b/dev-fault/v1',
  'predictor-v3-task-train': 'cqm/predictor-phase-b/temporal-task-train/v3',
  'predictor-v3-task-selection': 'cqm/predictor-phase-b/temporal-task-selection/v3',
  'predictor-v3-task-validation': 'cqm/predictor-phase-b/temporal-task-validation/v3',
  'predictor-v3-model-development': 'cqm/predictor-phase-b/temporal-model-development/v3',
  'predictor-v3-model-validation': 'cqm/predictor-phase-b/temporal-model-validation/v3',
  'predictor-v3-fault': 'cqm/predictor-phase-b/temporal-fault/v3',
  'ordinary-train': 'cqm/ordinary-phase-b/dev-train/v1',
  'ordinary-validation': 'cqm/ordinary-phase-b/dev-validation/v1',
  'ordinary-surrogate': 'cqm/ordinary-phase-b/dev-surrogate/v1',
  'ordinary-fault': 'cqm/ordinary-phase-b/dev-fault/v1',
  'ordinary-v2-train': 'cqm/ordinary-phase-b/dev-train/v2',
  'ordinary-v2-validation': 'cqm/ordinary-phase-b/dev-validation/v2',
  'ordinary-v2-model': 'cqm/ordinary-phase-b/dev-model/v2',
  'ordinary-v2-surrogate': 'cqm/ordinary-phase-b/dev-surrogate/v2',
  'ordinary-v2-fault': 'cqm/ordinary-phase-b/dev-fault/v2',
};

function firstUint32Le(message: string): number {
  const hex = new Bun.CryptoHasher('sha256').update(message).digest('hex');
  const b0 = Number.parseInt(hex.slice(0, 2), 16);
  const b1 = Number.parseInt(hex.slice(2, 4), 16);
  const b2 = Number.parseInt(hex.slice(4, 6), 16);
  const b3 = Number.parseInt(hex.slice(6, 8), 16);
  const value = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  return value === 0 ? 1 : value;
}

/** Reject a historical/future-invalid seed at a development runner boundary. */
export function assertPhaseBDevelopmentSeed(seed: number): void {
  if (!Number.isSafeInteger(seed) || seed <= 0 || seed >= UINT32_MODULUS) {
    throw new RangeError(
      `Phase-B development seed must be a nonzero uint32; received ${String(seed)}`,
    );
  }
  if (HISTORICAL_SEED_SET.has(seed)) {
    throw new RangeError(`Phase-B development seed ${seed} overlaps a V1-V4 evidence family`);
  }
}

/** Derive a fixed development-only family from a domain-separated SHA-256 namespace. */
export function phaseBDevelopmentSeeds(
  namespace: PhaseBDevelopmentSeedNamespace,
  count: number,
): readonly number[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 10_000) {
    throw new RangeError(`Phase-B development seed count must be in [1,10000]; received ${count}`);
  }
  const domain = DOMAIN[namespace];
  if (domain === undefined) {
    throw new RangeError(`unknown Phase-B development seed namespace: ${String(namespace)}`);
  }
  const seeds = Array.from({ length: count }, (_, index) => firstUint32Le(`${domain}/${index}`));
  for (const seed of seeds) assertPhaseBDevelopmentSeed(seed);
  if (new Set(seeds).size !== seeds.length) {
    throw new Error(`Phase-B development namespace ${namespace} produced a duplicate seed`);
  }
  return Object.freeze(seeds);
}

/** Frozen development families. None is an evaluation or publication family. */
export const PHASE_B_DEVELOPMENT_SEEDS = Object.freeze({
  nhiTrain: phaseBDevelopmentSeeds('nhi-train', 32),
  nhiValidation: phaseBDevelopmentSeeds('nhi-validation', 16),
  nhiSurrogate: phaseBDevelopmentSeeds('nhi-surrogate', 16),
  nhiFault: phaseBDevelopmentSeeds('nhi-fault', 8),
  predictorDevelopment: phaseBDevelopmentSeeds('predictor-development', 48),
  predictorCalibration: phaseBDevelopmentSeeds('predictor-calibration', 16),
  predictorFault: phaseBDevelopmentSeeds('predictor-fault', 8),
  predictorV3TaskTrain: phaseBDevelopmentSeeds('predictor-v3-task-train', 32),
  predictorV3TaskSelection: phaseBDevelopmentSeeds('predictor-v3-task-selection', 16),
  predictorV3TaskValidation: phaseBDevelopmentSeeds('predictor-v3-task-validation', 32),
  predictorV3ModelDevelopment: phaseBDevelopmentSeeds('predictor-v3-model-development', 8),
  predictorV3ModelValidation: phaseBDevelopmentSeeds('predictor-v3-model-validation', 16),
  predictorV3Fault: phaseBDevelopmentSeeds('predictor-v3-fault', 8),
  ordinaryTrain: phaseBDevelopmentSeeds('ordinary-train', 32),
  ordinaryValidation: phaseBDevelopmentSeeds('ordinary-validation', 16),
  ordinarySurrogate: phaseBDevelopmentSeeds('ordinary-surrogate', 16),
  ordinaryFault: phaseBDevelopmentSeeds('ordinary-fault', 8),
  ordinaryV2Train: phaseBDevelopmentSeeds('ordinary-v2-train', 12),
  ordinaryV2Validation: phaseBDevelopmentSeeds('ordinary-v2-validation', 8),
  ordinaryV2Model: phaseBDevelopmentSeeds('ordinary-v2-model', 4),
  ordinaryV2Surrogate: phaseBDevelopmentSeeds('ordinary-v2-surrogate', 8),
  ordinaryV2Fault: phaseBDevelopmentSeeds('ordinary-v2-fault', 4),
});

/**
 * Deliberate-change seal for all twenty-two ordered development families. Derivation tests alone are
 * tautological if a namespace is edited; this literal makes any family replacement an explicit,
 * reviewable update instead of silently changing every development schedule.
 */
export const PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256 =
  '469f79e59c29639034afb4aea2bf6b0e3a82f2a3f3303b7fb3c9efa7ec443b8a';

const seedFamilyMaterial = Object.entries(PHASE_B_DEVELOPMENT_SEEDS).map(([name, seeds]) => [
  name,
  [...seeds],
]);
const actualSeedFamilySha256 = new Bun.CryptoHasher('sha256')
  .update(JSON.stringify(seedFamilyMaterial))
  .digest('hex');
if (actualSeedFamilySha256 !== PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256) {
  throw new Error(
    `Phase-B development seed families changed: ${actualSeedFamilySha256} !== ${PHASE_B_DEVELOPMENT_SEED_FAMILY_SHA256}`,
  );
}

/** Verify disjointness when a runner combines multiple development roles. */
export function assertDisjointPhaseBDevelopmentFamilies(
  families: Readonly<Record<string, readonly number[]>>,
): void {
  const owner = new Map<number, string>();
  for (const [name, seeds] of Object.entries(families)) {
    for (const seed of seeds) {
      assertPhaseBDevelopmentSeed(seed);
      const prior = owner.get(seed);
      if (prior !== undefined) {
        throw new RangeError(`Phase-B development seed ${seed} overlaps ${prior} and ${name}`);
      }
      owner.set(seed, name);
    }
  }
}

assertDisjointPhaseBDevelopmentFamilies(PHASE_B_DEVELOPMENT_SEEDS);
