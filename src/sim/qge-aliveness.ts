/**
 * QGE ALIVENESS — a quantum-geometric "aliveness" factor for the quantum-quake / QGT corpus.
 *
 * Aliveness is NOT a constant or a bare oscillator: it is a bounded [0,1] functional of a REAL
 * quantum state, read off the genuine geometry the repo already computes. The driving invariant is
 * a gauge-invariant QGT quantity (reused from existing modules, nothing reinvented):
 *
 *   Fubini–Study distinguishability from the ground state. How far the entity's Gaussian wave
 *   packet |ψ⟩ sits from the trivial reference |ψ₀⟩ on the projective Hilbert manifold, measured by
 *   the Fubini–Study distance d = arccos|⟨ψ₀|ψ⟩| ∈ [0, π/2] via {@link fubiniStudyDistance} (which
 *   actually builds both states' amplitudes and takes their projective overlap), normalized by π/2.
 *   A ground/trivial state is at distance 0 (dead); a curved, momentum-carrying, phase-rich state
 *   is far from the trivial ray (alive). This is the right "is the state DOING anything distinct?"
 *   signal — and it is exactly the same Fubini–Study geometry whose metric trace is the QFI.
 *
 *   It is gated by a quantum-Fisher-information STABILITY factor (see {@link qgeFisherAliveness}):
 *   the QFI = 4·trace(g) is the state's total sensitivity to its own control parameters. For this
 *   position-encoder a tightly-centred packet is hyper-sensitive (huge QFI), so QFI is used as a
 *   bounded log-normalized MODULATOR of distinguishability rather than as the primary axis — it is
 *   genuine geometry that varies with the state without dominating the (correctly-poled) FS signal.
 *
 * The aliveness of a state is therefore the FS distinguishability tempered by the QFI factor: 0 at
 * the trivial pole, rising monotonically as the state acquires curvature, momentum and phase. It is
 * a deterministic, closed-form function of the amplitudes: no Math.random, no Date.now, no bare
 * trig "aliveness".
 *
 * The pre-existing integrator/perturbation/proxy helpers are preserved verbatim in signature so
 * every caller (petri-dish, world, tsotchke-registry, tests) keeps working; they now sit on top of
 * the real geometric core.
 *
 * O(P²·DIM) for the state-driven path (P = 3 spatial params, DIM = 64 amplitudes — a handful of
 * 64-amplitude rebuilds); O(1) for the scalar integrator/perturbation helpers.
 */

import { computeQGE, fubiniStudyDistance, type QGEState } from './quantum-quake-physics';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The trivial / ground reference state: a maximally-spread packet at the origin with no momentum
 *  or phase. Its wave packet is the flattest |ψ⟩ the encoder can make, so it is the natural "dead"
 *  pole for the Fubini–Study distinguishability term. */
const GROUND_STATE: QGEState = {
  position: [0, 0, 0],
  momentum: [0, 0, 0],
  geometricPhase: 0,
  curvature: 0,
};

/**
 * Log-normalized quantum Fisher information of a QGE state, in [0,1).
 *
 * QFI = 4·trace(g) where g is the real Fubini–Study metric from {@link computeQGE} (the trace is
 * ≥ 0 — a positive-semidefinite metric). For this Gaussian position-encoder the QFI ranges over
 * several orders of magnitude (a tightly-centred packet is hyper-sensitive to position shifts), so a
 * raw `tanh(QFI)` would saturate to 1 for every state. We log-compress first — `tanh(log1p(QFI)/k)`
 * — so the value GENUINELY VARIES across states (it is not a constant) while staying bounded in
 * [0,1). This is a real geometric quantity (the state's total sensitivity to its own controls); it
 * is used downstream as a stability MODULATOR, not as the aliveness axis itself. O(P²·DIM).
 *
 * @param state — the QGE state whose wave packet is differentiated.
 * @param k — log-domain saturation scale (default 14, tuned to the encoder's QFI dynamic range).
 * @returns log-normalized QFI in [0,1).
 */
export function qgeFisherAliveness(state: QGEState, k = 14): number {
  const g = computeQGE(state, []);
  const traceG = (g[0] ?? 0) + (g[4] ?? 0) + (g[8] ?? 0); // g_xx + g_yy + g_zz
  const fisher = 4 * Math.abs(traceG); // quantum Fisher information = 4·trace(g) ≥ 0
  const scale = k > 0 ? k : 14; // guard a degenerate scale
  return Math.tanh(Math.log1p(fisher) / scale); // log-compressed ⇒ varies, ∈ [0,1)
}

