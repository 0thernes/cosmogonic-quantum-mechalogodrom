/**
 * Composition root of the simulation: constructs every system against the
 * contracts in docs/MODULE-CONTRACTS-2026-06-26.md, owns the mutable SimState, implements
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
import { Level } from './core/frame-governor';
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
  ARENA,
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
import { mulberry32, createIsolatedStreams, type Rng } from './math/rng';
import { clamp } from './math/scalar';
import { SpatialHash } from './math/spatial-hash';
import { createGeometryCache } from './sim/geometry-cache';
import { createMorphotypes } from './sim/morphotypes';
import { createPhyla } from './sim/phyla';
import { EntityManager } from './sim/entities';
import { EntityBrainField } from './sim/entity-brain';
import { InstancedEntityRenderer, type InstanceFrame } from './sim/instanced-entities';
import { ShoggothSystem } from './sim/shoggoths';
import { PuppetMasterSystem } from './sim/puppet-masters';
import { TitanSystem } from './sim/titans';
import { WeatherSystem } from './sim/weather';
import { QuantumCloud } from './sim/quantum';
import { Connectome } from './sim/connectome';
import { EnvironmentSystem } from './sim/environment';
import { AlienFlora } from './sim/alien-flora';
import { QuantumCircuitSystem } from './sim/qcircuit';
import { ReactionDiffusionSystem } from './sim/reaction-diffusion';
import { GraphMind } from './sim/graph-mind';
import { ConstellationSystem } from './sim/constellations';
import { AtmosphereSystem } from './sim/atmosphere';
import { Viz3DSystem, type Viz3DSnapshot } from './sim/viz3d';
import { SingularitySystem, SINGULARITY_KINDS } from './sim/singularities';
import { ChaosField } from './sim/chaos-field';
import { ArtifactField } from './sim/artifacts';
import { LeviathanSystem } from './sim/leviathans';
import { NhiSystem, type NhiWorld } from './sim/nhi-system';
import { Economy } from './sim/economy';
import { NhiAction, type NhiIntent, type NhiPercept } from './sim/nhi';
import { NhiBodySystem } from './sim/nhi-body';
import { CosmicWeb } from './sim/cosmic-web';
import { GoldLattice } from './sim/gold-lattice';
import { FloatingMonoliths } from './sim/floating-monoliths';
import { GodColossus } from './sim/god-colossus';
import { QuantumLattice } from './sim/quantum-lattice';
import { AbominationArchitecture } from './sim/abomination-architecture';
import { Mechalogodrom } from './sim/mechalogodrom';
import { MechalogodromBrain, type MechalogodromBrainSnapshot } from './sim/mechalogodrom-brain';
import { AlphabetPantheonRender } from './sim/alphabet-pantheon-render';
import { corpusPulse } from './sim/tsotchke-facade';
import { GlyphBrainBatch, type GlyphBrainSnapshot } from './sim/glyph-brain';
import { Foundationals, type FoundationalsSnapshot } from './sim/foundationals';
import { apexGrowthStage, type ApexGrowthStage } from './sim/apex-consciousness-scaffold';
import { LoreEngine } from './sim/lore';
import { AnalyticsSystem } from './sim/analytics';
import { AudioEngine } from './audio/engine';
import { AudioAnalysis, type AudioBands } from './audio/analysis';
import { Hud } from './ui/hud';
import { Observatory } from './ui/observatory';
import { NhiObservatory } from './ui/nhi-observatory';
import { MarketTicker } from './ui/market-ticker';
import { PantheonArchitecturePanel } from './ui/pantheon-architecture-panel';
import { SuperCreature, type SuperPercept } from './sim/super-creature';
import { ApexBrain, SCALE_APEX_START, type ApexPercept, type ApexThought } from './sim/apex-brain';
import { breedAt, type BabyGenome, PANTHEON_TOTAL } from './sim/pantheon-breeding';
import { SelfEvolutionLoop, type EvolutionMetrics } from './sim/self-evolution-loop';
import { bedauPackardActivity, shannonDiversity } from './sim/open-endedness';
import {
  GODFORMS,
  getArchonForm,
  getFullTsotchkeBias,
  getCorpusPulseForArchon,
  createPetriDish,
  petriDishBeat,
  petriDishView,
  petriGrowthMultiplier,
  type PetriDishState,
} from './sim/godform'; // GOAL5 + TSOTCHKE full corpus (ralph 10x: Eshkol AD, Moonlab tensor, quake, irrep from (Tsotchke))
import { PantheonSociety, FIELD_DIM, ARCHON_CHANNELS } from './sim/pantheon';
import { FacultiesPantheon } from './sim/faculties-pantheon';
import { TomPantheon } from './sim/tom-pantheon';
import { applyBrutalGodEvent } from './sim/petri-dish';
import { triggerBrutalRelease, applyBrutalRelease, getBrutalLore } from './sim/brutal-god-releases';
import { EmergenceAnglesController } from './sim/emergence-angles';
import { Mortality } from './sim/mortality';
import { Stigmergy } from './sim/stigmergy';
import { Noosphere } from './sim/noosphere';
import { Symbiosis } from './sim/symbiosis';
import { MythRitual } from './sim/myth-ritual';
import { SuperMind, type SuperMindSnapshot, type SuperMindIntent } from './sim/super-mind';
import {
  quakePerturb,
  ulgHandoff,
  gwtBroadcast,
  libirrepClebsch,
  moonlabMpoStep,
  quakeQgeFactor,
  libirrepSymmetry,
  PrimordialSoup,
  tsotchkeSimWiringFraction,
  ulgCorpusResonance,
} from './sim/tsotchke-facade'; // Ralph continue 10x: + libirrepSymmetry for more irrep in world
import { qgeWorldPerturb } from './sim/qge-aliveness';
import { qgeAlivenessProxy } from './sim/quantum-quake-physics';
import { moonlabTensorContract } from './sim/moonlab-tensor';
import { qecDecodingProxy } from './sim/libirrep-qec';
import { WingmanSwarm, WINGMAN_COUNT } from './sim/super-wingmen';
import { WingmanRenderer } from './sim/super-wingmen-render';
import { SuperEvolution } from './sim/super-evolution';
import { MonolithTemple } from './sim/monolith-temple';
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
const ALGO_AUTO_PERIOD = 2.5;

/** V105: 101-glyph pantheon breeding is visual-only — no petri coupling until re-enabled. */
const PANTHEON_BREEDING_LIVE = false;

/** Cosmology SFX palette entries (V7.4) — band starts from the 110-voice palette. */
const SFX_SUBBOOM = SFX_EXTRA_BANDS['subboom']?.start ?? 0;
const SFX_FMCLANG = SFX_EXTRA_BANDS['fmclang']?.start ?? 0;
const SFX_STRANGE = SFX_EXTRA_BANDS['strange']?.start ?? 0;
const SFX_DEMONIC = SFX_EXTRA_BANDS['demonicgrowl']?.start ?? SFX_STRANGE;
const SFX_TRANSWARP = SFX_EXTRA_BANDS['transwarp']?.start ?? SFX_STRANGE;
const SFX_ABYSSAL = SFX_EXTRA_BANDS['abyssal']?.start ?? SFX_STRANGE;

/**
 * SIMULATION N(2) chaos floor (V7.6): the nightmare never settles below this. Set at the cMul
 * SATURATION point — `chaosMul()` is `min(chaos/2, 3)`, which maxes at chaos = 6 — so N(2)
 * pins every chaos consumer (behaviour agitation, sort push, sky tremor) to its ceiling. The
 * earlier 3.5 sat BELOW saturation (cm 1.75 — milder than an ordinary chaos-boost); the
 * dedicated jitterGain in entities.update() carries the agitation PAST the clamp on top.
 */
const CHAOS_NIGHTMARE_FLOOR = 6;
/** BRUTALISM: cool overcast concrete fog the cosmos fades into (module consts → no per-frame alloc). */
const BRUTAL_FOG = new THREE.Color(0x4a4a52);
const BRUTAL_FOG_DENSITY = 0.0011;

/** V57: singularity kind → telemetry display name (the chaos chooser cycles SINGULARITY_KINDS). */
const SINGULARITY_LABEL: Record<string, string> = {
  blackhole: 'BLACK HOLE',
  whitehole: 'WHITE HOLE',
  greyhole: 'GREY HOLE',
  strangestar: 'STRANGE STAR',
  entropy: 'ENTROPY FIELD',
};

