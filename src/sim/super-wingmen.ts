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
import { TinyMLP } from './ai/brains';

export const WINGMAN_COUNT = 100; // robots per super creature ("swarms of 100")
const WIN_IN = 8;
const WIN_HID = 18;
const WIN_OUT = 5;
/** Weights per robot brain — ~250 ("250 parameter intelligence each"). */
export const WINGMAN_PARAMS_EACH = TinyMLP.weightCount(WIN_IN, WIN_HID, WIN_OUT); // 257

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
      const j = i * 3;
      this.positions[j] = cx + Math.sin(na) * nr;
      this.positions[j + 1] = cy + (this.hgt[i] ?? 0) + Math.sin((this.phase[i] ?? 0) + t) * 0.6;
      this.positions[j + 2] = cz + Math.cos(na) * nr;
    }
    this.assist = assistSum / this.count;
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
