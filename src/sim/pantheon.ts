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
import { GODFORMS, getArchonTier, APEX_INDIVIDUATED, type ArchonTier } from './godform';

export { ARCHON_CHANNELS, FIELD_DIM };
export { MindField };

export interface LightArchonSnapshot {
  readonly index: number;
  readonly name: string;
  readonly tier: ArchonTier;
  readonly decision: number;
  readonly confidence: number;
  /** V1.3: the Archon's PERSISTENT identity memory (EMA of its planBias across its own sub-beats). */
  readonly memory: number;
}

export interface PantheonSnapshot {
  readonly lightCount: number;
  readonly field: ReturnType<MindField['snapshot']>;
  readonly lastLight: LightArchonSnapshot | null;
}

const LIGHT_FIRST = APEX_INDIVIDUATED; // light echoes begin after the individuated apex minds
const LIGHT_COUNT = ARCHON_CHANNELS - LIGHT_FIRST;
/** V1.3: EMA rate of each light Archon's persistent identity memory (individuation, not stateless echo). */
const LIGHT_MEM_TAU = 0.2;

/**
 * Society layer for the 20 light Archons + shared mind-field.
 */
export class PantheonSociety {
  readonly field = new MindField();
  private readonly scratch = new Float32Array(FIELD_DIM);
  /** V1.3: one persistent identity scalar per light Archon — each evolves across its OWN sub-beats, so the
   *  20 light echoes have continuity (distinct individuated minds) rather than stateless per-beat recomputes. */
  private readonly lightMemory = new Float32Array(LIGHT_COUNT);
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
    // V1.3 INDIVIDUATION: the active light Archon updates its PERSISTENT identity memory (EMA of its
    // planBias) and that memory shapes its ongoing field contribution — so its history, not just this
    // beat, drives its deposit. Deterministic (no rng), bounded; reproducibility + field.energy>0 hold.
    const mem =
      (this.lightMemory[slot] ?? 0) +
      LIGHT_MEM_TAU * (thought.planBias - (this.lightMemory[slot] ?? 0));
    this.lightMemory[slot] = mem;
    this.field.deposit(
      idx,
      Array.from(this.scratch),
      0.35 + 0.65 * (0.5 * thought.planBias + 0.5 * mem),
    );
    this.lastLight = {
      index: idx,
      name: GODFORMS[idx] ?? `ARCHON-${idx}`,
      tier: getArchonTier(idx),
      decision: thought.planBias,
      confidence: thought.decisive ? thought.planBias : 1 - thought.planBias,
      memory: mem,
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
