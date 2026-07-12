/**
 * THE WINGMAN SWARM — the SUPER CREATURE's escort of mini-robots (V47).
 *
 * The directive: "they have ARMS and WINGMAN mini tiny swarms of 100 robots around them that have 250
 * parameter intelligence each, similar to the SUPER CREATURE, and it helps the Super Creatures." Each
 * super creature is orbited by {@link WINGMAN_COUNT} tiny robots; every robot carries its own **~250-
 * parameter brain** (a {@link TinyMLP} 8→18→5) that, each beat, perceives its place in the formation +
 * the creature's state (dominance + two quantum aspects + a phase clock) and steers its own orbit while
 * emitting an ASSIST signal — the swarm's mean assist is the lift the escort gives the monster.
 *
 * Efficient + deterministic: one FLAT weight pool (no per-robot objects), an allocation-free inline
 * forward, a golden-angle formation seeded with no rng, and brains rolled once from an injected
 * {@link Rng} sub-stream. The positions buffer feeds a single InstancedMesh (one draw call). Pure sim —
 * no DOM, no WebGL; the render layer reads {@link WingmanSwarm.positions}.
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { TinyMLP } from './ai/brains';
import { createMlp, mlpPredict, mlpTrainStep, type Mlp } from './ad-mlp';

export const WINGMAN_COUNT = 100; // robots per super creature ("swarms of 100")
const WIN_IN = 8;
const WIN_HID = 18;
const WIN_OUT = 5;
/** Weights per robot brain — ~250 ("250 parameter intelligence each"). */
export const WINGMAN_PARAMS_EACH = TinyMLP.weightCount(WIN_IN, WIN_HID, WIN_OUT); // 257

// ── LEARNED FLIGHT COORDINATOR (per swarm) — the 100 robot brains are FROZEN (rolled once); this adds the
// one part of the escort that DEVELOPS during life: a real 6→6→1 MLP (exact Eshkol-AD backprop) that forecasts
// its creature's OWN next-beat DOMINANCE from the swarm's aggregate state. A predicted DROP becomes an assist
// BOOST — the escort presses HARDER exactly when its monster is about to weaken (anticipatory support), then
// relaxes as the creature recovers. Continuous ⇒ robust; OFF by default ⇒ the assist is byte-identical. ──────
const WING_COORD_IN = 6; // aggregate swarm state: dominance, reactive, adaptive, last-assist, mean-radius-dev, chaos
const WING_COORD_HID = 6;
const WING_COORD_TAU = 0.05; // EMA smoothing for the learned dominance-forecast error
/** Learnable params the coordinator adds when lit: (in·h + h) + (h·1 + 1). */
export const WINGMAN_COORD_PARAMS =
  WING_COORD_IN * WING_COORD_HID + WING_COORD_HID + (WING_COORD_HID + 1); // 49
const clamp01c = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const BASE_R = 14; // orbit radius around the creature core (R≈6), so robots ring it from outside
const GOLDEN = 2.399963229728653; // golden angle — even, rng-free formation

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const unit = (v: number): number => v * 0.5 + 0.5;

export class WingmanSwarm {
  readonly count: number;
  readonly paramsEach = WINGMAN_PARAMS_EACH;
  readonly paramsTotal: number;
  /** Flat XYZ positions (count×3) — the InstancedMesh source, updated in place each beat. */
  readonly positions: Float32Array;
  /** Mean assist the swarm is currently lending the creature, 0..1. */
  assist = 0;

  private readonly weights: Float32Array; // count × WINGMAN_PARAMS_EACH
  private readonly ang: Float32Array; // orbit angle
  private readonly rad: Float32Array; // orbit radius
  private readonly hgt: Float32Array; // orbit height offset
  private readonly spd: Float32Array; // orbit angular speed
  private readonly phase: Float32Array; // per-robot phase
  private readonly senses = new Float32Array(WIN_IN);
  private readonly hid = new Float32Array(WIN_HID);
  private readonly out = new Float32Array(WIN_OUT);

