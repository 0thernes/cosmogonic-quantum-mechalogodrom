/**
 * CHAOS MODE (CONTRACTS V62) — a toggled storm that turns the calm cosmos into a chaotic,
 * quantum-mechanical maelstrom. Two real pieces of physics under the effect (the philosophy's
 * "real math under every effect"):
 *
 * 1. **Deterministic chaos** — a {@link https://en.wikipedia.org/wiki/Lorenz_system Lorenz attractor}
 *    integrated each frame. Its trajectory is the textbook example of *sensitive dependence on
 *    initial conditions*: bounded, never-repeating, butterfly-shaped. Its magnitude becomes the
 *    field's {@link intensity} (0..1), which drives `state.chaos` up into the storm band and feeds
 *    the camera shake, the quantum strength, and the cadence of the disturbances. NO rng — pure ODE.
 *
 * 2. **Random quantum mechanics on the organisms** — three signatures, all from a dedicated seeded
 *    sub-stream so the base sim's draw order is byte-identical when chaos mode is OFF (this whole
 *    `update()` returns before drawing a single number while inactive):
 *    - **TUNNELLING** — a creature occasionally makes a discrete spatial JUMP (a position
 *      discontinuity), as if it passed through a barrier. Probability rises with intensity.
 *    - **SUPERPOSITION** — every visited creature advances its (previously unused) `qP` quantum phase
 *      and gains a perpendicular velocity wobble: it smears along an uncertain path instead of a
 *      definite one.
 *    - **ENTANGLEMENT** — a small set of creature PAIRS is linked; each frame their momenta are
 *      pulled toward a shared mean and they exchange colour, so "measuring" (perturbing) one is
 *      reflected in its partner — spooky action across the arena.
 *
 * While active the field also *disturbs the world's other systems*: it elevates `state.chaos` (which
 * the economy already reads as market stress and the entities read as jitter gain), and it raises
 * timed **weather** + **algorithm** "kick" intents the integrator drains to flip the sky and switch
 * the active sorting field. UI/sim coupling is one-way (it reads the entity list + writes velocities/
 * positions/colours); determinism holds because every random branch is from {@link ChaosField}'s own
 * `rng` in a fixed per-frame order, reproducible from the seed + the toggle sequence (audit-recorded).
 */
import { TAU, clamp } from '../math/scalar';
import { mulberry32, type Rng } from '../math/rng';
import type { Entity, SimState } from '../types';

/** Lorenz parameters — the canonical chaotic regime (σ=10, ρ=28, β=8/3). */
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
/** Sub-steps per frame for the Lorenz integrator (RK1 stays stable at this micro-dt). */
const LORENZ_STEPS = 4;
/** The storm holds `state.chaos` in this band (lo + intensity·(hi−lo)). */
const CHAOS_STORM_LO = 5;
const CHAOS_STORM_HI = 10;
/** At most this many entangled pairs at once — kept small so entanglement reads as special. */
const MAX_PAIRS = 40;

/**
 * The toggled chaos storm. Constructed once on its OWN seeded sub-stream (golden-ratio mix off the
 * world seed, like `econRng`); the integrator calls {@link update} each frame and drains
 * {@link takeWeatherKick}/{@link takeAlgoKick}. Inert (and rng-silent) until {@link toggle}d on.
 */
export class ChaosField {
  private readonly rng: Rng;
  private _active = false;
  /** Lorenz state — a non-trivial point already on the attractor (not a fixed point). */
  private lx = 0.9;
  private ly = 0.0;
  private lz = 0.0;
  private _intensity = 0;
  private _shake = 0;
  private _tunnels = 0;
  private _entangled = 0;
  /** Entangled index pairs into the live entity list; re-picked on a timer + validated each use. */
  private readonly pairs: [number, number][] = [];
  private pairTimer = 0;
  private kickTimer = 0;
  private weatherKick = false;
  private algoKick = false;

  constructor(seed: number) {
    // Unique golden-ratio-style magic so this stream is independent of rng/econRng/superRng/etc.
    this.rng = mulberry32((seed ^ 0x3c6ef372) >>> 0 || 1);
  }

  /** Whether the storm is engaged. */
  get active(): boolean {
    return this._active;
  }
  /** Chaotic 0..1 storm intensity (the Lorenz magnitude); 0 when off. */
  get intensity(): number {
    return this._intensity;
  }
  /** Suggested camera-shake magnitude for this frame (0 when off). */
  get shake(): number {
    return this._shake;
  }
  /** Tunnelling events that fired this frame (telemetry). */
  get tunnels(): number {
    return this._tunnels;
  }
  /** Number of organisms currently entangled (telemetry). */
  get entangledCount(): number {
    return this._entangled;
  }

  /** Engage/disengage the storm. Returns the new state. Clears transient state on disengage. */
  toggle(): boolean {
    this._active = !this._active;
    if (!this._active) {
      this._intensity = 0;
      this._shake = 0;
      this._tunnels = 0;
      this._entangled = 0;
      this.pairs.length = 0;
    }
    return this._active;
  }

  /** Drain the pending weather-flip intent (true once, then resets). */
  takeWeatherKick(): boolean {
    const k = this.weatherKick;
    this.weatherKick = false;
    return k;
  }
  /** Drain the pending algorithm-switch intent (true once, then resets). */
  takeAlgoKick(): boolean {
    const k = this.algoKick;
    this.algoKick = false;
    return k;
  }

