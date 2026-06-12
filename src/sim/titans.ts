/**
 * TITANS (CONTRACTS V3.3) — 10 colossal roaming intelligences running a global economy and
 * waging game-theoretic war over the cosmos.
 *
 * Each titan is a scaled shoggoth-class rig (distinct silhouette composited from the shared
 * geometry cache + one PointLight, decay 0) holding an economy state {energy, matter, entropy}:
 * it PRODUCES by harvesting organisms (`entities.disposeAt`), witnessing quantum collapses
 * (`onCollapseWitness`) and bathing in reaction-diffusion pattern density (`feedEntropy`);
 * CONSUMES size-scaled upkeep per economy tick; and WASTES entropy as ground scars exposed
 * through `wantsPerturb` / `drainPerturb` (routed to the injected rd facade).
 *
 * Diplomacy is an iterated prisoner's dilemma over all 45 unordered pairs, STAGGERED so at
 * most one pair plays (and one separate pair strike-checks) per frame — full matrix coverage
 * every 600-frame cycle with no frame spike. Recent-window defection counts derive the pair
 * relation (TRUCE/ALLIANCE/WAR); WAR acts on the half-cycle offset cadence as territory
 * strikes (burst + scatter near the rival plus conscription remorphs). Payoffs couple to the
 * actual energy ledger (zero-line at the matrix mean), and bankruptcy mutates the titan's
 * strategy via replicator dynamics over the 5-strategy population.
 *
 * Determinism: ctx.rng is drawn ONLY on frame cadences (boot, economy ticks, diplomacy slots,
 * strike slots), so the SEEDED DECISION stream (which strategy, which victim band, which war
 * fires) is reproducible per-tick. The roam integration itself is stateful Euler with a
 * per-frame `vel *= 0.985` damp and dt-scaled impulses (legacy-parity physics), so the exact
 * titan TRAJECTORY — and thus which entities a harvest/strike happens to catch — is
 * reproducible given an identical dt sequence (the fixed-timestep contract of ADR 0004), not
 * across arbitrary frame-rate jitter. Same seed + same dt stream ⇒ same cosmos. Hot path is
 * allocation-free (module scratch vectors; ledger entries and the perturb request are REUSED
 * objects).
 */
import * as THREE from 'three';
import { TAU, clamp, dist2XZ } from '../math/scalar';
import { ARENA_RADIUS, GROUND_EXTENT } from './constants';
import {
  HISTORY_WINDOW,
  PRISONERS_DILEMMA,
  STRATEGIES,
  createHistory,
  defections,
  meanPayoff,
  playRound,
  pushHistory,
  replicatorStep,
} from '../math/games';
import type { PairHistory } from '../math/games';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';

/** Number of titans (fixed — the war matrix and pair tables are sized for exactly 10). */
const TITAN_COUNT = 10;
/** Unordered titan pairs: C(10, 2). */
const PAIR_COUNT = 45;

/** Roam containment radius (±300 per the V3.3 spec; ARENA_RADIUS keeps a 25u margin). */
const ROAM_RADIUS = ARENA_RADIUS - 25;
const ROAM_RADIUS2 = ROAM_RADIUS * ROAM_RADIUS;
/**
 * Colossal-scale multiplier on the silhouette size (V3.6 integration): the drafted rigs
 * were authored against the 1× world; ×3 lifts them to 40-60u against 100-220u monoliths.
 */
const COLOSSAL = 3;
/**
 * Local light gain for the per-titan PointLight (decay 0). environment.ts was being reworked
 * by the audit swarm at write time, so this is NOT calibrated against the final light rig —
 * integrator: nudge this single constant against the ambient/key lights (target: a titan
 * reads as a glow source at ~80u without blowing out the ground).
 */
const TITAN_LIGHT_GAIN = 6;

/** Frames between economy ticks per titan; titan `i` ticks at `frame % 90 === i * 9`. */
const ECON_PERIOD = 90;
const ECON_STAGGER = ECON_PERIOD / TITAN_COUNT;
/** Diplomacy cycle length; pair `p` plays at `frame % 600 === p * 13` (45·13 = 585 < 600). */
const DIPLO_PERIOD = 600;
const DIPLO_STRIDE = 13;

