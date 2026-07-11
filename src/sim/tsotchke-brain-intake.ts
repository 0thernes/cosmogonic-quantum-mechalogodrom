/**
 * TSOTCHKE BRAIN INTAKE — the full-corpus intake for the BRAINS.
 *
 * The corpus was already blended into the world/soup/petri side (registry `fullTsotchkeBiologicsCatalysis`),
 * but the brain-facing pulse ({@link ./tsotchke-facade}.corpusPulse / getTsotchkeBias) only drew from the
 * 8 archetype families + one indexed repo — so a mind saw a NARROW slice of the corpus. This closes that
 * gap: every WIRED scientific Tsotchke substrate (all `wiring>0` entries except org-meta) contributes to a
 * compact brain-influence vector, each routed through a dedicated bounded local primitive (Eshkol AD,
 * Moonlab tensor contraction, libirrep SU(2), QGT proxy, quake factor, tensorcore facade, ULG field,
 * classical/state-vector diagnostics) or, for substrates whose primitive needs heavy state, through the
 * registry's per-repo mapping (`corpusBeatForArchon` + hue + wiring). Fenced repos (gpt2-basic,
 * llm-arbitrator, SolanaQuantumFlux, OBLITERATUS; `wiring===0`) and org-meta (`.github`) are excluded by
 * design. Facades and adapted models are not described as direct upstream ports or physical experiments.
 *
 * The point is not prose but MEASUREMENT: {@link corpusBrainAblation} removes each repo in turn and shows
 * its contribution is load-bearing (distance > 0) — currently all 17 represented external entries,
 * with four fences and one metadata entry intentionally inert. This mirrors the APEX organ ablation
 * harness. Pure and deterministic (no `Math.random`, no `Date.now`).
 */
import {
  getTsotchkeRepoByIndex,
  TSOTCHKE_REPO_COUNT,
  type TsotchkeRepoEntry,
  type TsotchkeRepoSlug,
} from './tsotchke-registry';
import { eshkolADGradient } from './eshkol-bridge';
import { moonlabTensorContract } from './moonlab-tensor';
import { su2Dimension, libirrepSymmetry } from './irrep-symmetry';
import { qgeAlivenessProxy } from './quantum-quake-physics';
import { classicalEntropyGap } from './classical-contrast';
import { quakeQgeFactor } from './qge-physics';
import { tensorcoreMorphBias } from './tensorcore-facade';
import { ulgFieldSample } from './ulg-bridge';
import {
  storeHebbian,
  energy as hopfieldEnergy,
  overlap as hopfieldOverlap,
} from '../math/hopfield';
import { grayScottResidual, pinnLoss } from './pinn-residual';
import { pathWeight } from './pimc-paths';
import { asteroidEnergy, asteroidSpawn, asteroidStep, asteroidThrust } from './asteroids-physics';
import { logoMorphScalar, type TurtleState } from './logo-turtle';
import { eskCatalogVitality } from './homebrew-eshkol';
import { perceptronTag } from './perceptron-baseline';
import { TSOTCHKE_HARVEST } from './generated-tsotchke-seeds';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Squash any real value into (0,1) so every substrate primitive contributes a bounded, finite term. */
const squash = (v: number): number => (Number.isFinite(v) ? 0.5 + 0.5 * Math.tanh(v) : 0.5);

// Fixed, module-owned substrate scratch. The shared field is single-threaded; resetting these values on
// every call keeps the intake deterministic and avoids repository-specific heap churn.
const HOP_PATTERNS = [
  [1, 1, -1, -1],
  [1, -1, 1, -1],
] as const;
const HOP_NET = storeHebbian(HOP_PATTERNS);
const HOP_STATE = [1, 1, -1, -1];
const PIMC_PATH = new Float32Array(6);
const PERC_WEIGHTS = new Float32Array([0.7, -0.35, 0.5, 0.2]);
const PERC_INPUT = new Float32Array(4);
const LOGO_TURTLE: TurtleState = { x: 0, y: 0, heading: 0, penDown: true };
const harmonicPotential = (x: number): number => 0.5 * x * x;

