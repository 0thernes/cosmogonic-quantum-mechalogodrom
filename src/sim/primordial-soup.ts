/**
 * PRIMORDIAL SOUP — full Tsotchke-wired digital biologics birth layer.
 * Deterministic scaffold for emergent strains; not a claim of sentience.
 */

import type { Rng } from '../math/rng';
import { clamp } from '../math/scalar';
import { corpusBeatForArchon, getTsotchkeRepoByIndex } from './tsotchke-registry';

const clamp01 = (v: number): number => clamp(v, 0, 1);

export const SOUP_SLOTS = 48;
export const SOUP_GENOME_LEN = 24;

export interface SoupStrain {
  id: number;
  vitality: number;
  generation: number;
  hue: number;
  symmetry: number;
  consciousness: number;
  alive: boolean;
  eshkolProgram?: number | string;
}

export interface SoupSnapshot {
  tick: number;
  strains: SoupStrain[];
  liveCount: number;
  meanVitality: number;
  catalysis: number;
  eshkolBorn: number;
}

export class PrimordialSoup {
  private readonly vitality = new Float32Array(SOUP_SLOTS);
  private readonly generation = new Uint16Array(SOUP_SLOTS);
  private readonly hue = new Float32Array(SOUP_SLOTS);
  private readonly symmetry = new Float32Array(SOUP_SLOTS);
  private readonly consciousness = new Float32Array(SOUP_SLOTS);
  private readonly alive = new Uint8Array(SOUP_SLOTS);
  private readonly eshkolPrograms: (number | string | undefined)[] = new Array(SOUP_SLOTS);
  private readonly rng: Rng;
  private tick = 0;

  constructor(seedOrRng: number | Rng, seedVitality = 0.18, seed = 0x50ff0001) {
    this.rng = typeof seedOrRng === 'function' ? seedOrRng : makeSoupRng(seedOrRng);
    const rngSeed = (typeof seedOrRng === 'number' ? seedOrRng : seed) >>> 0;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      const s = ((rngSeed + i * 123456789) % 997) / 997;
      this.vitality[i] = 0.1 + s * 0.2;
      this.generation[i] = 0;
      this.hue[i] = s;
      this.symmetry[i] = (i % 5) / 4;
      this.consciousness[i] = 0.2 + s * 0.3;
      this.alive[i] = s > 0.3 || this.rng() < seedVitality ? 1 : 0;
      if (this.alive[i]) {
        this.eshkolPrograms[i] = (s * 10000) >>> 0;
      }
    }
  }

  update(input: number | Float32Array, beatOrDt = 0, rng: Rng = this.rng): void {
    this.tick++;
    const archonIdx = typeof input === 'number' ? input : Math.floor(((input[0] ?? 0) * 10) % 10);
    const beat = typeof input === 'number' ? beatOrDt : this.tick;
    const inputCatalysis = typeof input === 'number' ? 0 : vectorMean(input);
    const corpus = clamp01(corpusBeatForArchon(archonIdx, beat) + inputCatalysis * 0.25);
    const repo = getTsotchkeRepoByIndex(archonIdx % 10);
    const wiring = repo?.wiring ?? 0.5;

    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      const v = this.vitality[i] ?? 0;
      const c = this.consciousness[i] ?? 0;
      const prog = this.eshkolPrograms[i];
      const programBoost = prog === undefined ? 0 : (Number(prog) % 997) / 997;
      const growth =
        0.001 + (corpus + inputCatalysis * 0.25) * 0.002 * wiring + programBoost * 0.001;
      this.vitality[i] = Math.min(1, v + growth);
      this.consciousness[i] = clamp01(
        c * 0.98 + (corpus + (this.symmetry[i] ?? 0)) * 0.01 * wiring,
      );
      if ((this.vitality[i] ?? 0) < 0.05 && (this.generation[i] ?? 0) < 5) {
        this.alive[i] = 0;
      }
      if (rng() < 0.01 * wiring && !this.eshkolPrograms[i]) {
        this.eshkolPrograms[i] = ((beat + i) * 2654435761) >>> 0;
        this.alive[i] = 1;
        this.generation[i] = (this.generation[i] ?? 0) + 1;
      }
    }
  }

  incubate(): void {
    this.update(0, this.tick, this.rng);
  }

  harvestEmergent(): SoupStrain | null {
    let best = -1;
    let bestVitality = 0.85;
    for (let i = 0; i < SOUP_SLOTS; i++) {
      if (!this.alive[i]) continue;
      const vitality = this.vitality[i] ?? 0;
      if (vitality > bestVitality) {
        best = i;
        bestVitality = vitality;
      }
    }
    if (best < 0) return null;
    const strain = this.strainAt(best);
    this.vitality[best] = 0.35;
    return strain;
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
      strains.push(this.strainAt(i));
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

  private strainAt(i: number): SoupStrain {
    return {
      id: i,
      vitality: this.vitality[i] ?? 0,
      generation: this.generation[i] ?? 0,
      hue: this.hue[i] ?? 0,
      symmetry: this.symmetry[i] ?? 0,
      consciousness: this.consciousness[i] ?? 0,
      alive: !!this.alive[i],
      eshkolProgram: this.eshkolPrograms[i],
    };
  }
}

function makeSoupRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vectorMean(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] ?? 0;
  return v.length === 0 ? 0 : sum / v.length;
}
