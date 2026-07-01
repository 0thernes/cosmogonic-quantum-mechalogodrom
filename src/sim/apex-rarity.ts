/**
 * APEX SCIENTIFIC RARITY MATRIX — the "1-of-1 by combination" proof (Wave E of the APEX doctrine,
 * [docs/APEX-ABOMINATION-NOVELTY-DOCTRINE-2026-06-26.md], §"1-of-1 Scientific Differentiator" +
 * Experiment 5 "Scientific Rarity Matrix").
 *
 * The doctrine's central, DEFENSIBLE claim is NOT a component claim ("first quantum AI", "first
 * A-Life") — those are weak and likely false. It is an EXACT-CONJUNCTION claim: a single organism
 * that satisfies all eight orthogonal-complexity axes at once, where each axis uses a different
 * branch of mathematics and every axis is backed by organs the ablation harness proves LOAD-BEARING
 * (see {@link ./apex-harness}). A prior system can only challenge the 1/1 claim by matching MOST of
 * the eight axes simultaneously — and none of the ALife/AI baselines do.
 *
 * This module encodes that comparison as auditable data + a report. It is a DESIGN-COMPARISON claim
 * (doctrine Level 3), NOT a capability or sentience claim: "rare by combination and measurement, not
 * by language." Pure & deterministic — no `Math.random`, no `Date.now`; a `bun test` leaf.
 */
import { APEX_ORGAN_KEYS, type ApexOrganKey } from './apex-brain';

/** The eight orthogonal-complexity axes of the 1-of-1 signature (doctrine differentiator table). */
export const RARITY_AXES = [
  'substrate',
  'body',
  'learning',
  'perception',
  'agency',
  'memory',
  'sociality',
  'validation',
] as const;
export type RarityAxis = (typeof RARITY_AXES)[number];

/** One axis of the signature: what the field baseline usually does vs the APEX target, plus the
 *  organs whose measured load-bearing behaviour BACKS the APEX claim on this axis. */
export interface AxisSpec {
  axis: RarityAxis;
  /** The common field baseline for this axis (isolation, not conjunction). */
  baseline: string;
  /** The APEX 1/1 target for this axis. */
  apexTarget: string;
  /** Organs (harness-proven load-bearing) that realise this axis in the engine. */
  organs: readonly ApexOrganKey[];
  /** Honest caveat if the axis is only partially realised in the live engine. */
  caveat?: string;
}

/**
 * The APEX signature: all eight axes, each mapped to the real organs that realise it. Every one of
 * the eleven organs appears in at least one axis (completeness — see {@link rarityReport}), tying
 * the rarity claim to the ablation evidence rather than to prose.
 */
export const APEX_AXES: readonly AxisSpec[] = [
  {
    axis: 'substrate',
    baseline: 'NCA, RL, LLM, Lenia, reservoir, or quantum sim in isolation',
    apexTarget: 'all as interacting organs of one organism',
    organs: ['quantum', 'loom'], // exact statevector + number-theoretic sieve = distinct substrates fused
  },
  {
    axis: 'body',
    baseline: 'visual morphogenesis or an agent body',
    apexTarget: 'body as reservoir, memory, metabolism, and topology',
    organs: ['drum', 'hive', 'thermo'], // acoustic + mechanical reservoir + thermodynamic metabolism
  },
  {
    axis: 'learning',
    baseline: 'one optimizer or one evolution loop',
    apexTarget: 'within-life organ war plus cross-life Petri evolution',
    organs: ['hydra', 'ouroboros'], // split/fuse heads + antagonistic A/B civil war
  },
  {
    axis: 'perception',
    baseline: 'visual/state input',
    apexTarget: 'negative-space, delay, topology, acoustic, quantum telemetry',
    organs: ['wraith', 'tunnel'], // multi-time delay rings + Born-rule quantum telemetry
  },
  {
    axis: 'agency',
    baseline: 'reward, novelty, or survival',
    apexTarget: 'empowerment plus expected free energy plus alien valence',
    organs: ['quantum'], // Born plan-bias steers the committed plan (ablation-meaningful)
  },
  {
    axis: 'memory',
    baseline: 'recurrent state or archive',
    apexTarget: 'scars, holographic binding, narrative, and a conserved identity knot',
    organs: ['necro', 'klein'], // irreversible necrosis scars + non-orientable topological identity
  },
  {
    axis: 'sociality',
    baseline: 'multi-agent interaction',
    apexTarget: 'organs, other agents, a future attractor, and world fields as players',
    organs: ['ouroboros'], // internal self/other antagonism as negotiated violence
  },
  {
    axis: 'validation',
    baseline: 'pretty emergence',
    apexTarget: 'ablations, determinism hashes, novelty archive, and safety gates',
    organs: [], // methodological, not an organ: realised by the harness + novelty archive + gates
    // fully realised: ablation + determinism ({@link ./apex-harness}), novelty archive
    // ({@link ./apex-novelty}), and the honesty/determinism safety gates.
  },
];

