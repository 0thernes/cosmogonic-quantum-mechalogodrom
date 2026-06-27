/**
 * Cosmological singularities (CONTRACTS V7.4). Falsifiable claims:
 * - summon/dispose toggle `active` + `kind`; construction draws no rng (boot-stream-neutral);
 * - a BLACK HOLE consumes organisms that cross its event horizon (population drops);
 * - a WHITE HOLE ejects an organism placed inside the horizon back outside it;
 * - a STRANGE STAR recolours an organism inside its conversion radius;
 * - ENTROPY raises the world heat (chaos);
 * - every kind keeps entity positions/velocities FINITE over a long run of the real frame loop;
 * - same seed + same summon/update sequence ⇒ bit-identical population (determinism).
 *
 * Headless: three's Scene/Mesh/Material need no DOM (the fake-ctx pattern).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { SINGULARITY_FIELD, SINGULARITY_KINDS, SingularitySystem } from '../src/sim/singularities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

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

const CENTER = new THREE.Vector3(0, 32, 0);

/**
 * Rebuild the shared spatial hash from the live population — mirrors the world.ts per-frame step
 * (clear + insert every entity) that runs BEFORE singularities.update. The O(k) force passes query
 * this hash, so a test that exercises consume/eject/convert must populate it first, exactly as the
 * real frame loop does (world.ts:923). Insert order = list order, so the query stays deterministic.
 */
function rebuildGrid(ctx: SimContext, entities: EntityManager): void {
  ctx.grid.clear();
  for (const e of entities.list) if (e) ctx.grid.insert(e);
}

