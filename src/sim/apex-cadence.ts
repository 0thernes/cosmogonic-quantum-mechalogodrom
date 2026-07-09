/**
 * APEX CADENCE — GOAL5 frame-budget helper for the 5 individuated SuperMinds.
 *
 * Contract: never run 5 full Tree-of-Thought minds on the same frame. One slot
 * takes the FULL pipeline; the other four run ECHO (1×1 imagination depth).
 * Round-robin by frame index so every Archon still gets a full beat every
 * APEX_INDIVIDUATED frames. Deterministic, allocation-free, pure.
 *
 * Measured intent (BENCHMARKS GOAL5): amortize ~1.99 ms full thinks so the
 * pantheon no longer burns ~9.77 ms / 5× full on a single rAF.
 */

export type ApexThinkMode = 'full' | 'echo';

/** Resolve full vs echo for archon `i` on simulation `frame`. */
export function apexThinkMode(frame: number, archonIdx: number, count: number): ApexThinkMode {
  const n = count > 0 ? count : 1;
  const f = frame >= 0 ? frame : 0;
  const i = ((archonIdx % n) + n) % n;
  return f % n === i ? 'full' : 'echo';
}

/** How many full thinks fire on a given frame (always 1 when count ≥ 1). */
export function apexFullThinksPerFrame(count: number): number {
  return count > 0 ? 1 : 0;
}
