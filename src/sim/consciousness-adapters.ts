/**
 * CONSCIOUSNESS ADAPTERS — deterministic entity-class adapters that feed the ten-framework
 * {@link ConsciousnessKernel}. This is the bridge from doctrine to page-visible data:
 * plant/creature/shoggoth/puppeteer/mechalogodrom/apex/pantheon/glyph/archon profiles emit
 * bandwidth-scaled {@link FrameworkSignals}, then the shared kernel turns them into honest
 * `indicatorOnly` snapshots.
 *
 * These are not phenomenal-consciousness claims. They are profile adapters and static demo feeds
 * until the live world loop passes per-entity telemetry into the same functions.
 */
import {
  ConsciousnessKernel,
  FRAMEWORK_IDS,
  FRAMEWORKS,
  type ConsciousnessFrameworkId,
  type ConsciousnessLabSnapshot,
  type FrameworkSignals,
} from './consciousness-kernel';
import { runConsciousnessLab, type FrameworkLabStat, type LabReport } from './consciousness-lab';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export type ConsciousnessEntityKind =
  | 'plant'
  | 'creature'
  | 'shoggoth'
  | 'puppeteer'
  | 'mechalogodrom'
  | 'apex'
  | 'pantheon'
  | 'glyph'
  | 'archon';

export const CONSCIOUSNESS_ENTITY_KINDS: readonly ConsciousnessEntityKind[] = Object.freeze([
  'plant',
  'creature',
  'shoggoth',
  'puppeteer',
  'mechalogodrom',
  'apex',
  'pantheon',
  'glyph',
  'archon',
]);

export interface EntityConsciousnessTraits {
  vitality: number;
  sensorium: number;
  embodiment: number;
  activeInference: number;
  attention: number;
  selfModel: number;
  association: number;
  field: number;
  recurrence: number;
  integration: number;
  workspace: number;
  projective: number;
  perturbation: number;
  social: number;
  plasticity: number;
}

export interface EntityConsciousnessProfile {
  id: string;
  kind: ConsciousnessEntityKind;
  label: string;
  seed: number;
  /** 1..10 evidence bandwidth. Low-bandwidth forms intentionally leave advanced frameworks absent. */
  bandwidth: number;
  traits: EntityConsciousnessTraits;
  adapterReceipt: string;
}

export interface EntityConsciousnessRecord {
  profile: EntityConsciousnessProfile;
  lastSignals: FrameworkSignals;
  snapshot: ConsciousnessLabSnapshot;
  activeFrameworks: number;
  absentFrameworks: ConsciousnessFrameworkId[];
  loadBearingFrameworks: ConsciousnessFrameworkId[];
  dominantFramework: ConsciousnessFrameworkId;
  weakestPresentFramework: ConsciousnessFrameworkId | null;
  meanFrameworkScore: number;
}

export interface ConsciousnessDashboardData {
  version: 'consciousness-lab-v1';
  generatedAt: '2026-07-03T00:00:00.000Z';
  seed: number;
  claim: 'indicatorOnly';
  sourceDocs: readonly string[];
  frameworks: readonly {
    id: ConsciousnessFrameworkId;
    name: string;
    bucket: string;
    weirdness: number;
    grade: string;
    source: string;
    falsifier: string;
  }[];
  labReport: LabReport;
  entityRecords: readonly EntityConsciousnessRecord[];
}

const support = (...ids: ConsciousnessFrameworkId[]): readonly ConsciousnessFrameworkId[] =>
  Object.freeze(ids);

const SUPPORT: Readonly<Record<ConsciousnessEntityKind, readonly ConsciousnessFrameworkId[]>> =
  Object.freeze({
    plant: support('butlin14', 'activeInference', 'fieldIntegration', 'ual', 'sensorimotor'),
    creature: support(
      'butlin14',
      'thaler9',
      'iit4',
      'activeInference',
      'attentionSchema',
      'fieldIntegration',
      'ual',
      'sensorimotor',
      'ctm',
    ),
    shoggoth: support(
      'butlin14',
      'thaler9',
      'iit4',
      'activeInference',
      'fieldIntegration',
      'ual',
      'sensorimotor',
      'projective',
      'ctm',
    ),
    puppeteer: support(
      'butlin14',
      'thaler9',
      'iit4',
      'activeInference',
      'attentionSchema',
      'fieldIntegration',
      'ual',
      'sensorimotor',
      'projective',
      'ctm',
    ),
    mechalogodrom: FRAMEWORK_IDS,
    apex: FRAMEWORK_IDS,
    pantheon: FRAMEWORK_IDS,
    glyph: support(
      'butlin14',
      'thaler9',
      'iit4',
      'activeInference',
      'fieldIntegration',
      'ual',
      'projective',
      'ctm',
    ),
    archon: FRAMEWORK_IDS,
  });

