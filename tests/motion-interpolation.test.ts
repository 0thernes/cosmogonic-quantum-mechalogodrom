/** Instanced motion data-flow tests: instance matrices are the sole transform authority. */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { InstancedEntityRenderer } from '../src/sim/instanced-entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, EntityData } from '../src/types';

function makeCtx(seed: number): SimContext {
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
      maxEntities: 100,
      targetEntities: 100,
      quantumCount: 10,
      maxLinks: 10,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('laptop'),
      simRate: 15,
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

function makeEntity(geo: THREE.BufferGeometry, userData: Partial<EntityData> = {}): Entity {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
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
    ...userData,
  };
  mesh.userData = fullData;
  return mesh as Entity;
}

function poolMesh(ctx: SimContext): THREE.InstancedMesh {
  const mesh = ctx.scene.children.find((child) => child instanceof THREE.InstancedMesh);
  expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
  return mesh as THREE.InstancedMesh;
}

function instancePosition(mesh: THREE.InstancedMesh, slot: number): THREE.Vector3 {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(slot, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}

describe('Instanced entity motion data flow', () => {
  test('instance matrix carries translation without redundant motion attributes', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);
    entity.position.set(1, 2, 3);

    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);

    const pool = poolMesh(ctx);
    expect(instancePosition(pool, 0).toArray()).toEqual([1, 2, 3]);
    expect(pool.geometry.getAttribute('instPrevPos')).toBeUndefined();
    expect(pool.geometry.getAttribute('instSimTick')).toBeUndefined();
  });

  test('matrix translation tracks the latest simulation position across frames', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);
    entity.position.set(1, 2, 3);

    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);
    const pool = poolMesh(ctx);
    expect(instancePosition(pool, 0).toArray()).toEqual([1, 2, 3]);

    entity.position.set(2, 3, 4);
    renderer.sync([entity], 'solid', { t: 0.1, chaos: 0, bass: 0, nightmare: 0 }, 15);

    expect(instancePosition(pool, 0).toArray()).toEqual([2, 3, 4]);
  });

  test('legacy simulation-rate argument remains accepted without shader clocks', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);

    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 10);

    const uniforms = renderer['shaderUniforms'] as unknown as Record<string, unknown>;
    expect(uniforms['uSimRate']).toBeUndefined();
    expect(uniforms['uRenderTime']).toBeUndefined();
    expect(instancePosition(poolMesh(ctx), 0).toArray()).toEqual([0, 0, 0]);
  });

  test('multiple entities pack independent matrix translations', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity1 = makeEntity(geo);
    const entity2 = makeEntity(geo);
    const entity3 = makeEntity(geo);

    entity1.position.set(1, 2, 3);
    entity2.position.set(4, 5, 6);
    entity3.position.set(7, 8, 9);

    renderer.sync(
      [entity1, entity2, entity3],
      'solid',
      { t: 0, chaos: 0, bass: 0, nightmare: 0 },
      15,
    );

    const pool = poolMesh(ctx);
    expect(instancePosition(pool, 0).toArray()).toEqual([1, 2, 3]);
    expect(instancePosition(pool, 1).toArray()).toEqual([4, 5, 6]);
    expect(instancePosition(pool, 2).toArray()).toEqual([7, 8, 9]);
  });
});
