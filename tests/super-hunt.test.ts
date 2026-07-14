/**
 * SUPER HUNT (V127, USER "Super Creature Hunts and Eats Entities as food and fuel … respawn in 5
 * seconds"). Each apex pursues the nearest organism and consumes it on contact. Falsifiable:
 * - an organism inside EAT_R is eaten (apex.eat called, it re-enters ~5 s later);
 * - one inside SENSES_R but beyond EAT_R is NOT eaten but IS pursued (setHuntTarget on it);
 * - one beyond SENSES_R is ignored (clearHunt); frozen dt eats/steers nothing.
 *
 * The apex is mocked (SuperHunt only touches worldPosition / setHuntTarget / clearHunt / eat), so no
 * heavy body build is needed; the EntityManager + ctx mirror tests/mecha-blaze.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { SuperHunt } from '../src/sim/super-hunt';
import { getQuantizationConfig } from '../src/math/quantization';
import type { SuperBodySystem } from '../src/sim/super-body';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const DT = 1 / 60;
const SAFE_R2 = 25;

/** Test safe-zone policy: neither protected attackers nor protected targets may form a harmful pair. */
function harmAllowedOutsideSafeZone(
  attackerX: number,
  attackerZ: number,
  targetX: number,
  targetZ: number,
): boolean {
  return (
    attackerX * attackerX + attackerZ * attackerZ > SAFE_R2 &&
    targetX * targetX + targetZ * targetZ > SAFE_R2
  );
}

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

/** Minimal apex stand-in exposing exactly the four methods SuperHunt uses. */
function mockApex(x: number, y: number, z: number) {
  const pos = new THREE.Vector3(x, y, z);
  return {
    ate: 0,
    cleared: 0,
    hunt: null as [number, number, number] | null,
    worldPosition(out: THREE.Vector3): THREE.Vector3 {
      return out.copy(pos);
    },
    setHuntTarget(hx: number, hy: number, hz: number): void {
      this.hunt = [hx, hy, hz];
    },
    clearHunt(): void {
      this.cleared++;
      this.hunt = null;
    },
    eat(): void {
      this.ate++;
    },
  };
}

