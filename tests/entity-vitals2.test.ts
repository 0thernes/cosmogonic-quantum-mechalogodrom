/**
 * V-VITALS2 social + quantum per-instance channel (PHILOSOPHY "Real math or no math").
 *
 * The instanced renderer packs four more REAL per-entity signals into an `instVitals2` vec4 driving the
 * shader's V-VITALS2 suite (cooperator halo / defector barb-corona, payoff-swing iridescence, faction
 * war-paint, hive-resonance, superposition shimmer). Spectacular, but each is a FALSIFIABLE readout —
 * this pins the data contract.
 *
 * Pure `packVitals2`:
 * - x = strategy `0|1` (PD defector=1), y = payoff `clamp01(payoff/5)`, z = community hue
 *   `fract(setGroup×φ)`, w = quantum phase `fract(qP/2π)`;
 * - every lane finite + in [0,1]; non-finite inputs and negative community pack 0; cyclic lanes wrap;
 * - writes exactly 4 floats at `offset`.
 *
 * Wired into `InstancedEntityRenderer.sync`: a live organism's social/quantum state reaches the pool's
 * `instVitals2` buffer; a bare mesh packs zeros.
 *
 * Headless: scene-graph only (the pattern from tests/instanced.test.ts / entity-vitals.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { InstancedEntityRenderer, packVitals2 } from '../src/sim/instanced-entities';
import type { Entity, EntityData, SimContext } from '../src/types';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { AuditTrail } from '../src/logging/audit';
import { getQuantizationConfig } from '../src/math/quantization';

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

function makeEntity(geo: THREE.BufferGeometry, ud: Partial<EntityData>): Entity {
  const mat = new THREE.MeshStandardMaterial({ color: 0x335577, emissive: 0x112233 });
  const mesh = new THREE.Mesh(geo, mat) as Entity;
  mesh.matrixAutoUpdate = false;
  mesh.position.set(1, 2, 3);
  mesh.userData = ud as EntityData;
  return mesh;
}

describe('instVitals2 reaches the pool buffer via sync', () => {
  test("a live organism's social/quantum state is packed into instVitals2", () => {
    const geos = [new THREE.BoxGeometry(1, 1, 1)];
    const ctx = makeCtx(geos);
    const r = new InstancedEntityRenderer(ctx);
    const e = makeEntity(geos[0]!, { strategy: 1, payoff: 3, setGroup: 2, qP: Math.PI });
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
    r.sync([makeEntity(geos[0]!, {})], 'solid');
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
