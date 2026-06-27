/**
 * THE ESHKOL QUANTUM RNG (V84) — a faithful, deterministic TypeScript port of the Tsotchke
 * "quantum-inspired" random number generator (the Eshkol qubit-RNG: an 8-qubit "phase array + noise"
 * simulator with a 16-slot entropy pool and physical-constant mixing cascades). This is no longer a
 * *study* of the algorithm — it is the algorithm, reimplemented gate-for-gate and constant-for-constant
 * from the upstream C source (full local corpus at Z:\[Vibe Coded (AI)]\(Tsotchke)\Eshkol\eshkol_repo\lib\quantum\quantum_rng.c + .h + docs/breakdown/QUANTUM_RNG.md), then wired into the Super Creature's Quantum Computing Mind so the apex
 * psyche literally collapses its "thoughts" through the Eshkol generator.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/quantum_rng — `src/quantum_rng/quantum_rng.c` (MIT, © 2024 tsotchke). The same primitive
 *   ships inside the Eshkol language (`lib/quantum/quantum_rng.c`) as the `quantum-random` builtin.
 *   Ported verbatim here: `quantum_noise` (the Heisenberg-uncertainty transcendental), `splitmix64`,
 *   `hadamard_mix`, `hadamard_gate`, `phase_gate`, `measure_state`, `quantum_step`, the buffer/double
 *   conversion, and every physical-constant mixing word (fine-structure, Planck, Rydberg, Heisenberg,
 *   Schrödinger, the three Pauli words, …). Full corpus adds QRNG_SQRT2, enhanced wrappers, ctx, get_system/runtime_entropy (host in upstream; det surrogate here).
 *
 * THE ONE DELIBERATE DEVIATION — determinism (CLAUDE.md operational law; docs/PHILOSOPHY-2026-06-26.md): the
 * upstream draws unpredictability from the host (`gettimeofday`/`rdtsc`/PID/stack ASLR via
 * `get_system_entropy`/`get_runtime_entropy`). Sim randomness in this repo MUST be reproducible from a
 * seed (no `Math.random`/`Date.now` in sim logic), so those host-entropy sources are replaced by a
 * single seeded {@link Rng} stream + an internal golden-ratio "runtime" surrogate that advances every
 * measurement. Everything downstream of the entropy source — the quantum simulation itself — is
 * upstream-exact, so the same seed replays the same quantum bitstream.
 *
 * Cost: a {@link quantumStep} runs 4 mixing rounds × 8 qubits of gates + 16 output words; it refills a
 * 16-word buffer, so the amortised cost of one {@link next01} draw is ~1/16 of a step. The integer
 * pipeline uses {@link bigint} (exact 64-bit wraparound); only the apex creature draws from it, at its
 * cognitive cadence — well within the frame budget (see bench/eshkol-qrng.bench.ts).
 *
 * WIRED FROM FULL TSOTCHKE CORPUS: see docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md (Eshkol AD + this QRNG, Moonlab qgt/Bloch, etc.). Used for all 5 Archons collapse/entropy.
 */

import type { Rng } from './rng';

/** Qubits in the simulated register (upstream QRNG_NUM_QUBITS). */
export const ESHKOL_QUBITS = 8;
/** Mixing rounds per {@link quantumStep} (upstream QRNG_MIXING_ROUNDS). */
const MIXING_ROUNDS = 4;
/** Output buffer width in 64-bit words (upstream 128-byte buffer ÷ 8). */
const BUFFER_WORDS = 16;

const MASK = (1n << 64n) - 1n; // 0xFFFF…FFFF — the 64-bit ring
const U64_MAX_D = 2 ** 64; // UINT64_MAX promotes to this f64 — matches the C `(double)x / UINT64_MAX`
const m64 = (x: bigint): bigint => x & MASK;

