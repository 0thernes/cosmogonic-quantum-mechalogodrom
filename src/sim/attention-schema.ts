/**
 * AST-1: Explicit Attention Schema (model of own attention).
 * A live, measurable self-model of what the mind is attending to, with history and confidence.
 * Used for GWT-4 state-dependent attention + metacog + HOT monitoring.
 * Deterministic, allocation-aware (prealloc rings), no learning of weights.
 * Seeded construction for reproducibility.
 * See GOAL5 contract, Butlin indicators.
 */
import type { Rng } from '../math/rng';

export interface AttentionSnapshot {
  focus: number[]; // normalized salience over key dims (percept groups, plans, memory, quantum)
  confidence: number; // how stable/consistent the current focus is (0..1)
  historyMean: number; // EMA of focus entropy or shift (regime signal)
  dominantDim: number; // argmax index
}

const DIMS = 8; // e.g. 0-3 percept clusters, 4 plans, 5 mem, 6-7 quantum/cliff

export class AttentionSchema {
  private readonly focus = new Float32Array(DIMS);
  private readonly hist = new Float32Array(16); // ring for shift history
  private hIdx = 0;
  private conf = 0.5;
  private meanShift = 0;

  constructor(_rng?: Rng) {
    // seeded init optional; default neutral
    for (let i = 0; i < DIMS; i++) this.focus[i] = 1 / DIMS;
  }

  /** Update from current signals (salience vector, surprise, ignition, cliff reflex etc). O(D) */
  update(signals: ArrayLike<number>, surprise: number, ignition: number, reflex: number): void {
    // simple weighted blend + normalize (info theoretic flavor)
    let sum = 0;
    for (let i = 0; i < DIMS; i++) {
      const s = (signals[i] ?? 0.1) as number;
      const w = 0.6 * s + 0.2 * (i < 4 ? surprise : 0) + 0.1 * ignition + 0.1 * reflex;
      const fi = this.focus[i] ?? 0;
      this.focus[i] = fi * 0.7 + w * 0.3;
      sum += this.focus[i] ?? 0;
    }
    if (sum > 1e-9)
      for (let i = 0; i < DIMS; i++) this.focus[i] = ((this.focus[i] ?? 0) as number) / sum;

    // confidence = low entropy = focused (inverse normalized entropy proxy)
    let ent = 0;
    for (let i = 0; i < DIMS; i++) {
      const p = this.focus[i] ?? 0;
      if (p > 1e-9) ent -= p * Math.log(p);
    }
    this.conf = 1 - Math.min(1, ent / Math.log(DIMS));

    // history shift
    const prev = this.hist[(this.hIdx + 15) % 16] || 0;
    const f0 = (this.focus[0] ?? 0) as number;
    const shift = Math.abs(f0 - prev);
    this.hist[this.hIdx] = f0;
    this.hIdx = (this.hIdx + 1) % 16;
    this.meanShift = this.meanShift * 0.85 + shift * 0.15;
  }

  /** Alloc-free read of current attention confidence (for cons.attention wiring in SuperMind). */
  get confidence(): number {
    return this.conf;
  }

  snapshot(): AttentionSnapshot {
    let dom = 0,
      maxv = -1;
    for (let i = 0; i < DIMS; i++) {
      const v = this.focus[i] ?? 0;
      if (v > maxv) {
        maxv = v;
        dom = i;
      }
    }
    return {
      focus: Array.from(this.focus),
      confidence: this.conf,
      historyMean: this.meanShift,
      dominantDim: dom,
    };
  }
}
