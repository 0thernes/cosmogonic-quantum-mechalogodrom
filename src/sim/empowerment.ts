/**
 * THE EMPOWERMENT DRIVE (V95) — Super Creature 1.1's information-theoretic AGENCY HUNGER. Where the
 * reservoir/surprise novelty asks "is the world surprising?" and the active-inference epistemic term asks
 * "what would reduce my uncertainty?", empowerment asks a THIRD, distinct question: "how much can I, by my
 * own actions, STEER my future?" It is the channel capacity I(A; S′) between the mind's committed-plan
 * archetypes (its action alphabet) and the resulting next world-model state — a universal, reward-free
 * measure of an agent's potential control over its own future (Klyubin, Polani & Nehaniv, "Empowerment: A
 * Universal Agent-Centric Measure of Control", IEEE CEC 2005; "All Else Being Equal Be Empowered", ECAL
 * 2005; Salge, Glackin & Polani, "Empowerment — An Introduction", 2014). It is a current intrinsic-
 * motivation frontier: Tiomkin, Nemenman, Polani & Tishby, "Intrinsic Motivation in Dynamical Control
 * Systems" (arXiv:2301.00005); Levy, Allievi & Konidaris, "Latent-Predictive Empowerment" (arXiv:2410.11155,
 * 2024 — empowerment from a latent world model, exactly this setting); Lidayan, Du, Kosoy, Rufova, Abbeel &
 * Gopnik, "Intrinsically-Motivated Humans and Agents in Open-World Exploration" (arXiv:2503.23631, 2025 —
 * empowerment aligns with human open-world exploration BETTER than curiosity). High empowerment = the mind
 * sits at a junction of high optionality (its choices matter); low empowerment = a helpless cul-de-sac where
 * what it does barely changes what happens.
 *
 * MECHANISM. Each beat the drive (1) bins the fresh 16-D world-model latent to one of M coarse cells by the
 * signs of its projection onto H = log₂M frozen random hyperplanes (a deterministic locality-sensitive hash);
 * (2) credits the PREVIOUS beat's committed action → THIS beat's resulting cell into a row-stochastic K×M
 * channel estimate q(b|a) under exponential forgetting (surprise raises the forgetting rate, so the estimate
 * re-learns faster when the mind's predictions are wrong); (3) runs T fixed Blahut–Arimoto iterations to get
 * the channel capacity C in nats and emits empowerment = clamp(C / ln K, 0, 1). Blahut–Arimoto
 * (Blahut 1972; Arimoto 1972; Cover & Thomas, *Elements of Information Theory*, ch. 10): with input
 * distribution rₐ and channel q(b|a), iterate cₐ = exp Σ_b q(b|a)·ln(q(b|a)/q(b)) where q(b)=Σₐ rₐ q(b|a),
 * the capacity lower bound C = ln Σₐ rₐ cₐ is provably NON-DECREASING and converges to the true capacity, and
 * the update rₐ ← rₐ cₐ / Σ r·c drives r to the capacity-achieving source. The input distribution is RE-SEEDED
 * to uniform each beat (rather than warm-started across beats) so a CHANGING channel can never trap a zeroed
 * input — the per-beat reading is a clean function of the current estimated channel; capacity ∈ [0, ln K] is a
 * closed-form bound (unit-tested), so the normalised agency is exactly bounded to [0,1].
 *
 * Everything is deterministic (the hyperplanes are the ONLY randomness, drawn ONCE from a seeded {@link Rng}
 * and frozen; update() draws no random number and reads no clock) and allocation-free in steady state. Pure
 * leaf: no DOM, no THREE, no plan-vocabulary import (the action count is a constructor parameter), so it is
 * exercised standalone in tests. This is ORIGINAL mathematics (Blahut–Arimoto + random-hyperplane LSH), not a
 * third-party port — no THIRD-PARTY-NOTICES entry required.
 */
import type { Rng } from '../math/rng';

