/**
 * Deterministic classical state-vector sampler adapted from the architecture of Tsotchke's
 * `quantum_rng` v3.0.1.
 *
 * Provenance pin (reference only):
 *   https://github.com/tsotchke/quantum_rng/tree/v3.0.1
 *   commit a00ad483cbbef31ea7536f09ae99409d81c9a823
 *
 * This module is an independent TypeScript adaptation for reproducible simulation. It is not a
 * direct port and does not claim native parity. Its entropy schedule is seeded by the project's
 * deterministic {@link Rng}, then retained in serialisable xoshiro state so a snapshot can resume
 * exactly. Consequently it is NOT a CSPRNG, NOT physical quantum entropy, and NOT evidence of Bell
 * nonlocality or quantum hardware. The health block runs the genuine NIST SP 800-90B §4.4 Repetition
 * Count Test and Adaptive Proportion Test *algorithm* (see `nist-sp800-90b.ts`) over the retained
 * output window, with the standard cutoff formulas. That is a faithful conformance diagnostic of the
 * output stream — it is still NOT SP 800-90B entropy-source validation or certification, which would
 * additionally require a physical noise source, the full estimator battery, and restart testing.
 *
 * The quantum mechanics represented here are nevertheless actual classical state-vector algebra:
 * H/X/Z/S/RY/RZ/CNOT/CZ are unitary transforms and full-register measurement samples Born
 * probabilities before collapsing to one computational-basis state.
 */

import type { Rng } from './rng';
import {
  SP80090B_APT_WINDOW_BINARY,
  SP80090B_DEFAULT_ALPHA_EXPONENT,
  adaptiveProportionCutoff,
  adaptiveProportionOverBuffer,
  repetitionCountCutoff,
} from './nist-sp800-90b';

const TWO_POW_32 = 0x1_0000_0000;
const TWO_POW_53 = 9_007_199_254_740_992;
const INV_SQRT_2 = Math.SQRT1_2;
const TAU = Math.PI * 2;

export const STATEVECTOR_RNG_PROVENANCE = Object.freeze({
  repository: 'https://github.com/tsotchke/quantum_rng',
  tag: 'v3.0.1',
  commit: 'a00ad483cbbef31ea7536f09ae99409d81c9a823',
  relationship: 'adapted-deterministic-model-not-direct-or-native-parity',
} as const);

export const STATEVECTOR_RNG_SECURITY_BOUNDARY =
  'Classical deterministic simulation only: not a CSPRNG, not physical entropy, and not Bell evidence.';

export interface DeterministicStatevectorRngOptions {
  /** Number of simulated qubits. Fixed for an instance; integer in [2, 8]. */
  qubits?: number;
  /** Circuit rounds before each full-register measurement; integer in [1, 8]. */
  evolutionRounds?: number;
  /** Number of recent output bits retained for bounded health diagnostics; integer in [64, 4096]. */
  healthWindowBits?: number;
  /**
   * SP 800-90B §4.4.1 Repetition Count Test cutoff C (integer in [8, 128]). The RCT alarms when a
   * single output bit value recurs C times consecutively. Defaults to the standard value for a
   * full-entropy binary source at α = 2^-20: C = 1 + ⌈-log₂(α)/H⌉ = 21 (H = 1). A larger C is a more
   * conservative test (equivalent to a smaller α); a caller may pass one to widen or tighten it.
   */
  repetitionCutoff?: number;
}

/**
 * Bounded output diagnostics. These are deliberately labelled so callers cannot mistake a cheap
 * runtime alarm for an entropy-source assessment.
 */
