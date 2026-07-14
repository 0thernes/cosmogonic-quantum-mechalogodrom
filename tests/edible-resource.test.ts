import { describe, expect, test } from 'bun:test';
import {
  EDIBLE_RESOURCE_RESPAWN_SECONDS,
  EdibleResourceRegistry,
  type EdibleReservation,
  type EdibleResourceDefinition,
  type EdibleResourceVisualLifecycle,
} from '../src/sim/edible-resource';

const DEFINITIONS: readonly EdibleResourceDefinition[] = [
  {
    id: 10,
    kind: 'fruit',
    position: { x: 1, y: 8, z: 2 },
    interactionPoint: { x: 1, y: 0, z: 4 },
    nourishment: 25,
  },
  {
    id: 20,
    kind: 'leaf',
    position: { x: -2, y: 5, z: 3 },
    nourishment: 10,
  },
  {
    id: 30,
    kind: 'fruit',
    position: { x: 4, y: 9, z: -1 },
    nourishment: 30,
  },
];

function makeRegistry(lifecycle?: EdibleResourceVisualLifecycle): EdibleResourceRegistry {
  return new EdibleResourceRegistry(DEFINITIONS, lifecycle);
}

function consume(
  registry: EdibleResourceRegistry,
  resourceId: number,
  ownerId: number,
  now: number,
): { reservation: EdibleReservation; nourishment: number } {
  const reservation = registry.reserveById(resourceId, ownerId, now, 20);
  if (reservation === null) throw new Error(`resource ${resourceId} was not available`);
  expect(
    registry.beginConsumption(reservation.id, reservation.generation, reservation.ownerId, now),
  ).toBe(true);
  const nourishment = registry.completeConsumption(
    reservation.id,
    reservation.generation,
    reservation.ownerId,
    now,
  );
  return { reservation, nourishment };
}

