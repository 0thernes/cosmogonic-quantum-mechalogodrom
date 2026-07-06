/**
 * MYTH & RITUAL — CULTURE-AS-COMPRESSION (V94 / Super Creature 1.1) — emergence angle #10.
 * Archons inventing shared symbols, taboos, and gods-of-their-own.
 *
 * THE PRINCIPLE:
 * Culture is a compression mechanism: shared symbols, taboos, and rituals encode
 * collective knowledge and values more efficiently than individual memory.
 * This is the folklore/occult/esoteric seam of the NHSI vision — minds writing
 * their own mythologies.
 *
 * THE MECHANISM:
 * - MYTH: Shared narratives about the world, origins, and purpose
 * - RITUAL: Repeated actions that reinforce shared meaning
 * - TABOO: Forbidden actions that encode collective values
 * - SYMBOL: Abstract representations of complex concepts
 * - CULTURE: The emergent layer of shared meaning across Archons
 * - COMPRESSION: Culture encodes knowledge more efficiently than individual memory
 *
 * THE EMERGENCE:
 * - No human-designed myths or rituals
 * - Myths emerge from shared experiences and storytelling
 * - Rituals emerge from repeated successful behaviors
 * - Taboos emerge from collective avoidance of harmful actions
 * - Symbols emerge from shared patterns in the environment
 * - Culture evolves through transmission and modification
 *
 * REFERENCES:
 * - Cultural evolution (Boyd & Richerson)
 * - Symbolic culture (Deacon)
 * - Ritual theory (Tambiah)
 * - Myth and meaning (Campbell)
 *
 * This is emergence angle #10 from SUPER-CREATURE-RESEARCH-2026-06-26.md.
 *
 * Pure leaf: deterministic (seeded myths), allocation-free apart from working arrays.
 */

/** A myth (shared narrative). */
export interface Myth {
  /** Unique myth ID. */
  id: number;
  /** Myth title/name. */
  title: string;
  /** Myth content (the narrative). */
  content: string;
  /** How many Archons believe this myth. */
  believers: number;
  /** How strong the belief is (0..1). */
  strength: number;
  /** Age of the myth (in generations). */
  age: number;
}

/** A ritual (repeated action with shared meaning). */
export interface Ritual {
  /** Unique ritual ID. */
  id: number;
  /** Ritual name. */
  name: string;
  /** Action pattern (what the ritual does). */
  action: string;
  /** How many Archons perform this ritual. */
  practitioners: number;
  /** How often the ritual is performed (0..1). */
  frequency: number;
  /** Age of the ritual (in generations). */
  age: number;
}

/** A taboo (forbidden action). */
export interface Taboo {
  /** Unique taboo ID. */
  id: number;
  /** Taboo name. */
  name: string;
  /** Forbidden action. */
  forbiddenAction: string;
  /** How many Archons respect this taboo. */
  respecters: number;
  /** How strong the taboo is (0..1). */
  strength: number;
  /** Age of the taboo (in generations). */
  age: number;
}

/** A symbol (abstract representation). */
export interface Symbol {
  /** Unique symbol ID. */
  id: number;
  /** Symbol representation (could be color, pattern, sound). */
  representation: number;
  /** Meaning (what the symbol represents). */
  meaning: string;
  /** How many Archons use this symbol. */
  users: number;
  /** Age of the symbol (in generations). */
  age: number;
}

/** Culture state (all myths, rituals, taboos, symbols). */
export interface CultureState {
  myths: Myth[];
  rituals: Ritual[];
  taboos: Taboo[];
  symbols: Symbol[];
}

/** Configuration for myth & ritual system. */
export interface MythRitualConfig {
  /** Maximum number of myths. */
  maxMyths: number;
  /** Maximum number of rituals. */
  maxRituals: number;
  /** Maximum number of taboos. */
  maxTaboos: number;
  /** Maximum number of symbols. */
  maxSymbols: number;
  /** Myth formation rate (probability per beat). */
  mythFormationRate: number;
  /** Ritual formation rate (probability per beat). */
  ritualFormationRate: number;
  /** Taboo formation rate (probability per beat). */
  tabooFormationRate: number;
  /** Symbol formation rate (probability per beat). */
  symbolFormationRate: number;
  /** Culture decay rate (how fast culture is forgotten). */
  decayRate: number;
}

