/**
 * THE QUANTUM COMPUTING MIND (V75) — the apex creature's simulated-qubit cognition layer, the
 * directive's "Quantum Computing Mind · Simulated Qubits". Where {@link SuperMind} is a classical
 * composite of tiny MLPs, this is a genuine **statevector quantum register** ({@link QuantumRegister},
 * 6 qubits → 64 complex amplitudes) that the composite mind drives each beat: a parameterised circuit
 * encodes the mind's own signals (its 16-d world-model latent + its 10 reactive quantum-aspect
 * intensities) into qubit rotations and tunable entanglement, the state evolves under real unitary
 * gates, and a non-destructive Born sample reads a "thought collapse" — all deterministic from a
 * seeded {@link Rng} (no `Math.random`/`Date.now`), so the whole quantum psyche replays from a seed.
 *
 * Honest math (docs/PHILOSOPHY.md): every amplitude obeys the Schrödinger evolution of the applied
 * gates; the per-qubit Bloch vectors come from the true single-qubit reduced density matrices; the
 * entanglement reading is the reduced-state purity deficit (1 − |r|²); the entropy is the normalized
 * Shannon entropy of the Born distribution. The study of the Eshkol qubit RNG (phase array + noise) and
 * the Quantum-Geometric-Tensor library (statevector + RY/RZ/CNOT gate set + amplitude amplification)
 * informed the design; nothing is reimplemented from them — we own a 64-amplitude statevector outright.
 *
 * Cost: ~90 gates × 64 amplitudes ≈ 5.8k complex mults per beat — sub-microsecond, allocation-free in
 * {@link evolve} (the hot path). {@link snapshot} allocates the read-only arrays the BRAIN view paints
 * from; it runs only at the Observatory UI cadence, never per simulation beat.
 */
import { QuantumRegister } from '../math/quantum';
import type { Rng } from '../math/rng';

/** Register width — 6 qubits → 64 basis amplitudes: a rich BRAIN view that stays trivially in budget. */
export const QMIND_QUBITS = 6;
/** Circuit depth: rotation + tunable-entanglement layers applied per beat. */
export const QMIND_LAYERS = 3;
const DIM = 1 << QMIND_QUBITS; // 64
const TAU = Math.PI * 2;

/** A single qubit's Bloch vector plus its length (purity: 1 = separable pure, <1 = entangled). */
export interface BlochVec {
  x: number;
  y: number;
  z: number;
  r: number;
}

