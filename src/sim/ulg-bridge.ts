/**
 * ULG BRIDGE — browser triad handoff from Tsotchke-Corporation/ulg.
 * Eshkol + Moonlab + PeerCompute closure registry patterns (deterministic scalar).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** Triad handoff: aliveness × hybrid closure sample. O(1). */
export function ulgTriadHandoff(eshkol: number, moonlab: number, aliveness: number): number {
  return (aliveness * 0.5 + eshkol * 0.25 + moonlab * 0.25) % 1;
}

/** Field sample at position (WebGPU carrier proxy). O(1). */
export function ulgFieldSample(x: number, y: number, z: number, tick: number): number {
  const phase = (x * 0.31 + y * 0.17 + z * 0.23 + tick * 0.01) % 1;
  return 0.5 + 0.5 * Math.sin(phase * 6.2831853);
}

/** Worker tree depth proxy for observatory cadence. O(1). */
export function ulgWorkerDepth(tick: number, workers: number): number {
  return ((tick % Math.max(1, workers)) + 1) / Math.max(1, workers);
}

/** Corpus resonance scalar for observatory / petri telemetry. O(1). */
export function ulgCorpusResonance(eshkol: number, moonlab: number, aliveness: number): number {
  const v = aliveness * 0.5 + eshkol * 0.3 + moonlab * 0.2;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
