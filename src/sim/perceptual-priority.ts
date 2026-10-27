/**
 * Phase 1.3: Perceptual Priority Cascades
 *
 * DISABLED DUE TO QUALITY REGRESSION
 *
 * Distance-based entity evaluation prioritization was causing significant
 * quality degradation in rendering, colors, and FPS. The tiered evaluation
 * system was reducing update frequency for far entities, making them appear
 * low-detail and "shitty" even at close range.
 *
 * Current state: ALL entities are evaluated every frame to maintain original
 * buttery smooth quality, high detail, and vibrant colors.
 *
 * Original design (disabled):
 * - Distance-based entity evaluation prioritization to reduce neural compute load
 * - Entities sorted by distance to camera and evaluated at different frequencies
 * - Tiers: Near (full every frame), Mid (every Nth frame), Far (every Mth frame with hive mind)
 *
 * Quality-tier-specific schemes (disabled):
 * - Desktop: 100/5,000/45,000 split (near/mid/far)
 * - Tablet: 50/2,000/7,950 split
 * - Mobile: 20/500/480 split
 */
import * as THREE from 'three';
import type { Entity } from '../types';
import type { QualityTier } from '../types';

/** Priority tier configuration */
export interface PriorityTier {
  /** Maximum number of entities in this tier */
  capacity: number;
  /** Evaluation frequency (every Nth frame) */
  frequency: number;
  /** Whether to use stochastic hive mind */
  useHiveMind: boolean;
}

/** Priority scheme for a quality tier */
export interface PriorityScheme {
  near: PriorityTier;
  mid: PriorityTier;
  far: PriorityTier;
}

/** Distance-sorted entity with priority tier */
export interface PrioritizedEntity {
  entity: Entity;
  index: number;
  distance: number;
  tier: 'near' | 'mid' | 'far';
}

/** Priority tier configurations by quality tier */
const PRIORITY_SCHEMES: Record<QualityTier, PriorityScheme> = {
  phone: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
  tablet: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
  laptop: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
  desktop: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
  ultra: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
  mega: {
    near: { capacity: Number.MAX_SAFE_INTEGER, frequency: 1, useHiveMind: false },
    mid: { capacity: 0, frequency: 1, useHiveMind: false },
    far: { capacity: 0, frequency: 1, useHiveMind: false },
  },
};

/**
 * Perceptual priority cascade manager
 *
 * Sorts entities by distance to camera and assigns them to priority tiers
 * for tiered evaluation. Maintains cached distances to avoid recomputing
 * every frame.
 */
export class PerceptualPriorityCascade {
  private readonly scheme: PriorityScheme;
  private readonly prioritized: PrioritizedEntity[] = [];
  private readonly nearIndices: number[] = [];
  private readonly midIndices: number[] = [];
  private readonly farIndices: number[] = [];
  private lastCameraPosition = new THREE.Vector3();
  private lastSortFrame = -1;
  private sortCadence = 10; // Re-sort every N frames
  private hasSorted = false;

  constructor(tier: QualityTier) {
    this.scheme = PRIORITY_SCHEMES[tier];
  }

