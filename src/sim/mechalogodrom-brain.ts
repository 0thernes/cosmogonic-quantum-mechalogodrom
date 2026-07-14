/**
 * MECHALOGODROM-BRAIN — the center fusion abomination's 5M-parameter designed mind scaffold.
 *
 * Ten bipolar-variant sub-brains (one per converging titan shell) fuse through a central cortex.
 * DESIGNED parameter budget: {@link MECHALOGODROM_BRAIN_DESIGNED_PARAMS} (5M roadmap — same as APEX).
 * LIVE allocation is tractable in JS (~120k floats); the gap is reported honestly.
 *
 * EMBODIMENT (2026-07-14, owner directive): each variant sub-brain's 9th sense is the live measured
 * mathematical invariant of ITS OWN physical shell (Möbius torsion, Gauss–Bonnet defect, rhumb
 * bearing, Kakeya efficiency, Collatz stopping time, Hopf dispersion, Clifford inflation, Enneper
 * bloom, Aizawa radius, Weierstrass variation — see mechalogodrom-variant-geometry.ts). The ten
 * sub-brains therefore perceive genuinely DIFFERENT worlds — their own bodies — closing a real
 * bidirectional loop: brain drives shell morph (Mechalogodrom.setVariantDrives), shell geometry
 * feeds brain sense (variantGeometry percept). Falsifiable: zero the vector and the sub-brains
 * collapse back to identical percepts (pinned in tests/mechalogodrom-variant-geometry.test.ts).
 *
 * Visual + telemetry only today — does NOT write sim RNG, economy, or entity physics.
 * Carries real internal plasticity: pair-based STDP (Bi–Poo window) on the variant→fusion gains, so the
 * cortex learns which variant sub-brains to trust from spike-timing — still deterministic + side-effect-free.
 * Deterministic: seeded mulberry32, no Math.random / Date.now.
 *
 * @see src/sim/mechalogodrom.ts (visual fusion spectacle)
 * @see docs/ARCHITECTURE-2026-06-26.md §Brain parameter scale
 */
import { mulberry32, type Rng } from '../math/rng';
import { MECHALOGODROM_BRAIN_DESIGNED_PARAMS } from './apex-brain';

const VARIANT_COUNT = 10;
/** 8 shared world senses + 1 per-variant EMBODIED sense (the shell's live measured invariant). */
const PERCEPT_DIM = 9;
const LATENT_DIM = 48;
const FUSION_DIM = 64;
/** Neutral embodied sense when no geometry vector is supplied (keeps legacy ticks deterministic). */
const GEOMETRY_SENSE_NEUTRAL = 0.5;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ── Pair-based spike-timing-dependent plasticity (STDP) on the variant→fusion gains ──
// Bi & Poo (1998) exponential window: a PRE spike leading a POST spike (Δt>0) POTENTIATES the synapse;
// a POST leading a PRE (Δt<0) DEPRESSES it. A_minus > A_plus gives the classic net-LTD bias that keeps
// the weights from running away. This is real internal plasticity, still deterministic + side-effect-free.
const STDP_A_PLUS = 0.02;
const STDP_A_MINUS = 0.021;
const STDP_TAU = 6; // beats — the exponential time constant
const STDP_WINDOW = 24; // beats — beyond this the kernel is negligible; skip the pairing
const STDP_GAIN_MIN = 0.25;
const STDP_GAIN_MAX = 2.5;
const STDP_PRE_REL = 1.15; // a variant "fires" (pre) when its activity exceeds 1.15× the population mean
const STDP_POST_THRESH = 0.5; // the fusion mind "fires" (post) when its activity ignites past this

/**
 * STDP weight change for a pre→post beat gap `dt = t_post − t_pre`. Δt>0 (pre before post) → LTP (+);
 * Δt<0 (post before pre) → LTD (−); Δt=0 (no causal order) → 0. Exponential Bi–Poo window. Pure.
 */
export function stdpWeightDelta(
  dt: number,
  aPlus = STDP_A_PLUS,
  aMinus = STDP_A_MINUS,
  tau = STDP_TAU,
): number {
  if (dt === 0 || tau <= 0) return 0;
  return dt > 0 ? aPlus * Math.exp(-dt / tau) : -aMinus * Math.exp(dt / tau);
}