  // ── the swarm's online flight coordinator (null until enableLearning lights it) ───────────────────
  private coordModel: Mlp | null = null;
  private learn = false; // default OFF ⇒ update() is byte-identical to the frozen escort
  private coordLr = 0.05;
  private coordBias = true; // the seam: false learns the model but does not steer the assist
  private readonly coordInput = new Float64Array(WING_COORD_IN); // this beat's aggregate state
  private readonly coordPrevInput = new Float64Array(WING_COORD_IN); // last beat's — the training input
  private readonly coordTarget = new Float64Array(1); // scratch target (this beat's dominance)
  private coordPrevValid = false;
  private domForecast = 0; // the coordinator's forecast (last beat) for THIS beat's dominance
  private assistBoost = 0; // clamp(floor − forecastNext): anticipated WEAKNESS → press the escort harder
  private learnedCoordErr = 0; // EMA of |dominance forecast − actual| — FALLS as the coordinator learns

  constructor(count: number, rng: Rng) {
    this.count = Math.max(0, count);
    this.paramsTotal = this.count * WINGMAN_PARAMS_EACH;
    this.weights = new Float32Array(this.paramsTotal);
    for (let i = 0; i < this.weights.length; i++) this.weights[i] = rng() * 2 - 1;
    this.positions = new Float32Array(this.count * 3);
    this.ang = new Float32Array(this.count);
    this.rad = new Float32Array(this.count);
    this.hgt = new Float32Array(this.count);
    this.spd = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      this.ang[i] = i * GOLDEN; // golden-angle ring, deterministic
      this.rad[i] = BASE_R * (0.85 + 0.4 * ((i * 0.61803) % 1)); // staggered shells
      this.hgt[i] = ((i % 7) - 3) * 1.6; // banded altitude
      this.spd[i] = 0.4 + 0.5 * ((i * 0.317) % 1); // varied orbital speed
      this.phase[i] = i * 0.293;
    }
  }

  /**
   * Ignite ONLINE learning: the swarm grows a {@link WINGMAN_COORD_PARAMS}-param 6→6→1 MLP (exact Eshkol-AD
   * backprop) that forecasts its creature's next-beat DOMINANCE and presses the escort harder when a drop is
   * anticipated. Seeded from a SEPARATE substream (never the robot-brain rng) ⇒ no perturbation of the frozen
   * formation. Idempotent. `lr = 0` freezes the coordinator (the ablation control); `coordinate: false` learns
   * it but does not steer the assist (the operational-isolation control).
   */
  enableLearning(opts?: { lr?: number; seed?: number; coordinate?: boolean }): void {
    if (opts?.lr !== undefined) this.coordLr = opts.lr;
    if (this.coordModel) {
      this.learn = true;
      return;
    }
    const s = (((opts?.seed ?? 0) >>> 0) ^ 0x5f19c0de) >>> 0 || 1;
    this.coordModel = createMlp(WING_COORD_IN, WING_COORD_HID, 1, mulberry32(s));
    this.coordBias = opts?.coordinate !== false;
    this.learn = true;
    this.coordPrevValid = false;
    this.domForecast = 0;
    this.assistBoost = 0;
    this.learnedCoordErr = 0;
  }

  /** Is the swarm's flight coordinator learning this run? (false ⇒ the frozen escort baseline). */
  get isLearning(): boolean {
    return this.learn;
  }
  /** EMA of the coordinator's dominance-forecast error — the falsifiable "the escort is developing" readout. */
  get learnedCoordError(): number {
    return this.learnedCoordErr;
  }
  /** Learnable params this swarm's coordinator adds when lit (0 when frozen). */
  get liveCoordParams(): number {
    return this.coordModel ? WINGMAN_COORD_PARAMS : 0;
  }

  /**
   * One swarm beat: each robot perceives + steers its orbit and emits assist. `center` is the creature
   * position; `quantum` its 10 aspect intensities; `dominance` 0..1; `t`/`dt` the sim clock. Updates
   * {@link positions} + {@link assist} in place. Allocation-free; deterministic (no rng/clock here).
   */
  update(
    cx: number,
    cy: number,
    cz: number,
    dominance: number,
    quantum: ArrayLike<number>,
    t: number,
    dt: number,
  ): void {
    if (this.count === 0) {
      this.assist = 0;
      return;
    }
    const reactive = quantum[7] ?? 0; // QUANTUM_ASPECTS[7] = 'reactive'
    const adaptive = quantum[9] ?? 0; // QUANTUM_ASPECTS[9] = 'adaptive'
    let assistSum = 0;
    let radSum = 0; // Σ orbit radius → the swarm's mean formation spread (a coordinator input)
    for (let i = 0; i < this.count; i++) {
      const s = this.senses;
      const a = this.ang[i]!;
      const r = this.rad[i]!;
      s[0] = Math.sin(a);
      s[1] = Math.cos(a);
      s[2] = (r - BASE_R) / BASE_R;
      s[3] = clamp01(dominance);
      s[4] = clamp01(reactive);
      s[5] = clamp01(adaptive);
      s[6] = Math.sin((this.phase[i] ?? 0) + t * 0.5);
      s[7] = clamp((this.hgt[i] ?? 0) / 12, -1, 1);
      this.forward(i * WINGMAN_PARAMS_EACH);
      const o = this.out;
      // steer the orbit (bounded so the formation holds)
      this.rad[i] = clamp(r + (o[0] ?? 0) * 0.5, BASE_R * 0.5, BASE_R * 1.7);
      this.hgt[i] = clamp((this.hgt[i] ?? 0) + (o[1] ?? 0) * 0.4, -9, 13);
      this.ang[i] = a + (this.spd[i]! + (o[2] ?? 0) * 0.5) * dt;
      assistSum += unit(o[3] ?? 0);
      // write the world position
      const na = this.ang[i]!;
      const nr = this.rad[i]!;
      radSum += nr;
      const j = i * 3;
      this.positions[j] = cx + Math.sin(na) * nr;
      this.positions[j + 1] = cy + (this.hgt[i] ?? 0) + Math.sin((this.phase[i] ?? 0) + t) * 0.6;
      this.positions[j + 2] = cz + Math.cos(na) * nr;
    }
    const baseAssist = assistSum / this.count;
    // LEARNED COORDINATOR: forecast the creature's next-beat dominance from the swarm's aggregate state and
    // press the escort HARDER when a drop is anticipated. OFF (or coordinate:false) ⇒ assist = baseAssist ⇒
    // byte-identical to the frozen escort. Trained on (prev aggregate → this beat's dominance) by exact AD.
    if (this.learn && this.coordModel) {
      const ci = this.coordInput;
      ci[0] = clamp01(dominance);
      ci[1] = clamp01(reactive);
      ci[2] = clamp01(adaptive);
      ci[3] = this.assist; // last beat's realized assist (not yet overwritten)
      ci[4] = clamp01((radSum / this.count - BASE_R) / BASE_R + 0.5); // mean formation spread, centered
      ci[5] = clamp01(quantum[0] ?? 0);
      if (this.coordPrevValid) {
        this.learnedCoordErr +=
          WING_COORD_TAU * (Math.abs(this.domForecast - ci[0]) - this.learnedCoordErr);
        if (this.coordLr > 0) {
          this.coordTarget[0] = ci[0];
          mlpTrainStep(this.coordModel, this.coordPrevInput, this.coordTarget, this.coordLr);
        }
      }
      const domNext = clamp01c(mlpPredict(this.coordModel, ci)[0] ?? 0);
      this.assistBoost = clamp01c((0.55 - domNext) * 1.4); // anticipated WEAKNESS (below floor) → press harder
      this.domForecast = domNext;
      this.coordPrevInput.set(ci);
      this.coordPrevValid = true;
      this.assist = this.coordBias
        ? clamp01c(baseAssist * (1 + this.assistBoost * 1.5))
        : baseAssist;
    } else {
      this.assist = baseAssist;
    }
  }

  /** Allocation-free MLP forward reading a robot's brain weights from the flat pool at `base`. */
  private forward(base: number): void {
    const w = this.weights;
    const s = this.senses;
    const hid = this.hid;
    const out = this.out;
    let p = base;
    for (let h = 0; h < WIN_HID; h++) {
      let acc = w[p++] ?? 0;
      for (let i = 0; i < WIN_IN; i++) acc += (w[p++] ?? 0) * (s[i] ?? 0);
      hid[h] = Math.tanh(acc);
    }
    for (let o = 0; o < WIN_OUT; o++) {
      let acc = w[p++] ?? 0;
      for (let h = 0; h < WIN_HID; h++) acc += (w[p++] ?? 0) * (hid[h] ?? 0);
      out[o] = Math.tanh(acc);
    }
  }
}
