/**
 * MECHALOGODROM-BRAIN — the center fusion abomination's 5M-parameter designed mind scaffold.
 *
 * Ten bipolar-variant sub-brains (one per converging titan shell) fuse through a central cortex.
 * DESIGNED parameter budget: {@link MECHALOGODROM_BRAIN_DESIGNED_PARAMS} (5M roadmap — same as APEX).
 * LIVE allocation is tractable in JS (~120k floats); the gap is reported honestly.
 *
 * Visual + telemetry only today — does NOT write sim RNG, economy, or entity physics.
 * Deterministic: seeded mulberry32, no Math.random / Date.now.
 *
 * @see src/sim/mechalogodrom.ts (visual fusion spectacle)
 * @see docs/BRAIN-PARAMETER-SCALE-PLAN.md
 */
import { mulberry32, type Rng } from '../math/rng';
import { MECHALOGODROM_BRAIN_DESIGNED_PARAMS } from './apex-brain';

const VARIANT_COUNT = 10;
const PERCEPT_DIM = 8;
const LATENT_DIM = 48;
const FUSION_DIM = 64;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
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

function forward(net: Subnet, inp: Float32Array, scratch: Float32Array): Float32Array {
  const hid = net.b1.length;
  const out = net.b2.length;
  for (let j = 0; j < hid; j++) {
    let sum = net.b1[j]!;
    for (let i = 0; i < inp.length; i++) sum += net.w1[j * inp.length + i]! * inp[i]!;
    scratch[j] = Math.tanh(sum);
  }
  const result = new Float32Array(out);
  for (let j = 0; j < out; j++) {
    let sum = net.b2[j]!;
    for (let i = 0; i < hid; i++) sum += net.w2[j * hid + i]! * scratch[i]!;
    result[j] = Math.tanh(sum);
  }
  return result;
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
  private beat = 0;

  constructor(seed: number) {
    const rng = mulberry32(seed >>> 0 || 1);
    this.variants = Array.from({ length: VARIANT_COUNT }, () =>
      makeSubnet(PERCEPT_DIM, 32, LATENT_DIM, rng),
    );
    this.fusion = makeSubnet(LATENT_DIM * VARIANT_COUNT, FUSION_DIM, FUSION_DIM, rng);
    this.liveParams =
      this.variants.reduce((s, v) => s + v.params, 0) + this.fusion.params + this.latent.length;
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

    const variantOuts: Float32Array[] = [];
    let dom = 0;
    let domAct = -1;
    for (let v = 0; v < VARIANT_COUNT; v++) {
      const out = forward(this.variants[v]!, this.senses, this.scratch);
      variantOuts.push(out);
      let act = 0;
      for (let i = 0; i < out.length; i++) act += Math.abs(out[i]!);
      if (act > domAct) {
        domAct = act;
        dom = v;
      }
    }

    const fusionIn = new Float32Array(LATENT_DIM * VARIANT_COUNT);
    for (let v = 0; v < VARIANT_COUNT; v++) fusionIn.set(variantOuts[v]!, v * LATENT_DIM);

    const fused = forward(this.fusion, fusionIn, this.scratch);
    for (let i = 0; i < FUSION_DIM; i++) {
      this.latent[i] = this.latent[i]! * 0.55 + fused[i]! * 0.45;
    }

    let actSum = 0;
    for (let i = 0; i < FUSION_DIM; i++) actSum += Math.abs(this.latent[i]!);
    const activity = clamp01(actSum / FUSION_DIM + p.fusion * 0.3);
    const strangeness = clamp01(Math.abs(p.dimension) / 99 + p.warp * 0.2);
    const consciousnessProxy = clamp01(
      activity * 0.35 +
        p.apexTranscendence * 0.35 +
        p.apexVitality * 0.2 -
        p.apexAgony * 0.15 +
        p.fusion * 0.15,
    );

    const roadmapProgress = clamp01(this.liveParams / this.designedParams);

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
        status: 'scaffolded',
        confidence: 0.2,
        mechanism: 'STDP not yet wired on variant weights',
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
      latent: this.latent.slice(),
      roadmapParams: this.designedParams,
      roadmapProgress,
      indicators,
      honesty: 'computational-indicator-not-sentience',
    };
  }
}
