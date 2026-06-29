/**
 * VIZ3D (CONTRACTS V4.2, XENOGENESIS) — floating holographic data sculptures: the in-scene
 * "3D analytics" instrument panel for the gods, hovering far above the arena floor.
 *
 * Three real-geometry rings, built once and animated by mutating only scales/colors/positions
 * (never reallocating):
 *
 * - **Phylum population towers** — 10 emissive bars in an inner ring. Each bar's height tracks
 *   the smoothed live count of its phylum (log-compressed so a 10000-entity ultra run and a
 *   650-entity phone run both read). Additive blending makes them glow as holograms.
 * - **Titan economy obelisks** — 10 translucent six-sided prisms in an outer ring. Height tracks
 *   smoothed `matter`, emissive glow tracks `energy`, and hue shifts toward war-red as the
 *   titan's `war` count rises (peaceful titans keep their identity hue).
 * - **War network** — up to C(10,2)=45 line segments between obelisk tops, colored and faded by
 *   the pairwise `warMatrix` state (truce ⇒ hidden, alliance ⇒ cool teal, war ⇒ hot red).
 *
 * Determinism: placement is pure trigonometry of the loop index — the constructor draws ZERO
 * `ctx.rng` samples, so the integrator may place its construction anywhere in the boot stream
 * without shifting any other system's seed alignment.
 *
 * Performance: `update(snapshot)` smooths the towers every call (cheap O(phyla)) but recomputes
 * the heavier obelisk colors and the war-network geometry only on a slow internal cadence
 * ({@link NET_CADENCE} calls), keeping the per-frame cost flat. Allocation-free throughout:
 * every Vector3/Color used by the hot path is a module-level scratch or a per-mesh field.
 */
import * as THREE from 'three';
import { TAU, clamp, lerp } from '../math/scalar';
import { applyVizBenchmarks } from './viz-benchmarks';
import { ARENA_RADIUS } from './constants';
import type { SimContext } from '../types';

/** Phylum count — fixed at 10 (CONTRACTS V3.2); the tower ring is sized for exactly this. */
const PHYLA = 10;
/** Titan count — fixed at 10 (CONTRACTS V3.3); obelisk ring + war matrix are sized for this. */
const TITANS = 10;
/** Unordered titan pairs: C(10, 2) = 45 — the war-network segment budget. */
const PAIR_COUNT = (TITANS * (TITANS - 1)) / 2;

/** War-matrix cell states (mirror of titans.ts REL_*). */
const REL_TRUCE = 0;
const REL_ALLIANCE = 1;
const REL_WAR = 2;

/**
 * Altitude of the whole instrument panel above the arena floor — high enough to read as a
 * separate "heads-up display for the gods" layer, well clear of the ~90u titan roam ceiling.
 */
const PANEL_Y = 220;
/** Radius of the inner phylum-tower ring (XZ). Inside the obelisk ring, both above the field. */
const TOWER_RING_R = ARENA_RADIUS * 0.34;
/** Radius of the outer titan-obelisk ring (XZ). */
const OBELISK_RING_R = ARENA_RADIUS * 0.52;

/** Tower geometry footprint (unit box scaled in Y to the data height). */
const TOWER_SIDE = 7;
/** Tower height envelope: a phylum at full log-scale climbs from MIN to MIN+SPAN. */
const TOWER_H_MIN = 4;
const TOWER_H_SPAN = 90;
/** Log compression: `log1p(count) / LOG_REF` maps a healthy population to ~1. log1p(1100)≈7. */
const TOWER_LOG_REF = 7;

/** Obelisk geometry: a thin six-sided prism (radius, unit height pre-scale). */
const OBELISK_R = 5;
const OBELISK_SEG = 6;
/** Obelisk height envelope from titan `matter` (0..RESOURCE_CAP≈1000). */
const OBELISK_H_MIN = 6;
const OBELISK_H_SPAN = 70;
const RESOURCE_REF = 1000;

/** Per-call smoothing factor toward the target height (exponential approach, 0<α<1). */
const SMOOTH = 0.12;
/** Frames/calls between heavy obelisk-color + war-network rebuilds (towers smooth every call). */
const NET_CADENCE = 6;

/** War-network opacity per relation state, indexed by REL_*. Truce is invisible. */
const REL_OPACITY = [0, 0.28, 0.7] as const;

// Module-level scratch — reused every update, never retained.
const TMP_COLOR = new THREE.Color();

