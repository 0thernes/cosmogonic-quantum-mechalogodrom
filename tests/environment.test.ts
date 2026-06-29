/**
 * EnvironmentSystem — the monolith/diorama/pipe light rig + atmosphere. `update(dt, t)` animates
 * every PointLight through `nn()`, the non-negative floor: at max chaos (cm = 3) the chaos-driven
 * sinusoids dip below zero, and an un-floored negative intensity makes a PointLight SUBTRACT
 * radiance — the unphysical "dark halo" the audit flagged. This module had no dedicated test.
 *
 * Pins: (1) the audit fix — no light radiance ever goes negative or non-finite under extreme chaos,
 * and the clamp floor is actually reached; (2) intensity is a PURE function of t (zero rng, the
 * determinism contract); (3) the build contract (ambient + sun + the 6 colored point lights).
 * Headless fake-ctx — real three.js scene graph, no WebGL, no DOM.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, CHAOS_MAX } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EnvironmentSystem } from '../src/sim/environment';
import { LoreEngine } from '../src/sim/lore';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

/** Headless SimContext (real geometries/morphotypes); EnvironmentSystem reads scene/rng/state. */
function makeCtx(seed: number, chaos: number): SimContext {
  const rng = mulberry32(seed);
  const auditNoop = { record: () => undefined, entries: () => [] };
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities: 400,
      targetEntities: 400,
      quantumCount: 5,
      maxLinks: 100,
      shadows: false,
      starCount: 5,
    },
    rng,
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs,
    geos,
    state: {
      chaos,
      mutations: 0,
      timeScale: 1,
      renderMode: 'solid',
      sim: 1,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: 1,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      algoMode: 'single',
      algoTimer: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Every light intensity currently in the scene. */
function lightIntensities(scene: THREE.Scene): number[] {
  const out: number[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Light) out.push(o.intensity);
  });
  return out;
}

describe('EnvironmentSystem — non-negative radiance (audit fix)', () => {
  test('no light goes negative or non-finite at max chaos across a fine time sweep', () => {
    const ctx = makeCtx(0xe0a, CHAOS_MAX); // cm saturates at 3 — the deepest negative dips
    const env = new EnvironmentSystem(ctx);
    let globalMin = Infinity;
    const dt = 1 / 60;
    // ~14 periods of the fastest chaos wave — guaranteed to sample the sub-zero region nn() floors.
    for (let i = 0; i < 400; i++) {
      const t = i * 0.15;
      env.update(dt, t);
      for (const v of lightIntensities(ctx.scene)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0); // a negative PointLight would subtract radiance
        if (v < globalMin) globalMin = v;
      }
    }
    // The clamp must actually ENGAGE — at max chaos some animated light is floored to ~0, proving
    // the test exercised the negative-dip path rather than trivially passing on positive constants.
    expect(globalMin).toBeGreaterThanOrEqual(0);
    expect(globalMin).toBeLessThan(0.5);
  });
});

describe('EnvironmentSystem — purity + build contract', () => {
  test('light intensity is a pure function of t (zero rng — determinism contract)', () => {
    const ctx = makeCtx(0xb11, 4);
    const env = new EnvironmentSystem(ctx);
    const dt = 1 / 60;
    // Warm one frame so any first-call transients settle, then the SAME t must reproduce intensities.
    env.update(dt, 7.5);
    const a = lightIntensities(ctx.scene);
    env.update(dt, 9.0);
    env.update(dt, 7.5); // back to the same t
    const b = lightIntensities(ctx.scene);
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]);
  });

  test('builds the ambient + sun + 6 colored point lights', () => {
    const ctx = makeCtx(3, 1.5);
    new EnvironmentSystem(ctx);
    let ambient = 0;
    let directional = 0;
    let point = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof THREE.AmbientLight) ambient++;
      else if (o instanceof THREE.DirectionalLight) directional++;
      else if (o instanceof THREE.PointLight) point++;
    });
    expect(ambient).toBe(1);
    expect(directional).toBe(1);
    expect(point).toBeGreaterThanOrEqual(6); // 6 colored rig lights + monolith crowns + diorama glows
  });
});

describe('EnvironmentSystem — BRUTALISM restores the reaction-diffusion ground glow', () => {
  /** Internals cast (sibling-test pattern): the ground material is private. */
  interface EnvInternals {
    groundMaterial: THREE.MeshStandardMaterial;
  }

  test('after attaching the RD emissiveMap, brutalism on→off returns the glow to 0.85 (not 0.3)', () => {
    const ctx = makeCtx(0x9d, 4);
    const env = new EnvironmentSystem(ctx);
    const ground = (env as unknown as EnvInternals).groundMaterial;

    // RD coupling lifts the ground glow from its build value (0.3) to 0.85 so the living veins read.
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    env.attachGroundEmissiveMap(tex);
    expect(ground.emissiveIntensity).toBeCloseTo(0.85, 6);

    // Full concrete dims the veins almost out.
    env.applyBrutalism(1);
    expect(ground.emissiveIntensity).toBeCloseTo(0.06, 6);

    // Ease brutalism back toward 0 (geometric decay, never exactly 0): the glow must converge to the
    // POST-ATTACH 0.85, not the build-time 0.3 — the regression a PR review flagged.
    let f = 1;
    for (let i = 0; i < 60; i++) {
      f += (0 - f) * 0.25;
      env.applyBrutalism(f);
    }
    expect(ground.emissiveIntensity).toBeGreaterThan(0.8);
    // The world snaps the eased factor to EXACTLY 0; the OFF-edge restore pass must return the static
    // ground glow to its exact post-RD baseline (not park ~2% concrete) — a second PR-review fix.
    env.applyBrutalism(0);
    expect(ground.emissiveIntensity).toBeCloseTo(0.85, 9);
    // Idle OFF keeps it there (steady-state early-return leaves it untouched).
    env.applyBrutalism(0);
    expect(ground.emissiveIntensity).toBeCloseTo(0.85, 9);
  });

  test('without the RD map, brutalism off still restores the build-time 0.3 baseline', () => {
    const ctx = makeCtx(0x9e, 4);
    const env = new EnvironmentSystem(ctx);
    const ground = (env as unknown as EnvInternals).groundMaterial;
    expect(ground.emissiveIntensity).toBeCloseTo(0.3, 6);
    env.applyBrutalism(1);
    let f = 1;
    for (let i = 0; i < 60; i++) {
      f += (0 - f) * 0.25;
      env.applyBrutalism(f);
    }
    expect(ground.emissiveIntensity).toBeGreaterThan(0.29);
    expect(ground.emissiveIntensity).toBeLessThanOrEqual(0.3 + 1e-9);
  });
});