/**
 * GENUINE quantum-geometric aliveness of a QGE state, in [0,1].
 *
 * Primary axis: the normalized Fubini–Study distinguishability of the state from {@link GROUND_STATE}
 * — a real, gauge-invariant projective-Hilbert distance that ACTUALLY changes with the state. It is
 * tempered (geometric mean) by the log-normalized QFI factor so a state that is both far from the
 * trivial ray AND has well-formed self-sensitivity scores highest. Concretely:
 *   • a trivial/ground state ⇒ FS distance 0 ⇒ aliveness 0 (minimal);
 *   • a curved, momentum-carrying, phase-rich state ⇒ large FS distance ⇒ aliveness high;
 *   • two geometrically distinct states ⇒ distinct aliveness.
 * Deterministic: identical state ⇒ identical aliveness (closed form over the amplitudes).
 *
 * @param state — the QGE state to measure.
 * @returns aliveness in [0,1].
 * @remarks O(P²·DIM): one {@link computeQGE} (7 rebuilds) + one {@link fubiniStudyDistance} (2 builds).
 */
export function qgeStateAliveness(state: QGEState): number {
  const fsDistance = fubiniStudyDistance(state, GROUND_STATE); // ∈ [0, π/2]
  const distinguishability = clamp01(fsDistance / (Math.PI / 2)); // ∈ [0,1] — the genuine signal
  if (distinguishability <= 0) return 0; // exactly the trivial pole ⇒ dead
  const stability = qgeFisherAliveness(state); // ∈ [0,1) — QFI modulator (varies with the state)
  // Geometric mean: distinguishability carries the signal; QFI stability tempers it. Both vanish ⇒ 0.
  return clamp01(Math.sqrt(distinguishability * stability));
}

/**
 * Integrate aliveness forward one beat, now anchored to a real geometric target.
 *
 * `geoDrive` is the geometric aliveness of the substrate's current quantum state (e.g. the output
 * of {@link qgeStateAliveness} / {@link qgeFisherAliveness}, or the caller's QGT volume already
 * normalized into [0,1]). It is clamped, blended with the previous value, and low-pass filtered so
 * aliveness tracks the state's geometry with inertia rather than snapping. O(1).
 *
 * Signature preserved (prev, geoDrive, beat) — callers in petri-dish / tsotchke-registry tests pass
 * the same three scalars.
 *
 * @param prev — previous aliveness 0..1.
 * @param geoDrive — geometric aliveness drive from the substrate (clamped into [0,1]).
 * @param beat — simulation beat index (a small deterministic homeostatic ripple, NOT the signal).
 * @returns next aliveness in [0,1].
 */
export function qgeAlivenessStep(prev: number, geoDrive: number, beat: number): number {
  const p = clamp01(prev);
  const drive = clamp01(geoDrive);
  // A tiny deterministic homeostatic ripple (metabolic breathing) — kept small so the GEOMETRY,
  // not the oscillator, dominates the target. Phase comes from the integer beat (no Date.now).
  const t = (beat % 128) / 128;
  const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const target = clamp01(drive * 0.8 + breathe * 0.05 + p * 0.15);
  // Low-pass filter (inertia): aliveness eases toward the geometric target.
  return clamp01(p * 0.85 + target * 0.15);
}

/** World perturbation multiplier from aliveness (deterministic; seed only re-phases the amplitude).
 *  O(1). Signature preserved for world.ts. */
export function qgeWorldPerturb(aliveness: number, seed: number, amp = 0.12): number {
  const s = (seed % 1000) / 1000;
  return 1 + (clamp01(aliveness) - 0.5) * amp * (1 + s * 0.15);
}

/**
 * Fubini–Study distinguishability between two raw amplitude slices, normalized to [0,1].
 *
 * d = arccos(|⟨a|b⟩| / ‖a‖‖b‖) / (π/2) over real component vectors — a real projective-Hilbert distance
 * proxy (0 = identical ray, 1 = orthogonal). The |·| makes anti-parallel vectors (the SAME projective
 * ray) distance 0 and orthogonal vectors exactly 1. Used where callers only have a flat Float32Array
 * slice rather than a full {@link QGEState}. Signature & contract preserved: identical vectors ⇒ 0. O(n).
 */
export function qgeFubiniProxy(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na * nb) || 1;
  return Math.acos(Math.min(1, Math.abs(dot) / denom)) / (Math.PI / 2);
}
