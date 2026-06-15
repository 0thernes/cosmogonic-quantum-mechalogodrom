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
