/**
 * Shared type hub for the Cosmogonic Quantum Mechalogodrom.
 *
 * Import discipline (keeps the runtime module graph acyclic):
 * - Leaf modules (src/math/*, src/logging/*, src/memory/*, src/sim/constants.ts,
 *   src/audio/songs.ts) never import this file at runtime.
 * - References to leaf-module classes below use `import type`, which
 *   verbatimModuleSyntax erases at emit — type-level cycles are harmless.
 */
import type * as THREE from 'three';
import type { Rng } from './math/rng';
import type { SpatialHash } from './math/spatial-hash';
import type { AuditTrail } from './logging/audit';
import type { Behavior, RenderMode, ViewMode, Weather } from './sim/constants';
import type { MarketSummary } from './sim/economy';

/** Quality tier ladder (CONTRACTS V3.1 → V123, USER #6): decided once at boot, never switched.
 * Six rungs — phone 1,000 · tablet 2,000 · laptop 5,000 · desktop 10,000 · ultra 25,000 ·
 * mega 50,000. EVERYONE boots `phone` for a fast first load; the perf chip's tier switcher
 * (`?tier=`) is the one-tap way up. */
export type QualityTier = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'ultra' | 'mega';

/** Device-adaptive quality profile, resolved once at boot. */
export interface QualityProfile {
  /** Resolved tier (phone 1k / tablet 2k / laptop 5k / desktop 10k / ultra 25k / mega 50k). */
  tier: QualityTier;
  isMobile: boolean;
  dprCap: number;
  /**
   * Hard population ceiling — the largest the world will EVER hold. All capacity buffers
   * (instanced pools, connectome/graph index tables, atmosphere particulate count and its
   * rng-draw count) are sized from this, and the spawn guard rejects above it. Always
   * reachable via user-driven bursts/apocalypse, even when {@link targetEntities} is lower.
   */
  maxEntities: number;
  /**
   * Steady-state population target (CONTRACTS V3.6/V4.5; ultra value revised in V5.6/0.5.0).
   * ORGANIC growth — auto-split and sparse-respawn — stops at this count, so an idle world
   * settles here. Since 0.5.0 this equals {@link maxEntities} on EVERY tier (the ultra 6,500
   * adaptive throttle was retired on user feedback — an idle ultra world now fills its 10,000
   * ceiling, carried by the per-frame neighbor-query throttles in docs/BENCHMARKS-2026-06-26.md). The
   * field is retained because bursts can still transiently exceed it on tiers where it might
   * diverge from the ceiling again. Must be ≤ maxEntities.
   */
  targetEntities: number;
  quantumCount: number;
  maxLinks: number;
  shadows: boolean;
  starCount: number;
  /** True above the phone tier: entities render through InstancedMesh pools (V3.1). */
  instanced: boolean;
}

/** Per-entity simulation state stored on the mesh (`userData`). */
export interface EntityData {
  /** Morphotype index `0..morphTotal-1` (100 legacy / 250 in phylum mode); spawn/respawn use `mi % morphs.length`. */
  mi: number;
  vel: THREE.Vector3;
  age: number;
  life: number;
  /** Phase offset for trig wobble. */
  ph: number;
  /** Base scale. */
  sc: number;
  beh: Behavior;
  spd: number;
  /** Wobble frequency. */
  wf: number;
  /** Wobble amplitude. */
  wa: number;
  /** Auto-split countdown. */
  sT: number;
  /** Post-split digestion timer (visual pulse). */
  belly: number;
  /** Value the sorting-field algorithms operate on. */
  sortVal: number;
  /** Neural weight for connectome links. */
  nW: number;
  /** Neural activation accumulator. */
  act: number;
  /** Quantum phase. */
  qP: number;
  /** Market-behavior wealth 0..100. */
  energy: number;
  /** Nash-behavior strategy. */
  strategy: 0 | 1;
  /** Type-theory tag 0..4. */
  typeId: number;
  /** Set-theory group; boots 0..3, but GraphMind louvain rewrites it with raw
   *  community indices that may exceed 3 (behaviors only compare equality). */
  setGroup: number;
  /** Last Nash payoff. */
  payoff: number;
  /** Phylum index 0..9 (CONTRACTS V3.2); -1 = unaffiliated legacy morph. */
  phylum: number;
  /** OUTLIER second behavior, temporally blended with `beh`; null for members. */
  beh2: Behavior | null;
  /**
   * F-NHI: true for a user-LAUNCHED non-human-intelligence being (Neo/"Matrix" powers — buoyant,
   * faster, age-immortal, and immune to singularity consumption). OPTIONAL/absent on every normal
   * organism (⇒ falsy), so the spawn literal and all tests are unchanged; only a launched being
   * sets it. Read as `userData.isNhi === true`.
   */
  isNhi?: boolean;
}

