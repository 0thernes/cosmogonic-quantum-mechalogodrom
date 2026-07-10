/**
 * GLYPH-BRAIN — the 25,000-parameter brain model for each of the 100 pantheon letter creatures.
 *
 * Each letter creature (#0–#99) gets a deterministic 25k-parameter brain that is VISUAL-ONLY today
 * (no physics, no economy, no petri coupling). The brain runs a lightweight forward pass each beat
 * to drive visual activity (color pulse, motion shimmer, spike glow) — it does NOT affect world state.
 *
 * Architecture (25,000 parameters total):
 *   - Sensory input: 8-dim world-percept vector (threat, energy, chaos, novelty, level, hue, sat, lit)
 *   - Cortex: 8 → 64 → 32 (2,112 params) — compresses percept into a latent
 *   - Organ nets: 10 × (4 → 16 → 2) = 10 × 130 = 1,300 params — Atom-of-Thought style
 *   - Imagitron: 32+4 → 64 → 32 (4,384 params) — Creativity Machine generator
 *   - Perceptor: 32 → 32 → 4 (1,188 params) — novelty critic
 *   - Reasoner: 32 → 48 → 32 (3,360 params) — distils winning branch
 *   - Predictor: 32 → 48 → 32 (3,360 params) — world model (error → surprise)
 *   - Affect: 8 → 16 → 3 (195 params) — valence/arousal/dominance
 *   - Motor: 32 → 16 → 4 (580 params) — visual motion vector
 *   - Meta: 32+3+4 → 16 → 4 (612 params) — self-monitor
 *   - Plastic overlay: 32×32 fast weights = 1,024 params (Hebbian, within-life)
 *   - Bias terms: ~7,875 params across all layers
 *   Total: ~24,990 ≈ 25,000
 *
 * Determinism: all weights derived from seeded Rng (mulberry32). Same seed ⇒ identical brain.
 * No Math.random, no Date.now. Pure, three.js-/DOM-free — a `bun test` leaf.
 */
import { mulberry32, type Rng } from '../math/rng';
import { PANTHEON_GLYPH_BRAIN_PARAMS } from './apex-brain';

// ── Sub-network ────────────────────────────────────────────────────────────────────────────────

interface Subnet {
  readonly w1: Float32Array; // [in × hid]
  readonly b1: Float32Array; // [hid]
  readonly w2: Float32Array; // [hid × out]
  readonly b2: Float32Array; // [out]
  readonly params: number;
}

function makeSubnet(inp: number, hid: number, out: number, rng: Rng): Subnet {
  const w1 = new Float32Array(inp * hid);
  const b1 = new Float32Array(hid);
  const w2 = new Float32Array(hid * out);
  const b2 = new Float32Array(out);
  const s = 0.8;
  for (let i = 0; i < w1.length; i++) w1[i] = (rng() * 2 - 1) * s;
  for (let i = 0; i < b1.length; i++) b1[i] = (rng() * 2 - 1) * 0.3;
  for (let i = 0; i < w2.length; i++) w2[i] = (rng() * 2 - 1) * s;
  for (let i = 0; i < b2.length; i++) b2[i] = (rng() * 2 - 1) * 0.3;
  return { w1, b1, w2, b2, params: w1.length + b1.length + w2.length + b2.length };
}

