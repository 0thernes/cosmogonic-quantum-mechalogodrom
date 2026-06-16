/**
 * THE SPIN-GLASS INSTINCT (V84) — a biomimetic Ising/Hopfield spin lattice ported from the Tsotchke
 * spin-based neural network. Where the Super Mind reasons with MLPs and the Quantum Mind evolves a
 * statevector, this is the apex creature's **instinct**: an associative-memory spin system that stores
 * behavioural archetypes as attractors and, each beat, settles under fields driven by the mind to fall
 * into whichever archetype best matches the moment. It is the "polymorphic" floor of the Biomimetic
 * Polymorphic Neural Intelligence — physics doing computation, not a network.
 *
 * The model (classical statistical mechanics, the spin-NN's Ising/Heisenberg lineage):
 *   • Hopfield Hebbian imprint of P patterns ξᵖ:  J_ij = (1/N) Σ_p ξᵖ_i ξᵖ_j,  J_ii = 0  (symmetric).
 *   • Energy (Ising Hamiltonian):                 H = −½ Σ_ij J_ij s_i s_j − Σ_i h_i s_i.
 *   • Metropolis/Glauber settle:                  ΔE_i = 2 s_i (Σ_j J_ij s_j + h_i);
 *                                                  flip s_i if ΔE_i ≤ 0 or U(0,1) < exp(−ΔE_i / T).
 * Imprinted patterns are fixed points at low T, so a field nudge recalls the nearest archetype — the
 * creature's "gut feeling". Pattern overlap mᵖ = (1/N) Σ_i s_i ξᵖ_i ∈ [−1, 1] reads out which one won.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/spin_based_neural_network (MIT, © 2024–2026 tsotchke) — the Ising Metropolis update
 *   (`ising_model.c`) and the spin-Hamiltonian energy/local-field formulation (`nqs_gradient.c`).
 *
 * Deterministic: every stochastic decision draws from a caller-supplied seeded {@link Rng} (no
 * `Math.random`/`Date.now`), so the whole instinct replays from a seed. O(N²) per sweep; the lone apex
 * creature runs a handful of sweeps over N≈24 spins per beat — negligible against the frame budget.
 */
import type { Rng } from '../math/rng';

/** Read-only telemetry of the spin lattice for the SuperCreature/BRAIN view. */
export interface SpinSnapshot {
  /** Number of spins (lattice size N). */
  size: number;
  /** The ±1 spin configuration (length N). */
  spins: number[];
  /** Ising-Hamiltonian energy per spin (lower = deeper in an attractor). */
  energy: number;
  /** Mean spin ∈ [−1, 1] (net "polarisation" of the instinct). */
  magnetization: number;
  /** Number of imprinted archetype patterns. */
  patterns: number;
  /** Overlap mᵖ ∈ [−1, 1] with each stored pattern (the recall strengths). */
  overlap: number[];
  /** Index of the strongest-overlap pattern (the attractor it settled into), −1 if none stored. */
  bestPattern: number;
  /** |overlap| of {@link bestPattern} (0..1 recall confidence). */
  bestOverlap: number;
  /** Settle temperature last used (annealing knob). */
  temperature: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * A Hopfield/Ising associative spin lattice. Construct with size + a seeded {@link Rng} (for the random
 * initial configuration); {@link imprint} the archetypes once; each beat {@link setField} from the
 * mind's signals and {@link settle} with a dedicated seeded stream, then read {@link snapshot}.
 */
export class SpinGlass {
  readonly size: number;
  private readonly spins: Int8Array;
  private readonly couplings: Float64Array; // N×N symmetric, J_ii = 0
  private readonly field: Float64Array; // local fields h_i
  private readonly stored: Int8Array[] = [];
  private temperature = 1;

  constructor(size: number, rng: Rng) {
    if (!Number.isInteger(size) || size < 2) {
      throw new RangeError(`SpinGlass: size must be an integer ≥ 2, got ${size}`);
    }
    this.size = size;
    this.spins = new Int8Array(size);
    this.couplings = new Float64Array(size * size);
    this.field = new Float64Array(size);
    for (let i = 0; i < size; i++) this.spins[i] = rng() < 0.5 ? -1 : 1;
  }

