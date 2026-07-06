/**
 * THE PREDICTIVE MAP — Super Creature 1.1's successor-representation lookahead. Where the GOAP argmax
 * chooses the plan with the highest IMMEDIATE drive, the successor representation (SR) lets the creature
 * choose the plan with the highest FUTURE value: a model-based, look-ahead upgrade to an otherwise myopic
 * decision. The SR is Dayan's reformulation of value (Dayan 1993, _Neural Computation_) and — in the
 * landmark result this models — the computational account of the HIPPOCAMPUS as a "predictive map":
 * place/grid cells encode expected discounted future occupancy, not just present location (Stachenfeld,
 * Botvinick & Gershman 2017, _Nature Neuroscience_; Momennejad et al. 2017, _Nature Human Behaviour_).
 *
 * THE MATH (real, falsifiable). Over the K = 7 plan-archetypes treated as states, the SR matrix
 *   M[s,s'] = E[ Σ_{t≥0} γ^t · 1(state_{t}=s') | state_0 = s ]
 * is the expected discounted future occupancy of s' when starting in s. It is learned online by the
 * temporal-difference rule (no model of the transition matrix needed):
 *   M[s,·] ← M[s,·] + α · ( e_{s'} + γ·M[s',·] − M[s,·] )      (s → s' observed this beat)
 * For any fixed policy with transition T, M converges to the closed form M = (I − γT)⁻¹. Value lookahead
 * is then a single matrix–vector product against the current per-plan reward r: V(p) = Σ_{s'} M[p,s']·r_{s'}
 * — the discounted reward the creature expects to accumulate if it commits to plan p NOW. That V biases
 * plan selection (the real downstream effect), closing the loop: the SR READS the plan it lands on and the
 * drives, and WRITES a look-ahead value back into the next decision.
 *
 * Deterministic: identity-initialised (no seed draw), pure arithmetic updates — replays bit-identically
 * from the world seed. Allocation-free in steady state (the lookahead writes into a caller buffer). Bounded:
 * every entry lies in [0, 1/(1−γ)]. Pure leaf module: imports nothing; no DOM, no THREE.
 */

/** Plan-archetype states the map is built over (HUNT FLEE DOMINATE DECEIVE SPAWN EXPLORE REST). */
export const SR_STATES = 7;
/** TD learning rate — fast enough to track a shifting policy, slow enough to average noise. */
const SR_ALPHA = 0.12;
/** Discount γ — horizon ≈ 1/(1−γ) ≈ 10 beats of look-ahead. */
const SR_GAMMA = 0.9;
/** The theoretical max occupancy any single entry can reach: 1/(1−γ). Used to normalise telemetry. */
const SR_HORIZON = 1 / (1 - SR_GAMMA);

/** Read-only telemetry of the predictive map for the BRAIN / SuperCreature boards (UI cadence). */
export interface SuccessorSnapshot {
  states: number;
  /** Look-ahead horizon 1/(1−γ) in beats. */
  horizon: number;
  /** The plan the map most expects to occupy next from the current plan (argmax successor). */
  predictedNext: number;
  /** Sharpness of that prediction, 0..1 (1 = the map is sure where it is heading; ~0 = diffuse). */
  certainty: number;
  /** The current plan's successor row M[plan,·], normalised to 0..1 for the board sparkline. */
  occupancy: number[];
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The successor-representation predictive map. Construct ONCE per mind (no seed — identity-initialised);
 * each beat call {@link observe} with the plan transition, then {@link lookahead} to bias plan selection
 * and {@link snapshot} for telemetry.
 */
export class SuccessorRepresentation {
  readonly states = SR_STATES;
  readonly horizon = SR_HORIZON;
  private readonly m: Float64Array; // K×K successor matrix M[s*K + s']
  private last = -1; // previous plan-state (−1 until the first observation)

