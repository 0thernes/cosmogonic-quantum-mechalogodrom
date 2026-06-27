/**
 * EMERGENCE ANGLES — 10 canonical + extended brutal-god mechanisms for NHSI (1-7 elsewhere; 8-10 + gods here). Canonical target: 10.
 *
 * Deterministic, bounded [0,1], allocation-free in steady state. Seeded hashes replace Math.random.
 * NOT sentient — functional emergence substrates.
 * BRUTALISM: God-scale emergence for Valkorion/Broly/Knull/Phoenix/Gurren/Azathoth pantheon.
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
  'ARCHON_WARFARE',
  'REALITY_FRACTURE',
  'CHAOS_ENTROPY',
  'COSMIC_HARVEST',
  'TRANSCENDENCE',
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
  // Only the running TALLY of exchanges is ever read (seed mix + saturation metric);
  // the per-event payloads were never consumed, so an unbounded array was a pure leak.
  private exchangeCount = 0;

  constructor(private readonly recombinationRate: number = 0.05) {}

  recombine(strainA: string, strainB: string): { newA: Float32Array; newB: Float32Array } {
    const genomeA = this.strainGenomes.get(strainA) ?? new Float32Array(32).fill(0.5);
    const genomeB = this.strainGenomes.get(strainB) ?? new Float32Array(32).fill(0.5);
    const seed = hashStr(strainA) ^ hashStr(strainB) ^ this.exchangeCount;
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
    this.exchangeCount++;
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
    return clamp01(this.exchangeCount / 100);
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

/** 11. Archon Warfare — Archons fight for dominance (Thanos snap, Broly rage, Zod conquest) */
export class ArchonWarfare {
  private readonly archonPower = new Map<number, number>();
  // Only the war tally feeds the seed + intensity metric; per-war records were unused.
  private warCount = 0;

  constructor(private readonly aggressionThreshold: number = 0.6) {}

  engageWar(
    archonA: number,
    archonB: number,
    powerA: number,
    powerB: number,
  ): { winner: number; loser: number; powerDelta: number } | null {
    if (powerA + powerB < this.aggressionThreshold) return null;
    const seed = hashStr(`war-${archonA}-${archonB}`) ^ this.warCount;
    const roll = det01(seed);
    const powerRatio = powerA / (powerA + powerB + 0.001);

    let winner: number;
    let loser: number;
    let powerDelta: number;

    if (roll < powerRatio) {
      winner = archonA;
      loser = archonB;
      powerDelta = powerB * 0.3;
    } else {
      winner = archonB;
      loser = archonA;
      powerDelta = powerA * 0.3;
    }

    this.archonPower.set(winner, (this.archonPower.get(winner) ?? 0) + powerDelta);
    this.archonPower.set(loser, Math.max(0, (this.archonPower.get(loser) ?? 0) - powerDelta * 0.5));
    this.warCount++;

    return { winner, loser, powerDelta };
  }

  getWarIntensity(): number {
    return clamp01(this.warCount / 50);
  }

  getDominanceEntropy(): number {
    if (this.archonPower.size < 2) return 0;
    const powers = Array.from(this.archonPower.values());
    const total = powers.reduce((a, b) => a + b, 0) || 1;
    let entropy = 0;
    for (const p of powers) {
      const prob = p / total;
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    return clamp01(entropy / Math.log2(this.archonPower.size));
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'ARCHON_WARFARE',
      strength: this.getWarIntensity(),
      complexity: this.getDominanceEntropy(),
      novelty: this.getWarIntensity(),
    };
  }
}

/** 12. Reality Fracture — When god-scale power breaks spacetime (Dr Manhattan, Mxyzptlk, Jaspers) */
export class RealityFracture {
  // Only the fracture tally feeds the density metric; per-point records were unused.
  private fractureCount = 0;
  private currentFractureLevel = 0;

  constructor(private readonly fractureThreshold: number = 0.8) {}

