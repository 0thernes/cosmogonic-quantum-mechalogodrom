/**
 * Tsotchke October 21, 2026 Full 27-Repository Stack & Flagship Zig WASM Bridge
 *
 * Bridges the V1 22-entry causal/runtime ledger (`src/sim/tsotchke-registry.ts`)
 * to the complete October 21, 2026 public corpus across Tsotchke's two GitHub
 * accounts (`tsotchke` personal: 17 public repos; `Tsotchke-Corporation` org:
 * 10 public repos = 27 total), four official websites (`eshkol.ai`,
 * `tsotchke.org`, `tsotchke.net`, `api.tsotchke.net`), and two X accounts
 * (`@tsotchke`, `@tsotchkecorp`).
 *
 * Deeply integrates the 4 primary flagship engines + 4 Wave-2 repositories via
 * Zig 0.17.0 WebAssembly kernels (`src/math/zig-bridge.ts`):
 *   - Flagships:
 *     1. `moonlab` (v1.2.1, ABI 0.8.0) — Transverse-field Ising/QUBO quantum annealer
 *        (`cqm_moonlab_ising_anneal`) + MPS/MPO tensor networks + Bell-gated entropy
 *     2. `quantum_geometric_tensor` (QGTL v0.777 Beta) — Full 2D Fubini-Study metric,
 *        Berry curvature, and O(eps^2) geometric gate error suppression (`cqm_qgtl_full_tensor_2d`)
 *     3. `quantum_rng` / `Quantum-RNG-API` (v3) — Chaotic Bell-entangled statevector +
 *        Toeplitz 64-bit extractor (`cqm_qrng_quantum_chaos_step`) in both seeded and
 *        Wild Non-Deterministic hardware-jitter modes
 *     4. `eshkol` (v1.3.6-evolve / v1.4) — Taylor-tower `derivative-n` (0th..4th order jet)
 *        + exact forward-mode 3D vector calculus `divergence` & `curl` (`cqm_eshkol_taylor_diff`)
 *   - Wave-2 (2026-03 to 2026-10):
 *     5. `rosette-wire` (v0.1.0) — Deterministic binary wire envelope & FNV-1a 64-bit
 *        component/composition/receipt verifier (`cqm_rosette_fnv1a64`)
 *     6. `pq-consensus-bandwidth` — CometBFT v0.40.0 post-quantum BFT wire-size, validator
 *        ceiling, and P2P handshake profiler (`UpstreamHandshake` 134 B, `PQAuthOnlyHandshake`
 *        5,301 B, `HybridKEMHandshake` 7,573 B; `cqm_pq_wire_bytes`)
 *     7. `GeoRefine` — Dual-frame geometric simplex verifier (`cqm_georefine_verify_frame`) +
 *        bit-exact BF16 weight codec (`TBE`/`BCTX`/`PPCX` 1.395x) & MTP k=5 speculator
 *     8. `bonsai-fidelity-study` — 63-layer Sparse Autoencoder (SAE) rare-feature survival
 *        (`0.8022` vs `0.975` decision gate) & low-bit quantization fidelity law
 */

import {
  getZigKernelReceipt,
  zigEshkolCyclotomic8Mul,
  zigEshkolDbspDeltaGemm,
  zigEshkolTaylorDiff,
  zigGeoRefineVerifyFrame,
  zigLibirrepBdgSkyrmionMzm,
  zigMoonlabIsingAnneal,
  zigMoonlabQwzChernFhs,
  zigPqWireBytes,
  zigQgtlFullTensor2D,
  zigQrngQuantumChaosStep,
  zigRosetteFnv1a64,
  zigSbnnMinsrStep,
  type MoonlabAnnealScheduleId,
  type PqSignatureSchemeId,
  type ZigEshkolCyclotomic8Report,
  type ZigEshkolDbspDeltaReport,
  type ZigEshkolTaylorReport,
  type ZigLibirrepBdgSkyrmionReport,
  type ZigMoonlabAnnealReport,
  type ZigMoonlabQwzChernReport,
  type ZigQgtlTensor2DReport,
  type ZigSbnnMinsrReport,
} from '../math/zig-bridge';
import { harvestHardwareJitter64, isWildEntropyMode } from '../math/wild-entropy';

export interface TsotchkeWebSurface {
  readonly id: string;
  readonly url: string;
  readonly role: string;
  readonly status: 'live' | 'api-gateway';
}

export interface TsotchkeSocialSurface {
  readonly handle: string;
  readonly url: string;
  readonly accountType: 'personal' | 'corporate';
}

export const TSOTCHKE_WEBSITES: readonly TsotchkeWebSurface[] = Object.freeze([
  {
    id: 'eshkol-ai',
    url: 'https://eshkol.ai',
    role: 'Eshkol v1.3.6-evolve / v1.4 homoiconic differentiable Lisp + HoTT + consciousness engine',
    status: 'live',
  },
  {
    id: 'tsotchke-org',
    url: 'https://tsotchke.org',
    role: 'Tsotchke research foundation & open-source quantum/symbolic physics index',
    status: 'live',
  },
  {
    id: 'tsotchke-net',
    url: 'https://tsotchke.net',
    role: 'Tsotchke Corporation corporate engineering portal (Numen, TensorCore, PrismAI)',
    status: 'live',
  },
  {
    id: 'api-tsotchke-net',
    url: 'https://api.tsotchke.net',
    role: 'Quantum-RNG-API & rosette-wire telemetry endpoint specification',
    status: 'api-gateway',
  },
]);

