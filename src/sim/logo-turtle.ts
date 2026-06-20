/**
 * LOGO TURTLE — morphogenesis trace from Tsotchke mirrors/logo-lab.
 * Deterministic turtle graphics for petri-dish / primordial-soup hue & symmetry seeds.
 * NOT LLM — geometric life-form sketching. MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

export interface TurtleState {
  x: number;
  y: number;
  heading: number;
  penDown: boolean;
}

/** O(1). Init turtle at origin facing up (radians). */
export function turtleNew(seed: number): TurtleState {
  const s = (seed % 997) / 997;
  return { x: 0, y: 0, heading: s * 6.2831853, penDown: true };
}

/** O(1). Forward step along heading. */
export function turtleForward(t: TurtleState, dist: number): void {
  t.x += Math.cos(t.heading) * dist;
  t.y += Math.sin(t.heading) * dist;
}

/** O(1). Turn by delta radians. */
export function turtleTurn(t: TurtleState, delta: number): void {
  t.heading = (t.heading + delta) % 6.2831853;
}

/**
 * One logo-lab beat: star polygon trace → morph scalar [0,1].
 * Used to bias soup hue/symmetry without heap allocation.
 */
export function logoMorphScalar(t: TurtleState, beat: number, sides: number): number {
  const n = Math.max(3, Math.min(12, sides | 0));
  const step = (6.2831853 / n) * 0.35;
  turtleForward(t, 0.08 + (beat % 7) * 0.01);
  turtleTurn(t, step);
  const r = Math.sqrt(t.x * t.x + t.y * t.y);
  return Math.max(0, Math.min(1, r * 0.15 + Math.abs(Math.sin(t.heading + beat * 0.02)) * 0.4));
}

/** Symmetry order from turtle closure (logo-lab mobius baseline). O(1). */
export function logoSymmetryOrder(t: TurtleState, maxOrder: number): number {
  const wrap = Math.abs(Math.sin(t.heading * 2));
  return 1 + Math.floor(wrap * Math.max(1, maxOrder - 1));
}
