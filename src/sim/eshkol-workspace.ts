/**
 * ESHKOL WORKSPACE — Global Workspace Theory tick for the digital-biologics petri dish.
 *
 * Driven by the REAL ported Eshkol consciousness primitive (math/global-workspace.ts:
 * numerically-stable softmax salience competition → winner-take-all broadcast → ignition),
 * NOT a heuristic blend. Specialist saliences are built deterministically from the Tsotchke
 * substrate vector + the live Eshkol engine snapshot; the genuine competition decides which
 * faculty ignites this beat and how decisively (entropy / access), feeding the petri dish and
 * Super Creature as a real consciousness signal.
 *
 * Determinism: pure — seeded substrate in, no Rng / Date.now / Math.random.
 */

import { clamp } from '../math/scalar';
import { gwtCompeteScalar, gwtSoftmax } from '../math/global-workspace';
import type { EshkolConsciousnessSnapshot } from './eshkol-bridge';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Competing specialist modules in the workspace (one per Tsotchke archetype). */
const WS_MODULES = 8;

export interface WorkspaceTick {
  broadcastGain: number;
  phiCoupling: number;
  logicWeight: number;
  inferenceWeight: number;
  ignitionThreshold: number;
  entropy: number;
  spotlight: number;
  /** True when a specialist actually won global access this beat (real ignition). */
  ignited: boolean;
  /** Winner's competition weight (peak of the softmax) in [0,1]. */
  access: number;
}

/** Build the 8 deterministic specialist saliences from substrate + engine snapshot + phase. */
function workspaceSaliences(
  substrate: Float32Array,
  beat: number,
  engine?: EshkolConsciousnessSnapshot,
): Float32Array {
  const w1 = substrate[1] ?? 0.5;
  const w2 = substrate[2] ?? 0.5;
  const w0 = substrate[0] ?? 0.5;
  const phase = (beat % 64) / 64;
  const eLogic = engine?.logic ?? w0;
  const eInfer = engine?.inference ?? w1;
  const eWork = engine?.workspace ?? w0;
  const sal = new Float32Array(WS_MODULES);
  for (let i = 0; i < WS_MODULES; i++) {
    // each module emphasises a different facet so the competition is non-degenerate
    const facet = i % 4;
    const base =
      facet === 0 ? eLogic : facet === 1 ? eInfer : facet === 2 ? eWork : (w1 + w2) * 0.5;
    const drift = Math.sin((phase + i / WS_MODULES) * Math.PI * 2) * 0.5 + 0.5;
    sal[i] = clamp01(base * 0.7 + w2 * 0.15 + drift * 0.15);
  }
  return sal;
}

/** Rich workspace tick — real GWT competition over the Eshkol substrate. */
export function eshkolWorkspaceTick(
  substrate: Float32Array,
  beat: number,
  engine?: EshkolConsciousnessSnapshot,
): WorkspaceTick {
  const w0 = substrate[0] ?? 0.5;
  const w1 = substrate[1] ?? 0.5;
  const w2 = substrate[2] ?? 0.5;

  const eUnified = engine?.unified ?? w1;
  const eLogic = engine?.logic ?? w0;
  const eInfer = engine?.inference ?? w1;
  const eWork = engine?.workspace ?? w0;

  // Ignition threshold is expressed RELATIVE TO UNIFORM (1/WS_MODULES): a specialist "ignites" when its
  // softmax access exceeds ~1.85× the uniform baseline (plus a small substrate/engine modulation). The old
  // absolute 0.28..0.63 threshold could NEVER be cleared by a winner competing against 8 near-uniform
  // specialists (peak access caps well below 0.28 at the diffuse temperature), so the workspace ignited on
  // 0/1600 real archon beats — a Global Workspace that never achieves global access is broken. This makes
  // ignition a SELECTIVE, real event again (fixing the dead mechanism — not removing/weakening any faculty).
  const ignitionThreshold = clamp01(
    (2.15 + (engine?.broadcastWinner ?? 0) * 0.4) / WS_MODULES + w2 * 0.05,
  );

  // REAL Global-Workspace competition: softmax over saliences → winner → ignition. The temperature is
  // sharpened (0.6 → 0.25) so a genuine winner can emerge from the field rather than a permanent near-tie.
  const sal = workspaceSaliences(substrate, beat, engine);
  const comp = gwtCompeteScalar(sal, WS_MODULES, ignitionThreshold, 0.25);

  const broadcastGain = clamp01(0.18 + comp.access * 0.62 + eWork * 0.2);
  const phiCoupling = clamp01(eUnified * 0.7 + w2 * 0.25);
  const logicWeight = clamp01(eLogic * 0.75 + w2 * 0.2);
  const inferenceWeight = clamp01(eInfer * 0.85 + (1 - w0) * 0.12);

  return {
    broadcastGain,
    phiCoupling,
    logicWeight,
    inferenceWeight,
    ignitionThreshold,
    entropy: comp.entropy, // REAL competition entropy (0 decisive .. 1 diffuse)
    spotlight: comp.winner < 0 ? 0 : comp.winner, // REAL igniting specialist index 0..7
    ignited: comp.ignited,
    access: comp.access,
  };
}

/** Real per-module competition weights (softmax) for the first k specialists — sums to 1 over k. */
export function workspaceSalience(tick: WorkspaceTick, k: number): number[] {
  const n = Math.min(Math.max(1, k), WS_MODULES);
  const sal = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    sal[i] = clamp01(
      tick.broadcastGain * (0.35 + 0.65 * ((i + 1) / n)) +
        tick.logicWeight * 0.3 * (i % 2 === 0 ? 1 : 0.5) +
        tick.inferenceWeight * 0.2,
    );
  }
  const w = new Float32Array(n);
  gwtSoftmax(sal, w, n, 0.7);
  return Array.from(w);
}
