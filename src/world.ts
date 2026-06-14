/**
 * Composition root of the simulation: constructs every system against the
 * contracts in docs/MODULE-CONTRACTS.md, owns the mutable SimState, implements
 * all UiActions, and drives the per-frame pipeline
 * (camera → weather → puppet masters → grid → shoggoths → sector → sort step →
 *  entities → connectome → quantum → environment → telemetry → render).
 *
 * Frame-pipeline cadences (mirrors the legacy monolith):
 * grid rebuild every 2nd frame; connectome every 1/2/3 frames at n≤400/≤700/>700;
 * telemetry every 8th frame. `step()` is allocation-free (module scratch only).
 */
import * as THREE from 'three';
import type { Engine } from './core/engine';
import type {
  PersistedState,
  QualityProfile,
  SimContext,
  SimState,
  TelemetrySnapshot,
  UiActions,
} from './types';
import type { Entity } from './types';
import type { ViewMode, Weather } from './sim/constants';
import {
  ARENA_MID,
  ARENA_Y,
  CHAOS_LEVELS,
  CHAOS_MAX,
  CHAOS_MIN,
  ENTROPY_MAX,
  ENTROPY_STEP,
  GRID_CELL,
  GROUND_EXTENT,
  RENDER_MODES,
  SPACE_FOVS,
  TIME_SCALES,
  TRACKING_VIEWS,
  ULTRA_GRID_CELL,
  VIEW_MODES,
  WEATHERS,
} from './sim/constants';
import { ALGOS, ALGO_GLYPHS, ALGO_IGNITE } from './sim/algorithms';
import { SONGS, SFX_EXTRA_BANDS } from './audio/songs';
import { mulberry32, type Rng } from './math/rng';
import { clamp } from './math/scalar';
import { SpatialHash } from './math/spatial-hash';
import { createGeometryCache } from './sim/geometry-cache';
import { createMorphotypes } from './sim/morphotypes';
import { createPhyla } from './sim/phyla';
import { EntityManager } from './sim/entities';
import { InstancedEntityRenderer, type InstanceFrame } from './sim/instanced-entities';
import { ShoggothSystem } from './sim/shoggoths';
import { PuppetMasterSystem } from './sim/puppet-masters';
import { TitanSystem } from './sim/titans';
import { WeatherSystem } from './sim/weather';
import { QuantumCloud } from './sim/quantum';
import { Connectome } from './sim/connectome';
import { EnvironmentSystem } from './sim/environment';
import { QuantumCircuitSystem } from './sim/qcircuit';
import { ReactionDiffusionSystem } from './sim/reaction-diffusion';
import { GraphMind } from './sim/graph-mind';
import { ConstellationSystem } from './sim/constellations';
import { AtmosphereSystem } from './sim/atmosphere';
import { Viz3DSystem, type Viz3DSnapshot } from './sim/viz3d';
import { SingularitySystem, SINGULARITY_KINDS } from './sim/singularities';
import { ArtifactField } from './sim/artifacts';
import { LeviathanSystem } from './sim/leviathans';
import { NhiSystem, type NhiWorld } from './sim/nhi-system';
import { Economy } from './sim/economy';
import { NhiAction, type NhiIntent, type NhiPercept } from './sim/nhi';
import { NhiBodySystem } from './sim/nhi-body';
import { CosmicWeb } from './sim/cosmic-web';
import { GoldLattice } from './sim/gold-lattice';
import { QuantumLattice } from './sim/quantum-lattice';
import { LoreEngine } from './sim/lore';
import { AnalyticsSystem } from './sim/analytics';
import { AudioEngine } from './audio/engine';
import { AudioAnalysis, type AudioBands } from './audio/analysis';
import { Hud } from './ui/hud';
import { Observatory } from './ui/observatory';
import { NhiObservatory } from './ui/nhi-observatory';
import { MarketTicker } from './ui/market-ticker';
import { SuperCreature, type SuperPercept } from './sim/super-creature';
import { SuperBodySystem } from './sim/super-body';
import { SuperPanel } from './ui/super-panel';
import { SuperheroState, HERO_POWERS } from './ui/superhero-state';
import { SuperheroHud } from './ui/superhero-hud';
import { TelemetryPanel, bindPanelToggles } from './ui/panels';
import { InputSystem } from './ui/input';
import type { AuditTrail } from './logging/audit';
import { createLogger } from './logging/logger';
import type { MemoryStore } from './memory/store';

/** Cyclic element access into a non-empty readonly array. O(1). */
function cyc<T>(arr: readonly T[], i: number): T {
  const v = arr[((i % arr.length) + arr.length) % arr.length];
  if (v === undefined) throw new Error('cyc: empty array');
  return v;
}

/** AUTO mode dwell: seconds on each sorting field before advancing to the next (V7.2). */
const ALGO_AUTO_PERIOD = 6;

/** Cosmology SFX palette entries (V7.4) — band starts from the 100-voice palette. */
const SFX_SUBBOOM = SFX_EXTRA_BANDS['subboom']?.start ?? 0;
const SFX_FMCLANG = SFX_EXTRA_BANDS['fmclang']?.start ?? 0;
const SFX_STRANGE = SFX_EXTRA_BANDS['strange']?.start ?? 0;

/**
 * SIMULATION N(2) chaos floor (V7.6): the nightmare never settles below this. Set at the cMul
 * SATURATION point — `chaosMul()` is `min(chaos/2, 3)`, which maxes at chaos = 6 — so N(2)
 * pins every chaos consumer (behaviour agitation, sort push, sky tremor) to its ceiling. The
 * earlier 3.5 sat BELOW saturation (cm 1.75 — milder than an ordinary chaos-boost); the
 * dedicated jitterGain in entities.update() carries the agitation PAST the clamp on top.
 */
const CHAOS_NIGHTMARE_FLOOR = 6;

export interface WorldOptions {
  engine: Engine;
  quality: QualityProfile;
  persisted: PersistedState;
  store: MemoryStore;
  audit: AuditTrail;
}

export class World {
  private readonly engine: Engine;
  private readonly quality: QualityProfile;
  private readonly persisted: PersistedState;
  private readonly store: MemoryStore;
  private readonly audit: AuditTrail;
  private readonly log = createLogger('world');

  private readonly rng: Rng;
  private readonly state: SimState;
  private readonly grid: SpatialHash<Entity>;
  private readonly audio: AudioEngine;
  private readonly entities: EntityManager;
  private readonly shoggoths: ShoggothSystem;
  private readonly puppets: PuppetMasterSystem;
  private readonly weather: WeatherSystem;
  private readonly quantum: QuantumCloud;
  private readonly connectome: Connectome;
  private readonly environment: EnvironmentSystem;
  private readonly hud: Hud;
  private readonly panel: TelemetryPanel;
  private readonly input: InputSystem;

  // ── PANTHEON V3 systems (CONTRACTS V3) ──
  private readonly titans: TitanSystem;
  private readonly observatory: Observatory;
  /** F-NHI V15: the self-building 3×3 neural-observatory panel for the focused NHI. */
  private readonly nhiObs: NhiObservatory;
  /** F-ECON V23: the self-building market-ticker panel (live AURUM/UMBRA market state). */
  private readonly marketTicker: MarketTicker;

  // F-SUPER V31: the always-active apex mind + its self-mounting telemetry panel + sired twins.
  private readonly superCreature: SuperCreature;
  private readonly superTwins: SuperCreature[] = [];
  private readonly superPanel: SuperPanel;
  private readonly superBody: SuperBodySystem;
  private readonly superRng: Rng;
  private readonly superScene: THREE.Scene;
  // F-SUPER V34/35: puzzle-gated extra creatures (≤3 twins) + the SUPERHERO player layer (state + HUD).
  private readonly heroBodies: { body: SuperBodySystem; mind: SuperCreature; econId: number }[] =
    [];
  private superheroUnlocked = false;
  private readonly superheroState = new SuperheroState();
  private readonly superheroHud: SuperheroHud;
  /** Pool renderer; null on the phone tier (V1 per-mesh path — V3.1). */
  private readonly instanced: InstancedEntityRenderer | null;
  /** Total morphotypes minted at boot (250 in phylum mode). */
  private readonly morphTotal: number;
  /** Strided mean of the RD V field, refreshed every 60 frames (V3.5). */
  private rdEnergy = 0;
  // F-CAM5 subject cache: the tracked organism's position + XZ heading for the motion camera
  // modes. Written by resolveSubject(), read by updateCamera(). Presentation-only scratch — the
  // camera never writes sim state, so these never affect determinism.
  private camSubX = 0;
  private camSubY = 0;
  private camSubZ = 0;
  private camSubVX = 0;
  private camSubVZ = 0;
  /** Tracked organism's mean scale (bounding radius proxy) — drives the macro SPECIMEN framing. */
  private camSubR = 1;

  // ── Wildbeyond V2 systems (CONTRACTS V2) ──
  private readonly lore: LoreEngine;
  private readonly qc: QuantumCircuitSystem;
  private readonly rd: ReactionDiffusionSystem;
  private readonly graphMind: GraphMind;
  private readonly constellations: ConstellationSystem;
  private readonly atmosphere: AtmosphereSystem;
  private readonly viz3d: Viz3DSystem;
  /** Cosmological chaos effects (CONTRACTS V7.4) — at most one active at a time. */
  private readonly singularities: SingularitySystem;
  /** Persistent visual relics from deaths/singularities (V9 F-ARTIFACTS). Visual-only: no rng/sim write. */
  private readonly artifacts: ArtifactField;
  private readonly leviathans: LeviathanSystem;

  // ── F-NHI V10: apex super-minds (src/sim/nhi.ts) that READ the world and WRITE to it ─────────
  /** Drives each launched NHI's deterministic mind → real effects (spawn swarms, dominate, broadcast). */
  private readonly nhi = new NhiSystem();

  // ── F-ECONOMY V13: two competing currencies (AURUM/UMBRA) + two commodities (QUANTA/ICHOR), a
  //    game-theoretic clearing market every intelligence plugs into. It runs on its OWN seeded rng
  //    sub-stream (`econRng`), so registering agents + ticking the market never shift the main
  //    deterministic draw order — existing golden/parity tests stay byte-identical.
  private static readonly ECON_TITAN_BASE = 1000;
  /** F-ECON-CREATURES V17: shoggoth econ ids occupy 2000..2099 (≤100 horde; clear of titans/NHIs). */
  private static readonly ECON_SHOGGOTH_BASE = 2000;
  /** F-ECON-CREATURES V19: puppeteer econ ids occupy 3000..3099 (≤100 cabal; clear of others). */
  private static readonly ECON_PUPPET_BASE = 3000;
  private static readonly ECON_NHI_BASE = 5000;
  /** F-SUPER V31: the apex purse (+1..3 for its twins). 9000 leaves headroom below it. */
  private static readonly ECON_SUPER_BASE = 9000;
  private readonly economy = new Economy();
  private readonly econRng: Rng;
  /** Live NHI entities keyed by mind id; pruned when an NHI dies (leaves entities.list). */
  private readonly nhiEntities = new Map<number, Entity>();
  /** Monotonic NHI mind id — a stable key across the shifting entities.list. */
  private nhiNextId = 0;
  /** Thin facade the NhiSystem reaches the world through (delegates to the methods below). */
  private readonly nhiWorld: NhiWorld = {
    liveIds: () => this.nhiLiveIds(),
    percept: (id) => this.nhiPercept(id),
    apply: (id, intent, text) => this.nhiApply(id, intent, text),
  };
  /** Alien biomechanical bodies for launched NHIs (additive viz; assigned in the constructor). */
  private readonly nhiBody: NhiBodySystem;
  /** Far-field cosmic web — depth + context backdrop (additive; assigned in the constructor). */
  private readonly cosmicWeb: CosmicWeb;
  /** Floating gold wireframe forms — architectural depth (additive; assigned in the constructor). */
  private readonly goldLattice: GoldLattice;
  /** Floating neon sacred-geometry shells — the quantum heart (additive; assigned in the constructor). */
  private readonly quantumLattice: QuantumLattice;
  /** Cycle cursor for the chaos control's singularity chooser. */
  private singularityCursor = 0;
  /** Reused per-frame scalar block handed to the instanced renderer (alloc-free). */
  private readonly instFrame: InstanceFrame = { t: 0, chaos: 0, bass: 0, nightmare: 0 };
  private readonly audioAnalysis: AudioAnalysis;
  private readonly analytics: AnalyticsSystem;
  /** Reused adapter mapping `titanLedger`→`ledger` for Viz3DSnapshot; fields
   *  point at the live snapshot views, repopulated each frame (allocation-free). */
  private readonly viz3dSnap: Viz3DSnapshot;
  /** Last collapse basis seen, to detect measurement events across frames. */
  private lastCollapseSeen = -1;
  /** Cached `.algo-row` elements (one per ALGOS entry) for the picker panel. */
  private readonly algoRows: HTMLElement[] = [];
  /** `#algo-active` readout, or null when the picker DOM is absent. */
  private algoActiveEl: HTMLElement | null = null;
  /** RUN ALL / AUTO mode buttons (V7.2), or null when the picker DOM is absent. */
  private algoAllBtn: HTMLElement | null = null;
  private algoAutoBtn: HTMLElement | null = null;
  /** Sorted-ness of the active field, 0 (chaotic) .. 1 (sorted) — picker progress. */
  private sortedFraction = 0;
  /** Round-robin cursor for RUN ALL mode (which field each blended proposal draws from). */
  private allModeCursor = 0;

