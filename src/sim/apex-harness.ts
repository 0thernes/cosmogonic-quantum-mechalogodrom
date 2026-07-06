/**
 * APEX SCIENTIFIC HARNESS — Wave E of the APEX doctrine
 * ([docs/ARCHITECTURE-2026-06-26.md]). This is the machinery that turns the Entropic
 * Tesseract Hydra from an "abomination" into a DEFENSIBLE scientific artifact: it proves, by
 * ablation, that every organ is LOAD-BEARING — "if a substrate can be removed with no downstream
 * effect, it was decoration, not biology." It also pins the determinism axiom (same seed ⇒ same
 * behaviour hash) and reports an offworld-dependence proxy (how much behaviour leans on the alien,
 * non-Earth channels vs the earthly ones).
 *
 * Pure & deterministic (seeded {@link ApexBrain}; no `Math.random`, no `Date.now`), a `bun test`
 * leaf. NOT a capability/sentience claim — a falsifiability instrument.
 */
import {
  ApexBrain,
  APEX_ORGAN_KEYS,
  APEX_PLAN_NAMES,
  type ApexOrganKey,
  type ApexPercept,
  type ApexScale,
} from './apex-brain';
import { rarityReport, type RarityReport } from './apex-rarity';

/** The "alien / offworld" organs (number-theory, topology, multi-time, quantum) — non-Earth channels. */
export const ALIEN_ORGANS: readonly ApexOrganKey[] = [
  'loom',
  'klein',
  'wraith',
  'tunnel',
  'quantum',
];
/** The "earthly" organs (acoustic, mechanical, biological) — the Earth-neurology-shaped channels. */
export const EARTHLY_ORGANS: readonly ApexOrganKey[] = [
  'drum',
  'hive',
  'hydra',
  'necro',
  'thermo',
  'ouroboros',
];

/** A compact, quantised record of one cognitive beat — the unit the behaviour hash + distance read. */
interface BeatRecord {
  plan: number;
  vitality: number;
  agony: number;
  transcendence: number;
  mx: number;
  my: number;
  mz: number;
}

const PLAN_INDEX = new Map(APEX_PLAN_NAMES.map((n, i) => [n, i]));
const Q = (v: number): number => Math.round(v * 1000);

/**
 * Run `percepts` through a fresh brain (seed + scale + ablation set) and return the quantised thought
 * trajectory. Deterministic in `(seed, ablations, scale, percepts)`.
 */
export function runTrajectory(
  seed: number,
  percepts: readonly ApexPercept[],
  ablations?: ReadonlySet<ApexOrganKey>,
  scale?: ApexScale,
): BeatRecord[] {
  const brain = new ApexBrain(seed, { ablations, scale });
  const out: BeatRecord[] = [];
  for (const p of percepts) {
    const t = brain.tick(p);
    out.push({
      plan: PLAN_INDEX.get(t.plan) ?? -1,
      vitality: t.vitality,
      agony: t.agony,
      transcendence: t.transcendence,
      mx: t.motor.x,
      my: t.motor.y,
      mz: t.motor.z,
    });
  }
  return out;
}

/** FNV-1a 32-bit hash of a string (deterministic, allocation-light). */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable hash of a behaviour trajectory — the determinism fingerprint (same seed ⇒ same hash). */
export function hashTrajectory(traj: readonly BeatRecord[]): string {
  let acc = '';
  for (const b of traj) {
    acc += `${b.plan},${Q(b.vitality)},${Q(b.agony)},${Q(b.transcendence)},${Q(b.mx)},${Q(b.my)},${Q(b.mz)};`;
  }
  return fnv1a(acc).toString(16).padStart(8, '0');
}

/**
 * Mean per-beat behavioural distance between two equal-length trajectories: the average of the L1
 * gap over the numeric channels plus a plan-mismatch indicator. 0 ⇔ identical behaviour. Used to
 * measure how much an ablation moved the creature.
 */
