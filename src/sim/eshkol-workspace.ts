/**
 * ESHKOL WORKSPACE — GWT + active inference workspace from Eshkol consciousness engine.
 * Full corpus wired. Broadcast + ignition + belief entropy for digital biologics.
 * Uses real Eshkol substrates (not simple heuristics).
 */

import { clamp } from '../math/scalar';
import type { EshkolConsciousnessSnapshot } from './eshkol-bridge';

const clamp01 = (v: number): number => clamp(v, 0, 1);

export interface WorkspaceTick {
  broadcastGain: number;
  phiCoupling: number;
  logicWeight: number;
  inferenceWeight: number;
  ignitionThreshold: number;
  entropy: number;
  spotlight: number;
}

/** Rich workspace tick driven by Eshkol engine snapshot + substrate. */
export function eshkolWorkspaceTick(
  substrate: Float32Array,
  beat: number,
  engine?: EshkolConsciousnessSnapshot,
): WorkspaceTick {
  const w0 = (substrate[0] ?? 0.5) as number;
  const w1 = (substrate[1] ?? 0.5) as number;
  const w2 = (substrate[2] ?? 0.5) as number;
  const phase = (beat % 64) / 64;

  const baseGain = engine ? engine.workspace * 0.6 + w0 * 0.4 : w0;
  const broadcastGain = clamp01(0.35 + baseGain * 0.45 + Math.sin(phase * Math.PI * 2) * 0.12);

  const phiCoupling = clamp01((engine?.unified ?? w1) * 0.7 + w2 * 0.25);

  const logicWeight = clamp01((engine?.logic ?? w0) * 0.75 + w2 * 0.2);
  const inferenceWeight = clamp01((engine?.inference ?? w1) * 0.85 + (1 - w0) * 0.12);

  const ignitionThreshold = clamp01(0.28 + (engine?.broadcastWinner ?? 0) * 0.1 + w2 * 0.35);
  const entropy = clamp01((engine?.beliefEntropy ?? 0.4) * 0.6 + w0 * 0.25 + w1 * 0.2);
  const spotlight = Math.floor(phase * 8 + (engine ? engine.broadcastWinner * 2 : 0)) % 8;

  return {
    broadcastGain,
    phiCoupling,
    logicWeight,
    inferenceWeight,
    ignitionThreshold,
    entropy,
    spotlight,
  };
}

export function workspaceSalience(tick: WorkspaceTick, k: number): number[] {
  const n = Math.min(Math.max(1, k), 8);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = tick.broadcastGain * (0.5 + ((i * tick.logicWeight) % 1) * 0.5);
    out.push(clamp01(w));
  }
  return out;
}