/** Pair index tables: pair p ⇔ (PAIR_A[p], PAIR_B[p]), i < j, row-major enumeration. */
const PAIR_A = new Uint8Array(PAIR_COUNT);
const PAIR_B = new Uint8Array(PAIR_COUNT);
{
  let p = 0;
  for (let i = 0; i < TITANS; i++) {
    for (let j = i + 1; j < TITANS; j++) {
      PAIR_A[p] = i;
      PAIR_B[p] = j;
      p++;
    }
  }
}

/**
 * One titan economy row consumed by {@link Viz3DSystem.update}. STRUCTURAL twin of the ui /
 * telemetry `TitanLedger` (and sim/titans `TitanLedgerEntry`) — redefined locally so this sim
 * module never imports `src/ui`. Only the numeric economy fields are read.
 */
export interface Viz3DLedgerRow {
  name: string;
  energy: number;
  matter: number;
  entropy: number;
  /** Number of rivals this titan is at war with (0..9) — drives obelisk hue + the network. */
  war: number;
}

/**
 * Read-only structural snapshot consumed each frame. A subset of the integrator's observatory /
 * telemetry snapshot (defined LOCALLY per contract — do NOT import ui). All three members are
 * REUSED upstream buffers: this system reads them within the call and retains nothing.
 */
export interface Viz3DSnapshot {
  /** Live population per phylum (length ≥ {@link PHYLA}; extra entries ignored). */
  phylumCounts: ArrayLike<number>;
  /** Titan economy rows (length ≥ {@link TITANS}; extra entries ignored). */
  ledger: ArrayLike<Viz3DLedgerRow>;
  /** 10×10 row-major titan relation matrix: 0 truce, 1 alliance, 2 war. */
  warMatrix: ArrayLike<number>;
}

/** Internal per-tower record (boot-time allocation only). */
interface Tower {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  /** Smoothed height, eased toward the data-derived target each update. */
  h: number;
  hue: number;
}

/** Internal per-obelisk record (boot-time allocation only). */
interface Obelisk {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  /** Smoothed height (matter), eased each heavy cadence. */
  h: number;
  /** XZ ring position (top-of-prism world coords cached for the war network). */
  x: number;
  z: number;
  hue: number;
}

/**
 * Owns the three sculpture rings. Construct ONCE in world.ts after the titans exist (so the
 * snapshot the integrator already builds for telemetry/observatory is available), and call
 * {@link update} every frame with that same snapshot. Heavy work is internally cadenced, so the
 * caller need not throttle. Draws no `ctx.rng` samples at construction (placement is index-pure).
 */
export class Viz3DSystem {
  /** True on the phone tier: half the phylum towers are built/drawn to spare fill rate. */
  readonly lowDetail: boolean;

  private readonly towers: Tower[] = [];
  private readonly obelisks: Obelisk[] = [];
  /** Active tower count: {@link PHYLA} normally, halved on {@link lowDetail}. */
  private readonly towerCount: number;

  // War-network LineSegments: one segment per titan pair, positions rewritten on cadence.
  private readonly netPositions: Float32Array;
  private readonly netColors: Float32Array;
  private readonly netPosAttr: THREE.BufferAttribute;
  private readonly netColAttr: THREE.BufferAttribute;
  private readonly netGeo: THREE.BufferGeometry;
  private readonly netMat: THREE.LineBasicMaterial;

  /** Heavy-cadence phase counter (towers smooth every call; obelisks/network every NET_CADENCE). */
  private tick = 0;

  /**
   * Builds the floating panel: a root group at altitude {@link PANEL_Y}, the phylum-tower ring,
   * the titan-obelisk ring, and the war-network LineSegments. All meshes share two small cached
   * geometries (unit box / unit prism) scaled per instance. O(phyla + titans + pairs); boot-time
   * allocation only.
   */
  constructor(ctx: SimContext) {
    // Phone tier (650-entity legacy mesh path) halves the tower count; derive from maxEntities
    // since there is no dedicated low-detail flag on QualityProfile.
    this.lowDetail = ctx.quality.maxEntities <= 650;
    this.towerCount = this.lowDetail ? PHYLA / 2 : PHYLA;

    const root = new THREE.Group();
    root.position.y = PANEL_Y;
    ctx.scene.add(root);

    // Shared unit geometries — scaled per mesh; never mutated after construction.
    const towerGeo = new THREE.BoxGeometry(TOWER_SIDE, 1, TOWER_SIDE);
    towerGeo.translate(0, 0.5, 0); // anchor base at y=0 so Y-scale grows upward
    const obeliskGeo = new THREE.CylinderGeometry(OBELISK_R * 0.5, OBELISK_R, 1, OBELISK_SEG);
    obeliskGeo.translate(0, 0.5, 0);

    this.buildTowers(root, towerGeo);
    this.buildObelisks(root, obeliskGeo);

    // War network — PAIR_COUNT segments (2 verts × 3 floats each). Drawn additively, faded per
    // relation; only the populated/visible range is uploaded each cadence (Known Bug 13 pattern).
    this.netPositions = new Float32Array(PAIR_COUNT * 6);
    this.netColors = new Float32Array(PAIR_COUNT * 6);
    this.netGeo = new THREE.BufferGeometry();
    this.netPosAttr = new THREE.BufferAttribute(this.netPositions, 3);
    this.netColAttr = new THREE.BufferAttribute(this.netColors, 3);
    this.netGeo.setAttribute('position', this.netPosAttr);
    this.netGeo.setAttribute('color', this.netColAttr);
    this.netGeo.setDrawRange(0, 0);
    this.netMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    root.add(new THREE.LineSegments(this.netGeo, this.netMat));
  }

