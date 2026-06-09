# Module Contracts

Binding spec for every module in this repo. Writer agents and humans MUST conform exactly —
`world.ts`/`main.ts` (the composition root) are written against these signatures, sight unseen.

## Ground rules

1. **Source of truth**: the legacy monolith at `legacy/cosmogonic-quantum-mechalogodrom.html`
   (882 lines). Port behavior faithfully unless a Known Bug below says otherwise.
2. **Style**: Prettier (100 cols, single quotes, semicolons, trailing commas). 2-space indent.
3. **TypeScript**: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
   `verbatimModuleSyntax`. No `any` (use `unknown` + narrowing). No `@ts-ignore`/`@ts-expect-error`.
   Where an index access is provably in range, prefer restructuring; `!` only with a one-line
   invariant comment.
4. **Imports**: extensionless relative imports (`../math/rng`). `import * as THREE from 'three'`.
   Type-only imports use `import type`. Leaf modules (`math/*`, `logging/*`, `memory/*`,
   `sim/constants`, `audio/songs`) must not import `src/types.ts` at runtime (`import type` is fine).
5. **Hot paths are allocation-free**: no `new`, array literals, closures, or string building inside
   per-frame `update()` bodies. Reuse module-level scratch objects (document them).
6. **Every exported symbol gets JSDoc**; hot-path functions document time complexity (e.g.
   `O(k) where k = neighbors in radius`).
7. **Determinism**: the sim NEVER calls `Math.random()`. All randomness flows through the injected
   `Rng` (`SimContext.rng` or a constructor arg). This makes runs reproducible from a seed and
   benchmarks stable.
8. Browser globals only in `src/ui`, `src/core/engine.ts`, `src/audio/engine.ts`,
   `src/logging/audit.ts`, `src/memory/store.ts`, `src/main.ts`. Pure logic (math, algorithms,
   morphotypes, constants, songs data) must run under `bun test` with no DOM.

## Known bugs in the legacy file — fix during port

| #   | Legacy lines          | Bug                                                                                        | Required fix                                                                                                                                      |
| --- | --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 557                   | Music pitch multiplier `0.5+Math.floor(st/8)*0.5` grows unbounded — song drifts ultrasonic | Wrap octave: `0.5 + (Math.floor(st / 8) % 4) * 0.5`                                                                                               |
| 2   | 588                   | Toggling music off leaves the scheduler interval running                                   | `clearInterval` on toggle-off                                                                                                                     |
| 3   | 556                   | Scheduler keeps queueing oscillators while tab is hidden (burst on resume)                 | Guard callback with `document.hidden`; also suspend/resume AudioContext on `visibilitychange`                                                     |
| 4   | 688, 695-696, 856-868 | `getElementById` + fresh `{length}` object every frame in the render loop                  | UI caches element refs once; sorting passes the pre-allocated `Float32Array` + live length                                                        |
| 5   | 365                   | `SG.query` allocates a result array per call (hundreds/frame)                              | Shared reusable result buffer, documented "valid until next query"                                                                                |
| 6   | 878                   | Resize never reapplies pixel ratio (monitor moves)                                         | `setPixelRatio(min(devicePixelRatio, dprCap))` in resize                                                                                          |
| 7   | 124-129               | Icon-only toolbar buttons have no accessible name                                          | `aria-label` + `title` on every control                                                                                                           |
| 8   | 625-631               | Joystick reads `touches[0]` — wrong finger under multi-touch                               | Track by pointer/touch identifier                                                                                                                 |
| 9   | throughout            | `Math.random()` everywhere — non-reproducible                                              | Seeded `mulberry32` Rng injection (rule 7)                                                                                                        |
| 10  | 614                   | Touch roll/tilt buttons rotate INVERSE of the Z/X/R/F keys they mirror                     | Signs must match keyboard: rleft→rz +1, rright→rz −1, tup→rx +1, tdown→rx −1                                                                      |
| 11  | 606-607               | Held keys stick when window blurs (camera keeps flying, Space keeps bursting)              | `window.addEventListener('blur', clear-all-keys)` in InputSystem                                                                                  |
| 12  | 841                   | `curve.getPointAt(t)` allocates a Vector3 per packet per frame                             | Pass target: `cu.getPointAt(t, pkt.position)`                                                                                                     |
| 13  | 818-820               | Connectome uploads the full 4000-segment buffers even with few links                       | three 0.184: `attr.clearUpdateRanges(); attr.addUpdateRange(0, links * 6);` before `needsUpdate` (same for QuantumCloud color uploads if partial) |
| 14  | 167, 584, 592         | `mutations` counter is write-only                                                          | Surface it: `TelemetrySnapshot.mutations` + telemetry row `#v8`                                                                                   |