export interface Entity extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  userData: EntityData;
}

/** One procedurally generated morphotype (100 legacy / 250 in phylum mode). */
export interface MorphType {
  id: number;
  /** Index into the geometry cache. */
  gi: number;
  col: THREE.Color;
  em: THREE.Color;
  emI: number;
  met: number;
  rou: number;
  op: number;
  beh: Behavior;
  srMin: number;
  srMax: number;
  spd: number;
  wf: number;
  wa: number;
}

/** Mutable cross-system simulation state (single instance, owned by world.ts). */
export interface SimState {
  chaos: number;
  /**
   * F-CHAOS-ENTROPY: the bipolar counterpart to {@link chaos}. Chaos AGITATES (wild excursions);
   * entropy ORDERS toward heat-death/uniformity — it damps the jitter and bleeds chaos away.
   * Session-only, in `[0, ENTROPY_MAX]`, decays toward 0. OPTIONAL on purpose: the many test
   * SimState literals omit it (⇒ `0`, the exact identity), so they stay byte-identical. Always
   * read as `entropy ?? 0`; the live world initializes it to 0.
   */
  entropy?: number;
  mutations: number;
  timeScale: number;
  /** Entity render style (CONTRACTS V7.3; session-only, cycled by the toolbar). */
  renderMode: RenderMode;
  /** BRUTALISM: Super Creature skin mode (session-only; `B` hotkey). undefined/false = god-jewel, true = concrete. */
  brutalism?: boolean;
  /**
   * Simulation variant (CONTRACTS V7.6): `1` = GENESIS (the cosmos as it ships), `2` = BREAK
   * FREE (the nightmare — raised chaos floor, a lurid inverted sky). Persisted.
   */
  sim: 1 | 2;
  weatherIdx: number;
  temperature: number;
  wind: { x: number; z: number };
  viewIdx: number;
  algoIdx: number;
  songIdx: number;
  algoStep: number;
  /**
   * Sorting-field run mode (CONTRACTS V7.2; session-only, not persisted): `'single'` runs
   * the one selected field, `'all'` blends swap proposals from EVERY field each frame, and
   * `'auto'` advances through all fields in succession on {@link algoTimer}.
   */
  algoMode: 'single' | 'all' | 'auto';
  /** Seconds elapsed on the current AUTO field; advances to the next at the cadence. */
  algoTimer: number;
  frame: number;
  elapsed: number;
  /**
   * V66: the LIVE population target the world ramps from a fast-loading ~500 up to the tier ceiling
   * (then breathes). When set (> 0) it overrides the static `quality.targetEntities` that
   * `EntityManager.update` grows toward; left undefined (e.g. in headless tests) the legacy
   * fixed-target behaviour is preserved. Deterministic — derived purely from {@link elapsed}.
   */
  growthTarget?: number;
}

export type SfxType =
  | 'split'
  | 'burst'
  | 'mutate'
  | 'ambient'
  | 'warp'
  | 'crystallize'
  | 'decay'
  | 'resonance';

export interface Song {
  name: string;
  bpm: number;
  chords: number[][];
  wave: OscillatorType;
  bass: OscillatorType;
  mel: number[];
  fBase: number;
}

/** Dependency bag handed to sim systems (constructed once in world.ts). */
export interface SimContext {
  scene: THREE.Scene;
  quality: QualityProfile;
  rng: Rng;
  /**
   * Dedicated seeded sub-stream for heritable genetics (organism trait genomes + their
   * inheritance on auto-split). Kept OFF the main `rng` so genome draws never shift the
   * primary entity draw order (same golden-ratio-mix discipline as `econRng`/`superRng`).
   * Optional for back-compat: headless test contexts may omit it, in which case spawn falls
   * back to `rng` (legacy behavior).
   */
  genomeRng?: Rng;
  grid: SpatialHash<Entity>;
  morphs: MorphType[];
  geos: THREE.BufferGeometry[];
  state: SimState;
  audit: AuditTrail;
  sfx: (type: SfxType) => void;
  /** Rare per-morph creature voice (palette index); optional — wired by world.ts. */
  creatureSfx?: (morphIndex: number) => void;
}

