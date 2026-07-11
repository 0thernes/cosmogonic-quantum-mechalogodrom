/**
 * Simulation constants ported verbatim from the legacy monolith
 * (`legacy/cosmogonic-quantum-mechalogodrom.html`). Leaf module: imports nothing
 * at runtime so it stays loadable under `bun test` with no DOM and no three.js.
 */

// ── PANTHEON arena scale (CONTRACTS V3.1) ────────────────────────────────────
// The authored world is 5× the legacy floor plan. Object dimensions and authored
// architecture continue to scale by ARENA / ARENA_Y; the habitat itself has its
// own multipliers so enlarging the biosphere never silently enlarges its inhabitants.
// Legacy tuple tables below stay authored in LEGACY units and are scaled once
// at module init — one source of truth, no drifting magic numbers.

/** Horizontal world multiplier vs the legacy monolith (CONTRACTS V3.1). */
export const ARENA = 5;

/** Vertical world multiplier (heights, sky planes, ceiling clamps). */
export const ARENA_Y = 2;

/** Mid-field multiplier for actors that must stay near the populated core. */
export const ARENA_MID = 2.5;

/** User-directed habitat expansion: 2× width and 2× length (4× land area). */
export const HABITAT_XZ_SCALE = 2;

/** User-directed habitat expansion: 3× the former vertical ceiling. */
export const HABITAT_Y_SCALE = 3;

/** Expanded mid-field coordinate multiplier for world-scale paths and cameras. */
export const HABITAT_MID = ARENA_MID * HABITAT_XZ_SCALE;

/** Expanded altitude coordinate multiplier; object sizes still use {@link ARENA_Y}. */
export const HABITAT_Y = ARENA_Y * HABITAT_Y_SCALE;

/** Authored architecture/core radius. This deliberately does not scale object dimensions. */
export const ARENA_RADIUS = 65 * ARENA;

/** Expanded radial habitat radius for systems that require a circular safety bound. */
export const HABITAT_RADIUS = ARENA_RADIUS * HABITAT_XZ_SCALE;

/** Squared expanded habitat radius (square-platform actors use PLATFORM_HALF per axis). */
export const CONTAIN_RADIUS2 = HABITAT_RADIUS * HABITAT_RADIUS;

/** Ground edge: former 1,200 × 2 = 2,400. Maps world XZ → RD texture UV. */
export const GROUND_EXTENT = 240 * ARENA * HABITAT_XZ_SCALE;

/** USER: the SQUARE PLATFORM box that everything roams — per-axis half-extent (just inside the ground
 *  edge), a ground floor, and the expanded biosphere ceiling. The central mechalogodrom keeps its
 *  authored size, but its ALTITUDE now tracks the GOD-COLOSSUS's vertical center (see mechalogodrom.ts
 *  ALTITUDE = ARENA_RADIUS·0.92 ≈ 299) so the two god-tier presences share one elevation band. */
export const PLATFORM_HALF = (GROUND_EXTENT / 2) * 0.9; // 1,080
export const PLATFORM_CEIL = 240 * HABITAT_Y_SCALE; // 720
export const PLATFORM_FLOOR = 6;
export const PLATFORM_HEIGHT = PLATFORM_CEIL - PLATFORM_FLOOR;
export const PLATFORM_MID_Y = PLATFORM_FLOOR + PLATFORM_HEIGHT * 0.5;

/** Expanded mid-field containment radius: leviathans and the quantum cloud. */
export const MID_RADIUS = 60 * HABITAT_MID;

/** Squared mid-field containment (legacy 3600 = 60² family). */
export const MID_RADIUS2 = MID_RADIUS * MID_RADIUS;

// ── SOCIAL CONTACT LAW (binding — ADR 0016) ──────────────────────────────────
// Habitat expansion without population growth MUST NOT freeze social/game-theory
// radii at legacy unit lengths. That collapse is what made living systems read as
// avoidant isolates. SOCIAL_SCALE multiplies organism-local contact radii so mid-
// tier populations still average multiple neighbors in flock/nash/trade disks.
// SOCIAL_CASTE_SCALE is harder for fixed small populations (Shoggoths / NHI /
// puppeteers) that must still form economies, alliances, and kin fields.

/**
 * Organism social / theory / connectome radius multiplier vs legacy unit radii.
 * Equals `HABITAT_XZ_SCALE * 2` so a 4× land expansion restores multi-neighbor contact
 * without replaying the pre-expansion overcrowding regime.
 */
