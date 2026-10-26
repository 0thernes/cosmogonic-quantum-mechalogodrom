/**
 * World diagnostic snapshot types (audit #6: extracted from world.ts — type-only, no runtime).
 */
import type { BigTreeZoneStats } from './sim/big-tree-zone';
import type { BigTreeSanctuaryIndexStats } from './sim/big-tree-sanctuary';
import type { BigTreeSpeciesVisitorStats } from './sim/big-tree-visitors';
import type { BigTreeFaunaVisitorStats } from './sim/big-tree-fauna-visitors';
import type { EdibleResourceStats } from './sim/edible-resource';
import type { CrystalTreeNeuralStatus } from './sim/crystal-ecosystem';

/** Optional identity/resource selection for the pull-only localhost ecology inspector. */
export interface BigTreeEcologyDiagnosticQuery {
  ownerKind?: number;
  ownerId?: number;
  foodId?: number;
}

export interface BigTreeEcologyActorDiagnostic {
  ownerKind: number;
  ownerId: number;
  adapter: 'core' | 'fauna' | null;
  visit: {
    recordId: number;
    state: number;
    stateName: string;
    reason: number;
    reasonName: string;
    activity: number;
    activityName: string;
    slotId: number;
    insideZone: boolean;
    startedAt: number;
    enteredAt: number | null;
    stateDeadline: number | null;
    remainingStateSeconds: number | null;
    cooldownUntil: number | null;
    remainingCooldownSeconds: number | null;
    stuckRecoveries: number;
    visitOrdinal: number;
    partnerKind: number | null;
    partnerId: number | null;
    partnerLeaseExpiresAt: number | null;
    lastTransitionCause: number;
    lastTransitionCauseName: string;
    lastTransitionAt: number | null;
  } | null;
  target: {
    x: number;
    y: number;
    z: number;
    foodId: number | null;
    foodKind: string | null;
    foodState: string | null;
    foodReservationOwnerId: number | null;
    foodGeneration: number | null;
    foodLeaseExpiresAt: number | null;
    eating: boolean | null;
  } | null;
  sanctuary: {
    registered: boolean;
    recordId: number | null;
    protected: boolean | null;
    aggressionSuppressed: boolean | null;
    x: number | null;
    z: number | null;
  };
}

export interface BigTreeEcologyFoodDiagnostic {
  id: number;
  kind: string;
  state: string;
  ownerId: number | null;
  generation: number;
  nourishment: number;
  position: { x: number; y: number; z: number };
  interactionPoint: { x: number; y: number; z: number };
  leaseUntil: number | null;
  remainingLeaseSeconds: number | null;
  respawnAt: number | null;
  remainingRespawnSeconds: number | null;
}

export interface BigTreeEcologyDiagnosticSnapshot {
  version: 1;
  frame: number;
  simulationTime: number;
  zone: {
    centerX: number;
    centerZ: number;
    entryRadius: number;
    exitRadius: number;
  };
  visits: BigTreeZoneStats;
  coreVisitors: BigTreeSpeciesVisitorStats;
  faunaVisitors: BigTreeFaunaVisitorStats;
  sanctuary: BigTreeSanctuaryIndexStats;
  food: EdibleResourceStats;
  neuralController: CrystalTreeNeuralStatus;
  actor: BigTreeEcologyActorDiagnostic | null;
  foodItem: BigTreeEcologyFoodDiagnostic | null;
}