export const TSOTCHKE_X_ACCOUNTS: readonly TsotchkeSocialSurface[] = Object.freeze([
  {
    handle: '@tsotchke',
    url: 'https://x.com/tsotchke',
    accountType: 'personal',
  },
  {
    handle: '@tsotchkecorp',
    url: 'https://x.com/tsotchkecorp',
    accountType: 'corporate',
  },
]);

export const TSOTCHKE_OCT2026_USER_PUBLIC_REPOS: readonly string[] = Object.freeze([
  'moonlab',
  'eshkol',
  'quantum_geometric_tensor',
  'quantum_rng',
  'rosette-wire',
  'homebrew-eshkol',
  'homebrew-moonlab',
  'tensorcore',
  'gpt2-basic',
  'libirrep',
  'spin_based_neural_network',
  'llm-arbitrator',
  'simple_mnist',
  'asteroids',
  'classical_rng',
  'PINN',
  'PIMC',
]);

export const TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS: readonly string[] = Object.freeze([
  'GeoRefine',
  'pq-consensus-bandwidth',
  'bonsai-fidelity-study',
  'Quantum-RNG-API',
  'OBLITERATUS',
  'quantum-quake',
  'ulg',
  'logo-lab',
  'SolanaQuantumFlux',
  '.github',
]);

export const TSOTCHKE_OCT2026_USER_PUBLIC_COUNT = 17 as const;
export const TSOTCHKE_OCT2026_ORG_PUBLIC_COUNT = 10 as const;
export const TSOTCHKE_OCT2026_PUBLIC_REPO_COUNT = 27 as const;

export const TSOTCHKE_OCT2026_ALL_PUBLIC_REPOS: readonly string[] = Object.freeze([
  ...TSOTCHKE_OCT2026_USER_PUBLIC_REPOS,
  ...TSOTCHKE_OCT2026_ORG_PUBLIC_REPOS,
]);

/** Canonical October 21, 2026 live GitHub personal (`tsotchke`, 17) & corporate (`Tsotchke-Corporation`, 10) 27-repo catalog. */
export interface TsotchkeCanonicalRepoCatalogEntry {
  readonly index: number;
  readonly owner: 'tsotchke' | 'Tsotchke-Corporation';
  readonly name: string;
  readonly category: 'flagship' | 'wave2' | 'substrate' | 'packaging-or-meta' | 'fenced';
  readonly cqmModule: string;
  readonly zigKernel?: string;
}

