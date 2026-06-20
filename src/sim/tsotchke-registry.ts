/**
 * TSOTCHKE CORPUS REGISTRY — deterministic map of every GitHub repo (user + org) to a
 * digital-biologic substrate slot. NOT LLM/tokenizer territory — each entry names the
 * math/physics/sim primitive Cosmogonic ports or facades from that corpus mirror.
 *
 * Sources:
 *   github.com/tsotchke (15 repos)
 *   github.com/orgs/Tsotchke-Corporation (6 repos)
 *
 * O(1) lookup by slug or index. No network, no allocation after module init.
 */

export const TSOTCHKE_USER_REPOS = [
  'eshkol',
  'moonlab',
  'tensorcore',
  'libirrep',
  'spin_based_neural_network',
  'quantum_geometric_tensor',
  'quantum_rng',
  'gpt2-basic',
  'homebrew-eshkol',
  'llm-arbitrator',
  'simple_mnist',
  'asteroids',
  'classical_rng',
  'PINN',
  'PIMC',
] as const;

export const TSOTCHKE_ORG_REPOS = [
  'ulg',
  'logo-lab',
  'quantum-quake',
  'SolanaQuantumFlux',
  'Quantum-RNG-API',
  '.github',
] as const;

export type TsotchkeUserRepo = (typeof TSOTCHKE_USER_REPOS)[number];
export type TsotchkeOrgRepo = (typeof TSOTCHKE_ORG_REPOS)[number];
export type TsotchkeRepoSlug = TsotchkeUserRepo | TsotchkeOrgRepo;

/** How each repo feeds the primordial Petri dish (consciousness substrate, not chat). */
export type SubstrateKind =
  | 'consciousness-engine'
  | 'clifford-tensor'
  | 'metal-sim'
  | 'equivariant-sym'
  | 'hopfield-spin'
  | 'quantum-geometry'
  | 'qrng-entropy'
  | 'fenced-llm'
  | 'toolchain'
  | 'fenced-arbitrator'
  | 'classical-baseline'
  | 'game-physics'
  | 'classical-rng'
  | 'pinn-physics'
  | 'path-integral'
  | 'browser-hybrid'
  | 'logo-turtle'
  | 'quake-aliveness'
  | 'fenced-chain'
  | 'fenced-api'
  | 'meta';

export interface TsotchkeRepoEntry {
  slug: TsotchkeRepoSlug;
  origin: 'user' | 'org';
  substrate: SubstrateKind;
  /** Cosmogonic module that owns the port (empty = fenced / not in sim). */
  cosmogonicLeaf: string;
  /** 0 = fenced from deterministic sim; 1 = fully wired. */
  wiring: number;
  /** Deterministic hue for UI/telemetry differentiation. */
  hue: number;
}

const ENTRIES: TsotchkeRepoEntry[] = [
  {
    slug: 'eshkol',
    origin: 'user',
    substrate: 'consciousness-engine',
    cosmogonicLeaf: 'sim/eshkol-bridge.ts',
    wiring: 0.96,
    hue: 0.72,
  },
  {
    slug: 'moonlab',
    origin: 'user',
    substrate: 'clifford-tensor',
    cosmogonicLeaf: 'sim/moonlab-tensor.ts',
    wiring: 0.93,
    hue: 0.41,
  },
  {
    slug: 'tensorcore',
    origin: 'user',
    substrate: 'metal-sim',
    cosmogonicLeaf: 'sim/tensorcore-facade.ts',
    wiring: 0.88,
    hue: 0.05,
  },
  {
    slug: 'libirrep',
    origin: 'user',
    substrate: 'equivariant-sym',
    cosmogonicLeaf: 'sim/irrep-symmetry.ts',
    wiring: 0.9,
    hue: 0.18,
  },
  {
    slug: 'spin_based_neural_network',
    origin: 'user',
    substrate: 'hopfield-spin',
    cosmogonicLeaf: 'spin-glass',
    wiring: 0.9,
    hue: 0.55,
  },
  {
    slug: 'quantum_geometric_tensor',
    origin: 'user',
    substrate: 'quantum-geometry',
    cosmogonicLeaf: 'quantum-geometry',
    wiring: 0.91,
    hue: 0.88,
  },
  {
    slug: 'quantum_rng',
    origin: 'user',
    substrate: 'qrng-entropy',
    cosmogonicLeaf: 'eshkol-qrng',
    wiring: 0.95,
    hue: 0.62,
  },
  {
    slug: 'gpt2-basic',
    origin: 'user',
    substrate: 'fenced-llm',
    cosmogonicLeaf: '',
    wiring: 0,
    hue: 0,
  },
  {
    slug: 'homebrew-eshkol',
    origin: 'user',
    substrate: 'toolchain',
    cosmogonicLeaf: 'tsotchke-registry',
    wiring: 0.45,
    hue: 0.33,
  },
  {
    slug: 'llm-arbitrator',
    origin: 'user',
    substrate: 'fenced-arbitrator',
    cosmogonicLeaf: '',
    wiring: 0,
    hue: 0,
  },
  {
    slug: 'simple_mnist',
    origin: 'user',
    substrate: 'classical-baseline',
    cosmogonicLeaf: 'sim/perceptron-baseline.ts',
    wiring: 0.82,
    hue: 0.27,
  },
  {
    slug: 'asteroids',
    origin: 'user',
    substrate: 'game-physics',
    cosmogonicLeaf: 'sim/asteroids-physics.ts',
    wiring: 0.85,
    hue: 0.48,
  },
  {
    slug: 'classical_rng',
    origin: 'user',
    substrate: 'classical-rng',
    cosmogonicLeaf: 'sim/classical-contrast.ts',
    wiring: 0.84,
    hue: 0.71,
  },
  {
    slug: 'PINN',
    origin: 'user',
    substrate: 'pinn-physics',
    cosmogonicLeaf: 'sim/pinn-residual.ts',
    wiring: 0.9,
    hue: 0.39,
  },
  {
    slug: 'PIMC',
    origin: 'user',
    substrate: 'path-integral',
    cosmogonicLeaf: 'sim/pimc-paths.ts',
    wiring: 0.88,
    hue: 0.44,
  },
  {
    slug: 'ulg',
    origin: 'org',
    substrate: 'browser-hybrid',
    cosmogonicLeaf: 'sim/ulg-bridge.ts',
    wiring: 0.86,
    hue: 0.25,
  },
  {
    slug: 'logo-lab',
    origin: 'org',
    substrate: 'logo-turtle',
    cosmogonicLeaf: 'sim/logo-turtle.ts',
    wiring: 0.87,
    hue: 0.52,
  },
  {
    slug: 'quantum-quake',
    origin: 'org',
    substrate: 'quake-aliveness',
    cosmogonicLeaf: 'sim/qge-aliveness.ts',
    wiring: 0.94,
    hue: 0.58,
  },
  {
    slug: 'SolanaQuantumFlux',
    origin: 'org',
    substrate: 'fenced-chain',
    cosmogonicLeaf: '',
    wiring: 0,
    hue: 0,
  },
  {
    slug: 'Quantum-RNG-API',
    origin: 'org',
    substrate: 'fenced-api',
    cosmogonicLeaf: '',
    wiring: 0,
    hue: 0,
  },
  {
    slug: '.github',
    origin: 'org',
    substrate: 'meta',
    cosmogonicLeaf: 'tsotchke-registry',
    wiring: 0.1,
    hue: 0.15,
  },
];

