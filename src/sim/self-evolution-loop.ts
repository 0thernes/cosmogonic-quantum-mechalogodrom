/**
 * SELF-EVOLUTION LOOP (V94 / Super Creature 1.1) — faculty #99 from NEO-MIND-ARCHITECTURE-2026-06-26.md.
 * The mechanism by which the system modifies its own architecture and parameters over time.
 *
 * THE PRINCIPLE:
 * True open-ended evolution requires not just selection across creatures, but
 * self-modification WITHIN a creature's lifetime. This is the Gödel-machine /
 * reflective self-improvement loop: the system can rewrite its own code,
 * parameters, and architecture based on its own evaluation of performance.
 *
 * THE MECHANISM:
 * - Evaluate current performance (fitness, emergence metrics, consciousness indicators)
 * - Identify bottlenecks and improvement opportunities
 * - Generate modification proposals (parameter tweaks, architecture changes, new faculties)
 * - Apply modifications with safety bounds (capacity-bounded safe self-change)
 * - Monitor for instability or degradation
 * - Roll back if performance degrades beyond threshold
 *
 * THE EVOLUTIONARY LOOP:
 * 1. ASSESS: Measure current state (fitness, emergence, complexity)
 * 2. GENERATE: Propose modifications (mutation, crossover, invention)
 * 3. VALIDATE: Check safety bounds (no self-destruction, no runaway)
 * 4. APPLY: Implement modifications (parameter updates, architecture changes)
 * 5. EVALUATE: Measure new state
 * 6. SELECT: Keep if improved, rollback if degraded
 * 7. REPEAT: Continue loop indefinitely
 *
 * REFERENCES:
 * - Gödel Machine (Schmidhuber 2003, 2025)
 * - Hyperagents (Mar 2026, hf.co/papers/2603.19461)
 * - Boundless Socratic Learning (2025, hf.co/papers/2411.16905)
 * - Capacity-bounded safe self-change (research bedrock)
 *
 * This is faculty #99 — IMPLEMENTED BUT NOT WIRED (no sim consumer yet): no system feeds it
 * EvolutionMetrics or applies its ModificationProposals, so the loop does NOT run in the live
 * sim. The class below is correct and test-ready; it stays dormant until a tick builds metrics
 * from fitness/emergence/Butlin/Phi/complexity and calls step(). Until then it enables
 * open-ended self-modification only on paper.
 *
 * Pure leaf: deterministic (seeded mutations), allocation-free apart from working arrays.
 */

/** Performance metrics for evolution assessment. */
export interface EvolutionMetrics {
  /** Fitness score (higher = better). */
  fitness: number;
  /** Emergence score (open-endedness, novelty). */
  emergence: number;
  /** Complexity (parameter count, faculty count). */
  complexity: number;
  /** Consciousness indicators (Butlin score, Φ, etc.). */
  consciousness: number;
  /** Stability (how stable the system is). */
  stability: number;
}

/** Modification proposal for self-evolution. */
export interface ModificationProposal {
  /** Type of modification. */
  type: 'parameter' | 'architecture' | 'faculty' | 'connection';
  /** Target component (faculty ID, parameter name, etc.). */
  target: string;
  /** Proposed change (new value, new structure, etc.). */
  change: unknown;
  /** Expected impact (fitness delta estimate). */
  impact: number;
  /** Risk level (0..1, higher = riskier). */
  risk: number;
}

/** Self-evolution configuration. */
export interface SelfEvolutionConfig {
  /** Minimum fitness improvement to accept a modification. */
  minImprovement: number;
  /** Maximum risk level for auto-acceptance. */
  maxAutoRisk: number;
  /** Rollback threshold (if fitness drops below this, rollback). */
  rollbackThreshold: number;
  /** Complexity budget (max parameter count). */
  maxComplexity: number;
  /** Mutation rate (probability of proposing a change). */
  mutationRate: number;
  /** Innovation rate (probability of proposing a novel change). */
  innovationRate: number;
}

