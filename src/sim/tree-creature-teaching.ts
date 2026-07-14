/**
 * TREE-DWELLER PEER TEACHING — a real, bounded policy-transfer mechanism between Big Tree residents.
 *
 * "Knowledge" here is the only knowledge a tree dweller actually has: its 70-parameter neural policy
 * ({@link TreeCreatureBrain} weights) plus its measured foraging record (meals eaten). When two
 * residents of one species socialize within reach, the demonstrably more successful forager (the
 * TEACHER, strictly more meals) nudges the learner's live weight vector toward its own by one small
 * bounded blend. The transfer is:
 *
 *  - REAL: learner weights measurably move (the returned L1 delta is the exact amount), and the
 *    learner's subsequent decisions change — no animation-only "teaching" claim.
 *  - BOUNDED: one blend per event ({@link TREE_TEACHING_BLEND}), per-learner cooldown, and a strict
 *    meal-competence gap gate — no runaway convergence to a monoculture in a few seconds.
 *  - SAFE: a lerp of two finite fixed-size vectors is finite; shape is identical by construction;
 *    the brain's own inference-time finiteness fallback stays as the last line of defense.
 *  - DETERMINISTIC: no randomness — eligibility is pure state (positions, activities, meal counts,
 *    sim-time cooldowns), so same seed ⇒ same teaching history.
 *
 * The ledger records only transfers that actually moved weights, satisfying the dome-ecology law
 * that knowledge transfer is recorded only when the underlying system performs it.
 */

/** Fraction of the teacher–learner weight gap closed by one teaching event. */
export const TREE_TEACHING_BLEND = 0.08;
/** Teacher must have eaten at least this many more meals than the learner. */
export const TREE_TEACHING_MIN_MEAL_GAP = 2;
/** Per-LEARNER sim-time cooldown between lessons (teachers may teach several pupils). */
export const TREE_TEACHING_COOLDOWN_SECONDS = 25;

export interface TreeTeachingStatus {
  /** Transfers that actually moved learner weights. */
  events: number;
  /** Attempts rejected by gap/cooldown/identity/shape gates (diagnostic). */
  rejections: number;
  lastTeacher: number;
  lastLearner: number;
  /** Sim-time of the last event; -1 before any lesson. */
  lastAt: number;
  /** L1 weight mass moved by the last event. */
  lastWeightDelta: number;
}

/** Fixed-capacity, allocation-free teaching arbiter for one resident population. */
export class TreeCreatureTeaching {
  private readonly cooldownUntil: Float64Array;
  private events = 0;
  private rejections = 0;
  private lastTeacher = -1;
  private lastLearner = -1;
  private lastAt = -1;
  private lastWeightDelta = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('tree-creature teaching capacity must be a positive integer');
    }
    this.cooldownUntil = new Float64Array(capacity);
  }

  get capacity(): number {
    return this.cooldownUntil.length;
  }

  /** Whether `learner` may receive a lesson at sim-time `now` (cooldown gate only). */
  learnerReady(learner: number, now: number): boolean {
    if (!Number.isInteger(learner) || learner < 0 || learner >= this.cooldownUntil.length) {
      return false;
    }
    return now >= (this.cooldownUntil[learner] ?? 0);
  }

  /**
   * Attempt one lesson: blend `learnerWeights` toward `teacherWeights` in place. Returns the L1
   * weight mass moved (0 ⇒ ineligible or a no-op transfer, and nothing is recorded). All gates are
   * pure state; the method draws no randomness and allocates nothing.
   */
  attempt(
    teacher: number,
    learner: number,
    teacherWeights: Float32Array | null,
    learnerWeights: Float32Array | null,
    teacherMeals: number,
    learnerMeals: number,
    now: number,
  ): number {
    if (
      teacher === learner ||
      teacherWeights === null ||
      learnerWeights === null ||
      teacherWeights.length !== learnerWeights.length ||
      teacherWeights.length === 0 ||
      !Number.isFinite(now) ||
      teacherMeals - learnerMeals < TREE_TEACHING_MIN_MEAL_GAP ||
      !this.learnerReady(learner, now)
    ) {
      this.rejections++;
      return 0;
    }
    // All-or-nothing: validate BOTH vectors before mutating anything, so a corrupt policy is never
    // half-learned (a corrupt vector is the brain's own fallback territory — never spread it).
    for (let i = 0; i < learnerWeights.length; i++) {
      if (!Number.isFinite(learnerWeights[i]!) || !Number.isFinite(teacherWeights[i]!)) {
        this.rejections++;
        return 0;
      }
    }
    let moved = 0;
    for (let i = 0; i < learnerWeights.length; i++) {
      const from = learnerWeights[i]!;
      const next = from + (teacherWeights[i]! - from) * TREE_TEACHING_BLEND;
      moved += Math.abs(next - from);
      learnerWeights[i] = next;
    }
    if (moved <= 0) {
      // Identical policies exchange nothing; record no event (honesty: no transfer occurred).
      this.rejections++;
      return 0;
    }
    this.cooldownUntil[learner] = now + TREE_TEACHING_COOLDOWN_SECONDS;
    this.events++;
    this.lastTeacher = teacher;
    this.lastLearner = learner;
    this.lastAt = now;
    this.lastWeightDelta = moved;
    return moved;
  }

  /** Low-cadence development snapshot; allocates one small object outside the hot path. */
  status(): TreeTeachingStatus {
    return {
      events: this.events,
      rejections: this.rejections,
      lastTeacher: this.lastTeacher,
      lastLearner: this.lastLearner,
      lastAt: this.lastAt,
      lastWeightDelta: this.lastWeightDelta,
    };
  }

  /** Clear cooldowns and the ledger (reset/restart). */
  reset(): void {
    this.cooldownUntil.fill(0);
    this.events = 0;
    this.rejections = 0;
    this.lastTeacher = -1;
    this.lastLearner = -1;
    this.lastAt = -1;
    this.lastWeightDelta = 0;
  }
}