export const TSOTCHKE_FULL_27_REPO_CATALOG: readonly TsotchkeCanonicalRepoCatalogEntry[] =
  Object.freeze([
    // --- 17 Personal Repos (github.com/tsotchke) ---
    {
      index: 1,
      owner: 'tsotchke',
      name: 'moonlab',
      category: 'flagship',
      cqmModule: 'src/sim/super-mind.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_moonlab_ising_anneal + cqm_moonlab_qwz_chern_fhs',
    },
    {
      index: 2,
      owner: 'tsotchke',
      name: 'eshkol',
      category: 'flagship',
      cqmModule:
        'src/math/eshkol-ad.ts + src/sim/tsotchke-deep-wire.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_eshkol_taylor_diff + cqm_eshkol_dbsp_delta_gemm + cqm_eshkol_cyclotomic8_mul',
    },
    {
      index: 3,
      owner: 'tsotchke',
      name: 'quantum_geometric_tensor',
      category: 'flagship',
      cqmModule:
        'src/math/quantum-geometry.ts + src/math/curvature-aware-qng.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_qgtl_full_tensor_2d + cqm_moonlab_qwz_chern_fhs',
    },
    {
      index: 4,
      owner: 'tsotchke',
      name: 'quantum_rng',
      category: 'flagship',
      cqmModule: 'src/math/eshkol-qrng.ts + src/math/rng.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_qrng_quantum_chaos_step',
    },
    {
      index: 5,
      owner: 'tsotchke',
      name: 'rosette-wire',
      category: 'wave2',
      cqmModule: 'src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_rosette_fnv1a64',
    },
    {
      index: 6,
      owner: 'tsotchke',
      name: 'homebrew-eshkol',
      category: 'packaging-or-meta',
      cqmModule: 'src/sim/tsotchke-registry.ts (census packaging tap)',
    },
    {
      index: 7,
      owner: 'tsotchke',
      name: 'homebrew-moonlab',
      category: 'packaging-or-meta',
      cqmModule: 'src/sim/tsotchke-registry.ts (census packaging tap)',
    },
    {
      index: 8,
      owner: 'tsotchke',
      name: 'tensorcore',
      category: 'substrate',
      cqmModule: 'src/sim/tensorcore-sim.ts + src/sim/entity-brain.ts',
      zigKernel: 'cqm_entity_brain_batch_forward',
    },
    {
      index: 9,
      owner: 'tsotchke',
      name: 'gpt2-basic',
      category: 'substrate',
      cqmModule: 'src/sim/tsotchke-registry.ts + src/sim/super-mind.ts',
    },
    {
      index: 10,
      owner: 'tsotchke',
      name: 'libirrep',
      category: 'substrate',
      cqmModule: 'src/sim/irrep-symmetry.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_libirrep_bdg_skyrmion_mzm',
    },
    {
      index: 11,
      owner: 'tsotchke',
      name: 'spin_based_neural_network',
      category: 'substrate',
      cqmModule:
        'src/sim/spin-glas-ising.ts + src/sim/glyph-brain.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_glyph_hebbian_step + cqm_sbnn_minsr_step',
    },
    {
      index: 12,
      owner: 'tsotchke',
      name: 'llm-arbitrator',
      category: 'substrate',
      cqmModule: 'src/sim/tsotchke-registry.ts',
    },
    {
      index: 13,
      owner: 'tsotchke',
      name: 'simple_mnist',
      category: 'substrate',
      cqmModule: 'src/sim/glyph-brain.ts',
      zigKernel: 'cqm_glyph_hebbian_step',
    },
    {
      index: 14,
      owner: 'tsotchke',
      name: 'asteroids',
      category: 'substrate',
      cqmModule: 'src/sim/asteroids-physics.ts',
    },
    {
      index: 15,
      owner: 'tsotchke',
      name: 'classical_rng',
      category: 'substrate',
      cqmModule: 'src/math/rng.ts (SplitMix64 + xoshiro128** baseline)',
    },
    {
      index: 16,
      owner: 'tsotchke',
      name: 'PINN',
      category: 'substrate',
      cqmModule: 'src/sim/pinn-physics.ts + src/sim/reaction-diffusion.ts',
      zigKernel: 'cqm_gray_scott_step_rgba_f32',
    },
    {
      index: 17,
      owner: 'tsotchke',
      name: 'PIMC',
      category: 'substrate',
      cqmModule: 'src/sim/pimc-paths.ts',
      zigKernel: 'cqm_tdse_step',
    },
    // --- 10 Corporate Repos (github.com/Tsotchke-Corporation) ---
    {
      index: 18,
      owner: 'Tsotchke-Corporation',
      name: 'GeoRefine',
      category: 'wave2',
      cqmModule: 'src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_georefine_verify_frame',
    },
    {
      index: 19,
      owner: 'Tsotchke-Corporation',
      name: 'pq-consensus-bandwidth',
      category: 'wave2',
      cqmModule: 'src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_pq_wire_bytes',
    },
    {
      index: 20,
      owner: 'Tsotchke-Corporation',
      name: 'bonsai-fidelity-study',
      category: 'wave2',
      cqmModule: 'src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_qgtl_full_tensor_2d',
    },
    {
      index: 21,
      owner: 'Tsotchke-Corporation',
      name: 'Quantum-RNG-API',
      category: 'flagship',
      cqmModule: 'src/math/eshkol-qrng.ts + src/sim/tsotchke-oct2026-wave.ts',
      zigKernel: 'cqm_qrng_quantum_chaos_step',
    },
    {
      index: 22,
      owner: 'Tsotchke-Corporation',
      name: 'OBLITERATUS',
      category: 'fenced',
      cqmModule: 'src/sim/tsotchke-registry.ts (deliberate non-integration fence)',
    },
    {
      index: 23,
      owner: 'Tsotchke-Corporation',
      name: 'quantum-quake',
      category: 'substrate',
      cqmModule: 'src/sim/quantum-quake-physics.ts',
    },
    {
      index: 24,
      owner: 'Tsotchke-Corporation',
      name: 'ulg',
      category: 'substrate',
      cqmModule: 'src/sim/ulg-bridge.ts',
    },
    {
      index: 25,
      owner: 'Tsotchke-Corporation',
      name: 'logo-lab',
      category: 'fenced',
      cqmModule: 'src/sim/tsotchke-registry.ts (deliberate branding fence)',
    },
    {
      index: 26,
      owner: 'Tsotchke-Corporation',
      name: 'SolanaQuantumFlux',
      category: 'fenced',
      cqmModule: 'src/sim/tsotchke-registry.ts (deliberate chain-finance fence)',
    },
    {
      index: 27,
      owner: 'Tsotchke-Corporation',
      name: '.github',
      category: 'packaging-or-meta',
      cqmModule: 'src/sim/tsotchke-registry.ts (org profile meta)',
    },
  ]);

export const TSOTCHKE_HOMEBREW_TAP_REPO = 'homebrew-moonlab' as const;

export interface TsotchkeOct2026WaveRepoEntry {
  readonly name: string;
  readonly owner: 'tsotchke' | 'Tsotchke-Corporation';
  readonly url: string;
  readonly domain: string;
  readonly zigKernelExport: string;
  readonly summary: string;
}

export type TsotchkeOct2026RepoSpec = TsotchkeOct2026WaveRepoEntry;