/** Hard cap on every economy resource (overflow seal). */
const RESOURCE_CAP = 1000;
/** Harvest reach in the XZ plane (squared) and per-tick limits. */
const HARVEST_REACH2 = 20 * 20;
const HARVEST_MAX = 3;
/** Never graze the population below this count (mirrors the shoggoth feeding guard). */
const HARVEST_MIN_POPULATION = 60;
const MATTER_PER_ENTITY = 4;
/** Matter→energy conversion per economy tick. */
const METABOLIZE_RATE = 6;
const METABOLIZE_EFF = 0.8;
/** Upkeep per economy tick: base + size-scaled term (CONSUME). */
const UPKEEP_BASE = 0.9;
const UPKEEP_PER_SIZE = 0.55;
/** Entropy accrual / relief / waste-scar parameters (WASTE). */
const ENTROPY_PER_TICK = 2.2;
const ENTROPY_PER_HARVEST = 1.5;
const ENTROPY_RELIEF = 8;
const ENTROPY_WASTE_THRESHOLD = 60;
const ENTROPY_WASTE_RETAIN = 0.35;
const WASTE_SCAR_RADIUS = 6;
/** Energy granted per witnessed quantum collapse (PRODUCE). */
const WITNESS_ENERGY = 2.5;

/** Diplomacy payoff→energy coupling: stake grows with the poorer party's wealth. */
const PAYOFF_STAKE_BASE = 0.4;
const PAYOFF_STAKE_SCALE = 0.004;
/** EMA decay for per-strategy fitness fed into the bankruptcy replicator. */
const FITNESS_DECAY = 0.95;
const REPLICATOR_DT = 0.5;
const BANKRUPT_SEED_ENERGY = 25;

/** Territory-strike economics and entity effects. */
const STRIKE_COST = 12;
const RAID_LOSS = 9;
const LOOT_MATTER = 6;
const STRIKE_RADIUS = 18;
const STRIKE_REACH2 = STRIKE_RADIUS * STRIKE_RADIUS;
const SCATTER_KICK = 0.5;
const CONSCRIPT_MAX = 4;
const BURST_COUNT = 5;

/** War-matrix cell states (Uint8Array values). */
export const REL_TRUCE = 0;
export const REL_ALLIANCE = 1;
export const REL_WAR = 2;

/** Geometry-cache indices used by the silhouette compositor (mod-length defensive). */
const GEO_SPHERE = 2;
const GEO_ICO = 5;
const GEO_OCTA = 8;
const GEO_DODE = 13;
const GEO_TORUS_THIN = 15;
const GEO_TORUS_FAT = 16;
const GEO_KNOT = 18;
const GEO_CYL = 28;
const GEO_CONE = 29;
const GEO_BOX = 32;
const GEO_ORGANIC = 38;

// Module-level scratch vectors — reused every frame/event, never retained.
const VA = new THREE.Vector3();
const VB = new THREE.Vector3();

/** Pair index tables: pair p ⇔ (PAIR_A[p], PAIR_B[p]), i < j, row-major enumeration. */
const PAIR_A = new Uint8Array(PAIR_COUNT);
const PAIR_B = new Uint8Array(PAIR_COUNT);
{
  let p = 0;
  for (let i = 0; i < TITAN_COUNT; i++) {
    for (let j = i + 1; j < TITAN_COUNT; j++) {
      PAIR_A[p] = i;
      PAIR_B[p] = j;
      p++;
    }
  }
}

/** Zero line for diplomacy resource flows: payoffs above the matrix mean gain energy. */
const PD_MEAN = meanPayoff(PRISONERS_DILEMMA);

/** One row of the public ledger. REUSED — copy fields if you retain them across frames. */
export interface TitanLedgerEntry {
  name: string;
  energy: number;
  matter: number;
  entropy: number;
  /** Number of rivals this titan is currently at war with (0..9). */
  war: number;
}

/** Structural lore facade (satisfied by `LoreEngine` — methods are bivariant). */
export interface TitanLore {
  name(kind: string, i: number): string;
  epithet(kind: string, key: string): string;
}

/** Structural reaction-diffusion facade (satisfied by `ReactionDiffusionSystem`). */
export interface TitanRd {
  perturb(u: number, v: number, r?: number): void;
}

/** Pending waste-scar request. REUSED — see {@link TitanSystem.drainPerturb}. */
export interface PerturbRequest {
  u: number;
  v: number;
  r: number;
  pending: boolean;
}

