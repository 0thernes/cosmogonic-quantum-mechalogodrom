/**
 * THE HOLOGRAPHIC MEMORY (V97) — Super Creature 1.1's COMPOSITIONAL, ANALOGICAL memory: a Vector Symbolic
 * Architecture / Holographic Reduced Representation. Where the spin-glass recalls a FIXED archetype by energy
 * descent, the successor map predicts plan TRANSITIONS, and the reservoir holds a temporal ECHO, this faculty
 * does something none of them can: it BINDS structured (context ⊗ action) pairs into a single distributed
 * vector and recalls them by ALGEBRA — the neuro-symbolic bridge between connectionist substrate and symbolic
 * structure (Plate, "Holographic Reduced Representations", IEEE TNN 1995; Kanerva, "Hyperdimensional Computing",
 * Cognitive Computation 2009; Gayler, "Vector Symbolic Architectures answer Jackendoff's challenges", 2003;
 * Kleyko, Rachkovskij, Osipov & Rahimi, "A Survey on Hyperdimensional Computing aka Vector Symbolic
 * Architectures", ACM Computing Surveys 2022).
 *
 * MODEL (the MAP — Multiply/Add/Permute — VSA on bipolar hypervectors, Gayler 2003): atoms are random
 * {−1,+1}^D hypervectors, near-ORTHOGONAL in high D (⟨a,b⟩/D ~ 𝒩(0, 1/D)). The three operations:
 *   • BIND   c = a ⊙ b  (element-wise product) — invertible and SELF-INVERSE on bipolar (a⊙a = 1⃗), so
 *            unbind(a⊙b, a) = b EXACTLY. Binding produces a vector dissimilar to its factors (it "ties" them).
 *   • BUNDLE  s = sign(Σ vᵢ) (majority) — superposition; the sum stays SIMILAR to each addend (a set).
 *   • CLEANUP  argmax_k ⟨noisy, atomₖ⟩ — snap a noisy vector back to the nearest clean codebook atom.
 * Each beat the mind ENCODEs its situation into a context hypervector (a sign-bundle of feature atoms weighted
 * by the live senses), BINDs it with the committed plan's atom, and folds that into a decaying holographic
 * TRACE M ← decay·M + (context ⊙ plan). To RECALL, it unbinds the trace by the CURRENT context
 * (M ⊙ context ≈ the plan bound to similar past contexts) and cleans up against the 7 plan atoms — an
 * ANALOGICAL prior: "in situations like this, I chose …". That biases the next plan (a bounded vote).
 *
 * Deterministic (the codebook atoms are the ONLY randomness, drawn ONCE from a seeded {@link Rng} and frozen;
 * neither observe() nor recall() draws a random number or reads a clock) and allocation-free in steady state
 * (every buffer preallocated; the Float32 trace accumulator decays in place). Pure leaf: no DOM, no THREE.
 */
import type { Rng } from '../math/rng';

/** Hypervector dimensionality — high enough that random atoms are near-orthogonal (σ⟨a,b⟩/D ≈ 1/√D ≈ 0.044). */
export const HRR_DIM = 512;
/** Number of situational FEATURE roles bound into the context hypervector. */
export const HRR_FEATURES = 8;
/** Trace forgetting: M ← HRR_DECAY·M + experience. Slow enough that many distinct associations coexist as a
 *  superposition (effective capacity ≈ 1/(1−decay) bindings) rather than collapsing to a recency memory. */
