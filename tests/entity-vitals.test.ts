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
 *
 * Also covers instVitals2 (social/quantum) and instVitals3 (identity/kinetic) lanes.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  InstancedEntityRenderer,
  packVitals,
  packVitals2,
  packVitals3,
} from '../src/sim/instanced-entities';
import type { Entity, EntityData, SimContext } from '../src/types';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { AuditTrail } from '../src/logging/audit';
import { getQuantizationConfig } from '../src/math/quantization';

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
      quantization: getQuantizationConfig('ultra'),
      simRate: 15,
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

const PHI = 0.61803398875;
const INV_TAU = 1 / (Math.PI * 2);
const fract = (x: number) => x - Math.floor(x);

describe('packVitals2 (pure)', () => {
  test('packs strategy / payoff / community hue / quantum phase into [offset..offset+3]', () => {
    const out = new Float32Array(4);
    packVitals2(out, 0, 1, 3, 2, Math.PI);
    expect(out[0]).toBe(1); // defector
    expect(out[1]).toBeCloseTo(0.6, 6); // payoff 3/5
    expect(out[2]).toBeCloseTo(fract(2 * PHI), 6); // community hue
    expect(out[3]).toBeCloseTo(0.5, 6); // qP = π → fract(0.5)
  });

  test('strategy lane is exactly 0 for cooperator/other, 1 for defector', () => {
    const out = new Float32Array(4);
    packVitals2(out, 0, 0, 0, 0, 0);
    expect(out[0]).toBe(0);
    packVitals2(out, 0, 1, 0, 0, 0);
    expect(out[0]).toBe(1);
    packVitals2(out, 0, 7, 0, 0, 0); // unexpected value → treated as non-defector
    expect(out[0]).toBe(0);
  });

  test('payoff clamps to [0,1]; community hue stays in [0,1); quantum phase wraps', () => {
    const out = new Float32Array(4);
    packVitals2(out, 0, 0, 50, 5, Math.PI / 2); // payoff over T=5 → 1
    expect(out[1]).toBe(1);
    expect(out[3]).toBeCloseTo(0.25, 6); // qP = π/2 → 0.25
    packVitals2(out, 0, 0, -10, 0, 0); // negative payoff → 0
    expect(out[1]).toBe(0);
    // community hue identical for the same index, distinct neighbors, always in [0,1).
    for (let g = 0; g < 12; g++) {
      packVitals2(out, 0, 0, 0, g, 0);
      expect(out[2]).toBeGreaterThanOrEqual(0);
      expect(out[2]).toBeLessThan(1);
      expect(out[2]).toBeCloseTo(fract(g * PHI), 6);
    }
    // quantum phase wraps past a full turn.
    packVitals2(out, 0, 0, 0, 0, 2 * Math.PI + Math.PI / 2);
    expect(out[3]).toBeCloseTo(0.25, 4);
  });

  test('guards: non-finite inputs and negative community pack 0, never NaN', () => {
    const out = new Float32Array(4);
    packVitals2(out, 0, NaN, NaN, NaN, NaN);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
    expect(out[1]).toBe(0); // payoff NaN → 0
    expect(out[2]).toBe(0); // community NaN → 0
    expect(out[3]).toBe(0); // qP NaN → 0
    packVitals2(out, 0, 0, 0, -3, 0); // negative community → 0
    expect(out[2]).toBe(0);
  });

  test('writes exactly 4 floats at offset; neighbors untouched', () => {
    const out = new Float32Array(8).fill(-1);
    packVitals2(out, 4, 1, 5, 0, 0);
    expect(Array.from(out.slice(0, 4))).toEqual([-1, -1, -1, -1]);
    expect(out[4]).toBe(1);
    expect(out[5]).toBe(1);
    expect(out[6]).toBe(0);
    expect(out[7]).toBe(0);
  });
});

