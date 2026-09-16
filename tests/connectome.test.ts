/**
 * Connectome — the neural link graph rebuilt each cadence from entity proximity (grid-queried),
 * with generation-stamped direct list indices and an `ACT_MAX`-clamped activation accumulator. Covered only
 * via the integrated world loop; this pins the direct contract: the link count stays a non-negative
 * integer bounded by the tier's `maxLinks`, neural activation never overflows, and the rebuild is
 * fully reproducible from one seed (it draws no rng — pure proximity + math).
 *
 * Headless (fake-ctx pattern) — drives the real `update` over a real EntityManager + populated grid.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import { Connectome } from '../src/sim/connectome';
import { getQuantizationConfig } from '../src/math/quantization';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

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

function makeCtx(seed: number): SimContext {
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
      maxEntities: 400,
      targetEntities: 400,
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

function makeWorld(seed: number): { ctx: SimContext; entities: EntityManager; conn: Connectome } {
  const ctx = makeCtx(seed);
  const entities = new EntityManager(ctx);
  entities.reset(100);
  for (const e of entities.list) if (e) ctx.grid.insert(e);
  const conn = new Connectome(ctx, entities);
  return { ctx, entities, conn };
}

const actTrace = (entities: EntityManager): number[] => {
  const out: number[] = [];
  for (const e of entities.list) if (e) out.push(e.userData.act);
  return out;
};

function connectomeLines(ctx: SimContext): THREE.LineSegments[] {
  return ctx.scene.children.filter(
    (child): child is THREE.LineSegments => child instanceof THREE.LineSegments,
  );
}

function arrangeDenseClique(entities: EntityManager): void {
  for (let i = 0; i < entities.list.length; i++) {
    const entity = entities.list[i];
    if (entity) entity.position.set((i % 6) * 0.5, 0, Math.floor(i / 6) * 0.5);
  }
}

function rebuildGrid(ctx: SimContext, entities: EntityManager): void {
  ctx.grid.clear();
  for (const entity of entities.list) if (entity) ctx.grid.insert(entity);
}

describe('Connectome — bounded link graph + finite activation, deterministic rebuild', () => {
  test('link count is a non-negative integer bounded by the tier maxLinks', () => {
    const { ctx, conn } = makeWorld(0x1100ab);
    conn.update(1 / 60, 1);
    expect(Number.isInteger(conn.links)).toBe(true);
    expect(conn.links).toBeGreaterThanOrEqual(0);
    expect(conn.links).toBeLessThanOrEqual(ctx.quality.maxLinks);
  });

  test('neural activation stays finite + bounded across many rebuilds (ACT_MAX clamp)', () => {
    const { entities, conn } = makeWorld(0x2200cd);
    for (let f = 0; f < 120; f++) conn.update(1 / 60, f / 60);
    for (const e of entities.list) {
      if (!e) continue;
      expect(Number.isFinite(e.userData.act)).toBe(true);
      expect(Math.abs(e.userData.act)).toBeLessThan(100); // ACT_MAX is ~4; this catches any overflow
    }
  });

  test('identical seeds replay an identical link count + activation trace (no rng)', () => {
    const a = makeWorld(0x3300ef);
    const b = makeWorld(0x3300ef);
    for (let f = 0; f < 60; f++) {
      a.conn.update(1 / 60, f / 60);
      b.conn.update(1 / 60, f / 60);
    }
    expect(a.conn.links).toBe(b.conn.links);
    expect(actTrace(b.entities)).toEqual(actTrace(a.entities));
  });

  test('entity axon web SHOWS again: visible by default, REAL toggle, graph computes either way', () => {
    // Owner 2026-07-19 (/goal): the entity connectome renders again — GPU-instanced waving
    // axons, visible from construction. (Reverses the 2026-07-14 retirement for ENTITIES only;
    // the xenomimic psionic-bond ruling stands and is pinned in xenomimic-cosmetics.test.ts.)
    const { ctx, conn, entities } = makeWorld(0x4400aa);
    expect(conn.webVisible).toBe(true); // visible from construction

    arrangeDenseClique(entities); // guarantee in-reach neighbors so the graph provably advances
    rebuildGrid(ctx, entities);
    for (let f = 0; f < 30; f++) conn.update(1 / 60, f / 60);
    // The GRAPH is fully live: links + topology pairs advance for GraphMind/tribes.
    expect(conn.links).toBeGreaterThan(0);
    expect(conn.pairCount).toBeGreaterThan(0);
    // Visible web: one instance per link, 11 instance floats per link (endpoints + wave/color
    // params) — the polyline/HSL math itself lives in the vertex shader, not the CPU buffers.
    const lines = connectomeLines(ctx)[0]!;
    expect(lines.visible).toBe(true);
    const geo = lines.geometry as THREE.InstancedBufferGeometry;
    expect(geo.instanceCount).toBe(conn.links);
    expect(conn.geometryFloatsWritten).toBe(conn.links * 11);
    const lastRenderedLinks = geo.instanceCount;

    // Hiding is a REAL toggle again. A hide→show while the world is FROZEN restores the last
    // completely written prefix immediately; it does not need a simulation update to become visible.
    conn.setWebVisible(false);
    expect(conn.webVisible).toBe(false);
    expect(geo.instanceCount).toBe(0);
    conn.setWebVisible(true);
    expect(geo.instanceCount).toBe(lastRenderedLinks);

    // Hidden updates draw/write nothing while the graph still stays live.
    conn.setWebVisible(false);
    conn.update(1 / 60, 1);
    expect(conn.links).toBeGreaterThan(0);
    expect(geo.instanceCount).toBe(0);
    expect(conn.geometryFloatsWritten).toBe(0);
    conn.setWebVisible(true);
    expect(conn.webVisible).toBe(true);
  });

  test('mega startup allocation follows the live population instead of the 600k-link ceiling', () => {
    const ctx = makeCtx(0x5500bb);
    ctx.quality.tier = 'mega';
    ctx.quality.maxEntities = 50_000;
    ctx.quality.targetEntities = 50_000;
    ctx.quality.maxLinks = 600_000;
    const liveAtBoot = 500;
    const entities = {
      list: Array.from({ length: liveAtBoot }, () => ({}) as Entity),
    } as EntityManager;

    const conn = new Connectome(ctx, entities);
    const lines = connectomeLines(ctx)[0];
    expect(lines).toBeDefined();
    if (!lines) return;

    // 12 links/live entity is the tier model; geometric rounding stays below 2x that estimate.
    expect(conn.allocatedLinkCapacity).toBeGreaterThanOrEqual(liveAtBoot * 12);
    expect(conn.allocatedLinkCapacity).toBeLessThan(liveAtBoot * 24);
    expect(conn.allocatedLinkCapacity).toBeLessThan(ctx.quality.maxLinks / 50);
    // One interleaved instance buffer (11 floats/link) replaces the old per-segment
    // position+color pair. Direct generation-stamped entity indices also remove the former
    // population-sized open-address table from the connectome's startup footprint.
    const instanceData = (lines.geometry.getAttribute('aStart') as THREE.InterleavedBufferAttribute)
      .data.array as Float32Array;
    const startupBytes = instanceData.byteLength + conn.pairs.byteLength;
    expect(startupBytes).toBeLessThan(3 * 1024 * 1024);
    conn.dispose();
  });

  test('geometric growth preserves topology and render output without replacing the line/material', () => {
    const ctx = makeCtx(0x6600cc);
    ctx.quality.maxEntities = 1_024;
    ctx.quality.targetEntities = 1_024;
    ctx.quality.maxLinks = 1_024;
    ctx.quality.instanced = true;
    const entities = new EntityManager(ctx);
    entities.reset(20);
    arrangeDenseClique(entities);
    rebuildGrid(ctx, entities);

    const grown = new Connectome(ctx, entities);
    const grownLines = connectomeLines(ctx)[0];
    expect(grownLines).toBeDefined();
    if (!grownLines) return;
    grown.update(1 / 60, 1, false);
    expect(grown.links).toBe(190); // 20 choose 2: dense but still below the 256-link floor.
    expect(grown.allocatedLinkCapacity).toBe(256);
    const originalMaterial = grownLines.material;
    const originalGeometry = grownLines.geometry;
    let originalGeometryDisposed = false;
    originalGeometry.addEventListener('dispose', () => {
      originalGeometryDisposed = true;
    });

    for (let i = 0; i < 4; i++) entities.spawn(new THREE.Vector3(), 0);
    arrangeDenseClique(entities);
    rebuildGrid(ctx, entities);
    const reference = new Connectome(ctx, entities); // starts directly at the required 512 capacity.
    const referenceLines = connectomeLines(ctx)[1];
    expect(referenceLines).toBeDefined();
    if (!referenceLines) return;

    grown.update(1 / 60, 2, false);
    reference.update(1 / 60, 2, false);

    expect(grown.allocatedLinkCapacity).toBe(512);
    expect(grown.links).toBe(276); // 24 choose 2 crosses the initial capacity boundary.
    expect(grown.links).toBe(reference.links);
    expect(grown.pairCount).toBe(reference.pairCount);
    expect(grown.pairs.slice(0, grown.pairCount * 2)).toEqual(
      reference.pairs.slice(0, reference.pairCount * 2),
    );
    expect(connectomeLines(ctx)[0]).toBe(grownLines);
    expect(grownLines.material).toBe(originalMaterial);
    expect(grownLines.geometry).not.toBe(originalGeometry);
    expect(originalGeometryDisposed).toBe(true);
    const grownGeo = grownLines.geometry as THREE.InstancedBufferGeometry;
    const referenceGeo = referenceLines.geometry as THREE.InstancedBufferGeometry;
    expect(grownGeo.instanceCount).toBe(referenceGeo.instanceCount);

    const activeFloats = grown.geometryFloatsWritten;
    expect(activeFloats).toBe(grown.links * 11); // 11 instance floats per visible link
    const grownData = (grownGeo.getAttribute('aStart') as THREE.InterleavedBufferAttribute).data
      .array as Float32Array;
    const referenceData = (referenceGeo.getAttribute('aStart') as THREE.InterleavedBufferAttribute)
      .data.array as Float32Array;
    expect(grownData.slice(0, activeFloats)).toEqual(referenceData.slice(0, activeFloats));

    grown.dispose();
    reference.dispose();
    entities.reset(0);
  });
});
