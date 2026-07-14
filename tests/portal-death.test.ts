/**
 * PORTAL DEATH ZONE (V126, USER). The ascension Portal (the MonolithTemple void throat) kills any
 * population organism that touches it; the organism respawns ELSEWHERE 5 seconds later. Falsifiable:
 * - an organism inside the void sphere is disposed; one far away is untouched;
 * - the death is queued and re-enters the world after ~5 s (and not inside the portal);
 * - disarmed (temple not revealed) the portal kills nothing;
 * - determinism: two identical runs kill + respawn bit-identically (no rng in the VFX, seeded respawn).
 *
 * Headless fake-ctx (mirrors tests/entities-death.test.ts). Also covers big-fauna portal death:
 * three's Scene/Mesh need no DOM until render.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import { ShoggothSystem } from '../src/sim/shoggoths';
import { PuppetMasterSystem } from '../src/sim/puppet-masters';
import { TitanSystem } from '../src/sim/titans';
import { LeviathanSystem } from '../src/sim/leviathans';
import { PLATFORM_HALF } from '../src/sim/constants';
import {
  PortalDeathFauna,
  portalReappearSpot,
  PORTAL_RESPAWN_DELAY,
  type PortalCullable,
} from '../src/sim/portal-death-fauna';
import { PortalDeath } from '../src/sim/portal-death';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const ARENA_MID = 2.5;
/** Void-throat world centre (matches portal-death.ts): (0, 60, -101.25). */
const PORTAL = new THREE.Vector3(0, 24 * ARENA_MID, -40 * ARENA_MID - 0.5 * ARENA_MID);
const KILL_R = 9 * ARENA_MID;
const DT = 1 / 60;
/** Portal void-throat column xz (matches portal-death-fauna.ts): (0, -101.25). */
const PORTAL_Z = -40 * ARENA_MID - 0.5 * ARENA_MID;

function makeState(): SimState {
  return {
    chaos: 0.5,
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
  };
}

