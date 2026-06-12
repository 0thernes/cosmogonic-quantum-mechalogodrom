/**
 * Simulation constants ported verbatim from the legacy monolith
 * (`legacy/cosmogonic-quantum-mechalogodrom.html`). Leaf module: imports nothing
 * at runtime so it stays loadable under `bun test` with no DOM and no three.js.
 */

// ── PANTHEON arena scale (CONTRACTS V3.1) ────────────────────────────────────
// The 0.3.0 world is 5× the legacy floor plan. Horizontal (XZ) coordinates,
// containment radii and spawn volumes scale by ARENA; vertical extents scale by
// the gentler ARENA_Y so the skyline reads as colossal instead of absurd.
// Legacy tuple tables below stay authored in LEGACY units and are scaled once
// at module init — one source of truth, no drifting magic numbers.

/** Horizontal world multiplier vs the legacy monolith (CONTRACTS V3.1). */
export const ARENA = 5;

/** Vertical world multiplier (heights, sky planes, ceiling clamps). */
export const ARENA_Y = 2;

/** Mid-field multiplier for actors that must stay near the populated core. */
export const ARENA_MID = 2.5;

/** Core containment radius: legacy 65 × ARENA. Entities live inside this. */
export const ARENA_RADIUS = 65 * ARENA;

/** Squared entity containment radius (legacy 4225 = 65² family). */
export const CONTAIN_RADIUS2 = ARENA_RADIUS * ARENA_RADIUS;

/** Ground plane edge length (legacy 240 × ARENA). Maps world XZ → RD texture UV. */
export const GROUND_EXTENT = 240 * ARENA;

/** Mid-field containment radius (legacy 60 × ARENA_MID): shoggoths, quantum cloud. */
export const MID_RADIUS = 60 * ARENA_MID;

/** Squared mid-field containment (legacy 3600 = 60² family). */
export const MID_RADIUS2 = MID_RADIUS * MID_RADIUS;

/** Spatial-hash cell edge (legacy 8 → 16: queries stay 1-2 cells at 5× spread). */
export const GRID_CELL = 16;

/**
 * Ultra-tier (10k entities) spatial-hash cell edge. At 10k the arena is ~4× denser than the
 * desktop tier, so the legacy 16-unit cell returns ~214 candidates per behavior query. A
 * 10-unit cell is the measured cost sweet spot (docs/BENCHMARKS.md "Ultra-tier 10k
 * optimization"): it cuts neighbors-per-query ~36% (214 → 136) while the radius-8..16 queries
 * still span only a 3×3 / 5×5 cell block. Rejected: 8 (15.8ms, per-query cell overhead climbs),
 * 6 (16.3ms), 4 (16.0ms) — all WORSE than 10 (13.5ms) and even than 16, because shrinking the
 * cell multiplies the (2·ceil(r/cs)+1)² cells visited faster than it thins each cell. Applied
 * ONLY above 5,000 entities (world.ts): at ≤5,000 the cell size is part of the seeded rng
 * stream (nash/market draw conditional on neighbor payoffs) and must stay at GRID_CELL.
 */
export const ULTRA_GRID_CELL = 10;

/** Camera far plane (legacy 900 → 2600 so the 5× rim and star shells resolve). */
export const CAMERA_FAR = 2600;

/** Base fog density (legacy 0.003 ÷ ARENA — same optical depth across 5× sightlines). */
export const FOG_SCALE = 1 / ARENA;

/** Weather cycle states, legacy line 178. Order matters: `weatherIdx` indexes this. */
export const WEATHERS = ['CLEAR', 'RAIN', 'STORM', 'AURORA', 'VOID', 'FOG'] as const;

/** One of the six weather states. */
export type Weather = (typeof WEATHERS)[number];

/**
 * The 26 entity behavior names, legacy lines 277-279 — EXACT order. Morphotype
 * `i` gets `BEHAVIORS[i % 26]`, so reordering would silently remap every morph.
 */
export const BEHAVIORS = [
  'drift',
  'orbit',
  'pulse',
  'swarm',
  'flee',
  'hunt',
  'split',
  'coil',
  'spiral',
  'expand',
  'zigzag',
  'sine',
  'bounce',
  'flock',
  'scatter',
  'vortex',
  'lattice',
  'wave',
  'helix',
  'quantum',
  'nash',
  'market',
  'typemorph',
  'setunion',
  'graphseek',
  'lorenz',
] as const;

/** One of the 26 entity behaviors. */
export type Behavior = (typeof BEHAVIORS)[number];

/** Camera view modes, legacy line 174 (`vModes`). `viewIdx` indexes this. */
export const VIEW_MODES = ['free', 'orbit', 'fly', 'top'] as const;

/** One of the four camera view modes. */
export type ViewMode = (typeof VIEW_MODES)[number];

/**
 * Entity render styles (CONTRACTS V7.3), cycled by the toolbar from SOLID through every
 * mode. SOLID is the default PBR look; the rest are pure MeshStandardMaterial flag changes
 * (no geometry/object swap) so they apply allocation-free to both the per-mesh and the
 * instanced render paths.
 */
export const RENDER_MODES = ['solid', 'wire', 'ghost', 'neon', 'chrome'] as const;

/** One of the five entity render styles. */
export type RenderMode = (typeof RENDER_MODES)[number];

/**
 * Material-flag overrides per {@link RenderMode}, applied on top of a morphotype's base
 * material. `null` means "keep the material's base value"; `emissiveBoost` multiplies the
 * morphotype emissiveIntensity target (NEON makes each organism self-glow its own hue, the
 * one mode `update()` reads — `1` everywhere else keeps the per-frame emissive identical).
 * Pure leaf data (no THREE import) so `sim/constants.ts` stays a DOM-free leaf.
 */
