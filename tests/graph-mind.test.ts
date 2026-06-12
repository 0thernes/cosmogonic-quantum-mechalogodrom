import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { BEHAVIORS } from '../src/sim/constants';
import { Connectome } from '../src/sim/connectome';
import { GraphMind } from '../src/sim/graph-mind';
import type { EntityManager } from '../src/sim/entities';
import type { Entity, MorphType, SimContext } from '../src/types';

/** Morph emissive baseline used by every stub morph (rank restoration target). */
const MORPH_EMI = 0.4;
/** Initial stub material intensity — distinct from MORPH_EMI so restoration is observable. */
const START_EMI = 0.7;

/** Checked index access (tests run under noUncheckedIndexedAccess too). */
function at<T>(arr: ArrayLike<T>, i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`index ${i} out of range`);
  return v;
}

function makeMorph(id: number): MorphType {
  return {
    id,
    gi: 0,
    col: new THREE.Color(0x00eeff),
    em: new THREE.Color(0x003344),
    emI: MORPH_EMI,
    met: 0.5,
    rou: 0.5,
    op: 1,
    beh: BEHAVIORS[0],
    srMin: 0.5,
    srMax: 1,
    spd: 1,
    wf: 1,
    wa: 0.1,
  };
}

/** Fake SimContext: real rng/grid/scene/morphs, stubbed audit/sfx, no DOM. */
function makeCtx(seed: number): SimContext {
  const morphs: MorphType[] = [];
  for (let i = 0; i < 100; i++) morphs.push(makeMorph(i));
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop' as const,
      isMobile: false,
      instanced: false,
      dprCap: 2,
      maxEntities: 650,
      targetEntities: 650,
      quantumCount: 0,
      maxLinks: 64,
      shadows: false,
      starCount: 0,
    },
    rng: mulberry32(seed),
    grid: new SpatialHash<Entity>(),
    morphs,
    geos: [],
    state: {
      chaos: 1,
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
    },
    audit: { record() {}, entries: () => [] } as unknown as SimContext['audit'],
    sfx: () => {},
  };
}

let nextId = 1;

/** Minimal stub shaped like the Entity surface Connectome + GraphMind actually touch. */
function makeEntity(x: number, y: number, z: number, opts?: { nW?: number; mi?: number }): Entity {
  const stub = {
    id: nextId++,
    position: { x, y, z },
    parent: {},
    material: { emissiveIntensity: START_EMI },
    userData: { mi: opts?.mi ?? 0, nW: opts?.nW ?? 0, act: 0, setGroup: 0 },
  };
  return stub as unknown as Entity;
}

function makeEntityManager(list: Entity[]): EntityManager {
  return { list } as unknown as EntityManager;
}

interface FakeConnectome {
  pairs: Uint32Array;
  pairCount: number;
  communityOf: ((entityIndex: number) => number) | null;
  setCommunityOf(fn: ((entityIndex: number) => number) | null): void;
}

/** Fake connectome carrying synthetic entity-index pairs for GraphMind. */
function makeFakeConnectome(edges: ReadonlyArray<readonly [number, number]>): FakeConnectome {
  const fake: FakeConnectome = {
    pairs: new Uint32Array(0),
    pairCount: 0,
    communityOf: null,
    setCommunityOf(fn) {
      fake.communityOf = fn;
    },
  };
  setFakeEdges(fake, edges);
  return fake;
}

function setFakeEdges(fake: FakeConnectome, edges: ReadonlyArray<readonly [number, number]>): void {
  const pairs = new Uint32Array(edges.length * 2);
  edges.forEach(([a, b], i) => {
    pairs[i * 2] = a;
    pairs[i * 2 + 1] = b;
  });
  fake.pairs = pairs;
  fake.pairCount = edges.length;
}

/** All undirected edges of the clique over [lo, hi]. */
function clique(lo: number, hi: number): Array<readonly [number, number]> {
  const edges: Array<readonly [number, number]> = [];
  for (let a = lo; a <= hi; a++) for (let b = a + 1; b <= hi; b++) edges.push([a, b]);
  return edges;
}

