/**
 * Pins the Viz3D (CONTRACTS V4.2) contract: the holographic-sculpture system builds headless
 * (three's Scene/geometry are pure JS under bun), the tower count gates on the phone tier,
 * heights stay finite and ease MONOTONICALLY toward their data targets, the war-network draw
 * range tracks the non-truce relations, and construction draws nothing from the rng (so the
 * integrator can place it anywhere in the boot stream).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { Viz3DSystem } from '../src/sim/viz3d';
import type { Viz3DLedgerRow, Viz3DSnapshot } from '../src/sim/viz3d';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, QualityTier, SimContext } from '../src/types';

const PHYLA = 10;
const TITANS = 10;
const PAIR_COUNT = (TITANS * (TITANS - 1)) / 2;
const NET_CADENCE = 6;

/** Minimal SimContext — Viz3DSystem only reads `scene`, `quality`, and (never) `rng`. */
function makeCtx(tier: QualityTier, maxEntities: number, seed = 1): SimContext {
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier,
      isMobile: tier === 'phone',
      instanced: tier !== 'phone',
      dprCap: 2,
      maxEntities,
      quantumCount: 10,
      maxLinks: 10,
      shadows: false,
      starCount: 10,
    },
    rng: mulberry32(seed),
    grid: new SpatialHash<Entity>(),
    morphs: [],
    geos: [],
    state: {
      chaos: 1,
      mutations: 0,
      timeScale: 1,
      wireframe: false,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: 0,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** A fresh ledger of `n` titans with uniform economy + given war count. */
function makeLedger(n: number, energy: number, matter: number, war = 0): Viz3DLedgerRow[] {
  const rows: Viz3DLedgerRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({ name: `T${i}`, energy, matter, entropy: 0, war });
  }
  return rows;
}

/** A fresh all-truce 10×10 war matrix (every cell 0). */
function truceMatrix(): number[] {
  return Array.from({ length: TITANS * TITANS }, () => 0);
}

/** Build a snapshot; `warMatrix` defaults to all-truce. */
function makeSnap(
  counts: number[],
  ledger: Viz3DLedgerRow[],
  warMatrix: number[] = truceMatrix(),
): Viz3DSnapshot {
  return { phylumCounts: counts, ledger, warMatrix };
}

const ZERO_COUNTS = Array.from({ length: PHYLA }, () => 0);

describe('construction', () => {
  test('builds headless without a DOM and adds objects to the scene', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    expect(viz.towersBuilt).toBe(PHYLA);
    expect(viz.obelisksBuilt).toBe(TITANS);
    // Root group + its children all land under the scene graph.
    expect(ctx.scene.children.length).toBeGreaterThan(0);
  });

  test('draws nothing from the rng (boot stream stays aligned)', () => {
    const rng = mulberry32(777);
    const reference = mulberry32(777);
    new Viz3DSystem({ ...makeCtx('ultra', 10000), rng });
    expect(rng()).toBe(reference());
  });

  test('every desktop-class tier builds the full 10 towers (lowDetail off)', () => {
    for (const [tier, max] of [
      ['laptop', 2000],
      ['desktop', 5000],
      ['ultra', 10000],
    ] as const) {
      const viz = new Viz3DSystem(makeCtx(tier, max));
      expect(viz.lowDetail).toBeFalse();
      expect(viz.towersBuilt).toBe(PHYLA);
    }
  });
});

describe('tier gating: phone halves the tower count', () => {
  test('phone tier (650 entities) sets lowDetail and builds 5 towers', () => {
    const viz = new Viz3DSystem(makeCtx('phone', 650));
    expect(viz.lowDetail).toBeTrue();
    expect(viz.towersBuilt).toBe(PHYLA / 2);
    // Obelisks are NOT halved — only the phylum towers.
    expect(viz.obelisksBuilt).toBe(TITANS);
  });

  test('lowDetail is derived from maxEntities<=650 regardless of the tier label', () => {
    expect(new Viz3DSystem(makeCtx('laptop', 650)).lowDetail).toBeTrue();
    expect(new Viz3DSystem(makeCtx('laptop', 651)).lowDetail).toBeFalse();
  });
});

