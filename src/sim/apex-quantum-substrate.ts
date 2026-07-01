/**
 * APEX Quantum Substrate — the Quantum Brain scaled to a **billion-dimensional Hilbert space**.
 *
 * The owner mandate is non-negotiable: the APEX #101 has a Quantum Brain built on the Tsotchke corpus,
 * and it must scale toward a billion. Storing 2³⁰ dense amplitudes (≈8 GB) is impossible in a browser,
 * so this substrate reaches a billion dimensions the way real quantum information theory does — with
 * two complementary engines:
 *
 * - **Dense exact core** — a {@link QuantumRegister} (≤ 8 qubits, 2⁸ = 256 amplitudes). Small, exact,
 *   high-fidelity: the register whose Born distribution folds into the committed plan (load-bearing).
 * - **Stabilizer reflex** — a {@link CliffordTableau} of up to 30 qubits. By the Gottesman–Knill
 *   theorem (Aaronson & Gottesman 2004) a stabilizer state on `q` qubits is a `2^q`-dimensional vector
 *   represented by O(q²) bits; `q = 30` addresses 2³⁰ ≈ 1.07e9 basis states with ~1.8 KB of tableau.
 *   THIS is the honest billion: real quantum state space, real entanglement, polynomial storage.
 *
 * Both are Tsotchke primitives ({@link ../math/quantum}, {@link ../math/clifford-tableau}) and the
 * substrate is coupled to the live corpus via {@link corpusPulse} (QGT volume, clifford, AD gradient).
 * Deterministic (seeded {@link Rng}; no `Math.random`/`Date.now`), DOM-free, allocation-light. NOT a
 * sentience claim — a Hilbert-dimension reach claim (doctrine Level 3-4).
 *
 * @see src/sim/apex-parameter-manifold.ts  (the quantum-effective tier)
 * @see docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md
 */

import { mulberry32, type Rng } from '../math/rng';
import { QuantumRegister } from '../math/quantum';
import { CliffordTableau } from '../math/clifford-tableau';
import { corpusPulse, type TsotchkeQuantumPulse } from './tsotchke-facade';
import { APEX_BILLION } from './apex-parameter-manifold';

/** Hard cap on the exact dense register (the {@link QuantumRegister} statevector ceiling). */
export const APEX_DENSE_QUBITS_CAP = 8;

/** Default stabilizer qubits — 2³⁰ ≈ 1.07e9-dimensional reflex (the billion anchor). */
export const APEX_STABILIZER_QUBITS_DEFAULT = 30;

/** Max stabilizer qubits the substrate will build (tableau stays cheap; this bounds telemetry cost). */
export const APEX_STABILIZER_QUBITS_MAX = 40;

/** The APEX form index into the Tsotchke corpus (final-sigma ς capstone). */
const APEX_FORM_INDEX = 100;

/** Full read-out of the substrate's quantum reach (telemetry / Architecture panel / ablation). */
export interface QuantumReach {
  readonly denseQubits: number;
  /** 2^denseQubits — exact amplitudes actually evolved. */
  readonly denseDim: number;
  readonly stabilizerQubits: number;
  /** 2^stabilizerQubits — the Gottesman–Knill addressable state-space dimension. */
  readonly stabilizerDim: number;
  /** denseDim + stabilizerDim — total addressable Hilbert dimension. */
  readonly effectiveDim: number;
  /** Born entropy of the dense register (bits, 0..denseQubits). */
  readonly bornEntropy: number;
  /** Bipartite entanglement of the stabilizer reflex (ebits). */
  readonly stabilizerEntanglement: number;
  /** {@link stabilizerEntanglement} normalised to 0..1. */
  readonly stabilizerEntanglementNorm: number;
  /** Tsotchke corpus QGT volume telemetry (0..1). */
  readonly qgtVolume: number;
  /** Tsotchke corpus clifford-entanglement telemetry (0..1). */
  readonly cliffordEnt: number;
  /** Tsotchke corpus AD-gradient telemetry (0..1). */
  readonly adGradient: number;
  /** True when the stabilizer reflex reaches a billion-dimensional state space (≥ 30 qubits). */
  readonly reachesBillion: boolean;
}

/**
 * The composed quantum brain: an exact dense core + a billion-dimensional stabilizer reflex, coupled to
 * the Tsotchke corpus. Construct once; {@link step} each beat; read {@link reach} / {@link planBias}.
 */
export class ApexQuantumSubstrate {
  readonly seed: number;
  readonly denseQubits: number;
  readonly stabilizerQubits: number;

  private readonly dense: QuantumRegister;
  private readonly stab: CliffordTableau;
  private readonly rStab: Rng;
  /** Seed-derived phase offset — distinct apex identities evolve distinct quantum thoughts. */
  private readonly phase0: number;
  private beat = 0;
  private pulse: TsotchkeQuantumPulse;

