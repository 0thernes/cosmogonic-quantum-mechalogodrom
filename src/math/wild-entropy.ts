/**
 * Dual-Mode Wild Quantum-Chaos Entropy Substrate (`src/math/wild-entropy.ts`).
 *
 * Implements the live browser Wild Quantum-Chaos execution regime (`wild = true`)
 * while leaving `src/math/rng.ts` byte-for-byte frozen for V4 Phase-A preregistration:
 *   1. **Seeded Reproducible Mode** (`wild = false`, default for unit tests, golden replays, and benchmarks):
 *      Every draw flows through `mulberry32(seed)` in `src/math/rng.ts`.
 *   2. **Wild Quantum-Chaos Mode** (`wild = true`, live browser / untamed emergence):
 *      Harvests non-deterministic hardware CSPRNG (`crypto.getRandomValues`), high-resolution
 *      timing jitter (`performance.now`), and Tsotchke's `quantum_rng` / `Quantum-RNG-API`
 *      chaotic Bell-entangled Toeplitz extractor compiled in Zig 0.17.0 WASM
 *      (`zigQrngQuantumChaosStep`).
 */

import { mulberry32, type Rng } from './rng';
import { zigQrngQuantumChaosStep } from './zig-bridge';

let _wildEntropyMode = false;

/** Enable or disable global Wild Non-Deterministic Quantum-Chaos entropy mode. */
export function setWildEntropyMode(enabled: boolean): void {
  _wildEntropyMode = Boolean(enabled);
}

/** Query whether global Wild Non-Deterministic Quantum-Chaos entropy mode is active. */
export function isWildEntropyMode(): boolean {
  return _wildEntropyMode;
}

/**
 * Harvests a 64-bit non-deterministic hardware & timing jitter word.
 * Combines Web Crypto CSPRNG (`crypto.getRandomValues`), microsecond timer jitter,
 * and wall-clock phase when available.
 */
export function harvestHardwareJitter64(salt = 0): bigint {
  let hi = (salt >>> 0) ^ 0x9e3779b9;
  let lo = Math.imul(salt ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;

  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const buf = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buf);
    hi ^= buf[0]!;
    lo ^= buf[1]!;
  } else {
    const r = Math.floor(Math.random() * 4294967296) >>> 0;
    hi ^= r;
    lo ^= Math.imul(r ^ 0x27d4eb2d, 0x165667b1) >>> 0;
  }

  if (
    typeof globalThis.performance !== 'undefined' &&
    typeof globalThis.performance.now === 'function'
  ) {
    const nowNs = Math.floor(globalThis.performance.now() * 1e6);
    lo = (lo ^ (nowNs >>> 0)) >>> 0;
    hi = (hi ^ Math.floor(nowNs / 4294967296)) >>> 0;
  }

  const wall = Date.now();
  lo = (lo ^ (wall >>> 0)) >>> 0;
  return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0);
}

/**
 * Creates a non-deterministic Tsotchke `quantum_rng` / `Quantum-RNG-API` stream backed by
 * the Zig 0.17.0 `cqm_qrng_quantum_chaos_step` WASM kernel and hardware CSPRNG + timer jitter.
 * Replenishes a 64-sample batch at a time for O(1) amortized zero-GC draws.
 */
export function createWildQuantumRng(baseSeed = 0x517cc1b7): Rng {
  const s = baseSeed >>> 0;
  const stateWords = new BigUint64Array([
    BigInt(s) ^ 0x6a09e667f3bcc908n,
    (BigInt(s) << 17n) ^ 0xbb67ae8584caa73bn,
    harvestHardwareJitter64(s),
    0xa54ff53a5f1d36f1n,
  ]);
  const batch = new Float64Array(64);
  let cursor = batch.length;
  let epoch = 0;

  return () => {
    if (cursor >= batch.length) {
      epoch = (epoch + 1) | 0;
      const jitter = harvestHardwareJitter64(s ^ epoch);
      zigQrngQuantumChaosStep(stateWords, batch, jitter);
      cursor = 0;
    }
    const val = batch[cursor]!;
    cursor++;
    return val;
  };
}

/**
 * Creates a dual-mode RNG: returns a wild non-deterministic quantum-chaos stream when
 * `wild` (or global `isWildEntropyMode()`) is true, and deterministic `mulberry32(seed)`
 * otherwise.
 */
export function createDualModeRng(seed: number, wild = _wildEntropyMode): Rng {
  return wild ? createWildQuantumRng(seed) : mulberry32(seed);
}