const DEFAULT_CONFIG: SelfEvolutionConfig = {
  minImprovement: 0.01,
  maxAutoRisk: 0.3,
  rollbackThreshold: 0.8,
  maxComplexity: 1e6,
  mutationRate: 0.1,
  innovationRate: 0.05,
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Compute overall evolution score from metrics.
 * Weighted combination of fitness, emergence, consciousness, stability.
 */
export function computeEvolutionScore(metrics: EvolutionMetrics): number {
  const weights = { fitness: 0.4, emergence: 0.3, consciousness: 0.2, stability: 0.1 };
  return (
    weights.fitness * metrics.fitness +
    weights.emergence * metrics.emergence +
    weights.consciousness * metrics.consciousness +
    weights.stability * metrics.stability
  );
}

/**
 * Generate a modification proposal based on current state.
 * Uses seeded randomness for deterministic evolution.
 */
export function generateModification(
  metrics: EvolutionMetrics,
  rng: () => number,
  config: SelfEvolutionConfig,
): ModificationProposal | null {
  if (rng() > config.mutationRate) return null;

  const isNovel = rng() < config.innovationRate;
  const type = isNovel
    ? (['faculty', 'connection'][Math.floor(rng() * 2)] as 'faculty' | 'connection')
    : (['parameter', 'architecture'][Math.floor(rng() * 2)] as 'parameter' | 'architecture');

  const target = `component_${Math.floor(rng() * 100)}`;
  const impact = (rng() - 0.5) * 0.2; // -0.1 to +0.1 expected impact
  const risk = rng() * (isNovel ? 0.5 : 0.2); // Novel changes are riskier

  let change: unknown;
  switch (type) {
    case 'parameter':
      change = rng(); // New parameter value
      break;
    case 'architecture':
      change = { structure: 'modified', complexity: metrics.complexity * 1.1 };
      break;
    case 'faculty':
      change = { newFaculty: true, type: 'novel' };
      break;
    case 'connection':
      change = { from: Math.floor(rng() * 50), to: Math.floor(rng() * 50), weight: rng() };
      break;
  }

  return { type, target, change, impact, risk };
}

/**
 * Validate a modification proposal against safety bounds.
 * Returns true if the modification is safe to apply.
 */
export function validateModification(
  proposal: ModificationProposal,
  _currentMetrics: EvolutionMetrics,
  config: SelfEvolutionConfig,
): boolean {
  // Check risk level
  if (proposal.risk > config.maxAutoRisk) return false;

  // Check complexity budget
  if (proposal.type === 'architecture' && typeof proposal.change === 'object') {
    const change = proposal.change as { complexity?: number };
    if (change.complexity && change.complexity > config.maxComplexity) return false;
  }
  // The LIVE metric grows x1.1 per accepted architecture/faculty mod (see applyModification); the
  // declared-field check above misses faculty mods entirely and never inspects the running total.
  // Reject when the projected live complexity would breach the budget, so it can't grow unbounded.
  if (
    (proposal.type === 'architecture' || proposal.type === 'faculty') &&
    _currentMetrics.complexity * 1.1 > config.maxComplexity
  ) {
    return false;
  }

  // Check for self-destruction (extreme negative impact)
  if (proposal.impact < -0.5) return false;

  return true;
}

/**
 * Apply a modification proposal to the system.
 * Returns the new metrics after application.
 */
export function applyModification(
  proposal: ModificationProposal,
  _currentMetrics: EvolutionMetrics,
  rng: () => number,
): EvolutionMetrics {
  const newMetrics = { ..._currentMetrics };

  // Simulate the effect of the modification
  const actualImpact = proposal.impact * (0.8 + rng() * 0.4); // Add some noise

  newMetrics.fitness = clamp01(_currentMetrics.fitness + actualImpact);
  newMetrics.emergence = clamp01(_currentMetrics.emergence + actualImpact * 0.5);
  newMetrics.consciousness = clamp01(_currentMetrics.consciousness + actualImpact * 0.3);

  if (proposal.type === 'architecture' || proposal.type === 'faculty') {
    newMetrics.complexity *= 1.1;
    newMetrics.stability *= 0.95; // More complex = less stable
  }

  return newMetrics;
}

/**
 * SELF-EVOLUTION LOOP — the core mechanism for open-ended self-improvement.
 * Manages the assess → generate → validate → apply → evaluate → select cycle.
 */
export class SelfEvolutionLoop {
  private config: SelfEvolutionConfig;
  private metrics: EvolutionMetrics;
  private history: EvolutionMetrics[] = [];
  private generation = 0;
  private modificationsApplied = 0;
  private rollbacks = 0;

  constructor(initialMetrics: EvolutionMetrics, config: Partial<SelfEvolutionConfig> = {}) {
    this.metrics = initialMetrics;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.history.push({ ...initialMetrics });
  }

  /**
   * Advance the evolution loop one generation.
   * Returns true if a modification was applied, false otherwise.
   */
  step(rng: () => number): boolean {
    this.generation++;

    // Assess current state
    const currentScore = computeEvolutionScore(this.metrics);

    // Generate modification proposal
    const proposal = generateModification(this.metrics, rng, this.config);
    if (!proposal) return false;

    // Validate safety
    if (!validateModification(proposal, this.metrics, this.config)) return false;

    // Apply modification
    const newMetrics = applyModification(proposal, this.metrics, rng);
    const newScore = computeEvolutionScore(newMetrics);

    // Evaluate improvement
    const improvement = newScore - currentScore;

    // Select: keep if improved, rollback if degraded
    if (improvement >= this.config.minImprovement) {
      this.metrics = newMetrics;
      this.modificationsApplied++;
      this.history.push({ ...newMetrics });
      if (this.history.length > 500) this.history.shift(); // bounded history (no unbounded growth)
      return true;
    } else if (newScore < this.config.rollbackThreshold * currentScore) {
      // Rollback: fitness dropped too much
      this.rollbacks++;
      return false;
    } else {
      // Marginal degradation: keep for exploration
      this.metrics = newMetrics;
      this.history.push({ ...newMetrics });
      if (this.history.length > 500) this.history.shift(); // bounded history (no unbounded growth)
      return true;
    }
  }

  /**
   * Get current evolution metrics.
   */
  get _currentMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get evolution score (weighted combination of metrics).
   */
  get score(): number {
    return computeEvolutionScore(this.metrics);
  }

  /**
   * Get generation count.
   */
  get generationCount(): number {
    return this.generation;
  }

  /**
   * Get number of modifications applied.
   */
  get appliedCount(): number {
    return this.modificationsApplied;
  }

  /**
   * Get number of rollbacks.
   */
  get rollbackCount(): number {
    return this.rollbacks;
  }

  /**
   * Get evolution history.
   */
  getHistory(): EvolutionMetrics[] {
    return this.history.map((m) => ({ ...m }));
  }

  /**
   * Check if evolution has plateaued (no improvement in last N generations).
   */
  hasPlateaued(windowSize = 10, threshold = 0.001): boolean {
    if (this.history.length < windowSize) return false;
    const recent = this.history.slice(-windowSize);
    const scores = recent.map(computeEvolutionScore);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return max - min < threshold;
  }

  /**
   * Reset evolution to initial state.
   */
  reset(): void {
    this.metrics = { ...this.history[0]! };
    this.history = [{ ...this.history[0]! }];
    this.generation = 0;
    this.modificationsApplied = 0;
    this.rollbacks = 0;
  }
}

/**
 * Compute the evolution rate (improvement per generation).
 * Measures how fast the system is improving.
 */
export function computeEvolutionRate(loop: SelfEvolutionLoop, windowSize = 10): number {
  const history = loop.getHistory();
  if (history.length < 2) return 0;

  const recent = history.slice(-windowSize);
  if (recent.length < 2) return 0;

  const scores = recent.map(computeEvolutionScore);
  const first = scores[0] ?? 0;
  const last = scores[scores.length - 1] ?? 0;
  const generations = recent.length - 1;

  return generations > 0 ? (last - first) / generations : 0;
}
