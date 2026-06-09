/**
 * Connectome — the neural-net LineSegments layer. Every update it rebuilds entity-to-entity
 * links via spatial-grid neighbor queries, propagates activation along each link, and paints
 * link colors from the combined neural weight. Faithful port of legacy lines 441-447 + 798-821
 * with the Known Bug 13 fix: only the populated link range is uploaded to the GPU.
 */
import * as THREE from 'three';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';

/** Grid query radius for link candidates (legacy `SG.query(..., 8)`). */
const LINK_RADIUS = 8;
/** Squared link reach — 8^2 (legacy threshold 64). */
const LINK_REACH2 = 64;

// Module-level scratch color — reused for every link (keeps update() allocation-free).
const TMP_COLOR = new THREE.Color();

/**
 * Owns the connectome LineSegments. The caller decides rebuild cadence (legacy gated by
 * entity count: every 1/2/3 frames); each `update()` call performs one full rebuild.
 */
export class Connectome {
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  /** Link capacity (quality.maxLinks; legacy MNN: 2200 mobile / 4000 desktop). */
  private readonly maxLinks: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly geo: THREE.BufferGeometry;
  private linkCount = 0;

  /** Allocates the link buffers and adds the LineSegments to the scene (legacy 441-447). */
  constructor(ctx: SimContext, entities: EntityManager) {
    this.ctx = ctx;
    this.entities = entities;
    this.maxLinks = ctx.quality.maxLinks;
    this.positions = new Float32Array(this.maxLinks * 6);
    this.colors = new Float32Array(this.maxLinks * 6);
    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setDrawRange(0, 0);
    ctx.scene.add(
      new THREE.LineSegments(
        this.geo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        }),
      ),
    );
  }

  /** Links built by the last update (legacy `connLinks`, telemetry #v3 + sparkline #g3). */
  get links(): number {
    return this.linkCount;
  }

  /**
   * Rebuild links from scratch (legacy 798-821): every 2nd entity queries the grid for
   * neighbors within 8u; pairs closer than 8 get a segment, activation propagation
   * (`eb.act += ea.act * nw * 0.01`), and an HSL color from the pair's mean neural weight.
   * O(n·k) where n = entities (stride 2) and k = neighbors per query; allocation-free
   * (the grid query's shared buffer is consumed before the next query).
   */
  update(_dt: number, t: number): void {
    const grid = this.ctx.grid;
    const list = this.entities.list;
    const pos = this.positions;
    const col = this.colors;
    const max = this.maxLinks;
    let wI = 0;
    for (let ni = 0; ni < list.length && wI < max; ni += 2) {
      const ea = list[ni];
      if (!ea) continue; // noUncheckedIndexedAccess: ni < length
      const ap = ea.position;
      const nearby = grid.query(ap.x, ap.z, LINK_RADIUS);
      for (let nj = 0; nj < nearby.length && wI < max; nj++) {
        const eb = nearby[nj];
        if (!eb || eb === ea) continue; // noUncheckedIndexedAccess guard + self-link skip
        const bp = eb.position;
        const dx = ap.x - bp.x;
        const dy = ap.y - bp.y;
        const dz = ap.z - bp.z;
        const nd2 = dx * dx + dy * dy + dz * dz;
        if (nd2 < LINK_REACH2) {
          const nd = Math.sqrt(nd2);
          const idx = wI * 6;
          pos[idx] = ap.x;
          pos[idx + 1] = ap.y;
          pos[idx + 2] = ap.z;
          pos[idx + 3] = bp.x;
          pos[idx + 4] = bp.y;
          pos[idx + 5] = bp.z;
          const nI = 1 - nd * 0.125;
          const nw = (ea.userData.nW + eb.userData.nW) * 0.5;
          eb.userData.act += ea.userData.act * nw * 0.01;
          TMP_COLOR.setHSL((t * 0.04 + nw * 0.5) % 1, 0.75, 0.25 + nI * 0.45);
          col[idx] = TMP_COLOR.r;
          col[idx + 1] = TMP_COLOR.g;
          col[idx + 2] = TMP_COLOR.b;
          col[idx + 3] = TMP_COLOR.r;
          col[idx + 4] = TMP_COLOR.g;
          col[idx + 5] = TMP_COLOR.b;
          wI++;
        }
      }
    }
    this.linkCount = wI;
    if (wI > 0) {
      // Known Bug 13 fix: upload only the populated segment range, not all maxLinks*6 floats.
      this.posAttr.clearUpdateRanges();
      this.posAttr.addUpdateRange(0, wI * 6);
      this.posAttr.needsUpdate = true;
      this.colAttr.clearUpdateRanges();
      this.colAttr.addUpdateRange(0, wI * 6);
      this.colAttr.needsUpdate = true;
    }
    this.geo.setDrawRange(0, wI * 2);
  }
}