describe('EdibleResourceRegistry', () => {
  test('preallocates stable fruit and leaf slots and reserves from deterministic free lists', () => {
    const registry = makeRegistry();
    const pool = registry.all;
    const fruit = registry.get(10);
    const leaf = registry.get(20);

    expect(registry.capacity).toBe(3);
    expect(fruit?.kind).toBe('fruit');
    expect(fruit?.interactionZ).toBe(4);
    expect(leaf?.kind).toBe('leaf');
    expect(leaf?.interactionY).toBe(5);

    const leafReservation = registry.reserveAny(7, 0, 2, 'leaf');
    expect(leafReservation?.id).toBe(20);
    expect(registry.get(20)?.state).toBe('reserved');
    expect(registry.reserveById(20, 8, 0, 2)).toBeNull();

    expect(
      registry.cancel(leafReservation!.id, leafReservation!.generation, leafReservation!.ownerId),
    ).toBe(true);
    expect(registry.get(20)?.state).toBe('available');
    expect(registry.all).toBe(pool);
    expect(registry.get(10)).toBe(fruit);
    expect(registry.get(20)).toBe(leaf);
  });

  test('one owner wins a race and nourishment is awarded exactly once', () => {
    const registry = makeRegistry();
    const winner = registry.reserveById(10, 101, 1, 4)!;

    expect(registry.reserveById(10, 202, 1, 4)).toBeNull();
    expect(registry.beginConsumption(10, winner.generation, 202, 1)).toBe(false);
    expect(registry.beginConsumption(10, winner.generation, 101, 1)).toBe(true);
    expect(registry.get(10)?.state).toBe('consuming');
    expect(registry.completeConsumption(10, winner.generation, 202, 1)).toBe(0);
    expect(registry.completeConsumption(10, winner.generation, 101, 1)).toBe(25);
    expect(registry.completeConsumption(10, winner.generation, 101, 1)).toBe(0);
    expect(registry.beginConsumption(10, winner.generation, 101, 1)).toBe(false);
    expect(registry.get(10)?.state).toBe('respawning');
    expect(registry.get(10)?.ownerId).toBeNull();
    expect(registry.stats()).toMatchObject({
      consuming: 0,
      respawning: 1,
      pendingLeases: 0,
      pendingRespawns: 1,
    });
  });

  test('does not respawn at 4.999 seconds and restores exactly at 5.0 sim seconds', () => {
    const events: string[] = [];
    const registry = makeRegistry({
      onUnavailable: (resource) => events.push(`unavailable:${resource.state}`),
      onRestore: (resource) => events.push(`restore:${resource.state}`),
      onAvailable: (resource) => events.push(`available:${resource.state}`),
    });
    const { reservation } = consume(registry, 10, 5, 0);

    expect(EDIBLE_RESOURCE_RESPAWN_SECONDS).toBe(5);
    expect(registry.get(10)?.respawnAt).toBe(5);
    expect(registry.update(4.999)).toBe(0);
    expect(registry.get(10)?.state).toBe('respawning');
    expect(events).toEqual(['unavailable:respawning']);

    expect(registry.update(5)).toBe(1);
    expect(registry.get(10)?.state).toBe('available');
    expect(registry.get(10)?.generation).toBe(reservation.generation + 1);
    expect(events).toEqual(['unavailable:respawning', 'restore:respawning', 'available:available']);
  });

  test('processes multiple respawns in deadline order with deterministic ID tie-breaking', () => {
    const restored: number[] = [];
    const registry = makeRegistry({ onRestore: (resource) => restored.push(resource.id) });

    consume(registry, 10, 1, 2); // due 7
    consume(registry, 30, 2, 1); // due 6
    consume(registry, 20, 3, 1); // due 6, lower ID than 30
    expect(registry.stats().pendingRespawns).toBe(3);

    expect(registry.update(10)).toBe(3);
    expect(restored).toEqual([20, 30, 10]);
    expect(registry.stats()).toMatchObject({ available: 3, pendingRespawns: 0 });
  });

  test('expires and renews numeric owner leases at exact deadlines', () => {
    const registry = makeRegistry();
    const first = registry.reserveById(10, 44, 2, 3)!;

    registry.update(4.999);
    expect(registry.get(10)?.state).toBe('reserved');
    registry.update(5);
    expect(registry.get(10)?.state).toBe('available');
    expect(registry.get(10)?.generation).toBe(first.generation + 1);
    expect(registry.beginConsumption(10, first.generation, 44, 5)).toBe(false);

    const second = registry.reserveById(10, 44, 5, 1)!;
    expect(registry.renewLease(10, second.generation, 44, 5.5, 2)).toBe(true);
    registry.update(6.001);
    expect(registry.get(10)?.state).toBe('reserved');
    registry.update(7.5);
    expect(registry.get(10)?.state).toBe('available');
  });

  test('cancel and death/despawn owner release clean reserved and consuming states', () => {
    const registry = makeRegistry();
    const fruit = registry.reserveById(10, 77, 0, 10)!;
    const leaf = registry.reserveById(20, 77, 0, 10)!;
    const other = registry.reserveById(30, 88, 0, 10)!;
    expect(registry.beginConsumption(10, fruit.generation, 77, 0)).toBe(true);

    expect(registry.releaseOwner(77)).toBe(2);
    expect(registry.get(10)?.state).toBe('available');
    expect(registry.get(20)?.state).toBe('available');
    expect(registry.stats().pendingLeases).toBe(1);
    expect(registry.beginConsumption(10, fruit.generation, 77, 0)).toBe(false);
    expect(registry.cancel(20, leaf.generation, 77)).toBe(false);
    expect(registry.cancel(30, other.generation, 88)).toBe(true);
    expect(registry.stats()).toMatchObject({ available: 3, pendingLeases: 0 });
  });

  test('reset invalidates reservations, clears deadlines, and restores visuals before availability', () => {
    const events: string[] = [];
    const registry = makeRegistry({
      onRestore: (resource) => events.push(`restore:${resource.id}:${resource.state}`),
      onAvailable: (resource) => events.push(`available:${resource.id}:${resource.state}`),
    });
    const reservation = registry.reserveById(10, 3, 0, 20)!;
    expect(registry.beginConsumption(10, reservation.generation, 3, 0)).toBe(true);
    const consumed = consume(registry, 20, 4, 0).reservation;

    registry.reset(100);

    expect(registry.stats()).toMatchObject({
      available: 3,
      reserved: 0,
      consuming: 0,
      respawning: 0,
      pendingLeases: 0,
      pendingRespawns: 0,
    });
    expect(registry.get(10)?.ownerId).toBeNull();
    expect(registry.get(10)?.generation).toBe(reservation.generation + 1);
    expect(registry.get(20)?.generation).toBe(consumed.generation + 1);
    expect(events.indexOf('restore:20:respawning')).toBeLessThan(
      events.indexOf('available:20:available'),
    );
  });

  test('a failed visual restore stays unavailable and retries without duplicating its timer', () => {
    let restoreAttempts = 0;
    const registry = makeRegistry({
      onRestore: () => {
        restoreAttempts++;
        if (restoreAttempts === 1) throw new Error('renderer not ready');
      },
    });
    consume(registry, 10, 1, 0);

    expect(registry.update(5)).toBe(0);
    expect(registry.get(10)?.state).toBe('respawning');
    expect(registry.stats()).toMatchObject({
      pendingRespawns: 1,
      lifecycleErrors: 1,
    });

    expect(registry.update(5)).toBe(1);
    expect(registry.get(10)?.state).toBe('available');
    expect(registry.stats().pendingRespawns).toBe(0);
  });

  test('one failed visual restore does not block other due resources', () => {
    let failFirstFruit = true;
    const restored: number[] = [];
    const registry = makeRegistry({
      onRestore: (resource) => {
        if (resource.id === 10 && failFirstFruit) throw new Error('fruit renderer not ready');
        restored.push(resource.id);
      },
    });
    consume(registry, 10, 1, 0);
    consume(registry, 20, 2, 0);

    expect(registry.update(5)).toBe(1);
    expect(restored).toEqual([20]);
    expect(registry.get(10)?.state).toBe('respawning');
    expect(registry.get(20)?.state).toBe('available');
    expect(registry.stats()).toMatchObject({
      available: 2,
      respawning: 1,
      pendingRespawns: 1,
      lifecycleErrors: 1,
    });

    failFirstFruit = false;
    expect(registry.update(5)).toBe(1);
    expect(restored).toEqual([20, 10]);
    expect(registry.stats()).toMatchObject({
      available: 3,
      respawning: 0,
      pendingRespawns: 0,
    });
  });

  test('repeated consume/respawn cycles reuse the same records without timer accumulation', () => {
    const registry = makeRegistry();
    const pool = registry.all;
    const fruit = registry.get(10);
    const initialGeneration = fruit!.generation;

    for (let cycle = 0; cycle < 250; cycle++) {
      const now = cycle * EDIBLE_RESOURCE_RESPAWN_SECONDS;
      const { reservation, nourishment } = consume(registry, 10, 900, now);
      expect(nourishment).toBe(25);
      expect(registry.completeConsumption(10, reservation.generation, 900, now)).toBe(0);
      expect(registry.update(now + 4.999)).toBe(0);
      expect(registry.stats().pendingRespawns).toBe(1);
      expect(registry.update(now + EDIBLE_RESOURCE_RESPAWN_SECONDS)).toBe(1);
      expect(registry.stats().pendingRespawns).toBe(0);
      expect(registry.all).toBe(pool);
      expect(registry.get(10)).toBe(fruit);
    }

    expect(registry.get(10)?.generation).toBe(initialGeneration + 250);
    expect(registry.stats()).toMatchObject({
      capacity: 3,
      available: 3,
      reserved: 0,
      consuming: 0,
      respawning: 0,
      pendingLeases: 0,
      pendingRespawns: 0,
    });
  });
});
