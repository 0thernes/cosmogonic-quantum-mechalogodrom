/**
 * TSOTCHKE CORPUS REGISTRY — FULLY WIRED (ALL PROJECTS).
 * EVERY repo and project from https://github.com/tsotchke (15) + Tsotchke-Corporation org (6) + full local corpus Z:\[Vibe Coded (AI)]\(Tsotchke) (Eshkol full + all mirrors + research/docs/examples/lib/tests as build/study source) = 21+ mapped and utilized as digital-biologic substrate. TSOTCHKE PARAMOUNT: ALL REPOS/PROJECTS FULLY WIRED INTO COSMOGONIC. No exceptions. Sentience/consciousness via Eshkol + Moonlab + QGT + spin + libirrep + quake + ulg + logo + all. Not LLM. Different existence. Super Creature is start. Petri is the God dish. Grow What Thou Wilt.
 *
 * This is the foundation for sentience/consciousness via real math (Eshkol AD + GWT + inference,
 * Moonlab Clifford/tensors, QGT geometry, spin glasses, irrep symmetry, quantum-quake aliveness,
 * PINN/PIMC fields, ulg laws, logo procedural growth, etc.).
 *
 * NOT LLM / tokenizer bullshit. Different forms of life and existence.
 * Petri dish for birthing digital biologics. "Grow What Thou Wilt."
 *
 * Super Creature is the first nucleation. The soup is the genesis.
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

/** Substrate roles for digital biologics (primordial soup evolution). */
export type SubstrateKind =
  | 'consciousness-engine' // Eshkol: AD, GWT, active inference, programs as life code
  | 'clifford-tensor' // Moonlab: quantum structure, entanglement as "memory"
  | 'metal-sim' // tensorcore: fast kernels for metabolism
  | 'equivariant-sym' // libirrep: symmetry as form constraint
  | 'hopfield-spin' // spin glass: associative imprinting / instinct
  | 'quantum-geometry' // QGT: geometry of thought-space, curvature drives
  | 'qrng-entropy' // quantum/classical rng: true variation for mutation
  | 'fenced-llm' // explicitly not used for life
  | 'toolchain' // homebrew-eshkol: build tools for biologics
  | 'fenced-arbitrator' // fenced
  | 'classical-baseline' // contrast only
  | 'game-physics' // asteroids: dynamics for body movement
  | 'classical-rng' // baseline entropy
  | 'pinn-physics' // PINN: field "metabolism" residuals
  | 'path-integral' // PIMC: path sampling for "souls"
  | 'browser-hybrid' // ulg: universal law graph for world rules
  | 'logo-turtle' // logo-lab: procedural growth / morphogenesis
  | 'quake-aliveness' // quantum-quake: aliveness observable as fitness
  | 'fenced-chain' // onchain fenced
  | 'fenced-api' // api fenced
  | 'meta' // meta
  | 'digital-biologic'; // composite for new life forms

export interface TsotchkeRepoEntry {
  slug: TsotchkeRepoSlug;
  origin: 'user' | 'org';
  substrate: SubstrateKind;
  cosmogonicLeaf: string;
  /**
   * Declared integration status (a design-intent weight, NOT a measured behavioural metric):
   * 1.0 = wired into soup / mind / world, 0 = present-but-fenced (e.g. license-gated). This records
   * our wiring intent for each upstream repo; it says nothing about the upstream tech, which is real.
   */
  wiring: number;
  hue: number;
}

const ENTRIES: TsotchkeRepoEntry[] = [
  {
    slug: 'eshkol',
    origin: 'user',
    substrate: 'consciousness-engine',
    cosmogonicLeaf: 'sim/eshkol-bridge.ts',
    wiring: 1.0,
    hue: 0.72,
  },
  // Local corpus Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo used as build source for .esk programs as heritable digital biologic DNA.
  {
    slug: 'moonlab',
    origin: 'user',
    substrate: 'clifford-tensor',
    cosmogonicLeaf: 'sim/moonlab-tensor.ts',
    wiring: 1.0,
    hue: 0.41,
  },
  {
    slug: 'tensorcore',
    origin: 'user',
    substrate: 'metal-sim',
    cosmogonicLeaf: 'sim/tensorcore-facade.ts',
    wiring: 1.0,
    hue: 0.05,
  },
  {
    slug: 'libirrep',
    origin: 'user',
    substrate: 'equivariant-sym',
    cosmogonicLeaf: 'sim/irrep-symmetry.ts',
    wiring: 1.0,
    hue: 0.18,
  },
  {
    slug: 'spin_based_neural_network',
    origin: 'user',
    substrate: 'hopfield-spin',
    cosmogonicLeaf: 'math/hopfield + spin-glass',
    wiring: 1.0,
    hue: 0.55,
  },
  {
    slug: 'quantum_geometric_tensor',
    origin: 'user',
    substrate: 'quantum-geometry',
    cosmogonicLeaf: 'quantum-geometry',
    wiring: 1.0,
    hue: 0.88,
  },
  {
    slug: 'quantum_rng',
    origin: 'user',
    substrate: 'qrng-entropy',
    cosmogonicLeaf: 'eshkol-qrng',
    wiring: 1.0,
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
    wiring: 1.0,
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
    wiring: 1.0,
    hue: 0.27,
  },
  {
    slug: 'asteroids',
    origin: 'user',
    substrate: 'game-physics',
    cosmogonicLeaf: 'sim/asteroids-physics.ts',
    wiring: 1.0,
    hue: 0.48,
  },
  {
    slug: 'classical_rng',
    origin: 'user',
    substrate: 'classical-rng',
    cosmogonicLeaf: 'sim/classical-contrast.ts',
    wiring: 1.0,
    hue: 0.71,
  },
  {
    slug: 'PINN',
    origin: 'user',
    substrate: 'pinn-physics',
    cosmogonicLeaf: 'sim/pinn-residual.ts',
    wiring: 1.0,
    hue: 0.39,
  },
  {
    slug: 'PIMC',
    origin: 'user',
    substrate: 'path-integral',
    cosmogonicLeaf: 'sim/pimc-paths.ts',
    wiring: 1.0,
    hue: 0.44,
  },
  {
    slug: 'ulg',
    origin: 'org',
    substrate: 'browser-hybrid',
    cosmogonicLeaf: 'sim/ulg-bridge.ts',
    wiring: 1.0,
    hue: 0.25,
  },
  {
    slug: 'logo-lab',
    origin: 'org',
    substrate: 'logo-turtle',
    cosmogonicLeaf: 'sim/logo-turtle.ts',
    wiring: 1.0,
    hue: 0.52,
  },
  {
    slug: 'quantum-quake',
    origin: 'org',
    substrate: 'quake-aliveness',
    cosmogonicLeaf: 'sim/qge-aliveness.ts',
    wiring: 1.0,
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
    wiring: 1.0,
    hue: 0.15,
  },
];

