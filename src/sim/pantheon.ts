/**
 * PANTHEON SOCIETY — tiered 25-Archon coordination (NEO-MIND § Archon pantheon).
 *
 *   • 1 × NEO (index 0) — apex cadence (handled by full SuperMind in world)
 *   • 4 × OMEGA (indices 1–4) — mid-tier (full SuperMind at world boot)
 *   • 20 × ALPHA (indices 5–24) — light echoes on staggered sub-beats
 *
 * Light echoes execute {@link archonThink} from the Eshkol substrate and deposit into the shared
 * {@link MindField}. Deterministic; no rng in the beat loop.
 */
import { substrateVectorForArchon } from './tsotchke-registry';
import { archonThink } from './eshkol-cognition';
import { MindField, ARCHON_CHANNELS, FIELD_DIM } from './mind-field';
import { GODFORMS, getArchonTier, type ArchonTier } from './godform';

export { ARCHON_CHANNELS, FIELD_DIM };
export { MindField };

export interface LightArchonSnapshot {
  readonly index: number;
  readonly name: string;
  readonly tier: ArchonTier;
  readonly decision: number;
  readonly confidence: number;
}

export interface PantheonSnapshot {
  readonly lightCount: number;
  readonly field: ReturnType<MindField['snapshot']>;
  readonly lastLight: LightArchonSnapshot | null;
}

const LIGHT_FIRST = 5;
const LIGHT_COUNT = ARCHON_CHANNELS - LIGHT_FIRST;

/**
 * Society layer for the 20 light Archons + shared mind-field.
 */
export class PantheonSociety {
  readonly field = new MindField();
  private readonly scratch = new Float32Array(FIELD_DIM);
  private lastLight: LightArchonSnapshot | null = null;

  /** One world frame: diffuse field + tick one light Archon (staggered). */
  beat(frame: number): PantheonSnapshot {
    this.field.step();
    const slot = frame % LIGHT_COUNT;
    const idx = LIGHT_FIRST + slot;
    const sub = substrateVectorForArchon(idx);
    const thought = archonThink(sub, frame + idx * 17);
    this.scratch[0] = thought.planBias;
    this.scratch[1] = thought.decisive ? 1 : 0;
    this.scratch[2] = sub[0] ?? 0;
    this.scratch[3] = sub[1] ?? 0;
    this.scratch[4] = (frame % 360) / 360;
    this.scratch[5] = idx / ARCHON_CHANNELS;
    this.scratch[6] = thought.steps / 32;
    this.scratch[7] = thought.planBias;
    this.field.deposit(idx, Array.from(this.scratch), 0.35 + 0.65 * thought.planBias);
    this.lastLight = {
      index: idx,
      name: GODFORMS[idx] ?? `ARCHON-${idx}`,
      tier: getArchonTier(idx),
      decision: thought.planBias,
      confidence: thought.decisive ? thought.planBias : 1 - thought.planBias,
    };
    return this.snapshot();
  }

  depositApex(apexIdx: number, vector: readonly number[], strength: number): void {
    this.field.deposit(apexIdx, vector, strength);
  }

  /** Read collective field bias for an apex Archon into `out`. */
  collectiveBias(apexIdx: number, out: Float32Array | number[]): void {
    this.field.mean(out);
    this.field.sample(apexIdx, this.scratch);
    for (let d = 0; d < FIELD_DIM; d++) {
      out[d] = ((out[d] ?? 0) + (this.scratch[d] ?? 0)) * 0.5;
    }
  }

  snapshot(): PantheonSnapshot {
    return {
      lightCount: LIGHT_COUNT,
      field: this.field.snapshot(),
      lastLight: this.lastLight,
    };
  }
}