describe('Connectome.pairs (V2 amendment)', () => {
  test('records entity-list index pairs during the existing rebuild', () => {
    const ctx = makeCtx(1);
    const list = [
      makeEntity(0, 0, 0),
      makeEntity(2, 0, 0),
      makeEntity(100, 0, 100),
      makeEntity(102, 0, 100),
    ];
    const conn = new Connectome(ctx, makeEntityManager(list));
    for (const e of list) ctx.grid.insert(e);
    conn.update(0.016, 0);

    expect(conn.links).toBe(2);
    expect(conn.pairCount).toBe(2);
    const got = new Set<string>();
    for (let p = 0; p < conn.pairCount; p++) {
      got.add(`${at(conn.pairs, p * 2)}-${at(conn.pairs, p * 2 + 1)}`);
    }
    expect(got).toEqual(new Set(['0-1', '2-3']));
  });

  test('a grid neighbor missing from the list still draws a link but yields no pair', () => {
    const ctx = makeCtx(2);
    const list = [makeEntity(0, 0, 0), makeEntity(2, 0, 0)];
    const ghost = makeEntity(1.5, 0, 0); // in the grid (stale) but not in entities.list
    const conn = new Connectome(ctx, makeEntityManager(list));
    ctx.grid.insert(at(list, 0));
    ctx.grid.insert(at(list, 1));
    ctx.grid.insert(ghost);
    conn.update(0.016, 0);

    expect(conn.links).toBe(2); // V1 visuals preserved: the stale neighbor still gets a segment
    expect(conn.pairCount).toBe(1);
    expect(at(conn.pairs, 0)).toBe(0);
    expect(at(conn.pairs, 1)).toBe(1);
  });

  test('pairs refresh across updates as the population shifts', () => {
    const ctx = makeCtx(3);
    // Two pairs out of link reach (8) of each other: (0,2) and (12,14).
    const list = [
      makeEntity(0, 0, 0),
      makeEntity(2, 0, 0),
      makeEntity(12, 0, 0),
      makeEntity(14, 0, 0),
    ];
    const conn = new Connectome(ctx, makeEntityManager(list));
    for (const e of list) ctx.grid.insert(e);
    conn.update(0.016, 0);
    expect(conn.pairCount).toBe(2); // 0-1 and 2-3 (only even indices query)

    // Entity 0 dies: list shifts left, grid is rebuilt (world does both between updates).
    list.splice(0, 1);
    ctx.grid.clear();
    for (const e of list) ctx.grid.insert(e);
    conn.update(0.016, 0.016);
    // Survivors at their NEW indices: only index 2 (x=14) queries; it links index 1 (x=12).
    expect(conn.pairCount).toBe(1);
    expect(at(conn.pairs, 0)).toBe(2);
    expect(at(conn.pairs, 1)).toBe(1);
  });
});

describe('Connectome.setCommunityOf (V2 amendment)', () => {
  test('null lookup preserves V1 time-hue colors; a lookup switches to the tribe palette', () => {
    const ctx = makeCtx(4);
    const list = [makeEntity(0, 0, 0, { nW: 0 }), makeEntity(2, 0, 0, { nW: 0 })];
    const conn = new Connectome(ctx, makeEntityManager(list));
    for (const e of list) ctx.grid.insert(e);
    const seg = at(ctx.scene.children, 0) as THREE.LineSegments;
    const colors = seg.geometry.getAttribute('color');

    // nd = 2 ⇒ nI = 0.75 ⇒ L = 0.25 + 0.75·0.45; nW = 0 and t = 0 ⇒ V1 hue = 0.
    const lum = 0.25 + 0.75 * 0.45;
    const v1 = new THREE.Color().setHSL(0, 0.75, lum);
    const tribe = new THREE.Color().setHSL((4 & 7) / 8, 0.75, lum);

    conn.update(0.016, 0);
    expect(conn.links).toBe(1);
    expect(Math.abs(colors.getX(0) - v1.r)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getY(0) - v1.g)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getZ(0) - v1.b)).toBeLessThan(1e-6);

    conn.setCommunityOf(() => 4);
    conn.update(0.016, 0);
    expect(Math.abs(colors.getX(0) - tribe.r)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getY(0) - tribe.g)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getZ(0) - tribe.b)).toBeLessThan(1e-6);

    conn.setCommunityOf(null); // back to bit-for-bit V1 behavior
    conn.update(0.016, 0);
    expect(Math.abs(colors.getX(0) - v1.r)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getY(0) - v1.g)).toBeLessThan(1e-6);
    expect(Math.abs(colors.getZ(0) - v1.b)).toBeLessThan(1e-6);
  });
});