/** Default action alphabet K — the seven GOAP plans the apex mind chooses among. */
export const EMP_ACTIONS = 7;
/** Coarse latent cells M (a power of two ⇒ H = log₂M frozen hyperplanes tile it exactly). */
export const EMP_BINS = 64;
/** World-model latent width D read by the binner (the apex mind's latent is 16-D). */
export const EMP_LATENT_DIM = 16;
/** Fixed Blahut–Arimoto iterations per beat (constant cost AND deterministic — no threshold early-exit). */
export const EMP_BA_ITERS = 12;
/** Base exponential-forgetting rate of the online channel estimate. */
const EMP_LAMBDA = 0.05;
/** How strongly the surprise scalar raises the forgetting rate (faster re-learning under model error). */
const EMP_SURPRISE_GATE = 0.5;
/** Guards: output-marginal floor (skip 0·ln0 terms) and a log-of-zero floor. */
const QB_GUARD = 1e-12;
const LOG_GUARD = 1e-300;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Optional construction overrides (all default to the module constants). */
export interface EmpowermentConfig {
  /** Action alphabet size K (≥ 2). Default {@link EMP_ACTIONS}. */
  actions?: number;
  /** Latent cell count M (≥ 2, ideally a power of two). Default {@link EMP_BINS}. */
  bins?: number;
  /** Latent width D read by the binner. Default {@link EMP_LATENT_DIM}. */
  latentDim?: number;
  /** Blahut–Arimoto iterations T. Default {@link EMP_BA_ITERS}. */
  baIters?: number;
  /** Base forgetting rate in (0,1]. Default 0.05. */
  lambda?: number;
  /** Surprise→forgetting gain in [0,1]. Default 0.5. */
  surpriseGate?: number;
}

/** Read-only telemetry of the empowerment drive for the BRAIN / SuperCreature boards (UI cadence). */
export interface EmpowermentSnapshot {
  /** Action alphabet size K. */
  actions: number;
  /** Latent cell count M. */
  bins: number;
  /** Normalised agency = C / ln K, 0..1 (1 = the mind fully controls which cell it lands in). */
  empowerment: number;
  /** Raw Blahut–Arimoto channel capacity C in nats (0 .. ln K). */
  capacityNats: number;
  /** Capacity in bits (C / ln 2) for the board. */
  capacityBits: number;
  /** The capacity-achieving source distribution r over the K actions (sums to 1). */
  inputDist: number[];
  /** Per-action steering D_KL(q(·|a) ‖ uniform marginal) in nats (≥ 0); higher = that plan shapes the
   *  future more. */
  contributions: number[];
  /** Index of the most empowering plan = argmax of the per-action KL steering (`contributions`), i.e. the
   *  plan that most shapes the future — NOT the Blahut–Arimoto cₐ. −1 before the first update. */
  bestAction: number;
  /** The coarse cell the current latent hashed to this beat (0 .. M−1, or −1 before the first update). */
  bin: number;
  /** Fraction of the M cells ever visited (state-space coverage), 0..1. */
  occupancy: number;
  /** |C_T − C_{T−1}| of the last Blahut–Arimoto run (≈ 0 ⇒ converged). */
  converged: number;
}

/**
 * The empowerment drive. Construct ONCE per mind with a dedicated seeded {@link Rng} (its frozen hyperplanes
 * are the only randomness); call {@link update} each cognitive beat with the fresh latent + the committed
 * plan index, read {@link empowerment} / {@link bestAction} to bias exploration and plan selection, and
 * {@link snapshot} at UI cadence.
 */
export class EmpowermentDrive {
  /** Action alphabet size K. */
  readonly actions: number;
  /** Latent cell count M. */
  readonly bins: number;
  private readonly dim: number; // D — latent width read
  private readonly iters: number; // T — Blahut–Arimoto iterations
  private readonly planes: number; // H — hyperplane count = log2(M)
  private readonly lambda: number; // base forgetting rate
  private readonly surpriseGate: number;
  private readonly lnK: number;
  private readonly hplane: Float64Array; // H·D frozen hyperplane normals
  private readonly hbias: Float64Array; // H frozen hyperplane biases
  private readonly q: Float64Array; // K·M row-stochastic channel estimate q(b|a)
  private readonly r: Float64Array; // K capacity-achieving input dist (re-seeded each beat)
  private readonly contrib: Float64Array; // K per-action contributions cₐ (reused buffer)
  private readonly qb: Float64Array; // M output-marginal scratch
  private readonly seen: Uint8Array; // M cell-occupancy bitmap
  private lastAction = -1;
  private emp = 0;
  private capNats = 0;
  private conv = 0;
  private best = -1;
  private curBin = -1;

