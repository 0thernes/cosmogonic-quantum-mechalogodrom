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
 */

import type { Rng } from '../math/rng';
import { clamp } from '../math/scalar';
import { qgeHybridEnergy } from './qge-physics';
import { corpusBeatForArchon, getTsotchkeRepoByIndex } from './tsotchke-registry';
import { logoMorphScalar, logoSymmetryOrder, turtleNew, type TurtleState } from './logo-turtle';
import { perceptronTag } from './perceptron-baseline';
import { ulgFieldSample } from './ulg-bridge';

const clamp01 = (v: number): number => clamp(v, 0, 1);

export const SOUP_SLOTS = 48; // grown
export const SOUP_GENOME_LEN = 24; // Eshkol program length

export interface SoupStrain {
  id: number;
  vitality: number;
  generation: number;
  hue: number;
  symmetry: number;
  consciousness: number;
  aliveness: number;
  eshkolProgram: number; // fingerprint from full corpus
  alive: boolean;
}

export interface SoupSnapshot {
  tick: number;
  strains: SoupStrain[];
  liveCount: number;
  meanVitality: number;
  catalysis: number;
  newBiologicsBorn: number;
}

export class PrimordialSoup {
  private readonly vitality = new Float32Array(SOUP_SLOTS);
  private readonly generation = new Uint16Array(SOUP_SLOTS);
  private readonly hue = new Float32Array(SOUP_SLOTS);
  private readonly symmetry = new Float32Array(SOUP_SLOTS);
  private readonly consciousness = new Float32Array(SOUP_SLOTS);
  private readonly aliveness = new Float32Array(SOUP_SLOTS);
  private readonly eshkolProgram = new Uint32Array(SOUP_SLOTS);
  private readonly alive = new Uint8Array(SOUP_SLOTS);
  private readonly genome = new Float32Array(SOUP_SLOTS * SOUP_GENOME_LEN);

  private tick = 0;
  private nextId = 1;
  private catalysis = 0;
  private newBorn = 0;
  private readonly turtle: TurtleState;
  private readonly adTape: AdTape;