describe('SuperHunt', () => {
  test('an organism inside EAT_R is eaten (apex fed) and re-enters ~5 s later', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0);
    entities.spawn(new THREE.Vector3(0, 10, 0), 0); // right at the apex → eaten
    const bodies = [apex] as unknown as SuperBodySystem[];
    hunt.update(bodies, entities, 1, DT);
    expect(hunt.eaten).toBe(1);
    expect(apex.ate).toBe(1);
    expect(entities.list.length).toBe(0);
    expect(hunt.stats().pending).toBe(1);
    hunt.update(bodies, entities, 6.02, DT); // 1 + 5 → respawns
    expect(entities.list.length).toBe(1);
    expect(hunt.stats().pending).toBe(0);
    hunt.dispose();
  });

  test('a sensed-but-not-touching organism is PURSUED, not eaten', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0);
    entities.spawn(new THREE.Vector3(0, 10, 100), 0); // 100u away: inside SENSES_R(150), outside EAT_R(22.5)
    hunt.update([apex] as unknown as SuperBodySystem[], entities, 1, DT);
    expect(hunt.eaten).toBe(0);
    expect(entities.list.length).toBe(1);
    expect(apex.hunt).not.toBeNull();
    expect(apex.hunt![2]).toBeCloseTo(100, 3); // locked onto the prey's z
    hunt.dispose();
  });

  test('an NHI at contact is neither consumed nor pursued as ordinary prey', () => {
    const ctx = makeCtx(20, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0);
    const nhi = entities.spawn(new THREE.Vector3(0, 10, 0), 0) as Entity;
    nhi.userData.isNhi = true;
    hunt.update([apex] as unknown as SuperBodySystem[], entities, 1, DT);
    expect(hunt.eaten).toBe(0);
    expect(apex.ate).toBe(0);
    expect(apex.hunt).toBeNull();
    expect(entities.list).toEqual([nhi]);
    expect(hunt.stats().pending).toBe(0);
    hunt.dispose();
  });

  test('safe-zone policy denies a protected attacker without pursuit, consumption, or nutrition', () => {
    const ctx = makeCtx(21, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0); // protected; target at z=10 is outside the protected radius
    const target = entities.spawn(new THREE.Vector3(0, 10, 10), 0) as Entity;
    let callbacks = 0;
    hunt.update(
      [apex] as unknown as SuperBodySystem[],
      entities,
      1,
      DT,
      () => callbacks++,
      harmAllowedOutsideSafeZone,
    );
    expect(entities.list).toEqual([target]);
    expect(hunt.eaten).toBe(0);
    expect(hunt.stats().pending).toBe(0);
    expect(apex.ate).toBe(0);
    expect(apex.hunt).toBeNull();
    expect(apex.cleared).toBeGreaterThan(0);
    expect(callbacks).toBe(0);
    hunt.dispose();
  });

  test('safe-zone policy denies a protected target to an outside attacker', () => {
    const ctx = makeCtx(22, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 10); // outside; target at the origin is protected
    const target = entities.spawn(new THREE.Vector3(0, 10, 0), 0) as Entity;
    let callbacks = 0;
    hunt.update(
      [apex] as unknown as SuperBodySystem[],
      entities,
      1,
      DT,
      () => callbacks++,
      harmAllowedOutsideSafeZone,
    );
    expect(entities.list).toEqual([target]);
    expect(hunt.eaten).toBe(0);
    expect(hunt.stats().pending).toBe(0);
    expect(apex.ate).toBe(0);
    expect(apex.hunt).toBeNull();
    expect(apex.cleared).toBeGreaterThan(0);
    expect(callbacks).toBe(0);
    hunt.dispose();
  });

  test('safe-zone policy preserves normal consumption outside the zone', () => {
    const ctx = makeCtx(23, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 10);
    entities.spawn(new THREE.Vector3(0, 10, 20), 0); // both outside; within EAT_R
    let callbacks = 0;
    hunt.update(
      [apex] as unknown as SuperBodySystem[],
      entities,
      1,
      DT,
      () => callbacks++,
      harmAllowedOutsideSafeZone,
    );
    expect(entities.list.length).toBe(0);
    expect(hunt.eaten).toBe(1);
    expect(hunt.stats().pending).toBe(1);
    expect(apex.ate).toBe(1);
    expect(callbacks).toBe(1);
    hunt.dispose();
  });

  test('an organism beyond SENSES_R is ignored (apex resumes wander)', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0);
    entities.spawn(new THREE.Vector3(0, 10, 300), 0); // 300u: beyond SENSES_R
    hunt.update([apex] as unknown as SuperBodySystem[], entities, 1, DT);
    expect(hunt.eaten).toBe(0);
    expect(apex.hunt).toBeNull();
    expect(apex.cleared).toBeGreaterThan(0);
    hunt.dispose();
  });

  test('frozen dt (pause) neither eats nor steers', () => {
    const ctx = makeCtx(4, 50);
    const entities = new EntityManager(ctx);
    const hunt = new SuperHunt(ctx);
    const apex = mockApex(0, 10, 0);
    entities.spawn(new THREE.Vector3(0, 10, 0), 0);
    hunt.update([apex] as unknown as SuperBodySystem[], entities, 1, 0);
    expect(hunt.eaten).toBe(0);
    expect(apex.ate).toBe(0);
    expect(entities.list.length).toBe(1);
    hunt.dispose();
  });

  test('deterministic: two identical runs eat + respawn identically', () => {
    const run = (): { eaten: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const hunt = new SuperHunt(ctx);
      const apex = mockApex(0, 10, 0);
      const bodies = [apex] as unknown as SuperBodySystem[];
      for (let i = 0; i < 6; i++) entities.spawn(new THREE.Vector3(0, 10, 0), i % 5); // 6 at the apex
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        hunt.update(bodies, entities, t, DT);
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      hunt.dispose();
      return { eaten: hunt.eaten, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});
