/**
 * ShoggothSystem — the tier-scaled Lorenz-drifting predators whose grid-queried tendrils consume +
 * corrupt organisms, steered by the V24/V29 cognition kernel (perceive · remember · flee · hunt ·
 * trade · ally). Covered only via the integrated world loop; this pins the contract directly: a
 * positive tier-scaled count, tendril consumption that never NaNs the population, and a fully
 * reproducible evolution from one seed.
 *
 * Headless (fake-ctx pattern) — drives the real `update` over a real EntityManager + populated grid.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { ShoggothSystem } from '../src/sim/shoggoths';
import { PLATFORM_CEIL, PLATFORM_FLOOR, PLATFORM_HALF } from '../src/sim/constants';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, OrganismIntelligenceSignal, SimContext, SimState } from '../src/types';

/**
 * Matched causal-control signal. The two arms differ only by `enabled`; retaining identical numeric
 * lanes makes the test isolate the live organism-intelligence gate rather than a seed/config change.
 */
function matchedIntelligenceSignal(enabled: boolean): OrganismIntelligenceSignal {
  return {
    enabled,
    indicatorOnly: true,
    revision: 7,
    resourcePressure: 1,
    threatResponse: 0.85,
    exploration: 1,
    socialDrive: 0.9,
    plasticity: 0.8,
    forecast: 0.75,
    confidence: 0.95,
    corpusDrive: 1,
    ecologyRisk: 0.5,
    ecologySurprise: 0.25,
    channels: new Float32Array([0.8, 0.9, 1, 0.7]),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

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

function makeCtx(
  seed: number,
  isMobile = true,
  organismIntelligence?: OrganismIntelligenceSignal,
): SimContext {
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
    organismIntelligence,
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

function makeWorld(
  seed: number,
  isMobile = true,
  organismIntelligence?: OrganismIntelligenceSignal,
): { entities: EntityManager; shog: ShoggothSystem } {
  const ctx = makeCtx(seed, isMobile, organismIntelligence);
  const entities = new EntityManager(ctx);
  entities.reset(80);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const shog = new ShoggothSystem(ctx, entities);
  return { entities, shog };
}

/** Per-member behavioral/action trace: locomotion, spin, and cognition-driven hunt/agitation. */
function shoggothActionTrace(shog: ShoggothSystem): number[][] {
  const horde = (
    shog as unknown as {
      shogs: {
        group: THREE.Group;
        vel: THREE.Vector3;
        u: { uHunt: { value: number }; uAgitation: { value: number } };
      }[];
    }
  ).shogs;
  return horde.map((s) => [
    s.group.position.x,
    s.group.position.y,
    s.group.position.z,
    s.vel.x,
    s.vel.y,
    s.vel.z,
    s.group.rotation.y,
    s.u.uHunt.value,
    s.u.uAgitation.value,
  ]);
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
  test('count preserves the exact mobile and desktop census', () => {
    const mobile = makeWorld(1, true).shog;
    const desktop = makeWorld(1, false).shog;
    expect(mobile.count).toBe(16);
    expect(desktop.count).toBe(100);
    mobile.dispose();
    desktop.dispose();
  });

  test('dispose() frees per-shoggoth geometries + materials and clears the count (idempotent)', () => {
    const { shog } = makeWorld(1);
    expect(shog.count).toBeGreaterThan(0);
    const matSpy = spyOn(THREE.Material.prototype, 'dispose');
    const geoSpy = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    shog.dispose();
    expect(matSpy).toHaveBeenCalled(); // core + eye + tendril materials freed
    expect(geoSpy).toHaveBeenCalled(); // core + per-eye + tendril geometries freed
    expect(shog.count).toBe(0);
    matSpy.mockRestore();
    geoSpy.mockRestore();
    expect(() => shog.dispose()).not.toThrow(); // idempotent — safe on an already-freed system
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

  test('the horde occupies the expanded habitat and remains hard-contained', () => {
    const { shog } = makeWorld(0x5a17);
    const horde = (shog as unknown as { shogs: { group: THREE.Group }[] }).shogs;
    let maxHorizontal = 0;
    let maxY = -Infinity;
    let contained = true;
    for (let f = 0; f < 300; f++) {
      shog.update(1 / 60, f / 60);
      for (const s of horde) {
        const p = s.group.position;
        maxHorizontal = Math.max(maxHorizontal, Math.abs(p.x), Math.abs(p.z));
        maxY = Math.max(maxY, p.y);
        contained &&=
          Math.abs(p.x) <= PLATFORM_HALF &&
          Math.abs(p.z) <= PLATFORM_HALF &&
          p.y >= PLATFORM_FLOOR &&
          p.y <= PLATFORM_CEIL;
      }
    }
    expect(maxHorizontal).toBeGreaterThan(540);
    expect(maxY).toBeGreaterThan(240);
    expect(contained).toBe(true);
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

  test('matched organism-intelligence counterfactual changes every shoggoth action trace deterministically', () => {
    const seed = 0x51a09;
    const control = makeWorld(seed, true, matchedIntelligenceSignal(false));
    const operational = makeWorld(seed, true, matchedIntelligenceSignal(true));
    const replay = makeWorld(seed, true, matchedIntelligenceSignal(true));

    // Construction, population, and RNG stream are byte-identical before the single causal toggle acts.
    expect(shoggothActionTrace(operational.shog)).toEqual(shoggothActionTrace(control.shog));
    expect(shoggothActionTrace(replay.shog)).toEqual(shoggothActionTrace(control.shog));

    for (let f = 0; f < 3; f++) {
      const t = f / 60;
      control.shog.update(1 / 60, t);
      operational.shog.update(1 / 60, t);
      replay.shog.update(1 / 60, t);
    }

    const controlTrace = shoggothActionTrace(control.shog);
    const operationalTrace = shoggothActionTrace(operational.shog);
    const replayTrace = shoggothActionTrace(replay.shog);
    expect(operationalTrace).toEqual(replayTrace); // same seed + same live signal => exact replay
    expect(operationalTrace.length).toBe(control.shog.count);
    // The field's exploration/cognition lanes feed each member's velocity/spin/action path, not a
    // decorative aggregate: every member diverges from its otherwise-identical disabled control.
    for (let i = 0; i < operationalTrace.length; i++) {
      expect(operationalTrace[i]).not.toEqual(controlTrace[i]);
      expect(operationalTrace[i]!.slice(0, 3)).not.toEqual(controlTrace[i]!.slice(0, 3));
      expect(operationalTrace[i]!.slice(3, 6)).not.toEqual(controlTrace[i]!.slice(3, 6));
    }

    control.shog.dispose();
    operational.shog.dispose();
    replay.shog.dispose();
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