Also: the control pad gains yaw buttons (`data-a="yleft"`/`"yright"` → `camVel.ry` ±1) so touch
users get the C/V yaw the keyboard has — this makes the legacy dead `camVel.ry` path live.

## File-by-file contracts

### src/math/scalar.ts (leaf)

```ts
export const TAU: number;
export function lerp(a: number, b: number, t: number): number;
export function clamp(v: number, lo: number, hi: number): number;
/** Squared distance; avoids sqrt for threshold compares. O(1). */
export function dist2(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number;
export function dist2XZ(ax: number, az: number, bx: number, bz: number): number;
```

### src/math/rng.ts (leaf)

```ts
export type Rng = () => number; // uniform [0, 1)
/** Mulberry32 — fast 32-bit deterministic PRNG. */
export function mulberry32(seed: number): Rng;
/** FNV-1a string hash → uint32 seed. */
export function hashSeed(s: string): number;
```

### src/math/spatial-hash.ts (leaf)

```ts
/** Uniform-grid spatial hash over the XZ plane. insert O(1), query O(cells+k). */
export class SpatialHash<T extends { position: { x: number; z: number } }> {
  constructor(cellSize?: number); // default 8
  clear(): void;
  insert(item: T): void;
  /** Returns a SHARED buffer valid only until the next query() call. */
  query(x: number, z: number, radius: number): readonly T[];
}
```

Port of legacy `SG` (lines 358-367) with cell pooling kept and Known Bug 5 fixed.

### src/sim/constants.ts (leaf)

```ts
export const WEATHERS = ['CLEAR', 'RAIN', 'STORM', 'AURORA', 'VOID', 'FOG'] as const;
export type Weather = (typeof WEATHERS)[number];
export const BEHAVIORS = [
  /* the 26 names from legacy lines 277-279, same order */
] as const;
export type Behavior = (typeof BEHAVIORS)[number];
export const VIEW_MODES = ['free', 'orbit', 'fly', 'top'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
export const CHAOS_MIN = 0.1;
export const CHAOS_MAX = 10.0;
export const MORPH_COUNT = 100;
/** Legacy mCfg (line 400): [x, z, height, width, depth, hue, kind]. */
export const MONOLITH_CONFIG: ReadonlyArray<
  readonly [number, number, number, number, number, number, 'spire' | 'obelisk' | 'arch' | 'ring']
>;
/** Legacy pipeline endpoint index pairs (line 427). */
export const PIPE_LINKS: ReadonlyArray<readonly [number, number]>;
/** Legacy diorama configs (line 416): [x, y, z, radius, hue]. */
export const DIORAMA_CONFIG: ReadonlyArray<readonly [number, number, number, number, number]>;
```

### src/core/quality.ts

```ts
import type { QualityProfile } from '../types';
/** matchMedia + viewport heuristics; legacy lines 153-162 (+starCount 457). */
export function detectQuality(): QualityProfile;
```

### src/core/engine.ts

```ts
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  constructor(canvas: HTMLCanvasElement, quality: QualityProfile);
  /** Resize + reapply DPR (Known Bug 6). Bind to window resize in main.ts. */
  onResize(): void;
  render(): void;
}
```

Port of legacy lines 182-194 (ACES tone mapping, fog FogExp2 0x020310/0.003, camera 68° 0.1..900 at (0,25,55)). Modern three: set `outputColorSpace` default; shadows per quality.

### src/sim/geometry-cache.ts

```ts
/** Builds the ~41 shared BufferGeometries (legacy lines 230-274). Never disposed. */
export function createGeometryCache(): THREE.BufferGeometry[];
```

### src/sim/morphotypes.ts

```ts
import type { MorphType } from '../types';
/** 100 morphotypes (legacy 276-289), deterministic from rng. */
export function createMorphotypes(rng: Rng, geoCount: number): MorphType[];
```

### src/sim/algorithms.ts

