/**
 * Perf-budget regression guard (CONTRACTS V3.6/V4.5 — Master File III, law 2: "if it is not
 * measured, it is not real").
 *
 * The 10x scale-up to the ultra tier (10,000 entities) put the per-frame simulation cost on a
 * cliff dominated by the O(n·k) behavior loop's spatial-grid neighbor queries. The timing guard below
 * intentionally measures only the entity-update slice it actually invokes. Connectome has its own
 * production-scale structural receipt below: link topology and activation stay live when hidden, while
 * geometry writes are provably zero. That separation keeps CI honest without pretending headless tests
 * can measure GPU upload or render time.
 *
 * This experiment drives the EXACT EntityManager update loop + the world.ts grid-rebuild cadence
 * at a HIGH population and asserts the median per-frame wall time stays under a GENEROUS bound.
 * It is intentionally loose — CI runners are slower and noisier than the reference box, and this
 * test must not flake — but tight enough to catch a structural regression in the invoked entity loop
 * (for example, an accidental quadratic census). It measures the MEDIAN of many frames so a single GC
 * pause cannot fail it. This is a CPU-side guard only: it constructs no renderer and excludes
 * GPU draw cost (which the headless harness cannot measure), exactly like scripts/perf-probe.ts.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, ULTRA_GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { Connectome } from '../src/sim/connectome';
import { InstancedEntityRenderer } from '../src/sim/instanced-entities';
import { LoreEngine } from '../src/sim/lore';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';
import { SuperMind } from '../src/sim/super-mind';
import { getQuantizationConfig } from '../src/math/quantization';
import type { SuperPercept } from '../src/sim/super-creature';

/** High population for the stress frame — the ultra-class regime where the cliff lived. */
const POP = 8000;
/** Desktop production population used by the non-timing connectome receipt. */
const CONNECTOME_POP = 10000;

/**
 * Generous per-frame wall-clock ceiling (ms) for the entity-update + grid-rebuild work at
 * {@link POP} entities. The reference machine runs this in ≈ 13 ms; a loaded CI runner has
 * ample slack to 120 ms, yet a 5×-class regression of the dominant loop (≈ 65 ms+) trips it.
 */
const FRAME_BUDGET_MS = 120;

/**
 * Generous ceiling (ms) for one {@link InstancedEntityRenderer.sync} pass at {@link POP} entities —
 * the 2nd-largest sim stage (~4.7 ms/10k reference; ~3.8 ms at this POP). The headless harness
 * can't measure GPU upload size, but it DOES catch the structural regressions that matter on the
 * CPU side: pool-rebuild thrash (recreating InstancedMeshes every frame instead of event-driven)
 * or an O(n²) census — both several-fold blowups that clear this 80 ms bound with room to spare,
 * while steady-state noise on a slow CI runner never approaches it.
 */
const SYNC_BUDGET_MS = 80;

/**
 * Generous per-beat ceiling (ms) for the apex {@link SuperMind.think} — ONE creature's full cognitive beat
 * (the 20-plus-faculty SC 1.1 stack: the 5-stage/25-variant Tree of Thought, the 6-qubit evolve + QNG +
 * Grover, spin-glass, active inference, ToM, neuromodulation, successor-representation, empowerment,
 * holographic recall, and now the simulated-register integration-proxy read). The reference machine runs it in ≈ 0.21 ms; a
 * the apex mind is a deliberate HEAVYWEIGHT (25+ faculties; only ≤5 instances exist, staggered across
 * sub-beats — NOT the 50k swarm), so the bound guards against a GROSS structural regression (e.g.
 * accidentally calling the UI-cadence `snapshot()` — full QGT + 4ⁿ-Pauli magic — every beat, or an O(n²)
 * faculty), not against intentional NHSI growth. Calibrated to a slow shared CI runner (~13ms observed for
 * the current stack); a 2–3× blowup still trips it. Median-of-many so a single GC pause can't fail it.
 * See docs/BENCHMARKS-2026-06-26.md "Apex mind … per-beat".
 */
