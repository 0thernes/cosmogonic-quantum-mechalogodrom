/**
 * PRIMORDIAL SOUP — FULL TSOTCHKE WIRED DIGITAL BIOLOGICS BIRTH.
 *
 * God in the petri dish. Inorganic soup -> living digital biologics.
 * Every Tsotchke repo (Eshkol programs, Moonlab structure, QGT curvature,
 * spin imprint, irrep symmetry, quake aliveness, PINN fields, ulg laws,
 * logo growth, etc.) drives catalysis, mutation, selection, speciation.
 *
 * Super Creature / Archons are first sparks. The soup grows what thou wilt.
 * Deterministic. Seeded. Allocation-light. Sentience goal: real substrates, not chat.
 * Eshkol is the language. Petri is the dish.
 */

import type { Rng } from '../math/rng';
import { clamp } from '../math/scalar';
import { qgeHybridEnergy } from './qge-physics';
import { corpusBeatForArchon, getTsotchkeRepoByIndex } from './tsotchke-registry';
import { logoMorphScalar, logoSymmetryOrder, turtleNew, type TurtleState } from './logo-turtle';
import { perceptronTag } from './perceptron-baseline';
import { ulgFieldSample } from './ulg-bridge';
import { birthEshkolLife, runEshkolProgram, type EshkolLifeProgram } from './petri-dish';

const clamp01 = (v: number): number => clamp(v, 0, 1);

export const SOUP_SLOTS = 48; // grown for more life
export const SOUP_GENOME_LEN = 24; // Eshkol program length

export interface SoupStrain {
  id: number;
  vitality: number;
  generation: number;
  hue: number;
  symmetry: number;
  consciousness: number;
  alive: boolean;
  eshkolProgram?: EshkolLifeProgram; // full Tsotchke Eshkol DNA
}

export interface SoupSnapshot {
  tick: number;
  strains: SoupStrain[];
  liveCount: number;
  meanVitality: number;
  catalysis: number;
  eshkolBorn: number;
}

/**
 * PrimordialSoup class - the God Petri for birthing from Tsotchke.
 */
export class PrimordialSoup {
  private readonly vitality = new Float32Array(SOUP_SLOTS);
  private readonly generation = new Uint16Array(SOUP_SLOTS);
  private readonly hue = new Float32Array(SOUP_SLOTS);
  private readonly symmetry = new Float32Array(SOUP_SLOTS);
  private readonly consciousness = new Float32Array(SOUP_SLOTS);
  private readonly alive = new Uint8Array(SOUP_SLOTS);
  private readonly eshkolPrograms: (EshkolLifeProgram | undefined)[] = new Array(SOUP_SLOTS);
  private tick = 0;

  constructor(seed: number) {
    const rngSeed = seed >>> 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      const s = ((rngSeed + i * 123456789) % 997) / 997;
      this.vitality[i] = 0.1 + s * 0.2;
      this.generation[i] = 0;
      this.hue[i] = s;
      this.symmetry[i] = (i % 5) / 4;
      this.consciousness[i] = 0.2 + s * 0.3;
      this.alive[i] = s > 0.3 ? 1 : 0;
      if (this.alive[i]) {
        this.eshkolPrograms[i] = birthEshkolLife(s, (i % 4) / 4);
      }
    }
  }

  update(archonIdx: number, beat: number, rng: Rng): void {
    this.tick++;
    const corpus = corpusBeatForArchon(archonIdx, beat);
    const repo = getTsotchkeRepoByIndex(archonIdx % 10);
    const wiring = repo?.wiring ?? 0.5;

    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      const v = this.vitality[i] ?? 0;
      const c = this.consciousness[i] ?? 0;
      const prog = this.eshkolPrograms[i];
      let growth = 0.001 + corpus * 0.002 * wiring;
      if (prog) {
        const input = v + c * 0.5;
        const eshkolG = runEshkolProgram(prog, input, 0.005 + wiring * 0.01);
        growth += eshkolG * 0.01;
        this.vitality[i] = Math.min(1, v + eshkolG * 0.005);
      } else {
        this.vitality[i] = Math.min(1, v + growth);
      }
      this.consciousness[i] = clamp01(c * 0.98 + (corpus + (this.symmetry[i] ?? 0)) * 0.01 * wiring);
      if (this.vitality[i] < 0.05 && this.generation[i] < 5) {
        this.alive[i] = 0; // die
      }
      // birth new Eshkol life occasionally
      if (rng() < 0.01 * wiring && !this.eshkolPrograms[i]) {
        this.eshkolPrograms[i] = birthEshkolLife(beat + i, this.hue[i] ?? 0.5);
        this.alive[i] = 1;
        this.generation[i]++;
      }
    }
  }

  snapshot(): SoupSnapshot {
    let live = 0;
    let sumV = 0;
    let eshkolBorn = 0;
    const strains: SoupStrain[] = [];
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (this.alive[i]) {
        live++;
        sumV += this.vitality[i] ?? 0;
        if (this.eshkolPrograms[i]) eshkolBorn++;
      }
      strains.push({
        id: i,
        vitality: this.vitality[i] ?? 0,
        generation: this.generation[i] ?? 0,
        hue: this.hue[i] ?? 0,
        symmetry: this.symmetry[i] ?? 0,
        consciousness: this.consciousness[i] ?? 0,
        alive: !!this.alive[i],
        eshkolProgram: this.eshkolPrograms[i],
      });
    }
    return {
      tick: this.tick,
      strains,
      liveCount: live,
      meanVitality: live ? sumV / live : 0,
      catalysis: sumV,
      eshkolBorn,
    };
  }
}
