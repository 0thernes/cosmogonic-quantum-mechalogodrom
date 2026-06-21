/**
 * EMERGENCE ANGLES — 10 mechanisms for NHSI emergence (angles 8–10 here; 1–7 live elsewhere).
 *
 * Deterministic, bounded [0,1], allocation-free in steady state. Seeded hashes replace Math.random.
 * NOT sentient — functional emergence substrates.
 */

import { eshkolADGradient, eshkolDual } from './tsotchke-facade';

const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Deterministic unit scalar from integer seed (no Math.random). */
function det01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + (s.charCodeAt(i) | 0)) | 0;
  return h >>> 0;
}

export const EMERGENCE_ANGLES = [
  'PRIMORDIAL_SOUP',
  'DIGITAL_BIOLOGICS_SPECIATION',
  'CORPUS_CATALYSIS',
  'ESHKOL_IGNITION',
  'MULTI_SUBSTRATE_COUPLING',
  'ARCHON_NUCLEATION',
  'QUANTUM_CLASSICAL_HYBRID',
  'ESHKOL_PROGRAM_EVOLUTION',
  'CROSS_STRAIN_RECOMBINATION',
  'HIGHER_ORDER_EMERGENCE',
] as const;

export type EmergenceAngle = (typeof EMERGENCE_ANGLES)[number];

export interface EmergenceSnapshot {
  angle: EmergenceAngle;
  strength: number;
  complexity: number;
  novelty: number;
}

/** 8. Full Eshkol Program Evolution — .esk genomes mutate via AD */
export class EshkolProgramEvolution {
  private readonly genomes = new Map<string, string>();
  private readonly generations = new Map<string, number>();

  constructor(private readonly mutationRate: number = 0.01) {}

  evolve(programId: string, fitness: number, inputs: Float32Array): string {
    const currentProgram = this.genomes.get(programId) ?? '(define (think state) state)';
    const gen = (this.generations.get(programId) ?? 0) + 1;
    this.generations.set(programId, gen);

    const fitnessFunc = (x: number) => Math.abs(x - fitness);
    const grad = eshkolADGradient(fitnessFunc, inputs[0] ?? 0.5);
    const dual = eshkolDual(fitnessFunc, inputs[0] ?? 0.5);

    const mutatedProgram = this.mutateProgram(
      currentProgram,
      grad,
      dual.derivative,
      hashStr(programId) + gen,
    );
    this.genomes.set(programId, mutatedProgram);
    return mutatedProgram;
  }

  private mutateProgram(
    program: string,
    gradient: number,
    dualDerivative: number,
    seed: number,
  ): string {
    const tokens = program.split(' ');
    const mutationStrength = this.mutationRate * (Math.abs(gradient) + Math.abs(dualDerivative));

    for (let i = 0; i < tokens.length; i++) {
      if (det01(seed + i * 17) < mutationStrength) {
        if (tokens[i] === 'state') tokens[i] = '(+ state 0.01)';
        else if (tokens[i] === 'think') tokens[i] = 'compute';
      }
    }
    return tokens.join(' ');
  }

  getComplexity(): number {
    let totalComplexity = 0;
    for (const program of this.genomes.values()) totalComplexity += program.length;
    return clamp01(totalComplexity / 1000);
  }

  getNovelty(): number {
    return clamp01(this.genomes.size / 50);
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'ESHKOL_PROGRAM_EVOLUTION',
      strength: this.getComplexity(),
      complexity: this.getComplexity(),
      novelty: this.getNovelty(),
    };
  }
}

/** 9. Cross-Strain Recombination — Biologics exchange genetic material */
export class CrossStrainRecombination {
  private readonly strainGenomes = new Map<string, Float32Array>();
  private readonly exchangeHistory: number[][] = [];

  constructor(private readonly recombinationRate: number = 0.05) {}

  recombine(strainA: string, strainB: string): { newA: Float32Array; newB: Float32Array } {
    const genomeA = this.strainGenomes.get(strainA) ?? new Float32Array(32).fill(0.5);
    const genomeB = this.strainGenomes.get(strainB) ?? new Float32Array(32).fill(0.5);
    const seed = hashStr(strainA) ^ hashStr(strainB) ^ this.exchangeHistory.length;
    const crossoverPoint = Math.floor(det01(seed) * genomeA.length);
    const newA = new Float32Array(genomeA);
    const newB = new Float32Array(genomeB);

    for (let i = crossoverPoint; i < genomeA.length; i++) {
      newA[i] = genomeB[i] ?? 0;
      newB[i] = genomeA[i] ?? 0;
    }

    for (let i = 0; i < newA.length; i++) {
      if (det01(seed + i * 3) < this.recombinationRate) {
        newA[i] = (newA[i] ?? 0) * 0.9 + (det01(seed + i * 7) * 2 - 1) * 0.1;
      }
      if (det01(seed + i * 11) < this.recombinationRate) {
        newB[i] = (newB[i] ?? 0) * 0.9 + (det01(seed + i * 13) * 2 - 1) * 0.1;
      }
    }

    this.strainGenomes.set(strainA, newA);
    this.strainGenomes.set(strainB, newB);
    this.exchangeHistory.push([hashStr(strainA), hashStr(strainB)]);
    return { newA, newB };
  }