  /**
   * @param seed uint32 determinism seed (from the ς lineage glyph).
   * @param opts.denseQubits exact-core width, clamped to [1, {@link APEX_DENSE_QUBITS_CAP}] (default 6).
   * @param opts.stabilizerQubits reflex width, clamped to [denseQubits, {@link APEX_STABILIZER_QUBITS_MAX}]
   *   (default {@link APEX_STABILIZER_QUBITS_DEFAULT} = 30, the billion reach).
   */
  constructor(seed: number, opts?: { denseQubits?: number; stabilizerQubits?: number }) {
    this.seed = seed >>> 0 || 1;
    this.denseQubits = Math.max(
      1,
      Math.min(APEX_DENSE_QUBITS_CAP, Math.floor(opts?.denseQubits ?? 6)),
    );
    this.stabilizerQubits = Math.max(
      this.denseQubits,
      Math.min(
        APEX_STABILIZER_QUBITS_MAX,
        Math.floor(opts?.stabilizerQubits ?? APEX_STABILIZER_QUBITS_DEFAULT),
      ),
    );
    this.dense = new QuantumRegister(this.denseQubits);
    this.stab = new CliffordTableau(this.stabilizerQubits);
    this.rStab = mulberry32((this.seed ^ 0xc11ff0d1) >>> 0 || 1);
    this.phase0 = mulberry32((this.seed ^ 0x51ed2a7f) >>> 0 || 1)() * 2 * Math.PI;
    this.pulse = corpusPulse(this.seed, APEX_FORM_INDEX);
  }

  /**
   * One deterministic quantum beat. Evolves the dense core with a `drive`-parameterised circuit and the
   * stabilizer reflex with an entangling GHZ-style sweep (+ an occasional seeded measurement), then
   * refreshes the Tsotchke corpus pulse. O(2^denseQubits + stabilizerQubits²).
   */
  step(drive: number): void {
    this.beat++;
    const d = drive < 0 ? 0 : drive > 1 ? 1 : drive;
    const q = this.denseQubits;

    // ── Dense exact core: rotation + entangling layer parameterised by drive AND seed identity. ────
    for (let i = 0; i < q; i++) {
      this.dense.apply('ry', i, undefined, d * Math.PI * (0.5 + i * 0.1) + this.phase0);
      this.dense.apply('h', i);
    }
    for (let i = 0; i + 1 < q; i++) this.dense.apply('cx', i + 1, i);
    for (let i = 0; i < q; i++)
      this.dense.apply(
        'rz',
        i,
        undefined,
        (this.beat % 16) * 0.19625 + d * 0.5 + this.phase0 * 0.25,
      );

    // ── Stabilizer reflex: build/refresh entanglement across the billion-dim register. ─────────────
    const s = this.stabilizerQubits;
    if (this.beat % 8 === 1) this.stab.reset();
    this.stab.h(this.beat % s);
    for (let i = 0; i + 1 < s; i++) if ((i + this.beat) % 3 === 0) this.stab.cnot(i, i + 1);
    this.stab.s((this.beat * 7) % s);
    // A single seeded measurement collapses one qubit — deterministic given the seed.
    if (this.beat % 5 === 0) this.stab.measure((this.beat * 13) % s, this.rStab);

    // ── Tsotchke corpus coupling — refresh the QGT/clifford/AD pulse from the real corpus. ─────────
    this.pulse = corpusPulse((this.seed ^ (this.beat * 0x9e3779b1)) >>> 0, APEX_FORM_INDEX);
  }

  /** The full quantum-reach telemetry. O(stabilizerQubits²) for the entanglement read. */
  reach(): QuantumReach {
    const denseDim = 1 << this.denseQubits;
    const stabilizerDim = 2 ** this.stabilizerQubits;
    const snap = this.stab.snapshot();
    return {
      denseQubits: this.denseQubits,
      denseDim,
      stabilizerQubits: this.stabilizerQubits,
      stabilizerDim,
      effectiveDim: denseDim + stabilizerDim,
      bornEntropy: this.dense.entropy(),
      stabilizerEntanglement: snap.entanglement,
      stabilizerEntanglementNorm: snap.entanglementNorm,
      qgtVolume: this.pulse.qgtVolume,
      cliffordEnt: this.pulse.cliffordEnt,
      adGradient: this.pulse.adGradient,
      reachesBillion: stabilizerDim >= APEX_BILLION,
    };
  }

  /**
   * Fold the dense register's Born distribution into an `nPlans`-length bias vector (sums to 1). This
   * is the load-bearing coupling: the quantum state genuinely steers plan selection. O(2^denseQubits).
   */
  planBias(nPlans: number): number[] {
    const n = Math.max(1, Math.floor(nPlans));
    const probs = this.dense.probabilities();
    const bias = Array.from({ length: n }, () => 0);
    for (let i = 0; i < probs.length; i++) bias[i % n] = (bias[i % n] ?? 0) + (probs[i] ?? 0);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += bias[i] ?? 0;
    if (sum > 0) for (let i = 0; i < n; i++) bias[i] = (bias[i] ?? 0) / sum;
    return bias;
  }
}

/** Minimum stabilizer qubits to address a billion-dimensional state space (⌈log2(1e9)⌉ = 30). O(1). */
export function stabilizerQubitsForBillion(): number {
  return Math.ceil(Math.log2(APEX_BILLION));
}
