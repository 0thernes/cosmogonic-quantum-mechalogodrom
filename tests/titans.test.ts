/**
 * TitanSystem (CONTRACTS V3.3) — the 10 colossal game-theoretic minds: roaming, the
 * {energy, matter, entropy} economy, staggered pairwise prisoner's-dilemma diplomacy, war
 * strikes, and bankruptcy-driven replicator dynamics. A flagship sim system that, despite the
 * module promising "titan golden tests stay byte-identical", had NO dedicated test.
 *
 * This pins the #1 invariant (the determinism law) for the titan layer: with singularity/economy
 * couplings detached (the default), the same seed + same dt/frame stream reconstructs an identical
 * ledger and war matrix — and a DIFFERENT seed does not (so the guard is not vacuous). Plus the
 * documented structural invariants: 10 titans, finite + clamped economy state, and a symmetric
 * zero-diagonal relation matrix. Headless fake-ctx pattern — no WebGL, no DOM.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, PLATFORM_CEIL, PLATFORM_FLOOR, PLATFORM_HALF } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import {
  REL_ALLIANCE,
  REL_WAR,
  TitanSystem,
  type TitanLedgerEntry,
  type TitanLore,
  type TitanRd,
} from '../src/sim/titans';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, OrganismIntelligenceSignal, SimContext } from '../src/types';

const RESOURCE_CAP = 1000; // mirrors the module-private cap clamped on titan energy
const POP = 400;

/** Deterministic lore stub (pure in its args — no rng, satisfies the TitanLore facade). */
const LORE: TitanLore = {
  name: (kind, i) => `${kind}-${i}`,
  epithet: (kind, key) => `${kind}:${key}`,
};