// ── Physical-constant mixing words (upstream quantum_rng.c:11–23), verbatim ──
const FINE_STRUCTURE = 0x7297352743776a1bn;
const PLANCK = 0x6955927086495225n;
const RYDBERG = 0x9e3779b97f4a7c15n; // == GOLDEN_RATIO upstream
const GOLDEN_RATIO = 0x9e3779b97f4a7c15n;
const ELECTRON_G = 0x2b992ddfa232945n;
const HEISENBERG = 0xc13fa9a902a6328fn;
const SCHRODINGER = 0x91e10da5c79e7b1dn;
const PAULI_X = 0x4c957f2d8a1e6b3cn;
const PAULI_Y = 0xd3e99e3b6c1a4f78n;
const PAULI_Z = 0x8f142fc07892a5b6n;
// splitmix64 avalanche multipliers (upstream quantum_rng.c:61,63)
const SMX_A = 0xbf58476d1ce4e5b9n;
const SMX_B = 0x94d049bb133111ebn;

// The fine-structure / Planck words as DOUBLES — the C `quantum_noise` multiplies the f64 `noise` by
// the (implicitly f64-promoted) uint64 macro, so we reproduce that promotion exactly.
const FINE_STRUCTURE_D = Number(FINE_STRUCTURE);
const PLANCK_D = Number(PLANCK);

/** UINT64 → [0,1) the way the C casts it: `(double)x / UINT64_MAX` (intentionally lossy — f64 keeps the
 *  top ~53 bits, faithfully mirroring the upstream double cast). */
const u64ToUnit = (x: bigint): number => Number(x) / U64_MAX_D;
/** Double in [0,~] → uint64 the way the C casts it: `(uint64_t)(d * UINT64_MAX)`. */
const unitToU64 = (d: number): bigint => m64(BigInt(Math.floor(d * U64_MAX_D)));

/**
 * The Heisenberg-uncertainty transcendental (upstream `quantum_noise`, quantum_rng.c:37–56). Maps any
 * real to [0, 0.5] via a sin·cos beat, a momentum²+position² uncertainty term, a tunnelling sqrt, and a
 * fractional-part normalisation. NaN-free for all finite inputs (the sqrt argument stays in [0, 0.25]).
 */
function quantumNoise(x: number): number {
  let noise = Math.sin(x * Math.PI) * Math.cos(x * Math.E);
  noise = Math.abs(noise);
  const momentum = Math.cos(noise * FINE_STRUCTURE_D);
  const position = Math.sin(noise * PLANCK_D);
  noise = (momentum * momentum + position * position) * 0.5; // ∈ [0, 1]
  noise = Math.sqrt(noise * (1 - noise)); // tunnelling; ∈ [0, 0.5]
  return noise - Math.floor(noise);
}

/** splitmix64 with the upstream's extra Heisenberg avalanche tail (quantum_rng.c:59–68). */
function splitmix64(x0: bigint): bigint {
  let x = m64(x0);
  x = m64((x ^ (x >> 30n)) * SMX_A);
  x = m64((x ^ (x >> 27n)) * SMX_B);
  x = m64((x ^ (x >> 31n)) * HEISENBERG);
  x ^= x >> 29n;
  return m64(x);
}

/** The Pauli-word avalanche used throughout the generator (upstream `hadamard_mix`, :71–81). */
function hadamardMix(x0: bigint): bigint {
  let x = splitmix64(x0);
  x = m64(x ^ m64(PAULI_X * (x >> 12n)));
  x = m64(x * FINE_STRUCTURE);
  x = m64(x ^ m64(PAULI_Y * (x >> 25n)));
  x = m64(x * PLANCK);
  x = m64(x ^ m64(PAULI_Z * (x >> 27n)));
  x = m64(x * SCHRODINGER);
  x ^= x >> 13n;
  return m64(x);
}

/** Simulated Hadamard gate: superposition + phase rotation through {@link quantumNoise} (:119–135). */
function hadamardGate(x: bigint): bigint {
  const state = quantumNoise(u64ToUnit(m64(x)));
  let superposition = m64(unitToU64(state) ^ m64(x));
  superposition = hadamardMix(superposition);
  const phase = quantumNoise(state + 0.5);
  superposition = m64(superposition ^ unitToU64(phase));
  return hadamardMix(superposition);
}