describe('GraphMind.updateCommunities', () => {
  test('two disconnected cliques resolve to >= 2 tribes with tribe-aware setGroup', () => {
    const ctx = makeCtx(42);
    const list = Array.from({ length: 8 }, (_, i) => makeEntity(i, 0, 0));
    const fake = makeFakeConnectome([...clique(0, 3), ...clique(4, 7)]);
    const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);

    gm.updateCommunities();
    expect(gm.tribes).toBeGreaterThanOrEqual(2);

    const groupA = at(list, 0).userData.setGroup;
    const groupB = at(list, 4).userData.setGroup;
    for (let i = 0; i <= 3; i++) expect(at(list, i).userData.setGroup).toBe(groupA);
    for (let i = 4; i <= 7; i++) expect(at(list, i).userData.setGroup).toBe(groupB);
    expect(groupA).not.toBe(groupB);

    // The 8-hue palette lookup is installed and separates the two tribes.
    const lookup = fake.communityOf;
    expect(lookup).not.toBeNull();
    if (lookup) {
      expect(lookup(0)).toBe(groupA);
      expect(lookup(4)).toBe(groupB);
      expect(lookup(0)).not.toBe(lookup(4));
    }
  });

  test('empty graph yields 0 tribes and uninstalls the palette', () => {
    const ctx = makeCtx(43);
    const list = Array.from({ length: 4 }, (_, i) => makeEntity(i, 0, 0));
    const fake = makeFakeConnectome(clique(0, 3));
    const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);

    gm.updateCommunities();
    expect(fake.communityOf).not.toBeNull();
    expect(gm.tribes).toBeGreaterThanOrEqual(1);

    setFakeEdges(fake, []);
    gm.updateCommunities();
    expect(gm.tribes).toBe(0);
    expect(fake.communityOf).toBeNull(); // degrade visibly back to V1 time hue
  });

  test('louvain is deterministic for a seeded rng (same seed => same tribes)', () => {
    // Seeded noisy two-cluster graph with a single bridge.
    const fixture = mulberry32(7);
    const edges: Array<readonly [number, number]> = [];
    for (let a = 0; a < 12; a++) {
      for (let b = a + 1; b < 12; b++) if (fixture() < 0.6) edges.push([a, b]);
    }
    for (let a = 12; a < 24; a++) {
      for (let b = a + 1; b < 24; b++) if (fixture() < 0.6) edges.push([a, b]);
    }
    edges.push([0, 12]);

    const run = (seed: number): { tribes: number; groups: number[] } => {
      const ctx = makeCtx(seed);
      const list = Array.from({ length: 24 }, (_, i) => makeEntity(i, 0, 0));
      const fake = makeFakeConnectome(edges);
      const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);
      gm.updateCommunities();
      return { tribes: gm.tribes, groups: list.map((e) => e.userData.setGroup) };
    };

    const first = run(123);
    const second = run(123);
    expect(second.tribes).toBe(first.tribes);
    expect(second.groups).toEqual(first.groups);
    expect(first.tribes).toBeGreaterThanOrEqual(2);
  });
});

describe('GraphMind.updateRank', () => {
  test('top-20 entities get the emissive floor; losing rank restores the morph baseline', () => {
    const ctx = makeCtx(99);
    const list = Array.from({ length: 26 }, (_, i) => makeEntity(i, 0, 0));
    const star: Array<readonly [number, number]> = [];
    for (let i = 1; i <= 25; i++) star.push([0, i]);
    const fake = makeFakeConnectome(star);
    const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);

    gm.updateRank();
    expect(at(list, 0).material.emissiveIntensity).toBe(2.0); // the hub always ranks
    const boosted = list.filter((e) => e.material.emissiveIntensity === 2.0);
    expect(boosted.length).toBe(20);
    expect(at(list, 25).material.emissiveIntensity).toBe(START_EMI);

    // Re-center the star on node 25 — node 0 vanishes from the graph and loses its halo.
    const star2: Array<readonly [number, number]> = [];
    for (let i = 1; i <= 24; i++) star2.push([25, i]);
    setFakeEdges(fake, star2);
    gm.updateRank();
    expect(at(list, 0).material.emissiveIntensity).toBe(MORPH_EMI); // restored, not START_EMI
    expect(at(list, 25).material.emissiveIntensity).toBe(2.0);
  });

  test('a dead former rank-holder is left alone (material already disposed)', () => {
    const ctx = makeCtx(100);
    const list = Array.from({ length: 6 }, (_, i) => makeEntity(i, 0, 0));
    const fake = makeFakeConnectome(clique(0, 5));
    const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);

    gm.updateRank();
    expect(at(list, 0).material.emissiveIntensity).toBe(2.0);

    at(list, 0).parent = null; // entity died between rank passes
    setFakeEdges(fake, clique(1, 5));
    gm.updateRank();
    expect(at(list, 0).material.emissiveIntensity).toBe(2.0); // untouched, no write to disposed mat
  });

  test('empty graph clears every halo', () => {
    const ctx = makeCtx(101);
    const list = Array.from({ length: 4 }, (_, i) => makeEntity(i, 0, 0));
    const fake = makeFakeConnectome(clique(0, 3));
    const gm = new GraphMind(ctx, makeEntityManager(list), fake as unknown as Connectome);

    gm.updateRank();
    expect(at(list, 0).material.emissiveIntensity).toBe(2.0);

    setFakeEdges(fake, []);
    gm.updateRank();
    for (const e of list) expect(e.material.emissiveIntensity).toBe(MORPH_EMI);
  });
});

describe('GraphMind + real Connectome integration', () => {
  test('communities flow from spatial clusters through pairs into tribes', () => {
    const ctx = makeCtx(7);
    const list: Entity[] = [];
    // Two tight spatial clusters of 6, far apart (cluster spread < link reach 8).
    for (let i = 0; i < 6; i++) list.push(makeEntity(i * 1.2, 0, 0));
    for (let i = 0; i < 6; i++) list.push(makeEntity(200 + i * 1.2, 0, 200));
    const em = makeEntityManager(list);
    const conn = new Connectome(ctx, em);
    const gm = new GraphMind(ctx, em, conn);
    for (const e of list) ctx.grid.insert(e);

    conn.update(0.016, 0);
    expect(conn.pairCount).toBeGreaterThan(0);
    gm.updateCommunities();
    expect(gm.tribes).toBeGreaterThanOrEqual(2);
    expect(at(list, 0).userData.setGroup).not.toBe(at(list, 6).userData.setGroup);
  });
});
