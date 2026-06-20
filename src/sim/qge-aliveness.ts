/**
 * QGE ALIVENESS — quantum-geometric aliveness factor from quantum-quake / QGT / PINN / PIMC corpus.
 * Perturbs physics and petri-dish growth deterministically. O(1).
 */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Integrate aliveness forward one beat. O(1).
 * @param prev — previous aliveness 0..1
 * @param geoDrive — geometric tensor drive from substrate
 * @param beat — simulation beat index
 */
export function qgeAlivenessStep(prev: number, geoDrive: number, beat: number): number {
  const t = (beat % 128) / 128;
  const oscillation = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const target = clamp01(geoDrive * 0.6 + oscillation * 0.25 + prev * 0.15);
  return clamp01(prev * 0.85 + target * 0.15);
}

/** World perturbation multiplier from aliveness. O(1). */
export function qgeWorldPerturb(aliveness: number, seed: number, amp = 0.12): number {
  const s = (seed % 1000) / 1000;
  return 1 + (aliveness - 0.5) * amp * (1 + s * 0.15);
}

/** Fubini–Study inspired distance proxy between two state slices. O(n), n small. */
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
  return Math.acos(Math.min(1, Math.max(-1, dot / denom))) / Math.PI;
}
