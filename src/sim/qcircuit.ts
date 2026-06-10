/**
 * QuantumCircuitSystem — the cosmos's quantum "mind" (CONTRACTS V2 — Quantum Wildbeyond).
 *
 * A real statevector register evolved through real unitary gates; the sim writes INTO it
 * (puppet-master interventions and sort-field swaps apply characteristic gate sequences,
 * chaos drives a drift rotation) and reads OUT of it (normalized entropy → telemetry QBIT-S,
 * periodic measurement collapses → QuantumCloud implosions, Born-rule band hues → QuantumCloud
 * colors). Feedback over garnish, per docs/PHILOSOPHY.md rule 4.
 *
 * Cadences (enforced by world.ts, documented here): update() every 30 frames; bands() every
 * 6 frames; events arrive whenever the source systems fire. Every operation is O(2^n) with
 * n ≤ 8 (default 5 ⇒ 32 amplitudes) and allocation-free after construction.
 *
 * No runtime imports of the type hub or three.js — runs headless under `bun test`.
 */
import { QuantumRegister } from '../math/quantum';
import { CHAOS_MAX } from './constants';
import type { PuppetEvent, SimContext } from '../types';

/** AETHON's rx angle per unit chaos (contract: rx(chaos·π/4)). */
const QUARTER_PI = Math.PI / 4;
/** Drift ry angle at CHAOS_MAX — small enough that superposition builds over several updates. */
const DRIFT_MAX_THETA = Math.PI / 8;
/** Band buffer width — matches the default 5-qubit register's 32 basis states. */
const BAND_COUNT = 32;
/**
 * Hue displacement per unit basis probability: a fully collapsed basis state pushes its band to
 * the complementary hue (+0.5), while a uniform superposition barely tints (1/32 · 0.5 ≈ 0.016).
 */
const HUE_GAIN = 0.5;
/** Every MEASURE_EVERY-th update() performs a Born-rule measurement (collapse). */
const MEASURE_EVERY = 8;

/**
 * Event-fed quantum circuit over a {@link QuantumRegister} with chaos-coupled drift, periodic
 * measurement, and a reused 32-entry band-hue buffer for the QuantumCloud.
 */
export class QuantumCircuitSystem {
  private readonly ctx: SimContext;
  private readonly reg: QuantumRegister;
  /** Shared band-hue buffer returned by {@link bands} (reused per call). */
  private readonly bandBuf = new Float32Array(BAND_COUNT);
  /** Round-robin qubit cursor for gate targeting — bounded in [0, qubits) (no unbounded growth). */
  private cursor = 0;
  /** update() counter, wrapped at MEASURE_EVERY (no unbounded growth). */
  private updates = 0;
  private entropyValue: number;
  private lastCollapseValue = -1;

  /**
   * Wires the system to the sim context; uses the injected register or a default 5-qubit one.
   * Only `ctx.rng` (measurement) and `ctx.state.chaos` (gate angles) are read.
   */
  constructor(ctx: SimContext, register?: QuantumRegister) {
    this.ctx = ctx;
    this.reg = register ?? new QuantumRegister(5);
    this.entropyValue = this.reg.entropy();
  }

  /** Normalized 0..1 Shannon entropy of the register, recomputed by each update() (QBIT-S). */
  get entropy(): number {
    return this.entropyValue;
  }

  /** Basis index of the last measurement collapse, or -1 before the first measurement. */
  get lastCollapse(): number {
    return this.lastCollapseValue;
  }

  /**
   * Applies the characteristic gate sequence of a puppet-master intervention:
   * AETHON → rx(chaos·π/4); SELENE → h + cz; KRONOS → x + swap. Unknown names are ignored.
   * Two-qubit follow-ups are skipped on a 1-qubit register (no valid partner exists).
   * Reads `e.name` synchronously only — safe with the emitter's reused scratch event.
   * O(2^n) per event; allocation-free.
   */
  onPuppetEvent(e: PuppetEvent): void {
    const reg = this.reg;
    const wide = reg.qubits >= 2;
    switch (e.name) {
      case 'AETHON':
        reg.apply('rx', this.nextQubit(), undefined, this.ctx.state.chaos * QUARTER_PI);
        return;
      case 'SELENE': {
        const t = this.nextQubit();
        reg.apply('h', t);
        // Round-robin consecutive draws are distinct whenever qubits >= 2.
        if (wide) reg.apply('cz', t, this.nextQubit());
        return;
      }
      case 'KRONOS': {
        const t = this.nextQubit();
        reg.apply('x', t);
        if (wide) reg.apply('swap', t, this.nextQubit());
        return;
      }
      default:
        return;
    }
  }

  /**
   * Sort-field feedback: a swap of sort indices (a, b) applies a CX whose control/target roles
   * are chosen by the parity of a+b — even keeps a→control, odd flips. Qubits are a%n and b%n,
   * nudged apart on collision; degenerates to a plain x on a 1-qubit register.
   * O(2^n) per swap; allocation-free.
   */
  onSortSwap(a: number, b: number): void {
    const reg = this.reg;
    const n = reg.qubits;
    if (n < 2) {
      reg.apply('x', 0);
      return;
    }
    let ctl = a % n;
    let tgt = b % n;
    if (ctl === tgt) tgt = (tgt + 1) % n;
    if (((a + b) & 1) === 1) {
      const tmp = ctl;
      ctl = tgt;
      tgt = tmp;
    }
    reg.apply('cx', tgt, ctl);
  }

  /**
   * Cadenced evolution (world.ts calls this every 30 frames): applies a chaos-scaled ry drift
   * gate to the round-robin qubit, measures (collapses) the register on every 8th update via
   * the injected seeded rng, then recomputes the cached entropy. O(2^n); allocation-free.
   */
  update(): void {
    const reg = this.reg;
    const theta = (this.ctx.state.chaos / CHAOS_MAX) * DRIFT_MAX_THETA;
    reg.apply('ry', this.nextQubit(), undefined, theta);
    this.updates = (this.updates + 1) % MEASURE_EVERY;
    if (this.updates === 0) {
      this.lastCollapseValue = reg.measure(this.ctx.rng);
    }
    this.entropyValue = reg.entropy();
  }

  /**
   * Per-band hues for the QuantumCloud (world.ts calls this every 6 frames): band i gets the
   * base rainbow hue i/32 displaced by HUE_GAIN per unit probability of basis state i (mod the
   * register dimension), wrapped into [0, 1). Returns a REUSED 32-entry Float32Array — valid
   * only until the next bands() call. O(2^n + 32); allocation-free.
   */
  bands(): Float32Array {
    const p = this.reg.probabilities();
    const dim = p.length;
    const out = this.bandBuf;
    for (let i = 0; i < BAND_COUNT; i++) {
      const hue = i / BAND_COUNT + (p[i % dim] ?? 0) * HUE_GAIN;
      out[i] = hue - Math.floor(hue);
    }
    return out;
  }

  /** Advances the round-robin qubit cursor and returns the previous value. O(1). */
  private nextQubit(): number {
    const q = this.cursor;
    this.cursor = (this.cursor + 1) % this.reg.qubits;
    return q;
  }
}
