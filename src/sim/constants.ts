/**
 * Simulation constants ported verbatim from the legacy monolith
 * (`legacy/cosmogonic-quantum-mechalogodrom.html`). Leaf module: imports nothing
 * at runtime so it stays loadable under `bun test` with no DOM and no three.js.
 */

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

/** Lower clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MIN = 0.1;

/** Upper clamp for the chaos parameter, legacy line 168. */
export const CHAOS_MAX = 10.0;

/** Number of procedurally generated morphotypes, legacy `GM` (line 169). */
export const MORPH_COUNT = 100;

/** Monolith silhouette kind — selects the decorative crown built per monolith. */
export type MonolithKind = 'spire' | 'obelisk' | 'arch' | 'ring';

/**
 * Monolith layout, legacy `mCfg` (line 400). Tuple layout:
 * `[x, z, height, width, depth, hue, kind]`. Indexed by {@link PIPE_LINKS}.
 */
export const MONOLITH_CONFIG: ReadonlyArray<
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
 * Floating diorama configs, legacy line 416. Tuple layout:
 * `[x, y, z, radius, hue]`.
 */
export const DIORAMA_CONFIG: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-22, 20, -12, 5.5, 0.0],
  [22, 24, -18, 5, 0.3],
  [-12, 32, 22, 4.5, 0.55],
  [32, 17, 28, 6, 0.75],
  [-38, 27, -28, 4, 0.15],
  [0, 38, -34, 6.5, 0.45],
  [48, 22, -12, 4.5, 0.85],
  [-48, 30, 18, 4.2, 0.6],
];