describe('PortalDeath', () => {
  test('an organism inside the void sphere is killed; one far away is untouched', () => {
    const ctx = makeCtx(1, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0); // dead-centre of the portal
    const safe = entities.spawn(new THREE.Vector3(300, 3, 300), 1); // far corner
    expect(safe).not.toBeNull();
    expect(entities.list.length).toBe(2);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(entities.list[0]).toBe(safe as Entity); // the far one survived
    expect(pd.kills).toBe(1);
    expect(pd.stats().pending).toBe(1); // queued to respawn
    pd.dispose();
  });

  test('a rim-adjacent organism just OUTSIDE the sphere survives', () => {
    const ctx = makeCtx(9, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    // Just beyond the kill radius on +x from the portal centre.
    entities.spawn(new THREE.Vector3(PORTAL.x + KILL_R + 2, PORTAL.y, PORTAL.z), 0);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('the dead organism re-enters the world after ~5 s, elsewhere', () => {
    const ctx = makeCtx(2, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 10, DT); // kill at t=10
    expect(entities.list.length).toBe(0);
    expect(pd.stats().pending).toBe(1);
    pd.update(entities, 14.5, DT); // still before the 5-second delay
    expect(entities.list.length).toBe(0);
    pd.update(entities, 15.02, DT); // 10 + 5 elapsed → respawns
    expect(entities.list.length).toBe(1);
    expect(pd.stats().pending).toBe(0);
    const p = entities.list[0]!.position;
    expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
    pd.dispose();
  });

  test('disarmed (temple not revealed) the portal kills nothing', () => {
    const ctx = makeCtx(3, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(false); // temple not revealed
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 1, DT);
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('frozen dt (pause) kills nothing even when armed', () => {
    const ctx = makeCtx(4, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    entities.spawn(PORTAL.clone(), 0);
    pd.update(entities, 1, 0); // paused
    expect(entities.list.length).toBe(1);
    expect(pd.kills).toBe(0);
    pd.dispose();
  });

  test('a sanctuary-protected organism is neither killed nor queued for a delayed respawn', () => {
    const ctx = makeCtx(41, 50);
    const entities = new EntityManager(ctx);
    const pd = new PortalDeath(ctx);
    pd.setActive(true);
    const protectedEntity = entities.spawn(PORTAL.clone(), 0);
    let deathCallbacks = 0;
    let protectionChecks = 0;
    const isProtected = (x: number, z: number): boolean => {
      protectionChecks++;
      return x === PORTAL.x && z === PORTAL.z;
    };

    pd.update(entities, 1, DT, () => deathCallbacks++, isProtected);
    pd.update(entities, 7, DT, () => deathCallbacks++, isProtected);

    expect(protectionChecks).toBeGreaterThan(0);
    expect(entities.list).toEqual([protectedEntity as Entity]);
    expect(deathCallbacks).toBe(0);
    expect(pd.kills).toBe(0);
    expect(pd.stats().pending).toBe(0);
    pd.dispose();
  });

  test('deterministic: two identical runs kill + respawn identically', () => {
    const run = (): { kills: number; count: number; xs: number[] } => {
      const ctx = makeCtx(7, 64);
      const entities = new EntityManager(ctx);
      const pd = new PortalDeath(ctx);
      pd.setActive(true);
      for (let i = 0; i < 8; i++) entities.spawn(PORTAL.clone(), i % 5); // 8 organisms in the sphere
      let t = 0;
      for (let f = 0; f < 420; f++) {
        t += DT;
        pd.update(entities, t, DT); // ~7 s — deaths at t≈0, respawns fire at t≈5
      }
      const xs: number[] = [];
      for (const e of entities.list) xs.push(+e.position.x.toFixed(4), +e.position.z.toFixed(4));
      pd.dispose();
      return { kills: pd.kills, count: entities.list.length, xs };
    };
    expect(run()).toEqual(run());
  });
});

/**
 * Drive a roster through a full death→hide→respawn cycle using a HUGE cull cylinder centred at the origin,
 * so every visible member is guaranteed inside it regardless of its (private) position. Returns the
 * cumulative onDeath counts at three checkpoints.
 */
function driveDeathCycle(sys: PortalCullable): {
  first: number;
  afterHidden: number;
  afterRespawn: number;
} {
  let deaths = 0;
  const onDeath = (): void => {
    deaths += 1;
  };
  const HUGE = 1e12;
  sys.portalCull(0, 0, HUGE, 1, onDeath); // every member is in the cylinder → all die
  const first = deaths;
  sys.portalCull(0, 0, HUGE, 1.5, onDeath); // still hidden (t < respawn) → not re-culled
  const afterHidden = deaths;
  sys.portalCull(0, 0, HUGE, 1 + PORTAL_RESPAWN_DELAY + 1, onDeath); // > 5 s → reappear THEN re-cull
  return { first, afterHidden, afterRespawn: deaths };
}

/** A protected endpoint remains visible/alive even when the geometric portal cylinder covers it. */
function driveProtectedCull(sys: PortalCullable): number {
  let deaths = 0;
  sys.portalCull(
    0,
    0,
    1e12,
    1,
    () => deaths++,
    () => true,
  );
  return deaths;
}

describe('portalReappearSpot', () => {
  test('deterministic, +z away from the portal, inside the platform, preserving y', () => {
    const a = new THREE.Vector3(7, 42, 7);
    const b = new THREE.Vector3(7, 42, 7);
    portalReappearSpot(3, a);
    portalReappearSpot(3, b);
    expect(a.equals(b)).toBe(true); // deterministic — no rng
    expect(a.y).toBe(42); // height band preserved
    expect(a.z).toBeGreaterThan(0); // +z side, opposite the portal at z≈-101
    expect(Math.abs(a.x)).toBeLessThan(PLATFORM_HALF);
    expect(Math.abs(a.z)).toBeLessThan(PLATFORM_HALF);
    expect(Math.hypot(a.x - 0, a.z - PORTAL_Z)).toBeGreaterThan(150); // far from the portal column
  });
});

describe('PortalDeathFauna companion', () => {
  test('inactive → no cull; frozen dt → no cull; active → culls and counts kills', () => {
    const ctx = makeCtx(1, 8);
    const fauna = new PortalDeathFauna(ctx);
    let culled = 0;
    const roster: PortalCullable = {
      portalCull: (_ax, _az, _r2, _t, onDeath): void => {
        culled += 1;
        onDeath(0, 60, PORTAL_Z);
        onDeath(1, 60, PORTAL_Z);
      },
    };
    fauna.update(false, 1, DT, [roster]); // disarmed (temple not revealed)
    expect(culled).toBe(0);
    fauna.update(true, 1, 0, [roster]); // frozen dt (pause)
    expect(culled).toBe(0);
    fauna.update(true, 1, DT, [roster]); // armed + advancing
    expect(culled).toBe(1);
    expect(fauna.kills).toBe(2);
    expect(fauna.stats().kills).toBe(2);
    fauna.dispose();
  });

  test('a burst fires on death and fades out over time without error', () => {
    const ctx = makeCtx(2, 8);
    const fauna = new PortalDeathFauna(ctx);
    const roster: PortalCullable = {
      portalCull: (_ax, _az, _r2, _t, onDeath): void => onDeath(0, 60, PORTAL_Z),
    };
    fauna.update(true, 1, DT, [roster]); // one death → a burst is emitted
    expect(fauna.kills).toBe(1);
    for (let f = 0; f < 130; f++) fauna.update(true, 2 + f * DT, DT, []); // advance: burst fades to nothing
    expect(fauna.kills).toBe(1); // no new deaths (no rosters)
    fauna.dispose();
  });

  test('forwards the sanctuary endpoint gate to every roster', () => {
    const ctx = makeCtx(3, 8);
    const fauna = new PortalDeathFauna(ctx);
    let sawProtection = false;
    const roster: PortalCullable = {
      portalCull: (_ax, _az, _r2, _t, onDeath, protectedAt): void => {
        sawProtection = protectedAt?.(0, PORTAL_Z) === true;
        if (!sawProtection) onDeath(0, 60, PORTAL_Z);
      },
    };
    fauna.update(true, 1, DT, [roster], () => true);
    expect(sawProtection).toBe(true);
    expect(fauna.kills).toBe(0);
    fauna.dispose();
  });

  test('deterministic: two identical companion runs count kills identically', () => {
    const run = (): number => {
      const ctx = makeCtx(5, 8);
      const fauna = new PortalDeathFauna(ctx);
      const roster: PortalCullable = {
        portalCull: (_ax, _az, _r2, t, onDeath): void => {
          if (t < 1.2) onDeath(0, 60, PORTAL_Z);
        },
      };
      let t = 0;
      for (let f = 0; f < 90; f++) {
        t += DT;
        fauna.update(true, t, DT, [roster]);
      }
      const k = fauna.kills;
      fauna.dispose();
      return k;
    };
    expect(run()).toBe(run());
  });
});

describe('every big-fauna roster DIES at the portal and re-enters 5 s later', () => {
  test('leviathans', () => {
    const sys = new LeviathanSystem(makeCtx(11, 8));
    expect(driveProtectedCull(sys)).toBe(0);
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0); // at least one leviathan died
    expect(r.afterHidden).toBe(r.first); // hidden members are not re-culled
    expect(r.afterRespawn).toBeGreaterThan(r.first); // they re-entered (and got re-culled)
  });

  test('shoggoths', () => {
    const ctx = makeCtx(12, 8);
    const sys = new ShoggothSystem(ctx, new EntityManager(ctx));
    expect(driveProtectedCull(sys)).toBe(0);
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0);
    expect(r.afterHidden).toBe(r.first);
    expect(r.afterRespawn).toBeGreaterThan(r.first);
  });

  test('titans', () => {
    const ctx = makeCtx(13, 8);
    const sys = new TitanSystem(ctx, new EntityManager(ctx), new LoreEngine(13), {
      perturb: () => undefined,
    });
    expect(driveProtectedCull(sys)).toBe(0);
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0);
    expect(r.afterHidden).toBe(r.first);
    expect(r.afterRespawn).toBeGreaterThan(r.first);
  });

  test('puppeteers', () => {
    const ctx = makeCtx(14, 8);
    const sys = new PuppetMasterSystem(ctx, new EntityManager(ctx), () => undefined);
    expect(driveProtectedCull(sys)).toBe(0);
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0);
    expect(r.afterHidden).toBe(r.first);
    expect(r.afterRespawn).toBeGreaterThan(r.first);
  });
});
