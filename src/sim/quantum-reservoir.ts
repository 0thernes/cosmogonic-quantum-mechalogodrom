/**
 * THE QUANTUM RESERVOIR — Super Creature 1.2's quantum-reservoir-computing readout. Reservoir computing
 * harnesses a fixed high-dimensional nonlinear dynamical system as a temporal kernel and trains only a
 * linear readout. **Quantum** reservoir computing (Fujii & Nakajima 2017, _Phys. Rev. Applied_ 8, 024030;
 * Nakajima et al. 2019; Mujal et al. 2021, _Adv. Quantum Technol._) makes the reservoir a quantum system:
 * the exponentially large Hilbert space of a few qubits is itself the rich nonlinear feature space, and
 * the only learned/used part is a linear readout of its measured observables over time.
 *
 * Here the reservoir is NOT a new network — it is the apex mind's existing **6-qubit statevector register**
 * ({@link ../sim/super-qubits}, the Moonlab/QGTL engine). This module is the READOUT: each beat it takes
 * the register's per-qubit Bloch observables (⟨X⟩,⟨Y⟩,⟨Z⟩ × 6 = 18 measured features), keeps a fading
 * leaky-integrated trace of them (the temporal memory a single-shot measurement lacks), and projects that
 * trace through a FIXED seeded readout into a small feature vector. It also reports `quantumFlux` — the
 * velocity of the quantum state, i.e. how fast the wavefunction's observables are moving this beat — which the
 * mind reads as a curiosity/arousal drive (a churning quantum mind is a restless, exploratory one). This
 * is distinct from the classical echo-state {@link ./reservoir} (whose reservoir is a recurrent MLP): here
 * the *quantum register itself* is the reservoir, exactly as QRC prescribes.
 *
 * Deterministic (fixed seeded readout + pure arithmetic — no `Math.random`/`Date.now`), allocation-free in
 * steady state, bounded (features ∈ [−1,1] via tanh; flux ∈ [0,1]), NaN-safe. Pure leaf: no DOM, no THREE.
 */
import type { Rng } from '../math/rng';

/** Measured observables fed in each beat: ⟨X⟩,⟨Y⟩,⟨Z⟩ per qubit for the 6-qubit register. */
export const QRC_IN = 18;
/** Linear-readout feature width — a compact quantum-temporal cognition vector. */
export const QRC_FEAT = 4;
/** Leaky-integration rate of the observable trace (lower = longer quantum-temporal memory). */
const QRC_LEAK = 0.25;
/** Readout input gain (keeps tanh in its responsive band given 18 summed inputs). */
const QRC_SCALE = 1 / QRC_IN;
/** Flux normaliser: a full ±1 swing on every observable maps to ~1 (2·√IN is the max L2 step). */
const QRC_FLUX_SCALE = 1 / (2 * Math.sqrt(QRC_IN));

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const finite = (v: number): number => (Number.isFinite(v) ? v : 0);

/** Read-only telemetry of the quantum reservoir readout for the BRAIN / SuperCreature boards (UI cadence). */
export interface QuantumReservoirSnapshot {
  in: number;
  /** The linear-readout feature vector (each ∈ [−1,1]). */
  feature: number[];
  /** Quantum-state velocity this beat (‖Δobservables‖, normalised 0..1) — drives curiosity. */
  flux: number;
  /** Mean |trace| across the leaky observable memory, 0..1 — overall reservoir drive. */
  energy: number;
}

/**
 * The quantum-reservoir-computing readout. Construct ONCE per mind with a dedicated seeded {@link Rng};
 * each beat call {@link step} with the register's 18 Bloch observables, then read {@link quantumFlux} /
 * {@link feature} to modulate cognition and {@link snapshot} for telemetry.
 */
export class QuantumReservoir {
  readonly inputs = QRC_IN;
  private readonly w: Float64Array; // QRC_FEAT × QRC_IN fixed readout
  private readonly mem = new Float64Array(QRC_IN); // leaky observable trace (the temporal memory)
  private readonly prev = new Float64Array(QRC_IN); // last observables (for the flux reading)
  private readonly feat = new Float64Array(QRC_FEAT);
  private flux = 0;
  private seeded = false; // first step only seeds the trace (no flux from the |0…0⟩ baseline)

  constructor(rng: Rng) {
    this.w = new Float64Array(QRC_FEAT * QRC_IN);
    for (let i = 0; i < this.w.length; i++) this.w[i] = rng() * 2 - 1;
  }

  /**
   * Advance the readout one beat with the register's measured observables `obs` (length ≥ {@link QRC_IN}).
   * Updates the quantum-state flux, the leaky observable trace, and the linear-readout features.
   * Allocation-free; O(QRC_FEAT · QRC_IN). NaN-safe (a non-finite observable contributes 0).
   */
  step(obs: ArrayLike<number>): void {
    const { mem, prev, w, feat } = this;
    // ── quantum-state velocity: ‖obs − prev‖ (skipped on the very first beat) ──
    let d2 = 0;
    for (let i = 0; i < QRC_IN; i++) {
      const x = finite(obs[i] ?? 0);
      const dx = x - (prev[i] ?? 0);
      d2 += dx * dx;
      prev[i] = x;
    }
    this.flux = this.seeded ? clamp01(Math.sqrt(d2) * QRC_FLUX_SCALE) : 0;
    this.seeded = true;
    // ── leaky-integrate the observable trace (the temporal memory) ──
    for (let i = 0; i < QRC_IN; i++) {
      const x = finite(obs[i] ?? 0);
      mem[i] = (1 - QRC_LEAK) * (mem[i] ?? 0) + QRC_LEAK * x;
    }
    // ── fixed linear readout → tanh features ──
    for (let f = 0; f < QRC_FEAT; f++) {
      const base = f * QRC_IN;
      let acc = 0;
      for (let i = 0; i < QRC_IN; i++) acc += (w[base + i] ?? 0) * (mem[i] ?? 0);
      feat[f] = Math.tanh(acc * QRC_SCALE);
    }
  }

  /** Quantum-state velocity this beat (0..1) — how fast the register's observables are moving. */
  get quantumFlux(): number {
    return this.flux;
  }

  /** Readout feature f ∈ [−1,1] (the quantum-temporal cognition vector). */
  feature(f: number): number {
    return f >= 0 && f < QRC_FEAT ? (this.feat[f] ?? 0) : 0;
  }

  /** Build the read-only board snapshot. O(QRC_IN). */
  snapshot(): QuantumReservoirSnapshot {
    let e = 0;
    for (let i = 0; i < QRC_IN; i++) {
      const v = this.mem[i] ?? 0;
      e += v < 0 ? -v : v;
    }
    return {
      in: QRC_IN,
      feature: Array.from(this.feat),
      flux: this.flux,
      energy: clamp01(e / QRC_IN),
    };
  }
}