/** True ⇔ this repo is a WIRED scientific substrate that should feed a brain (not fenced, not org-meta). */
export function isBrainWired(repo: TsotchkeRepoEntry): boolean {
  return repo.wiring > 0 && repo.substrate !== 'meta';
}

/**
 * One repo's local substrate contribution to the brain, routed through its declared primitive or facade.
 * Deterministic in `(repo, seed, frame, idx)`; bounded to (0,1) by {@link squash}.
 */
export function substrateScalar(
  repo: TsotchkeRepoEntry,
  seed: number,
  frame: number,
  idx: number,
): number {
  const s = ((seed >>> 0) % 100000) / 100000; // [0,1)
  const f = frame;
  let raw: number;
  switch (repo.substrate) {
    case 'consciousness-engine': // Eshkol — automatic-differentiation gradient
      raw = eshkolADGradient((x) => Math.sin(x * (1 + repo.hue)), s * 6.2832 + f * 0.01);
      break;
    case 'clifford-tensor': {
      // Moonlab — tensor contraction over a seed-derived vector
      const v = [s, repo.hue, (s + repo.hue) % 1, ((f % 7) + 1) / 7];
      raw = moonlabTensorContract(v, v, 4);
      break;
    }
    case 'metal-sim': // tensorcore — deterministic local GEMM morph-bias facade
      raw = tensorcoreMorphBias(4 + repo.hue * 12, 1 + (idx % 8));
      break;
    case 'equivariant-sym': // libirrep — SU(2) dimension + symmetry mode count
      raw = su2Dimension((idx % 5) * 0.5) + libirrepSymmetry(2 + (idx % 4), 8) * 0.01;
      break;
    case 'quantum-geometry': // QGT — bounded aliveness proxy over curvature/phase
      raw = qgeAlivenessProxy(s, f * 0.017 + repo.hue * 6.2832);
      break;
    case 'quake-aliveness': // quantum-quake — local QGE hybrid factor
      raw = quakeQgeFactor(0.5 + 0.4 * Math.sin(f * 0.05 + idx), 0.5 + repo.hue * 0.5);
      break;
    case 'browser-hybrid': // ULG — deterministic universal-law field sample
      raw = ulgFieldSample(s * 4, repo.hue * 4, idx % 5, f);
      break;
    case 'qrng-entropy': // quantum_rng
      // Deterministic two-path interference diagnostic. The shared organism field separately samples
      // the bounded state-vector model; this scalar does not pretend to be physical entropy.
      raw = Math.sin((s + repo.hue) * Math.PI + f * 0.013) ** 2;
      break;
    case 'classical-rng': // classical_rng
      raw = classicalEntropyGap((seed ^ (idx * 0x9e37)) >>> 0, 16);
      break;
    case 'qrng-api': // Quantum-RNG-API: harvested API contract around the deterministic model
      raw = classicalEntropyGap((seed ^ (idx * 0x45d9)) >>> 0, 12) * 0.75 + repo.hue * 0.25;
      break;
    case 'classical-baseline': // simple_mnist learner/classifier baseline
      PERC_INPUT[0] = s;
      PERC_INPUT[1] = repo.hue;
      PERC_INPUT[2] = ((f % 31) + 0.5) / 31;
      PERC_INPUT[3] = ((seed >>> 8) & 0xff) / 255;
      raw = perceptronTag(PERC_WEIGHTS, PERC_INPUT, PERC_INPUT.length);
      break;
    case 'hopfield-spin': {
      for (let k = 0; k < HOP_STATE.length; k++) {
        HOP_STATE[k] = Math.sin((k + 1) * (s * 3.1 + f * 0.017 + repo.hue)) >= 0 ? 1 : -1;
      }
      const e = hopfieldEnergy(HOP_NET, HOP_STATE);
      const recall = Math.max(
        Math.abs(hopfieldOverlap(HOP_STATE, HOP_PATTERNS[0])),
        Math.abs(hopfieldOverlap(HOP_STATE, HOP_PATTERNS[1])),
      );
      raw = recall - e * 0.1;
      break;
    }
    case 'pinn-physics': {
      const u = 0.25 + s * 0.65;
      const v = 0.15 + repo.hue * 0.55;
      const lapPhase = f * 0.021 + idx;
      const residual = grayScottResidual(
        u,
        v,
        u + Math.sin(lapPhase) * 0.04,
        u + Math.cos(lapPhase) * 0.04,
        u - Math.sin(lapPhase) * 0.03,
        u - Math.cos(lapPhase) * 0.03,
        0.035 + s * 0.02,
        0.055 + repo.hue * 0.015,
      );
      raw = pinnLoss(residual);
      break;
    }
    case 'path-integral':
      for (let k = 0; k < PIMC_PATH.length; k++) {
        PIMC_PATH[k] = Math.sin(s * 5.1 + repo.hue * 3.7 + f * 0.009 + k * 0.63) * 0.7;
      }
      raw = pathWeight(PIMC_PATH, 0.6 + repo.hue, harmonicPotential);
      break;
    case 'game-physics': {
      const body = asteroidSpawn((seed ^ Math.imul(idx + 1, 0x9e37_79b1)) >>> 0);
      asteroidThrust(body, 0.05 + s * 0.08);
      asteroidStep(body, 0.2 + ((f % 7) + 1) * 0.03);
      raw = asteroidEnergy(body);
      break;
    }
    case 'logo-turtle':
      LOGO_TURTLE.x = 0;
      LOGO_TURTLE.y = 0;
      LOGO_TURTLE.heading = ((((seed ^ idx) >>> 0) % 997) / 997) * Math.PI * 2;
      LOGO_TURTLE.penDown = true;
      raw = logoMorphScalar(LOGO_TURTLE, f, 3 + (idx % 9));
      break;
    case 'toolchain':
      raw =
        eskCatalogVitality(TSOTCHKE_HARVEST.eskCount, f) +
        ((((seed ^ idx) >>> 0) % 997) / 997) * 0.1;
      break;
    case 'fenced-llm':
    case 'fenced-arbitrator':
    case 'fenced-chain':
    case 'fenced-refusal-toolkit':
    case 'meta':
    case 'digital-biologic':
      return 0;
    default:
      // Every integrated external substrate above has an explicit primitive. A newly added substrate
      // must stay neutral until its owner adds a reviewed case and a downstream counterfactual test.
      return 0;
  }
  return squash(raw);
}

