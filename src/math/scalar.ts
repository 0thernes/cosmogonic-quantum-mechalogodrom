/**
 * Scalar math helpers shared by every sim system.
 *
 * Port of the legacy math constants and helpers (legacy/cosmogonic-quantum-mechalogodrom.html
 * lines 142-151). The legacy `d2`/`d2xz` took vector objects; here they take scalar components so
 * this leaf module carries no three.js dependency and stays trivially testable under `bun test`.
 */

/** Full turn in radians (2π) — legacy `TAU=PI*2`. */
export const TAU = Math.PI * 2;

/** Linear interpolation from `a` to `b` by factor `t` (unclamped, like the legacy `lerp`). O(1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp `v` into `[lo, hi]`. O(1). */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Squared distance; avoids sqrt for threshold compares (legacy `d2`). O(1). */
export function dist2(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const x = ax - bx;
  const y = ay - by;
  const z = az - bz;
  return x * x + y * y + z * z;
}

/** Squared distance in the XZ plane; avoids sqrt for threshold compares (legacy `d2xz`). O(1). */
export function dist2XZ(ax: number, az: number, bx: number, bz: number): number {
  const x = ax - bx;
  const z = az - bz;
  return x * x + z * z;
}
