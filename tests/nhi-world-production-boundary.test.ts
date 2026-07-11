/** Dynamic production-boundary tests for the private World NHI coordinator. */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import type { Entity } from '../src/types';
import { NhiAction, type NhiIntent } from '../src/sim/nhi';
import { NHI_SYSTEM_MIND_CAP, type NhiActionOutcome } from '../src/sim/nhi-system';
import { World } from '../src/world';

interface AuditEntry {
  action: string;
  detail?: Record<string, unknown>;
}

interface WorldNhiCoordinator {
  launchNhiBeing(x?: number, y?: number, z?: number, source?: string): number;
  nhiApply(id: number, intent: NhiIntent, text: string): NhiActionOutcome;
}

interface FakeEntities {
  readonly list: Entity[];
  readonly morphLive: number[];
  spawnCalls: number;
  failSpawnAt: number | null;
  fakeDeaths: number;
  spawn(position: THREE.Vector3, morph: number): Entity;
  spawnWithinFrameBudget(position: THREE.Vector3, morph: number): Entity;
  discardSpawnAt(index: number): void;
  dispose(entity: Entity): void;
}

interface Harness {
  readonly world: World;
  readonly audits: AuditEntry[];
  readonly audioEvents: string[];
  readonly bodyIds: Set<number>;
  readonly economyIds: Set<number>;
  readonly entities: FakeEntities;
  readonly forward: Map<number, Entity>;
  readonly reverse: Map<Entity, number>;
  readonly minds: Set<number>;
  readonly targets: Map<number, Entity>;
  readonly gridInsertions: Entity[];
}

interface HarnessOptions {
  startId?: number;
  effectRng?: () => number;
  cameraDirection?: (target: THREE.Vector3) => THREE.Vector3;
  bodyThrowsAfterRegistration?: boolean;
}

const coordinator = (world: World): WorldNhiCoordinator => world as unknown as WorldNhiCoordinator;

function makeEntity(morph = 0, position = new THREE.Vector3()): Entity {
  const entity = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial(),
  ) as Entity;
  entity.position.copy(position);
  entity.userData = {
    mi: morph,
    vel: new THREE.Vector3(),
    age: 0,
    life: 1_000,
    ph: 0,
    sc: 1,
    beh: 'helix',
    spd: 1,
    wf: 1,
    wa: 1,
    sT: 300,
    belly: 0,
    sortVal: 0,
    nW: 0.5,
    act: 0,
    qP: 0,
    energy: 40,
    strategy: 0,
    typeId: 0,
    setGroup: 0,
    payoff: 0,
    phylum: 0,
    beh2: null,
    alive: true,
  };
  return entity;
}