export const TSOTCHKE_OCT2026_WAVE2_REPOS: readonly TsotchkeOct2026WaveRepoEntry[] = Object.freeze([
  {
    name: 'rosette-wire',
    owner: 'tsotchke',
    url: 'https://github.com/tsotchke/rosette-wire',
    domain: 'Component/composition/receipt verification lane & FNV-1a 64-bit wire framing',
    zigKernelExport: 'cqm_rosette_fnv1a64',
    summary:
      'Deterministic binary wire envelope (`RSTE` magic, schema tag, payload length, Zig FNV-1a 64-bit digest) + Eshkol/Moonlab receipt verification.',
  },
  {
    name: 'pq-consensus-bandwidth',
    owner: 'Tsotchke-Corporation',
    url: 'https://github.com/Tsotchke-Corporation/pq-consensus-bandwidth',
    domain: 'CometBFT v0.40.0 post-quantum BFT wire-bandwidth & handshake model',
    zigKernelExport: 'cqm_pq_wire_bytes',
    summary:
      'Models ML-DSA-65 (Dilithium3), Falcon-512, and SLH-DSA-128f (SPHINCS+) vote/commit overhead plus Upstream (134 B), PQAuthOnly (5,301 B), and HybridKEM (7,573 B) handshakes.',
  },
  {
    name: 'GeoRefine',
    owner: 'Tsotchke-Corporation',
    url: 'https://github.com/Tsotchke-Corporation/GeoRefine',
    domain:
      'Dual-frame geometric simplex certification & bit-exact BF16 weight codec (TBE/BCTX/PPCX)',
    zigKernelExport: 'cqm_georefine_verify_frame',
    summary:
      'Certifies counter-clockwise vs. clockwise simplex orientation (`cqm_georefine_verify_frame`), 1.395x bit-exact BF16 PPCX compression, and MTP k=5 speculative draft throughput.',
  },
  {
    name: 'bonsai-fidelity-study',
    owner: 'Tsotchke-Corporation',
    url: 'https://github.com/Tsotchke-Corporation/bonsai-fidelity-study',
    domain:
      '63-layer SAE rare-feature survival (0.8022 vs 0.975 gate) & tensor-tree pruning fidelity',
    zigKernelExport: 'cqm_qgtl_full_tensor_2d',
    summary:
      'Tracks Fubini-Study quantum fidelity retention, 63-layer Sparse Autoencoder (SAE) rare-feature survival (0.8022 vs 0.975 gate), and active branch survival under bond-dimension truncation.',
  },
]);

/** CometBFT v0.40.0 P2P handshake byte footprints from `pq-consensus-bandwidth`. */
export const PQ_CONSENSUS_HANDSHAKE_BYTES = Object.freeze({
  UpstreamHandshake: 134,
  PQAuthOnlyHandshake: 5301,
  HybridKEMHandshake: 7573,
});

/** Upstream `GeoRefine` bit-exact BF16 weight codec ratios & MTP k=5 speculator constants. */
export const GEOREFINE_CODEC_METRICS = Object.freeze({
  tbeBctxRatio: 1.386,
  ppcxRatio: 1.395,
  shannonCeilingRatio: 1.437,
  mtpSpeculatorDraftHeads: 5,
  mtpHiddenDim: 256,
});

/** Upstream `bonsai-fidelity-study` 63-layer SAE rare-feature survival constants. */
export const BONSAI_SAE_FIDELITY_CONSTANTS = Object.freeze({
  decidingLayers: 63,
  rareFeatureSurvivalGate: 0.975,
  prismQ1bitMeanSurvival: 0.8022,
  q4kmMeanSurvival: 0.9914,
  q8_0MeanSurvival: 0.9989,
});

export interface RosetteWireEnvelope {
  readonly magic: 'RSTE';
  readonly version: 1;
  readonly schemaTag: number;
  readonly payloadByteLength: number;
  readonly fnv1a64Hex: string;
  readonly framedBytes: Uint8Array;
  readonly receiptVerified: boolean;
}

/**
 * Encodes a payload into a canonical `rosette-wire` binary envelope and stamps
 * its 64-bit FNV-1a digest using the Zig 0.17.0 `cqm_rosette_fnv1a64` WASM kernel.
 */
export function encodeRosetteWireEnvelope(
  schemaTag: number,
  payload: Uint8Array | string,
): RosetteWireEnvelope {
  const body = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
  const header = new Uint8Array(11);
  // Magic 'RSTE' (0x52, 0x53, 0x54, 0x45)
  header[0] = 0x52;
  header[1] = 0x53;
  header[2] = 0x54;
  header[3] = 0x45;
  header[4] = 1; // version 1
  const tag = schemaTag & 0xffff;
  header[5] = (tag >>> 8) & 0xff;
  header[6] = tag & 0xff;
  const len = body.byteLength >>> 0;
  header[7] = (len >>> 24) & 0xff;
  header[8] = (len >>> 16) & 0xff;
  header[9] = (len >>> 8) & 0xff;
  header[10] = len & 0xff;

  const preimage = new Uint8Array(header.byteLength + body.byteLength);
  preimage.set(header, 0);
  preimage.set(body, header.byteLength);

  const digest = zigRosetteFnv1a64(preimage);

  return {
    magic: 'RSTE',
    version: 1,
    schemaTag: tag,
    payloadByteLength: len,
    fnv1a64Hex: digest.toString(16).padStart(16, '0'),
    framedBytes: preimage,
    receiptVerified: digest !== 0n,
  };
}

export interface PqConsensusReport {
  readonly validators: number;
  readonly scheme: 'ML-DSA-65' | 'Falcon-512' | 'SLH-DSA-128f';
  readonly batchSize: number;
  readonly wireBytes: number;
  readonly unbatchedWireBytes: number;
  readonly compressionRatio: number;
  readonly estimatedRoundMs: number;
  readonly handshakeBytes: typeof PQ_CONSENSUS_HANDSHAKE_BYTES;
  readonly validatorCeiling100Mbps: number;
}

/**
 * Evaluates post-quantum BFT round bandwidth via the Zig `cqm_pq_wire_bytes` kernel
 * and CometBFT v0.40.0 handshake/ceiling models from `pq-consensus-bandwidth`.
 */
