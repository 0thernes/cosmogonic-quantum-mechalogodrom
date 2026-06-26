/**
 * INTER-MIND SYMBIOSIS & PARASITISM (V94 / Super Creature 1.1) — emergence angle #9.
 * Minds that merge, host, or feed on each other — multi-scale individuality.
 *
 * THE PRINCIPLE:
 * Evolution is not just competition between individuals. Major evolutionary transitions
 * involve symbiosis and parasitism: minds that merge, host, or feed on each other.
 * This creates multi-scale individuality (e.g., mitochondria in cells, gut microbiome).
 *
 * THE MECHANISM:
 * - SYMBIOSIS: Two minds merge into a cooperative entity (shared resources, shared cognition)
 * - PARASITISM: One mind feeds on another (extracts resources, manipulates behavior)
 * - HOSTING: One mind provides substrate for another (nesting, resource sharing)
 * - The relationship can be mutualistic (+/+), commensal (+/0), or parasitic (+/-)
 * - Relationships evolve based on fitness outcomes
 * - Multi-scale individuality emerges (nested minds within minds)
 *
 * THE EVOLUTIONARY TRANSITION:
 * - From independent individuals to nested hierarchies
 * - From competition to cooperation
 * - From single-scale to multi-scale cognition
 * - From simple to complex individuality
 *
 * REFERENCES:
 * - Major evolutionary transitions (Szathmáry & Maynard Smith)
 * - Symbiosis in evolution (Margulis)
 * - Parasitic manipulation (Poulin)
 * - Multi-level selection theory
 *
 * This is emergence angle #9 from NEO-MIND-ARCHITECTURE.md.
 *
 * Pure leaf: deterministic (seeded relationships), allocation-free apart from working arrays.
 */

/** Relationship type between minds. */
export type RelationshipType = 'mutualistic' | 'commensal' | 'parasitic' | 'competitive';

/** Relationship state between two minds. */
export interface Relationship {
  /** ID of the host mind. */
  hostId: number;
  /** ID of the partner mind. */
  partnerId: number;
  /** Type of relationship. */
  type: RelationshipType;
  /** Strength of the relationship (0..1). */
  strength: number;
  /** Resource transfer rate (positive = host→partner, negative = partner→host). */
  resourceTransfer: number;
  /** Knowledge transfer rate (0..1). */
  knowledgeTransfer: number;
  /** Duration of the relationship (in beats). */
  duration: number;
  /** Fitness benefit to host (-1..1). */
  hostBenefit: number;
  /** Fitness benefit to partner (-1..1). */
  partnerBenefit: number;
}

/** Symbiosis configuration. */
export interface SymbiosisConfig {
  /** Maximum number of relationships per mind. */
  maxRelationships: number;
  /** Relationship formation rate (probability per beat). */
  formationRate: number;
  /** Relationship decay rate (strength loss per beat). */
  decayRate: number;
  /** Parasitism cost (how much parasite extracts). */
  parasitismCost: number;
  /** Symbiosis benefit (how much mutualism provides). */
  symbiosisBenefit: number;
}

const DEFAULT_CONFIG: SymbiosisConfig = {
  maxRelationships: 5,
  formationRate: 0.01,
  decayRate: 0.001,
  parasitismCost: 0.1,
  symbiosisBenefit: 0.05,
};

/**
 * SYMBIOSIS ENGINE — manages inter-mind relationships.
 */
export class Symbiosis {
  private config: SymbiosisConfig;
  private relationships: Map<string, Relationship> = new Map();
  private rng: () => number;

  constructor(rng: () => number, config: Partial<SymbiosisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rng;
  }

  /**
   * Get relationship key for a pair of minds.
   */
  private key(hostId: number, partnerId: number): string {
    const [a, b] = hostId < partnerId ? [hostId, partnerId] : [partnerId, hostId];
    return `${a}:${b}`;
  }

  /**
   * Attempt to form a new relationship between two minds.
   * Returns true if relationship was formed, false otherwise.
   */
  formRelationship(hostId: number, partnerId: number): boolean {
    if (hostId === partnerId) return false;

    const key = this.key(hostId, partnerId);
    if (this.relationships.has(key)) return false;

    // Check if either mind has too many relationships
    const hostCount = this.countRelationships(hostId);
    const partnerCount = this.countRelationships(partnerId);
    if (hostCount >= this.config.maxRelationships || partnerCount >= this.config.maxRelationships) {
      return false;
    }

    // Probabilistic formation: only a `formationRate` fraction of otherwise-valid
    // attempts actually bond. The rate was configured (default 0.01) but never
    // consulted, so every eligible pair bonded on its first attempt — the world
    // loop tries all 10 archon pairs each cycle, saturating symbiosis immediately.
    if (this.rng() >= this.config.formationRate) return false;

    // Determine relationship type based on random factors
    const r = this.rng();
    let type: RelationshipType;
    if (r < 0.4) {
      type = 'mutualistic';
    } else if (r < 0.7) {
      type = 'commensal';
    } else if (r < 0.9) {
      type = 'parasitic';
    } else {
      type = 'competitive';
    }

    const relationship: Relationship = {
      hostId,
      partnerId,
      type,
      strength: 0.5,
      resourceTransfer: type === 'parasitic' ? this.config.parasitismCost : 0,
      knowledgeTransfer: type === 'mutualistic' ? 0.5 : 0.1,
      duration: 0,
      hostBenefit: 0,
      partnerBenefit: 0,
    };

    this.relationships.set(key, relationship);
    return true;
  }