export interface StatevectorOutputHealth {
  kind: 'sp800-90b-rct-apt-algorithm-bounded-window-diagnostic';
  standardsClaim: 'not-sp800-90b-validation-or-certification';
  interpretation: 'real-sp800-90b-test-algorithm-conformance-diagnostic';
  status: 'insufficient-data' | 'diagnostic-pass' | 'diagnostic-alert';
  sampleBits: number;
  windowCapacityBits: number;
  ones: number;
  zeros: number;
  proportionOnes: number;
  longestRun: number;
  /** SP 800-90B §4.4.1 Repetition Count Test cutoff C in force for this generator. */
  repetitionCutoff: number;
  /** SP 800-90B §4.4.2 Adaptive Proportion Test window W (binary source: 1024). */
  adaptiveProportionWindow: number;
  /** SP 800-90B §4.4.2 APT cutoff C for W bits at H = 1, α = 2^-20. */
  adaptiveProportionCutoff: number;
  /** Largest reference-value count seen across the scanned non-overlapping APT windows. */
  adaptiveProportionWorstCount: number;
  /** Number of full APT windows the retained buffer covered (0 ⇒ APT could not run yet). */
  adaptiveProportionWindowsScanned: number;
  repetitionAlert: boolean;
  adaptiveProportionAlert: boolean;
  alert: boolean;
}

export interface DeterministicStatevectorRngSnapshot {
  schemaVersion: 1;
  model: 'deterministic-classical-statevector-rng';
  provenance: typeof STATEVECTOR_RNG_PROVENANCE;
  securityBoundary: typeof STATEVECTOR_RNG_SECURITY_BOUNDARY;
  qubits: number;
  dimension: number;
  evolutionRounds: number;
  repetitionCutoff: number;
  real: number[];
  imag: number[];
  entropyState: [number, number, number, number];
  /** Circuit/measurement cursor used to make the deterministic gate cadence position-dependent. */
  cursor: number;
  draws: number;
  measurements: number;
  lastMeasurement: number;
  lastWord: string;
  healthWindow: number[];
  healthCursor: number;
  healthCount: number;
}

function requireIntegerInRange(name: string, value: number, low: number, high: number): number {
  if (!Number.isInteger(value) || value < low || value > high) {
    throw new RangeError(`${name} must be an integer in [${low}, ${high}], received ${value}`);
  }
  return value;
}

