/**
 * Constellation sky-web (V2). A Voronoi diagram + Delaunay triangulation over the 24
 * static monolith and diorama XZ sites, hung as faint additive LineSegments at y≈55:
 * Voronoi cell walls partition the sky into named sub-sectors, Delaunay edges link the
 * sites like constellation lines. ALL geometry is built once in the constructor
 * (O(n log n) over n = 24 sites, never rebuilt, never disposed); the per-frame update is
 * O(1) — two material-opacity writes pulsed by audio treble and chaos.
 */
import * as THREE from 'three';
import { Delaunay } from 'd3-delaunay';
import type { Voronoi } from 'd3-delaunay';
import type { AudioBands } from '../audio/analysis';
import { clamp } from '../math/scalar';
import type { SimContext, SimState } from '../types';
import { ARENA, ARENA_Y, CHAOS_MAX, DIORAMA_CONFIG, MONOLITH_CONFIG } from './constants';
import type { LoreEngine } from './lore';

/** Altitude of the sky-web plane (legacy 55 × ARENA_Y — above the doubled skyline). */
const SKY_Y = 55 * ARENA_Y;
/** Voronoi clip-bounds padding around the site extent (legacy 30 × ARENA). */
const BOUNDS_PAD = 30 * ARENA;
/** Resting opacity of the Voronoi cell walls (silent, chaos-calm baseline). */
const CELL_BASE_OPACITY = 0.1;
/** Resting opacity of the Delaunay site links. */
const LINK_BASE_OPACITY = 0.16;
/** Coordinate quantization for edge-dedup keys (1/100 world unit). */
const KEY_SCALE = 100;

/** The 24 sky-web sites: monolith (x, z) then diorama (x, z). Construction-time only. */
function collectSites(): Delaunay.Point[] {
  const pts: Delaunay.Point[] = [];
  for (const m of MONOLITH_CONFIG) pts.push([m[0], m[1]]);
  for (const d of DIORAMA_CONFIG) pts.push([d[0], d[2]]);
  return pts;
}

/**
 * Flatten the Voronoi cell walls into LineSegments positions (x, SKY_Y, z per vertex).
 * Shared walls between neighboring cells are deduplicated via quantized endpoint keys so
 * additive blending does not double-brighten them. O(n · v) construction-time.
 */
function buildCellWalls(voronoi: Voronoi<Delaunay.Point>, siteCount: number): number[] {
  const out: number[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < siteCount; i++) {
    // d3-delaunay returns null for degenerate cells despite its typings — trust nothing.
    const poly: Delaunay.Polygon | null = voronoi.cellPolygon(i);
    if (!poly) continue;
    for (let j = 1; j < poly.length; j++) {
      const a = poly[j - 1];
      const b = poly[j];
      if (!a || !b) continue;
      const ka = `${Math.round(a[0] * KEY_SCALE)},${Math.round(a[1] * KEY_SCALE)}`;
      const kb = `${Math.round(b[0] * KEY_SCALE)},${Math.round(b[1] * KEY_SCALE)}`;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a[0], SKY_Y, a[1], b[0], SKY_Y, b[1]);
    }
  }
  return out;
}

/**
 * Flatten the Delaunay edges (site-to-site constellation links) into LineSegments
 * positions. Each edge is emitted once: a halfedge is kept when its twin has a smaller
 * index (hull halfedges have twin -1, so they always pass). O(triangles) construction-time.
 */
function buildSiteLinks(delaunay: Delaunay<Delaunay.Point>): number[] {
  const { halfedges, triangles, points } = delaunay;
  const out: number[] = [];
  for (let e = 0; e < triangles.length; e++) {
    const twin = halfedges[e] ?? -1;
    if (e <= twin) continue;
    const next = e % 3 === 2 ? e - 2 : e + 1;
    const p = (triangles[e] ?? 0) * 2;
    const q = (triangles[next] ?? 0) * 2;
    out.push(points[p] ?? 0, SKY_Y, points[p + 1] ?? 0, points[q] ?? 0, SKY_Y, points[q + 1] ?? 0);
  }
  return out;
}

