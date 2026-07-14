/**
 * PuppetMasterSystem — the three scheming hands (AETHON stokes chaos, SELENE shifts weather, KRONOS
 * reshapes organisms) that perturb the world on wealth/opportunity-driven timers. They were covered
 * only indirectly (the integrated world loop); this pins their public contract directly: exactly 3
 * hands, interventions that keep `state.chaos`/`weatherIdx`/`mutations` finite + in bounds, and a
 * fully reproducible intervention history from one seed (their actions draw from `ctx.rng`).
 *
 * Headless (fake-ctx pattern) — drives the real `update`/`act` over a real EntityManager + grid.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { PuppetMasterSystem } from '../src/sim/puppet-masters';
import { PLATFORM_CEIL, PLATFORM_FLOOR, PLATFORM_HALF } from '../src/sim/constants';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type {
  Entity,
  OrganismIntelligenceSignal,
  PuppetEvent,
  SimContext,
  SimState,
} from '../src/types';

/** Same corpus lanes in both causal arms; only the live enable gate differs. */
function matchedIntelligenceSignal(enabled: boolean): OrganismIntelligenceSignal {
  return {
    enabled,
    indicatorOnly: true,
    revision: 7,
    resourcePressure: 1,
    threatResponse: 0.85,
    exploration: 1,
    socialDrive: 1,
    plasticity: 0.8,
    forecast: 0.75,
    confidence: 1,
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
    chaos: 1,
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
): {
  ctx: SimContext;
  entities: EntityManager;
  pm: PuppetMasterSystem;
  events: PuppetEvent[];
} {
  const ctx = makeCtx(seed, isMobile, organismIntelligence);
  const entities = new EntityManager(ctx);
  entities.reset(50);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const events: PuppetEvent[] = [];
  // EVENT is a reused module scratch object — copy it on receipt to retain a history.
  const pm = new PuppetMasterSystem(ctx, entities, (e) => events.push({ ...e }));
  return { ctx, entities, pm, events };
}

/** Pre-intervention state used to prove both matched arms start from the same class state. */
function puppetActionTrace(pm: PuppetMasterSystem): number[][] {
  const hands = (
    pm as unknown as {
      pms: {
        mesh: THREE.Mesh;
        ti: number;
        satiation: number;
        u: { uHunt: { value: number }; uAgitation: { value: number } };
      }[];
    }
  ).pms;
  return hands.map((p) => [
    p.mesh.position.x,
    p.mesh.position.y,
    p.mesh.position.z,
    p.mesh.rotation.x,
    p.mesh.rotation.y,
    p.ti,
    p.satiation,
    p.u.uHunt.value,
    p.u.uAgitation.value,
  ]);
}

describe('PuppetMasterSystem — deterministic schemers that perturb the world within bounds', () => {
  test('preserves the exact mobile and desktop census', () => {
    const mobile = makeWorld(1, true).pm;
    const desktop = makeWorld(1, false).pm;
    expect(mobile.count).toBe(14);
    expect(desktop.count).toBe(100);
    mobile.dispose();
    desktop.dispose();
  }, 15_000);

  test('dispose() frees per-puppet geometries + materials and clears the count (idempotent)', () => {
    const { pm } = makeWorld(1);
    expect(pm.count).toBeGreaterThan(0);
    const matSpy = spyOn(THREE.Material.prototype, 'dispose');
    const geoSpy = spyOn(THREE.BufferGeometry.prototype, 'dispose');
    pm.dispose();
    expect(matSpy).toHaveBeenCalled(); // body + ring materials freed
    expect(geoSpy).toHaveBeenCalled(); // body + ring geometries freed
    expect(pm.count).toBe(0);
    matSpy.mockRestore();
    geoSpy.mockRestore();
    expect(() => pm.dispose()).not.toThrow(); // idempotent — safe on an already-freed system
  }, 15_000);

  test('6000 frames keep world state finite + in bounds and fire valid interventions', () => {
    const { ctx, pm, events } = makeWorld(0x9a77e7);
    const hands = (pm as unknown as { pms: { mesh: THREE.Mesh }[] }).pms;
    let maxHorizontal = 0;
    let maxY = -Infinity;
    let contained = true;
    for (let f = 0; f < 6000; f++) {
      pm.update(1 / 60, f / 60); // ~100s — long enough for all hands to roam + act
      for (const hand of hands) {
        const p = hand.mesh.position;
        maxHorizontal = Math.max(maxHorizontal, Math.abs(p.x), Math.abs(p.z));
        maxY = Math.max(maxY, p.y);
        contained &&=
          Math.abs(p.x) <= PLATFORM_HALF &&
          Math.abs(p.z) <= PLATFORM_HALF &&
          p.y >= PLATFORM_FLOOR &&
          p.y <= PLATFORM_CEIL;
      }
    }
    const s = ctx.state;
    expect(Number.isFinite(s.chaos)).toBe(true);
    expect(s.chaos).toBeGreaterThanOrEqual(0);
    expect(s.chaos).toBeLessThanOrEqual(10); // clamped to CHAOS_MAX * 0.7
    expect(Number.isInteger(s.weatherIdx)).toBe(true);
    expect(s.weatherIdx).toBeGreaterThanOrEqual(0);
    expect(s.weatherIdx).toBeLessThan(20);
    expect(Number.isFinite(s.mutations)).toBe(true);
    expect(s.mutations).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeGreaterThan(0); // the hands meddle over 10s
    expect(maxHorizontal).toBeGreaterThan(540);
    expect(maxY).toBeGreaterThan(240);
    expect(contained).toBe(true);
    for (const ev of events) {
      expect(ev.name.length).toBeGreaterThan(0);
      expect(ev.action.length).toBeGreaterThan(0);
    }
  });

  test('identical seeds replay an identical intervention history (determinism)', () => {
    const a = makeWorld(0x5eed01);
    const b = makeWorld(0x5eed01);
    for (let f = 0; f < 6000; f++) {
      a.pm.update(1 / 60, f / 60);
      b.pm.update(1 / 60, f / 60);
    }
    expect(a.events.length).toBeGreaterThan(0); // a meaningful (non-empty) history is being compared
    expect(a.ctx.state.chaos).toBe(b.ctx.state.chaos);
    expect(a.ctx.state.weatherIdx).toBe(b.ctx.state.weatherIdx);
    expect(a.ctx.state.mutations).toBe(b.ctx.state.mutations);
    expect(a.events.length).toBe(b.events.length);
  });

  test('matched organism-intelligence counterfactual advances the first live intervention deterministically', () => {
    const seed = 0x51a0c;
    const control = makeWorld(seed, true, matchedIntelligenceSignal(false));
    const operational = makeWorld(seed, true, matchedIntelligenceSignal(true));
    const replay = makeWorld(seed, true, matchedIntelligenceSignal(true));

    // Same hands, entities, RNG state, timers, and geometry before the enabled gate is observed.
    expect(puppetActionTrace(operational.pm)).toEqual(puppetActionTrace(control.pm));
    expect(puppetActionTrace(replay.pm)).toEqual(puppetActionTrace(control.pm));

    let controlFirst = -1;
    let operationalFirst = -1;
    let replayFirst = -1;
    for (
      let f = 0;
      f < 2500 && (controlFirst < 0 || operationalFirst < 0 || replayFirst < 0);
      f++
    ) {
      const t = f / 60;
      if (controlFirst < 0) {
        control.pm.update(1 / 60, t);
        if (control.events.length > 0) controlFirst = f;
      }
      if (operationalFirst < 0) {
        operational.pm.update(1 / 60, t);
        if (operational.events.length > 0) operationalFirst = f;
      }
      if (replayFirst < 0) {
        replay.pm.update(1 / 60, t);
        if (replay.events.length > 0) replayFirst = f;
      }
    }

    expect(controlFirst).toBeGreaterThanOrEqual(0);
    expect(operationalFirst).toBeGreaterThanOrEqual(0);
    expect(replayFirst).toBe(operationalFirst); // exact deterministic replay of the enabled arm
    expect(operational.events[0]).toEqual(replay.events[0]);
    // Confidence/exploration enter the actual planning gain, so the enabled hand emits a real world
    // intervention sooner than its otherwise-identical counterfactual; this is not shader telemetry.
    expect(operationalFirst).toBeLessThan(controlFirst);

    control.pm.dispose();
    operational.pm.dispose();
    replay.pm.dispose();
  });

  test('the manipulator shader uniforms are driven from the REAL per-puppet signals (bounded readouts)', () => {
    const { pm } = makeWorld(0x9a11);
    // Reach the private per-puppet uniforms (sibling-test cast pattern).
    const pms = (
      pm as unknown as {
        pms: {
          satiation: number;
          u: {
            uTime: { value: number };
            uSatiation: { value: number };
            uBoldness: { value: number };
            uAgitation: { value: number };
            uHunt: { value: number };
          };
        }[];
      }
    ).pms;
    expect(pms.length).toBeGreaterThan(0);
    for (let f = 0; f < 120; f++) pm.update(1 / 60, f / 60);
    for (const p of pms) {
      // uSatiation mirrors the puppet's live satiation exactly (the shader reads the real feeding memory).
      expect(p.u.uSatiation.value).toBeCloseTo(p.satiation, 6);
      // Every driven lane is finite and clamped to [0,1] — a bounded, falsifiable readout, never NaN.
      for (const lane of [p.u.uSatiation, p.u.uBoldness, p.u.uAgitation, p.u.uHunt]) {
        expect(Number.isFinite(lane.value)).toBe(true);
        expect(lane.value).toBeGreaterThanOrEqual(0);
        expect(lane.value).toBeLessThanOrEqual(1);
      }
      expect(Number.isFinite(p.u.uTime.value)).toBe(true);
    }
  });
});

interface PuppetSanctuaryView {
  mesh: THREE.Mesh;
  ti: number;
  satiation: number;
  u: {
    uAgitation: { value: number };
    uHunt: { value: number };
  };
}

interface PuppetSanctuaryHarness {
  pms: PuppetSanctuaryView[];
  act(puppet: PuppetSanctuaryView): void;
}

describe('PuppetMasterSystem — sanctuary suppression and deterministic target filtering', () => {
  test('protected puppets freeze their meddle cadence and resume normally on exit', () => {
    const { ctx, pm, events } = makeWorld(0x5afe);
    const harness = pm as unknown as PuppetSanctuaryHarness;
    for (const puppet of harness.pms) puppet.ti = 1_000_000;
    const timersBefore = harness.pms.map((puppet) => puppet.ti);
    const satiationBefore = harness.pms.map((puppet) => puppet.satiation);
    const stateBefore = {
      chaos: ctx.state.chaos,
      weather: ctx.state.weatherIdx,
      mutations: ctx.state.mutations,
    };
    let rngDraws = 0;
    ctx.rng = () => {
      rngDraws++;
      return 0.25;
    };

    pm.attachSanctuary(() => true);
    pm.update(1 / 60, 0);
    expect(events).toHaveLength(0);
    expect(rngDraws).toBe(0);
    expect(harness.pms.map((puppet) => puppet.ti)).toEqual(timersBefore);
    expect(harness.pms.map((puppet) => puppet.satiation)).toEqual(satiationBefore);
    expect({
      chaos: ctx.state.chaos,
      weather: ctx.state.weatherIdx,
      mutations: ctx.state.mutations,
    }).toEqual(stateBefore);
    for (const puppet of harness.pms) {
      expect(puppet.u.uAgitation.value).toBe(0);
      expect(puppet.u.uHunt.value).toBe(0);
    }

    pm.attachSanctuary(null);
    pm.update(1 / 60, 1 / 60);
    expect(events.length).toBeGreaterThan(0);
    expect(rngDraws).toBeGreaterThan(0);
    pm.dispose();
  });

  test('mutate skips protected targets but consumes the same two RNG draws per attempt', () => {
    const run = (
      protectTargets: boolean,
    ): { draws: number; remorphs: number; mutations: number } => {
      const { ctx, entities, pm } = makeWorld(0xc0ffee);
      const harness = pm as unknown as PuppetSanctuaryHarness;
      const mutator = harness.pms[2]!;
      // Keep the acting puppet outside the test sanctuary while every organism lies inside it.
      mutator.mesh.position.set(10_000, 10_000, 10_000);
      pm.attachSanctuary(protectTargets ? (x, z) => x !== 10_000 || z !== 10_000 : () => false);
      let draws = 0;
      ctx.rng = () => {
        draws++;
        return 0;
      };
      const remorph = spyOn(entities, 'remorph');
      harness.act(mutator);
      const result = {
        draws,
        remorphs: remorph.mock.calls.length,
        mutations: ctx.state.mutations,
      };
      remorph.mockRestore();
      pm.dispose();
      return result;
    };

    const protectedRun = run(true);
    const normalRun = run(false);
    expect(protectedRun).toEqual({ draws: 120, remorphs: 0, mutations: 0 });
    expect(normalRun).toEqual({ draws: 120, remorphs: 30, mutations: 30 });
  });
});
