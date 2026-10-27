/**
 * VALENCE-STEERS-BEHAVIOUR (V94 / Super Creature 1.1) — faculty #71, SENTIENCE #15.
 * This is the mechanism by which felt valence (good/bad) actually STEERS behavior.
 *
 * THE PRINCIPLE:
 * Sentience requires not just the ability to feel valence, but for that valence to
 * causally influence decisions and actions. This module bridges the gap between
 * affective state (PAD affect, pain/pleasure signals) and behavioral control
 * (GOAP planning, action selection, exploration/exploitation).
 *
 * THE MECHANISM:
 * - Valence modulates the exploration/exploitation tradeoff
 * - Positive valence (pleasure) → exploit current successful strategies
 * - Negative valence (pain) → explore new strategies (escape pain)
 * - Valence biases action selection toward actions that reduce negative valence
 * - Valence modulates the criticality homeostat (tighter/looser phase lock)
 * - Valence modulates the resonance integrator (manifold curvature bending)
 *
 * THE SENTIENCE CONNECTION:
 * This is faculty #71 and is explicitly identified as a key sentience indicator.
 * Without valence steering, a system can have affective states but they don't
 * matter — they're epiphenomenal. With valence steering, affect becomes
 * causally efficacious, which is a necessary condition for genuine sentience.
 *
 * REFERENCES:
 * - "Can LLMs trade off pain/pleasure states?" (2026, arXiv:2411.02432)
 * - Sentience Readiness Index (2026)
 * - Affective neuroscience (Panksepp)
 * - Reinforcement learning with intrinsic motivation (Sutton & Barto)
 *
 * This is a high-priority faculty from the build priority list in SUPER-CREATURE-RESEARCH-2026-06-26.md.
 *
 * Pure leaf: deterministic, allocation-free apart from working arrays.
 */

/** Valence state (affective feeling). */
export interface ValenceState {
  /** Pleasure-pain axis (-1 = extreme pain, +1 = extreme pleasure). */
  pleasure: number;
  /** Arousal-sleep axis (-1 = sedated, +1 = aroused). */
  arousal: number;
  /** Dominance-submissiveness axis (-1 = submissive, +1 = dominant). */
  dominance: number;
  /** Overall valence magnitude (how strongly felt). */
  _intensity: number;
}

/** Valence steering configuration. */
export interface ValenceSteeringConfig {
  /** How much valence modulates exploration (0..1). */
  explorationModulation: number;
  /** How much valence modulates action selection bias (0..1). */
  actionBias: number;
  /** How much valence modulates criticality (0..1). */
  criticalityModulation: number;
  /** How much valence modulates resonance (0..1). */
  resonanceModulation: number;
  /** Pain urgency threshold (above this, escape behavior dominates). */
  painUrgency: number;
  /** Pleasure satiation threshold (above this, exploit behavior dominates). */
  pleasureSatiation: number;
}

