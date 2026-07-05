/**
 * PORTAL DEATH — BIG FAUNA (V126, USER "everything else DIES … only Super Creatures and Pantheons bounce
 * off it"). The four persistent rosters that live OUTSIDE the organism swarm — shoggoths, puppeteers,
 * titans, leviathans — die when they enter the portal's vertical kill-cylinder and re-enter the world
 * ELSEWHERE 5 s later. Falsifiable:
 * - a roster member inside the cylinder is hidden (a burst fires); a hidden one is NOT re-culled;
 * - after ~5 s it re-enters (and a re-cull confirms it came back visible);
 * - inactive / frozen-dt ⇒ the companion culls nothing;
 * - the respawn spot is deterministic, far from the portal column, inside the platform, and keeps y.
 *
 * Headless fake-ctx mirrors tests/portal-death.test.ts (three Scene/Mesh need no DOM until render).
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
import {
  PortalDeathFauna,
  portalReappearSpot,
  PORTAL_RESPAWN_DELAY,
  type PortalCullable,
} from '../src/sim/portal-death-fauna';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const DT = 1 / 60;
/** Portal void-throat column xz (matches portal-death-fauna.ts): (0, -101.25). */
const PORTAL_Z = -40 * 2.5 - 0.5 * 2.5;

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

describe('portalReappearSpot', () => {
  test('deterministic, +z away from the portal, inside the platform, preserving y', () => {
    const a = new THREE.Vector3(7, 42, 7);
    const b = new THREE.Vector3(7, 42, 7);
    portalReappearSpot(3, a);
    portalReappearSpot(3, b);
    expect(a.equals(b)).toBe(true); // deterministic — no rng
    expect(a.y).toBe(42); // height band preserved
    expect(a.z).toBeGreaterThan(0); // +z side, opposite the portal at z≈-101
    expect(Math.hypot(a.x, a.z)).toBeLessThan(540); // inside the ±540 platform
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
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0); // at least one leviathan died
    expect(r.afterHidden).toBe(r.first); // hidden members are not re-culled
    expect(r.afterRespawn).toBeGreaterThan(r.first); // they re-entered (and got re-culled)
  });

  test('shoggoths', () => {
    const ctx = makeCtx(12, 8);
    const sys = new ShoggothSystem(ctx, new EntityManager(ctx));
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
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0);
    expect(r.afterHidden).toBe(r.first);
    expect(r.afterRespawn).toBeGreaterThan(r.first);
  });

  test('puppeteers', () => {
    const ctx = makeCtx(14, 8);
    const sys = new PuppetMasterSystem(ctx, new EntityManager(ctx), () => undefined);
    const r = driveDeathCycle(sys);
    expect(r.first).toBeGreaterThan(0);
    expect(r.afterHidden).toBe(r.first);
    expect(r.afterRespawn).toBeGreaterThan(r.first);
  });
});
