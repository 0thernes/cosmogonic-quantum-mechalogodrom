/** Live ecology rules: metabolism, starvation, energy-costed fission, brain heredity (#1/#28/#29/#40). */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 1.2,
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
  } as SimState;
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
    genomeRng: mulberry32((seed ^ 0x6e3a17c5) >>> 0 || 1),
  };
}

function step(entities: EntityManager, ctx: SimContext, frames: number): void {
  const state = ctx.state;
  for (let f = 0; f < frames; f++) {
    state.frame++;
    state.elapsed += 1 / 60;
    ctx.grid.clear();
    for (const e of entities.list) if (e) ctx.grid.insert(e);
    entities.update(1 / 60, state.elapsed);
  }
}

describe('live ecology rules', () => {
  test('starving organisms die on the genome path; legacy toggle keeps them alive', () => {
    for (const eco of [true, false]) {
      const ctx = makeCtx(7, 50);
      const entities = new EntityManager(ctx);
      entities.ecologyRules = eco;
      entities.reset(20);
      const first = entities.list[0]!;
      for (const e of entities.list) {
        e.userData.energy = eco ? 0.01 : 0;
        e.userData.life = 1e9;
        e.userData.sT = 1e9;
      }
      step(entities, ctx, 3);
      expect(entities.list.includes(first)).toBe(!eco);
    }
  });

  test('metabolism drains energy faster for high-nW bodies', () => {
    const ctx = makeCtx(11, 50);
    const entities = new EntityManager(ctx);
    entities.reset(2);
    const [a, b] = entities.list as Entity[];
    for (const e of [a!, b!]) {
      e.userData.energy = 80;
      e.userData.life = 1e9;
      e.userData.sT = 1e9;
    }
    a!.userData.nW = 0.95;
    b!.userData.nW = 0.05;
    // one frame of basal burn must stay finite and below the start
    step(entities, ctx, 1);
    expect(Number.isFinite(a!.userData.energy)).toBe(true);
    expect(80 - a!.userData.energy).toBeGreaterThan(80 - b!.userData.energy - 0.6);
  });

  test('fission needs energy, costs the parent, and the child inherits the parent brain slot', () => {
    const ctx = makeCtx(5, 50);
    const entities = new EntityManager(ctx);
    const inherits: Array<[number, number]> = [];
    entities.attachBrainSlotLifecycle({
      swapEntitySlots: () => undefined,
      clearEntitySlot: () => undefined,
      resetEntitySlots: () => undefined,
      inheritEntitySlot: (c, p) => inherits.push([c, p]),
      traitAt: () => 0.5,
    });
    entities.reset(4);
    for (const e of entities.list) {
      e.userData.energy = 10; // below the fission floor
      e.userData.sT = 0;
      e.userData.life = 1e9;
    }
    step(entities, ctx, 30);
    expect(inherits.length).toBe(0);
    for (const e of entities.list) {
      e.userData.energy = 100;
      e.userData.sT = 0;
    }
    step(entities, ctx, 120);
    expect(inherits.length).toBeGreaterThan(0);
    for (const [c, p] of inherits) expect(c).not.toBe(p);
  });
});
