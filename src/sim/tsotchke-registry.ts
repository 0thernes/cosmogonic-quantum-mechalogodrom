/**
 * TSOTCHKE CORPUS REGISTRY — BINDING LEDGER PER docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md
 * ALL 22 public repos from the tsotchke user + Tsotchke-Corporation org are accounted for as
 * digital-biologic substrate, harvest, deliberate fence, or metadata. Internal Cosmogonic controls
 * are recorded separately and never inflate the external-repository count or coverage denominator.
 * Deep apex (8): Eshkol (AD/GWT/consciousness-engine + .esk DNA), Moonlab (Clifford/tensor), QGTL,
 * spin NN, quantum_rng, libirrep, tensorcore, classical_rng.
 * World/sim (2): asteroids, simple_mnist.
 * Ported/telemetry (3): PINN, PIMC, quantum-quake (license notes apply; quake GPL quarantine per map).
 * License-gated leaves (2): ulg, logo-lab.
 * Fenced by design (non-LLM mandate + license boundary): gpt2-basic, llm-arbitrator,
 * SolanaQuantumFlux, OBLITERATUS.
 * Toolchain/meta: homebrew-eshkol, .github.
 * Catalysis (fullTsotchkeBiologicsCatalysis + soup + petri + Archons) mixes all entries with
 * `wiring>0`. Harvest pulls local `.esk` artifacts for deterministic Eshkol program fingerprints.
 * The ledger records integration and provenance; it does not certify physical quantum hardware,
 * consciousness, sentience, security, or upstream implementation quality. Binding depth:
 * TSOTCHKE-INTEGRATION-MAP-2026-06-26.md. "Grow What Thou Wilt."
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
  'PINN',
  'PIMC',
] as const;

export const TSOTCHKE_ORG_REPOS = [
  'ulg',
  'logo-lab',
  'quantum-quake',
  'SolanaQuantumFlux',
  'Quantum-RNG-API',
  'OBLITERATUS',
  '.github',
] as const;

export type TsotchkeUserRepo = (typeof TSOTCHKE_USER_REPOS)[number];
export type TsotchkeOrgRepo = (typeof TSOTCHKE_ORG_REPOS)[number];
export type TsotchkeRepoSlug = TsotchkeUserRepo | TsotchkeOrgRepo;

/** Depth of integration for the public integration map. */
export type DepthKind =
  | 'deep' // real closed-form code in hot mind/world paths every frame
  | 'wired' // real code in world/sim/petri or contrast paths
  | 'harvest' // source / .esk DNA / toolchain / API wrapper harvested, not hot-path
  | 'fenced' // deliberately excluded by project mandate
  | 'meta'; // org-level meta (e.g., .github)

/** How an external repository is represented without conflating a facade with copied source. */
export type TsotchkeIntegrationMode =
  'direct-port' | 'deterministic-facade' | 'harvest' | 'fenced' | 'meta';

/** Substrate roles for digital biologics (primordial soup evolution). */
export type SubstrateKind =
  | 'consciousness-engine' // Eshkol: AD, GWT, active inference, programs as life code
  | 'clifford-tensor' // Moonlab: quantum structure, entanglement as "memory"
  | 'metal-sim' // tensorcore: fast kernels for metabolism
  | 'equivariant-sym' // libirrep: symmetry as form constraint
  | 'hopfield-spin' // spin glass: associative imprinting / instinct
  | 'quantum-geometry' // QGT: geometry of thought-space, curvature drives
  | 'qrng-entropy' // seeded state-vector model: deterministic mutation variation, not physical entropy
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
  | 'fenced-refusal-toolkit' // OBLITERATUS: AGPL LLM refusal-removal toolkit, excluded
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
   * 1.0 = represented in soup / mind / world, 0 = fenced or metadata-only. This records
   * our wiring intent for each upstream repo; it says nothing about the upstream tech, which is real.
   */
  wiring: number;
  /** Public depth classification for the integration map. */
  depth: DepthKind;
  /** Whether the local leaf is a port, clean deterministic facade, harvest, fence, or metadata. */
  integrationMode: TsotchkeIntegrationMode;
  /** Human-readable upstream license/provenance boundary; not a legal conclusion. */
  sourceBoundary: string;
  hue: number;
}

/**
 * Internal experimental controls are operational Cosmogonic leaves, not public Tsotchke repos.
 * Keeping a separate type and ledger prevents them from entering external counts, coverage, or
 * registry-driven catalysis while retaining explicit provenance for the live control path.
 */
export interface TsotchkeInternalControlEntry {
  id: 'classical-contrast';
  substrate: 'classical-baseline';
  cosmogonicLeaf: 'sim/classical-contrast.ts';
  purpose: string;
  operational: true;
}

