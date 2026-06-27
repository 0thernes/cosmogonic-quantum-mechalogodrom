/**
 * TSOTCHKE CORPUS REGISTRY — BINDING LEDGER PER docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md
 * ALL repos/projects from tsotchke user + Tsotchke-Corporation org + full local Z:\[Vibe Coded (AI)]\(Tsotchke) corpus (12k+ files) MAPPED and UTILIZED as digital-biologic substrate.
 * Deep apex (8): Eshkol (AD/GWT/consciousness-engine + .esk DNA), Moonlab (Clifford/tensor), QGTL, spin NN, quantum_rng, libirrep, tensorcore, classical_rng.
 * World/sim (2): asteroids, simple_mnist.
 * Ported/telemetry (3): PINN, PIMC, quantum-quake (license notes apply; quake GPL quarantine per map).
 * License-gated leaves (2): ulg, logo-lab.
 * Fenced by design (non-LLM mandate + proprietary): gpt2-basic, llm-arbitrator, SolanaQuantumFlux.
 * Toolchain/meta: homebrew-eshkol, .github.
 * Catalysis (fullTsotchkeBiologicsCatalysis + soup + petri + Archons) mixes ALL wiring>0. Harvest pulls real local .esk for Eshkol DNA.
 * Tsotchke is REAL MIT-grade startup quantum math (no overclaims; physical QC for scale). Binding depth: TSOTCHKE-INTEGRATION-MAP-2026-06-26.md. "Grow What Thou Wilt."
 *
 * NOT LLM. Different forms of life. Petri is growth engine. Super Creature initial spark only.
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
  'classical-contrast',
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
  | 'qrng-api' // Quantum-RNG-API: REST facade over eshkol-qrng core
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
    cosmogonicLeaf: 'sim/homebrew-eshkol.ts',
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
    slug: 'classical-contrast',
    origin: 'user',
    substrate: 'classical-baseline',
    cosmogonicLeaf: 'sim/classical-contrast.ts',
    wiring: 1.0,
    hue: 0.65,
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
    substrate: 'qrng-api',
    cosmogonicLeaf: 'sim/quantum-rng-api.ts',
    wiring: 1.0,
    hue: 0.68,
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

/** Mean wiring WEIGHT of the already-wired substrates (averages only entries with wiring>0, so it
 *  trends to ~1.0). Kept for the catalysis-vitality term; the HONEST public coverage is
 *  {@link tsotchkeWiredSubstrateFraction} below. */
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

/**
 * HONEST wired fraction (de-inflated, per the 2026-06-21 honesty audit): scientific-substrate repos with
 * real downstream wiring (>0) over ALL scientific substrates — EXCLUDES org-meta (`.github`) and COUNTS
 * fenced repos as present-but-unwired in the denominator. ~0.86 (18 of 21), NOT the ~1.0 that
 * {@link tsotchkeWiringCoverage} reports by averaging only the wired entries. Surfaced as the petri view's
 * `wiringCoverage` so the public number can never read "all wired 1.0".
 */
export function tsotchkeWiredSubstrateFraction(): number {
  let wired = 0;
  let total = 0;
  for (const e of ENTRIES) {
    if (e.substrate === 'meta') continue; // org-meta (.github) is not a scientific substrate
    total += 1;
    if (e.wiring > 0) wired += 1;
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
] as const satisfies readonly TsotchkeRepoSlug[];

export const ARCHON_PRIMARY_REPOS: readonly TsotchkeRepoSlug[] = [
  'eshkol',
  'moonlab',
  'quantum_geometric_tensor',
  'libirrep',
  'quantum-quake',
];

/** FULL CORPUS BIOLOGICS CATALYSIS — **EVERY** Tsotchke repo and project from tsotchke user + Tsotchke-Corporation org (full 12k+ file corpus, 20+ mirrors: eshkol/eshkol_repo + research, moonlab, quantum_geometric_tensor, spin_based_neural_network, libirrep, quantum-quake, ulg, logo-lab, tensorcore, PINN, PIMC, quantum_rng, classical_rng, asteroids, simple_mnist, homebrew-eshkol, classical-contrast, + all other mirrors per tsotchke-directory-ledger.csv + sites + .github org) + fenced LLM/chain ones. Eshkol is the language of digital biologics and sentience (AD primitive, GWT, factor graphs, KB). Wired 1.0 scientific; all utilized in catalysis/soup/petri or study. Real, correct, MIT. Physical big QPU scales performance, not correctness. Startup reality — tech works.
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