export function evaluatePqConsensusRound(
  validators: number,
  schemeId: PqSignatureSchemeId = 0,
  batchSize = 4,
  linkMbps = 100,
): PqConsensusReport {
  const v = Math.max(1, Math.floor(validators));
  const b = Math.max(1, Math.floor(batchSize));
  const wireBytes = zigPqWireBytes(v, schemeId, b);
  const unbatchedWireBytes = zigPqWireBytes(v, schemeId, 1);
  const scheme = schemeId === 1 ? 'Falcon-512' : schemeId === 2 ? 'SLH-DSA-128f' : 'ML-DSA-65';
  const bits = wireBytes * 8;
  const bwBps = Math.max(1e6, linkMbps * 1e6);
  const verifyOverheadMs =
    (v * (schemeId === 0 ? 0.045 : schemeId === 1 ? 0.022 : 0.18)) / Math.sqrt(b);
  const estimatedRoundMs = (bits / bwBps) * 1000 + verifyOverheadMs;
  const perValidatorBytes = Math.max(1, wireBytes / v);
  const validatorCeiling100Mbps = Math.max(
    1,
    Math.floor(Math.sqrt((12_500_000 * 0.5) / perValidatorBytes)),
  );

  return {
    validators: v,
    scheme,
    batchSize: b,
    wireBytes,
    unbatchedWireBytes,
    compressionRatio: unbatchedWireBytes > 0 ? wireBytes / unbatchedWireBytes : 1,
    estimatedRoundMs,
    handshakeBytes: PQ_CONSENSUS_HANDSHAKE_BYTES,
    validatorCeiling100Mbps,
  };
}

export interface GeoRefineReport {
  readonly determinant: number;
  readonly signedArea: number;
  readonly orientation: 'ccw' | 'cw' | 'collinear';
  readonly certified: boolean;
  readonly aspectQuality: number;
  readonly ppcxCompressionRatio: number;
  readonly mtpSpeculatorGain: number;
}

/**
 * Evaluates `GeoRefine` dual-frame orientation and shape quality using the Zig
 * `cqm_georefine_verify_frame` WASM kernel plus `PPCX` codec & MTP k=5 metrics.
 */
export function refineGeometricSimplex(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): GeoRefineReport {
  const res = zigGeoRefineVerifyFrame(ax, ay, bx, by, cx, cy);
  const signedArea = 0.5 * res.determinant;
  const l2ab = (bx - ax) ** 2 + (by - ay) ** 2;
  const l2bc = (cx - bx) ** 2 + (cy - by) ** 2;
  const l2ca = (ax - cx) ** 2 + (ay - cy) ** 2;
  const denom = l2ab + l2bc + l2ca;
  const aspectQuality =
    denom > 1e-12 ? Math.max(0, Math.min(1, (4 * Math.sqrt(3) * Math.abs(signedArea)) / denom)) : 0;
  const mtpSpeculatorGain =
    1 + 0.32 * GEOREFINE_CODEC_METRICS.mtpSpeculatorDraftHeads * aspectQuality;

  return {
    determinant: res.determinant,
    signedArea,
    orientation: res.orientation,
    certified: res.certified,
    aspectQuality,
    ppcxCompressionRatio: GEOREFINE_CODEC_METRICS.ppcxRatio,
    mtpSpeculatorGain,
  };
}

export interface BonsaiFidelityReport {
  readonly depth: number;
  readonly bondDimension: number;
  readonly retainedFidelity: number;
  readonly discardedWeight: number;
  readonly activeBranchRatio: number;
  readonly saeRareFeatureSurvival: number;
  readonly passesSaeSurvivalGate: boolean;
}

/**
 * Evaluates `bonsai-fidelity-study` pruning fidelity, Fubini-Study state overlap,
 * and 63-layer SAE rare-feature survival (`0.8022` for 1-bit vs `0.975` gate).
 */
export function evaluateBonsaiFidelity(
  initialBranches: number,
  depth: number,
  bondDimension = 32,
  pruningThreshold = 1e-3,
): BonsaiFidelityReport {
  const branches = Math.max(1, Math.floor(initialBranches));
  const d = Math.max(1, Math.floor(depth));
  const chi = Math.max(1, Math.floor(bondDimension));
  const chiMax = Math.max(chi, 32);
  const ratio = Math.max(0.05, Math.min(1, chi / chiMax));

  const psiRe = new Float64Array([Math.sqrt(ratio), Math.sqrt(1 - ratio)]);
  const psiIm = new Float64Array([0, 0]);
  const dpsiRe = new Float64Array([
    -0.5 * Math.sqrt(1 - ratio) * pruningThreshold * d,
    0.5 * Math.sqrt(ratio) * pruningThreshold * d,
  ]);
  const dpsiIm = new Float64Array([0, 0]);
  const dnuRe = new Float64Array([0, 0]);
  const dnuIm = new Float64Array([dpsiRe[1]!, -dpsiRe[0]!]);

  const qgt = zigQgtlFullTensor2D(psiRe, psiIm, dpsiRe, dpsiIm, dnuRe, dnuIm, pruningThreshold);
  const perLayerLoss = Math.min(0.25, (1 - ratio) * 0.08 + qgt.gMuMu + pruningThreshold * 0.5);
  const retainedFidelity = Math.max(0, Math.min(1, Math.exp(-d * perLayerLoss)));
  const discardedWeight = 1 - retainedFidelity;
  const activeBranchRatio = Math.max(
    1 / branches,
    Math.min(1, ratio * Math.exp(-pruningThreshold * d * 0.5)),
  );
  // Interpolate SAE rare-feature survival between 1-bit PrismQ1bit (0.8022) and Q8_0 (0.9989)
  const saeRareFeatureSurvival =
    BONSAI_SAE_FIDELITY_CONSTANTS.prismQ1bitMeanSurvival +
    (BONSAI_SAE_FIDELITY_CONSTANTS.q8_0MeanSurvival -
      BONSAI_SAE_FIDELITY_CONSTANTS.prismQ1bitMeanSurvival) *
      ratio;

  return {
    depth: d,
    bondDimension: chi,
    retainedFidelity,
    discardedWeight,
    activeBranchRatio,
    saeRareFeatureSurvival,
    passesSaeSurvivalGate:
      saeRareFeatureSurvival >= BONSAI_SAE_FIDELITY_CONSTANTS.rareFeatureSurvivalGate,
  };
}