describe('instVitals2 reaches the pool buffer via sync', () => {
  test("a live organism's social/quantum state is packed into instVitals2", () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeVitalEntity(geos[0]!, { strategy: 1, payoff: 3, setGroup: 2, qP: Math.PI });
    r.sync([e], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const arr = (pool.geometry.getAttribute('instVitals2') as THREE.InstancedBufferAttribute)
      .array as Float32Array;
    expect(arr[0]).toBe(1); // defector
    expect(arr[1]).toBeCloseTo(0.6, 5); // payoff
    expect(arr[2]).toBeCloseTo(fract(2 * PHI), 5); // community hue
    expect(arr[3]).toBeCloseTo(fract(Math.PI * INV_TAU), 5); // quantum phase
  });

  test('a bare data-mesh packs zeros into instVitals2, never NaN', () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(geos);
    const r = new InstancedEntityRenderer(ctx);
    r.sync([makeVitalEntity(geos[0]!, {})], 'solid');
    const pool = ctx.scene.children.find(
      (o) => o instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const arr = (pool.geometry.getAttribute('instVitals2') as THREE.InstancedBufferAttribute)
      .array as Float32Array;
    for (let i = 0; i < 4; i++) {
      expect(Number.isFinite(arr[i])).toBe(true);
      expect(arr[i]).toBe(0);
    }
  });
});

const ASCENT_SCALE = 8;
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

describe('packVitals3 (pure)', () => {
  test('packs lineage / species / ascent / girth into [offset..offset+3]', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, 3, 17, 0.02, 1.2);
    expect(out[0]).toBeCloseTo(fract(3 * PHI), 6); // lineage hue (phylum 3)
    expect(out[1]).toBeCloseTo(fract(17 * PHI), 6); // species hue (morphotype 17)
    expect(out[2]).toBeCloseTo(clamp01(0.5 + 0.02 * ASCENT_SCALE), 6); // ascent (rising)
    expect(out[3]).toBeCloseTo(clamp01((1.2 - 0.4) / 1.6), 6); // girth (0.5)
  });

  test('ascent is signed about 0.5: level = 0.5, rising > 0.5, sinking < 0.5, and clamps', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, 0, 0, 0, 1); // level flight
    expect(out[2]).toBeCloseTo(0.5, 6);
    packVitals3(out, 0, 0, 0, 0.05, 1); // rising
    expect(out[2]!).toBeGreaterThan(0.5);
    packVitals3(out, 0, 0, 0, -0.05, 1); // sinking
    expect(out[2]!).toBeLessThan(0.5);
    packVitals3(out, 0, 0, 0, 10, 1); // extreme climb → clamps to 1
    expect(out[2]).toBe(1);
    packVitals3(out, 0, 0, 0, -10, 1); // extreme dive → clamps to 0
    expect(out[2]).toBe(0);
  });

  test('girth maps the market render-scale into [0,1] and clamps both ends', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, 0, 0, 0, 0.4); // smallest → 0
    expect(out[3]).toBeCloseTo(0, 6);
    packVitals3(out, 0, 0, 0, 0, 2.0); // largest → 1
    expect(out[3]).toBeCloseTo(1, 6);
    packVitals3(out, 0, 0, 0, 0, 0.1); // below floor → clamps 0
    expect(out[3]).toBe(0);
    packVitals3(out, 0, 0, 0, 0, 9); // huge → clamps 1
    expect(out[3]).toBe(1);
  });

  test('an unaffiliated phylum (−1) packs lineage 0 (no false lineage signature)', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, -1, 5, 0, 1);
    expect(out[0]).toBe(0); // unaffiliated → neutral lineage
    expect(out[1]).toBeCloseTo(fract(5 * PHI), 6); // species still reads
  });

  test('every lane is finite and in [0,1] for adversarial inputs (no NaN/Inf leaks)', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, NaN, Infinity, NaN, Infinity);
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    packVitals3(out, 0, -Infinity, -5, -Infinity, NaN);
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('hue lanes WRAP (large phylum/morphotype indices stay in [0,1))', () => {
    const out = new Float32Array(4);
    packVitals3(out, 0, 999, 1234, 0, 1);
    expect(out[0]).toBeCloseTo(fract(999 * PHI), 6);
    expect(out[0]!).toBeGreaterThanOrEqual(0);
    expect(out[0]!).toBeLessThan(1);
    expect(out[1]!).toBeGreaterThanOrEqual(0);
    expect(out[1]!).toBeLessThan(1);
  });

  test('writes exactly 4 floats at offset; neighbours untouched', () => {
    const out = new Float32Array(8).fill(-1);
    packVitals3(out, 2, 4, 8, 0.01, 1.0);
    expect(out[0]).toBe(-1);
    expect(out[1]).toBe(-1);
    for (let i = 2; i < 6; i++) expect(out[i]).not.toBe(-1);
    expect(out[6]).toBe(-1);
    expect(out[7]).toBe(-1);
  });
});

