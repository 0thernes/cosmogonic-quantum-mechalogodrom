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
 *
 * Also covers tier-independent fidelity (owner directive #7).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, ULTRA_GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { SINGULARITY_FIELD, SINGULARITY_KINDS, SingularitySystem } from '../src/sim/singularities';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, QualityTier, SimContext, SimState } from '../src/types';

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
    // Mirror world.ts:436 — the production grid cell size is tier-dependent, so coverage/exact-
    // physics tests run at the SHIPPED resolution (10 above the 5,000 ultra threshold, else 16).
    grid: new SpatialHash<Entity>(maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL),
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

/**
 * Deterministically re-scatter the population into a dense, uniform-in-ball cloud of radius `rMax`
 * centred on `c` (skipping the first `skip` entities, e.g. hand-placed probes). The O(k) query
 * stress tests below need a genuinely HEAVY in-REACH / in-CONV_R population near the summon point;
 * the live sim now spreads entities across the full expanded platform and vertical column (owner
 * directive — creatures must use the whole square + height, never huddle a central disc), so the raw
 * `reset(N)` spawn is deliberately too diffuse for any single point to hold thousands. Restoring the
 * density here keeps the test measuring the QUERY (exact-once coverage, un-doubled r⁻², out-of-reach
 * untouched) rather than the spawn distribution — uniform-in-ball via a low-discrepancy sequence (no
 * rng, fully deterministic): r = rMax·∛u spreads points evenly by volume, cosθ = 2v−1 evenly over the
 * sphere, golden-angle azimuth. With rMax straddling REACH, both the in-set and the out-set are large.
 */
function packBall(
  list: readonly (Entity | undefined)[],
  c: THREE.Vector3,
  rMax: number,
  skip = 0,
): void {
  const G1 = 0.7548776662466927; // plastic-number R2 low-discrepancy constants (radius, cosθ)
  const G2 = 0.5698402909980532;
  const GA = 2.399963229728653; // golden angle (radians) for the azimuth
  for (let i = skip; i < list.length; i++) {
    const e = list[i];
    if (!e) continue;
    const k = i + 1;
    const r = rMax * Math.cbrt((0.5 + G1 * k) % 1);
    const ct = 2 * ((0.5 + G2 * k) % 1) - 1; // cosθ ∈ [−1, 1]
    const st = Math.sqrt(Math.max(0, 1 - ct * ct));
    const az = (i * GA) % (Math.PI * 2);
    e.position.set(c.x + r * st * Math.cos(az), c.y + r * st * Math.sin(az), c.z + r * ct);
  }
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

  test('sanctuary suppression clears a previously populated body-force output and is reversible', () => {
    const ctx = makeCtx(71, 500);
    const ent = new EntityManager(ctx);
    const sys = new SingularitySystem(ctx, ent);
    const out = new THREE.Vector3(9, 8, 7);
    const px = CENTER.x + 10;
    const pz = CENTER.z;
    sys.summon('blackhole', CENTER.clone());
    sys.attachSanctuary((x, z) => x === px && z === pz);

    expect(sys.bodyForce(px, CENTER.y, pz, 0.016, out)).toBe(false);
    expect(out.lengthSq()).toBe(0); // no stale pull survives the protected transition

    sys.attachSanctuary(null);
    expect(sys.bodyForce(px, CENTER.y, pz, 0.016, out)).toBe(true);
    expect(out.x).toBeLessThan(0);
    sys.dispose();
  });

  test('a sanctuary-protected horizon crosser is neither pulled nor consumed across repeated frames', () => {
    const ctx = makeCtx(72, 500);
    const ent = new EntityManager(ctx);
    const protectedEntity = ent.spawn(new THREE.Vector3(CENTER.x + 5, CENTER.y, CENTER.z), 0)!;
    const exposedEntity = ent.spawn(new THREE.Vector3(CENTER.x - 5, CENTER.y, CENTER.z), 1)!;
    const protectedVelocity = protectedEntity.userData.vel.clone();
    const protectedColor = protectedEntity.material.color.clone();
    const sys = new SingularitySystem(ctx, ent);
    sys.attachSanctuary((x) => x > CENTER.x);
    sys.summon('blackhole', CENTER.clone());

    for (let frame = 0; frame < 2; frame++) {
      rebuildGrid(ctx, ent);
      sys.update(1 / 60, frame / 60);
    }

    expect(ent.list).toContain(protectedEntity);
    expect(ent.list).not.toContain(exposedEntity);
    expect(protectedEntity.userData.vel.equals(protectedVelocity)).toBe(true);
    expect(protectedEntity.material.color.equals(protectedColor)).toBe(true);
    expect(sys.consumed).toBe(1);
    sys.dispose();
  });

  test('a sanctuary-protected body is not converted by a strange star', () => {
    const ctx = makeCtx(73, 500);
    const ent = new EntityManager(ctx);
    const protectedEntity = ent.spawn(new THREE.Vector3(CENTER.x + 10, CENTER.y, CENTER.z), 0)!;
    const exposedEntity = ent.spawn(new THREE.Vector3(CENTER.x - 10, CENTER.y, CENTER.z), 1)!;
    const protectedColor = protectedEntity.material.color.clone();
    const protectedEmissive = protectedEntity.material.emissive.clone();
    const protectedIntensity = protectedEntity.material.emissiveIntensity;
    const sys = new SingularitySystem(ctx, ent);
    sys.attachSanctuary((x) => x > CENTER.x);
    sys.summon('strangestar', CENTER.clone());
    rebuildGrid(ctx, ent);

    sys.update(1 / 60, 0);

    expect(protectedEntity.material.color.equals(protectedColor)).toBe(true);
    expect(protectedEntity.material.emissive.equals(protectedEmissive)).toBe(true);
    expect(protectedEntity.material.emissiveIntensity).toBe(protectedIntensity);
    expect(exposedEntity.material.color.r).toBeCloseTo(0.18, 6);
    expect(exposedEntity.material.color.g).toBeCloseTo(0.34, 6);
    expect(exposedEntity.material.color.b).toBeCloseTo(0.12, 6);
    expect(exposedEntity.material.emissiveIntensity).toBeGreaterThanOrEqual(2.4);
    sys.dispose();
  });

  test('entropy preserves a protected body while still affecting an exposed stride peer', () => {
    const ctx = makeCtx(74, 500);
    const ent = new EntityManager(ctx);
    ent.reset(4);
    const protectedEntity = ent.list[0]!;
    const exposedEntity = ent.list[2]!; // entropy deliberately visits even indices only
    protectedEntity.position.set(CENTER.x + 10, CENTER.y, CENTER.z);
    exposedEntity.position.set(CENTER.x - 10, CENTER.y, CENTER.z);
    const protectedVelocity = protectedEntity.userData.vel.clone();
    const protectedColor = protectedEntity.material.color.clone();
    const exposedVelocity = exposedEntity.userData.vel.clone();
    const sys = new SingularitySystem(ctx, ent);
    sys.attachSanctuary((x) => x > CENTER.x);
    sys.summon('entropy', CENTER.clone());

    sys.update(1 / 60, 0);

    expect(protectedEntity.userData.vel.equals(protectedVelocity)).toBe(true);
    expect(protectedEntity.material.color.equals(protectedColor)).toBe(true);
    expect(exposedEntity.userData.vel.equals(exposedVelocity)).toBe(false);
    sys.dispose();
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
    // Restore a heavy density around the summon point (rMax = 320 straddles REACH = 237.5, so a large
    // in-REACH set AND a large out set); the live spawn is now platform-wide. Skip the two probes.
    packBall(entities.list, CENTER, 320, 2);
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

  test('greyhole: absorb half-cycle CONSUMES at the quarter cap (MAX_CONSUME>>2); emit half EJECTS without consuming', () => {
    const { HORIZON, MAX_CONSUME } = SINGULARITY_FIELD;
    const cap = MAX_CONSUME >> 2; // 6 — a quarter of a black hole's rate

    // ABSORB phase: Math.sin(t·1.3) ≥ 0 at t=0. Park > cap bodies inside the horizon; one frame must
    // eat EXACTLY the quarter cap — falsifying both the audited "greyhole never retains" bug
    // (consumed===0) and an over-consume (consumed>cap).
    const ctxA = makeCtx(31, 500);
    const entA = new EntityManager(ctxA);
    entA.reset(80);
    for (let i = 0; i < cap + 6; i++) {
      entA.list[i]!.position.set(CENTER.x + 4 + i * 0.4, CENTER.y, CENTER.z); // r ∈ [4, ~8.4] < HORIZON
    }
    const sysA = new SingularitySystem(ctxA, entA);
    sysA.summon('greyhole', CENTER);
    rebuildGrid(ctxA, entA);
    sysA.update(1 / 60, 0); // t=0 ⇒ Math.sin(0) = 0 ≥ 0 ⇒ the absorb half-cycle (cap = MAX_CONSUME>>2)
    expect(sysA.consumed).toBe(cap); // > 0 (not the audited bug) AND ≤ cap (no over-consume)

    // EMIT phase: a t with Math.sin(t·1.3) < 0. A body inside the horizon is EJECTED, none consumed.
    const ctxE = makeCtx(32, 500);
    const entE = new EntityManager(ctxE);
    entE.reset(50);
    const body = entE.list[0]!;
    body.position.set(CENTER.x + 3, CENTER.y, CENTER.z); // inside the horizon
    const dBefore = body.position.distanceTo(CENTER);
    const sysE = new SingularitySystem(ctxE, entE);
    sysE.summon('greyhole', CENTER);
    rebuildGrid(ctxE, entE);
    const tEmit = 3; // sin(3·1.3)=sin(3.9) ≈ −0.69 < 0 ⇒ emit
    expect(Math.sin(tEmit * 1.3)).toBeLessThan(0);
    sysE.update(1 / 60, tEmit);
    const dAfter = body.position.distanceTo(CENTER);
    expect(dAfter).toBeGreaterThan(HORIZON); // ejected past the event horizon (to HORIZON·1.05)
    expect(dAfter).toBeGreaterThan(dBefore + 10); // and well outward from where it started
    expect(sysE.consumed).toBe(0); // the emit half NEVER eats
    expect(entE.list.includes(body)).toBe(true); // ejected, not consumed
  });

  test('black hole: > MAX_CONSUME horizon-crossers ⇒ consumed === MAX_CONSUME in ONE frame, the eaten SUBSET = first-MAX_CONSUME in grid order, and it is deterministic', () => {
    const { HORIZON, MAX_CONSUME, REACH } = SINGULARITY_FIELD;
    const PLACED = 40; // > MAX_CONSUME (25)
    const H2 = HORIZON * HORIZON;

    // Deterministic scenario: PLACED normal bodies parked strictly inside the horizon on a golden-angle
    // spiral (distinct cells, off dead-centre); the rest shoved far outside REACH so they never force
    // or consume. No rng touches these positions, so the grid order — and thus the eaten subset — is a
    // pure function of the seed.
    const runScenario = (seed: number) => {
      const ctx = makeCtx(seed, 600);
      const ent = new EntityManager(ctx);
      ent.reset(120);
      for (let i = 0; i < PLACED; i++) {
        const ang = i * 2.399963; // golden angle
        const rad = 3 + (i % 7) * 1.5; // r ∈ [3, 12] < HORIZON
        ent.list[i]!.position.set(
          CENTER.x + Math.cos(ang) * rad,
          CENTER.y,
          CENTER.z + Math.sin(ang) * rad,
        );
      }
      for (let i = PLACED; i < ent.list.length; i++) {
        ent.list[i]!.position.set(CENTER.x + 1e6, CENTER.y, CENTER.z); // far outside REACH
      }
      const placed = ent.list.slice(0, PLACED); // hold refs to the parked bodies
      const sys = new SingularitySystem(ctx, ent);
      sys.summon('blackhole', CENTER);
      rebuildGrid(ctx, ent);
      // Predict the eaten subset BEFORE the update: grid-query order, in-horizon, first MAX_CONSUME.
      const predicted: typeof placed = [];
      for (const e of ctx.grid.query(CENTER.x, CENTER.z, REACH)) {
        const dx = CENTER.x - e.position.x;
        const dy = CENTER.y - e.position.y;
        const dz = CENTER.z - e.position.z;
        if (dx * dx + dy * dy + dz * dz < H2) {
          predicted.push(e);
          if (predicted.length === MAX_CONSUME) break;
        }
      }
      sys.update(1 / 60, 0);
      const survivalMask = placed.map((e) => ent.list.includes(e));
      const predictedConsumedMask = placed.map((e) => predicted.includes(e));
      return {
        consumed: sys.consumed,
        survivors: survivalMask.filter(Boolean).length,
        survivalMask,
        predictedConsumedMask,
        predictedLen: predicted.length,
      };
    };

    const r1 = runScenario(7);
    expect(r1.predictedLen).toBe(MAX_CONSUME); // the cap is genuinely saturated this frame
    expect(r1.consumed).toBe(MAX_CONSUME); // cap honored EXACTLY in one frame
    expect(r1.survivors).toBe(PLACED - MAX_CONSUME);
    // The eaten set is EXACTLY the predicted first-MAX_CONSUME in grid order: survived ⟺ not predicted.
    for (let i = 0; i < PLACED; i++) {
      expect(r1.survivalMask[i]).toBe(!r1.predictedConsumedMask[i]);
    }
    // DETERMINISM: a second identically-seeded run consumes the SAME subset (by placement index).
    const r2 = runScenario(7);
    expect(r2.survivalMask).toEqual(r1.survivalMask);
  });

  test('warp shell: a body at HORIZON < r < HORIZON·WARP_R_MULT is time-dilated (|Δv| < pure r⁻²) and redshifted', () => {
    const { HORIZON, WARP_R_MULT, G } = SINGULARITY_FIELD;
    const ctx = makeCtx(15, 500);
    const ent = new EntityManager(ctx);
    ent.reset(60);
    const probe = ent.list[0]!;
    const r = HORIZON + (WARP_R_MULT * HORIZON - HORIZON) * 0.5; // midway in the shell (= 56.25)
    expect(r).toBeGreaterThan(HORIZON);
    expect(r).toBeLessThan(WARP_R_MULT * HORIZON);
    probe.position.set(CENTER.x + r, CENTER.y, CENTER.z);
    probe.userData.vel.set(0, 0, 0); // start at rest so the single kick is the only contribution
    const colorBefore = probe.material.color.clone();
    const sys = new SingularitySystem(ctx, ent);
    sys.summon('blackhole', CENTER); // sign > 0 ⇒ REDSHIFT
    rebuildGrid(ctx, ent);
    sys.update(1 / 60, 0);
    const dt = 1 / 60;
    const pure = (G * dt) / (r * r); // the UN-warped |Δv| this body would receive
    const actual = probe.userData.vel.length();
    // Time dilation scales the post-kick velocity by (1 − 0.42·k) < 1 ⇒ the real delta is STRICTLY less
    // (deleting the dilation line would make actual === pure and fail this).
    expect(actual).toBeLessThan(pure);
    const k = 1 - (r - HORIZON) / (HORIZON * (WARP_R_MULT - 1));
    expect(actual).toBeCloseTo(pure * (1 - 0.42 * k), 6);
    // Redshift: the colour moved toward REDSHIFT (deleting the lerp would leave it byte-identical).
    expect(probe.material.color.equals(colorBefore)).toBe(false);
  }, 20000);

  test('strange star: the O(k) CONV_R conversion recolours EVERY body inside the sphere and ONLY those, at N ≥ 25k', () => {
    const { CONV_R2 } = SINGULARITY_FIELD;
    const N = 25000;
    const ctx = makeCtx(4242, N + 64);
    const ent = new EntityManager(ctx);
    ent.reset(N);
    const list = ent.list;
    // Restore a heavy density around the summon point (see packBall): the live spawn now fills the
    // whole platform + column, so > 100 bodies only land inside CONV_R = 80 when re-packed here.
    packBall(list, CENTER, 320);
    const beforeR = new Float64Array(N);
    const beforeG = new Float64Array(N);
    const beforeB = new Float64Array(N);
    const inConv = new Uint8Array(N);
    let nIn = 0;
    let nOut = 0;
    for (let i = 0; i < N; i++) {
      const e = list[i]!;
      const dx = CENTER.x - e.position.x;
      const dy = CENTER.y - e.position.y;
      const dz = CENTER.z - e.position.z;
      inConv[i] = dx * dx + dy * dy + dz * dz <= CONV_R2 ? 1 : 0;
      if (inConv[i] === 1) nIn++;
      else nOut++;
      const c = e.material.color;
      beforeR[i] = c.r;
      beforeG[i] = c.g;
      beforeB[i] = c.b;
    }
    expect(nIn).toBeGreaterThan(100); // a genuinely populated conversion zone
    expect(nOut).toBeGreaterThan(0); // …and bodies outside it (the query EXCLUDES them)
    const sys = new SingularitySystem(ctx, ent);
    sys.summon('strangestar', CENTER);
    rebuildGrid(ctx, ent);
    sys.update(1 / 60, 0);
    // in-CONV ⟺ recoloured to the fixed quark-green (0.18, 0.34, 0.12); out-CONV ⇒ byte-identical.
    let ok = true;
    for (let i = 0; i < N; i++) {
      const c = list[i]!.material.color;
      if (inConv[i] === 1) {
        if (
          Math.abs(c.r - 0.18) > 1e-6 ||
          Math.abs(c.g - 0.34) > 1e-6 ||
          Math.abs(c.b - 0.12) > 1e-6
        ) {
          ok = false;
        }
      } else if (c.r !== beforeR[i] || c.g !== beforeG[i] || c.b !== beforeB[i]) {
        ok = false;
      }
    }
    expect(ok).toBe(true);
  }, 60000);

  test('entropy: the i+=2 stride thermalizes EXACTLY the even-index bodies (odd untouched), deterministically, and raises chaos', () => {
    const N = 2000;
    const runEntropyFrame = (seed: number) => {
      const ctx = makeCtx(seed, 4000); // densityScale = 1, no spread — entropy ignores the grid anyway
      const ent = new EntityManager(ctx);
      ent.reset(N);
      const sys = new SingularitySystem(ctx, ent);
      sys.summon('entropy', CENTER);
      // Snapshot velocities AFTER summon (summon draws rng for the particle rig, not entity vel).
      const before = ent.list.map((e) => e.userData.vel.clone());
      const chaosBefore = ctx.state.chaos;
      sys.update(1 / 60, 0); // one entropy frame: strides i += 2 over the list, kicks + greys
      const changed = ent.list.map((e, i) => !e.userData.vel.equals(before[i]!));
      let sum = 0; // a compact float checksum of the post-state velocities (bit-exact under replay)
      for (const e of ent.list) {
        const v = e.userData.vel;
        sum += v.x * 1.000001 + v.y * 1.0000007 + v.z;
      }
      return { changed, chaosBefore, chaosAfter: ctx.state.chaos, sum, n: ent.list.length };
    };
    const r = runEntropyFrame(88);
    expect(r.n).toBe(N);
    // EXACTLY the even indices changed; odd indices are byte-identical — pins the i += 2 stride
    // coverage AND its exclusion (a deleted/strided-wrong/distance-bounded loop would fail this).
    let parityOk = true;
    for (let i = 0; i < r.n; i++) {
      if (r.changed[i] !== (i % 2 === 0)) parityOk = false;
    }
    expect(parityOk).toBe(true);
    expect(r.chaosAfter).toBeGreaterThan(r.chaosBefore); // the global heat coupling
    expect(r.chaosAfter).toBeLessThanOrEqual(10);
    // DETERMINISM: same seed ⇒ bit-identical post-state (the ctx.rng draw order is reproducible).
    const r2 = runEntropyFrame(88);
    expect(r2.sum).toBe(r.sum);
    expect(r2.changed).toEqual(r.changed);
  });
});

function makeCtxTier(tier: QualityTier): SimContext {
  const rng = mulberry32(0xc0ffee);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier,
      isMobile: tier === 'phone',
      instanced: false,
      dprCap: 1.25,
      maxEntities: 2000,
      quantization: getQuantizationConfig('desktop'),
      targetEntities: 2000,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
    },
    rng,
    grid: new SpatialHash<Entity>(GRID_CELL),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Summon `kind` at `tier` and measure the built rig: disk particle count + total rig vertices. */
function summonMeasure(
  kind: (typeof SINGULARITY_KINDS)[number],
  tier: QualityTier,
): { particles: number; totalVerts: number } {
  const ctx = makeCtxTier(tier);
  const entities = { list: [] } as unknown as EntityManager;
  const sys = new SingularitySystem(ctx, entities);
  sys.summon(kind, new THREE.Vector3(0, 32, 0));
  let particles = 0;
  let totalVerts = 0;
  ctx.scene.traverse((o) => {
    const geo = (o as THREE.Mesh | THREE.Points).geometry as THREE.BufferGeometry | undefined;
    const pos = geo?.getAttribute?.('position');
    if (!pos) return;
    totalVerts += pos.count;
    if ((o as THREE.Points).isPoints) particles = pos.count;
  });
  sys.dispose();
  return { particles, totalVerts };
}

describe('singularity fidelity is tier-independent (owner directive #7)', () => {
  test('the accretion-disk particle count is the top-tier budget (7600) on phone AND mega', () => {
    for (const kind of SINGULARITY_KINDS) {
      const phone = summonMeasure(kind, 'phone');
      const mega = summonMeasure(kind, 'mega');
      expect(phone.particles).toBe(7600);
      expect(mega.particles).toBe(7600);
    }
  });

  test('the whole rig builds identical geometry on every tier (no LOD degradation)', () => {
    const tiers: QualityTier[] = ['phone', 'laptop', 'desktop', 'ultra', 'mega'];
    for (const kind of SINGULARITY_KINDS) {
      const baseline = summonMeasure(kind, 'phone').totalVerts;
      expect(baseline).toBeGreaterThan(0);
      for (const tier of tiers) {
        expect(summonMeasure(kind, tier).totalVerts).toBe(baseline);
      }
    }
  });
});
