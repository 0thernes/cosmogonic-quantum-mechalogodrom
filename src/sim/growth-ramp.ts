/**
 * GROWTH RAMP (V121) — the pure math behind the live population target. Extracted from world.ts so
 * the ramp is unit-testable and re-anchorable: a GENESIS RESET rebases the ramp at the reset moment
 * with a base of ONE progenitor, so the population regrows slowly from a single organism instead of
 * snapping back to a high target (USER: reset → 1 entity, growth ALWAYS slow so devices keep up —
 * the CEILING is untouched, only the climb is gentle; slower ≠ capped).
 *
 * Deterministic: a pure function of elapsed-since-anchor (no rng), so the seeded golden and every
 * replay are unaffected. O(1).
 */

/** Seconds for the live target to ease from its base up to the tier ceiling. V121: 210 → 630 —
 *  3× gentler so CPU/GPU/RAM absorb the population climb without thermal spikes (USER directive).
 *  The ceiling itself is unchanged — the full mega-world is still reached, just not in a rush. */
export const GROWTH_RAMP_SECS = 630;

/** Once grown, the target BREATHES ±8% so the population fluctuates instead of pinning flat. */
const BREATHE_AMP = 0.08;
const BREATHE_RATE = 0.04;

/**
 * The live population target at `sinceAnchor` seconds after the last genesis (boot or reset):
 * smoothstep-eases from `base` up to `ceiling` over {@link GROWTH_RAMP_SECS}, then breathes ±8%.
 * Pure, deterministic, O(1). Clamps: base ≤ ceiling; negative elapsed treated as 0.
 */
export function growthTargetAt(sinceAnchor: number, base: number, ceiling: number): number {
  const el = sinceAnchor > 0 ? sinceAnchor : 0;
  const b = Math.min(Math.max(1, base), Math.max(1, ceiling));
  const c = Math.max(1, ceiling);
  const g = el >= GROWTH_RAMP_SECS ? 1 : el / GROWTH_RAMP_SECS;
  const ease = g * g * (3 - 2 * g); // smoothstep ramp
  const breathe = 1 - BREATHE_AMP * ease * (0.5 - 0.5 * Math.cos(el * BREATHE_RATE));
  return Math.round((b + (c - b) * ease) * breathe);
}
