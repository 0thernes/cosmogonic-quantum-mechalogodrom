/**
 * RESONANCE INTEGRATOR — the coupling spark (faculty #59; binding #57; phase-coupling #25).
 *
 * The pre-mortem's #1 risk (docs/EMERGENCE-BLOCKERS.md #9 + #37) is *coupling > count*: a hundred
 * faculties that don't densely interact are a pile, not a mind. This module is the get-around — the
 * standing-wave that binds independent faculties into one integrated moment.
 *
 * The mechanism is the canonical NON-LLM binding-by-synchrony model: KURAMOTO coupled oscillators
 * (Kuramoto 1975; Strogatz 2000). Each faculty carries a phase on the shared thought-manifold; a
 * coupling term pulls phases toward agreement; the COLLECTIVE coherence (the Kuramoto order
 * parameter r ∈ [0,1]) measures how phase-locked the whole assembly is. When r crosses an ignition
 * threshold the faculties have fused into a standing wave — a bound, broadcastable "conscious-
 * candidate" moment (cf. GWT ignition + the binding problem, NEO-MIND-ARCHITECTURE §VI). The
 * broadcast CONTENT is then read out as a coherence-weighted consensus: only faculties in phase with
 * the collective contribute, so the integrated percept is what the assembly actually agrees on.
 *
 * PURE + deterministic: no rng draws, no Date.now, no DOM, no input mutation. It never touches the
 * seeded core stream (determinism-law-safe) and is fully unit-testable headlessly. A sim/super-mind
 * layer feeds it per-tick faculty phases + content vectors; the dynamics live here as pure functions.
 */

const TWO_PI = Math.PI * 2;

/** Coherence at/above which the assembly counts as bound/ignited (a standing wave, not a babble). */
export const RESONANCE_IGNITION_THRESHOLD = 0.7;

/** The Kuramoto order parameter: collective coherence `r` and collective phase `psi`. */
export interface OrderParameter {
  /** r ∈ [0,1] — 1 = perfect phase-lock (standing wave), 0 = incoherent (uniformly spread). */
  readonly r: number;
  /** psi ∈ (−π, π] — the mean/collective phase the assembly is locking toward (0 when empty). */
  readonly psi: number;
}

/**
 * KURAMOTO ORDER PARAMETER. `r·e^{iψ} = (1/N) Σ e^{iθⱼ}`. `r` is the binding coherence: identical
 * phases → 1, an even spread around the circle → 0. `psi` is the collective phase. Empty → {0, 0}.
 * Pure.
 */
export function kuramotoOrder(phases: readonly number[]): OrderParameter {
  const n = phases.length;
  if (n === 0) return { r: 0, psi: 0 };
  let sumCos = 0;
  let sumSin = 0;
  for (const theta of phases) {
    sumCos += Math.cos(theta);
    sumSin += Math.sin(theta);
  }
  const r = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / n;
  const psi = Math.atan2(sumSin, sumCos);
  return { r, psi };
}

/**
 * One Euler step of the KURAMOTO dynamics: `θᵢ ← θᵢ + dt·(ωᵢ + (K/N) Σⱼ sin(θⱼ − θᵢ))`. Natural
 * frequencies `omega` are each faculty's intrinsic rhythm; coupling `K > 0` pulls phases toward each
 * other (synchronisation), `K = 0` lets them drift independently, `K < 0` repels (desync). Returns a
 * NEW wrapped-to-(−π,π] phase array; inputs are not mutated. Missing `omega` entries default to 0.
 * Pure + deterministic. Iterating this with `K > 0` and identical `omega` drives the order parameter
 * toward 1 — the assembly self-organises into a standing wave.
 */
