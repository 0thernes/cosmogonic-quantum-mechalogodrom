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

/** Quality tier ladder (CONTRACTS V3.1): decided once at boot, never switched. `mega` is opt-in only
 * (`?tier=mega`) — the 50k ceiling for beefy GPUs, never auto-selected (V38). */
export type QualityTier = 'phone' | 'laptop' | 'desktop' | 'ultra' | 'mega';

/** Device-adaptive quality profile, resolved once at boot. */
export interface QualityProfile {
  /** Resolved tier (phone 650 / laptop 2000 / desktop 5000 / ultra 10000 entities). */
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
   * ceiling, carried by the per-frame neighbor-query throttles in docs/BENCHMARKS.md). The
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
  /** Morphotype index 0..99. */
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
  grid: SpatialHash<Entity>;
  morphs: MorphType[];
  geos: THREE.BufferGeometry[];
  state: SimState;
  audit: AuditTrail;
  sfx: (type: SfxType) => void;
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
  /** 10×10 row-major titan relation matrix: 0 truce, 1 alliance, 2 war (V3.5). REUSED. */
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
  /** Live count of registered NHI super-minds (telemetry tally). */
  nhi: number;
  /** Current camera view-mode name (HUD View/Speed/Render box). */
  viewName: string;
  /** Current time-dilation multiplier (HUD box; 0 = paused, 1 = realtime). */
  timeScale: number;
  /** Current entity render-mode name (HUD box). */
  renderName: string;
  /** V13 economy: AURUM/UMBRA money + commodity prices + dominant currency + wealth Gini. */
  econ: MarketSummary;
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
  /** Raise ENTROPY one step (F-CHAOS-ENTROPY) — the bipolar opposite of chaos; returns the new value. */
  entropyBoost(): number;
  /** Launch a user-controlled NHI being into the world (F-NHI); returns 1 on success, 0 if at the cap. */
  launchNhi(): number;
  /** Summon the next cosmological singularity (CONTRACTS V7.4); returns its name. */
  summonSingularity(): string;
  apocalypse(): void;
  reset(): void;
  toggleMusic(): boolean;
  toggleSfx(): boolean;
  cycleSong(): string;
  cycleSfxPreview(): string;
  cycleTimeScale(): number;
  /** Dilate SPACE: step the camera field-of-view through discrete levels (F-SPACE); returns the new FOV. */
  cycleSpace(): number;
  /** Cycle the entity render style (CONTRACTS V7.3); returns the new mode. */
  cycleRenderMode(): RenderMode;
  /** Toggle the simulation variant N(1)↔N(2) (CONTRACTS V7.6); returns the new variant. */
  cycleSim(): 1 | 2;
  cycleView(): ViewMode;
  cycleAlgo(): string;
  cycleWeather(): Weather;
}
