/**
 * F-SPAWN-BUDGET — the apocalypse "brain-fart" fix.
 *
 * Apocalypse maxes `chaos`, which drains every organism's split timer ~3× (cMul saturates at 3),
 * so the WHOLE population turns split-ready in the same frame and auto-split detonates — hundreds
 * of allocations per frame compounding toward the 50,000 ceiling, which freezes a single-thread JS
 * main loop (the GC/allocation cliff). The {@link SPAWN_BUDGET_ULTRA} per-frame cap amortizes that
 * surge across frames and remains live for post-update NHI swarms, so both paths share one material
 * birth ceiling. The cap is GATED to the ultra tier (>5,000), scaled up (512/frame) so capable
 * hardware absorbs surges faster without a single-frame allocation cliff.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager, SPAWN_BUDGET_ULTRA } from '../src/sim/entities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 2,
    entropy: 0,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0.2, z: -0.1 },
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
  maxEntities: number,
  rngOverride?: () => number,
  gridOverride?: SpatialHash<Entity>,
): SimContext {
  const rng = rngOverride ?? mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  const tier = maxEntities > 5000 ? 'mega' : 'desktop';
  return {
    scene: new THREE.Scene(),
    quality: {
      tier,
      isMobile: false,
      instanced: false, // data-only headless path (the budget is independent of the render path)
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 50,
      maxLinks: 500,
      shadows: false,
      starCount: 50,
      quantization: getQuantizationConfig('desktop'),
    },
    rng,
    grid: gridOverride ?? new SpatialHash<Entity>(16),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/**
 * Simulate the apocalypse trigger condition: a fully split-ready population at max chaos, then run
 * ONE frame. Returns how many new organisms were born that frame.
 */
function surge(seed: number, maxEntities: number, seedCount: number): number {
  const ctx = makeCtx(seed, maxEntities);
  const ent = new EntityManager(ctx);
  ent.reset(seedCount);
  for (const e of ent.list) e.userData.sT = -1; // every organism split-ready (apocalypse condition)
  ctx.state.chaos = 10; // max chaos (drains the timers; cMul saturates)
  ctx.grid.clear();
  for (const e of ent.list) ctx.grid.insert(e);
  const before = ent.list.length;
  ctx.state.frame = 1;
  ent.update(0.016, 0.016);
  return ent.list.length - before;
}