export function kuramotoStep(
  phases: readonly number[],
  omega: readonly number[],
  K: number,
  dt: number,
): number[] {
  const n = phases.length;
  const next = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const thetaI = phases[i] ?? 0;
    let coupling = 0;
    for (let j = 0; j < n; j++) {
      coupling += Math.sin((phases[j] ?? 0) - thetaI);
    }
    const dtheta = (omega[i] ?? 0) + (n > 0 ? (K / n) * coupling : 0);
    next[i] = wrapPhase(thetaI + dt * dtheta);
  }
  return next;
}

/** Wrap an angle into (−π, π]. Pure. */
export function wrapPhase(theta: number): number {
  let t = theta % TWO_PI;
  if (t <= -Math.PI) t += TWO_PI;
  else if (t > Math.PI) t -= TWO_PI;
  return t;
}

/**
 * Per-faculty COHERENCE WEIGHT with the collective phase: `(1 + cos(θᵢ − ψ)) / 2 ∈ [0,1]`. A faculty
 * exactly in phase with the assembly → 1 (full vote in the broadcast); in quadrature → 0.5;
 * anti-phase → 0 (silenced). This is how a standing wave gates what reaches the global workspace:
 * only the phase-locked contribute. Pure.
 */
export function coherenceWeights(phases: readonly number[], psi: number): number[] {
  return phases.map((theta) => (1 + Math.cos(theta - psi)) / 2);
}

/**
 * RESONANT CONSENSUS — the bound broadcast content. Given each faculty's content `vectors[i]` and the
 * current `phases`, returns the coherence-weighted mean vector (weights from {@link coherenceWeights}
 * against the collective phase). Faculties out of phase with the assembly are suppressed, so the
 * result is the integrated percept the phase-locked coalition agrees on — not a flat average of
 * everything. Ragged rows tolerated (missing entries = 0); zero total weight → zero vector. Pure.
 */
export function resonantConsensus(
  vectors: readonly (readonly number[])[],
  phases: readonly number[],
): number[] {
  const { psi } = kuramotoOrder(phases);
  const weights = coherenceWeights(phases, psi);
  let width = 0;
  for (const v of vectors) if (v.length > width) width = v.length;
  const acc = new Array<number>(width).fill(0);
  let wSum = 0;
  for (let i = 0; i < vectors.length; i++) {
    const w = weights[i] ?? 0;
    if (w <= 0) continue;
    wSum += w;
    const v = vectors[i] ?? [];
    for (let k = 0; k < width; k++) acc[k] = (acc[k] ?? 0) + w * (v[k] ?? 0);
  }
  if (wSum > 0) for (let k = 0; k < width; k++) acc[k] = (acc[k] ?? 0) / wSum;
  return acc;
}

/** The full integrated state of one resonance tick. */
export interface ResonanceState {
  /** Collective coherence r ∈ [0,1] — the standing-wave amplitude. */
  readonly order: number;
  /** Collective phase ψ the assembly is locked toward. */
  readonly phase: number;
  /** True when `order ≥ threshold`: the faculties are bound into a broadcastable moment. */
  readonly ignited: boolean;
  /** Per-faculty coherence with the collective (the broadcast gate). */
  readonly weights: number[];
  /** The coherence-weighted bound content (empty when no content vectors are supplied). */
  readonly consensus: number[];
}

/**
 * INTEGRATE — the resonance integrator in one call. Reads the assembly's faculty `phases` (and
 * optional per-faculty content `vectors`), measures the standing-wave coherence, decides ignition,
 * and reads out the bound broadcast content. This is the spark: the place where many independent
 * faculties become one integrated moment (or fail to, and stay a pile). Pure + deterministic.
 */
export function integrate(
  phases: readonly number[],
  vectors: readonly (readonly number[])[] = [],
  threshold: number = RESONANCE_IGNITION_THRESHOLD,
): ResonanceState {
  const { r, psi } = kuramotoOrder(phases);
  return {
    order: r,
    phase: psi,
    ignited: r >= threshold,
    weights: coherenceWeights(phases, psi),
    consensus: vectors.length > 0 ? resonantConsensus(vectors, phases) : [],
  };
}