function makeIntelligenceSignal(enabled: boolean): OrganismIntelligenceSignal {
  return {
    enabled,
    indicatorOnly: true,
    revision: 7,
    resourcePressure: 0.4,
    threatResponse: 0.6,
    exploration: 1,
    socialDrive: 0.5,
    plasticity: 0.7,
    forecast: 0.8,
    confidence: 1,
    corpusDrive: 0.9,
    ecologyRisk: 0.5,
    ecologySurprise: 0.25,
    channels: new Float32Array([0.2, 0.4, 0.6, 0.8]),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

/** Headless SimContext with real geometries/morphotypes at a small tier (fake-ctx pattern). */
function makeCtx(seed: number, organismIntelligence?: OrganismIntelligenceSignal): SimContext {
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
      maxEntities: POP,
      targetEntities: POP,
      quantumCount: 5,
      maxLinks: 100,
      shadows: false,
      starCount: 5,
      quantization: getQuantizationConfig('phone'),
      simRate: 15,
    },
    rng,
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs,
    geos,
    state: {
      chaos: 1.5,
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
    organismIntelligence,
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

interface Snapshot {
  ledger: TitanLedgerEntry[];
  war: Uint8Array;
}

/**
 * Build a TitanSystem from `seed` and drive `frames` updates with a FIXED dt + frame cadence,
 * feeding deterministic PRODUCE inputs (entropy every frame, a collapse witness every 30) so the
 * economy + diplomacy + strike paths actually fire. Returns a deep snapshot of the public state.
 */
function run(seed: number, frames: number): Snapshot {
  const ctx = makeCtx(seed);
  const entities = new EntityManager(ctx);
  entities.reset(POP);
  const rd: TitanRd = { perturb: () => undefined };
  const titans = new TitanSystem(ctx, entities, LORE, rd);
  const dt = 1 / 60;
  for (let f = 1; f <= frames; f++) {
    ctx.state.frame = f;
    titans.feedEntropy(0.5);
    if (f % 30 === 0) titans.onCollapseWitness();
    titans.update(dt, f * dt);
    titans.drainPerturb();
  }
  return {
    ledger: titans.ledger.map((e) => ({ ...e })),
    war: Uint8Array.from(titans.warMatrix),
  };
}

describe('TitanSystem — determinism law (golden)', () => {
  test('same seed + same dt/frame stream ⇒ byte-identical ledger and war matrix', () => {
    const FRAMES = 1300; // > 2 diplomacy cycles (600) + many economy ticks (90)
    const a = run(0xb0d6e7, FRAMES);
    const b = run(0xb0d6e7, FRAMES);
    expect(a.ledger.length).toBe(b.ledger.length);
    for (let i = 0; i < a.ledger.length; i++) {
      const x = a.ledger[i]!;
      const y = b.ledger[i]!;
      expect(y.name).toBe(x.name);
      expect(y.energy).toBe(x.energy);
      expect(y.matter).toBe(x.matter);
      expect(y.entropy).toBe(x.entropy);
      expect(y.war).toBe(x.war);
    }
    expect(a.war.length).toBe(b.war.length);
    for (let i = 0; i < a.war.length; i++) expect(b.war[i]).toBe(a.war[i]);
  });

  test('a different seed drives a different cosmos (the guard is not vacuous)', () => {
    const FRAMES = 1300;
    const a = run(0xb0d6e7, FRAMES);
    const c = run(0x5eed42, FRAMES);
    // Some titan-economy field must differ — identical output across distinct seeds would mean the
    // seed is not actually steering the simulation.
    let differs = false;
    for (let i = 0; i < a.ledger.length && !differs; i++) {
      const x = a.ledger[i]!;
      const y = c.ledger[i]!;
      if (y.energy !== x.energy || y.matter !== x.matter || y.entropy !== x.entropy) differs = true;
    }
    expect(differs).toBe(true);
  });
});

describe('TitanSystem — structural invariants', () => {
  test('builds exactly 20 titans with a ledger row each', () => {
    const ctx = makeCtx(1);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    expect(titans.count).toBe(20);
    expect(titans.ledger.length).toBe(20);
  });

  test('dispose() frees per-titan materials + the geometry cache and clears the count (idempotent)', () => {
    const ctx = makeCtx(1);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    expect(titans.count).toBe(20);
    const matSpy = spyOn(THREE.Material.prototype, 'dispose');
    titans.dispose();
    // Per-titan materials (bodyMat/accentMat/cage + aura ShaderMaterials) are freed; the module-shared
    // TITAN_CORE_GEO / TITAN_TESSERACT_GEO are intentionally NOT disposed (reused by the next HMR World).
    expect(matSpy).toHaveBeenCalled();
    expect(titans.count).toBe(0);
    matSpy.mockRestore();
    expect(() => titans.dispose()).not.toThrow(); // idempotent — safe on an already-freed system
  });

  test('economy state stays finite + clamped after a long run (NaN/overflow seal)', () => {
    const { ledger } = run(0xfeed, 1300);
    for (const e of ledger) {
      expect(Number.isFinite(e.energy)).toBe(true);
      expect(Number.isFinite(e.matter)).toBe(true);
      expect(Number.isFinite(e.entropy)).toBe(true);
      expect(e.energy).toBeGreaterThanOrEqual(0);
      expect(e.energy).toBeLessThanOrEqual(RESOURCE_CAP);
      expect(e.war).toBeGreaterThanOrEqual(0);
      expect(e.war).toBeLessThanOrEqual(19);
    }
  });

  test('the war matrix is symmetric with a zero diagonal and only {truce, alliance, war}', () => {
    const { war } = run(0xfeed, 1300);
    expect(war.length).toBe(400); // 20 × 20
    for (let i = 0; i < 20; i++) {
      expect(war[i * 20 + i]).toBe(0); // a titan is never at war with itself
      for (let j = 0; j < 20; j++) {
        const v = war[i * 20 + j]!;
        expect(v).toBeLessThanOrEqual(2); // 0 truce, 1 alliance, 2 war
        expect(war[j * 20 + i]).toBe(v); // symmetric
      }
    }
  });
});

describe('TitanSystem.setStrategy — NaN seal + bounds (audit fix)', () => {
  test('non-finite / out-of-range strategy never crashes or poisons the ledger with NaN', () => {
    const ctx = makeCtx(0x57a7);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    // Exercise every branch of setStrategy:
    expect(() => titans.setStrategy(999, 2)).not.toThrow(); // out-of-range index → no-op
    titans.setStrategy(0, 3); // valid in-range
    titans.setStrategy(1, NaN); // the NaN seal → strategy 0 (NaN would mute diplomacy forever)
    titans.setStrategy(2, Infinity); // non-finite → strategy 0
    titans.setStrategy(3, 99); // clamps high → STRATEGIES.length - 1
    titans.setStrategy(4, -5); // clamps low → 0
    // Drive diplomacy/economy: if the seal failed, a NaN strategy would propagate into the ledger.
    const dt = 1 / 60;
    for (let f = 1; f <= 700; f++) {
      ctx.state.frame = f;
      titans.feedEntropy(0.5);
      titans.update(dt, f * dt);
    }
    for (const e of titans.ledger) {
      expect(Number.isFinite(e.energy)).toBe(true);
      expect(Number.isFinite(e.matter)).toBe(true);
      expect(Number.isFinite(e.entropy)).toBe(true);
    }
  });
});

/** Minimal structural view of a Titan for the roam regression (TS `private` is runtime-accessible). */
interface TitanRoamView {
  group: { position: { x: number; y: number; z: number } };
  vel: { x: number; y: number; z: number };
  homeX: number;
  homeZ: number;
  breeder: boolean;
}

interface TitanActionSnapshot {
  position: readonly [number, number, number];
  velocity: readonly [number, number, number];
}

function driveTitanIntelligenceCounterfactual(
  enabledOrSignal: boolean | OrganismIntelligenceSignal,
): TitanActionSnapshot[] {
  const signal =
    typeof enabledOrSignal === 'boolean'
      ? makeIntelligenceSignal(enabledOrSignal)
      : enabledOrSignal;
  const ctx = makeCtx(0x71a11, signal);
  const entities = new EntityManager(ctx);
  entities.reset(POP);
  const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
  const arr = (titans as unknown as { titans: TitanRoamView[] }).titans;
  const dt = 1 / 60;
  for (let f = 1; f <= 240; f++) {
    ctx.state.frame = f;
    titans.update(dt, f * dt);
  }
  return arr.map((titan) => ({
    position: [titan.group.position.x, titan.group.position.y, titan.group.position.z],
    velocity: [titan.vel.x, titan.vel.y, titan.vel.z],
  }));
}

describe('TitanSystem — organism-intelligence matched counterfactual', () => {
  test('the live signal changes every titan action vector and trajectory with seed/config held fixed', () => {
    const disabled = driveTitanIntelligenceCounterfactual(false);
    const operational = driveTitanIntelligenceCounterfactual(true);

    // A second operational run proves the observed delta is deterministic, not test noise.
    expect(operational).toEqual(driveTitanIntelligenceCounterfactual(true));
    expect(disabled).toHaveLength(20);
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

  test('enabled zero-evidence intelligence is motion-neutral', () => {
    const zero = {
      ...makeIntelligenceSignal(true),
      resourcePressure: 0,
      threatResponse: 0,
      exploration: 0,
      socialDrive: 0,
      confidence: 0,
      corpusDrive: 0,
      ecologyRisk: 0,
      ecologySurprise: 0,
      channels: new Float32Array(4),
    } satisfies OrganismIntelligenceSignal;
    expect(driveTitanIntelligenceCounterfactual(zero)).toEqual(
      driveTitanIntelligenceCounterfactual(false),
    );
  });

  interface TitanDiplomacyHarness {
    diplomacy(pairIndex: number): void;
    titans: Array<{ energy: number }>;
  }

  function driveDiplomacy(
    strategy: number,
    organismIntelligence?: OrganismIntelligenceSignal,
    sample = 0.1,
  ): { relation: number; energy: readonly [number, number]; rngDraws: number } {
    const ctx = makeCtx(0xd1f10, organismIntelligence);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    titans.setStrategy(0, strategy);
    titans.setStrategy(1, strategy);

    // Reset only the post-boot decision stream. A fixed in-range sample makes all three rounds an
    // exact matched counterfactual with two draws per round and exposes the intended probability tail.
    let rngDraws = 0;
    ctx.rng = () => {
      rngDraws++;
      return sample;
    };
    const harness = titans as unknown as TitanDiplomacyHarness;
    for (let round = 0; round < 3; round++) harness.diplomacy(0);
    return {
      relation: titans.warMatrix[1]!,
      energy: [harness.titans[0]!.energy, harness.titans[1]!.energy],
      rngDraws,
    };
  }

  test('social cooperation and pressure raid biases change real diplomacy with no RNG drift', () => {
    const disabled = makeIntelligenceSignal(false);
    const social = {
      ...makeIntelligenceSignal(true),
      resourcePressure: 0,
      threatResponse: 0,
      socialDrive: 1,
    } satisfies OrganismIntelligenceSignal;
    const pressure = {
      ...makeIntelligenceSignal(true),
      resourcePressure: 1,
      threatResponse: 1,
      socialDrive: 0,
    } satisfies OrganismIntelligenceSignal;

    const defectLegacy = driveDiplomacy(3, undefined, 0.9);
    const defectDisabled = driveDiplomacy(3, disabled, 0.9);
    const defectSocial = driveDiplomacy(3, social, 0.9);
    expect(defectDisabled).toEqual(defectLegacy);
    expect(defectLegacy.relation).toBe(REL_WAR);
    expect(defectSocial.relation).toBe(REL_ALLIANCE);
    expect(defectSocial.energy).not.toEqual(defectLegacy.energy);

    const cooperateLegacy = driveDiplomacy(0);
    const cooperatePressure = driveDiplomacy(0, pressure);
    expect(cooperateLegacy.relation).toBe(REL_ALLIANCE);
    expect(cooperatePressure.relation).toBe(REL_WAR);
    expect(cooperatePressure.energy).not.toEqual(cooperateLegacy.energy);

    expect(defectLegacy.rngDraws).toBe(6);
    expect(defectSocial.rngDraws).toBe(defectLegacy.rngDraws);
    expect(cooperatePressure.rngDraws).toBe(cooperateLegacy.rngDraws);
    expect(driveDiplomacy(3, social, 0.9)).toEqual(defectSocial);
  });
});

describe('TitanSystem — roam stays in home territory (anti-clustering regression)', () => {
  // Guards the 2026-06-27 fix: the old roam "core pull" sprang EVERY titan toward the global origin,
  // collapsing all 10 onto the centre (and their aura wells then dragged the whole population into one
  // central clot). The fix springs each titan toward its OWN distributed home wedge (radius 130/175/220
  // on a ring). This is a DETERMINISTIC behavioural property the golden test can't catch — a regression
  // to origin-seeking would keep the sim deterministic but drive every titan to (0,0).
  test('after a long roam, titans hover near their own homes and never collapse to the centre', () => {
    const ctx = makeCtx(0x7174a4);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    const arr = (titans as unknown as { titans: TitanRoamView[] }).titans;
    const dt = 1 / 60;
    let verticalContained = true;
    let maxY = -Infinity;
    for (let f = 1; f <= 1200; f++) {
      ctx.state.frame = f;
      titans.update(dt, f * dt);
      for (const titan of arr) {
        const y = titan.group.position.y;
        maxY = Math.max(maxY, y);
        verticalContained &&= y >= PLATFORM_FLOOR && y <= PLATFORM_CEIL;
      }
    }
    expect(arr.length).toBe(20);
    // Owner: titans now ROAM the whole square platform freely — the old central breeder racetrack and
    // home-tether are gone (they read as a race track / a huddle). The anti-clustering invariant is
    // therefore STRONGER: every colossus stays on the expanded platform, the swarm spreads across a wide
    // band on both axes, and it does NOT collapse to the centre.
    const xs: number[] = [];
    const zs: number[] = [];
    let meanOriginR = 0;
    let offCentre = 0; // colossi genuinely out in the arena, not piled at the origin
    for (const t of arr) {
      const p = t.group.position;
      xs.push(p.x);
      zs.push(p.z);
      const dOrigin = Math.hypot(p.x, p.z);
      meanOriginR += dOrigin;
      if (dOrigin > PLATFORM_HALF * (5 / 27)) offCentre++;
      expect(Number.isFinite(p.x + p.z)).toBe(true);
      // HARD platform containment (owner law: NEVER off the square platform).
      expect(Math.abs(p.x)).toBeLessThanOrEqual(PLATFORM_HALF + 1);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(PLATFORM_HALF + 1);
    }
    meanOriginR /= arr.length;
    // SPREAD across the arena on BOTH axes — a wide band, not a point or a central pile.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(PLATFORM_HALF * (22 / 27));
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(PLATFORM_HALF * (22 / 27));
    // NOT collapsed to the centre: the swarm's mean radius sits well out in the platform and most
    // colossi are genuinely off-centre (the anti-clustering guarantee, now via free roaming).
    expect(meanOriginR).toBeGreaterThan(PLATFORM_HALF * (5 / 27));
    expect(maxY).toBeGreaterThan(240);
    expect(verticalContained).toBe(true);
    expect(offCentre).toBeGreaterThanOrEqual(10);
  });

  test('the roam is deterministic — same seed reproduces identical titan positions', () => {
    const drive = (seed: number): number[] => {
      const ctx = makeCtx(seed);
      const entities = new EntityManager(ctx);
      entities.reset(POP);
      const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
      const dt = 1 / 60;
      for (let f = 1; f <= 300; f++) {
        ctx.state.frame = f;
        titans.update(dt, f * dt);
      }
      const arr = (titans as unknown as { titans: TitanRoamView[] }).titans;
      return arr.flatMap((t) => [t.group.position.x, t.group.position.z]);
    };
    expect(drive(0x42)).toEqual(drive(0x42));
  });
});
