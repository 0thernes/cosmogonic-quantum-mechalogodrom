/**
 * Wilderness visual layer — intentionally a NO-OP.
 *
 * The old implementation drew additive rainbow square Points across the habitat as
 * "distant neural haze." That was pure decorative confetti (static dumb sparkles),
 * not load-bearing organism geometry. Removed per owner rule: no decorative BS.
 *
 * WildernessPopulation may still run for ADR 0010 worker offload / counts; it no
 * longer has a glitter sprite stand-in. Real entities remain the instanced fauna.
 */
import type * as THREE from 'three';
import type { WildernessPopulation } from './wilderness-population';

export class WildernessRenderer {
  constructor(_scene: THREE.Scene) {
    // Intentionally empty — no Points mesh, no scene attachment.
  }

  /** No visual sync. Population state is not mirrored to GPU confetti. */
  sync(_population: WildernessPopulation, _t: number): void {
    // no-op
  }

  dispose(): void {
    // no-op
  }
}
