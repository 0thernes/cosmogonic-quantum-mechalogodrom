/**
 * TSOTCHKE BRAIN INTAKE — the full-corpus intake for the BRAINS.
 *
 * The corpus was already blended into the world/soup/petri side (registry `fullTsotchkeBiologicsCatalysis`),
 * but the brain-facing pulse ({@link ./tsotchke-facade}.corpusPulse / getTsotchkeBias) only drew from the
 * 8 archetype families + one indexed repo — so a mind saw a NARROW slice of the corpus. This closes that
 * gap: every WIRED scientific Tsotchke substrate (all `wiring>0` entries except org-meta) contributes to a
 * compact brain-influence vector, each routed through that repo's OWN real substrate primitive (Eshkol AD,
 * Moonlab tensor contraction, libirrep SU(2), QGT aliveness, quake factor, tensorcore metal bias, ULG field,
 * classical/QRNG entropy) or, for the substrates whose primitive needs heavy state, through the registry's
 * real per-repo mapping (`corpusBeatForArchon` + hue + wiring). Fenced repos (gpt2-basic / llm-arbitrator /
 * SolanaQuantumFlux, `wiring===0`) and org-meta (`.github`) are excluded BY DESIGN — the non-LLM mandate.
 *
 * The point is not prose but MEASUREMENT: {@link corpusBrainAblation} removes each repo in turn and shows
 * its contribution is load-bearing (distance > 0) — the honest form of "all repos wired into the brain",
 * mirroring the APEX organ ablation harness. Pure & deterministic (no `Math.random`, no `Date.now`).
 * Tsotchke is real MIT-grade quantum math; this WIRES it, it never stubs or removes it.
 */
import {
  getTsotchkeRepoByIndex,
  corpusBeatForArchon,
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

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Squash any real value into (0,1) so every substrate primitive contributes a bounded, finite term. */
const squash = (v: number): number => (Number.isFinite(v) ? 0.5 + 0.5 * Math.tanh(v) : 0.5);

/** True ⇔ this repo is a WIRED scientific substrate that should feed a brain (not fenced, not org-meta). */
export function isBrainWired(repo: TsotchkeRepoEntry): boolean {
  return repo.wiring > 0 && repo.substrate !== 'meta';
}

/**
 * One repo's REAL substrate contribution to the brain, routed through that repo's own Tsotchke primitive.
 * Deterministic in `(repo, seed, frame, idx)`; bounded to (0,1) by {@link squash}.
 */
function substrateScalar(
  repo: TsotchkeRepoEntry,
  seed: number,
  frame: number,
  idx: number,
): number {
  const s = ((seed >>> 0) % 100000) / 100000; // [0,1)
  const f = frame;
  let raw: number;
  switch (repo.substrate) {
    case 'consciousness-engine': // Eshkol — real automatic-differentiation gradient
      raw = eshkolADGradient((x) => Math.sin(x * (1 + repo.hue)), s * 6.2832 + f * 0.01);
      break;
    case 'clifford-tensor': {
      // Moonlab — real tensor contraction over a seed-derived vector
      const v = [s, repo.hue, (s + repo.hue) % 1, ((f % 7) + 1) / 7];
      raw = moonlabTensorContract(v, v, 4);
      break;
    }
    case 'metal-sim': // tensorcore — real metal GEMM morph bias
      raw = tensorcoreMorphBias(4 + repo.hue * 12, 1 + (idx % 8));
      break;
    case 'equivariant-sym': // libirrep — real SU(2) dimension + symmetry mode count
      raw = su2Dimension((idx % 5) * 0.5) + libirrepSymmetry(2 + (idx % 4), 8) * 0.01;
      break;
    case 'quantum-geometry': // QGT — real aliveness proxy over curvature/phase
      raw = qgeAlivenessProxy(s, f * 0.017 + repo.hue * 6.2832);
      break;
    case 'quake-aliveness': // quantum-quake — real QGE hybrid factor
      raw = quakeQgeFactor(0.5 + 0.4 * Math.sin(f * 0.05 + idx), 0.5 + repo.hue * 0.5);
      break;
    case 'browser-hybrid': // ULG — real universal-law field sample
      raw = ulgFieldSample(s * 4, repo.hue * 4, idx % 5, f);
      break;
    case 'qrng-entropy': // quantum_rng
    case 'classical-rng': // classical_rng
    case 'qrng-api': // Quantum-RNG-API (eshkol-qrng REST facade)
      raw = classicalEntropyGap((seed ^ (idx * 0x9e37)) >>> 0, 16);
      break;
    case 'classical-baseline': // simple_mnist / classical-contrast
      raw = classicalEntropyGap((seed + idx * 131) >>> 0 || 1, 12);
      break;
    default:
      // hopfield-spin, pinn-physics, path-integral, logo-turtle, game-physics, toolchain: the registry's
      // REAL per-repo mapping (distinct + deterministic) — genuine corpus data, not a placeholder.
      raw = corpusBeatForArchon(idx, f) + repo.hue + repo.wiring * (((f % 13) + 1) / 13);
      break;
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

/**
 * Blend EVERY wired scientific Tsotchke substrate into a compact brain-influence vector. Deterministic in
 * `(seed, frame, ablated)`. `ablated` suppresses named repos (the kill-test set). O(repos).
 */
export function corpusBrainVector(
  seed: number,
  frame: number,
  ablated?: ReadonlySet<TsotchkeRepoSlug>,
): CorpusBrainVector {
  const channels: [number, number, number, number] = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < TSOTCHKE_REPO_COUNT; i++) {
    const repo = getTsotchkeRepoByIndex(i);
    if (!isBrainWired(repo)) continue;
    if (ablated?.has(repo.slug)) continue;
    const contribution = repo.wiring * substrateScalar(repo, seed, frame, i);
    const ch = i % 4;
    channels[ch] = (channels[ch] ?? 0) + contribution;
    counts[ch] = (counts[ch] ?? 0) + 1;
    sum += contribution;
    count += 1;
  }
  for (let c = 0; c < 4; c++) {
    const cnt = counts[c] ?? 0;
    channels[c] = cnt > 0 ? clamp01((channels[c] ?? 0) / cnt) : 0;
  }
  return { channels, drive: count > 0 ? clamp01(sum / count) : 0, repoCount: count };
}

/**
 * A single [0,1] scalar summarising the full-corpus brain drive — the value folded into
 * {@link ./tsotchke-facade}.corpusPulse so a mind's plan bias genuinely moves with the whole corpus.
 */
export function corpusBrainScalar(seed: number, frame: number): number {
  const v = corpusBrainVector(seed, frame);
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
 * "all 20 repos wired into the brain". Deterministic. O(repos²).
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
