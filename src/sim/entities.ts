/**
 * Entity lifecycle and per-frame simulation for the organism population.
 *
 * Port of the legacy entity system (legacy/cosmogonic-quantum-mechalogodrom.html lines
 * 291-356: `disposeEntity` / `remorphEntity` / `mkE`) and the full entity update loop
 * (lines 699-796): all 26 behaviors (delegated to `behaviors.ts`), neural activation decay,
 * wind physics, belly pulse, containment, auto-split, and temperature-modified death with
 * respawn-when-sparse.
 *
 * Memory discipline (legacy comments, lines 296-297): geometry is SHARED from the cache and
 * never disposed; the MeshStandardMaterial is per-entity and always disposed.
 */
import * as THREE from 'three';
import { TAU, lerp, clamp01 } from '../math/scalar';
import {
  ENTROPY_MAX,
  PLATFORM_HALF,
  PLATFORM_CEIL,
  PLATFORM_FLOOR,
  RENDER_MODE_FX,
  RENDER_MODE_DYN,
} from './constants';
import type { RenderMode } from './constants';
import { PHYLUM_COUNT } from './phyla';
import type { PhylumMorphType } from './phyla';
import { applyBehavior } from './behaviors';
import type { BehaviorEnv } from './behaviors';
import type { Entity, OrganismGoalField, SimContext, UpdateStats } from '../types';
import type { Rng } from '../math/rng';

/** Push morph colours toward a BRIGHT, CRYSTAL-WATERY, DREAMY read (render-only — morph tables unchanged).
 * V109: lifted base diffuse into the white-crystal zone (~0.35..0.55 lightness), softened
 * saturation to pastel-watery hues, stronger colored emissive core, high metallic + low roughness
 * for a glassy, liquid-gem shimmer that catches light as entities drift. */
/** V123 (USER #7): the ALIEN OLD-MONEY / ANNIHILATION oil-slick hue anchors (0..1) — oxblood ·
 *  patina gold · deep teal · gunmetal cyan · cold amethyst · bruise violet. Deliberately skips the
 *  bright-green (~0.30-0.40) and hot-pink (~0.90-0.96) "girlie" zones. */
const OMINOUS_ANCHORS = [0.02, 0.11, 0.5, 0.57, 0.74, 0.85] as const;
/** Snap a free hue toward its nearest ominous anchor (65% pull) so the palette CLUSTERS on rich
 *  ominous tones while keeping per-morph variety (the residual 35% + the jitter). Circular-safe. */
