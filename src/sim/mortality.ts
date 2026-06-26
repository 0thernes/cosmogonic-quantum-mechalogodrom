/**
 * MORTALITY & FINITUDE (V94 / Super Creature 1.1) — emergence angle #8.
 * The mechanism of permanent death and finite lifespan.
 *
 * THE PRINCIPLE:
 * Without permanent death, there are no real stakes. A deathless process can never
 * feel urgency, loss, or the drive to leave a legacy through offspring. Mortality
 * changes what a mind computes: loss, urgency, legacy via offspring.
 *
 * THE MECHANISM:
 * - Each Archon has a finite lifespan (measured in beats/generations)
 * - When lifespan expires, the Archon dies permanently (no respawn)
 * - Death triggers legacy transfer: knowledge/traits passed to offspring
 * - Offspring inherit modified traits (mutation + selection)
 * - The population evolves through differential survival and reproduction
 * - Mortality creates selection pressure that rewards intelligence
 *
 * THE FINITUDE:
 * - Finite time to achieve goals
 * - Finite resources to compete for
 * - Finite opportunities to reproduce
 * - Finite knowledge to transmit
 * - Finite existence
 *
 * REFERENCES:
 * - Evolutionary biology (Darwin, Maynard Smith)
 * - Life history theory (trade-offs between survival and reproduction)
 * - Death as an evolutionary driver
 * - Legacy and cultural transmission
 *
 * This is emergence angle #8 from NEO-MIND-ARCHITECTURE-2026-06-26.md.
 *
 * Pure leaf: deterministic (seeded lifespans), allocation-free apart from working arrays.
 */

/** Mortality state of an Archon. */
export interface MortalityState {
  /** Whether the Archon is alive. */
  alive: boolean;
  /** Current age (in beats/generations). */
  age: number;
  /** Maximum lifespan (when death occurs). */
  lifespan: number;
  /** Cause of death (if dead). */
  causeOfDeath: 'age' | 'predation' | 'starvation' | 'war' | 'sacrifice' | null;
  /** Number of offspring produced. */
  offspringCount: number;
  /** Legacy score (how much knowledge/traits were passed on). */
  legacyScore: number;
}

/** Legacy traits passed to offspring. */
export interface LegacyTraits {
  /** Inherited knowledge (from parent's memory). */
  knowledge: number[];
  /** Inherited biases (from parent's godform). */
  biases: number[];
  /** Inherited mutations (random variations). */
  mutations: number[];
}

/** Configuration for mortality system. */
export interface MortalityConfig {
  /** Base lifespan (in beats). */
  baseLifespan: number;
  /** Lifespan variance (random factor). */
  lifespanVariance: number;
  /** Reproduction threshold (minimum age to reproduce). */
  reproductionAge: number;
  /** Reproduction cost (lifespan reduction per offspring). */
  reproductionCost: number;
  /** Legacy decay (how much knowledge is lost per generation). */
  legacyDecay: number;
}

