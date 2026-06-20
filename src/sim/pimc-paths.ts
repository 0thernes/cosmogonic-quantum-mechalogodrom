/**
 * PIMC PATHS — path-integral sampling from Tsotchke mirrors/PIMC.
 * Feynman path weight for quantum cloud trail metaphor. O(steps).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */
import type { Rng } from '../math/rng';

/** Single path action S = Σ (Δx²/2 + V(x)) for harmonic-ish potential. O(steps). */
export function pathAction(path: Float32Array, potential: (x: number) => number): number {
  let s = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i] ?? 0) - (path[i - 1] ?? 0);
    s += dx * dx * 0.5 + potential(path[i] ?? 0);
  }
  return s;
}

/** Metropolis accept for path segment (deterministic via Rng). O(1). */
export function pathMetropolisStep(
  oldAction: number,
  newAction: number,
  beta: number,
  rng: Rng,
): boolean {
  const dS = newAction - oldAction;
  if (dS <= 0) return true;
  return rng() < Math.exp(-beta * dS);
}

/** Sample weight exp(-βS) clamped. O(steps). */
export function pathWeight(
  path: Float32Array,
  beta: number,
  potential: (x: number) => number,
): number {
  const s = pathAction(path, potential);
  return Math.max(0, Math.min(1, Math.exp(-beta * s * 0.01)));
}