const THINK_BUDGET_MS = 20;

function makeState(): SimState {
  return {
    chaos: 1.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 1, z: 1 },
    viewIdx: 1,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

/** DOM-free SimContext with real geometries/morphotypes at the ultra tier (fake-ctx pattern). */
function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const auditNoop = { record: () => undefined, entries: () => [] };
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'ultra' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 10,
      // Production quality contract: the neural graph capacity scales at 12 links/entity.
      maxLinks: maxEntities * 12,
      shadows: true,
      starCount: 10,
      quantization: getQuantizationConfig('ultra'),
      simRate: 15,
    },
    rng,
    grid: new SpatialHash<Entity>(maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL),
    morphs,
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Median of a numeric array (does not mutate the input). */
function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  if (s.length === 0) return 0;
  // Invariant: 0 ≤ mid < length for a non-empty array.
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Coverage instrumentation multiplies wall time; CPU budgets are meaningless under --coverage. */
function underCoverage(): boolean {
  return process.argv.some((a) => a === '--coverage' || a.startsWith('--coverage='));
}

describe('per-frame sim-CPU budget at the ultra tier', () => {
  test(`entity-update + grid rebuild at ${POP} entities stays under ${FRAME_BUDGET_MS}ms/frame (median)`, () => {
    const ctx = makeCtx(0xb0d6e7, POP);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const grid = ctx.grid;
    const state = ctx.state;
    expect(entities.list.length).toBe(POP);

    const stepFrame = (): number => {
      state.frame++;
      state.elapsed += 1 / 60;
      if (state.frame % 2 === 0) {
        grid.clear();
        const list = entities.list;
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (e) grid.insert(e);
        }
      }
      const t0 = performance.now();
      entities.update(1 / 60, state.elapsed);
      return performance.now() - t0;
    };

    // Warm the JIT (the first frames compile the megamorphic behavior dispatch).
    for (let f = 0; f < 20; f++) stepFrame();

    const samples: number[] = [];
    for (let f = 0; f < 60; f++) samples.push(stepFrame());

    const med = median(samples);
    // The population is held near POP by the auto-split/death equilibrium — confirm the guard
    // actually measured the heavy regime, not a collapsed world.
    expect(entities.list.length).toBeGreaterThan(POP * 0.7);
    // Wall-clock budgets are only falsifiable without coverage instrumentation.
    if (!underCoverage()) {
      expect(med).toBeLessThan(FRAME_BUDGET_MS);
    } else {
      expect(med).toBeGreaterThan(0);
      expect(Number.isFinite(med)).toBe(true);
    }
  }, 60000);
});

describe('production-scale connectome structural receipt', () => {
  test(`hidden ${CONNECTOME_POP}-entity graph preserves topology + activation with zero geometry writes`, () => {
    const ctx = makeCtx(0xc011ec7, CONNECTOME_POP);
    const entities = new EntityManager(ctx);
    entities.reset(CONNECTOME_POP);
    expect(entities.list.length).toBe(CONNECTOME_POP);

    // Seed an explicit positive activation field so the hidden pass must exercise (and preserve) propagation.
    let before = 0;
    for (let i = 0; i < entities.list.length; i++) {
      const entity = entities.list[i];
      if (!entity) continue;
      entity.userData.act = 0.01 + (i % 7) * 0.001;
      entity.userData.nW = 0.5;
      before += entity.userData.act;
      ctx.grid.insert(entity);
    }

    const connectome = new Connectome(ctx, entities);
    connectome.setWebVisible(false);
    connectome.update(1 / 60, 1);

    let after = 0;
    for (const entity of entities.list) if (entity) after += entity.userData.act;
    expect(connectome.links).toBeGreaterThan(0);
    expect(connectome.links).toBeLessThanOrEqual(ctx.quality.maxLinks);
    expect(connectome.pairCount).toBeGreaterThan(0);
    expect(connectome.pairCount).toBeLessThanOrEqual(connectome.links);
    expect(after).toBeGreaterThan(before);
    expect(connectome.geometryFloatsWritten).toBe(0);
    connectome.dispose();
  }, 30000);
});