export const TSOTCHKE_INTERNAL_CONTROLS = [
  {
    id: 'classical-contrast',
    substrate: 'classical-baseline',
    cosmogonicLeaf: 'sim/classical-contrast.ts',
    purpose: 'Internal quantum-versus-classical experimental control; backed by classical_rng.',
    operational: true,
  },
] as const satisfies readonly TsotchkeInternalControlEntry[];

const ENTRIES: TsotchkeRepoEntry[] = [
  {
    slug: 'eshkol',
    origin: 'user',
    substrate: 'consciousness-engine',
    cosmogonicLeaf: 'sim/eshkol-bridge.ts',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; compatible upstream source may be ported with attribution.',
    hue: 0.72,
  },
  // Local corpus Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo used as build source for .esk programs as heritable digital biologic DNA.
  // Eshkol AD (vm_autodiff port, math/eshkol-ad.ts) now drives THREE living consumers, deepest → shallowest:
  //   sim/ad-mlp.ts        — a real multi-layer perceptron: backprop through a tanh hidden layer (GATE-MLP: solves XOR);
  //   sim/digital-biologics — each biologic trains that MLP ONLINE into a forward self-model (GATE-SELFMODEL);
  //   sim/ad-forager.ts    — exact ∇ of a food potential for base-agent chemotaxis (GATE-FORAGE).
  {
    slug: 'moonlab',
    origin: 'user',
    substrate: 'clifford-tensor',
    cosmogonicLeaf: 'sim/moonlab-tensor.ts',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; compatible upstream source may be ported with attribution.',
    hue: 0.41,
  },
  {
    slug: 'tensorcore',
    origin: 'user',
    substrate: 'metal-sim',
    cosmogonicLeaf: 'sim/tensorcore-facade.ts',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'MIT; local leaf is a deterministic TypeScript facade.',
    hue: 0.05,
  },
  {
    slug: 'libirrep',
    origin: 'user',
    substrate: 'equivariant-sym',
    cosmogonicLeaf: 'sim/irrep-symmetry.ts',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; compatible upstream source may be ported with attribution.',
    hue: 0.18,
  },
  {
    slug: 'spin_based_neural_network',
    origin: 'user',
    substrate: 'hopfield-spin',
    cosmogonicLeaf: 'math/hopfield + spin-glass',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; compatible upstream source may be ported with attribution.',
    hue: 0.55,
  },
  {
    slug: 'quantum_geometric_tensor',
    origin: 'user',
    substrate: 'quantum-geometry',
    cosmogonicLeaf: 'quantum-geometry',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; compatible upstream source may be ported with attribution.',
    hue: 0.88,
  },
  {
    slug: 'quantum_rng',
    origin: 'user',
    substrate: 'qrng-entropy',
    cosmogonicLeaf: 'eshkol-qrng',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'deterministic-facade',
    sourceBoundary:
      'MIT; local code is a seeded state-vector adaptation/facade, not a direct port or hardware entropy source.',
    hue: 0.62,
  },
  {
    slug: 'gpt2-basic',
    origin: 'user',
    substrate: 'fenced-llm',
    cosmogonicLeaf: '',
    wiring: 0,
    depth: 'fenced',
    integrationMode: 'fenced',
    sourceBoundary: 'MIT; excluded by the non-LLM simulation mandate.',
    hue: 0,
  },
  {
    slug: 'homebrew-eshkol',
    origin: 'user',
    substrate: 'toolchain',
    cosmogonicLeaf: 'sim/homebrew-eshkol.ts',
    wiring: 1.0,
    depth: 'harvest',
    integrationMode: 'harvest',
    sourceBoundary: 'NO LICENSE; toolchain/catalog harvest only, with no upstream source port.',
    hue: 0.33,
  },
  {
    slug: 'llm-arbitrator',
    origin: 'user',
    substrate: 'fenced-arbitrator',
    cosmogonicLeaf: '',
    wiring: 0,
    depth: 'fenced',
    integrationMode: 'fenced',
    sourceBoundary: 'MIT; excluded by the non-LLM simulation mandate.',
    hue: 0,
  },
  {
    slug: 'simple_mnist',
    origin: 'user',
    substrate: 'classical-baseline',
    cosmogonicLeaf: 'sim/perceptron-baseline.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'MIT; local leaf is a deterministic baseline facade.',
    hue: 0.27,
  },
  {
    slug: 'asteroids',
    origin: 'user',
    substrate: 'game-physics',
    cosmogonicLeaf: 'sim/asteroids-physics.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'MIT; local leaf is a deterministic physics facade.',
    hue: 0.48,
  },
  {
    slug: 'classical_rng',
    origin: 'user',
    substrate: 'classical-rng',
    cosmogonicLeaf: 'sim/classical-contrast.ts',
    wiring: 1.0,
    depth: 'deep',
    integrationMode: 'direct-port',
    sourceBoundary: 'MIT; feeds the separately ledgered internal contrast control.',
    hue: 0.71,
  },
  {
    slug: 'PINN',
    origin: 'user',
    substrate: 'pinn-physics',
    cosmogonicLeaf: 'sim/pinn-residual.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'NO LICENSE; deterministic-facade status pending chain-of-title clearance.',
    hue: 0.39,
  },
  {
    slug: 'PIMC',
    origin: 'user',
    substrate: 'path-integral',
    cosmogonicLeaf: 'sim/pimc-paths.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'NO LICENSE; deterministic-facade status pending chain-of-title clearance.',
    hue: 0.44,
  },
  {
    slug: 'ulg',
    origin: 'org',
    substrate: 'browser-hybrid',
    cosmogonicLeaf: 'sim/ulg-bridge.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'NO LICENSE; deterministic-facade status pending copyright assignment.',
    hue: 0.25,
  },
  {
    slug: 'logo-lab',
    origin: 'org',
    substrate: 'logo-turtle',
    cosmogonicLeaf: 'sim/logo-turtle.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary: 'NO LICENSE; deterministic-facade status pending assignment and NOTICE.',
    hue: 0.52,
  },
  {
    slug: 'quantum-quake',
    origin: 'org',
    substrate: 'quake-aliveness',
    cosmogonicLeaf: 'sim/qge-aliveness.ts',
    wiring: 1.0,
    depth: 'wired',
    integrationMode: 'deterministic-facade',
    sourceBoundary:
      'GPL-2.0-derived upstream quarantined; deterministic facade pending separability/legal review.',
    hue: 0.58,
  },
  {
    slug: 'SolanaQuantumFlux',
    origin: 'org',
    substrate: 'fenced-chain',
    cosmogonicLeaf: '',
    wiring: 0,
    depth: 'fenced',
    integrationMode: 'fenced',
    sourceBoundary: 'PROPRIETARY; no runtime use without an explicit compatible license.',
    hue: 0,
  },
  {
    slug: 'Quantum-RNG-API',
    origin: 'org',
    substrate: 'qrng-api',
    cosmogonicLeaf: 'sim/quantum-rng-api.ts',
    wiring: 1.0,
    depth: 'harvest',
    integrationMode: 'harvest',
    sourceBoundary: 'MIT; REST wrapper is redundant because the core is integrated directly.',
    hue: 0.68,
  },
  {
    slug: 'OBLITERATUS',
    origin: 'org',
    substrate: 'fenced-refusal-toolkit',
    cosmogonicLeaf: '',
    wiring: 0,
    depth: 'fenced',
    integrationMode: 'fenced',
    sourceBoundary: 'AGPL-3.0; refusal-removal LLM toolkit excluded by the non-LLM mandate.',
    hue: 0,
  },
  {
    slug: '.github',
    origin: 'org',
    substrate: 'meta',
    cosmogonicLeaf: 'tsotchke-registry',
    wiring: 0,
    depth: 'meta',
    integrationMode: 'meta',
    sourceBoundary: 'Repository metadata only; no runtime source or simulation leaf.',
    hue: 0,
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

/** Public depth of integration for a repo (deep / wired / harvest / fenced / meta). */
export function tsotchkeDepthFor(slug: TsotchkeRepoSlug): DepthKind | undefined {
  return getTsotchkeRepo(slug)?.depth;
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
 * fenced repos as present-but-unwired in the denominator. 17/21, NOT the ~1.0 that
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
  return new Float32Array([
    e0.wiring,
    e1.wiring * e1.hue,
    e2.wiring * e2.hue,
    e0.wiring * e0.hue,
    e1.wiring,
  ]);
}

export const FENCED_REPO_SLUGS = [
  'gpt2-basic',
  'llm-arbitrator',
  'SolanaQuantumFlux',
  'OBLITERATUS',
] as const satisfies readonly TsotchkeRepoSlug[];

export const ARCHON_PRIMARY_REPOS: readonly TsotchkeRepoSlug[] = [
  'eshkol',
  'moonlab',
  'quantum_geometric_tensor',
  'libirrep',
  'quantum-quake',
];

/** FULL CORPUS BIOLOGICS CATALYSIS — registry-driven, not blanket "all deeply wired".
 * Ledger truth: 22 external repositories; 8 deep, 7 wired, 2 harvest, 4 fenced, 1 meta.
 * The non-meta integration fraction is 17/21. Fenced LLM/chain/license entries and metadata stay
 * provenance-only, while represented external entries with wiring > 0 contribute to catalysis.
 * Eshkol supplies digital-biologic DNA and consciousness-proxy substrate signals (AD primitive,
 * GWT, factor graphs, KB). Physical QPU scale would improve speed, not correctness.
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

/** Rotates the 22-entry external ledger; zero-wiring fences/meta make no contribution. */
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
  return ((e0.wiring * 1000 + e1.wiring * e1.hue * 100 + e2.wiring) ^ seed) % 0xffffff;
}
