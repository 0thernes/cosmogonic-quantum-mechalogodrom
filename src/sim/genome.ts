/**
 * Digital genome (CONTRACTS V9 — A-Life genetics, after Creatures/1996 + genetic algorithms).
 *
 * A genome is a fixed-length `Float32Array` of genes that decodes into (a) a small set of bounded
 * TRAITS (speed, vision, sociality, aggression, metabolism, lifespan, a sentience-tier propensity,
 * hue, fertility, curiosity) and (b) the WEIGHTS of a tiny {@link TinyMLP} "brain". Reproduction is
 * seeded crossover + mutation of two parent genomes, so offspring inherit and vary their parents'
 * body AND mind — the substrate for lineage, sentience ascension, and faction drift.
 *
 * Determinism: every draw goes through an injected {@link Rng}; there is no clock/global-random.
 * Allocation: `crossover`/`mutate` produce a new child array — that is a reproduction EVENT (a few
 * per second), never a per-frame path, so it respects the allocation-free-hot-path rule. Decoding
 * and {@link geneDistance} are pure and allocation-free. Leaf module: depends only on `Rng` and the
 * leaf {@link TinyMLP}, so it stays acyclic + unit-testable.
 */
import type { Rng } from '../math/rng';
import { TinyMLP } from './ai/brains';

/** Brain shape every organism carries: 6 senses → 6 hidden → 4 drives. */
export const BRAIN_IN = 6;
export const BRAIN_HIDDEN = 6;
export const BRAIN_OUT = 4;

/** Count of brain-weight genes (the second region of the genome). */
export const BRAIN_GENES = TinyMLP.weightCount(BRAIN_IN, BRAIN_HIDDEN, BRAIN_OUT);

/**
 * Trait-gene layout (the first region). Order is the contract — never reorder, or a saved/parent
 * genome would remap. Each trait gene is stored in [0,1] and decoded to a meaningful range.
 */
export const TRAIT = {
  speed: 0,
  vision: 1,
  social: 2,
  aggression: 3,
  metabolism: 4,
  lifespan: 5,
  sentience: 6,
  hue: 7,
  fertility: 8,
  curiosity: 9,
} as const;

/** Number of trait genes. */
export const TRAIT_GENES = Object.keys(TRAIT).length;

/** Total genome length: trait region + brain region. */
export const GENOME_LEN = TRAIT_GENES + BRAIN_GENES;

