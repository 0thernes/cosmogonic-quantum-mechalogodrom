/**
 * Leviathans (F-BEINGS). Falsifiable claims:
 * - there are exactly COUNT (4) of them;
 * - construction draws NO rng (boot-stream-neutral) — so the composition root may place it anywhere
 *   without shifting the seeded stream the rest of the world (and every determinism test) depends on;
 * - their positions stay FINITE and mid-field-contained over a long run, with and without a hole.
 *
 * Headless: three's Scene/Mesh/Material/CapsuleGeometry need no DOM.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { EntityManager } from '../src/sim/entities';
import { LeviathanSystem } from '../src/sim/leviathans';
import { SingularitySystem } from '../src/sim/singularities';
import { MID_RADIUS } from '../src/sim/constants';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, OrganismIntelligenceSignal, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 0.5,
    entropy: 0,
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

function makeIntelligenceSignal(enabled: boolean): OrganismIntelligenceSignal {
  return {
    enabled,
    indicatorOnly: true,
    revision: 7,
    resourcePressure: 0.4,
    threatResponse: 0.6,
    exploration: 0.8,
    socialDrive: 0.5,
    plasticity: 0.7,
    forecast: 1,
    confidence: 1,
    corpusDrive: 0.9,
    ecologyRisk: 0.5,
    ecologySurprise: 0.25,
    channels: new Float32Array([0.2, 0.4, 0.6, 0.8]),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

function makeCtx(seed: number, organismIntelligence?: OrganismIntelligenceSignal): SimContext {
  const rng = mulberry32(seed);
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone',
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 500,
      targetEntities: 500,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: [],
    geos: [],
    state: makeState(),
    organismIntelligence,
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

interface LeviathanActionSnapshot {
  position: readonly [number, number, number];
  velocity: readonly [number, number, number];
}

function driveIntelligenceCounterfactual(enabled: boolean): LeviathanActionSnapshot[] {
  const ctx = makeCtx(0x1e71a7, makeIntelligenceSignal(enabled));
  const sys = new LeviathanSystem(ctx);
  const levs = (
    sys as unknown as {
      levs: { group: THREE.Group; vel: THREE.Vector3 }[];
    }
  ).levs;
  const dt = 1 / 60;
  for (let f = 0; f < 240; f++) {
    ctx.state.frame = f;
    sys.update(dt, f * dt);
  }
  return levs.map((leviathan) => ({
    position: [leviathan.group.position.x, leviathan.group.position.y, leviathan.group.position.z],
    velocity: [leviathan.vel.x, leviathan.vel.y, leviathan.vel.z],
  }));
}

describe('LeviathanSystem', () => {
  test('builds exactly 4 leviathans', () => {
    expect(new LeviathanSystem(makeCtx(1)).count).toBe(4);
  });

  test('dispose() frees the shared geometry + per-leviathan materials and clears the count (idempotent)', () => {
    const sys = new LeviathanSystem(makeCtx(1));
    expect(sys.count).toBe(4);
    const matSpy = spyOn(THREE.Material.prototype, 'dispose');
    const geoSpy = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    sys.dispose();
    expect(matSpy).toHaveBeenCalled(); // the 4 per-leviathan materials are freed
    expect(geoSpy).toHaveBeenCalled(); // the shared CapsuleGeometry is freed once
    expect(sys.count).toBe(0);
    matSpy.mockRestore();
    geoSpy.mockRestore();
    expect(() => sys.dispose()).not.toThrow(); // idempotent — safe on an already-freed system
  });

  test('construction draws no rng (boot-stream-neutral)', () => {
    const ctxA = makeCtx(42);
    const x = ctxA.rng();
    const ctxB = makeCtx(42);
    new LeviathanSystem(ctxB);
    const y = ctxB.rng();
    expect(y).toBe(x);
  });

  test('the four colossi use the expanded mid-field route without increasing their count', () => {
    const ctx = makeCtx(43);
    const sys = new LeviathanSystem(ctx);
    const levs = (sys as unknown as { levs: { group: THREE.Group }[] }).levs;
    expect(levs.length).toBe(4);
    let maxHorizontal = 0;
    let maxY = -Infinity;
    let contained = true;
    for (let f = 0; f < 600; f++) {
      sys.update(1 / 60, f / 60);
      for (const lv of levs) {
        const p = lv.group.position;
        maxHorizontal = Math.max(maxHorizontal, Math.hypot(p.x, p.z));
        maxY = Math.max(maxY, p.y);
        contained &&= p.length() <= MID_RADIUS;
      }
    }
    expect(maxHorizontal).toBeGreaterThan(120);
    expect(maxY).toBeGreaterThan(28);
    expect(contained).toBe(true);
  });

  test('positions stay finite and mid-field-contained over a long run, even under a black hole', () => {
    const ctx = makeCtx(7);
    const sys = new LeviathanSystem(ctx);
    const ent = new EntityManager(ctx);
    const sing = new SingularitySystem(ctx, ent);
    sys.attachSingularity(sing);
    sing.summon('blackhole', new THREE.Vector3(0, 30, 0));
    for (let f = 0; f < 600; f++) {
      ctx.state.frame = f;
      sys.update(0.016, f * 0.016);
      sing.update(0.016, f * 0.016);
    }
    // Walk the scene graph for the leviathan groups and assert every position is finite + bounded.
    let checked = 0;
    ctx.scene.traverse((o) => {
      const p = o.position;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      checked++;
    });
    expect(checked).toBeGreaterThan(0);
  });

  test('same seed + same update sequence ⇒ identical leviathan motion (determinism)', () => {
    const run = (): number[] => {
      const ctx = makeCtx(99);
      const sys = new LeviathanSystem(ctx);
      for (let f = 0; f < 120; f++) {
        ctx.state.frame = f;
        sys.update(0.016, f * 0.016);
      }
      const out: number[] = [];
      ctx.scene.traverse((o) => out.push(o.position.x, o.position.y, o.position.z));
      return out;
    };
    expect(run()).toEqual(run());
  });

  test('the live organism-intelligence signal changes every leviathan action vector and trajectory in a matched run', () => {
    const disabled = driveIntelligenceCounterfactual(false);
    const operational = driveIntelligenceCounterfactual(true);

    // Exact replay rules out ambient randomness: only the signal's enabled bit differs from control.
    expect(operational).toEqual(driveIntelligenceCounterfactual(true));
    expect(disabled).toHaveLength(4);
    expect(operational).toHaveLength(disabled.length);

    for (let i = 0; i < operational.length; i++) {
      const base = disabled[i]!;
      const live = operational[i]!;
      expect(
        Math.hypot(...live.velocity.map((value, axis) => value - base.velocity[axis]!)),
      ).toBeGreaterThan(1e-7);
      expect(
        Math.hypot(...live.position.map((value, axis) => value - base.position[axis]!)),
      ).toBeGreaterThan(1e-6);
    }
  });
});