/** Internal per-titan record (boot-time allocation only). */
interface Titan {
  group: THREE.Group;
  /** Sub-group holding the silhouette meshes — bobbed vertically each frame. */
  rig: THREE.Group;
  /** Counter-rotating satellite holder (empty for some silhouettes). */
  limbSpin: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  vel: THREE.Vector3;
  ph: number;
  spin: number;
  bobF: number;
  bobA: number;
  /** Silhouette scale factor — drives upkeep and entropy accrual. */
  size: number;
  hue: number;
  name: string;
  epithet: string;
  /** Preferred morphotype base: titan i champions morphs [10i, 10i+5) (phyla alignment). */
  mi: number;
  homeX: number;
  homeZ: number;
  energy: number;
  matter: number;
  entropy: number;
  /** Index into {@link STRATEGIES}. */
  strategy: number;
  warCount: number;
}

/** Derive a pair relation from the recent-window defection counts. O(1). */
function relationOf(h: PairHistory): number {
  const w = h.rounds < HISTORY_WINDOW ? h.rounds : HISTORY_WINDOW;
  if (w === 0) return REL_TRUCE;
  const dA = defections(h.movesA, h.rounds);
  const dB = defections(h.movesB, h.rounds);
  if (dA === 0 && dB === 0 && h.rounds >= 3) return REL_ALLIANCE;
  const half = (w + 1) >> 1;
  if (dA >= half || dB >= half) return REL_WAR;
  return REL_TRUCE;
}

/**
 * Owns the 10 titans: silhouettes, roaming, the {energy, matter, entropy} economy, the
 * staggered pairwise diplomacy, and war strikes. Construct once in world.ts after the
 * EntityManager; call `update(dt, t)` every frame AFTER `ctx.state.frame` is incremented
 * (all cadences key off it), and `drainPerturb()` once per frame after the RD step.
 */
export class TitanSystem {
  /**
   * Latest waste-scar request (REUSED record). The integrator drains it to the rd facade via
   * {@link drainPerturb}; if two waste events land between drains the LATEST wins (scars are
   * cosmetic feedback, not conservation-critical).
   */
  readonly wantsPerturb: PerturbRequest = { u: 0.5, v: 0.5, r: WASTE_SCAR_RADIUS, pending: false };
  /**
   * 10×10 relation matrix, row-major `[i * 10 + j]`: 0 truce, 1 alliance, 2 war. Symmetric,
   * diagonal 0. Mutated in place on diplomacy cadences — treat as read-only outside.
   */
  readonly warMatrix = new Uint8Array(TITAN_COUNT * TITAN_COUNT);

  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  private readonly rd: TitanRd;
  private readonly titans: Titan[] = [];
  /** 45 pair histories, indexed by the PAIR_A/PAIR_B tables. */
  private readonly histories: PairHistory[] = [];
  /** REUSED ledger rows backing the public `ledger` view. */
  private readonly led: TitanLedgerEntry[] = [];
  /** Scratch population shares for the bankruptcy replicator. */
  private readonly shares = new Float64Array(STRATEGIES.length);
  /** EMA payoff fitness per strategy (boots neutral at 1). */
  private readonly stratFitness = new Float64Array(STRATEGIES.length).fill(1);
  /** Last RD pattern density fed by the integrator (0..1). */
  private lastRd = 0;

  /** Builds the 10 colossi (boot-time allocation; ctx.rng draws are boot cadence). */
  constructor(ctx: SimContext, entities: EntityManager, lore: TitanLore, rd: TitanRd) {
    this.ctx = ctx;
    this.entities = entities;
    this.rd = rd;
    const root = new THREE.Group();
    ctx.scene.add(root);
    for (let i = 0; i < TITAN_COUNT; i++) {
      const t = this.buildTitan(i, lore);
      root.add(t.group);
      this.titans.push(t);
      this.led.push({
        name: t.name,
        energy: t.energy,
        matter: t.matter,
        entropy: t.entropy,
        war: 0,
      });
    }
    for (let p = 0; p < PAIR_COUNT; p++) this.histories.push(createHistory());
  }

  /** Number of titans (constant 10 — telemetry). */
  get count(): number {
    return this.titans.length;
  }

  /**
   * Global economy ledger: a REUSED array of REUSED rows, refreshed at the end of every
   * `update()`. Copy values if you retain them; never mutate. O(1) accessor.
   */
  get ledger(): readonly TitanLedgerEntry[] {
    return this.led;
  }

  /**
   * Integration/testing hook: pin titan `index` to strategy `s` (0..4, see STRATEGIES).
   * Deterministic scenarios (engineered payoffs) are built from this. O(1).
   */
  setStrategy(index: number, s: number): void {
    const t = this.titans[index];
    if (!t) return;
    // NaN seal (audit fix): Math.floor(NaN) = NaN passes straight through clamp's comparisons
    // (both false → returns NaN), and a NaN strategy permanently mutes the titan's diplomacy
    // (every STRATEGIES[strategy] lookup misses). Non-finite input falls back to strategy 0.
    const si = Math.floor(s);
    t.strategy = Number.isFinite(si) ? clamp(si, 0, STRATEGIES.length - 1) : 0;
  }

