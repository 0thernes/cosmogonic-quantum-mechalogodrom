/**
 * LIBIRREP SYMMETRY — representation-theory helpers from mirrors/libirrep.
 * SO(3)/SU(2) inspired modulation for Archon morphology (equivariant parts).
 */

/** Modulate appendage count by irrep degree (Clebsch–Gordan style weighting). */
export function libirrepSymmetry(irrepDeg: number, baseCount: number): number {
  return Math.max(1, Math.floor(baseCount * (1 + (irrepDeg % 5) * 0.1)));
}

/** Clebsch–Gordan coupling stub (clebsch_gordan.h inspiration). */
export function libirrepClebsch(j1: number, j2: number, m: number): number {
  return ((j1 + j2 + m) % 5) + 1;
}

/** Wigner D-matrix angle offset for equivariant part placement. */
export function libirrepWigner(irrepDeg: number, idx: number, base: number): number {
  const d = (irrepDeg % 5) + 1;
  return base + ((idx * d) % 7) * 0.07 * ((irrepDeg % 3) - 1);
}

/** SU(2) spin-j dimension: 2j+1 (for symmetry capacity planning). */
export function su2Dimension(j: number): number {
  return Math.max(1, 2 * Math.floor(j) + 1);
}

/** Symmetry-breaking factor for chaos Archons (higher j → more modes). */
export function symmetryModes(irrepDeg: number, chaos: number): number {
  return Math.floor(su2Dimension(irrepDeg) * (0.5 + chaos * 0.5));
}