/** Faint additive line material shared by both layers. Construction-time only. */
function skyLineMaterial(hue: number, lightness: number, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, lightness),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Owns the constellation sky-web. Reads chaos from `SimState` and audio treble from the
 * injected bands (a WRITE from the audio system into the cosmos layer), and writes named
 * sub-sectors back out through {@link subSectorAt} for the HUD/telemetry lore line.
 */
export class ConstellationSystem {
  private readonly state: SimState;
  private readonly lore: LoreEngine;
  private readonly delaunay: Delaunay<Delaunay.Point>;
  private readonly cellMat: THREE.LineBasicMaterial;
  private readonly linkMat: THREE.LineBasicMaterial;
  /** Retained so world teardown / HMR can free the two line-layer geometries + unparent the group
   *  (was a local const → the geometries + scene Group leaked on every World reconstruction). */
  private readonly group: THREE.Group;
  /** Warm-start index for `delaunay.find` — coherent camera paths make lookups ~O(1). */
  private lastCell = 0;

  /** Builds both line layers ONCE and adds them to the scene. O(n log n), n = 24 sites. */
  constructor(ctx: SimContext, lore: LoreEngine) {
    this.state = ctx.state;
    this.lore = lore;

    const sites = collectSites();
    this.delaunay = Delaunay.from(sites);

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of sites) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const voronoi = this.delaunay.voronoi([
      minX - BOUNDS_PAD,
      minZ - BOUNDS_PAD,
      maxX + BOUNDS_PAD,
      maxZ + BOUNDS_PAD,
    ]);

    this.cellMat = skyLineMaterial(0.52, 0.55, CELL_BASE_OPACITY);
    const cellGeo = new THREE.BufferGeometry();
    cellGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(buildCellWalls(voronoi, sites.length), 3),
    );
    const cells = new THREE.LineSegments(cellGeo, this.cellMat);
    cells.name = 'constellation-cells';

    this.linkMat = skyLineMaterial(0.58, 0.62, LINK_BASE_OPACITY);
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(buildSiteLinks(this.delaunay), 3),
    );
    const links = new THREE.LineSegments(linkGeo, this.linkMat);
    links.name = 'constellation-links';

    this.group = new THREE.Group();
    this.group.name = 'constellations';
    this.group.add(cells, links);
    ctx.scene.add(this.group);
  }

  /** Free the two line-layer geometries + shared materials and unparent the group (HMR / world teardown).
   *  Mirrors the sibling CosmicWeb.dispose() — same 2-geometry/2-material footprint. */
  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.LineSegments) o.geometry.dispose();
    });
    this.cellMat.dispose();
    this.linkMat.dispose();
    this.group.removeFromParent();
  }

  /**
   * Per-frame pulse: cell walls and site links breathe in counter-phase at a rate set by
   * chaos, with the audio-treble multiplier capped at ×0.35 so a silent world matches the
   * resting baseline. O(1), allocation-free — two scalar material writes.
   */
  update(t: number, bands: AudioBands): void {
    const chaosN = this.state.chaos / CHAOS_MAX;
    const wave = 0.5 + 0.5 * Math.sin(t * (0.4 + chaosN));
    const audio = 1 + 0.35 * bands.treble;
    this.cellMat.opacity = clamp(CELL_BASE_OPACITY * (0.8 + 0.5 * chaosN * wave) * audio, 0, 0.4);
    this.linkMat.opacity = clamp(
      LINK_BASE_OPACITY * (0.8 + 0.5 * chaosN * (1 - wave)) * audio,
      0,
      0.5,
    );
  }

  /**
   * Lore name of the Voronoi sub-sector containing `pos` (XZ projection).
   * `delaunay.find` warm-started from the previous hit — amortized ~O(1) for coherent
   * camera motion, O(√n) worst case over n = 24 sites; the lore lookup is memoized.
   */
  subSectorAt(pos: THREE.Vector3): string {
    const cell = this.delaunay.find(pos.x, pos.z, this.lastCell);
    if (cell >= 0) this.lastCell = cell;
    return this.lore.name('sector', this.lastCell);
  }
}