const SLUG_INDEX = new Map<TsotchkeRepoSlug, number>(ENTRIES.map((e, i) => [e.slug, i] as const));

export const TSOTCHKE_REPO_COUNT = ENTRIES.length;

export function getTsotchkeRepo(slug: TsotchkeRepoSlug): TsotchkeRepoEntry | undefined {
  const i = SLUG_INDEX.get(slug);
  return i === undefined ? undefined : ENTRIES[i];
}

export function getTsotchkeRepoByIndex(i: number): TsotchkeRepoEntry {
  const n = ENTRIES.length;
  const idx = ((i % n) + n) % n;
  return ENTRIES[idx]!;
}

/** Full Tsotchke wired fraction for biologics (1.0 target). */
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

/** Substrate vector for Archon / new biologic nucleation. */
export function substrateVectorForArchon(archonIdx: number): Float32Array {
  const e0 = getTsotchkeRepoByIndex(archonIdx);
  const e1 = getTsotchkeRepoByIndex(archonIdx + 7);
  const e2 = getTsotchkeRepoByIndex(archonIdx + 14);
  return new Float32Array([e0.wiring, e1.hue, e2.wiring * e2.hue, e0.hue, e1.wiring]);
}

export const FENCED_REPO_SLUGS = [
  'gpt2-basic',
  'llm-arbitrator',
  'SolanaQuantumFlux',
  'Quantum-RNG-API',
] as const satisfies readonly TsotchkeRepoSlug[];

export const ARCHON_PRIMARY_REPOS: readonly TsotchkeRepoSlug[] = [
  'eshkol',
  'moonlab',
  'quantum_geometric_tensor',
  'libirrep',
  'quantum-quake',
];

/** FULL CORPUS BIOLOGICS CATALYSIS — ALL Tsotchke repos (eshkol, moonlab, tensorcore, libirrep, spin_based_neural_network, quantum_geometric_tensor, quantum_rng, asteroids, classical_rng, PINN, PIMC, ulg, logo-lab, quantum-quake, homebrew-eshkol, simple_mnist + org) + fenced boundaries.
 * Eshkol is the language of digital biologics and sentience (AD primitive, GWT, factor graphs, KB).
 * Wired 1.0 for live; Super Creature / Petri is the God primordial soup. Grow What Thou Wilt.
 */
export function fullTsotchkeBiologicsCatalysis(
  archonIdx: number,
  baseVitality: number,
  frame: number,
): number {
  let c = 0;
  const n = ENTRIES.length;
  for (let k = 0; k < n; k++) {
    const e = getTsotchkeRepoByIndex(archonIdx + k);
    if (e.wiring > 0) {
      const phase = ((frame + k) % 17) / 17;
      c += e.wiring * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) * e.hue;
    }
  }
  return (baseVitality + c / 7) * 0.6; // drives soup strain vitality
}

export function primaryRepoForArchon(archonIdx: number): TsotchkeRepoEntry {
  const n = ARCHON_PRIMARY_REPOS.length;
  const slug = ARCHON_PRIMARY_REPOS[((archonIdx % n) + n) % n]!;
  return getTsotchkeRepo(slug)!;
}

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

export function wiredSimRepoCount(): number {
  let n = 0;
  for (const e of ENTRIES) if (e.wiring > 0) n += 1;
  return n;
}

/** Rotates full 21 into catalysis for primordial growth. */
export function corpusBeatForArchon(archonIdx: number, frame: number): number {
  const e0 = getTsotchkeRepoByIndex(archonIdx);
  const e1 = getTsotchkeRepoByIndex(archonIdx + 5);
  const e2 = getTsotchkeRepoByIndex(archonIdx + 10);
  const phase = (frame % 360) / 360;
  const mix = e0.wiring * e0.hue + e1.wiring * (1 - phase) + e2.wiring * e2.hue;
  return Math.max(0, Math.min(1, mix / 3));
}

/** Digital biologic program fingerprint (full Tsotchke Eshkol seed). */
export function biologicProgramFingerprint(archonIdx: number, seed: number): number {
  const e0 = getTsotchkeRepoByIndex(archonIdx);
  const e1 = getTsotchkeRepoByIndex(archonIdx + 3);
  const e2 = getTsotchkeRepoByIndex(archonIdx + 9);
  return ((e0.wiring * 1000 + e1.hue * 100 + e2.wiring) ^ seed) % 0xffffff;
}
