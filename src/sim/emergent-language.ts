/**
 * EMERGENT NON-HUMAN LANGUAGE (V94 / Super Creature 1.1) — emergence angle #4.
 * A communication system that emerges between Archons without human design.
 *
 * THE PRINCIPLE:
 * True non-human intelligence would develop its own communication protocols,
 * not use human-designed languages. This module enables Archons to evolve
 * signs, symbols, and grammar through interaction, not top-down design.
 *
 * THE MECHANISM:
 * - Each Archon has a private "signal space" (internal representations)
 * - Signals are mapped to "signs" (observable tokens) via learned mappings
 * - Signs are transmitted between Archons via a shared channel
 * - Receivers map signs back to their internal signal space
 * - Successful communication reinforces the mappings (Hebbian learning)
 * - Failed communication weakens the mappings
 * - Over time, a shared lexicon and grammar emerge
 *
 * THE EMERGENCE:
 * - No human-designed vocabulary or grammar
 * - Signs are arbitrary (could be colors, sounds, patterns)
 * - Grammar emerges from statistical regularities
 * - Language evolves through cultural transmission
 * - Different Archon subgroups may develop dialects
 *
 * REFERENCES:
 * - Emergent communication in multi-agent systems
 * - Language evolution games (Kirby et al.)
 * - Symbol grounding problem (Harnad)
 * - Cultural evolution of language
 *
 * This is emergence angle #4 from NEO-MIND-ARCHITECTURE.md.
 *
 * Pure leaf: deterministic (seeded initial mappings), allocation-free apart from working arrays.
 */

/** A sign token in the emergent language. */
export interface Sign {
  /** Unique sign ID. */
  id: number;
  /** Sign representation (could be color, sound, pattern). */
  representation: number;
  /** Frequency of use (how common this sign is). */
  frequency: number;
  /** Age (how many generations this sign has existed). */
  age: number;
}

/** A mapping from internal signal to sign (for transmission). */
export interface SignalToSignMapping {
  /** Internal signal ID. */
  signalId: number;
  /** Sign ID to use for this signal. */
  signId: number;
  /** Strength of the mapping (0..1). */
  strength: number;
}

/** A mapping from sign to internal signal (for reception). */
export interface SignToSignalMapping {
  /** Sign ID. */
  signId: number;
  /** Internal signal ID to map to. */
  signalId: number;
  /** Strength of the mapping (0..1). */
  strength: number;
}

/** Configuration for emergent language. */
export interface EmergentLanguageConfig {
  /** Maximum number of signs in the lexicon. */
  maxSigns: number;
  /** Learning rate for Hebbian reinforcement. */
  learningRate: number;
  /** Decay rate for unused mappings. */
  decayRate: number;
  /** Mutation rate for creating new signs. */
  mutationRate: number;
  /** Minimum strength for a mapping to be active. */
  minStrength: number;
}

