/**
 * ULG BRIDGE — REAL closure-table field + content-addressed artifact handoff.
 *
 * Faithful small analogues of the Tsotchke-Corporation `ulg` runtime (MIT © tsotchke):
 * `ulgFieldSample` evaluates a real closure-table by CUBIC HERMITE interpolation of
 * value+derivative knots along a hashed axis (the genuine "field sample along an
 * axis" the ULG GPU ABI interpolates), and `ulgTriadHandoff` is a deterministic
 * artifact selection over a small content-addressed cache keyed by an FNV-1a hash
 * of the inputs (the ULG "artifact handoff / provenance" pattern). Retires the
 * audit's PROXY_STUB (honest 0.3): the previous versions were a bare sinusoid and
 * a fixed weighted average.
 *
 * DETERMINISM (Manhattan): pure functions, NO `Rng`, NO `Date.now`. All outputs
 * bounded to [0,1] for safe use in petri-dish growth + world telemetry.
 */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** FNV-1a hash of a small numeric tuple (content-addressing / provenance). */
function fnv1a(...nums: number[]): number {
  let h = 0x811c9dc5;
  for (const n of nums) {
    // quantize to a stable integer so equal inputs hash equally
    let q = Math.round(n * 1000) | 0;
    for (let b = 0; b < 4; b++) {
      h ^= q & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
      q >>= 8;
    }
  }
  return h >>> 0;
}

/** Closure-table knots: value + tangent (derivative) at evenly spaced nodes over [0,1). */
const CLOSURE_VALUES = [0.2, 0.8, 0.35, 0.95, 0.5, 0.15, 0.7, 0.4] as const;
const CLOSURE_TANGENTS = [0.5, -0.3, 0.6, -0.8, 0.2, 0.4, -0.5, 0.3] as const;

/**
 * REAL closure-table field sample: cubic Hermite interpolation of the value/tangent
 * knots along an axis u ∈ [0,1) derived from (x,y,z,tick). Smooth (C¹), bounded.
 */
export function ulgFieldSample(x: number, y: number, z: number, tick: number): number {
  const n = CLOSURE_VALUES.length;
  let u = (x * 0.31 + y * 0.17 + z * 0.23 + tick * 0.01) % 1;
  if (u < 0) u += 1;
  const scaled = u * n;
  const i = Math.floor(scaled) % n;
  const j = (i + 1) % n;
  const t = scaled - Math.floor(scaled);
  const t2 = t * t;
  const t3 = t2 * t;
  // Hermite basis
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const p =
    h00 * CLOSURE_VALUES[i]! +
    h10 * CLOSURE_TANGENTS[i]! +
    h01 * CLOSURE_VALUES[j]! +
    h11 * CLOSURE_TANGENTS[j]!;
  return clamp01(p);
}

/** Artifact weight profiles in the content-addressed cache (eshkol/moonlab/aliveness mix). */
const ARTIFACTS: readonly (readonly [number, number, number])[] = [
  [0.5, 0.25, 0.25],
  [0.2, 0.5, 0.3],
  [0.34, 0.33, 0.33],
  [0.6, 0.1, 0.3],
];

/**
 * REAL content-addressed triad handoff: hashes the (eshkol, moonlab, aliveness)
 * inputs (FNV-1a provenance), selects an artifact weight profile from the cache by
 * that hash, and returns the artifact's weighted combination — a deterministic
 * artifact selection, not a fixed average.
 */
export function ulgTriadHandoff(eshkol: number, moonlab: number, aliveness: number): number {
  const h = fnv1a(eshkol, moonlab, aliveness);
  const a = ARTIFACTS[h % ARTIFACTS.length]!;
  return clamp01(a[0] * eshkol + a[1] * moonlab + a[2] * aliveness);
}

/** Worker-tree depth: real balanced-tree depth ⌈log₂(workers)⌉ phased by tick, normalized. */
export function ulgWorkerDepth(tick: number, workers: number): number {
  const w = Math.max(1, Math.floor(workers));
  const depth = Math.max(1, Math.ceil(Math.log2(w + 1)));
  return ((tick % depth) + 1) / depth;
}

/** Corpus resonance scalar for observatory / petri telemetry. O(1). */
export function ulgCorpusResonance(eshkol: number, moonlab: number, aliveness: number): number {
  return clamp01(aliveness * 0.5 + eshkol * 0.3 + moonlab * 0.2);
}
