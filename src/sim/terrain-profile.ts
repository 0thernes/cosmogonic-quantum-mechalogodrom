/**
 * Shared static terrain profile.
 *
 * EnvironmentSystem builds the displaced ground mesh from this function and AlienFlora
 * uses the same function to seat every plant. Keeping the CPU profile in one leaf module
 * prevents the visible soil and the vegetation collision/comfort surface from drifting.
 * The animated shader layers additional waves over this base at render time.
 */
import { ARENA, ARENA_Y, HABITAT_XZ_SCALE } from './constants';

/** World-space Y of the ground mesh origin before its local displacement. */
export const GROUND_BASE_Y = -10;

/**
 * Resolve the band-limited animated surface finely enough that analytically displaced flora roots
 * stay beneath the rendered ground triangles (4-unit cells across the 2,400-unit edge).
 */
export const GROUND_SEGMENTS = 300 * HABITAT_XZ_SCALE;

/** Preserve the former grid-cell spacing across the expanded ground. */
export const GROUND_GRID_DIVISIONS = 100 * HABITAT_XZ_SCALE;

/**
 * Static world-space terrain height at `(x,z)`.
 *
 * This is the exact CPU counterpart of the pre-existing PlaneGeometry displacement.
 * The plane is rotated −90° about X, hence the negative Z term in the second wave.
 */
export function baseTerrainHeightAt(x: number, z: number): number {
  return (
    GROUND_BASE_Y -
    3 +
    Math.sin((x * 0.06) / ARENA) * Math.cos((z * 0.05) / ARENA) * 4 * ARENA_Y +
    Math.sin((x * 0.2 - z * 0.15) / ARENA) * ARENA_Y
  );
}