/** Decoded, range-mapped phenotype traits. */
export interface Traits {
  /** Movement speed multiplier, ~[0.4, 1.6]. */
  speed: number;
  /** Neighbor-perception radius scale, ~[0.5, 1.5]. */
  vision: number;
  /** Cohesion / gregariousness, [0, 1]. */
  social: number;
  /** Predatory/hostile drive, [0, 1]. */
  aggression: number;
  /** Energy burn rate, ~[0.6, 1.4]. */
  metabolism: number;
  /** Base lifespan in frames, ~[300, 1500]. */
  lifespan: number;
  /** Sentience-tier propensity 0..4 (reflex→steering→utility→planning→reflective). */
  sentience: number;
  /** Identity hue, [0, 1). */
  hue: number;
  /** Reproduction propensity, [0, 1]. */
  fertility: number;
  /** Exploration vs exploitation, [0, 1]. */
  curiosity: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A fresh seeded random genome: traits uniform in [0,1], brain weights uniform in [-1,1]. */
export function randomGenome(rng: Rng): Float32Array {
  const g = new Float32Array(GENOME_LEN);
  for (let i = 0; i < TRAIT_GENES; i++) g[i] = rng();
  for (let i = TRAIT_GENES; i < GENOME_LEN; i++) g[i] = rng() * 2 - 1;
  return g;
}

/**
 * Uniform crossover: each gene of the child is copied from parent `a` or `b` with equal seeded
 * probability. Returns a new child array of length {@link GENOME_LEN}. Parents are not mutated.
 */
export function crossover(a: Float32Array, b: Float32Array, rng: Rng): Float32Array {
  const child = new Float32Array(GENOME_LEN);
  for (let i = 0; i < GENOME_LEN; i++) child[i] = (rng() < 0.5 ? a[i] : b[i]) ?? 0;
  return child;
}

/**
 * Seeded point mutation IN PLACE: each gene mutates with probability `rate`, perturbed by
 * `±scale`, then re-clamped to its region's range (traits [0,1], brain [-1,1]). `rate = 0` leaves
 * the genome untouched.
 */
export function mutate(g: Float32Array, rng: Rng, rate = 0.12, scale = 0.2): void {
  for (let i = 0; i < g.length; i++) {
    if (rng() >= rate) continue;
    const delta = (rng() * 2 - 1) * scale;
    const v = (g[i] ?? 0) + delta;
    g[i] = i < TRAIT_GENES ? clamp01(v) : v < -1 ? -1 : v > 1 ? 1 : v;
  }
}

/**
 * Breed two parents: crossover then mutate the child. Returns the child genome.
 *
 * Heredity is LIVE in the sim via {@link recombine} (the arbitrary-length variant), which the
 * `PrimordialSoup` rebirth path uses to breed reborn strains on the soup's own seeded sub-stream
 * (ADR-0009, Accepted) — re-seeding a dead slot from the genome still in that slot (the corpse's)
 * crossed with ONE living parent picked elsewhere. This used to read "from two living parents",
 * which the code never did: `pa = i` is the dead slot itself (primordial-soup.ts, inside the
 * `!alive[i]` branch). Real heredity, but dead x living — do not cite it as live sexual selection.
 *
 * These fixed-`GENOME_LEN` `breed`/`crossover` exports remain reserved for the planned entity/NHI
 * spawn-path wiring (which needs a dedicated `genomeRng` + a deliberate golden re-baseline) — do NOT
 * delete them as "dead code" without reading ADR-0009. Being reserved, they are NOT grounding for a
 * reproduction capability score: nothing in src/ calls `breed`/`crossover`, and `decodeTraits` — the
 * sole reader of the 10-trait phenotype, fertility included — has no caller either. The heredity
 * that IS live on the base population is entities.ts `breedTraits` (:466, called :557).
 */
export function breed(a: Float32Array, b: Float32Array, rng: Rng, rate?: number): Float32Array {
  const child = crossover(a, b, rng);
  mutate(child, rng, rate);
  return child;
}

/**
 * Generic seeded recombination for arbitrary-length gene vectors (e.g. the primordial
 * soup's `.esk`-derived strain genomes, which are NOT the fixed organism `GENOME_LEN`).
 * Uniform crossover of two equal-length parents followed by in-place point mutation;
 * returns a new child array. All randomness flows through the injected {@link Rng}, so
 * offspring are deterministic from the seed. This is the genuine heredity primitive the
 * soup uses to inherit-and-vary parent DNA instead of re-rolling fresh genomes.
 */
export function recombine(
  a: Float32Array,
  b: Float32Array,
  rng: Rng,
  rate = 0.12,
  scale = 0.2,
): Float32Array {
  const n = Math.min(a.length, b.length);
  const child = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = (rng() < 0.5 ? a[i] : b[i]) ?? 0;
    if (rng() < rate) v += (rng() * 2 - 1) * scale;
    child[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return child;
}

/** Decode the trait region into range-mapped {@link Traits}. Pure, allocation = one small object. */
export function decodeTraits(g: Float32Array): Traits {
  const t = (i: number): number => clamp01(g[i] ?? 0);
  return {
    speed: lerp(0.4, 1.6, t(TRAIT.speed)),
    vision: lerp(0.5, 1.5, t(TRAIT.vision)),
    social: t(TRAIT.social),
    aggression: t(TRAIT.aggression),
    metabolism: lerp(0.6, 1.4, t(TRAIT.metabolism)),
    lifespan: lerp(300, 1500, t(TRAIT.lifespan)),
    sentience: Math.min(4, Math.floor(t(TRAIT.sentience) * 5)),
    hue: Math.min(0.999, t(TRAIT.hue)),
    fertility: t(TRAIT.fertility),
    curiosity: t(TRAIT.curiosity),
  };
}

/** A live view (no copy) of the brain-weight region, ready to hand to {@link TinyMLP}. O(1). */
export function brainWeightsView(g: Float32Array): Float32Array {
  return g.subarray(TRAIT_GENES);
}

/** Build a {@link TinyMLP} that shares this genome's brain weights (no copy). */
export function brainOf(g: Float32Array): TinyMLP {
  return new TinyMLP(BRAIN_IN, BRAIN_HIDDEN, BRAIN_OUT, brainWeightsView(g));
}

/**
 * Mean absolute gene difference between two genomes in [0, ~2] — a kinship/similarity metric
 * (0 = identical twins). Used to weight tribe/relation affinity. O(GENOME_LEN), allocation-free.
 */
export function geneDistance(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return s / n;
}
