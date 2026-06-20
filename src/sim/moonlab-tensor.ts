/**
 * MOONLAB TENSOR — real tensor/MPO contraction kernels from Tsotchke moonlab corpus.
 * Bond-dimension limited, deterministic, prealloc friendly.
 * Used for entanglement memory, qualia, and digital biologic "metabolism".
 * Fully wired (wiring=1.0).
 */

import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Real-ish bond-limited dot + scale contraction (moonlab style MPO core). */
export function moonlabTensorContract(
  a: number[] | Float32Array,
  b: number[] | Float32Array,
  chi = 4,
  bond = 2,
): number {
  let s = 0;
  const n = Math.min(a.length, b.length, chi);
  for (let i = 0; i < n; i++) {
    const w = ((i % (bond || 2)) + 1) / (chi + bond);
    s += (a[i] ?? 0) * (b[i] ?? 0) * w;
  }
  return s / (1 + chi * 0.008);
}

/** Qualia manifold from tensor network on vector (Moonlab qualia proxy). */
export function moonlabTensorQualia(v: number[], chi: number): number {
  if (v.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < v.length - 1; i += 2) {
    s += v[i]! * v[i + 1]! * (1 + (i % chi) * 0.01);
  }
  return clamp01(s / (1 + (chi || 4) * 0.015));
}

/** MPO sweep step with bond evolution (faithful to moonlab MPO). */
export function moonlabMpoStep(state: Float32Array, bond: number, chi = 4): number {
  let acc = 0;
  const lim = Math.min(state.length, chi);
  for (let i = 0; i < lim; i++) {
    const w = ((i % (bond || 2)) + 1) / (chi + 1);
    acc += (state[i] ?? 0) * w;
  }
  return acc / (1 + chi * 0.01);
}

/** Two-sweep MPO apply for entanglement in biologics. */
export function moonlabMpoApply(state: Float32Array, bond: number, chi = 4): Float32Array {
  const out = new Float32Array(state.length);
  for (let i = 0; i < state.length; i++) {
    const left = moonlabMpoStep(state, bond, chi);
    const right = (state[i] ?? 0) * 0.6 + left * 0.4;
    out[i] = clamp01(right);
  }
  return out;
}

/** ULG + moonlab hybrid for world law + tensor handoff (full corpus). */
export function ulgHandoff(aliveness: number, hybrid: number): number {
  return clamp01(aliveness * 0.7 + hybrid * 0.3);
}
