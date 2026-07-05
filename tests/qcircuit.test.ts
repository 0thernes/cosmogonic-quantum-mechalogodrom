/**
 * QuantumCircuitSystem — the live statevector that puppet actions + sort swaps drive with gate
 * sequences, with a periodic Born-rule measurement (collapse). The pure register math lives in
 * math/quantum.ts (tested separately); this pins the SYSTEM contract: normalized Shannon entropy
 * stays in [0,1] across many updates, the last collapse is a valid basis index, and the whole
 * evolution — including the rng-sampled measurement — replays identically from one seed.
 *
 * Headless (fake-ctx pattern). `update()` reads ctx + draws measurement rng from ctx.rng.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { QuantumCircuitSystem } from '../src/sim/qcircuit';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
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
  };
}

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone' as const,
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 400,
      targetEntities: 400,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

const makeSys = (seed: number): QuantumCircuitSystem => new QuantumCircuitSystem(makeCtx(seed));

describe('QuantumCircuitSystem — normalized entropy, valid collapse, deterministic evolution', () => {
  test('Shannon entropy stays normalized in [0,1] across many updates', () => {
    const sys = makeSys(0x99aa01);
    for (let i = 0; i < 200; i++) {
      sys.update();
      expect(Number.isFinite(sys.entropy)).toBe(true);
      expect(sys.entropy).toBeGreaterThanOrEqual(0);
      expect(sys.entropy).toBeLessThanOrEqual(1);
    }
  });

  test('lastCollapse is a valid basis index (or -1 before any measurement)', () => {
    const sys = makeSys(0xaa0102);
    for (let i = 0; i < 200; i++) sys.update(); // enough to trigger periodic Born-rule collapses
    const c = sys.lastCollapse;
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(-1);
    expect(c).toBeLessThan(256); // ≤ 8-qubit register ⇒ < 2^8 basis states
  });

  test('identical seeds replay an identical entropy + collapse trace', () => {
    const a = makeSys(0xbb0203);
    const b = makeSys(0xbb0203);
    const ta: number[] = [];
    const tb: number[] = [];
    for (let i = 0; i < 150; i++) {
      a.update();
      b.update();
      ta.push(a.entropy, a.lastCollapse);
      tb.push(b.entropy, b.lastCollapse);
    }
    expect(tb).toEqual(ta);
  });
});