/** Collect every mesh scale.y across the scene graph (towers + obelisks). */
function allMeshScaleYs(scene: THREE.Scene): number[] {
  const ys: number[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) ys.push(m.scale.y);
  });
  return ys;
}

describe('height + finite invariants', () => {
  test('heights stay finite and positive over a long stressed run', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    const ledger = makeLedger(TITANS, 500, 500, 3);
    // Alternate war / truce matrices to exercise the network rebuild both ways.
    const warHot = truceMatrix();
    for (let i = 0; i < TITANS; i++) {
      for (let j = 0; j < TITANS; j++) if (i !== j) warHot[i * TITANS + j] = (i + j) % 3;
    }
    const counts = [0, 1, 50, 1100, 9999, 100, 4000, 7, 333, 880];
    for (let n = 0; n < 600; n++) {
      const wm = n % 2 === 0 ? warHot : truceMatrix();
      viz.update(makeSnap(counts, ledger, wm));
    }
    const ys = allMeshScaleYs(ctx.scene);
    expect(ys.length).toBe(PHYLA + TITANS); // 10 towers + 10 obelisks
    for (const y of ys) {
      expect(Number.isFinite(y)).toBeTrue();
      expect(y).toBeGreaterThan(0);
    }
  });

  test('NaN / undefined / negative count + ledger fields never poison a height', () => {
    const ctx = makeCtx('desktop', 5000);
    const viz = new Viz3DSystem(ctx);
    const ledger = makeLedger(TITANS, NaN, NaN, NaN);
    const counts = [NaN, -5, Infinity, 100, 0, 0, 0, 0, 0, 0];
    for (let n = 0; n < 4 * NET_CADENCE; n++) viz.update(makeSnap(counts, ledger));
    for (const y of allMeshScaleYs(ctx.scene)) {
      expect(Number.isFinite(y)).toBeTrue();
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  test('short snapshots (fewer rows than slots) are tolerated', () => {
    const viz = new Viz3DSystem(makeCtx('desktop', 5000));
    // Only 3 phyla + 3 titans supplied — the rest of the ring must hold its prior height.
    const counts = [10, 20, 30];
    const ledger = makeLedger(3, 200, 200, 0);
    expect(() => {
      for (let n = 0; n < 2 * NET_CADENCE; n++) viz.update(makeSnap(counts, ledger));
    }).not.toThrow();
  });
});

describe('smoothing eases monotonically toward the target', () => {
  /** Walk the tower mesh for phylum `i` out of the system's scene by traversal. */
  function towerScaleY(viz: Viz3DSystem, scene: THREE.Scene, i: number): number {
    // The towers are Box meshes (BoxGeometry); collect them in build order.
    const boxes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.geometry as THREE.BufferGeometry).type === 'BoxGeometry') boxes.push(m);
    });
    void viz;
    const mesh = boxes[i];
    return mesh ? mesh.scale.y : NaN;
  }

  test('a tower rises step-by-step toward a tall target and never overshoots', () => {
    const ctx = makeCtx('ultra', 10000);
    const scene = ctx.scene;
    const viz = new Viz3DSystem(ctx);
    // Phylum 0 at a large population; everything else empty.
    const counts = [9999, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const ledger = makeLedger(TITANS, 0, 0, 0);
    let prev = towerScaleY(viz, scene, 0);
    // TOWER_H_MIN + clamp01(log1p(count)/LOG_REF)*SPAN; log1p(9999)/7≈1.32 clamps to 1.
    const target = 4 + Math.min(1, Math.log1p(9999) / 7) * 90;
    for (let n = 0; n < 80; n++) {
      viz.update(makeSnap(counts, ledger));
      const cur = towerScaleY(viz, scene, 0);
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-9); // monotonic non-decreasing
      expect(cur).toBeLessThanOrEqual(target + 1e-6); // never overshoots the target
      prev = cur;
    }
    // After 80 eased steps it has closed most of the gap.
    expect(prev).toBeGreaterThan(target * 0.9);
  });

  test('a tower falls monotonically when population drops to zero', () => {
    const ctx = makeCtx('ultra', 10000);
    const scene = ctx.scene;
    const viz = new Viz3DSystem(ctx);
    const high = [9999, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const ledger = makeLedger(TITANS, 0, 0, 0);
    for (let n = 0; n < 80; n++) viz.update(makeSnap(high, ledger)); // settle high
    let prev = towerScaleY(viz, scene, 0);
    for (let n = 0; n < 80; n++) {
      viz.update(makeSnap(ZERO_COUNTS, ledger));
      const cur = towerScaleY(viz, scene, 0);
      expect(cur).toBeLessThanOrEqual(prev + 1e-9); // monotonic non-increasing
      expect(cur).toBeGreaterThanOrEqual(4 - 1e-6); // floors at TOWER_H_MIN
      prev = cur;
    }
  });
});