  constructor() {
    const K = SR_STATES;
    this.m = new Float64Array(K * K);
    // Identity prior: from state s you are, at minimum, in s right now (occupancy 1 before discounting).
    for (let s = 0; s < K; s++) this.m[s * K + s] = 1;
  }

  /**
   * Fold the observed plan transition (previous → `current`) into the map by the SR TD rule. The first
   * call only records `current` (no transition yet). Allocation-free; O(K).
   */
  observe(current: number): void {
    const K = SR_STATES;
    // An out-of-range plan index (caller bug, or a -1 "no plan" sentinel) must NOT be folded in as a
    // real transition into state 0 — that fabricates occupancy mass on the first row and biases
    // lookahead toward plan 0 while hiding the upstream error. Treat it as a no-op.
    if (current < 0 || current >= K) return;
    const s = this.last;
    const sp = current;
    if (s >= 0 && s < K) {
      const rowS = s * K;
      const rowSp = sp * K;
      for (let j = 0; j < K; j++) {
        // SR TD rule: target = φ(sₜ) + γ·M(sₜ₊₁,·). The one-hot indicator is the SOURCE state s (the row
        // being updated), so M[s,s] carries the present (t=0) occupancy term — Dayan 1993 / Gershman 2018.
        const target = (j === s ? 1 : 0) + SR_GAMMA * (this.m[rowSp + j] ?? 0);
        const cur = this.m[rowS + j] ?? 0;
        this.m[rowS + j] = cur + SR_ALPHA * (target - cur);
      }
    }
    this.last = sp;
  }

  /**
   * Value look-ahead: V(p) = Σ_{s'} M[p,s']·reward[s'] for every candidate plan p, written into `out`.
   * This is the discounted future reward the creature expects if it commits to plan p now — the quantity
   * that biases the myopic drive argmax toward model-based choices. Allocation-free; O(K²).
   */
  lookahead(reward: ArrayLike<number>, out: number[] | Float32Array): void {
    const K = SR_STATES;
    for (let p = 0; p < K; p++) {
      const row = p * K;
      let v = 0;
      for (let j = 0; j < K; j++) {
        const r = reward[j] ?? 0;
        v += (this.m[row + j] ?? 0) * (Number.isFinite(r) ? r : 0); // a NaN drive can't poison the value
      }
      out[p] = v;
    }
  }

  /** Expected discounted future occupancy M[s,s'] (read-only accessor for tests / wiring). */
  occupancy(s: number, sp: number): number {
    const K = SR_STATES;
    if (s < 0 || s >= K || sp < 0 || sp >= K) return 0;
    return this.m[s * K + sp] ?? 0;
  }

  /** Build the read-only board snapshot from the current plan-state. O(K). */
  snapshot(): SuccessorSnapshot {
    const K = SR_STATES;
    const s = this.last >= 0 ? this.last : 0;
    const row = s * K;
    // predictedNext = the most-occupied NON-self successor (the diagonal self-term otherwise dominates and
    // would just report "staying put", which is not a useful look-ahead signal).
    let offSum = 0;
    let best = (s + 1) % K;
    let bestV = -Infinity;
    for (let j = 0; j < K; j++) {
      if (j === s) continue;
      const v = this.m[row + j] ?? 0;
      offSum += v;
      if (v > bestV) {
        bestV = v;
        best = j;
      }
    }
    const occupancy: number[] = Array.from({ length: K }, () => 0);
    for (let j = 0; j < K; j++) occupancy[j] = clamp01((this.m[row + j] ?? 0) / SR_HORIZON);
    // certainty = concentration of the off-diagonal successor mass on its argmax (vs uniform over K−1).
    const uniform = 1 / (K - 1);
    const share = offSum > 1e-9 ? bestV / offSum : uniform;
    const certainty = clamp01((share - uniform) / (1 - uniform));
    return { states: K, horizon: SR_HORIZON, predictedNext: best, certainty, occupancy };
  }
}