export const SOCIAL_SCALE = HABITAT_XZ_SCALE * 2;

/**
 * Sparse-caste social radius multiplier (fixed counts of ~16–100 beings on the full platform).
 * Equals `HABITAT_XZ_SCALE * ARENA` so trade/kin/opportunity disks still find partners.
 */
export const SOCIAL_CASTE_SCALE = HABITAT_XZ_SCALE * ARENA;

/** Scale a legacy organism social radius (units) by {@link SOCIAL_SCALE}. */
export const socialR = (legacy: number): number => legacy * SOCIAL_SCALE;

/** Scale a legacy organism social radius to squared units. */
export const socialR2 = (legacy: number): number => {
  const r = legacy * SOCIAL_SCALE;
  return r * r;
};

/** Scale a legacy sparse-caste social radius by {@link SOCIAL_CASTE_SCALE}. */
export const casteR = (legacy: number): number => legacy * SOCIAL_CASTE_SCALE;

/** Scale a legacy sparse-caste social radius to squared units. */
export const casteR2 = (legacy: number): number => {
  const r = legacy * SOCIAL_CASTE_SCALE;
  return r * r;
};

/** Canonical organism social radii (legacy bases × {@link SOCIAL_SCALE}). */
export const SOCIAL_FLOCK_R = socialR(8);
export const SOCIAL_NASH_R = socialR(10);
export const SOCIAL_MARKET_R = socialR(12);
export const SOCIAL_TYPEMORPH_R = socialR(10);
export const SOCIAL_SETUNION_R = socialR(15);
export const SOCIAL_SETUNION_REPEL_R = socialR(6);
export const SOCIAL_GRAPHSEEK_R = socialR(16);
export const SOCIAL_CONNECTOME_R = socialR(8);

/** Canonical sparse-caste social radii (legacy bases × {@link SOCIAL_CASTE_SCALE}). */
export const SOCIAL_TRADE_R = casteR(30);
export const SOCIAL_THREAT_R = casteR(38);
export const SOCIAL_TENDRIL_R = casteR(15);
export const SOCIAL_CONSUME_R = casteR(12);
/** Puppeteers sense organism density under their orbit — organism-scale, not caste-scale. */
export const SOCIAL_PUP_OPP_R = socialR(42);
export const SOCIAL_NHI_KIN_R = casteR(90);
export const SOCIAL_NHI_BODY_R = casteR(55);
/** NHI dominate/manipulate body-force disk (legacy 36 × SOCIAL_SCALE). */
export const SOCIAL_NHI_ACTION_R = socialR(36);
/** Apex / super-creature local crowding sense (legacy 24 × SOCIAL_SCALE). */
export const SOCIAL_APEX_SENSE_R = socialR(24);
/** Ordinary HUNT capture disk (legacy 5 × SOCIAL_SCALE). */
export const SOCIAL_HUNT_CAPTURE_R = socialR(5);

// ── SOCIAL CORE PACKING (founders + sparse castes live where contact can form) ──
/** Inner radial fraction of PLATFORM_HALF for phylum-wedge founder spawn. */
export const SOCIAL_SPAWN_INNER = 0.06;
/** Outer radial fraction of PLATFORM_HALF for founder spawn (was ~0.87 → isolation fog). */
export const SOCIAL_SPAWN_OUTER = 0.38;
/** Non-phylum founders fill a square of half-extent PLATFORM_HALF × this (was 0.94). */
export const SOCIAL_SPAWN_XZ_FRAC = 0.36;
/** Vertical band: founders spawn in [floor, floor + height × this] (not the full 720u column). */
export const SOCIAL_SPAWN_Y_FRAC = 0.28;
/**
 * Ambient filament / colony spring gain (all ordinary organisms, every frame).
 * Tuned so nearest-neighbor graphseek-class edges win over wander/jitter and form visible chains.
 */
export const SOCIAL_GRAVITY_GAIN = 0.00032;
/** Extra gain toward same-setGroup kin — tribal colony bonds (ants/bees-style cohort filaments). */
export const SOCIAL_KIN_GAIN = 0.00055;
/** Soft separation when neighbors closer than ideal edge × this (prevents blob collapse). */
export const SOCIAL_SEPARATION_FRAC = 0.42;
/** Hungry organisms trail toward higher-energy kin (trophallaxis / feeding-trail bias). */
export const SOCIAL_FEED_TRAIL_GAIN = 0.0004;

