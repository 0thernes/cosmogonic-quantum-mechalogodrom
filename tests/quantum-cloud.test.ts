/**
 * QuantumCloud implodeAt/setBreath (audit fix B). Falsifiable claims:
 * - implodeAt(basis) flags exactly the `index % 32 === basis` subset as collapsed,
 *   through the EXISTING collapse-timer path (so update() respawns them after 2 s);
 * - out-of-range / fractional basis is a no-op;
 * - setBreath(level) sets material.size = 0.07·(1 + 0.35·clamp01(level)) — a silent
 *   world (level 0) renders exactly the legacy size.
 *
 * Headless: three's Scene/BufferGeometry/PointsMaterial need no DOM until render.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { QuantumCloud } from '../src/sim/quantum';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { SimContext, SimState } from '../src/types';

/** Private internals reached for state assertions (analytics.test.ts cast pattern). */
interface CloudInternals {
  collapsed: Uint8Array;
  collapseT: Float32Array;
  material: THREE.PointsMaterial;
}

/** Fresh mutable sim state (chaos 0.5 ⇒ cm 0.25, negligible random collapse odds). */
function makeState(): SimState {
  return {
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
  };
}

/** Minimal DOM-free SimContext: QuantumCloud reads only scene/quality/rng/state. */
function makeCtx(quantumCount: number): SimContext {
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone' as const,
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 10,
      targetEntities: 10,
      quantumCount,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng: mulberry32(7),
    grid: null as unknown as SimContext['grid'],
    morphs: [],
    geos: [],
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

describe('QuantumCloud.implodeAt', () => {
  test('dispose detaches the cloud and frees its geometry/material idempotently', () => {
    const ctx = makeCtx(8);
    const cloud = new QuantumCloud(ctx);
    expect(ctx.scene.children.length).toBe(1);
    const geoDispose = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const matDispose = spyOn(THREE.Material.prototype, 'dispose');
    cloud.dispose();
    expect(ctx.scene.children.length).toBe(0);
    expect(geoDispose).toHaveBeenCalledTimes(1);
    expect(matDispose).toHaveBeenCalledTimes(1);
    geoDispose.mockRestore();
    matDispose.mockRestore();
    expect(() => cloud.dispose()).not.toThrow();
  });

  test('flags exactly the index % 32 === basis subset as collapsed', () => {
    const ctx = makeCtx(100);
    const cloud = new QuantumCloud(ctx);
    const { collapsed, collapseT } = cloud as unknown as CloudInternals;
    cloud.implodeAt(5);
    for (let qi = 0; qi < 100; qi++) {
      expect(collapsed[qi]).toBe(qi % 32 === 5 ? 1 : 0);
    }
    // Collapse timers restart from zero — the existing 2 s freeze path.
    for (let qi = 5; qi < 100; qi += 32) {
      expect(collapseT[qi]).toBe(0);
    }
  });

  test('out-of-range or fractional basis selects the empty subset (no-op)', () => {
    const ctx = makeCtx(100);
    const cloud = new QuantumCloud(ctx);
    const { collapsed } = cloud as unknown as CloudInternals;
    cloud.implodeAt(-1);
    cloud.implodeAt(32);
    cloud.implodeAt(2.5);
    cloud.implodeAt(Number.NaN);
    for (let qi = 0; qi < 100; qi++) {
      expect(collapsed[qi]).toBe(0);
    }
  });

  test('imploded particles respawn through the existing collapse path after 2 s', () => {
    const ctx = makeCtx(100);
    const cloud = new QuantumCloud(ctx);
    const { collapsed } = cloud as unknown as CloudInternals;
    cloud.implodeAt(0);
    ctx.state.frame = 1;
    cloud.update(2.1, 0.1); // collapseT 0 → 2.1 > 2 ⇒ respawn branch clears the flag
    for (let qi = 0; qi < 100; qi += 32) {
      expect(collapsed[qi]).toBe(0);
    }
  });
});

describe('QuantumCloud.setBreath', () => {
  test('size = 0.07·(1 + 0.35·clamp01(level)); silent world keeps the legacy size', () => {
    const ctx = makeCtx(10);
    const cloud = new QuantumCloud(ctx);
    const { material } = cloud as unknown as CloudInternals;
    expect(material.size).toBeCloseTo(0.07, 10); // boot = legacy size
    cloud.setBreath(1);
    expect(material.size).toBeCloseTo(0.07 * 1.35, 10);
    cloud.setBreath(0.5);
    expect(material.size).toBeCloseTo(0.07 * (1 + 0.35 * 0.5), 10);
    cloud.setBreath(5); // clamped to 1
    expect(material.size).toBeCloseTo(0.07 * 1.35, 10);
    cloud.setBreath(-3); // clamped to 0
    expect(material.size).toBeCloseTo(0.07, 10);
    cloud.setBreath(0);
    expect(material.size).toBeCloseTo(0.07, 10);
  });
});