function warpOminous(h: number, mi: number): number {
  let best: number = OMINOUS_ANCHORS[0];
  let bestD = 1;
  for (const a of OMINOUS_ANCHORS) {
    const d = Math.min(Math.abs(h - a), 1 - Math.abs(h - a));
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  // Blend toward the anchor along the shortest arc, + a tiny deterministic jitter for variety.
  let diff = h - best;
  if (diff > 0.5) diff -= 1;
  else if (diff < -0.5) diff += 1;
  const jit = ((mi * 0.381966) % 1) * 0.06 - 0.03;
  const out = best + diff * 0.35 + jit;
  return ((out % 1) + 1) % 1;
}

function paintVibrant(mat: THREE.MeshStandardMaterial, m: PhylumMorphType, mi: number): void {
  const hsl = { h: 0, s: 0, l: 0 };
  // Quint-prime hash → a well-spread, deterministic per-morph value in [0,1).
  const j1 = (mi * 0.6180339887) % 1;
  const j2 = (mi * 0.4142135624) % 1;
  const j3 = (mi * 0.7320508076) % 1;
  const j4 = (mi * 0.2360679775) % 1;
  const j5 = (mi * 0.8541019662) % 1;
  const slot =
    mi +
    Math.floor(j1 * 9973) +
    Math.floor(j2 * 449) +
    Math.floor(j4 * 2683) +
    Math.floor(j5 * 1597);
  m.col.getHSL(hsl);
  const baseHue =
    (hsl.h + slot * 0.008 + j1 * 0.39 + j2 * 0.25 + j4 * 0.18 + j5 * 0.12 - 0.06 + 1) % 1;
  // USER #12: the 1/3 · 1/3 · 1/3 tonal families are back as the finishing colour touch — but every
  // family is kept VISIBLE (a lightness floor + a bright coloured emissive glow) so none disappears on
  // the dark scene. (The earlier version vanished because family-0 lightness was ~0.08 AND the instanced
  // shader crashed on gl_InstanceID; the shader is fixed now, and these floors keep even the dark family
  // readable as "dark body with bright glints".) The per-instance GPU hue drift in instanced-entities.ts
  // (V115) adds the dynamic hue/sat/value breathing on top of these three base palettes.
  // V123 (USER #7): the swarm was "very neon AI colorish… girlie" — families 1/2 spread full-spectrum
  // at 0.86-0.95 saturation. Cluster their hues onto the ALIEN OLD-MONEY / ANNIHILATION oil-slick
  // anchors (oxblood · patina gold · deep teal · gunmetal · cold amethyst · bruise violet) with a
  // small per-morph jitter, and pull saturation down a notch — still vivid + varied, but ominous
  // rich tones instead of bright cyan/lime/hot-pink. NOT a filter: the base hue itself is retuned.
  // Anchors chosen to AVOID the girlie zones (bright green ~0.33, hot pink ~0.92). Deterministic.
  const ominous = warpOminous(baseHue, mi);
  const family = mi % 3;
  if (family === 0) {
    // 1/3 — DARK graphite / grey / GOLD tones: deep bodies with metallic glints. Owner likes them
    // darker; lightness floor 0.14 (+ the emissive below) keeps them readable, not invisible.
    mat.color.setHSL((0.1 + j2 * 0.06) % 1, 0.4 + j3 * 0.28, 0.14 + j4 * 0.08);
  } else if (family === 1) {
    // 1/3 — ominous living CHROMA: oil-slick oxblood/teal/violet/gold, moody, not neon.
    mat.color.setHSL(ominous, 0.6 + j5 * 0.14, 0.26 + j3 * 0.14);
  } else {
    // 1/3 — WILD high-contrast morphic combos: a partner ominous hue, deep, still rich.
    mat.color.setHSL((ominous + 0.34) % 1, 0.68 + j2 * 0.12, 0.2 + j2 * 0.16);
  }
  m.em.getHSL(hsl);
  // Coloured inner glow — an ominous partner tone, dimmed so the dark family stays readable.
  mat.emissive.setHSL(
    family === 0 ? (0.11 + j1 * 0.06) % 1 : (ominous + 0.1 + j3 * 0.12) % 1,
    family === 0 ? 0.85 : 0.78,
    family === 0 ? 0.26 + j2 * 0.1 : Math.min(0.4, 0.2 + hsl.l * 0.12 + j2 * 0.1),
  );
  // USER: dimmer so entities never blow to white near the camera (was min 2.5 / base 0.7).
  mat.emissiveIntensity = Math.min(1.7, m.emI * 0.7 + 0.45 + family * 0.08);
  // Glassy/crystal surface: high metal, low roughness for a liquid-gem shimmer.
  // USER: cap metalness + raise roughness floor so glassy bodies stop mirror-searing white near camera.
  mat.metalness = Math.min(0.8, mat.metalness * 0.6 + j5 * 0.4 + 0.2);
  mat.roughness = Math.max(0.12, mat.roughness * 0.4 + j3 * 0.08);
}

/** Base material parameters a {@link RenderMode} is layered on top of. */
interface RenderModeBase {
  met: number;
  rou: number;
  op: number;
  emI: number;
}

/**
 * Apply a {@link RenderMode} to a MeshStandardMaterial on top of its morphotype base
 * (CONTRACTS V7.3). `null` fx fields fall back to the base; NEON's emissive boost is the
 * INITIAL value only — `update()` re-targets it each frame so the glow holds. Used by the
 * per-mesh path here AND by the instanced renderer's pool materials. Allocation-free. O(1).
 */
export function applyRenderModeTo(
  mat: THREE.MeshStandardMaterial,
  mode: RenderMode,
  base: RenderModeBase,
): void {
  const fx = RENDER_MODE_FX[mode];
  const baseTransparent = base.op < 0.6;
  const transparent = fx.transparent ?? baseTransparent;
  mat.wireframe = fx.wireframe;
  mat.metalness = fx.metalness ?? base.met;
  mat.roughness = fx.roughness ?? base.rou;
  mat.transparent = transparent;
  mat.opacity = fx.opacity ?? (baseTransparent ? base.op : 1.0);
  mat.side = transparent ? THREE.DoubleSide : THREE.FrontSide;
  // Legacy never set depthWrite (three defaults true, even for translucent morphs); only GHOST
  // turns it off. `?? true` both preserves the legacy look AND restores it when leaving ghost.
  mat.depthWrite = fx.depthWrite ?? true;
  mat.emissiveIntensity = base.emI * fx.emissiveBoost;
  mat.needsUpdate = true;
}

/**
 * Metabolic luminance — the multiplier in `[0.27, 1.0]` applied to an organism's RESTING
 * self-glow so an idle body is a *falsifiable readout of its real vital state*, never a constant:
 * - **wealth** (`energy`, 0..100 — the market-behavior payoff that the trade loop in `behaviors.ts`
 *   redistributes) → a `0.45..1.0` "burn": a destitute organism still smoulders (never goes fully
 *   dark), a wealthy one burns at the full morphotype base;
 * - **senescence** (`age / life`) → a late-life fade, quadratic so the young/prime stay bright and
 *   only the genuinely old visibly dim, bottoming at `0.6×` of the wealth burn at end of life.
 *
 * Monotonic increasing in `energy`, monotonic decreasing in `age`; `energy` is clamped to `[0,100]`
 * and `life <= 0` is guarded, so the result is always finite and within `[0.27, 1.0]`. Pure,
 * allocation-free, no rng (so it never perturbs the seeded trajectory). O(1). The market behavior
 * already maps the same `energy` to body SCALE (`behaviors.ts`); this maps it to GLOW, so wealth and
 * age are legible on every organism, on every frame, not just market entities on their cadence.
 * See tests/entity-metabolic-luminance.test.ts.
 */
export function metabolicLuminance(energy: number, age: number, life: number): number {
  const burn = 0.45 + 0.55 * clamp01(energy / 100); // wealth → [0.45, 1.0]
  const senescence = life > 0 ? clamp01(age / life) : 0; // age → [0, 1]
  const vitality = 1 - 0.4 * senescence * senescence; // late-life fade → [0.6, 1.0]
  return burn * vitality; // [0.27, 1.0]
}

/** BRUTALISM concrete target (matches the instanced shader's `vec3(0.42, 0.42, 0.45)`) and a reused
 *  scratch colour — module consts ⇒ zero per-frame allocation in {@link EntityManager.applyBrutalism}. */
const ENT_BRUTAL_CONCRETE = new THREE.Color(0.42, 0.42, 0.45);
const ENT_BRUTAL_SCRATCH = new THREE.Color();
const ENT_BRUTAL_BASE = new THREE.Color();

/** Scratch vector for velocity integration / containment impulses (no per-frame allocation). */
const MOVE = new THREE.Vector3();
/** Scratch vector for spawn positions — `spawn()` copies it, so reuse is safe. */
const SPAWN_AT = new THREE.Vector3();
/**
 * Scratch colour for flora-camouflage tinting; shared by the hot loop. Built via setRGB into the
 * LINEAR working space (flag-independent, a no-op conversion), NOT `new THREE.Color(0x7ea88a)`: this
 * const is import-eval-time, so a hex constructor would sRGB→linear it before main.ts disables
 * ColorManagement, storing a darker/wrong hue as the camo lerp target. Raw sage = 0.494/0.659/0.541.
 */
const FLORA_CAMO = new THREE.Color().setRGB(
  0x7e / 255,
  0xa8 / 255,
  0x8a / 255,
  THREE.LinearSRGBColorSpace,
);

/**
 * Max budgeted material-organism births per frame at the ultra tier (>5,000). Organic mitosis,
 * sparse recovery, and post-update NHI swarms share the counter, so no one path can restore the
 * synchronized allocation cliff. Deferred births retry on later frames; the world still ramps to
 * its target over seconds instead of one locked frame. Deterministic (frame-local, not wall-clock).
 */
export const SPAWN_BUDGET_ULTRA = 512;
/** Distinct-morphotype scratch set — cleared at the top of every `update()` call. */
const MORPHS_SEEN = new Set<number>();
/** Reused stats instance returned by `update()` — copy the fields if you need to retain them. */
const STATS: UpdateStats = { energy: 0, morphCount: 0 };

/** Structural readout from AlienFlora.comfortAt; kept local to avoid a runtime module dependency. */
interface FloraComfortReadout {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly strength: number;
}

/** O(1) brain-identity lifecycle used when EntityManager compacts or recycles list slots. */
export interface EntityBrainSlotLifecycle {
  swapEntitySlots(a: number, b: number): void;
  clearEntitySlot(slot: number): void;
  resetEntitySlots(): void;
}

/**
 * Owns the organism population: spawning, true morphogenesis, per-frame behavior + physics,
 * and death. The composition root constructs one, seeds it (legacy boots with 300 organisms —
 * call `reset(300)`), and calls `update(dt, t)` once per frame after the grid rebuild.
 */
export class EntityManager {
  /** Live entities in spawn order. Index order is meaningful to the sorting field. */
  readonly list: Entity[] = [];
  /**
   * Live population per phylum (CONTRACTS V3.2/V3.5), recounted by every
   * `update()`. REUSED Float32Array — telemetry/observatory copy what they keep.
   * Unaffiliated (legacy, phylum -1) organisms are not counted.
   */
  readonly phylumCounts = new Float32Array(PHYLUM_COUNT);
  /**
   * Stable ecology-goal field consumed by EntityBrainField on the following frame. This closes the
   * perception→goal→action loop without running the flora neighborhood query twice per organism.
   */
  readonly organismGoals: OrganismGoalField;
  /** Mean live metabolic energy, normalized to [0,1], measured during the latest update pass. */
  meanMetabolicEnergy = 0.5;
  /**
   * Live population per morphotype, indexed by `userData.mi`. Maintained incrementally by
   * spawn / disposeAt / remorph / reset so {@link disposeAt} can detect a morphotype's extinction in
   * O(1) instead of rescanning the whole list — the rescan made a mass die-off / black-hole consume
   * O(deaths·n) ≈ O(n²) at 50k entities. Sized to the (fixed) taxonomy; values track `list` exactly.
   */
  private readonly morphLive: Int32Array;
  /**
   * Death→ground feedback hook (CONTRACTS V2 frame pipeline): invoked with the dying
   * entity's world x/z exactly once per disposal routed through `disposeAt()` — which
   * covers BOTH the age-death branch of `update()` and external consumers like shoggoth
   * consumption. NOT fired by `reset()`: mass disposal is a genesis event, not a death.
   * The composition root wires this to ReactionDiffusionSystem.perturb; null disables.
   * Mutable public field by design (audit fix A). Allocation-free to invoke.
   */
  onDeath: ((x: number, z: number) => void) | null = null;
  private readonly ctx: SimContext;
  /** BRUTALISM (phone tier): per-material captured TRUE colour, so {@link applyBrutalism} lerps FROM
   *  it and never compounds; keyed by the per-entity material (GC'd with it on disposal). */
  private readonly brutalBase = new WeakMap<THREE.MeshStandardMaterial, number>();
  /** BRUTALISM previous applied factor — drives the on/off edge logic in {@link applyBrutalism}. */
  private brutalPrevG = 0;
  /** Single long-lived behavior env; per-entity fields are rewritten in `update()` (no alloc). */
  private readonly env: BehaviorEnv;
  /** Optional ecological cover field: plants are not neural, but animals can sense/use their cover. */
  private floraComfort: ((x: number, z: number) => FloraComfortReadout) | null = null;
  /** USER ecology: optional flora GRAZING sink — a hungry animal eats the plants at (x,z) and the
   *  callback returns the FOOD energy yielded (the flora depletes its own biomass). Null detaches it. */
  private floraGraze: ((x: number, z: number, pressure: number, dt: number) => number) | null =
    null;
  /** Optional persistent brain-identity owner; attached by World after both systems exist. */
  private brainSlots: EntityBrainSlotLifecycle | null = null;
  /** USER ecology: optional READ-ONLY flora biomass sampler — a hungry animal finite-differences it to
   *  climb the biomass gradient toward the RICHEST patch (chemotaxis), not just drift to nearest cover.
   *  Null (the default, e.g. tests) detaches it so the seeded golden is byte-identical. */
  private floraGradient: ((x: number, z: number) => number) | null = null;
  /** Reserved material-organism births THIS frame, reset by {@link update}. Auto-split, behavior
   *  mitosis, sparse recovery, and post-update NHI swarms share it at the ultra tier. */
  private spawnsThisFrame = 0;

  constructor(ctx: SimContext) {
    this.ctx = ctx;
    this.morphLive = new Int32Array(Math.max(1, ctx.morphs.length));
    const capacity = Math.max(0, ctx.quality.maxEntities);
    this.organismGoals = {
      directionX: new Float32Array(capacity),
      directionZ: new Float32Array(capacity),
      desire: new Float32Array(capacity),
      cover: new Float32Array(capacity),
      revision: new Uint32Array(capacity),
    };
    this.env = {
      ctx,
      spawn: (pos, mi, scale) => this.spawnWithinFrameBudget(pos, mi, scale),
      dt: 0,
      t: 0,
      cm: 0,
      sp2: 0,
      sinWF: 0,
      cosWF: 0,
      doTheory: false,
      doFlock: true,
    };
  }

  /** Wire a deterministic flora-cover query into organism behavior; null detaches the ecology. */
  attachFloraComfort(query: ((x: number, z: number) => FloraComfortReadout) | null): void {
    this.floraComfort = query;
  }

  /** USER ecology: wire the flora GRAZING sink so hungry animals can EAT the plants for energy (the
   *  plants deplete + regrow on their side). Deterministic; null (the default, e.g. in tests) detaches
   *  it so the seeded golden is byte-identical without a live flora field. */
  attachFloraGraze(
    sink: ((x: number, z: number, pressure: number, dt: number) => number) | null,
  ): void {
    this.floraGraze = sink;
  }

  /** Keep persistent genomes/online state aligned with ordered entity-list compaction and reuse. */
  attachBrainSlotLifecycle(lifecycle: EntityBrainSlotLifecycle | null): void {
    this.brainSlots = lifecycle;
  }

  /** Copy one stable ecology-goal slot during EntityManager's ordered list compaction. */
  private copyOrganismGoal(from: number, to: number): void {
    const g = this.organismGoals;
    g.directionX[to] = g.directionX[from] ?? 0;
    g.directionZ[to] = g.directionZ[from] ?? 0;
    g.desire[to] = g.desire[from] ?? 0;
    g.cover[to] = g.cover[from] ?? 0;
    g.revision[to] = g.revision[from] ?? 0;
  }

  /** Reset one ecology-goal slot without allocating. */
  private clearOrganismGoal(index: number): void {
    if (index < 0 || index >= this.organismGoals.desire.length) return;
    const g = this.organismGoals;
    g.directionX[index] = 0;
    g.directionZ[index] = 0;
    g.desire[index] = 0;
    g.cover[index] = 0;
    g.revision[index] = ((g.revision[index] ?? 0) + 1) >>> 0;
  }

  /** USER ecology: wire the READ-ONLY flora biomass sampler so a hungry animal can climb the biomass
   *  gradient toward the richest patch (gradient-ascent chemotaxis). Deterministic; null detaches it. */
  attachFloraGradient(sampler: ((x: number, z: number) => number) | null): void {
    this.floraGradient = sampler;
  }

  /** Whether another material organism may use this frame's ultra-tier birth budget. */
  private hasFrameSpawnCapacity(): boolean {
    return this.ctx.quality.maxEntities <= 5000 || this.spawnsThisFrame < SPAWN_BUDGET_ULTRA;
  }

  /**
   * Create one organism of morphotype `mi % morphs.length` (legacy `mkE`, lines 328-355). Returns null
   * when the population is at `quality.maxEntities`. A null `pos` means the legacy random spawn
   * volume (x/z ∈ ±35, y ∈ [-8, 22)); `pos` is copied, so passing a scratch vector is safe.
   * O(1).
   */
  /**
   * Breed the four heritable behavioral traits on the dedicated `genomeRng` sub-stream.
   * With a `parent`: each trait is INHERITED, then mutated with a small probability (point
   * mutation) — the discrete strategy/typeId/setGroup occasionally flip/step, the continuous
   * `nW` gets a bounded jitter. Without a parent (genesis/sparse respawn): fresh draws. All
   * randomness is on `gr`, so this never perturbs the main entity stream. Allocation = one
   * small object per spawn (spawns are event-driven, not per-frame hot).
   */
  private breedTraits(
    gr: Rng,
    parent?: Entity,
  ): { nW: number; strategy: 0 | 1; typeId: number; setGroup: number } {
    const MUT = 0.12; // per-trait point-mutation probability
    if (parent) {
      const p = parent.userData;
      // nW: inherit + bounded Gaussian-ish jitter, clamped to [0,1].
      let nW = p.nW;
      if (gr() < MUT) nW += (gr() * 2 - 1) * 0.2;
      nW = nW < 0 ? 0 : nW > 1 ? 1 : nW;
      // strategy: inherit, occasionally flip (cooperate <-> defect).
      const strategy: 0 | 1 = gr() < MUT ? (p.strategy === 0 ? 1 : 0) : p.strategy;
      // typeId in [0,5): inherit, occasionally step +/-1 (speciation drift).
      let typeId = p.typeId;
      if (gr() < MUT) typeId = (typeId + (gr() < 0.5 ? 4 : 1)) % 5;
      // setGroup in [0,4): inherit, occasionally re-roll to a different cohort.
      let setGroup = p.setGroup;
      if (gr() < MUT) setGroup = Math.floor(gr() * 4);
      return { nW, strategy, typeId, setGroup };
    }
    // Founder: fresh genome (same distributions as the legacy fresh roll).
    return {
      nW: gr(),
      strategy: gr() < 0.5 ? 0 : 1,
      typeId: Math.floor(gr() * 5),
      setGroup: Math.floor(gr() * 4),
    };
  }

  spawn(pos: THREE.Vector3 | null, mi: number, scale = 1, parent?: Entity): Entity | null {
    const ctx = this.ctx;
    if (this.list.length >= ctx.quality.maxEntities) return null;
    const morphCount = ctx.morphs.length;
    if (morphCount === 0) return null; // defensive: empty taxonomy
    const m: PhylumMorphType | undefined = ctx.morphs[mi % morphCount];
    if (!m) return null; // invariant: morphs is dense — defensive only
    const geo = ctx.geos[m.gi];
    if (!geo) return null; // invariant: gi < geos.length by construction
    const rng = ctx.rng;
    const s = lerp(m.srMin, m.srMax, rng()) * scale;
    const isTransparent = m.op < 0.6;
    const mat = new THREE.MeshStandardMaterial({
      color: m.col,
      emissive: m.em,
      emissiveIntensity: m.emI,
      metalness: m.met,
      roughness: m.rou,
      transparent: isTransparent,
      opacity: isTransparent ? m.op : 1.0,
      side: isTransparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    // Layer the active render style on top of the morphotype base (CONTRACTS V7.3).
    // For SOLID this re-sets identical values, so the legacy look is byte-identical.
    applyRenderModeTo(mat, ctx.state.renderMode, m);
    paintVibrant(mat, m, (mi % morphCount) + this.list.length);
    const mesh = new THREE.Mesh(geo, mat) as Entity;
    mesh.scale.setScalar(s);
    const phylum = m.phylum ?? -1;
    if (pos) {
      mesh.position.copy(pos);
    } else if (phylum >= 0) {
      // V3.2 home-sector bias: phylum p spawns in its angular wedge of the
      // arena (matching titan p's patrol angle), radius 12%..67% of the rim.
      const ang = (phylum / PHYLUM_COUNT) * TAU + (rng() - 0.5) * 0.9;
      // Reach out across the platform + spread up the full height (same 3 rng draws → stream-safe).
      // Inset to 0.94·rim so no founder spawns exactly on the hard edge that the containment clamps.
      const rad = (0.12 + rng() * 0.75) * PLATFORM_HALF * 0.94;
      mesh.position.set(
        Math.cos(ang) * rad,
        PLATFORM_FLOOR + rng() * (PLATFORM_CEIL - PLATFORM_FLOOR),
        Math.sin(ang) * rad,
      );
    } else {
      // Founders spawn across the FULL square platform + full height (same 3 rng draws → stream-safe).
      // 0.94·rim inset keeps every founder just inside the hard containment edge.
      const xz = 2 * PLATFORM_HALF * 0.94;
      mesh.position.set(
        (rng() - 0.5) * xz,
        PLATFORM_FLOOR + rng() * (PLATFORM_CEIL - PLATFORM_FLOOR),
        (rng() - 0.5) * xz,
      );
    }
    if (ctx.quality.instanced) {
      // V3.1: pooled rendering — the data mesh NEVER joins the scene graph; the
      // InstancedEntityRenderer mirrors it per frame. updateMatrix() is manual.
      mesh.matrixAutoUpdate = false;
    } else {
      mesh.castShadow = ctx.quality.shadows && this.list.length < 120;
    }
    // HERITABLE TRAITS (ADR-0009): nW / strategy / typeId / setGroup form the organism's genome —
    // they drive the Prisoner's-Dilemma payoffs and grouping behaviors. When a dedicated genomeRng
    // sub-stream is present they are bred from `parent` (inherit + mutate) on THAT stream, so a
    // child resembles its parent and genome draws never perturb the main entity rng order. With no
    // genomeRng (headless/legacy contexts) `gr` is the main rng and the draws happen inline at
    // their exact legacy positions — keeping the original determinism golden byte-identical.
    const gr = ctx.genomeRng;
    const bred = gr ? this.breedTraits(gr, parent) : null;
    mesh.userData = {
      mi: mi % morphCount,
      vel: new THREE.Vector3((rng() - 0.5) * 0.1, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.1),
      age: 0,
      life: 200 + rng() * 900,
      ph: rng() * TAU,
      sc: s,
      beh: m.beh,
      spd: m.spd,
      wf: m.wf,
      wa: m.wa,
      sT: 300 + rng() * 500,
      belly: 0,
      sortVal: rng() * 100,
      // nW: inherited from genomeRng when present, else the legacy main-rng draw at this position.
      nW: bred ? bred.nW : rng(),
      act: 0,
      qP: rng() * TAU,
      energy: 50 + rng() * 50,
      strategy: bred ? bred.strategy : rng() < 0.5 ? 0 : 1,
      typeId: bred ? bred.typeId : Math.floor(rng() * 5),
      setGroup: bred ? bred.setGroup : Math.floor(rng() * 4),
      payoff: 0,
      phylum,
      beh2: m.beh2 ?? null,
      alive: true,
    };
    const spawnMi = mi % morphCount;
    try {
      const slot = this.list.length;
      // Clear external slot state before material insertion: if the lifecycle owner rejects the slot,
      // the caller receives an error but no orphaned list/scene entity.
      this.clearOrganismGoal(slot);
      this.brainSlots?.clearEntitySlot(slot);
      if (!ctx.quality.instanced) ctx.scene.add(mesh);
      this.list.push(mesh);
      if (spawnMi >= 0 && spawnMi < this.morphLive.length)
        this.morphLive[spawnMi] = (this.morphLive[spawnMi] ?? 0) + 1;
    } catch (error) {
      // Roll back internally because a caller cannot receive `mesh` when spawn itself throws.
      const index = this.list.indexOf(mesh);
      if (index >= 0) {
        this.list.splice(index, 1);
        if (spawnMi >= 0 && spawnMi < this.morphLive.length) {
          const current = this.morphLive[spawnMi] ?? 0;
          if (current > 0) this.morphLive[spawnMi] = current - 1;
        }
      }
      try {
        ctx.scene.remove(mesh);
      } catch {
        // Preserve the original spawn error; cleanup diagnostics below are best-effort.
      }
      try {
        mat.dispose();
      } catch {
        // Preserve the original spawn error.
      }
      const message = error instanceof Error ? error.message : String(error);
      try {
        ctx.audit.record('entity-spawn-rolled-back', { morphIndex: spawnMi, error: message });
      } catch {
        // Reporting cannot replace the original failure.
      }
      throw error;
    }
    // Optional presentation is guarded after the transaction commits.
    try {
      ctx.creatureSfx?.(mi % morphCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        ctx.audit.record('creature-sfx-failed', { morphIndex: spawnMi, error: message });
      } catch {
        // Reporting is also non-material; retain the valid organism when both external sinks fail.
      }
    }
    return mesh;
  }

  /**
   * Spawn through the shared frame-local organism-birth budget. The budget is active only above
   * 5,000 entities, so every lower-tier call delegates exactly to {@link spawn}. A reservation is
   * committed only when a material entity is returned; null and exceptional spawn paths release it.
   * This lets post-update NHI swarms share the same deterministic counter as organic mitosis.
   */
  spawnWithinFrameBudget(
    pos: THREE.Vector3 | null,
    mi: number,
    scale = 1,
    parent?: Entity,
  ): Entity | null {
    const budgeted = this.ctx.quality.maxEntities > 5000;
    if (budgeted) {
      if (!this.hasFrameSpawnCapacity()) return null;
      this.spawnsThisFrame++;
    }
    try {
      const entity = this.spawn(pos, mi, scale, parent);
      if (budgeted && entity === null) this.spawnsThisFrame--;
      return entity;
    } catch (error) {
      if (budgeted) this.spawnsThisFrame--;
      throw error;
    }
  }

  /**
   * Rebuild the current-position entity index exactly once when any NHI is live. The work is O(N)
   * and independent of NHI population M; M=0 is an exact no-op. Returns the number inserted so
   * deterministic tests and diagnostics can pin that structural scaling without wall-clock flakes.
   */
  rebuildCurrentGridForNhi(liveNhiCount: number): number {
    if (!Number.isSafeInteger(liveNhiCount) || liveNhiCount < 0) {
      throw new RangeError('live NHI count must be a non-negative safe integer');
    }
    if (liveNhiCount === 0) return 0;
    const grid = this.ctx.grid;
    grid.clear();
    const list = this.list;
    let inserted = 0;
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (!entity) continue;
      grid.insert(entity);
      inserted++;
    }
    return inserted;
  }

  /**
   * Remove the entity from the scene and dispose its per-entity material (legacy
   * `disposeEntity`, lines 294-302). The geometry is SHARED from the cache — never disposed.
   * Does NOT remove the entity from `list`; use `disposeAt()` for that. O(1).
   */
  dispose(e: Entity): void {
    e.userData.alive = false;
    const ctx = this.ctx;
    // Resource release is best-effort after logical death. A renderer/driver exception must not leave
    // the entity live or make a retry double-decrement population accounting.
    try {
      ctx.scene.remove(e); // instanced mode: mesh was never added, so this is a no-op
    } catch (error) {
      try {
        ctx.audit.record('entity-scene-remove-failed', {
          morphIndex: e.userData.mi,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // Diagnostic sink failure cannot restore a logically dead entity.
      }
    }
    try {
      e.material.dispose();
    } catch (error) {
      try {
        ctx.audit.record('entity-material-dispose-failed', {
          morphIndex: e.userData.mi,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // Diagnostic sink failure cannot restore a logically dead entity.
      }
    }
  }

  /** Apply per-organism accounting and release its owned render resources. O(1). */
  private retire(e: Entity, trackExtinction = true): void {
    const dmi = e.userData.mi;
    const inRange = dmi >= 0 && dmi < this.morphLive.length;
    if (inRange) {
      const cur = this.morphLive[dmi] ?? 0;
      if (cur > 0) this.morphLive[dmi] = cur - 1;
    }
    const isExtinct = inRange ? (this.morphLive[dmi] ?? 0) === 0 : true;
    if (trackExtinction && isExtinct && this.ctx.state.mutations > 0) this.ctx.state.mutations--;
    this.dispose(e);
  }

  /**
   * Dispose the entity at `index` and remove it from `list`, preserving order (the sorting
   * field reads positional order, matching the legacy `splice`). Fires {@link onDeath} (when
   * wired) with the entity's x/z — exactly once per disposal, after the list is consistent,
   * so the callback may safely spawn. Allocation-free ordered removal. O(n − index).
   */
  disposeAt(index: number): void {
    this.removeAt(index, true, true);
  }

  /**
   * Roll back a just-created entity without emitting a biological death/respawn event. This is for
   * failed multi-system registration transactions, not ordinary mortality. O(n − index).
   */
  discardSpawnAt(index: number): void {
    this.removeAt(index, false, false);
  }

  private removeAt(index: number, notifyDeath: boolean, trackExtinction: boolean): void {
    const list = this.list;
    const e = list[index];
    if (!e) return;

    // Fix Bug 14: extinction-triggered decrement of genetic diversity (mutations). O(1) via the live
    // per-morphotype counter — the previous whole-list rescan made a mass die-off / black-hole consume
    // O(deaths·n) ≈ O(n²). Post-decrement count === 0 ⇔ no other live entity shares this morphotype
    // (exactly what the rescan tested), so the `mutations` behaviour is byte-identical.
    this.retire(e, trackExtinction);
    for (let j = index + 1; j < list.length; j++) {
      const next = list[j];
      if (next) {
        list[j - 1] = next; // invariant: j < length ⇒ defined
        this.copyOrganismGoal(j, j - 1);
        this.brainSlots?.swapEntitySlots(j, j - 1);
      }
    }
    list.length -= 1;
    this.clearOrganismGoal(list.length);
    this.brainSlots?.clearEntitySlot(list.length);
    const onDeath = this.onDeath;
    if (notifyDeath && onDeath) onDeath(e.position.x, e.position.z);
  }

  /**
   * Dispose a strictly-descending set of live indices with one stable compaction pass. Survivor
   * order and descending death-callback order match repeated {@link disposeAt}, while `d` removals
   * cost O(n + d), not O(d·n). The caller may reuse its index array.
   */
  disposeManyDescending(indices: readonly number[]): number {
    const count = indices.length;
    if (count === 0) return 0;
    const list = this.list;
    let previous = list.length;
    for (let i = 0; i < count; i++) {
      const index = indices[i] ?? -1;
      if (!Number.isSafeInteger(index) || index < 0 || index >= list.length || index >= previous) {
        throw new RangeError('disposeManyDescending requires unique in-range descending indices');
      }
      previous = index;
    }

    const deaths: Entity[] = [];
    for (let i = 0; i < count; i++) {
      const entity = list[indices[i]!];
      if (!entity) throw new RangeError('disposeManyDescending encountered an empty live slot');
      this.retire(entity);
      deaths.push(entity);
    }

    let write = 0;
    let killCursor = count - 1;
    let nextKill = indices[killCursor];
    for (let read = 0; read < list.length; read++) {
      if (read === nextKill) {
        killCursor--;
        nextKill = killCursor >= 0 ? indices[killCursor] : undefined;
        continue;
      }
      const entity = list[read];
      if (entity) {
        list[write] = entity;
        if (write !== read) {
          this.copyOrganismGoal(read, write);
          this.brainSlots?.swapEntitySlots(read, write);
        }
        write++;
      }
    }
    list.length = write;
    for (let i = write; i < write + count; i++) {
      this.clearOrganismGoal(i);
      this.brainSlots?.clearEntitySlot(i);
    }

    const onDeath = this.onDeath;
    if (onDeath) {
      for (let i = 0; i < deaths.length; i++) {
        const entity = deaths[i]!;
        onDeath(entity.position.x, entity.position.z);
      }
    }
    return count;
  }

  /**
   * Dispose the entire population, then respawn `count` organisms with random morphotypes at
   * random positions (legacy `rSim`, line 592 — resetting chaos/mutations/algoStep/graphs is
   * the composition root's job). O(n + count).
   */
  reset(count: number): void {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e) this.dispose(e);
    }
    list.length = 0;
    this.morphLive.fill(0); // whole-population reset; spawn() below re-counts as it repopulates
    this.organismGoals.directionX.fill(0);
    this.organismGoals.directionZ.fill(0);
    this.organismGoals.desire.fill(0);
    this.organismGoals.cover.fill(0);
    this.organismGoals.revision.fill(0);
    this.brainSlots?.resetEntitySlots();
    this.meanMetabolicEnergy = 0.5;
    const rng = this.ctx.rng;
    const morphCount = Math.max(1, this.ctx.morphs.length);
    for (let i = 0; i < count; i++) this.spawn(null, Math.floor(rng() * morphCount));
  }

  /**
   * Advance every organism one frame (legacy entity loop, lines 699-796): behavior field,
   * neural activation decay, chaos jitter + wind physics + damping + integration, belly pulse,
   * containment, auto-split, and temperature-modified death with respawn-when-sparse.
   *
   * Returns a REUSED stats object (copy the fields if retained): `energy` = Σ|vel| over the
   * population, `morphCount` = distinct live morphotype indices.
   *
   * Hot path: allocation-free except event-driven `spawn()` calls (entity creation inherently
   * allocates). O(n·k) where n = entities and k = average neighbors per grid query.
   */
  update(dt: number, t: number): UpdateStats {
    const ctx = this.ctx;
    const state = ctx.state;
    const rng = ctx.rng;
    const list = this.list;
    const maxEntities = ctx.quality.maxEntities;
    const cm = Math.min(state.chaos / 2, 3); // legacy cMul(), line 639
    const windX = state.wind.x * cm * 0.0005; // legacy windScale folded in (line 700)
    const windZ = state.wind.z * cm * 0.0005;
    const tMod = state.temperature < 0 ? 0.7 : state.temperature > 30 ? 1.3 : 1.0;
    // F-RENDER-DYN: the active render style nudges MOTION (speed + jitter), not just appearance.
    // `solid` is the exact identity (speed 1, jitter 1), so the default world — and every test,
    // which all run in 'solid' — stays byte-for-byte unchanged; the style is an audit-recorded
    // user input, so replays reproduce a mode-change script exactly. Both multipliers below apply
    // AFTER the rng() draws (never gating a conditional draw), keeping the seeded stream aligned.
    const dyn = RENDER_MODE_DYN[state.renderMode];
    // SIMULATION N(2) "BREAK FREE" (CONTRACTS V7.6): the chaos-jitter velocity is amplified
    // beyond what the saturated cMul clamp (maxes at chaos=6) can reach, so the population
    // writhes far harder than any N(1) chaos-boost — the contracted "behaviour unhinged"
    // lever, decoupled from the clamp. The gain is applied AFTER each rng() draw (never gates a
    // conditional draw), so at N(1) (gain = 1, exact ×1.0) the seeded stream is byte-identical.
    // F-CHAOS-ENTROPY: ENTROPY damps the jitter toward stillness (order / heat-death). At the
    // default entropy 0 (and every test) entropyFrac is 0 ⇒ ×1, keeping the stream byte-identical;
    // applied AFTER the rng draw like the other gains, so it never gates a conditional draw.
    const entropyFrac = Math.min((state.entropy ?? 0) / ENTROPY_MAX, 1);
    const jitterGain = (state.sim === 2 ? 3 : 1) * dyn.jitter * (1 - 0.85 * entropyFrac);
    const frame = state.frame;
    const env = this.env;
    env.dt = dt;
    env.t = t;
    env.cm = cm;
    // Full-rate behavior re-evaluation on every tier — no ultra cadence throttle (quality contract).
    const theoryStride = 2;
    const flockEvery = 1;
    // F-SPAWN-BUDGET: cap material organism births at the ultra tier so synchronized mitosis RAMPS
    // over ~seconds instead of allocating thousands of entities in one frame. This counter remains
    // live after update so same-frame NHI SPAWN_SWARM attempts spend the unused remainder. At ≤5,000
    // the budget is disabled, preserving every lower-tier golden and draw order.
    this.spawnsThisFrame = 0;
    // Adaptive steady-state target: ORGANIC growth (auto-split, sparse respawn) stops here so
    // an idle ultra world settles below the 10k ceiling. Equals maxEntities on every other tier
    // (target===max ⇒ byte-identical to legacy). The hard spawn cap inside spawn() still uses
    // maxEntities, so user bursts/apocalypse can transiently exceed the target up to 10k, after
    // which the lack of auto-split lets the population relax back toward `target` (CONTRACTS V4.5).
    // V66: the world ramps a LIVE target (state.growthTarget) from ~500 up to the ceiling so the sim
    // loads fast then grows into the huge world; when it's unset (headless tests) fall back to the
    // static tier target (byte-identical legacy behaviour).
    const liveTarget = ctx.state.growthTarget;
    const target = Math.min(
      liveTarget && liveTarget > 0 ? liveTarget : ctx.quality.targetEntities,
      maxEntities,
    );
    MORPHS_SEEN.clear();
    this.phylumCounts.fill(0);
    const phylumCounts = this.phylumCounts;
    let energy = 0;
    let metabolicEnergy = 0;
    let metabolicCount = 0;
    // Render-mode emissive coupling (CONTRACTS V7.3): the per-frame emissive target scales by
    // the mode's boost so NEON's self-glow holds against the decay below. 1 for every other
    // mode ⇒ this loop stays byte-identical outside NEON.
    const emiBoost = RENDER_MODE_FX[state.renderMode].emissiveBoost;
    const emiCap = 2.5 * emiBoost;

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const u = e.userData;
      u.age += dt * 30;
      MORPHS_SEEN.add(u.mi);
      if (u.phylum >= 0 && u.phylum < PHYLUM_COUNT) {
        phylumCounts[u.phylum] = (phylumCounts[u.phylum] ?? 0) + 1;
      }

      const sp2 = u.spd * cm;
      const wfph = t * u.wf + u.ph;
      const sinWF = Math.sin(wfph);
      const cosWF = Math.cos(wfph);
      env.sp2 = sp2;
      env.sinWF = sinWF;
      env.cosWF = cosWF;
      // Theory-behavior stagger (stride 2 — full-rate on every tier).
      env.doTheory = (frame + i) % theoryStride === 0;
      // Flock: every frame on every tier.
      env.doFlock = flockEvery === 1 || (frame + i) % flockEvery === 0;
      // V3.2 OUTLIER blend: a wildcard with a second behavior runs it on the odd
      // TWO-FRAME block (((frame+i) >> 1) & 1) — temporal 50/50 blending,
      // allocation-free (swap, dispatch, restore). The block parity is decoupled
      // from the stagger parity on purpose: the original raw (frame+i) & 1 gate
      // was the exact complement of the stride-2 theory gate above, so a theory
      // second behavior (nash/market/typemorph/setunion/graphseek — 5 of 26) was
      // a guaranteed no-op, and flock-beh2 likewise at ultra (audit fix, 0.6.x).
      // Within a beh2 block the (frame+i) parity still alternates, so blended
      // theory/flock work keeps its contracted stagger cadence at 50% share.
      // Members (beh2 = null) take the legacy path.
      const b2 = u.beh2;
      if (b2 !== null && (((frame + i) >> 1) & 1) === 1) {
        const b1 = u.beh;
        u.beh = b2;
        applyBehavior(e, env);
        u.beh = b1;
      } else {
        applyBehavior(e, env);
      }
      this.applyFloraComfort(e, i, frame, dt);

      // Neural activation decay — slower decay so connectome + brain firing reads as sustained live activity.
      u.act *= 0.975;
      u.act += cm * 0.028 * sinWF;
      if (u.act > 1) {
        e.material.emissiveIntensity = Math.min(e.material.emissiveIntensity + 0.1, emiCap);
      } else {
        const m = ctx.morphs[u.mi];
        if (m)
          // Resting self-glow = morphotype base × the organism's REAL metabolic vitality (wealth
          // sustains the burn, senescence fades it), so an idle body reads out its condition rather
          // than holding a decorative constant. A neural spike (the `act > 1` branch above) or a
          // connectome-hub boost (graph-mind) still overrides this floor and then decays back toward
          // it. Pure f(state), no rng → the seeded trajectory is unchanged.
          e.material.emissiveIntensity = lerp(
            e.material.emissiveIntensity,
            m.emI * emiBoost * metabolicLuminance(u.energy, u.age, u.life),
            clamp01(dt * 2),
          );
      }

      // Chaos jitter + wind physics, damping, integration (legacy lines 771-776).
      // `jitterGain` is applied to the jitter term ONLY, after the rng() draw — at N(1)
      // (gain = 1, an exact ×1.0) every byte is identical; at N(2) the swarm writhes (×3).
      u.vel.x += (rng() - 0.5) * 0.003 * cm * jitterGain + windX;
      u.vel.y += (rng() - 0.5) * 0.0015 * cm * jitterGain;
      u.vel.z += (rng() - 0.5) * 0.003 * cm * jitterGain + windZ;
      u.vel.multiplyScalar(0.98);
      // dt * 60 is the legacy frame-rate normalizer; dyn.speed (F-RENDER-DYN, 1 in 'solid') scales
      // the per-frame displacement so the render style alters how fast the field travels.
      MOVE.copy(u.vel).multiplyScalar(dt * 60 * dyn.speed);
      e.position.add(MOVE);
      // F-NHI: launched beings get "Matrix" buoyancy — a gentle anti-gravity lift so they fly and
      // float through the upper world (the y-ceiling further down still catches them). No rng, and
      // the branch is never taken until you launch one, so the default world is byte-identical.
      if (u.isNhi) u.vel.y += 0.006;
      e.rotation.x += sinWF * 0.012 * sp2 * 0.4;
      e.rotation.y += cosWF * 0.01 * sp2 * 0.35;
      e.rotation.z += Math.sin(wfph + 1) * 0.007 * sp2;

      // Belly pulse — post-split digestion visual (legacy line 779).
      if (u.belly > 0) {
        u.belly -= dt * 30;
        e.material.emissiveIntensity = Math.min(1.5 + Math.sin(t * 8) * 0.5, 3.0);
        e.scale.x = u.sc * (1 + Math.sin(t * 6) * 0.4);
        e.scale.y = u.sc * (1 + Math.cos(t * 5) * 0.3);
        e.scale.z = u.sc;
        if (u.belly <= 0) e.scale.setScalar(u.sc);
      }

      // Finite seal (NaN guard)
      if (
        !Number.isFinite(e.position.x + e.position.y + e.position.z + u.vel.x + u.vel.y + u.vel.z)
      ) {
        e.position.set(0, 5, 0);
        u.vel.set(0, 0, 0);
      }

      // Containment — HARD platform box (owner law: fill the WHOLE ±PLATFORM_HALF square + the full
      // PLATFORM_FLOOR..PLATFORM_CEIL column, but NEVER leave the platform and NEVER rise above the
      // mechalogodrom). A storm-driven / flocking body cannot cross the rim: a proportional brake over
      // the last 50u decelerates the approach, then a hard position clamp + outward-velocity kill
      // guarantees ZERO leakage (the old ±0.005 nudge leaked ~half the swarm downwind). Pure
      // post-integration geometry — draws no rng, so the seeded stream stays byte-identical.
      const H = PLATFORM_HALF;
      const edge = H - 50;
      if (e.position.x > edge) {
        u.vel.x -= (e.position.x - edge) * 0.0025;
        if (e.position.x > H) {
          e.position.x = H;
          if (u.vel.x > 0) u.vel.x = 0;
        }
      } else if (e.position.x < -edge) {
        u.vel.x += (-edge - e.position.x) * 0.0025;
        if (e.position.x < -H) {
          e.position.x = -H;
          if (u.vel.x < 0) u.vel.x = 0;
        }
      }
      if (e.position.z > edge) {
        u.vel.z -= (e.position.z - edge) * 0.0025;
        if (e.position.z > H) {
          e.position.z = H;
          if (u.vel.z > 0) u.vel.z = 0;
        }
      } else if (e.position.z < -edge) {
        u.vel.z += (-edge - e.position.z) * 0.0025;
        if (e.position.z < -H) {
          e.position.z = -H;
          if (u.vel.z < 0) u.vel.z = 0;
        }
      }
      if (e.position.y < PLATFORM_FLOOR) {
        e.position.y = PLATFORM_FLOOR;
        if (u.vel.y < 0) u.vel.y = 0;
      } else if (e.position.y > PLATFORM_CEIL) {
        e.position.y = PLATFORM_CEIL;
        if (u.vel.y > 0) u.vel.y = 0;
      }
      energy += u.vel.length();
      if (u.isNhi || u.age <= u.life * tMod) {
        metabolicEnergy += clamp01(u.energy / 100);
        metabolicCount++;
      }

      // Auto-split (legacy lines 787-788). sT re-arms only on a successful roll, like legacy.
      // Organic growth is gated by the adaptive `target` (= maxEntities on every tier except
      // ultra): an idle world stops splitting at the target instead of climbing to the ceiling.
      // At target === maxEntities (≤5,000) the short-circuited `rng()` is drawn on exactly the
      // legacy frames, so the seeded stream is byte-identical.
      u.sT -= dt * 30 * cm;
      if (u.sT <= 0 && list.length < target && this.hasFrameSpawnCapacity() && rng() < 0.06) {
        u.sT = 300 + rng() * 500;
        SPAWN_AT.set(
          e.position.x + (rng() - 0.5) * 2,
          e.position.y + rng(),
          e.position.z + (rng() - 0.5) * 2,
        );
        // Auto-split: the offspring INHERITS its parent's genome (passed as `e`) — the trait
        // heredity runs on ctx.genomeRng, so the main rng order here is unchanged.
        this.spawnWithinFrameBudget(
          SPAWN_AT,
          (u.mi + Math.floor(rng() * 5)) % ctx.morphs.length,
          0.7,
          e,
        );
      }

      // Temperature-modified death + respawn-when-sparse (legacy lines 790-795).
      // onDeath fires inside disposeAt — exactly once per death, never doubled here.
      if (!u.isNhi && u.age > u.life * tMod) {
        // F-NHI: launched beings are age-immortal (the `!u.isNhi` guard) — undefined on every
        // normal organism, so this is byte-identical until you launch one.
        const ex = e.position.x;
        const ez = e.position.z;
        this.disposeAt(i);
        // Sparse floor scales with the adaptive target (legacy 100 of 1000 = 10%; = maxEntities
        // on tiers ≤ 5,000, so byte-identical there). Keeps "repopulate when sparse" proportional
        // to the steady-state target rather than the 10k ceiling.
        if (list.length < Math.max(100, target * 0.1)) {
          for (let r = 0; r < 3; r++) {
            if (!this.hasFrameSpawnCapacity()) break;
            SPAWN_AT.set(
              (rng() - 0.5) * 2 * PLATFORM_HALF * 0.6 + ex * 0.3,
              PLATFORM_FLOOR + rng() * (PLATFORM_CEIL - PLATFORM_FLOOR),
              (rng() - 0.5) * 2 * PLATFORM_HALF * 0.6 + ez * 0.3,
            );
            this.spawnWithinFrameBudget(SPAWN_AT, Math.floor(rng() * ctx.morphs.length));
          }
        }
      }
    }

    STATS.energy = energy;
    STATS.morphCount = MORPHS_SEEN.size;
    this.meanMetabolicEnergy = metabolicCount > 0 ? metabolicEnergy / metabolicCount : 0.5;
    return STATS;
  }

  /**
   * True morphogenesis (legacy `remorphEntity`, lines 304-326): swap the shared-geometry
   * reference and rewrite the per-entity material in place — cheaper than dispose + respawn
   * because the mesh and scene slot are reused. Zero allocation. O(1).
   */
  remorph(e: Entity, mi: number): void {
    const ctx = this.ctx;
    const morphCount = ctx.morphs.length;
    if (morphCount === 0) return; // defensive: empty taxonomy
    const m: PhylumMorphType | undefined = ctx.morphs[mi % morphCount];
    if (!m) return; // invariant: morphs is dense — defensive only
    const geo = ctx.geos[m.gi];
    if (geo) e.geometry = geo; // shared from the cache — swap only, never dispose
    const mat = e.material;
    mat.color.copy(m.col);
    mat.emissive.copy(m.em);
    paintVibrant(mat, m, (mi % morphCount) + this.list.length);
    // BRUTALISM (phone tier): the material's TRUE colour just changed — drop its captured base so the
    // next applyBrutalism re-captures the new morph colour. Without this, a remorph WHILE concrete
    // (mutation / puppet-master / titan effects) would desaturate from — and restore to — the OLD
    // colour, silently losing the remorph. WeakMap delete is a no-op when no base was captured.
    this.brutalBase.delete(mat);
    // metalness/roughness/transparent/opacity/side/wireframe/emissive + depthWrite are all set
    // by applyRenderModeTo on top of the morphotype base (CONTRACTS V7.3).
    applyRenderModeTo(mat, ctx.state.renderMode, m);
    const u = e.userData;
    // Remorph in place: move the morphotype live-count from the old mi to the new one.
    const remorphMi = mi % morphCount;
    if (u.mi >= 0 && u.mi < this.morphLive.length) {
      const cur = this.morphLive[u.mi] ?? 0;
      if (cur > 0) this.morphLive[u.mi] = cur - 1;
    }
    if (remorphMi >= 0 && remorphMi < this.morphLive.length)
      this.morphLive[remorphMi] = (this.morphLive[remorphMi] ?? 0) + 1;
    u.mi = remorphMi;
    u.beh = m.beh;
    u.spd = m.spd;
    u.wf = 0.3 + ctx.rng() * 6;
    u.wa = 0.03 + ctx.rng() * 0.5;
    u.phylum = m.phylum ?? -1; // true morphogenesis crosses phylum lines (V3.2)
    u.beh2 = m.beh2 ?? null;
    e.scale.setScalar(u.sc);
  }

  /**
   * Apply a {@link RenderMode} to every live entity's material (CONTRACTS V7.3, supersedes the
   * legacy `tW` wireframe toggle, line 594). `ctx.state.renderMode` is owned by the composition
   * root; spawns and remorphs read it for new/rewritten materials. Each material is rebased on
   * its morphotype so switching back to SOLID restores the exact base look. O(n).
   */
  setRenderMode(mode: RenderMode): void {
    const ctx = this.ctx;
    const morphCount = ctx.morphs.length;
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const m = morphCount > 0 ? ctx.morphs[e.userData.mi % morphCount] : undefined;
      if (m) applyRenderModeTo(e.material, mode, m);
    }
  }

  /**
   * BRUTALISM (phone-tier parity): desaturate every real-mesh organism toward raw concrete, the
   * exact CPU mirror of {@link InstancedEntityRenderer}'s in-shader desaturate
   * (`mix(color, mix(luma-grey, concrete, 0.55), f)`). On the instanced tiers organisms are GPU
   * instances and this is a no-op (the shader uniform already does it); only the legacy per-mesh
   * path — `quality.instanced === false`, where each organism is a real `THREE.Mesh` in the scene
   * (see {@link spawn}) — needs the CPU pass, otherwise the ▦ BRUTAL toggle turned sky + ground +
   * apex bodies to concrete while the whole organism population kept its lurid colours (mobile/touch).
   *
   * Each material's TRUE colour is captured at the on-edge (and for any organism spawned mid-mode)
   * into a {@link WeakMap}, so the desaturate lerps FROM the base every frame and never compounds;
   * the OFF edge restores the captured colour exactly, making `f = 0` byte-identical. Emissive is
   * left to {@link update} (which re-targets it each frame), matching the instanced shader, which
   * also touches only the diffuse. Allocation-free after first sight; O(n) and called only on the
   * phone tier. See tests/entity-brutalism.test.ts.
   */
  applyBrutalism(f: number): void {
    if (this.ctx.quality.instanced) return; // GPU instances desaturate in-shader — nothing to do here
    const g = f < 0 ? 0 : f > 1 ? 1 : f;
    const list = this.list;
    if (g <= 0) {
      if (this.brutalPrevG > 0) {
        // OFF edge — restore each organism's true colour from its captured (packed-hex) base.
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e) continue;
          const baseHex = this.brutalBase.get(e.material);
          if (baseHex !== undefined) e.material.color.setHex(baseHex);
        }
      }
      this.brutalPrevG = 0;
      return; // steady OFF: never touch the rendered colour ⇒ byte-identical
    }
    const onEdge = this.brutalPrevG <= 0;
    const concrete = ENT_BRUTAL_CONCRETE;
    const tgt = ENT_BRUTAL_SCRATCH;
    const base = ENT_BRUTAL_BASE;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      const mat = e.material;
      let baseHex = this.brutalBase.get(mat);
      if (baseHex === undefined || onEdge) {
        // First sight (incl. mid-mode spawns) OR the moment brutalism engages: capture the live TRUE
        // colour as a packed hex — at the on-edge the rendered colour IS the true colour (steady-OFF
        // never touched it, and the prior OFF edge restored it). No allocation.
        baseHex = mat.color.getHex();
        this.brutalBase.set(mat, baseHex);
      }
      base.setHex(baseHex);
      const lum = base.r * 0.299 + base.g * 0.587 + base.b * 0.114; // Rec.601 luma (matches shader)
      tgt.setRGB(lum, lum, lum).lerp(concrete, 0.55);
      mat.color.copy(base).lerp(tgt, g);
    }
    this.brutalPrevG = g;
  }

  /**
   * Plants become ecology, not decoration: exhausted, mating-ready, old or hurt organisms seek
   * nearby grove cover, slow down inside it (rest/camouflage), and split a little faster there
   * (mating/gathering). Deterministic, no rng, strided to bound the 10k tier.
   */
  private applyFloraComfort(e: Entity, index: number, frame: number, dt: number): void {
    const query = this.floraComfort;
    if (((frame + index) & 3) !== 0) return;
    if (!query) {
      this.clearOrganismGoal(index);
      return;
    }
    const u = e.userData;
    const hunger = 1 - clamp01(u.energy / 100);
    const mating = u.sT < 180 ? 1 : 0;
    const old = u.life > 0 ? clamp01(u.age / u.life) : 0;
    const hurt = u.payoff < 0 ? Math.min(1, -u.payoff * 0.25) : 0;
    const intelligence = this.ctx.organismIntelligence;
    const cognition = intelligence?.enabled
      ? 0.82 +
        intelligence.resourcePressure * 0.28 +
        intelligence.threatResponse * 0.12 +
        intelligence.forecast * 0.08
      : 1;
    const desire = clamp01((hunger * 0.35 + mating * 0.35 + old * 0.2 + hurt * 0.2) * cognition);
    if (desire <= 0.02) {
      this.clearOrganismGoal(index);
      return;
    }

    // Smarter foraging: a HUNGRY animal climbs the flora BIOMASS gradient toward the RICHEST patch —
    // gradient-ascent chemotaxis on the live biomass field via a deterministic finite difference of the
    // read-only sampler — instead of only drifting to the nearest cover below. Only hungry entities; the
    // sampler is null in tests ⇒ the seeded golden is byte-identical. See tests/flora-chemotaxis.test.ts.
    const grad = this.floraGradient;
    if (grad && hunger > 0.2) {
      const px = e.position.x;
      const pz = e.position.z;
      const P = 6; // probe span (world units) — a few flora cells wide
      const gx = grad(px + P, pz) - grad(px - P, pz);
      const gz = grad(px, pz + P) - grad(px, pz - P);
      const gn = Math.hypot(gx, gz);
      if (gn > 1e-6) {
        const chemo = hunger * dt * 0.7; // hungrier ⇒ stronger climb toward food
        u.vel.x += (gx / gn) * chemo;
        u.vel.z += (gz / gn) * chemo;
      }
    }

    const cover = query(e.position.x, e.position.z);
    const strength = clamp01(cover.strength);
    if (strength <= 0.01) {
      this.clearOrganismGoal(index);
      return;
    }

    const dx = cover.x - e.position.x;
    const dz = cover.z - e.position.z;
    const d2 = dx * dx + dz * dz;
    const reach = 92;
    const inv = d2 > 1e-6 ? 1 / Math.sqrt(d2) : 0;
    // Publish the normalized resource goal for the independent neural controller. It is intentionally
    // written even just outside the direct ecology reach, so the brain can plan toward it next frame.
    const goals = this.organismGoals;
    goals.directionX[index] = dx * inv;
    goals.directionZ[index] = dz * inv;
    goals.desire[index] = desire;
    goals.cover[index] = strength;
    goals.revision[index] = ((goals.revision[index] ?? 0) + 1) >>> 0;
    if (d2 > reach * reach) return;
    const seekGain = intelligence?.enabled
      ? 0.8 + intelligence.confidence * 0.18 + intelligence.corpusDrive * 0.12
      : 1;
    const pull = strength * desire * dt * 0.9 * seekGain;
    u.vel.x += dx * inv * pull;
    u.vel.z += dz * inv * pull;
    if (d2 < 28 * 28) {
      const rest = 1 - strength * desire * 0.08;
      u.vel.x *= rest;
      u.vel.y *= 1 - strength * desire * 0.04;
      u.vel.z *= rest;
      u.act += strength * desire * 0.012;
      u.sT -= strength * desire * 0.35;
      e.material.color.lerp(FLORA_CAMO, strength * desire * 0.012);
      // USER ecology: a HUNGRY animal resting in the plants GRAZES them — it eats the biomass down (the
      // flora depletes + regrows on its side) and gains the returned FOOD as energy. Gated behind the
      // injected sink (null in tests ⇒ the seeded golden is untouched); deterministic (no rng).
      if (this.floraGraze && hunger > 0.15) {
        const food = this.floraGraze(cover.x, cover.z, hunger, dt);
        if (food > 0) {
          const ne = u.energy + food;
          u.energy = ne > 100 ? 100 : ne;
        }
      }
    }
  }

  /**
   * Back-compat alias (CONTRACTS V7.3): the old binary wireframe toggle maps onto the new
   * render-mode cycle. O(n).
   */
  setWireframe(on: boolean): void {
    this.setRenderMode(on ? 'wire' : 'solid');
  }
}
