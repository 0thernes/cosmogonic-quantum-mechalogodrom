/**
 * Instanced-pool helper tests (CONTRACTS V3.1): pure sizing/keying math of the
 * InstancedEntityRenderer plus a headless sync exercise against real (unrendered)
 * three.js objects — verifies slot mirroring, per-instance channels, growth and
 * the wireframe sweep without a WebGL context.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  InstancedEntityRenderer,
  grownCapacity,
  initialPoolCapacity,
  poolKey,
} from '../src/sim/instanced-entities';
import type { Entity, SimContext } from '../src/types';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { AuditTrail } from '../src/logging/audit';

describe('pool sizing math', () => {
  test('initialPoolCapacity: uniform share × headroom, floored at 16', () => {
    expect(initialPoolCapacity(10000, 40)).toBe(1000); // 250 × 4
    expect(initialPoolCapacity(650, 40)).toBe(65); // 16.25 → ceil 17 × 4 = 68? no: ceil(650/40 × 4)
    expect(initialPoolCapacity(40, 40)).toBe(16); // floor kicks in
    expect(initialPoolCapacity(100, 0)).toBe(100); // degenerate cache
  });

  test('grownCapacity doubles to fit and clamps at max', () => {
    expect(grownCapacity(16, 17, 10000)).toBe(32);
    expect(grownCapacity(16, 16, 10000)).toBe(16);
    expect(grownCapacity(16, 1000, 10000)).toBe(1024);
    expect(grownCapacity(16, 999999, 10000)).toBe(10000);
  });

  test('poolKey separates transparency variants per geometry', () => {
    expect(poolKey(0, false)).toBe(0);
    expect(poolKey(0, true)).toBe(1);
    expect(poolKey(7, false)).toBe(14);
    expect(poolKey(7, true)).toBe(15);
  });
});

/** Minimal SimContext for the renderer (no DOM, no WebGL — scene graph only). */
function makeCtx(maxEntities: number, geos: THREE.BufferGeometry[]): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'ultra' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 0,
      maxLinks: 0,
      shadows: false,
      starCount: 0,
    },
    rng: mulberry32(7),
    grid: new SpatialHash<Entity>(16),
    morphs: [],
    geos,
    state: {
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
    },
    audit: new AuditTrail(),
    sfx: () => {},
  };
}

/** Build a bare data-mesh entity over a cached geometry (mirrors EntityManager.spawn). */
function makeEntity(geo: THREE.BufferGeometry, transparent: boolean): Entity {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.2, 0.4, 0.8),
    emissive: new THREE.Color(0.1, 0.2, 0.3),
    emissiveIntensity: 2,
    transparent,
    opacity: transparent ? 0.4 : 1,
  });
  const mesh = new THREE.Mesh(geo, mat) as Entity;
  mesh.matrixAutoUpdate = false;
  mesh.position.set(3, 4, 5);
  return mesh;
}

describe('InstancedEntityRenderer.sync (headless)', () => {
  test('mirrors entities into per-(geometry, transparency) pools with live counts', () => {
    const geos = [new THREE.SphereGeometry(1, 4, 3), new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(64, geos);
    const r = new InstancedEntityRenderer(ctx);
    const a = makeEntity(geos[0]!, false);
    const b = makeEntity(geos[0]!, false);
    const c = makeEntity(geos[1]!, true);
    r.sync([a, b, c], 'solid');

    const pools = ctx.scene.children.filter((o) => o instanceof THREE.InstancedMesh);
    expect(pools.length).toBe(2); // sphere-opaque + box-transparent
    const counts = pools.map((p) => (p as THREE.InstancedMesh).count).sort((x, y) => x - y);
    expect(counts).toEqual([1, 2]);
  });

  test('per-instance emissive channel carries emissive·intensity and alpha', () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(64, geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeEntity(geos[0]!, true);
    r.sync([e], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const att = pool.geometry.getAttribute('instEmissive') as THREE.InstancedBufferAttribute;
    const arr = att.array as Float32Array;
    expect(arr[0]).toBeCloseTo(0.1 * 2, 6);
    expect(arr[1]).toBeCloseTo(0.2 * 2, 6);
    expect(arr[2]).toBeCloseTo(0.3 * 2, 6);
    expect(arr[3]).toBeCloseTo(0.4, 6); // transparent pool carries material opacity
  });

  test('matrices follow entity transforms across syncs; counts shrink on death', () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(64, geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeEntity(geos[0]!, false);
    r.sync([e], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    pool.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(3, 6);
    e.position.set(-9, 1, 2);
    r.sync([e], 'solid');
    pool.getMatrixAt(0, m);
    pos.setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(-9, 6);
    r.sync([], 'solid');
    expect(pool.count).toBe(0);
  });

  test('pool growth rebuilds a bigger InstancedMesh (event-driven, capacity ×2)', () => {
    // 8 geometries → uniform share 512 × HEADROOM 4 = 2048 initial capacity,
    // below the 4096 cap, so cap0+1 entities in ONE pool must trigger growth.
    const geos = Array.from({ length: 8 }, () => new THREE.BoxGeometry(1, 1, 1));
    const ctx = makeCtx(4096, geos);
    const r = new InstancedEntityRenderer(ctx);
    const first = [makeEntity(geos[0]!, false)];
    r.sync(first, 'solid');
    const before = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const cap0 = before.instanceMatrix.count;
    const many: Entity[] = [];
    for (let i = 0; i < cap0 + 1; i++) many.push(makeEntity(geos[0]!, false));
    r.sync(many, 'solid');
    const after = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    expect(after.count).toBe(cap0 + 1);
    expect(after.instanceMatrix.count).toBeGreaterThanOrEqual(cap0 + 1);
  });

  test('wireframe sweep flips pool materials only when the flag changes', () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(64, geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeEntity(geos[0]!, false);
    r.sync([e], 'wire');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    expect((pool.material as THREE.MeshStandardMaterial).wireframe).toBeTrue();
    r.sync([e], 'solid');
    expect((pool.material as THREE.MeshStandardMaterial).wireframe).toBeFalse();
  });
});
