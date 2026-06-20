/**
 * ASTEROIDS PHYSICS — arcade thrust/friction from Tsotchke mirrors/asteroids.
 * Wrap-space velocity for petri-dish perturbation (digital biologic motility seed).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

export interface AsteroidBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

/** O(1). Spawn body from seed. */
export function asteroidSpawn(seed: number): AsteroidBody {
  const s = (seed % 1000) / 1000;
  return {
    x: (s - 0.5) * 2,
    y: ((s * 7) % 1) - 0.5,
    vx: 0,
    vy: 0,
    angle: s * 6.2831853,
  };
}

/** O(1). Apply thrust along heading. */
export function asteroidThrust(b: AsteroidBody, power: number): void {
  b.vx += Math.cos(b.angle) * power;
  b.vy += Math.sin(b.angle) * power;
}

/** O(1). Integrate with friction and toroidal wrap. */
export function asteroidStep(b: AsteroidBody, dt: number, friction = 0.98): void {
  b.vx *= friction;
  b.vy *= friction;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x > 1) b.x -= 2;
  if (b.x < -1) b.x += 2;
  if (b.y > 1) b.y -= 2;
  if (b.y < -1) b.y += 2;
}

/** Kinetic energy proxy for colony motility coupling. O(1). */
export function asteroidEnergy(b: AsteroidBody): number {
  return Math.min(1, (b.vx * b.vx + b.vy * b.vy) * 4);
}