/** Spatial-hash cell edge (legacy 8 → 16: queries stay 1-2 cells at 5× spread). */
export const GRID_CELL = 16;

/**
 * Ultra-tier (10k entities) spatial-hash cell edge. Sized for SOCIAL_SCALE contact radii
 * (flock..graphseek ≈ 32..64u): a 16-unit cell keeps 3×3–9×9 blocks while avoiding the
 * pre-social-era 10-unit cell's inflated cell-visit cost on the larger social disks.
 * Applied ONLY above 5,000 entities (world.ts): at ≤5,000 the cell size is part of the seeded
 * rng stream (nash/market draw conditional on neighbor payoffs) and must stay at GRID_CELL.
 */
export const ULTRA_GRID_CELL = 16;

/** Camera far plane doubled with the habitat so the new rim and sky shell resolve. */
export const CAMERA_FAR = 2600 * HABITAT_XZ_SCALE;

/** Base fog density preserves optical depth across the doubled horizontal sightline. */
export const FOG_SCALE = 1 / (ARENA * HABITAT_XZ_SCALE);

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

/**
 * Camera view modes. The first four are the legacy set (`vModes`, legacy line 174); the five
 * trailing modes are the 0.9 motion/cinematic additions (F-CAM5) — all automatic, flying, or
 * subject-tracking shots that ignore manual input. `viewIdx` indexes this (wraps mod length), so
 * the order is append-only: never reorder or the persisted `viewIdx` would point at a new mode.
 */
export const VIEW_MODES = [
  'free',
  'orbit',
  'fly',
  'top',
  'follow', // lerps to an orbiting offset around a tracked organism
  'chase', // trails just behind a tracked organism's heading
  'cinematic', // slow grand drift across the whole arena
  'vortex', // descending spiral around the world axis
  'titan', // wide tracking shot of a roaming titan/large being
  'specimen', // F-RELIQUARY: macro "specimen plate" tour of live organisms on the fog-void
] as const;

/** One of the camera view modes (4 legacy + 5 motion). */
export type ViewMode = (typeof VIEW_MODES)[number];

/**
 * The subject-tracking motion views (F-CAM5) — these pick a live subject to follow rather than
 * running a fixed parametric path. Used by the camera to decide when to resolve a subject.
 */
export const TRACKING_VIEWS: ReadonlySet<ViewMode> = new Set(['follow', 'chase', 'titan']);

/**
 * Time-dilation steps cycled by the TIME control (F-TIME). `0` is a true pause (frames still tick
 * but `dt` is 0, so nothing integrates); `1` is realtime. Includes the legacy `0.2`/`3` values so
 * existing behaviour/tests at those scales are unchanged; append-only like {@link VIEW_MODES}.
 */
export const TIME_SCALES = [0, 0.1, 0.2, 0.5, 1, 2, 3, 5] as const;

/**
 * Discrete camera field-of-view levels the SPACE control dilates through (F-SPACE — the spatial
 * twin of TIME_SCALES) in degrees. `68` is the boot default; wider warps toward a fish-eye that
 * pulls more space into view, narrower compresses toward a telephoto flatten. Camera-only, so
 * dilating space never perturbs the deterministic sim. Append-only.
 */
export const SPACE_FOVS = [35, 50, 68, 85, 105] as const;

/**
 * Entity render styles (CONTRACTS V7.3), cycled by the toolbar from SOLID through every
 * mode. SOLID is the default PBR look; the rest are pure MeshStandardMaterial flag changes
 * (no geometry/object swap) so they apply allocation-free to both the per-mesh and the
 * instanced render paths.
 */