const BRUTAL_STYLES = [
  { name: 'BRUTALISM', glyph: '▦', title: 'poured concrete monolith skin' },
  { name: 'NOUVEAUNESS', glyph: '❧', title: 'organic art-nouveau tendril skin' },
  { name: 'ROCOCOGOLOGY', glyph: '✾', title: 'ornate pearl-gold overload skin' },
  { name: 'COSMICMORPHISM', glyph: '☄', title: 'cosmic metamaterial nebula skin' },
  { name: 'REPRESSIONISM', glyph: '▣', title: 'suppressed monochrome pressure skin' },
] as const;

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
  private readonly uiRng: Rng;
  private readonly state: SimState;
  private prePauseTimeScale = 1;
  private readonly grid: SpatialHash<Entity>;
  private readonly audio: AudioEngine;
  /** Aborts the global (window) hero-event listeners on {@link dispose} — without this they leaked
   *  one set per dev hot-reload, each firing against a dead World (the HMR hook calls dispose()). */
  private readonly disposeAbort = new AbortController();
  private readonly entities: EntityManager;
  private readonly entityBrains: EntityBrainField; // V42: per-organism 70-param neural controller
  private readonly shoggoths: ShoggothSystem;
  private readonly puppets: PuppetMasterSystem;
  private readonly weather: WeatherSystem;
  private readonly quantum: QuantumCloud;
  private readonly connectome: Connectome;
  private readonly environment: EnvironmentSystem;
  /** Alien vegetal ground ecology — 10k plants / 50 species seated on the dunes (read-only coupling). */
  private readonly alienFlora: AlienFlora;
  private readonly hud: Hud;
  private readonly panel: TelemetryPanel;
  private readonly input: InputSystem;
  private readonly pantheonArchitecturePanel: PantheonArchitecturePanel;

  // ── PANTHEON V3 systems (CONTRACTS V3) ──
  private readonly titans: TitanSystem;
  private readonly observatory: Observatory;
  /** F-NHI V15: the self-building 3×3 neural-observatory panel for the focused NHI. */
  private readonly nhiObs: NhiObservatory;
  /** F-ECON V23: the self-building market-ticker panel (live AURUM/UMBRA market state). */
  private readonly marketTicker: MarketTicker;

  // F-SUPER V31 + GOAL5: EXACTLY 5 SUPER CREATURES (Archons/Godforms/pantheon apexes) at boot. (legacy single kept only for hero/twin)
  // ============================================================================
  // NOT SENTIENT DISCLAIMER (enforced): NOT SENTIENT / NO PHENOMENAL CONSCIOUSNESS.
  // Per contract + masters: models/scaffolding/functional correlates ONLY. Phenomenal ~1/10;
  // hard problem untouched. "Consciousness" = ignition/phi/self-model proxies. No claims
  // of sentience in prose, UI, or docs. See SUPER-CREATURE-RESEARCH-2026-06-26.md + MODULE-CONTRACTS.
  // ============================================================================
  // Legacy single creature path kept ONLY for player hero/twin spawn; the 5 drive the world.
  // All use distinct child seeds (master ^ + archetype 0-4 offsets) for determinism.
  private readonly superCreature: SuperCreature;
  private superMindSnap: SuperMindSnapshot | null = null;
  private readonly superMinds: SuperMind[] = [];
  /** 25-Archon society layer: 20 light echoes + shared stigmergic mind-field (emergence #5). */
  private readonly pantheon = new PantheonSociety();
  /** NHSI · 100-faculty pantheon — live telemetry + world percept bias (emergence #6). */
  private readonly facultiesPantheon: FacultiesPantheon;
  /** NHSI · 25 theory-of-mind organs — social cue field over apex percepts. */
  private readonly tomPantheon: TomPantheon;
  /** NHSI · emergence angles 8–10 (Eshkol evolution, cross-strain, collective). */
  private readonly emergenceAngles: EmergenceAnglesController;
  private readonly stigmergy = new Stigmergy();
  private readonly noosphere = new Noosphere();
  private readonly symbiosis: Symbiosis;
  private readonly mythRitual: MythRitual;
  private readonly archonMortality: Mortality[];
  private readonly nhsiFacultyIn = new Float32Array(16);
  private readonly nhsiTomCues = new Float32Array(8);
  private readonly nhsiGenomeScratch = new Float32Array(32);
  private readonly nhsiCollectiveScratch = new Float32Array(16);
  private readonly superBodies: SuperBodySystem[] = [];
  // GOAL5: per-archon small creature snapshots (for body.setMind) + the 5 deep minds/bodies.
  private readonly superCreatures: SuperCreature[] = [];
  /** Primordial petri dishes — one per Archon; digital biologic soup (FULL Tsotchke wired: ALL 21 repos from tsotchke user + Tsotchke-Corporation: Eshkol as the core non-LLM consciousness language with native AD-as-primitive + GWT/active-inference + programs as heritable DNA/genomes, Moonlab Clifford/tensors/QEC/VQE, QGTL geometry/Berry/natural gradients, spin-based neural/Hopfield/SK instinct, libirrep symmetry/Wigner/CG, quantum-quake aliveness + QGE, ulg laws, logo-lab procedural morphogenesis, tensorcore, PINN/PIMC, quantum/classical rng, asteroids, classical contrast, homebrew tooling). The Petri Dish (petri-dish.ts + primordial-soup.ts + digital-biologics.ts) is the God layer / growth engine for different forms of life and proto-sentience. Super Creature / 5 Archons are the initial framework and spark only — "as if God made primordial inorganic soup". Soup grows independent digital biologics onward via Eshkol programs (mutated by real AD, selected by aliveness/QGT/collective order). "Grow What Thou Wilt." (Aleister Crowley). Not LLM or tokenizer bullshit. All local docs (README, ARCH, ERD/ERM/ERP, masters, SPECS, LABS) + GH match exactly. Accurate, truthful, current. Tsotchke is paramount. */
  private readonly petriDishes: PetriDishState[] = [];
  private petriRng!: Rng;
  private readonly superPanel: SuperPanel;
  private readonly superBody: SuperBodySystem;
  private readonly superRng: Rng;
  private readonly superScene: THREE.Scene;
  private readonly emptyQ = new Float32Array(10);
  private readonly superEvo: SuperEvolution;
  private readonly monolithTemple: MonolithTemple;
  private superAscended = false;
  private readonly evoRng: Rng;
  private static readonly EVO_DAY_FRAMES = 21600;
  private readonly wingSwarm: WingmanSwarm;
  private readonly wingRender: WingmanRenderer;
  /** Primordial soup petri dish — Archon consciousness catalyzes emergent digital biologics. */
  private readonly primordialSoup: PrimordialSoup;
  private readonly superTwins: SuperCreature[] = [];
  private readonly heroBodies: { body: SuperBodySystem; mind: SuperCreature; econId: number }[] =
    [];
  private superheroUnlocked = false;
  private readonly superheroState = new SuperheroState();
  private readonly superheroHud: SuperheroHud;
  /** GOAL5: canonical GODFORMS from godform.ts (per contract, exclusive ownership).
   * Single source of truth. Attached as public static for World.GODFORMS access (integrator + docs).
   * Bias fn wired below for archetype differentiation (Clifford vs chaos vs narrative). */
  public static readonly GODFORMS = GODFORMS; // exclusive from './sim/godform' (STARKILLER: leaf owns; no copy)
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
  /** BRUTALISM: smoothed 0..1 concrete-crossfade factor (eases toward state.brutalism each frame). */
  private brutalismFactor = 0;
  private brutalStyleIdx = -1;
  private readonly viz3d: Viz3DSystem;
  /** Cosmological chaos effects (CONTRACTS V7.4) — at most one active at a time. */
  private readonly singularities: SingularitySystem;
  /** CHAOS MODE (V62) — a toggled Lorenz-driven quantum storm; inert + rng-silent until engaged. */
  private readonly chaosField: ChaosField;
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
  private readonly genomeRng: Rng;
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
  /** Sparse suspended abomination-architecture megaliths drifting through the dome (additive, no rng). */
  private readonly floatingMonoliths: FloatingMonoliths;
  /** V110: the ONE colossal god-tier monument looming over the skyline (item 18). */
  private readonly godColossus: GodColossus;
  /** Floating neon sacred-geometry shells — the quantum heart (additive; assigned in the constructor). */
  private readonly quantumLattice: QuantumLattice;
  /** Sparse suspended circuit architecture — materialism around the dome without clutter. */
  private readonly abominationArchitecture: AbominationArchitecture;
  /** V-MECHA: the central fusion abomination — 10 bipolar titan shells converge + fuse into one monster (additive; no rng). */
  private readonly mechalogodrom: Mechalogodrom;
  private readonly mechalogodromBrain: MechalogodromBrain;
  private lastMechaBrainSnap: MechalogodromBrainSnapshot | null = null;
  private lastGlyphSnaps: GlyphBrainSnapshot[] = [];
  /** V-MECHA brain snapshot getter (for architect panel telemetry). */
  get mechaBrain(): MechalogodromBrain {
    return this.mechalogodromBrain;
  }
  /** V-ABC: the 100 Greek+Latin alphabet archetypes alive across the dome (instanced; no rng). */
  private readonly alphabetPantheon: AlphabetPantheonRender;
  /** V-GLYPH: 100 × 25k-parameter brains driving the letter creatures' visual activity (visual-only). */
  private readonly glyphBrains: GlyphBrainBatch;
  /** V-FND: Foundationals — deep interconnect between APEX organs (1B self-awareness path). */
  private readonly foundationals: Foundationals;
  /** Scratch organ activity vector for Foundationals ticks (reused, alloc-free). */
  private readonly fndOrganScratch = new Float32Array(10);
  /** Last Foundationals snapshot (for architect panel telemetry). */
  private lastFoundationals: FoundationalsSnapshot | null = null;
  /** Scratch activity/novelty/valence arrays for pantheon handoff (reused, alloc-free). */
  private readonly glyphActivity = new Float32Array(100);
  private readonly glyphNovelty = new Float32Array(100);
  private readonly glyphValence = new Float32Array(100);
  /** Cycle cursor for the chaos control's singularity chooser. */
  private singularityCursor = 0;
  /** V57: total resets this session — surfaced in the HUD View/Speed/Render box. */
  private resetCount = 0;
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
  // V60 gravitational-lens scratch: the singularity world centre + its projected NDC.
  private readonly lensWorld = new THREE.Vector3();
  private readonly lensNdc = new THREE.Vector3();
  // V41 superhero piloting scratch + the on-screen D-pad steer (held vector from the HUD / touch).
  private readonly heroPad = { x: 0, y: 0, z: 0 };
  private readonly heroIntent = new THREE.Vector3();
  private readonly heroF = new THREE.Vector3();
  private readonly heroR = new THREE.Vector3();
  /** Pre-allocated driveSuper scratch — eliminates per-call allocations (audit fix #2/#3). */
  private readonly superCollective = new Float32Array(FIELD_DIM);
  private readonly superBasePercept: SuperPercept = {
    energy: 0,
    threat: 0,
    crowding: 0,
    chaos: 0,
    wealthRel: 0,
    preyClose: 0,
    rivalClose: 0,
    pull: 0,
    light: 0,
    sound: 0,
    phase: 0,
  };
  private readonly superArchonPercept: SuperPercept = {
    energy: 0,
    threat: 0,
    crowding: 0,
    chaos: 0,
    wealthRel: 0,
    preyClose: 0,
    rivalClose: 0,
    pull: 0,
    light: 0,
    sound: 0,
    phase: 0,
  };
  private readonly superMpoInput = new Float32Array(2);
  /** V-APEX: the Entropic Tesseract Hydra brain (10 organs + quantum + meta-paradox). Wired into the apex beat. */
  private readonly apexBrain: ApexBrain;
  private lastApexThought: ApexThought | null = null;
  private lastApexGrowth: ApexGrowthStage | null = null;
  /** Current APEX growth stage (null until first apex tick). Read by the architect panel. */
  get apexGrowth(): ApexGrowthStage | null {
    return this.lastApexGrowth;
  }
  /** Current Foundationals snapshot (null until first apex tick). Read by the architect panel. */
  get foundationalsSnapshot(): FoundationalsSnapshot | null {
    return this.lastFoundationals;
  }
  private readonly apexPercept: ApexPercept = {
    threat: 0,
    energy: 0,
    chaos: 0,
    novelty: 0,
    level: 0,
  };
  private readonly glyphPercept = new Float32Array(8);
  /** V-BREED: the 101-glyph pantheon breeding system. Periodic rites produce BabyGenome children
   *  whose 4 mathematical structures (Touchard, winding, de Jong, Blaschke) boost petri dish growth. */
  private breedNonce = 0;
  private lastBaby: BabyGenome | null = null;
  /** V-SELFEVO: the self-evolution loop (Gödel-machine style self-improvement). Runs every 1200 frames. */
  private selfEvoLoop: SelfEvolutionLoop | null = null;
  private readonly evoRng2 = mulberry32(0xc0ffee42 >>> 0); // deterministic sub-stream for self-evo (fixed seed: seed-independent meta-layer outside the population golden)
  /** V-BEDAU: Bedau-Packard evolutionary activity tracking. Diversity snapshots feed the activity metric. */
  private readonly diversitySnapshots: number[] = [];
  private lastBedauActivity = 0;

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

    const streams = createIsolatedStreams(this.persisted.seed);
    this.rng = streams.physicsRng;
    // Economy rng: a deterministic sub-stream derived from the world seed (golden-ratio mix), kept
    // separate from `this.rng` so the market never perturbs the main simulation's draw order.
    this.econRng = mulberry32((this.persisted.seed ^ 0x9e3779b1) >>> 0 || 1);
    // Genome rng (ADR-0009): heritable organism genetics on their OWN seeded sub-stream so trait
    // genomes + inheritance-on-split never shift the main entity draw order. Same golden-ratio-mix
    // discipline as econRng/superRng. Passed via ctx; EntityManager uses it for trait heredity.
    this.genomeRng = mulberry32((this.persisted.seed ^ 0x6e3a17c5) >>> 0 || 1);
    // UI rng: isolated stream to prevent pointer events and hover states from advancing the physics seed.
    this.uiRng = streams.uiRng;

    this.state = {
      chaos: 0.5,
      entropy: 0,
      mutations: 0,
      timeScale: 1,
      renderMode: cyc(RENDER_MODES, this.persisted.renderIdx ?? 0),
      brutalism: false, // BRUTALISM: session-only Super Creature concrete-monolith mode (B hotkey)
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
    // A 10-unit cell (measured sweet spot, docs/BENCHMARKS-2026-06-26.md) cuts that ~36% while keeping the
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
      genomeRng: this.genomeRng,
      grid: this.grid,
      morphs,
      geos,
      state: this.state,
      audit: this.audit,
      sfx: (type) => this.audio.play(type),
      creatureSfx: (mi) => {
        if (this.rng() > 0.048) return;
        const bands = SFX_EXTRA_BANDS;
        const pick = mi % 9;
        const band =
          pick === 0
            ? bands['demonic']
            : pick === 1
              ? bands['chitter']
              : pick === 2
                ? bands['howl']
                : pick === 3
                  ? bands['abyssal']
                  : pick === 4
                    ? bands['voidgurgle']
                    : pick === 5
                      ? bands['alienchitter']
                      : pick === 6
                        ? bands['demonicgrowl']
                        : pick === 7
                          ? bands['transwarp']
                          : bands['phantomscale'];
        const start = band?.start ?? SFX_STRANGE;
        const count = band?.count ?? 24;
        this.audio.playId(start + (mi % count));
      },
    };
    this.audit.setSimClock(() => this.state.frame);

    this.environment = new EnvironmentSystem(ctx);
    this.alienFlora = new AlienFlora(ctx); // alien vegetal ground ecology (10k plants, 50 species, GPU sway)
    this.entities = new EntityManager(ctx);
    this.entities.attachFloraComfort((x, z) => this.alienFlora.comfortAt(x, z));
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

    // ── Wildbeyond V2 wiring (cadences in step(); see ARCHITECTURE-2026-06-26.md) ──
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
    this.titans.attachProcreation((x, y, z) => {
      this.launchNhiBeing(x, y, z, 'titan-procreation');
    });
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
    // V62: CHAOS MODE on its OWN seeded sub-stream (the golden-ratio mix is applied inside, like
    // econRng/superRng) so the storm's quantum dice never perturb the main entity draw order — off ⇒
    // the sim is byte-identical.
    this.chaosField = new ChaosField(this.persisted.seed);
    // F-HOLES: let an active singularity tug the big roaming beings too, not just the organisms.
    this.shoggoths.attachSingularity(this.singularities);
    this.titans.attachSingularity(this.singularities);
    // F-BEINGS: a fourth order of colossi (leviathans). Boot-stream-neutral — draws no rng here.
    this.leviathans = new LeviathanSystem(ctx);
    this.leviathans.attachSingularity(this.singularities);
    this.leviathans.attachReactionDiffusion(this.rd); // V1.3 ECOLOGY: colossi stir the primordial substrate
    // F-NHI V10: alien biomechanical bodies for launched NHIs (additive; draws no rng).
    this.nhiBody = new NhiBodySystem(ctx.scene);
    // V11: far-field cosmic-web backdrop for depth + context (additive; draws no rng).
    this.cosmicWeb = new CosmicWeb(ctx.scene);
    // V11: floating gold wireframe architecture for designed-space depth (additive; draws no rng).
    this.goldLattice = new GoldLattice(ctx.scene);
    this.floatingMonoliths = new FloatingMonoliths(ctx.scene); // 16 drifting greebled megaliths
    this.godColossus = new GodColossus(ctx.scene); // V110: the colossal god-tier monument (item 18)
    // V11: floating neon sacred-geometry quantum lattice (additive; draws no rng).
    this.quantumLattice = new QuantumLattice(ctx.scene);
    this.abominationArchitecture = new AbominationArchitecture(ctx.scene);
    // V-MECHA: the central fusion abomination — boot-stream-neutral (no rng), reacts to world chaos.
    this.mechalogodrom = new Mechalogodrom(ctx.scene);
    this.mechalogodromBrain = new MechalogodromBrain((this.persisted.seed ^ 0x8e4ac471) >>> 0 || 1);
    // V-ABC: the 100 Greek+Latin alphabet archetypes, alive across the dome (instanced; no rng).
    this.alphabetPantheon = new AlphabetPantheonRender(ctx.scene);
    // V-GLYPH: 100 × 25k-parameter brains (visual-only; drives pantheon appearance, not world state).
    this.glyphBrains = new GlyphBrainBatch(this.persisted.seed);
    // V-FND: Foundationals — deep interconnect for the APEX 1B self-awareness path.
    this.foundationals = new Foundationals(this.persisted.seed);

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
    // V-APEX: the Entropic Tesseract Hydra brain on its OWN seeded sub-stream (determinism-safe).
    // 10 incompatible neuron architectures + quantum brain + meta-paradox layer. Wired into the apex beat.
    // Pass 3: boot at APEX-100K designed scale (live allocation stays capped for performance).
    this.apexBrain = new ApexBrain((this.persisted.seed ^ 0xa1e8b6a4) >>> 0 || 1, {
      scale: SCALE_APEX_START,
    });
    // legacy single kept EXCLUSIVELY for player hero/twin paths (maybeSpawn + its snapshot in UI)
    this.superCreature = new SuperCreature(this.superRng);
    // V47: the wingman swarm (logic on its own rng sub-stream) + its single-draw-call instanced render.
    this.wingSwarm = new WingmanSwarm(
      WINGMAN_COUNT,
      mulberry32((this.persisted.seed ^ 0x77149abc) >>> 0 || 1),
    );
    this.wingRender = new WingmanRenderer(ctx.scene, WINGMAN_COUNT);
    // V48: the prime's evolution — restored from localStorage + caught up by real wall-clock days
    // elapsed (the "daemon cron / updates every 24h"). A META-organ OUTSIDE the deterministic sim.
    this.evoRng = mulberry32((this.persisted.seed ^ 0x00e701ce) >>> 0 || 1);
    this.superEvo = this.loadEvolution();
    // V63: the LV100 ascension monument. If the persisted creature is ALREADY at the summit, raise
    // the temple silently on boot (it's just THERE); a fresh live ascension plays the full fanfare.
    this.monolithTemple = new MonolithTemple(ctx.scene);
    if (this.superEvo.ascended) {
      this.monolithTemple.reveal(0, 0, -40 * ARENA_MID, true);
      this.superAscended = true;
    }
    this.superPanel = new SuperPanel();
    this.pantheonArchitecturePanel = new PantheonArchitecturePanel();
    // NOTE: legacy single register removed; 5 SUPER CREATURES register their own purses below (ECON 9000+i).
    // F-SUPER V32: the masterful many-eyed apex BODY (god-jewel shader) — additive, draws no rng.
    // F-BRAIN V42: every organism's compact 70-param genome brain, on its OWN seeded sub-stream (so the
    // main rng order + the population golden are byte-identical). Sized to the hard entity ceiling.
    this.entityBrains = new EntityBrainField(
      this.quality.maxEntities,
      mulberry32((this.persisted.seed ^ 0xb7a19e3d) >>> 0 || 1),
    );
    this.superScene = ctx.scene;
    // 5 SUPER CREATURES (GOAL5 Archons/Godforms): World.GODFORMS from exclusive godform.ts source.
    // WIRED FROM FULL TSOTCHKE CORPUS (Z:\[Vibe Coded (AI)]\(Tsotchke) 20 repos + sites; see docs/TSOTCHKE_FULL...AUDIT.md). Eshkol AD/HoTT/arena + Moonlab tensor/qgt/Bloch for per-Archon percepts/bias/pulses/entropy. 5 child seeds + getGodformBias + getArchonForm. Local grid + audio + bias. (Ralph-loop incorporation wave.)
    // Determinism: child seeds only (no consumption of main/super streams). Spaced + archetype bias.
    const master = (this.persisted.seed ^ 0x5e1f3d11) >>> 0 || 1;
    for (let i = 0; i < 5; i++) {
      // per-Archon bias from godform (research corpus applied: QGT geometry, Eshkol AD/consciousness, moonlab Clifford reflex) // bias available for mind/body distinction (5 unique)
      // child seed = master + archetype offset (golden prime mix for separation)
      const mindSeed = (master + i * 0x9e3779b1) >>> 0 || 1 + i;
      const bias = getFullTsotchkeBias(i); // full corpus extension (Eshkol/Moonlab/Quake factors) // per-Archon (clifford/generative/chaos/narrative/color) — used in world percepts + mind ctor (godform exclusive)
      // Tsotchke corpus wiring 10x: Moonlab tensor/MPO for 5-Archon group entanglement (mirrors/moonlab), Eshkol AD/GWT for percept bias, libirrep symmetry, ulg/quantum-quake hybrid aliveness (ulgHandoff, gwtBroadcast, hybridAliv).
      // Full local: Z:\[Vibe Coded (AI)]\(Tsotchke) — see TSOTCHKE-CORPUS-RALPH-WIRING-AUDIT-2026-06-19.md
      // Ralph 10x continue: quakeQge, mpo, gwt used in econ, pull, spawn for corpus aliveness.
      const pulse = getCorpusPulseForArchon(i, mindSeed); // 10x heartbeat: quantum-quake aliveness wired from corpus to world for this Archon
      const quakeLife = pulse.quakeAliveness; // corpus quake-aliveness; feeds econ vitality + hybrid aliveness below (deterministic from seed)
      const m = new SuperMind(
        mulberry32(mindSeed),
        bias.cliffordWeight,
        bias.eshkolLogic || 0.5,
        bias.eshkolInference || 0.5,
        bias.eshkolWorkspace || 0.5,
        bias.tsotchkeModule || 'EshkolConsciousness',
        bias.eshkolProgram,
      ); // TSOTCHKE CORPUS: Eshkol consciousness + per-Archon .esk program from godform
      this.superMinds.push(m);
      const c = new SuperCreature(mulberry32((mindSeed ^ 0xc0d3beef) >>> 0 || 1 + i));
      this.superCreatures.push(c);
      // 10x heartbeat re-audit: actually use quakeLife from corpus pulse for Archon aliveness (e.g. econ vitality, future world interactions/percepts). Det from seed.
      const quakeEconBase = 20 + Math.floor(quakeLife * 5);
      const qPert = quakePerturb(quakeLife, mindSeed, 0.2);
      const quakeEcon = Math.floor(quakeEconBase * qPert);
      // Ralph heartbeat 10x continue: ulgHandoff + gwt for hybrid aliveness + workspace in super world spawn (Tsotchke corpus)
      const ulgA = ulgHandoff(quakeLife, bias.eshkolLogic || 0);
      const gwtW = gwtBroadcast([quakeLife, bias.eshkolWorkspace || 0.5], [0.8, 0.6]);
      const hybridAliv = (ulgA + (gwtW[0] || 0)) * 0.5; // Ralph 10x: use for Tsotchke hybrid aliveness (Eshkol GWT + ulg + quake) in world
      // Ralph re-audit 10x continue: libirrepClebsch for Archon spawn pos symmetry (Tsotchke libirrep)
      const irPos = libirrepClebsch(1, i % 3, 0);
      // Ralph loop continue 10x more: use quakeQgeFactor + mpo for more quantum-quake/Moonlab tensor effect on super aliveness in world
      const qge = quakeQgeFactor(quakeLife, 0.3);
      const mpoW = moonlabMpoStep(new Float32Array([quakeLife, hybridAliv]), 2);
      // feed hybrid into econ for corpus aliveness effect (deterministic)
      const econBoost =
        1 + hybridAliv * 0.1 + (irPos % 2) * 0.01 + qge * 0.05 + Math.abs(mpoW) * 0.02;
      this.economy.register(
        World.ECON_SUPER_BASE + i,
        GODFORMS[i % GODFORMS.length] ?? 'ARCHITECT',
        Math.floor(quakeEcon * econBoost),
        this.superRng,
      );
      // GOAL5: spaced initial anchors so 5 Archons start distinct (visible separate + local percept interactions at boot)
      const theta = (i * 6.28318530718) / 5;
      const r = 11 * ARENA * 0.65;
      const ax = r * Math.cos(theta);
      const az = r * Math.sin(theta);
      // Ralph continue 10x more: use mpoW (Moonlab) + qge for Tsotchke modulation in Archon spawn height (more everywhere in world)
      const ay = 14 + ((i * 3) % 7) + Math.abs(mpoW) * 2 + qge * 1;
      const form = getArchonForm(i);
      const b = new SuperBodySystem(ctx.scene, { x: ax, y: ay, z: az }, i, form); // GOAL5: pass form for per-Archon extreme chaotic morph (eyes/arms/wings etc + shader)
      this.superBodies.push(b);
      this.petriDishes.push(createPetriDish(mindSeed));
      // Economy: exactly 5 purses for the pantheon apexes
    }
    const soupSeed = (master ^ 0x50ff0ad1) >>> 0 || 1;
    this.petriRng = mulberry32((master ^ 0x50ff0ad2) >>> 0 || 1);
    this.primordialSoup = new PrimordialSoup(soupSeed);
    const nhsiSeed = (master ^ 0x4e485349) >>> 0 || 1; // "NHSI"
    this.facultiesPantheon = new FacultiesPantheon(mulberry32(nhsiSeed));
    this.tomPantheon = new TomPantheon(mulberry32((nhsiSeed ^ 0x546f4d21) >>> 0 || 1));
    this.emergenceAngles = new EmergenceAnglesController();
    this.symbiosis = new Symbiosis(this.superRng);
    this.mythRitual = new MythRitual(this.superRng);
    this.archonMortality = Array.from(
      { length: 5 },
      (_, i) => new Mortality(this.superRng, { baseLifespan: 4000 + i * 500 }),
    );
    for (let i = 0; i < ARCHON_CHANNELS; i++) {
      const g = this.nhsiGenomeScratch;
      for (let k = 0; k < g.length; k++) g[k] = 0.35 + 0.08 * ((i * 7 + k * 3) % 11);
      this.emergenceAngles.registerStrain(`archon-${i}`, g);
    }
    // The 5 are "alive" with powers: each has distinct child-seeded SuperMind (cortex+ToT+quantum+Clifford reflex+memory)
    // driving SuperBody (variant=0..4 selects archetype morph/wing/eye count + shader uVariant for color theme/pulse).
    // Per-frame: think(percept) → snapshot → setMind/setConsciousness; bodies update wander from mind act[] + evo.
    // No learning (fixed seeded weights); all read/write shared systems (grid for local, econ per purse, audio etc).
    this.superBody = this.superBodies[0]!; // legacy alias for prime (compat paths + wing swarm)
    this.superMindSnap = null;
    this.superheroHud = new SuperheroHud(); // V35: self-mounting player HUD, hidden until unlock
    // F-SUPER V34/35: the access puzzle fires `superhero-unlock` once when solved → reveal #2 + the
    // player HUD; the HUD's buttons fire `hero-power`/`hero-vision`/`hero-cam` for the world to apply.
    if (typeof window !== 'undefined') {
      const signal = this.disposeAbort.signal;
      window.addEventListener('cqm:superhero-unlock', () => this.revealSecondSuper(), {
        once: true,
        signal,
      });
      window.addEventListener(
        'cqm:hero-power',
        (e) => this.heroPower(((e as CustomEvent).detail?.id as string) ?? ''),
        { signal },
      );
      window.addEventListener('cqm:hero-vision', () => this.heroCycleRender(), { signal });
      window.addEventListener('cqm:hero-cam', () => this.heroCycleCam(), { signal }); // V41: orbit/3rd/1st
      window.addEventListener('cqm:hero-mode', () => this.heroCycleControl(), { signal }); // V41: autopilot/assist/manual
      window.addEventListener('cqm:hero-hud-toggle', () => this.superheroHud.toggleOpen(), {
        signal,
      });
      window.addEventListener(
        'cqm:hero-move',
        (e) => {
          const d = (e as CustomEvent).detail ?? {};
          this.heroPad.x = Number(d.x) || 0; // on-screen D-pad / touch steer (held vector)
          this.heroPad.y = Number(d.y) || 0;
          this.heroPad.z = Number(d.z) || 0;
        },
        { signal },
      );
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
      bioIntegration: 0,
      bioCoherence: 0,
      bioMomentum: 0,
      nhi: 0,
      godPower: 0,
      viewName: cyc(VIEW_MODES, this.state.viewIdx),
      timeScale: this.state.timeScale,
      renderName: this.state.renderMode,
      econ: this.economy.summary(),
      musicOn: false,
      sfxOn: false,
      resetCount: 0,
      sim: this.state.sim,
      singularity: '',
      chaosMode: false,
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

  /** V66: the world BOOTS at ~500 organisms so the first frame loads instantly, then ramps. */
  private static readonly BOOT_POP = 500;
  /** V66: seconds for the live target to ease from {@link BOOT_POP} up to the tier ceiling. */
  private static readonly GROWTH_RAMP_SECS = 210;

  /**
   * Boot/reset population (V66): a fast-loading **~500** on every tier (the directive's "always start
   * at 500 and scale to 50,000 eventually"). The HARD ceiling stays the tier's full `maxEntities` (the
   * beefy 50k mega world is untouched) — only the START is small, and {@link updateGrowthTarget} ramps
   * the live target up so organic auto-split + sparse-respawn grow the world into it. Loads faster,
   * then fills out + fluctuates.
   */
  private bootPopulation(): number {
    return Math.max(120, Math.min(World.BOOT_POP, this.quality.targetEntities));
  }

  /**
   * Lifecycle teardown for the dev HMR hook (`main.ts` calls `world.dispose?.()` before a hot-replace).
   * Drops the global hero-event listeners and tears the audio engine down (timers + context); without
   * it those leaked one set per reload, each bound to the now-dead World. Idempotent and a no-op in
   * production (HMR is dev-only). The renderer Engine is freed separately by the HMR hook.
   */
  dispose(): void {
    if (this.disposeAbort.signal.aborted) return; // idempotent — abort() is the sentinel
    this.disposeAbort.abort();
    this.audio.dispose();
    // Free the GPU-resource-owning subsystems that expose a dispose(). The Engine's
    // forceContextLoss() reclaims the context's VRAM, but these JS-side geometry/material
    // dispose paths were skipped entirely — each HMR reload built a fresh World whose
    // subsystems were never torn down. Only subsystems that actually have a dispose() are called.
    this.singularities.dispose();
    this.wingRender.dispose();
    this.monolithTemple.dispose();
    this.abominationArchitecture.dispose();
    this.mechalogodrom.dispose(); // V-MECHA: free the fusion abomination's geometries + materials
    this.floatingMonoliths.dispose(); // free the 16 drifting megaliths' geometries + materials
    this.godColossus.dispose(); // free the colossal god monument
    this.alienFlora.dispose(); // free the 10k-plant alien-flora field
    this.alphabetPantheon.dispose(); // V-ABC: free the 100-archetype instanced pools
    this.artifacts.dispose(this.engine.scene);
    this.nhiBody.dispose(); // 3 shared geometries + live body materials
    this.rd.dispose(); // the Gray–Scott GPU DataTexture
    for (const b of this.superBodies) b.dispose();
    for (const h of this.heroBodies) h.body.dispose();
    this.superheroHud.dispose();
    this.pantheonArchitecturePanel.dispose();
    this.input.dispose();
  }

  /**
   * V66: drive the live population target — ease from {@link BOOT_POP} up to the tier ceiling over
   * {@link GROWTH_RAMP_SECS}, then BREATHE (a slow ±8 % sine) so the population fluctuates dynamically
   * instead of pinning flat at the cap. Pure function of `state.elapsed` (no rng) ⇒ deterministic: the
   * EntityManager grows toward this each frame. The ceiling is the tier's real target, so the huge world
   * is still reached — just not all at once on the first frame.
   */
  private updateGrowthTarget(): void {
    const s = this.state;
    const ceiling = Math.min(this.quality.targetEntities, this.quality.maxEntities);
    const boot = Math.min(World.BOOT_POP, ceiling);
    const el = s.elapsed;
    const g = el >= World.GROWTH_RAMP_SECS ? 1 : el / World.GROWTH_RAMP_SECS;
    const ease = g * g * (3 - 2 * g); // smoothstep ramp
    const breathe = 1 - 0.08 * ease * (0.5 - 0.5 * Math.cos(el * 0.04)); // gentle ±8% once grown
    s.growthTarget = Math.round((boot + (ceiling - boot) * ease) * breathe);
  }

  /**
   * First-gesture unlock: initializes the AudioContext and restores the
   * persisted SFX and music preferences exactly once. Safe to call repeatedly.
   */
  unlock(): void {
    this.audio.init();
    if (!this.sfxRestored) {
      this.sfxRestored = true;
      if (this.persisted.sfxOn && !this.audio.sfxOn) this.audio.toggleSfx();
      if (this.persisted.musicOn && !this.audio.musicOn) this.audio.setMusicOn(true);
    }
  }

  /**
   * V81: surface render-governor quality changes in the HUD. Called from the render loop in
   * main.ts when the governor drops or restores DPR/FX/shadows, so the user sees *why* the
   * world got sharper or blurrier.
   */
  showQualityNotice(level: Level): void {
    const label =
      level === Level.FULL
        ? 'QUALITY RESTORED · FULL'
        : level === Level.DPR_85
          ? 'QUALITY · DPR 85%'
          : level === Level.DPR_65
            ? 'QUALITY · DPR 65%'
            : level === Level.FX_OFF
              ? 'QUALITY · FX OFF'
              : 'QUALITY · SHADOWS OFF';
    this.hud.showSector(label);
  }

  /** Advance one frame. rawDt is the unclamped clock delta in seconds. */
  step(rawDt: number): void {
    const s = this.state;
    // Clamp to [0, 50ms]: negative deltas (clock skew) and tab-switch gaps
    // would otherwise drive curve parameters and physics out of range.
    const uiDt = Math.min(Math.max(rawDt, 0), 0.05); // real frame delta, UNSCALED by timeScale
    const dt = uiDt * s.timeScale;
    s.elapsed += dt;
    s.frame++;
    const t = s.elapsed;
    this.updateGrowthTarget(); // V66: ramp the live population target 500 → ceiling, then breathe

    this.updateHeroControl(); // V41: route player nav input to the avatar (assist / manual)
    this.updateCamera(dt, t);
    this.updateHeroCamera(); // V41: chase / first-person follow overrides the cam when engaged
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
    // V62 CHAOS MODE: a toggled Lorenz-driven quantum storm. Inert + rng-silent while off (so the
    // base sim is byte-identical); while on it elevates `s.chaos` into the storm band, tunnels /
    // entangles / superposes the organisms, and arms timed weather + algorithm disturbances we drain
    // here. Runs BEFORE the systems integrate so the velocity/position kicks carry this frame.
    this.chaosField.update(dt, this.entities.list, s);
    if (this.chaosField.takeWeatherKick()) {
      this.weather.cycle();
      this.persisted.weatherIdx = s.weatherIdx;
    }
    if (this.chaosField.takeAlgoKick()) this.selectAlgo(s.algoIdx + 1, false);

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
    // 25-Archon pantheon society: light echoes + shared mind-field (emergence #5 stigmergy).
    void this.pantheon.beat(s.frame);
    // F-BEINGS: the leviathans sail the mid-field (pure trig + the read-only hole force, no rng).
    this.leviathans.update(dt, t);
    // 5 SUPER CREATURES + F-SUPER: animate ALL 5 bodies (pantheon apexes) — each has own wander/flight.
    // Prime also drives wing swarm from its pos. (player hero/twin bodies updated separately below)
    for (let i = 0; i < this.superBodies.length; i++) {
      this.superBodies[i]!.update(t, dt);
    }
    // V47: the wingman swarm orbits + assists the prime each frame; one InstancedMesh draws all 100.
    this.superBody.worldPosition(this.sv1);
    this.wingSwarm.update(
      this.sv1.x,
      this.sv1.y,
      this.sv1.z,
      this.superMindSnap?.emotion.dominance ?? 0.5,
      this.superMindSnap?.quantum ?? this.emptyQ,
      t,
      dt,
    );
    this.wingRender.sync(this.wingSwarm.positions, t, 0.4 + 0.6 * this.wingSwarm.assist);
    for (const hb of this.heroBodies) hb.body.update(t, dt); // V34/35: revealed hero/twin bodies
    this.cosmicWeb.update(
      t,
      this.entities.list.length / this.quality.maxEntities,
      this.state.chaos / CHAOS_MAX,
      (this.state.entropy ?? 0) / ENTROPY_MAX,
    ); // V110: the far-field void now READS + reflects the dome's vitality (item 15 — purpose)
    this.goldLattice.update(t); // V11: floating gold architecture tumble (additive, no rng)
    this.floatingMonoliths.update(t, this.state.chaos / CHAOS_MAX); // drifting megaliths kindle with chaos
    this.godColossus.update(
      t,
      this.state.chaos / CHAOS_MAX,
      (this.state.entropy ?? 0) / ENTROPY_MAX,
    ); // the god monument blazes + writhes with chaos/entropy
    this.quantumLattice.update(t); // V11: neon sacred-geometry shells (additive, no rng)
    this.abominationArchitecture.setReactivity(
      s.chaos / CHAOS_MAX,
      (s.entropy ?? 0) / ENTROPY_MAX,
      this.entities.list.length / this.quality.maxEntities,
    );
    this.abominationArchitecture.update(t);
    // V-MECHA / V-ABC: chaos + apex-brain vitality/transcendence drive the visual intensity (read-only).
    const baseChaos = this.state.chaos / CHAOS_MAX;
    const apex = this.lastApexThought;
    const visChaos = apex
      ? clamp(
          baseChaos + apex.transcendence * 0.42 + apex.vitality * 0.28 - apex.agony * 0.12,
          0,
          1,
        )
      : baseChaos;
    this.mechalogodrom.setChaos(baseChaos);
    this.mechalogodrom.setTimeScale(s.timeScale);
    if (apex) this.mechalogodrom.setApex(apex.transcendence, apex.vitality, apex.agony);
    const mechaSnapPre = this.mechalogodrom.snapshot();
    this.lastMechaBrainSnap = this.mechalogodromBrain.tick({
      fusion: mechaSnapPre.fusion,
      dimension: mechaSnapPre.dimension,
      power: mechaSnapPre.power,
      chaos: baseChaos,
      warp: mechaSnapPre.warp,
      apexVitality: apex?.vitality ?? 0,
      apexTranscendence: apex?.transcendence ?? 0,
      apexAgony: apex?.agony ?? 0,
    });
    const mechaBrainSnap = this.lastMechaBrainSnap;
    const mechaFormIdx = ((this.persisted.seed ^ 0x8e4ac471) >>> 3) % 25;
    const glyphFormIdx = (this.persisted.seed >>> 3) % 25;
    this.mechalogodrom.setExteriorMind(mechaBrainSnap.beat, mechaBrainSnap.activity);
    this.mechalogodrom.setTsotchkePulse(
      corpusPulse(this.persisted.seed ^ 0x8e4ac471, mechaFormIdx),
    );
    this.mechalogodrom.update(t, dt);
    // V-ABC: the 100 alphabet archetypes bob/spin/pulse across the dome (chaos quickens them).
    this.alphabetPantheon.setChaos(visChaos);
    this.alphabetPantheon.setTsotchkePulse(corpusPulse(this.persisted.seed, glyphFormIdx));
    if (apex) this.alphabetPantheon.setApexExterior(apex.transcendence, apex.vitality);
    // V-GLYPH: tick the 100 × 25k-parameter brains every frame (visual-only; drives appearance + travel).
    {
      const percept = this.glyphPercept;
      percept[0] = visChaos; // threat
      percept[1] = clamp(s.mutations / 1000, 0, 1); // energy (mutation pressure)
      percept[2] = s.chaos; // chaos
      percept[3] = s.entropy ?? 0; // novelty (entropy as novelty proxy)
      percept[4] = s.temperature; // level (temperature as arousal)
      const weatherHue = s.weatherIdx / Math.max(1, WEATHERS.length - 1);
      const windEnergy = clamp(Math.hypot(s.wind.x, s.wind.z) / 24, 0, 1);
      const thermal = clamp((s.temperature + 20) / 80, 0, 1);
      const qEntropy = clamp(this.qc.entropy, 0, 1);
      const rdPulse = clamp(this.rdEnergy, 0, 1);
      percept[5] = (weatherHue * 0.5 + qEntropy * 0.24 + rdPulse * 0.18 + bands.treble * 0.08) % 1;
      percept[6] = clamp(
        0.32 + visChaos * 0.22 + windEnergy * 0.18 + bands.mid * 0.18 + rdPulse * 0.1,
        0,
        1,
      );
      percept[7] = clamp(
        0.28 + qEntropy * 0.2 + bands.level * 0.2 + thermal * 0.16 + (apex?.vitality ?? 0) * 0.16,
        0,
        1,
      );
      this.lastGlyphSnaps = this.glyphBrains.thinkAll(percept);
      const snaps = this.lastGlyphSnaps;
      const act = this.glyphActivity;
      const nov = this.glyphNovelty;
      const val = this.glyphValence;
      for (let i = 0; i < snaps.length; i++) {
        const sn = snaps[i]!;
        act[i] = sn.activity;
        nov[i] = sn.novelty;
        val[i] = sn.valence;
      }
      this.alphabetPantheon.setBrainActivity(act, nov, val);
      this.alphabetPantheon.setBrainMotors(snaps);
    }
    this.alphabetPantheon.update(t, dt); // V110: Pantheon obeys pause + time scale through scaled dt
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

    // F-BRAIN V42: one cohort of organism brains perceives + steers itself BEFORE the integrator folds
    // velocity into position. Round-robin → bounded cost at 50k; own rng → the golden is unchanged.
    this.entityBrains.think(this.entities.list, this.state.chaos, t);
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
    // V57: keep NHIs roaming OMNIDIRECTIONALLY + inside the dome (was a one-way climb to the sky) — a
    // 1/10-scale echo of the super creature's flight. Deterministic (sin of the clock + the NHI id, no
    // rng) and a no-op until an NHI is launched, so the seeded golden is untouched.
    if (this.nhiEntities.size > 0) this.steerNhiBeings(t);

    const n = this.entities.list.length;
    // Connectome rebuild cadence by live population. Legacy ladder 1/2/3 at ≤400/≤700/>700
    // is preserved exactly through the desktop tier; the ultra-class rungs (/4 above 2,000,
    // /6 above 5,000) keep the O(n·k) link rebuild + GPU upload off the 10k cost wall. The
    // connectome draws no rng, so cadence changes are determinism-neutral (GraphMind, which
    // does draw rng, runs on its own 240/600f cadence over whatever pairs exist). V3.6.
    const cadence = n > 20000 ? 12 : n > 5000 ? 6 : n > 2000 ? 4 : n > 700 ? 3 : n > 400 ? 2 : 1; // V38 mega rung
    if (s.frame % cadence === 0) this.connectome.update(dt, t);

    // 5 SUPER CREATURES (pantheon): driveSuper builds per-pos percepts, calls think+set on all 5.
    // Guarded; own sub-streams → main golden untouched. Bodies already animated above.
    if (s.frame % 4 === 0) this.driveSuper(bands.bass, bands.level, t, n);

    // ── V2 cadences (ARCHITECTURE-2026-06-26.md frame pipeline) ──
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
    const gmScale = n > 20000 ? 4 : n > 2500 ? 2 : 1; // V38 mega rung
    if (s.frame % (240 * gmScale) === 0) this.graphMind.updateCommunities();
    // Offset 300 provably never collides with the communities cadence above.
    if (s.frame % (600 * gmScale) === 300) this.graphMind.updateRank();

    this.constellations.update(t, bands);
    // ── BRUTALISM: smooth the toggle into a 0..1 factor and crossfade the WHOLE cosmos to raw poured
    //    concrete — apex bodies, every organism, the ground + light rig, the sky dome, and the fog. The
    //    factor is computed HERE, BEFORE atmosphere.update, so the sky dome re-bakes with THIS frame's
    //    factor (not last frame's) and stays frame-coherent with the bodies/ground/organisms/fog. The
    //    ease is snapped to its exact 0/1 target so OFF is byte-identical (full restore). No alloc. ──
    const bTarget = s.brutalism ? 1 : 0;
    // Ease on the UNSCALED frame delta: BRUTALISM is a visual/UI toggle, so it must crossfade even
    // while the sim is PAUSED (timeScale === 0) — otherwise pressing B / ▦ on a paused scene flips the
    // state + audit text but the concrete never appears until you unpause.
    this.brutalismFactor += (bTarget - this.brutalismFactor) * Math.min(1, uiDt * 2.5);
    if (!s.brutalism && this.brutalismFactor < 0.02) this.brutalismFactor = 0;
    else if (s.brutalism && this.brutalismFactor > 0.98) this.brutalismFactor = 1;
    const bf = this.brutalismFactor;
    this.atmosphere.setBrutalism(bf);
    // Alien sky + air: dome recolors with weather/chaos, haze advects with wind
    // and breathes with bass, aurora brightens with quantum entropy (V4.1).
    this.atmosphere.update(dt, t, bands, this.qc.entropy);
    // Holographic 3D analytics panel reads the LIVE reused snapshot views
    // (phylumCounts/titanLedger/warMatrix), always current; internally cadenced.
    this.viz3d.update(this.viz3dSnap);
    this.environment.update(dt, t);
    this.alienFlora.update(dt, t, this.state.chaos / CHAOS_MAX); // flora leans + luminesces with chaos
    // Crossfade the rest of the cosmos — apex bodies, instanced/per-mesh organisms, ground + light rig
    // (AFTER environment.update, so it rides this frame's animated rig).
    const brutalStyle = this.brutalStyleIdx < 0 ? 0 : this.brutalStyleIdx;
    for (let i = 0; i < this.superBodies.length; i++) {
      this.superBodies[i]!.setBrutalStyle(brutalStyle);
      this.superBodies[i]!.setBrutalism(bf);
    }
    // Unlocked superhero avatar + forked twins are SuperBodySystems too — desaturate them with the five
    // Archons, else BRUTALISM turns the world + Archons concrete while the player creature/twins keep
    // the god-jewel skin. No-op until any hero body is revealed (the array is empty).
    for (let i = 0; i < this.heroBodies.length; i++) {
      this.heroBodies[i]!.body.setBrutalStyle(brutalStyle);
      this.heroBodies[i]!.body.setBrutalism(bf);
    }
    this.environment.applyBrutalism(bf);
    if (this.instanced) this.instanced.setBrutalism(bf);
    else this.entities.applyBrutalism(bf); // phone tier: organisms are real meshes → desaturate them too
    if (bf > 0) {
      const fog = this.engine.scene.fog;
      if (fog instanceof THREE.FogExp2) {
        fog.color.lerp(BRUTAL_FOG, bf); // weather reset the colour this frame ⇒ no compounding
        fog.density += (BRUTAL_FOG_DENSITY - fog.density) * bf;
      }
    }
    this.artifacts.update(dt, t); // F-ARTIFACTS (V9): animate + fade the relic pool (visual-only)
    this.monolithTemple.setEnvironment({
      chaos: s.chaos / CHAOS_MAX,
      entropy: (s.entropy ?? 0) / ENTROPY_MAX,
      population: n,
      capacity: this.quality.maxEntities,
    });
    this.monolithTemple.update(dt, t); // V63: rise + shimmer the ascension portal (no-op until revealed)

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
      // F-SUPER V31 + GOAL5: feed the ⬢ ARCHITECT panel the apex (prime of 5) + live wallet + all 5 for first-class UI.
      const primeSnap = this.superCreatures[0]?.snapshot() ?? this.superCreature.snapshot();
      const archonInfos: Array<{ archetype: string; plan: string }> = [];
      for (let i = 0; i < 5; i++) {
        const s = this.superCreatures[i]?.snapshot();
        archonInfos.push({ archetype: GODFORMS[i] ?? 'ARCHON', plan: s?.plan ?? 'REST' });
      }
      const soupSnap = this.primordialSoup.snapshot();
      let petriBiomass = 0;
      let petriPhi = 0;
      let petriAliveness = 0;
      const dishN = Math.max(1, this.petriDishes.length);
      for (const d of this.petriDishes) {
        const v = petriDishView(d);
        petriBiomass += v.biomass;
        petriPhi += v.phiSurrogate;
        petriAliveness += v.aliveness;
      }
      petriBiomass /= dishN;
      petriPhi /= dishN;
      petriAliveness /= dishN;
      const ec0 = this.superMindSnap?.eshkolConsciousness;
      const ulgRes = ulgCorpusResonance(ec0?.workspace ?? 0.5, ec0?.logic ?? 0.5, petriAliveness);
      this.superPanel.update(
        primeSnap,
        this.economy.wealthOf(World.ECON_SUPER_BASE)?.netWorth ?? 0,
        this.superMindSnap, // V46: the live 10k-param consciousness (dream/hallucinate/reason/self-aware)
        this.superEvo.view(), // V48: the evolution — level / stage / power / day
        archonInfos,
        {
          soupLive: soupSnap.liveCount,
          soupCatalysis: soupSnap.catalysis,
          petriBiomass,
          petriPhi,
          petriAliveness,
          wiringFraction: tsotchkeSimWiringFraction(),
          ulgResonance: ulgRes,
        },
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
      // V108: push live brain snapshots to the right-column mini visualizers.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cqm:brain-snapshots', {
            detail: {
              apex: this.apexBrain.snapshot(),
              mecha: this.lastMechaBrainSnap,
              glyphs: this.lastGlyphSnaps,
            },
          }),
        );
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

    // V60: aim the gravitational-lens post-FX at the active singularity (identity when none).
    this.updateLens();
    this.engine.render();
  }

  /**
   * V60: project the active singularity's world centre to screen UV and feed the post-FX lens pass
   * its position + signed strength (0 ⇒ identity passthrough). Allocation-free — two module-owned
   * scratch vectors, one camera projection. No-op cost when post-FX is off (Engine.setLens is a
   * guarded forward). O(1).
   */
  private updateLens(): void {
    // N(2) BREAK FREE — transdimensional screen warp even without an active singularity.
    if (this.state.sim === 2) {
      const f = this.state.frame;
      // Multi-frequency wobble: 3 overlapping sine waves for chaotic, non-repeating distortion.
      const wobble =
        Math.sin(f * 0.017) * 0.14 + Math.sin(f * 0.043) * 0.08 + Math.sin(f * 0.091) * 0.05;
      // Chaotic lens center: 3 frequencies create a Lissajous-like drift that never repeats.
      const cx = 0.5 + Math.sin(f * 0.011) * 0.09 + Math.sin(f * 0.037) * 0.04;
      const cy = 0.5 + Math.cos(f * 0.013) * 0.07 + Math.cos(f * 0.053) * 0.03;
      // Periodic "dimensional tear" — every ~900 frames a sudden reverse-warp surprise.
      const tearPhase = (f % 900) / 900;
      const tear = tearPhase < 0.05 ? Math.sin(tearPhase * 62.8) * 0.3 : 0;
      const singStrength = this.singularities.lensStrength;
      if (singStrength !== 0 && this.singularities.lensCenter(this.lensWorld)) {
        this.lensNdc.copy(this.lensWorld).project(this.engine.camera);
        if (this.lensNdc.z <= 1) {
          const boost = 1.45 + wobble + tear;
          this.engine.setLens(
            this.lensNdc.x * 0.5 + 0.5,
            this.lensNdc.y * 0.5 + 0.5,
            singStrength * boost,
            0.58 + Math.sin(f * 0.02) * 0.06,
          );
          return;
        }
      }
      // Stronger base warp + wider radius for the "transdimensional" feel.
      this.engine.setLens(cx, cy, -0.28 + wobble + tear, 0.72 + Math.sin(f * 0.02) * 0.08);
      return;
    }
    const strength = this.singularities.lensStrength;
    if (strength === 0 || !this.singularities.lensCenter(this.lensWorld)) {
      this.engine.setLens(0.5, 0.5, 0, 0.5);
      return;
    }
    this.lensNdc.copy(this.lensWorld).project(this.engine.camera);
    // Behind the camera (z > 1 in NDC) ⇒ no lens this frame.
    if (this.lensNdc.z > 1) {
      this.engine.setLens(0.5, 0.5, 0, 0.5);
      return;
    }
    this.engine.setLens(this.lensNdc.x * 0.5 + 0.5, this.lensNdc.y * 0.5 + 0.5, strength, 0.5);
  }

  /**
   * V48: restore the prime's EVOLUTION from localStorage + apply the real wall-clock days elapsed since
   * the last save — the "daemon-cron / updates every 24h", so the monster grows even while you are away.
   * Browser-only + fully guarded; this META-organ lives OUTSIDE the deterministic sim (it touches only
   * the super creature's power/look, never the population golden), so the `Date.now` use is contained.
   */
  private loadEvolution(): SuperEvolution {
    // V105: every browser reload resets super-creature evolution — fresh start, no carryover.
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('cqm:superevo:v1');
    } catch {
      /* storage unavailable */
    }
    return new SuperEvolution();
  }

  /** V105: evolution is session-only — no cross-reload persistence. */
  private saveEvolution(): void {
    /* intentionally empty */
  }

  /**
   * F-SUPER V31 + GOAL5: apex beat for the 5 SUPER CREATURES (pantheon apexes).
   * ============================================================================
   * NOT SENTIENT / PHENOMENALLY CONSCIOUS (strengthened header per task).
   * Contract: models/scaffolding/functional correlates only; phenomenal consciousness ~1/10;
   * hard problem untouched. All cognition (deep math proxies, argmax plans, consciousness scalars)
   * are deterministic numeric constructs. No sentience language or claim allowed.
   * ============================================================================
   * Builds per-creature {@link SuperPercept} using each body's position for local crowding/threat
   * (via grid query on entities); economy uses per-purse wealth; light/sound enhanced with
   * archetype/pos bias. All 5 driven, all 5 bodies set. Deterministic (child seeds only).
   */
  private driveSuper(bass: number, level: number, t: number, n: number): void {
    try {
      const s = this.state;
      // The pantheon is already beaten once per frame in update(); read its current snapshot here
      // (driveSuper runs on a frame % 4 cadence) so the stigmergic field is not double-stepped.
      const pantheonSnap = this.pantheon.snapshot();
      const collective = this.superCollective;
      this.pantheon.collectiveBias(0, collective);
      const econ = this.economy.summary();
      const mean = econ.agents > 0 ? econ.totalWealth / econ.agents : 1;
      const target = Math.max(1, this.quality.targetEntities);
      // NHSI · 144 faculties + 25 ToM organs read the shared world field each apex beat.
      const fi = this.nhsiFacultyIn;
      fi[0] = clamp(s.chaos / CHAOS_MAX, 0, 1);
      fi[1] = clamp(n / target, 0, 1);
      fi[2] = clamp(pantheonSnap.field.energy, 0, 1);
      fi[3] = clamp(collective[0] ?? 0, 0, 1);
      fi[4] = clamp(collective[1] ?? 0, 0, 1);
      fi[5] = clamp(collective[2] ?? 0, 0, 1);
      fi[6] = clamp(collective[3] ?? 0, 0, 1);
      fi[7] = clamp(this.nhi.count / 8, 0, 1);
      fi[8] = clamp(this.titans.count / 10, 0, 1);
      fi[9] = clamp(level, 0, 1);
      fi[10] = clamp(bass, 0, 1);
      fi[11] = clamp(econ.totalWealth / Math.max(1, econ.agents * 4), 0, 1);
      fi[12] = clamp(pantheonSnap.field.coherence, 0, 1);
      fi[13] = clamp((t / 60) % 1, 0, 1);
      fi[14] = clamp(this.rdEnergy, 0, 1);
      fi[15] = clamp(this.connectome.links / Math.max(1, this.connectome.pairCount * 8), 0, 1);
      this.facultiesPantheon.update(fi);
      const tc = this.nhsiTomCues;
      tc[0] = fi[0] ?? 0;
      tc[1] = fi[1] ?? 0;
      tc[2] = fi[7] ?? 0;
      tc[3] = fi[8] ?? 0;
      tc[4] = fi[11] ?? 0;
      tc[5] = fi[2] ?? 0;
      tc[6] = fi[12] ?? 0;
      tc[7] = fi[13] ?? 0;
      this.tomPantheon.observe(tc);
      const facultyBias = this.facultiesPantheon.getAggregateActivation();
      const tomMenace = this.tomPantheon.getAggregateMenace();
      this.symbiosis.step();
      this.mythRitual.step();
      const net0 = this.economy.wealthOf(World.ECON_SUPER_BASE + 0)?.netWorth ?? 0;
      // global fallback percept (used for twins/heroes); 5 get position-localized versions below
      // Pre-allocated scratch (audit fix #2/#3 — no per-call object allocation)
      const basePercept = this.superBasePercept;
      basePercept.energy = clamp(0.5 + 0.5 * (1 - s.chaos / 10) + facultyBias * 0.06, 0, 1);
      basePercept.threat = clamp(s.chaos / 8 + tomMenace * 0.12 + facultyBias * 0.04, 0, 1);
      basePercept.crowding = clamp(n / target, 0, 1);
      basePercept.chaos = clamp(s.chaos / 10, 0, 1);
      basePercept.wealthRel = clamp(net0 / (2 * (mean || 1)), 0, 1);
      basePercept.preyClose = clamp(n / target, 0, 1);
      basePercept.rivalClose = clamp(
        this.nhi.count / 8 + (this.titans.count > 0 ? 0.2 : 0) + tomMenace * 0.1,
        0,
        1,
      );
      basePercept.pull = clamp(s.chaos / 12, 0, 1);
      basePercept.light = clamp(level, 0, 1);
      basePercept.sound = clamp(bass, 0, 1);
      basePercept.phase = (t / 60) % 1;
      // GOAL5: drive EXACTLY 5 SUPER CREATURES (archetypes 0-4) with per-position percepts.
      // local crowding/threat from grid query at body pos; light/sound/chaos biased by godform.ts (exclusive).
      let primeMindOut: SuperMindIntent | null = null; // typed; avoid any per contract
      for (let i = 0; i < 5; i++) {
        const bias = getFullTsotchkeBias(i); // full corpus extension (Eshkol/Moonlab/Quake factors) // ARCHITECT rule: use the facade bias for differentiation
        this.superBodies[i]!.worldPosition(this.sv1);
        const lx = this.sv1.x,
          lz = this.sv1.z;
        const near = this.grid.query(lx, lz, 24);
        const localD = Math.min(1, near.length / 14);
        const net = this.economy.wealthOf(World.ECON_SUPER_BASE + i)?.netWorth ?? 0;
        const wealthRel = clamp(net / (2 * (mean || 1)), 0, 1);
        // 10x: recompute pulse here for det use (Eshkol AD/Moonlab not needed, quake for body/world feedback) Ralph re-audit
        const pulseForArchon = getCorpusPulseForArchon(
          i,
          /* det seed proxy */ (this.persisted.seed ^ (i * 0x9e37)) >>> 0,
        );
        // Ralph loop continue 10x more: compute hybrid ulg/gwt + moonlabMpo (Tsotchke corpus Moonlab)
        const mpoInput = this.superMpoInput;
        mpoInput[0] = pulseForArchon.quakeAliveness ?? 0.5;
        mpoInput[1] = localD;
        const mpoF = moonlabMpoStep(mpoInput, 2);
        // Ralph continue 10x: quakeQgeFactor for more quantum-quake aliveness in world step percepts
        const qgeF = quakeQgeFactor(pulseForArchon.quakeAliveness, 0.15);
        // Wire QGE aliveness proxy for enhanced chaos modulation
        const qgeAlive = qgeAlivenessProxy(pulseForArchon.quakeAliveness ?? 0.5, localD, 1);
        // Wire Moonlab tensor contract for percept coupling
        const tensorPulse = moonlabTensorContract(
          [basePercept.chaos, basePercept.crowding, basePercept.threat ?? 0],
          [localD, this.state.chaos ?? 0, this.state.entropy ?? 0],
          3,
        );
        // Wire QEC decoding proxy for stability in interactions
        const qecStability = qecDecodingProxy(Math.floor(basePercept.chaos * 10), 5);
        // Apply new math to chaos
        const qgeMod = qgeAlive * 0.15 + tensorPulse * 0.1 + qecStability * 0.05;
        // Pre-allocated per-archon percept (audit fix — no per-iteration object allocation)
        const p = this.superArchonPercept;
        p.energy = basePercept.energy;
        p.threat = clamp(basePercept.threat + localD * 0.08 + qgeF * 0.04, 0, 1);
        p.crowding = clamp(
          basePercept.crowding * 0.35 +
            localD * 0.65 +
            Math.abs(mpoF) * 0.03 +
            libirrepSymmetry(2, localD * 5) * 0.01,
          0,
          1,
        );
        p.chaos = clamp(
          (basePercept.chaos + (bias.chaos - 0.5) * 0.12 + qgeMod) *
            quakePerturb(pulseForArchon.quakeAliveness ?? 0.5, i + 9, 0.1) *
            qgeWorldPerturb(pulseForArchon.quakeAliveness ?? 0.5, i + 9) +
            (collective[2] ?? 0) * 0.04,
          0,
          1,
        );
        p.wealthRel = wealthRel;
        p.preyClose = basePercept.preyClose;
        p.rivalClose = basePercept.rivalClose;
        p.pull = clamp(
          basePercept.pull +
            (pulseForArchon.quakeAliveness ?? 0) * 0.08 +
            mpoF * 0.05 +
            qgeF * 0.03 +
            (collective[4] ?? 0) * 0.06,
          0,
          1,
        );
        p.light = clamp(
          basePercept.light + (bias.generative - 0.5) * 0.04 + ((lz * 0.002) % 0.02),
          0,
          1,
        );
        p.sound = clamp(
          basePercept.sound + (bias.narrative - 0.5) * 0.03 + ((lx * 0.0015) % 0.015),
          0,
          1,
        );
        p.phase = basePercept.phase;
        const mindOut = this.superMinds[i]!.think(p);
        this.noosphere.updateArchon(
          i,
          mindOut.consciousness.phi,
          mindOut.consciousness.ignition,
          mindOut.consciousness.workspace,
          mindOut.consciousness.novelty,
          mindOut.consciousness.qualiaTone,
        );
        this.superBodies[i]!.worldPosition(this.sv1);
        this.stigmergy.deposit(
          this.sv1.x / ARENA_MID,
          this.sv1.z / ARENA_MID,
          i % 4,
          0.05 + mindOut.consciousness.ignition * 0.1,
        );
        this.archonMortality[i]!.step();
        this.superCreatures[i]!.think(p);
        const coll = this.nhsiCollectiveScratch;
        coll[0] = mindOut.consciousness.ignition;
        coll[1] = mindOut.consciousness.phi;
        coll[2] = mindOut.consciousness.surprise;
        coll[3] = mindOut.consciousness.novelty;
        coll[4] = mindOut.consciousness.selfAware;
        coll[5] = mindOut.consciousness.workspace;
        coll[6] = clamp(mindOut.curiosity, 0, 1);
        coll[7] = mindOut.consciousness.qualiaTone;
        this.emergenceAngles.aggregateCollective(`archon-${i}`, coll);
        this.pantheon.depositApex(
          i,
          [
            mindOut.consciousness.ignition,
            mindOut.consciousness.phi,
            mindOut.consciousness.surprise,
            mindOut.consciousness.novelty,
            mindOut.consciousness.selfAware,
            mindOut.consciousness.workspace,
            mindOut.consciousness.qualiaTone,
            clamp(mindOut.curiosity, 0, 1),
          ],
          0.35 + mindOut.consciousness.ignition * 0.5,
        );
        // FULL TSOTCHKE: catalyze via update (Eshkol + all repos soup growth)
        this.primordialSoup.update(i, s.frame, this.petriRng);
        const dish = this.petriDishes[i];
        if (dish) petriDishBeat(dish, i, s.frame, this.petriRng);
        this.superBodies[i]!.setMind(this.superCreatures[i]!.snapshot());
        this.superBodies[i]!.setConsciousness(
          mindOut.quantum,
          mindOut.consciousness.dreaming,
          mindOut.consciousness.hallucinating,
        );
        // V1.3 AE-1/HOT-3: the apex SuperMind's chosen move vector now steers the avatar's flight target.
        this.superBodies[i]!.setSuperMindMove(mindOut.move.x, mindOut.move.y, mindOut.move.z);
        if (i === 0) {
          this.superMindSnap = this.superMinds[0]!.snapshot(); // typed, removed any per contract
          primeMindOut = mindOut;
        }
      }
      // V-APEX: tick the Entropic Tesseract Hydra brain (10 organs + quantum + meta-paradox).
      // The apex brain runs on the same driveSuper cadence (frame % 4), reading the world percept
      // and producing a plan + vitality + agony + transcendence. Its output feeds the noosphere
      // and the emergence angles, so the 10-organ brain genuinely influences the world.
      const ap = this.apexPercept;
      ap.threat = basePercept.threat;
      ap.energy = basePercept.energy;
      ap.chaos = basePercept.chaos;
      ap.novelty = clamp(primeMindOut?.consciousness?.novelty ?? 0, 0, 1);
      ap.level = this.superEvo.view().level;
      this.lastApexThought = this.apexBrain.tick(ap);
      this.lastApexGrowth = apexGrowthStage(
        ap.level,
        this.lastApexThought.transcendence,
        this.apexBrain.snapshot().beat,
      );
      // V-FND: tick Foundationals — deep interconnect between APEX organs (1B self-awareness path).
      const apexSnap = this.apexBrain.snapshot();
      const fndOrganActivity = this.fndOrganScratch;
      fndOrganActivity[0] = clamp(apexSnap.loom.throughput, 0, 1);
      fndOrganActivity[1] = clamp(apexSnap.drum.energy, 0, 1);
      fndOrganActivity[2] = apexSnap.necro.liveFraction;
      fndOrganActivity[3] = clamp(apexSnap.klein.energy, 0, 1);
      fndOrganActivity[4] = clamp(apexSnap.hive.order, 0, 1);
      fndOrganActivity[5] = clamp(apexSnap.hydra.coherence, 0, 1);
      fndOrganActivity[6] = clamp(Math.abs(apexSnap.wraith.core), 0, 1);
      fndOrganActivity[7] = clamp(apexSnap.tunnel.manifested / 100, 0, 1);
      fndOrganActivity[8] = clamp(apexSnap.thermo.totalHeat, 0, 1);
      fndOrganActivity[9] = clamp(apexSnap.ouroboros.births / 100, 0, 1);
      this.lastFoundationals = this.foundationals.tickAndStore(
        fndOrganActivity,
        this.lastApexThought.transcendence,
        this.lastApexThought.agony,
        ap.level,
        this.lastApexGrowth.designedParams,
        0.016,
      );
      // Feed the apex brain's transcendence into the noosphere (the 10-organ mind's output joins the collective).
      this.noosphere.updateArchon(
        0, // prime channel
        this.lastApexThought.vitality,
        this.lastApexThought.agony,
        this.lastApexThought.superposed ? 0.3 : 0.6,
        this.lastApexThought.transcendence,
        clamp(this.lastApexThought.vitality * 0.5, 0, 1),
      );
      this.noosphere.step();
      this.stigmergy.step();
      const nooSnap = this.noosphere.snapshot();
      if (nooSnap.collectiveInsight) {
        s.chaos = Math.min(CHAOS_MAX, s.chaos + 0.08);
      }
      // Light Archons (5–24): deposit pantheon field into emergence angles 8–10 each apex beat.
      for (let a = 5; a < ARCHON_CHANNELS; a++) {
        this.pantheon.field.sample(a, this.nhsiCollectiveScratch);
        this.emergenceAngles.aggregateCollective(`archon-${a}`, this.nhsiCollectiveScratch);
      }

      if (s.frame % 120 === 0) {
        if (s.frame % 480 === 0) {
          for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
              this.symbiosis.formRelationship(i, j);
            }
          }
        }
        const primeSnap = this.superMinds[0]!.snapshot();
        const rot = s.frame % ARCHON_CHANNELS;
        void this.emergenceAngles.evolveEshkolProgram(
          `archon-${rot}`,
          primeSnap.consciousness.phi,
          fi,
        );
        this.emergenceAngles.recombineStrains(
          `archon-${rot}`,
          `archon-${(rot + 1) % ARCHON_CHANNELS}`,
        );
        const em = this.emergenceAngles.getAggregateEmergence();
        const chaos = s.chaos ?? 0.5;
        for (let a = 0; a < ARCHON_CHANNELS; a++) {
          let pwr = 0;
          let spinO = 0.4;
          let qgtC = 0.3;
          let esh = 0.4;
          if (a < this.superMinds.length) {
            const snap = this.superMinds[a]?.snapshot?.() ?? null;
            pwr =
              (snap?.consciousness?.phi ?? 0.3) +
              (snap?.consciousness?.ignition ?? 0.2) +
              ((snap as { chaos?: number })?.chaos ?? 0);
            spinO = (snap as { quantum?: number[] })?.quantum?.[0] ?? 0.4;
            qgtC = (snap as { qgt?: number })?.qgt ?? 0.3;
            esh =
              (snap as { eshkolConsciousness?: { ignition?: number } })?.eshkolConsciousness
                ?.ignition ?? 0.4;
          } else {
            this.pantheon.field.sample(a, this.nhsiCollectiveScratch);
            const c = this.nhsiCollectiveScratch;
            pwr =
              ((c[0] ?? 0) + (c[1] ?? 0) + (c[2] ?? 0) + (c[3] ?? 0)) * 0.25 + (c[4] ?? 0) * 0.5;
            spinO = c[2] ?? 0.4;
            qgtC = c[3] ?? 0.3;
            esh = c[0] ?? 0.4;
          }
          if (pwr > 0.55 || em > 0.5 || chaos > 3.5) {
            const brutal = this.emergenceAngles.triggerBrutalGodEvent(a, em, pwr, s.frame + a * 13);
            const pd = this.petriDishes[a % this.petriDishes.length];
            if (pd) {
              applyBrutalGodEvent(
                pd,
                brutal.event,
                brutal.powerDelta,
                brutal.brutality,
                this.petriRng,
              );
              const release = triggerBrutalRelease(
                a,
                chaos,
                spinO,
                qgtC,
                esh,
                this.superRng,
                s.frame + a,
              );
              if (release) {
                const ents = pd.biologics as Array<{
                  vitality: number;
                  form: string;
                  brutalGodPower?: number;
                }>;
                for (const b of ents) {
                  if (b.vitality === undefined) b.vitality = 1;
                  if (b.form === undefined) b.form = 'BASE';
                }
                const outcome = applyBrutalRelease(release, ents, pd.aliveness, s.frame + a);
                pd.godPower = Math.min(
                  1,
                  (pd.godPower || 0) + release.power * 0.1 + outcome.warp * 0.02,
                );
                this.audit.record('brutal-god-release', {
                  archon: a,
                  archetype: release.archetype,
                  power: release.power,
                  lore: getBrutalLore(release.archetype),
                });
              }
            }
            this.audit.record('brutal-god-event', {
              archon: a,
              event: brutal.event,
              power: brutal.powerDelta,
              brutality: brutal.brutality,
            });
          }
        }
      }

      // FULL TSOTCHKE growth: incubate/harvest via update + snapshot (all repos in Petri for new biologics)
      this.primordialSoup.update(0, s.frame, this.petriRng);
      // V-BREED: pantheon breeding rite (disabled V105 — visual dome only, no petri coupling).
      if (PANTHEON_BREEDING_LIVE && s.frame % 600 === 0 && s.frame > 0) {
        const i = (this.breedNonce * 7 + 3) % PANTHEON_TOTAL;
        let j = (this.breedNonce * 13 + 17) % PANTHEON_TOTAL;
        if (j === i) j = (j + 1) % PANTHEON_TOTAL; // avoid self-fertilization (i===j at nonce=65)
        this.lastBaby = breedAt(i, j, this.breedNonce);
        this.breedNonce++;
        const dish = this.petriDishes[i % this.petriDishes.length];
        if (dish) {
          // The child's Lyapunov exponent (chaos) + umbral degree drive petri dish growth.
          const boost = clamp(
            this.lastBaby.chaos.lyapunov * 0.1 + this.lastBaby.umbral.degree * 0.02,
            0,
            0.3,
          );
          dish.godPower = Math.min(1, (dish.godPower || 0) + boost);
        }
        this.audit.record('pantheon-breeding', {
          nonce: this.breedNonce - 1,
          parents: `${i}×${j}`,
          lyapunov: this.lastBaby.chaos.lyapunov,
          winding: this.lastBaby.homotopy.winding,
          umbralDegree: this.lastBaby.umbral.degree,
          blaschkeDegree: this.lastBaby.blaschke.degree,
        });
      }
      // V-SELFEVO: initialize + step the self-evolution loop (Gödel-machine style self-improvement).
      // Runs every 1200 frames (~20s at 60fps) on its own deterministic sub-stream (evoRng2).
      // Metrics are built from the prime super mind's consciousness + the world's chaos + diversity.
      if (!this.selfEvoLoop) {
        const initMetrics: EvolutionMetrics = {
          fitness: clamp(this.superMindSnap?.emotion?.dominance ?? 0.5, 0, 1),
          emergence: clamp(n / target, 0, 1),
          complexity: this.apexBrain.parameterCount(),
          consciousness: clamp(this.superMindSnap?.consciousness?.phi ?? 0, 0, 1),
          stability: clamp(1 - s.chaos / CHAOS_MAX, 0, 1),
        };
        this.selfEvoLoop = new SelfEvolutionLoop(initMetrics);
      }
      if (s.frame % 1200 === 0 && s.frame > 0) {
        this.selfEvoLoop.ingestLive({
          fitness: clamp(this.superMindSnap?.emotion?.dominance ?? 0.5, 0, 1),
          emergence: clamp(n / target, 0, 1),
          complexity: this.apexBrain.parameterCount(),
          consciousness: clamp(this.superMindSnap?.consciousness?.phi ?? 0, 0, 1),
          stability: clamp(1 - s.chaos / CHAOS_MAX, 0, 1),
        });
        // Feed metrics into the loop + step (the loop mutates its own metrics via safe self-modification)
        const applied = this.selfEvoLoop.step(this.evoRng2);
        if (applied) {
          this.audit.record('self-evolution', {
            generation: this.selfEvoLoop.generationCount,
            score: this.selfEvoLoop.score,
          });
        }
      }
      // V-BEDAU: compute Bedau-Packard evolutionary activity from morphotype diversity snapshots.
      // Every 300 frames (~5s), sample shannonDiversity of the live morphotype distribution,
      // feed it into the activity window, and surface the result for telemetry.
      if (s.frame % 300 === 0 && s.frame > 0) {
        const morphCounts = Array.from({ length: this.morphTotal }, () => 0);
        const list = this.entities.list;
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e) continue;
          const mi = e.userData.mi ?? 0;
          if (mi >= 0 && mi < this.morphTotal) morphCounts[mi]!++;
        }
        const div = shannonDiversity(morphCounts);
        this.diversitySnapshots.push(div);
        if (this.diversitySnapshots.length > 32) this.diversitySnapshots.shift();
        this.lastBedauActivity = bedauPackardActivity(this.diversitySnapshots, 8);
        this.audit.record('bedau-packard-activity', {
          activity: this.lastBedauActivity,
          diversity: div,
        });
      }
      if (s.frame % 120 === 0 && n < target) {
        const snap = this.primordialSoup.snapshot();
        const strain = snap.strains && snap.strains[0] ? snap.strains[0] : null;
        if (strain) {
          const theta = (strain.id * 2.3999632297) % 6.28318530718;
          const r = (8 + strain.vitality * 6) * ARENA_MID;
          this.sv1.set(
            r * Math.cos(theta),
            ARENA_Y + strain.consciousness * 4,
            r * Math.sin(theta),
          );
          const mi = Math.floor(strain.hue * this.morphTotal) % this.morphTotal;
          this.entities.spawn(this.sv1, mi, 0.4 + strain.vitality * 0.6);
          this.audit.record('primordial-emergent', {
            id: strain.id,
            gen: strain.generation,
            vit: strain.vitality,
          });
        }
      }
      // V48: the apex SELF-EVOLVES (prime only for now; peers have independent but simpler evo hook).
      let petriBoost = 1;
      for (const d of this.petriDishes) petriBoost *= petriGrowthMultiplier(d);
      petriBoost = Math.pow(petriBoost, 1 / Math.max(1, this.petriDishes.length));
      const vitality = clamp(
        (0.5 * (this.superMindSnap?.emotion.dominance ?? 0.5) +
          0.3 * (primeMindOut?.consciousness?.novelty ?? 0) +
          0.2 * this.wingSwarm.assist) *
          petriBoost,
        0,
        1,
      );
      this.superEvo.tick(4 / 60, vitality);
      this.superBody.setEvolution(this.superEvo.appearance());
      // V63: react to a 10-level milestone — a voice + a HUD toast announcing the new godlike power,
      // and at the LV100 apex the full ASCENSION end-state (the MONOLITH TEMPLE rises). Once each.
      const ms = this.superEvo.takeMilestone();
      if (ms > 0) {
        if (ms >= 100) {
          this.ascend();
        } else {
          this.audio.play('burst');
          const last = this.superEvo.view().powers.at(-1) ?? 'a godlike power';
          this.hud.showSector(`EVOLVED · LV ${ms} · +1 GODLIKE POWER: ${last}`);
          this.audit.record('evo-milestone', { level: ms, power: last });
        }
      }
      if (s.frame > 0 && s.frame % World.EVO_DAY_FRAMES === 0) {
        this.superEvo.applyDays(1, this.evoRng); // a sim-day of training
        this.saveEvolution();
      }
      // V35: the twin budget (cap 3) is now spent by the PLAYER — the puzzle reveal sires the 2nd
      // creature and the FORK power sires the rest — so the prime no longer auto-spawns (no contention).
      for (const tw of this.superTwins) tw.think(basePercept); // twins reason with their own minds
      // V34/35: fold each revealed hero/twin mind into its body; tick the player progression layer.
      for (const hb of this.heroBodies) hb.body.setMind(hb.mind.snapshot());
      const hero0 = this.heroBodies[0];
      if (this.superheroState.active && hero0) {
        this.superheroState.tick(
          4 / 60,
          hero0.mind.snapshot().emotion.dominance,
          basePercept.threat,
        );
      }
    } catch (e) {
      void e;
      /* an apex beat misbehaved — skip it, keep the world running */
    }
  }

  /**
   * F-SUPER V34/35: ACCESS GRANTED — the cryptographic puzzle was solved, so release the SECOND super
   * creature AND enter SUPERHERO mode: the player BECOMES that creature. Sire a mutated twin (its own
   * deep mind + apex purse + masterful body apart from the prime), activate the progression state + the
   * player HUD. Idempotent. Draws from the SUPER sub-stream, so the main determinism golden is untouched.
   */
  /**
   * V63: THE ASCENSION — the apex hit LEVEL 100 (the SS3/Neo end-state). Raise the MEGALITHIC
   * MONOLITH TEMPLE (the GAME STAGE 2 portal to the "Eshkol Tsotchke" second world, built later),
   * sound the deep voice, toast the HUD, audit it, and fire a `cqm:ascension` event for any Stage-2
   * listener. Idempotent (guarded by {@link superAscended}); the temple itself is visual-only, so this
   * never perturbs the deterministic population golden. The 2nd-world build is a future stage.
   */
  private ascend(): void {
    if (this.superAscended) return;
    this.superAscended = true;
    this.monolithTemple.reveal(0, 0, -40 * ARENA_MID);
    this.audio.playId(SFX_SUBBOOM);
    this.audio.playExtra('demonic'); // V109: ominous temple-rise underlayer
    this.hud.showSector('⚡ ASCENSION — STAGE 2 · THE MONOLITH TEMPLE RISES');
    this.audit.record('ascension', { level: 100, stage: 2 });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cqm:ascension', { detail: { stage: 2 } }));
    }
  }

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
    // keep player hero/twin paths; pantheon 5 occupy ECON_SUPER_BASE+0..4 so +5 for heroes
    const econId = World.ECON_SUPER_BASE + 5 + this.superTwins.length;
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
    this.persisted.renderIdx = RENDER_MODES.indexOf(mode);
    this.save();
    this.entities.setRenderMode(mode);
    this.hud.showSector('VISION · ' + mode.toUpperCase());
  }

  /** V41: CAMERA — cycle orbit → 3rd-person → 1st-person (the follow rigs in {@link updateHeroCamera}). */
  private heroCycleCam(): void {
    const m = this.superheroState.cycleCam();
    const label = m === 'orbit' ? 'ORBIT (free)' : m === 'third' ? '3RD-PERSON' : '1ST-PERSON';
    this.hud.showSector('CAM · ' + label);
  }

  /** V41: PILOT — cycle autopilot → assist → manual control of the avatar. */
  private heroCycleControl(): void {
    const m = this.superheroState.cycleControl();
    this.hud.showSector('PILOT · ' + m.toUpperCase());
  }

  /** When the super creature owns WASD/arrows (assist/manual), free-cam must not steal them. */
  private heroOwnsKeyboardNav(): boolean {
    return this.superheroState.active && this.superheroState.controlMode !== 'autopilot';
  }

  /**
   * V41: route the player's navigation — keyboard (WASD/QE + arrows) and the on-screen D-pad / touch —
   * into the avatar's flight as a CAMERA-RELATIVE steer. AUTOPILOT ignores it (the mind flies itself);
   * ASSIST nudges the autonomous heading; MANUAL flies it outright. No-op until the avatar is active.
   */
  private updateHeroControl(): void {
    const hero = this.heroBodies[0];
    if (!this.superheroState.active || !hero) return;
    const mode = this.superheroState.controlMode;
    if (mode === 'autopilot') {
      hero.body.setControl(0, 0, 0, 0, false);
      return;
    }
    const k = this.input.keys;
    let fwd = 0;
    let strafe = 0;
    let lift = 0;
    if (k['w'] || k['arrowup']) fwd += 1;
    if (k['s'] || k['arrowdown']) fwd -= 1;
    if (k['d'] || k['arrowright']) strafe += 1;
    if (k['a'] || k['arrowleft']) strafe -= 1;
    if (k['q']) lift += 1;
    if (k['e']) lift -= 1;
    fwd += this.heroPad.z;
    strafe += this.heroPad.x;
    lift += this.heroPad.y;
    const active = fwd !== 0 || strafe !== 0 || lift !== 0;
    // camera-relative horizontal basis: forward = where you look, right = forward × up.
    const f = this.engine.camera.getWorldDirection(this.heroF);
    f.y = 0;
    if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
    f.normalize();
    const r = this.heroR.set(-f.z, 0, f.x);
    this.heroIntent.set(0, 0, 0).addScaledVector(f, fwd).addScaledVector(r, strafe);
    this.heroIntent.y += lift;
    hero.body.setControl(
      mode === 'manual' ? 2 : 1,
      this.heroIntent.x,
      this.heroIntent.y,
      this.heroIntent.z,
      active,
    );
  }

  /**
   * V41: the chase / first-person camera. `third` trails behind + above the avatar looking at it;
   * `first` sits at the creature's leading face looking along its heading; `orbit` leaves the normal
   * camera untouched. Runs AFTER updateCamera so it overrides the free-cam each frame while engaged.
   */
  private updateHeroCamera(): void {
    const hero = this.heroBodies[0];
    if (!this.superheroState.active || !hero) return;
    const cm = this.superheroState.camMode;
    if (cm === 'orbit') return;
    const cam = this.engine.camera;
    const p = hero.body.worldPosition(this.sv1);
    const h = hero.body.heading(this.sv2);
    if (cm === 'first') {
      cam.position.copy(p).addScaledVector(h, 6.5); // at the leading face of the core
      cam.position.y += 2;
      cam.lookAt(this.heroIntent.copy(p).addScaledVector(h, 30));
    } else {
      cam.position.copy(p).addScaledVector(h, -28); // trail behind
      cam.position.y += 13;
      cam.lookAt(p);
    }
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
      const heroNav = this.heroOwnsKeyboardNav();
      if (!heroNav) {
        if (k['w'] || k['arrowup']) cam.translateZ(-spd);
        if (k['s'] || k['arrowdown']) cam.translateZ(spd);
        if (k['a'] || k['arrowleft']) cam.translateX(-spd);
        if (k['d'] || k['arrowright']) cam.translateX(spd);
        if (k['q']) cam.position.y += spd;
        if (k['e']) cam.position.y -= spd;
        if (k['c']) cam.rotation.y += rs;
        if (k['v']) cam.rotation.y -= rs;
        if (touch.active) {
          cam.translateX(touch.x * spd);
          cam.translateZ(touch.y * spd);
        }
        if (cv.x) cam.translateX(cv.x * spd * 2);
        if (cv.y) cam.position.y += cv.y * spd * 2;
        if (cv.z) cam.translateZ(cv.z * spd * 2);
      }
      if (k['z']) cam.rotation.z += rs;
      if (k['x']) cam.rotation.z -= rs;
      if (k['r']) cam.rotation.x += rs;
      if (k['f']) cam.rotation.x -= rs;
      if (!heroNav) {
        if (cv.rx) cam.rotation.x += cv.rx * rs;
        if (cv.ry) cam.rotation.y += cv.ry * rs;
        if (cv.rz) cam.rotation.z += cv.rz * rs;
      }
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
    // V62 CHAOS MODE: tap K to engage/disengage the Lorenz quantum storm. Throttled like the taps.
    if (k['k'] && s.frame % 30 === 0) this.toggleChaosMode();
    // BRUTALISM: tap B to crossfade the Super Creatures to a raw poured-concrete monolith (and back).
    if (k['b'] && s.frame % 30 === 0) this.toggleBrutalism();
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
      mode === 'all'
        ? Math.min(48, Math.max(25, n >> 7))
        : mode === 'auto'
          ? Math.min(120, Math.max(40, n >> 5))
          : Math.min(28, Math.max(6, n >> 8));
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
      ea.material.emissiveIntensity = Math.min(Math.max(ea.material.emissiveIntensity, flash), 3.2);
      eb.material.emissiveIntensity = Math.min(Math.max(eb.material.emissiveIntensity, flash), 3.2);
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
    // V57: audio on/off + reset count (HUD box), sim variant + active singularity (telemetry box).
    sn.musicOn = this.audio.musicOn;
    sn.sfxOn = this.audio.sfxOn;
    sn.resetCount = this.resetCount;
    sn.sim = s.sim;
    const sk = this.singularities.kind;
    sn.singularity = sk ? (SINGULARITY_LABEL[sk] ?? sk.toUpperCase()) : '';
    sn.chaosMode = this.chaosField.active; // V62: storm flag for the chaos row
    sn.tribes = this.graphMind.tribes;
    sn.trend = this.analytics.trendPerMin;
    sn.qEntropy = this.qc.entropy;
    sn.lore = this.constellations.subSectorAt(this.engine.camera.position);
    // V3: phylumCounts/titanLedger/warMatrix are LIVE reused views installed at
    // boot — only the scalar needs refreshing here.
    sn.rdEnergy = this.rdEnergy;
    // Biome sentience index (V4.5; V71 decomposed): the cosmos rating its own aliveness as a blend
    // of three MEASURABLE dimensions, now each exposed for its own observatory dial. The composite
    // formula is byte-identical to before (integration = tribes/256, coherence = qEntropy, momentum =
    // min(|trend|/50,1)), so the golden sentience value is unchanged — we just surface the factors.
    const bioIntegration = clamp(sn.tribes / 256, 0, 1); // community structure → integrated information
    const bioCoherence = clamp(sn.qEntropy, 0, 1); // quantum-register entropy → global coherence
    const bioMomentum = clamp(Math.abs(sn.trend) / 50, 0, 1); // demographic slope → self-maintenance
    sn.bioIntegration = bioIntegration;
    sn.bioCoherence = bioCoherence;
    sn.bioMomentum = bioMomentum;
    sn.sentience = clamp((bioIntegration * (0.5 + bioCoherence) * (0.5 + bioMomentum)) / 1.5, 0, 1);
    sn.godPower =
      this.petriDishes.reduce((acc, p) => acc + (p.godPower ?? 0), 0) /
      Math.max(1, this.petriDishes.length);
    this.hud.setLore(sn.lore); // O(1) no-op when unchanged
    return sn;
  }

  /**
   * F-NHI: launch a user-controlled non-human-intelligence being ~45u in front of the camera — a
   * buoyant, fast, age-immortal, consumption-immune entity that flies and floats through the world
   * with "Matrix" powers. Returns 1 on success, 0 at the population cap. Draws rng (a user event,
   * recorded in the audit so replays reproduce); a never-launched world draws none and is unchanged.
   */
  private launchNhiBeing(x?: number, y?: number, z?: number, source = 'user'): number {
    if (
      typeof x === 'number' &&
      typeof y === 'number' &&
      typeof z === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(z)
    ) {
      this.sv1.set(x, y, z);
    } else {
      const cam = this.engine.camera;
      cam.getWorldDirection(this.sv2);
      this.sv1.copy(cam.position).addScaledVector(this.sv2, 45);
    }
    const mi = Math.floor(this.uiRng() * this.morphTotal);
    const e = this.entities.spawn(this.sv1, mi, 2.2);
    if (!e) return 0;
    const u = e.userData;
    u.isNhi = true;
    u.beh = 'helix'; // ethereal, weaving motion (now OMNIDIRECTIONAL + contained — see steerNhiBeings)
    u.spd *= 2.2; // quick
    // V57: launch in a RANDOM direction (was a fixed +y, which made every NHI climb to the sky).
    u.vel.set((this.uiRng() - 0.5) * 0.4, (this.uiRng() - 0.5) * 0.4, (this.uiRng() - 0.5) * 0.4);
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
    // V109: varied alien vocalization on NHI arrival (round-robin from the alien chitter band).
    this.audio.playExtra('alienchitter');
    this.hud.showSector(
      source === 'titan-procreation'
        ? 'NHI BIRTH · TITAN MATRIX OFFSPRING'
        : 'NHI LAUNCHED · MATRIX BEING',
    );
    this.audit.record('nhi-launch', { mi, source });
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
      crowding: c01(this.entities.list.length / Math.max(1, this.quality.maxEntities)),
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
          p.x + (this.uiRng() - 0.5) * 12,
          p.y + (this.uiRng() - 0.5) * 12,
          p.z + (this.uiRng() - 0.5) * 12,
        );
        const child = this.entities.spawn(
          this.sv1,
          Math.floor(this.uiRng() * this.morphTotal),
          0.8,
        );
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
      // V57: retreat = pull back toward the home field (any direction), NOT ascend forever.
      e.userData.vel.addScaledVector(this.sv1.copy(p).normalize(), -0.06 * intent.magnitude);
    }
  }

  /**
   * V57: omnidirectional roam + dome containment for the launched NHIs — a 1/10-scale echo of the
   * super creature's flight. Each NHI gets a deterministic per-id wander (sin of the clock + its id,
   * no rng) and is steered back inside the arena radius + between the floor and the ceiling, so it
   * never climbs out of sight (the "NHIs float to the sky" bug). Cheap (a handful) and determinism-
   * safe — no rng, no-op until an NHI is launched.
   */
  private steerNhiBeings(t: number): void {
    // V60: drive every launched NHI like a SUPER CREATURE at ~1/10 scale — purposeful, fully
    // omnidirectional motion that stays contained. Each seeks a slowly-orbiting 3D waypoint around a
    // mid-height home (a per-id Lissajous path, so it weaves the whole volume on every axis), is held
    // by a continuous pull toward home height + a radial leash, and is HARD-clamped to the dome so it
    // can NEVER drift off to the sky again. The old fix only nudged velocity once past y>80, so a
    // climber simply hung at the ceiling (the "floating to the sky" the user still saw). The NHI's
    // intelligence (cognition + game theory + the world actions it takes each beat) lives in its mind;
    // this is just its body, now agile and leashed. Pure t/id trig — deterministic, allocation-free.
    const HOME_Y = 24; // comfortable mid-height (ground ≈ 0, camera ≈ 50)
    const LEASH = 130; // soft radial pull begins here (XZ)
    const RMAX2 = 150 * 150; // hard radial cap
    const Y_LO = 6;
    const Y_HI = 56; // hard ceiling — well below the old runaway height
    for (const [id, e] of this.nhiEntities) {
      const v = e.userData.vel;
      const p = e.position;
      // Personal orbiting waypoint — a Lissajous path on all three axes (true omnidirectional roam,
      // each NHI on its own phase/radius so a swarm spreads through the volume instead of clumping).
      const ph = id * 1.7;
      const rad = 45 + (id % 5) * 10;
      const tx = Math.cos(t * 0.19 + ph) * rad;
      const tz = Math.sin(t * 0.23 + ph * 1.3) * rad;
      const ty = HOME_Y + Math.sin(t * 0.31 + ph) * 14;
      // Seek the waypoint with a capped, distance-independent accel (smooth intent-like pursuit).
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dz = tz - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
      v.x += (dx / d) * 0.05;
      v.y += (dy / d) * 0.05;
      v.z += (dz / d) * 0.05;
      // Gentle weave on top so the motion never reads as a straight line.
      v.x += Math.sin(t * 0.7 + id * 1.3) * 0.04;
      v.y += Math.sin(t * 0.53 + id * 2.1) * 0.03;
      v.z += Math.cos(t * 0.61 + id * 0.7) * 0.04;
      // Continuous height restoring force — THIS is the real sky-float fix: an NHI is always pulled
      // back toward home height, so upward drift can never accumulate into a climb to the ceiling.
      v.y += (HOME_Y - p.y) * 0.004;
      // Radial leash (XZ) toward the home column.
      const r2 = p.x * p.x + p.z * p.z;
      if (r2 > LEASH * LEASH) {
        const inv = 0.12 / Math.sqrt(r2);
        v.x -= p.x * inv;
        v.z -= p.z * inv;
      }
      v.multiplyScalar(0.985); // damp so a roamer never accelerates away
      // Hard containment guarantee — even if a behavior pushes a body out, snap it back this frame.
      if (p.y > Y_HI) {
        p.y = Y_HI;
        if (v.y > 0) v.y = 0;
      } else if (p.y < Y_LO) {
        p.y = Y_LO;
        if (v.y < 0) v.y = 0;
      }
      if (r2 > RMAX2) {
        const s = 150 / Math.sqrt(r2);
        p.x *= s;
        p.z *= s;
      }
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
        this.sv1.set((this.uiRng() - 0.5) * 3, (this.uiRng() - 0.5) * 2, (this.uiRng() - 0.5) * 3);
        this.sv2.copy(e.position).add(this.sv1);
        const child = this.entities.spawn(
          this.sv2,
          (e.userData.mi + 1 + Math.floor(this.uiRng() * 10)) % this.morphTotal,
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
        (this.uiRng() - 0.5) * 25 * ARENA_MID,
        this.uiRng() * 14 * ARENA_Y,
        (this.uiRng() - 0.5) * 25 * ARENA_MID,
      );
      this.entities.spawn(this.sv1, Math.floor(this.uiRng() * this.morphTotal), 0.5 + this.uiRng());
    }
  }

  /** Legacy doMutate: remorph the whole population (Known Bug 14 counter). */
  private doMutate(): void {
    this.audio.play('mutate');
    const list = this.entities.list;
    this.state.mutations += list.length;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e) this.entities.remorph(e, Math.floor(this.uiRng() * this.morphTotal));
    }
  }

  /** Legacy apoc: max chaos, scatter everything, triple burst. */
  private apocalypse(): void {
    this.audio.play('burst');
    this.audio.play('warp');
    this.audio.play('resonance');
    this.state.chaos = CHAOS_MAX;
    this.hud.showSector('MASS EXTINCTION EVENT');
    const list = this.entities.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      e.userData.vel.set(
        (this.uiRng() - 0.5) * 3,
        (this.uiRng() - 0.5) * 3,
        (this.uiRng() - 0.5) * 3,
      );
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
      s.chaos = Math.max(s.chaos + 1.5, CHAOS_NIGHTMARE_FLOOR);
      s.mutations += 12;
      this.audio.playId(SFX_STRANGE);
      this.audio.playId(SFX_STRANGE + 7);
      this.audio.playId(SFX_STRANGE + 19);
      this.audio.playId(SFX_DEMONIC);
      this.audio.playId(SFX_TRANSWARP);
      this.audio.playId(SFX_ABYSSAL);
      this.audio.play('warp');
      this.audio.play('burst');
      this.audio.play('decay');
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
    this.resetCount++; // V57: keep count for the HUD readout
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
      (this.uiRng() - 0.5) * 50 * ARENA_MID,
      16 * ARENA_Y,
      (this.uiRng() - 0.5) * 50 * ARENA_MID,
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

    const existing = listEl.querySelectorAll<HTMLElement>('.algo-row');
    if (existing.length > 0) {
      for (const row of existing) {
        const idx = Number(row.dataset['algo']);
        if (!Number.isFinite(idx)) continue;
        this.algoRows.push(row);
        row.addEventListener('click', () => this.selectAlgo(idx, true));
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectAlgo(idx, true);
          }
        });
      }
    } else {
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
    }
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
    const prev = s.algoIdx;
    this.selectAlgo(s.algoIdx + 1, false); // fromUser=false keeps AUTO mode engaged
    if (prev !== s.algoIdx) {
      this.algoActiveEl?.classList.add('algo-auto-flash');
      // Clear/guard the flash-off timer on dispose so it can't fire against a torn-down panel.
      const flashId = setTimeout(() => {
        if (!this.disposeAbort.signal.aborted)
          this.algoActiveEl?.classList.remove('algo-auto-flash');
      }, 420);
      this.disposeAbort.signal.addEventListener('abort', () => clearTimeout(flashId), {
        once: true,
      });
      const name = cyc(ALGOS, s.algoIdx).name;
      this.hud.showSector(`AUTO ▸ ${name}`);
    }
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
      const name = cyc(ALGOS, active).name;
      if (s.algoMode === 'all') {
        this.algoActiveEl.textContent = 'ALL FIELDS';
      } else if (s.algoMode === 'auto') {
        const left = Math.max(0, ALGO_AUTO_PERIOD - s.algoTimer);
        this.algoActiveEl.textContent = `▸ AUTO · ${name} · ${left.toFixed(1)}s`;
      } else {
        this.algoActiveEl.textContent = name;
      }
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

  /**
   * V62: engage/disengage CHAOS MODE — the Lorenz-driven quantum storm. Shared by the toolbar
   * button + the `K` hotkey. Plays a voice, toasts the HUD, and records the toggle so replays
   * reproduce the same storm sequence from the seed. Returns the new state.
   */
  private toggleChaosMode(): boolean {
    this.unlock();
    const on = this.chaosField.toggle();
    this.audio.play(on ? 'burst' : 'decay');
    this.hud.showSector(on ? 'CHAOS MODE ⚡ ENGAGED' : 'CHAOS MODE · OFF');
    this.audit.record('chaos-mode', { on });
    return on;
  }

  /**
   * BRUTALISM: toggle the Super Creatures between the flamboyant god-jewel skin and a raw
   * poured-concrete monolith. Shared by the `B` hotkey + the action map; applies the crossfade to
   * every Archon body, toasts the HUD, and records the toggle so replays/audits reproduce it.
   * Returns the new state.
   */
  private toggleBrutalism(): boolean {
    this.unlock();
    // V110: include an OFF (god-jewel) state so the BRUTAL button can RETURN to the default skin instead
    // of being stuck permanently on. Cycle: OFF → BRUTALISM → NOUVEAUNESS → ROCOCOGOLOGY → COSMICMORPHISM
    // → REPRESSIONISM → OFF. `brutalStyleIdx` ∈ [-1, 4]; -1 = off.
    this.brutalStyleIdx += 1;
    if (this.brutalStyleIdx >= BRUTAL_STYLES.length) this.brutalStyleIdx = -1;
    const on = this.brutalStyleIdx >= 0;
    this.state.brutalism = on;
    // The per-frame step() driver eases brutalismFactor toward this state and applies it to the
    // bodies + the whole cosmos (organisms, ground, lights, sky, fog) — so no direct apply here.
    const styleForBodies = this.brutalStyleIdx < 0 ? 0 : this.brutalStyleIdx;
    for (let i = 0; i < this.superBodies.length; i++)
      this.superBodies[i]!.setBrutalStyle(styleForBodies);
    for (let i = 0; i < this.heroBodies.length; i++)
      this.heroBodies[i]!.body.setBrutalStyle(styleForBodies);
    if (on) {
      const style = BRUTAL_STYLES[this.brutalStyleIdx]!;
      this.syncBrutalButton(style.glyph, style.name, style.title);
      this.hud.showSector(`${style.name} ${style.glyph} · ${style.title.toUpperCase()}`);
      this.audit.record('brutalism', { on, style: style.name });
    } else {
      this.syncBrutalButton('▦', 'BRUTAL', 'cycle super-creature rendering');
      this.hud.showSector('GOD-JEWEL ✦ · DEFAULT SKIN');
      this.audit.record('brutalism', { on, style: 'off' });
    }
    return on;
  }

  private syncBrutalButton(glyph: string, name: string, title: string): void {
    if (typeof document === 'undefined') return;
    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-action="brutal"]')) {
      btn.textContent = `${glyph} ${name}`;
      btn.title = `${name} — ${title} (also: B key)`;
      btn.setAttribute('aria-label', `Cycle brutal super-creature rendering: ${name}`);
    }
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
      toggleChaosMode: () => this.toggleChaosMode(), // V62: the Lorenz quantum storm
      toggleBrutalism: () => this.toggleBrutalism(), // BRUTALISM: god-jewel ↔ concrete monolith
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
        this.persisted.musicOn = on;
        this.save();
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
        this.prePauseTimeScale = s.timeScale === 0 ? 1 : s.timeScale;
        this.audit.record('time-scale', { value: s.timeScale });
        return s.timeScale;
      },
      togglePause: () => {
        this.unlock();
        if (s.timeScale === 0) {
          s.timeScale = this.prePauseTimeScale || 1;
        } else {
          this.prePauseTimeScale = s.timeScale;
          s.timeScale = 0;
        }
        this.hud.showSector(s.timeScale === 0 ? 'PAUSED' : 'RESUME · ' + s.timeScale + '×');
        this.audit.record('pause', { paused: s.timeScale === 0 });
        return s.timeScale === 0;
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
        this.persisted.renderIdx = RENDER_MODES.indexOf(mode);
        this.save();
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