```ts
import type { SortAlgo } from '../types';
/** The 20 sorting-field algorithms (legacy 206-228), behaviorally honest names. */
export const ALGOS: readonly SortAlgo[];
```

Signature change from legacy: `step(values: Float32Array, length: number, i: number)` — never read
indices ≥ length (fixes Known Bug 4's object copy).

### src/sim/behaviors.ts + src/sim/entities.ts (one writer)

`behaviors.ts` internal API is the writer's choice; `entities.ts` is its only consumer.

```ts
// entities.ts
export class EntityManager {
  readonly list: Entity[];
  constructor(ctx: SimContext);
  /** null when at quality.maxEntities cap. */
  spawn(pos: THREE.Vector3 | null, mi: number, scale?: number): Entity | null;
  /** Remove from scene + dispose per-entity material (geometry is shared — never disposed). */
  dispose(e: Entity): void;
  disposeAt(index: number): void;
  /** Geometry-swap + material rewrite, zero allocation (legacy 304-326). */
  remorph(e: Entity, mi: number): void;
  /** Dispose all, respawn `count` (legacy rSim, line 592). */
  reset(count: number): void;
  /** All 26 behaviors + physics + containment + auto-split + death (legacy 699-796). */
  update(dt: number, t: number): UpdateStats;
  setWireframe(on: boolean): void;
}
```

Behaviors read neighbors via `ctx.grid` (insert/rebuild is world.ts's job). The 'hunt' behavior
imports `MONOLITH_CONFIG` directly from constants.

### src/sim/shoggoths.ts

```ts
export class ShoggothSystem {
  constructor(ctx: SimContext, entities: EntityManager);
  readonly count: number;
  /** Lorenz-ish drift, tendrils via grid query, consumption + corrupted respawn (legacy 505-539). */
  update(dt: number, t: number): void;
}
```

### src/sim/puppet-masters.ts

```ts
export class PuppetMasterSystem {
  constructor(ctx: SimContext, entities: EntityManager, onEvent: (e: PuppetEvent) => void);
  readonly count: number;
  update(dt: number, t: number): void; // legacy 480-503; AETHON/SELENE/KRONOS
}
```

### src/sim/weather.ts

```ts
export class WeatherSystem {
  constructor(ctx: SimContext, engine: Engine);
  cycle(): Weather; // advance weatherIdx in ctx.state, return new weather
  apply(dt: number, t: number): void; // legacy 466-478: wind, temperature, fog, exposure
}
```

### src/sim/quantum.ts

```ts
export class QuantumCloud {
  constructor(ctx: SimContext);
  readonly signal: number; // mean |psi| last frame
  update(dt: number, t: number): void; // legacy 433-439 + 823-838 incl. collapse/respawn
}
```

### src/sim/connectome.ts

```ts
export class Connectome {
  constructor(ctx: SimContext, entities: EntityManager);
  readonly links: number;
  /** O(n·k) link rebuild; caller decides cadence (legacy 798-821). */
  update(dt: number, t: number): void;
}
```

### src/sim/environment.ts

```ts
export class EnvironmentSystem {
  constructor(ctx: SimContext); // builds monoliths, dioramas, pipelines, ground, grid, stars, nebulae, lights (legacy 369-464)
  update(dt: number, t: number): void; // legacy 840-852 animation
  /** Named sector for camera position (legacy 675-682). */
  sectorAt(pos: THREE.Vector3): string;
}
```

### src/audio/songs.ts (leaf)

```ts
import type { Song } from '../types'; // import type ONLY
export const SONGS: readonly Song[]; // legacy 197-203, 5 songs
export const SFX_TYPES: readonly SfxType[]; // legacy 204
```

### src/audio/engine.ts

```ts
export class AudioEngine {
  constructor(state: SimState); // reads songIdx
  /** Lazy AudioContext init; call from first user gesture. Safe to call repeatedly. */
  init(): void;
  musicOn: boolean; // read-only outside
  sfxOn: boolean;
  toggleMusic(): boolean; // Known Bugs 1-3 fixed
  toggleSfx(): boolean;
  cycleSong(): string; // advances state.songIdx, restarts scheduler if playing
  cycleSfxPreview(): string;
  play(type: SfxType): void; // legacy pS, 562-572
}
```

### src/ui/graphs.ts

```ts
/** Canvas sparkline with rolling buffer (legacy 600-603), HiDPI aware, cached 2d ctx. */
export class Sparkline {
  constructor(canvas: HTMLCanvasElement, color: string, fixedMax?: number);
  push(v: number): void;
  draw(): void;
}
```

### src/ui/hud.ts

```ts
export class Hud {
  constructor(); // caches #sec, #nm, #a-name, #a-step refs (Known Bug 4)
  showSector(name: string): void; // 2.5s fade (legacy showS)
  showToast(name: string, action: string): void; // 3s fade (legacy showNM)
  setAlgo(name: string, step: number, swapped: boolean): void;
}
```

### src/ui/panels.ts

```ts
export class TelemetryPanel {
  constructor(); // caches #v0..#v8, #ew #ewi #et #es #ep + 4 Sparklines (#g0..#g3)
  update(s: TelemetrySnapshot): void; // call ~every 8 frames; sparkline redraw every 18; #v8 = mutations
}
/** Collapsible panel headers: any [data-panel-toggle] toggles parent .col class. */
export function bindPanelToggles(): void;
```

### src/ui/input.ts

```ts
export class InputSystem {
  constructor(actions: UiActions);
  readonly keys: Readonly<Record<string, boolean>>;
  readonly camVel: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  readonly touch: { active: boolean; x: number; y: number };
}
```

Binds: keyboard (legacy 606-607 incl. Tab/space preventDefault), `[data-a]` movement/sim buttons
(pointerdown/up/leave/cancel, legacy 612-621), `[data-action]` toolbar buttons → UiActions,
joystick `#jP`/`#jK` with identifier tracking (Known Bug 8), and one-shot audio unlock that calls
`actions` indirectly (world wires `AudioEngine.init` into its action impls — input just forwards).

### src/logging/logger.ts (leaf)

```ts
export function createLogger(scope: string): Logger; // console + shared ring buffer (512)
export function getRecentLogs(): readonly LogEntry[];
```

### src/logging/audit.ts (leaf — browser)

```ts
export class AuditTrail {
  constructor(opts?: { endpoint?: string; max?: number }); // default endpoint '/api/audit', max 200
  /** Records locally (ring + localStorage 'cqm.audit.v1') and fire-and-forget POSTs JSON. O(1). */
  record(action: string, detail?: Record<string, unknown>): void;
  entries(): readonly AuditEntry[];
}
```

### src/memory/store.ts (leaf — browser)

```ts
export class MemoryStore {
  constructor(key?: string); // default 'cqm.state'
  /** Versioned load with migration; null on missing/corrupt (never throws). */
  load(): PersistedState | null;
  save(s: PersistedState): void;
  defaults(): PersistedState; // version 1; seed = (0xc05a06 ^ ((performance.now() * 1000) | 0)) >>> 0 — varied per boot yet reproducible once persisted
}
```

### server.ts (repo root)

Bun fullstack server:

```ts
import index from './index.html';
import docs from './docs.html';
```

`Bun.serve` routes: `/` → index, `/docs` → docs, `GET /api/health` → JSON
`{ ok, uptime, version }`, `GET /api/audit` → **HTML fragment** (`<ol>` of recent entries, newest
first) for HTMX polling, `POST /api/audit` → append `{ action, detail?, ts }` into an in-memory
ring (cap 200), 404 fallback. Port `Number(process.env.PORT) || 3000`. Log requests via
`createLogger('server')`.

### index.html + docs.html + src/styles/app.css (one writer)

- `index.html`: app shell. `<canvas id="c">`, telemetry panel `#sP` (rows `#v0..#v8`, env rows
  `#ew #ewi #et #es #ep`, sparkline canvases `#g0..#g3`), control panel `#cP` (movement `[data-a]`:
  fwd/back/left/right/up/down/rleft/rright/tup/tdown/yleft/yright; sim `[data-a]`:
  split/burst/mutate/chaos),
  bottom toolbar `#bar` buttons `[data-action]`: music/song/sfx/sfxcycle/reset/time/wire/view/algo/
  weather/apoc — each with `aria-label` AND `title` (Known Bug 7), `#sec`, `#nm`, `#alg` (`#a-name`,
  `#a-step`), joystick `#joy > #jP > #jK`, audit panel `#aP` with
  `hx-get="/api/audit" hx-trigger="load, every 5s" hx-swap="innerHTML"`.
  Scripts: `<script type="module" src="./src/main.ts">`. Stylesheet `./src/styles/app.css`.
  Inline SVG favicon data URI. OG/description meta from legacy 6-9.
- Styling: Tailwind utilities; glassmorphic panels (backdrop-blur, translucent slate/cyan borders);
  typography per docs/WIREFRAMES.md type scale — `Inter Variable` for UI labels (uppercase,
  tracking-widest, 10-11px), `JetBrains Mono` for numerals/telemetry (tabular-nums). Custom theme
  tokens via `@theme` in app.css (colors: void #030612, accent #0ef, warn #fa0).
- `app.css`: `@import 'tailwindcss';` + `@theme` tokens + the few non-utility rules (panel collapse
  state, joystick circle, safe-area padding).
- `docs.html`: standalone page importing `mermaid` (npm) in a module script; renders inline
  architecture + ERD + sequence diagrams (mirrors docs/\*.md sources); link back to `/`.
- HTMX: `import 'htmx.org'` inside main.ts is NOT yours — instead docs.html doesn't need it;
  index.html gets it via main.ts (composition root). Just write the `hx-*` attributes.

### Docs/legal writer

README.md (hero, feature list, quickstart `bun install && bun dev`, scripts table, architecture
mermaid digest, repo layout tree, links to all docs, license/legal section), LICENSE (MIT,
"Copyright (c) 2026 0thernes"), NOTICE.md (three/MIT, htmx/0BSD, tailwindcss/MIT, mermaid/MIT,
simplex-noise/MIT, Inter & JetBrains Mono/OFL-1.1, bun runtime note), SECURITY.md, CONTRIBUTING.md
(bun workflow, `bun run check` gate), CHANGELOG.md (Keep-a-Changelog, 0.1.0), docs/ARCHITECTURE.md
(mermaid `graph TD` of modules matching this contract + data-flow + frame pipeline),
docs/ERD.md (mermaid `erDiagram`: ENTITY, MORPHOTYPE, BEHAVIOR, SHOGGOTH, PUPPET_MASTER, WEATHER,
SONG, AUDIT_EVENT, PERSISTED_STATE + relationship narrative (ERM) + `sequenceDiagram`/`stateDiagram`
process models (ERP)), docs/WIREFRAMES.md (ASCII wireframes desktop/mobile + typography scale +
spacing/color tokens), docs/COMPLEXITY.md (per-hot-path big-O table: spatial hash, behaviors,
connectome, quantum, sort step, with n/k definitions), docs/adr/0001-bun-runtime.md,
0002-threejs-rendering.md, 0003-htmx-tailwind-ui.md, 0004-deterministic-rng.md (context/decision/
consequences format).

### Benchmarks writer

`bench/index.ts` (imports+runs all groups via mitata `run()`), `bench/spatial-hash.bench.ts`
(insert/clear/query at 1k entities, plain `{position:{x,z}}` objects — no three),
`bench/rng.bench.ts` (mulberry32 vs Math.random), `bench/algorithms.bench.ts` (each ALGOS.step on
a 650-length Float32Array), `bench/scalar.bench.ts`. Use `group`/`bench` from mitata; deterministic
inputs (mulberry32(42)).

### Tests (split among owning writers)

`tests/scalar.test.ts`, `tests/rng.test.ts` (determinism: same seed ⇒ same sequence; range),
`tests/spatial-hash.test.ts` (insert/query correctness vs brute force on seeded data, shared-buffer
semantics), `tests/algorithms.test.ts` (every algo: step never returns out-of-range indices for
lengths 0,1,2,5,650; repeated application with swaps applied strictly reduces inversions or
terminates ≤ 50·n² steps on a 16-element seeded array), `tests/store.test.ts` (round-trip, corrupt
JSON ⇒ null, version migration stub) — uses a Map-backed localStorage shim when `globalThis.localStorage`
is absent under bun, `tests/audit.test.ts` (ring cap, localStorage shim, fetch stubbed).

## Frame pipeline (implemented by world.ts — for reference)

```
rAF → dt = min(clock.delta, 0.05) * timeScale
  → camera (view mode) → weather.apply → puppetMasters.update
  → grid rebuild (every 2nd frame) → shoggoths.update → sort step (ALGOS[algoIdx])
  → entities.update → connectome.update (cadence by n) → quantum.update
  → environment.update → telemetry (every 8th frame) → render
```
