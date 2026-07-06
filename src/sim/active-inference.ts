/**
 * ACTIVE INFERENCE (V90) — Super Creature 1.1's **free-energy core**. The Free Energy Principle (Friston
 * 2010; Parr, Pezzulo & Friston, _Active Inference_, MIT Press 2022) casts perception AND action as one
 * imperative: minimise variational free energy — the agent is a generative model that explains its senses
 * and acts to make its own predictions come true. Where the mind already had a predictor→surprise loop
 * (the project's only prior nod to Friston), this is the full account, and it completes the modern triad
 * of consciousness/agency theories the creature now spans: Global Workspace (access · `ignition`),
 * Integrated Information (integration · `phi`), and the Free Energy Principle (the objective · here).
 *
 * The model is discrete active inference over K latent "situations":
 *   • A generative model: a likelihood A (situation → expected observation prototype) and a prior D.
 *   • PERCEIVE — a Bayesian belief update from observation o, with the variational free energy
 *         F = E_q[−log P(o|s)] + KL[q ‖ prior]            (accuracy cost + complexity)
 *     minimised by the posterior q; F is the agent's running "surprise about its world".
 *   • PLAN — the **expected free energy** of each candidate policy a, the quantity active inference
 *     minimises to choose actions:
 *         G(a) = (H[q | ô_a] − H[q])   −   (C · ô_a)
 *                └ epistemic cost ┘        └ pragmatic value ┘
 *     The epistemic term rewards policies that RESOLVE uncertainty (information gain → principled
 *     curiosity); the pragmatic term rewards reaching preferred observations C (goal-seeking). A low-G
 *     policy is simultaneously curious AND goal-directed — exactly the exploration/exploitation balance
 *     that falls out of the maths rather than being hand-tuned. (Honesty note: the epistemic term is
 *     evaluated at a SINGLE point-estimate predicted observation ô_a, not as an expectation over the
 *     predictive distribution P(o|a). The canonical expected info gain is the expectation, which is the
 *     one that is provably ≥ 0; this one-sample surrogate CAN go negative for a belief-blurring ô. It
 *     still correctly penalises blurring policies, and plan selection min-max-normalises G downstream,
 *     so the surrogate suffices — but it is a surrogate, not the ≥ 0 mutual information.)
 *
 * Deterministic: the generative model is built once from a seeded {@link Rng}; the belief update and the
 * expected-free-energy evaluation are pure arithmetic (no unseeded randomness, no wall-clock), so the
 * whole inference replays from the world seed. Allocation-free in steady state. Pure leaf: no DOM/THREE.
 */
import type { Rng } from '../math/rng';

/** Latent "situations" the agent infers it might be in (the hidden-state cardinality K). */
export const AIF_SITUATIONS = 8;
/** Observation features the situations explain (energy, threat, prey, rival, novelty, wealth). */
export const AIF_OBS = 6;
/** Likelihood precision (inverse variance of the Gaussian P(o|s) around each prototype). */
const PRECISION = 2.0;
/** Per-beat leak of the belief toward the uniform prior — keeps the filter from locking permanently. */
const BELIEF_LEAK = 0.06;

/** Read-only telemetry of the free-energy core for the BRAIN / SuperCreature boards (UI cadence). */
export interface ActiveInferenceSnapshot {
  /** Latent-situation cardinality K. */
  situations: number;
  /** Variational free energy F this beat (lower = the world is less surprising; the thing it minimises). */
  freeEnergy: number;
  /** Bayesian surprise −log P(o) — the marginal-likelihood penalty inside F. */
  surprise: number;
  /** Shannon entropy of the belief q, 0..1 normalised (1 = maximally uncertain which situation it is in). */
  beliefEntropy: number;
  /** Epistemic value of the chosen policy: the one-sample info-gain surrogate H[q] − H[q|ô]. The
   *  curiosity drive — but evaluated at a single predicted ô (not an expectation over the predictive
   *  distribution), so it CAN be negative for a belief-blurring ô; the canonical expected info gain is
   *  the ≥ 0 one. Plan selection min-max-normalises G, so the surrogate is sufficient. */
  epistemic: number;
  /** Pragmatic value of the chosen policy (alignment of its expected observation with preferences C). */
  pragmatic: number;
  /** argmax_k q — the situation the agent currently believes it is in. */
  belief: number;
  /** The full posterior q over the K situations. */
  posterior: number[];
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The discrete active-inference engine. Construct ONCE with a dedicated seeded {@link Rng}; each beat
 * {@link setPreference} from the mind's goals, {@link perceive} the observation (returns the free
 * energy), and {@link expectedFreeEnergy} over candidate policies to bias plan selection.
 */
