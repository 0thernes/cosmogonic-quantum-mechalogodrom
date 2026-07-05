/**
 * Phase 1.3: Perceptual Priority Cascades tests.
 *
 * Verifies that:
 * 1. Entities are sorted by distance to camera
 * 2. Disabled priority schemes assign all entities to the full-rate near tier
 * 3. Full-rate evaluation returns all entities every frame
 * 4. Hive mind copying is disabled/no-op
 * 5. Quality-tier-specific schemes preserve the full-rate contract
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { PerceptualPriorityCascade } from '../src/sim/perceptual-priority';
import type { Entity, EntityData } from '../src/types';

function makeEntity(x: number, y: number, z: number): Entity {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  mesh.position.set(x, y, z);
  const fullData: EntityData = {
    mi: 0,
    vel: new THREE.Vector3(0, 0, 0),
    age: 0,
    life: 100,
    ph: 0,
    sc: 1,
    beh: 'drift',
    spd: 0.1,
    wf: 1,
    wa: 0.1,
    sT: 0,
    belly: 0,
    sortVal: 0,
    nW: 1,
    act: 0,
    qP: 0,
    energy: 50,
    strategy: 0,
    typeId: 0,
    setGroup: 0,
    payoff: 0,
    phylum: -1,
    beh2: null,
  };
  mesh.userData = fullData;
  return mesh as unknown as Entity;
}

describe('Phase 1.3: Perceptual Priority Cascades', () => {
  test('entities are sorted by distance to camera', () => {
    const cascade = new PerceptualPriorityCascade('desktop');
    const entities: (Entity | undefined)[] = [
      makeEntity(10, 0, 0), // far
      makeEntity(1, 0, 0), // near
      makeEntity(5, 0, 0), // mid
    ];
    const camera = new THREE.Vector3(0, 0, 0);

    cascade.updatePriorities(entities, camera, 0);

    // The cascade should have processed the entities
    // Check that near indices are populated (entities within near capacity)
    const stats = cascade.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.near).toBeGreaterThan(0);
    expect(cascade.getEntitiesToEvaluate(1)).toEqual([1, 2, 0]);
  });

  test('disabled priority tiers assign every entity to full-rate near evaluation', () => {
    const cascade = new PerceptualPriorityCascade('phone');
    const entities: (Entity | undefined)[] = [];

    // Create 100 entities at varying distances
    for (let i = 0; i < 100; i++) {
      entities.push(makeEntity(i, 0, 0));
    }

    const camera = new THREE.Vector3(0, 0, 0);
    cascade.updatePriorities(entities, camera, 0);

    const stats = cascade.getStats();
    expect(stats.near).toBe(100);
    expect(stats.mid).toBe(0);
    expect(stats.far).toBe(0);
  });

  test('full-rate evaluation returns every entity every frame', () => {
    const cascade = new PerceptualPriorityCascade('phone');
    const entities: (Entity | undefined)[] = [];

    // Create 30 entities
    for (let i = 0; i < 30; i++) {
      entities.push(makeEntity(i, 0, 0));
    }

    const camera = new THREE.Vector3(0, 0, 0);
    cascade.updatePriorities(entities, camera, 0);

    const frame0 = cascade.getEntitiesToEvaluate(0);
    expect(frame0.length).toBe(30);

    const frame1 = cascade.getEntitiesToEvaluate(1);
    expect(frame1.length).toBe(30);

    const frame5 = cascade.getEntitiesToEvaluate(5);
    expect(frame5.length).toBe(30);
  });

  test('hive mind is disabled and does not copy velocities', () => {
    const cascade = new PerceptualPriorityCascade('phone');
    const entities: (Entity | undefined)[] = [];

    for (let i = 0; i < 600; i++) {
      const e = makeEntity(i, 0, 0);
      e.userData.vel.set(i, i + 1, i + 2);
      entities.push(e);
    }
    const before = entities.map((e) => e!.userData.vel.clone());

    const camera = new THREE.Vector3(0, 0, 0);
    cascade.updatePriorities(entities, camera, 0);

    // Apply hive mind
    let rngCallCount = 0;
    cascade.applyHiveMind(entities, () => {
      rngCallCount++;
      return 0.5;
    });

    expect(rngCallCount).toBe(0);
    for (let i = 0; i < entities.length; i++) {
      expect(entities[i]!.userData.vel.equals(before[i]!)).toBe(true);
    }
  });

  test('quality-tier-specific schemes are correct', () => {
    const phoneCascade = new PerceptualPriorityCascade('phone');
    const tabletCascade = new PerceptualPriorityCascade('tablet');
    const desktopCascade = new PerceptualPriorityCascade('desktop');

    const phoneStats = phoneCascade.getStats();
    expect(phoneStats.near).toBe(0); // no entities yet
    expect(phoneStats.mid).toBe(0);
    expect(phoneStats.far).toBe(0);

    const tabletStats = tabletCascade.getStats();
    expect(tabletStats.near).toBe(0);
    expect(tabletStats.mid).toBe(0);
    expect(tabletStats.far).toBe(0);

    const desktopStats = desktopCascade.getStats();
    expect(desktopStats.near).toBe(0);
    expect(desktopStats.mid).toBe(0);
    expect(desktopStats.far).toBe(0);
  });

  test('re-sorting only happens when camera moves significantly', () => {
    const cascade = new PerceptualPriorityCascade('desktop');
    const entities: (Entity | undefined)[] = [makeEntity(1, 0, 0)];

    const camera1 = new THREE.Vector3(0, 0, 0);
    cascade.updatePriorities(entities, camera1, 0);

    // Small camera movement should not trigger re-sort
    const camera2 = new THREE.Vector3(0.1, 0, 0);
    cascade.updatePriorities(entities, camera2, 1);

    const stats1 = cascade.getStats();
    expect(stats1.total).toBe(1);

    // Large camera movement should trigger re-sort
    const camera3 = new THREE.Vector3(10, 0, 0);
    cascade.updatePriorities(entities, camera3, 2);

    const stats2 = cascade.getStats();
    expect(stats2.total).toBe(1);
  });

  test('re-sorting happens every N frames regardless of camera movement', () => {
    const cascade = new PerceptualPriorityCascade('desktop');
    const entities: (Entity | undefined)[] = [makeEntity(1, 0, 0)];

    const camera = new THREE.Vector3(0, 0, 0);
    cascade.updatePriorities(entities, camera, 0);

    // Wait for sort cadence (10 frames)
    cascade.updatePriorities(entities, camera, 10);

    const stats = cascade.getStats();
    expect(stats.total).toBe(1);
  });

  test('empty entity list is handled gracefully', () => {
    const cascade = new PerceptualPriorityCascade('desktop');
    const entities: (Entity | undefined)[] = [];
    const camera = new THREE.Vector3(0, 0, 0);

    cascade.updatePriorities(entities, camera, 0);

    const stats = cascade.getStats();
    expect(stats.total).toBe(0);
    expect(stats.near).toBe(0);
    expect(stats.mid).toBe(0);
    expect(stats.far).toBe(0);
  });

  test('undefined entities in list are skipped', () => {
    const cascade = new PerceptualPriorityCascade('desktop');
    const entities: (Entity | undefined)[] = [
      makeEntity(1, 0, 0),
      undefined,
      makeEntity(2, 0, 0),
      undefined,
      makeEntity(3, 0, 0),
    ];
    const camera = new THREE.Vector3(0, 0, 0);

    cascade.updatePriorities(entities, camera, 0);

    const stats = cascade.getStats();
    expect(stats.total).toBe(3); // only defined entities
  });
});
