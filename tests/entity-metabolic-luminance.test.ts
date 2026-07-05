/**
 * Metabolic-luminance body readout (PHILOSOPHY "Real math or no math" + "Feedback over garnish").
 *
 * An organism's RESTING self-glow is the morphotype base × {@link metabolicLuminance}, so the body
 * is a falsifiable readout of the creature's REAL vital state — wealth (`energy`, set/redistributed
 * by the market behavior) and senescence (`age / life`, driven by aging) — not a decorative
 * constant. Falsifiable claims:
 *
 * Pure function:
 * - rich + young burns at the full base (1.0); destitute + young still smoulders (0.45, never 0);
 * - monotonic INCREASING in `energy`, monotonic DECREASING in `age`;
 * - always finite and within [0.27, 1.0]; `energy` is clamped and `life <= 0` is guarded;
 * - the end-of-life floor is exactly 0.45 × 0.6 = 0.27.
 *
 * Wired into the live loop (the coupling is real, not just a helper):
 * - run two same-morphotype organisms through `EntityManager.update`; the thriving one (rich, young)
 *   ends visibly brighter than the destitute, aged one, converging on the analytic targets;
 * - the readout is deterministic (no rng): two identically-seeded runs match bit-for-bit.
 *
 * Headless: three's Scene/Mesh/Material need no DOM until render (the fake-ctx pattern shared with
 * tests/entities-death.test.ts). chaos = 0 ⇒ cm = 0 ⇒ the market's rng energy nudge and the neural
 * `act` accumulation are both zero, and the empty grid yields no neighbor trades, so `energy` is
 * stable and the `act > 1` firing branch never fires — leaving metabolicLuminance the sole driver.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager, metabolicLuminance } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 0, // cm = min(chaos/2, 3) = 0 — see the header isolation note
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

function makeCtx(seed: number, maxEntities: number): SimContext {
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
      maxEntities,
      targetEntities: maxEntities,
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

describe('metabolicLuminance (pure)', () => {
  test('anchors: rich+young = full base, destitute+young still smoulders, end-of-life floor', () => {
    expect(metabolicLuminance(100, 0, 1000)).toBeCloseTo(1.0, 12); // rich + young → full burn
    expect(metabolicLuminance(0, 0, 1000)).toBeCloseTo(0.45, 12); // destitute + young → floor burn
    expect(metabolicLuminance(0, 1000, 1000)).toBeCloseTo(0.27, 12); // 0.45 × 0.6 end-of-life floor
    expect(metabolicLuminance(100, 1000, 1000)).toBeCloseTo(0.6, 12); // rich but ancient
  });

  test('monotonic INCREASING in energy (fixed age/life)', () => {
    let prev = -Infinity;
    for (let e = 0; e <= 100; e += 5) {
      const v = metabolicLuminance(e, 100, 1000);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  test('monotonic DECREASING in senescence (fixed energy)', () => {
    let prev = Infinity;
    for (let age = 0; age <= 1000; age += 50) {
      const v = metabolicLuminance(70, age, 1000);
      expect(v).toBeLessThan(prev);
      prev = v;
    }
  });

  test('always finite and within [0.27, 1.0]; energy clamped, life<=0 guarded', () => {
    const energies = [-1e9, -50, 0, 33, 50, 100, 1e9];
    const ages = [0, 1, 250, 999, 1000, 1e9];
    const lives = [0, -1, 1, 200, 1000];
    for (const e of energies)
      for (const age of ages)
        for (const life of lives) {
          const v = metabolicLuminance(e, age, life);
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0.27 - 1e-9);
          expect(v).toBeLessThanOrEqual(1.0 + 1e-9);
        }
    // Out-of-range energy clamps to the [0,100] endpoints; life<=0 ⇒ senescence treated as 0.
    expect(metabolicLuminance(1e9, 0, 1000)).toBeCloseTo(1.0, 12);
    expect(metabolicLuminance(-50, 0, 1000)).toBeCloseTo(0.45, 12);
    expect(metabolicLuminance(100, 500, 0)).toBeCloseTo(1.0, 12); // life=0 → no fade, full burn
  });
});

describe('metabolic-luminance coupling is wired into EntityManager.update', () => {
  /** Pin a known base glow on morph 0 and spawn `n` organisms of it at the origin. */
  function seedTwins(ctx: SimContext, baseEmI: number): EntityManager {
    const morph0 = ctx.morphs[0];
    expect(morph0).toBeDefined();
    if (morph0) morph0.emI = baseEmI; // hermetic base so the readout, not the random morph, is tested
    const entities = new EntityManager(ctx);
    entities.spawn(new THREE.Vector3(0, 0, 0), 0);
    entities.spawn(new THREE.Vector3(1, 0, 1), 0);
    return entities;
  }

  test('a thriving body glows brighter than a starving, aged one — converging on the analytic targets', () => {
    const ctx = makeCtx(7, 8);
    const entities = seedTwins(ctx, 1.0);
    const thriving = entities.list[0];
    const failing = entities.list[1];
    expect(thriving).toBeDefined();
    expect(failing).toBeDefined();
    if (!thriving || !failing) return;

    for (let f = 0; f < 200; f++) {
      // Re-pin the vital state each frame so neither aging nor the (zeroed) market can drift it;
      // act/belly reset keeps the resting-glow branch (not the spike branch) the sole writer.
      thriving.userData.energy = 100;
      thriving.userData.age = 0;
      thriving.userData.act = 0;
      thriving.userData.belly = 0;
      failing.userData.energy = 0;
      failing.userData.age = failing.userData.life * 0.7;
      failing.userData.act = 0;
      failing.userData.belly = 0;
      ctx.state.frame++;
      entities.update(1 / 60, f / 60);
    }

    const a = thriving.material.emissiveIntensity;
    const b = failing.material.emissiveIntensity;
    expect(Number.isFinite(a)).toBe(true);
    expect(Number.isFinite(b)).toBe(true);
    // The core falsifiable claim: condition is legible on the body.
    expect(a).toBeGreaterThan(b);
    expect(a - b).toBeGreaterThan(0.3); // clear separation, not float noise
    // Both have converged on morphBase(1.0) × metabolicLuminance(state).
    expect(a).toBeCloseTo(1.0, 1);
    expect(b).toBeCloseTo(
      metabolicLuminance(0, failing.userData.life * 0.7, failing.userData.life),
      1,
    );
  });

  test('the readout is deterministic — two identically-seeded runs match bit-for-bit', () => {
    function run(): number[] {
      const ctx = makeCtx(11, 8);
      const entities = seedTwins(ctx, 0.8);
      for (let f = 0; f < 40; f++) {
        ctx.state.frame++;
        entities.update(1 / 60, f / 60);
      }
      return entities.list.map((e) => (e ? e.material.emissiveIntensity : NaN));
    }
    expect(run()).toEqual(run());
  });
});