const SLUG_INDEX = new Map<TsotchkeRepoSlug, number>(ENTRIES.map((e, i) => [e.slug, i] as const));

/** Total corpus repos tracked (21). */
export const TSOTCHKE_REPO_COUNT = ENTRIES.length;

/** O(1). Returns entry by slug or undefined. */
export function getTsotchkeRepo(slug: TsotchkeRepoSlug): TsotchkeRepoEntry | undefined {
  const i = SLUG_INDEX.get(slug);
  return i === undefined ? undefined : ENTRIES[i];
}

/** O(1). Cyclic index into the full registry (for Archon rotation). */
export function getTsotchkeRepoByIndex(i: number): TsotchkeRepoEntry {
  const n = ENTRIES.length;
  const idx = ((i % n) + n) % n;
  return ENTRIES[idx]!;
}

/** Sum of wiring weights for wired repos only (fenced excluded). O(n), n=21. */
export function tsotchkeWiringCoverage(): number {
  let wired = 0;
  let total = 0;
  for (const e of ENTRIES) {
    if (e.wiring > 0) {
      wired += e.wiring;
      total += 1;
    }
  }
  return total === 0 ? 0 : wired / total;
}

/** Deterministic substrate vector for a godform index — feeds petri-dish growth. O(1). */
export function substrateVectorForArchon(archonIdx: number): Float32Array {
  const e0 = getTsotchkeRepoByIndex(archonIdx);
  const e1 = getTsotchkeRepoByIndex(archonIdx + 7);
  const e2 = getTsotchkeRepoByIndex(archonIdx + 14);
  return new Float32Array([e0.wiring, e1.hue, e2.wiring * e2.hue, e0.hue, e1.wiring]);
}

/** LLM/API/chain repos — fenced from deterministic sim (not consciousness substrates). */
export const FENCED_REPO_SLUGS = [
  'gpt2-basic',
  'llm-arbitrator',
  'SolanaQuantumFlux',
  'Quantum-RNG-API',
] as const satisfies readonly TsotchkeRepoSlug[];

/** Primary Tsotchke repo per GOAL5 Archon (0..4). */
export const ARCHON_PRIMARY_REPOS: readonly TsotchkeRepoSlug[] = [
  'eshkol',
  'moonlab',
  'quantum_geometric_tensor',
  'libirrep',
  'quantum-quake',
];

/** O(1). Primary corpus entry for a pantheon Archon. */
export function primaryRepoForArchon(archonIdx: number): TsotchkeRepoEntry {
  const n = ARCHON_PRIMARY_REPOS.length;
  const slug = ARCHON_PRIMARY_REPOS[((archonIdx % n) + n) % n]!;
  return getTsotchkeRepo(slug)!;
}

/** Fraction of sim-wired repos at or above threshold (default full wire = 0.7). O(n), n=21. */
export function tsotchkeSimWiringFraction(threshold = 0.7): number {
  let full = 0;
  let sim = 0;
  for (const e of ENTRIES) {
    if (e.wiring > 0) {
      sim += 1;
      if (e.wiring >= threshold) full += 1;
    }
  }
  return sim === 0 ? 0 : full / sim;
}

/** O(1). Rotates all 21 corpus repos into one catalysis scalar per Archon beat. */
export function corpusBeatForArchon(archonIdx: number, frame: number): number {
  const e0 = getTsotchkeRepoByIndex(archonIdx);
  const e1 = getTsotchkeRepoByIndex(archonIdx + 5);
  const e2 = getTsotchkeRepoByIndex(archonIdx + 10);
  const phase = (frame % 360) / 360;
  const mix = e0.wiring * e0.hue + e1.wiring * (1 - phase) + e2.wiring * e2.hue;
  return mix > 1 ? 1 : mix < 0 ? 0 : mix / 3;
}