/** Returned by EntityManager.update each frame. */
export interface UpdateStats {
  energy: number;
  morphCount: number;
}

/** A sorting-field algorithm: pure single-step swap proposal. */
export interface SortAlgo {
  name: string;
  /**
   * Inspect values[0..length) at step i; return a swap pair or null.
   * Must be O(length) worst case and allocation-free (the returned tuple is
   * permitted; callers treat it as transient).
   */
  step(values: Float32Array, length: number, i: number): readonly [number, number] | null;
}

export interface PuppetEvent {
  name: string;
  action: string;
}

export interface AuditEntry {
  ts: number;
  action: string;
  detail?: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  scope: string;
  msg: string;
  data?: unknown;
}

export interface Logger {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}

/** Preferences persisted across sessions (versioned; see src/memory/store.ts). */
export interface PersistedStateV1 {
  version: 1;
  seed: number;
  songIdx: number;
  algoIdx: number;
  viewIdx: number;
  weatherIdx: number;
  sfxOn: boolean;
  sessions: number;
  /**
   * Simulation variant (CONTRACTS V7.6; additive — a pre-V7.6 blob without this field loads
   * with `sim = 1`, the GENESIS default). `1` = GENESIS, `2` = BREAK FREE (nightmare).
   */
  sim: 1 | 2;
  /**
   * Audio/music toggle (additive — defaults to false when absent).
   */
  musicOn?: boolean;
  /**
   * Master mute toggle (additive — defaults to false when absent).
   */
  muteOn?: boolean;
  /**
   * Active render mode index (additive — defaults to 0 when absent).
   */
  renderIdx?: number;
  /**
   * Quality tier string (additive — defaults to detected tier when absent).
   */
  tier?: string;
}
export type PersistedState = PersistedStateV1;

/** Read-only snapshot for the telemetry panel (built by world.ts each UI tick). */
export interface TelemetrySnapshot {
  entities: number;
  maxEntities: number;
  chaos: number;
  mutations: number;
  energy: number;
  links: number;
  morphs: number;
  algoName: string;
  quantum: number;
  songName: string;
  weather: Weather;
  wind: number;
  temperature: number;
  shoggoths: number;
  puppeteers: number;
  /** Graph communities found by the last louvain pass (V2). */
  tribes: number;
  /** Population slope per minute from rolling regression (V2). */
  trend: number;
  /** Normalized 0..1 Shannon entropy of the quantum register (V2). */
  qEntropy: number;
  /** Lore name of the camera's Voronoi sub-sector (V2). */
  lore: string;
  /** Link-buffer capacity of the active tier (V3 — sparkline full scale). */
  maxLinks: number;
  /** Total morphotypes minted at boot (V3: 250 in phylum mode). */
  morphTotal: number;
  /** Number of titans (V3 — telemetry row). */
  titans: number;
  /** Live population per phylum (V3.5). REUSED array — copy to retain. */
  phylumCounts: ArrayLike<number>;
  /** Titan economy rows (V3.5). REUSED array of REUSED rows — copy to retain. */
  titanLedger: ArrayLike<TitanLedger>;
  /** 20×20 row-major titan relation matrix: 0 truce, 1 alliance, 2 war (V3.5). REUSED. */
  warMatrix: ArrayLike<number>;
  /** Reaction-diffusion pattern energy: strided mean of the V field (V3.5). */
  rdEnergy: number;
  /**
   * Biome "sentience index" 0..1 (V4) — the alien immortal biome's measure of
   * self-organization: an aggregate of community structure (tribes), quantum
   * coherence (entropy) and demographic momentum (|trend|). Read by the
   * observatory conflict page and the telemetry sentience readout.
   */
  sentience: number;
  /**
   * V71: the three MEASURABLE dimensions that the composite {@link sentience} blends, each 0..1 —
   * surfaced as their own observatory dials so the biome's "aliveness" is readable, not a single
   * black-box number. Grounded in the science of collective/integrated cognition:
   * - {@link bioIntegration}: community structure (tribes) → integrated information (IIT proxy).
   * - {@link bioCoherence}: quantum-register entropy → global coherence / criticality.
   * - {@link bioMomentum}: demographic slope magnitude (|trend|) → autopoietic self-maintenance.
   */
  bioIntegration: number;
  bioCoherence: number;
  bioMomentum: number;
  /** Live count of registered NHI super-minds (telemetry tally). */
  nhi: number;
  /** Mean brutal-god power across petri archons (0..1) — NHSI pantheon telemetry. */
  godPower?: number;
  /** Current camera view-mode name (HUD View/Speed/Render box). */
  viewName: string;
  /** Current time-dilation multiplier (HUD box; 0 = paused, 1 = realtime). */
  timeScale: number;
  /** Current entity render-mode name (HUD box). */
  renderName: string;
  /** V13 economy: AURUM/UMBRA money + commodity prices + dominant currency + wealth Gini. */
  econ: MarketSummary;
  /** V57: audio music on/off (HUD View/Speed/Render box). */
  musicOn: boolean;
  /** V57: audio SFX on/off (HUD box). */
  sfxOn: boolean;
  /** Master mute state (HUD box). */
  muteOn: boolean;
  /** V57: total RESET/REGENERATE actions this session — kept count (HUD box). */
  resetCount: number;
  /** Simulation variant: 1 = GENESIS N(1), 2 = BREAK FREE N(2) (telemetry box). */
  sim: 1 | 2;
  /** Active cosmological singularity display name, or '' when none is summoned (telemetry box). */
  singularity: string;
  /** V62: whether CHAOS MODE (the Lorenz quantum storm) is engaged — flagged on the chaos row. */
  chaosMode: boolean;
}

