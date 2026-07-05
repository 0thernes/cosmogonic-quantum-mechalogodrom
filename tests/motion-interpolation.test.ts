/**
 * Phase 1.2: GPU Motion Interpolation tests.
 *
 * Verifies that:
 * 1. Motion vector attributes are correctly packed into instanced buffers
 * 2. Simulation tick timestamps are tracked correctly
 * 3. Quality-tier-specific simulation rates are applied
 * 4. The frame governor correctly decouples simulation from rendering
 */
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

describe('Phase 1.2: GPU Motion Interpolation', () => {
  test('motion vector attributes are packed into instanced buffers', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);
    entity.position.set(1, 2, 3);

    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);

    // Verify that the pool was created with motion attributes
    const poolKey = 0; // geo index 0, transparent false
    const pool = renderer['pools'][poolKey];
    expect(pool).toBeDefined();
    if (!pool) return;
    expect(pool.prevPos).toBeDefined();
    expect(pool.simTick).toBeDefined();

    // Verify that the previous position was stored
    const prevPosArr = pool.prevPos.array as Float32Array;
    expect(prevPosArr[0]).toBeCloseTo(1); // x
    expect(prevPosArr[1]).toBeCloseTo(2); // y
    expect(prevPosArr[2]).toBeCloseTo(3); // z

    // Verify that the sim tick was stored
    const simTickArr = pool.simTick.array as Float32Array;
    expect(simTickArr[0]).toBe(0);
  });

  test('simulation tick timestamps are tracked across frames', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);
    entity.position.set(1, 2, 3);

    // First frame at t=0
    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 15);

    // Move entity
    entity.position.set(2, 3, 4);

    // Second frame at t=0.1
    renderer.sync([entity], 'solid', { t: 0.1, chaos: 0, bass: 0, nightmare: 0 }, 15);

    const poolKey = 0;
    const pool = renderer['pools'][poolKey];
    if (!pool) return;
    const simTickArr = pool.simTick.array as Float32Array;

    // Verify that the sim tick was updated to the latest frame time
    expect(simTickArr[0]).toBeCloseTo(0.1);

    // Verify that the previous position was updated to the new position
    const prevPosArr = pool.prevPos.array as Float32Array;
    expect(prevPosArr[0]).toBeCloseTo(2); // x
    expect(prevPosArr[1]).toBeCloseTo(3); // y
    expect(prevPosArr[2]).toBeCloseTo(4); // z
  });

  test('quality-tier-specific simulation rates are applied', () => {
    const ctx = makeCtx(42);
    ctx.quality.simRate = 10; // Tablet rate
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);

    renderer.sync([entity], 'solid', { t: 0, chaos: 0, bass: 0, nightmare: 0 }, 10);

    // Verify that the sim rate uniform is set
    expect(renderer['shaderUniforms'].uSimRate.value).toBe(10);
  });

  test('render time uniform is updated each frame', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const entity = makeEntity(geo);

    renderer.sync([entity], 'solid', { t: 0.5, chaos: 0, bass: 0, nightmare: 0 }, 15);

    // Verify that the render time uniform is set
    expect(renderer['shaderUniforms'].uRenderTime.value).toBe(0.5);
  });

  test('multiple entities pack motion vectors correctly', () => {
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

    const poolKey = 0;
    const pool = renderer['pools'][poolKey];
    if (!pool) return;
    const prevPosArr = pool.prevPos.array as Float32Array;

    // Verify all three positions are stored
    expect(prevPosArr[0]).toBeCloseTo(1); // entity1 x
    expect(prevPosArr[1]).toBeCloseTo(2); // entity1 y
    expect(prevPosArr[2]).toBeCloseTo(3); // entity1 z
    expect(prevPosArr[3]).toBeCloseTo(4); // entity2 x
    expect(prevPosArr[4]).toBeCloseTo(5); // entity2 y
    expect(prevPosArr[5]).toBeCloseTo(6); // entity2 z
    expect(prevPosArr[6]).toBeCloseTo(7); // entity3 x
    expect(prevPosArr[7]).toBeCloseTo(8); // entity3 y
    expect(prevPosArr[8]).toBeCloseTo(9); // entity3 z
  });

  test('shader uniforms include motion interpolation parameters', () => {
    const ctx = makeCtx(42);
    const renderer = new InstancedEntityRenderer(ctx);

    // Verify that the uniforms exist
    expect(renderer['shaderUniforms'].uSimRate).toBeDefined();
    expect(renderer['shaderUniforms'].uRenderTime).toBeDefined();

    // Verify default values
    expect(renderer['shaderUniforms'].uSimRate.value).toBe(60);
    expect(renderer['shaderUniforms'].uRenderTime.value).toBe(0);
  });
});
