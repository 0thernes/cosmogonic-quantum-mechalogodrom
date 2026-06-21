/**
 * EMERGENCE ANGLES INSTRUMENT — the 10 axes along which the cosmos can become "more than its parts".
 *
 * The blueprint (docs/NEO-MIND-ARCHITECTURE.md) names 7 architectural emergence angles. This module
 * formalises them as MEASURED signals and adds the three the codebase already computes the real math
 * for — promoting them from buried scalars to first-class axes — for a full **10**:
 *
 *   1  World-as-cognition        — survival/scarcity/trophic + economic pressure (petri-dish, economy)
 *   2  Dreaming / offline replay — consolidation activity off the live percept stream
 *   3  Developmental ontogeny    — rate of structural change as a creature matures (super-evolution)
 *   4  Inter-Archon language     — divergence of the signals the 5 minds emit at each other (theory-of-mind)
 *   5  Shared mind-field         — stigmergic / GWT global-workspace coupling across agents
 *   6  Whole-dome criticality    — proximity of the branching ratio to 1 (criticality.ts, resonance.ts)
 *   7  Adversarial selection     — fitness variance under death pressure (digital-biologics, open-endedness)
 *   8  Empowerment (NEW)         — Blahut-Arimoto channel capacity I(A;S') (empowerment.ts) — agency
 *   9  Integrated information(NEW)— Φ, the min-cut integration measure (integrated-information.ts)
 *  10  Chaos / Lyapunov (NEW)    — edge-of-chaos magnitude (chaos-field Lorenz, hopfield energy)
 *
 * PURE math: no rng draws, no Date.now, no DOM, no mutation of inputs — determinism-safe (never touches
 * the seeded core stream) and fully unit-testable headlessly. A sim/UI layer feeds it the per-frame
 * normalised observations; the scoring lives here as pure functions (mirrors open-endedness.ts).
 *
 * Each angle is a normalised [0,1] signal. The aggregate emergence index rewards BOTH depth (average
 * angle strength) AND breadth (how many distinct angles are firing) — emergence is multi-angle, not one
 * spike — so a system maxing a single axis cannot fake a high score.
 */

/** Number of emergence angles (the blueprint's 7 + empowerment/Φ/Lyapunov = 10). */
export const EMERGENCE_ANGLE_COUNT = 10;

/** Canonical angle names, index-aligned with {@link EmergenceProfile.angles}. */
export const EMERGENCE_ANGLE_LABELS = [
  'world-as-cognition',
  'dreaming',
  'developmental-ontogeny',
  'inter-archon-language',
  'shared-mind-field',
  'whole-dome-criticality',
  'adversarial-selection',
  'empowerment',
  'integrated-information',
  'chaos-lyapunov',
] as const;

/** Raw per-frame signals the sim feeds in; each is clamped to [0,1] by {@link emergenceProfile}. */
export interface EmergenceObservations {
  /** #1 trophic/economic survival pressure currently shaping behaviour. */
  worldCognition: number;
  /** #2 offline-replay / consolidation activity off the live percept stream. */
  dreaming: number;
  /** #3 structural-change rate as creatures mature (ontogeny). */
  ontogeny: number;
  /** #4 divergence of the signals the Archon minds emit at each other (emergent language). */
  language: number;
  /** #5 stigmergic / GWT shared-workspace coupling across agents. */
  mindField: number;
  /** #6 closeness of the branching ratio σ̂ to the critical 1 (1 − |σ̂ − 1|, clamped). */
  criticality: number;
  /** #7 fitness variance under adversarial death pressure. */
  selection: number;
  /** #8 normalised empowerment — channel capacity I(A;S′) / ln(K) ∈ [0,1] (empowerment.ts). */
  empowerment: number;
  /** #9 normalised integrated information Φ (integrated-information.ts). */
  phi: number;
  /** #10 normalised edge-of-chaos magnitude (chaos-field Lorenz / hopfield energy gradient). */
  lyapunov: number;
}

/** The measured emergence state across all 10 angles. */
export interface EmergenceProfile {
  /** 10 normalised angle scores in [0,1], index-aligned with {@link EMERGENCE_ANGLE_LABELS}. */
  angles: number[];
  /** Index-aligned labels (a copy, so callers cannot mutate the canonical array). */
  labels: string[];
  /** Number of angles at or above {@link ACTIVE_THRESHOLD} — the breadth of emergence. */
  activeCount: number;
  /** Mean angle strength ∈ [0,1] — the depth of emergence. */
  depth: number;
  /** Breadth ∈ [0,1] = activeCount / 10. */
  breadth: number;
  /**
   * Aggregate emergence index ∈ [0,1] = ½·depth + ½·breadth. Rewards both broad participation and
   * average strength, so no single maxed axis can fake emergence. Deterministic.
   */
  index: number;
}

/** An angle counts as "active" once its normalised signal reaches this level. */
export const ACTIVE_THRESHOLD = 0.5;

/** Clamp to [0,1] (also seals NaN → 0). O(1). */
function unit(v: number): number {
  return v > 1 ? 1 : v > 0 ? v : 0;
}

/**
 * Score the 10 emergence angles from one frame of normalised observations. Pure, deterministic,
 * allocation-light (one fixed-length array). Every input is clamped to [0,1]; the aggregate index is
 * ½·depth (mean strength) + ½·breadth (fraction of angles active). O(1).
 */
export function emergenceProfile(obs: EmergenceObservations): EmergenceProfile {
  const angles = [
    unit(obs.worldCognition),
    unit(obs.dreaming),
    unit(obs.ontogeny),
    unit(obs.language),
    unit(obs.mindField),
    unit(obs.criticality),
    unit(obs.selection),
    unit(obs.empowerment),
    unit(obs.phi),
    unit(obs.lyapunov),
  ];
  let sum = 0;
  let active = 0;
  for (const a of angles) {
    sum += a;
    if (a >= ACTIVE_THRESHOLD) active++;
  }
  const depth = sum / EMERGENCE_ANGLE_COUNT;
  const breadth = active / EMERGENCE_ANGLE_COUNT;
  return {
    angles,
    labels: [...EMERGENCE_ANGLE_LABELS],
    activeCount: active,
    depth,
    breadth,
    index: 0.5 * depth + 0.5 * breadth,
  };
}
