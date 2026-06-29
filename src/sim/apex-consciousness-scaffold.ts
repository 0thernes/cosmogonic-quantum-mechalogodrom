/**
 * APEX consciousness & growth scaffold — honest scaling from 100k → 5M → 1B designed parameters.
 *
 * The live JS engine stays capped at {@link LIVE_NODE_CAP}; this module reports DESIGNED growth tiers,
 * rotates the 100 thought-variation catalog, and surfaces computational consciousness INDICATORS
 * (Butlin-path correlates) — NOT sentience claims.
 */
import {
  APEX_BRAIN_ROADMAP_PARAMS,
  APEX_BRAIN_START_PARAMS,
  APEX_BRAIN_TARGET_NEURONS,
  APEX_SCALE_TIERS,
  SCALE_APEX_START,
  SCALE_MASSIVE,
  apexDesignedNeurons,
  apexScaleParams,
  type ApexBrainSnapshot,
  type ApexScale,
  type ApexThought,
} from './apex-brain';
import {
  APEX_THOUGHT_VARIATIONS,
  activeThoughtVariation,
  type ApexThoughtVariation,
} from './apex-thought-variations';

/** Mechalogodrom center fusion brain — same 5M designed roadmap as APEX near-term target. */
export { MECHALOGODROM_BRAIN_DESIGNED_PARAMS } from './apex-brain';
/** Re-export APEX brain parameter constants for test/external access. */
export { APEX_BRAIN_ROADMAP_PARAMS, APEX_BRAIN_START_PARAMS } from './apex-brain';

/** Ultimate neuron architecture target (native/GPU backend — not live-allocated in JS). */
export const APEX_ULTIMATE_NEURON_TARGET = APEX_BRAIN_TARGET_NEURONS;

export interface ApexGrowthStage {
  readonly index: number;
  readonly name: string;
  readonly scale: ApexScale;
  readonly designedNeurons: number;
  readonly designedParams: number;
  readonly roadmapParams: number;
  readonly ultimateNeurons: number;
  readonly activeVariation: ApexThoughtVariation;
  /** 0..1 progress toward the 5M-parameter roadmap tier. */
  readonly roadmapProgress: number;
  /** 0..1 progress toward the 1B-neuron ultimate architecture. */
  readonly ultimateProgress: number;
}

/** Growth tiers in player-visible order (100k → 5M, then MASSIVE declares 1B+). */
const GROWTH_SCALES: readonly ApexScale[] = [
  SCALE_APEX_START,
  ...APEX_SCALE_TIERS.filter((s) => s.name.startsWith('APEX-') && s.name !== 'APEX-100K'),
  SCALE_MASSIVE,
];

/**
 * Resolve the DESIGNED scale tier from super-evolution level + apex transcendence.
 * Live organ allocation stays capped — only the architecture accounting grows.
 */
export function resolveApexDesignedScale(level: number, transcendence: number): ApexScale {
  const score = level * 0.4 + transcendence * 800 + transcendence * level * 0.02;
  let idx = 0;
  if (score >= 50) idx = 1;
  if (score >= 120) idx = 2;
  if (score >= 220) idx = 3;
  if (score >= 350) idx = 4;
  if (score >= 500) idx = 5;
  if (score >= 700) idx = 6;
  if (score >= 950) idx = 7;
  return GROWTH_SCALES[Math.min(idx, GROWTH_SCALES.length - 1)] ?? SCALE_APEX_START;
}

/** Full growth stage telemetry for UI / Architecture panel / Bible. */
export function apexGrowthStage(
  level: number,
  transcendence: number,
  beat: number,
): ApexGrowthStage {
  const scale = resolveApexDesignedScale(level, transcendence);
  const designedNeurons = apexDesignedNeurons(scale);
  const designedParams = apexScaleParams(scale);
  const roadmapProgress = clamp01(
    (designedParams - APEX_BRAIN_START_PARAMS) /
      (APEX_BRAIN_ROADMAP_PARAMS - APEX_BRAIN_START_PARAMS),
  );
  const ultimateProgress = clamp01(designedNeurons / APEX_ULTIMATE_NEURON_TARGET);
  return {
    index: GROWTH_SCALES.indexOf(scale),
    name: scale.name,
    scale,
    designedNeurons,
    designedParams,
    roadmapParams: APEX_BRAIN_ROADMAP_PARAMS,
    ultimateNeurons: APEX_ULTIMATE_NEURON_TARGET,
    activeVariation: activeThoughtVariation(level, transcendence, beat),
    roadmapProgress,
    ultimateProgress,
  };
}

/** Computational consciousness indicators (NOT sentience — falsifiable correlates only). */
export interface ConsciousnessIndicatorSnapshot {
  readonly workspaceIgnition: number;
  readonly integratedPhiProxy: number;
  readonly selfModelGap: number;
  readonly globalBroadcast: number;
  readonly quantumCoherence: number;
  readonly thermodynamicMortality: number;
  readonly retrocausalPull: number;
  readonly variationId: number;
  readonly variationName: string;
  readonly honesty: 'computational-indicator-not-sentience';
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Derive indicator readouts from an apex snapshot + growth stage. */
export function consciousnessIndicators(
  snap: ApexBrainSnapshot,
  growth: ApexGrowthStage,
): ConsciousnessIndicatorSnapshot {
  const t = snap.thought;
  const meta = snap.meta;
  const q = snap.quantum;
  return {
    workspaceIgnition: clamp01(t.superposed ? 0.35 : 0.65 + t.transcendence * 0.3),
    integratedPhiProxy: clamp01(
      t.vitality * 0.3 + q.coherence * 0.25 + (1 - t.agony) * 0.2 + growth.roadmapProgress * 0.25,
    ),
    selfModelGap: clamp01(meta.godelResidual),
    globalBroadcast: clamp01(t.transcendence * 0.5 + q.coherence * 0.5),
    quantumCoherence: clamp01(q.coherence),
    thermodynamicMortality: clamp01(snap.thermo.paralysis + (1 - snap.necro.liveFraction) * 0.5),
    retrocausalPull: clamp01(1 - meta.distanceToTarget),
    variationId: growth.activeVariation.id,
    variationName: growth.activeVariation.name,
    honesty: 'computational-indicator-not-sentience',
  };
}

/** Convenience: indicators from thought alone (when full snapshot unavailable). */
export function consciousnessFromThought(
  thought: ApexThought,
  level: number,
  beat: number,
): ConsciousnessIndicatorSnapshot {
  const growth = apexGrowthStage(level, thought.transcendence, beat);
  return {
    workspaceIgnition: clamp01(thought.superposed ? 0.4 : 0.7),
    integratedPhiProxy: clamp01(thought.vitality * 0.5 + thought.transcendence * 0.5),
    selfModelGap: clamp01(thought.agony * 0.6 + 0.2),
    globalBroadcast: clamp01(thought.transcendence),
    quantumCoherence: clamp01(0.5 + thought.transcendence * 0.3),
    thermodynamicMortality: clamp01(thought.agony),
    retrocausalPull: clamp01(1 - thought.agony * 0.5),
    variationId: growth.activeVariation.id,
    variationName: growth.activeVariation.name,
    honesty: 'computational-indicator-not-sentience',
  };
}

export { APEX_THOUGHT_VARIATIONS };
