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
    return {
      dim,
      plans,
      recalledPlan: this.recalled,
      confidence: this.conf,
      similarity: Array.from({ length: plans }, (_, k) => sims[k] ?? 0),
      traceEnergy: clamp01(energy / dim / norm),
      margin: this.marg,
    };
  }
}
