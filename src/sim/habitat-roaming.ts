import { PLATFORM_HALF, PLATFORM_HEIGHT, PLATFORM_MID_Y } from './constants';

export interface MutableRoamPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Deterministic waypoint for one launched NHI — ADR 0016 social-contact law.
 * Prior Lissajous paths spread the swarm across the full ±PLATFORM_HALF disk so kin
 * almost never met. Band is now a mid-field social core (≈12–38% of half-extent) with
 * modest vertical weave so beings share airspace, form packs, and still roam.
 */
export function writeNhiRoamTarget<T extends MutableRoamPoint>(out: T, id: number, t: number): T {
  const ph = id * 1.7;
  // Inner social core: overlapping orbits so multiple NHIs share the same air volume.
  const rad = PLATFORM_HALF * (0.12 + (id % 5) * 0.052);
  // Slow pack-phase so neighboring ids drift together rather than anti-phase forever.
  const pack = Math.floor(id / 3) * 0.41;
  out.x = Math.cos(t * 0.19 + ph + pack) * rad;
  out.y = PLATFORM_MID_Y + Math.sin(t * 0.31 + ph) * PLATFORM_HEIGHT * 0.18;
  out.z = Math.sin(t * 0.23 + ph * 1.3 + pack) * rad;
  return out;
}
