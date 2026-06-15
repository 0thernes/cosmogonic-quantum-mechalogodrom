/**
 * Gray–Scott reaction–diffusion — the living skin of the ground (CONTRACTS V2).
 *
 * A genuine two-species PDE integrated on a SIZE×SIZE toroidal grid with an
 * explicit Euler step and the classic 9-point Laplacian (Karl Sims / Pearson
 * parameterization):
 *
 *   du/dt = Du·∇²u − r·u·v² + F·(1 − u)
 *   dv/dt = Dv·∇²v + r·u·v² − (F + K)·v
 *
 * Substrate ↔ spectacle couplings (philosophy rule 4 — reads AND writes):
 * - READS  `ctx.state`: STORM raises feed F, VOID raises kill K, AURORA boosts
 *   both diffusion rates; chaos scales the reaction rate r.
 * - WRITES the ground: `texture` renders the U field and is attached as the
 *   ground material's emissiveMap via `EnvironmentSystem.attachGroundEmissiveMap`.
 *   Background (u ≈ 1) samples white so an unperturbed cosmos looks identical
 *   to v1; active patterns (u ≈ 0.2–0.4) carve dark living veins into the glow.
 * - Entity deaths feed back in through `perturb` (wired by world.ts).
 *
 * Determinism: the only randomness is the seed noise inside `perturb`, drawn
 * from the injected `ctx.rng` — same seed + same perturb/step sequence ⇒
 * bit-identical fields (pinned by tests/reaction-diffusion.test.ts).
 *
 * Boundedness proof: u and v are clamped to [0, 1] after every cell update —
 * a hard invariant, so the field is finite after any number of steps. The
 * unclamped scheme is also stable at these rates: for the worst (checkerboard)
 * mode the 9-point kernel gives amplification |1 − 1.6·Du·dt|; with
 * dt = 1 and Du ≤ 1·1.2 (AURORA) that is |1 − 1.92| = 0.92 < 1.
 */
import * as THREE from 'three';
import type { Rng } from '../math/rng';
import type { SimContext, SimState } from '../types';
import { WEATHERS, type Weather } from './constants';

/** Default grid resolution; 128² = 16 384 cells keeps step() well under 0.5 ms. */
const DEFAULT_SIZE = 128;

/** Integration step (one step() call advances the PDE by this much model time). */
const DT = 1.0;

/** Activator diffusion rate Du (Sims kernel norm: 1.0 is the plain-averaging limit). */
const DIFFUSION_U = 1.0;

/** Inhibitor diffusion rate Dv — half of Du, the canonical Gray–Scott ratio. */
const DIFFUSION_V = 0.5;

/**
 * Base feed rate F. Calibration: (F, K) = (0.0545, 0.062) is the robust "coral
 * growth" regime — perturbations expand into branching skin instead of dying
 * (0.0367/0.0649 "mitosis" was rejected: too sparse at 128; 0.014/0.054
 * "moving spots" was rejected: visually noisy under the chaos coupling).
 */
const FEED_BASE = 0.0545;

/** Base kill rate K (see {@link FEED_BASE} for the calibration note). */
const KILL_BASE = 0.062;

/** STORM feed boost: F → 0.062, flooding the field with hyperactive growth. */
const FEED_STORM_BOOST = 0.0075;

/** VOID kill boost: K → 0.066, just past the survival boundary — patterns starve. */
const KILL_VOID_BOOST = 0.004;

/**
 * AURORA diffusion multiplier on both Du and Dv — larger, smoother flowing
 * structures. 1.2 is the documented stability ceiling (see module JSDoc proof);
 * 1.5 was rejected: checkerboard mode amplification |1 − 2.4| > 1 diverges.
 */
const AURORA_DIFFUSION_BOOST = 1.2;

/** Reaction-rate floor + chaos gain: r = 0.9 + 0.1·min(chaos/2, 3) ∈ [0.905, 1.2]. */
const REACTION_FLOOR = 0.9;
const REACTION_CHAOS_GAIN = 0.1;

/** Default perturb radius in grid cells (~4/128 of the ground plane). */
const DEFAULT_PERTURB_RADIUS = 4;

/**
 * CPU Gray–Scott reaction–diffusion over two Float32Array ping-pong pairs (U and
 * V each have a front/back buffer; `step()` integrates front → back, swaps, then
 * refreshes the display texture). O(SIZE²) per step, allocation-free; world.ts
 * runs it every 2nd frame (offset 1 from the grid rebuild).
 */
