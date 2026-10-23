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

/**
 * 4-round Philox-2x32 stateless counter-based bijection (`(seed, tick, entityId, channel) -> uint32`).
 *
 * Eliminates the single-thread sequential RNG lockstep bottleneck: any CPU worker thread,
 * WebGPU compute workgroup, or NPU cohort can evaluate `(seed, tick, entityId, channel)` in
 * arbitrary parallel order and obtain the exact same bit-reproducible uint32 word.
 */
export function philoxCounter32(seed: number, tick: number, entityId: number, channel = 0): number {
  let c0 = (entityId ^ Math.imul(channel >>> 0, 0x9e3779b9)) >>> 0;
  let c1 = (tick ^ Math.imul(channel >>> 0, 0x85ebca6b)) >>> 0;
  let k0 = (seed ^ 0x243f6a88) >>> 0;
  let k1 = (Math.imul(seed >>> 0, 0x6d2b79f5) ^ 0xb7e15162) >>> 0;

  for (let round = 0; round < 4; round++) {
    const prodLo = Math.imul(c0, 0xd2511f53) >>> 0;
    const prodHi = Math.imul(c0 ^ (c0 >>> 16), 0xcd9e8d57) >>> 0;
    const next0 = (prodHi ^ c1 ^ k0) >>> 0;
    const next1 = (prodLo ^ k1) >>> 0;
    c0 = next0;
    c1 = next1;
    k0 = (k0 + 0x9e3779b9) >>> 0;
    k1 = (k1 + 0xbb67ae85) >>> 0;
  }
  const mixed = (c0 ^ c1 ^ (c0 >>> 15)) >>> 0;
  return (Math.imul(mixed ^ (mixed >>> 13), 0xc2b2ae35) ^ (mixed >>> 16)) >>> 0;
}

/**
 * Stateless parallel uniform sample in `[0, 1)`.
 * - In **Seeded Reproducible Mode** (`wild = false`): pure O(1) function of `(seed, tick, entityId, channel)`
 *   — 100% invariant to thread count, shard size, or execution order.
 * - In **Wild Quantum-Chaos Mode** (`wild = true`): XORs hardware timing/CSPRNG salt into the seed.
 */
export function sampleParallelCounter01(
  seed: number,
  tick: number,
  entityId: number,
  channel = 0,
  wild = false,
): number {
  const effectiveSeed = wild
    ? (seed ^ Number(harvestHardwareJitter64(seed ^ tick ^ entityId) & 0xffffffffn)) >>> 0
    : seed >>> 0;
  return philoxCounter32(effectiveSeed, tick, entityId, channel) / 4294967296;
}

/**
 * Fill a contiguous `Float32Array` slice for a shard `[startEntity, startEntity + count)`
 * using stateless parallel counter evaluation. Safe for multi-worker `SharedArrayBuffer` shards.
 */
export function fillParallelCounterShard(
  out: Float32Array,
  seed: number,
  tick: number,
  startEntity: number,
  count: number,
  channel = 0,
  wild = false,
): Float32Array {
  const n = Math.max(0, Math.min(count, out.length));
  const effectiveSeed = wild
    ? (seed ^ Number(harvestHardwareJitter64(seed ^ tick ^ startEntity) & 0xffffffffn)) >>> 0
    : seed >>> 0;
  for (let i = 0; i < n; i++) {
    out[i] = philoxCounter32(effectiveSeed, tick, startEntity + i, channel) / 4294967296;
  }
  return out;
}

/**
 * Create a per-entity `Rng` closure backed by `sampleParallelCounter01`, advancing only the
 * entity-local `channel` counter. Evaluating entity `A` never perturbs entity `B`'s stream.
 */
export function createParallelEntityRng(
  seed: number,
  tick: number,
  entityId: number,
  wild = false,
): Rng {
  let channel = 0;
  return () => {
    const val = sampleParallelCounter01(seed, tick, entityId, channel, wild);
    channel = (channel + 1) | 0;
    return val;
  };
}