/** Simulated phase gate with Pauli entanglement mixing (upstream `phase_gate`, :138–152). */
function phaseGate(x: bigint, angle: bigint): bigint {
  const phase = quantumNoise(u64ToUnit(m64(angle)));
  let mixed = hadamardMix(m64(unitToU64(phase) * RYDBERG));
  mixed = m64(mixed ^ m64(PAULI_X * (mixed >> 17n)));
  mixed = m64(mixed * HEISENBERG);
  mixed = m64(mixed ^ m64(PAULI_Y * (mixed >> 23n)));
  mixed = m64(mixed * SCHRODINGER);
  return m64(m64(x) ^ mixed);
}

/** Read-only telemetry of the live generator for the BRAIN view (built at UI cadence). */
export interface EshkolQrngSnapshot {
  /** Simulated qubits in the register (always {@link ESHKOL_QUBITS}). */
  qubits: number;
  /** Quantum-step count since construction (advances every {@link BUFFER_WORDS} draws). */
  steps: number;
  /** Total {@link next01}/{@link nextU64} draws served. */
  draws: number;
  /** The 8 continuous qubit amplitudes (each ∈ [0, 0.5] from {@link quantumNoise}). */
  amplitudes: number[];
  /** The 16-slot entropy pool (each ∈ [0, 0.5]). */
  pool: number[];
  /** The most recent 64-bit output word as a bitstring (high bit first). */
  lastBits: string;
  /** Shannon-entropy estimate (bits/sample, 0..1 normalised) of the last buffer of words. */
  entropyEstimate: number;
}

/**
 * The Eshkol quantum random-number generator. Construct ONCE with a dedicated seeded {@link Rng}
 * (its own stream — sampling from it never perturbs sim determinism elsewhere). Pull `[0,1)` doubles
 * with {@link next01} or wire {@link stream} straight into any API that wants an {@link Rng}.
 */
export class EshkolQrng {
  private readonly phase = new BigUint64Array(ESHKOL_QUBITS);
  private readonly entangle = new BigUint64Array(ESHKOL_QUBITS);
  private readonly quantumState = new Float64Array(ESHKOL_QUBITS);
  private readonly lastMeasurement = new BigUint64Array(ESHKOL_QUBITS);
  private readonly entropyPool = new Float64Array(16);
  private readonly buffer = new BigUint64Array(BUFFER_WORDS);
  private bufferPos = BUFFER_WORDS; // empty → first draw triggers a quantumStep
  private counter = 0n;
  private poolMixer = 0n;
  private poolIndex = 0;
  private readonly systemEntropy: bigint;
  private readonly uniqueId: bigint;
  private runtimeEntropy = 0n;
  private entropyTick: bigint;
  private steps = 0;
  private draws = 0;
  private lastWord = 0n;

  constructor(seed: Rng) {
    // Seed the (otherwise host-derived) entropy state from the deterministic stream.
    this.systemEntropy = this.seedWord(seed);
    this.uniqueId = splitmix64(this.systemEntropy); // upstream: unique_id = splitmix64(system_entropy)
    this.poolMixer = m64(HEISENBERG ^ this.uniqueId);
    this.entropyTick = m64(this.seedWord(seed) ^ GOLDEN_RATIO);
    this.runtimeEntropy = this.nextRuntimeEntropy();

    // Synthesise an 8-byte seed (the upstream `seed[]`) from the stream so the seeded init path runs.
    const seedBytes = new Uint8Array(ESHKOL_QUBITS);
    for (let i = 0; i < seedBytes.length; i++) seedBytes[i] = Math.floor(seed() * 256) & 0xff;

    // Entropy pool init (upstream :273–280, host-time terms dropped, seeded terms kept).
    for (let i = 0; i < 16; i++) {
      this.entropyPool[i] = quantumNoise(
        u64ToUnit(this.systemEntropy >> BigInt(i)) +
          u64ToUnit(this.runtimeEntropy) +
          (seedBytes[i % ESHKOL_QUBITS] ?? 0) / 256,
      );
    }

    // Per-qubit state init (upstream :283–308).
    let mixer = m64(GOLDEN_RATIO ^ this.systemEntropy);
    for (let i = 0; i < ESHKOL_QUBITS; i++) {
      const sb = BigInt(seedBytes[i] ?? i);
      mixer = splitmix64(m64(mixer ^ sb ^ this.runtimeEntropy));
      this.phase[i] = hadamardGate(m64(sb ^ mixer ^ this.uniqueId ^ this.runtimeEntropy));
      this.quantumState[i] = quantumNoise(
        u64ToUnit(m64((this.phase[i] ?? 0n) ^ this.systemEntropy)) +
          (this.entropyPool[i % 16] ?? 0) +
          u64ToUnit(this.runtimeEntropy),
      );
      const measured = this.measureState(
        this.quantumState[i] ?? 0,
        BigInt(seedBytes[(ESHKOL_QUBITS - 1 - i) % ESHKOL_QUBITS] ?? i),
      );
      this.lastMeasurement[i] = measured;
      this.entangle[i] = phaseGate(measured, m64(sb ^ mixer ^ this.runtimeEntropy));
    }

    // Equilibrate (upstream :311 — MIXING_ROUNDS × 2 steps).
    for (let i = 0; i < MIXING_ROUNDS * 2; i++) this.quantumStep();
    this.bufferPos = BUFFER_WORDS; // discard the warm-up buffer; first real draw refills
  }