const HRR_DECAY = 0.96;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Read-only telemetry of the holographic memory for the BRAIN / SuperCreature boards (UI cadence). */
export interface HolographicSnapshot {
  /** Hypervector dimensionality D. */
  dim: number;
  /** Plan-archetype count K (the cleanup codebook size). */
  plans: number;
  /** The plan the trace ANALOGICALLY recalls for the current context, or −1 before the first recall. */
  recalledPlan: number;
  /** Confidence of the recall = the cleanup cosine of the winning plan, 0..1. */
  confidence: number;
  /** Cosine of the unbound query with each of the K plan atoms (each in [−1,1]). */
  similarity: number[];
  /** Mean |trace| amplitude, normalised 0..1 — how "loaded" the holographic trace is. */
  traceEnergy: number;
  /** Distinctness of the recall = (top − 2nd) cleanup cosine, 0..1 (high ⇒ an unambiguous analogy). */
  margin: number;
  /** Extension: typed event-sourced count of high-value narrative episodes written. */
  narrativeEventCount: number;
  /** Regime sentinel: avg prediction-error trend (0..1, >0.5 signals shift). */
  regimeShift: number;
  /** Grounded belief state means for the 12 fixed symbols (energy-trust ... power-margin). */
  belief: number[];
  /** Router last retrieval relevance (drives + conf + recency score). */
  routerRelevance: number;
}

/**
 * The holographic (VSA / HRR) compositional memory. Construct ONCE per mind with a dedicated seeded
 * {@link Rng} (its codebook atoms are the only randomness); call {@link recall} each beat with the situational
 * senses to get an analogical plan prior, then {@link observe} the committed plan, and {@link snapshot} at UI
 * cadence.
 */
export class HolographicMemory {
  /** Plan-archetype count K (the cleanup codebook). */
  readonly plans: number;
  private readonly dim: number;
  private readonly feats: number;
  private readonly plan: Int8Array; // K·D frozen plan atoms (±1)
  private readonly feat: Int8Array; // F·D frozen feature-role atoms (±1)
  private readonly trace: Float32Array; // D decaying holographic accumulator
  private readonly ctx: Int8Array; // D context-hypervector scratch
  private readonly query: Float32Array; // D unbound-query scratch (real-valued — preserves the superposition)
  private readonly sims: Float64Array; // K cleanup cosines (reused)
  private recalled = -1;
  private conf = 0;
  private marg = 0;
  // Persistent lifelong narrative + grounded symbol (extension inside this module). Preallocated; hot updates alloc-free.
  private readonly narrative = new PersistentNarrative();
  private lastNarrRel = 0;

  constructor(rng: Rng, plans = 7, dim = HRR_DIM, features = HRR_FEATURES) {
    const K = Math.max(2, Math.floor(plans));
    const D = Math.max(8, Math.floor(dim));
    const F = Math.max(1, Math.floor(features));
    this.plans = K;
    this.dim = D;
    this.feats = F;
    this.plan = new Int8Array(K * D);
    for (let i = 0; i < this.plan.length; i++) this.plan[i] = rng() < 0.5 ? -1 : 1;
    this.feat = new Int8Array(F * D);
    for (let i = 0; i < this.feat.length; i++) this.feat[i] = rng() < 0.5 ? -1 : 1;
    this.trace = new Float32Array(D);
    this.ctx = new Int8Array(D);
    this.query = new Float32Array(D);
    this.sims = new Float64Array(K);
  }

  /** Encode the situation into a bipolar CONTEXT hypervector: sign of the feature atoms bundled with weights
   *  (2·clamp01(senseⱼ) − 1) ∈ [−1,1]. Similar situations ⇒ similar context vectors. Written into `this.ctx`. */
  private encodeContext(senses: ArrayLike<number>): void {
    const { ctx, feat, dim, feats } = this;
    for (let i = 0; i < dim; i++) {
      let acc = 0;
      for (let j = 0; j < feats; j++) {
        const w = 2 * clamp01(senses[j] ?? 0) - 1; // feature activation mapped to [−1,1]
        acc += w * (feat[j * dim + i] ?? 0);
      }
      ctx[i] = acc >= 0 ? 1 : -1; // sign-bundle (ties broken toward +1)
    }
  }

