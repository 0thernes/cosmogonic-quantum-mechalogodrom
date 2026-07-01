/**
 * ShoggothSystem — the tier-scaled Lorenz-drifting predators whose grid-queried tendrils consume +
 * corrupt organisms, steered by the V24/V29 cognition kernel (perceive · remember · flee · hunt ·
 * trade · ally). Covered only via the integrated world loop; this pins the contract directly: a
 * positive tier-scaled count, tendril consumption that never NaNs the population, and a fully
 * reproducible evolution from one seed.
 *
 * Headless (fake-ctx pattern) — drives the real `update` over a real EntityManager + populated grid.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { ShoggothSystem } from '../src/sim/shoggoths';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 2,
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

function makeWorld(seed: number): { entities: EntityManager; shog: ShoggothSystem } {
  const ctx = makeCtx(seed);
  const entities = new EntityManager(ctx);
  entities.reset(80);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const shog = new ShoggothSystem(ctx, entities);
  return { entities, shog };
}

function entityTrace(entities: EntityManager): number[] {
  const out: number[] = [];
  for (const e of entities.list) {
    if (!e) continue;
    const v = e.userData.vel;
    out.push(e.position.x, e.position.y, e.position.z, v.x, v.y, v.z, e.userData.sortVal);
  }
  return out;
}

describe('ShoggothSystem — deterministic predators that never NaN the population', () => {
  test('count is a positive integer (tier-scaled)', () => {
    const c = makeWorld(1).shog.count;
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(1);
  });

  test('300 frames of tendril consumption keep every organism finite', () => {
    const { entities, shog } = makeWorld(0xab1234);
    for (let f = 0; f < 300; f++) shog.update(1 / 60, f / 60);
    for (const e of entities.list) {
      if (!e) continue;
      const p = e.position;
      const v = e.userData.vel;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)).toBe(true);
    }
  });

  test('identical seeds replay a byte-identical population trace (determinism)', () => {
    const a = makeWorld(0xc0ffee);
    const b = makeWorld(0xc0ffee);
    for (let f = 0; f < 300; f++) {
      a.shog.update(1 / 60, f / 60);
      b.shog.update(1 / 60, f / 60);
    }
    const ta = entityTrace(a.entities);
    const tb = entityTrace(b.entities);
    expect(tb.length).toBe(ta.length);
    expect(tb).toEqual(ta);
  });

  test('the MIND shader uniforms are driven from the real cognition drives (bounded readouts)', () => {
    const { shog } = makeWorld(0x5ec7);
    const shogs = (
      shog as unknown as {
        shogs: {
          satiation: number;
          u: {
            uTime: { value: number };
            uSatiation: { value: number };
            uThreat: { value: number };
            uHunt: { value: number };
            uAgitation: { value: number };
            uColor: { value: THREE.Color };
          };
        }[];
      }
    ).shogs;
    expect(shogs.length).toBeGreaterThan(0);
    for (let f = 0; f < 200; f++) shog.update(1 / 60, f / 60);
    for (const s of shogs) {
      // uSatiation mirrors the shoggoth's live satiation exactly (the skin reads the real feeding memory).
      expect(s.u.uSatiation.value).toBeCloseTo(s.satiation, 6);
      // Every driven cognition lane is finite + clamped to [0,1] — a bounded, falsifiable readout, never NaN.
      for (const lane of [s.u.uSatiation, s.u.uThreat, s.u.uHunt, s.u.uAgitation]) {
        expect(Number.isFinite(lane.value)).toBe(true);
        expect(lane.value).toBeGreaterThanOrEqual(0);
        expect(lane.value).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(s.u.uTime.value)).toBe(true);
      // The living hue is a valid colour (finite channels in [0,1]).
      for (const ch of [s.u.uColor.value.r, s.u.uColor.value.g, s.u.uColor.value.b]) {
        expect(Number.isFinite(ch)).toBe(true);
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      }
    }
  });
});