export interface RenderModeFx {
  wireframe: boolean;
  metalness: number | null;
  roughness: number | null;
  opacity: number | null;
  transparent: boolean | null;
  depthWrite: boolean | null;
  emissiveBoost: number;
}

/** The {@link RenderMode} → {@link RenderModeFx} table (CONTRACTS V7.3). */
export const RENDER_MODE_FX: Readonly<Record<RenderMode, RenderModeFx>> = {
  solid: {
    wireframe: false,
    metalness: null,
    roughness: null,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 1,
  },
  wire: {
    wireframe: true,
    metalness: null,
    roughness: null,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 1,
  },
  ghost: {
    wireframe: false,
    metalness: 0,
    roughness: 1,
    opacity: 0.3,
    transparent: true,
    depthWrite: false,
    emissiveBoost: 1,
  },
  neon: {
    wireframe: false,
    metalness: 0,
    roughness: 1,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 3,
  },
  chrome: {
    wireframe: false,
    metalness: 1,
    roughness: 0.05,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 1,
  },
};

/** Lower clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MIN = 0.1;

/** Upper clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MAX = 10.0;

/** Number of procedurally generated morphotypes, legacy `GM` (line 169). */
export const MORPH_COUNT = 100;

/** Monolith silhouette kind — selects the decorative crown built per monolith. */
export type MonolithKind = 'spire' | 'obelisk' | 'arch' | 'ring';

/**
 * LEGACY monolith layout, legacy `mCfg` (line 400). Tuple layout:
 * `[x, z, height, width, depth, hue, kind]`. Authored in legacy units;
 * {@link MONOLITH_CONFIG} is the ARENA-scaled view every consumer reads.
 */
const MONOLITH_CONFIG_LEGACY: ReadonlyArray<
  readonly [number, number, number, number, number, number, MonolithKind]
> = [
  [0, -35, 50, 4.5, 2.2, 0.6, 'spire'],
  [-28, -22, 34, 3.5, 1.8, 0.55, 'obelisk'],
  [28, -22, 36, 3.5, 1.8, 0.65, 'obelisk'],
  [-44, 12, 28, 5.5, 2.5, 0.0, 'arch'],
  [44, 12, 32, 5.5, 2.5, 0.08, 'arch'],
  [0, 34, 24, 7, 3.5, 0.75, 'ring'],
  [-18, -50, 60, 3.5, 1.2, 0.45, 'spire'],
  [18, -50, 55, 3.5, 1.2, 0.5, 'spire'],
  [-55, -34, 22, 9, 4.5, 0.15, 'ring'],
  [55, -34, 26, 8, 3.5, 0.85, 'ring'],
  [0, -68, 72, 6, 3, 0.35, 'spire'],
  [-40, 34, 18, 11, 5.5, 0.2, 'arch'],
  [40, 34, 20, 10, 4.5, 0.9, 'arch'],
  [-78, -55, 90, 7, 3.5, 0.3, 'spire'],
  [78, -55, 85, 7, 3.5, 0.7, 'spire'],
  [0, -100, 110, 9, 4.5, 0.4, 'obelisk'],
];

/**
 * Monolith layout at PANTHEON scale: legacy x/z × {@link ARENA}, height/width/
 * depth × {@link ARENA_Y} (towers double, floor plan quintuples). Indexed by
 * {@link PIPE_LINKS}. Scaled once at module init.
 */
export const MONOLITH_CONFIG: ReadonlyArray<
  readonly [number, number, number, number, number, number, MonolithKind]
> = MONOLITH_CONFIG_LEGACY.map(
  ([x, z, h, w, d, hue, kind]) =>
    [x * ARENA, z * ARENA, h * ARENA_Y, w * ARENA_Y, d * ARENA_Y, hue, kind] as const,
);

/**
 * Data-pipeline endpoint pairs, legacy line 427. Each pair holds two indices
 * into {@link MONOLITH_CONFIG}; a Catmull-Rom tube is strung between them.
 */
export const PIPE_LINKS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, 2],
  [0, 6],
  [0, 7],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 5],
  [6, 10],
  [7, 10],
  [10, 13],
  [10, 14],
  [10, 15],
  [1, 8],
  [2, 9],
  [3, 11],
  [4, 12],
  [5, 11],
  [5, 12],
  [8, 13],
  [9, 14],
];

/**
 * LEGACY floating diorama configs, legacy line 416. Tuple layout:
 * `[x, y, z, radius, hue]`. See {@link DIORAMA_CONFIG} for the scaled view.
 */
const DIORAMA_CONFIG_LEGACY: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-22, 20, -12, 5.5, 0.0],
  [22, 24, -18, 5, 0.3],
  [-12, 32, 22, 4.5, 0.55],
  [32, 17, 28, 6, 0.75],
  [-38, 27, -28, 4, 0.15],
  [0, 38, -34, 6.5, 0.45],
  [48, 22, -12, 4.5, 0.85],
  [-48, 30, 18, 4.2, 0.6],
];

/**
 * Diorama layout at PANTHEON scale: legacy x/z × {@link ARENA}, y/radius ×
 * {@link ARENA_Y}. Scaled once at module init.
 */
export const DIORAMA_CONFIG: ReadonlyArray<readonly [number, number, number, number, number]> =
  DIORAMA_CONFIG_LEGACY.map(
    ([x, y, z, r, hue]) => [x * ARENA, y * ARENA_Y, z * ARENA, r * ARENA_Y, hue] as const,
  );