describe('per-frame instanced-render sync budget at the ultra tier', () => {
  test(`InstancedEntityRenderer.sync at ${POP} entities stays under ${SYNC_BUDGET_MS}ms/frame (median)`, () => {
    const ctx = makeCtx(0x115ce5, POP);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const renderer = new InstancedEntityRenderer(ctx);
    expect(entities.list.length).toBe(POP);

    // One sync per frame against the live population — exactly world.ts's `this.instanced.sync`
    // call. The default zero-frame measures the common N(1) steady-state path (nightmare = 0).
    const stepSync = (): number => {
      const t0 = performance.now();
      renderer.sync(entities.list, 'solid');
      return performance.now() - t0;
    };

    // Warm past the one-time pool BUILD (first sync allocates every InstancedMesh) + JIT.
    for (let f = 0; f < 20; f++) stepSync();
    // After warm-up the pools exist and fit, so steady-state sync must be a pure rewrite — if a
    // regression rebuilt pools here, these samples would balloon past the budget.
    const pools = ctx.scene.children.filter((o) => o instanceof THREE.InstancedMesh);
    expect(pools.length).toBeGreaterThan(0);

    const samples: number[] = [];
    for (let f = 0; f < 60; f++) samples.push(stepSync());

    // Confirm the pools actually carried the population (guard measured the heavy regime).
    const live = pools.reduce((sum, p) => sum + (p as THREE.InstancedMesh).count, 0);
    expect(live).toBeGreaterThan(POP * 0.7);
    expect(median(samples)).toBeLessThan(SYNC_BUDGET_MS);
  }, 30000);
});

describe('per-beat apex-mind cognitive budget', () => {
  test('readCoupling reuses one borrowed view while tracking the latest beat', () => {
    const mind = new SuperMind(mulberry32(0xc0a911));
    const p: SuperPercept = {
      energy: 0.55,
      threat: 0.3,
      crowding: 0.4,
      chaos: 0.5,
      wealthRel: 0.5,
      preyClose: 0.45,
      rivalClose: 0.3,
      pull: 0.2,
      light: 0.5,
      sound: 0.4,
      phase: 0.25,
    };
    const before = mind.readCoupling();
    const latent = before.latent;
    const quantum = before.quantum;
    mind.think(p);
    const after = mind.readCoupling();
    expect(after).toBe(before);
    expect(after.latent).toBe(latent);
    expect(after.quantum).toBe(quantum);
    expect(after.consciousness).toBe(mind.snapshot().consciousness);
  });

  test(`SuperMind.think() stays under ${THINK_BUDGET_MS}ms/beat (median) — the 20+ faculty stack must not blow the frame`, () => {
    const mind = new SuperMind(mulberry32(0x5c11fe));
    const p: SuperPercept = {
      energy: 0.55,
      threat: 0.3,
      crowding: 0.4,
      chaos: 0.5,
      wealthRel: 0.5,
      preyClose: 0.45,
      rivalClose: 0.3,
      pull: 0.2,
      light: 0.5,
      sound: 0.4,
      phase: 0.25,
    };
    // Warm the JIT (the megamorphic faculty dispatch compiles) + settle the EMAs / reservoir / belief.
    for (let i = 0; i < 40; i++) mind.think(p);
    const samples: number[] = [];
    for (let i = 0; i < 200; i++) {
      const t0 = performance.now();
      mind.think(p);
      samples.push(performance.now() - t0);
    }
    expect(median(samples)).toBeLessThan(THINK_BUDGET_MS);
  }, 30000);
});