describe('war network draw range', () => {
  /** Find the LineSegments under the scene and return its draw count. */
  function netDrawCount(scene: THREE.Scene): number {
    let count = 0;
    scene.traverse((o) => {
      const seg = o as THREE.LineSegments;
      if (seg.isLineSegments) count = seg.geometry.drawRange.count;
    });
    return count;
  }

  test('all-truce matrix draws no war-network segments', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    const ledger = makeLedger(TITANS, 300, 300, 0);
    for (let n = 0; n < NET_CADENCE; n++) viz.update(makeSnap(ZERO_COUNTS, ledger));
    expect(netDrawCount(ctx.scene)).toBe(0);
  });

  test('a single war pair draws exactly one segment (2 vertices)', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    const wm = truceMatrix();
    wm[1] = 2; // titans 0 & 1 at war (REL_WAR): row 0, col 1
    wm[TITANS] = 2; // symmetric: row 1, col 0
    const ledger = makeLedger(TITANS, 300, 300, 1);
    for (let n = 0; n < NET_CADENCE; n++) viz.update(makeSnap(ZERO_COUNTS, ledger, wm));
    expect(netDrawCount(ctx.scene)).toBe(2);
  });

  test('a fully embattled matrix draws all 45 pairs (90 vertices)', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    const wm = truceMatrix();
    for (let i = 0; i < TITANS; i++) {
      for (let j = 0; j < TITANS; j++) if (i !== j) wm[i * TITANS + j] = 2;
    }
    const ledger = makeLedger(TITANS, 300, 300, 9);
    for (let n = 0; n < NET_CADENCE; n++) viz.update(makeSnap(ZERO_COUNTS, ledger, wm));
    expect(netDrawCount(ctx.scene)).toBe(PAIR_COUNT * 2);
  });
});

describe('cadence', () => {
  test('the network only rebuilds on the NET_CADENCE-th update', () => {
    const ctx = makeCtx('ultra', 10000);
    const viz = new Viz3DSystem(ctx);
    let segs: THREE.LineSegments | null = null;
    ctx.scene.traverse((o) => {
      const s = o as THREE.LineSegments;
      if (s.isLineSegments) segs = s;
    });
    expect(segs).not.toBeNull();
    const wm = truceMatrix();
    wm[1] = 2; // titans 0 & 1 at war
    wm[TITANS] = 2;
    const ledger = makeLedger(TITANS, 300, 300, 1);
    // Before the cadence elapses, the network is still empty (draw range 0).
    for (let n = 0; n < NET_CADENCE - 1; n++) viz.update(makeSnap(ZERO_COUNTS, ledger, wm));
    const seg = segs as unknown as THREE.LineSegments;
    expect(seg.geometry.drawRange.count).toBe(0);
    viz.update(makeSnap(ZERO_COUNTS, ledger, wm)); // the NET_CADENCE-th call
    expect(seg.geometry.drawRange.count).toBe(2);
  });
});