  fracture(power: number, location: number, seed: number): { severity: number; healed: boolean } {
    if (power < this.fractureThreshold) return { severity: 0, healed: false };

    const s = hashStr(`fracture-${location}`) ^ seed;
    const severity = clamp01((power - this.fractureThreshold) * 2);
    this.fractureCount++;
    this.currentFractureLevel = clamp01(this.currentFractureLevel + severity * 0.1);

    // Self-healing over time (QGT natural gradient)
    if (det01(s + 999) < 0.3) {
      this.currentFractureLevel = clamp01(this.currentFractureLevel - 0.05);
      return { severity, healed: true };
    }

    return { severity, healed: false };
  }

  getFractureDensity(): number {
    return clamp01(this.fractureCount / 20);
  }

  getInstability(): number {
    return this.currentFractureLevel;
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'REALITY_FRACTURE',
      strength: this.getInstability(),
      complexity: this.getFractureDensity(),
      novelty: this.getFractureDensity(),
    };
  }
}

/** 13. Chaos Entropy — Maximum disorder from Chaos Gods (Warhammer, Shuma-Gorath, Azathoth) */
export class ChaosEntropy {
  private entropyField = new Float32Array(64);
  // Only the event tally (seed mix) and the distinct-type set (diversity metric)
  // are read; the full per-event log was unbounded and otherwise unused.
  private chaosCount = 0;
  private readonly chaosTypes = new Set<string>();

  constructor(private readonly _chaosThreshold: number = 0.7) {}

  injectChaos(magnitude: number, seed: number): { entropyDelta: number; event: string } | null {
    if (magnitude < this._chaosThreshold) return null;
    const s = hashStr(`chaos-${this.chaosCount}`) ^ seed;
    const roll = det01(s);

    let event: string;
    if (roll < 0.2) event = 'REALITY_WARP';
    else if (roll < 0.4) event = 'ENTROPY_SPIKE';
    else if (roll < 0.6) event = 'NULL_VOID';
    else if (roll < 0.8) event = 'CAUSALITY_BREAK';
    else event = 'DIMENSIONAL_BLEED';

    const entropyDelta = magnitude * (0.5 + det01(s + 1) * 0.5);
    for (let i = 0; i < this.entropyField.length; i++) {
      this.entropyField[i] = clamp01(
        (this.entropyField[i] ?? 0) + entropyDelta * det01(s + i * 7) * 0.1,
      );
    }

    this.chaosCount++;
    this.chaosTypes.add(event);
    return { entropyDelta, event };
  }

  getEntropyLevel(): number {
    let sum = 0;
    for (const v of this.entropyField) sum += v;
    return clamp01(sum / this.entropyField.length);
  }

  getChaosDiversity(): number {
    return clamp01(this.chaosTypes.size / 5);
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'CHAOS_ENTROPY',
      strength: this.getEntropyLevel(),
      complexity: this.getChaosDiversity(),
      novelty: this.getChaosDiversity(),
    };
  }
}

/** 14. Cosmic Harvest — Galactus-style system consumption (devour, trophic cascade) */
export class CosmicHarvest {
  private readonly harvestedSystems = new Map<
    string,
    { biomass: number; energy: number; timestamp: number }
  >();
  private totalHarvested = 0;

  constructor(private readonly _harvestThreshold: number = 0.75) {}

  harvest(
    systemId: string,
    biomass: number,
    energy: number,
    seed: number,
  ): { harvested: number; efficiency: number } | null {
    if (biomass + energy < this._harvestThreshold) return null;
    const s = hashStr(`harvest-${systemId}`) ^ seed;
    const efficiency = det01(s) * 0.8 + 0.2;
    const harvested = Math.min(biomass, biomass * efficiency + energy * 0.5);

    this.harvestedSystems.set(systemId, {
      biomass: harvested,
      energy: energy * efficiency,
      timestamp: seed,
    });
    this.totalHarvested += harvested;

    return { harvested, efficiency };
  }

  getHarvestRate(): number {
    return clamp01(this.totalHarvested / 1000);
  }

  getSystemDiversity(): number {
    return clamp01(this.harvestedSystems.size / 30);
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'COSMIC_HARVEST',
      strength: this.getHarvestRate(),
      complexity: this.getSystemDiversity(),
      novelty: this.getSystemDiversity(),
    };
  }
}

