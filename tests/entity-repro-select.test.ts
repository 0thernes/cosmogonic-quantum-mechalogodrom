/**
 * GATE-REPRO-SELECT — proves base-population fission is fitness-linked, not neutral drift.
 *
 * The claim under test: heritable `nW` scales the auto-split probability in the SHIPPED
 * EntityManager (`fissionP = 0.02 + 0.08*nW`, entities.ts), so high-nW lineages out-reproduce
 * low-nW ones and the population's mean nW rises. That is fecundity selection: heredity +
 * mutation + a fitness differential, which is exactly what the 3.5 audit found missing
 * ("No birth or death path reads a heritable trait ⇒ NEUTRAL DRIFT").
 *
 * CONTROL DISCIPLINE — the arms differ in the mechanism under test and nothing else:
 *   live     — setReproAblated(false): the split roll reads the heritable trait.
 *   ablated  — setReproAblated(true):  the split roll reverts to the trait-blind legacy constant
 *              (0.06). Heredity, mutation, founders, seeds, sT re-arming, population dynamics and
 *              the main-rng draw order are IDENTICAL. Only trait→fitness is severed.
 *
 * The control must be able to FAIL. An earlier draft "ablated" by scrambling nW every frame; that
 * overwrote the measured variable, so meanNW() read nothing but coin-flips and the control
 * returned ~0 even when the simulation was never stepped at all. A control that cannot fail is
 * not a control. This one ablates the mechanism and leaves the measurement intact.
 */
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

function meanNW(entities: EntityManager): number {
  let sum = 0;
  let n = 0;
  for (const e of entities.list) {
    if (!e) continue;
    sum += e.userData.nW;
    n++;
  }
  return n > 0 ? sum / n : 0;
}

interface Run {
  /** mean nW at the end minus mean nW at founding — the selection response. */
  delta: number;
  /** live population at the end; both arms must reach a comparable size for the delta to mean anything. */
  pop: number;
}

/**
 * Bimodal founders (half nW=0.9, half nW=0.1) so a frequency shift is measurable in either
 * direction, then run frames with fission kept armed. `ablate` selects the control arm.
 */
function runSelection(seed: number, frames: number, ablate: boolean): Run {
  const ctx = makeCtx(seed, 280);
  const entities = new EntityManager(ctx);
  entities.setReproAblated(ablate);
  entities.reset(100);
  let i = 0;
  for (const e of entities.list) {
    if (!e) continue;
    e.userData.nW = i % 2 === 0 ? 0.9 : 0.1;
    e.userData.life = 200 + e.userData.nW * 900;
    e.userData.sT = 0; // fission-ready immediately
    e.userData.age = 0;
    i++;
  }
  const startMean = meanNW(entities);
  expect(startMean).toBeGreaterThan(0.45);
  expect(startMean).toBeLessThan(0.55);

  const state = ctx.state;
  for (let f = 0; f < frames; f++) {
    state.frame++;
    state.elapsed += 1 / 60;
    if (state.frame % 2 === 0) {
      ctx.grid.clear();
      for (const e of entities.list) if (e) ctx.grid.insert(e);
    }
    entities.update(1 / 60, state.elapsed);
    // Keep fission armed in BOTH arms — identical treatment, so the only difference between them
    // is whether the split roll reads nW.
    for (const e of entities.list) {
      if (!e) continue;
      if (e.userData.sT > 40) e.userData.sT = 0;
    }
  }
  return { delta: meanNW(entities) - startMean, pop: entities.list.filter(Boolean).length };
}

const SEEDS = [0x50f7, 0x1234, 0xabcd, 0x7777, 0x2468, 0x9abc, 0x3141, 0x5926];
const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;

describe('GATE-REPRO-SELECT: heritable nW drives differential fission vs a trait-blind control', () => {
  const live = SEEDS.map((s) => runSelection(s, 500, false));
  const ablated = SEEDS.map((s) => runSelection(s, 500, true));
  const liveDeltas = live.map((r) => r.delta);
  const ablatedDeltas = ablated.map((r) => r.delta);
  const liveMean = mean(liveDeltas);
  const ablatedMean = mean(ablatedDeltas);

  test('selection raises mean nW (high-nW lineages reproduce more)', () => {
    expect(liveMean).toBeGreaterThan(0.04);
    // Majority of seeds must shift positively — not one lucky seed.
    expect(liveDeltas.filter((d) => d > 0.02).length).toBeGreaterThanOrEqual(6);
  });

  test('trait-blind ablation does not raise mean nW (selection is causal)', () => {
    expect(Math.abs(ablatedMean)).toBeLessThan(0.03);
    expect(liveMean).toBeGreaterThan(ablatedMean + 0.04);
  });

  test('the arms are comparable: both reach a similar population, so the delta is not a sampling artefact', () => {
    const livePop = mean(live.map((r) => r.pop));
    const ablatedPop = mean(ablated.map((r) => r.pop));
    expect(Math.abs(livePop - ablatedPop) / Math.max(livePop, ablatedPop)).toBeLessThan(0.15);
  });

  test('the control CAN fail: with selection restored, the ablated assertion would not hold', () => {
    // Guards against the tautological-control class: if the "ablated" arm were measuring nothing,
    // it would return ~0 regardless of the mechanism. Running the same harness with selection ON
    // must break the flatness bound the control relies on.
    expect(Math.abs(liveMean)).toBeGreaterThan(0.03);
  });

  test('deterministic: identical seed ⇒ identical mean shift', () => {
    expect(runSelection(0x50f7, 400, false).delta).toBe(runSelection(0x50f7, 400, false).delta);
  });
});