  /**
   * Hebbian-imprint the archetype patterns (Hopfield rule), replacing any previous memory. Each pattern
   * is binarised to ±1 (≥ 0 → +1). Stores the patterns for overlap read-out. O(P·N²).
   */
  imprint(patterns: ReadonlyArray<ArrayLike<number>>): void {
    this.couplings.fill(0);
    this.stored.length = 0;
    const N = this.size;
    for (const p of patterns) {
      const pat = new Int8Array(N);
      for (let i = 0; i < N; i++) pat[i] = (p[i] ?? 0) >= 0 ? 1 : -1;
      this.stored.push(pat);
    }
    const inv = 1 / N;
    for (const pat of this.stored) {
      for (let i = 0; i < N; i++) {
        const pi = pat[i] ?? 1;
        for (let j = i + 1; j < N; j++) {
          const w = pi * (pat[j] ?? 1) * inv;
          this.couplings[i * N + j] = (this.couplings[i * N + j] ?? 0) + w;
          this.couplings[j * N + i] = (this.couplings[j * N + i] ?? 0) + w;
        }
      }
    }
  }

  /** Drive the external local fields from a signal vector (tiled to N, scaled by `gain`, clamped ±4). */
  setField(h: ArrayLike<number>, gain = 1): void {
    const len = h.length || 1;
    for (let i = 0; i < this.size; i++) {
      this.field[i] = clamp((h[i % len] ?? 0) * gain, -4, 4);
    }
  }

  /** Local field at site i: Σ_j J_ij s_j + h_i. O(N). */
  private localField(i: number): number {
    const N = this.size;
    let sum = this.field[i] ?? 0;
    const row = i * N;
    for (let j = 0; j < N; j++) sum += (this.couplings[row + j] ?? 0) * (this.spins[j] ?? 0);
    return sum;
  }

  /**
   * Metropolis/Glauber relaxation: `sweeps` full passes at temperature `T`. Each site flips when it
   * lowers the energy (ΔE ≤ 0) or, thermally, with probability exp(−ΔE/T). Deterministic for a given
   * `rng` stream + state. O(sweeps · N²).
   */
  settle(sweeps: number, temperature: number, rng: Rng): void {
    this.temperature = Math.max(1e-3, temperature);
    const invT = 1 / this.temperature;
    const N = this.size;
    for (let sweep = 0; sweep < sweeps; sweep++) {
      for (let i = 0; i < N; i++) {
        const dE = 2 * (this.spins[i] ?? 0) * this.localField(i);
        if (dE <= 0 || rng() < Math.exp(-dE * invT)) this.spins[i] = -(this.spins[i] ?? 1);
      }
    }
  }

  /** Ising-Hamiltonian energy per spin: (−½ Σ_ij J_ij s_i s_j − Σ_i h_i s_i) / N. O(N²). */
  energy(): number {
    const N = this.size;
    let pair = 0;
    let fieldE = 0;
    for (let i = 0; i < N; i++) {
      const si = this.spins[i] ?? 0;
      fieldE += (this.field[i] ?? 0) * si;
      const row = i * N;
      for (let j = 0; j < N; j++)
        pair += (this.couplings[row + j] ?? 0) * si * (this.spins[j] ?? 0);
    }
    return (-0.5 * pair - fieldE) / N;
  }

  /** Mean spin ∈ [−1, 1]. O(N). */
  magnetization(): number {
    let m = 0;
    for (let i = 0; i < this.size; i++) m += this.spins[i] ?? 0;
    return m / this.size;
  }

  /** Overlap with stored pattern `p`: (1/N) Σ_i s_i ξᵖ_i ∈ [−1, 1]. O(N). */
  overlapWith(p: number): number {
    const pat = this.stored[p];
    if (!pat) return 0;
    let m = 0;
    for (let i = 0; i < this.size; i++) m += (this.spins[i] ?? 0) * (pat[i] ?? 0);
    return m / this.size;
  }

  /** Force the configuration to a stored pattern (used to prime recall). */
  setStateToPattern(p: number): void {
    const pat = this.stored[p];
    if (!pat) return;
    for (let i = 0; i < this.size; i++) this.spins[i] = pat[i] ?? 1;
  }

  /** Read-only telemetry (UI cadence; allocates its arrays). O(P·N + N²). */
  snapshot(): SpinSnapshot {
    const overlap: number[] = [];
    let best = -1;
    let bestAbs = -1;
    for (let p = 0; p < this.stored.length; p++) {
      const m = this.overlapWith(p);
      overlap.push(m);
      if (Math.abs(m) > bestAbs) {
        bestAbs = Math.abs(m);
        best = p;
      }
    }
    return {
      size: this.size,
      spins: Array.from(this.spins),
      energy: this.energy(),
      magnetization: this.magnetization(),
      patterns: this.stored.length,
      overlap,
      bestPattern: best,
      bestOverlap: best >= 0 ? bestAbs : 0,
      temperature: this.temperature,
    };
  }
}