  /** Pre-allocated sort-value buffer (Known Bug 4 fix). */
  private readonly sortVals: Float32Array;
  /** Scratch vectors — step() and actions never allocate. */
  private readonly sv1 = new THREE.Vector3();
  private readonly sv2 = new THREE.Vector3();
  /** Reused telemetry snapshot (panel reads synchronously). */
  private readonly snap: TelemetrySnapshot;

  private lastSector = '';
  private energy = 0;
  private morphCount = 0;
  private sfxRestored = false;

  constructor(opts: WorldOptions) {
    this.engine = opts.engine;
    this.quality = opts.quality;
    this.persisted = opts.persisted;
    this.store = opts.store;
    this.audit = opts.audit;

    this.rng = mulberry32(this.persisted.seed);
    // Economy rng: a deterministic sub-stream derived from the world seed (golden-ratio mix), kept
    // separate from `this.rng` so the market never perturbs the main simulation's draw order.
    this.econRng = mulberry32((this.persisted.seed ^ 0x9e3779b1) >>> 0 || 1);

    this.state = {
      chaos: 0.5,
      entropy: 0,
      mutations: 0,
      timeScale: 1,
      renderMode: 'solid',
      sim: this.persisted.sim === 2 ? 2 : 1,
      weatherIdx: this.persisted.weatherIdx % WEATHERS.length,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: this.persisted.viewIdx % VIEW_MODES.length,
      algoIdx: this.persisted.algoIdx % ALGOS.length,
      songIdx: this.persisted.songIdx % SONGS.length,
      algoStep: 0,
      algoMode: 'single',
      algoTimer: 0,
      frame: 0,
      elapsed: 0,
    };

    // Spatial-hash cell size. The legacy GRID_CELL (16, = 8 × ARENA-scaled) is kept for every
    // tier ≤ 5,000 entities — same cells, same query neighbor sets, same rng-relevant decisions
    // (nash/market draw rng conditional on neighbor payoffs, so the cell size is part of the
    // seeded stream; tuning it at ≤5,000 would break reproducibility). At the ultra tier (10k)
    // the arena packs ~4× denser, so a 3×3 GRID_CELL block returns ~214 candidates per query.
    // A 10-unit cell (measured sweet spot, docs/BENCHMARKS.md) cuts that ~36% while keeping the
    // visited-cell count low for the radius-8..16 behavior queries — the smaller cells below 10
    // were rejected (per-query cell-iteration overhead overtook the neighbor savings). V3.6.
    this.grid = new SpatialHash<Entity>(
      this.quality.maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL,
    );
    // Audio gets its OWN derived stream: its setInterval callbacks drain rng at
    // wall-clock moments, which would make the sim stream timing-dependent and
    // break same-seed reproducibility (audit finding, 0.2.1).
    this.audio = new AudioEngine(this.state, mulberry32((this.persisted.seed ^ 0xa0d10) >>> 0));

    // Lore precedes the taxonomy: phyla are lore-named at mint (CONTRACTS V3.2).
    this.lore = new LoreEngine(this.persisted.seed);
    const geos = createGeometryCache();
    const phyla = createPhyla(this.rng, (i) => this.lore.name('tribe', i), geos.length);
    const morphs = createMorphotypes(this.rng, geos.length, phyla);
    this.morphTotal = morphs.length;
    const ctx: SimContext = {
      scene: this.engine.scene,
      quality: this.quality,
      rng: this.rng,
      grid: this.grid,
      morphs,
      geos,
      state: this.state,
      audit: this.audit,
      sfx: (type) => this.audio.play(type),
    };

    this.environment = new EnvironmentSystem(ctx);
    this.entities = new EntityManager(ctx);
    this.instanced = this.quality.instanced ? new InstancedEntityRenderer(ctx) : null;
    this.entities.reset(this.bootPopulation());
    this.shoggoths = new ShoggothSystem(ctx, this.entities);
    // F-ECON-CREATURES V17: enrol the shoggoth horde as economic agents (modest purses) and let each
    // one's wealth drive its boldness. Draws only from econRng, so the main stream is untouched.
    for (let i = 0; i < this.shoggoths.count; i++) {
      // Varied stature (golden-angle spread, no rng) so the horde starts with UNEQUAL purses — the
      // economy then amplifies the spread, and boldness (wealth / live mean) diverges across the 100.
      const w = 1.3 + 1.8 * ((i * 0.618033988749895) % 1);
      this.economy.register(World.ECON_SHOGGOTH_BASE + i, 'Shoggoth', w, this.econRng);
    }
    this.shoggoths.attachEconomy(
      (idx) => this.economy.wealthOf(World.ECON_SHOGGOTH_BASE + idx)?.netWorth ?? 0,
    );
    // F-CREATURE-TRADE V29: the economic WRITE path — cognition's bargain/ally drives move real worth
    // between two shoggoths (conservation-exact), closing the wealth→boldness loop. Same index→id base.
    this.shoggoths.attachTrade((fromIdx, toIdx, v) =>
      this.economy.transferWorth(
        World.ECON_SHOGGOTH_BASE + fromIdx,
        World.ECON_SHOGGOTH_BASE + toIdx,
        v,
      ),
    );
    // Callback fires from update(), well after `hud`/`qc`/`lore` are assigned
    // below; the PuppetEvent argument is a reused scratch object — read
    // synchronously (qc.onPuppetEvent reads e.name synchronously too).
    this.puppets = new PuppetMasterSystem(ctx, this.entities, (e) => {
      this.qc.onPuppetEvent(e);
      this.hud.showToast(`${e.name} ${this.lore.epithet('puppet', e.name)}`, e.action);
    });
    // F-ECON-CREATURES V19: enrol the puppeteer cabal as economic agents (varied golden-angle purses,
    // no rng) and let wealth drive how often each meddles. econRng only → main stream untouched.
    for (let i = 0; i < this.puppets.count; i++) {
      const w = 1.2 + 1.7 * ((i * 0.618033988749895) % 1);
      this.economy.register(World.ECON_PUPPET_BASE + i, 'Puppeteer', w, this.econRng);
    }
    this.puppets.attachEconomy(
      (idx) => this.economy.wealthOf(World.ECON_PUPPET_BASE + idx)?.netWorth ?? 0,
    );
    this.weather = new WeatherSystem(ctx, this.engine);
    this.quantum = new QuantumCloud(ctx);
    this.connectome = new Connectome(ctx, this.entities);

    // ── Wildbeyond V2 wiring (cadences in step(); see ARCHITECTURE.md) ──
    this.qc = new QuantumCircuitSystem(ctx);
    // The bands buffer is live/reused — hand it to the cloud once; qc.bands()
    // refreshes its contents in place on the 6-frame cadence.
    this.quantum.setQuantumBands(this.qc.bands());
    this.rd = new ReactionDiffusionSystem(ctx);
    this.environment.attachGroundEmissiveMap(this.rd.texture);
    // F-ARTIFACTS (V9): the world accrues visible relics. A pooled InstancedMesh that draws no rng
    // and writes no sim state, so it cannot perturb the seeded stream or the determinism golden.
    this.artifacts = new ArtifactField(ctx.scene);
    // Death→ground feedback: every disposal (age-death AND shoggoth
    // consumption, single-fire inside disposeAt) scars the living ground at
    // the corpse's UV — the mortality loop the contract headlines — AND drops a scar relic.
    this.entities.onDeath = (x, z) => {
      this.rd.perturb(0.5 + x / GROUND_EXTENT, 0.5 - z / GROUND_EXTENT, 2);
      this.artifacts.placeGround(x, z, 'scar', this.state.elapsed); // visual-only, seeded-time stamp
    };
    // Boot scars: the Gray-Scott fixed point is uniform — seed a few
    // disturbances so the ground skin starts breathing (rd writer note).
    for (let i = 0; i < 4; i++) this.rd.perturb(this.rng(), this.rng());
    // ── PANTHEON V3.3: the ten colossi and their economy/war layer ──
    this.titans = new TitanSystem(ctx, this.entities, this.lore, this.rd);
    // F-ECONOMY V13: enrol the ten colossi as economic agents with titan-sized purses (their
    // stature = a base weight + a per-titan bump). Draws only from `econRng`, so this never shifts
    // the main rng order — the world after this point is byte-identical to before the economy.
    for (let i = 0; i < this.titans.count; i++) {
      const name = this.titans.ledger[i]?.name ?? `Titan ${i}`;
      this.economy.register(World.ECON_TITAN_BASE + i, name, 8 + (i % 5) * 0.7, this.econRng);
    }
    // F-DIPLO-ECON V16: let the AURUM/UMBRA economy steer titan diplomacy — a titan far richer than a
    // rival is emboldened to raid (→ WAR), a poorer one appeases. Reads economy net worth by index.
    this.titans.attachEconomy(
      (idx) => this.economy.wealthOf(World.ECON_TITAN_BASE + idx)?.netWorth ?? 0,
    );
    this.graphMind = new GraphMind(ctx, this.entities, this.connectome);
    this.constellations = new ConstellationSystem(ctx, this.lore);
    this.audioAnalysis = new AudioAnalysis(this.audio);
    // Omens arrive lore-named: same seed, same prophecy vocabulary.
    this.analytics = new AnalyticsSystem(ctx, (i) => this.lore.name('omen', i));
    // ── XENOGENESIS V4: alien air + holographic 3D analytics ──
    // Atmosphere draws 13 + 5·floor(maxEntities/4) rng samples — constructed
    // last among rng-consuming sim systems so it never shifts their streams.
    this.atmosphere = new AtmosphereSystem(ctx);
    this.viz3d = new Viz3DSystem(ctx); // zero rng draws — placement-neutral
    // Cosmological chaos (V7.4): draws no rng and builds nothing at construction (lazy on
    // summon), so it is boot-stream-neutral like viz3d.
    this.singularities = new SingularitySystem(ctx, this.entities);
    // F-HOLES: let an active singularity tug the big roaming beings too, not just the organisms.
    this.shoggoths.attachSingularity(this.singularities);
    this.titans.attachSingularity(this.singularities);
    // F-BEINGS: a fourth order of colossi (leviathans). Boot-stream-neutral — draws no rng here.
    this.leviathans = new LeviathanSystem(ctx);
    this.leviathans.attachSingularity(this.singularities);
    // F-NHI V10: alien biomechanical bodies for launched NHIs (additive; draws no rng).
    this.nhiBody = new NhiBodySystem(ctx.scene);
    // V11: far-field cosmic-web backdrop for depth + context (additive; draws no rng).
    this.cosmicWeb = new CosmicWeb(ctx.scene);
    // V11: floating gold wireframe architecture for designed-space depth (additive; draws no rng).
    this.goldLattice = new GoldLattice(ctx.scene);
    // V11: floating neon sacred-geometry quantum lattice (additive; draws no rng).
    this.quantumLattice = new QuantumLattice(ctx.scene);

    this.hud = new Hud();
    this.panel = new TelemetryPanel();
    this.observatory = new Observatory();
    this.nhiObs = new NhiObservatory();
    this.marketTicker = new MarketTicker();
    // F-SUPER V31: the apex mind on its OWN seeded sub-stream (golden-ratio mix off the world seed,
    // like econRng) so `think()`/twins never perturb the main rng order — the determinism golden stays
    // byte-identical. Its wallet (apex stature, weight 20) is enrolled on the SAME sub-stream, so
    // econRng's order is untouched too. The panel self-mounts; the ⬢ ARCHITECT toggle is always shown.
    this.superRng = mulberry32((this.persisted.seed ^ 0x5e1f9d3b) >>> 0 || 1);
    this.superCreature = new SuperCreature(this.superRng);
    this.superPanel = new SuperPanel();
    this.economy.register(World.ECON_SUPER_BASE, this.superCreature.name, 20, this.superRng);
    // F-SUPER V32: the masterful many-eyed apex BODY (god-jewel shader) — additive, draws no rng.
    this.superBody = new SuperBodySystem(ctx.scene);
    this.superScene = ctx.scene;
    this.superheroHud = new SuperheroHud(); // V35: self-mounting player HUD, hidden until unlock
    // F-SUPER V34/35: the access puzzle fires `superhero-unlock` once when solved → reveal #2 + the
    // player HUD; the HUD's buttons fire `hero-power`/`hero-vision`/`hero-cam` for the world to apply.
    if (typeof window !== 'undefined') {
      window.addEventListener('cqm:superhero-unlock', () => this.revealSecondSuper(), {
        once: true,
      });
      window.addEventListener('cqm:hero-power', (e) =>
        this.heroPower(((e as CustomEvent).detail?.id as string) ?? ''),
      );
      window.addEventListener('cqm:hero-vision', () => this.heroCycleRender());
      window.addEventListener('cqm:hero-cam', () => this.heroCycleView());
    }
    bindPanelToggles();
    this.bindObservatoryTabs();
    this.bindAlgoPicker();
    this.input = new InputSystem(this.buildActions());

    this.sortVals = new Float32Array(this.quality.maxEntities);
    this.snap = {
      entities: 0,
      maxEntities: this.quality.maxEntities,
      chaos: 0,
      mutations: 0,
      energy: 0,
      links: 0,
      morphs: 0,
      algoName: cyc(ALGOS, this.state.algoIdx).name,
      quantum: 0,
      songName: cyc(SONGS, this.state.songIdx).name,
      weather: cyc(WEATHERS, this.state.weatherIdx),
      wind: 0,
      temperature: 20,
      shoggoths: this.shoggoths.count,
      puppeteers: this.puppets.count,
      // V2 fields — placeholders until the Wildbeyond systems are integrated
      // (qcircuit/graph-mind/analytics/lore wiring tracked in task #12).
      tribes: 0,
      trend: 0,
      qEntropy: 0,
      lore: '---',
      // V3 — REUSED live views (documented in types.ts): consumers copy.
      maxLinks: this.quality.maxLinks,
      morphTotal: this.morphTotal,
      titans: this.titans.count,
      phylumCounts: this.entities.phylumCounts,
      titanLedger: this.titans.ledger,
      warMatrix: this.titans.warMatrix,
      rdEnergy: 0,
      sentience: 0,
      nhi: 0,
      viewName: cyc(VIEW_MODES, this.state.viewIdx),
      timeScale: this.state.timeScale,
      renderName: this.state.renderMode,
      econ: this.economy.summary(),
    };
    // The three V3.5 arrays are stable LIVE views (contents mutate in place),
    // so this adapter is built once and never repopulated — just a field rename.
    this.viz3dSnap = {
      phylumCounts: this.snap.phylumCounts,
      ledger: this.snap.titanLedger,
      warMatrix: this.snap.warMatrix,
    };

    // Apply the persisted simulation variant's ambient visuals (V7.6) — a restored N(2) world
    // boots straight into the nightmare sky + branding (the chaos floor is enforced in step()).
    this.applySimVisuals();

    this.log.info('world ready', {
      seed: this.persisted.seed,
      tier: this.quality.tier,
      maxEntities: this.quality.maxEntities,
      morphs: this.morphTotal,
      titans: this.titans.count,
      geometries: geos.length,
      sim: this.state.sim,
    });
  }

