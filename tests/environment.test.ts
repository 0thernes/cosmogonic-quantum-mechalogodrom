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
