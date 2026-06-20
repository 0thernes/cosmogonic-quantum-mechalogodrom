/**
 * PRIMORDIAL SOUP — the petri dish for digital biologics.
 *
 * Super Creature / 5 Archons are the first nucleation sites — not the end state.
 * This layer incubates new life-forms from consciousness substrates + Tsotchke
 * corpus pulses. Deterministic from seed; allocation-free in steady state.
 *
 * NOT sentient. Functional birthing scaffold — "Grow What Thou Wilt" as sim law.
 * Wired by world.ts each frame after Archon beats.
 */

import type { Rng } from '../math/rng';
import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);
import type { EshkolConsciousnessSnapshot } from './eshkol-bridge';
import { qgeHybridEnergy } from './qge-physics';
import { moonlabMpoStep } from './moonlab-tensor';
import { symmetryModes } from './irrep-symmetry';
import { pathWeight } from './pimc-paths';
import { corpusBeatForArchon } from './tsotchke-registry';
import { logoMorphScalar, logoSymmetryOrder, turtleNew } from './logo-turtle';
import { perceptronTag } from './perceptron-baseline';

const INCUBATE_PATH = new Float32Array(4);
const SOUP_TAG_WEIGHTS = new Float32Array(4);

export const SOUP_SLOTS = 32;
export const SOUP_GENOME_LEN = 16;

export interface SoupStrain {
  id: number;
  vitality: number;
  generation: number;
  hue: number;
  symmetry: number;
  consciousness: number;
  alive: boolean;
}

export interface SoupSnapshot {
  tick: number;
  strains: SoupStrain[];
  liveCount: number;
  meanVitality: number;
  catalysis: number;
}

/**
 * Petri dish: Archon consciousness + QGE energy catalyzes strain growth/spawn.
 * Preallocated typed arrays; no per-frame heap growth.
 */
export class PrimordialSoup {
  private readonly vitality = new Float32Array(SOUP_SLOTS);
  private readonly generation = new Uint16Array(SOUP_SLOTS);
  private readonly hue = new Float32Array(SOUP_SLOTS);
  private readonly symmetry = new Float32Array(SOUP_SLOTS);
  private readonly consciousness = new Float32Array(SOUP_SLOTS);
  private readonly alive = new Uint8Array(SOUP_SLOTS);
  private readonly genome = new Float32Array(SOUP_SLOTS * SOUP_GENOME_LEN);

  private tick = 0;
  private nextId = 1;
  private catalysis = 0;

