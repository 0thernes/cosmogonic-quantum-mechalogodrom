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
import type { Behavior, ViewMode, Weather } from './sim/constants';

/** Quality tier ladder (CONTRACTS V3.1): decided once at boot, never switched. */
export type QualityTier = 'phone' | 'laptop' | 'desktop' | 'ultra';

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
   * Adaptive steady-state population target (CONTRACTS V3.6/V4.5). ORGANIC growth — auto-split
   * and sparse-respawn — stops at this count, so an idle world settles here rather than at the
   * hard ceiling. For every tier except ultra this equals {@link maxEntities} (no behavioral
   * change). At the ultra tier it is set below 10,000 (the measured count that holds the ≥55fps
   * desktop acceptance gate while leaving GPU-render headroom — see docs/BENCHMARKS.md);
   * bursts still push the live count up to {@link maxEntities}, which then organically relaxes
   * back toward this target. Must be ≤ maxEntities.
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
  mutations: number;
  timeScale: number;
  wireframe: boolean;
  weatherIdx: number;
  temperature: number;
  wind: { x: number; z: number };
  viewIdx: number;
  algoIdx: number;
  songIdx: number;
  algoStep: number;
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
  apocalypse(): void;
  reset(): void;
  toggleMusic(): boolean;
  toggleSfx(): boolean;
  cycleSong(): string;
  cycleSfxPreview(): string;
  cycleTimeScale(): number;
  toggleWireframe(): boolean;
  cycleView(): ViewMode;
  cycleAlgo(): string;
  cycleWeather(): Weather;
}