export class ActiveInference {
  readonly situations = AIF_SITUATIONS;
  readonly obsDim = AIF_OBS;
  private readonly a: Float64Array; // K×M observation prototypes (the likelihood means)
  private readonly belief: Float64Array; // posterior q over K situations
  private readonly prior: Float64Array; // per-beat prior (leaky belief)
  private readonly logPost: Float64Array; // scratch
  private readonly qNext: Float64Array; // scratch for the look-ahead posterior in EFE
  private readonly pref: Float64Array; // preference vector C over observations
  private freeEnergy = 0;
  private surprise = 0;
  private lastEpistemic = 0;
  private lastPragmatic = 0;

  constructor(rng: Rng) {
    const K = AIF_SITUATIONS;
    const M = AIF_OBS;
    this.a = new Float64Array(K * M);
    // Distinct, fixed observation prototypes per situation — the agent's generative model of its world.
    for (let i = 0; i < this.a.length; i++) this.a[i] = rng() * 2 - 1;
    this.belief = new Float64Array(K).fill(1 / K);
    this.prior = new Float64Array(K).fill(1 / K);
    this.logPost = new Float64Array(K);
    this.qNext = new Float64Array(K);
    this.pref = new Float64Array(M);
  }

  /** Set the preference vector C (desired observation, ~−1..1 per feature) — drives pragmatic value. */
  setPreference(c: ArrayLike<number>): void {
    for (let m = 0; m < this.obsDim; m++) this.pref[m] = c[m] ?? 0;
  }

  /** Gaussian log-likelihood of `obs` under situation k: −½·precision·Σ(oₘ − A[k]ₘ)². */
  private logLik(k: number, obs: ArrayLike<number>): number {
    const M = this.obsDim;
    const base = k * M;
    let q = 0;
    for (let m = 0; m < M; m++) {
      const d = (obs[m] ?? 0) - (this.a[base + m] ?? 0);
      q += d * d;
    }
    return -0.5 * PRECISION * q;
  }

  /**
   * PERCEIVE — update the belief q from observation `obs` and return the variational free energy
   * F = Σ q(−logLik) + KL(q‖prior). The prior is the previous belief leaked toward uniform. Mutates the
   * persistent belief; allocation-free. Returns {@link freeEnergy} + the Bayesian surprise + entropy.
   */
  perceive(obs: ArrayLike<number>): {
    freeEnergy: number;
    surprise: number;
    beliefEntropy: number;
  } {
    const K = this.situations;
    // prior = leaky previous belief (a filter that does not lock onto one situation forever)
    const u = 1 / K;
    for (let k = 0; k < K; k++) {
      this.prior[k] = (1 - BELIEF_LEAK) * (this.belief[k] ?? u) + BELIEF_LEAK * u;
    }
    // unnormalised log-posterior = log prior + log-likelihood
    let maxLp = -Infinity;
    for (let k = 0; k < K; k++) {
      const lp = Math.log(this.prior[k] ?? u) + this.logLik(k, obs);
      this.logPost[k] = lp;
      if (lp > maxLp) maxLp = lp;
    }
    // softmax → posterior, and the log-sum-exp = log marginal likelihood (→ Bayesian surprise)
    let z = 0;
    for (let k = 0; k < K; k++) {
      const e = Math.exp((this.logPost[k] ?? 0) - maxLp);
      this.belief[k] = e;
      z += e;
    }
    const logEvidence = maxLp + Math.log(z);
    const inv = z > 0 ? 1 / z : 0;
    for (let k = 0; k < K; k++) this.belief[k] = (this.belief[k] ?? 0) * inv;
    // F = E_q[−logLik] + KL(q‖prior)
    let f = 0;
    for (let k = 0; k < K; k++) {
      const qk = this.belief[k] ?? 0;
      if (qk <= 0) continue;
      f += qk * -this.logLik(k, obs);
      f += qk * Math.log(qk / (this.prior[k] ?? u));
    }
    this.freeEnergy = f;
    this.surprise = -logEvidence;
    return { freeEnergy: f, surprise: this.surprise, beliefEntropy: this.entropyNorm() };
  }