  /**
   * RECALL the analogical plan prior for the current situation: unbind the holographic trace by the current
   * context (query = sign(trace) ⊙ context) and clean up against the K plan atoms. Returns the recalled plan
   * index (−1 if the trace is empty). O(F·D + K·D); allocation-free. Call BEFORE the plan argmax.
   */
  recall(senses: ArrayLike<number>): number {
    const { trace, ctx, query, plan, sims, dim, plans } = this;
    this.encodeContext(senses);
    let energy = 0;
    let qnorm = 0;
    for (let i = 0; i < dim; i++) {
      const t = trace[i] ?? 0;
      energy += t < 0 ? -t : t;
      const q = t * (ctx[i] ?? 1); // unbind the current context — REAL-valued, keeps the superposition weights
      query[i] = q;
      qnorm += q * q;
    }
    if (energy < 1e-9 || qnorm < 1e-12) {
      this.recalled = -1;
      this.conf = 0;
      this.marg = 0;
      for (let k = 0; k < plans; k++) sims[k] = 0;
      return -1;
    }
    const inv = 1 / Math.sqrt(qnorm * dim); // |query|·|planₖ| = √qnorm · √D (each plan atom is ±1)
    let best = -1;
    let bestV = -Infinity;
    let second = -Infinity;
    for (let k = 0; k < plans; k++) {
      const base = k * dim;
      let dot = 0;
      for (let i = 0; i < dim; i++) dot += (query[i] ?? 0) * (plan[base + i] ?? 0);
      const cos = dot * inv; // proper cosine ∈ [−1,1]
      sims[k] = cos;
      if (cos > bestV) {
        second = bestV;
        bestV = cos;
        best = k;
      } else if (cos > second) {
        second = cos;
      }
    }
    this.recalled = best;
    this.conf = clamp01(bestV);
    this.marg = clamp01(bestV - (second === -Infinity ? bestV : second));
    return best;
  }

  /**
   * OBSERVE the committed plan: bind it with the current context and fold the binding into the decaying
   * holographic trace, M ← HRR_DECAY·M + (context ⊙ plan). Call AFTER the plan is chosen, with the SAME senses
   * passed to {@link recall} this beat (the context is recomputed; cheap + keeps the call self-contained).
   * O(F·D + D); allocation-free.
   */
  observe(planIndex: number, senses: ArrayLike<number>): void {
    if (planIndex < 0 || planIndex >= this.plans) return;
    const { trace, ctx, plan, dim } = this;
    this.encodeContext(senses);
    const base = planIndex * dim;
    for (let i = 0; i < dim; i++) {
      const bound = (ctx[i] ?? 1) * (plan[base + i] ?? 1); // context ⊙ plan (±1)
      trace[i] = HRR_DECAY * (trace[i] ?? 0) + bound;
    }
  }

  /**
   * Record typed narrative event (0=OBSERVE ... 5=REGIME) after plan / on percept. Surprise/entropy gate
   * inside. Also updates provenance links, belief state, regime, and consolidates if high salience.
   * O(1) or O(D) on consolidate. Allocation-free hot.
   */
  recordEvent(
    type: NarrativeEvent,
    planIndex: number,
    salience: number,
    surprise: number,
    senses?: ArrayLike<number>,
  ): void {
    this.narrative.record(type, planIndex, salience, surprise, senses);
  }

  /**
   * Router retrieval using relevance to current drives (or drive proxy) + belief conf + recency.
   * Returns best-matching past plan index (−1 none) for vote. O(EPISODE_CAP). Allocation-free.
   */
  routeRecall(drives: ArrayLike<number>): number {
    const r = this.narrative.routeRecall(drives);
    this.lastNarrRel = r.relevance; // hot internal for vote (snapshot pulls from narr)
    return r.plan;
  }
  /** Last router relevance (for bounded vote scaling; 0..1). */
  get lastRouterRelevance(): number {
    return this.lastNarrRel;
  }

  /** The plan the trace last recalled (−1 before the first {@link recall}). */
  get recalledPlan(): number {
    return this.recalled;
  }

  /** Confidence of the last recall (cleanup cosine of the winner), 0..1. */
  get confidence(): number {
    return this.conf;
  }

