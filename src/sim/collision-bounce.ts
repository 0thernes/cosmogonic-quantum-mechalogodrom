/**
 * COLLISION BOUNCE (V128, USER stage E) — the big solid bodies stop being ghosts: an organism that
 * penetrates one is EJECTED to its surface and RICOCHETS off it (a real elastic reflection of the
 * inward velocity component), instead of sliding through. Applied to the god-tier colliders the owner
 * named — the Super Creatures, the APEX, the Monolith Temple, the Tower — so the swarm visibly shakes
 * and bounces off them as they roam. The colliders are spheres (centre + radius) the world refills each
 * frame from those bodies' live positions.
 *
 * "Ragdoll" here = per-organism impulse response: on contact the body is shoved out along the surface
 * normal and its velocity is mirrored across it, scaled by {@link RESTITUTION} (a lively, not-quite-
 * elastic bounce). One collision per organism per frame (the first collider hit) keeps it cheap +
 * stable; the organism's own steering resumes next frame from the deflected state.
 *
 * DETERMINISM (ADR 0004): pure geometry + arithmetic on entity position/velocity — NO rng, no clock. A
 * world-level system (it never touches the bare-EntityManager golden trace), deterministic given the
 * collider positions (themselves deterministic). O(n · colliders) — colliders is a small handful.
 */
import type { EntityManager } from './entities';

/** A solid spherical body the swarm bounces off. */
export interface BounceCollider {
  x: number;
  y: number;
  z: number;
  /** Collision radius (organisms inside are ejected to this surface). */
  r: number;
}

/** Bounce liveliness: 1 = perfectly elastic, 0 = dead stop. 0.85 = a snappy, energetic ricochet. */
const RESTITUTION = 0.85;

export class CollisionBounce {
  /** Cumulative ricochets (telemetry / tests). */
  impacts = 0;

  /**
   * Eject + ricochet every organism that has penetrated a collider. `colliders` are live this frame.
   * Mutates entity position + velocity (userData.vel). Frozen dt = 0 ⇒ no-op. Returns impacts this frame.
   * O(n · colliders).
   */
  update(colliders: readonly BounceCollider[], entities: EntityManager, dt: number): number {
    if (dt <= 0 || colliders.length === 0) return 0;
    const list = entities.list;
    let hits = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      const p = e.position;
      for (let c = 0; c < colliders.length; c++) {
        const col = colliders[c]!;
        const dx = p.x - col.x;
        const dy = p.y - col.y;
        const dz = p.z - col.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const r = col.r;
        if (d2 >= r * r || d2 <= 1e-8) continue; // outside (or dead-centre — no defined normal)
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const nz = dz / d;
        // Eject to the surface.
        p.x = col.x + nx * r;
        p.y = col.y + ny * r;
        p.z = col.z + nz * r;
        // Ricochet: mirror the INWARD velocity component across the surface normal (a real bounce).
        const vel = e.userData.vel as { x: number; y: number; z: number } | undefined;
        if (vel) {
          const vn = vel.x * nx + vel.y * ny + vel.z * nz;
          if (vn < 0) {
            const j = (1 + RESTITUTION) * vn;
            vel.x -= j * nx;
            vel.y -= j * ny;
            vel.z -= j * nz;
          }
        }
        hits++;
        break; // one bounce per organism per frame — cheap + stable
      }
    }
    this.impacts += hits;
    return hits;
  }
}