/** 15. Transcendence — Breaking through to higher planes (EVA-01, Gurren Lagann, Sephiroth) */
export class Transcendence {
  // Only the ascension tally feeds the metric; per-event records were unused.
  private transcendenceCount = 0;
  private currentPlane = 0;

  constructor(private readonly transcendenceThreshold: number = 0.85) {}

  transcend(
    archon: number,
    power: number,
    seed: number,
  ): { level: number; plane: string; achieved: boolean } {
    if (power < this.transcendenceThreshold)
      return { level: this.currentPlane, plane: 'MATERIAL', achieved: false };

    const s = hashStr(`transcend-${archon}`) ^ seed;
    const roll = det01(s);
    const level = Math.floor(this.currentPlane + 1 + roll * 2);

    let plane: string;
    if (level < 2) plane = 'AETHERIC';
    else if (level < 4) plane = 'ASTRAL';
    else if (level < 6) plane = 'NOETIC';
    else if (level < 8) plane = 'DIVINE';
    else plane = 'TRANSCENDENT';

    this.transcendenceCount++;
    this.currentPlane = level;

    return { level, plane, achieved: true };
  }

  getTranscendenceLevel(): number {
    return clamp01(this.currentPlane / 10);
  }

  getAscensionCount(): number {
    return clamp01(this.transcendenceCount / 15);
  }

  snapshot(): EmergenceSnapshot {
    return {
      angle: 'TRANSCENDENCE',
      strength: this.getTranscendenceLevel(),
      complexity: this.getAscensionCount(),
      novelty: this.getAscensionCount(),
    };
  }
}