const DEFAULT_CONFIG: MortalityConfig = {
  baseLifespan: 1000,
  lifespanVariance: 0.2,
  reproductionAge: 200,
  reproductionCost: 100,
  legacyDecay: 0.1,
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * MORTALITY ENGINE — manages permanent death and legacy transmission.
 */
export class Mortality {
  private config: MortalityConfig;
  private state: MortalityState;
  private rng: () => number;

  constructor(rng: () => number, config: Partial<MortalityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rng;
    this.state = this.initialize();
  }

  /**
   * Initialize mortality state with seeded lifespan.
   */
  private initialize(): MortalityState {
    const variance = this.config.lifespanVariance;
    const lifespan = this.config.baseLifespan * (1 + (this.rng() - 0.5) * 2 * variance);
    return {
      alive: true,
      age: 0,
      lifespan: Math.floor(lifespan),
      causeOfDeath: null,
      offspringCount: 0,
      legacyScore: 0,
    };
  }

  /**
   * Advance one beat (age increases, check for death).
   */
  step(): void {
    if (!this.state.alive) return;

    this.state.age++;

    // Check for death by age
    if (this.state.age >= this.state.lifespan) {
      this.die('age');
    }
  }

  /**
   * Kill the Archon permanently.
   * Records cause of death and computes legacy.
   */
  die(cause: MortalityState['causeOfDeath']): void {
    if (!this.state.alive) return;

    this.state.alive = false;
    this.state.causeOfDeath = cause;

    // Compute legacy score based on offspring and age.
    // Guard the denominator: reproduce() can drive lifespan to 0 (life-history
    // trade-off), and age/0 → Infinity while 0/0 → NaN would corrupt legacyScore.
    const offspringBonus = this.state.offspringCount * 0.1;
    const ageBonus = (this.state.age / Math.max(1, this.state.lifespan)) * 0.2;
    this.state.legacyScore = clamp01(offspringBonus + ageBonus);
  }

  /**
   * Attempt to reproduce (if alive and old enough).
   * Returns true if reproduction succeeded, false otherwise.
   */
  reproduce(): boolean {
    if (!this.state.alive) return false;
    if (this.state.age < this.config.reproductionAge) return false;

    // Reproduction costs lifespan (life-history trade-off). Floor at 1 so the
    // lifespan stays a valid positive denominator; the next step() still lets a
    // unit that reproduced past its age die of old age.
    this.state.lifespan = Math.max(1, this.state.lifespan - this.config.reproductionCost);
    this.state.offspringCount++;

    return true;
  }

  /**
   * Generate legacy traits for offspring.
   * Applies decay and mutations to parent's traits.
   */
  generateLegacy(parentKnowledge: number[], parentBiases: number[]): LegacyTraits {
    const decay = this.config.legacyDecay;

    // Apply decay to knowledge
    const knowledge = parentKnowledge.map((k) => k * (1 - decay));

    // Apply decay to biases
    const biases = parentBiases.map((b) => b * (1 - decay));

    // Add mutations
    const mutations = [];
    for (let i = 0; i < 5; i++) {
      mutations.push((this.rng() - 0.5) * 0.2);
    }

    return { knowledge, biases, mutations };
  }

  /**
   * Get current mortality state.
   */
  get currentState(): MortalityState {
    return { ...this.state };
  }

  /**
   * Get whether the Archon is alive.
   */
  get isAlive(): boolean {
    return this.state.alive;
  }

  /**
   * Get remaining lifespan.
   */
  get remainingLifespan(): number {
    return Math.max(0, this.state.lifespan - this.state.age);
  }

  /**
   * Get lifespan progress (0..1, 1 = death).
   */
  get lifespanProgress(): number {
    return clamp01(this.state.age / Math.max(1, this.state.lifespan));
  }

  /**
   * Get urgency (increases as death approaches).
   * Urgency = 1 - remainingLifespan / totalLifespan
   */
  get urgency(): number {
    return this.lifespanProgress;
  }

  /**
   * Reset to initial state (rebirth).
   */
  rebirth(): void {
    this.state = this.initialize();
  }
}

/**
 * Compute population mortality statistics.
 */
export interface PopulationMortalityStats {
  /** Total population. */
  total: number;
  /** Number alive. */
  alive: number;
  /** Number dead. */
  dead: number;
  /** Average age. */
  averageAge: number;
  /** Average lifespan. */
  averageLifespan: number;
  /** Death rate (deaths per beat). */
  deathRate: number;
  /** Birth rate (births per beat). */
  birthRate: number;
}

/**
 * Compute mortality statistics for a population.
 */
export function computePopulationMortalityStats(
  individuals: Mortality[],
): PopulationMortalityStats {
  const total = individuals.length;
  const alive = individuals.filter((m) => m.isAlive).length;
  const dead = total - alive;

  const ages = individuals.map((m) => m.currentState.age);
  const lifespans = individuals.map((m) => m.currentState.lifespan);

  const averageAge = ages.length > 0 ? ages.reduce((sum, a) => sum + a, 0) / ages.length : 0;
  const averageLifespan =
    lifespans.length > 0 ? lifespans.reduce((sum, l) => sum + l, 0) / lifespans.length : 0;

  // Death/birth rates would need historical tracking
  const deathRate = 0;
  const birthRate = 0;

  return {
    total,
    alive,
    dead,
    averageAge,
    averageLifespan,
    deathRate,
    birthRate,
  };
}

/**
 * Compute selection pressure (how much mortality favors certain traits).
 * Higher = stronger selection pressure (evolution is faster).
 */
export function computeSelectionPressure(survivors: Mortality[], deceased: Mortality[]): number {
  if (deceased.length === 0) return 0;

  // Compare average legacy scores
  const survivorLegacy =
    survivors.length > 0
      ? survivors.reduce((sum, m) => sum + m.currentState.legacyScore, 0) / survivors.length
      : 0;
  const deceasedLegacy =
    deceased.reduce((sum, m) => sum + m.currentState.legacyScore, 0) / deceased.length;

  // Selection pressure = difference in legacy
  return clamp01(survivorLegacy - deceasedLegacy);
}