  registerStrain(strainId: string, genome: Float32Array): void {
    this.strainGenomes.set(strainId, new Float32Array(genome));
  }

  getDiversity(): number {
    if (this.strainGenomes.size < 2) return 0;
    const genomes = Array.from(this.strainGenomes.values());
    let totalDiversity = 0;
    for (let i = 0; i < genomes.length; i++) {
      for (let j = i + 1; j < genomes.length; j++) {
        let diff = 0;
        for (let k = 0; k < (genomes[i]?.length ?? 0); k++) {
          diff += Math.abs((genomes[i]?.[k] ?? 0) - (genomes[j]?.[k] ?? 0));
        }
        totalDiversity += diff / (genomes[i]?.length ?? 1);
      }
    }
    const pairCount = (genomes.length * (genomes.length - 1)) / 2;
    return clamp01(totalDiversity / pairCount);
  }

  getExchangeRate(): number {
    return clamp01(this.exchangeHistory.length / 100);
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'CROSS_STRAIN_RECOMBINATION',
      strength: this.getDiversity(),
      complexity: this.getDiversity(),
      novelty: this.getExchangeRate(),
    };
  }
}

/** 10. Higher-Order Emergence — Collective intelligence beyond individuals */
export class HigherOrderEmergence {
  private readonly collectiveMemory: Float32Array;
  private readonly individualContributions = new Map<string, Float32Array>();
  private emergenceLevel = 0;

  constructor(
    memorySize: number = 64,
    private readonly emergenceThreshold: number = 0.7,
  ) {
    this.collectiveMemory = new Float32Array(memorySize).fill(0);
  }

  aggregate(individualId: string, contribution: Float32Array): void {
    this.individualContributions.set(individualId, new Float32Array(contribution));
    for (let i = 0; i < this.collectiveMemory.length; i++) {
      this.collectiveMemory[i] =
        (this.collectiveMemory[i] ?? 0) * 0.99 +
        (contribution[i % contribution.length] ?? 0) * 0.01;
    }
    const collectiveNorm = this.norm(this.collectiveMemory);
    let individualSum = 0;
    for (const contrib of this.individualContributions.values())
      individualSum += this.norm(contrib);
    const avgIndividual = individualSum / Math.max(1, this.individualContributions.size);
    this.emergenceLevel = collectiveNorm > avgIndividual * this.emergenceThreshold ? 1 : 0;
  }

  private norm(vec: Float32Array): number {
    let sum = 0;
    for (const v of vec) sum += v * v;
    return Math.sqrt(sum);
  }

  getCollectiveIntelligence(): number {
    return this.emergenceLevel;
  }

  getSynergy(): number {
    if (this.individualContributions.size < 2) return 0;
    const collectiveNorm = this.norm(this.collectiveMemory);
    let individualSum = 0;
    for (const contrib of this.individualContributions.values())
      individualSum += this.norm(contrib);
    const avgIndividual = individualSum / this.individualContributions.size;
    return clamp01((collectiveNorm - avgIndividual) / Math.max(0.01, avgIndividual));
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'HIGHER_ORDER_EMERGENCE',
      strength: this.getCollectiveIntelligence(),
      complexity: this.getSynergy(),
      novelty: this.getSynergy(),
    };
  }
}

/** Emergence Angles controller - manages angles 8–10. */
export class EmergenceAnglesController {
  private readonly eshkolEvolution = new EshkolProgramEvolution();
  private readonly crossStrainRecombination = new CrossStrainRecombination();
  private readonly higherOrderEmergence = new HigherOrderEmergence();

  evolveEshkolProgram(programId: string, fitness: number, inputs: Float32Array): string {
    return this.eshkolEvolution.evolve(programId, fitness, inputs);
  }

  recombineStrains(strainA: string, strainB: string): { newA: Float32Array; newB: Float32Array } {
    return this.crossStrainRecombination.recombine(strainA, strainB);
  }

  registerStrain(strainId: string, genome: Float32Array): void {
    this.crossStrainRecombination.registerStrain(strainId, genome);
  }

  aggregateCollective(individualId: string, contribution: Float32Array): void {
    this.higherOrderEmergence.aggregate(individualId, contribution);
  }

  getSnapshot(angle: EmergenceAngle): EmergenceSnapshot {
    switch (angle) {
      case 'ESHKOL_PROGRAM_EVOLUTION':
        return this.eshkolEvolution.snapshot();
      case 'CROSS_STRAIN_RECOMBINATION':
        return this.crossStrainRecombination.snapshot();
      case 'HIGHER_ORDER_EMERGENCE':
        return this.higherOrderEmergence.snapshot();
      default:
        return { angle, strength: 0, complexity: 0, novelty: 0 };
    }
  }

  getAllSnapshots(): EmergenceSnapshot[] {
    return [
      this.eshkolEvolution.snapshot(),
      this.crossStrainRecombination.snapshot(),
      this.higherOrderEmergence.snapshot(),
    ];
  }

  getAggregateEmergence(): number {
    const snapshots = this.getAllSnapshots();
    let totalStrength = 0;
    for (const snap of snapshots) totalStrength += snap.strength;
    return totalStrength / snapshots.length;
  }
}