export function behaviorDistance(a: readonly BeatRecord[], b: readonly BeatRecord[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    sum +=
      (x.plan === y.plan ? 0 : 1) +
      Math.abs(x.vitality - y.vitality) +
      Math.abs(x.agony - y.agony) +
      Math.abs(x.transcendence - y.transcendence) +
      Math.abs(x.mx - y.mx) +
      Math.abs(x.my - y.my) +
      Math.abs(x.mz - y.mz);
  }
  return sum / n;
}

/** The kill-test result for one organ. */
export interface OrganAblation {
  organ: ApexOrganKey;
  /** Behavioural distance from the all-organs-on baseline. */
  distance: number;
  /** True when removing the organ measurably changes behaviour (distance > tolerance). */
  loadBearing: boolean;
  /** Determinism hash of the ablated run (its own runs reproduce). */
  hash: string;
}

/** The full scientific report. */
export interface HarnessReport {
  seed: number;
  beats: number;
  /** Determinism fingerprint of the full (no-ablation) run. */
  determinismHash: string;
  /** Per-organ kill tests. */
  ablations: OrganAblation[];
  /** How many of the eleven organs are load-bearing (target: all 11). */
  loadBearingCount: number;
  /** True ⇔ every organ is load-bearing — no decoration. */
  allLoadBearing: boolean;
  /** Offworld dependence proxy in [0,1]: behaviour's reliance on alien vs earthly organs. */
  offworldDependence: number;
  /** The 1-of-1-by-combination rarity matrix (design-comparison claim, doctrine Level 3). */
  rarity: RarityReport;
}

/** Distance tolerance above which an organ counts as load-bearing (quantised channels ⇒ tiny floor). */
const LOAD_TOL = 1e-6;

/**
 * Run the full ablation study: the all-on baseline, then each organ removed in turn, plus the
 * offworld-dependence proxy. Deterministic. O(organs × beats).
 */
export function ablationStudy(
  seed: number,
  percepts: readonly ApexPercept[],
  scale?: ApexScale,
): HarnessReport {
  const baseline = runTrajectory(seed, percepts, undefined, scale);
  const ablations: OrganAblation[] = [];
  for (const organ of APEX_ORGAN_KEYS) {
    const traj = runTrajectory(seed, percepts, new Set([organ]), scale);
    const distance = behaviorDistance(baseline, traj);
    ablations.push({
      organ,
      distance,
      loadBearing: distance > LOAD_TOL,
      hash: hashTrajectory(traj),
    });
  }
  const loadBearingCount = ablations.filter((a) => a.loadBearing).length;

  // Offworld dependence: distance when the alien organs are removed vs the earthly ones removed.
  const alienOff = behaviorDistance(
    baseline,
    runTrajectory(seed, percepts, new Set(ALIEN_ORGANS), scale),
  );
  const earthOff = behaviorDistance(
    baseline,
    runTrajectory(seed, percepts, new Set(EARTHLY_ORGANS), scale),
  );
  const denom = alienOff + earthOff;
  const offworldDependence = denom > 0 ? alienOff / denom : 0;

  return {
    seed,
    beats: percepts.length,
    determinismHash: hashTrajectory(baseline),
    ablations,
    loadBearingCount,
    allLoadBearing: loadBearingCount === APEX_ORGAN_KEYS.length,
    offworldDependence: Math.round(offworldDependence * 1e4) / 1e4,
    rarity: rarityReport(),
  };
}

/**
 * A standard deterministic percept battery for the harness: `beats` beats of varied threat / chaos /
 * novelty with a level ramp toward the Sim-3 transcendence threshold. No randomness — pure functions
 * of the beat index.
 */
export function standardBattery(beats = 96): ApexPercept[] {
  return Array.from({ length: beats }, (_v, i) => ({
    threat: 0.5 + 0.45 * Math.sin(i * 0.27),
    energy: 0.5 + 0.4 * Math.cos(i * 0.13),
    chaos: 0.5 + 0.45 * Math.cos(i * 0.19),
    novelty: 0.5 + 0.45 * Math.sin(i * 0.11),
    level: Math.min(1000, i * 11),
  }));
}

/** Convenience: the full report for the canonical seed + standard battery. */
export function harnessReport(seed: number, beats = 96, scale?: ApexScale): HarnessReport {
  return ablationStudy(seed, standardBattery(beats), scale);
}