describe('F-SPAWN-BUDGET — amortized mass-spawn (apocalypse brain-fart fix)', () => {
  test('a synchronized split surge is capped at SPAWN_BUDGET_ULTRA per frame at the ultra tier', () => {
    const spawned = surge(7, 50000, 3000);
    expect(spawned).toBeGreaterThan(0); // it still grows — not an accidental no-op
    expect(spawned).toBeLessThanOrEqual(SPAWN_BUDGET_ULTRA); // but never detonates past the cap
  });

  test('the cap is deterministic — same seed yields the same surge', () => {
    expect(surge(7, 50000, 3000)).toBe(surge(7, 50000, 3000));
  });

  test('below the ultra tier the budget is never consulted (goldens stay byte-identical)', () => {
    // At a 5,000-cap tier (ultra is strictly > 5,000) the SAME surge matches mega when uncapped.
    expect(surge(7, 5000, 3000)).toBe(surge(7, 50000, 3000));
  });

  test('the lower-tier wrapper preserves the direct spawn stream exactly', () => {
    const directCtx = makeCtx(29, 5000);
    const wrappedCtx = makeCtx(29, 5000);
    const direct = new EntityManager(directCtx);
    const wrapped = new EntityManager(wrappedCtx);
    const at = new THREE.Vector3(3, 4, 5);
    for (let i = 0; i < 64; i++) {
      expect(direct.spawn(at, i, 0.75)).not.toBeNull();
      expect(wrapped.spawnWithinFrameBudget(at, i, 0.75)).not.toBeNull();
    }
    const trace = (ent: EntityManager): number[] =>
      ent.list.flatMap((entity) => [
        entity.userData.mi,
        entity.userData.life,
        entity.userData.ph,
        entity.userData.sortVal,
        entity.userData.energy,
        entity.userData.vel.x,
        entity.userData.vel.y,
        entity.userData.vel.z,
      ]);
    expect(trace(wrapped)).toEqual(trace(direct));
    expect(wrappedCtx.rng()).toBe(directCtx.rng());
  });

  test('organic update births and post-update NHI-style births share one exact ultra budget', () => {
    const ctx = makeCtx(7, 50000, () => 0);
    const ent = new EntityManager(ctx);
    ent.reset(1);
    const initial = ent.list.length;
    ent.list[0]!.userData.sT = -1;
    ctx.state.chaos = 10;
    ctx.grid.insert(ent.list[0]!);

    ent.update(0.016, 0.016);
    const organicBirths = ent.list.length - initial;
    expect(organicBirths).toBe(1);

    const at = new THREE.Vector3(1, 2, 3);
    let postUpdateBirths = 0;
    while (ent.spawnWithinFrameBudget(at, 0) !== null) postUpdateBirths++;
    expect(organicBirths + postUpdateBirths).toBe(SPAWN_BUDGET_ULTRA);
    expect(ent.list.length - initial).toBe(SPAWN_BUDGET_ULTRA);

    // The next EntityManager beat starts a fresh deterministic frame reservation window.
    ent.update(0, 0.032);
    expect(ent.spawnWithinFrameBudget(at, 0)).not.toBeNull();
  });

  test('null and exceptional spawn paths release their ultra-tier reservations', () => {
    const ctx = makeCtx(11, 50000);
    const ent = new EntityManager(ctx);
    const morphs = ctx.morphs as (typeof ctx.morphs)[number][];
    const savedMorphs = morphs.splice(0);
    expect(ent.spawnWithinFrameBudget(new THREE.Vector3(), 0)).toBeNull();
    morphs.push(...savedMorphs);

    ent.attachBrainSlotLifecycle({
      swapEntitySlots: () => undefined,
      clearEntitySlot: () => {
        throw new Error('synthetic brain-slot failure');
      },
      resetEntitySlots: () => undefined,
    });
    expect(() => ent.spawnWithinFrameBudget(new THREE.Vector3(), 0)).toThrow(
      'synthetic brain-slot failure',
    );
    ent.attachBrainSlotLifecycle(null);

    for (let i = 0; i < SPAWN_BUDGET_ULTRA; i++) {
      expect(ent.spawnWithinFrameBudget(new THREE.Vector3(i, 0, 0), 0)).not.toBeNull();
    }
    expect(ent.spawnWithinFrameBudget(new THREE.Vector3(), 0)).toBeNull();
    expect(ent.list).toHaveLength(SPAWN_BUDGET_ULTRA);
  });

  test('World routes NHI SPAWN_SWARM through the same EntityManager budget', async () => {
    const world = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();
    const start = world.indexOf('private nhiApply');
    const end = world.indexOf('\n  /**', start + 1);
    const apply = world.slice(start, end);
    expect(apply).toContain('this.entities.spawnWithinFrameBudget(');
    expect(apply).not.toContain('this.entities.spawn(\n');
  });
});

class CountingGrid extends SpatialHash<Entity> {
  clears = 0;
  inserts = 0;

  override clear(): void {
    this.clears++;
    super.clear();
  }

  override insert(entity: Entity): void {
    this.inserts++;
    super.insert(entity);
  }
}

describe('current-grid structural scaling receipt', () => {
  test('N=1k/10k/50k rebuilds once for M=1/8/32 and not at all for M=0', () => {
    const populations = [1_000, 10_000, 50_000] as const;
    const minds = [0, 1, 8, 32] as const;
    for (const population of populations) {
      const grid = new CountingGrid(32);
      const ctx = makeCtx(19, 50_000, undefined, grid);
      const ent = new EntityManager(ctx);
      for (let i = 0; i < population; i++) {
        ent.list.push({ position: new THREE.Vector3(i % 256, 0, (i / 256) | 0) } as Entity);
      }

      for (const mindCount of minds) {
        const clearsBefore = grid.clears;
        const insertsBefore = grid.inserts;
        const rebuilt = ent.rebuildCurrentGridForNhi(mindCount);
        const expected = mindCount === 0 ? 0 : population;
        expect(rebuilt).toBe(expected);
        expect(grid.inserts - insertsBefore).toBe(expected);
        expect(grid.clears - clearsBefore).toBe(mindCount === 0 ? 0 : 1);
      }
    }
  });

  test('rejects invalid NHI counts instead of hiding an unbounded caller bug', () => {
    const ent = new EntityManager(makeCtx(23, 50_000));
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => ent.rebuildCurrentGridForNhi(invalid)).toThrow();
    }
  });
});