  /** Normalised Shannon entropy of the current belief, 0..1 (1 = uniform / maximal uncertainty). */
  private entropyNorm(): number {
    const K = this.situations;
    let h = 0;
    for (let k = 0; k < K; k++) {
      const p = this.belief[k] ?? 0;
      if (p > 0) h -= p * Math.log(p);
    }
    return clamp01(h / Math.log(K));
  }

  /** Posterior entropy (nats) of an explicit distribution. */
  private entropyOf(q: ArrayLike<number>, n: number): number {
    let h = 0;
    for (let k = 0; k < n; k++) {
      const p = q[k] ?? 0;
      if (p > 0) h -= p * Math.log(p);
    }
    return h;
  }

  /**
   * The expected free energy G(a) of each policy whose predicted observation is `predicted[a]`:
   *   G = (H[q | ô] − H[q])  −  (C · ô)      (epistemic cost − pragmatic value)
   * A LOWER G is a better policy. Writes G into `out`; also records the chosen (min-G) policy's
   * epistemic + pragmatic value for telemetry. Pure look-ahead — does NOT mutate the belief.
   */
  expectedFreeEnergy(
    predicted: ReadonlyArray<ArrayLike<number>>,
    out: number[] | Float32Array,
  ): void {
    const K = this.situations;
    const hNow = this.entropyOf(this.belief, K);
    let bestG = Infinity;
    let bestEpi = 0;
    let bestPrag = 0;
    for (let a = 0; a < predicted.length; a++) {
      const o = predicted[a] ?? [];
      // look-ahead posterior if ô were observed (from the CURRENT belief as prior)
      let maxLp = -Infinity;
      for (let k = 0; k < K; k++) {
        const lp = Math.log((this.belief[k] ?? 0) + 1e-9) + this.logLik(k, o);
        this.logPost[k] = lp;
        if (lp > maxLp) maxLp = lp;
      }
      let z = 0;
      for (let k = 0; k < K; k++) {
        const e = Math.exp((this.logPost[k] ?? 0) - maxLp);
        this.qNext[k] = e;
        z += e;
      }
      const inv = z > 0 ? 1 / z : 0;
      for (let k = 0; k < K; k++) this.qNext[k] = (this.qNext[k] ?? 0) * inv;
      const hNext = this.entropyOf(this.qNext, K);
      const epistemic = hNow - hNext; // one-sample info-gain surrogate (CAN be negative for a blurring ô)
      let pragmatic = 0; // alignment of the expected observation with preferences C
      for (let m = 0; m < this.obsDim; m++) pragmatic += (this.pref[m] ?? 0) * (o[m] ?? 0);
      const g = -epistemic - pragmatic; // minimise G ⇒ maximise info gain + preference
      out[a] = g;
      if (g < bestG) {
        bestG = g;
        bestEpi = epistemic;
        bestPrag = pragmatic;
      }
    }
    for (let a = predicted.length; a < out.length; a++) out[a] = 0;
    this.lastEpistemic = bestEpi;
    this.lastPragmatic = bestPrag;
  }

  /** Read-only telemetry (UI cadence; allocates the posterior array). */
  snapshot(): ActiveInferenceSnapshot {
    const K = this.situations;
    let best = 0;
    let bestP = -1;
    for (let k = 0; k < K; k++) {
      const p = this.belief[k] ?? 0;
      if (p > bestP) {
        bestP = p;
        best = k;
      }
    }
    return {
      situations: K,
      freeEnergy: this.freeEnergy,
      surprise: this.surprise,
      beliefEntropy: this.entropyNorm(),
      epistemic: this.lastEpistemic,
      pragmatic: this.lastPragmatic,
      belief: best,
      posterior: Array.from(this.belief),
    };
  }
}