function makeHarness(options: HarnessOptions = {}): Harness {
  const audits: AuditEntry[] = [];
  const audioEvents: string[] = [];
  const bodyIds = new Set<number>();
  const economyIds = new Set<number>();
  const forward = new Map<number, Entity>();
  const reverse = new Map<Entity, number>();
  const minds = new Set<number>();
  const targets = new Map<number, Entity>();
  const gridInsertions: Entity[] = [];
  const entities: FakeEntities = {
    list: [],
    morphLive: [0, 0, 0, 0],
    spawnCalls: 0,
    failSpawnAt: null,
    fakeDeaths: 0,
    spawn(position, morph) {
      this.spawnCalls++;
      if (this.failSpawnAt === this.spawnCalls) {
        throw new Error(`injected entity spawn failure ${this.spawnCalls}`);
      }
      const normalizedMorph = morph % this.morphLive.length;
      const entity = makeEntity(normalizedMorph, position);
      this.list.push(entity);
      this.morphLive[normalizedMorph] = (this.morphLive[normalizedMorph] ?? 0) + 1;
      return entity;
    },
    spawnWithinFrameBudget(position, morph) {
      return this.spawn(position, morph);
    },
    discardSpawnAt(index) {
      const [entity] = this.list.splice(index, 1);
      if (!entity) return;
      const morph = entity.userData.mi;
      this.morphLive[morph] = Math.max(0, (this.morphLive[morph] ?? 0) - 1);
    },
    dispose() {
      // World launch rollback must use discardSpawnAt: disposal would synthesize a death event.
      this.fakeDeaths++;
    },
  };
  const world = Object.create(World.prototype) as World;
  Object.assign(world, {
    audit: {
      record: (action: string, detail?: Record<string, unknown>) => audits.push({ action, detail }),
    },
    audio: {
      play: (name: string) => audioEvents.push(name),
      playExtra: (name: string) => audioEvents.push(name),
      playNhiLaunch: () => audioEvents.push('launch'),
    },
    econRng: () => 0.5,
    economy: {
      register: (id: number) => void economyIds.add(id),
      unregister: (id: number) => economyIds.delete(id),
      has: (id: number) => economyIds.has(id),
    },
    engine: {
      camera: {
        position: new THREE.Vector3(2, 3, 4),
        getWorldDirection:
          options.cameraDirection ??
          ((target: THREE.Vector3): THREE.Vector3 => target.set(0, 0, -1)),
      },
    },
    entities,
    grid: {
      insert: (entity: Entity) => void gridInsertions.push(entity),
    },
    hud: {
      showSector: () => undefined,
      showToast: () => undefined,
    },
    log: {
      error: () => undefined,
      warn: () => undefined,
    },
    morphTotal: entities.morphLive.length,
    nhi: {
      register: (id: number) => void minds.add(id),
      unregister: (id: number) => minds.delete(id),
      snapshot: (id: number) => (minds.has(id) ? { id } : null),
    },
    nhiBirthRng: () => 0.5,
    nhiBody: {
      spawn: (id: number) => {
        bodyIds.add(id);
        if (options.bodyThrowsAfterRegistration) {
          throw new Error('injected body registration failure');
        }
      },
      remove: (id: number) => bodyIds.delete(id),
      has: (id: number) => bodyIds.has(id),
    },
    nhiEffectRng: options.effectRng ?? (() => 0.25),
    nhiEntities: forward,
    nhiIdsByEntity: reverse,
    nhiLiveScratch: [],
    nhiNextId: options.startId ?? 0,
    nhiTargets: targets,
    sv1: new THREE.Vector3(),
    sv2: new THREE.Vector3(),
  });
  return {
    world,
    audits,
    audioEvents,
    bodyIds,
    economyIds,
    entities,
    forward,
    reverse,
    minds,
    targets,
    gridInsertions,
  };
}

function readNextId(world: World): number {
  return (world as unknown as { nhiNextId: number }).nhiNextId;
}