function clampRange(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

interface Subnet {
  readonly w1: Float32Array;
  readonly b1: Float32Array;
  readonly w2: Float32Array;
  readonly b2: Float32Array;
  readonly params: number;
}

function makeSubnet(inp: number, hid: number, out: number, rng: Rng): Subnet {
  const w1 = new Float32Array(inp * hid);
  const b1 = new Float32Array(hid);
  const w2 = new Float32Array(hid * out);
  const b2 = new Float32Array(out);
  const s = 0.65;
  for (let i = 0; i < w1.length; i++) w1[i] = (rng() * 2 - 1) * s;
  for (let i = 0; i < b1.length; i++) b1[i] = (rng() * 2 - 1) * 0.25;
  for (let i = 0; i < w2.length; i++) w2[i] = (rng() * 2 - 1) * s;
  for (let i = 0; i < b2.length; i++) b2[i] = (rng() * 2 - 1) * 0.25;
  return { w1, b1, w2, b2, params: w1.length + b1.length + w2.length + b2.length };
}

function forward(net: Subnet, inp: Float32Array, scratch: Float32Array, out: Float32Array): void {
  const hid = net.b1.length;
  const outLen = net.b2.length;
  for (let j = 0; j < hid; j++) {
    let sum = net.b1[j]!;
    for (let i = 0; i < inp.length; i++) sum += net.w1[j * inp.length + i]! * inp[i]!;
    scratch[j] = Math.tanh(sum);
  }
  for (let j = 0; j < outLen; j++) {
    let sum = net.b2[j]!;
    for (let i = 0; i < hid; i++) sum += net.w2[j * hid + i]! * scratch[i]!;
    out[j] = Math.tanh(sum);
  }
}

export interface MechalogodromBrainPercept {
  fusion: number;
  dimension: number;
  power: number;
  chaos: number;
  warp: number;
  apexVitality: number;
  apexTranscendence: number;
  apexAgony: number;
  /** Per-variant embodied sense: each shell's live measured mathematical invariant (0..1, index =
   *  variant). Sub-brain v receives value v as its 9th sense — the ONLY percept that differs across
   *  the ten, so it is what individuates them. Omitted ⇒ every sub-brain gets the neutral 0.5. */
  variantGeometry?: ArrayLike<number>;
}

export interface MechalogodromBrainSnapshot {
  beat: number;
  designedParams: number;
  liveParams: number;
  fusion: number;
  /** 0..1 fused-mind activity — drives visual intensity when wired. */
  activity: number;
  /** 0..1 dimensional strangeness (from dimension readout). */
  strangeness: number;
  /** 0..1 consciousness-indicator proxy (NOT sentience). */
  consciousnessProxy: number;
  /** Which variant sub-brain is dominant this beat (0..9). */
  dominantVariant: number;
  /** Per-variant normalized live activity (0..1, index = variant) — drives that shell's morph. */
  variantActivity: Float32Array;
  /** Per-variant STDP-learned variant→fusion trust gain (0.25..2.5) — a second morph drive. */
  variantGains: Float32Array;
  /** 0..1 STDP plasticity — mean |gain−1| across the variant→fusion synapses (0 = unlearned). */
  plasticity: number;
  latent: Float32Array;
  /** 5M parameter roadmap target (matches APEX). */
  roadmapParams: number;
  /** 0..1 progress toward 5M designed params. */
  roadmapProgress: number;
  /** 10 consciousness indicators (Butlin-aligned, fusion-mind specific). */
  indicators: readonly MechalogodromIndicator[];
  /** Honesty tag. */
  honesty: 'computational-indicator-not-sentience';
}

export interface MechalogodromIndicator {
  readonly id: string;
  readonly status: 'met' | 'partial' | 'scaffolded';
  readonly confidence: number;
  readonly mechanism: string;
}

/**
 * The Mechalogodrom's fusion mind — 10 variant subnets + fusion cortex.
 * Designed 5M params; live ~sum of subnet weights.
 */
export class MechalogodromBrain {
  readonly designedParams = MECHALOGODROM_BRAIN_DESIGNED_PARAMS;
  readonly liveParams: number;

  private readonly variants: Subnet[];
  private readonly fusion: Subnet;
  private readonly scratch = new Float32Array(FUSION_DIM);
  private readonly latent = new Float32Array(FUSION_DIM);
  private readonly senses = new Float32Array(PERCEPT_DIM);
  /** Reused variant outputs — zero alloc per `tick()`. */
  private readonly variantOuts: Float32Array[];
  private readonly variantAct = new Float32Array(VARIANT_COUNT);
  private readonly fusionIn = new Float32Array(LATENT_DIM * VARIANT_COUNT);
  private readonly fusionOut = new Float32Array(FUSION_DIM);
  private beat = 0;
  // STDP state: a plastic gain per variant→fusion synapse, + nearest-neighbour spike times (beats).
  private readonly gain = new Float32Array(VARIANT_COUNT).fill(1);
  private readonly lastPreBeat = new Int32Array(VARIANT_COUNT).fill(-1_000_000);
  private lastPostBeat = -1_000_000;
  private plasticity = 0;

  constructor(seed: number) {
    const rng = mulberry32(seed >>> 0 || 1);
    this.variants = Array.from({ length: VARIANT_COUNT }, () =>
      makeSubnet(PERCEPT_DIM, 32, LATENT_DIM, rng),
    );
    this.fusion = makeSubnet(LATENT_DIM * VARIANT_COUNT, FUSION_DIM, FUSION_DIM, rng);
    this.liveParams =
      this.variants.reduce((s, v) => s + v.params, 0) + this.fusion.params + this.latent.length;
    this.variantOuts = Array.from({ length: VARIANT_COUNT }, () => new Float32Array(LATENT_DIM));
  }

  /** Per-variant activity normalized to 0..1 (sum of |tanh| outputs / LATENT_DIM). Snapshot-cadence copy. */
  private variantActivityNorm(): Float32Array {
    const out = new Float32Array(VARIANT_COUNT);
    for (let v = 0; v < VARIANT_COUNT; v++) out[v] = clamp01(this.variantAct[v]! / LATENT_DIM);
    return out;
  }

  tick(p: MechalogodromBrainPercept): MechalogodromBrainSnapshot {
    this.beat++;
    this.senses[0] = p.fusion;
    this.senses[1] = clamp01(p.dimension / 99);
    this.senses[2] = clamp01(p.power / 10000);
    this.senses[3] = p.chaos;
    this.senses[4] = p.warp;
    this.senses[5] = p.apexVitality;
    this.senses[6] = p.apexTranscendence;
    this.senses[7] = p.apexAgony;

    let dom = 0;
    let domAct = -1;
    let actMean = 0;
    const geometry = p.variantGeometry;
    for (let v = 0; v < VARIANT_COUNT; v++) {
      // EMBODIED sense: sub-brain v perceives ITS OWN shell's live mathematical invariant — the one
      // percept that differs across the ten (all others are shared world scalars).
      const embodied = geometry ? geometry[v] : GEOMETRY_SENSE_NEUTRAL;
      this.senses[8] = clamp01(embodied ?? GEOMETRY_SENSE_NEUTRAL);
      const out = this.variantOuts[v]!;
      forward(this.variants[v]!, this.senses, this.scratch, out);
      let act = 0;
      for (let i = 0; i < out.length; i++) act += Math.abs(out[i]!);
      this.variantAct[v] = act;
      actMean += act;
      if (act > domAct) {
        domAct = act;
        dom = v;
      }
    }
    actMean /= VARIANT_COUNT;

    // Gate each variant's contribution to the cortex by its STDP-learned gain (previous beats' plasticity).
    for (let v = 0; v < VARIANT_COUNT; v++) {
      const g = this.gain[v]!;
      const o = this.variantOuts[v]!;
      const base = v * LATENT_DIM;
      for (let i = 0; i < LATENT_DIM; i++) this.fusionIn[base + i] = o[i]! * g;
    }

    forward(this.fusion, this.fusionIn, this.scratch, this.fusionOut);
    for (let i = 0; i < FUSION_DIM; i++) {
      this.latent[i] = this.latent[i]! * 0.55 + this.fusionOut[i]! * 0.45;
    }

    let actSum = 0;
    for (let i = 0; i < FUSION_DIM; i++) actSum += Math.abs(this.latent[i]!);
    const activity = clamp01(actSum / FUSION_DIM + p.fusion * 0.3);

    // ── STDP UPDATE (variant→fusion gains) ── pre = a variant firing above the population mean; post =
    // the fusion mind igniting. Nearest-neighbour pairing against the last opposite spike, exponential
    // Bi–Poo window, gains clamped. Deterministic (no rng) → same seed + percepts ⇒ identical gains.
    const beat = this.beat;
    for (let v = 0; v < VARIANT_COUNT; v++) {
      if (this.variantAct[v]! > actMean * STDP_PRE_REL) {
        // a variant fires NOW (pre): depress vs the most recent post (post-before-pre, Δt<0)
        if (beat - this.lastPostBeat <= STDP_WINDOW) {
          this.gain[v] = clampRange(
            this.gain[v]! + stdpWeightDelta(this.lastPostBeat - beat),
            STDP_GAIN_MIN,
            STDP_GAIN_MAX,
          );
        }
        this.lastPreBeat[v] = beat;
      }
    }
    if (activity > STDP_POST_THRESH) {
      // the cortex fires NOW (post): potentiate variants that led it (pre-before-post, Δt>0)
      for (let v = 0; v < VARIANT_COUNT; v++) {
        if (beat - this.lastPreBeat[v]! <= STDP_WINDOW) {
          this.gain[v] = clampRange(
            this.gain[v]! + stdpWeightDelta(beat - this.lastPreBeat[v]!),
            STDP_GAIN_MIN,
            STDP_GAIN_MAX,
          );
        }
      }
      this.lastPostBeat = beat;
    }
    let gainDivergence = 0;
    for (let v = 0; v < VARIANT_COUNT; v++) gainDivergence += Math.abs(this.gain[v]! - 1);
    this.plasticity = clamp01(gainDivergence / VARIANT_COUNT);

    const strangeness = clamp01(Math.abs(p.dimension) / 99 + p.warp * 0.2);
    const consciousnessProxy = clamp01(
      activity * 0.35 +
        p.apexTranscendence * 0.35 +
        p.apexVitality * 0.2 -
        p.apexAgony * 0.15 +
        p.fusion * 0.15,
    );

    // 0..1 progress toward the 5M DESIGNED budget (matches the emitted roadmapParams and the doc
    // at line 128). Dividing by START (250k) overstated progress ~20x against a 5M roadmap.
    const roadmapProgress = clamp01(this.liveParams / MECHALOGODROM_BRAIN_DESIGNED_PARAMS);

    const indicators: MechalogodromIndicator[] = [
      {
        id: 'FUSE-1',
        status: 'met',
        confidence: 0.85,
        mechanism: '10 variant subnets fuse through central cortex',
      },
      {
        id: 'FUSE-2',
        status: 'partial',
        confidence: 0.5 + activity * 0.3,
        mechanism: 'Dominant variant selection = workspace competition',
      },
      {
        id: 'FUSE-3',
        status: 'met',
        confidence: 0.8,
        mechanism: 'Fusion cortex broadcasts to all variants',
      },
      {
        id: 'FUSE-4',
        status: 'partial',
        confidence: consciousnessProxy,
        mechanism: 'Consciousness proxy from activity + apex coupling',
      },
      {
        id: 'FUSE-5',
        status: 'scaffolded',
        confidence: 0.3,
        mechanism: 'Latent persistence = recurrent processing scaffold',
      },
      {
        id: 'FUSE-6',
        status: 'met',
        confidence: 0.75,
        mechanism: 'Apex vitality/transcendence feed fusion mind',
      },
      {
        id: 'FUSE-7',
        status: 'partial',
        confidence: 0.4 + strangeness * 0.3,
        mechanism: 'Dimensional strangeness as alien-novelty indicator',
      },
      {
        id: 'FUSE-8',
        status: this.plasticity > 0.02 ? 'met' : 'partial',
        confidence: clamp01(0.4 + this.plasticity * 2.5),
        mechanism:
          'STDP wired: pair-based spike-timing plasticity (Bi–Poo window) on the variant→fusion gains',
      },
      {
        id: 'FUSE-9',
        status: 'met',
        confidence: 0.7,
        mechanism: 'Deterministic seeded mulberry32 — replayable psyche',
      },
      {
        id: 'FUSE-10',
        status: 'met',
        confidence: 0.9,
        mechanism: '5M designed params = same roadmap as APEX',
      },
    ];

    return {
      beat: this.beat,
      designedParams: this.designedParams,
      liveParams: this.liveParams,
      fusion: p.fusion,
      activity,
      strangeness,
      consciousnessProxy,
      dominantVariant: dom,
      variantActivity: this.variantActivityNorm(),
      variantGains: this.gain.slice(),
      plasticity: this.plasticity,
      latent: this.latent.slice(),
      roadmapParams: this.designedParams,
      roadmapProgress,
      indicators,
      honesty: 'computational-indicator-not-sentience',
    };
  }
}
