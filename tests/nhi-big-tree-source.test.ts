import { describe, expect, test } from 'bun:test';
import {
  BIG_TREE_OWNER_NHI,
  BigTreeFaunaIntentMode,
  BigTreeFaunaVisitors,
  bindBigTreeFauna,
  type BigTreeFaunaVisitorSample,
} from '../src/sim/big-tree-fauna-visitors';
import {
  NhiBigTreeSource,
  applyNhiBigTreeIntent,
  type NhiBigTreeBody,
  type NhiBigTreeIntentView,
} from '../src/sim/nhi-big-tree-source';
import {
  BigTreeSlotKind,
  BigTreeVisitManager,
  BigTreeVisitState,
  BigTreeZone,
} from '../src/sim/big-tree-zone';
import { EdibleResourceRegistry, type EdibleReservation } from '../src/sim/edible-resource';
import type { BigTreeFoodSource } from '../src/sim/big-tree-visitors';

function body(energy = 25): NhiBigTreeBody & {
  position: { x: number; y: number; z: number };
  userData: { energy: number; alive: boolean; isNhi: boolean; nhiMinion?: boolean };
} {
  return {
    position: { x: 30, y: 0, z: 0 },
    userData: { energy, alive: true, isNhi: true },
  };
}

class TreeFood implements BigTreeFoodSource {
  readonly edibleResources = new EdibleResourceRegistry([
    {
      id: 4,
      kind: 'fruit',
      position: { x: 0, y: 0, z: 0 },
      interactionPoint: { x: 0, y: 0, z: 0 },
      nourishment: 28,
    },
  ]);
  now = 0;
  completeCalls = 0;

  setTime(now: number): void {
    this.now = now;
    this.edibleResources.update(now);
  }

  reserveFood(ownerId: number, leaseSeconds = 8, kind?: 'fruit' | 'leaf') {
    return this.edibleResources.reserveAny(ownerId, this.now, leaseSeconds, kind);
  }

  renewFood(reservation: EdibleReservation, leaseSeconds = 8): boolean {
    return this.edibleResources.renewLease(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
      leaseSeconds,
    );
  }

  beginFoodConsumption(reservation: EdibleReservation): boolean {
    return this.edibleResources.beginConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
    );
  }

  completeFoodConsumption(reservation: EdibleReservation): number {
    this.completeCalls++;
    return this.edibleResources.completeConsumption(
      reservation.id,
      reservation.generation,
      reservation.ownerId,
      this.now,
    );
  }

  cancelFood(reservation: EdibleReservation): boolean {
    return this.edibleResources.cancel(reservation.id, reservation.generation, reservation.ownerId);
  }

  releaseFoodOwner(ownerId: number): number {
    return this.edibleResources.releaseOwner(ownerId);
  }
}

function visits(): BigTreeVisitManager {
  const manager = new BigTreeVisitManager(
    new BigTreeZone({ centerX: 0, centerZ: 0, enterRadius: 20, exitRadius: 25 }),
    {
      maxActors: 8,
      capacity: 2,
      maxSlots: 8,
      arriveRadius: 3,
      minDwellSeconds: 0.4,
      maxDwellSeconds: 0.4,
      minCooldownSeconds: 2,
      maxCooldownSeconds: 2,
      travelTimeoutSeconds: 8,
      leaveTimeoutSeconds: 4,
      stuckAfterSeconds: 2,
    },
  );
  manager.addRadialSlots(BigTreeSlotKind.Eat, 2, 2);
  return manager;
}

