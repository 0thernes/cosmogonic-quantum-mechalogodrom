/**
 * GATE-CHEMOTAXIS — proves the base-population foraging upgrade is wired into the live
 * `EntityManager`, not merely reproduced by a test helper. Two identically seeded organisms run
 * through the real update loop; the only ablation is the attached read-only biomass gradient.
 * The sensed organism must gain velocity and displacement toward the richer patch while the
 * detached twin follows the unchanged seeded trajectory.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { getQuantizationConfig } from '../src/math/quantization';
import { EntityManager } from '../src/sim/entities';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** A synthetic flora field: a single rich patch (Gaussian in biomass). */
function patchField(cx: number, cz: number, sigma: number): (x: number, z: number) => number {
  return (x, z) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / sigma);
}

function makeState(): SimState {
  return {
    chaos: 0,
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

function makeCtx(seed: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone',
      isMobile: true,
      instanced: false,
      dprCap: 1.25,
      maxEntities: 1,
      targetEntities: 1,
      quantumCount: 1,
      maxLinks: 1,
      shadows: false,
      starCount: 1,
      quantization: getQuantizationConfig('phone'),
      simRate: 60,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

interface Endpoint {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

/** Run one production entity tick with every input fixed except the flora-gradient attachment. */
function runArm(sampler: ((x: number, z: number) => number) | null): Endpoint {
  const ctx = makeCtx(0xc4e607a1);
  const entities = new EntityManager(ctx);
  const organism = entities.spawn(new THREE.Vector3(50, 0, 0), 0);
  if (!organism) throw new Error('chemotaxis fixture failed to spawn its organism');

  // Pin the relevant organism state. The two arms retain the same behavior and RNG stream, so their
  // trajectory difference can only come from the injected flora-gradient path.
  organism.userData.energy = 0;
  organism.userData.age = 0;
  organism.userData.life = 1_000_000;
  organism.userData.sT = Number.POSITIVE_INFINITY;
  organism.userData.payoff = 0;
  organism.userData.vel.set(0, 0, 0);

  // applyFloraComfort owns the chemotaxis integration. A zero-strength cover reading keeps its
  // unrelated seek/rest/graze forces inert while allowing the production gradient branch to run.
  entities.attachFloraComfort(() => ({ x: 0, y: 0, z: 0, strength: 0 }));
  entities.attachFloraGradient(sampler);
  ctx.grid.insert(organism);
  entities.update(1 / 60, 0);

  return {
    x: organism.position.x,
    z: organism.position.z,
    vx: organism.userData.vel.x,
    vz: organism.userData.vel.z,
  };
}

describe('GATE-CHEMOTAXIS: a hungry animal forages UP the flora gradient toward the richest patch', () => {
  const sampler = patchField(0, 0, 900);

  test('live EntityManager trajectory turns toward richer flora versus the detached ablation', () => {
    const sensed = runArm(sampler);
    const detached = runArm(null);

    // The organism starts on +x with the biomass maximum at the origin. Production chemotaxis must
    // therefore add a clear -x component; all non-flora behavior is identical between the twins.
    expect(sensed.vx).toBeLessThan(detached.vx - 0.005);
    expect(sensed.x).toBeLessThan(detached.x - 0.005);
    expect(sensed.vz).toBeCloseTo(detached.vz, 12);
    expect(sensed.z).toBeCloseTo(detached.z, 12);
  });

  test('live gradient-enabled trajectory is deterministic for the same seed and state', () => {
    expect(runArm(sampler)).toEqual(runArm(sampler));
  });

  test('AlienFlora exposes the read-only biomassAt sampler used by the world wiring', async () => {
    // World wires `(x,z) => alienFlora.biomassAt(x,z)` into the runtime attachment exercised above.
    const { AlienFlora } = await import('../src/sim/alien-flora');
    expect(typeof AlienFlora.prototype.biomassAt).toBe('function');
  });
});
