import { PLATFORM_HALF, PLATFORM_HEIGHT, PLATFORM_MID_Y } from './constants';

export interface MutableRoamPoint {
  x: number;
  y: number;
  z: number;
}

/** Deterministic expanded-volume waypoint for one launched NHI; writes into caller scratch. */
export function writeNhiRoamTarget<T extends MutableRoamPoint>(out: T, id: number, t: number): T {
  const ph = id * 1.7;
  const rad = PLATFORM_HALF * (2 / 9 + (id % 5) * (4 / 27));
  out.x = Math.cos(t * 0.19 + ph) * rad;
  out.y = PLATFORM_MID_Y + Math.sin(t * 0.31 + ph) * PLATFORM_HEIGHT * (5 / 13);
  out.z = Math.sin(t * 0.23 + ph * 1.3) * rad;
  return out;
}