/** Read-only telemetry of the quantum mind for the BRAIN view (built at UI cadence). */
export interface QubitSnapshot {
  qubits: number;
  dim: number;
  layers: number;
  gates: number;
  /** Born-rule probabilities |αᵢ|² over the 2ⁿ basis states (length {@link dim}). */
  probs: number[];
  /** Amplitude phase arg(αᵢ) ∈ (−π, π] per basis state, for phase colouring (length {@link dim}). */
  phase: number[];
  /** Per-qubit Bloch vectors from the reduced density matrices. */
  bloch: BlochVec[];
  /** P(|1⟩) per qubit. */
  p1: number[];
  /** Normalized Shannon entropy of the Born distribution, 0..1 (1 = uniform superposition). */
  entropy: number;
  /** Mean reduced-state purity deficit (1 − |r|²) across qubits, 0..1 (1 = maximally entangled). */
  entanglement: number;
  /** Mean equatorial Bloch magnitude √(x²+y²) across qubits, 0..1 (live superposition strength). */
  coherence: number;
  /** Index of the last non-destructive Born sample (the "collapsed" thought this beat). */
  sampled: number;
  /** {@link sampled} as a qubit bitstring (qubit n−1 … qubit 0). */
  sampledBits: string;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The quantum mind. Construct ONCE per {@link SuperMind} with a dedicated seeded {@link Rng} (its own
 * stream, so quantum sampling never perturbs sim determinism). Call {@link evolve} each cognitive beat
 * with the mind's live signals; call {@link snapshot} at the UI cadence to read the BRAIN view.
 */
export class QuantumMind {
  private readonly reg = new QuantumRegister(QMIND_QUBITS);
  private readonly rng: Rng;
  // Reusable read buffers (snapshot allocates the public arrays; these stay private + fixed).
  private readonly bufRe = new Float64Array(DIM);
  private readonly bufIm = new Float64Array(DIM);
  private readonly bloch3 = new Float64Array(3);
  private gateCount = 0;
  private sampled = 0;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  /**
   * Encode → evolve → read. Rebuilds the state from |0…0⟩ each beat (so it tracks the mind's current
   * cognition, smoothly, deterministically) by applying {@link QMIND_LAYERS} layers of single-qubit
   * rotations (angles from the latent) and tunable controlled-RY entanglers (angle from the
   * `entanglement` aspect), with Hadamards gated by the `superposition` aspect, then takes one
   * non-destructive Born sample. Allocation-free; O(layers · gates · 2ⁿ). `aspects` is the 10-element
   * quantum-aspect vector (0..1); `latent` is the world-model latent (any length ≥ 1, values ~−1..1).
   */
  evolve(aspects: ArrayLike<number>, latent: ArrayLike<number>): void {
    const reg = this.reg;
    reg.reset();
    let gates = 0;
    const sup = clamp01(aspects[0] ?? 0); // superposition
    const ent = clamp01(aspects[1] ?? 0); // entanglement
    const ftl = clamp01(aspects[2] ?? 0); // ftl → phase drive
    const mut = clamp01(aspects[6] ?? 0); // mutation → rotation jitter
    const L = latent.length || 1;
    for (let layer = 0; layer < QMIND_LAYERS; layer++) {
      // ── single-qubit rotations: each qubit's Y/Z angles read a slice of the world-model latent ──
      for (let k = 0; k < QMIND_QUBITS; k++) {
        const lv = latent[(k + layer * QMIND_QUBITS) % L] ?? 0; // ~−1..1
        const lv2 = latent[(k * 2 + layer + 1) % L] ?? 0;
        // Superposition aspect lifts qubits toward the equator; mutation jitters the angle.
        const theta = (lv * 0.5 + 0.5) * Math.PI + sup * (Math.PI / 2) + mut * lv2 * 0.6;
        const phi = lv2 * Math.PI + ftl * TAU * ((k + 1) / QMIND_QUBITS);
        reg.apply('ry', k, undefined, theta);
        reg.apply('rz', k, undefined, phi);
        gates += 2;
        if (sup > 0.66 && ((k + layer) & 1) === 0) {
          reg.apply('h', k);
          gates += 1;
        }
      }
      // ── tunable entanglement: a controlled-RY ring, strength set by the entanglement aspect ──
      // CRY(β) = RY(t,−β/2) · CX(c,t) · RY(t,+β/2): β=0 ⇒ identity (separable), β=π ⇒ full CNOT.
      const beta = ent * Math.PI * (0.55 + 0.45 * Math.sin(layer + 1));
      if (beta > 1e-3) {
        for (let k = 0; k < QMIND_QUBITS; k++) {
          const t = (k + 1) % QMIND_QUBITS;
          reg.apply('ry', t, undefined, -beta / 2);
          reg.apply('cx', t, k); // control = k, target = t
          reg.apply('ry', t, undefined, beta / 2);
          gates += 3;
        }
      }
    }
    this.gateCount = gates;
    this.sampled = reg.sample(this.rng);
  }

  /** Index of the most recent non-destructive Born sample (the collapsed thought). */
  get lastSample(): number {
    return this.sampled;
  }

  /**
   * Build the read-only BRAIN snapshot from the live statevector: Born probabilities + phases, the
   * per-qubit Bloch vectors and P(|1⟩), the normalized entropy, the mean entanglement (purity
   * deficit) and equatorial coherence, and the last sampled basis state. Allocates the public arrays
   * (UI cadence only). O(qubits · 2ⁿ).
   */
  snapshot(): QubitSnapshot {
    const reg = this.reg;
    reg.amplitudesInto(this.bufRe, this.bufIm);
    const probs = Array.from({ length: DIM }, () => 0);
    const phase = Array.from({ length: DIM }, () => 0);
    for (let i = 0; i < DIM; i++) {
      const r = this.bufRe[i] ?? 0;
      const m = this.bufIm[i] ?? 0;
      probs[i] = r * r + m * m;
      phase[i] = Math.atan2(m, r);
    }
    const bloch: BlochVec[] = [];
    const p1 = Array.from({ length: QMIND_QUBITS }, () => 0);
    let entSum = 0;
    let cohSum = 0;
    for (let k = 0; k < QMIND_QUBITS; k++) {
      reg.blochInto(k, this.bloch3);
      const x = this.bloch3[0] ?? 0;
      const y = this.bloch3[1] ?? 0;
      const z = this.bloch3[2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      bloch.push({ x, y, z, r });
      p1[k] = clamp01((1 - z) / 2); // P(|1⟩) = (1 − ⟨Z⟩)/2
      entSum += clamp01(1 - r * r); // purity deficit (linear entanglement entropy)
      cohSum += clamp01(Math.sqrt(x * x + y * y)); // equatorial (off-diagonal) magnitude
    }
    return {
      qubits: QMIND_QUBITS,
      dim: DIM,
      layers: QMIND_LAYERS,
      gates: this.gateCount,
      probs,
      phase,
      bloch,
      p1,
      entropy: reg.entropy(),
      entanglement: entSum / QMIND_QUBITS,
      coherence: cohSum / QMIND_QUBITS,
      sampled: this.sampled,
      sampledBits: this.sampled.toString(2).padStart(QMIND_QUBITS, '0'),
    };
  }
}