  /**
   * Count relationships for a mind.
   */
  private countRelationships(mindId: number): number {
    let count = 0;
    for (const rel of this.relationships.values()) {
      if (rel.hostId === mindId || rel.partnerId === mindId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Advance all relationships one beat.
   * Updates strength, duration, and computes fitness benefits.
   */
  step(): void {
    for (const [key, rel] of this.relationships) {
      rel.duration++;

      // Decay strength over time
      rel.strength = ((v) => (v > 0 ? (v < 1 ? v : 1) : 0))(rel.strength - this.config.decayRate);

      // Compute fitness benefits based on relationship type
      switch (rel.type) {
        case 'mutualistic':
          rel.hostBenefit = this.config.symbiosisBenefit * rel.strength;
          rel.partnerBenefit = this.config.symbiosisBenefit * rel.strength;
          break;
        case 'commensal':
          rel.hostBenefit = 0;
          rel.partnerBenefit = this.config.symbiosisBenefit * rel.strength * 0.5;
          break;
        case 'parasitic':
          rel.hostBenefit = -this.config.parasitismCost * rel.strength;
          rel.partnerBenefit = this.config.parasitismCost * rel.strength;
          break;
        case 'competitive':
          rel.hostBenefit = -this.config.symbiosisBenefit * rel.strength * 0.3;
          rel.partnerBenefit = -this.config.symbiosisBenefit * rel.strength * 0.3;
          break;
      }

      // Remove weak relationships
      if (rel.strength < 0.1) {
        this.relationships.delete(key);
      }
    }
  }

  /**
   * Get fitness benefit for a mind from all its relationships.
   */
  getFitnessBenefit(mindId: number): number {
    let benefit = 0;
    for (const rel of this.relationships.values()) {
      if (rel.hostId === mindId) {
        benefit += rel.hostBenefit;
      } else if (rel.partnerId === mindId) {
        benefit += rel.partnerBenefit;
      }
    }
    return benefit;
  }

  /**
   * Get knowledge transfer for a mind from all its relationships.
   */
  getKnowledgeTransfer(mindId: number): number {
    let transfer = 0;
    for (const rel of this.relationships.values()) {
      if (rel.hostId === mindId || rel.partnerId === mindId) {
        transfer += rel.knowledgeTransfer * rel.strength;
      }
    }
    return ((v) => (v > 0 ? (v < 1 ? v : 1) : 0))(transfer);
  }

  /**
   * Get all relationships for a mind.
   */
  getRelationships(mindId: number): Relationship[] {
    const rels: Relationship[] = [];
    for (const rel of this.relationships.values()) {
      if (rel.hostId === mindId || rel.partnerId === mindId) {
        rels.push({ ...rel });
      }
    }
    return rels;
  }

  /**
   * Get relationship statistics for the population.
   */
  getStats(): {
    total: number;
    mutualistic: number;
    commensal: number;
    parasitic: number;
    competitive: number;
    averageStrength: number;
  } {
    const total = this.relationships.size;
    let mutualistic = 0;
    let commensal = 0;
    let parasitic = 0;
    let competitive = 0;
    let totalStrength = 0;

    for (const rel of this.relationships.values()) {
      switch (rel.type) {
        case 'mutualistic':
          mutualistic++;
          break;
        case 'commensal':
          commensal++;
          break;
        case 'parasitic':
          parasitic++;
          break;
        case 'competitive':
          competitive++;
          break;
      }
      totalStrength += rel.strength;
    }

    return {
      total,
      mutualistic,
      commensal,
      parasitic,
      competitive,
      averageStrength: total > 0 ? totalStrength / total : 0,
    };
  }

  /**
   * Check if two minds are in a parasitic relationship.
   */
  isParasitic(hostId: number, partnerId: number): boolean {
    const key = this.key(hostId, partnerId);
    const rel = this.relationships.get(key);
    return rel?.type === 'parasitic' && rel.hostId === hostId;
  }

  /**
   * Check if two minds are in a mutualistic relationship.
   */
  isMutualistic(hostId: number, partnerId: number): boolean {
    const key = this.key(hostId, partnerId);
    const rel = this.relationships.get(key);
    return rel?.type === 'mutualistic';
  }

  /**
   * Terminate a relationship.
   */
  terminateRelationship(hostId: number, partnerId: number): void {
    const key = this.key(hostId, partnerId);
    this.relationships.delete(key);
  }

  /**
   * Reset all relationships.
   */
  reset(): void {
    this.relationships.clear();
  }
}

/**
 * Compute multi-scale individuality index.
 * Measures how much nested hierarchy exists in the population.
 * Higher = more complex multi-scale individuality.
 */
export function computeMultiScaleIndividuality(symbiosis: Symbiosis): number {
  const stats = symbiosis.getStats();

  // More relationships = more multi-scale structure
  const relationshipDensity = stats.total / 100; // Normalize to 0..1

  // Mutualistic relationships indicate higher-level individuality
  const mutualismRatio = stats.total > 0 ? stats.mutualistic / stats.total : 0;

  // Parasitic relationships indicate hierarchical exploitation
  const parasitismRatio = stats.total > 0 ? stats.parasitic / stats.total : 0;

  // Multi-scale individuality = density × (mutualism + parasitism)
  return ((v) => (v > 0 ? (v < 1 ? v : 1) : 0))(
    relationshipDensity * (mutualismRatio + parasitismRatio),
  );
}