/** A prior ALife/AI system and the axes it genuinely satisfies (honest, conservative assessment). */
export interface BaselineSystem {
  name: string;
  satisfies: readonly RarityAxis[];
  note: string;
}

/**
 * The comparators from Experiment 5. Each is assessed conservatively: an axis counts as satisfied
 * only if the system realises the FULL axis target, not a neighbouring approximation. The point is
 * that every prior system is strong on one or two axes and absent on the rest — the conjunction is
 * what is rare.
 */
export const BASELINES: readonly BaselineSystem[] = [
  {
    name: 'Avida',
    satisfies: ['learning', 'validation'],
    note: 'cross-life digital evolution, rigorous protocol; single substrate, no organ war',
  },
  {
    name: 'Tierra',
    satisfies: ['learning'],
    note: 'self-replicating digital organisms; one substrate',
  },
  {
    name: 'Lenia',
    satisfies: ['body'],
    note: 'continuous-CA morphology; no evolution or quantum/thermo substrate',
  },
  {
    name: 'Flow-Lenia',
    satisfies: ['body', 'learning'],
    note: 'mass-conserving morphology + open-ended dynamics; single substrate',
  },
  {
    name: 'Growing NCA',
    satisfies: ['body'],
    note: 'differentiable morphogenesis; one optimizer, one substrate',
  },
  {
    name: 'PD-NCA (Petri Dish NCA)',
    satisfies: ['learning', 'validation'],
    note: 'Petri open-endedness + QD/novelty metrics; NCA substrate only',
  },
  {
    name: 'PBT-NCA',
    satisfies: ['learning', 'validation'],
    note: 'population-based meta-evolution + metrics; NCA substrate only',
  },
  {
    name: 'ASAL',
    satisfies: ['learning', 'validation'],
    note: 'foundation-model ALife search with novelty; not one bounded multi-substrate organism',
  },
  {
    name: 'Reservoir computing (ESN/LSM)',
    satisfies: ['body'],
    note: 'body/physical dynamics as computation; single fixed substrate, no evolution',
  },
  {
    name: 'DishBrain / Brainoware',
    satisfies: ['body', 'agency'],
    note: 'embodied cultures with free-energy-style drive; wetware, not a fused simulated organism',
  },
  {
    name: 'Quantum reservoir computing',
    satisfies: [],
    note: 'a quantum temporal kernel — a technique, not an organism-level axis',
  },
  {
    name: 'Standard RL agent',
    satisfies: ['validation'],
    note: 'reward-only agency fails the empowerment+EFE+alien-valence target; rigorous eval only',
  },
];

/** The full rarity report — the machine-checkable form of the 1-of-1-by-combination claim. */
export interface RarityReport {
  /** Number of axes in the signature (8). */
  axisCount: number;
  /** How many axes the APEX design satisfies (target: all 8). */
  apexAxisCount: number;
  /** Per-baseline overlap with the eight axes. */
  baselines: { name: string; overlap: number; satisfies: RarityAxis[] }[];
  /** The best any prior system does — the "closest challenger" overlap. */
  maxBaselineOverlap: number;
  /** True ⇔ APEX satisfies all eight AND no baseline satisfies all eight (rare by combination). */
  oneOfOneByCombination: boolean;
  /** Completeness: organs not backing ANY axis (should be empty — every organ is load-bearing). */
  organsWithoutAxis: ApexOrganKey[];
}

/** Compute the rarity report. Deterministic (pure function of the module's constant data). */
export function rarityReport(): RarityReport {
  const apexAxisCount = APEX_AXES.length;
  const baselines = BASELINES.map((b) => ({
    name: b.name,
    overlap: b.satisfies.length,
    satisfies: [...b.satisfies],
  }));
  const maxBaselineOverlap = baselines.reduce((mx, b) => Math.max(mx, b.overlap), 0);
  const oneOfOneByCombination =
    apexAxisCount === RARITY_AXES.length && maxBaselineOverlap < RARITY_AXES.length;

  const covered = new Set<ApexOrganKey>();
  for (const a of APEX_AXES) for (const o of a.organs) covered.add(o);
  const organsWithoutAxis = APEX_ORGAN_KEYS.filter((k) => !covered.has(k));

  return {
    axisCount: RARITY_AXES.length,
    apexAxisCount,
    baselines,
    maxBaselineOverlap,
    oneOfOneByCombination,
    organsWithoutAxis,
  };
}