  /** Build the read-only board snapshot. O(D + K); allocates the public arrays (UI cadence only). */
  snapshot(): HolographicSnapshot {
    const { trace, sims, dim, plans } = this;
    let energy = 0;
    for (let i = 0; i < dim; i++) {
      const t = trace[i] ?? 0;
      energy += t < 0 ? -t : t;
    }
    // The steady-state trace amplitude is bounded by the geometric sum 1/(1−decay); normalise against it.
    const norm = 1 / (1 - HRR_DECAY);
    const narrSnap = this.narrative.snapshot();
    return {
      dim,
      plans,
      recalledPlan: this.recalled,
      confidence: this.conf,
      similarity: Array.from({ length: plans }, (_, k) => sims[k] ?? 0),
      traceEnergy: clamp01(energy / dim / norm),
      margin: this.marg,
      // extension: persistent lifelong narrative + grounded symbol layer (10 orchestrations)
      narrativeEventCount: narrSnap.eventCount,
      regimeShift: narrSnap.regimeShift,
      belief: narrSnap.beliefMeans,
      routerRelevance: narrSnap.routerRelevance,
    };
  }
}

// ── Persistent lifelong narrative + grounded symbol layer (user 10 orchestrations) ────────────────
// Extension inside holographic module per mandate. Typed event-sourced ring (fixed), graph provenance
// (fixed-size link vectors), belief-state (bayes-like on 12 grounded symbols), surprise/entropy gate,
// regime sentinel (error-trend), consolidation (high-salience via decay bundle on HRR-dim semantic),
// router retrieval (drives/conf/recency). Multi-store orchestra facade over the VSA substrate.
// Alloc-free hot paths (prealloc rings/scratch; O(cap) = O(1) bounded for router). Deterministic (no
// clocks, no unseeded rng in ops). Seeded only at root ctor if needed (here pure). JSDoc + complexity.
// No sentience claim: this is a decision-biasing store + symbol grounder, part of closed control loop.

const EPISODE_CAP = 64;
const SYMBOL_COUNT = 12;

/** Typed event records for event-sourced narrative (enum as numeric for tight arrays). */
export const NARRATIVE_EVENT = {
  OBSERVE: 0 as const,
  PLAN: 1 as const,
  OUTCOME: 2 as const,
  COMMIT: 3 as const,
  INSIGHT: 4 as const,
  REGIME: 5 as const,
};
export type NarrativeEvent = (typeof NARRATIVE_EVENT)[keyof typeof NARRATIVE_EVENT];

/** Snapshot of the narrative + symbol layer (alloc only at UI cadence). */
export interface NarrativeSnapshot {
  eventCount: number;
  regimeShift: number; // 0..1 detector from avg pred-err trend
  beliefMeans: number[]; // 12 grounded symbols
  routerRelevance: number; // last retrieval score
}

/**
 * Dedicated narrative layer (multi-store orchestra core). Lives inside the holographic module as
 * extension. Fixed rings/vectors keep everything allocation-free in the hot path. O(1) writes;
 * router recall O(EPISODE_CAP) bounded. All math deterministic. Uses existing HRR_DIM for semantic
 * consolidation bundling (mean/decay superposition).
 */
class PersistentNarrative {
  private readonly cap = EPISODE_CAP;
  // typed event-sourced ring (fixed capacity, circular)
  private readonly types = new Uint8Array(EPISODE_CAP);
  private readonly plans = new Int8Array(EPISODE_CAP); // −1 or plan index 0..K−1
  private readonly saliences = new Float32Array(EPISODE_CAP);
  private head = 0;
  private count = 0;
  // provenance graph: simple fixed-size vectors (caused/contradict links to prior episode indices)
  private readonly causedBy = new Int16Array(EPISODE_CAP); // −1 = none
  private readonly contradicts = new Int16Array(EPISODE_CAP);
  // belief state: fixed 12-symbol vector with mean/conf/uncert (bayes-like precision weighting)
  private readonly bMean = new Float32Array(SYMBOL_COUNT);
  private readonly bConf = new Float32Array(SYMBOL_COUNT);
  private readonly bUncert = new Float32Array(SYMBOL_COUNT);
  // regime sentinel: avg prediction error trend over short window
  private readonly errRing = new Float32Array(8);
  private errHead = 0;
  private avgErr = 0.5;
  private prevAvgErr = 0.5;
  private regime = 0;
  // consolidation: high-salience episodes bundled (decay + add) into semantic trace (multi-res)
  private readonly semTrace = new Float32Array(HRR_DIM);
  // router scratch (alloc-free scoring)
  private readonly scores = new Float32Array(EPISODE_CAP);
  private lastRouterRel = 0;

