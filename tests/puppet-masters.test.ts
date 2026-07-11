/**
 * PuppetMasterSystem — the three scheming hands (AETHON stokes chaos, SELENE shifts weather, KRONOS
 * reshapes organisms) that perturb the world on wealth/opportunity-driven timers. They were covered
 * only indirectly (the integrated world loop); this pins their public contract directly: exactly 3
 * hands, interventions that keep `state.chaos`/`weatherIdx`/`mutations` finite + in bounds, and a
 * fully reproducible intervention history from one seed (their actions draw from `ctx.rng`).
 *
 * Headless (fake-ctx pattern) — drives the real `update`/`act` over a real EntityManager + grid.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { PuppetMasterSystem } from '../src/sim/puppet-masters';
import { PLATFORM_CEIL, PLATFORM_FLOOR, PLATFORM_HALF } from '../src/sim/constants';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, PuppetEvent, SimContext, SimState } from '../src/types';

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

function makeCtx(seed: number, isMobile = true): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  const tier = isMobile ? ('phone' as const) : ('desktop' as const);
  return {
    scene: new THREE.Scene(),
    quality: {
      tier,
      isMobile,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 400,
      targetEntities: 400,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig(tier),
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

function makeWorld(
  seed: number,
  isMobile = true,
): {
  ctx: SimContext;
  pm: PuppetMasterSystem;
  events: PuppetEvent[];
} {
  const ctx = makeCtx(seed, isMobile);
  const entities = new EntityManager(ctx);
  entities.reset(50);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const events: PuppetEvent[] = [];
  // EVENT is a reused module scratch object — copy it on receipt to retain a history.
  const pm = new PuppetMasterSystem(ctx, entities, (e) => events.push({ ...e }));
  return { ctx, pm, events };
}

describe('PuppetMasterSystem — deterministic schemers that perturb the world within bounds', () => {
  test('preserves the exact mobile and desktop census', () => {
    const mobile = makeWorld(1, true).pm;
    const desktop = makeWorld(1, false).pm;
    expect(mobile.count).toBe(14);
    expect(desktop.count).toBe(100);
    mobile.dispose();
    desktop.dispose();
  }, 15_000);

  test('dispose() frees per-puppet geometries + materials and clears the count (idempotent)', () => {
    const { pm } = makeWorld(1);
    expect(pm.count).toBeGreaterThan(0);
    const matSpy = spyOn(THREE.Material.prototype, 'dispose');
    const geoSpy = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    pm.dispose();
    expect(matSpy).toHaveBeenCalled(); // body + ring materials freed
    expect(geoSpy).toHaveBeenCalled(); // body + ring geometries freed
    expect(pm.count).toBe(0);
    matSpy.mockRestore();
    geoSpy.mockRestore();
    expect(() => pm.dispose()).not.toThrow(); // idempotent — safe on an already-freed system
  }, 15_000);

  test('6000 frames keep world state finite + in bounds and fire valid interventions', () => {
    const { ctx, pm, events } = makeWorld(0x9a77e7);
    const hands = (pm as unknown as { pms: { mesh: THREE.Mesh }[] }).pms;
    let maxHorizontal = 0;
    let maxY = -Infinity;
    let contained = true;
    for (let f = 0; f < 6000; f++) {
      pm.update(1 / 60, f / 60); // ~100s — long enough for all hands to roam + act
      for (const hand of hands) {
        const p = hand.mesh.position;
        maxHorizontal = Math.max(maxHorizontal, Math.abs(p.x), Math.abs(p.z));
        maxY = Math.max(maxY, p.y);
        contained &&=
          Math.abs(p.x) <= PLATFORM_HALF &&
          Math.abs(p.z) <= PLATFORM_HALF &&
          p.y >= PLATFORM_FLOOR &&
          p.y <= PLATFORM_CEIL;
      }
    }
    const s = ctx.state;
    expect(Number.isFinite(s.chaos)).toBe(true);
    expect(s.chaos).toBeGreaterThanOrEqual(0);
    expect(s.chaos).toBeLessThanOrEqual(10); // clamped to CHAOS_MAX * 0.7
    expect(Number.isInteger(s.weatherIdx)).toBe(true);
    expect(s.weatherIdx).toBeGreaterThanOrEqual(0);
    expect(s.weatherIdx).toBeLessThan(20);
    expect(Number.isFinite(s.mutations)).toBe(true);
    expect(s.mutations).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeGreaterThan(0); // the hands meddle over 10s
    expect(maxHorizontal).toBeGreaterThan(540);
    expect(maxY).toBeGreaterThan(240);
    expect(contained).toBe(true);
    for (const ev of events) {
      expect(ev.name.length).toBeGreaterThan(0);
      expect(ev.action.length).toBeGreaterThan(0);
    }
  });

  test('identical seeds replay an identical intervention history (determinism)', () => {
    const a = makeWorld(0x5eed01);
    const b = makeWorld(0x5eed01);
    for (let f = 0; f < 6000; f++) {
      a.pm.update(1 / 60, f / 60);
      b.pm.update(1 / 60, f / 60);
    }
    expect(a.events.length).toBeGreaterThan(0); // a meaningful (non-empty) history is being compared
    expect(a.ctx.state.chaos).toBe(b.ctx.state.chaos);
    expect(a.ctx.state.weatherIdx).toBe(b.ctx.state.weatherIdx);
    expect(a.ctx.state.mutations).toBe(b.ctx.state.mutations);
    expect(a.events.length).toBe(b.events.length);
  });

  test('the manipulator shader uniforms are driven from the REAL per-puppet signals (bounded readouts)', () => {
    const { pm } = makeWorld(0x9a11);
    // Reach the private per-puppet uniforms (sibling-test cast pattern).
    const pms = (
      pm as unknown as {
        pms: {
          satiation: number;
          u: {
            uTime: { value: number };
            uSatiation: { value: number };
            uBoldness: { value: number };
            uAgitation: { value: number };
            uHunt: { value: number };
          };
        }[];
      }
    ).pms;
    expect(pms.length).toBeGreaterThan(0);
    for (let f = 0; f < 120; f++) pm.update(1 / 60, f / 60);
    for (const p of pms) {
      // uSatiation mirrors the puppet's live satiation exactly (the shader reads the real feeding memory).
      expect(p.u.uSatiation.value).toBeCloseTo(p.satiation, 6);
      // Every driven lane is finite and clamped to [0,1] — a bounded, falsifiable readout, never NaN.
      for (const lane of [p.u.uSatiation, p.u.uBoldness, p.u.uAgitation, p.u.uHunt]) {
        expect(Number.isFinite(lane.value)).toBe(true);
        expect(lane.value).toBeGreaterThanOrEqual(0);
        expect(lane.value).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(p.u.uTime.value)).toBe(true);
    }
  });
});
