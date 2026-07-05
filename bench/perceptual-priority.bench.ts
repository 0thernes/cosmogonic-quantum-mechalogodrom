/**
 * Phase 1.3: Perceptual Priority Cascades benchmark.
 *
 * Measures the performance impact of:
 * 1. Distance sorting entities by camera position
 * 2. Tiered entity evaluation (near/mid/far)
 * 3. Stochastic hive mind for far-tier entities
 */
import { bench, group, run } from 'mitata';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
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

function createEntities(count: number, seed = 1): (Entity | undefined)[] {
  const rng = mulberry32(seed);
  const entities: (Entity | undefined)[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 100;
    const y = (rng() - 0.5) * 100;
    const z = (rng() - 0.5) * 100;
    entities.push(makeEntity(x, y, z));
  }
  return entities;
}

group('Phase 1.3: Perceptual Priority Cascades', () => {
  const entityCounts = [1000, 5000, 10000];

  for (const count of entityCounts) {
    const entities = createEntities(count, count);
    const desktopCascade = new PerceptualPriorityCascade('desktop');
    const phoneCascade = new PerceptualPriorityCascade('phone');
    const desktopCamera = new THREE.Vector3(0, 0, 0);
    const phoneCamera = new THREE.Vector3(0, 0, 0);
    let desktopFrame = 0;
    let phoneFrame = 0;

    bench(`update priorities ${count} entities (desktop)`, () => {
      desktopCamera.x = desktopFrame % 2 === 0 ? 0 : 2;
      desktopCascade.updatePriorities(entities, desktopCamera, desktopFrame++);
    });

    bench(`update priorities ${count} entities (phone)`, () => {
      phoneCamera.x = phoneFrame % 2 === 0 ? 0 : 2;
      phoneCascade.updatePriorities(entities, phoneCamera, phoneFrame++);
    });
  }

  // Benchmark tiered evaluation
  const cascade = new PerceptualPriorityCascade('desktop');
  const entities = createEntities(10000, 42);
  const camera = new THREE.Vector3(0, 0, 0);
  cascade.updatePriorities(entities, camera, 0);

  bench('get entities to evaluate (frame 0)', () => {
    cascade.getEntitiesToEvaluate(0);
  });

  bench('get entities to evaluate (frame 5)', () => {
    cascade.getEntitiesToEvaluate(5);
  });

  bench('get entities to evaluate (frame 30)', () => {
    cascade.getEntitiesToEvaluate(30);
  });

  // Benchmark hive mind
  const hiveRng = mulberry32(99);
  bench('apply hive mind (10000 entities)', () => {
    cascade.applyHiveMind(entities, hiveRng);
  });

  // Benchmark stats retrieval
  bench('get stats', () => {
    cascade.getStats();
  });
});

run();