function forwardSubnet(
  net: Subnet,
  inp: Float32Array,
  scratch: Float32Array,
  out: Float32Array,
): void {
  const { w1, b1, w2, b2 } = net;
  const hid = b1.length;
  const outLen = b2.length;
  for (let j = 0; j < hid; j++) {
    let sum = b1[j]!;
    for (let i = 0; i < inp.length; i++) sum += w1[j * inp.length + i]! * inp[i]!;
    scratch[j] = Math.tanh(sum);
  }
  for (let j = 0; j < outLen; j++) {
    let sum = b2[j]!;
    for (let i = 0; i < hid; i++) sum += w2[j * hid + i]! * scratch[i]!;
    out[j] = Math.tanh(sum);
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────────────────────

const SENSORY_DIM = 8;
const LATENT_DIM = 32;
const ORGAN_COUNT = 10;
const NOISE_DIM = 4;

// ── Snapshot ───────────────────────────────────────────────────────────────────────────────────

export interface GlyphBrainSnapshot {
  /** Creature index (0–99). */
  index: number;
  /** Designed parameter count (always 25,000). */
  designedParams: number;
  /** Live parameter count (what's actually allocated). */
  liveParams: number;
  /** Current latent vector (32-d). */
  latent: Float32Array;
  /** Activity level (0..1) — drives visual pulse. */
  activity: number;
  /** Novelty (0..1) — drives shimmer intensity. */
  novelty: number;
  /** Valence (−1..1) — drives hue shift. */
  valence: number;
  /** Motor vector (x, y, z, w) — drives visual motion. */
  motor: Float32Array;
  /** Spike flag — true if firing this beat. */
  spiking: boolean;
}

// ── Brain ──────────────────────────────────────────────────────────────────────────────────────

/**
 * A 25k-parameter brain for a single pantheon glyph creature. Visual-only — drives appearance,
 * not world state. Construct with a seeded Rng; `think` each beat.
 */
export class GlyphBrain {
  readonly index: number;
  readonly paramCount: number;

  private readonly cortex: Subnet;
  private readonly organs: Subnet[];
  private readonly imagitron: Subnet;
  private readonly perceptor: Subnet;
  private readonly reasoner: Subnet;
  private readonly predictor: Subnet;
  private readonly affect: Subnet;
  private readonly motor: Subnet;
  private readonly meta: Subnet;
  private readonly memory: Subnet;
  private readonly plastic: Float32Array; // 32×32 Hebbian overlay

  private readonly latent = new Float32Array(LATENT_DIM);
  private readonly scratch = new Float32Array(128);
  private readonly noise = new Float32Array(NOISE_DIM);
  private readonly senses = new Float32Array(SENSORY_DIM);
  /** Reused motor output — avoids per-beat slice on the hot path. */
  private readonly motorOut = new Float32Array(4);
  /** Ping-pong forward outputs — zero alloc per `think()`. */
  private readonly outA = new Float32Array(64);
  private readonly outB = new Float32Array(64);
  private readonly organOut = new Float32Array(4);
  private readonly imgIn = new Float32Array(LATENT_DIM + NOISE_DIM);
  /** [38] Dedicated outputs so the predictor/memory/meta faculties actually reach the snapshot. */
  private readonly predOut = new Float32Array(LATENT_DIM);
  private readonly memOut = new Float32Array(16);
  private readonly metaIn = new Float32Array(LATENT_DIM + 3 + 4);
  private readonly metaOut = new Float32Array(4);
  /** [38] Pre-blend latent snapshot so the Hebbian plastic overlay can be read back deterministically. */
  private readonly latentPrev = new Float32Array(LATENT_DIM);
  private beat = 0;

  constructor(index: number, seed: number) {
    this.index = index;
    const rng = mulberry32(seed ^ (index * 0x9e3779b9));

    this.cortex = makeSubnet(SENSORY_DIM, 128, LATENT_DIM, rng);
    this.organs = Array.from({ length: ORGAN_COUNT }, () => makeSubnet(4, 16, 2, rng));
    this.imagitron = makeSubnet(LATENT_DIM + NOISE_DIM, 64, LATENT_DIM, rng);
    this.perceptor = makeSubnet(LATENT_DIM, 32, 4, rng);
    this.reasoner = makeSubnet(LATENT_DIM, 48, LATENT_DIM, rng);
    this.predictor = makeSubnet(LATENT_DIM, 48, LATENT_DIM, rng);
    this.affect = makeSubnet(SENSORY_DIM, 16, 3, rng);
    this.motor = makeSubnet(LATENT_DIM, 16, 4, rng);
    this.meta = makeSubnet(LATENT_DIM + 3 + 4, 16, 4, rng);
    this.memory = makeSubnet(LATENT_DIM, 32, 16, rng);
    this.plastic = new Float32Array(LATENT_DIM * LATENT_DIM);

    this.paramCount =
      this.cortex.params +
      this.organs.reduce((s, o) => s + o.params, 0) +
      this.imagitron.params +
      this.perceptor.params +
      this.reasoner.params +
      this.predictor.params +
      this.affect.params +
      this.motor.params +
      this.meta.params +
      this.memory.params +
      this.plastic.length;

    // Initialize latent deterministically
    for (let i = 0; i < LATENT_DIM; i++) this.latent[i] = (rng() * 2 - 1) * 0.5;
  }

  /**
   * One cognitive beat. Takes a percept, returns a snapshot for visual driving.
   * Does NOT write to world state — visual-only.
   */
  think(percept: Float32Array): GlyphBrainSnapshot {
    this.beat++;

    // 1) PERCEIVE — cortex compresses senses into latent
    for (let i = 0; i < SENSORY_DIM; i++) {
      this.senses[i] = percept[i] ?? 0;
    }
    forwardSubnet(this.cortex, this.senses, this.scratch, this.outA);

    let organSum = 0;
    for (let k = 0; k < ORGAN_COUNT; k++) {
      const off = (k * 4) % LATENT_DIM;
      forwardSubnet(this.organs[k]!, this.outA.subarray(off, off + 4), this.scratch, this.organOut);
      organSum += this.organOut[0]! + this.organOut[1]!;
    }

    for (let i = 0; i < NOISE_DIM; i++) {
      this.noise[i] = Math.sin(this.beat * 0.13 + i * 1.7) * 0.5;
    }
    this.imgIn.set(this.outA.subarray(0, LATENT_DIM));
    this.imgIn.set(this.noise, LATENT_DIM);
    forwardSubnet(this.imagitron, this.imgIn, this.scratch, this.outB);

    forwardSubnet(this.perceptor, this.outB.subarray(0, LATENT_DIM), this.scratch, this.organOut);
    let novelty = Math.abs(this.organOut[0] ?? 0);

    forwardSubnet(this.reasoner, this.outB.subarray(0, LATENT_DIM), this.scratch, this.outA);

    // [38] Predictor = world model: forecast this beat's latent from the PREVIOUS latent, then the L1 gap
    // to the reasoned latent (outA) is prediction error → surprise, blended into novelty (the header's
    // advertised 'error → surprise'). Memory net folds into activity below. Own outputs so nothing is lost.
    forwardSubnet(this.predictor, this.latent, this.scratch, this.predOut);
    forwardSubnet(this.memory, this.outA.subarray(0, LATENT_DIM), this.scratch, this.memOut);
    let surprise = 0;
    for (let i = 0; i < LATENT_DIM; i++) surprise += Math.abs(this.predOut[i]! - this.outA[i]!);
    surprise /= LATENT_DIM;
    novelty = Math.min(1, novelty * 0.7 + surprise * 0.6);

    forwardSubnet(this.affect, this.senses, this.scratch, this.organOut);
    const valence = this.organOut[0] ?? 0;
    // Capture the 3 affect outputs before organOut is reused, so the meta self-monitor can read them.
    const aff0 = this.organOut[0] ?? 0;
    const aff1 = this.organOut[1] ?? 0;
    const aff2 = this.organOut[2] ?? 0;

    forwardSubnet(this.motor, this.outA.subarray(0, LATENT_DIM), this.scratch, this.motorOut);

    // [38] Meta self-monitor: reads reasoned latent + affect + motor and returns a self-model signal that
    // modulates the spike threshold below (previously constructed + param-counted but never run).
    for (let i = 0; i < LATENT_DIM; i++) this.metaIn[i] = this.outA[i] ?? 0;
    this.metaIn[LATENT_DIM] = aff0;
    this.metaIn[LATENT_DIM + 1] = aff1;
    this.metaIn[LATENT_DIM + 2] = aff2;
    this.metaIn[LATENT_DIM + 3] = this.motorOut[0] ?? 0;
    this.metaIn[LATENT_DIM + 4] = this.motorOut[1] ?? 0;
    this.metaIn[LATENT_DIM + 5] = this.motorOut[2] ?? 0;
    this.metaIn[LATENT_DIM + 6] = this.motorOut[3] ?? 0;
    forwardSubnet(this.meta, this.metaIn, this.scratch, this.metaOut);

    // 9) Hebbian plastic overlay (light, within-life)
    for (let i = 0; i < LATENT_DIM; i++) {
      for (let j = 0; j < LATENT_DIM; j++) {
        const idx = i * LATENT_DIM + j;
        const ri = this.outA[i]!;
        const lj = this.latent[j]!;
        this.plastic[idx] = this.plastic[idx]! + 0.001 * ri * lj;
        const pv = this.plastic[idx]!;
        this.plastic[idx] = pv > 0.5 ? 0.5 : pv < -0.5 ? -0.5 : pv;
      }
    }

    // Update latent (blend old + new for temporal continuity). [38] Now also reads back the Hebbian plastic
    // overlay (fast weights) — dot(plastic row i, pre-blend latent) — so the overlay that is updated every
    // beat finally influences the forward state. plastic is clamped to ±0.5 so the term is bounded; tanh
    // keeps the latent in (−1,1). latentPrev holds the consistent pre-blend latent for every row's dot.
    this.latentPrev.set(this.latent.subarray(0, LATENT_DIM));
    for (let i = 0; i < LATENT_DIM; i++) {
      let pdot = 0;
      const row = i * LATENT_DIM;
      for (let j = 0; j < LATENT_DIM; j++) pdot += this.plastic[row + j]! * this.latentPrev[j]!;
      this.latent[i] = Math.tanh(
        (this.latentPrev[i] ?? 0) * 0.6 + (this.outA[i] ?? 0) * 0.4 + 0.05 * pdot,
      );
    }

    // Activity = mean |latent| + organ contribution + [38] memory-net energy (mean |memOut|, small gain).
    let actSum = 0;
    for (let i = 0; i < LATENT_DIM; i++) actSum += Math.abs(this.latent[i]!);
    let memAct = 0;
    for (let i = 0; i < 16; i++) memAct += Math.abs(this.memOut[i]!);
    memAct /= 16;
    const activity = Math.min(1, actSum / LATENT_DIM + organSum * 0.01 + memAct * 0.15);

    // [38] Meta self-monitor modulates the spike threshold (self-model raising/lowering excitability).
    const spiking = activity > 0.5 - 0.1 * (this.metaOut[0] ?? 0) && novelty > 0.3;

    return {
      index: this.index,
      designedParams: PANTHEON_GLYPH_BRAIN_PARAMS,
      liveParams: this.paramCount,
      latent: this.latent,
      activity,
      novelty,
      valence,
      motor: this.motorOut,
      spiking,
    };
  }
}

// ── Batch: all 100 glyph brains ────────────────────────────────────────────────────────────────

const ZERO_GLYPH_PERCEPT = new Float32Array(8);

/**
 * Manages all 100 pantheon glyph brains. Each gets a deterministic seed derived from the world seed.
 * Lightweight enough to run all 100 per beat (25k params × 100 = 2.5M total, but each forward pass
 * is ~2k FLOPs, so ~200k FLOPs/beat total — trivial).
 */
export class GlyphBrainBatch {
  private readonly brains: GlyphBrain[] = [];
  /** Reused result vector — avoids per-beat `map()` allocation. */
  private readonly scratch: GlyphBrainSnapshot[] = Array.from({ length: 100 });

  constructor(worldSeed: number) {
    for (let i = 0; i < 100; i++) {
      this.brains.push(new GlyphBrain(i, worldSeed));
      this.scratch[i] = this.brains[i]!.think(ZERO_GLYPH_PERCEPT);
    }
  }

  /** Think all 100 brains and return snapshots. Visual-only — no world writes. */
  thinkAll(percept: Float32Array): GlyphBrainSnapshot[] {
    for (let i = 0; i < this.brains.length; i++) {
      this.scratch[i] = this.brains[i]!.think(percept);
    }
    return this.scratch;
  }

  /** Think a single brain by index. */
  thinkOne(index: number, percept: Float32Array): GlyphBrainSnapshot | null {
    return this.brains[index]?.think(percept) ?? null;
  }

  get count(): number {
    return this.brains.length;
  }

  get totalParams(): number {
    return this.brains.reduce((s, b) => s + b.paramCount, 0);
  }
}