/** The brain-facing corpus intake: four aggregate channels + an overall drive, over ALL wired substrates. */
export interface CorpusBrainVector {
  /** Four aggregate channels (repo `idx % 4`), each a mean over its contributing wired repos in [0,1]. */
  channels: [number, number, number, number];
  /** Overall corpus drive into the brain in [0,1] (mean of all wired contributions). */
  drive: number;
  /** How many wired scientific repos contributed (fenced + org-meta excluded, minus ablations). */
  repoCount: number;
}

/** Caller-owned output representation; reused so the shared field does not allocate its result vector. */
export interface MutableCorpusBrainVector {
  channels: Float32Array;
  drive: number;
  repoCount: number;
}

/** Fill a caller-owned vector. `out.channels.length` must be at least four. O(external repos). */
export function corpusBrainVectorInto(
  out: MutableCorpusBrainVector,
  seed: number,
  frame: number,
  ablated?: ReadonlySet<TsotchkeRepoSlug>,
): MutableCorpusBrainVector {
  if (out.channels.length < 4) throw new RangeError('corpus brain output requires four channels');
  const channels = out.channels;
  channels.fill(0, 0, 4);
  let count0 = 0;
  let count1 = 0;
  let count2 = 0;
  let count3 = 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
    const repo = getTsotchkeRepoByIndex(i);
    if (!isBrainWired(repo) || ablated?.has(repo.slug)) continue;
    const contribution = repo.wiring * substrateScalar(repo, seed, frame, i);
    const ch = i % 4;
    channels[ch] = (channels[ch] ?? 0) + contribution;
    if (ch === 0) count0++;
    else if (ch === 1) count1++;
    else if (ch === 2) count2++;
    else count3++;
    sum += contribution;
    count++;
  }
  channels[0] = count0 > 0 ? clamp01((channels[0] ?? 0) / count0) : 0;
  channels[1] = count1 > 0 ? clamp01((channels[1] ?? 0) / count1) : 0;
  channels[2] = count2 > 0 ? clamp01((channels[2] ?? 0) / count2) : 0;
  channels[3] = count3 > 0 ? clamp01((channels[3] ?? 0) / count3) : 0;
  out.drive = count > 0 ? clamp01(sum / count) : 0;
  out.repoCount = count;
  return out;
}