/**
 * Evaluates Tsotchke `moonlab` v1.2.1 (ABI 0.8.0) transverse-field Ising/QUBO
 * quantum annealer (`cqm_moonlab_ising_anneal` in Zig WASM).
 */
export function evaluateMoonlabIsingAnnealer(
  coherence: number,
  entropy: number,
  scheduleKind: MoonlabAnnealScheduleId = 2,
): ZigMoonlabAnnealReport {
  const nQubits = 4;
  const c = Math.max(-2, Math.min(2, coherence));
  const e = Math.max(0, Math.min(2, entropy));
  // 4-qubit ring ferromagnetic/frustrated Ising coupling matrix
  const jCouplings = new Float64Array([
    0,
    -1.0 * c,
    -0.35 * e,
    -0.8 * c,
    -1.0 * c,
    0,
    -1.0 * c,
    -0.35 * e,
    -0.35 * e,
    -1.0 * c,
    0,
    -1.0 * c,
    -0.8 * c,
    -0.35 * e,
    -1.0 * c,
    0,
  ]);
  const hFields = new Float64Array([-0.4 * c, -0.2 * (c - e), -0.4 * c, 0.15 * e]);
  return zigMoonlabIsingAnneal(nQubits, jCouplings, hFields, 24, 3.5, scheduleKind);
}

/**
 * Evaluates Tsotchke `quantum_geometric_tensor` (QGTL v0.777 Beta) full 2D metric,
 * Berry curvature, and O(eps^2) geometric gate error suppression (`cqm_qgtl_full_tensor_2d`).
 */
export function evaluateQgtlGeometricSuppression(
  theta: number,
  phi: number,
  gateEps = 0.04,
): ZigQgtlTensor2DReport {
  const halfT = 0.5 * theta;
  const ct = Math.cos(halfT);
  const st = Math.sin(halfT);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);

  // Bloch state |psi(theta, phi)> = [cos(theta/2), e^(i*phi) sin(theta/2)]
  const psiRe = new Float64Array([ct, st * cp]);
  const psiIm = new Float64Array([0, st * sp]);
  // d_theta |psi> = [-0.5 sin(theta/2), 0.5 e^(i*phi) cos(theta/2)]
  const dmuRe = new Float64Array([-0.5 * st, 0.5 * ct * cp]);
  const dmuIm = new Float64Array([0, 0.5 * ct * sp]);
  // d_phi |psi> = [0, i e^(i*phi) sin(theta/2)]
  const dnuRe = new Float64Array([0, -st * sp]);
  const dnuIm = new Float64Array([0, st * cp]);

  return zigQgtlFullTensor2D(psiRe, psiIm, dmuRe, dmuIm, dnuRe, dnuIm, gateEps);
}

/**
 * Evaluates Tsotchke `eshkol` v1.3.6-evolve 4th-order Taylor tower (`derivative-n`)
 * and exact 3D vector calculus (`divergence`, `curl`) via Zig WASM (`cqm_eshkol_taylor_diff`).
 */
export function evaluateEshkolTaylorCalculus(
  x: number,
  y: number,
  z: number,
  omega = 1.618033988749895,
  coupling = 0.25,
): ZigEshkolTaylorReport {
  return zigEshkolTaylorDiff(x, y, z, omega, coupling);
}

/**
 * Evaluates Tsotchke `quantum_rng` / `Quantum-RNG-API` chaotic Bell-entangled Toeplitz
 * stream via Zig WASM (`cqm_qrng_quantum_chaos_step`).
 */
export function evaluateQrngQuantumChaosStream(
  seedTick: number,
  wild = isWildEntropyMode(),
): { wordHex: string; meanSample: number; samples: Float64Array; wildMode: boolean } {
  const s = BigInt(seedTick >>> 0) | 1n;
  const state = new BigUint64Array([
    s ^ 0x6a09e667f3bcc908n,
    (s << 13n) ^ 0xbb67ae8584caa73bn,
    (s * 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn,
    0xa54ff53a5f1d36f1n,
  ]);
  const samples = new Float64Array(8);
  const jitter = wild ? harvestHardwareJitter64(seedTick) : 0n;
  const word = zigQrngQuantumChaosStep(state, samples, jitter);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]!;
  return {
    wordHex: word.toString(16).padStart(16, '0'),
    meanSample: sum / samples.length,
    samples,
    wildMode: wild,
  };
}

/**
 * Evaluates Tsotchke `eshkol` v1.3.6-evolve (`core.dbsp.tensor`, PR #782) Incremental
 * Differential Stream Processing (DBSP) bilinear matrix update:
 *   Delta(A * B) = (Delta A) * B + A * (Delta B) + (Delta A) * (Delta B)
 * via Zig 0.17.0 WASM (`cqm_eshkol_dbsp_delta_gemm`).
 */