  /**
   * PRODUCE hook: the integrator calls this when the quantum register collapses
   * (qcircuit.lastCollapse changes). Every titan witnesses the global collapse and
   * banks {@link WITNESS_ENERGY}. O(10), allocation-free.
   */
  onCollapseWitness(): void {
    for (let i = 0; i < this.titans.length; i++) {
      const t = this.titans[i];
      if (!t) continue; // invariant: dense array
      t.energy = clamp(t.energy + WITNESS_ENERGY, 0, RESOURCE_CAP);
    }
  }

  /**
   * PRODUCE hook: integrator feeds the current RD pattern density `d` (0..1) on its own
   * cadence; it is applied as entropy relief on subsequent economy ticks. Non-finite
   * values are ignored. O(1).
   */
  feedEntropy(d: number): void {
    if (!Number.isFinite(d)) return;
    this.lastRd = clamp(d, 0, 1);
  }

  /**
   * Route the pending waste scar to the rd facade and clear it. Call once per frame after
   * the RD step; returns true when a perturb was emitted. O(1), allocation-free.
   */
  drainPerturb(): boolean {
    const w = this.wantsPerturb;
    if (!w.pending) return false;
    this.rd.perturb(w.u, w.v, w.r);
    w.pending = false;
    return true;
  }

  /**
   * Per-frame advance: roaming + animation for all 10 titans (pure trig, zero rng), then the
   * internally cadenced economy tick (one titan per {@link ECON_STAGGER} frames), one
   * diplomacy pair slot and one strike-check slot (never the same frame — the half-cycle
   * offset is coprime-safe), and an O(10) ledger refresh.
   * O(titans) per frame + O(n) on the single ticking titan's harvest scan; allocation-free
   * outside event-driven spawn/audit calls.
   */
  update(dt: number, t: number): void {
    const frame = this.ctx.state.frame;
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      if (!ti) continue; // invariant: dense array
      this.roamAndAnimate(ti, dt, t);
    }
    const econPh = frame % ECON_PERIOD;
    if (econPh % ECON_STAGGER === 0) {
      const k = econPh / ECON_STAGGER;
      if (k < TITAN_COUNT) this.economyTick(k);
    }
    const dPh = frame % DIPLO_PERIOD;
    if (dPh % DIPLO_STRIDE === 0) {
      const p = dPh / DIPLO_STRIDE;
      if (p < PAIR_COUNT) this.diplomacy(p);
    }
    const sPh = (frame + DIPLO_PERIOD / 2) % DIPLO_PERIOD;
    if (sPh % DIPLO_STRIDE === 0) {
      const p = sPh / DIPLO_STRIDE;
      if (p < PAIR_COUNT) this.strikeCheck(p);
    }
    this.refreshLedger();
  }

  /** Boot-time titan factory: silhouette, light, lore identity, seeded economy. */
  private buildTitan(i: number, lore: TitanLore): Titan {
    const ctx = this.ctx;
    const rng = ctx.rng;
    const group = new THREE.Group();
    const rig = new THREE.Group();
    const limbSpin = new THREE.Group();
    const size = (i < 5 ? 1 : 1.45) * (1 + 0.12 * (i % 3)) * COLOSSAL;
    const hue = i / TITAN_COUNT;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.45, 0.13),
      emissive: new THREE.Color().setHSL(hue, 0.75, 0.1),
      emissiveIntensity: 0.9,
      metalness: 0.75,
      roughness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.3),
      emissive: new THREE.Color().setHSL(hue, 0.9, 0.32),
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.4,
    });
    this.buildSilhouette(i, size, rig, limbSpin, bodyMat, accentMat);
    limbSpin.position.y = 7 * size;
    rig.add(limbSpin);
    group.add(rig);

    // One PointLight per titan, decay 0 per the V3.3 contract (see TITAN_LIGHT_GAIN note).
    const light = new THREE.PointLight(0xffffff, TITAN_LIGHT_GAIN, 70 * size, 0);
    light.color.setHSL(hue, 0.7, 0.5);
    light.position.y = 9 * size;
    group.add(light);

    // Patrol post: titan i hovers over phylum i's home wedge (entities.ts spawn
    // bias uses the same angular slice), mid-field of the 5× arena.
    const angle = (i / TITAN_COUNT) * TAU + 0.31;
    const radius = 130 + (i % 3) * 45;
    const homeX = Math.cos(angle) * radius;
    const homeZ = Math.sin(angle) * radius;
    group.position.set(homeX, 25 + (i % 4) * 8, homeZ);

    const name = lore.name('tribe', 50 + i);
    return {
      group,
      rig,
      limbSpin,
      bodyMat,
      light,
      vel: new THREE.Vector3((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.04),
      ph: rng() * TAU,
      spin: 0.05 + rng() * 0.1,
      bobF: 0.4 + rng() * 0.5,
      bobA: 0.6 + rng() * 0.8,
      size,
      hue,
      name,
      epithet: lore.epithet('puppet', name),
      // Champion block: with contiguous 25-morph phylum blocks (V3.2), titan i
      // champions phylum i's morphs exactly; legacy 100-morph mode degrades to
      // stride-10 blocks. Derived from the LIVE morph table, never a constant.
      mi: i * Math.max(1, Math.floor(this.ctx.morphs.length / TITAN_COUNT)),
      homeX,
      homeZ,
      energy: 60 + rng() * 20,
      matter: 15 + rng() * 10,
      entropy: rng() * 10,
      strategy: Math.floor(rng() * STRATEGIES.length),
      warCount: 0,
    };
  }

  /** Boot-time mesh helper: one cached-geometry part under `parent`. */
  private addPart(
    parent: THREE.Object3D,
    geoIdx: number,
    mat: THREE.MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
  ): void {
    const geos = this.ctx.geos;
    const geo = geos[geoIdx % geos.length];
    if (!geo) return; // invariant: cache has 40 entries — defensive only
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.x = rx;
    parent.add(mesh);
  }

  /** Five distinct silhouette archetypes × two size tiers = 10 distinguishable colossi. */
  private buildSilhouette(
    i: number,
    s: number,
    rig: THREE.Group,
    limbSpin: THREE.Group,
    body: THREE.MeshStandardMaterial,
    accent: THREE.MeshStandardMaterial,
  ): void {
    const HALF_PI = Math.PI / 2;
    switch (i % 5) {
      case 0: // COLOSSUS — towering pillar body, glowing head, twin shoulder masses.
        this.addPart(rig, GEO_CYL, body, 0, 6 * s, 0, 2.4 * s, 4.2 * s, 2.4 * s);
        this.addPart(rig, GEO_SPHERE, accent, 0, 13.5 * s, 0, 2.4 * s, 2.4 * s, 2.4 * s);
        this.addPart(rig, GEO_OCTA, body, -3.6 * s, 11 * s, 0, 1.6 * s, 1.6 * s, 1.6 * s);
        this.addPart(rig, GEO_OCTA, body, 3.6 * s, 11 * s, 0, 1.6 * s, 1.6 * s, 1.6 * s);
        break;
      case 1: // RING-LORD — horizontal halo around a writhing organic core, 4 satellites.
        this.addPart(rig, GEO_TORUS_FAT, body, 0, 7 * s, 0, 6 * s, 6 * s, 6 * s, HALF_PI);
        this.addPart(rig, GEO_ORGANIC, accent, 0, 7 * s, 0, 3.2 * s, 3.2 * s, 3.2 * s);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU;
          this.addPart(
            limbSpin,
            GEO_SPHERE,
            accent,
            Math.cos(a) * 7.5 * s,
            0,
            Math.sin(a) * 7.5 * s,
            0.9 * s,
            0.9 * s,
            0.9 * s,
          );
        }
        break;
      case 2: // SPIRE — three stacked cones thinning upward, haloed at the tip.
        this.addPart(rig, GEO_CONE, body, 0, 2.5 * s, 0, 4 * s, 2.5 * s, 4 * s);
        this.addPart(rig, GEO_CONE, body, 0, 7 * s, 0, 2.6 * s, 2.2 * s, 2.6 * s);
        this.addPart(rig, GEO_CONE, accent, 0, 11.5 * s, 0, 1.4 * s, 2.6 * s, 1.4 * s);
        this.addPart(rig, GEO_TORUS_THIN, accent, 0, 14 * s, 0, 2.2 * s, 2.2 * s, 2.2 * s, HALF_PI);
        break;
      case 3: // TWIN — two icosahedral bodies bridged at the waist, one knot orbiter.
        this.addPart(rig, GEO_ICO, body, -3.2 * s, 6 * s, 0, 2.8 * s, 2.8 * s, 2.8 * s);
        this.addPart(rig, GEO_ICO, body, 3.2 * s, 6 * s, 0, 2.8 * s, 2.8 * s, 2.8 * s);
        this.addPart(rig, GEO_BOX, accent, 0, 6 * s, 0, 7 * s, 0.9 * s, 0.9 * s);
        this.addPart(limbSpin, GEO_KNOT, accent, 5 * s, 0, 0, 1.2 * s, 1.2 * s, 1.2 * s);
        break;
      default: {
        // CROWN — dodecahedral core wearing a five-spike cone crown.
        this.addPart(rig, GEO_DODE, body, 0, 6 * s, 0, 3.4 * s, 3.4 * s, 3.4 * s);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          this.addPart(
            rig,
            GEO_CONE,
            k % 2 === 0 ? accent : body,
            Math.cos(a) * 4.4 * s,
            10.5 * s,
            Math.sin(a) * 4.4 * s,
            0.9 * s,
            1.6 * s,
            0.9 * s,
          );
        }
        break;
      }
    }
  }

  /**
   * Per-frame roam (lorenz-flavored drift with a gentle core pull, contained at ±300) and
   * animation (spin, counter-spin, bob, economy-keyed light/emissive, war tint). Pure trig
   * of (t, phase) — NO rng — plus a finite seal that re-anchors a diverged titan.
   * O(1) per titan, allocation-free (module scratch only).
   */
  private roamAndAnimate(ti: Titan, dt: number, t: number): void {
    const g = ti.group;
    const p = g.position;
    const vel = ti.vel;

    const ax = p.x * 0.013;
    const ay = p.y * 0.05;
    const az = p.z * 0.013;
    vel.x += Math.sin(t * 0.23 + ti.ph) * (10 * (ay - ax)) * dt * 0.00045;
    vel.y += Math.cos(t * 0.17 + ti.ph * 1.7) * (ax * (28 - az) - ay) * dt * 0.00012;
    vel.z += Math.sin(t * 0.19 + ti.ph * 0.6) * (ax * ay - 2.667 * az) * dt * 0.00045;
    // Core pull keeps harvest routes crossing the populated centre of the arena.
    vel.x -= p.x * 0.000035 * dt * 60;
    vel.z -= p.z * 0.000035 * dt * 60;
    vel.multiplyScalar(0.985);
    VA.copy(vel).multiplyScalar(dt * 60);
    p.add(VA);
    if (p.lengthSq() > ROAM_RADIUS2) {
      VA.copy(p).normalize().multiplyScalar(-0.02);
      vel.add(VA);
    }
    if (p.y < 12) vel.y += 0.004;
    if (p.y > 90) vel.y -= 0.004;
    // Finite seal: a diverged titan re-anchors home instead of spreading NaN.
    if (!Number.isFinite(p.x + p.y + p.z + vel.x + vel.y + vel.z)) {
      p.set(ti.homeX, 30, ti.homeZ);
      vel.set(0, 0, 0);
    }

    g.rotation.y += ti.spin * dt;
    ti.limbSpin.rotation.y -= ti.spin * 2.3 * dt;
    ti.rig.position.y = Math.sin(t * ti.bobF + ti.ph) * ti.bobA;
    const flick = Math.sin(t * 2.1 + ti.ph);
    const warHot = ti.warCount > 0;
    ti.light.intensity =
      TITAN_LIGHT_GAIN * (0.55 + 0.45 * (ti.energy / RESOURCE_CAP)) * (1 + 0.12 * flick);
    ti.light.color.setHSL(warHot ? 0.015 : ti.hue, 0.7, 0.5);
    ti.bodyMat.emissive.setHSL(warHot ? 0.015 : ti.hue, 0.75, 0.09 + 0.04 * flick);
    const entropyN = ti.entropy / ENTROPY_WASTE_THRESHOLD;
    ti.bodyMat.emissiveIntensity = 0.7 + 1.1 * (entropyN > 1 ? 1 : entropyN);
  }

  /**
   * One titan economy tick (cadence: every {@link ECON_PERIOD} frames, staggered):
   * PRODUCE (harvest via `entities.disposeAt`, O(n) scan like the shoggoth feed),
   * metabolize matter→energy, accrue entropy (less RD relief), CONSUME upkeep (bankruptcy
   * mutates strategy via replicator), WASTE (queue a ground scar), then clamp + NaN-seal
   * all three resources into [0, RESOURCE_CAP].
   */
  private economyTick(k: number): void {
    const ti = this.titans[k];
    if (!ti) return; // invariant: k < TITAN_COUNT
    const list = this.entities.list;
    const p = ti.group.position;

    let harvested = 0;
    if (list.length > HARVEST_MIN_POPULATION) {
      for (
        let i = list.length - 1;
        i >= 0 && harvested < HARVEST_MAX && list.length > HARVEST_MIN_POPULATION;
        i--
      ) {
        const e = list[i];
        if (!e) continue; // invariant: list is dense
        if (dist2XZ(p.x, p.z, e.position.x, e.position.z) < HARVEST_REACH2) {
          ti.matter += MATTER_PER_ENTITY * e.userData.sc;
          this.entities.disposeAt(i);
          harvested++;
        }
      }
    }

    const m = Math.min(ti.matter, METABOLIZE_RATE);
    ti.matter -= m;
    ti.energy += m * METABOLIZE_EFF;

    ti.entropy +=
      ENTROPY_PER_TICK * ti.size + harvested * ENTROPY_PER_HARVEST - this.lastRd * ENTROPY_RELIEF;
    if (ti.entropy < 0) ti.entropy = 0;

    ti.energy -= UPKEEP_BASE + UPKEEP_PER_SIZE * ti.size;
    if (ti.energy <= 0) this.bankrupt(k);

    if (ti.entropy >= ENTROPY_WASTE_THRESHOLD) {
      ti.entropy *= ENTROPY_WASTE_RETAIN;
      const w = this.wantsPerturb;
      w.u = clamp(0.5 + p.x / GROUND_EXTENT, 0, 1);
      w.v = clamp(0.5 - p.z / GROUND_EXTENT, 0, 1); // plane is X-rotated: v runs against +z
      w.r = WASTE_SCAR_RADIUS;
      w.pending = true;
    }

    ti.energy = clamp(Number.isFinite(ti.energy) ? ti.energy : 0, 0, RESOURCE_CAP);
    ti.matter = clamp(Number.isFinite(ti.matter) ? ti.matter : 0, 0, RESOURCE_CAP);
    ti.entropy = clamp(Number.isFinite(ti.entropy) ? ti.entropy : 0, 0, RESOURCE_CAP);
  }

  /**
   * Bankruptcy: replicator-dynamics strategy mutation. Population shares come from the live
   * 10-titan strategy census, fitness from the diplomacy payoff EMA; the new strategy is
   * sampled from the post-step distribution with one seeded draw. Mutation-free dynamics:
   * extinct strategies cannot respawn (corner states absorb — documented in games.ts).
   */
  private bankrupt(k: number): void {
    const ti = this.titans[k];
    if (!ti) return; // invariant: k < TITAN_COUNT
    const shares = this.shares;
    shares.fill(0);
    for (let i = 0; i < this.titans.length; i++) {
      const o = this.titans[i];
      if (!o) continue; // invariant: dense array
      shares[o.strategy] = (shares[o.strategy] ?? 0) + 1 / TITAN_COUNT;
    }
    replicatorStep(shares, this.stratFitness, REPLICATOR_DT);
    const r = this.ctx.rng();
    let acc = 0;
    let next = ti.strategy;
    for (let i = 0; i < shares.length; i++) {
      acc += shares[i] ?? 0;
      if (r < acc) {
        next = i;
        break;
      }
    }
    ti.strategy = next;
    ti.energy = BANKRUPT_SEED_ENERGY;
    this.ctx.audit.record('titan-bankruptcy', {
      name: ti.name,
      epithet: ti.epithet,
      strategy: STRATEGIES[next]?.name ?? '?',
    });
  }

  /**
   * One staggered diplomacy slot: pair `p` plays a PD round (stochastic strategies fed two
   * seeded draws), the result is pushed into the pair ring, payoffs flow into the energy
   * ledger (zero line at the matrix mean, stake scaled by the poorer party), per-strategy
   * fitness EMAs update, and the pair relation is re-derived (audited on change). O(1).
   */
  private diplomacy(p: number): void {
    const i = PAIR_A[p] ?? 0;
    const j = PAIR_B[p] ?? 0;
    const a = this.titans[i];
    const b = this.titans[j];
    const h = this.histories[p];
    if (!a || !b || !h) return; // invariant: tables sized for PAIR_COUNT
    const sa = STRATEGIES[a.strategy];
    const sb = STRATEGIES[b.strategy];
    if (!sa || !sb) return; // invariant: strategy clamped to registry range
    const rng = this.ctx.rng;
    const round = playRound(PRISONERS_DILEMMA, sa.move, sb.move, h, rng(), rng());
    pushHistory(h, round.a, round.b);

    const stake = PAYOFF_STAKE_BASE + PAYOFF_STAKE_SCALE * Math.min(a.energy, b.energy);
    a.energy = clamp(a.energy + (round.payoffA - PD_MEAN) * stake, 0, RESOURCE_CAP);
    b.energy = clamp(b.energy + (round.payoffB - PD_MEAN) * stake, 0, RESOURCE_CAP);

    const fit = this.stratFitness;
    fit[a.strategy] = (fit[a.strategy] ?? 0) * FITNESS_DECAY + round.payoffA * (1 - FITNESS_DECAY);
    fit[b.strategy] = (fit[b.strategy] ?? 0) * FITNESS_DECAY + round.payoffB * (1 - FITNESS_DECAY);

    const rel = relationOf(h);
    const cell = i * TITAN_COUNT + j;
    const prev = this.warMatrix[cell] ?? REL_TRUCE;
    if (rel !== prev) {
      this.warMatrix[cell] = rel;
      this.warMatrix[j * TITAN_COUNT + i] = rel;
      if (prev === REL_WAR) {
        a.warCount--;
        b.warCount--;
      }
      if (rel === REL_WAR) {
        a.warCount++;
        b.warCount++;
        this.ctx.audit.record('titan-war', { a: a.name, b: b.name, omen: a.epithet });
      } else if (rel === REL_ALLIANCE) {
        this.ctx.audit.record('titan-alliance', { a: a.name, b: b.name, omen: b.epithet });
      }
    }
  }

  /**
   * One staggered strike slot (half a diplomacy cycle after pair `p` last negotiated): if the
   * pair is at WAR and the richer side can fund it, execute a territory strike at the rival's
   * position — energy raid, loot, burst spawn of the aggressor's champion morphs, scatter
   * impulse, and conscription remorphs via the grid query. Event-driven allocations only
   * (spawn/audit); the scatter path reuses module scratch. O(k) grid neighbors + O(BURST).
   */
  private strikeCheck(p: number): void {
    const i = PAIR_A[p] ?? 0;
    const j = PAIR_B[p] ?? 0;
    if ((this.warMatrix[i * TITAN_COUNT + j] ?? REL_TRUCE) !== REL_WAR) return;
    const a = this.titans[i];
    const b = this.titans[j];
    if (!a || !b) return; // invariant: tables sized for PAIR_COUNT
    const agg = a.energy >= b.energy ? a : b;
    const def = agg === a ? b : a;
    if (agg.energy < STRIKE_COST * 2) return;

    agg.energy -= STRIKE_COST;
    def.energy = Math.max(0, def.energy - RAID_LOSS);
    agg.matter = clamp(agg.matter + LOOT_MATTER, 0, RESOURCE_CAP);

    const ctx = this.ctx;
    const rng = ctx.rng;
    const dp = def.group.position;
    const nearby = ctx.grid.query(dp.x, dp.z, STRIKE_RADIUS);
    let conscripted = 0;
    for (let ni = 0; ni < nearby.length; ni++) {
      const en = nearby[ni];
      if (!en) continue; // noUncheckedIndexedAccess: ni < length
      const ep = en.position;
      if (dist2XZ(dp.x, dp.z, ep.x, ep.z) >= STRIKE_REACH2) continue;
      VA.copy(ep).sub(dp);
      VA.y += 0.5;
      VA.normalize().multiplyScalar(SCATTER_KICK);
      en.userData.vel.add(VA);
      if (conscripted < CONSCRIPT_MAX) {
        // Conscription remorphs into the aggressor's champion block (live table).
        this.entities.remorph(en, (agg.mi + Math.floor(rng() * 5)) % ctx.morphs.length);
        conscripted++;
      }
    }
    for (let s = 0; s < BURST_COUNT; s++) {
      VB.set(dp.x + (rng() - 0.5) * 8, dp.y + (rng() - 0.5) * 4, dp.z + (rng() - 0.5) * 8);
      this.entities.spawn(VB, (agg.mi + s) % ctx.morphs.length, 0.7);
    }
    ctx.audit.record('titan-strike', {
      aggressor: agg.name,
      target: def.name,
      omen: agg.epithet,
      conscripted,
    });
  }

  /** Refresh the REUSED ledger rows from titan state. O(10) field writes, allocation-free. */
  private refreshLedger(): void {
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      const row = this.led[i];
      if (!ti || !row) continue; // invariant: parallel dense arrays
      row.name = ti.name;
      row.energy = ti.energy;
      row.matter = ti.matter;
      row.entropy = ti.entropy;
      row.war = ti.warCount;
    }
  }
}
