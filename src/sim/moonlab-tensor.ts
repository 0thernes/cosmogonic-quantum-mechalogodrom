/**
 * MOONLAB TENSOR — MPO / tensor-network kernels from mirrors/moonlab.
 * Deterministic, prealloc-friendly contractions for SuperMind + world.
 */

import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Dot contraction with bond-dimension hint (contraction.c proxy). */
export function moonlabTensorContract(
  a: number[] | Float32Array,
  b: number[] | Float32Array,
  chi = 4,
): number {
  let s = 0;
  const n = Math.min(a.length, b.length, chi);
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s / (1 + chi * 0.01);
}

/** Qualia manifold contraction (tensor network on 3-vector). */
export function moonlabTensorQualia(v: number[], chi: number): number {
  if (v.length < 3) return 0;
  const s = v[0]! * v[1]! + v[1]! * v[2]! + v[2]! * v[0]!;
  return s / (1 + (chi || 4) * 0.02);
}

/** Single MPO sweep step (mirrors/moonlab MPO evolution). */
export function moonlabMpoStep(state: Float32Array, bond: number, chi = 4): number {
  let acc = 0;
  const lim = Math.min(state.length, chi);
  for (let i = 0; i < lim; i++) {
    const w = ((i % (bond || 2)) + 1) / (chi + 1);
    acc += (state[i] ?? 0) * w;
  }
  return acc / (1 + chi * 0.01);
}

/** Two-step MPO apply (left + right sweep) for entanglement proxy. */
export function moonlabMpoApply(state: Float32Array, bond: number, chi = 4): Float32Array {
  const out = new Float32Array(state.length);
  for (let i = 0; i < state.length; i++) {
    const left = moonlabMpoStep(state, bond, chi);
    const right = (state[i] ?? 0) * 0.5 + left * 0.5;
    out[i] = clamp01(right);
  }
  return out;
}

/** ULG browser triad handoff (ulg repo staged worker pattern). */
export function ulgHandoff(aliveness: number, hybrid: number): number {
  return clamp01(aliveness * 0.7 + hybrid * 0.3);
}
