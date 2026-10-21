/**
 * ESHKOL / TSOTCHKE DETERMINISTIC STATE-VECTOR RNG ADAPTER
 *
 * Preserves Cosmogonic's long-standing `EshkolQrng` API while replacing the legacy phase-array mixer
 * with the bounded 8-qubit classical state-vector model in `deterministic-statevector-rng.ts`.
 * The model is adapted from the architecture of Tsotchke quantum_rng v3.0.1 at commit
 * `a00ad483cbbef31ea7536f09ae99409d81c9a823`; it is not a direct/native port.
 *
 * Every output is deterministic from the injected project `Rng`, so snapshots and world replays remain
 * reproducible. The unitary gates and Born-rule collapse are real state-vector algebra executed on a
 * classical computer. This is NOT hardware quantum entropy, NOT a CSPRNG, NOT SP 800-90B validation,
 * and NOT evidence from a physical Bell experiment. Use it only for simulation exploration/mutation.
 */

import type { Rng } from './rng';
import { harvestHardwareJitter64, isWildEntropyMode } from './wild-entropy';
import { zigQrngQuantumChaosStep } from './zig-bridge';
import {
  DeterministicStatevectorRng,
  STATEVECTOR_RNG_SECURITY_BOUNDARY,
  type StatevectorOutputHealth,
} from './deterministic-statevector-rng';

/** Public compatibility constant: the adapter models eight qubits. */
export const ESHKOL_QUBITS = 8;

/** Read-only telemetry consumed by the BRAIN view and SuperMind snapshots. */
export interface EshkolQrngSnapshot {
  qubits: number;
  /** Deterministic circuit-evolution cursor. */
  steps: number;
  /** Total 64-bit words served. */
  draws: number;
  /** Marginal Born probability P(q=1) for each qubit, length 8. */
  amplitudes: number[];
  /** Sixteen contiguous basis-probability buckets, length 16 and sum approximately 1. */
  pool: number[];
  /** Most recent 64-bit output word as a high-bit-first bit string. */
  lastBits: string;
  /** Normalized binary Shannon entropy of the bounded diagnostic window. */
  entropyEstimate: number;
  modelVersion: 'v3.0.1-deterministic-classical-statevector-adaptation';
  securityBoundary: typeof STATEVECTOR_RNG_SECURITY_BOUNDARY;
  health: StatevectorOutputHealth;
}

export class EshkolQrng {
  private readonly model: DeterministicStatevectorRng;
  private readonly zigState: BigUint64Array;
  private readonly zigScratch: Float64Array;

  constructor(seed: Rng) {
    this.model = new DeterministicStatevectorRng(seed, {
      qubits: ESHKOL_QUBITS,
      evolutionRounds: 2,
      healthWindowBits: 1024,
      repetitionCutoff: 32,
    });
    const initA = BigInt(Math.floor(seed() * 0xffffffff)) | 1n;
    const initB = BigInt(Math.floor(seed() * 0xffffffff)) | 3n;
    this.zigState = new BigUint64Array([
      initA ^ 0x6a09e667f3bcc908n,
      initB ^ 0xbb67ae8584caa73bn,
      (initA << 32n) | initB,
      0xa54ff53a5f1d36f1n,
    ]);
    this.zigScratch = new Float64Array(1);
  }

  /** Next deterministic 64-bit state-vector/Born-collapse output word (or wild quantum-chaos word when wild mode is enabled). */
  nextU64(): bigint {
    const base = this.model.nextU64();
    if (isWildEntropyMode()) {
      const jitter = harvestHardwareJitter64(Number(base & 0xffffffffn));
      const chaos = zigQrngQuantumChaosStep(this.zigState, this.zigScratch, jitter);
      return BigInt.asUintN(64, base ^ chaos);
    }
    return base;
  }

  /** Double in `[0,1)`, constructed from the high 53 output bits (or Zig quantum-chaos mixer in wild mode). */
  next01(): number {
    if (isWildEntropyMode()) {
      const u64 = this.nextU64();
      return Number(u64 >> 11n) * (1 / 9007199254740992);
    }
    return this.model.next01();
  }

  /** Fast Zig WASM batch quantum-chaos draw (`cqm_qrng_quantum_chaos_step`). */
  nextZigBatch(target: Float64Array | number, wild = isWildEntropyMode()): bigint {
    const out =
      typeof target === 'number'
        ? new Float64Array(Math.max(1, Math.min(4096, Math.floor(target))))
        : target;
    const jitter = wild ? harvestHardwareJitter64(out.length) : 0n;
    return zigQrngQuantumChaosStep(this.zigState, out, jitter);
  }

  /** Drop-in project `Rng` closure. */
  stream(): Rng {
    return () => this.next01();
  }

  /**
   * Low-cadence telemetry. The underlying full snapshot allocates by design; simulation output methods
   * remain allocation-free. Marginals and basis buckets expose actual state-vector probabilities rather
   * than the old quantum-inspired phase/noise values.
   */
  snapshot(): EshkolQrngSnapshot {
    const snapshot = this.model.snapshot();
    const amplitudes = Array.from({ length: ESHKOL_QUBITS }, () => 0);
    const pool = Array.from({ length: 16 }, () => 0);
    for (let basis = 0; basis < snapshot.dimension; basis++) {
      const real = snapshot.real[basis] ?? 0;
      const imag = snapshot.imag[basis] ?? 0;
      const probability = real * real + imag * imag;
      for (let q = 0; q < ESHKOL_QUBITS; q++) {
        if ((basis & (1 << q)) !== 0) amplitudes[q] = (amplitudes[q] ?? 0) + probability;
      }
      const bucket = Math.min(15, Math.floor((basis * 16) / snapshot.dimension));
      pool[bucket] = (pool[bucket] ?? 0) + probability;
    }

    const health = this.model.health();
    const p = health.proportionOnes;
    const entropyEstimate =
      health.sampleBits === 0 || p <= 0 || p >= 1
        ? 0
        : Math.max(0, Math.min(1, -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)));
    const lastBits = BigInt(`0x${snapshot.lastWord}`).toString(2).padStart(64, '0');
    return {
      qubits: ESHKOL_QUBITS,
      steps: snapshot.cursor,
      draws: snapshot.draws,
      amplitudes,
      pool,
      lastBits,
      entropyEstimate,
      modelVersion: 'v3.0.1-deterministic-classical-statevector-adaptation',
      securityBoundary: STATEVECTOR_RNG_SECURITY_BOUNDARY,
      health,
    };
  }
}
