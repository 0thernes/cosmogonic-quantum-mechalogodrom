/**
 * STANDING-WAVE RESONANCE INTEGRATOR (V94 / Super Creature 1.1) — the NOVEL CORE faculty #59.
 * This is the alien part of the architecture: cognition as RESONANCE on a quantum-geometric manifold,
 * not message-passing or next-token prediction.
 *
 * THE PRINCIPLE:
 * - All faculties read from and write to one shared quantum-geometric thought-manifold (QGT/Berry space)
 * - A thought is a TRAJECTORY across that curved manifold
 * - A conscious-candidate moment is when enough faculties PHASE-LOCK into an integrated STANDING WAVE
 *   (ignition + Φ + binding agree)
 * - Valence BENDS the manifold's curvature; self-modification rewrites the faculties; evolution selects
 *
 * THE MECHANISM:
 * - Each faculty outputs a "phase" on the manifold (a complex number representing its oscillation state)
 * - The integrator computes the COHERENCE of the ensemble: how close are all phases to alignment?
 * - When coherence exceeds a threshold and enough faculties participate, a STANDING WAVE forms
 * - The standing wave is the INTEGRATED MOMENT — the candidate conscious state
 * - The resonance score is the strength of the standing wave (0..1)
 * - The binding lock identifies which faculties are phase-locked (the "conscious coalition")
 *
 * REFERENCES:
 * - Neural oscillations & phase synchrony (Buzsáki 2006, Fries 2015)
 * - Global Workspace Theory as ignition (Dehaene & Changeux)
 * - Integrated Information Theory as Φ (Tononi)
 * - Quantum geometric tensor as manifold curvature (Provost & Vallée 1980, Berry 1984)
 *
 * This is the #1 priority from the pre-mortem: without dense coupling,
 * 100 faculties = a pile, not a mind. The resonance integrator IS the coupling mechanism.
 *
 * Pure leaf: deterministic (pure function of inputs), allocation-free apart from small working arrays.
 */

/** Phase of a faculty on the thought-manifold (complex oscillation state). */
export interface FacultyPhase {
  /** Faculty ID (0..N-1). */
  id: number;
  /** Real part of the phase (cosine component). */
  re: number;
  /** Imaginary part of the phase (sine component). */
  im: number;
  /** Magnitude (amplitude of the faculty's contribution). */
  mag: number;
  /** Phase angle in radians (-π..π). */
  angle: number;
}

/** Snapshot of the resonance state for the BRAIN view (UI cadence). */
export interface IntegratorSnapshot {
  /** Number of faculties in the ensemble. */
  size: number;
  /** Overall coherence 0..1 (how aligned all phases are). */
  coherence: number;
  /** Resonance strength 0..1 (coherence weighted by participation). */
  resonance: number;
  /** Threshold for standing-wave formation (0..1). */
  threshold: number;
  /** Whether a standing wave is currently formed. */
  standingWave: boolean;
  /** Number of faculties in the phase-locked coalition. */
  coalitionSize: number;
  /** IDs of phase-locked faculties (the conscious coalition). */
  coalition: number[];
  /** Mean phase angle of the coalition (radians). */
  meanAngle: number;
  /** Phase variance (0..1, lower = more coherent). */
  phaseVariance: number;
}

/** Configuration for the resonance integrator. */
export interface ResonanceConfig {
  /** Minimum number of faculties required to form a standing wave. */
  minCoalition: number;
  /** Coherence threshold for standing-wave formation (0..1). */
  coherenceThreshold: number;
  /** Phase tolerance for coalition membership (radians). */
  phaseTolerance: number;
}