  /**
   * Update entity priorities based on distance to camera
   * Re-sorts only when camera has moved significantly or cadence expires
   */
  updatePriorities(
    entities: ReadonlyArray<Entity | undefined>,
    cameraPosition: THREE.Vector3,
    frame: number,
  ): void {
    const cameraMoved = cameraPosition.distanceToSquared(this.lastCameraPosition) > 1.0;
    const shouldSort =
      !this.hasSorted || cameraMoved || frame - this.lastSortFrame >= this.sortCadence;

    if (!shouldSort) return;

    this.hasSorted = true;
    this.lastCameraPosition.copy(cameraPosition);
    this.lastSortFrame = frame;

    // Clear previous indices
    this.nearIndices.length = 0;
    this.midIndices.length = 0;
    this.farIndices.length = 0;
    this.prioritized.length = 0;

    // Compute distances and sort
    const n = entities.length;
    for (let i = 0; i < n; i++) {
      const e = entities[i];
      if (!e) continue;

      const distance = e.position.distanceToSquared(cameraPosition);
      this.prioritized.push({ entity: e, index: i, distance, tier: 'near' });
    }

    // Sort by distance (ascending)
    this.prioritized.sort((a, b) => a.distance - b.distance);

    // Assign tiers based on capacity
    let nearCount = 0;
    let midCount = 0;

    for (let i = 0; i < this.prioritized.length; i++) {
      const item = this.prioritized[i];
      if (!item) continue;
      const originalIndex = item.index;

      if (nearCount < this.scheme.near.capacity) {
        item.tier = 'near';
        this.nearIndices.push(originalIndex);
        nearCount++;
      } else if (midCount < this.scheme.mid.capacity) {
        item.tier = 'mid';
        this.midIndices.push(originalIndex);
        midCount++;
      } else {
        item.tier = 'far';
        this.farIndices.push(originalIndex);
      }
    }
  }

  /**
   * Get entities that should be evaluated this frame based on their tier frequency
   */
  getEntitiesToEvaluate(frame: number): number[] {
    const indices: number[] = [];

    // Near tier: evaluate every frame
    indices.push(...this.nearIndices);

    // Mid tier: evaluate every Nth frame
    if (frame % this.scheme.mid.frequency === 0) {
      indices.push(...this.midIndices);
    }

    // Far tier: evaluate every Mth frame
    if (frame % this.scheme.far.frequency === 0) {
      indices.push(...this.farIndices);
    }

    return indices;
  }

  /**
   * Get the nearest mid-tier entity for hive mind copying
   * Returns the index of the closest mid-tier entity to a given far-tier entity
   */
  getNearestMidEntity(farEntityIndex: number, rng: () => number = () => 0): number | null {
    if (this.midIndices.length === 0) return null;

    // Simple deterministic heuristic: choose a mid-tier entity using the caller's seeded RNG.
    // In a more sophisticated implementation, this would find the spatially nearest
    const offset = Math.abs(farEntityIndex) % this.midIndices.length;
    const jitter = Math.floor(rng() * this.midIndices.length);
    return this.midIndices[(offset + jitter) % this.midIndices.length] ?? null;
  }

  /**
   * Apply stochastic hive mind to far-tier entities
   * Copies behavior vectors from nearest mid-tier entity with small random perturbation
   * This provides variety while reducing compute for background entities
   */
  applyHiveMind(entities: ReadonlyArray<Entity | undefined>, rng: () => number): void {
    if (!this.scheme.far.useHiveMind) return;

    for (const _farIndex of this.farIndices) {
      const farEntity = entities[_farIndex];
      if (!farEntity) continue;

      const midIndex = this.getNearestMidEntity(_farIndex, rng);
      if (midIndex === null) continue;

      const midEntity = entities[midIndex];
      if (!midEntity) continue;

      const farUd = farEntity.userData;
      const midUd = midEntity.userData;

      // Copy velocity with small perturbation (±10%)
      const perturbation = 0.1;
      farUd.vel.x = midUd.vel.x + (rng() * 2 - 1) * perturbation;
      farUd.vel.y = midUd.vel.y + (rng() * 2 - 1) * perturbation;
      farUd.vel.z = midUd.vel.z + (rng() * 2 - 1) * perturbation;

      // Copy behavior with small perturbation (if behavior is a string)
      if (typeof midUd.beh === 'string') {
        // For string behaviors, just copy directly (no perturbation)
        farUd.beh = midUd.beh;
      }
    }
  }

  /**
   * Get tier statistics for debugging/telemetry
   */
  getStats() {
    return {
      near: this.nearIndices.length,
      mid: this.midIndices.length,
      far: this.farIndices.length,
      total: this.prioritized.length,
    };
  }
}