describe('NhiBigTreeSource', () => {
  test('binds only one launched backing Entity and exposes real signals with fatigue fixed at zero', () => {
    let signalReads = 0;
    const source = new NhiBigTreeSource(2, (_ownerId, out) => {
      signalReads++;
      out.stress = 0.2;
      out.socialNeed = 0.7;
      out.curiosity = 0.4;
      return true;
    });
    const launched = body(25);
    expect(source.register(7, launched)).toBe(true);
    expect(source.register(7, launched)).toBe(false); // no duplicate body/follower registration
    const ordinaryMinion = body(25);
    ordinaryMinion.userData.isNhi = false;
    ordinaryMinion.userData.nhiMinion = true;
    expect(source.register(8, ordinaryMinion)).toBe(false);

    const sample = {} as BigTreeFaunaVisitorSample;
    expect(source.readBigTreeVisitor(0, sample)).toBe(true);
    expect(sample).toMatchObject({
      ownerId: 7,
      hunger: 0.75,
      fatigue: 0,
      healthDeficit: 0,
      stress: 0.2,
      socialNeed: 0.7,
      curiosity: 0.4,
    });
    expect(signalReads).toBe(1);
    expect(source.registeredCount).toBe(1);
  });

  test('travel is final steering, calm settles motion, and lifecycle cleanup releases intent', () => {
    const source = new NhiBigTreeSource(1, () => true);
    const launched = body();
    expect(source.register(3, launched)).toBe(true);
    expect(source.setBigTreeVisitorIntent(3, BigTreeFaunaIntentMode.Travel, 40, 10, 0)).toBe(true);
    const intent: NhiBigTreeIntentView = {
      mode: BigTreeFaunaIntentMode.Normal,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };
    expect(source.readIntent(3, intent)).toBe(true);
    const velocity = { x: -4, y: 0, z: 0 };
    applyNhiBigTreeIntent(intent, launched.position, velocity);
    expect(velocity.x).toBeGreaterThan(-4);
    expect(velocity.y).toBeGreaterThan(0);

    expect(source.setBigTreeVisitorIntent(3, BigTreeFaunaIntentMode.Calm, 0, 0, 0)).toBe(true);
    expect(source.readIntent(3, intent)).toBe(true);
    const speedBefore = Math.hypot(velocity.x, velocity.y, velocity.z);
    applyNhiBigTreeIntent(intent, launched.position, velocity);
    expect(Math.hypot(velocity.x, velocity.y, velocity.z)).toBeLessThan(speedBefore);
    expect(source.unregister(3)).toBe(true);
    expect(source.has(3)).toBe(false);
    expect(source.hasIntent(3)).toBe(false);
  });

  test('shared visit manager and Crystal transaction award backing energy exactly once', () => {
    const source = new NhiBigTreeSource(1, (_ownerId, out) => {
      out.stress = 0;
      out.socialNeed = 0;
      out.curiosity = 0;
      return true;
    });
    const launched = body(0);
    expect(source.register(11, launched)).toBe(true);
    const tree = new TreeFood();
    const manager = visits();
    const adapter = new BigTreeFaunaVisitors(
      tree,
      manager,
      [bindBigTreeFauna(BIG_TREE_OWNER_NHI, source)],
      { pollBudget: 1, pollIntervalSeconds: 0.01, activeCapacity: 1, foodReachRadius: 3 },
    );
    const intent: NhiBigTreeIntentView = {
      mode: BigTreeFaunaIntentMode.Normal,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };

    tree.setTime(0);
    adapter.update(0, 0.1, { foodAvailable: true });
    expect(source.hasIntent(11)).toBe(true); // accepted visit owns the very next locomotion frame
    if (source.readIntent(11, intent) && intent.mode === BigTreeFaunaIntentMode.Travel) {
      launched.position.x = intent.targetX;
      launched.position.y = intent.targetY;
      launched.position.z = intent.targetZ;
    }
    for (let step = 1; step < 8; step++) {
      const now = step * 0.1;
      tree.setTime(now);
      adapter.update(now, 0.1, { foodAvailable: true });
      if (source.readIntent(11, intent) && intent.mode === BigTreeFaunaIntentMode.Travel) {
        // Deterministic harness movement; production applies the same target through World steering.
        launched.position.x = intent.targetX;
        launched.position.y = intent.targetY;
        launched.position.z = intent.targetZ;
      }
    }

    expect(launched.userData.energy).toBe(28);
    expect(tree.completeCalls).toBe(1);
    expect(tree.edibleResources.get(4)?.state).toBe('respawning');
    expect(manager.stateOf(BIG_TREE_OWNER_NHI, 11)).toBe(BigTreeVisitState.Cooldown);

    // Cancellation/death paths are idempotent and cannot replay nourishment.
    expect(adapter.cancel(BIG_TREE_OWNER_NHI, 11)).toBe(true);
    expect(source.unregister(11)).toBe(true);
    tree.setTime(1);
    adapter.update(1, 0.1, { foodAvailable: true });
    expect(launched.userData.energy).toBe(28);
    expect(tree.completeCalls).toBe(1);
  });
});