/**
 * Blend EVERY wired scientific Tsotchke substrate into a compact brain-influence vector. Deterministic in
 * `(seed, frame, ablated)`. `ablated` suppresses named repos (the kill-test set). O(repos).
 */
export function corpusBrainVector(
  seed: number,
  frame: number,
  ablated?: ReadonlySet<TsotchkeRepoSlug>,
): CorpusBrainVector {
  const mutable: MutableCorpusBrainVector = {
    channels: new Float32Array(4),
    drive: 0,
    repoCount: 0,
  };
  corpusBrainVectorInto(mutable, seed, frame, ablated);
  return {
    channels: [
      mutable.channels[0] ?? 0,
      mutable.channels[1] ?? 0,
      mutable.channels[2] ?? 0,
      mutable.channels[3] ?? 0,
    ],
    drive: mutable.drive,
    repoCount: mutable.repoCount,
  };
}

/**
 * A single [0,1] scalar summarising the full-corpus brain drive — the value folded into
 * {@link ./tsotchke-facade}.corpusPulse so a mind's plan bias genuinely moves with the whole corpus.
 */
export function corpusBrainScalar(
  seed: number,
  frame: number,
  ablated?: ReadonlySet<TsotchkeRepoSlug>,
): number {
  const v = corpusBrainVector(seed, frame, ablated);
  return clamp01((v.channels[0] + v.channels[1] + v.channels[2] + v.channels[3]) / 4);
}

/** L1 distance between two brain vectors (channels + drive) — how far an ablation moved the intake. */
export function corpusBrainDistance(a: CorpusBrainVector, b: CorpusBrainVector): number {
  return (
    Math.abs(a.channels[0] - b.channels[0]) +
    Math.abs(a.channels[1] - b.channels[1]) +
    Math.abs(a.channels[2] - b.channels[2]) +
    Math.abs(a.channels[3] - b.channels[3]) +
    Math.abs(a.drive - b.drive)
  );
}

/** One repo's kill-test result against the full-corpus brain intake. */
export interface RepoBrainAblation {
  slug: TsotchkeRepoSlug;
  substrate: string;
  distance: number;
  loadBearing: boolean;
}

/** The full corpus→brain wiring report — the measured proof that every wired repo feeds the brain. */
export interface CorpusBrainReport {
  seed: number;
  frame: number;
  /** Number of wired scientific substrates feeding the brain (fenced + org-meta excluded). */
  wiredRepoCount: number;
  ablations: RepoBrainAblation[];
  /** How many wired repos measurably move the brain intake (target: all of them). */
  loadBearingCount: number;
  /** True ⇔ every wired repo is load-bearing on the brain — no decoration. */
  allLoadBearing: boolean;
}

const LOAD_TOL = 1e-9;

/**
 * Ablate each wired repo in turn and measure how far the brain intake moves — the honest form of
 * "all integrated external repos measurably feed the brain" (currently 17 of 21 non-meta entries).
 * Deterministic. O(repos²).
 */
export function corpusBrainAblation(seed: number, frame: number): CorpusBrainReport {
  const baseline = corpusBrainVector(seed, frame);
  const ablations: RepoBrainAblation[] = [];
  for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
    const repo = getTsotchkeRepoByIndex(i);
    if (!isBrainWired(repo)) continue;
    const distance = corpusBrainDistance(
      baseline,
      corpusBrainVector(seed, frame, new Set([repo.slug])),
    );
    ablations.push({
      slug: repo.slug,
      substrate: repo.substrate,
      distance,
      loadBearing: distance > LOAD_TOL,
    });
  }
  const loadBearingCount = ablations.filter((a) => a.loadBearing).length;
  return {
    seed,
    frame,
    wiredRepoCount: ablations.length,
    ablations,
    loadBearingCount,
    allLoadBearing: loadBearingCount === ablations.length && ablations.length > 0,
  };
}
