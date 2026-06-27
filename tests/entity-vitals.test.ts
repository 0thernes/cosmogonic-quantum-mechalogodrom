/**
 * V-VITALS per-instance channel (PHILOSOPHY "Real math or no math" + "Feedback over garnish").
 *
 * The instanced renderer packs four REAL per-entity signals into an `instVitals` vec4 that drives the
 * reliquary shader's named effect suite (phosphor gas, laser-dance synapse arcs, ashen cataract,
 * hyperspace ionizing flutter, gilded buffer shimmer, singulrosity bloom, bit-glitch chaos core,
 * shardwarp). The visuals are spectacular, but each is a FALSIFIABLE readout — so this pins the data
 * contract that makes them honest, not the pixels.
 *
 * Pure `packVitals`:
 * - x = wealth `energy/100`, y = senescence `age/life`, z = neural `act`, w = exertion `speed×8`;
 * - every lane finite and in [0,1] — non-finite inputs and `life<=0` pack 0, large inputs clamp;
 * - writes exactly 4 floats at `offset`, leaving the rest of the buffer untouched.
 *
 * Wired into `InstancedEntityRenderer.sync`:
 * - a live organism's packed state reaches the pool's `instVitals` attribute buffer;
 * - a bare data-mesh without full `EntityData` packs zeros (never NaN) — the renderer is robust.
 *
 * Headless: scene-graph only, no WebGL (the pattern from tests/instanced.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { InstancedEntityRenderer, packVitals } from '../src/sim/instanced-entities';
import type { Entity, EntityData, SimContext } from '../src/types';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { AuditTrail } from '../src/logging/audit';

describe('packVitals (pure)', () => {
  test('packs wealth / senescence / neural / exertion into [offset..offset+3]', () => {
    const out = new Float32Array(4);
    packVitals(out, 0, 80, 300, 1000, 0.4, 0.1);
    expect(out[0]).toBeCloseTo(0.8, 6); // wealth = 80/100
    expect(out[1]).toBeCloseTo(0.3, 6); // senescence = 300/1000
    expect(out[2]).toBeCloseTo(0.4, 6); // neural = act
    expect(out[3]).toBeCloseTo(0.8, 6); // exertion = 0.1 × 8
  });

  test('every lane clamps to [0,1]', () => {
    const out = new Float32Array(4);
    packVitals(out, 0, 1e9, 1e9, 1000, 50, 1e6); // all over-range
    expect(Array.from(out)).toEqual([1, 1, 1, 1]);
    packVitals(out, 0, -50, -10, 1000, -3, -7); // all under-range
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
  });

  test('guards: non-finite inputs and life<=0 pack 0, never NaN', () => {
    const out = new Float32Array(4);
    packVitals(out, 0, NaN, NaN, NaN, NaN, NaN);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
    // life<=0 ⇒ senescence 0 (no divide-by-zero), other lanes still computed.
    packVitals(out, 0, 50, 500, 0, 0.5, 0);
    expect(out[0]).toBeCloseTo(0.5, 6);
    expect(out[1]).toBe(0);
    expect(out[2]).toBeCloseTo(0.5, 6);
  });

  test('writes exactly 4 floats at offset; neighbors untouched', () => {
    const out = new Float32Array(8).fill(-1);
    packVitals(out, 4, 100, 0, 1000, 0, 0);
    expect(Array.from(out.slice(0, 4))).toEqual([-1, -1, -1, -1]); // before window untouched
    expect(out[4]).toBeCloseTo(1, 6);
    expect(out[5]).toBe(0);
    expect(out[6]).toBe(0);
    expect(out[7]).toBe(0);
  });
});

function makeCtx(geos: THREE.BufferGeometry[]): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'ultra' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities: 64,
      targetEntities: 64,
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

/** Data-mesh carrying the vital fields `sync` reads (other EntityData fields are unused here). */
function makeVitalEntity(geo: THREE.BufferGeometry, vitals: Partial<EntityData>): Entity {
  const mat = new THREE.MeshStandardMaterial({ color: 0x335577, emissive: 0x112233 });
  const mesh = new THREE.Mesh(geo, mat) as Entity;
  mesh.matrixAutoUpdate = false;
  mesh.position.set(1, 2, 3);
  mesh.userData = vitals as EntityData;
  return mesh;
}

describe('instVitals reaches the pool buffer via sync', () => {
  test("a live organism's real state is packed into the per-instance instVitals attribute", () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeVitalEntity(geos[0]!, {
      energy: 80,
      age: 300,
      life: 1000,
      act: 0.4,
      vel: new THREE.Vector3(0.06, 0, 0.08), // |v| = 0.1 → exertion 0.8
    });
    r.sync([e], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const att = pool.geometry.getAttribute('instVitals') as THREE.InstancedBufferAttribute;
    const arr = att.array as Float32Array;
    expect(arr[0]).toBeCloseTo(0.8, 5); // wealth
    expect(arr[1]).toBeCloseTo(0.3, 5); // senescence
    expect(arr[2]).toBeCloseTo(0.4, 5); // neural
    expect(arr[3]).toBeCloseTo(0.8, 5); // exertion
  });

  test('a bare data-mesh (no vital fields) packs zeros, never NaN — renderer stays robust', () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeVitalEntity(geos[0]!, {}); // empty userData
    r.sync([e], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const arr = (pool.geometry.getAttribute('instVitals') as THREE.InstancedBufferAttribute)
      .array as Float32Array;
    for (let i = 0; i < 4; i++) {
      expect(Number.isFinite(arr[i])).toBe(true);
      expect(arr[i]).toBe(0);
    }
  });
});
