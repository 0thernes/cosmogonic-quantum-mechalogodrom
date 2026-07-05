/**
 * V-VITALS3 identity + true-kinetic per-instance channel (PHILOSOPHY "Real math or no math").
 *
 * The instanced renderer packs four MORE real per-entity signals into an `instVitals3` vec4 that drives
 * the shader's V-VITALS4 suite — milky-brushed lineage bands, shardwarp species sigils, ascension
 * thermal updraft, sunset-expanded horizon, plasma-expanded filaments, neuralmimetic lattice, plasmoid
 * girth orbs, and the vision-expanded oculus. Spectacular, but each is a FALSIFIABLE readout of a REAL
 * dimension the earlier lanes never showed (taxonomy, true vertical motion, body size) — this pins the
 * data contract that keeps the spectacle honest, not the pixels.
 *
 * Pure `packVitals3`:
 * - x = lineage hue `phylum>=0 ? fract(phylum×φ) : 0` (the V3.2 phylum),
 * - y = species hue `fract(mi×φ)` (the morphotype index),
 * - z = ascent `clamp01(0.5 + vel.y×8)` (TRUE vertical velocity; 0.5 = level flight),
 * - w = girth `clamp01((scale−0.4)/1.6)` (the market-driven render scale);
 * - every lane finite + in [0,1]; non-finite inputs and an unaffiliated phylum (−1) pack 0; hue lanes wrap.
 *
 * Headless: scene-graph only (the pattern from tests/entity-vitals2.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { InstancedEntityRenderer, packVitals3 } from '../src/sim/instanced-entities';
import type { Entity, EntityData, SimContext } from '../src/types';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { AuditTrail } from '../src/logging/audit';
import { getQuantizationConfig } from '../src/math/quantization';

const PHI = 0.61803398875;
const ASCENT_SCALE = 8;
const fract = (x: number): number => x - Math.floor(x);
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
  function makeCtx(): SimContext {
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
    const ctx = makeCtx();
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