  constructor(
    private readonly rng: Rng,
    seedVitality = 0.15,
  ) {
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (rng() < seedVitality) {
        this.alive[i] = 1;
        this.vitality[i] = 0.2 + rng() * 0.3;
        this.generation[i] = 0;
        this.hue[i] = rng();
        this.symmetry[i] = 1 + (i % 4);
        this.consciousness[i] = 0.1;
        const g0 = i * SOUP_GENOME_LEN;
        for (let g = 0; g < SOUP_GENOME_LEN; g++) {
          this.genome[g0 + g] = rng() * 2 - 1;
        }
      }
    }
  }

  /** Catalyze from one Archon's beat (consciousness + quake + tensor flux). */
  catalyze(
    archonIdx: number,
    consc: EshkolConsciousnessSnapshot,
    quake: number,
    tensorFlux: number,
    frame = 0,
  ): void {
    const corpusBeat = corpusBeatForArchon(archonIdx, frame);
    const energy = qgeHybridEnergy(quake * corpusBeat, tensorFlux * corpusBeat, consc.unified);
    const logoM = logoMorphScalar(turtleNew(0x50ff0001 + archonIdx + frame), frame, 6 + archonIdx);
    this.catalysis = clamp01(this.catalysis * 0.9 + energy * 0.1 + logoM * 0.02);
    const slot = archonIdx % SOUP_SLOTS;
    if (!this.alive[slot]) {
      if (this.rng() < energy * 0.08) {
        this.alive[slot] = 1;
        this.vitality[slot] = energy * 0.5;
        this.generation[slot] = 0;
        this.hue[slot] = (archonIdx * 0.17 + logoM * 0.1) % 1;
        this.symmetry[slot] = logoSymmetryOrder(
          turtleNew(0x50ff0001 + archonIdx + frame),
          symmetryModes(archonIdx + 1, quake),
        );
        this.consciousness[slot] = consc.unified;
      }
      return;
    }
    const v = this.vitality[slot] ?? 0;
    this.vitality[slot] = clamp01(v + energy * 0.04 - 0.005);
    this.consciousness[slot] = clamp01(
      (this.consciousness[slot] ?? 0) * 0.85 + consc.unified * 0.15,
    );
    if ((this.vitality[slot] ?? 0) < 0.05) this.alive[slot] = 0;
  }

  /** Incubate all strains one tick (MPO mixing + mortality). */
  incubate(): void {
    this.tick++;
    const scratch = new Float32Array(4);
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      scratch[0] = this.vitality[i] ?? 0;
      scratch[1] = this.consciousness[i] ?? 0;
      scratch[2] = this.catalysis;
      scratch[3] = (this.symmetry[i] ?? 1) / 8;
      SOUP_TAG_WEIGHTS[0] = scratch[0] ?? 0;
      SOUP_TAG_WEIGHTS[1] = scratch[1] ?? 0;
      SOUP_TAG_WEIGHTS[2] = scratch[2] ?? 0;
      SOUP_TAG_WEIGHTS[3] = scratch[3] ?? 0;
      const tag = perceptronTag(SOUP_TAG_WEIGHTS, scratch, 4);
      const flux = moonlabMpoStep(scratch, 2, 4);
      INCUBATE_PATH[0] = scratch[0] ?? 0;
      INCUBATE_PATH[1] = scratch[1] ?? 0;
      INCUBATE_PATH[2] = scratch[2] ?? 0;
      INCUBATE_PATH[3] = scratch[3] ?? 0;
      const pimc = pathWeight(
        INCUBATE_PATH,
        2 + (this.symmetry[i] ?? 1) * 0.05,
        (x) => x * x * 0.5,
      );
      this.vitality[i] = clamp01(
        (this.vitality[i] ?? 0) * 0.98 + flux * 0.02 + pimc * 0.012 + tag * 0.008,
      );
      if (this.rng() < 0.002 && (this.vitality[i] ?? 0) > 0.6) this.replicate(i);
      if ((this.vitality[i] ?? 0) < 0.03) this.alive[i] = 0;
    }
  }

  private replicate(parent: number): void {
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (this.alive[i]) continue;
      this.alive[i] = 1;
      this.vitality[i] = (this.vitality[parent] ?? 0) * 0.45;
      this.generation[i] = (this.generation[parent] ?? 0) + 1;
      this.hue[i] = clamp01((this.hue[parent] ?? 0) + (this.rng() - 0.5) * 0.1);
      this.symmetry[i] = (this.symmetry[parent] ?? 1) + (this.rng() < 0.3 ? 1 : 0);
      this.consciousness[i] = (this.consciousness[parent] ?? 0) * 0.9;
      const pg = parent * SOUP_GENOME_LEN;
      const cg = i * SOUP_GENOME_LEN;
      for (let g = 0; g < SOUP_GENOME_LEN; g++) {
        const p = this.genome[pg + g] ?? 0;
        this.genome[cg + g] = p + (this.rng() - 0.5) * 0.08;
      }
      this.nextId++;
      return;
    }
  }

  /** Strain ready to emerge into the entity field (vitality gate). */
  harvestEmergent(): SoupStrain | null {
    let best = -1;
    let bestV = 0.85;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      const v = this.vitality[i] ?? 0;
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    }
    if (best < 0) return null;
    const strain: SoupStrain = {
      id: this.nextId++,
      vitality: this.vitality[best] ?? 0,
      generation: this.generation[best] ?? 0,
      hue: this.hue[best] ?? 0,
      symmetry: this.symmetry[best] ?? 1,
      consciousness: this.consciousness[best] ?? 0,
      alive: true,
    };
    this.vitality[best] = 0.35;
    return strain;
  }

  snapshot(): SoupSnapshot {
    const strains: SoupStrain[] = [];
    let live = 0;
    let sum = 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      live++;
      const v = this.vitality[i] ?? 0;
      sum += v;
      strains.push({
        id: i,
        vitality: v,
        generation: this.generation[i] ?? 0,
        hue: this.hue[i] ?? 0,
        symmetry: this.symmetry[i] ?? 1,
        consciousness: this.consciousness[i] ?? 0,
        alive: true,
      });
    }
    return {
      tick: this.tick,
      strains,
      liveCount: live,
      meanVitality: live > 0 ? sum / live : 0,
      catalysis: this.catalysis,
    };
  }
}
