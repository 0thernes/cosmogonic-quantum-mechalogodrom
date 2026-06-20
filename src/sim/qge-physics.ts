/**
 * QGE PHYSICS — quantum-quake / Quantum Game Engine aliveness from
 * mirrors/quantum-quake. Hybrid classical-quantum vitality for world + body.
 */

import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** QGE aliveness blend (quake + geometric energy). */
export function quakeQgeFactor(quake: number, geo: number): number {
  return clamp01(0.5 + (quake + geo) * 0.25);
}

/** Deterministic perturbation multiplier for world physics/economy. */
export function quakePerturb(quakeAliveness: number, seed: number, amp = 0.15): number {
  const s = (seed % 1000) / 1000;
  return 1 + (quakeAliveness - 0.5) * amp * (1 + s * 0.2);
}

/** Hybrid energy for primordial soup catalysis. */
export function qgeHybridEnergy(quake: number, tensorFlux: number, consciousness: number): number {
  return clamp01(quake * 0.4 + tensorFlux * 0.35 + consciousness * 0.25);
}

/** World pull modulation from QGE (gravity-well proxy). */
export function qgePullMod(basePull: number, aliveness: number, phase: number): number {
  return clamp01(basePull + aliveness * 0.12 * Math.sin(phase * 6.28318530718));
}