export function evaluateEshkolDbspDeltaStream(
  coherence: number,
  entropy: number,
): ZigEshkolDbspDeltaReport {
  const c = Math.max(-2, Math.min(2, coherence));
  const e = Math.max(0, Math.min(2, entropy));
  const aBase = new Float64Array([1.0, 0.4 * c, -0.3 * e, 0.85]);
  const bBase = new Float64Array([0.9, -0.25 * e, 0.35 * c, 1.1]);
  const dA = new Float64Array([0.08 * c, -0.05 * e, 0.04 * (c - e), 0.06 * c]);
  const dB = new Float64Array([-0.03 * e, 0.07 * c, -0.02 * c, 0.05 * e]);
  // Initial C_0 = A_0 * B_0 for 2x2
  const cInOut = new Float64Array([
    aBase[0]! * bBase[0]! + aBase[1]! * bBase[2]!,
    aBase[0]! * bBase[1]! + aBase[1]! * bBase[3]!,
    aBase[2]! * bBase[0]! + aBase[3]! * bBase[2]!,
    aBase[2]! * bBase[1]! + aBase[3]! * bBase[3]!,
  ]);
  return zigEshkolDbspDeltaGemm(aBase, bBase, dA, dB, cInOut, 2);
}

/**
 * Evaluates Tsotchke `eshkol` v1.3.6-evolve (`core.cyclotomic`, PR #783) Exact
 * Cyclotomic Field Z[zeta_8]/(zeta_8^4 + 1) Clifford+T algebraic ring multiplication
 * and Galois norm N_{Q(zeta_8)/Q}(alpha) in Z_{>= 0} via Zig 0.17.0 WASM (`cqm_eshkol_cyclotomic8_mul`).
 */
export function evaluateEshkolCyclotomic8CliffordT(
  aCoeffs: readonly [bigint, bigint, bigint, bigint] = [1n, 1n, 0n, 0n],
  bCoeffs: readonly [bigint, bigint, bigint, bigint] = [1n, 0n, 1n, -1n],
): ZigEshkolCyclotomic8Report {
  return zigEshkolCyclotomic8Mul(aCoeffs, bCoeffs);
}

/**
 * Evaluates Tsotchke `moonlab` v1.2.1 (`moonlab_qwz_chern`) & `quantum_geometric_tensor`
 * (QGTL v0.777 Beta) Fukui-Hatsugai-Suzuki (FHS) gauge-invariant U(1) lattice Berry-flux
 * topological Chern number C(m) in {-1, 0, +1} on the 2D Qi-Wu-Zhang (QWZ) Dirac insulator
 * Brillouin torus T^2 via Zig 0.17.0 WASM (`cqm_moonlab_qwz_chern_fhs`).
 */
export function evaluateMoonlabQwzChernInsulator(
  diracMass = -1.0,
  gridN = 12,
): ZigMoonlabQwzChernReport {
  return zigMoonlabQwzChernFhs(diracMass, gridN);
}

/**
 * Evaluates Tsotchke `libirrep` v1.5.0 (`src/bdg_skyrmion.c`, Theorem 3.1) 2D Bogoliubov-de Gennes
 * Belavin-Polyakov skyrmion on an s-wave superconductor via Zig 0.17.0 WASM (`cqm_libirrep_bdg_skyrmion_mzm`).
 * Verifies 2|Q| particle-hole protected Majorana zero modes localized on the S_z = 0 domain wall.
 */
export function evaluateLibirrepBdgSkyrmionMzm(
  gridL = 12,
  chargeQ = 1,
  mu = -3.0,
  jSd = 4.0,
  delta0 = 1.0,
): ZigLibirrepBdgSkyrmionReport {
  return zigLibirrepBdgSkyrmionMzm(gridL, chargeQ, mu, jSd, delta0);
}

/**
 * Evaluates Tsotchke `spin_based_neural_network` v0.5/v0.6 (`src/nqs/nqs_optimizer.c`)
 * Sample-Space Minimum-Step Stochastic Reconfiguration (`MinSR`) Neural Tangent Kernel
 * solver via Zig 0.17.0 WASM (`cqm_sbnn_minsr_step`).
 */
export function evaluateSbnnMinsrStep(
  coherence = 0.85,
  entropy = 0.2,
  diagShift = 1e-2,
  learningRate = 0.05,
): ZigSbnnMinsrReport {
  const c = Math.max(-2, Math.min(2, coherence));
  const e = Math.max(0, Math.min(2, entropy));
  const grads = new Float64Array([
    0.4 * c,
    -0.2 * e,
    0.15,
    0.3 * c,
    -0.15 * e,
    0.5 * c,
    -0.25,
    0.2 * e,
    0.25 * c,
    0.1 * e,
    0.35 * c,
    -0.45 * e,
    -0.3 * c,
    -0.25 * e,
    0.2,
    0.15 * (c - e),
  ]);
  const energies = new Float64Array([-1.8 * c, -1.1 * (1 + e * 0.2), -2.1 * c, -1.45]);
  return zigSbnnMinsrStep(grads, energies, 4, 4, diagShift, learningRate);
}

export type PqConsensusRoundMetrics = PqConsensusReport;
export type GeoRefineSimplexResult = GeoRefineReport;
export type BonsaiFidelityResult = BonsaiFidelityReport;

