/**
 * DOME FEEDING (V127, USER "All the things in the dome eat Entities and Plants Biome … respawn in 5
 * seconds"). Titans / leviathans / puppeteers graze the flora under them and eat organisms near them.
 * Falsifiable:
 * - an organism within EAT_R of a feeder is eaten (+ re-enters ~5 s later); one far away is untouched;
 * - the flora is grazed at every feeder footprint;
 * - frozen dt (pause) feeds nothing; determinism holds.
 *
 * Feeders are mocked (DomeFeeding only calls eachFeederPos); ctx + EntityManager mirror the other tests.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { DomeFeeding, type DomeFeeder } from '../src/sim/dome-feeding';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const DT = 1 / 60;
const noGraze = (): void => undefined;

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

/** A feeder standing at fixed world positions. */
function mockFeeder(...positions: [number, number, number][]): DomeFeeder {
  return {
    eachFeederPos(cb: (x: number, y: number, z: number) => void): void {
      for (const [x, y, z] of positions) cb(x, y, z);
    },
  };
}

describe('DomeFeeding', () => {
  test('an organism within reach of a feeder is eaten; one far away is untouched', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const feeding = new DomeFeeding(ctx);
    const feeder = mockFeeder([0, 10, 0]);
    entities.spawn(new THREE.Vector3(0, 10, 0), 0); // at the feeder → eaten
    const safe = entities.spawn(new THREE.Vector3(300, 3, 300), 1);
    feeding.update([feeder], entities, noGraze, 1, DT);
    expect(feeding.eaten).toBe(1);
    expect(entities.list.length).toBe(1);
    expect(entities.list[0]).toBe(safe as Entity);
    expect(feeding.stats().pending).toBe(1);
    feeding.update([feeder], entities, noGraze, 6.02, DT); // 1 + 5 → respawns
    expect(entities.list.length).toBe(2);
    feeding.dispose();
  });

  test('onKill fires once per devoured organism, BEFORE disposal (mind still live)', () => {
    const ctx = makeCtx(9, 50);
    const entities = new EntityManager(ctx);
    const feeding = new DomeFeeding(ctx);
    const feeder = mockFeeder([0, 10, 0]);
    const eaten = entities.spawn(new THREE.Vector3(0, 10, 0), 0) as Entity; // at the feeder → eaten
    entities.spawn(new THREE.Vector3(300, 3, 300), 1); // far away → survives
    const seen: { e: Entity; stillLive: boolean }[] = [];
    feeding.update([feeder], entities, noGraze, 1, DT, (e) => {
      // at callback time the organism must NOT yet be disposed (its brain + senses are still readable)
      seen.push({ e, stillLive: entities.list.includes(e) });
    });
    expect(seen.length).toBe(1); // exactly one death measured
    expect(seen[0]?.e).toBe(eaten);
    expect(seen[0]?.stillLive).toBe(true); // fired BEFORE disposeAt
    expect(feeding.eaten).toBe(1);
    feeding.dispose();
  });

  test('an NHI at a feeder is consumption-immune and never queued as an ordinary respawn', () => {
    const ctx = makeCtx(20, 50);
    const entities = new EntityManager(ctx);
    const feeding = new DomeFeeding(ctx);
    const nhi = entities.spawn(new THREE.Vector3(0, 10, 0), 0) as Entity;
    nhi.userData.isNhi = true;
    let killed = 0;
    feeding.update([mockFeeder([0, 10, 0])], entities, noGraze, 1, DT, () => killed++);
    expect(feeding.eaten).toBe(0);
    expect(killed).toBe(0);
    expect(entities.list).toEqual([nhi]);
    expect(feeding.stats().pending).toBe(0);
    feeding.dispose();
  });

  test('the flora is grazed at every feeder footprint', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const feeding = new DomeFeeding(ctx);
    const feeder = mockFeeder([10, 5, 20], [-30, 5, 40]);
    const grazed: [number, number][] = [];
    const graze = (x: number, z: number): void => {
      grazed.push([x, z]);
    };
    feeding.update([feeder], entities, graze, 1, DT);
    expect(grazed).toEqual([
      [10, 20],
      [-30, 40],
    ]);
    feeding.dispose();
  });

  test('frozen dt (pause) neither eats nor grazes', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const feeding = new DomeFeeding(ctx);
    let grazes = 0;
    const graze = (): void => {
      grazes++;
    };
    entities.spawn(new THREE.Vector3(0, 10, 0), 0);
    feeding.update([mockFeeder([0, 10, 0])], entities, graze, 1, 0);
    expect(feeding.eaten).toBe(0);
    expect(grazes).toBe(0);
    expect(entities.list.length).toBe(1);
    feeding.dispose();
  });

  test('deterministic: two identical runs eat + respawn identically', () => {
    const run = (): { eaten: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const feeding = new DomeFeeding(ctx);
      const feeder = mockFeeder([0, 10, 0]);
      for (let i = 0; i < 6; i++) entities.spawn(new THREE.Vector3(0, 10, 0), i % 5);
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        feeding.update([feeder], entities, noGraze, t, DT);
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      feeding.dispose();
      return { eaten: feeding.eaten, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});