export class ReactionDiffusionSystem {
  /**
   * three.js DataTexture rendering the U field — attach as the ground
   * emissiveMap. Stored as RGBA8 luminance derived from U each step (not a raw
   * R32F view): float-linear filtering is an optional WebGL2 extension, and an
   * R-channel texture would sample as (r, 0, 0) and tint the emissive red-only.
   * RGBA8 is filterable on every device three 0.184 supports.
   */
  readonly texture: THREE.DataTexture;

  private readonly state: SimState;
  private readonly rng: Rng;
  private readonly size: number;
  /** Front U buffer (read by step, rendered by texture refresh). */
  private u: Float32Array;
  /** Front V buffer. */
  private v: Float32Array;
  /** Back U buffer (written by step, becomes front after the swap). */
  private uBack: Float32Array;
  /** Back V buffer. */
  private vBack: Float32Array;
  /** RGBA8 display buffer backing {@link texture}; alpha pre-filled with 255. */
  private readonly pixels: Uint8Array;

  /**
   * Builds the field in the uniform trivial state u = 1, v = 0 (so "uniform
   * stays uniform" holds until the first `perturb`). Draws nothing from the rng
   * at construction — the seeded stream is consumed only by `perturb`.
   * One-time O(size²) allocation; throws on a non-integer size or size < 8.
   */
  constructor(ctx: SimContext, size = DEFAULT_SIZE) {
    if (!Number.isInteger(size) || size < 8) {
      throw new Error(`ReactionDiffusionSystem size must be an integer >= 8, got ${size}`);
    }
    this.state = ctx.state;
    this.rng = ctx.rng;
    this.size = size;
    const cells = size * size;
    this.u = new Float32Array(cells).fill(1);
    this.v = new Float32Array(cells);
    this.uBack = new Float32Array(cells).fill(1);
    this.vBack = new Float32Array(cells);
    this.pixels = new Uint8Array(cells * 4);
    for (let i = 0; i < cells; i++) {
      const p = i * 4;
      this.pixels[p] = 255;
      this.pixels[p + 1] = 255;
      this.pixels[p + 2] = 255;
      this.pixels[p + 3] = 255;
    }
    const tex = new THREE.DataTexture(this.pixels, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping; // the field is toroidal — wrap is seamless
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter; // no mips on a DataTexture refreshed per step
    tex.needsUpdate = true;
    this.texture = tex;
  }

  /**
   * Live front U field (background ≈ 1, patterns ≈ 0.2–0.4). Shared buffer,
   * valid until the next `step()` swap; read-only by convention. For tests and
   * telemetry — render consumers use {@link texture}.
   */
  get fieldU(): Float32Array {
    return this.u;
  }

  /** Live front V field (see {@link fieldU} for the sharing caveat). */
  get fieldV(): Float32Array {
    return this.v;
  }

  /**
   * One explicit-Euler Gray–Scott step with weather/chaos couplings read from
   * `ctx.state`, followed by the U → RGBA8 texture refresh (`needsUpdate` set
   * every step). Toroidal boundaries. O(SIZE²); allocation-free — the only
   * mutations are the typed-array ping-pong swap and the texture flag.
   */
  step(): void {
    const s = this.size;
    const state = this.state;
    // Defensive modulo, same as WeatherSystem.apply: any non-negative index is honored.
    const weather: Weather = WEATHERS[state.weatherIdx % WEATHERS.length] ?? 'CLEAR';
    let feed = FEED_BASE;
    let kill = KILL_BASE;
    let diffusion = 1;
    if (weather === 'STORM') feed += FEED_STORM_BOOST;
    else if (weather === 'VOID') kill += KILL_VOID_BOOST;
    else if (weather === 'AURORA') diffusion = AURORA_DIFFUSION_BOOST;
    const du = DIFFUSION_U * diffusion;
    const dv = DIFFUSION_V * diffusion;
    // Legacy cMul() shape: min(chaos / 2, 3) — chaos accelerates the reaction.
    const react = REACTION_FLOOR + REACTION_CHAOS_GAIN * Math.min(state.chaos / 2, 3);
    const decay = feed + kill;
    const u = this.u;
    const v = this.v;
    const un = this.uBack;
    const vn = this.vBack;

    // Sliding 3×3 window: per cell only the right-hand column is loaded (3 reads
    // per species instead of 9); the wrap columns are handled at the window seams.
    // All indices below are constructed inside [0, s²) — the `!` reads are safe.
    for (let y = 0; y < s; y++) {
      const row = y * s;
      const rowUp = (y === 0 ? s - 1 : y - 1) * s;
      const rowDn = (y === s - 1 ? 0 : y + 1) * s;
      // Window init for x = 0: left column wraps to s − 1, center column is x = 0.
      let uUL = u[rowUp + s - 1]!;
      let uUC = u[rowUp]!;
      let uCL = u[row + s - 1]!;
      let uCC = u[row]!;
      let uDL = u[rowDn + s - 1]!;
      let uDC = u[rowDn]!;
      let vUL = v[rowUp + s - 1]!;
      let vUC = v[rowUp]!;
      let vCL = v[row + s - 1]!;
      let vCC = v[row]!;
      let vDL = v[rowDn + s - 1]!;
      let vDC = v[rowDn]!;
      for (let x = 0; x < s; x++) {
        const xr = x === s - 1 ? 0 : x + 1;
        const uUR = u[rowUp + xr]!;
        const uCR = u[row + xr]!;
        const uDR = u[rowDn + xr]!;
        const vUR = v[rowUp + xr]!;
        const vCR = v[row + xr]!;
        const vDR = v[rowDn + xr]!;
        // 9-point Laplacian: 0.2 orthogonal, 0.05 diagonal, −1 center (weights sum to 0).
        const lapU = 0.2 * (uCL + uCR + uUC + uDC) + 0.05 * (uUL + uUR + uDL + uDR) - uCC;
        const lapV = 0.2 * (vCL + vCR + vUC + vDC) + 0.05 * (vUL + vUR + vDL + vDR) - vCC;
        const reaction = react * uCC * vCC * vCC;
        const nu = uCC + (du * lapU - reaction + feed * (1 - uCC)) * DT;
        const nv = vCC + (dv * lapV + reaction - decay * vCC) * DT;
        const i = row + x;
        // Hard boundedness invariant: both species clamped to [0, 1]. Matches the canonical
        // `scalar.clamp` form (the codebase's majority pattern for finite-input clamps); NaN is
        // unreachable here — the field stays in [0, 1] and the arithmetic is finite — so the
        // header's "finite after any number of steps" proof holds on its no-non-finite-input premise.
        un[i] = nu < 0 ? 0 : nu > 1 ? 1 : nu;
        vn[i] = nv < 0 ? 0 : nv > 1 ? 1 : nv;
        // Slide the window one column right.
        uUL = uUC;
        uUC = uUR;
        uCL = uCC;
        uCC = uCR;
        uDL = uDC;
        uDC = uDR;
        vUL = vUC;
        vUC = vUR;
        vCL = vCC;
        vCC = vCR;
        vDL = vDC;
        vDC = vDR;
      }
    }

    // Ping-pong swap: the freshly written back buffers become the front fields.
    this.u = un;
    this.v = vn;
    this.uBack = u;
    this.vBack = v;

    // U → RGBA8 luminance refresh (alpha stays 255 from construction).
    const px = this.pixels;
    const fu = this.u;
    const cells = s * s;
    for (let i = 0, p = 0; i < cells; i++, p += 4) {
      const lum = ((fu[i] ?? 0) * 255) | 0; // u ∈ [0,1] ⇒ lum ∈ [0,255], 1 maps to exactly 255
      px[p] = lum;
      px[p + 1] = lum;
      px[p + 2] = lum;
    }
    this.texture.needsUpdate = true;
  }

  /**
   * Drop a seed disturbance at normalized (nx, ny) ∈ [0,1]² (ground-plane UV;
   * world.ts wires entity deaths here). `radius` is in grid cells (default 4,
   * clamped to [1, size/4]). Inside the disk the inhibitor V is raised and the
   * activator U cut, with rng jitter so grown patterns are organic rather than
   * radially symmetric. Toroidal wrap at the edges. O(radius²); allocation-free.
   */
  perturb(nx: number, ny: number, radius = DEFAULT_PERTURB_RADIUS): void {
    const s = this.size;
    const r = Math.max(1, Math.min(Math.floor(radius), s >> 2));
    const cx = Math.floor((nx - Math.floor(nx)) * s); // fractional part ⇒ [0, s)
    const cy = Math.floor((ny - Math.floor(ny)) * s);
    const r2 = r * r;
    const u = this.u;
    const v = this.v;
    const rng = this.rng;
    for (let dy = -r; dy <= r; dy++) {
      const row = (((cy + dy) % s) + s) % s;
      const rowBase = row * s;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const col = (((cx + dx) % s) + s) % s;
        const i = rowBase + col;
        const seedV = 0.6 + rng() * 0.4;
        const cutU = 0.2 + rng() * 0.3;
        if (seedV > (v[i] ?? 0)) v[i] = seedV;
        if (cutU < (u[i] ?? 1)) u[i] = cutU;
      }
    }
  }
}