function rotateLeft32(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

/**
 * Fixed-width state-vector generator. Every hot state array is allocated once in the constructor;
 * gate application, evolution, measurement, and output generation are allocation-free.
 */
export class DeterministicStatevectorRng {
  readonly qubits: number;
  readonly dimension: number;

  private readonly real: Float64Array;
  private readonly imag: Float64Array;
  private readonly entropyState = new Uint32Array(4);
  private readonly healthWindow: Uint8Array;
  /** Reusable output-order copy of the ring buffer so the windowed APT scan needs no per-call alloc. */
  private readonly orderedWindow: Uint8Array;
  private readonly evolutionRounds: number;
  private readonly repetitionCutoff: number;
  private readonly adaptiveProportionWindowSize: number;
  private readonly adaptiveProportionCutoffValue: number;

  private cursor = 0;
  private draws = 0;
  private measurements = 0;
  private lastMeasurement = 0;
  private lastWord = 0n;
  private healthCursor = 0;
  private healthCount = 0;

  constructor(seed: Rng, options: DeterministicStatevectorRngOptions = {}) {
    this.qubits = requireIntegerInRange('qubits', options.qubits ?? 8, 2, 8);
    this.dimension = 1 << this.qubits;
    this.evolutionRounds = requireIntegerInRange(
      'evolutionRounds',
      options.evolutionRounds ?? 2,
      1,
      8,
    );
    const healthWindowBits = requireIntegerInRange(
      'healthWindowBits',
      options.healthWindowBits ?? 512,
      64,
      4096,
    );
    this.repetitionCutoff = requireIntegerInRange(
      'repetitionCutoff',
      options.repetitionCutoff ?? repetitionCountCutoff(1, SP80090B_DEFAULT_ALPHA_EXPONENT),
      8,
      128,
    );
    // APT for a binary (1-bit) output source at the full-entropy null H=1, α=2^-20. Both are fixed by
    // the standard, so the cutoff is a constant of the model and needs no snapshot field.
    this.adaptiveProportionWindowSize = SP80090B_APT_WINDOW_BINARY;
    this.adaptiveProportionCutoffValue = adaptiveProportionCutoff(
      SP80090B_APT_WINDOW_BINARY,
      1,
      SP80090B_DEFAULT_ALPHA_EXPONENT,
    );

    this.real = new Float64Array(this.dimension);
    this.imag = new Float64Array(this.dimension);
    this.healthWindow = new Uint8Array(healthWindowBits);
    this.orderedWindow = new Uint8Array(healthWindowBits);
    this.real[0] = 1;

    // The project's Rng supplies deterministic seed material. From this point onward, the complete
    // entropy schedule is represented by entropyState and is therefore snapshot/restore capable.
    for (let i = 0; i < 4; i++) {
      const sample = seed();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
        throw new RangeError(`seed Rng must return finite values in [0, 1), received ${sample}`);
      }
      this.entropyState[i] = Math.floor(sample * TWO_POW_32) >>> 0;
    }
    if (
      (this.entropyState[0] ?? 0) === 0 &&
      (this.entropyState[1] ?? 0) === 0 &&
      (this.entropyState[2] ?? 0) === 0 &&
      (this.entropyState[3] ?? 0) === 0
    ) {
      // xoshiro's all-zero state is absorbing. This fixed non-zero state keeps even a deliberately
      // degenerate injected seed deterministic and operational; it adds no unpredictability claim.
      this.entropyState[0] = 0x9e37_79b9;
      this.entropyState[1] = 0x243f_6a88;
      this.entropyState[2] = 0xb7e1_5163;
      this.entropyState[3] = 0xdead_beef;
    }
  }

  /** Restore an exact continuation without retaining the original seed closure. */
  static fromSnapshot(snapshot: DeterministicStatevectorRngSnapshot): DeterministicStatevectorRng {
    const instance = new DeterministicStatevectorRng(() => 0, {
      qubits: snapshot.qubits,
      evolutionRounds: snapshot.evolutionRounds,
      healthWindowBits: snapshot.healthWindow.length,
      repetitionCutoff: snapshot.repetitionCutoff,
    });
    instance.restore(snapshot);
    return instance;
  }

  /** xoshiro128**: deterministic scheduling only, explicitly not used as a security claim. */
  private nextEntropyU32(): number {
    const s0 = this.entropyState[0] ?? 0;
    const s1 = this.entropyState[1] ?? 0;
    const s2 = this.entropyState[2] ?? 0;
    const s3 = this.entropyState[3] ?? 0;
    const result = Math.imul(rotateLeft32(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;

    this.entropyState[2] = (s2 ^ s0) >>> 0;
    this.entropyState[3] = (s3 ^ s1) >>> 0;
    this.entropyState[1] = (s1 ^ (this.entropyState[2] ?? 0)) >>> 0;
    this.entropyState[0] = (s0 ^ (this.entropyState[3] ?? 0)) >>> 0;
    this.entropyState[2] = ((this.entropyState[2] ?? 0) ^ t) >>> 0;
    this.entropyState[3] = rotateLeft32(this.entropyState[3] ?? 0, 11);
    return result;
  }

  private nextEntropy01(): number {
    return this.nextEntropyU32() / TWO_POW_32;
  }

  private assertQubit(qubit: number): void {
    requireIntegerInRange('qubit', qubit, 0, this.qubits - 1);
  }

  private assertPair(control: number, target: number): void {
    this.assertQubit(control);
    this.assertQubit(target);
    if (control === target) throw new RangeError('control and target qubits must differ');
  }

  /** Hadamard gate. */
  h(qubit: number): void {
    this.assertQubit(qubit);
    const bit = 1 << qubit;
    const stride = bit << 1;
    for (let base = 0; base < this.dimension; base += stride) {
      for (let offset = 0; offset < bit; offset++) {
        const i0 = base + offset;
        const i1 = i0 + bit;
        const r0 = this.real[i0] ?? 0;
        const r1 = this.real[i1] ?? 0;
        const j0 = this.imag[i0] ?? 0;
        const j1 = this.imag[i1] ?? 0;
        this.real[i0] = (r0 + r1) * INV_SQRT_2;
        this.real[i1] = (r0 - r1) * INV_SQRT_2;
        this.imag[i0] = (j0 + j1) * INV_SQRT_2;
        this.imag[i1] = (j0 - j1) * INV_SQRT_2;
      }
    }
  }

  /** Pauli-X gate. */
  x(qubit: number): void {
    this.assertQubit(qubit);
    const bit = 1 << qubit;
    for (let i0 = 0; i0 < this.dimension; i0++) {
      if ((i0 & bit) !== 0) continue;
      const i1 = i0 | bit;
      const r = this.real[i0] ?? 0;
      const j = this.imag[i0] ?? 0;
      this.real[i0] = this.real[i1] ?? 0;
      this.imag[i0] = this.imag[i1] ?? 0;
      this.real[i1] = r;
      this.imag[i1] = j;
    }
  }

  /** Pauli-Z gate. */
  z(qubit: number): void {
    this.assertQubit(qubit);
    const bit = 1 << qubit;
    for (let i = 0; i < this.dimension; i++) {
      if ((i & bit) === 0) continue;
      this.real[i] = -(this.real[i] ?? 0);
      this.imag[i] = -(this.imag[i] ?? 0);
    }
  }

  /** Phase-S gate, diag(1, i). */
  s(qubit: number): void {
    this.assertQubit(qubit);
    const bit = 1 << qubit;
    for (let i = 0; i < this.dimension; i++) {
      if ((i & bit) === 0) continue;
      const r = this.real[i] ?? 0;
      this.real[i] = -(this.imag[i] ?? 0);
      this.imag[i] = r;
    }
  }

  /** Y-axis rotation by `angle` radians. */
  ry(qubit: number, angle: number): void {
    this.assertQubit(qubit);
    if (!Number.isFinite(angle)) throw new RangeError('RY angle must be finite');
    const c = Math.cos(angle * 0.5);
    const s = Math.sin(angle * 0.5);
    const bit = 1 << qubit;
    const stride = bit << 1;
    for (let base = 0; base < this.dimension; base += stride) {
      for (let offset = 0; offset < bit; offset++) {
        const i0 = base + offset;
        const i1 = i0 + bit;
        const r0 = this.real[i0] ?? 0;
        const r1 = this.real[i1] ?? 0;
        const j0 = this.imag[i0] ?? 0;
        const j1 = this.imag[i1] ?? 0;
        this.real[i0] = c * r0 - s * r1;
        this.real[i1] = s * r0 + c * r1;
        this.imag[i0] = c * j0 - s * j1;
        this.imag[i1] = s * j0 + c * j1;
      }
    }
  }

  /** Z-axis rotation by `angle` radians. */
  rz(qubit: number, angle: number): void {
    this.assertQubit(qubit);
    if (!Number.isFinite(angle)) throw new RangeError('RZ angle must be finite');
    const c = Math.cos(angle * 0.5);
    const s = Math.sin(angle * 0.5);
    const bit = 1 << qubit;
    for (let i = 0; i < this.dimension; i++) {
      const r = this.real[i] ?? 0;
      const j = this.imag[i] ?? 0;
      if ((i & bit) === 0) {
        this.real[i] = c * r + s * j;
        this.imag[i] = c * j - s * r;
      } else {
        this.real[i] = c * r - s * j;
        this.imag[i] = c * j + s * r;
      }
    }
  }

  /** Controlled-NOT gate. */
  cnot(control: number, target: number): void {
    this.assertPair(control, target);
    const controlBit = 1 << control;
    const targetBit = 1 << target;
    for (let i0 = 0; i0 < this.dimension; i0++) {
      if ((i0 & controlBit) === 0 || (i0 & targetBit) !== 0) continue;
      const i1 = i0 | targetBit;
      const r = this.real[i0] ?? 0;
      const j = this.imag[i0] ?? 0;
      this.real[i0] = this.real[i1] ?? 0;
      this.imag[i0] = this.imag[i1] ?? 0;
      this.real[i1] = r;
      this.imag[i1] = j;
    }
  }

  /** Controlled-Z gate. */
  cz(control: number, target: number): void {
    this.assertPair(control, target);
    const mask = (1 << control) | (1 << target);
    for (let i = 0; i < this.dimension; i++) {
      if ((i & mask) !== mask) continue;
      this.real[i] = -(this.real[i] ?? 0);
      this.imag[i] = -(this.imag[i] ?? 0);
    }
  }

  /** Sum of Born probabilities; remains approximately 1 under the unitary gates above. */
  stateNorm(): number {
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      const r = this.real[i] ?? 0;
      const j = this.imag[i] ?? 0;
      norm += r * r + j * j;
    }
    return norm;
  }

  /**
   * Sample the entire register by Born probability and collapse it to the selected basis state.
   * Returns an integer in [0, 2^qubits).
   */
  measureRegister(): number {
    const u = this.nextEntropy01();
    let cumulative = 0;
    let selected = this.dimension - 1;
    for (let i = 0; i < this.dimension; i++) {
      const r = this.real[i] ?? 0;
      const j = this.imag[i] ?? 0;
      cumulative += r * r + j * j;
      if (u < cumulative) {
        selected = i;
        break;
      }
    }
    this.real.fill(0);
    this.imag.fill(0);
    this.real[selected] = 1;
    this.lastMeasurement = selected;
    this.measurements++;
    return selected;
  }

  /** Deterministic, seed-driven circuit applied before each measurement. */
  private evolve(): void {
    for (let round = 0; round < this.evolutionRounds; round++) {
      // H on every qubit prevents a collapsed basis state from becoming an absorbing output state.
      for (let q = 0; q < this.qubits; q++) this.h(q);

      const q0 = this.nextEntropyU32() % this.qubits;
      const q1 = this.nextEntropyU32() % this.qubits;
      const q2 = this.nextEntropyU32() % this.qubits;
      const q3 = this.nextEntropyU32() % this.qubits;
      if ((this.nextEntropyU32() & 1) !== 0) this.x(q0);
      if ((this.nextEntropyU32() & 1) !== 0) this.z(q1);
      this.s(q2);
      this.ry(q3, (this.nextEntropy01() - 0.5) * TAU);
      this.rz((q3 + 1) % this.qubits, (this.nextEntropy01() - 0.5) * TAU);

      const direction = (this.cursor + round) & 1;
      for (let q = 0; q < this.qubits - 1; q++) {
        const left = direction === 0 ? q : this.qubits - 1 - q;
        const right = direction === 0 ? q + 1 : this.qubits - 2 - q;
        this.cnot(left, right);
      }
      this.cz(this.cursor % this.qubits, (this.cursor + 1) % this.qubits);
    }
    this.cursor++;
  }

  private recordHealthWord(word: bigint): void {
    for (let bit = 0; bit < 64; bit++) {
      this.healthWindow[this.healthCursor] = Number((word >> BigInt(bit)) & 1n);
      this.healthCursor = (this.healthCursor + 1) % this.healthWindow.length;
      if (this.healthCount < this.healthWindow.length) this.healthCount++;
    }
  }

  /**
   * Generate 64 bits by packing repeated full-register Born measurements. This preserves the
   * state-vector semantics instead of pretending an amplitude array itself is an entropy source.
   */
  nextU64(): bigint {
    let word = 0n;
    let filled = 0;
    while (filled < 64) {
      this.evolve();
      const basis = this.measureRegister();
      for (let q = 0; q < this.qubits && filled < 64; q++, filled++) {
        const bit = (basis >>> q) & 1;
        word |= BigInt(bit) << BigInt(filled);
      }
    }
    this.lastWord = BigInt.asUintN(64, word);
    this.draws++;
    this.recordHealthWord(this.lastWord);
    return this.lastWord;
  }

  /** Uniform-like deterministic double in [0, 1), built from the high 53 bits of {@link nextU64}. */
  next01(): number {
    return Number(this.nextU64() >> 11n) / TWO_POW_53;
  }

  /**
   * Run the genuine SP 800-90B §4.4 RCT and APT algorithm over the retained output window. The scan
   * fills a reusable output-order buffer (no per-call data allocation); the APT partitions that
   * window into non-overlapping W-bit windows and needs a full window before it reports a verdict.
   */
  health(): StatevectorOutputHealth {
    const n = this.healthCount;
    const start = n < this.healthWindow.length ? 0 : this.healthCursor;
    let ones = 0;
    let longestRun = 0;
    let currentRun = 0;
    let previous = -1;
    for (let i = 0; i < n; i++) {
      const bit = this.healthWindow[(start + i) % this.healthWindow.length] ?? 0;
      this.orderedWindow[i] = bit;
      ones += bit;
      if (bit === previous) currentRun++;
      else {
        previous = bit;
        currentRun = 1;
      }
      if (currentRun > longestRun) longestRun = currentRun;
    }

    const proportionOnes = n > 0 ? ones / n : 0.5;
    // §4.4.1 RCT: the longest identical-bit run IS the repeat-count statistic for a binary source;
    // the standard alarms once a value has recurred `C` times consecutively (run length ≥ C).
    const repetitionAlert = n > 0 && longestRun >= this.repetitionCutoff;
    // §4.4.2 APT over the retained window (real algorithm; W=1024, cutoff from the binomial at H=1).
    const apt = adaptiveProportionOverBuffer(
      this.orderedWindow.subarray(0, n),
      this.adaptiveProportionWindowSize,
      this.adaptiveProportionCutoffValue,
    );
    const alert = repetitionAlert || apt.alarm;
    return {
      kind: 'sp800-90b-rct-apt-algorithm-bounded-window-diagnostic',
      standardsClaim: 'not-sp800-90b-validation-or-certification',
      interpretation: 'real-sp800-90b-test-algorithm-conformance-diagnostic',
      status: n < 64 ? 'insufficient-data' : alert ? 'diagnostic-alert' : 'diagnostic-pass',
      sampleBits: n,
      windowCapacityBits: this.healthWindow.length,
      ones,
      zeros: n - ones,
      proportionOnes,
      longestRun,
      repetitionCutoff: this.repetitionCutoff,
      adaptiveProportionWindow: this.adaptiveProportionWindowSize,
      adaptiveProportionCutoff: this.adaptiveProportionCutoffValue,
      adaptiveProportionWorstCount: apt.worstCount,
      adaptiveProportionWindowsScanned: apt.windowsScanned,
      repetitionAlert,
      adaptiveProportionAlert: apt.alarm,
      alert,
    };
  }

  /** Serializable state for exact replay and low-cadence telemetry. */
  snapshot(): DeterministicStatevectorRngSnapshot {
    return {
      schemaVersion: 1,
      model: 'deterministic-classical-statevector-rng',
      provenance: STATEVECTOR_RNG_PROVENANCE,
      securityBoundary: STATEVECTOR_RNG_SECURITY_BOUNDARY,
      qubits: this.qubits,
      dimension: this.dimension,
      evolutionRounds: this.evolutionRounds,
      repetitionCutoff: this.repetitionCutoff,
      real: Array.from(this.real),
      imag: Array.from(this.imag),
      entropyState: [
        this.entropyState[0] ?? 0,
        this.entropyState[1] ?? 0,
        this.entropyState[2] ?? 0,
        this.entropyState[3] ?? 0,
      ],
      cursor: this.cursor,
      draws: this.draws,
      measurements: this.measurements,
      lastMeasurement: this.lastMeasurement,
      lastWord: this.lastWord.toString(16).padStart(16, '0'),
      healthWindow: Array.from(this.healthWindow),
      healthCursor: this.healthCursor,
      healthCount: this.healthCount,
    };
  }

  /** Replace live state with a validated same-shape snapshot. */
  restore(snapshot: DeterministicStatevectorRngSnapshot): void {
    if (
      snapshot.schemaVersion !== 1 ||
      snapshot.model !== 'deterministic-classical-statevector-rng'
    ) {
      throw new TypeError('unsupported deterministic state-vector RNG snapshot');
    }
    if (
      snapshot.provenance?.repository !== STATEVECTOR_RNG_PROVENANCE.repository ||
      snapshot.provenance?.tag !== STATEVECTOR_RNG_PROVENANCE.tag ||
      snapshot.provenance?.commit !== STATEVECTOR_RNG_PROVENANCE.commit ||
      snapshot.provenance?.relationship !== STATEVECTOR_RNG_PROVENANCE.relationship ||
      snapshot.securityBoundary !== STATEVECTOR_RNG_SECURITY_BOUNDARY
    ) {
      throw new TypeError('snapshot provenance or security boundary does not match this model');
    }
    if (snapshot.qubits !== this.qubits || snapshot.dimension !== this.dimension) {
      throw new RangeError('snapshot qubit shape does not match this generator');
    }
    if (
      snapshot.evolutionRounds !== this.evolutionRounds ||
      snapshot.repetitionCutoff !== this.repetitionCutoff
    ) {
      throw new RangeError('snapshot cadence/health configuration does not match this generator');
    }
    if (snapshot.real.length !== this.dimension || snapshot.imag.length !== this.dimension) {
      throw new RangeError('snapshot state-vector dimensions are invalid');
    }
    if (snapshot.entropyState.length !== 4)
      throw new RangeError('snapshot entropy state is invalid');
    if (snapshot.healthWindow.length !== this.healthWindow.length) {
      throw new RangeError('snapshot health-window dimensions are invalid');
    }
    if (
      !Number.isInteger(snapshot.healthCursor) ||
      snapshot.healthCursor < 0 ||
      snapshot.healthCursor >= this.healthWindow.length ||
      !Number.isInteger(snapshot.healthCount) ||
      snapshot.healthCount < 0 ||
      snapshot.healthCount > this.healthWindow.length
    ) {
      throw new RangeError('snapshot health cursor/count is invalid');
    }

    // Validate the complete snapshot before mutating live state. Restore is a low-cadence evidence path,
    // so two bounded passes are preferable to leaving a generator half-overwritten after an exception.
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      const r = snapshot.real[i] ?? Number.NaN;
      const j = snapshot.imag[i] ?? Number.NaN;
      if (!Number.isFinite(r) || !Number.isFinite(j)) {
        throw new RangeError('snapshot state-vector contains a non-finite amplitude');
      }
      norm += r * r + j * j;
    }
    if (!Number.isFinite(norm) || Math.abs(norm - 1) > 1e-8) {
      throw new RangeError(`snapshot state-vector is not normalised (norm=${norm})`);
    }
    const e0 = snapshot.entropyState[0];
    const e1 = snapshot.entropyState[1];
    const e2 = snapshot.entropyState[2];
    const e3 = snapshot.entropyState[3];
    for (const value of [e0, e1, e2, e3]) {
      if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
        throw new RangeError('snapshot entropy state must contain four uint32 values');
      }
    }
    if (e0 === 0 && e1 === 0 && e2 === 0 && e3 === 0) {
      throw new RangeError('snapshot entropy state cannot be all zero');
    }
    for (let i = 0; i < this.healthWindow.length; i++) {
      const bit = snapshot.healthWindow[i];
      if (bit !== 0 && bit !== 1) throw new RangeError('snapshot health window is not binary');
    }
    if (
      !Number.isSafeInteger(snapshot.cursor) ||
      snapshot.cursor < 0 ||
      !Number.isSafeInteger(snapshot.draws) ||
      snapshot.draws < 0 ||
      !Number.isSafeInteger(snapshot.measurements) ||
      snapshot.measurements < 0 ||
      !Number.isInteger(snapshot.lastMeasurement) ||
      snapshot.lastMeasurement < 0 ||
      snapshot.lastMeasurement >= this.dimension ||
      !/^[0-9a-fA-F]{16}$/.test(snapshot.lastWord)
    ) {
      throw new RangeError('snapshot counters or last output are invalid');
    }

    for (let i = 0; i < this.dimension; i++) {
      this.real[i] = snapshot.real[i]!;
      this.imag[i] = snapshot.imag[i]!;
    }
    this.entropyState[0] = e0;
    this.entropyState[1] = e1;
    this.entropyState[2] = e2;
    this.entropyState[3] = e3;
    this.healthWindow.set(snapshot.healthWindow);
    this.cursor = snapshot.cursor;
    this.draws = snapshot.draws;
    this.measurements = snapshot.measurements;
    this.lastMeasurement = snapshot.lastMeasurement;
    this.lastWord = BigInt(`0x${snapshot.lastWord}`);
    this.healthCursor = snapshot.healthCursor;
    this.healthCount = snapshot.healthCount;
  }
}
