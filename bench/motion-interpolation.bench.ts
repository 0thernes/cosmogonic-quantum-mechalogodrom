/**
 * Phase 1.2: GPU Motion Interpolation benchmark.
 *
 * Measures the performance impact of:
 * 1. Packing motion vectors into instanced buffers
 * 2. Running simulation at decoupled rates (15 Hz vs 60 Hz)
 * 3. Overall frame time with interpolation enabled
 */
import { bench, group, run } from 'mitata';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { InstancedEntityRenderer } from '../src/sim/instanced-entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, EntityData } from '../src/types';

function makeCtx(seed: number, simRate: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities: 10000,
      targetEntities: 10000,
      quantumCount: 100,
      maxLinks: 100,
      shadows: false,
      starCount: 100,
      quantization: getQuantizationConfig('laptop'),
      simRate,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: {
      chaos: 1,
      mutations: 0,
      timeScale: 1,
      renderMode: 'solid',
      sim: 1,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0.5, z: 0.3 },
      viewIdx: 0,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      algoMode: 'single',
      algoTimer: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

function makeEntity(geo: THREE.BufferGeometry, x: number, y: number, z: number): Entity {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  mesh.position.set(x, y, z);
  const fullData: EntityData = {
    mi: 0,
    vel: new THREE.Vector3(0.1, 0.1, 0.1),
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
  return mesh as Entity;
}

function createEntities(count: number, geos: THREE.BufferGeometry[]): Entity[] {
  const entities: Entity[] = [];
  for (let i = 0; i < count; i++) {
    const geo = geos[i % geos.length];
    if (!geo) continue;
    const x = (Math.random() - 0.5) * 100;
    const y = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    entities.push(makeEntity(geo, x, y, z));
  }
  return entities;
}

group('Phase 1.2: GPU Motion Interpolation', () => {
  const ctx60Hz = makeCtx(42, 60);
  const ctx15Hz = makeCtx(42, 15);
  const renderer60Hz = new InstancedEntityRenderer(ctx60Hz);
  const renderer15Hz = new InstancedEntityRenderer(ctx15Hz);

  const entityCounts = [1000, 5000, 10000];

  for (const count of entityCounts) {
    const entities = createEntities(count, ctx60Hz.geos);

    bench(`sync ${count} entities at 60 Hz (baseline)`, () => {
      renderer60Hz.sync(entities, 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 60);
    });

    bench(`sync ${count} entities at 15 Hz (interpolation)`, () => {
      renderer15Hz.sync(entities, 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);
    });
  }

  // Benchmark the overhead of motion vector packing
  const ctx = makeCtx(42, 15);
  const renderer = new InstancedEntityRenderer(ctx);
  const entities = createEntities(5000, ctx.geos);

  bench('motion vector packing overhead (5000 entities)', () => {
    renderer.sync(entities, 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);
  });

  // Benchmark render-only frames (no simulation)
  bench('render-only frame (no simulation step)', () => {
    renderer.sync(entities, 'solid', { t: 0.1, chaos: 0, bass: 0, nightmare: 0 }, 15);
  });
});

run();