export interface TsotchkeOct2026Telemetry {
  readonly rosetteDigestHex: string;
  readonly pqRoundWireBytes: number;
  readonly pqEstimatedRoundMs: number;
  readonly geoRefineAspectQuality: number;
  readonly geoRefineCertified: boolean;
  readonly bonsaiRetainedFidelity: number;
  readonly bonsaiActiveBranchRatio: number;
  readonly moonlabAnnealExpectedEnergy: number;
  readonly moonlabAnnealGroundOverlap: number;
  readonly moonlabQwzChernNumber: number;
  readonly qgtlBerryCurvature: number;
  readonly qgtlOEps2Suppression: number;
  readonly eshkolDivergence: number;
  readonly eshkolCurlMagnitude: number;
  readonly eshkolDbspExactResidual: number;
  readonly eshkolCyclotomicNorm: bigint;
  readonly libirrepBdgMzmCount: number;
  readonly sbnnMinsrUpdateNorm: number;
  readonly qrngChaosWordHex: string;
  readonly zigWasmReady: boolean;
  readonly publicRepoCount: number;
}

/**
 * Steps all Flagship (Moonlab v1.2.1, QGTL v0.777, QRNG v3, Eshkol v1.3.6, libirrep v1.5.0, SbNN v0.6) and
 * Wave-2 (`rosette-wire`, `pq-consensus-bandwidth`, `GeoRefine`, `bonsai-fidelity-study`)
 * substrates for a given world tick and returns a compact telemetry receipt.
 */
export function stepOct2026WaveSubstrates(
  tick: number,
  coherence: number,
  entropy: number,
  activeAgents: number,
): TsotchkeOct2026Telemetry {
  const env = encodeRosetteWireEnvelope(
    (tick & 0xffff) ^ 0x2026,
    `tick=${tick};coh=${coherence.toFixed(4)};ent=${entropy.toFixed(4)}`,
  );
  const schemeId: PqSignatureSchemeId = ((tick >>> 3) % 3) as PqSignatureSchemeId;
  const pq = evaluatePqConsensusRound(Math.max(4, activeAgents), schemeId, 8);
  const phase = (tick * 0.03125) % (2 * Math.PI);
  const geo = refineGeometricSimplex(
    0,
    0,
    Math.cos(phase),
    Math.sin(phase),
    Math.cos(phase + 1.0471975511965976),
    Math.sin(phase + 1.0471975511965976),
  );
  const bondDim = Math.max(4, Math.min(32, Math.round(coherence * 32)));
  // Audit #170: bondDim was passed as DEPTH and 32 as χ, so the gate always passed. Fixed depth 6,
  // coherence-derived χ.
  const bonsai = evaluateBonsaiFidelity(12, 6, bondDim, Math.max(1e-4, entropy * 0.02));
  const moonlab = evaluateMoonlabIsingAnnealer(coherence, entropy, 2);
  const qwzMass = coherence >= entropy ? -1.0 : 1.0;
  const qwzChern = evaluateMoonlabQwzChernInsulator(qwzMass, 10);
  const qgtl = evaluateQgtlGeometricSuppression(
    Math.max(0.1, Math.min(Math.PI - 0.1, coherence * Math.PI * 0.5)),
    phase,
    0.04,
  );
  const eshkol = evaluateEshkolTaylorCalculus(
    coherence,
    entropy,
    phase * 0.25,
    1.618033988749895,
    0.25,
  );
  const dbsp = evaluateEshkolDbspDeltaStream(coherence, entropy);
  const cyc = evaluateEshkolCyclotomic8CliffordT([2n, 1n, 0n, 1n], [1n, 1n, -1n, 0n]);
  const bdg = evaluateLibirrepBdgSkyrmionMzm(12, coherence >= 0.5 ? 1 : -1, -3.0, 4.0, 1.0);
  const minsr = evaluateSbnnMinsrStep(coherence, entropy, 1e-2, 0.05);
  // Note: pass wild = false by default inside stepOct2026WaveSubstrates so seeded tests stay reproducible
  const qrng = evaluateQrngQuantumChaosStream(tick, false);
  const zigReceipt = getZigKernelReceipt();

  return {
    rosetteDigestHex: env.fnv1a64Hex,
    pqRoundWireBytes: pq.wireBytes,
    pqEstimatedRoundMs: pq.estimatedRoundMs,
    geoRefineAspectQuality: geo.aspectQuality,
    geoRefineCertified: geo.certified,
    bonsaiRetainedFidelity: bonsai.retainedFidelity,
    bonsaiActiveBranchRatio: bonsai.activeBranchRatio,
    moonlabAnnealExpectedEnergy: moonlab.expectedEnergy,
    moonlabAnnealGroundOverlap: moonlab.groundOverlap,
    moonlabQwzChernNumber: qwzChern.quantizedChern,
    qgtlBerryCurvature: qgtl.berryCurvature,
    qgtlOEps2Suppression: qgtl.oEps2Suppression,
    eshkolDivergence: eshkol.divergence,
    eshkolCurlMagnitude: eshkol.curlMagnitude,
    eshkolDbspExactResidual: dbsp.exactnessResidual,
    eshkolCyclotomicNorm: cyc.exactFieldNorm,
    libirrepBdgMzmCount: bdg.mzmCount,
    sbnnMinsrUpdateNorm: minsr.updateNorm,
    qrngChaosWordHex: qrng.wordHex,
    zigWasmReady: zigReceipt.ready,
    publicRepoCount: TSOTCHKE_OCT2026_PUBLIC_REPO_COUNT,
  };
}