  /**
   * Boot/reset population: 30% of the adaptive steady-state target (legacy 300 of 1000).
   * Uses `targetEntities` (= maxEntities on every tier except ultra) so the world boots toward
   * its idle equilibrium, not the 10k ceiling — organic auto-split then fills to the target.
   */
  private bootPopulation(): number {
    return Math.max(300, Math.round(this.quality.targetEntities * 0.3));
  }

  /**
   * First-gesture unlock: initializes the AudioContext and restores the
   * persisted SFX preference exactly once. Safe to call repeatedly.
   */
  unlock(): void {
    this.audio.init();
    if (!this.sfxRestored) {
      this.sfxRestored = true;
      if (this.persisted.sfxOn && !this.audio.sfxOn) this.audio.toggleSfx();
    }
  }

  /** Advance one frame. rawDt is the unclamped clock delta in seconds. */
  step(rawDt: number): void {
    const s = this.state;
    // Clamp to [0, 50ms]: negative deltas (clock skew) and tab-switch gaps
    // would otherwise drive curve parameters and physics out of range.
    const dt = Math.min(Math.max(rawDt, 0), 0.05) * s.timeScale;
    s.elapsed += dt;
    s.frame++;
    const t = s.elapsed;

    this.updateCamera(dt, t);
    this.handleHotkeys(dt);
    // Chaos decays toward its floor — raised in SIMULATION N(2) so the nightmare stays
    // permanently agitated (higher cm ⇒ wilder behaviour excursions). V7.6.
    const chaosFloor = s.sim === 2 ? CHAOS_NIGHTMARE_FLOOR : CHAOS_MIN;
    s.chaos = Math.max(chaosFloor, s.chaos - dt * 0.005);
    // F-CHAOS-ENTROPY: entropy (order / heat-death) relaxes back toward 0, and while it holds it
    // BLEEDS chaos away — the bipolar tug (order calms agitation). Pure deterministic float math,
    // no rng; at the default entropy 0 this whole block is a no-op, so existing replays are intact.
    const ent = s.entropy ?? 0;
    if (ent > 0) {
      s.entropy = Math.max(0, ent - dt * 0.05);
      s.chaos = Math.max(chaosFloor, s.chaos - ent * dt * 0.03);
    }

    // One bands poll per frame, shared by every consumer (reused object).
    const bands = this.audioAnalysis.update();
    // Audio couplings, each ≤ 0.35 per contract: bass shimmers the six-lamp
    // rig (inside environment.update — the contracted LOCAL coupling, which
    // replaced the global exposure offset), level breathes the cloud points.
    this.environment.setAudioBass(bands.bass);
    this.quantum.setBreath(bands.level);

    this.weather.apply(dt, t);
    this.puppets.update(dt, t);

    if (s.frame % 2 === 0) {
      this.grid.clear();
      const list = this.entities.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e) this.grid.insert(e);
      }
    }
    this.shoggoths.update(dt, t);
    // Titans roam every frame; economy/diplomacy/strikes are internally cadenced
    // off s.frame (CONTRACTS V3.3) — after the grid so strikes can query it.
    this.titans.update(dt, t);
    // F-BEINGS: the leviathans sail the mid-field (pure trig + the read-only hole force, no rng).
    this.leviathans.update(dt, t);
    // F-SUPER V32: animate the apex body every frame from the sim clock + last-folded mind state.
    this.superBody.update(t, dt);
    for (const hb of this.heroBodies) hb.body.update(t, dt); // V34/35: revealed hero/twin bodies
    this.cosmicWeb.update(t); // V11: far-field cosmic-web shimmer (additive backdrop, no rng)
    this.goldLattice.update(t); // V11: floating gold architecture tumble (additive, no rng)
    this.quantumLattice.update(t); // V11: neon sacred-geometry shells (additive, no rng)
    // F-NHI V10: alien bodies follow + morph their NHI every frame (guarded; additive viz only).
    if (this.nhiBody.count > 0) {
      try {
        this.nhiBody.update(t, (id) => this.nhiEntities.get(id)?.position ?? null);
      } catch {
        /* an NHI body update misbehaved — skip it, keep the world running */
      }
    }
    // Cosmological chaos (V7.4): apply the active singularity's force field to entity
    // velocities BEFORE entities.update integrates them this frame. No-op when none active.
    this.singularities.update(dt, t);

    const sector = this.environment.sectorAt(this.engine.camera.position);
    if (sector !== this.lastSector) {
      this.lastSector = sector;
      this.hud.showSector(sector);
    }

    this.tickAlgoAuto(dt);
    this.sortStep(bands);

    const stats = this.entities.update(dt, t);
    this.energy = stats.energy; // stats object is reused — copy immediately
    this.morphCount = stats.morphCount;

    // F-NHI V10: drive the launched super-minds on a slow beat (≈3/sec). GUARDED — a fault in an
    // NHI decision can never freeze the world loop; it just skips that beat. No-op (draws no rng)
    // until an NHI is launched, so the seeded golden is unchanged for a never-launched world.
    if (this.nhi.count > 0 && s.frame % 18 === 0) {
      try {
        this.nhi.tick(this.rng, this.nhiWorld);
      } catch {
        /* an NHI beat misbehaved — skip it, keep the world running */
      }
    }

    const n = this.entities.list.length;
    // Connectome rebuild cadence by live population. Legacy ladder 1/2/3 at ≤400/≤700/>700
    // is preserved exactly through the desktop tier; the ultra-class rungs (/4 above 2,000,
    // /6 above 5,000) keep the O(n·k) link rebuild + GPU upload off the 10k cost wall. The
    // connectome draws no rng, so cadence changes are determinism-neutral (GraphMind, which
    // does draw rng, runs on its own 240/600f cadence over whatever pairs exist). V3.6.
    const cadence = n > 5000 ? 6 : n > 2000 ? 4 : n > 700 ? 3 : n > 400 ? 2 : 1;
    if (s.frame % cadence === 0) this.connectome.update(dt, t);

    // F-SUPER V31: the apex mind thinks ~15×/sec from live world signals. Guarded; own rng → the
    // main golden is untouched. The masterful body that renders it hangs off this in a later loop.
    if (s.frame % 4 === 0) this.driveSuper(bands.bass, bands.level, t, n);

    // ── V2 cadences (ARCHITECTURE.md frame pipeline) ──
    if (s.frame % 30 === 0) {
      this.qc.update();
      if (this.qc.lastCollapse !== this.lastCollapseSeen) {
        this.lastCollapseSeen = this.qc.lastCollapse;
        this.onCollapse(this.qc.lastCollapse);
      }
    }
    if (s.frame % 6 === 0) this.qc.bands(); // refresh the live buffer the cloud reads
    // F-ECONOMY V13: clear the market on a slow cadence (heavy substrate runs slow — physicist's
    // law). World chaos feeds in as market stress, widening demand swings. Reads/writes its own
    // sub-stream, so the cadence never touches the main deterministic order.
    if (s.frame % 30 === 15) {
      // F-ECON-SANCTIONS V20: economic warfare follows military — a titan at war with ≥3 rivals is
      // embargoed (its production + trade are throttled), so losing the war also bankrupts you. Reads
      // the titan ledger (deterministic), writes only sanction flags. Cheap O(titans).
      const led = this.titans.ledger;
      for (let i = 0; i < led.length; i++) {
        this.economy.sanction(World.ECON_TITAN_BASE + i, (led[i]?.war ?? 0) >= 3);
      }
      this.economy.tick(this.econRng, clamp(s.chaos / 10, 0, 1));
    }

    this.quantum.update(dt, t);

    if (s.frame % 2 === 1) this.rd.step(); // offset 1 from the grid rebuild
    this.titans.drainPerturb(); // route any pending waste scar AFTER the RD step
    // Graph passes double their period above 2,500 entities — louvain over a
    // 10k-node mirror would spike the budget at the V2 cadence (V3.6 note).
    const gmScale = n > 2500 ? 2 : 1;
    if (s.frame % (240 * gmScale) === 0) this.graphMind.updateCommunities();
    // Offset 300 provably never collides with the communities cadence above.
    if (s.frame % (600 * gmScale) === 300) this.graphMind.updateRank();

    this.constellations.update(t, bands);
    // Alien sky + air: dome recolors with weather/chaos, haze advects with wind
    // and breathes with bass, aurora brightens with quantum entropy (V4.1).
    this.atmosphere.update(dt, t, bands, this.qc.entropy);
    // Holographic 3D analytics panel reads the LIVE reused snapshot views
    // (phylumCounts/titanLedger/warMatrix), always current; internally cadenced.
    this.viz3d.update(this.viz3dSnap);
    this.environment.update(dt, t);
    this.artifacts.update(dt, t); // F-ARTIFACTS (V9): animate + fade the relic pool (visual-only)

    if (s.frame % 60 === 30) {
      // RD pattern energy: strided mean of the V field (offset 30 — never
      // shares a frame with analytics/analyze). Feeds titan entropy relief
      // (PRODUCE hook) and the observatory environment timeline.
      this.rdEnergy = this.sampleRdEnergy();
      this.titans.feedEntropy(this.rdEnergy * 2);
    }

    if (s.frame % 8 === 0) {
      this.analytics.push(n, this.energy, this.connectome.links);
      this.panel.update(this.snapshot());
      this.updateAlgoPicker(); // live progress on the active field's row
    }
    if (s.frame % 60 === 0) this.analytics.analyze(); // after push at coinciding frames

    // Observatory: push+draw every 18f (36f on phone) AFTER the telemetry
    // snapshot refresh so its rings sample the same values the panel shows.
    const obsCadence = this.quality.isMobile ? 36 : 18;
    if (s.frame % obsCadence === 0) {
      this.observatory.push(this.snapshot());
      this.observatory.draw();
      // F-NHI V15: feed the neural observatory the focused NHI's live cognitive snapshot.
      const nids = this.nhi.ids();
      const fid = nids.length ? (nids[this.nhiObs.focusIndex % nids.length] ?? nids[0] ?? -1) : -1;
      this.nhiObs.update(fid >= 0 ? this.nhi.snapshot(fid) : null, { id: fid, count: nids.length });
      // F-ECON V23: feed the market ticker the live AURUM/UMBRA summary (history kept even when closed).
      this.marketTicker.update(this.economy.summary());
      // F-SUPER V31: feed the ⬢ ARCHITECT panel the apex mind's latest snapshot + its live wallet.
      this.superPanel.update(
        this.superCreature.snapshot(),
        this.economy.wealthOf(World.ECON_SUPER_BASE)?.netWorth ?? 0,
      );
      // F-SUPER V35: feed the SUPERHERO HUD the player-creature's live vitals + mind + wallet.
      const hero = this.heroBodies[0];
      if (this.superheroState.active && hero) {
        const hs = hero.mind.snapshot();
        const w = this.economy.wealthOf(hero.econId);
        this.superheroHud.update({
          ...this.superheroState.view(),
          name: hs.name,
          power: hs.power,
          plan: hs.plan,
          emotion: hs.emotion,
          wallet: {
            aurum: w?.aurum ?? 0,
            umbra: w?.umbra ?? 0,
            quanta: w?.quanta ?? 0,
            ichor: w?.ichor ?? 0,
          },
          world: { entities: n, frame: s.frame },
        });
      }
    }

    // Pool mirror runs LAST — after every system that mutates entity visuals
    // (sort flash, graph rank floor, belly pulse, conscription tints). The reused frame block
    // carries the N(2) nightmare scalar (inverted palette) + t/chaos/bass for the GPU effects.
    if (this.instanced) {
      const fr = this.instFrame;
      fr.t = t;
      fr.chaos = s.chaos;
      fr.bass = bands.bass;
      fr.nightmare = s.sim === 2 ? 1 : 0;
      this.instanced.sync(this.entities.list, s.renderMode, fr);
    }

    this.engine.render();
  }

  /**
   * F-SUPER V31: one apex beat. Builds a {@link SuperPercept} from live world signals (chaos as
   * threat, population as crowding/prey, the economy as wealth, audio bass/level as its hearing +
   * sight, a slow clock as circadian phase), thinks (deterministic — `think()` draws no rng), and on
   * a slow cadence sires a mutated twin when the mind wills it (capped at 3, on the SUPER sub-stream
   * so the main golden is untouched). Guarded so a faulty beat can never freeze the world loop.
   */
  private driveSuper(bass: number, level: number, t: number, n: number): void {
    try {
      const s = this.state;
      const econ = this.economy.summary();
      const mean = econ.agents > 0 ? econ.totalWealth / econ.agents : 1;
      const net = this.economy.wealthOf(World.ECON_SUPER_BASE)?.netWorth ?? 0;
      const target = Math.max(1, this.quality.targetEntities);
      const percept: SuperPercept = {
        energy: clamp(0.5 + 0.5 * (1 - s.chaos / 10), 0, 1),
        threat: clamp(s.chaos / 8, 0, 1),
        crowding: clamp(n / target, 0, 1),
        chaos: clamp(s.chaos / 10, 0, 1),
        wealthRel: clamp(net / (2 * (mean || 1)), 0, 1),
        preyClose: clamp(n / target, 0, 1),
        rivalClose: clamp(this.nhi.count / 8 + (this.titans.count > 0 ? 0.2 : 0), 0, 1),
        pull: clamp(s.chaos / 12, 0, 1),
        light: clamp(level, 0, 1),
        sound: clamp(bass, 0, 1),
        phase: (t / 60) % 1,
      };
      this.superCreature.think(percept); // updates the prime's emotion/memory/plan
      this.superBody.setMind(this.superCreature.snapshot()); // fold the mind into the body's look
      // V35: the twin budget (cap 3) is now spent by the PLAYER — the puzzle reveal sires the 2nd
      // creature and the FORK power sires the rest — so the prime no longer auto-spawns (no contention).
      for (const tw of this.superTwins) tw.think(percept); // twins reason with their own minds
      // V34/35: fold each revealed hero/twin mind into its body; tick the player progression layer.
      for (const hb of this.heroBodies) hb.body.setMind(hb.mind.snapshot());
      const hero0 = this.heroBodies[0];
      if (this.superheroState.active && hero0) {
        this.superheroState.tick(4 / 60, hero0.mind.snapshot().emotion.dominance, percept.threat);
      }
    } catch {
      /* an apex beat misbehaved — skip it, keep the world running */
    }
  }

  /**
   * F-SUPER V34/35: ACCESS GRANTED — the cryptographic puzzle was solved, so release the SECOND super
   * creature AND enter SUPERHERO mode: the player BECOMES that creature. Sire a mutated twin (its own
   * deep mind + apex purse + masterful body apart from the prime), activate the progression state + the
   * player HUD. Idempotent. Draws from the SUPER sub-stream, so the main determinism golden is untouched.
   */
  private revealSecondSuper(): void {
    if (this.superheroUnlocked) return;
    this.superheroUnlocked = true;
    if (!this.spawnHeroAvatar({ x: -20, y: 13, z: -6 })) return; // prime at the twin cap (rare)
    this.superheroState.activate();
    this.superheroHud.activate();
    this.hud.showSector('⛓ ACCESS GRANTED · SUPERHERO MODE');
  }

  /**
   * Sire a hero/twin avatar at `anchor`: a mutated twin mind (≤3, the cap is in {@link SuperCreature}),
   * its enrolled apex purse, and a masterful body the per-frame loop animates. Returns false at the cap.
   */
  private spawnHeroAvatar(anchor: { x: number; y: number; z: number }): boolean {
    const twin = this.superCreature.maybeSpawn(this.superRng);
    if (!twin) return false;
    this.superTwins.push(twin);
    const econId = World.ECON_SUPER_BASE + this.superTwins.length;
    this.economy.register(econId, twin.name, 20, this.superRng);
    this.heroBodies.push({
      body: new SuperBodySystem(this.superScene, anchor),
      mind: twin,
      econId,
    });
    return true;
  }

  /** V35: apply a hero POWER (the HUD spends the energy; here we apply the world-effect). */
  private heroPower(id: string): void {
    const p = HERO_POWERS.find((x) => x.id === id);
    if (!p || this.superheroState.energy < p.cost) return; // unknown power or not enough energy
    if (id === 'fork') {
      // only charge if a twin was actually sired (the cap of 3 may already be reached)
      if (this.spawnHeroAvatar({ x: -8 - this.heroBodies.length * 9, y: 14, z: -15 })) {
        this.superheroState.use(p.cost);
      } else {
        this.hud.showSector('QUANTUM FORK · TWIN CAP REACHED');
      }
      return;
    }
    this.superheroState.use(p.cost);
    if (id === 'phase')
      this.heroCycleRender(); // slip between render-states
    else if (id === 'recall') this.hud.showSector('RECALL · LOCUS SUMMONED');
    else this.hud.showSector('DOMINION PULSE · THE FIELD COWERS');
  }

  /** V35: VISION — cycle the world render-state (reuses the same path as the toolbar action). */
  private heroCycleRender(): void {
    const i = RENDER_MODES.indexOf(this.state.renderMode);
    const mode = cyc(RENDER_MODES, i + 1);
    this.state.renderMode = mode;
    this.entities.setRenderMode(mode);
    this.hud.showSector('VISION · ' + mode.toUpperCase());
  }

  /** V35: CAMERA — cycle the view mode. */
  private heroCycleView(): void {
    this.state.viewIdx = (this.state.viewIdx + 1) % VIEW_MODES.length;
    this.hud.showSector('CAM · ' + cyc(VIEW_MODES, this.state.viewIdx).toUpperCase());
  }

  /**
   * Strided mean of the reaction-diffusion V field (stride 16 ≈ 1k reads of
   * 16k texels) — the "pattern energy" of the living ground. Allocation-free.
   */
  private sampleRdEnergy(): number {
    const v = this.rd.fieldV;
    if (v.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < v.length; i += 16) {
      sum += v[i] ?? 0;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * A quantum measurement collapsed the register: soft chime, a Gray-Scott
   * scar at a seeded location, and an audit record named from the lore.
   */
  private onCollapse(basis: number): void {
    if (basis < 0) return;
    this.audio.play('crystallize');
    this.quantum.implodeAt(basis); // the index%32===basis particle subset collapses
    this.rd.perturb(this.rng(), this.rng(), 6);
    // Every titan witnesses the measurement and banks energy (V3.3 PRODUCE hook).
    this.titans.onCollapseWitness();
    this.audit.record('collapse', { basis, star: this.lore.name('star', basis) });
  }

  /** Legacy chaos multiplier cMul(): min(chaos/2, 3). */
  private chaosMul(): number {
    return Math.min(this.state.chaos / 2, 3);
  }

  /** Camera modes free/orbit/fly/top — legacy motion constants × ARENA_MID (V3.1). */
  private updateCamera(dt: number, t: number): void {
    const cam = this.engine.camera;
    const spd = 14 * ARENA_MID * dt;
    const rs = 1.5 * dt;
    const mode: ViewMode = cyc(VIEW_MODES, this.state.viewIdx);
    if (mode === 'free') {
      const k = this.input.keys;
      const cv = this.input.camVel;
      const touch = this.input.touch;
      if (k['w'] || k['arrowup']) cam.translateZ(-spd);
      if (k['s'] || k['arrowdown']) cam.translateZ(spd);
      if (k['a']) cam.translateX(-spd);
      if (k['d']) cam.translateX(spd);
      if (k['q']) cam.position.y += spd;
      if (k['e']) cam.position.y -= spd;
      if (k['z']) cam.rotation.z += rs;
      if (k['x']) cam.rotation.z -= rs;
      if (k['r']) cam.rotation.x += rs;
      if (k['f']) cam.rotation.x -= rs;
      if (k['c'] || k['arrowleft']) cam.rotation.y += rs;
      if (k['v'] || k['arrowright']) cam.rotation.y -= rs;
      if (touch.active) {
        cam.translateX(touch.x * spd);
        cam.translateZ(touch.y * spd);
      }
      if (cv.x) cam.translateX(cv.x * spd * 2);
      if (cv.y) cam.position.y += cv.y * spd * 2;
      if (cv.z) cam.translateZ(cv.z * spd * 2);
      if (cv.rx) cam.rotation.x += cv.rx * rs;
      if (cv.ry) cam.rotation.y += cv.ry * rs;
      if (cv.rz) cam.rotation.z += cv.rz * rs;
      // Mouse-look + wheel zoom (InputSystem contract amendment, 0.2.1).
      const lk = this.input.look;
      if (lk.dx !== 0 || lk.dy !== 0) {
        cam.rotation.y -= lk.dx * 0.003;
        cam.rotation.x -= lk.dy * 0.003;
      }
      if (this.input.zoom !== 0) cam.translateZ(this.input.zoom * 0.05);
    } else if (mode === 'orbit') {
      const oR = (65 + Math.sin(t * 0.05) * 18) * ARENA_MID;
      cam.position.set(
        Math.cos(t * 0.12) * oR,
        (22 + Math.sin(t * 0.08) * 18) * ARENA_Y,
        Math.sin(t * 0.12) * oR,
      );
      cam.lookAt(0, 8 * ARENA_Y, 0);
    } else if (mode === 'fly') {
      const ft = t * 0.06;
      cam.position.set(
        (Math.sin(ft) * 45 + Math.cos(ft * 1.3) * 22) * ARENA_MID,
        (16 + Math.sin(ft * 0.4) * 22) * ARENA_Y,
        (Math.cos(ft) * 45 + Math.sin(ft * 0.7) * 28) * ARENA_MID,
      );
      cam.lookAt(
        Math.sin(ft * 0.3) * 12 * ARENA_MID,
        (5 + Math.sin(ft * 0.5) * 12) * ARENA_Y,
        Math.cos(ft * 0.3) * 12 * ARENA_MID,
      );
    } else if (TRACKING_VIEWS.has(mode)) {
      // F-CAM5 subject-tracking shots: frame a live organism resolved by stable index.
      const found = this.resolveSubject(t);
      const sx = this.camSubX;
      const sy = this.camSubY;
      const sz = this.camSubZ;
      if (!found) {
        // Empty world — calm orbit so the camera never freezes staring at nothing.
        const r = 60 * ARENA_MID;
        cam.position.set(Math.cos(t * 0.1) * r, 26 * ARENA_Y, Math.sin(t * 0.1) * r);
        cam.lookAt(0, 6 * ARENA_Y, 0);
      } else if (mode === 'follow') {
        const r = 16 * ARENA_MID; // close offset that slowly orbits the subject
        const k = Math.min(1, dt * 2.5); // smooth glide toward the target offset
        cam.position.x += (sx + Math.cos(t * 0.25) * r - cam.position.x) * k;
        cam.position.y += (sy + 7 * ARENA_Y - cam.position.y) * k;
        cam.position.z += (sz + Math.sin(t * 0.25) * r - cam.position.z) * k;
        cam.lookAt(sx, sy, sz);
      } else if (mode === 'chase') {
        // Trail just behind the subject's XZ heading (unit heading × distance).
        const vlen = Math.hypot(this.camSubVX, this.camSubVZ) || 1;
        const back = 14 * ARENA_MID;
        const k = Math.min(1, dt * 3);
        cam.position.x += (sx - (this.camSubVX / vlen) * back - cam.position.x) * k;
        cam.position.y += (sy + 5 * ARENA_Y - cam.position.y) * k;
        cam.position.z += (sz - (this.camSubVZ / vlen) * back - cam.position.z) * k;
        cam.lookAt(sx, sy, sz);
      } else {
        // titan: a grand wide tracking shot from far back and high up.
        const r = 70 * ARENA_MID;
        const k = Math.min(1, dt * 1.2);
        cam.position.x += (sx + Math.cos(t * 0.08) * r - cam.position.x) * k;
        cam.position.y += (sy + 40 * ARENA_Y - cam.position.y) * k;
        cam.position.z += (sz + Math.sin(t * 0.08) * r - cam.position.z) * k;
        cam.lookAt(sx, sy, sz);
      }
    } else if (mode === 'specimen') {
      // F-RELIQUARY: a macro "specimen plate" tour — frame the live tracked organism huge and
      // close on the dark fog-void, slow-turntabling, auto-advancing to a fresh specimen every
      // ~6 s. Reuses resolveSubject (reads sim state, writes none → determinism-safe). The FogExp2
      // already swallows the distant ecosystem at this range, so each jeweled organism reads alone
      // like a studio plate — the direct answer to the NHI specimen reference.
      const found = this.resolveSubject(t);
      const sx = this.camSubX;
      const sy = this.camSubY;
      const sz = this.camSubZ;
      if (!found) {
        const r = 60 * ARENA_MID;
        cam.position.set(Math.cos(t * 0.1) * r, 26 * ARENA_Y, Math.sin(t * 0.1) * r);
        cam.lookAt(0, 6 * ARENA_Y, 0);
      } else {
        // Distance ≈ 2× the specimen radius so it subtends ~60° and fills the frame at the
        // default FOV; a tight chase keeps the roaming organism locked + centered.
        const r = Math.max(2.0, this.camSubR * 2.0);
        const ang = t * 0.35; // slow turntable around the subject
        const tx = sx + Math.cos(ang) * r;
        const ty = sy + r * 0.22;
        const tz = sz + Math.sin(ang) * r;
        // When the subject advances to a new specimen (every ~6 s) it can be arena-distances away;
        // gliding there would smear a wide transit shot across the plate. Instead CUT — snap to the
        // new specimen's macro frame — so the view reads as discrete studio plates. Within a
        // specimen, a tight lerp keeps the roaming organism centred.
        const far =
          Math.hypot(cam.position.x - tx, cam.position.y - ty, cam.position.z - tz) > r * 6;
        if (far) {
          cam.position.set(tx, ty, tz);
        } else {
          const k = Math.min(1, dt * 5);
          cam.position.x += (tx - cam.position.x) * k;
          cam.position.y += (ty - cam.position.y) * k;
          cam.position.z += (tz - cam.position.z) * k;
        }
        cam.up.set(0, 1, 0);
        cam.lookAt(sx, sy, sz);
      }
    } else if (mode === 'cinematic') {
      // Slow grand drift across the whole arena (the wide, unhurried sibling of 'fly').
      const ct = t * 0.025;
      cam.position.set(
        Math.sin(ct) * 80 * ARENA_MID,
        (40 + Math.sin(ct * 0.5) * 28) * ARENA_Y,
        Math.cos(ct * 0.8) * 80 * ARENA_MID,
      );
      cam.lookAt(Math.sin(ct * 0.4) * 10 * ARENA_MID, 6 * ARENA_Y, 0);
    } else if (mode === 'vortex') {
      // Descending/rising spiral around the world axis.
      const vr = (30 + (Math.sin(t * 0.07) * 0.5 + 0.5) * 50) * ARENA_MID;
      const vy = (10 + (Math.cos(t * 0.05) * 0.5 + 0.5) * 70) * ARENA_Y;
      cam.position.set(Math.cos(t * 0.5) * vr, vy, Math.sin(t * 0.5) * vr);
      cam.lookAt(0, 8 * ARENA_Y, 0);
    } else {
      cam.position.set(0, 90 * ARENA_MID + 75, 0); // top-down survey (top + fallback)
      cam.lookAt(0, 0, 0);
      cam.rotation.z = t * 0.015;
    }
    // Consume-and-zero in EVERY mode so stale drag/wheel deltas never
    // accumulate while orbit/fly/top views ignore them.
    this.input.look.dx = 0;
    this.input.look.dy = 0;
    this.input.zoom = 0;
  }

  /**
   * F-CAM5: choose the organism the tracking cameras follow, by a STABLE index that advances every
   * ~6 s of sim time — a deterministic guided tour of the population. Caches the subject's position
   * and XZ heading into the camSub* scratch. Returns false on an empty world. Presentation-only: it
   * reads sim state but writes none, so it can never perturb the deterministic hash.
   */
  private resolveSubject(t: number): boolean {
    const list = this.entities.list;
    const len = list.length;
    if (len === 0) return false;
    const idx = Math.floor(t / 6) % len;
    const e = list[idx] ?? list[0];
    if (!e) return false;
    const p = e.position;
    this.camSubX = p.x;
    this.camSubY = p.y;
    this.camSubZ = p.z;
    this.camSubVX = e.userData.vel.x;
    this.camSubVZ = e.userData.vel.z;
    this.camSubR = (e.scale.x + e.scale.y + e.scale.z) / 3;
    return true;
  }

  /** Held-key macros (legacy 665-666): Space/Shift/M repeat, Tab feeds chaos, G feeds entropy. */
  private handleHotkeys(dt: number): void {
    const s = this.state;
    const k = this.input.keys;
    if (k[' '] && s.frame % 12 === 0) this.doBurst();
    if (k['shift'] && s.frame % 20 === 0) this.doSplit();
    if (k['m'] && s.frame % 30 === 0) this.doMutate();
    if (k['tab']) s.chaos = clamp(s.chaos + dt * 2, CHAOS_MIN, CHAOS_MAX);
    // F-CHAOS-ENTROPY: hold G to pour in ENTROPY (the order/heat-death axis), the bipolar twin of
    // Tab→chaos. Reachable now via keyboard; the bottom-panel button is wired in the UI pass.
    if (k['g']) s.entropy = Math.min((s.entropy ?? 0) + dt * 2, ENTROPY_MAX);
    // F-NHI: tap N to launch an NHI being in front of the camera (throttled so a held key doesn't
    // flood the world). The action is also exposed for the bottom-panel button in the UI pass.
    if (k['n'] && s.frame % 30 === 0) this.launchNhiBeing();
    // F-SPACE: tap H to dilate space (cycle the camera FOV). Throttled like the other taps.
    if (k['h'] && s.frame % 30 === 0) this.dilateSpace();
  }

  /**
   * The sorting field — now BATCHED so the selected algorithm visibly organizes
   * the world (one swap among thousands of organisms was imperceptible). Each
   * frame it runs K proposals from the active algorithm (K scales with the
   * population, 6..28), applying every accepted swap: the two organisms trade
   * sort values, get nudged toward each other's positions, and flash bright.
   * The HUD shows the live swap count so cycling the algorithm obviously
   * changes the activity. Allocation-free, no rng (deterministic from seed).
   * O(K · step-cost); the O(n) algorithms still dominate at K · n.
   */
  private sortStep(bands: AudioBands): void {
    const list = this.entities.list;
    const n = list.length;
    const s = this.state;
    const algo = cyc(ALGOS, s.algoIdx);
    const mode = s.algoMode;
    // Display name reflects the run mode (V7.2): the active field (single/auto, with a ▸
    // marker while auto-cycling) or ALL FIELDS while every signature works at once.
    const displayName =
      mode === 'all' ? 'ALL FIELDS' : mode === 'auto' ? `▸ ${algo.name}` : algo.name;
    if (n < 2) {
      this.hud.setAlgo(displayName, s.algoStep, 0);
      return;
    }
    for (let i = 0; i < n; i++) {
      const e = list[i];
      this.sortVals[i] = e ? e.userData.sortVal : 0;
    }
    // Batch size: enough to read as motion, bounded so the O(n) algorithms stay cheap even at
    // the 10k ceiling. RUN ALL blends every field, so it runs a wider batch. Kept DETERMINISTIC
    // (population only) on purpose — the batch drives entity velocity nudges that feed the
    // neighbour-dependent rng (nash/market), so coupling it to wall-clock audio would diverge
    // the seeded sim. The audio reactivity lives in the FLASH below, which is visual-only.
    const batch =
      mode === 'all' ? Math.min(48, Math.max(25, n >> 7)) : Math.min(28, Math.max(6, n >> 8));
    // Treble = sparkle: the per-swap emissive flash brightens with the highs (4..8). Emissive is
    // purely visual (entities.update never feeds it back into positions/rng), so the swarm
    // visibly sparkles ON THE BEAT without touching sim reproducibility (V7-beyond).
    const flash = 4 + bands.treble * 4;
    const push = 0.05 * this.chaosMul();
    let swaps = 0;
    for (let b = 0; b < batch; b++) {
      s.algoStep++;
      // RUN ALL: each proposal is drawn from the NEXT field round-robin, so the whole
      // population organizes under all 25 signatures simultaneously. Otherwise the one
      // active field (single, or the auto-cycled current field) proposes.
      const stepAlgo = mode === 'all' ? cyc(ALGOS, this.allModeCursor) : algo;
      if (mode === 'all') this.allModeCursor = (this.allModeCursor + 1) % ALGOS.length; // bounded
      const swap = stepAlgo.step(this.sortVals, n, s.algoStep);
      if (!swap) continue;
      const a0 = swap[0];
      const a1 = swap[1];
      // Full bounds on BOTH indices (the batched run-all/auto modes cycle every algo, so a
      // misbehaving step's out-of-range proposal must be rejected, not silently read as
      // undefined). Cheap O(1) guard; dense-array reads below stay in range.
      if (a0 === a1 || a0 < 0 || a0 >= n || a1 < 0 || a1 >= n) continue;
      const ea = list[a0];
      const eb = list[a1];
      if (!ea || !eb) continue;
      const tv = ea.userData.sortVal;
      ea.userData.sortVal = eb.userData.sortVal;
      eb.userData.sortVal = tv;
      this.sortVals[a0] = ea.userData.sortVal; // keep the view coherent for later steps
      this.sortVals[a1] = eb.userData.sortVal;
      this.sv1.copy(eb.position).sub(ea.position).normalize().multiplyScalar(push);
      ea.userData.vel.add(this.sv1);
      eb.userData.vel.add(this.sv1.negate());
      // Brighter sparkle per swap so the field's working front reads as a shimmering light
      // show (entities.update fades it back). max(), not a hard set, so a swap can't DIM a body
      // the neural-activation cap or a belly pulse already pushed above 4. (audit 13b)
      ea.material.emissiveIntensity = Math.max(ea.material.emissiveIntensity, flash);
      eb.material.emissiveIntensity = Math.max(eb.material.emissiveIntensity, flash);
      if (swaps === 0) this.qc.onSortSwap(a0, a1); // one CNOT/frame (preserve coupling rate)
      swaps++;
    }
    // Sorted-ness proxy for the picker progress bar: the fraction of adjacent
    // pairs already in order (O(n), cheap; reaches 1 as a terminating field
    // settles, hovers for the perpetual fields). The sortVals view is current
    // after the batch above.
    let ordered = 0;
    const sv = this.sortVals;
    // i ∈ [1, n) and n = list.length ≤ sortVals.length, so both reads are in bounds.
    for (let i = 1; i < n; i++) if (sv[i - 1]! <= sv[i]!) ordered++;
    this.sortedFraction = n > 1 ? ordered / (n - 1) : 1;
    this.hud.setAlgo(displayName, s.algoStep, swaps);
  }

  /** Refill the reused snapshot object. Allocation-free. */
  private snapshot(): TelemetrySnapshot {
    const s = this.state;
    const sn = this.snap;
    sn.entities = this.entities.list.length;
    sn.chaos = s.chaos;
    sn.mutations = s.mutations;
    sn.energy = this.energy;
    sn.links = this.connectome.links;
    sn.morphs = this.morphCount;
    sn.algoName = cyc(ALGOS, s.algoIdx).name;
    sn.quantum = this.quantum.signal;
    sn.songName = cyc(SONGS, s.songIdx).name;
    sn.weather = cyc(WEATHERS, s.weatherIdx);
    sn.wind = Math.hypot(s.wind.x, s.wind.z);
    sn.temperature = s.temperature;
    sn.shoggoths = this.shoggoths.count;
    sn.puppeteers = this.puppets.count;
    sn.nhi = this.nhi.count;
    sn.viewName = cyc(VIEW_MODES, s.viewIdx);
    sn.timeScale = s.timeScale;
    sn.renderName = s.renderMode;
    sn.econ = this.economy.summary(); // V13: AURUM/UMBRA, prices, dominant currency, wealth Gini
    sn.tribes = this.graphMind.tribes;
    sn.trend = this.analytics.trendPerMin;
    sn.qEntropy = this.qc.entropy;
    sn.lore = this.constellations.subSectorAt(this.engine.camera.position);
    // V3: phylumCounts/titanLedger/warMatrix are LIVE reused views installed at
    // boot — only the scalar needs refreshing here.
    sn.rdEnergy = this.rdEnergy;
    // Biome sentience index (V4.5): community structure × quantum coherence ×
    // demographic momentum, normalized 0..1. The cosmos rating its own aliveness.
    sn.sentience = clamp(
      ((sn.tribes / 256) * (0.5 + sn.qEntropy) * (0.5 + Math.min(Math.abs(sn.trend) / 50, 1))) /
        1.5,
      0,
      1,
    );
    this.hud.setLore(sn.lore); // O(1) no-op when unchanged
    return sn;
  }

  /**
   * F-NHI: launch a user-controlled non-human-intelligence being ~45u in front of the camera — a
   * buoyant, fast, age-immortal, consumption-immune entity that flies and floats through the world
   * with "Matrix" powers. Returns 1 on success, 0 at the population cap. Draws rng (a user event,
   * recorded in the audit so replays reproduce); a never-launched world draws none and is unchanged.
   */
  private launchNhiBeing(): number {
    const cam = this.engine.camera;
    cam.getWorldDirection(this.sv2);
    this.sv1.copy(cam.position).addScaledVector(this.sv2, 45);
    const mi = Math.floor(this.rng() * this.morphTotal);
    const e = this.entities.spawn(this.sv1, mi, 2.2);
    if (!e) return 0;
    const u = e.userData;
    u.isNhi = true;
    u.beh = 'helix'; // ethereal, weaving float
    u.spd *= 2.2; // quick
    u.vel.set((this.rng() - 0.5) * 0.3, 0.4, (this.rng() - 0.5) * 0.3); // launched upward
    e.material.emissive.setRGB(0.25, 0.95, 1.0); // unmistakable cyan NHI glow
    e.material.emissiveIntensity = 3.2;
    // V10: birth a deterministic super-mind for this NHI and register it so it ACTS on the world
    // each beat (spawns swarms, dominates the local field, broadcasts hallucinated utterances) —
    // ending the "NHI float and do nothing" complaint.
    const nid = this.nhiNextId++;
    this.nhiEntities.set(nid, e);
    this.nhi.register(nid, this.rng);
    // F-ECONOMY: an NHI super-mind enters the market with the cosmos's fattest purse (weight 14 vs a
    // titan's ~8). Uses econRng so the launch's main-stream draws above stay reproducible.
    this.economy.register(World.ECON_NHI_BASE + nid, 'NHI super-mind', 14, this.econRng);
    this.nhiBody.spawn(nid, e.position.x, e.position.y, e.position.z);
    this.audio.play('warp');
    this.hud.showSector('NHI LAUNCHED · MATRIX BEING');
    this.audit.record('nhi-launch', { mi });
    return 1;
  }

  /** NHI ids whose entity is still alive (still in entities.list); prunes the dead. O(nhi·n). */
  private nhiLiveIds(): number[] {
    const out: number[] = [];
    const list = this.entities.list;
    for (const [id, e] of this.nhiEntities) {
      if (list.includes(e)) out.push(id);
      else this.nhiEntities.delete(id);
    }
    return out;
  }

  /** The percept NHI `id` senses this beat, from its entity vitality + world crowding/chaos. */
  private nhiPercept(id: number): Omit<NhiPercept, 'beat'> {
    const e = this.nhiEntities.get(id);
    const u = e?.userData;
    const c01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
    const chaos = c01(this.state.chaos / 10); // CHAOS_MAX
    // The NHI senses the NEAREST organism's community (setGroup) as the rival faction it plays, and
    // that organism's Nash strategy as the faction's last move toward it — wiring the game theory in.
    let rivalFaction = -1;
    let rivalLastMove = -1;
    if (e) {
      const p = e.position;
      const list = this.entities.list;
      let best = Infinity;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o || o === e || o.userData.isNhi) continue;
        const op = o.position;
        const dx = p.x - op.x;
        const dy = p.y - op.y;
        const dz = p.z - op.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < best) {
          best = d2;
          rivalFaction = o.userData.setGroup;
          rivalLastMove = o.userData.strategy;
        }
      }
    }
    return {
      energy: u ? c01(u.energy / 100) : 0.5,
      crowding: c01(this.entities.list.length / this.quality.maxEntities),
      chaos,
      threat: c01(chaos * 0.5),
      rivalFaction,
      rivalLastMove,
    };
  }

  /** Execute one NHI decision as a real effect (spawn swarm / dominate / broadcast / steer). */
  private nhiApply(id: number, intent: NhiIntent, text: string): void {
    const e = this.nhiEntities.get(id);
    if (!e) return;
    const p = e.position;
    if (intent.action === NhiAction.SPAWN_SWARM) {
      const n = Math.min(intent.spawn, 6);
      for (let i = 0; i < n; i++) {
        this.sv1.set(
          p.x + (this.rng() - 0.5) * 12,
          p.y + (this.rng() - 0.5) * 12,
          p.z + (this.rng() - 0.5) * 12,
        );
        const child = this.entities.spawn(this.sv1, Math.floor(this.rng() * this.morphTotal), 0.8);
        if (child) child.material.emissive.setRGB(0.6, 0.2, 0.85); // swarmling glow
      }
      this.audio.play('warp');
    } else if (intent.action === NhiAction.DOMINATE || intent.action === NhiAction.MANIPULATE) {
      // Game theory made physical: a DEFECTING NHI turns hostile (scatters organisms AWAY); a
      // cooperating one gathers them IN. MANIPULATE also gaslights — it bends each nearby organism's
      // Nash strategy to the NHI's own move (belief-state manipulation made real in the sim).
      const hostile = intent.ownMove === 1;
      const gain = (hostile ? -0.09 : 0.06) * intent.magnitude;
      const flip: 0 | 1 = hostile ? 1 : 0;
      const r2 = 36 * 36;
      const list = this.entities.list;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o || o === e) continue;
        const op = o.position;
        const dx = p.x - op.x;
        const dy = p.y - op.y;
        const dz = p.z - op.z;
        if (dx * dx + dy * dy + dz * dz < r2) {
          this.sv2.set(dx, dy, dz).normalize();
          o.userData.vel.addScaledVector(this.sv2, gain);
          if (intent.action === NhiAction.MANIPULATE) o.userData.strategy = flip;
        }
      }
    } else if (intent.action === NhiAction.BROADCAST) {
      this.hud.showToast(text, 'NHI');
      this.audio.play('warp');
    } else if (intent.action === NhiAction.RETREAT) {
      e.userData.vel.y += 0.05 * intent.magnitude;
    }
  }

  /**
   * F-SPACE: dilate space by stepping the camera FOV through SPACE_FOVS (nearest level → next,
   * wrapping). Camera-only — it changes how much space the lens gathers, never the sim — so it is
   * fully determinism-neutral. Returns the new FOV in degrees.
   */
  private dilateSpace(): number {
    const cam = this.engine.camera;
    const fovs = SPACE_FOVS as readonly number[];
    let idx = 0;
    for (let i = 1; i < fovs.length; i++) {
      if (Math.abs((fovs[i] ?? 0) - cam.fov) < Math.abs((fovs[idx] ?? 0) - cam.fov)) idx = i;
    }
    cam.fov = fovs[(idx + 1) % fovs.length] ?? 68;
    cam.updateProjectionMatrix();
    this.hud.showSector('SPACE · FOV ' + Math.round(cam.fov) + '°');
    this.audit.record('space', { fov: cam.fov });
    return cam.fov;
  }

  private save(): void {
    this.store.save(this.persisted);
  }

  /** Legacy doSplit: up to 5 mature entities each bud 4 children. */
  private doSplit(): void {
    this.audio.play('split');
    const list = this.entities.list;
    let picked = 0;
    for (let i = 0; i < list.length && picked < 5; i++) {
      const e = list[i];
      if (!e || e.userData.age <= 50) continue;
      picked++;
      e.userData.belly = 60;
      // Birth scars the living ground (UV over the GROUND_EXTENT plane).
      this.rd.perturb(0.5 + e.position.x / GROUND_EXTENT, 0.5 - e.position.z / GROUND_EXTENT, 3);
      for (let j = 0; j < 4; j++) {
        this.sv1.set((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 2, (this.rng() - 0.5) * 3);
        this.sv2.copy(e.position).add(this.sv1);
        const child = this.entities.spawn(
          this.sv2,
          (e.userData.mi + 1 + Math.floor(this.rng() * 10)) % this.morphTotal,
          0.6,
        );
        if (child) child.userData.vel.copy(this.sv1.normalize().multiplyScalar(0.15));
      }
    }
  }

  /** Legacy doBurst, tier-scaled: 30..100 spawns in the (×ARENA_MID) core volume. */
  private doBurst(): void {
    this.audio.play('burst');
    const room = this.quality.maxEntities - this.entities.list.length;
    const count = Math.min(Math.max(30, Math.floor(this.quality.maxEntities / 100)), room);
    for (let i = 0; i < count; i++) {
      this.sv1.set(
        (this.rng() - 0.5) * 25 * ARENA_MID,
        this.rng() * 14 * ARENA_Y,
        (this.rng() - 0.5) * 25 * ARENA_MID,
      );
      this.entities.spawn(this.sv1, Math.floor(this.rng() * this.morphTotal), 0.5 + this.rng());
    }
  }

  /** Legacy doMutate: remorph the whole population (Known Bug 14 counter). */
  private doMutate(): void {
    this.audio.play('mutate');
    const list = this.entities.list;
    this.state.mutations += list.length;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.entities.remorph(e, Math.floor(this.rng() * this.morphTotal));
    }
  }

  /** Legacy apoc: max chaos, scatter everything, triple burst. */
  private apocalypse(): void {
    this.audio.play('burst');
    this.audio.play('warp');
    this.audio.play('resonance');
    this.state.chaos = CHAOS_MAX;
    this.hud.showSector('APOCALYPSE');
    const list = this.entities.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      e.userData.vel.set((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 3, (this.rng() - 0.5) * 3);
      e.userData.belly = 120;
    }
    this.doBurst();
    this.doBurst();
    this.doBurst();
    // The apocalypse brands the ground itself.
    for (let i = 0; i < 3; i++) this.rd.perturb(this.rng(), this.rng(), 9);
  }

  /**
   * Apply the current simulation variant's ambient visuals (CONTRACTS V7.6): the nightmare sky
   * recolor and the page-title branding. Called at boot and on every toggle. O(1).
   */
  private applySimVisuals(): void {
    const night = this.state.sim === 2;
    this.atmosphere.setNightmare(night);
    this.audio.setNightmare(night); // detune + darken the whole soundscape (V7.6)
    document.title = night
      ? 'COSMOGONIC QUANTUM MECHALOGODROM — SIMULATION N(2)'
      : 'COSMOGONIC QUANTUM MECHALOGODROM';
  }

  /**
   * Toggle the simulation variant N(1)↔N(2) (CONTRACTS V7.6). N(2) BREAK FREE raises the chaos
   * floor (permanent agitation), lurid-inverts the sky, and rebrands; N(1) GENESIS restores the
   * shipped cosmos. Persisted. Returns the new variant.
   */
  private setSim(): 1 | 2 {
    const s = this.state;
    s.sim = s.sim === 2 ? 1 : 2;
    this.persisted.sim = s.sim;
    this.save();
    this.applySimVisuals();
    if (s.sim === 2) {
      s.chaos = Math.max(s.chaos, CHAOS_NIGHTMARE_FLOOR); // snap straight into the nightmare
      this.audio.playId(SFX_STRANGE);
      this.hud.showSector('SIMULATION N(2) — BREAK FREE');
    } else {
      this.audio.play('crystallize');
      this.hud.showSector('SIMULATION N(1) — GENESIS');
    }
    this.audit.record('sim', { variant: s.sim });
    return s.sim;
  }

  /** Legacy rSim: genesis reset (entities + counters; prefs untouched). */
  private resetSim(): void {
    this.singularities.dispose(); // tear down any active cosmological effect
    this.entities.reset(this.bootPopulation());
    // Rebuild the spatial grid NOW (audit fix): the frame loop only rebuilds on even frames,
    // so for up to one frame every grid query would otherwise return the DISPOSED pre-reset
    // population — shoggoth tendrils/behaviors tugging on corpses.
    this.grid.clear();
    const list = this.entities.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.grid.insert(e);
    }
    this.state.chaos = 0.5;
    this.state.mutations = 0;
    this.state.algoStep = 0;
    this.hud.showSector('GENESIS RESET');
  }

  /**
   * Chaos control (CONTRACTS V7.4): cycle to the next cosmological singularity and summon it
   * at a seeded mid-field point. Each kind announces itself with a thematic palette voice and
   * an audit record. Returns the summoned kind's display name. Draws rng for the placement
   * (a user gesture, like burst/mutate).
   */
  private summonSingularity(): string {
    const kind = cyc(SINGULARITY_KINDS, this.singularityCursor++);
    // Seeded mid-field placement (y ~16·ARENA_Y so the rig floats in the volume).
    this.sv1.set(
      (this.rng() - 0.5) * 50 * ARENA_MID,
      16 * ARENA_Y,
      (this.rng() - 0.5) * 50 * ARENA_MID,
    );
    this.singularities.summon(kind, this.sv1);
    this.artifacts.place(this.sv1.x, this.sv1.y, this.sv1.z, 'relic', this.state.elapsed); // F-ARTIFACTS
    // Thematic voice from the new palette bands: deep impacts for holes, exotic for the rest.
    if (kind === 'blackhole' || kind === 'greyhole') this.audio.playId(SFX_SUBBOOM);
    else if (kind === 'whitehole') this.audio.playId(SFX_FMCLANG);
    else this.audio.playId(SFX_STRANGE);
    const label = kind.toUpperCase();
    this.hud.showSector('SINGULARITY: ' + label);
    this.audit.record('singularity', { kind, epithet: this.lore.epithet('collapse', kind) });
    return label;
  }

  /** UiActions implementation handed to InputSystem. */
  /**
   * Wire the observatory's four page tabs (`[data-obs-page="0..3"]`) to
   * `observatory.setPage`, toggling the active pane + `aria-selected`. Degrades
   * silently if the tab DOM is absent (e.g. a stripped index.html). O(tabs).
   */
  private bindObservatoryTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[data-obs-page]'));
    if (tabs.length === 0) return;
    const panes = Array.from(document.querySelectorAll<HTMLElement>('.obs-page'));
    const select = (p: number): void => {
      if (p < 0 || p > 3) return;
      this.observatory.setPage(p as 0 | 1 | 2 | 3);
      for (const tab of tabs) {
        const on = Number(tab.dataset['obsPage']) === p;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      }
      // Panes carry no page attribute — the Nth `.obs-page` IS page N.
      panes.forEach((pane, i) => pane.classList.toggle('active', i === p));
      this.observatory.draw(); // immediate repaint so the switch feels instant
    };
    for (const tab of tabs) {
      tab.addEventListener('click', () => select(Number(tab.dataset['obsPage'])));
    }
  }

  /**
   * Populate the algorithm picker (`#algo-list`) with one clickable `.algo-row`
   * per sorting field, so all 25 are visible and selectable (not just a cycle
   * button). Each row click selects that field. Degrades silently if the picker
   * DOM is absent. O(ALGOS).
   */
  private bindAlgoPicker(): void {
    const listEl = document.getElementById('algo-list');
    if (!listEl) return;
    // The ui-shell ships #algo-active as a container with an inner name span.
    this.algoActiveEl = document.getElementById('algo-active-name');
    const n = ALGOS.length;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const algo = ALGOS[i];
      if (!algo) continue;
      const row = document.createElement('div');
      row.className = 'algo-row';
      row.dataset['algo'] = String(i);
      row.setAttribute('role', 'option'); // #algo-list is a role=listbox
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `Select ${algo.name} sorting field`);
      // V7.2: a deterministic per-field accent hue + a distinct leading glyph so every
      // row reads uniquely (CSS consumes `--algo-hue`; the glyph is its own span).
      row.style.setProperty('--algo-hue', String(Math.round((i * 360) / n)));
      const glyph = document.createElement('span');
      glyph.className = 'algo-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = ALGO_GLYPHS[i % ALGO_GLYPHS.length] ?? '◆';
      const name = document.createElement('span');
      name.className = 'algo-name';
      name.textContent = algo.name;
      const prog = document.createElement('div');
      prog.className = 'algo-prog';
      row.append(glyph, name, prog);
      row.addEventListener('click', () => this.selectAlgo(i, true));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectAlgo(i, true);
        }
      });
      frag.appendChild(row);
      this.algoRows.push(row);
    }
    listEl.appendChild(frag);
    // V7.2 RUN ALL / AUTO controls (degrade silently if the ui-shell omits them).
    this.algoAllBtn = document.getElementById('algo-all');
    this.algoAutoBtn = document.getElementById('algo-auto');
    this.algoAllBtn?.addEventListener('click', () => this.setAlgoMode('all'));
    this.algoAutoBtn?.addEventListener('click', () => this.setAlgoMode('auto'));
    this.refreshAlgoActive();
  }

  /**
   * Toggle a batch sort mode (V7.2). Clicking an active mode returns to `'single'`. RUN ALL
   * blends proposals from every field each frame; AUTO marches through all 25 in succession.
   * Fires a cue + ignites the population so the switch is felt, and audits the change.
   */
  private setAlgoMode(mode: 'all' | 'auto'): void {
    const s = this.state;
    s.algoMode = s.algoMode === mode ? 'single' : mode;
    s.algoTimer = 0;
    this.allModeCursor = 0;
    this.unlock();
    this.audio.cue(s.algoIdx, ALGOS.length);
    this.sortPerformance();
    const label =
      s.algoMode === 'all' ? 'ALL FIELDS' : s.algoMode === 'auto' ? 'AUTO CYCLE' : 'SINGLE FIELD';
    this.hud.showSector(label);
    this.audit.record('algo-mode', { mode: s.algoMode });
    this.refreshAlgoActive();
  }

  /**
   * Select a sorting field by index (picker click, toolbar cycle, keyboard).
   * `fromUser` adds the audio unlock + a distinct per-field selection tone (the
   * 8 SFX timbres cycle by index, so each field announces itself differently).
   */
  private selectAlgo(idx: number, fromUser: boolean): void {
    const s = this.state;
    const n = ALGOS.length;
    s.algoIdx = ((idx % n) + n) % n;
    s.algoStep = 0;
    // Picking a specific field by hand leaves any RUN ALL / AUTO batch mode (V7.2). AUTO's own
    // internal advance passes fromUser=false and keeps the mode (see sortStep).
    if (fromUser) s.algoMode = 'single';
    const algo = cyc(ALGOS, s.algoIdx);
    this.persisted.algoIdx = s.algoIdx;
    this.save();
    this.hud.showSector(algo.name);
    this.audit.record('algo', { name: algo.name });
    if (fromUser) {
      this.unlock();
      this.audio.cue(s.algoIdx, ALGOS.length); // each field has its own unique tone
      this.sortPerformance(); // the field ignites — a shimmer sweeps the population
    }
    this.refreshAlgoActive();
  }

  /**
   * Visible "ignition" when a sorting field is chosen (CONTRACTS V7-beyond): the population
   * flares in the ACTIVE FIELD'S OWN signature — a value-gradient SWEEP, alternating PARITY
   * bands, a two-scale BUTTERFLY, sort-VALUE BUCKETS, or the default RADIAL burst — so each of
   * the 25 looks unmistakably itself (real index/value math under the effect). Every lit body
   * also gets the outward shimmer kick so the swarm visibly "goes wild". Visual + a gentle
   * impulse only (entities.update fades the emissive back); deterministic (no rng),
   * allocation-free. O(n) — a one-shot user event, not a per-frame path.
   */
  private sortPerformance(): void {
    const list = this.entities.list;
    const n = list.length;
    if (n === 0) return;
    const pattern = ALGO_IGNITE[this.state.algoIdx % ALGO_IGNITE.length] ?? 'radial';
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (!e) continue;
      // Per-pattern "lit" intensity from the field's own index/value math.
      let lit: number;
      switch (pattern) {
        case 'sweep': // brightness gradient front-to-back (flip-wave)
          lit = 1 + 5 * (1 - i / n);
          break;
        case 'parity': // alternating index bands (block of 8) — a comb
          lit = (i >> 3) & 1 ? 6.5 : 1.2;
          break;
        case 'butterfly': // interleaved two-scale bands — a Batcher butterfly
          lit = (((i >> 2) & 1) ^ ((i >> 5) & 1)) === 1 ? 6.5 : 1.2;
          break;
        case 'bucket': {
          // banded by SORT VALUE into 5 cohorts (radix/patience/count signature)
          const sv = e.userData.sortVal;
          const cohort = sv < 0.2 ? 0 : sv < 0.4 ? 1 : sv < 0.6 ? 2 : sv < 0.8 ? 3 : 4;
          lit = 3 + cohort * 0.9;
          break;
        }
        default: // radial: every ~7th body bursts, the rest dim
          lit = i % 7 === 0 ? 6 : 1.5;
          break;
      }
      e.material.emissiveIntensity = Math.max(e.material.emissiveIntensity, lit);
      // Outward shimmer kick on the brightly-lit bodies so the ignition ripples the swarm.
      if (lit > 3) {
        const p = e.position;
        // Clamp the denominator to ≥1 (not just the |p|=0 guard): a body at |p|≈0.01 would
        // otherwise get inv≈25 and teleport-pop. Now the kick caps at 0.25/axis. (audit 13a)
        const inv = 0.25 / Math.max(Math.hypot(p.x, p.y, p.z), 1);
        e.userData.vel.x += p.x * inv;
        e.userData.vel.y += p.y * inv;
        e.userData.vel.z += p.z * inv;
      }
    }
  }

  /**
   * AUTO mode (V7.2): march through every sorting field in succession. Advances to the next
   * field every {@link ALGO_AUTO_PERIOD} seconds of sim time, announcing + igniting each.
   * No-op outside AUTO. Called once per frame from step(). O(1) amortized.
   */
  private tickAlgoAuto(dt: number): void {
    const s = this.state;
    if (s.algoMode !== 'auto') return;
    s.algoTimer += dt;
    if (s.algoTimer < ALGO_AUTO_PERIOD) return;
    s.algoTimer = 0;
    this.selectAlgo(s.algoIdx + 1, false); // fromUser=false keeps AUTO mode engaged
    this.unlock();
    this.audio.cue(s.algoIdx, ALGOS.length); // each new field announces itself
    this.sortPerformance();
  }

  /** Sync the picker's active row + readout + mode buttons to the current state. */
  private refreshAlgoActive(): void {
    const s = this.state;
    const active = s.algoIdx;
    // RUN ALL lights no single row (every field works at once); single/auto light the current.
    const highlightRow = s.algoMode !== 'all';
    for (let i = 0; i < this.algoRows.length; i++) {
      const row = this.algoRows[i];
      if (!row) continue;
      row.classList.toggle('active', highlightRow && i === active);
      if (i !== active) {
        const prog = row.querySelector<HTMLElement>('.algo-prog');
        if (prog) prog.style.setProperty('--algo-prog', '0');
      }
    }
    this.algoAllBtn?.classList.toggle('on', s.algoMode === 'all');
    this.algoAllBtn?.setAttribute('aria-pressed', s.algoMode === 'all' ? 'true' : 'false');
    this.algoAutoBtn?.classList.toggle('on', s.algoMode === 'auto');
    this.algoAutoBtn?.setAttribute('aria-pressed', s.algoMode === 'auto' ? 'true' : 'false');
    if (this.algoActiveEl) {
      this.algoActiveEl.textContent =
        s.algoMode === 'all'
          ? 'ALL FIELDS'
          : (s.algoMode === 'auto' ? '▸ ' : '') + cyc(ALGOS, active).name;
    }
  }

  /**
   * Drive the progress bar(s) from the live sorted fraction via the `--algo-prog` custom
   * property the shipped CSS fills with (the prior code set `style.width`, which resized the
   * track box, not the fill — the bar never moved). In RUN ALL every row pulses together. O(1)
   * single/auto, O(rows) in all mode (25). Called on the telemetry cadence.
   */
  private updateAlgoPicker(): void {
    const frac = String(this.sortedFraction);
    if (this.state.algoMode === 'all') {
      for (const row of this.algoRows) {
        const prog = row.querySelector<HTMLElement>('.algo-prog');
        if (prog) prog.style.setProperty('--algo-prog', frac);
      }
      return;
    }
    const row = this.algoRows[this.state.algoIdx];
    if (!row) return;
    const prog = row.querySelector<HTMLElement>('.algo-prog');
    if (prog) prog.style.setProperty('--algo-prog', frac);
  }

  private buildActions(): UiActions {
    const s = this.state;
    return {
      split: () => {
        this.unlock();
        this.audit.record('split');
        this.doSplit();
      },
      burst: () => {
        this.unlock();
        this.audit.record('burst');
        this.doBurst();
      },
      mutate: () => {
        this.unlock();
        this.audit.record('mutate');
        this.doMutate();
      },
      chaosBoost: () => {
        this.unlock();
        // F-CHAOS-ENTROPY: step CHAOS up through discrete LEVELS, wrapping from the top back to the
        // calmest — "variations and levels" rather than an unbounded ×1.5 ramp.
        const levels = CHAOS_LEVELS as readonly number[];
        let idx = 0;
        for (let i = 0; i < levels.length; i++) {
          if ((levels[i] ?? CHAOS_MIN) <= s.chaos + 1e-6) idx = i;
        }
        const next = (idx + 1) % levels.length;
        s.chaos = clamp(levels[next] ?? CHAOS_MIN, CHAOS_MIN, CHAOS_MAX);
        this.audio.play('burst');
        this.hud.showSector('CHAOS L' + next + ' · ' + s.chaos.toFixed(1));
        this.audit.record('chaos-boost', { chaos: s.chaos, level: next });
      },
      entropyBoost: () => {
        this.unlock();
        // F-CHAOS-ENTROPY: raise ENTROPY one step (the bipolar opposite of chaos — order/heat-death).
        const e = Math.min((s.entropy ?? 0) + ENTROPY_STEP, ENTROPY_MAX);
        s.entropy = e;
        this.audio.play('decay');
        this.hud.showSector('ENTROPY ' + e.toFixed(1) + ' · ORDER RISING');
        this.audit.record('entropy', { entropy: e });
        return e;
      },
      launchNhi: () => {
        this.unlock();
        return this.launchNhiBeing();
      },
      summonSingularity: () => {
        this.unlock();
        return this.summonSingularity();
      },
      cycleSim: () => {
        this.unlock();
        return this.setSim();
      },
      apocalypse: () => {
        this.unlock();
        this.audit.record('apocalypse');
        this.apocalypse();
      },
      reset: () => {
        this.unlock();
        this.audit.record('reset');
        this.resetSim();
      },
      toggleMusic: () => {
        this.unlock();
        const on = this.audio.toggleMusic();
        this.audit.record('music', { on });
        return on;
      },
      toggleSfx: () => {
        this.unlock();
        const on = this.audio.toggleSfx();
        this.persisted.sfxOn = on;
        this.save();
        this.audit.record('sfx', { on });
        return on;
      },
      cycleSong: () => {
        this.unlock();
        const name = this.audio.cycleSong();
        this.persisted.songIdx = s.songIdx;
        this.save();
        this.hud.showSector(name);
        this.audit.record('song', { name });
        return name;
      },
      cycleSfxPreview: () => {
        this.unlock();
        const label = this.audio.cycleSfxPreview();
        this.hud.showSector(label);
        this.audit.record('sfx-preview', { label });
        return label;
      },
      cycleTimeScale: () => {
        this.unlock();
        // Step through TIME_SCALES (F-TIME): 0 (pause) · 0.1 · 0.2 · 0.5 · 1 · 2 · 3 · 5.
        const scales = TIME_SCALES as readonly number[];
        const i = scales.indexOf(s.timeScale);
        // A value not in the table (e.g. a legacy persisted scale) resumes at realtime.
        s.timeScale = i < 0 ? 1 : (scales[(i + 1) % scales.length] ?? 1);
        this.audit.record('time-scale', { value: s.timeScale });
        return s.timeScale;
      },
      cycleSpace: () => {
        this.unlock();
        return this.dilateSpace();
      },
      cycleRenderMode: () => {
        this.unlock();
        const i = RENDER_MODES.indexOf(s.renderMode);
        const mode = cyc(RENDER_MODES, i + 1);
        s.renderMode = mode; // set first — spawn/remorph read it for new/rewritten materials
        this.entities.setRenderMode(mode);
        this.hud.showSector('RENDER: ' + mode.toUpperCase());
        this.audit.record('render-mode', { mode });
        return mode;
      },
      cycleView: () => {
        this.unlock();
        s.viewIdx = (s.viewIdx + 1) % VIEW_MODES.length;
        const mode = cyc(VIEW_MODES, s.viewIdx);
        this.persisted.viewIdx = s.viewIdx;
        this.save();
        this.hud.showSector('VIEW: ' + mode.toUpperCase());
        this.audit.record('view', { mode });
        return mode;
      },
      cycleAlgo: () => {
        this.selectAlgo(s.algoIdx + 1, true); // shares the picker selection path
        return cyc(ALGOS, s.algoIdx).name;
      },
      cycleWeather: (): Weather => {
        this.unlock();
        const w = this.weather.cycle(); // plays the crystallize sfx itself
        this.persisted.weatherIdx = s.weatherIdx;
        this.save();
        this.hud.showSector(w);
        this.audit.record('weather', { weather: w });
        return w;
      },
    };
  }
}