  constructor() {
    for (let i = 0; i < SYMBOL_COUNT; i++) {
      this.bMean[i] = 0.5;
      this.bUncert[i] = 0.85; // start uncertain
    }
    // caused/contradict default −1 (no link)
    for (let i = 0; i < EPISODE_CAP; i++) {
      this.causedBy[i] = -1;
      this.contradicts[i] = -1;
    }
  }

  /** Surprise/entropy gate — only high-value writes enter the lifelong store. O(1). */
  private gate(surprise: number, entropyApprox: number): boolean {
    const val = Math.max(surprise, entropyApprox);
    return val > 0.12; // high value threshold (tunable in bounds)
  }

  /** Bayes-like update for one grounded symbol. */
  private bayes(sym: number, obs: number, strength: number): void {
    const si = sym | 0;
    let m = this.bMean[si] ?? 0.5;
    let c = this.bConf[si] ?? 0;
    let u = this.bUncert[si] ?? 0.5;
    const w = clamp01(strength * (1 - u));
    m = m + w * (obs - m);
    c = clamp01(c + 0.65 * w);
    u = clamp01(u * (1 - 0.55 * w));
    this.bMean[si] = m;
    this.bConf[si] = c;
    this.bUncert[si] = u;
  }

  /** Map senses + salience/surprise into ~12 grounded symbols (deterministic projection). */
  private updateBeliefs(senses: ArrayLike<number>, sal: number, surp: number): void {
    const str = clamp01(sal * (1 - 0.3 * surp));
    // 0 energy-trust
    this.bayes(0, clamp01(senses[0] ?? 0.5), str);
    // 1 rival-dominance (inverse rivalClose)
    this.bayes(1, clamp01(1 - (senses[6] ?? 0.2)), str * 0.9);
    // 2 sector-wealth
    this.bayes(2, clamp01(senses[4] ?? 0.5), str);
    // 3 prey-abundance
    this.bayes(3, clamp01(senses[5] ?? 0.3), str * 0.7);
    // 4 threat-level
    this.bayes(4, clamp01(senses[1] ?? 0), str * 1.1);
    // 5 novelty-rate
    this.bayes(5, clamp01(senses[13] ?? 0.4), str); // memory proxy + later novelty
    // 6 arousal-valence (use internal if passed via senses[10/11])
    this.bayes(6, clamp01(0.5 + 0.5 * ((senses[10] ?? 0) - (senses[1] ?? 0))), str * 0.6);
    // 7 social-trust
    this.bayes(7, clamp01(1 - (senses[6] ?? 0.2) * 0.7), str * 0.8);
    // 8 explore-bias
    this.bayes(8, clamp01(senses[3] ?? 0.4), str);
    // 9 spawn-urge
    this.bayes(9, clamp01(senses[0] ?? 0.5) * 0.8, str * 0.5);
    // 10 chaos-sens
    this.bayes(10, clamp01(senses[3] ?? 0.4), str * 0.9);
    // 11 power-margin (wealth + low threat)
    this.bayes(11, clamp01(0.5 * (senses[4] ?? 0.5) + 0.5 * (1 - (senses[1] ?? 0))), str);
  }

  /** Regime shift detector: trend in avg prediction error. O(1) per write. */
  private updateRegime(surp: number): void {
    const ei = this.errHead % 8;
    this.errRing[ei] = surp;
    this.errHead++;
    let sum = 0;
    const n = Math.min(8, this.errHead);
    for (let i = 0; i < n; i++) sum += this.errRing[i] ?? 0;
    this.prevAvgErr = this.avgErr;
    this.avgErr = n > 0 ? sum / n : 0.5;
    const trend = this.avgErr - this.prevAvgErr;
    this.regime = clamp01(0.5 + trend * 3.5);
  }