  constructor(rng: Rng, config: EmpowermentConfig = {}) {
    const K = Math.max(2, Math.floor(config.actions ?? EMP_ACTIONS));
    const M = Math.max(2, Math.floor(config.bins ?? EMP_BINS));
    this.actions = K;
    this.bins = M;
    this.dim = Math.max(1, Math.floor(config.latentDim ?? EMP_LATENT_DIM));
    this.iters = Math.max(1, Math.floor(config.baIters ?? EMP_BA_ITERS));
    const lam = config.lambda ?? EMP_LAMBDA;
    this.lambda = lam > 0 && lam <= 1 ? lam : EMP_LAMBDA;
    this.surpriseGate = clamp01(config.surpriseGate ?? EMP_SURPRISE_GATE);
    this.lnK = Math.log(K);
    this.planes = Math.max(1, Math.round(Math.log2(M)));
    // Frozen random hyperplanes (the only randomness — drawn once, never redrawn).
    this.hplane = new Float64Array(this.planes * this.dim);
    for (let i = 0; i < this.hplane.length; i++) this.hplane[i] = rng() * 2 - 1;
    this.hbias = new Float64Array(this.planes);
    for (let h = 0; h < this.planes; h++) this.hbias[h] = rng() * 2 - 1;
    // Uniform row-stochastic channel ⇒ the very first capacity is exactly 0 (no control inferred yet).
    this.q = new Float64Array(K * M).fill(1 / M);
    this.r = new Float64Array(K);
    this.contrib = new Float64Array(K);
    this.qb = new Float64Array(M);
    this.seen = new Uint8Array(M);
  }

  /** Hash a latent to a coarse cell by the sign bits of its projection onto the frozen hyperplanes. */
  private binOf(latent: ArrayLike<number>): number {
    const { hplane, hbias, dim, planes, bins } = this;
    let b = 0;
    for (let h = 0; h < planes; h++) {
      let proj = hbias[h] ?? 0;
      const base = h * dim;
      for (let d = 0; d < dim; d++) proj += (hplane[base + d] ?? 0) * (latent[d] ?? 0);
      if (proj >= 0) b |= 1 << h;
    }
    return b >= bins ? b % bins : b;
  }