export const DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES: readonly EntityConsciousnessProfile[] =
  Object.freeze([
    {
      id: 'plant-grove-000',
      kind: 'plant',
      label: 'Plant Grove',
      seed: 0x710a,
      bandwidth: 4,
      traits: {
        vitality: 0.62,
        sensorium: 0.38,
        embodiment: 0.34,
        activeInference: 0.36,
        attention: 0.12,
        selfModel: 0.18,
        association: 0.42,
        field: 0.6,
        recurrence: 0.36,
        integration: 0.24,
        workspace: 0.08,
        projective: 0.04,
        perturbation: 0.2,
        social: 0.1,
        plasticity: 0.32,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#plant-low-bandwidth',
    },
    {
      id: 'creature-strain-017',
      kind: 'creature',
      label: 'Creature Strain',
      seed: 0xc0a7,
      bandwidth: 7,
      traits: {
        vitality: 0.72,
        sensorium: 0.7,
        embodiment: 0.66,
        activeInference: 0.64,
        attention: 0.55,
        selfModel: 0.46,
        association: 0.68,
        field: 0.45,
        recurrence: 0.58,
        integration: 0.52,
        workspace: 0.5,
        projective: 0.32,
        perturbation: 0.56,
        social: 0.38,
        plasticity: 0.62,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#creature-adapter',
    },
    {
      id: 'shoggoth-choir-004',
      kind: 'shoggoth',
      label: 'Shoggoth Choir',
      seed: 0x5a09,
      bandwidth: 8,
      traits: {
        vitality: 0.82,
        sensorium: 0.62,
        embodiment: 0.74,
        activeInference: 0.58,
        attention: 0.42,
        selfModel: 0.35,
        association: 0.78,
        field: 0.84,
        recurrence: 0.76,
        integration: 0.66,
        workspace: 0.48,
        projective: 0.58,
        perturbation: 0.86,
        social: 0.52,
        plasticity: 0.74,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#shoggoth-adapter',
    },
    {
      id: 'puppeteer-hand-003',
      kind: 'puppeteer',
      label: 'Puppeteer Hand',
      seed: 0x9e77,
      bandwidth: 8,
      traits: {
        vitality: 0.7,
        sensorium: 0.68,
        embodiment: 0.54,
        activeInference: 0.7,
        attention: 0.86,
        selfModel: 0.72,
        association: 0.58,
        field: 0.52,
        recurrence: 0.64,
        integration: 0.6,
        workspace: 0.84,
        projective: 0.68,
        perturbation: 0.6,
        social: 0.8,
        plasticity: 0.66,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#puppeteer-adapter',
    },
    {
      id: 'mechalogodrom-core-001',
      kind: 'mechalogodrom',
      label: 'Mechalogodrom Core',
      seed: 0x4d3c,
      bandwidth: 10,
      traits: {
        vitality: 0.86,
        sensorium: 0.74,
        embodiment: 0.78,
        activeInference: 0.78,
        attention: 0.82,
        selfModel: 0.76,
        association: 0.72,
        field: 0.82,
        recurrence: 0.84,
        integration: 0.88,
        workspace: 0.86,
        projective: 0.84,
        perturbation: 0.78,
        social: 0.66,
        plasticity: 0.82,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#mechalogodrom-adapter',
    },
    {
      id: 'apex-abomination-000',
      kind: 'apex',
      label: 'APEX Abomination',
      seed: 0xa9e8,
      bandwidth: 10,
      traits: {
        vitality: 0.9,
        sensorium: 0.84,
        embodiment: 0.86,
        activeInference: 0.84,
        attention: 0.88,
        selfModel: 0.82,
        association: 0.82,
        field: 0.78,
        recurrence: 0.88,
        integration: 0.9,
        workspace: 0.9,
        projective: 0.82,
        perturbation: 0.84,
        social: 0.72,
        plasticity: 0.86,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#apex-adapter',
    },
    {
      id: 'pantheon-chorus-025',
      kind: 'pantheon',
      label: 'Pantheon Chorus',
      seed: 0x25fa,
      bandwidth: 10,
      traits: {
        vitality: 0.82,
        sensorium: 0.78,
        embodiment: 0.72,
        activeInference: 0.82,
        attention: 0.86,
        selfModel: 0.84,
        association: 0.76,
        field: 0.8,
        recurrence: 0.86,
        integration: 0.86,
        workspace: 0.92,
        projective: 0.86,
        perturbation: 0.76,
        social: 0.94,
        plasticity: 0.8,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#pantheon-adapter',
    },
    {
      id: 'glyph-resonator-011',
      kind: 'glyph',
      label: 'Glyph Resonator',
      seed: 0x611f,
      bandwidth: 7,
      traits: {
        vitality: 0.58,
        sensorium: 0.52,
        embodiment: 0.34,
        activeInference: 0.56,
        attention: 0.48,
        selfModel: 0.44,
        association: 0.62,
        field: 0.88,
        recurrence: 0.78,
        integration: 0.7,
        workspace: 0.58,
        projective: 0.92,
        perturbation: 0.7,
        social: 0.36,
        plasticity: 0.68,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#glyph-adapter',
    },
    {
      id: 'archon-godform-005',
      kind: 'archon',
      label: 'Archon Godform',
      seed: 0xa4c0,
      bandwidth: 10,
      traits: {
        vitality: 0.92,
        sensorium: 0.88,
        embodiment: 0.82,
        activeInference: 0.9,
        attention: 0.94,
        selfModel: 0.9,
        association: 0.86,
        field: 0.86,
        recurrence: 0.92,
        integration: 0.94,
        workspace: 0.96,
        projective: 0.9,
        perturbation: 0.88,
        social: 0.92,
        plasticity: 0.9,
      },
      adapterReceipt: 'src/sim/consciousness-adapters.ts#archon-adapter',
    },
  ]);

export function supportsFramework(
  profile: EntityConsciousnessProfile,
  id: ConsciousnessFrameworkId,
): boolean {
  return SUPPORT[profile.kind].includes(id);
}

function modulated(
  profile: EntityConsciousnessProfile,
  tick: number,
  base: number,
  salt: number,
): number {
  const phase = profile.seed * 0.00073 + salt * 1.618 + tick * (0.031 + salt * 0.0027);
  const swing = Math.sin(phase) * 0.055 * profile.traits.plasticity;
  return clamp01(base + swing);
}

function setIfSupported(
  profile: EntityConsciousnessProfile,
  id: ConsciousnessFrameworkId,
  value: number,
): number | undefined {
  return supportsFramework(profile, id) ? clamp01(value) : undefined;
}

export function signalsFromEntityProfile(
  profile: EntityConsciousnessProfile,
  tick = 0,
): FrameworkSignals {
  const t = profile.traits;
  const bw = profile.bandwidth / 10;
  const butlin = 0.12 + bw * 0.22 + (t.workspace + t.attention + t.selfModel + t.embodiment) * 0.11;
  const thaler =
    t.perturbation * 0.42 + t.association * 0.26 + t.field * 0.18 + t.recurrence * 0.14;
  const iit = t.integration * 0.52 + t.field * 0.18 + t.workspace * 0.18 + t.recurrence * 0.12;
  const active = t.activeInference * 0.56 + t.vitality * 0.2 + t.embodiment * 0.24;
  const ast = t.attention * 0.42 + t.selfModel * 0.38 + t.social * 0.2;
  const field = t.field * 0.58 + t.recurrence * 0.28 + t.integration * 0.14;
  const ual = t.association * 0.48 + t.plasticity * 0.26 + t.vitality * 0.14 + t.recurrence * 0.12;
  const sensorimotor =
    t.embodiment * 0.46 + t.sensorium * 0.28 + t.activeInference * 0.18 + t.vitality * 0.08;
  const projective = t.projective * 0.52 + t.selfModel * 0.2 + t.field * 0.16 + t.attention * 0.12;
  const ctm = t.workspace * 0.46 + t.attention * 0.26 + t.recurrence * 0.16 + t.integration * 0.12;
  const phi = setIfSupported(profile, 'iit4', modulated(profile, tick, iit, 2));
  return {
    butlinCoverage: setIfSupported(profile, 'butlin14', modulated(profile, tick, butlin, 0)),
    thalerFraction: setIfSupported(profile, 'thaler9', modulated(profile, tick, thaler, 1)),
    phi,
    partitionLoss:
      phi === undefined
        ? undefined
        : clamp01(phi * (0.55 + 0.28 * t.integration + 0.17 * t.workspace)),
    freeEnergyDescent: setIfSupported(
      profile,
      'activeInference',
      modulated(profile, tick, active, 3),
    ),
    attentionSchemaAccuracy: setIfSupported(
      profile,
      'attentionSchema',
      modulated(profile, tick, ast, 4),
    ),
    fieldCoherence: setIfSupported(profile, 'fieldIntegration', modulated(profile, tick, field, 5)),
    ualDepth: setIfSupported(profile, 'ual', modulated(profile, tick, ual, 6)),
    sensorimotorMastery: setIfSupported(
      profile,
      'sensorimotor',
      modulated(profile, tick, sensorimotor, 7),
    ),
    projectiveFrame: setIfSupported(profile, 'projective', modulated(profile, tick, projective, 8)),
    streamCompetition: setIfSupported(profile, 'ctm', modulated(profile, tick, ctm, 9)),
  };
}

function labExtrasForProfile(
  profile: EntityConsciousnessProfile,
  stats: readonly FrameworkLabStat[],
): { ablationLoss: number[]; nullSeparation: number[]; causalEffect: number[] } {
  const scale = clamp01(0.45 + profile.bandwidth / 18);
  return {
    ablationLoss: FRAMEWORK_IDS.map((id, i) =>
      supportsFramework(profile, id) ? clamp01((stats[i]?.ablationLoss ?? 0) * scale) : 0,
    ),
    nullSeparation: FRAMEWORK_IDS.map((id, i) =>
      supportsFramework(profile, id) ? clamp01((stats[i]?.nullSeparation ?? 0) * scale) : 0,
    ),
    causalEffect: FRAMEWORK_IDS.map((id, i) =>
      supportsFramework(profile, id) ? clamp01((stats[i]?.causalEffect ?? 0) * scale) : 0,
    ),
  };
}

export function buildEntityConsciousnessRecord(
  profile: EntityConsciousnessProfile,
  labReport: LabReport,
  ticks = 96,
): EntityConsciousnessRecord {
  const kernel = new ConsciousnessKernel(profile.seed, { windowSize: 24, minMoving: 5 });
  let lastSignals = signalsFromEntityProfile(profile, 0);
  for (let tick = 0; tick < ticks; tick++) {
    lastSignals = signalsFromEntityProfile(profile, tick);
    kernel.ingest(lastSignals);
  }
  const snapshot = kernel.buildSnapshot(
    profile.id,
    profile.kind,
    profile.seed,
    labExtrasForProfile(profile, labReport.frameworks),
  );
  const present = snapshot.frameworks.filter((f) => f.status !== 'absent');
  const dominant = present.reduce((best, f) => (f.score > best.score ? f : best), present[0]!);
  const weakest = present.reduce((worst, f) => (f.score < worst.score ? f : worst), present[0]!);
  return {
    profile,
    lastSignals,
    snapshot,
    activeFrameworks: present.length,
    absentFrameworks: snapshot.frameworks.filter((f) => f.status === 'absent').map((f) => f.id),
    loadBearingFrameworks: snapshot.frameworks
      .filter((f) => f.status === 'loadBearing')
      .map((f) => f.id),
    dominantFramework: dominant.id,
    weakestPresentFramework: weakest?.id ?? null,
    meanFrameworkScore:
      present.length === 0 ? 0 : present.reduce((sum, f) => sum + f.score, 0) / present.length,
  };
}

export function generateConsciousnessDashboardData(seed = 0x20260703): ConsciousnessDashboardData {
  const labReport = runConsciousnessLab(seed);
  const entityRecords = DEFAULT_ENTITY_CONSCIOUSNESS_PROFILES.map((profile) =>
    buildEntityConsciousnessRecord(profile, labReport),
  );
  return {
    version: 'consciousness-lab-v1',
    generatedAt: '2026-07-03T00:00:00.000Z',
    seed,
    claim: 'indicatorOnly',
    sourceDocs: Object.freeze([
      'docs/CONSCIOUSNESS-LAB-MASTER-2026-07-03.md',
      'docs/CONSCIOUSNESS-LAB-DEEP-RESEARCH-2026-07-03.md',
      'docs/CONSCIOUSNESS-LAB-FRONTIER-OUTLIER-STACK-2026-07-03.md',
      'docs/CONSCIOUSNESS-LAB-12-REPORT-CONSOLIDATION-2026-07-03.md',
    ]),
    frameworks: FRAMEWORK_IDS.map((id) => {
      const meta = FRAMEWORKS[id];
      return {
        id,
        name: meta.name,
        bucket: meta.bucket,
        weirdness: meta.weirdness,
        grade: meta.grade,
        source: meta.source,
        falsifier: meta.falsifier,
      };
    }),
    labReport,
    entityRecords,
  };
}