describe('packVitals3 wired into InstancedEntityRenderer.sync', () => {
  function makeCtxDesktop(): SimContext {
    const rng = mulberry32(7);
    return {
      scene: new THREE.Scene(),
      quality: {
        tier: 'desktop',
        isMobile: false,
        instanced: true,
        dprCap: 2,
        maxEntities: 64,
        targetEntities: 64,
        quantumCount: 5,
        maxLinks: 100,
        shadows: false,
        starCount: 5,
        quantization: getQuantizationConfig('desktop'),
        simRate: 15,
      },
      rng,
      grid: new SpatialHash<Entity>(8),
      morphs: [],
      geos: [new THREE.IcosahedronGeometry(1, 0)],
      state: {
        chaos: 2,
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
      audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
      sfx: () => undefined,
    };
  }

  test('a live organism reaches the pool instVitals3 buffer; a bare mesh packs zeros', () => {
    const ctx = makeCtxDesktop();
    const renderer = new InstancedEntityRenderer(ctx);
    const geo = ctx.geos[0]!;
    const mat = new THREE.MeshStandardMaterial();

    // A live organism with real identity + kinetic state.
    const live = new THREE.Mesh(geo, mat) as unknown as Entity;
    live.position.set(1, 2, 3);
    live.scale.setScalar(1.6);
    const ud = live.userData as Partial<EntityData>;
    ud.phylum = 4;
    ud.mi = 9;
    ud.vel = new THREE.Vector3(0, 0.03, 0); // rising
    ud.energy = 60;
    ud.age = 10;
    ud.life = 1000;
    ud.act = 0.2;
    ud.strategy = 0;
    ud.payoff = 1;
    ud.setGroup = 0;
    ud.qP = 0;

    // A bare data-mesh lacking full EntityData → must pack zeros (never NaN).
    const bare = new THREE.Mesh(geo, mat) as unknown as Entity;
    bare.position.set(-1, -1, -1);

    const fr = { t: 0, chaos: 2, bass: 0, nightmare: 0 };
    renderer.sync([live, bare], 'solid', fr);

    const pools = (
      renderer as unknown as { pools: { used: number; vitals3: THREE.InstancedBufferAttribute }[] }
    ).pools;
    const pool = pools.find((p) => p.used > 0);
    expect(pool).toBeDefined();
    const arr = pool!.vitals3.array as Float32Array;
    // Every written lane is finite and in [0,1] (no NaN/Inf, no false lineage for the bare mesh).
    for (let i = 0; i < pool!.used * 4; i++) {
      expect(Number.isFinite(arr[i]!)).toBe(true);
      expect(arr[i]!).toBeGreaterThanOrEqual(0);
      expect(arr[i]!).toBeLessThanOrEqual(1);
    }
    // Some lane is non-zero — the live organism's identity/motion actually reached the GPU buffer.
    expect(Array.from(arr.slice(0, pool!.used * 4)).some((v) => v > 0)).toBe(true);
  });
});