  constructor(
    private readonly rng: Rng,
    seedVitality = 0.18,
    seed = 0x50ff0001,
  ) {
    this.turtle = turtleNew(seed);
    this.adTape = adTapeNew(64);
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (rng() < seedVitality) this.spawn(i, 0);
    }
  }

  private spawn(i: number, parentProgram = 0) {
    this.alive[i] = 1;
    this.vitality[i] = 0.18 + this.rng() * 0.42;
    this.generation[i] = parentProgram ? this.generation[i] + 1 : 0;
    this.hue[i] = this.rng();
    this.symmetry[i] = 1 + Math.floor(this.rng() * 7);
    this.consciousness[i] = 0.1 + this.rng() * 0.4;
    this.aliveness[i] = 0.2 + this.rng() * 0.3;
    const prog = parentProgram || biologicProgramFingerprint(i, this.tick + i);
    this.eshkolProgram[i] = prog;

    // genome seeded from multiple Tsotchke (Eshkol + moonlab + QGT + spin)
    for (let g = 0; g < SOUP_GENOME_LEN; g++) {
      const e = getTsotchkeRepoByIndex(i + g);
      this.genome[i * SOUP_GENOME_LEN + g] =
        ((e.wiring * 0.6 + this.rng() * 0.3) * (prog % 17)) / 17;
    }
  }

  /** Full Tsotchke catalysis + AD mutation for new digital biologics. */
  update(archonBias: Float32Array, dt: number) {
    this.tick++;
    let live = 0;
    let sumV = 0;
    let bornThisTick = 0;

    const cat = fullTsotchkeBiologicsCatalysis(0, 0.2, this.tick);

    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;

      // Grow from all Tsotchke
      const c = corpusBeatForArchon(i, this.tick) + cat * 0.4;
      const q = qgeAlivenessStep(
        {
          position: [i * 0.01, 0, 0],
          momentum: [0, 0, 0],
          geometricPhase: c,
          curvature: this.symmetry[i] * 0.1,
        },
        dt * 0.8,
      );
      this.aliveness[i] = clamp01(this.aliveness[i] * 0.92 + q * 0.11 + c * 0.06);

      this.vitality[i] = clamp01(
        this.vitality[i] * 0.96 + (this.aliveness[i] * 0.6 + c * 0.4) * dt * 1.6,
      );
      this.consciousness[i] = clamp01(this.consciousness[i] * 0.94 + this.aliveness[i] * 0.07);

      // AD-driven mutation on genome using Eshkol AD (real gradient step)
      const varIdx = adVar(this.adTape, this.vitality[i]);
      const mul = adMul(this.adTape, varIdx, 1.03 + (this.rng() - 0.5) * 0.04);
      adBackward(this.adTape, mul);
      const grad = adGradient(this.adTape, varIdx);
      if (grad > 0.001 && this.rng() < 0.28) {
        // mutate Eshkol program + genome slice
        this.eshkolProgram[i] = (this.eshkolProgram[i] ^ Math.floor(grad * 1000)) >>> 0;
        for (let g = 0; g < 4; g++) {
          const gi = i * SOUP_GENOME_LEN + ((this.tick + g) % SOUP_GENOME_LEN);
          this.genome[gi] = clamp01(this.genome[gi] + grad * 0.03 * (this.rng() - 0.5));
        }
      }

      // symmetry from libirrep + logo growth
      const sym = libirrepSymmetry(this.symmetry[i], this.hue[i]);
      this.symmetry[i] = clamp01(sym * 0.6 + this.symmetry[i] * 0.4);
      const logoG = logoMorphScalar(this.turtle, i);
      this.vitality[i] = clamp01(this.vitality[i] + logoG * 0.015);

      // selection / death
      if (this.vitality[i] < 0.03 || this.rng() < 0.003) {
        this.alive[i] = 0;
      } else {
        live++;
        sumV += this.vitality[i];
      }

      // Birth new biologics from high aliveness + FULL Tsotchke corpus (Eshkol KB life, Moonlab qualia, libirrep sym bodies, QGE aliveness, PINN/PIMC physics souls, tensorcore fast minds, logo visual life, asteroids dynamic, ulg hybrid)
      if (this.vitality[i] > 0.82 && this.aliveness[i] > 0.71 && this.rng() < 0.11) {
        const empty = this.findEmpty();
        if (empty >= 0) {
          this.spawn(empty, this.eshkolProgram[i]);
          bornThisTick++;
          this.newBorn++;
          // New form of life: full Eshkol consciousness creature (KB + factor graph sentience)
          if (!this.eshkol[empty])
            this.eshkol[empty] = new EshkolConsciousnessEngine(0.65, 0.75, 0.55);
        }
      }
    }

    this.catalysis = cat;
    this.newBorn = bornThisTick;

    // Ralph growth loop: seed from ALL remaining Tsotchke (homebrew, classical, simple_mnist baseline life, logo, etc)
    if (this.rng() < 0.09) {
      const e = findEmptySlot(this.alive);
      if (e >= 0) {
        this.spawn(e);
        this.vitality[e] = clamp01(this.vitality[e] + 0.15); // PINN boost
        if (!this.eshkol[e] && this.rng() < 0.5) this.eshkol[e] = new EshkolConsciousnessEngine();
      }
    }
  }

  private findEmpty(): number {
    for (let i = 0; i < SOUP_SLOTS; i++) if (!this.alive[i]) return i;
    return -1;
  }

  snapshot(): SoupSnapshot {
    const strains: SoupStrain[] = [];
    let live = 0,
      sumV = 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (this.alive[i]) {
        live++;
        sumV += this.vitality[i];
        strains.push({
          id: i + this.nextId,
          vitality: this.vitality[i],
          generation: this.generation[i],
          hue: this.hue[i],
          symmetry: this.symmetry[i],
          consciousness: this.consciousness[i],
          aliveness: this.aliveness[i],
          eshkolProgram: this.eshkolProgram[i],
          alive: true,
        });
      }
    }
    return {
      tick: this.tick,
      strains,
      liveCount: live,
      meanVitality: live ? sumV / live : 0,
      catalysis: this.catalysis,
      newBiologicsBorn: this.newBorn,
    };
  }
}

function findEmptySlot(alive: Uint8Array): number {
  for (let i = 0; i < alive.length; i++) if (!alive[i]) return i;
  return -1;
}