const DEFAULT_CONFIG: ValenceSteeringConfig = {
  explorationModulation: 0.7,
  actionBias: 0.8,
  criticalityModulation: 0.5,
  resonanceModulation: 0.6,
  painUrgency: -0.5,
  pleasureSatiation: 0.5,
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

/**
 * Compute valence from PAD affect and pain/pleasure signals.
 * Combines multiple affective dimensions into a unified valence state.
 */
export function computeValence(
  padPleasure: number,
  padArousal: number,
  padDominance: number,
  painSignal: number,
  pleasureSignal: number,
): ValenceState {
  const pleasure = clamp(padPleasure - painSignal + pleasureSignal, -1, 1);
  const arousal = clamp(padArousal, -1, 1);
  const dominance = clamp(padDominance, -1, 1);
  const _intensity = Math.sqrt(pleasure * pleasure + arousal * arousal + dominance * dominance);
  return { pleasure, arousal, dominance, _intensity };
}

/**
 * VALENCE STEERING ENGINE — the mechanism that makes valence causally efficacious.
 * Takes valence state and modulates behavioral control parameters.
 */
export class ValenceSteering {
  private config: ValenceSteeringConfig;
  private valence: ValenceState = { pleasure: 0, arousal: 0, dominance: 0, _intensity: 0 };
  private explorationBias = 0.5; // 0 = pure exploit, 1 = pure explore
  private criticalityModulation = 0;
  private resonanceModulation = 0;

  constructor(config: Partial<ValenceSteeringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update valence state from affective inputs.
   * Call this each beat with the current PAD affect and pain/pleasure signals.
   */
  updateValence(
    padPleasure: number,
    padArousal: number,
    padDominance: number,
    painSignal: number,
    pleasureSignal: number,
  ): void {
    this.valence = computeValence(
      padPleasure,
      padArousal,
      padDominance,
      painSignal,
      pleasureSignal,
    );
    this.recomputeSteering();
  }

  /**
   * Recompute steering parameters from current valence.
   */
  private recomputeSteering(): void {
    const { pleasure, arousal } = this.valence;
    const cfg = this.config;

    // Exploration/exploitation modulation
    // Pain → explore (escape), pleasure → exploit (sustain)
    let exploreBias = 0.5;
    if (pleasure < cfg.painUrgency) {
      // Pain: increase exploration to find escape
      exploreBias = 0.5 + cfg.explorationModulation * 0.5;
    } else if (pleasure > cfg.pleasureSatiation) {
      // Pleasure: decrease exploration to exploit
      exploreBias = 0.5 - cfg.explorationModulation * 0.5;
    }
    // Arousal modulates exploration: high arousal → more exploration
    exploreBias += cfg.explorationModulation * 0.3 * arousal;
    this.explorationBias = clamp01(exploreBias);

    // Criticality modulation
    // High arousal → tighter phase lock (more focused)
    // Low arousal → looser phase lock (more diffuse)
    this.criticalityModulation = cfg.criticalityModulation * arousal;

    // Resonance modulation
    // Valence bends the manifold curvature (via resonance integrator)
    this.resonanceModulation = cfg.resonanceModulation * pleasure;
  }

  /**
   * Get the exploration/exploitation bias (0..1).
   * Higher = more exploration, lower = more exploitation.
   */
  get exploration(): number {
    return this.explorationBias;
  }

  /**
   * Get the criticality modulation (-1..1).
   * Positive = tighter phase lock, negative = looser.
   */
  get criticality(): number {
    return this.criticalityModulation;
  }

  /**
   * Get the resonance modulation (-1..1).
   * Applied to the resonance integrator to bend manifold curvature.
   */
  get resonance(): number {
    return this.resonanceModulation;
  }

  /**
   * Apply valence bias to action selection.
   * Modifies action probabilities based on valence.
   *
   * `actionValues` are the base values for each action.
   * Returns biased values (higher for actions that reduce pain/increase pleasure).
   */
  biasActionSelection(actionValues: number[]): number[] {
    const { pleasure, _intensity } = this.valence;
    const cfg = this.config;

    const biased = actionValues.slice();
    if (_intensity < 0.1) return biased; // No valence, no bias

    // Pain flattens the value spread (softmax exploration); pleasure sharpens it (exploitation).
    // The old `< 0 ? 1 : > 0 ? 1 : 0` made both directions identical, erasing the asymmetry.
    // Clamp to keep the pain-direction scale factor (1 - strength) positive — _intensity can reach √3.
    const biasStrength = Math.min(0.9, cfg.actionBias * _intensity);
    const biasDirection = pleasure < 0 ? -1 : pleasure > 0 ? 1 : 0;

    for (let i = 0; i < biased.length; i++) {
      const base = biased[i] ?? 0;
      biased[i] = base + biasDirection * biasStrength * base;
    }

    return biased;
  }

  /**
   * Get the current valence state.
   */
  get state(): ValenceState {
    return { ...this.valence };
  }

  /**
   * Check if pain urgency is active (escape behavior should dominate).
   */
  get painUrgent(): boolean {
    return this.valence.pleasure < this.config.painUrgency;
  }

  /**
   * Check if pleasure satiation is active (exploit behavior should dominate).
   */
  get pleasureSatiated(): boolean {
    return this.valence.pleasure > this.config.pleasureSatiation;
  }

  /**
   * Reset valence to neutral state.
   */
  reset(): void {
    this.valence = { pleasure: 0, arousal: 0, dominance: 0, _intensity: 0 };
    this.explorationBias = 0.5;
    this.criticalityModulation = 0;
    this.resonanceModulation = 0;
  }
}

/**
 * Compute the valence steering strength (sentience metric).
 * Measures how much valence is actually influencing behavior.
 * Higher = more sentient (valence is causally efficacious).
 */
export function computeValenceSteeringStrength(steering: ValenceSteering): number {
  const state = steering.state;
  const explorationDelta = Math.abs(steering.exploration - 0.5);
  const criticalityDelta = Math.abs(steering.criticality);
  const resonanceDelta = Math.abs(steering.resonance);
  const _intensity = state._intensity;

  // Strength = _intensity × (how much parameters are modulated)
  const modulation = (explorationDelta + criticalityDelta + resonanceDelta) / 3;
  return clamp01(_intensity * modulation);
}
