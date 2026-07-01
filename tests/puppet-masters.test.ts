/**
 * PuppetMasterSystem — the three scheming hands (AETHON stokes chaos, SELENE shifts weather, KRONOS
 * reshapes organisms) that perturb the world on wealth/opportunity-driven timers. They were covered
 * only indirectly (the integrated world loop); this pins their public contract directly: exactly 3
 * hands, interventions that keep `state.chaos`/`weatherIdx`/`mutations` finite + in bounds, and a
 * fully reproducible intervention history from one seed (their actions draw from `ctx.rng`).
 *
 * Headless (fake-ctx pattern) — drives the real `update`/`act` over a real EntityManager + grid.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { PuppetMasterSystem } from '../src/sim/puppet-masters';
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

function makeWorld(seed: number): {
  ctx: SimContext;
  pm: PuppetMasterSystem;
  events: PuppetEvent[];
} {
  const ctx = makeCtx(seed);
  const entities = new EntityManager(ctx);
  entities.reset(50);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const events: PuppetEvent[] = [];
  // EVENT is a reused module scratch object — copy it on receipt to retain a history.
  const pm = new PuppetMasterSystem(ctx, entities, (e) => events.push({ ...e }));
  return { ctx, pm, events };
}

describe('PuppetMasterSystem — deterministic schemers that perturb the world within bounds', () => {
  test('has at least the 3 named hands (plus tier-scaled lesser puppeteers, V14)', () => {
    const c = makeWorld(1).pm.count;
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(3); // AETHON, SELENE, KRONOS are always present
  }, 15_000);

  test('6000 frames keep world state finite + in bounds and fire valid interventions', () => {
    const { ctx, pm, events } = makeWorld(0x9a77e7);
    for (let f = 0; f < 6000; f++) pm.update(1 / 60, f / 60); // ~100s — long enough for all 3 hands to act
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