export const RENDER_MODES = [
  'solid',
  'wire',
  'ghost',
  'neon',
  'chrome',
  'hologram',
  'iridescent',
  // USER: 10 total entity renders. plasma/obsidian/prismatic are GPU-shader modes (indices 7/8/9),
  // layered by the instanced pool fragment (see instanced-entities uMode block); the FX flags below
  // are the per-mesh (phone) fallback + pool base. Append-only so existing mode indices are stable.
  'plasma',
  'obsidian',
  'prismatic',
] as const;

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
  // HOLOGRAM + IRIDESCENT are GPU-shader modes (instanced pools only — see instanced-entities
  // patchPoolMaterial). These FX flags are the per-mesh (phone) FALLBACK + the pool base the
  // shader builds on: hologram = a translucent emissive phantom, iridescent = a flat emissive
  // shell. Phone tier shows the fallback; the shader adds the fresnel/scanline/thin-film on top.
  hologram: {
    wireframe: false,
    metalness: 0,
    roughness: 1,
    opacity: 0.6,
    transparent: true,
    depthWrite: false,
    emissiveBoost: 1.6,
  },
  iridescent: {
    wireframe: false,
    metalness: 0.2,
    roughness: 0.4,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 1.2,
  },
  // USER 10-renders: PLASMA — molten self-luminous body (fiery emissive; the shader adds turbulent core glow).
  plasma: {
    wireframe: false,
    metalness: 0,
    roughness: 0.6,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 2.4,
  },
  // OBSIDIAN — dark rim-lit volcanic glass (high metalness, low glow; the shader adds a cool fresnel rim).
  obsidian: {
    wireframe: false,
    metalness: 0.9,
    roughness: 0.15,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 0.5,
  },
  // PRISMATIC — rainbow refraction shell (thin-film dispersion; the shader adds the angular spectrum).
  prismatic: {
    wireframe: false,
    metalness: 0.3,
    roughness: 0.25,
    opacity: null,
    transparent: null,
    depthWrite: null,
    emissiveBoost: 1.4,
  },
};

/**
 * SIM-DYNAMICS multipliers per {@link RenderMode} (F-RENDER-DYN): the render style nudges how
 * organisms MOVE, not only how they look. Each field is a small bounded multiplier applied
 * deterministically in the entity loop. `solid` is the exact identity (all 1) so the default
 * world — and every determinism/parity test, which runs in `solid` — is byte-for-byte unchanged;
 * the style is a user input recorded in the audit trail, so replays reproduce a mode-change
 * script exactly. Pure leaf data (no THREE import).
 */
export interface RenderModeDyn {
  /** Velocity / speed-cap scale (how fast the field moves). */
  speed: number;
  /** Neighbor query-radius scale (how far organisms perceive each other). */
  vision: number;
  /** Cohesion / social-pull scale (how tightly they flock). */
  social: number;
  /** Chaos-jitter scale (how restless the motion reads). */
  jitter: number;
}

/** The {@link RenderMode} → {@link RenderModeDyn} table (F-RENDER-DYN). `solid` = identity. */
export const RENDER_MODE_DYN: Readonly<Record<RenderMode, RenderModeDyn>> = {
  solid: { speed: 1, vision: 1, social: 1, jitter: 1 },
  wire: { speed: 0.85, vision: 1.1, social: 1.0, jitter: 0.9 }, // skeletal, deliberate
  ghost: { speed: 1.15, vision: 1.0, social: 0.7, jitter: 1.1 }, // intangible, aloof
  neon: { speed: 1.1, vision: 1.25, social: 1.2, jitter: 1.0 }, // hyperaware, gregarious
  chrome: { speed: 1.0, vision: 1.0, social: 1.35, jitter: 0.85 }, // social beacon, orderly
  hologram: { speed: 1.2, vision: 1.15, social: 0.85, jitter: 1.15 }, // flickery, quick
  iridescent: { speed: 1.05, vision: 1.1, social: 1.1, jitter: 1.05 }, // shimmering, lively
  plasma: { speed: 1.25, vision: 1.1, social: 0.9, jitter: 1.3 }, // volatile, hot
  obsidian: { speed: 0.9, vision: 0.95, social: 1.25, jitter: 0.8 }, // dense, deliberate
  prismatic: { speed: 1.1, vision: 1.2, social: 1.15, jitter: 1.1 }, // shimmering, refractive
};

/** Lower clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MIN = 0.1;

/** Upper clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MAX = 10.0;

/**
 * Discrete CHAOS levels the chaos control snaps through (F-CHAOS-ENTROPY) — "variations and
 * levels" rather than a single boost. Ascending; the control steps to the next and wraps from the
 * top back to the calmest. Spans CHAOS_MIN..CHAOS_MAX.
 */
export const CHAOS_LEVELS = [0.1, 0.5, 1, 2, 4, 7, 10] as const;

/** Upper clamp for the bipolar ENTROPY axis (F-CHAOS-ENTROPY): order / heat-death / uniformity. */
export const ENTROPY_MAX = 10.0;

/** One press of the entropy control raises entropy by this much (a quarter of the range). */
export const ENTROPY_STEP = ENTROPY_MAX / 4;

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