/** One titan's public economy row (structural twin of sim/titans TitanLedgerEntry). */
export interface TitanLedger {
  name: string;
  energy: number;
  matter: number;
  entropy: number;
  /** Rivals this titan is currently at war with (0..9). */
  war: number;
}

/** User-facing actions; world.ts implements them, src/ui binds them to the DOM. */
export interface UiActions {
  split(): void;
  burst(): void;
  mutate(): void;
  chaosBoost(): void;
  /** Engage/disengage CHAOS MODE — the Lorenz-driven quantum storm (V62); returns the new state. */
  toggleChaosMode(): boolean;
  /** Raise ENTROPY one step (F-CHAOS-ENTROPY) — the bipolar opposite of chaos; returns the new value. */
  entropyBoost(): number;
  /** Launch a user-controlled NHI being into the world (F-NHI); returns 1 on success, 0 if at the cap. */
  launchNhi(): number;
  /** Summon the next cosmological singularity (CONTRACTS V7.4); returns its name. */
  summonSingularity(): string;
  apocalypse(): void;
  reset(): void;
  /** Toggle pause (timeScale 0 ↔ last non-zero speed). */
  togglePause(): boolean;
  toggleMusic(): boolean;
  toggleSfx(): boolean;
  /** Master mute/unmute music + SFX without changing their individual toggle states. */
  toggleMute(): boolean;
  cycleSong(): string;
  cycleSfxPreview(): string;
  cycleTimeScale(): number;
  /** Dilate SPACE: step the camera field-of-view through discrete levels (F-SPACE); returns the new FOV. */
  cycleSpace(): number;
  /** Cycle the entity render style (CONTRACTS V7.3); returns the new mode. */
  cycleRenderMode(): RenderMode;
  /** BRUTALISM: toggle the Super Creatures between god-jewel and raw concrete; returns the new state. */
  toggleBrutalism(): boolean;
  /** Toggle the simulation variant N(1)↔N(2) (CONTRACTS V7.6); returns the new variant. */
  cycleSim(): 1 | 2;
  cycleView(): ViewMode;
  /** Snap the free camera to frame the God-Colossus fractal deity at the back of the dome. */
  focusColossus(): void;
  cycleAlgo(): string;
  /** Cycle master scene exposure darker ↔ brighter; returns the new value. */
  cycleExposure(): number;
  /** Cycle the environment weather state. */
  cycleWeather(): Weather;
  /** USER #4: explicit master PANEL launcher next to ACCESS (copilot/help/audit/nhi/market/archons/apex). */
  openMasterPanel(): boolean;
}