describe('SingularitySystem', () => {
  test('SINGULARITY_KINDS is the five-effect cycle, all distinct', () => {
    expect(SINGULARITY_KINDS.length).toBe(5);
    expect(new Set(SINGULARITY_KINDS).size).toBe(5);
    expect([...SINGULARITY_KINDS]).toEqual([
      'entropy',
      'blackhole',
      'whitehole',
      'greyhole',
      'strangestar',
    ]);
  });

  test('construction draws no rng (boot-stream-neutral) and starts inactive', () => {
    // Two same-seed contexts: in one, draw immediately after building the EntityManager; in
    // the other, build the SingularitySystem in between. If the system constructor consumes
    // zero draws, the next rng value matches — proving boot-stream neutrality.
    const ctxA = makeCtx(42, 500);
    const entA = new EntityManager(ctxA);
    const x = ctxA.rng();

    const ctxB = makeCtx(42, 500);
    const entB = new EntityManager(ctxB);
    const sysB = new SingularitySystem(ctxB, entB);
    const y = ctxB.rng();

    expect(y).toBe(x);
    expect(sysB.active).toBe(false);
    expect(sysB.kind).toBeNull();
    // entA is the control that established the same rng position; touch it so it is not unused.
    expect(new SingularitySystem(ctxA, entA).active).toBe(false);
  });

  test('F-HOLES bodyForce: inactive→false; pulls into a black hole, pushes from a white hole; reach-gated', () => {
    const ctx = makeCtx(7, 500);
    const ent = new EntityManager(ctx);
    const sys = new SingularitySystem(ctx, ent);
    const out = new THREE.Vector3();

    // Inactive: no force, out zeroed.
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
    expect(out.lengthSq()).toBe(0);

    // Black hole pulls a body at +x back TOWARD the centre (−x delta), finite.
    sys.summon('blackhole', CENTER.clone());
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(true);
    expect(out.x).toBeLessThan(0);
    expect(Number.isFinite(out.x) && Number.isFinite(out.y) && Number.isFinite(out.z)).toBe(true);

    // White hole pushes the same body AWAY from the centre (+x delta).
    sys.summon('whitehole', CENTER.clone());
    sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out);
    expect(out.x).toBeGreaterThan(0);

    // Far outside the reach → no force.
    sys.summon('blackhole', CENTER.clone());
    expect(sys.bodyForce(CENTER.x + 1e6, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
    expect(out.lengthSq()).toBe(0);

    // Disposed → field gone again.
    sys.dispose();
    expect(sys.bodyForce(CENTER.x + 10, CENTER.y, CENTER.z, 0.016, out)).toBe(false);
  });

  test('F-NHI: an isNhi being is immune to black-hole consumption; a normal twin at the same spot is eaten', () => {
    const ctx = makeCtx(11, 500);
    const ent = new EntityManager(ctx);
    ent.reset(60);
    // Park two organisms ON the singularity (inside the horizon): one NHI, one normal control.
    const nhi = ent.list[0]!;
    const control = ent.list[1]!;
    nhi.userData.isNhi = true;
    // Inside the horizon but OFF dead-centre (the field skips r≈0), so the hole actually acts.
    nhi.position.set(CENTER.x + 5, CENTER.y, CENTER.z);
    control.position.set(CENTER.x + 7, CENTER.y, CENTER.z);
    const sys = new SingularitySystem(ctx, ent);
    sys.summon('blackhole', CENTER.clone());
    for (let f = 0; f < 40; f++) {
      ctx.state.frame = f;
      rebuildGrid(ctx, ent); // the O(k) hole reads the shared hash (world.ts populates it per frame)
      sys.update(0.016, f * 0.016);
    }
    expect(ent.list.includes(nhi)).toBe(true); // immune — ejected, never consumed
    expect(ent.list.includes(control)).toBe(false); // normal twin was consumed
    expect(sys.consumed).toBeGreaterThan(0);
  });

  test('summon activates the chosen kind; dispose clears it', () => {
    const ctx = makeCtx(3, 500);
    const sys = new SingularitySystem(ctx, new EntityManager(ctx));
    sys.summon('blackhole', CENTER);
    expect(sys.active).toBe(true);
    expect(sys.kind).toBe('blackhole');
    sys.dispose();
    expect(sys.active).toBe(false);
    expect(sys.kind).toBeNull();
  });

  test('a black hole consumes organisms crossing the event horizon', () => {
    const ctx = makeCtx(4, 500);
    const entities = new EntityManager(ctx);
    entities.reset(200);
    const sys = new SingularitySystem(ctx, entities);
    // Place a cluster just off the exact centre (the r²<1e-6 guard skips dead-centre) but well
    // inside the horizon, so they must be consumed.
    for (let i = 0; i < 30; i++) {
      const e = entities.list[i];
      if (e) e.position.set(CENTER.x + 1 + i * 0.05, CENTER.y, CENTER.z);
    }
    const before = entities.list.length;
    sys.summon('blackhole', CENTER);
    for (let f = 0; f < 5; f++) {
      rebuildGrid(ctx, entities); // refresh the hash each frame so consumed bodies leave it
      sys.update(1 / 60, f / 60);
    }
    expect(entities.list.length).toBeLessThan(before);
    expect(sys.consumed).toBeGreaterThan(0);
  });

  test('a white hole ejects an organism placed inside the horizon back outside it', () => {
    const ctx = makeCtx(5, 500);
    const entities = new EntityManager(ctx);
    entities.reset(50);
    const sys = new SingularitySystem(ctx, entities);
    const e = entities.list[0];
    expect(e).toBeDefined();
    e!.position.set(CENTER.x + 2, CENTER.y, CENTER.z); // 2 units from centre — inside the horizon
    const dBefore = e!.position.distanceTo(CENTER);
    sys.summon('whitehole', CENTER);
    rebuildGrid(ctx, entities);
    sys.update(1 / 60, 0);
    const dAfter = e!.position.distanceTo(CENTER);
    expect(dAfter).toBeGreaterThan(dBefore + 10); // thrown out well past where it was
  });

  test('a strange star recolours an organism inside its conversion radius', () => {
    const ctx = makeCtx(6, 500);
    const entities = new EntityManager(ctx);
    entities.reset(50);
    const sys = new SingularitySystem(ctx, entities);
    const e = entities.list[0];
    expect(e).toBeDefined();
    e!.position.set(CENTER.x + 3, CENTER.y, CENTER.z);
    const before = e!.material.color.clone();
    sys.summon('strangestar', CENTER);
    rebuildGrid(ctx, entities);
    sys.update(1 / 60, 0);
    // The strange-matter stain is a fixed quark-green; the colour must have changed.
    expect(e!.material.color.equals(before)).toBe(false);
    expect(e!.material.color.r).toBeCloseTo(0.18, 5);
    expect(e!.material.color.g).toBeCloseTo(0.34, 5);
  });

  test('entropy raises the world heat (chaos)', () => {
    const ctx = makeCtx(7, 500);
    const entities = new EntityManager(ctx);
    entities.reset(100);
    const sys = new SingularitySystem(ctx, entities);
    ctx.state.chaos = 1;
    sys.summon('entropy', CENTER);
    for (let f = 0; f < 30; f++) sys.update(1 / 60, f / 60);
    expect(ctx.state.chaos).toBeGreaterThan(1);
    expect(ctx.state.chaos).toBeLessThanOrEqual(10);
  });

  test('every kind keeps positions/velocities finite over the real frame loop', () => {
    for (const kind of SINGULARITY_KINDS) {
      const ctx = makeCtx(8, 600);
      const entities = new EntityManager(ctx);
      entities.reset(200);
      const sys = new SingularitySystem(ctx, entities);
      sys.summon(kind, CENTER);
      const state = ctx.state;
      for (let f = 0; f < 240; f++) {
        state.frame++;
        state.elapsed += 1 / 60;
        if (state.frame % 2 === 0) {
          ctx.grid.clear();
          for (const e of entities.list) if (e) ctx.grid.insert(e);
        }
        sys.update(1 / 60, state.elapsed);
        entities.update(1 / 60, state.elapsed);
      }
      for (const e of entities.list) {
        if (!e) continue;
        expect(Number.isFinite(e.position.x)).toBe(true);
        expect(Number.isFinite(e.position.y)).toBe(true);
        expect(Number.isFinite(e.position.z)).toBe(true);
        expect(Number.isFinite(e.userData.vel.x)).toBe(true);
        expect(Number.isFinite(e.userData.vel.lengthSq())).toBe(true);
      }
    }
  });

  test('same seed + same sequence ⇒ identical population (determinism)', () => {
    const run = (): number[] => {
      const ctx = makeCtx(99, 400);
      const entities = new EntityManager(ctx);
      entities.reset(150);
      const sys = new SingularitySystem(ctx, entities);
      const state = ctx.state;
      sys.summon('blackhole', CENTER);
      for (let f = 0; f < 120; f++) {
        state.frame++;
        state.elapsed += 1 / 60;
        rebuildGrid(ctx, entities); // the O(k) hole + behaviors both read the shared hash
        sys.update(1 / 60, state.elapsed);
        entities.update(1 / 60, state.elapsed);
      }
      const out: number[] = [entities.list.length];
      for (let i = 0; i < Math.min(20, entities.list.length); i++) {
        const e = entities.list[i];
        if (e) out.push(e.position.x, e.position.y, e.position.z);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  test('O(k) reach query visits EVERY in-REACH entity exactly once (and only those) at N ≥ 25k, with exact un-strided r⁻²', () => {
    const N = 25000;
    const { REACH, REACH2, HORIZON, WARP_R_MULT, G, ACCEL_MAX } = SINGULARITY_FIELD;
    const ctx = makeCtx(2026, N + 64);
    const entities = new EntityManager(ctx);
    entities.reset(N);
    expect(entities.list.length).toBe(N);
    const sys = new SingularitySystem(ctx, entities);
    const list = entities.list;

    // Two PROBES at clean radii — outside the warp shell (r > WARP_R_MULT·HORIZON ⇒ no time
    // dilation) and inside REACH, with G/r² < ACCEL_MAX (uncapped). Each must receive a PURE r⁻²
    // kick of magnitude exactly G·dt/r²; a second (double) visit would double it, so this falsifies
    // any accidental re-application — and proves the ultra-tier half-rate stride is truly gone.
    const rA = WARP_R_MULT * HORIZON + 20; // 110: clean, uncapped, inside REACH
    const rB = 200; // a second clean radius
    expect(G / (rA * rA)).toBeLessThan(ACCEL_MAX); // not clamped → tests the TRUE r⁻², not the cap
    expect(G / (rB * rB)).toBeLessThan(ACCEL_MAX);
    expect(rB).toBeLessThan(REACH);
    const probeA = list[0]!;
    const probeB = list[1]!;
    probeA.position.set(CENTER.x + rA, CENTER.y, CENTER.z);
    probeB.position.set(CENTER.x + rB, CENTER.y, CENTER.z);

    // Populate the shared hash from the live population (the world.ts per-frame step the O(k) pass
    // relies on), then prove the HASH-LEVEL property directly: the REACH query buffer (a superset of
    // the 3D sphere) holds each entity at most once, and every truly in-REACH body is present.
    rebuildGrid(ctx, entities);
    const buf = [...ctx.grid.query(CENTER.x, CENTER.z, REACH)]; // copy: query returns a shared buffer
    expect(new Set(buf).size).toBe(buf.length); // SpatialHash invariant: one cell per entity ⇒ no dup
    const bufSet = new Set(buf);

    // Snapshot every velocity + position and classify each body by TRUE 3D distance to the centre.
    const bvx = new Float64Array(N);
    const bvy = new Float64Array(N);
    const bvz = new Float64Array(N);
    const bpx = new Float64Array(N);
    const bpy = new Float64Array(N);
    const bpz = new Float64Array(N);
    const inReachMask = new Uint8Array(N);
    let inReach = 0;
    let outReach = 0;
    let coverageOk = true;
    for (let i = 0; i < N; i++) {
      const e = list[i]!;
      const dx = CENTER.x - e.position.x;
      const dy = CENTER.y - e.position.y;
      const dz = CENTER.z - e.position.z;
      const isIn = dx * dx + dy * dy + dz * dz <= REACH2;
      inReachMask[i] = isIn ? 1 : 0;
      if (isIn) {
        inReach++;
        if (!bufSet.has(e)) coverageOk = false; // an in-REACH body the query MISSED → fail
      } else {
        outReach++;
      }
      const v = e.userData.vel;
      bvx[i] = v.x;
      bvy[i] = v.y;
      bvz[i] = v.z;
      bpx[i] = e.position.x;
      bpy[i] = e.position.y;
      bpz[i] = e.position.z;
    }
    expect(coverageOk).toBe(true); // every in-REACH entity is in the query buffer (complete coverage)
    expect(inReach).toBeGreaterThan(5000); // the heavy regime is genuinely exercised at N ≥ 25k
    expect(outReach).toBeGreaterThan(0); // …and the query EXCLUDES distant bodies — the O(k) property

    const aBefore = probeA.userData.vel.clone();
    const bBefore = probeB.userData.vel.clone();

    // White hole: non-destructive (no consumption), so list indices are stable and the force-level
    // coverage is a clean 1:1 with the in-REACH set. One exact-physics frame.
    sys.summon('whitehole', CENTER);
    sys.update(1 / 60, 0);

    // FORCE-LEVEL coverage: a body's state changed ⟺ it was in REACH. Out-of-REACH bodies are
    // byte-untouched (the query never visited them); in-REACH bodies all moved (the force is non-zero
    // everywhere r² ≥ 100 > 1e-6, which holds since the centre's y-offset keeps every body ≥ 10 away).
    let forceOk = true;
    for (let i = 0; i < N; i++) {
      const e = list[i]!;
      const v = e.userData.vel;
      const changed =
        v.x !== bvx[i] ||
        v.y !== bvy[i] ||
        v.z !== bvz[i] ||
        e.position.x !== bpx[i] ||
        e.position.y !== bpy[i] ||
        e.position.z !== bpz[i];
      if (changed !== (inReachMask[i] === 1)) forceOk = false;
    }
    expect(forceOk).toBe(true);

    // EXACT, un-strided r⁻²: |Δv| = G·dt/r² for each clean probe. Double-application ⇒ 2× ⇒ fails.
    const dt = 1 / 60;
    const dA = probeA.userData.vel.clone().sub(aBefore).length();
    const dB = probeB.userData.vel.clone().sub(bBefore).length();
    expect(dA).toBeCloseTo((G * dt) / (rA * rA), 6);
    expect(dB).toBeCloseTo((G * dt) / (rB * rB), 6);
  }, 60000);
});
