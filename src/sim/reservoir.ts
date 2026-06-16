/**
 * THE RESERVOIR — an echo-state network giving the apex mind genuine TEMPORAL, recurrent dynamics
 * (Super Creature 1.1, "wet computing"). Reservoir computing — Jaeger's echo-state networks (2001) and
 * Maass's liquid-state machines (2002), and the 2022–2026 wave of PHYSICAL reservoirs (photonic, spintronic,
 * memristive, and cultured-neuron / organoid "wetware" substrates) — rests on one theorem: a FIXED random
 * recurrent network tuned to the edge of chaos is a universal temporal kernel; only a linear readout need
 * ever be trained. Here the reservoir is the creature's SHORT-TERM DYNAMICAL MEMORY: a fading, nonlinear
 * echo of its recent world-model latents that gives downstream cognition real history — beyond the scalar
 * {@link MemoryRing} — plus a cheap, principled NOVELTY signal that can drive curiosity.
 *
 * Echo-state property: the spectral radius of the recurrent matrix is rescaled (by power iteration at
 * construction) to {@link SPECTRAL} < 1, so the state's dependence on initial conditions washes out and the
 * dynamics are a stable function of the input history. Leaky integration ({@link LEAK}) sets the memory
 * timescale. Everything is deterministic (weights + update from a seeded {@link Rng}) and allocation-free in
 * steady state (the power iteration's scratch is construction-time only). Pure leaf: no DOM, no THREE.
 */
import type { Rng } from '../math/rng';

/** Reservoir node count — a rich-enough nonlinear kernel that stays trivially in the cognitive budget. */
export const RESERVOIR_SIZE = 64;
/** Input width — matches the apex mind's 16-D world-model latent. */
export const RESERVOIR_IN = 16;
/** Leaky-integrator rate: x <- (1-LEAK)·x + LEAK·tanh(...). Lower = longer memory. */
const LEAK = 0.3;
/** Target spectral radius of the recurrent matrix — < 1 guarantees the echo-state property (edge of chaos). */
const SPECTRAL = 0.95;
/** Input gain into the reservoir. */
const IN_SCALE = 0.6;
/** Leaky-mean rate for the novelty expectation (the reservoir's running model of "the usual input"). */
const EXPECT_TAU = 0.08;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Read-only telemetry of the reservoir for the BRAIN / SuperCreature boards (built at UI cadence). */
export interface ReservoirSnapshot {
  size: number;
  /** Mean |activation| across nodes — overall reservoir drive, 0..1. */
  energy: number;
  /** Activation variance (normalised) — spectral/temporal richness, 0..1 (high = lively, low = frozen). */
  richness: number;
  /** Cosine similarity of the state with one beat ago, mapped 0..1 (1 = static, 0.5 = decorrelated). */
  echo: number;
  /** Novelty of the current input vs the reservoir's running expectation, 0..1 (drives curiosity). */
  novelty: number;
  /** Leading node activations (first 24) for the board sparkline. */
  state: number[];
}

/**
 * A fixed-weight echo-state reservoir. Construct ONCE per mind with a dedicated seeded {@link Rng}; call
 * {@link step} each cognitive beat with the world-model latent, then {@link snapshot} at UI cadence.
 */
export class Reservoir {
  readonly size = RESERVOIR_SIZE;
  private readonly win: Float32Array; // RESERVOIR_SIZE × RESERVOIR_IN  (input weights)
  private readonly w: Float32Array; // RESERVOIR_SIZE × RESERVOIR_SIZE (spectral-scaled recurrent weights)
  private readonly x: Float32Array; // current state
  private readonly xPrev: Float32Array; // state one beat ago (for the echo reading)
  private readonly expect: Float32Array; // leaky-mean input expectation (for novelty)
  private nov = 0;

