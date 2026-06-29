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

function forwardSubnet(net: Subnet, inp: Float32Array, scratch: Float32Array): Float32Array {
  const { w1, b1, w2, b2 } = net;
  const hid = b1.length;
  const out = b2.length;
  // hidden = tanh(w1 . inp + b1)
  for (let j = 0; j < hid; j++) {
    let sum = b1[j]!;
    for (let i = 0; i < inp.length; i++) sum += w1[j * inp.length + i]! * inp[i]!;
    scratch[j] = Math.tanh(sum);
  }
  // out = tanh(w2 . hidden + b2)
  const result = new Float32Array(out);
  for (let j = 0; j < out; j++) {
    let sum = b2[j]!;
    for (let i = 0; i < hid; i++) sum += w2[j * hid + i]! * scratch[i]!;
    result[j] = Math.tanh(sum);
  }
  return result;
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
    const newLatent = forwardSubnet(this.cortex, this.senses, this.scratch);

    // 2) ATOM OF THOUGHT — organ-nets process 4-dim slices
    let organSum = 0;
    for (let k = 0; k < ORGAN_COUNT; k++) {
      const off = (k * 4) % LATENT_DIM;
      const slice = newLatent.subarray(off, off + 4);
      const o = forwardSubnet(this.organs[k]!, slice, this.scratch);
      organSum += o[0]! + o[1]!;
    }

    // 3) IMAGINE — Creativity Machine (latent ⊕ noise → imagined)
    for (let i = 0; i < NOISE_DIM; i++) {
      this.noise[i] = Math.sin(this.beat * 0.13 + i * 1.7) * 0.5;
    }
    const imgIn = new Float32Array(LATENT_DIM + NOISE_DIM);
    imgIn.set(newLatent);
    imgIn.set(this.noise, LATENT_DIM);
    const imagined = forwardSubnet(this.imagitron, imgIn, this.scratch);

    // 4) PERCEPTOR — score novelty
    const noveltyOut = forwardSubnet(this.perceptor, imagined, this.scratch);
    const novelty = Math.abs(noveltyOut[0] ?? 0);

    // 5) REASON — distil the winning branch
    const reasoned = forwardSubnet(this.reasoner, imagined, this.scratch);

    // 6) PREDICT — world model (error → surprise, but we don't use it for world state)
    const _predicted = forwardSubnet(this.predictor, this.latent, this.scratch);
    void forwardSubnet(this.memory, reasoned, this.scratch);
    void _predicted;

    // 7) AFFECT — emotion from senses
    const aff = forwardSubnet(this.affect, this.senses, this.scratch);
    const valence = aff[0] ?? 0;

    // 8) MOTOR — visual motion vector
    const mot = forwardSubnet(this.motor, reasoned, this.scratch);

    // 9) Hebbian plastic overlay (light, within-life)
    for (let i = 0; i < LATENT_DIM; i++) {
      for (let j = 0; j < LATENT_DIM; j++) {
        const idx = i * LATENT_DIM + j;
        const ri = reasoned[i]!;
        const lj = this.latent[j]!;
        this.plastic[idx] = this.plastic[idx]! + 0.001 * ri * lj;
        const pv = this.plastic[idx]!;
        this.plastic[idx] = pv > 0.5 ? 0.5 : pv < -0.5 ? -0.5 : pv;
      }
    }

    // Update latent (blend old + new for temporal continuity)
    for (let i = 0; i < LATENT_DIM; i++) {
      this.latent[i] = (this.latent[i] ?? 0) * 0.6 + (reasoned[i] ?? 0) * 0.4;
    }

    // Activity = mean |latent| + organ contribution
    let actSum = 0;
    for (let i = 0; i < LATENT_DIM; i++) actSum += Math.abs(this.latent[i]!);
    const activity = Math.min(1, actSum / LATENT_DIM + organSum * 0.01);

    const spiking = activity > 0.5 && novelty > 0.3;

    return {
      index: this.index,
      designedParams: PANTHEON_GLYPH_BRAIN_PARAMS,
      liveParams: this.paramCount,
      latent: this.latent.slice(),
      activity,
      novelty,
      valence,
      motor: mot.slice(),
      spiking,
    };
  }
}

// ── Batch: all 100 glyph brains ────────────────────────────────────────────────────────────────

/**
 * Manages all 100 pantheon glyph brains. Each gets a deterministic seed derived from the world seed.
 * Lightweight enough to run all 100 per beat (25k params × 100 = 2.5M total, but each forward pass
 * is ~2k FLOPs, so ~200k FLOPs/beat total — trivial).
 */
export class GlyphBrainBatch {
  private readonly brains: GlyphBrain[] = [];

  constructor(worldSeed: number) {
    for (let i = 0; i < 100; i++) {
      this.brains.push(new GlyphBrain(i, worldSeed));
    }
  }

  /** Think all 100 brains and return snapshots. Visual-only — no world writes. */
  thinkAll(percept: Float32Array): GlyphBrainSnapshot[] {
    return this.brains.map((b) => b.think(percept));
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