  /** Active phylum-tower count (test/telemetry hook). 10, or 5 on {@link lowDetail}. O(1). */
  get towersBuilt(): number {
    return this.towers.length;
  }

  /** Active titan-obelisk count (always {@link TITANS}). O(1). */
  get obelisksBuilt(): number {
    return this.obelisks.length;
  }

  /**
   * Per-frame advance. Smooths every tower height toward its phylum's (log-scaled) population
   * each call; on the {@link NET_CADENCE} cadence it additionally re-eases the obelisk heights,
   * repaints obelisk glow/hue from the ledger, and rebuilds the war-network segments from
   * `warMatrix`. Allocation-free: only scratch color/number state is touched.
   *
   * O(phyla) every call + O(titans + pairs) every {@link NET_CADENCE}-th call.
   *
   * @param snap Structural snapshot (REUSED upstream buffers — read, never retained).
   */
  update(snap: Viz3DSnapshot): void {
    this.updateTowers(snap.phylumCounts);
    this.tick++;
    if (this.tick >= NET_CADENCE) {
      this.tick = 0;
      this.updateObelisks(snap.ledger);
      this.updateNetwork(snap.warMatrix);
    }
  }

  /** Boot-time tower factory: a ring of additive emissive bars, one per active phylum. */
  private buildTowers(root: THREE.Object3D, geo: THREE.BufferGeometry): void {
    for (let i = 0; i < this.towerCount; i++) {
      const hue = i / PHYLA; // hue keyed to phylum identity across the full 10-slot wheel
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.8, 0.5),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / this.towerCount) * TAU;
      mesh.position.set(Math.cos(a) * TOWER_RING_R, 0, Math.sin(a) * TOWER_RING_R);
      mesh.scale.set(1, TOWER_H_MIN, 1);
      root.add(mesh);
      this.towers.push({ mesh, mat, h: TOWER_H_MIN, hue });
    }
  }

  /** Boot-time obelisk factory: a ring of translucent emissive prisms, one per titan. */
  private buildObelisks(root: THREE.Object3D, geo: THREE.BufferGeometry): void {
    for (let i = 0; i < TITANS; i++) {
      const hue = i / TITANS;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.5, 0.4),
        emissive: new THREE.Color().setHSL(hue, 0.9, 0.4),
        emissiveIntensity: 1,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });

      // Apply mega-report visual benchmark (25-suite) — obelisk i maps to benchmark i mod 25
      applyVizBenchmarks(mat, i);

      const a = (i / TITANS) * TAU + 0.31; // offset so obelisks interleave with the inner towers
      const x = Math.cos(a) * OBELISK_RING_R;
      const z = Math.sin(a) * OBELISK_RING_R;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0, z);
      mesh.scale.set(1, OBELISK_H_MIN, 1);
      root.add(mesh);
      this.obelisks.push({ mesh, mat, h: OBELISK_H_MIN, x, z, hue });
    }
  }

  /**
   * Ease each tower toward its phylum's target height. Target is a log-compressed count so the
   * 16× span between phone and ultra populations stays legible. O(towerCount), allocation-free.
   */
  private updateTowers(counts: ArrayLike<number>): void {
    for (let i = 0; i < this.towers.length; i++) {
      const tw = this.towers[i];
      if (!tw) continue; // invariant: dense array
      const raw = counts[i];
      const c = Number.isFinite(raw) && raw !== undefined && raw > 0 ? raw : 0;
      const norm = clamp(Math.log1p(c) / TOWER_LOG_REF, 0, 1);
      const target = TOWER_H_MIN + norm * TOWER_H_SPAN;
      tw.h = lerp(tw.h, target, SMOOTH);
      tw.mesh.scale.y = tw.h;
      // Subtle brightness pulse with fill: taller = brighter hologram.
      tw.mat.opacity = 0.4 + 0.35 * norm;
    }
  }

  /**
   * Ease obelisk heights toward `matter` and repaint glow (`energy`) and hue (war state). A
   * titan at war is pulled toward war-red proportionally to its war count; a peaceful titan
   * keeps its identity hue. O(titans), allocation-free (TMP_COLOR scratch only).
   */
  private updateObelisks(ledger: ArrayLike<Viz3DLedgerRow>): void {
    for (let i = 0; i < this.obelisks.length; i++) {
      const ob = this.obelisks[i];
      const row = ledger[i];
      if (!ob || !row) continue; // invariant: dense ring; snapshot length ≥ TITANS
      const matter = Number.isFinite(row.matter) ? clamp(row.matter, 0, RESOURCE_REF) : 0;
      const energy = Number.isFinite(row.energy) ? clamp(row.energy, 0, RESOURCE_REF) : 0;
      const war = Number.isFinite(row.war) ? clamp(row.war, 0, TITANS - 1) : 0;

      const target = OBELISK_H_MIN + (matter / RESOURCE_REF) * OBELISK_H_SPAN;
      // Tower smoothing runs every frame; obelisks ease on the slow cadence — widen α to keep a
      // comparable settling time despite the longer step.
      ob.h = lerp(ob.h, target, SMOOTH * NET_CADENCE * 0.5);
      ob.mesh.scale.y = ob.h;

      const warN = war / (TITANS - 1); // 0 peaceful .. 1 fully embattled
      const hue = lerp(ob.hue, 0.015, warN); // drift toward red as wars mount
      const lum = 0.3 + 0.2 * (energy / RESOURCE_REF);
      ob.mat.color.setHSL(hue, 0.55, lum);
      ob.mat.emissive.setHSL(hue, 0.9, 0.3 + 0.2 * warN);
      ob.mat.emissiveIntensity = 0.6 + 1.6 * (energy / RESOURCE_REF);
    }
  }

  /**
   * Rebuild the war-network segments: one line per titan pair, from obelisk top to obelisk top,
   * colored and faded by the pair's `warMatrix` relation (truce hidden, alliance teal, war red).
   * Only the visible (non-truce) segments are written; the draw range covers all written verts.
   * Uploads only the populated range (Known Bug 13 pattern). O(pairs), allocation-free.
   */
  private updateNetwork(warMatrix: ArrayLike<number>): void {
    const pos = this.netPositions;
    const col = this.netColors;
    let w = 0;
    let maxOpacity = 0;
    for (let p = 0; p < PAIR_COUNT; p++) {
      const i = PAIR_A[p] ?? 0;
      const j = PAIR_B[p] ?? 0;
      const a = this.obelisks[i];
      const b = this.obelisks[j];
      if (!a || !b) continue; // invariant: obelisk ring is dense (length TITANS)
      const relRaw = warMatrix[i * TITANS + j];
      const rel = relRaw === REL_ALLIANCE || relRaw === REL_WAR ? relRaw : REL_TRUCE;
      if (rel === REL_TRUCE) continue; // truce links stay hidden — keeps the panel readable
      const op = REL_OPACITY[rel] ?? 0;
      if (op > maxOpacity) maxOpacity = op;
      // War ⇒ hot red, alliance ⇒ cool teal. Brightness scaled by the relation opacity.
      if (rel === REL_WAR) TMP_COLOR.setHSL(0.015, 0.95, 0.5);
      else TMP_COLOR.setHSL(0.5, 0.8, 0.45);
      const o = w * 6;
      pos[o] = a.x;
      pos[o + 1] = a.h;
      pos[o + 2] = a.z;
      pos[o + 3] = b.x;
      pos[o + 4] = b.h;
      pos[o + 5] = b.z;
      col[o] = TMP_COLOR.r * op;
      col[o + 1] = TMP_COLOR.g * op;
      col[o + 2] = TMP_COLOR.b * op;
      col[o + 3] = TMP_COLOR.r * op;
      col[o + 4] = TMP_COLOR.g * op;
      col[o + 5] = TMP_COLOR.b * op;
      w++;
    }
    if (w > 0) {
      this.netPosAttr.clearUpdateRanges();
      this.netPosAttr.addUpdateRange(0, w * 6);
      this.netPosAttr.needsUpdate = true;
      this.netColAttr.clearUpdateRanges();
      this.netColAttr.addUpdateRange(0, w * 6);
      this.netColAttr.needsUpdate = true;
    }
    this.netMat.opacity = maxOpacity > 0 ? maxOpacity : 0.6;
    this.netGeo.setDrawRange(0, w * 2);
  }
}