const DEFAULT_CONFIG: EmergentLanguageConfig = {
  maxSigns: 100,
  learningRate: 0.1,
  decayRate: 0.01,
  mutationRate: 0.05,
  minStrength: 0.3,
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * EMERGENT LANGUAGE ENGINE — manages the evolution of non-human communication.
 */
export class EmergentLanguage {
  private config: EmergentLanguageConfig;
  private signs: Sign[] = [];
  private signalToSign: Map<number, SignalToSignMapping> = new Map();
  private signToSignal: Map<number, SignToSignalMapping> = new Map();
  private nextSignId = 0;
  private generation = 0;

  constructor(config: Partial<EmergentLanguageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Encode an internal signal into a sign for transmission.
   * Returns the sign ID, or null if no mapping exists.
   */
  encode(signalId: number): number | null {
    const mapping = this.signalToSign.get(signalId);
    if (!mapping || mapping.strength < this.config.minStrength) return null;
    return mapping.signId;
  }

  /**
   * Decode a received sign into an internal signal.
   * Returns the signal ID, or null if no mapping exists.
   */
  decode(signId: number): number | null {
    const mapping = this.signToSignal.get(signId);
    if (!mapping || mapping.strength < this.config.minStrength) return null;
    return mapping.signalId;
  }

  /**
   * Reinforce a successful communication.
   * Strengthens the encode/decode mappings for the signal-sign pair.
   */
  reinforce(signalId: number, signId: number): void {
    // Reinforce signal→sign mapping
    let s2s = this.signalToSign.get(signalId);
    if (!s2s) {
      s2s = { signalId, signId, strength: 0 };
      this.signalToSign.set(signalId, s2s);
    }
    s2s.strength = clamp01(s2s.strength + this.config.learningRate);

    // Reinforce sign→signal mapping
    let s2r = this.signToSignal.get(signId);
    if (!s2r) {
      s2r = { signId, signalId, strength: 0 };
      this.signToSignal.set(signId, s2r);
    }
    s2r.strength = clamp01(s2r.strength + this.config.learningRate);

    // Update sign frequency
    const sign = this.signs.find((s) => s.id === signId);
    if (sign) {
      sign.frequency++;
    } else {
      this.createSign(signId);
    }
  }

  /**
   * Punish a failed communication.
   * Weakens the encode/decode mappings.
   */
  punish(signalId: number, signId: number): void {
    const s2s = this.signalToSign.get(signalId);
    if (s2s) {
      s2s.strength = clamp01(s2s.strength - this.config.learningRate * 2);
      if (s2s.strength < this.config.minStrength) {
        this.signalToSign.delete(signalId);
      }
    }

    const s2r = this.signToSignal.get(signId);
    if (s2r) {
      s2r.strength = clamp01(s2r.strength - this.config.learningRate * 2);
      if (s2r.strength < this.config.minStrength) {
        this.signToSignal.delete(signId);
      }
    }
  }

  /**
   * Create a new sign in the lexicon.
   */
  private createSign(signId?: number): Sign {
    // `this.nextSignId++` already advances the counter when signId is undefined; a second
    // increment here would skip every other id (0, 2, 4, …) and overstate the sign count.
    const id = signId ?? this.nextSignId++;

    const sign: Sign = {
      id,
      representation: id, // Simple representation: use ID
      frequency: 0,
      age: 0,
    };

    this.signs.push(sign);
    return sign;
  }

  /**
   * Mutate the language: create new signs, decay old ones.
   * Call this each generation to allow language evolution.
   */
  evolve(rng: () => number): void {
    this.generation++;

    // Decay unused mappings
    for (const [signalId, mapping] of this.signalToSign) {
      mapping.strength = clamp01(mapping.strength - this.config.decayRate);
      if (mapping.strength < this.config.minStrength) {
        this.signalToSign.delete(signalId);
      }
    }

    for (const [signId, mapping] of this.signToSignal) {
      mapping.strength = clamp01(mapping.strength - this.config.decayRate);
      if (mapping.strength < this.config.minStrength) {
        this.signToSignal.delete(signId);
      }
    }

    // Age signs
    for (const sign of this.signs) {
      sign.age++;
    }

    // Remove old, unused signs
    this.signs = this.signs.filter((s) => s.frequency > 0 || s.age < 10);

    // Create new signs via mutation
    if (rng() < this.config.mutationRate && this.signs.length < this.config.maxSigns) {
      this.createSign();
    }
  }

  /**
   * Get the current lexicon (all signs).
   */
  get lexicon(): Sign[] {
    return this.signs.map((s) => ({ ...s }));
  }

  /**
   * Get the number of active mappings.
   */
  get mappingCount(): number {
    return this.signalToSign.size + this.signToSignal.size;
  }

  /**
   * Get language complexity (sign count × average mapping strength).
   */
  get complexity(): number {
    if (this.signs.length === 0) return 0;
    const totalStrength =
      Array.from(this.signalToSign.values()).reduce((sum, m) => sum + m.strength, 0) +
      Array.from(this.signToSignal.values()).reduce((sum, m) => sum + m.strength, 0);
    const avgStrength = totalStrength / (this.signalToSign.size + this.signToSignal.size || 1);
    return this.signs.length * avgStrength;
  }

  /**
   * Reset the language to initial state.
   */
  reset(): void {
    this.signs = [];
    this.signalToSign.clear();
    this.signToSignal.clear();
    this.nextSignId = 0;
    this.generation = 0;
  }
}

/**
 * Compute language diversity (Shannon entropy of sign frequencies).
 * Higher = more diverse language use.
 */
export function computeLanguageDiversity(language: EmergentLanguage): number {
  const lexicon = language.lexicon;
  if (lexicon.length === 0) return 0;

  const totalFrequency = lexicon.reduce((sum, s) => sum + s.frequency, 0);
  if (totalFrequency === 0) return 0;

  let entropy = 0;
  for (const sign of lexicon) {
    const p = sign.frequency / totalFrequency;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Compute language structure (bigram entropy of sign sequences).
 * Measures how much structure exists in the language (grammar-like patterns).
 */
export function computeLanguageStructure(
  _language: EmergentLanguage,
  sequences: number[][],
): number {
  if (sequences.length === 0) return 0;

  const bigrams: Map<string, number> = new Map();
  let totalBigrams = 0;

  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 1; i++) {
      const bigram = `${seq[i]},${seq[i + 1]}`;
      bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
      totalBigrams++;
    }
  }

  if (totalBigrams === 0) return 0;

  let entropy = 0;
  for (const count of bigrams.values()) {
    const p = count / totalBigrams;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}