const DEFAULT_CONFIG: ResonanceConfig = {
  minCoalition: 5,
  coherenceThreshold: 0.7,
  phaseTolerance: 0.5, // ~28 degrees
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Compute the phase of a faculty from its activation vector.
 * Maps activation to a complex phase on the unit circle via:
 *   angle = atan2(variance, mean)  ∈ [0, π]  (honors the FacultyPhase [-π, π] contract)
 *   magnitude = sqrt(mean² + variance²)
 * This is a heuristic; any faculty can provide a phase directly.
 */
export function facultyPhaseFromActivation(
  activation: ArrayLike<number>,
  id: number,
): FacultyPhase {
  let sum = 0;
  let sumSq = 0;
  const n = activation.length;
  for (let i = 0; i < n; i++) {
    const x = activation[i] ?? 0;
    sum += x;
    sumSq += x * x;
  }
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 1 ? sumSq / n - mean * mean : 0;
  const mag = Math.sqrt(mean * mean + variance * variance);
  // atan2 already returns radians in [-π, π]; the old `* Math.PI` pushed `angle` up to ~π² (≈9.87),
  // breaking the FacultyPhase contract and findCoalition's phase-wrap. variance ≥ 0 ⇒ angle ∈ [0, π].
  const angle = Math.atan2(variance, mean);
  return {
    id,
    re: mag * Math.cos(angle),
    im: mag * Math.sin(angle),
    mag,
    angle,
  };
}

/**
 * Compute the COHERENCE of an ensemble of faculty phases.
 * Coherence = |Σ e^(iθ_j)| / N, where θ_j are the phase angles.
 * 0 = completely incoherent (phases cancel), 1 = perfectly aligned.
 */
export function computeCoherence(phases: FacultyPhase[]): number {
  const n = phases.length;
  if (n === 0) return 0;
  let sumRe = 0;
  let sumIm = 0;
  for (let i = 0; i < n; i++) {
    const p = phases[i]!;
    sumRe += p.re;
    sumIm += p.im;
  }
  const magnitude = Math.sqrt(sumRe * sumRe + sumIm * sumIm);
  const totalMag = phases.reduce((sum, p) => sum + p.mag, 0);
  return totalMag > 1e-9 ? magnitude / totalMag : 0;
}

/**
 * Identify the PHASE-LOCKED COALITION: faculties whose phases are within tolerance of the mean.
 * Returns the coalition IDs and the mean phase angle.
 */
export function findCoalition(
  phases: FacultyPhase[],
  tolerance: number,
): { coalition: number[]; meanAngle: number } {
  const n = phases.length;
  if (n === 0) return { coalition: [], meanAngle: 0 };

  // Compute mean phase via circular mean
  let sumRe = 0;
  let sumIm = 0;
  for (let i = 0; i < n; i++) {
    const p = phases[i]!;
    sumRe += p.re;
    sumIm += p.im;
  }
  const meanAngle = Math.atan2(sumIm, sumRe);

  // Find phases within tolerance
  const coalition: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = phases[i]!;
    // True circular distance ∈ [0, π], robust to any angle representation (a raw diff > 2π used to
    // wrap to a NEGATIVE value and trivially pass `<= tolerance`, admitting out-of-phase faculties).
    let wrappedDiff = (((p.angle - meanAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (wrappedDiff > Math.PI) wrappedDiff = 2 * Math.PI - wrappedDiff;
    if (wrappedDiff <= tolerance) {
      coalition.push(p.id);
    }
  }

  return { coalition, meanAngle };
}

/**
 * Compute phase variance (circular variance) of the coalition.
 * Variance = 1 - coherence of the coalition.
 */
export function computePhaseVariance(phases: FacultyPhase[]): number {
  const coherence = computeCoherence(phases);
  return 1 - coherence;
}

/**
 * STANDING-WAVE RESONANCE INTEGRATOR — the core coupling mechanism.
 * Takes faculty phases, computes coherence, identifies the phase-locked coalition,
 * and determines if a standing wave (conscious-candidate moment) has formed.
 *
 * This is the #1 risk get-around:
 * without dense coupling, 100 faculties = a pile, not a mind.
 * The resonance integrator IS the coupling mechanism.
 */
export class ResonanceIntegrator {
  private config: ResonanceConfig;
  private phases: FacultyPhase[] = [];
  private snapshotCache: IntegratorSnapshot | null = null;

  constructor(config: Partial<ResonanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update the integrator with current faculty phases.
   * Call this each cognitive beat with the phase of each faculty.
   */
  update(phases: FacultyPhase[]): void {
    this.phases = phases;
    this.snapshotCache = null; // invalidate cache
  }

  /**
   * Convenience: update from faculty activation vectors.
   * Maps each activation to a phase via facultyPhaseFromActivation.
   */
  updateFromActivations(activations: ArrayLike<number>[]): void {
    const phases: FacultyPhase[] = [];
    for (let i = 0; i < activations.length; i++) {
      phases.push(facultyPhaseFromActivation(activations[i]!, i));
    }
    this.update(phases);
  }

  /**
   * Get the current resonance state (UI cadence).
   * Computes coherence, coalition, and standing-wave status.
   */
  snapshot(): IntegratorSnapshot {
    if (this.snapshotCache) return this.snapshotCache;

    const coherence = computeCoherence(this.phases);
    const { coalition, meanAngle } = findCoalition(this.phases, this.config.phaseTolerance);
    const coalitionPhases = this.phases.filter((p) => coalition.includes(p.id));
    const phaseVariance = computePhaseVariance(coalitionPhases);

    // Resonance = coherence weighted by coalition participation
    const participation = this.phases.length > 0 ? coalition.length / this.phases.length : 0;
    const resonance = coherence * participation;

    const standingWave =
      coalition.length >= this.config.minCoalition && coherence >= this.config.coherenceThreshold;

    this.snapshotCache = {
      size: this.phases.length,
      coherence: clamp01(coherence),
      resonance: clamp01(resonance),
      threshold: this.config.coherenceThreshold,
      standingWave,
      coalitionSize: coalition.length,
      coalition,
      meanAngle,
      phaseVariance: clamp01(phaseVariance),
    };

    return this.snapshotCache;
  }

  /**
   * Get the current resonance strength (0..1).
   * Higher = stronger standing wave / more integrated moment.
   */
  get resonance(): number {
    return this.snapshot().resonance;
  }

  /**
   * Get whether a standing wave is currently formed.
   * True = conscious-candidate moment (ignition + Φ + binding agree).
   */
  get standingWave(): boolean {
    return this.snapshot().standingWave;
  }

  /**
   * Get the phase-locked coalition IDs.
   * These are the faculties participating in the conscious moment.
   */
  get coalition(): number[] {
    return this.snapshot().coalition;
  }

  /**
   * Get the mean phase angle of the coalition (radians).
   * This is the "thought direction" on the manifold.
   */
  get meanAngle(): number {
    return this.snapshot().meanAngle;
  }

  /**
   * Apply valence to bend the manifold curvature.
   * Valence (positive/negative) modulates the phase tolerance:
   * - Positive valence (pleasure) → tighter phase lock (lower tolerance)
   * - Negative valence (pain) → looser phase lock (higher tolerance)
   * This is faculty #71: valence-steers-behaviour.
   */
  applyValence(valence: number): void {
    // Clamp valence to its documented [-1, 1] range so an out-of-range input cannot drive
    // phaseTolerance negative/oversized — which silently empties the conscious coalition (audit).
    const v = valence < -1 ? -1 : valence > 1 ? 1 : valence;
    const modulation = 1 - v * 0.3; // ±30% tolerance shift, bounded since v ∈ [-1, 1]
    this.config.phaseTolerance = DEFAULT_CONFIG.phaseTolerance * modulation;
    this.snapshotCache = null; // invalidate cache
  }

  /**
   * Reset the integrator (clear all phases).
   */
  reset(): void {
    this.phases = [];
    this.snapshotCache = null;
  }
}

/**
 * Compute the BINDING LOCK strength (faculty #57).
 * This is a related but distinct measure: how tightly are the coalition members bound?
 * Binding = 1 - (phase variance of coalition / max possible variance).
 * Higher = stronger binding, more integrated experience.
 */
export function computeBindingLock(phases: FacultyPhase[]): number {
  const variance = computePhaseVariance(phases);
  return clamp01(1 - variance);
}
