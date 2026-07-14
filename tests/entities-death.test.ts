/**
 * EntityManager.onDeath hook (audit fix A). Falsifiable claims:
 * - disposeAt() fires the hook exactly once, with the dying entity's world x/z,
 *   and never on an empty slot;
 * - the age-death branch of update() fires it exactly once per death (it routes
 *   through disposeAt — the no-double-fire guarantee);
 * - reset() disposes directly and never fires it (genesis, not death).
 *
 * Headless: three's Scene/Mesh/Material need no DOM until render (same fake-ctx
 * pattern as tests/nan-stability.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** Fresh mutable sim state in the calm default regime (tMod = 1 at 20 °C). */
function makeState(): SimState {
  return {
    chaos: 0.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

/** Minimal DOM-free SimContext with real geometries/morphotypes (fake-ctx pattern). */
function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone' as const,
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

describe('EntityManager.onDeath', () => {
  test('ecology identity is simulation-owned, monotonic, and deterministically rebased by reset', () => {
    const ctx = makeCtx(23, 50);
    const entities = new EntityManager(ctx);
    const first = entities.spawn(new THREE.Vector3(1, 2, 3), 0);
    const second = entities.spawn(new THREE.Vector3(4, 5, 6), 1);
    expect(first?.userData.ecologyId).toBe(1);
    expect(second?.userData.ecologyId).toBe(2);

    entities.disposeAt(0);
    const third = entities.spawn(new THREE.Vector3(7, 8, 9), 2);
    expect(third?.userData.ecologyId).toBe(3);

    entities.reset(3);
    expect(entities.list.map((entity) => entity.userData.ecologyId)).toEqual([1, 2, 3]);
    const resetFirst = entities.list[0]!;
    expect(resetFirst.id).not.toBe(first?.id);
    expect(resetFirst.userData.ecologyId).toBe(first?.userData.ecologyId);
    const afterReset = entities.spawn(new THREE.Vector3(10, 11, 12), 3);
    expect(afterReset?.userData.ecologyId).toBe(4);

    const deaths: Entity[] = [];
    entities.onDeath = (_x, _z, entity) => {
      deaths.push(entity);
    };
    entities.disposeAt(0);
    expect(deaths).toEqual([resetFirst]);
    expect(deaths[0]?.userData.ecologyId).toBe(1);
  });

  test('a failing optional creature SFX sink cannot turn a completed spawn into a half-transaction', () => {
    const ctx = makeCtx(29, 50);
    ctx.creatureSfx = () => {
      throw new Error('injected SFX failure');
    };
    const entities = new EntityManager(ctx);
    const spawned = entities.spawn(new THREE.Vector3(1, 2, 3), 0);
    expect(spawned).not.toBeNull();
    expect(entities.list).toEqual([spawned as Entity]);
    expect(spawned?.userData.alive).toBe(true);
  });

  test('a throwing brain-slot hook leaves no list or scene orphan when spawn cannot return identity', () => {
    const ctx = makeCtx(31, 50);
    const entities = new EntityManager(ctx);
    entities.attachBrainSlotLifecycle({
      swapEntitySlots: () => undefined,
      resetEntitySlots: () => undefined,
      clearEntitySlot: () => {
        throw new Error('injected slot failure');
      },
    });
    expect(() => entities.spawn(new THREE.Vector3(1, 2, 3), 0)).toThrow('injected slot failure');
    expect(entities.list).toHaveLength(0);
    expect(ctx.scene.children).toHaveLength(0);
  });

  test('a throwing material disposer cannot leave rollback state or double-decrement accounting', () => {
    const ctx = makeCtx(37, 50);
    const entities = new EntityManager(ctx);
    const spawned = entities.spawn(new THREE.Vector3(1, 2, 3), 0);
    expect(spawned).not.toBeNull();
    if (!spawned) return;
    spawned.material.dispose = () => {
      throw new Error('injected dispose failure');
    };
    ctx.state.mutations = 7;
    expect(() => entities.discardSpawnAt(0)).not.toThrow();
    expect(entities.list).toHaveLength(0);
    expect(spawned.userData.alive).toBe(false);
    expect(ctx.state.mutations).toBe(7);
    expect(() => entities.discardSpawnAt(0)).not.toThrow();
    expect(ctx.state.mutations).toBe(7);
  });

  test('disposeAt fires exactly once with the entity x/z; empty slots never fire', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const calls: [number, number][] = [];
    entities.onDeath = (x, z) => {
      calls.push([x, z]);
    };
    const e = entities.spawn(new THREE.Vector3(12.5, 3, -7.25), 0);
    expect(e).not.toBeNull();
    entities.disposeAt(0);
    expect(calls).toEqual([[12.5, -7.25]]);
    expect(entities.list.length).toBe(0);
    entities.disposeAt(0); // empty list — guard path, must not fire
    expect(calls.length).toBe(1);
  });

  test('discardSpawnAt removes a failed registration without fabricating a death', () => {
    const ctx = makeCtx(11, 50);
    const entities = new EntityManager(ctx);
    let fires = 0;
    entities.onDeath = () => fires++;
    const survivor = entities.spawn(new THREE.Vector3(1, 2, 3), 0);
    const rolledBack = entities.spawn(new THREE.Vector3(4, 5, 6), 1);
    expect(survivor).not.toBeNull();
    expect(rolledBack).not.toBeNull();
    ctx.state.mutations = 9;
    entities.discardSpawnAt(1);
    expect(entities.list).toEqual([survivor as Entity]);
    expect(rolledBack?.userData.alive).toBe(false);
    expect(ctx.state.mutations).toBe(9);
    expect(fires).toBe(0);
  });

  test('age-death inside update() fires exactly once per death (no double-fire)', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    entities.reset(10);
    let fires = 0;
    entities.onDeath = () => {
      fires++;
    };
    // Force exactly one death this frame; keep everyone else young.
    for (const e of entities.list) {
      if (e) e.userData.age = 0;
    }
    const victim = entities.list[3];
    expect(victim).toBeDefined();
    if (!victim) return;
    victim.userData.age = victim.userData.life + 1e6;
    ctx.state.frame++;
    entities.update(1 / 60, 1 / 60);
    // One death ⇒ one fire, even though the age branch routes through disposeAt;
    // the respawn-when-sparse spawns it triggers are births and never fire.
    expect(fires).toBe(1);
  });

  test('disposeManyDescending preserves survivor order and death callback order', () => {
    const ctx = makeCtx(4, 50);
    const entities = new EntityManager(ctx);
    entities.reset(20);
    const original = [...entities.list];
    for (let i = 0; i < original.length; i++) original[i]!.position.x = i;
    const killed = [19, 15, 10, 1];
    const deaths: number[] = [];
    const brainIds = Array.from({ length: 50 }, (_, i) => i);
    const cleared: number[] = [];
    entities.attachBrainSlotLifecycle({
      swapEntitySlots(a, b) {
        const id = brainIds[a]!;
        brainIds[a] = brainIds[b]!;
        brainIds[b] = id;
      },
      clearEntitySlot(slot) {
        cleared.push(slot);
      },
      resetEntitySlots() {
        for (let i = 0; i < brainIds.length; i++) brainIds[i] = i;
      },
    });
    entities.onDeath = (x) => deaths.push(x);

    expect(entities.disposeManyDescending(killed)).toBe(killed.length);
    expect(entities.list).toEqual(original.filter((_entity, index) => !killed.includes(index)));
    expect(deaths).toEqual(killed);
    expect(brainIds.slice(0, entities.list.length)).toEqual(
      original.map((_entity, index) => index).filter((index) => !killed.includes(index)),
    );
    expect(cleared).toEqual([16, 17, 18, 19]);
    for (const index of killed) expect(original[index]!.userData.alive).toBe(false);
    for (const entity of entities.list) expect(entity.userData.alive).toBe(true);

    expect(() => entities.disposeManyDescending([0, 1])).toThrow('descending indices');
    expect(() => entities.disposeManyDescending([999])).toThrow('descending indices');
  });

  test('reset() never fires onDeath (mass disposal is genesis, not death)', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    entities.reset(10);
    let fires = 0;
    entities.onDeath = () => {
      fires++;
    };
    entities.reset(5);
    expect(fires).toBe(0);
    expect(entities.list.length).toBe(5);
  });
});