  /**
   * Advance the storm one frame. **No-op with ZERO rng draws while inactive**, so the base sim is
   * byte-identical when chaos mode is off. While active: integrate the Lorenz attractor, push
   * `state.chaos` into the storm band, apply the quantum effects to a strided slice of the
   * population, and arm the timed weather/algorithm kicks. O(n) over the slice (n/3 per frame).
   */
  update(dt: number, list: readonly Entity[], state: SimState): void {
    this._shake = 0;
    this._tunnels = 0;
    if (!this._active) return;

    // 1) Lorenz attractor — deterministic chaos (sensitive dependence; pure float ODE, no rng).
    const h = Math.min(dt, 0.05) / LORENZ_STEPS;
    for (let i = 0; i < LORENZ_STEPS; i++) {
      const dx = SIGMA * (this.ly - this.lx);
      const dy = this.lx * (RHO - this.lz) - this.ly;
      const dz = this.lx * this.ly - BETA * this.lz;
      this.lx += dx * h;
      this.ly += dy * h;
      this.lz += dz * h;
    }
    this._intensity = clamp((Math.abs(this.lx) + Math.abs(this.ly)) / 44, 0, 1);
    this._shake = 0.25 + this._intensity * 0.75;
    // 2) elevate the world's chaos scalar into the storm band (economy reads it as stress, entities
    //    as jitter gain — so the storm "disturbs the economy + the algorithms" through the existing
    //    couplings). Never lowers an already-higher chaos.
    const target = CHAOS_STORM_LO + this._intensity * (CHAOS_STORM_HI - CHAOS_STORM_LO);
    if (state.chaos < target) state.chaos = target;

    // 3) quantum mechanics on the creatures.
    this.applyQuantum(dt, list, state.frame);

    // 4) timed disturbances — flip the weather + switch the active sorting field on a chaotic cadence.
    this.kickTimer -= dt;
    if (this.kickTimer <= 0) {
      this.kickTimer = 1.0 + this.rng() * 2.0;
      if (this.rng() < 0.55 + this._intensity * 0.35) this.weatherKick = true;
      if (this.rng() < 0.35 + this._intensity * 0.4) this.algoKick = true;
    }
  }

  /** Tunnelling + superposition over a strided slice, plus the entanglement pass. Allocation-light. */
  private applyQuantum(dt: number, list: readonly Entity[], frame: number): void {
    const n = list.length;
    if (n === 0) return;
    const rng = this.rng;
    const I = this._intensity;
    const pTunnel = 0.0015 + I * 0.006;
    const wob = 0.02 + I * 0.08;
    // Stride 3 (covers the whole population every 3 frames) — keeps the per-frame cost bounded at 50k.
    for (let i = frame % 3; i < n; i += 3) {
      const e = list[i];
      if (!e) continue;
      const u = e.userData;
      // SUPERPOSITION: advance the quantum phase, smear the path with a perpendicular wobble.
      u.qP += 0.25 + I * 0.6;
      u.vel.x += Math.sin(u.qP) * wob;
      u.vel.y += Math.sin(u.qP * 0.7) * wob * 0.5;
      u.vel.z += Math.cos(u.qP * 1.3) * wob;
      // TUNNELLING: a rare discrete spatial jump (position discontinuity through a barrier).
      if (rng() < pTunnel) {
        const r = 8 + rng() * 24;
        const a = rng() * TAU;
        const ct = rng() * 2 - 1; // uniform cosθ → isotropic direction
        const st = Math.sqrt(1 - ct * ct);
        e.position.x += Math.cos(a) * st * r;
        e.position.y += ct * r * 0.6;
        e.position.z += Math.sin(a) * st * r;
        this._tunnels++;
      }
    }
    this.applyEntanglement(dt, list, I);
  }

  /** Re-pick pairs on a timer; each frame pull partners toward a shared momentum + exchange colour. */
  private applyEntanglement(dt: number, list: readonly Entity[], I: number): void {
    this.pairTimer -= dt;
    if (this.pairTimer <= 0 || this.pairs.length === 0) {
      this.pairTimer = 3 + this.rng() * 4;
      this.repickPairs(list);
    }
    this._entangled = 0;
    const g = 0.06 + I * 0.1;
    for (const pr of this.pairs) {
      const ea = list[pr[0]];
      const eb = list[pr[1]];
      if (!ea || !eb) continue;
      const ua = ea.userData.vel;
      const ub = eb.userData.vel;
      // Shared (mean) momentum — both partners are drawn toward it, so their dances mirror.
      const mx = (ua.x + ub.x) * 0.5;
      const my = (ua.y + ub.y) * 0.5;
      const mz = (ua.z + ub.z) * 0.5;
      ua.x += (mx - ua.x) * g;
      ua.y += (my - ua.y) * g;
      ua.z += (mz - ua.z) * g;
      ub.x += (mx - ub.x) * g;
      ub.y += (my - ub.y) * g;
      ub.z += (mz - ub.z) * g;
      // Exchange colour — measuring one's hue informs the other (a persistent entanglement mark).
      ea.material.color.lerp(eb.material.color, 0.05);
      eb.material.color.lerp(ea.material.color, 0.05);
      this._entangled += 2;
    }
  }

  /** Choose up to ~2% of the population (capped) as random entangled pairs. Validated on use. */
  private repickPairs(list: readonly Entity[]): void {
    this.pairs.length = 0;
    const n = list.length;
    if (n < 2) return;
    const want = Math.min(MAX_PAIRS, Math.floor(n * 0.02));
    for (let k = 0; k < want; k++) {
      const a = Math.floor(this.rng() * n);
      const b = Math.floor(this.rng() * n);
      if (a !== b) this.pairs.push([a, b]);
    }
  }
}