  /**
   * Advance one cognitive beat. Call AFTER the mind has produced this beat's latent and committed a plan:
   * `planIndex` is the plan COMMITTED THIS beat; internally the drive credits the action committed LAST beat
   * to the cell the latent lands in THIS beat (the action causes the next state), then estimates the
   * channel capacity of the current action→cell map. `surprise` (0..1) gates the forgetting rate. Returns
   * the normalised empowerment (0..1). O(D·H + M + K·M·T); allocation-free.
   */
  update(latent: ArrayLike<number>, planIndex: number, surprise = 0): number {
    const K = this.actions;
    const M = this.bins;
    const { q, r, contrib, qb } = this;
    const b = this.binOf(latent);
    this.curBin = b;
    this.seen[b] = 1;
    // Credit LAST beat's action → THIS beat's cell (exponential forgetting; surprise speeds re-learning).
    const lam = clamp01(this.lambda * (1 + this.surpriseGate * clamp01(surprise)));
    const prev = this.lastAction;
    if (prev >= 0 && prev < K) {
      const base = prev * M;
      for (let j = 0; j < M; j++) {
        const cur = q[base + j] ?? 0;
        q[base + j] = (1 - lam) * cur + (j === b ? lam : 0); // row stays stochastic: (1−lam)+lam = 1
      }
    }
    this.lastAction = planIndex >= 0 && planIndex < K ? planIndex : -1;
    // Blahut–Arimoto from a fresh uniform source each beat (robust to a non-stationary channel).
    for (let a = 0; a < K; a++) r[a] = 1 / K;
    let cNow = 0;
    let cPrev = 0;
    for (let t = 0; t < this.iters; t++) {
      // Output marginal q(b) = Σ_a r_a q(b|a).
      for (let j = 0; j < M; j++) qb[j] = 0;
      for (let a = 0; a < K; a++) {
        const ra = r[a] ?? 0;
        if (ra <= 0) continue;
        const base = a * M;
        for (let j = 0; j < M; j++) qb[j] = (qb[j] ?? 0) + ra * (q[base + j] ?? 0);
      }
      // c_a = exp Σ_b q(b|a) ln(q(b|a)/q(b)) = exp D_KL( q(·|a) ‖ q(·) ).
      for (let a = 0; a < K; a++) {
        const base = a * M;
        let s = 0;
        for (let j = 0; j < M; j++) {
          const p = q[base + j] ?? 0;
          const m = qb[j] ?? 0;
          if (p > 0 && m > QB_GUARD) s += p * Math.log(p / m);
        }
        contrib[a] = Math.exp(s);
      }
      // Capacity lower bound C = ln Σ_a r_a c_a (non-decreasing across t), then r_a ← r_a c_a / Σ r·c.
      let rc = 0;
      for (let a = 0; a < K; a++) rc += (r[a] ?? 0) * (contrib[a] ?? 0);
      cPrev = cNow;
      cNow = Math.log(rc > LOG_GUARD ? rc : LOG_GUARD);
      const inv = rc > 0 ? 1 / rc : 0;
      for (let a = 0; a < K; a++) r[a] = (r[a] ?? 0) * (contrib[a] ?? 0) * inv;
    }
    this.conv = Math.abs(cNow - cPrev);
    const cap = cNow < 0 ? 0 : cNow > this.lnK ? this.lnK : cNow; // C ∈ [0, ln K]; clamp seals fp drift
    this.capNats = cap;
    this.emp = this.lnK > 0 ? cap / this.lnK : 0;
    // Per-action STEERING = D_KL( q(·|a) ‖ uniform-input marginal ) in nats — a stable measure of how far
    // each plan's outcome departs from the average (unlike the BA c_a, which equalise among the capacity-
    // achieving symbols at the fixed point). bestAction = argmax — the plan that most shapes the future.
    for (let j = 0; j < M; j++) qb[j] = 0;
    for (let a = 0; a < K; a++) {
      const base = a * M;
      for (let j = 0; j < M; j++) qb[j] = (qb[j] ?? 0) + (q[base + j] ?? 0) / K;
    }
    let best = -1;
    let bestV = -Infinity;
    for (let a = 0; a < K; a++) {
      const base = a * M;
      let kl = 0;
      for (let j = 0; j < M; j++) {
        const p = q[base + j] ?? 0;
        const m = qb[j] ?? 0;
        if (p > 0 && m > QB_GUARD) kl += p * Math.log(p / m);
      }
      contrib[a] = kl < 0 ? 0 : kl; // KL ≥ 0 (seal fp drift)
      if (kl > bestV) {
        bestV = kl;
        best = a;
      }
    }
    this.best = best;
    return this.emp;
  }

  /** The last computed normalised empowerment (0..1). Cheap getter, no recompute. */
  get empowerment(): number {
    return this.emp;
  }

  /** The coarse cell the latest latent hashed to (0 .. M−1, or −1 before the first update). */
  get currentBin(): number {
    return this.curBin;
  }

  /**
   * The current per-action steering buffer (length K): D_KL(q(·|a) ‖ uniform marginal) in nats. REUSED —
   * valid only until the next {@link update}; the caller MUST NOT retain it.
   */
  contributions(): Float64Array {
    return this.contrib;
  }

  /** Index of the most empowering plan = argmax of the per-action KL steering (not the BA cₐ), or −1
   *  before the first {@link update}. */
  bestAction(): number {
    return this.best;
  }

  /** Build the read-only board snapshot. O(K + M); allocates the public arrays (UI cadence only). */
  snapshot(): EmpowermentSnapshot {
    const K = this.actions;
    const M = this.bins;
    let occ = 0;
    for (let j = 0; j < M; j++) occ += this.seen[j] ?? 0;
    return {
      actions: K,
      bins: M,
      empowerment: clamp01(this.emp),
      capacityNats: this.capNats,
      capacityBits: this.capNats / Math.LN2,
      inputDist: Array.from({ length: K }, (_, a) => this.r[a] ?? 0),
      contributions: Array.from({ length: K }, (_, a) => this.contrib[a] ?? 0),
      bestAction: this.best,
      bin: this.curBin,
      occupancy: M > 0 ? occ / M : 0,
      converged: this.conv,
    };
  }
}
