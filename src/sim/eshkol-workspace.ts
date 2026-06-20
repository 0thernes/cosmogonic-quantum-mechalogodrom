/**
 * ESHKOL WORKSPACE — Global Workspace Theory tick distilled from Eshkol consciousness engine.
 * Broadcast gain + phi coupling for petri-dish / SuperMind GWT proxy. Deterministic, O(1).
 */

export interface WorkspaceTick {
  broadcastGain: number;
  phiCoupling: number;
  logicWeight: number;
  inferenceWeight: number;
  /** Global ignition threshold (0..1, when crossed triggers broadcast). */
  ignitionThreshold: number;
  /** Workspace entropy (0..1, measures diversity of active representations). */
  entropy: number;
  /** Attentional spotlight index (0..k-1, which slot wins broadcast). */
  spotlight: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * One workspace cycle from a 5-d substrate vector + beat index.
 * O(1).
 */
export function eshkolWorkspaceTick(substrate: Float32Array, beat: number): WorkspaceTick {
  const w0 = substrate[0] ?? 0.5;
  const w1 = substrate[1] ?? 0.5;
  const w2 = substrate[2] ?? 0.5;
  const phase = (beat % 64) / 64;
  const broadcastGain = clamp01(0.4 + w0 * 0.35 + Math.sin(phase * Math.PI * 2) * 0.1);
  const phiCoupling = clamp01(w1 * 0.6 + w2 * 0.2);
  const logicWeight = clamp01(w0 * 0.7 + w2 * 0.2);
  const inferenceWeight = clamp01(w1 * 0.8 + (1 - w0) * 0.1);
  const ignitionThreshold = clamp01(0.3 + w2 * 0.4);
  const entropy = clamp01(w0 * 0.3 + w1 * 0.4 + w2 * 0.3);
  const spotlight = Math.floor(phase * 8) % 8;
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

/** Salience vector for GWT broadcast from workspace tick. O(k), k≤8. */
export function workspaceSalience(tick: WorkspaceTick, k: number): number[] {
  const n = Math.min(Math.max(1, k), 8);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = tick.broadcastGain * (0.5 + ((i * tick.logicWeight) % 1) * 0.5);
    out.push(w);
  }
  return out;
}