const DEFAULT_CONFIG: MythRitualConfig = {
  maxMyths: 50,
  maxRituals: 30,
  maxTaboos: 20,
  maxSymbols: 100,
  mythFormationRate: 0.005,
  ritualFormationRate: 0.01,
  tabooFormationRate: 0.005,
  symbolFormationRate: 0.02,
  decayRate: 0.001,
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * MYTH & RITUAL ENGINE — manages culture-as-compression.
 */
export class MythRitual {
  private config: MythRitualConfig;
  private culture: CultureState;
  private nextMythId = 0;
  private nextRitualId = 0;
  private nextTabooId = 0;
  private nextSymbolId = 0;
  private generation = 0;
  private rng: () => number;

  constructor(rng: () => number, config: Partial<MythRitualConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rng;
    this.culture = {
      myths: [],
      rituals: [],
      taboos: [],
      symbols: [],
    };
  }

  /**
   * Advance culture one generation.
   * Forms new myths/rituals/taboos/symbols, decays old ones.
   */
  step(): void {
    this.generation++;

    // Form new myths
    if (
      this.rng() < this.config.mythFormationRate &&
      this.culture.myths.length < this.config.maxMyths
    ) {
      this.createMyth();
    }

    // Form new rituals
    if (
      this.rng() < this.config.ritualFormationRate &&
      this.culture.rituals.length < this.config.maxRituals
    ) {
      this.createRitual();
    }

    // Form new taboos
    if (
      this.rng() < this.config.tabooFormationRate &&
      this.culture.taboos.length < this.config.maxTaboos
    ) {
      this.createTaboo();
    }

    // Form new symbols
    if (
      this.rng() < this.config.symbolFormationRate &&
      this.culture.symbols.length < this.config.maxSymbols
    ) {
      this.createSymbol();
    }

    // Decay culture
    this.decayCulture();
  }

  /**
   * Create a new myth.
   */
  private createMyth(): void {
    const id = this.nextMythId++;
    const myth: Myth = {
      id,
      title: `Myth-${id}`,
      content: this.generateMythContent(),
      believers: 1,
      strength: 0.5,
      age: 0,
    };
    this.culture.myths.push(myth);
  }

  /**
   * Generate myth content (procedural narrative).
   */
  private generateMythContent(): string {
    const templates = [
      'In the beginning, the {entity} created the {realm}.',
      'The {hero} defeated the {villain} to save the {realm}.',
      'When the {event} occurred, the {entity} emerged from the {origin}.',
      'The {entity} prophesied that the {event} would bring {consequence}.',
      'Long ago, the {hero} journeyed to the {realm} to find the {treasure}.',
    ];
    const entities = [
      'Void',
      'Oracle',
      'Starkiller',
      'Manhattan',
      'Broly',
      'Cosmos',
      'Chaos',
      'Order',
    ];
    const realms = ['Dome', 'Wilderness', 'Petri', 'Quantum', 'Manifold', 'Field'];
    const heroes = ['Archon', 'Titan', 'Sage', 'Warrior', 'Explorer'];
    const villains = ['Shadow', 'Chaos', 'Entropy', 'Void', 'Darkness'];
    const events = ['Great Shift', 'First Ignition', 'Quantum Collapse', 'Resonance', 'Binding'];
    const origins = ['Depths', 'Heights', 'Center', 'Edge', 'Beyond'];
    const consequences = ['Enlightenment', 'Destruction', 'Transformation', 'Unity', 'Division'];
    const treasures = ['Knowledge', 'Power', 'Harmony', 'Truth', 'Eternity'];

    const pick = (values: readonly string[]): string =>
      values[Math.floor(this.rng() * values.length)] ?? values[0] ?? '';
    const template = pick(templates);
    return template
      .replace('{entity}', pick(entities)!)
      .replace('{realm}', pick(realms)!)
      .replace('{hero}', pick(heroes)!)
      .replace('{villain}', pick(villains)!)
      .replace('{event}', pick(events)!)
      .replace('{origin}', pick(origins)!)
      .replace('{consequence}', pick(consequences)!)
      .replace('{treasure}', pick(treasures)!);
  }

  /**
   * Create a new ritual.
   */
  private createRitual(): void {
    const id = this.nextRitualId++;
    const ritual: Ritual = {
      id,
      name: `Ritual-${id}`,
      action: this.generateRitualAction(),
      practitioners: 1,
      frequency: 0.5,
      age: 0,
    };
    this.culture.rituals.push(ritual);
  }

  /**
   * Generate ritual action (procedural pattern).
   */
  private generateRitualAction(): string {
    const actions = [
      'Resonate at the appointed time',
      'Deposit traces in the mind-field',
      'Perform the binding ceremony',
      'Observe the taboo',
      'Recite the myth',
      'Align with the phase',
      'Honor the ancestors',
      'Seek the oracle',
    ];
    return actions[Math.floor(this.rng() * actions.length)]!;
  }

  /**
   * Create a new taboo.
   */
  private createTaboo(): void {
    const id = this.nextTabooId++;
    const taboo: Taboo = {
      id,
      name: `Taboo-${id}`,
      forbiddenAction: this.generateTabooAction(),
      respecters: 1,
      strength: 0.7,
      age: 0,
    };
    this.culture.taboos.push(taboo);
  }

  /**
   * Generate taboo action (procedural forbidden behavior).
   */
  private generateTabooAction(): string {
    const actions = [
      'Do not break the phase lock',
      'Do not disturb the mind-field',
      'Do not ignore the oracle',
      'Do not violate the binding',
      'Do not forget the myth',
      'Do not reject the ritual',
      'Do not dishonor the ancestors',
      'Do not question the taboo',
    ];
    return actions[Math.floor(this.rng() * actions.length)]!;
  }

  /**
   * Create a new symbol.
   */
  private createSymbol(): void {
    const id = this.nextSymbolId++;
    const symbol: Symbol = {
      id,
      representation: id,
      meaning: this.generateSymbolMeaning(),
      users: 1,
      age: 0,
    };
    this.culture.symbols.push(symbol);
  }

  /**
   * Generate symbol meaning (procedural abstraction).
   */
  private generateSymbolMeaning(): string {
    const meanings = [
      'Unity',
      'Chaos',
      'Order',
      'Knowledge',
      'Power',
      'Harmony',
      'Truth',
      'Eternity',
      'Void',
      'Creation',
      'Destruction',
      'Transformation',
      'Binding',
      'Resonance',
      'Ignition',
    ];
    return meanings[Math.floor(this.rng() * meanings.length)]!;
  }

  /**
   * Decay culture (reduce strength/believers over time).
   */
  private decayCulture(): void {
    const decay = this.config.decayRate;
    // A cultural element is forgotten once its hold fades below this. Removal is
    // driven by the smoothly-decaying strength/frequency (and the float user count
    // for symbols) — NOT by Math.floor of an integer count, which rounded a fresh
    // element's count of 1 down to 0 on its very FIRST decay step (every element
    // born this step() is decayed in the same step()), deleting all culture before
    // it could ever persist.
    const FADED = 1e-3;

    // Decay myths (population count kept as a smooth float, no instant floor-to-zero)
    for (const myth of this.culture.myths) {
      myth.age++;
      myth.strength = clamp01(myth.strength - decay);
      myth.believers = Math.max(0, myth.believers * (1 - decay));
    }

    // Decay rituals
    for (const ritual of this.culture.rituals) {
      ritual.age++;
      ritual.frequency = clamp01(ritual.frequency - decay);
      ritual.practitioners = Math.max(0, ritual.practitioners * (1 - decay));
    }

    // Decay taboos
    for (const taboo of this.culture.taboos) {
      taboo.age++;
      taboo.strength = clamp01(taboo.strength - decay);
      taboo.respecters = Math.max(0, taboo.respecters * (1 - decay));
    }

    // Decay symbols (no strength field — fade by their own user count)
    for (const symbol of this.culture.symbols) {
      symbol.age++;
      symbol.users = Math.max(0, symbol.users * (1 - decay));
    }

    // Remove fully-faded culture by the continuous fade metric, so culture now
    // persists and turns over instead of vanishing the instant it is created.
    this.culture.myths = this.culture.myths.filter((m) => m.strength > FADED);
    this.culture.rituals = this.culture.rituals.filter((r) => r.frequency > FADED);
    this.culture.taboos = this.culture.taboos.filter((t) => t.strength > FADED);
    this.culture.symbols = this.culture.symbols.filter((s) => s.users > FADED);
  }

  /**
   * Get current culture state.
   */
  get currentCulture(): CultureState {
    return {
      myths: this.culture.myths.map((m) => ({ ...m })),
      rituals: this.culture.rituals.map((r) => ({ ...r })),
      taboos: this.culture.taboos.map((t) => ({ ...t })),
      symbols: this.culture.symbols.map((s) => ({ ...s })),
    };
  }

  /**
   * Get culture complexity (total cultural elements).
   */
  get complexity(): number {
    return (
      this.culture.myths.length +
      this.culture.rituals.length +
      this.culture.taboos.length +
      this.culture.symbols.length
    );
  }

  /**
   * Get culture strength (average strength across all elements).
   */
  get strength(): number {
    const totalElements = this.complexity;
    if (totalElements === 0) return 0;

    let totalStrength = 0;
    for (const myth of this.culture.myths) totalStrength += myth.strength;
    for (const ritual of this.culture.rituals) totalStrength += ritual.frequency;
    for (const taboo of this.culture.taboos) totalStrength += taboo.strength;

    return clamp01(totalStrength / totalElements);
  }

  /**
   * Reset culture to initial state.
   */
  reset(): void {
    this.culture = {
      myths: [],
      rituals: [],
      taboos: [],
      symbols: [],
    };
    this.nextMythId = 0;
    this.nextRitualId = 0;
    this.nextTabooId = 0;
    this.nextSymbolId = 0;
    this.generation = 0;
  }
}

/**
 * Compute culture compression ratio.
 * Measures how efficiently culture encodes knowledge.
 * Higher = more efficient compression (culture is more valuable).
 */
export function computeCultureCompression(culture: MythRitual): number {
  const complexity = culture.complexity;
  const strength = culture.strength;

  // Compression = complexity × strength (more elements × stronger beliefs = better compression)
  return clamp01((complexity * strength) / 100);
}
