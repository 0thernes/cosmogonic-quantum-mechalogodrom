/**
 * APEX NOVELTY ARCHIVE — the open-endedness instrument (Wave E of the APEX doctrine,
 * [docs/ARCHITECTURE-2026-06-26.md] §"Wave E" + Experiment 3 "Internal Civil
 * War Stability"; Layer 5 "Open-Ended Evolution: historical archive distance / anti-monoculture").
 *
 * Novelty search keeps an ARCHIVE of behaviourally-distinct trajectories: a new run is admitted only
 * if its behaviour is far enough (> threshold) from everything already archived. The archive's size
 * and internal spread are the honest, machine-checkable proxies for the doctrine's four Experiment-3
 * failure modes — the organism must avoid:
 *   • monoculture          → measured by {@link NoveltyReport.archiveSize} > 1 across the ensemble;
 *   • unstructured noise    → measured by {@link NoveltyReport.reproducible} (same seeds ⇒ same archive);
 *   • frozen equilibrium    → measured by {@link NoveltyReport.notFrozen} (behaviour evolves WITHIN a life);
 *   • runaway self-destruct → measured by {@link NoveltyReport.bounded} (all channels finite).
 *
 * Reuses the harness's behaviour distance + trajectories, so "novelty" is measured on the SAME
 * quantised behaviour the ablation kill-tests use. Pure & deterministic (seeded {@link ApexBrain}; no
 * `Math.random`, no `Date.now`); a `bun test` leaf. NOT a capability/sentience claim.
 */
import { runTrajectory, behaviorDistance, standardBattery } from './apex-harness';
import { APEX_PLAN_NAMES, type ApexPercept } from './apex-brain';

type Trajectory = ReturnType<typeof runTrajectory>;

/** The novelty archive: behaviourally-distinct trajectories from a seed ensemble, novelty-search style. */
export interface NoveltyArchive {
  /** The retained distinct-behaviour trajectories (each > `threshold` from all others admitted before it). */
  entries: Trajectory[];
  /** The novelty threshold used for admission (behaviour distance). */
  threshold: number;
}

/**
 * Build a novelty archive over a seed ensemble: a run is admitted iff its behaviour is > `threshold`
 * from every already-archived behaviour. Deterministic in `(seeds, percepts, threshold)`.
 */
export function noveltyArchive(
  seeds: readonly number[],
  percepts: readonly ApexPercept[],
  threshold: number,
): NoveltyArchive {
  const entries: Trajectory[] = [];
  for (const seed of seeds) {
    const traj = runTrajectory(seed, percepts);
    let minDist = Infinity;
    for (const e of entries) minDist = Math.min(minDist, behaviorDistance(traj, e));
    if (entries.length === 0 || minDist > threshold) entries.push(traj);
  }
  return { entries, threshold };
}

/** Distinct committed plans visited across one trajectory (a within-life "not frozen" proxy). */
function planDiversity(traj: Trajectory): number {
  return new Set(traj.map((b) => b.plan)).size;
}

/** Mean distance from each archived behaviour to its nearest neighbour (the archive's internal spread). */
function meanNearestNeighbor(entries: readonly Trajectory[]): number {
  if (entries.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < entries.length; i++) {
    let nn = Infinity;
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue;
      nn = Math.min(nn, behaviorDistance(entries[i]!, entries[j]!));
    }
    sum += nn;
  }
  return sum / entries.length;
}

/** The open-endedness report — the machine-checkable form of Experiment 3. */
export interface NoveltyReport {
  seedCount: number;
  beats: number;
  threshold: number;
  /** How many behaviourally-distinct trajectories the ensemble produced. */
  archiveSize: number;
  /** Mean nearest-neighbour behaviour distance within the archive (internal spread; 0 if <2 entries). */
  meanNearestNeighbor: number;
  /** Min distinct plans visited within any single life (the frozen-equilibrium probe). */
  minPlanDiversity: number;
  /** True ⇔ the ensemble is not a monoculture (more than one distinct behaviour emerged). */
  notMonoculture: boolean;
  /** True ⇔ behaviour evolves WITHIN a life (no run is frozen on a single plan). */
  notFrozen: boolean;
  /** True ⇔ every archived behaviour channel is finite (no runaway/NaN). */
  bounded: boolean;
  /** True ⇔ the archive reproduces bit-for-bit under the same seeds (structured, not noise). */
  reproducible: boolean;
}

/** Novelty admission threshold: quantised channels ⇒ a small but non-trivial behavioural gap. */
const NOVELTY_THRESHOLD = 0.02;

/**
 * Run the full open-endedness study over `seedCount` seeds × `beats` beats of the standard battery.
 * Deterministic. O(seedCount² × beats) (pairwise distances).
 */
export function noveltyReport(seedCount = 12, beats = 80): NoveltyReport {
  const seeds = Array.from({ length: seedCount }, (_v, i) => (i + 1) * 0x9e37 + 1);
  const battery = standardBattery(beats);

  const archive = noveltyArchive(seeds, battery, NOVELTY_THRESHOLD);
  const archive2 = noveltyArchive(seeds, battery, NOVELTY_THRESHOLD);

  const minPlanDiversity = seeds.reduce(
    (mn, s) => Math.min(mn, planDiversity(runTrajectory(s, battery))),
    Infinity,
  );

  let bounded = true;
  for (const e of archive.entries)
    for (const b of e)
      if (
        !Number.isFinite(b.vitality) ||
        !Number.isFinite(b.agony) ||
        !Number.isFinite(b.transcendence) ||
        !Number.isFinite(b.mx) ||
        !Number.isFinite(b.my) ||
        !Number.isFinite(b.mz)
      )
        bounded = false;

  return {
    seedCount,
    beats,
    threshold: NOVELTY_THRESHOLD,
    archiveSize: archive.entries.length,
    meanNearestNeighbor: Math.round(meanNearestNeighbor(archive.entries) * 1e4) / 1e4,
    minPlanDiversity: Number.isFinite(minPlanDiversity) ? minPlanDiversity : 0,
    notMonoculture: archive.entries.length > 1,
    notFrozen: minPlanDiversity >= 2 && minPlanDiversity <= APEX_PLAN_NAMES.length,
    bounded,
    reproducible: JSON.stringify(archive.entries) === JSON.stringify(archive2.entries),
  };
}