  constructor(rng: Rng) {
    const N = RESERVOIR_SIZE;
    const IN = RESERVOIR_IN;
    this.win = new Float32Array(N * IN);
    for (let i = 0; i < this.win.length; i++) this.win[i] = (rng() * 2 - 1) * IN_SCALE;
    const w = new Float32Array(N * N);
    for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
    // Rescale to the target spectral radius so the echo-state property holds (washout of initial state).
    const radius = spectralRadius(w, N);
    const scale = radius > 1e-9 ? SPECTRAL / radius : SPECTRAL;
    for (let i = 0; i < w.length; i++) w[i] = (w[i] ?? 0) * scale;
    this.w = w;
    this.x = new Float32Array(N);
    this.xPrev = new Float32Array(N);
    this.expect = new Float32Array(IN);
  }

  /**
   * Advance the reservoir one beat: x <- (1-LEAK)·x_prev + LEAK·tanh(Win·u + W·x_prev). Also updates the
   * novelty signal (distance of `input` from the running expectation) and the leaky expectation itself.
   * O(N² + N·IN); allocation-free.
   */
  step(input: ArrayLike<number>): void {
    const { win, w, x, xPrev, expect } = this;
    const N = RESERVOIR_SIZE;
    const IN = RESERVOIR_IN;
    xPrev.set(x);
    let nov = 0;
    for (let k = 0; k < IN; k++) {
      const u = input[k] ?? 0;
      const e = expect[k] ?? 0;
      const d = u - e;
      nov += d * d;
      expect[k] = e + EXPECT_TAU * d;
    }
    this.nov = clamp01(Math.sqrt(nov / IN));
    for (let i = 0; i < N; i++) {
      let acc = 0;
      const wiBase = i * IN;
      for (let k = 0; k < IN; k++) acc += (win[wiBase + k] ?? 0) * (input[k] ?? 0);
      const wBase = i * N;
      for (let j = 0; j < N; j++) acc += (w[wBase + j] ?? 0) * (xPrev[j] ?? 0);
      x[i] = (1 - LEAK) * (xPrev[i] ?? 0) + LEAK * Math.tanh(acc);
    }
  }

  /** Current novelty (0..1): how far this beat's input sits from the reservoir's running expectation. */
  get novelty(): number {
    return this.nov;
  }

  /** Build the read-only board snapshot (energy, richness, echo, novelty, leading state). O(N). */
  snapshot(): ReservoirSnapshot {
    const { x, xPrev } = this;
    const N = RESERVOIR_SIZE;
    let energy = 0;
    let mean = 0;
    for (let i = 0; i < N; i++) {
      const v = x[i] ?? 0;
      energy += Math.abs(v);
      mean += v;
    }
    energy /= N;
    mean /= N;
    let varr = 0;
    let dot = 0;
    let nx = 0;
    let np = 0;
    for (let i = 0; i < N; i++) {
      const v = x[i] ?? 0;
      const p = xPrev[i] ?? 0;
      varr += (v - mean) * (v - mean);
      dot += v * p;
      nx += v * v;
      np += p * p;
    }
    varr /= N;
    const cos = dot / (Math.sqrt(nx * np) + 1e-9);
    return {
      size: N,
      energy: clamp01(energy),
      richness: clamp01(varr * 3),
      echo: clamp01(cos * 0.5 + 0.5),
      novelty: this.nov,
      state: Array.from({ length: 24 }, (_, i) => x[i] ?? 0),
    };
  }
}

/**
 * Estimate the spectral radius (largest |eigenvalue|) of a row-major N×N matrix by power iteration from a
 * deterministic uniform start vector. Used ONCE at construction to normalise the reservoir. O(iters·N²).
 */
function spectralRadius(w: Float32Array, n: number): number {
  const v = new Float32Array(n).fill(1 / Math.sqrt(n));
  const tmp = new Float32Array(n);
  let lambda = 0;
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      const base = i * n;
      for (let j = 0; j < n; j++) s += (w[base + j] ?? 0) * (v[j] ?? 0);
      tmp[i] = s;
    }
    let norm = 0;
    for (let i = 0; i < n; i++) norm += (tmp[i] ?? 0) * (tmp[i] ?? 0);
    norm = Math.sqrt(norm);
    if (norm < 1e-12) return 0;
    lambda = norm;
    for (let i = 0; i < n; i++) v[i] = (tmp[i] ?? 0) / norm;
  }
  return lambda;
}