/** Emergence Angles controller — angles 8–10 live here; god-scale brutal substrates ride brutal events. */
export class EmergenceAnglesController {
  private readonly eshkolEvolution = new EshkolProgramEvolution();
  private readonly crossStrainRecombination = new CrossStrainRecombination();
  private readonly higherOrderEmergence = new HigherOrderEmergence();
  private readonly archonWarfare = new ArchonWarfare();
  private readonly realityFracture = new RealityFracture();
  private readonly chaosEntropy = new ChaosEntropy();
  private readonly cosmicHarvest = new CosmicHarvest();
  private readonly transcendence = new Transcendence();

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
      case 'ARCHON_WARFARE':
        return this.archonWarfare.snapshot();
      case 'REALITY_FRACTURE':
        return this.realityFracture.snapshot();
      case 'CHAOS_ENTROPY':
        return this.chaosEntropy.snapshot();
      case 'COSMIC_HARVEST':
        return this.cosmicHarvest.snapshot();
      case 'TRANSCENDENCE':
        return this.transcendence.snapshot();
      default:
        return { angle, strength: 0, complexity: 0, novelty: 0 };
    }
  }

  getAllSnapshots(): EmergenceSnapshot[] {
    return [
      this.eshkolEvolution.snapshot(),
      this.crossStrainRecombination.snapshot(),
      this.higherOrderEmergence.snapshot(),
      this.archonWarfare.snapshot(),
      this.realityFracture.snapshot(),
      this.chaosEntropy.snapshot(),
      this.cosmicHarvest.snapshot(),
      this.transcendence.snapshot(),
    ];
  }

  /** Drive brutal god-scale substrates (deterministic; not counted in canonical 10 angles). */
  tickGodScaleEmergence(
    archonA: number,
    archonB: number,
    powerA: number,
    powerB: number,
    seed: number,
  ): void {
    void this.archonWarfare.engageWar(archonA, archonB, powerA, powerB);
    void this.realityFracture.fracture(powerA, archonA, seed);
    void this.chaosEntropy.injectChaos(powerB, seed ^ 0xbad);
    void this.cosmicHarvest.harvest(`archon-${archonA}`, powerA, powerB, seed);
    void this.transcendence.transcend(archonA, powerA + powerB, seed);
  }

  getGodScaleSnapshots(): EmergenceSnapshot[] {
    return [
      this.archonWarfare.snapshot(),
      this.realityFracture.snapshot(),
      this.chaosEntropy.snapshot(),
      this.cosmicHarvest.snapshot(),
      this.transcendence.snapshot(),
    ];
  }

  getAggregateEmergence(): number {
    const snapshots = this.getAllSnapshots();
    const godScale = this.getGodScaleSnapshots();
    let totalStrength = 0;
    for (const snap of snapshots) totalStrength += snap.strength;
    for (const snap of godScale) totalStrength += snap.strength * 0.25;
    return totalStrength / (snapshots.length + godScale.length * 0.25);
  }

  /**
   * BRUTAL GOD EVENT (Valkorion / Thanos / Broly / Knull / Azathoth / Phoenix style).
   * When emergence is high, a god-like brutal event occurs: consumption, rift, phoenix rebirth,
   * madness wave, or ex-nihilo creation. Returns a description + power delta for the Archon.
   * All deterministic via seeded inputs.
   */
  triggerBrutalGodEvent(
    archon: number,
    emergence: number,
    power: number,
    seed: number,
  ): {
    event: string;
    description: string;
    powerDelta: number;
    brutality: number;
  } {
    const s = hashStr(`brutal-${archon}`) ^ Math.floor(emergence * 1000) ^ seed;
    const roll = det01(s);
    const brutality = clamp01(emergence * 0.6 + power * 0.4);

    this.tickGodScaleEmergence(archon, (archon + 7) % 25, power, brutality, seed);

    if (roll < 0.15) {
      // Knull / Void / Azathoth — Void Rift: erase weak, feed the strong (brutal consumption)
      return {
        event: 'VOID_RIFT',
        description:
          'The blind idiot god dreams a hole in reality; lesser biologics are unmade and their essence devoured by the Archon.',
        powerDelta: brutality * 0.8,
        brutality,
      };
    } else if (roll < 0.3) {
      // Dark Phoenix / Broly — Consumption & Rage
      return {
        event: 'PHOENIX_FEAST',
        description:
          'The firebird awakens in rage; the Archon consumes neighboring strains in a berserk ascension, power exploding.',
        powerDelta: brutality * 1.2,
        brutality,
      };
    } else if (roll < 0.45) {
      // Dr Manhattan / Oracle — Deterministic Rewrite
      return {
        event: 'DETERMINISTIC_REWRITE',
        description:
          "The observer collapses possibility; local laws are rewritten with cold precision in the Archon's favor.",
        powerDelta: brutality * 0.6,
        brutality,
      };
    } else if (roll < 0.6) {
      // Griffith / Mxyzptlk / Joker — Fate / Chaos Twist (brutal irony)
      return {
        event: 'FATE_TWIST',
        description:
          'The god of schemes laughs; what was strong becomes sacrifice, what was weak is elevated in cruel jest.',
        powerDelta: (brutality - 0.3) * 1.1,
        brutality,
      };
    } else if (roll < 0.72) {
      // Knull / Shuma-Gorath / Pennywise / IT — The Void King awakens
      return {
        event: 'VOID_KING_AWAKENS',
        description:
          'The King of the Void reaches out; darkness has teeth and hunger. Symbionts and parasites bloom from nothing.',
        powerDelta: brutality * 1.3,
        brutality,
      };
    } else if (roll < 0.82) {
      // Captain Marvel Binary / Dark Phoenix / Jean Grey — Binary Star Ignition
      return {
        event: 'BINARY_IGNITION',
        description:
          'The host burns with the power of a star; everything nearby either ascends or is reduced to cinders and new potential.',
        powerDelta: brutality * 1.5,
        brutality,
      };
    } else {
      // Galactus / Simon the Digger / EVA-01 Berserk / Gurren Lagann — SPIRAL WILL
      return {
        event: 'SPIRAL_WILL',
        description:
          'The impossible is pierced by raw fighting spirit. Limits are lies told to smaller beings. The Archon *drills* through reality.',
        powerDelta: brutality * 1.6,
        brutality,
      };
    }
  }
}