describe('World NHI production boundaries', () => {
  test('population cap rejects a launch before attempt id allocation or effect RNG', () => {
    let effectDraws = 0;
    const harness = makeHarness({
      startId: 19,
      effectRng: () => {
        effectDraws++;
        return 0.25;
      },
    });
    for (let id = 0; id < NHI_SYSTEM_MIND_CAP; id++) {
      harness.forward.set(id, makeEntity());
    }

    expect(coordinator(harness.world).launchNhiBeing(1, 2, 3, 'cap-test')).toBe(0);
    expect(readNextId(harness.world)).toBe(19);
    expect(effectDraws).toBe(0);
    expect(harness.entities.spawnCalls).toBe(0);
    expect(harness.audits).toContainEqual({
      action: 'nhi-launch-blocked',
      detail: {
        source: 'cap-test',
        reason: 'nhi-population-cap',
        cap: NHI_SYSTEM_MIND_CAP,
      },
    });
  });

  test('partial launch registration rolls every logical owner back without a fake death', () => {
    const harness = makeHarness({ startId: 7, bodyThrowsAfterRegistration: true });

    expect(coordinator(harness.world).launchNhiBeing(10, 20, 30, 'rollback-test')).toBe(0);

    expect(readNextId(harness.world)).toBe(8);
    expect(harness.minds.size).toBe(0);
    expect(harness.forward.size).toBe(0);
    expect(harness.reverse.size).toBe(0);
    expect(harness.targets.size).toBe(0);
    expect(harness.economyIds.size).toBe(0);
    expect(harness.bodyIds.size).toBe(0);
    expect(harness.entities.list).toHaveLength(0);
    expect(harness.entities.morphLive).toEqual([0, 0, 0, 0]);
    expect(harness.entities.fakeDeaths).toBe(0);
    expect(harness.audioEvents).toEqual([]);

    const failure = harness.audits.find((entry) => entry.action === 'nhi-launch-failed');
    expect(failure?.detail).toEqual({
      id: 7,
      source: 'rollback-test',
      error: 'injected body registration failure',
      idConsumed: true,
      rngRollback: false,
      rollbackRequired: true,
      logicalRollbackComplete: true,
      rollbackCallFailures: [],
      logicalRollbackPostconditions: {
        mindAbsent: true,
        forwardMapAbsent: true,
        reverseMapAbsent: true,
        targetAbsent: true,
        economyAbsent: true,
        bodyAbsent: true,
        entityAbsent: true,
      },
      resourceCleanupStatus: 'best-effort-unverified',
    });
  });

  test('camera and effect-RNG failures are caught after consuming their attempt ids', () => {
    const cases: readonly {
      name: string;
      harness: Harness;
      launch: (world: World) => number;
      expectedError: string;
      expectedId: number;
      expectedNextId: number;
    }[] = [
      {
        name: 'camera',
        harness: makeHarness({
          startId: 30,
          cameraDirection: () => {
            throw new Error('injected camera failure');
          },
        }),
        launch: (world) =>
          coordinator(world).launchNhiBeing(undefined, undefined, undefined, 'camera'),
        expectedError: 'injected camera failure',
        expectedId: 30,
        expectedNextId: 31,
      },
      {
        name: 'rng',
        harness: makeHarness({
          startId: 40,
          effectRng: () => {
            throw new Error('injected effect RNG failure');
          },
        }),
        launch: (world) => coordinator(world).launchNhiBeing(1, 2, 3, 'rng'),
        expectedError: 'injected effect RNG failure',
        expectedId: 40,
        expectedNextId: 41,
      },
    ];

    for (const scenario of cases) {
      expect(scenario.launch(scenario.harness.world), scenario.name).toBe(0);
      const failure = scenario.harness.audits.find((entry) => entry.action === 'nhi-launch-failed');
      expect(failure?.detail, scenario.name).toMatchObject({
        id: scenario.expectedId,
        source: scenario.name,
        error: scenario.expectedError,
        idConsumed: true,
        rngRollback: false,
        rollbackRequired: true,
        logicalRollbackComplete: true,
        rollbackCallFailures: [],
        logicalRollbackPostconditions: {
          mindAbsent: true,
          forwardMapAbsent: true,
          reverseMapAbsent: true,
          targetAbsent: true,
          economyAbsent: true,
          bodyAbsent: true,
          entityAbsent: true,
        },
        resourceCleanupStatus: 'best-effort-unverified',
      });
      expect(readNextId(scenario.harness.world), scenario.name).toBe(scenario.expectedNextId);
      expect(scenario.harness.entities.spawnCalls, scenario.name).toBe(0);
    }
  });

  test('a later SPAWN_SWARM failure retains and acknowledges an earlier child', () => {
    const harness = makeHarness();
    const parent = makeEntity(0, new THREE.Vector3(4, 5, 6));
    harness.forward.set(3, parent);
    harness.entities.failSpawnAt = 2;
    const intent: NhiIntent = {
      action: NhiAction.SPAWN_SWARM,
      target: -1,
      magnitude: 1,
      spawn: 2,
      utterance: [],
      ownMove: 0,
    };

    const outcome = coordinator(harness.world).nhiApply(3, intent, 'unused');

    expect(outcome).toEqual({
      effectApplied: true,
      factSupported: true,
      affected: 1,
      energyTransferred: 0,
    });
    expect(harness.entities.list).toHaveLength(1);
    expect(harness.entities.morphLive.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(harness.gridInsertions).toEqual(harness.entities.list);
    expect(harness.audits).toContainEqual({
      action: 'nhi-swarm-spawn-failed',
      detail: { id: 3, attempt: 1, error: 'injected entity spawn failure 2' },
    });
  });

  test('captured HUNT mutates both bodies and reports exactly two affected organisms', () => {
    const harness = makeHarness();
    const hunter = makeEntity(0, new THREE.Vector3(0, 0, 0));
    const target = makeEntity(1, new THREE.Vector3(1, 0, 0));
    hunter.userData.energy = 40;
    target.userData.energy = 30;
    harness.forward.set(5, hunter);
    harness.targets.set(5, target);
    const beforeTotal = hunter.userData.energy + target.userData.energy;
    const intent: NhiIntent = {
      action: NhiAction.HUNT,
      target: target.userData.setGroup,
      magnitude: 1,
      spawn: 0,
      utterance: [],
      ownMove: 1,
    };

    const outcome = coordinator(harness.world).nhiApply(5, intent, 'unused');

    expect(outcome).toEqual({
      effectApplied: true,
      factSupported: true,
      affected: 2,
      energyTransferred: 8,
    });
    expect(hunter.userData.energy).toBe(48);
    expect(target.userData.energy).toBe(22);
    expect(hunter.userData.energy + target.userData.energy).toBe(beforeTotal);
    expect(hunter.userData.vel.x).toBeGreaterThan(0);
    expect(hunter.userData.payoff).toBe(8);
    expect(target.userData.payoff).toBe(-8);
  });
});
