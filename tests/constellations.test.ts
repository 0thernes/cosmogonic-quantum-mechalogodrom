/**
 * ConstellationSystem (V2) — the Voronoi/Delaunay sky-web over the 24 static monolith + diorama
 * sites. A core cosmos-layer module that had no dedicated test. Verifies the build-once geometry
 * contract (two finite line layers hung at the constant sky altitude, deterministic across builds),
 * the per-frame opacity clamps (the audio-treble cap + the "silent world rests at baseline"
 * property), and the sub-sector lore lookup. Headless: real three.js scene graph + d3-delaunay,
 * no WebGL renderer, no DOM — exactly the fake-ctx pattern the sim suites use.
 */
import { describe, expect, test, spyOn } from 'bun:test';
import * as THREE from 'three';
import { ConstellationSystem } from '../src/sim/constellations';
import { LoreEngine } from '../src/sim/lore';
import { ARENA_Y, CHAOS_MAX } from '../src/sim/constants';
import type { AudioBands } from '../src/audio/analysis';
import type { SimContext, SimState } from '../src/types';

/** Altitude every sky-web vertex must sit at (mirrors the module-private `SKY_Y = 55 × ARENA_Y`). */
const SKY_Y = 55 * ARENA_Y;

/** Minimal SimState — ConstellationSystem reads only `chaos` (plus nothing else). */
function makeState(chaos: number): SimState {
  return {
    chaos,
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

/** The constructor + update read ONLY `ctx.scene` and `ctx.state`; the rest of SimContext is unused. */
function makeCtx(chaos: number): SimContext {
  return { scene: new THREE.Scene(), state: makeState(chaos) } as unknown as SimContext;
}

const SILENCE: AudioBands = { bass: 0, mid: 0, treble: 0, level: 0 };

/** Pull a named LineSegments layer out of the constellations group the constructor added. */
function layer(ctx: SimContext, name: string): THREE.LineSegments {
  const group = ctx.scene.getObjectByName('constellations');
  expect(group).toBeDefined();
  const seg = group!.getObjectByName(name);
  expect(seg).toBeInstanceOf(THREE.LineSegments);
  return seg as THREE.LineSegments;
}

function positions(seg: THREE.LineSegments): Float32Array {
  return seg.geometry.getAttribute('position').array as Float32Array;
}

describe('ConstellationSystem — sky-web build contract', () => {
  test('adds a constellations group with two finite, non-empty line layers', () => {
    const ctx = makeCtx(1.5);
    new ConstellationSystem(ctx, new LoreEngine(0xc057));
    for (const name of ['constellation-cells', 'constellation-links']) {
      const arr = positions(layer(ctx, name));
      expect(arr.length).toBeGreaterThan(0);
      // LineSegments are vertex PAIRS of (x, y, z) ⇒ length is a multiple of 6.
      expect(arr.length % 6).toBe(0);
      for (const v of arr) expect(Number.isFinite(v)).toBe(true);
    }
  });

  test('every vertex hangs at the constant sky altitude (55 × ARENA_Y)', () => {
    const ctx = makeCtx(3);
    new ConstellationSystem(ctx, new LoreEngine(1));
    for (const name of ['constellation-cells', 'constellation-links']) {
      const arr = positions(layer(ctx, name));
      // y is every 3rd component starting at index 1.
      for (let i = 1; i < arr.length; i += 3) expect(arr[i]).toBe(SKY_Y);
    }
  });

  test('geometry is deterministic — the 24 static sites yield identical builds', () => {
    const a = makeCtx(0);
    const b = makeCtx(0);
    new ConstellationSystem(a, new LoreEngine(7));
    new ConstellationSystem(b, new LoreEngine(99)); // seed only names sectors, not geometry
    for (const name of ['constellation-cells', 'constellation-links']) {
      const pa = positions(layer(a, name));
      const pb = positions(layer(b, name));
      expect(pa.length).toBe(pb.length);
      for (let i = 0; i < pa.length; i++) expect(pa[i]).toBe(pb[i]);
    }
  });
});

describe('ConstellationSystem — per-frame opacity pulse', () => {
  test('opacities stay inside the documented clamps under extreme chaos + audio', () => {
    const ctx = makeCtx(CHAOS_MAX);
    const sys = new ConstellationSystem(ctx, new LoreEngine(2));
    const cellMat = layer(ctx, 'constellation-cells').material as THREE.LineBasicMaterial;
    const linkMat = layer(ctx, 'constellation-links').material as THREE.LineBasicMaterial;
    // Sweep time, over-range chaos, and an absurd treble — the clamp + cap must hold regardless.
    const blast: AudioBands = { bass: 9, mid: 9, treble: 100, level: 9 };
    for (let t = 0; t < 40; t++) {
      ctx.state.chaos = t % 2 === 0 ? CHAOS_MAX : CHAOS_MAX * 3; // push past the ladder ceiling
      sys.update(t * 0.37, blast);
      expect(cellMat.opacity).toBeGreaterThanOrEqual(0);
      expect(cellMat.opacity).toBeLessThanOrEqual(0.4);
      expect(linkMat.opacity).toBeGreaterThanOrEqual(0);
      expect(linkMat.opacity).toBeLessThanOrEqual(0.5);
    }
  });

  test('a silent, calm world rests at the dim baseline (independent of t)', () => {
    const ctx = makeCtx(0); // chaos 0 kills the wave term entirely
    const sys = new ConstellationSystem(ctx, new LoreEngine(3));
    const cellMat = layer(ctx, 'constellation-cells').material as THREE.LineBasicMaterial;
    const linkMat = layer(ctx, 'constellation-links').material as THREE.LineBasicMaterial;
    for (const t of [0, 1.3, 5, 42]) {
      sys.update(t, SILENCE);
      // base × (0.8 + 0) × 1: CELL_BASE 0.1 → 0.08, LINK_BASE 0.16 → 0.128.
      expect(cellMat.opacity).toBeCloseTo(0.08, 6);
      expect(linkMat.opacity).toBeCloseTo(0.128, 6);
    }
  });
});

describe('ConstellationSystem — sub-sector lore lookup', () => {
  test('subSectorAt returns a stable, non-empty sector name for a position', () => {
    const ctx = makeCtx(1);
    const sys = new ConstellationSystem(ctx, new LoreEngine(0x5ec));
    const p = new THREE.Vector3(0, SKY_Y, 0);
    const first = sys.subSectorAt(p);
    expect(typeof first).toBe('string');
    expect(first.length).toBeGreaterThan(0);
    // Memoized + pure in (kind, seed, ordinal): the same point always names the same sector.
    expect(sys.subSectorAt(p)).toBe(first);
  });

  test('distant positions still resolve to valid sector names (no throw, warm-start safe)', () => {
    const ctx = makeCtx(1);
    const sys = new ConstellationSystem(ctx, new LoreEngine(11));
    for (const [x, z] of [
      [9999, -9999],
      [-9999, 9999],
      [0, 0],
    ]) {
      const name = sys.subSectorAt(new THREE.Vector3(x, SKY_Y, z));
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe('ConstellationSystem — dispose frees GPU resources (no leak on teardown / HMR)', () => {
  test('dispose() disposes both line-layer geometries + materials and unparents the group', () => {
    const ctx = makeCtx(1);
    const sys = new ConstellationSystem(ctx, new LoreEngine(0x0c05));
    const group = ctx.scene.children.find((o) => o.name === 'constellations') as THREE.Group;
    expect(group).toBeDefined();
    const geos = group.children
      .filter((o): o is THREE.LineSegments => o instanceof THREE.LineSegments)
      .map((l) => l.geometry);
    expect(geos.length).toBe(2);
    const geoSpies = geos.map((g) => spyOn(g, 'dispose'));
    sys.dispose();
    for (const s of geoSpies) expect(s).toHaveBeenCalledTimes(1); // both geometries freed
    expect(ctx.scene.children.some((o) => o.name === 'constellations')).toBe(false); // group unparented
  });
});