  /** Pull a fresh 64-bit seed word from the deterministic stream (two 32-bit draws). */
  private seedWord(seed: Rng): bigint {
    const hi = BigInt(Math.floor(seed() * 0x100000000));
    const lo = BigInt(Math.floor(seed() * 0x100000000));
    return m64((hi << 32n) ^ lo) || 1n;
  }

  /**
   * Deterministic surrogate for the upstream `get_runtime_entropy` (which reads wall-clock + ctx state
   * each call). Advances a golden-ratio tick and folds it through the same `hadamard_mix`, so it yields
   * a fresh value at every measurement — but one that replays from the seed.
   */
  private nextRuntimeEntropy(): bigint {
    this.entropyTick = m64(this.entropyTick + GOLDEN_RATIO);
    return hadamardMix(m64(this.entropyTick ^ this.systemEntropy ^ this.uniqueId ^ this.counter));
  }

  /** Born-rule-style measurement + entropy-pool stir (upstream `measure_state`, :155–185). */
  private measureState(quantumStateVal: number, last: bigint): bigint {
    this.runtimeEntropy = this.nextRuntimeEntropy();
    const collapsed = quantumNoise(quantumStateVal + u64ToUnit(this.runtimeEntropy));
    this.entropyPool[this.poolIndex] = quantumNoise(
      (this.entropyPool[this.poolIndex] ?? 0) + collapsed + u64ToUnit(this.runtimeEntropy),
    );
    this.poolIndex = (this.poolIndex + 1) & 15;
    this.poolMixer = hadamardMix(
      m64(this.poolMixer ^ unitToU64(this.entropyPool[this.poolIndex] ?? 0) ^ this.runtimeEntropy),
    );
    let result = unitToU64(collapsed);
    result = hadamardMix(m64(result ^ m64(m64(last) * ELECTRON_G) ^ this.runtimeEntropy));
    result = m64(result ^ m64(PAULI_X * (this.poolMixer >> 29n)));
    result = m64(result * HEISENBERG);
    result = m64(result ^ m64(PAULI_Y * (result >> 31n)));
    result = m64(result * SCHRODINGER);
    result = m64(result ^ m64(PAULI_Z * (result >> 27n)));
    return result;
  }