  /** Consolidation: high-salience episode bundled into semantic trace (via decay + superposition, reuses HRR spirit). O(D). */
  private consolidate(sal: number, planIdx: number): void {
    if (sal < 0.65) return;
    const contrib = (planIdx >= 0 ? (((planIdx % 7) - 3) | 0) * 0.11 : 0.02) * sal;
    for (let i = 0; i < HRR_DIM; i++) {
      this.semTrace[i] = 0.94 * (this.semTrace[i] ?? 0) + contrib; // multi-res semantic accumulation
    }
  }

  /**
   * Record a typed episode (event-sourced). Gated. Links provenance. Updates belief/regime/consol.
   * O(D + 1) when consolidating. Allocation-free.
   */
  record(
    type: NarrativeEvent,
    planIndex: number,
    salience: number,
    surprise: number,
    senses?: ArrayLike<number>,
  ): void {
    const entropyApprox = clamp01(surprise * 0.8 + (1 - (salience ?? 0.5)) * 0.3);
    if (!this.gate(surprise, entropyApprox)) return;

    const idx = this.head % this.cap;
    this.types[idx] = type;
    this.plans[idx] = planIndex < 0 ? -1 : planIndex | 0;
    this.saliences[idx] = clamp01(salience);
    this.causedBy[idx] = this.count > 0 ? (this.head - 1) % this.cap : -1;
    this.contradicts[idx] = -1;
    if (type === NARRATIVE_EVENT.OUTCOME && surprise > 0.38) {
      this.contradicts[idx] = this.causedBy[idx] ?? -1; // outcome contradicts prior causal link
    }
    if (senses) this.updateBeliefs(senses, salience, surprise);
    this.updateRegime(surprise);
    this.consolidate(salience, planIndex);

    this.head++;
    this.count = Math.min(this.count + 1, this.cap);
  }

  /**
   * Retrieval router: scores episodes by relevance (to drives) + belief-conf + recency.
   * Returns best plan index (−1 none) to bias vote. O(EPISODE_CAP) bounded, allocation-free.
   * Strategic: high-conf symbols amplify scores; multi-res uses semTrace energy lightly.
   */
  routeRecall(drives: ArrayLike<number>): {
    plan: number;
    relevance: number;
    eventType: NarrativeEvent;
  } {
    let best = -1;
    let bestSc = -Infinity;
    const n = Math.min(this.count, this.cap);
    let semE = 0;
    for (let i = 0; i < HRR_DIM; i++) semE += Math.abs(this.semTrace[i] ?? 0);
    const semBoost = clamp01(semE / (HRR_DIM * 0.8));

    for (let k = 0; k < n; k++) {
      const i = (this.head - 1 - k + this.cap * 100) % this.cap; // recent-first walk
      const rec = Math.pow(0.93, k); // recency
      let rel = (this.saliences[i] ?? 0) * 0.55;
      const p = this.plans[i] ?? -1;
      if (p >= 0 && p < drives.length) rel += (drives[p] ?? 0) * 0.65;
      // belief conf boost (strategic/grounded)
      const sym = (p >= 0 ? p % SYMBOL_COUNT : 6) | 0;
      rel += (this.bConf[sym] ?? 0) * 0.35 * (1 - (this.bUncert[sym] ?? 0.5));
      rel += semBoost * 0.12; // multi-res semantic contribution
      const sc = rel * rec;
      this.scores[k] = sc;
      if (sc > bestSc) {
        bestSc = sc;
        best = p;
      }
    }
    this.lastRouterRel = bestSc > -Infinity ? clamp01(bestSc) : 0;
    const etIdx = (this.head - 1 + this.cap) % this.cap;
    const et = best >= 0 ? ((this.types[etIdx] ?? 0) as NarrativeEvent) : 0;
    return { plan: best, relevance: this.lastRouterRel, eventType: et };
  }

  /** Snapshot (UI only — allocates). */
  snapshot(): NarrativeSnapshot {
    return {
      eventCount: this.count,
      regimeShift: this.regime,
      beliefMeans: Array.from(this.bMean),
      routerRelevance: this.lastRouterRel,
    };
  }
}
