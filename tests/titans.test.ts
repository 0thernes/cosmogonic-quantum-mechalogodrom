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
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import {
  TitanSystem,
  type TitanLedgerEntry,
  type TitanLore,
  type TitanRd,
} from '../src/sim/titans';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

const RESOURCE_CAP = 1000; // mirrors the module-private cap clamped on titan energy
const POP = 400;

/** Deterministic lore stub (pure in its args — no rng, satisfies the TitanLore facade). */
const LORE: TitanLore = {
  name: (kind, i) => `${kind}-${i}`,
  epithet: (kind, key) => `${kind}:${key}`,
};

/** Headless SimContext with real geometries/morphotypes at a small tier (fake-ctx pattern). */
function makeCtx(seed: number): SimContext {
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
  test('builds exactly 10 titans with a ledger row each', () => {
    const ctx = makeCtx(1);
    const entities = new EntityManager(ctx);
    entities.reset(POP);
    const titans = new TitanSystem(ctx, entities, LORE, { perturb: () => undefined });
    expect(titans.count).toBe(10);
    expect(titans.ledger.length).toBe(10);
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
      expect(e.war).toBeLessThanOrEqual(9);
    }
  });

  test('the war matrix is symmetric with a zero diagonal and only {truce, alliance, war}', () => {
    const { war } = run(0xfeed, 1300);
    expect(war.length).toBe(100); // 10 × 10
    for (let i = 0; i < 10; i++) {
      expect(war[i * 10 + i]).toBe(0); // a titan is never at war with itself
      for (let j = 0; j < 10; j++) {
        const v = war[i * 10 + j]!;
        expect(v).toBeLessThanOrEqual(2); // 0 truce, 1 alliance, 2 war
        expect(war[j * 10 + i]).toBe(v); // symmetric
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
  group: { position: { x: number; z: number } };
  homeX: number;
  homeZ: number;
}

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
    const dt = 1 / 60;
    for (let f = 1; f <= 1200; f++) {
      ctx.state.frame = f;
      titans.update(dt, f * dt);
    }
    const arr = (titans as unknown as { titans: TitanRoamView[] }).titans;
    expect(arr.length).toBe(10);
    let nearHome = 0;
    let meanOriginR = 0;
    const xs: number[] = [];
    for (const t of arr) {
      const p = t.group.position;
      const dHome = Math.hypot(p.x - t.homeX, p.z - t.homeZ);
      const dOrigin = Math.hypot(p.x, p.z);
      meanOriginR += dOrigin;
      xs.push(p.x);
      // each titan should still be roaming the neighbourhood of its OWN home wedge, not the centre.
      if (dHome < 90) nearHome++;
      expect(Number.isFinite(p.x + p.z)).toBe(true);
    }
    meanOriginR /= arr.length;
    // NOT collapsed to the centre: homes sit on a ring at radius 130-220, so the mean distance from
    // the origin must stay well off zero (origin-seeking would crush this toward 0).
    expect(meanOriginR).toBeGreaterThan(90);
    // Most titans hover near their distributed homes (territorial roaming, not a central pile).
    expect(nearHome).toBeGreaterThanOrEqual(8);
    // The colossi remain SPREAD across the arena — the x-extent spans a wide band, not a point.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(180);
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