  /** One quantum step: evolve the register, then refill the 16-word output buffer (upstream :188–254). */
  private quantumStep(): void {
    this.counter = m64(this.counter + 1n);
    let mixer = splitmix64(m64(this.counter * GOLDEN_RATIO));
    this.runtimeEntropy = this.nextRuntimeEntropy();

    for (let round = 0; round < MIXING_ROUNDS; round++) {
      mixer = hadamardMix(m64(mixer ^ this.poolMixer ^ this.runtimeEntropy));
      for (let i = 0; i < ESHKOL_QUBITS; i++) {
        this.phase[i] = hadamardGate(
          m64(this.counter + mixer + BigInt(i) + BigInt(round) + this.runtimeEntropy),
        );
        this.quantumState[i] = quantumNoise(
          u64ToUnit(this.phase[i] ?? 0n) +
            (this.entropyPool[i & 15] ?? 0) +
            u64ToUnit(this.runtimeEntropy),
        );
        const measured = this.measureState(
          this.quantumState[i] ?? 0,
          this.lastMeasurement[i] ?? 0n,
        );
        this.entangle[i] = phaseGate(measured, m64(this.counter ^ mixer ^ this.runtimeEntropy));
        this.lastMeasurement[i] = measured;
        if (i > 0) {
          this.entangle[i] = m64(
            (this.entangle[i] ?? 0n) ^
              hadamardMix(m64((this.entangle[i - 1] ?? 0n) ^ mixer ^ this.runtimeEntropy)),
          );
          this.quantumState[i] = quantumNoise(
            (this.quantumState[i] ?? 0) +
              (this.quantumState[i - 1] ?? 0) +
              u64ToUnit(this.runtimeEntropy),
          );
        }
        mixer = splitmix64(m64(mixer ^ measured ^ this.poolMixer ^ this.runtimeEntropy));
      }
    }

    let prev = mixer;
    for (let i = 0; i < BUFFER_WORDS; i++) {
      let current = this.measureState(
        this.quantumState[i % ESHKOL_QUBITS] ?? 0,
        this.entangle[i % ESHKOL_QUBITS] ?? 0n,
      );
      current = hadamardMix(m64(current ^ prev ^ this.poolMixer ^ this.runtimeEntropy));
      current = m64(current ^ m64(PAULI_X * (current >> 29n)));
      current = m64(current * HEISENBERG);
      current = m64(current ^ m64(PAULI_Y * (current >> 31n)));
      current = m64(current * SCHRODINGER);
      this.buffer[i] = current;
      prev = current;
    }
    this.bufferPos = 0;
    this.steps++;
  }

  /** Next 64-bit output word, with the upstream final-mix avalanche (upstream `qrng_uint64`, :377–392). */
  nextU64(): bigint {
    if (this.bufferPos >= BUFFER_WORDS) this.quantumStep();
    let result = this.buffer[this.bufferPos++] ?? 0n;
    this.runtimeEntropy = this.nextRuntimeEntropy();
    result = splitmix64(m64(result ^ this.runtimeEntropy));
    result = m64(result ^ m64(PAULI_X * (result >> 27n)));
    result = m64(result * HEISENBERG);
    result = m64(result ^ m64(PAULI_Y * (result >> 31n)));
    result = m64(result * SCHRODINGER);
    result = m64(result ^ m64(PAULI_Z * (result >> 29n)));
    this.lastWord = result;
    this.draws++;
    return result;
  }

  /** A uniform double in [0,1) (upstream `qrng_double`: top 53 bits ÷ 2⁵³). */
  next01(): number {
    return Number(this.nextU64() >> 11n) * (1 / 9007199254740992);
  }

  /** An {@link Rng}-compatible closure backed by this generator (for drop-in use as a seeded stream). */
  stream(): Rng {
    return () => this.next01();
  }

  /** Read-only telemetry for the BRAIN view (UI cadence; allocates its arrays). */
  snapshot(): EshkolQrngSnapshot {
    // Entropy estimate: normalised byte histogram of the live buffer, as bits/byte ÷ 8.
    const hist = new Float64Array(256);
    let n = 0;
    for (let w = 0; w < BUFFER_WORDS; w++) {
      let word = this.buffer[w] ?? 0n;
      for (let b = 0; b < 8; b++) {
        const byte = Number(word & 0xffn);
        hist[byte] = (hist[byte] ?? 0) + 1;
        word >>= 8n;
        n++;
      }
    }
    let h = 0;
    if (n > 0) {
      for (let i = 0; i < 256; i++) {
        const p = (hist[i] ?? 0) / n;
        if (p > 0) h -= p * Math.log2(p);
      }
    }
    return {
      qubits: ESHKOL_QUBITS,
      steps: this.steps,
      draws: this.draws,
      amplitudes: Array.from(this.quantumState),
      pool: Array.from(this.entropyPool),
      lastBits: this.lastWord.toString(2).padStart(64, '0'),
      entropyEstimate: h / 8, // 0..1 (1 = full byte entropy)
    };
  }
}
