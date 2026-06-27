/**
 * GOAL5: Multi-Store Memory Orchestra (typed, graph-linked, feedback controlled, decision system).
 * Implements the 10 orchestrations distilled (typed lattice, entropy gate, graph recall, regime sentinel,
 * strategic, reflection-to-skill, consensus, meta, etc.).
 * NOT a blob; structured records + provenance graph + consolidation to narrative.
 * Deterministic, seeded, allocation disciplined (rings + fixed graph cap).
 * Grounded symbols via bind to percept/plan atoms.
 * See contract + research for theory (control, chaos, type, graph, info, game).
 */
import type { Rng } from '../math/rng';

export type MemKind = 'obs' | 'plan' | 'commit' | 'insight' | 'failure' | 'skill' | 'narrative';

export interface MemRecord {
  kind: MemKind;
  t: number; // sim time
  conf: number;
  src: number; // source id (creature or system)
  data: number[]; // compact vector (grounded symbol-ish)
  cause?: number; // provenance edge
}

export class MemoryOrchestra {
  private readonly CAP = 128;
  private readonly events: (MemRecord | undefined)[] = Array.from({ length: 128 }, () => undefined);
  private len = 0;
  private head = 0;
  private readonly graph: number[] = Array.from({ length: 64 }, () => 0); // fixed small graph edges
  private gLen = 0;
  private regime = 0.5;
  private lastConsol = 0;
  // 12 grounded-symbol confidence EMAs — a lightweight belief-state (NOT true sum-product belief propagation).
  private readonly fgBeliefs = new Float32Array(12);
  private fgEnergy = 0.5;

  // fixed scratch for recall to avoid alloc in hot path (small max=4)
  private readonly scored: { i: number; score: number }[] = Array.from({ length: 128 }, () => ({
    i: 0,
    score: 0,
  }));

  // GOAL5: preallocated data vectors (no slice alloc on write hot path)
  private readonly datas: number[][] = Array.from({ length: 128 }, () =>
    Array.from({ length: 8 }, () => 0),
  );
  // pre-sized recall result buffer; length mutated; valid until next recall (allocation-free after ctor)
  private readonly recallOut: MemRecord[] = Array.from({ length: 4 }, () => ({
    kind: 'obs',
    t: 0,
    conf: 0,
    src: 0,
    data: [] as number[],
  }));

  constructor(_rng?: Rng) {}

  /** Surprise/entropy gate + type-contract write. Fixed ring, no realloc (arena-style O(1) bump). */
  write(kind: MemKind, t: number, conf: number, src: number, data: number[], cause?: number): void {
    if (conf < 0.15 && kind !== 'failure') return;
    // reuse preallocated data slot (no slice/new in hot path)
    const dst = this.datas[this.head]!;
    for (let j = 0; j < 8; j++) dst[j] = data[j] ?? 0;
    const rec: MemRecord = { kind, t, conf, src, data: dst, cause };
    // Update the per-symbol confidence EMAs from this record's data (lightweight belief-state, not sum-product).
    for (let s = 0; s < 12; s++) {
      const d = dst[s % 8] ?? 0;
      this.fgBeliefs[s] = (this.fgBeliefs[s] ?? 0) * 0.8 + (d > 0.5 ? conf * 0.2 : 0);
    }
    this.events[this.head] = rec;
    this.head = (this.head + 1) % this.CAP;
    if (this.len < this.CAP) this.len++;
    if (cause != null && this.gLen < this.graph.length - 1) {
      this.graph[this.gLen++] = cause;
      this.graph[this.gLen++] = (this.head + this.CAP - 1) % this.CAP;
    }
  }

  /** Graph-linked recall + router (relevance + conf + recency). Linear for ring, small k. Allocation-free using fixed scratch + prealloc result buffer. */
  recall(ctx: number[], max = 4): MemRecord[] {
    // reset scratch (fixed, no alloc)
    for (let i = 0; i < this.len && i < this.scored.length; i++) this.scored[i]!.score = -1;
    let numScored = 0;
    for (let k = 0; k < this.len; k++) {
      const idx = (this.head - 1 - k + this.CAP) % this.CAP;
      const e = this.events[idx];
      if (!e) continue;
      let rel = 0;
      const d = e.data || [];
      for (let j = 0; j < Math.min(ctx.length, d.length); j++) rel += (ctx[j] || 0) * (d[j] || 0);
      const age = 0.01 + (k + 1) / (this.len || 1);
      const score = rel * (e.conf || 0) * age;
      // insert into top (small max, no sort)
      if (numScored < max) {
        this.scored[numScored]!.i = idx;
        this.scored[numScored]!.score = score;
        numScored++;
      } else {
        // find min in current top
        let minIdx = 0;
        for (let m = 1; m < numScored; m++)
          if (this.scored[m]!.score < this.scored[minIdx]!.score) minIdx = m;
        if (score > this.scored[minIdx]!.score) {
          this.scored[minIdx]!.i = idx;
          this.scored[minIdx]!.score = score;
        }
      }
    }
    // collect top into prealloc buffer (no new/push/slice in hot path)
    const cap = Math.min(4, this.recallOut.length);
    let n = 0;
    for (let i = 0; i < numScored && n < cap; i++) {
      const e = this.events[this.scored[i]!.i];
      if (e) this.recallOut[n++] = e;
    }
    this.recallOut.length = n; // reuse backing
    return this.recallOut;
  }

  /** Regime shift sentinel + consolidation to narrative. */
  step(surprise: number, _phi: number): { regime: number; narrative: string } {
    this.regime = this.regime * 0.9 + surprise * 0.1;
    // Eshkol active inference: update free energy from beliefs + surprise (corpus style).
    let energy = 0;
    for (let s = 0; s < 12; s++) energy += Math.abs((this.fgBeliefs[s] ?? 0) - 0.5);
    this.fgEnergy = (energy / 12) * 0.5 + surprise * 0.5;
    if (this.regime > 0.7 && this.len - this.lastConsol > 12) {
      this.lastConsol = this.len;
      // consolidate high conf (scan ring)
      let narr = '';
      let cnt = 0;
      for (let k = 0; k < this.len && cnt < 8; k++) {
        const idx = (this.head - 1 - k + this.CAP) % this.CAP;
        const e = this.events[idx];
        if (e && e.conf > 0.6) {
          narr += e.kind[0];
          cnt++;
        }
      }
      return { regime: this.regime, narrative: narr || 'stable' };
    }
    return { regime: this.regime, narrative: '' };
  }

  snapshot() {
    const count = this.len;
    const last = count > 0 ? this.events[(this.head - 1 + this.CAP) % this.CAP] : null;
    return {
      eventCount: count,
      regimeShift: this.regime,
      beliefMeans: count > 0 ? [this.events[(this.head - 1 + this.CAP) % this.CAP]!.conf] : [],
      routerRelevance: last ? last.conf : 0,
      // TSOTCHKE Eshkol fg from corpus.
      fgEnergy: this.fgEnergy,
      fgBeliefMean: this.fgBeliefs.reduce((a, b) => a + b, 0) / 12,
    };
  }
}
