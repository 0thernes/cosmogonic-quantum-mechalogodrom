<!-- reviewed: 2026-07-10 | corrected corpus and organism-intelligence contract | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Module Contracts

**TSOTCHKE MASTER WIRE ERA (v0.22.0):** 22 external repositories are represented as `8 deep`,
`7 wired`, `2 harvest`, `4 fenced`, and `1 meta` (`17/21` non-meta integrated); `OBLITERATUS` is one
of the four fences and `classical-contrast` is an internal control. Direct ports, deterministic facades,
harvests, and fences must remain distinct. See `docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md` and
`docs/VERIFICATION-ANALYTICAL-DATA.md`.

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

**V10+ Petri genesis:** Tsotchke substrates + primordial-soup/petri-dish/digital-biologics follow the real-math rule; see `docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md`.

## Tsotchke wiring contracts (paramount)

- `tsotchke-registry.ts`: exactly 22 external repositories mapped to explicit depth, integration-mode,
  and source-boundary fields. The four fences are `gpt2-basic`, `llm-arbitrator`,
  `SolanaQuantumFlux`, and `OBLITERATUS`; `.github` is metadata; `Quantum-RNG-API` is harvest/toolchain.
  `classical-contrast` is separately ledgered as an internal operational control. Do not count it as an
  external repository.
- `tsotchke-organism-intelligence.ts`: one bounded-cadence shared field with a reused signal object.
  Integrated repository channels may affect resource, threat, exploration, social, forecast, and
  plasticity terms; all four fences and metadata must remain exactly inert. Consumers may not allocate
  per entity to recompute the shared O(22) field.
- `primordial-soup.ts` + `petri-dish.ts`: Digital biologics birth engine. Eshkol AD for mutation on `eshkolProgram` genomes. Full corpus flux for catalysis. New strains emerge with substrate-specific forms.
- `eshkol-bridge.ts`: Consciousness engine (AD, GWT, inference) from Eshkol corpus. Used for program eval + ignition in soup/mind.
- Leaves such as moonlab-tensor, qge-\*, irrep-symmetry, PINN, PIMC, ULG, logo, and RNG must preserve
  their registry-declared relationship: direct port, deterministic facade, or adaptation. A facade is
  never described as native parity. The QRNG path is a seeded classical statevector adaptation pinned to
  upstream v3.0.1, not hardware entropy or a CSPRNG.
- `super-mind.ts` / `godform.ts`: Super Creature is initial nucleation. Faculties must incorporate Tsotchke substrates (not replace with LLM).
- Determinism: All biologics evolution seeded. No tokenization.

New systems (digital biologics, soup genesis) must follow real-math rule + read/write at least one existing system.

## Known bugs in the legacy file — fix during port

| #   | Legacy lines          | Bug                                                                                        | Required fix                                                                                                                                        |
| --- | --------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 557                   | Music pitch multiplier `0.5+Math.floor(st/8)*0.5` grows unbounded — song drifts ultrasonic | Wrap octave: `0.5 + (Math.floor(st / 8) % 4) * 0.5`                                                                                                 |
| 2   | 588                   | Toggling music off leaves the scheduler interval running                                   | `clearInterval` on toggle-off                                                                                                                       |
| 3   | 556                   | Scheduler keeps queueing oscillators while tab is hidden (burst on resume)                 | Guard callback with `document.hidden`; also suspend/resume AudioContext on `visibilitychange`                                                       |
| 4   | 688, 695-696, 856-868 | `getElementById` + fresh `{length}` object every frame in the render loop                  | UI caches element refs once; sorting passes the pre-allocated `Float32Array` + live length                                                          |
| 5   | 365                   | `SG.query` allocates a result array per call (hundreds/frame)                              | Shared reusable result buffer, documented "valid until next query"                                                                                  |
| 6   | 878                   | Resize never reapplies pixel ratio (monitor moves)                                         | `setPixelRatio(min(devicePixelRatio, dprCap))` in resize                                                                                            |
| 7   | 124-129               | Icon-only toolbar buttons have no accessible name                                          | `aria-label` + `title` on every control                                                                                                             |
| 8   | 625-631               | Joystick reads `touches[0]` — wrong finger under multi-touch                               | Track by pointer/touch identifier                                                                                                                   |
| 9   | throughout            | `Math.random()` everywhere — non-reproducible                                              | Seeded `mulberry32` Rng injection (rule 7)                                                                                                          |
| 10  | 614                   | Touch roll/tilt buttons rotate INVERSE of the Z/X/R/F keys they mirror                     | Signs must match keyboard: rleft→rz +1, rright→rz −1, tup→rx +1, tdown→rx −1                                                                        |
| 11  | 606-607               | Held keys stick when window blurs (camera keeps flying, Space keeps bursting)              | `window.addEventListener('blur', clear-all-keys)` in InputSystem                                                                                    |
| 12  | 841                   | `curve.getPointAt(t)` allocates a Vector3 per packet per frame                             | Pass target: `cu.getPointAt(t, pkt.position)`                                                                                                       |
| 13  | 818-820               | Connectome uploads the full 4000-segment buffers even with few links                       | three 0.185.1: `attr.clearUpdateRanges(); attr.addUpdateRange(0, links * 6);` before `needsUpdate` (same for QuantumCloud color uploads if partial) |
| 14  | 167, 584, 592         | `mutations` counter is write-only                                                          | Surface it: `TelemetrySnapshot.mutations` + telemetry row `#v8`                                                                                     |

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

### src/math/eshkol-ad.ts (leaf, Tsotchke)

```ts
/** Reverse-mode automatic differentiation via Wengert tape. O(n) backward pass. */
export enum AdOpType {
  AD_ADD,
  AD_SUB,
  AD_MUL,
  AD_DIV,
  AD_SIN,
  AD_COS,
  AD_EXP,
  AD_LOG,
  AD_SQRT,
  AD_POW,
  AD_NEG,
  AD_ABS,
  AD_RELU,
  AD_SIGMOID,
  AD_TANH,
  AD_CONST,
  AD_VAR,
}
export interface AdTape {
  nodes: AdNode[];
  len: number;
  cap: number;
}
export interface AdNode {
  op: AdOpType;
  value: number;
  gradient: number;
  left: number;
  right: number;
  saved: number;
}
export function adTapeNew(initialCapacity?: number): AdTape;
export function adConst(tape: AdTape, value: number): number;
export function adVar(tape: AdTape, value: number): number;
export function adAdd(tape: AdTape, left: number, right: number): number;
export function adSub(tape: AdTape, left: number, right: number): number;
export function adMul(tape: AdTape, left: number, right: number): number;
export function adDiv(tape: AdTape, left: number, right: number): number;
export function adPow(tape: AdTape, base: number, exponent: number): number;
export function adSin(tape: AdTape, input: number): number;
export function adCos(tape: AdTape, input: number): number;
export function adExp(tape: AdTape, input: number): number;
export function adLog(tape: AdTape, input: number): number;
export function adSqrt(tape: AdTape, input: number): number;
export function adNeg(tape: AdTape, input: number): number;
export function adAbs(tape: AdTape, input: number): number;
export function adRelu(tape: AdTape, input: number): number;
export function adSigmoid(tape: AdTape, input: number): number;
export function adTanh(tape: AdTape, input: number): number;
export function adBackward(tape: AdTape, output: number): void;
export function adGradient(tape: AdTape, node: number): number;
export function adValue(tape: AdTape, node: number): number;
export function adTapeReset(tape: AdTape): void;
export function adTapeLen(tape: AdTape): number;
```

Port of tsotchke/Eshkol AD primitive (lib/backend/vm_autodiff.c, lib/core/runtime_autodiff.cpp). Deterministic, allocation-free hot paths, nested gradients via tape.

### src/math/quantum-qrng-full.ts (leaf, Tsotchke)

```ts
import type { Rng } from './rng';
import { EshkolQrng, type EshkolQrngSnapshot } from './eshkol-qrng';

export interface BellTestResult {
  S: number;
  violation: boolean;
  correlations: number[];
}
export interface EntropyEstimate {
  entropy: number;
  uniformity: number;
}
export class QuantumRngFull extends EshkolQrng {
  constructor(seed: Rng);
  bellTest(): BellTestResult;
  entropy(): EntropyEstimate;
  snapshotFull(): EshkolQrngSnapshot & { bell: BellTestResult; entropy: EntropyEstimate };
}
export function bellTestWithRng(rng: Rng): BellTestResult;
export function entropyWithRng(rng: Rng): EntropyEstimate;
```

Extends Eshkol QRNG with Bell inequality verification (CHSH S parameter) and Shannon entropy estimation. Port of tsotchke/moonlab Bell test algorithms.

### Tsotchke modules (depth-ledger wired — paramount)

- `tsotchke-registry.ts`: O(1) map of all repos to SubstrateKind + wiring + leaf. Drives soup, godform, Archons. Deterministic.
- `eshkol-bridge.ts`: Consciousness-proxy engine (Eshkol AD/GWT/inference/sentience markers). Prealloc. Used by soup, super-mind.
- `primordial-soup.ts` + `petri-dish.ts`: Petri dish for digital biologics. Full Tsotchke catalysis, birth, mutation (AD-inspired, GWT). Allocation friendly.
- `godform.ts`: Archon biases + .esk programs from corpus.
- `moonlab-tensor.ts`, `irrep-symmetry.ts`, `qge-*`, `ulg-bridge.ts` etc.: Real contributions from every wired scientific repo (no stubs for wired).
- Fenced (gpt2-basic, llm-arbitrator, onchain): study/observatory only, never in deterministic sim.

See `src/sim/tsotchke-*.ts`, registry, README, reports for wiring matrix.

### src/sim/constants.ts (leaf)

```ts
export const WEATHERS = ['CLEAR', 'RAIN', 'STORM', 'AURORA', 'VOID', 'FOG'] as const;
export type Weather = (typeof WEATHERS)[number];
export const BEHAVIORS = [/* the 26 names from legacy lines 277-279, same order */] as const;
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
  typography per docs/DESIGN-SYSTEM-2026-06-26.md type scale — `Inter Variable` for UI labels (uppercase,
  tracking-widest, 10-11px), `JetBrains Mono` for numerals/telemetry (tabular-nums). Custom theme
  tokens via `@theme` in app.css (colors: void #030612, accent #0ef, warn #fa0).
- `app.css`: `@import 'tailwindcss';` + `@theme` tokens + the few non-utility rules (panel collapse
  state, joystick circle, safe-area padding).
- `docs.html`: standalone page importing `mermaid` (npm) in a module script; renders inline
  architecture + ERD + sequence diagrams (mirrors docs/\*.md sources); link back to `/`.
- HTMX: `import 'htmx.org'` inside main.ts is NOT yours — instead docs.html doesn't need it;
  index.html gets it via main.ts (composition root). Just write the `hx-*` attributes.

### Docs/legal writer

AUDIT-LOG.md (hero, feature list, quickstart `bun install && bun dev`, scripts table, architecture
mermaid digest, repo layout tree, links to all docs, license/legal section), LICENSE (proprietary / All Rights Reserved,
"Copyright (c) 2026 0thernes"), NOTICE.md (three/MIT, htmx/0BSD, tailwindcss/MIT, mermaid/MIT,
simplex-noise/MIT, Inter & JetBrains Mono/OFL-1.1, bun runtime note), SECURITY.md, CONTRIBUTING.md
(bun workflow, `bun run check` gate), CHANGELOG.md (Keep-a-Changelog, 0.1.0), docs/ARCHITECTURE-2026-06-26.md
(mermaid `graph TD` of modules matching this contract + data-flow + frame pipeline),
docs/ENTITY-SCHEMA-AND-MAPPINGS-2026-06-26.md (mermaid `erDiagram`: ENTITY, MORPHOTYPE, BEHAVIOR, SHOGGOTH, PUPPET_MASTER, WEATHER,
SONG, AUDIT_EVENT, PERSISTED_STATE + relationship narrative (ERM) + `sequenceDiagram`/`stateDiagram`
process models (ERP)), docs/DESIGN-SYSTEM-2026-06-26.md (ASCII wireframes desktop/mobile + typography scale +
spacing/color tokens), docs/COMPLEXITY-2026-06-26.md (per-hot-path big-O table: spatial hash, behaviors,
connectome, quantum, sort step, with n/k definitions), docs/adr/0001-bun-runtime-2026-06-26.md,
0002-threejs-rendering-2026-06-26.md, 0003-htmx-tailwind-ui-2026-06-26.md, 0004-deterministic-rng-2026-06-26.md (context/decision/
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
  → entities.update → if NHI live: current-grid rebuild + NHI tick → connectome.update (cadence by n)
  → quantum.update
  → environment.update → telemetry (every 8th frame) → render
```

---

# CONTRACTS V2 — Quantum Wildbeyond expansion (0.2.0)

Seven new systems per docs/PHILOSOPHY-2026-06-26.md. Every system must READ from and WRITE
to at least one existing system (philosophy rule 4). All V1 ground rules apply
(strict TS, seeded Rng only, allocation-free update bodies, JSDoc + complexity).
File ownership is EXCLUSIVE — the named writer is the only agent touching a file.

## New telemetry/DOM contract additions

- `TelemetrySnapshot` (src/types.ts — integrator-owned, already updated) gains:
  `tribes: number` (graph communities), `trend: number` (population slope per
  minute), `qEntropy: number` (normalized 0..1 Shannon entropy of the quantum
  register), `lore: string` (current sub-sector lore name).
- index.html gains telemetry rows `#v9` (TRIBES), `#v10` (TREND, format `+x.x/m`
  or `-x.x/m`), `#v11` (QBIT-S, qEntropy.toFixed(2)), and a lore line `#lore`
  inside the `#alg` card under `#a-step`. TelemetryPanel caches and renders them.

## src/math/quantum.ts (writer: quantum) — statevector core

```ts
// Minimal statevector quantum register. Backend: pure TS (2^n complex amps as a
// Float64Array pair, allocation-free gate application). n <= 8 enforced.
export type GateName =
  'h' | 'x' | 'y' | 'z' | 's' | 't' | 'rx' | 'ry' | 'rz' | 'cx' | 'cz' | 'swap';
export class QuantumRegister {
  constructor(qubits: number); // throws if qubits < 1 or > 8
  readonly qubits: number;
  apply(gate: GateName, target: number, control?: number, theta?: number): void; // O(2^n)
  // Born-rule probabilities into a REUSED Float64Array (valid until next call). O(2^n).
  probabilities(): Float64Array;
  // Normalized Shannon entropy of probabilities, 0..1. O(2^n).
  entropy(): number;
  // Probabilistic collapse using rng; returns basis index, resets register to |i>.
  measure(rng: Rng): number;
  reset(): void; // back to |0...0>
}
```

Pure TS implementation (no npm backend): for n=5 this is 32 complex amplitudes —
faster, smaller, and more testable than any bundled simulator; the
`quantum-circuit` npm package is CJS/oversized for this use (decision recorded
in ADR 0005, subject to the deep-research report's verdict).
Tests (tests/quantum.test.ts): H gives uniform probs; H·H = identity (within
1e-12); X flips; CX entangles a Bell pair (entropy = 1 bit normalized); measure()
respects rng stream determinism; probabilities sum to 1 ± 1e-9.
Bench (bench/quantum.bench.ts): apply('h'), apply('cx'), probabilities() at n=5.

## src/sim/qcircuit.ts (writer: quantum)

```ts
export class QuantumCircuitSystem {
  constructor(ctx: SimContext, register?: QuantumRegister); // default 5 qubits
  readonly entropy: number; // updated on cadence
  readonly lastCollapse: number; // basis index of last measurement, -1 if none
  // Event feeds: puppet-master actions apply characteristic gate sequences
  // (AETHON→rx(chaos·π/4), SELENE→h+cz, KRONOS→x+swap); sort swaps apply cx
  // with parity-chosen targets. Cheap O(2^n) per event.
  onPuppetEvent(e: PuppetEvent): void;
  onSortSwap(a: number, b: number): void;
  // World calls every 30 frames: drift gate ry(theta from chaos), recompute
  // entropy; every 8th update() measure() and expose the collapse.
  update(): void;
  // Per-6-frame hook for QuantumCloud: per-band hues derived from the 32 basis
  // probabilities, written into a REUSED Float32Array (32 entries, 0..1).
  bands(): Float32Array;
}
```

QuantumCloud amendment (writer: quantum also owns src/sim/quantum.ts edits): add
`setQuantumBands(bands: Float32Array | null): void`; when set, the particle
color refresh keys hue off `bands[particleIndex % 32]` blended with the legacy
psi hue; a change in `lastCollapse` triggers a localized cloud implosion via
`implodeAt(basis)` (explicit API per the 0.2.1 amendments below) reusing the
existing collapse/respawn path — no new allocation.

## src/sim/reaction-diffusion.ts (writer: rd)

```ts
// Gray-Scott reaction-diffusion on a SIZE×SIZE grid (default 128), CPU
// typed-array ping-pong (two Float32Array pairs), allocation-free step.
// O(SIZE²) per step — <0.5 ms at 128; world runs it every 2nd frame.
export class ReactionDiffusionSystem {
  constructor(ctx: SimContext, size?: number);
  // three.js DataTexture bound to the U field — attach as ground emissiveMap.
  readonly texture: THREE.DataTexture;
  // Weather-coupled params: STORM raises feed, VOID raises kill, AURORA boosts
  // diffusion; chaos scales reaction rate. Reads ctx.state each step.
  step(): void;
  // Drop a seed disturbance at normalized (u,v) — wired to entity deaths.
  perturb(u: number, v: number, radius?: number): void;
}
```

EnvironmentSystem amendment (writer: rd MAY edit src/sim/environment.ts ONLY to
add `attachGroundEmissiveMap(tex: THREE.Texture): void` and an emissiveIntensity
coupling on the ground material; touch nothing else in the file).
Tests (tests/reaction-diffusion.test.ts): field stays finite over 500 steps;
uniform field stays uniform without perturbation; perturbation breaks symmetry;
identical fields across two same-seed runs.
Bench (bench/reaction-diffusion.bench.ts): one step() at size 128.

## src/sim/graph-mind.ts (writer: graph) — deps: graphology, graphology-communities-louvain, graphology-metrics

```ts
// Mirrors the connectome into a graphology Graph on a slow cadence and runs
// community detection + pagerank; results drive link colors and entity halos.
export class GraphMind {
  constructor(ctx: SimContext, entities: EntityManager, connectome: Connectome);
  readonly tribes: number; // community count from last louvain pass
  // World calls every 240 frames: rebuild graph from connectome.pairs, run
  // louvain (rng option = ctx.rng for determinism), write community index into
  // each member entity's userData.setGroup (the set-theory behavior becomes
  // tribe-aware — true feedback), and install a community palette on the
  // connectome via setCommunityOf.
  updateCommunities(): void;
  // World calls every 600 frames (offset 300 — NOT 120: offset 120 collides
  // with the 240f louvain cadence at frame 720 and every 1200f after, stacking
  // both heavy passes on one frame; 300 mod 240 alternates 60/180 and never
  // collides): pagerank; the top-20 entities get an emissiveIntensity floor
  // boost while their rank holds.
  updateRank(): void;
}
```

Connectome amendment (writer: graph also owns src/sim/connectome.ts edits):
expose `readonly pairs: Uint32Array` + `readonly pairCount: number` (entity-list
index pairs per link, filled during the rebuild it already performs — zero extra
cost) and `setCommunityOf(fn: ((entityIndex: number) => number) | null): void` —
when set, link hue offsets by community index (8-hue palette) instead of pure
time hue.
Tests (tests/graph-mind.test.ts): graph build from synthetic pairs; louvain on a
two-cluster synthetic graph finds ≥ 2 communities; deterministic with seeded rng.

## src/sim/constellations.ts (writer: cosmos) — dep: d3-delaunay

```ts
// Voronoi sky-web over the 24 static monolith+diorama XZ sites, built ONCE at
// construction (O(n log n)): cell edges as faint LineSegments at y≈55 plus site
// links along Delaunay edges. Per-frame update is O(1) opacity/pulse work.
export class ConstellationSystem {
  constructor(ctx: SimContext, lore: LoreEngine);
  // O(log n) point location via voronoi.find; returns the lore name of the cell.
  subSectorAt(pos: THREE.Vector3): string;
  update(t: number, bands: AudioBands): void;
}
```

## src/sim/lore.ts (writer: cosmos) — dep: @noble/hashes (sha2 / sha256)

```ts
// Deterministic cosmic lore: sha256(seed || kind || index) → syllabic names
// (digest bytes index a curated syllable table), epithets and omens. Pure leaf.
export class LoreEngine {
  constructor(seed: number);
  name(kind: 'sector' | 'tribe' | 'star' | 'omen', index: number): string; // memoized
  epithet(kind: 'puppet' | 'weather' | 'collapse', key: string): string; // memoized
}
```

Tests (tests/lore.test.ts): same seed+args ⇒ same name; different seeds diverge;
names are 2–4 syllables from a pronounceable charset.

## src/audio/analysis.ts (writer: audio2) + AudioEngine amendment

AudioEngine (writer: audio2 also owns src/audio/engine.ts edits): add
`tapAnalyser(): AnalyserNode | null` — lazily creates ONE AnalyserNode (fftSize
256, smoothingTimeConstant 0.8) and fan-out connects both the music and sfx gain
nodes into it (in addition to destination); returns null before init().

```ts
// src/audio/analysis.ts
export interface AudioBands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
} // 0..1
export class AudioAnalysis {
  constructor(audio: AudioEngine);
  // Per-frame poll into a pre-allocated Uint8Array; exponential smoothing;
  // zeros when audio is uninitialized. O(fftSize/2). Returns a REUSED object.
  update(): AudioBands;
}
```

World couples bands — the FINAL shipped set (0.2.1): bass shimmers the
six-light rig via `EnvironmentSystem.setAudioBass`, treble pulses the
constellation cells (the `bands` argument of `constellations.update`), level
breathes the quantum-cloud point size via `QuantumCloud.setBreath` —
multipliers ≤ 0.35 so a silent world looks identical to v1. There is NO
exposure coupling: an earlier bass → toneMappingExposure offset accumulated
past the weather pullback and was removed in 0.2.1; exposure is owned by
`WeatherSystem.apply` exclusively.

## src/sim/analytics.ts (writer: analytics) — dep: simple-statistics

```ts
// Rolling-window telemetry science: 120-sample ring buffers (population,
// energy, links). Every 60 frames: mean/stddev + linearRegression slope →
// trend per minute; population z-score anomalies (|z| > 2.5) emit lore omens
// via audit.record('omen', ...) at most once per 30 s.
export class AnalyticsSystem {
  constructor(ctx: SimContext);
  readonly trendPerMin: number;
  push(population: number, energy: number, links: number): void; // every 8th frame
  analyze(): void; // every 60 frames
}
```

Tests (tests/analytics.test.ts): slope sign correctness on synthetic ramps;
anomaly fires once per window on a step impulse; ring buffers are pre-allocated.

## lab/quantum-wildbeyond.html (writer: lab) — algorithmic-art deliverable

Self-contained p5.js artifact expressing docs/PHILOSOPHY-2026-06-26.md. MUST start from the
skill template at
`C:\Users\Alexa\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\cdc38a9f-1e3b-4c72-a4e7-8d39e1ccb11d\5da6077d-38bd-4073-b218-1373e774ec00\skills\algorithmic-art\templates\viewer.html`
(Read it FIRST; keep header/sidebar/branding/seed controls/action buttons
EXACTLY; replace only the algorithm + parameter controls). Algorithm: "collapse
field" — particles flowing a blended Lorenz-XZ/curl-noise field, a Voronoi
shatter overlay echoing the 24 cosmos sites, interference rings on seeded
measurement events; params: particle count, collapse rate, field blend, trail
fade, palette shift. Seeded via randomSeed/noiseSeed. p5 from CDN only.
The server.ts `/lab` route is the INTEGRATOR's job — do not touch server.ts.

## Design system (writer: design) — owns index.html, src/styles/app.css, src/ui/panels.ts, src/ui/hud.ts, docs/DESIGN-SYSTEM-2026-06-26.md

1. Produce docs/DESIGN-SYSTEM-2026-06-26.md: full audit per the /design-system skill format
   (summary + score; naming consistency; token-coverage table counting hardcoded
   hex/px in app.css + index.html; component completeness for Panel,
   ToolbarButton, ControlPad key, TelemetryRow, Banner `#sec`, Toast `#nm`,
   AlgoCard, Sparkline, AuditFeed, Joystick — states/variants/docs scores), then
   token documentation (color roles incl. semantic accent/warn/danger + 8-hue
   tribe palette, type scale, spacing scale, radii, blur/elevation, motion
   durations + easings) and component docs with a11y notes.
2. Apply fixes: hoist remaining hardcoded values into @theme tokens; add
   :focus-visible rings on all interactive elements; prefers-reduced-motion
   damping for pulses/transitions; add telemetry rows #v9/#v10/#v11 + the #lore
   line + a small /lab link in #bar (aria-labeled).
3. Keep the visual identity (void/cyan glass) — elevate, don't redesign.
4. TelemetryPanel renders the new rows; hud.ts gains `setLore(name: string)`.

## Frame pipeline V2 additions (integrator reference)

```
... entities.update → connectome.update (cadence)
  → qcircuit.update (every 30f; bands → quantum cloud every 6f)
  → quantum.update
  → rd.step (every 2nd frame, offset 1 from grid rebuild)
  → graphMind.updateCommunities (every 240f) / updateRank (every 600f, offset 300)
  → constellations.update (per frame, O(1)) with audio bands
  → environment.update
  → telemetry + analytics.push (every 8f)
  → analytics.analyze (every 60f)
  → render
Entity deaths (EntityManager.onDeath) call rd.perturb(death position
normalized to ground UV).
PuppetEvents fan out to qcircuit.onPuppetEvent + lore epithet in the toast.
Sort swaps call qcircuit.onSortSwap(a, b).
A changed qcircuit.lastCollapse triggers QuantumCloud.implodeAt(basis).
```

---

# CONTRACT AMENDMENTS — 0.2.1 (audit wave)

Binding API additions applied with the SKEPTIC-confirmed audit fixes. All V1/V2
ground rules hold (strict TS, seeded Rng, allocation-free per-frame paths,
JSDoc + complexity). `world.ts` (integrator) owns all wiring shown.

## src/ui/input.ts — InputSystem amendment

```ts
export class InputSystem {
  // ... V1 surface unchanged (keys, camVel, touch) ...
  /**
   * Pointer-look deltas (CSS px), accumulated while a drag that STARTED on the
   * `#c` canvas is active (pointer capture; first pointer wins, mirroring the
   * joystick's identifier tracking). The world reads dx/dy once per frame in
   * free view (rotation.y -= dx * 0.003, rotation.x -= dy * 0.003) and MUST
   * zero both fields afterwards — in EVERY view mode, so stale deltas never
   * accumulate while orbit/fly/top ignore them. Stable object identity.
   */
  readonly look: { dx: number; dy: number };
  /**
   * Wheel-zoom accumulator, deltaMode-normalized to ~pixels (line ×16,
   * page ×100); positive = zoom out. World consumes it each frame
   * (translateZ(zoom * 0.02) in free view) and resets it to 0. Mutable by
   * necessity: a readonly primitive could not be consumed-and-zeroed.
   */
  zoom: number;
}
```

The Known Bug 11 blur reset extends to the new state: window blur clears the
key map, camVel, joystick, the active look drag, and the look/zoom
accumulators.

## src/sim/entities.ts — EntityManager.onDeath

```ts
export class EntityManager {
  // ...
  /**
   * Death→ground feedback hook, invoked with the dying entity's world (x, z) exactly
   * once per disposal routed through `disposeAt()` — covering BOTH the age-death branch
   * of `update()` AND external consumers (shoggoth consumption, singularity event-horizon).
   * NOT fired by `reset()` (mass disposal is a genesis event, not a death). Null disables
   * (default). Allocation-free to invoke — passes coords, not the Entity ref (audit fix A).
   */
  onDeath: ((x: number, z: number) => void) | null;
}
```

World wiring: `entities.onDeath = (x, z) => { rd.perturb(0.5 + x / GROUND_EXTENT, 0.5 -
z / GROUND_EXTENT, 2); artifacts.placeGround(x, z, 'scar', elapsed); }` — the ground-UV
mapping of the plane (scar the corpse's UV + drop a scar relic).

## src/sim/quantum.ts — QuantumCloud.implodeAt + setBreath

```ts
export class QuantumCloud {
  // ...
  /**
   * Localized implosion anchored by basis index (0..31 for the 5-qubit
   * register): particles in the basis-keyed region run the existing
   * collapse/respawn path. O(q) worst case, no allocation. World calls it
   * when qcircuit.lastCollapse changes (every-30f check).
   */
  implodeAt(basis: number): void;
  /**
   * Audio-level point-size breathe (FINAL audio coupling set): size =
   * base · (1 + 0.35 · level), level clamped to [0, 1]; 0 restores the exact
   * legacy size. O(1) — applied during update().
   */
  setBreath(level: number): void;
}
```

## src/sim/environment.ts — EnvironmentSystem.setAudioBass

```ts
export class EnvironmentSystem {
  // ...
  /**
   * Bass shimmer on the fixed six-PointLight rig (legacy `lts`): each light's
   * animated intensity baseline is modulated by ≤ 0.35 · bass, bass clamped
   * to [0, 1]; 0 is exactly the legacy rig. O(6) ≡ O(1), applied in update().
   * This REPLACES the removed bass → toneMappingExposure offset — exposure is
   * weather-owned.
   */
  setAudioBass(bass: number): void;
}
```

## src/sim/analytics.ts — AnalyticsSystem.nameOmen

```ts
export class AnalyticsSystem {
  // ...
  /**
   * Lore-namer hook for omen audit records. Called at most once per omen
   * (rare path — the 30 s cooldown gates it) with a monotonically increasing
   * omen counter; the returned name is recorded as `name` in the omen detail.
   * Null (default) records the omen unnamed. World wires
   * `analytics.nameOmen = (i) => lore.name('omen', i)`.
   */
  nameOmen: ((index: number) => string) | null;
}
```

---

# CONTRACTS V3 — PANTHEON (0.3.0) — the /goal mandate

Summoner decree: up to 10,000 entities in an arena 5× larger; 10 creature
phyla (25 morphotypes each → 250 total) plus wildcard outliers; 10 colossal non-human
intelligences (TITANS) running a global economy and waging war under explicit
game theory; full-device responsive UI with real touch controls; live
data-viz; the QUANTUM-tier soundtrack (SHIPPED in 0.2.1 — songs.ts rescore).
All V1/V2 ground rules bind. Pending audit-fix findings (21, catalogued in the
wfmdqlias output) land FIRST in the same wave.

## V3.1 Scale & rendering (writer: scale)

- `core/quality.ts`: tier ladder via hardwareConcurrency + (deviceMemory ?? 8)
  - viewport: `phone 650 / laptop 2000 / desktop 5000 / ultra 10000` entities;
    quantum/links/stars scale proportionally; document the heuristics.
- `sim/constants.ts`: `ARENA = 5` export; all world geometry × ARENA: ground
  240→1200 (segments capped — displacement via larger wavelengths, not 5×
  vertices), containment radii (65/3600/4225 family), spawn volumes, monolith/
  diorama layout coordinates, camera far 900→2600, fog density ÷ ~ARENA,
  spatial-hash cell 8→16 (re-bench query radius hit rates), star shell radii.
- **InstancedMesh pools** (`sim/instanced-entities.ts`): above 1000 entities
  the per-entity `THREE.Mesh` path is replaced by one InstancedMesh per cached
  geometry (40 pools) with per-instance color + emissive-scalar attributes;
  EntityManager keeps the SAME public API (list of logical entities with
  userData) but `mesh` becomes a {poolId, slot} handle behind the Entity
  interface — contract the facade precisely before implementing; ≤1000 keeps
  the V1 path (tier decides at boot, no runtime switching). Benchmarks before
  AND after; 10k @ 60fps on the ultra tier is the acceptance gate (instancing,
  not draw-call-per-entity, is how).

## V3.2 Taxonomy (writer: phyla)

- `sim/phyla.ts`: 10 named phyla (lore-named via LoreEngine at boot), each a
  template distribution over geometry families, palette band, behavior pool,
  size/speed ranges, preferred sector. In phylum mode `createMorphotypes`
  grows to MORPHS_PER_PHYLUM (25) × PHYLUM_COUNT (10) = 250 morphotypes total
  (vs the legacy no-phyla MORPH_COUNT = 100); the count is tier-independent —
  tiers scale the entity ceiling, not the morphotype table. Morphotype → phylum
  index recorded in EntityData (`phylum: number`).
- Wildcard outliers: per-boot, seeded, ~1% of spawns draw an OUTLIER template:
  composite geometry (two cached geos merged at boot into extra pool slots),
  exotic behavior pairs (two behaviors blended), impossible palettes, named
  `lore.name('omen', i)`-style. Unknown features = seeded parameter excursions
  far outside phylum ranges, clamped only by NaN-safety bounds.

## V3.3 TITANS (writer: titans) — deps: none new; uses math/games

- `math/games.ts` (leaf): payoff matrices + iterated strategies (titForTat,
  grimTrigger, pavlov, alwaysDefect, generous variants), one
  `playRound(matrix, a, b, history)` pure function, replicator-dynamics step
  for population shares. Tests: known equilibria (PD defect-defect lock-in,
  stag-hunt coordination under generosity, replicator fixed points).
- `sim/titans.ts`: 10 colossal roaming intelligences (scaled shoggoth-class
  rigs, distinct silhouettes, lore names + epithets). Each holds an economy
  state {energy, matter, entropy}: PRODUCES by harvesting (entities consumed
  → matter; quantum collapses witnessed → energy; RD pattern density in their
  cell → entropy relief), CONSUMES per tick (upkeep scaling with size),
  WASTES (emits rd.perturb scars + local weather bias). Pairwise diplomacy on
  a slow cadence (every 600f, staggered): iterated PD with per-pair history →
  WAR/TRUCE/ALLIANCE states; WAR = territory strikes (localized burst+scatter
  at the rival's position, conscription remorphs nearby entities into the
  aggressor's phylum palette). Global ledger + war matrix exposed for
  telemetry/data-viz; every act audited with lore epithets. Game-theory depth:
  strategy mutation on bankruptcy (replicator over the 5 strategies), payoffs
  coupled to actual resource flows, not constants. **Body shader (V-TITAN-VITALS):**
  the freak-geometry body patch reads the titan's REAL economy via `uMenace`
  (war + clash-heat entropy → 4D writhe + void-glow + iris) plus two distinct lanes
  from exported pure `titanVitalLanes(energy, entropy)` → `uEnergy` (stellar-core
  forge — a fed titan burns a pulsing star-core) and `uEntropy` (waste-rot ashen
  fissures — a wasteful titan cracks, embers glowing in the rot). All `f(state)`, no
  rng; lanes clamped [0,1] + finite-guarded.

## V3.4 Responsive UI + touch (writer: responsive)

- Breakpoint system (app.css + index.html): phone portrait/landscape,
  foldable hinge-safe (env(fold)-tolerant flex wrap), tablet, laptop, TV
  (≥1900px: 10-foot UI — panel scale ×1.6, focus rings for d-pad).
  Flexbox/grid throughout; no fixed pixel panel positions at small sizes —
  telemetry and control become collapsible sheets docked top/bottom.
- Touch controls v2: replace the static directional pad on coarse pointers
  with (a) the existing drag joystick (move), (b) a second right-side drag
  pad for look (wired through input.look), (c) a radial action wheel
  (Split/Burst/Mutate/Chaos+ + Apoc center-long-press), all ≥44px targets,
  with haptics via navigator.vibrate where available (≤30ms, reduced-motion
  respected). Keyboard/mouse paths unchanged.
- `subSectorAt`/HUD font scale clamps for TV distance.

## V3.5 Live data-viz (writer: dataviz)

- `ui/observatory.ts` + panel `#oP`: canvas-rendered live charts, allocation-
  aware (pre-allocated rings, one 2d ctx each, redraw ≤ every 18f): stacked
  phylum population area, titan economy ledger lines (10 series), war-state
  matrix heat grid (10×10), RD pattern-energy + qEntropy timelines, trend
  band. Collapsible like other panels; HTMX-free (pure client); throttled on
  phone tier. TelemetrySnapshot grows: `phylumCounts: readonly number[]`,
  `titanLedger: readonly { name; energy; matter; war: number }[]` (REUSED
  arrays, documented).

## V3.6 Integration (integrator)

Frame additions: titans.update (per frame, internally cadenced), diplomacy
600f staggered, observatory.update 18f. The 21 pending audit fixes land
before V3 wiring. Acceptance: ultra tier 10k entities ≥55fps desktop, phone
tier unchanged ≥30fps budget share, zero console errors over a 3-minute soak
incl. a forced war + apocalypse; same-seed determinism preserved (titan
decisions draw from ctx.rng on frame cadences only).

---

## CONTRACT AMENDMENTS — 0.3.0 (integration wave, binding)

Deviations from and clarifications of the V3 goal spec, as landed:

1. **Arena scale split** — one `ARENA = 5` would make 50-110u monoliths
   250-550u skyscrapers and lift every hover height into fog. Landed as
   three knobs in `sim/constants.ts`: `ARENA = 5` (XZ coordinates,
   containment, sectors), `ARENA_Y = 2` (heights, ceilings, sky-web), and
   `ARENA_MID = 2.5` (mid-field actors: shoggoth posts, puppet orbits,
   quantum-cloud volumes, light-rig spread, camera motion). The legacy
   tuple tables stay authored at 1× and scale once at module init.
2. **Morph-table modulo** — every morph roll that was `% MORPH_COUNT` (100)
   is now `% ctx.morphs.length` (250 in phylum mode). `MORPH_COUNT` remains
   ONLY as the legacy-mode population size inside `createMorphotypes`.
3. **Outlier behavior blending** — `beh`+`beh2` blend TEMPORALLY: the
   second behavior runs on odd `(frame + i)` parity via swap-dispatch-restore
   (allocation-free), not as a vector average — behaviors mutate
   heterogeneous state and cannot be averaged safely.
4. **Instanced pools** — two pools per cached geometry (opaque,
   translucent), so ≤80 total; pooled materials run metalness/roughness at
   0.5/0.5 (per-instance PBR scalars rejected: two more attributes for an
   effect emissive dominates anyway) and cast NO shadows (legacy capped
   entity casters at 120). Per-instance channels: matrix, `instanceColor`,
   a vec4 `instEmissive` (rgb = emissive·intensity, a = opacity), and a vec4
   `instVitals` (x=wealth `energy/100`, y=senescence `age/life`, z=neural firing
   `act`, w=exertion `speed×8`; packed by exported pure `packVitals`), and a vec4
   `instVitals2` (x=strategy coop/defect, y=payoff `/5`, z=community hue
   `fract(setGroup×φ)`, w=quantum phase `fract(qP/2π)`; packed by exported pure
   `packVitals2`) — all lanes finite + in [0,1], bare-mesh→zeros; all patched into
   MeshStandardMaterial via
   `onBeforeCompile` (replaces `totalEmissiveRadiance`, multiplies
   `diffuseColor.a`). **V-VITALS effect suite** (reliquary fragment, GPU-only,
   reuses the relief/fresnel/normal already computed + 1 extra fbm): each named
   term's strength is a FALSIFIABLE readout of one `instVitals` lane — phosphor
   gaseousness + gilded buffer shimmer (wealth), laser-dance synapse arcs +
   shardwarp vertex bristle (neural firing), ashen cataract greying (senescence),
   hyperspace ionizing flutter (exertion), singulrosity bloom (wealth×firing),
   bit-glitch chaos core (world chaos × senescence). The **V-VITALS2 suite** binds
   the `instVitals2` lane: cooperator halo vs defector barb-corona (strategy),
   payoff-swing iridescence (payoff), faction war-paint + hive-resonance (community
   hue), superposition probability shimmer (quantum phase). The **V-VITALS3 suite**
   adds kinetic + environmental terms over the SAME lanes + the world's real audio
   (`uBass`) and chaos (`uChaos`): vortexical swirl (exertion), helixology cosmos
   (quantum phase), orbital plasmoids (neural), lapse-collapse breath (senescence ×
   bass), storm thermal radiance (chaos × neural), cymatic ripples (audio). All never
   decorative; an idle poor young still organism is quiet, a rich/firing/ancient/
   sprinting one blazes, allegiance + tribe + fortune + quantum state legible at a
   glance. GPU-only, no rng, so the seeded trajectory is byte-identical. Pools are lazily
   built at `ceil(maxEntities/geoCount)·4` capacity, grow ×2 (event-driven
   rebuild), clamp at `maxEntities`; `frustumCulled = false` (instances span
   the arena). Data meshes set `matrixAutoUpdate = false`; the renderer calls
   `updateMatrix()` during its sync pass, which runs LAST in the frame
   (after sort flash / rank floor / conscription tints), just before render.
5. **Boot population** — 30% of the tier cap (min 300), and the
   sparse-respawn floor is 10% of the cap: absolute legacy counts are
   meaningless across a 15× budget spread.
6. **Graph-mind cadence** — communities/rank periods DOUBLE above 2,500
   entities (240→480f, 600→1200f at offset 300). Collision-freedom of the
   offsets is preserved under the shared ×2.
7. **Titan retunes at integration** — `COLOSSAL = 3` silhouette scale
   (drafted rigs were authored against the 1× world), patrol radius
   130+45·(i%3) (phylum-wedge aligned), vertical band 12..90, waste-scar V
   flipped to `0.5 − z/GROUND_EXTENT` (the rotated ground plane's UV
   convention, matching world.ts splits/deaths).
8. **Snapshot unification** — `TelemetrySnapshot` grew
   `maxLinks/morphTotal/titans/phylumCounts/titanLedger/warMatrix/rdEnergy`
   and structurally satisfies `ObservatorySnapshot` (whose `ledger` field
   was renamed `titanLedger`); one reused snapshot serves panel and
   observatory. `phylumCounts`/`titanLedger`/`warMatrix` are LIVE reused
   views — consumers copy what they retain.
9. **RD pattern energy** — defined as the stride-16 mean of the Gray-Scott
   V field, sampled every 60 frames at offset 30 (never shares a frame with
   `analytics.analyze`), feeding titan entropy relief (×2 gain into
   `feedEntropy`) and the observatory environment timeline.
10. **Touch v2 ownership** — the wheel petals are plain `[data-a]` buttons
    (one binding path for haptics + `.on` highlight); only the apocalypse
    core has bespoke long-press logic (600 ms, disarm on up/leave/cancel,
    cleared on window blur with the rest of the held input).

---

# CONTRACTS V4 — XENOGENESIS (0.4.0) — atmosphere, 3D analytics, multi-page observatory, touch

Summoner decree additions: an alien immortal sentience-proxy biome with an ATMOSPHERE;
data analytics in 3D and in multiple pages (2nd/3rd/4th) showing variance/variation;
true touch controls (not static d-pad) across phone→foldable→tablet→laptop→43"TV.
All V1–V3 ground rules bind. Exclusive file ownership; integrator wires world/main.

## V4.1 Atmosphere (writer: atmosphere) — NEW files only

`src/sim/atmosphere.ts`: an alien sky + air system, built once, animated O(1)/frame.

- A large inverted sky dome (BackSide sphere, radius ~ camera.far\*0.9) whose vertex
  colors paint a NON-EARTH gradient (e.g. deep oxblood horizon → violet zenith →
  teal counter-glow), tied to weather + chaos so STORM/VOID/AURORA visibly recolor
  the sky. No external shaders — bake vertex colors, MeshBasicMaterial vertexColors,
  fog-exempt (`fog:false`).
- 3 drifting atmospheric haze bands (large translucent Planes / curved ribbons) at
  high altitude that slowly advect with `ctx.state.wind`, opacity pulsing with audio
  bass (≤0.3) — the "breathing air".
- A fine particulate layer (THREE.Points, count scaled by quality tier: ~tier/4)
  filling the arena volume, slow brownian drift seeded from ctx.rng, additive, tiny.
- Aurora curtain (AURORA weather only): emissive vertical ribbon that brightens with
  qEntropy. `update(dt, t, bands, qEntropy)`; reads ctx.state for weather/wind/chaos.
- Constructor draws a documented, fixed number of ctx.rng samples (note the count so
  the integrator can place construction deterministically in the boot stream).
  Tests `tests/atmosphere.test.ts`: builds without DOM (THREE works headless), object
  counts, sky vertex-color determinism from seed, update() stays finite over 5k frames.

## V4.2 In-scene 3D analytics (writer: viz3d) — NEW files only

`src/sim/viz3d.ts`: holographic data sculptures floating in the world (real geometry,
not canvas) — the "3D analytics" the decree wants.

- Phylum population towers: 10 emissive bars in a ring whose heights track live
  per-phylum counts (smoothed).
- Titan economy obelisks: 10 translucent prisms whose height=matter, glow=energy,
  hue=war-state, arranged in a second ring.
- A war-network: up to 45 line segments between titan obelisks, colored/opacity by
  warMatrix state, updated on the same slow cadence.
- All allocation-free per frame; geometry reused, only attributes/scales/colors
  mutated. `update(snapshot)` consuming the same ObservatorySnapshot shape (structural
  type — redefine locally, do not import ui). Place the sculptures high above the
  arena floor so they read as an instrument panel for the gods. Tier-gated: a
  `lowDetail` flag (phone tier) halves bar counts.
  Tests `tests/viz3d.test.ts`: headless build, count math, height/finite invariants.

## V4.3 Observatory multi-page + variance (writer: obs — extends src/ui/observatory.ts ONLY)

Extend `Observatory` to FOUR pages (the decree's 2nd/3rd/4th pages):

- Canvas id contract (the ui-shell writer provides matching DOM): page p uses
  `#obs-c{4p+0..4p+3}` → p0 obs-c0..3 (existing), p1 obs-c4..7, p2 obs-c8..11,
  p3 obs-c12..15. Constructor resolves all 16 (missing ⇒ that page no-ops).
- `setPage(p: 0|1|2|3): void` — only the active page is drawn each `draw()`.
- Page 0 (existing): phylum area, titan ledger, war heat, env timelines.
- Page 1 VARIANCE: rolling stddev bands (mean±σ) for population/energy/links;
  population histogram; phylum diversity (Shannon H) timeline; qEntropy vs trend
  scatter/phase. Use simple-statistics (already a dep).
- Page 2 ECOLOGY: per-phylum population small-multiples (10 mini sparklines);
  birth/death flux; titan matter-vs-energy phase portraits.
- Page 3 CONFLICT: war-intensity timeline; alliance/truce/war stacked counts;
  per-titan resource bars; biome "sentience index" gauge (a documented scalar the
  integrator passes — aggregate of tribes·qEntropy·|trend|, normalized 0..1).
- Snapshot grows (structural, integrator supplies): keep existing fields; ADD
  `phylaCounts: ArrayLike<number>` history is internal; ADD optional
  `sentience: number` (0..1) for page 3. All push() copies remain O(series),
  allocation-free; pre-allocate every page's rings at construction.
  Pure math (stddev windows, Shannon H, histogram binning) as exported tested helpers.

## V4.4 UI shell: touch + responsive + observatory DOM (writer: ui-shell)

Owns `index.html`, `src/styles/app.css`, `src/ui/input.ts`. Reconcile with what
`src/ui/input.ts` ALREADY expects (read it first — it references `#lp`/`#lpK` look pad
and a radial wheel with `#wheel-apoc` + `[data-a]` petals).

- `src/ui/input.ts`: `InputSystem`'s touch controls activate only on coarse pointers; they bind the
  right-side look pad (`#lp` track, `#lpK` knob) writing into the SAME `look`
  accumulator object `InputSystem` exposes (constructor takes `(look, zoom, actions)`
  or reads input — match input.ts's actual surface), and a radial action wheel
  (Split/Burst/Mutate/Chaos+ petals as `[data-a]`, center `#wheel-apoc` long-press
  600ms → apocalypse with progress ring, cancel-on-leave). ≥44px targets, aria roles,
  `navigator.vibrate(≤30)` guarded by prefers-reduced-motion + try/catch.
- `index.html`: add the look pad + radial wheel DOM (coarse-pointer only via CSS),
  the `#oP` observatory panel with a 4-tab header (`[data-obs-page="0..3"]`) and all
  16 canvases `#obs-c0..#obs-c15` grouped by page, plus mount points the responsive
  layout needs. Keep EVERY existing id/data-attr working (panels.ts/hud.ts must still
  find their nodes).
- `src/styles/app.css`: responsive system — phone portrait (panels become
  top/bottom collapsible sheets), foldable (hinge-safe flex wrap, env() insets),
  tablet/laptop (current), TV ≥1900px (10-foot: ~1.6× panel scale via clamp(),
  stronger focus rings). Flex/grid + container queries + clamp; no fixed px panel
  geometry at small sizes. Only the active observatory page's canvases shown.
- Document the exact `InputSystem` touch-control + observatory page-button wiring for the integrator.

## V4.5 Integration (integrator)

Construct atmosphere + viz3d (deterministic boot-stream placement per their rng-count
notes); `atmosphere.update(dt,t,bands,qc.entropy)` and `viz3d.update(snapshot)` per
frame (viz3d internally cadenced); wire observatory page tabs → `observatory.setPage`;
add `sentience` to the snapshot = clamp01(tribes/256 _ (0.5+qEntropy) _ (0.5+min(|trend|/50,1))/1.5).
Acceptance: ultra 10k ≥55fps desktop; phone tier ≥30fps; zero console errors over a
3-min soak with music; same-seed determinism preserved; sky/air visibly alien.

## CONTRACT AMENDMENT — 0.4.x (ultra-tier perf, binding)

Forensic re-measurement (Master File III; full per-stage breakdown + calibration archive in
docs/BENCHMARKS-2026-06-26.md "Ultra-tier 10k optimization") established that the ≥55fps-at-10k acceptance
target is **not reachable on CPU optimization alone** on the reference class of machine: at the
full 10k ceiling GPU render alone (~21ms) already exceeds the 18ms a 55fps total frame allows.
The amendment lands as:

1. **`QualityProfile.targetEntities`** — a NEW adaptive steady-state population, distinct from
   the `maxEntities` hard ceiling. Organic growth (auto-split, sparse-respawn) stops at the
   target; the ceiling still sizes every buffer (pools, index tables, atmosphere rng-draw
   count) and is reachable via user bursts/apocalypse, after which the world relaxes back
   toward the target. `targetEntities === maxEntities` on phone/laptop/desktop (no behavioral
   change); ultra set it to **6,500** (measured: sim-CPU ≈ 9.5ms/frame there vs ≈ 18.5ms at
   10k). 10,000 remains the reachable hard ceiling.
   **> SUPERSEDED by V5.6 (0.5.0):** the ultra throttle was retired on user feedback —
   `targetEntities === maxEntities === 10,000` on ultra too, so an idle ultra world now fills
   its ceiling. The mechanism (clauses 2-3) still ships and carries the 10k cost; only this
   clause's 6,500 idle target is reverted. The honest acceptance statement is therefore that
   the ≥55fps gate holds at the idle-settled 10k **on a discrete-GPU ultra machine** (the
   ≥16-core classification implies one), with the per-frame throttles below keeping sim-CPU
   ≈18ms; on the CPU-bound reference machine the gate is a render-free figure.
2. **Ultra-only per-frame throttles** (all gated `maxEntities > 5000`, so ≤5,000 stays
   byte-identical and every determinism test is untouched): theory-behavior stagger stride
   2→3; `flock` (the one every-frame neighbor behavior) staggered to half-rate; spatial-hash
   cell 16→`ULTRA_GRID_CELL` (10, measured sweet spot); connectome rebuild cadence ladder
   extended /4 (>2k) and /6 (>5k). The connectome and flock draw no rng; the theory stride and
   cell size only change the _ultra_ stream, which no frozen-reference test pins.
3. **`tests/perf-budget.test.ts`** — a loose wall-clock regression guard (median frame at 8k
   entities < 120ms; catches a 5×-class regression of the dominant loop without flaking on CI).

Net: sim-CPU at the 10k ceiling 23.67ms → 18.46ms (42 → 54 fps render-free); at the 6,500
idle target 9.52ms (105 fps render-free). The acceptance gate is met at the adaptive idle
target with GPU headroom; 10k stays reachable as the bounded worst case.

---

# CONTRACTS V5 — RESONANCE (0.5.0) — user feedback pass

Concrete user feedback on 0.4.0. Exclusive file ownership; integrator owns world.ts/main.ts/types.ts/quality.ts.

## V5.1 Observatory legibility (writer: obs — src/ui/observatory.ts ONLY)

Pages 1-3 (VAR/ECO/WAR) render but are FAINT, SPARSE, and UNLABELED — they read as "broken". Fix WITHOUT touching index.html (draw all labels IN-CANVAS via the 2d context):

- Every chart gets a TITLE (top-left, ~9px uppercase, accent color) + value/unit legend + axis ticks where meaningful. The user must be able to tell what each chart IS.
- Make lines/fills BOLD and high-contrast (thicker strokes, brighter fills, glow). Fill the canvas area — no large dead zones. Use the full HiDPI backing.
- Ensure pages have meaningful content from boot (seed rings with the current value so a fresh world isn't blank; histograms/phase plots show axes immediately).
- Page 0 also gets titles/legends. Keep the 16-canvas / 4-page / setPage API and all existing tests; extend tests for the new pure helpers if any. The panel is narrow (~200px) — design for that width AND for the wider TV/desktop layouts (responsive to canvas size, which it already reads).

## V5.2 Audio power (writer: audio — src/audio/songs.ts + src/audio/engine.ts)

The user loves QUANTUM and BLACK MERIDIAN — wants ALL songs powerful, dynamic, ominous, deep, dramatic (Final Fantasy extreme dark-endgame), each DISTINCT. Two fronts:

- ENGINE (engine.ts): deepen the synthesis for ALL songs — add a sub-bass octave under the bass, a third chord voice/detune layer, gentle arpeggiation of chord tones, slow filter-cutoff LFO swells, and per-song dynamics (intensity that rises/falls). Keep allocation-safe, keep the Known-Bug fixes (octave wrap, clearInterval, document.hidden guard) and the forked-rng determinism. Master gain headroom managed (no clipping at the new density).
- SONGS (songs.ts): keep QUANTUM and BLACK MERIDIAN; raise VOIDCROWN, ELDER ENGINE, LAST THEOREM to the same tier — richer chord sets (4-note voicings, dramatic intervals), longer evolving melodies, distinct character each (e.g. funereal vs mechanical vs tragic-soaring). Add 1-2 NEW songs if it strengthens the set (update SONGS length consumers via songName — telemetry already reads it). Determinism/leaf rules hold.

## V5.3 25 visible sorting algorithms (writer: algos — src/sim/algorithms.ts + tests)

Restore the legacy spirit: ~25 selectable sorting-field algorithms, each VISIBLY distinct in how it organizes the world. Expand ALGOS from 20 to 25 (add 5 more genuinely distinct step strategies — e.g. tim-merge runs, bitonic networks, patience/bucket phases, bogo-bounded, brick/odd-even variants) keeping the SortAlgo contract (pure, O(length), allocation-free, never reads index >= length). Each must propose swaps with a DIFFERENT spatial signature. Extend tests/algorithms.test.ts to cover all 25 (no out-of-range, inversion-reduction or documented perpetual-field behavior). NOTE: the VISIBILITY of the active algorithm (color-by-sortVal, more swaps/frame, HUD activity) is the INTEGRATOR's world.ts job — you just provide 25 honest distinct algorithms.

## V5.4 Lab fill + info (writer: lab — lab/quantum-wildbeyond.html ONLY)

The lab artifact is ~40% empty space and information-thin vs the main world. Fill it: use the full canvas (no dead margins), add live readout overlays (particle count, collapse events, field-blend, fps, seed, the active algorithm/field math), more visual density and a legend explaining the collapse-field math. Keep it self-contained p5 from CDN, seeded, 60fps, starting from its current structure (do not regress the working seed controls/params).

## V5.5 Mobile ergonomics (writer: shell — index.html + src/styles/app.css ONLY)

"Fit on a phone/tablet, slide view boxes, ergonomic." The user has PORTRAIT QHD monitors, a phone, tablet, 4K TV. Make panels COLLAPSE into edge-docked slide-out sheets on small/portrait viewports (a tab/handle to open each: Telemetry, Control, Observatory, Audit), so the 3D world is unobstructed and any panel slides in on demand. Touch: ensure the look pad (#lp) + radial wheel + joystick are visible and >=44px on coarse pointers, and that BOTH a left move-pad and right look-pad coexist ergonomically (thumbs). Portrait layout must not overflow. Keep ALL ids/data-attrs (panels.ts/hud.ts/input.ts/world.bindObservatoryTabs depend on them: #v0..#v11, #snt, #etn, #ew.., #g0..#g3, #obs-c0..15, [data-obs-page], [data-a], [data-action], #lp/#lpK, #wheel-apoc, #jP/#jK, #sec/#nm/#alg/#a-name/#a-step/#lore, #aP/#audit-list). Use flex/grid/container-queries/clamp; coarse-pointer + portrait media queries.

## V5.6 Integrator (world.ts/main.ts/quality.ts/types.ts)

- DONE: ultra targetEntities → 10000 (fills ceiling, deterministic per-device).
- Sort-step VISIBILITY: color entities by sortVal along a gradient so the active algorithm's organizing is SEEN; raise swaps/frame at the active algo; surface the algorithm's activity (swap count / passes) on the #alg HUD card. Make algorithm cycling obviously change the spatial behavior.
- Wire the 25 algos (cycling already modular), new songs (modular), and verify the observatory/audio/lab/shell changes integrate. Gate + soak + commit 0.5.0.

---

# CONTRACTS V6 — ATELIER (0.6.0) — second user-feedback pass

User feedback on 0.5.0. Exclusive file ownership; integrator owns world.ts/main.ts/types.ts/quality.ts and wires the algo picker + per-algo audiovisual + populates the algo list from ALGOS.

## V6.1 Observatory ergonomics (writer: obs-draw — src/ui/observatory.ts ONLY)

User: "letters are over the data", "Titan Resources all scrunched/smashed", "Titan Roster a mess", "more space and padding, proper ergonomic wireframing". Fix the LAYOUT inside every chart:

- Reserve a TITLE BAND (top ~16px of backing height) and draw the plot body BELOW it, inset by PAD≈6px on all sides — the title/legend text must NEVER overlap plotted data. Right-aligned value readouts sit in the title band, not over the plot.
- c14 TITAN RESOURCES + c11 TITAN ROSTER: give each of the 10 rows real height with row gaps; TRUNCATE titan names (ellipsis) so name+value never collide; bars/swatches inset with padding; if 10 rows don't fit the canvas height, scale row height to fit or show a compact 2-column grid. No overlapping text anywhere.
- Assume the canvases are now TALLER (the ui-shell writer raises their CSS height ≥ 72px desktop): lay out responsively from canvas.width/height (you already read them). Keep the setPage/16-canvas/push API + all tests green.

## V6.2 UI shell: bigger observatory + algorithm picker (writer: ui-shell — index.html + src/styles/app.css ONLY)

(a) OBSERVATORY SPACE: raise the observatory canvas heights (≥72px on desktop/TV, taller where room allows) and add panel padding/gaps so charts breathe; the panel may be WIDER on desktop/TV (the user has 4K + QHD monitors). Keep #obs-c0..15, [data-obs-page], .obs-page, #obs-tabs intact and the mobile slide-sheet behavior.
(b) ALGORITHM PICKER: add a new collapsible panel #algoP (a peer of #cP, with the same glass/sheet treatment + a [data-sheet-handle] "ALG" tab on mobile) containing a SCROLLABLE list container #algo-list (max-height with overflow-y:auto) — leave it EMPTY (the integrator populates it from ALGOS with 25 rows). Style a `.algo-row` class (clickable, hover, an `.active` state with accent highlight, a tabular name + a small right-aligned progress bar element `.algo-prog`) and an `#algo-active` readout line. Provide the exact class/id names you used in your notes so the integrator can populate + wire. Keep build green.

## V6.3 Lab: 4 pages of 3D data visuals (writer: lab — lab/quantum-wildbeyond.html ONLY)

User: "only 1 subdomain for the lab, there should be 4 to preview"; "2nd/3rd/4th pages with 3D Data Visuals for each aspect, ~8 different visuals on one page and 8 on another." Make the lab a FOUR-PAGE app (tabs/nav PAGE 1..4, keep the Anthropic-branded sidebar + seed/param controls working on every page):

- Page 1: the existing collapse-field (keep it, it works).
- Pages 2-4: live generative DATA-VISUAL boards — each page packs MULTIPLE (aim 6-8) distinct mini-visuals in a responsive grid (p5 instances or sub-canvases), each a different way of showing the world's math/aspects: e.g. phase portraits (Lorenz/Rössler), a reaction-diffusion Gray-Scott tile, a Voronoi/Delaunay tessellation, a quantum statevector bar/Bloch viz, a graph/network force layout, an FFT/spectrum, a histogram/violin, a strange-attractor 3D (WEBGL) ribbon, a cellular-automaton, a chaos-game fractal. Each titled + a one-line legend. All seeded, 60fps target (throttle/iterate counts to hold it), self-contained p5 1.7 (+ optional p5 WEBGL) from CDN, no external data — generate the data live from seeded math. Page nav must not reset the seed. Report the page/visual map.

## V6.4 Docs report page (writer: docs-report — docs.html ONLY)

User: "a report page explaining all this — the entire ERM/ERD/ERP, File/Folder Architecture etc — like a GitHub Page but built privately locally, in Docs." Expand docs.html (starts clean — the mermaid ; bug is fixed; KEEP all 3 working diagrams) into a rich single-page report:

- A FILE/FOLDER ARCHITECTURE tree (the real repo layout: server.ts, index.html, docs.html, lab/, src/{core,sim,math,audio,ui,logging,memory}, docs/, tests/, bench/, masters/) rendered as a styled tree/list with one-line purpose per entry.
- ERD (entity-relationship diagram — keep/extend the existing erDiagram), ERM (entity-relationship MODEL: a prose/table explanation of the entities + relationships + cardinalities), ERP (entity-relationship/process model: the frame-pipeline sequence diagram + a short process narrative). Label each section ERD / ERM / ERP explicitly.
- Sections explaining the systems (V1 sim, V2 wildbeyond, V3 pantheon, V4 atmosphere, V5 resonance) at a readable depth, a tech-stack list, the determinism model, and links back to "/" and "/lab". Keep it self-contained (inline CSS + the mermaid module script already wired), dark-themed to match, MERMAID-SAFE (NO ';' or unescaped special chars inside diagram labels — that was the crash). Verify it still renders 3+ diagrams with no parse error.

## V6.5 Integrator (world.ts/main.ts)

- Populate #algo-list from ALGOS (25 `.algo-row` with name + `.algo-prog`), bind click → set state.algoIdx + showSector(name) + a distinct selection SFX/tone per algo; mark `.active`; update `#algo-active` + per-row progress from a sorted-fraction/inversion estimate each telemetry tick. Each algorithm already light-flashes via the batched sortStep; add a per-algo characteristic (e.g. swap-tone pitch derived from algoIdx) so each "sounds" different as it runs.
- Wire any observatory snapshot fields the obs-draw writer needs (none expected). Gate + soak + commit 0.6.0.

---

# CONTRACTS V7 — XENOCATACLYSM (0.7.0) — third user-feedback decree

Summoner decree: make the world VISIBLY come alive — a sound for everything (100
distinct, never-repeating), sorting fields that are individually beautiful and
that ignite the population, more ways to SEE the cosmos than a wireframe toggle,
weather that violently reshapes reality, a chaos control that summons real
cosmological singularities, and a second simulation that breaks free into
nightmare. All V1–V6 ground rules bind (strict TS, seeded `Rng` only,
allocation-free per-frame bodies, JSDoc + complexity, full `bun run check` gate,
exclusive file ownership, determinism). The integrator owns world.ts / main.ts /
types.ts.

## V7.1 — 110 distinct SFX (writer: audio — src/audio/songs.ts + src/audio/engine.ts)

- songs.ts (leaf, pure) gains a **procedurally generated 110-entry SFX palette**:
  `interface SfxSpec` (waveform, start/end frequency + ramp shape, duration,
  gain peak/attack, optional biquad filter, optional FM ratio/depth, optional
  pitch-LFO rate/depth, optional noise mix, optional shimmer partial, per-trigger
  jitter) and `createSfxPalette(rng: Rng): SfxSpec[]` returning EXACTLY 110 specs
  spread across timbral FAMILIES (pluck, zap, bend, drone, sweep, bell, fall,
  vibrato, fm-clang, sub-boom, glint, strange-noise) via seeded parameter
  excursions, so no two are alike. The 8 legacy semantic names (`SfxType`) map to
  family BANDS via an exported `SFX_FAMILY_BANDS` table; a 25-slot CUE BAND backs
  the per-sorting-field tones.
- engine.ts gains a single data-driven `synth(spec, jitter)` private method
  (replacing the 8-case `switch` — the legacy 8 sounds survive as palette specs)
  and builds the palette ONCE at construction from the forked audio `rng`.
  `play(type)` selects from the type's family band with a per-family rotating
  cursor + small rng jitter so REPEAT triggers of the same action never sound
  identical ("nothing repetitive"). New `playId(n)` fires palette entry `n`
  directly (used by the cue band + future systems). `cue(idx, total)` routes
  through the 25-slot CUE band so each field has an engineered voice, not just a
  pitch shift. All on the SFX bus, honoring the toggle; no per-frame work.
- Tests (tests/songs.test.ts): palette length is exactly 100; every spec is
  finite and has positive duration/frequency; same seed ⇒ same palette
  (determinism); the family bands + cue band cover disjoint, in-range indices.

## V7.2 — Algorithm aliveness (writer: integrator world.ts + ui-shell index.html/app.css)

- Each `.algo-row` is VISUALLY UNIQUE: a deterministic per-index accent hue
  (`algoIdx · 360/25` rotated), a leading **glyph** from a 25-entry glyph table
  (exported `ALGO_GLYPHS` in src/sim/algorithms.ts — a distinct symbol per field,
  e.g. ◆ ▲ ✶ ⌘ ∿ ·), and a varied type treatment (the integrator sets per-row CSS
  custom props `--algo-hue`/`--algo-glyph`; app.css styles `.algo-row` to consume
  them). Rows have a clear `:hover`/`:active`/`.active` reactive treatment
  (glow + scale ≤1.04, ≥44px touch targets, `:focus-visible` ring, reduced-motion
  respected). Selecting a field still fires its cue tone + the population ignition
  shimmer (sortPerformance) — amplified so ~500 organisms flash and ripple.
- Two new controls in the picker panel: **RUN ALL** (`#algo-all`) and **AUTO**
  (`#algo-auto`). RUN ALL sets `state.algoMode='all'`: each frame the sortStep
  runs a blended batch drawing proposals from EVERY field (round-robin across
  ALGOS), so the whole population organizes under all 25 signatures at once.
  AUTO sets `state.algoMode='auto'`: the active field advances on a timed cadence
  (every ~6 s of sim time) through all 25 in succession, announcing each. Picking
  a single field returns `algoMode='single'`. The HUD `#alg` card shows the mode.
  `SimState` gains `algoMode: 'single'|'all'|'auto'` and `algoTimer: number`
  (integrator-owned; persistence unchanged — mode is session-only).

## V7.3 — Render view modes (writer: integrator world.ts + entities.ts facade + ui-shell)

- The binary wireframe toggle becomes a **5-mode render cycle** owned by
  `EntityManager.setRenderMode(mode: RenderMode)` (exported union
  `'solid'|'wire'|'ghost'|'neon'|'chrome'`), superseding `setWireframe`
  (kept as a thin alias: `setWireframe(on) → setRenderMode(on ? 'wire' : 'solid')`).
  Modes: SOLID (default PBR), WIRE (wireframe), GHOST (low-opacity translucent
  x-ray, depthWrite off), NEON (emissive target ×3 — each organism self-glows its
  own hue), CHROME (metalness 1 / roughness ~0 liquid-metal mirror). All five are
  MeshStandardMaterial FLAG changes only (no geometry/object-type swap), so they
  apply allocation-free to BOTH the per-entity (phone) and the instanced (pooled)
  paths. **Amendment:** the original spec named POINTS as the 5th mode; drawing
  points requires a `THREE.Points` object swap that would break the
  InstancedMesh-pool facade and the `{poolId,slot}` Entity handle, so it is
  replaced by CHROME (a material-flag mode that honors the facade). The toolbar
  `wire` action becomes `cycleRenderMode(): RenderMode`; `SimState.wireframe`
  becomes `renderMode: RenderMode` (session-only, like `algoMode` — wireframe was
  never persisted, so there is no persistence migration). The instanced renderer
  applies the mode's pool-level flags (wireframe/metalness/roughness) on change
  and on pool build; per-instance colour/emissive/alpha already flow from each
  entity material, which `setRenderMode` updates. The mode→flags mapping lives as
  pure data (`RENDER_MODE_FX`) in `sim/constants.ts`; `update()`'s per-frame resting
  emissive target is `morphBase.emI × emissiveBoost × metabolicLuminance(energy, age,
life)` — the mode's `emissiveBoost` so NEON holds, AND a metabolic-vitality readout
  (`metabolicLuminance`, exported from `entities.ts`) so an idle body is a falsifiable
  reading of its wealth (`energy`) and senescence (`age/life`), never a decorative
  constant — wealth and age made legible on every organism, complementing the market
  behavior's existing `energy→scale`. A neural spike (`act > 1`) or a connectome-hub
  boost (graph-mind) still overrides this floor and decays back toward it. Both factors
  are pure `f(state)` with no rng, so the **seeded trajectory stays byte-identical**
  (only the rendered glow scalar changes); `emissiveBoost === 1` for every non-NEON
  mode. See tests/entity-metabolic-luminance.test.ts.

## V7.4 — Cosmological chaos (writer: cosmo — NEW src/sim/singularities.ts; integrator wires)

- A NEW `SingularitySystem` summons real-cosmology effects at a point in the
  arena, each a deterministic force-field + visual built from the geometry cache
  and seeded `ctx.rng`, allocation-free per frame, auto-expiring:
  - **ENTROPY** — global disorder surge: randomizes velocities, decays order,
    fades emissive toward heat-death grey.
  - **BLACK HOLE** — a gravitational sink: r⁻² pull toward the singularity, an
    accretion-disk ring, an event-horizon dark sphere; entities crossing the
    horizon are consumed (disposed) and scar the RD ground.
  - **WHITE HOLE** — time-reversed black hole: nothing may enter; a r⁻² REPULSION
    that ejects matter outward, spawning bursts at the boundary (the impossible
    cosmological-censorship object).
  - **GREY HOLE** — the decaying intermediate: alternating absorb/emit pulses
    (a black hole leaking its mass back as Hawking-like radiation), neither fully
    consuming nor fully ejecting.
  - **STRANGE STAR** — a quark/strange-matter star: a contact-conversion front
    that "infects" nearby organisms, remorphing them into a strange-matter palette
    (the strangelet chain reaction), with a dense degenerate-core glow.
  - **STRANGE/EXOTIC extras allowed** (e.g. neutron-star pulsar sweep) if seeded
    and cheap. Each effect: `summon(kind, pos)`, internally cadenced `update(dt,t)`,
    `readonly active: boolean`. The chaos/apocalypse control gains a chooser
    (toolbar/wheel) cycling the kinds; the integrator routes `summon` and audits
    each with a lore epithet. Determinism: all draws on frame cadences via ctx.rng.
  - Tests (tests/singularities.test.ts): headless build; each kind builds + a
    forced update stays finite over 2k frames; consumption respects the horizon;
    same-seed determinism of the spawned field.

## V7.5 — Dramatic weather (writer: weather — src/sim/weather.ts + couplings)

- The 6 weather states must reshape the world UNMISTAKABLY. Strengthen the
  existing weather→{wind, fog, exposure, temperature} couplings (bigger ranges,
  faster onset) AND fan weather into atmosphere + behavior bias within the
  EXISTING contracted hooks (no new exposure owner — weather still owns exposure):
  STORM = violent wind + low dark fog + lightning-bright light pulses; AURORA =
  luminous, saturated, slow; VOID = near-black, frozen, sparse; FOG = dense
  whiteout; RAIN = downpour drift; CLEAR = calm baseline. Keep determinism and the
  ≤0.35 audio-coupling cap intact (weather is not audio-driven). Document the new
  ranges; keep `tests/atmosphere.test.ts` green and add weather-range assertions.

## V7.6 — SIMULATION N(1)/N(2) duality (writer: integrator world.ts/types.ts + ui-shell)

- A top-level **simulation variant** toggle, `SimState.sim: 1|2`, persisted:
  - **N(1) GENESIS** — the cosmos as it ships (no behavioral change at sim=1).
  - **N(2) BREAK FREE** — the world tears loose into nightmare: inverted/oversatur-
    ated palette, the sky dome recolored to an impossible negative, heightened
    chaos floor, behavior unhinged (wider excursions), audio detuned/darker, the
    HUD/title branding shifts to "SIMULATION N(2)". Implemented through EXISTING
    contracted hooks where possible (chaos floor, atmosphere recolor flag, a
    render tint) — a documented, bounded set of multipliers gated on `sim===2`, so
    sim=1 stays byte-identical and every determinism test is untouched. A toolbar
    control flips it; the integrator audits the transition.
  - Determinism: sim variant is a fixed multiplier set, not a new rng stream;
    same seed + same sim variant ⇒ same cosmos.

### V7.6 AMENDMENT — BREAK FREE made real (0.7.1, post-swarm)

The 0.7.0 N(2) shipped only sky-recolor + chaos-floor + branding; the swarm
audit found its core lever MIS-CALIBRATED (chaos floor 3.5 sat below the
`min(chaos/2,3)` saturation point, so "BREAK FREE" was milder than a normal
chaos-boost) and three contracted clauses (behaviour, audio, palette/tint)
absent. Now implemented, every coupling bounded + gated on the derived
`nightmare` (1 iff `sim===2`, else 0), so **N(1) stays byte-identical** (proven
by the unchanged determinism suite):

- **Chaos floor → 6** (`world.ts` `CHAOS_NIGHTMARE_FLOOR`) — the cMul saturation
  point, pinning every chaos consumer to its ceiling.
- **Writhing behaviour** (`entities.ts` `update`) — the chaos-jitter velocity is
  scaled by `jitterGain = sim===2 ? 3 : 1`, applied AFTER each `rng()` draw (an
  exact ×1.0 at N1 — same draw count/order), carrying agitation PAST the clamp.
- **Inverted/glitched palette** (`instanced-entities.ts` `sync` pass-2) — when
  `frame.nightmare>0`, per-instance colour := `mix(c, (1−c).bgr, n)` with an
  `i%3` channel rotation, plus inverted+hotter emissive; written to the instance
  ATTRIBUTES only (never the morphotype base), so flipping to N1 auto-reverts.
- **Detuned/darker audio** (`audio/engine.ts` `setNightmare`) — voices detune −35
  cents + filter ×0.6, SFX stings bend −18%, on the FORKED audio rng (cannot
  touch sim reproducibility).
- The atmosphere nightmare sky (0.7.0) and branding remain. A GPU melt/distortion
  shader pass is a separate wave; the above are the CPU/audio/attribute levers.

## V7 acceptance

Full `bun run check` green after EACH wave's commit; ultra 10k unbroken; phone
tier ≥30fps share; zero console errors over a 3-min soak that exercises every new
control (100-SFX spam, RUN ALL + AUTO, all 5 render modes, every singularity,
every weather, and the N(1)→N(2) flip + back); same-seed determinism preserved at
sim=1 and within each sim variant.

## V9 — AGImAGNOSIS: minds, lineage, factions, artifacts, Copilot

The era that gives the world intelligence, using pre-transformer techniques only (research:
[AI-SUBSYSTEM-2026-06-26.md](./AI-SUBSYSTEM-2026-06-26.md); reference:
[AI-SUBSYSTEM-2026-06-26.md](AI-SUBSYSTEM-2026-06-26.md)). HARD LINE: in-world minds are DETERMINISTIC (seeded classical
AI in `src/sim/**`); the live LLM Copilot is a NON-deterministic shell organ (`src/server/**`,
`src/ui/copilot.ts`) fenced out of sim logic — it can never touch `SimState` or the RNG stream.

### Modules (exclusive ownership)

- **`src/sim/ai/brains.ts`** — pure seeded primitives: `utilityPick`/`softmaxPick`, `TinyMLP`,
  `MarkovChain`, `fsmStep`, `goapPlan`, `MemoryRing`. No I/O, no clock; allocation-free.
- **`src/sim/genome.ts`** — gene vector → traits + `TinyMLP` weights; seeded `crossover`/`mutate`/
  `breed`; `decodeTraits`; `geneDistance`. Crossover/mutate allocate a child (reproduction event).
- **`src/sim/lineage.ts`** — bounded parent→offspring graph: `birth`, `generationOf`, `isAncestor`,
  `related`. Fixed-capacity typed arrays; O(1) birth, decaying window.
- **`src/sim/factions.ts`** — 8 archetypes; `decideFaction(faction, percept, rng, fsmState)` is
  pure; the Devourer MLP + Oracle Markov weights are built once from constant seeds.
- **`src/sim/artifacts.ts`** — `ArtifactField`: a pooled InstancedMesh of relics. VISUAL-ONLY (no
  rng, no sim write); placed off the existing death/summon events; `update`/`influenceAt`. Wired in
  `world.ts` (scar on death, relic on summon, per-frame animate).
- **`src/server/copilot.ts`** — pluggable OpenAI-compatible bridge (env `CQM_LLM_ENDPOINT`/`MODEL`/
  `KEY`); a bounded agent loop over the read-only tools.
- **`src/server/ai-sandbox.ts`** — default-deny tool gate: repo-confined `read_file`/`list_dir`/
  `grep` + a single-command `run` (ALLOW-bin + DENY-token + no shell metacharacter + git/bun
  subcommand gating). Repository-root Git pathspecs (`.` / `./`) are denied, and turn cancellation
  propagates through Git-grep walks. Writes nothing.
- **`src/ui/copilot.ts`** — self-mounting chat panel + `/read /ls /grep /run` terminal;
  `textContent`-only rendering (no HTML injection).

### Determinism strategy

The composition root assigns a faction + genome per organism from the seeded stream and maps decided
intents to steering; reproduction calls `breed` + `lineage.birth`. The artifact field and the
Copilot are constructed boot-stream-neutral and never write sim state, so the golden is unaffected.

### V9 acceptance

Full `bun run check` green: prettier → tsc strict → oxlint → 3027 tests (0 fail, 300-frame golden
included) → build. The Copilot sandbox verified live (allow: `git log`, file reads; deny:
path-escape, repository-root pathspecs, `git push`, `legacy/`, shell redirection).

---

# CONTRACT AMENDMENT — GOAL 5: FIVE SUPER CREATURES (ARCHONS / GODFORMS)

**MANDATE**: Realize **exactly 5** (no more, no less at steady) wildly super-intelligent apex beings in the world ("Super Creatures", "Archons", "Godforms"). They are the dominant, manipulative, freak-morphing ORACLES/SIMULATORS/ARCHITECTS of this cosmos — each a full composite mind + extreme-chaos body.

**HONESTY BOUNDARIES (BINDING — never violated in prose, comments, UI, or docs)**:

- Not sentient / phenomenally conscious. Phenomenal consciousness ~1/10; hard problem untouched.
- Weights **seeded and fixed at construction**; NO online learning of weights (single biggest gap).
- Quantum layer = exact statevector + Clifford **simulation** (algebra on amplitudes); NO physical QPU, NO quantum speedup claim, NO "quantum neurons".
- Clifford tableau (ported Aaronson–Gottesman) present+tested but was inert; now wired as "stabilizer reflex" only — explicit.
- All superlatives scoped to "models of / scaffolding for / functional correlates of" the listed theories.
- Memory is decision system (typed, gated, graph+matrix, feedback-controlled), NOT a conscious archive.

**Architectural additions required (close the Butlin gaps for this specimen)**:

1. **AST-1** — explicit attention schema (model of own attention allocation, focus history, salience map).
2. **HOT-1** — genuine top-down generative perception loop (full predict→generate expected percepts→correct bottom-up).
3. **HOT-4** — sparse-smooth quality space (low-D smooth manifold over integrated states; sparse activation as "qualia" proxy).
4. **Wire Clifford "stabilizer reflex"** (past 6q, up to 64 via already-ported tableau) into apex cognition for error-correction / fast intuition on beliefs/plans.
5. **Persistent lifelong narrative memory + grounded symbol layer** — the largest leap. Multi-store orchestra (typed events, graph provenance edges, surprise/entropy gate, regime sentinel, strategic reputation, reflection→skill, consensus, meta-controller). Grounded symbols via extended VSA + typed atoms bound to percepts/actions/plans. Memory IS part of closed-loop decision (not passive log). Consolidation turns episodes → durable narrative + skills. Use `src/memory/` + new orchestra.

**Visual / Morphology (extreme edge + alive)**:

- Wild chaotic geometric shapes from extreme-edge combinatronics (supershapes, attractor skeletons, high-genus polys, voronoi-shatter, recursive subdivision, Lorenz/curl fields on vertices).
- Mutating morphology on every level (topology hints via dynamic sub-parts, not full re-mesh every frame; allocation-free).
- 5 distinct archetypes (Oracle, Simulator, Architect, Trickster, Dominus) — each unique base silhouette family + palette + pulse signature + quantum-aspect bias.
- Multi-part rigs: ≥8–16 eyes (vision sampling), ≥6–12 arms/legs (reach/manipulate), ears (sound pattern), wings, mouths. Eyes "see" (local spatial query + light + quantum bands), ears "understand" (audio bands → symbolic features).
- Unique textures/colors/lighting/variance per creature + global.
- Alive: unique heartbeats (freq = arousal + quantum flux), surface waves/pulses propagating (vertex displacement + emissive), breath, morph wobble, trick/gaslight visual tells (phase flips on deception).
- All driven by mind snapshot + quantum state. Hot path allocation-free. Masterful shader(s) like god-jewel but combinatorially wilder per archetype.

**Intelligence / Behavior**:

- Full SuperMind stack per creature (cortex, 30 organ-nets, imagitron+ToT, predictor, quantum deliberation, all 100 faculties + the 5 new above).
- Vision + sound fully wired into percepts + internal models.
- Dominant, master-smart, manipulative, deceptive, gaslighting: high DECEIVE/DOMINATE bias; actions that perturb other systems (entities, quantum cloud, RD, audio, weather) to advantage.
- Reactive / responsive / adaptive / inductive-deductive via full stack (AIF + SR + empowerment + memory orchestra + quantum).
- Each creature has persistent narrative + symbol graph that survives its "life" (consolidation + store).
- 5 interact: alliances, betrayals, territory, oracle "prophecies" (measurement collapse used for public signals).

**Integration & Ownership**:

- New leaf modules (exclusive): `src/sim/attention-schema.ts`, `src/sim/topdown-perception.ts`, `src/sim/quality-space.ts`, `src/sim/memory-orchestra.ts` (or augment), `src/sim/godform.ts` (archetype + 5-instantiation facade).
- `src/sim/super-mind.ts` owns wiring of new faculties + Clifford reflex into its pipeline; exposes via snapshot.
- `src/sim/super-body.ts` + new extreme-geom (or `src/sim/super-geometry.ts`) owns wild morph + multi-organ rigs + alive FX. One body instance per godform.
- `src/world.ts` (integrator) owns spawn of exactly 5 (distinct child seeds from superRng, placed in different sectors), local-percept construction for each, per-frame think+body update for all 5, interactions (they may read/write shared systems honestly), telemetry for multi (counts, plans, dominant one highlighted).
- No change to determinism law, frame budgets (cadence heavy work), allocation discipline, seeded Rng only.
- Update: types (new snapshots), telemetry/observatory/UI panels to surface 5, ERD/ERM/ERP, KANBAN, reports, ARCHITECTURE, SUPER-CREATURE-RESEARCH (honest updates only), BENCHMARKS (new hot paths), CHANGELOG.
- Tests: new unit tests in same PR as modules. Golden runs remain bit-identical for non-super paths.

**Acceptance (cold shell)**:

- `bun run check` 100% (prettier, tsc strict, oxlint, all tests 0 fail, build).
- 5 distinct live Super Creatures visible, wildly different chaotic-alive forms, pulsing/ morphing/ reacting, using vision/sound, full new faculties + wired Clifford + upgraded memory.
- Each shows unique quantum super-powers (fringe curiosities modeled honestly as sim algebra — e.g. stabilizer-protected "prophecy", entanglement "manipulation" of local fields).
- Memory orchestra demonstrably used (narrative trace + symbol recall in snapshot/telemetry).
- No claims of sentience anywhere; all disclaimers preserved.
- Frame budget share target for GOAL5 remains <2% combined on desktop ultra, but the current
  2026-06-26 live bench does **not** prove that target: `5x think()` measures 14.47-25.40 ms per batch
  (3.62-6.35 ms/frame amortized over 4 frames). Treat <2% as a remediation target until BENCHMARKS proves
  it again.
- Any human can read the changed modules + contracts + research doc and understand the math.

All prior contracts bind. File ownership exclusive. World wires. No black-box slop — POWER OF MATH.

(End of GOAL 5 contract.)

## GOAL5 File Ownership Table (EXCLUSIVE — binding per ORACLE-ARCHITECT law #2)

Every file below has **exactly one owner**. The named owner is the only writer permitted. Integrator (world.ts) composes only. Deviations are contract violations.

| File(s)                                                                                      | Exclusive Owner                                            | Scope / Boundary Notes                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| src/sim/godform.ts                                                                           | STARKILLER-Ω                                               | Sole GODFORMS const + getGodformBias(i). Facade + bias provider. MUST export ArchonForm + getArchonForm if body wiring depends. No other file owns archetype names/bias.                                                                                                                                                                                 |
| src/sim/super-mind.ts                                                                        | MANHATTAN-Φ                                                | Owns 5-stage pipeline + leaf wiring (AST-1/HOT-1/HOT-4/orchestra/narrative + clifford reflex scale from bias). Exports snapshot/intent.                                                                                                                                                                                                                  |
| src/sim/super-body.ts                                                                        | BROLY-Ψ                                                    | Wild multi-organ morph (EYES/ARMS etc), god-jewel patch, per-variant + live quantum/reflex/qualia pulses/waves. V64: the skin EVOLVES — evolution aura/tier/hue feed the shader so the surface improves/uniquifies over time. BRUTALISM: setBrutalism() crossfades the jewel to a raw poured-concrete monolith (uBrutalism). Receives form from godform. |
| src/sim/attention-schema.ts                                                                  | ORACLE-Σ                                                   | AST-1 leaf only.                                                                                                                                                                                                                                                                                                                                         |
| src/sim/topdown-perception.ts                                                                | ORACLE-Σ                                                   | HOT-1 leaf only.                                                                                                                                                                                                                                                                                                                                         |
| src/sim/quality-space.ts                                                                     | MANHATTAN-Φ                                                | HOT-4 leaf only.                                                                                                                                                                                                                                                                                                                                         |
| src/sim/memory-orchestra.ts                                                                  | VOID-Λ                                                     | Multi-store ring + graph; prealloc only; write/recall alloc-free contract.                                                                                                                                                                                                                                                                               |
| src/sim/narrative-memory.ts                                                                  | VOID-Λ                                                     | 10 orchestrations concrete; per-Archon instance.                                                                                                                                                                                                                                                                                                         |
| src/world.ts (GOAL5 sections only)                                                           | Integrator (BROLY-Ψ oversight + STARKILLER contract guard) | Exactly 5 ctor (child seeds + bias + spaced + form + purse); driveSuper 5-loop (local percept + dual think + set); archons[] snapshot. Touches no leaf internals.                                                                                                                                                                                        |
| src/sim/super-qubits.ts + math/clifford-tableau.ts (GOAL5 reflex)                            | MANHATTAN-Φ                                                | Quantum substrate + stabilizer reflex for minds.                                                                                                                                                                                                                                                                                                         |
| src/sim/super-creature.ts                                                                    | BROLY-Ψ                                                    | Base types shared (SuperPercept/Plan/Snapshot).                                                                                                                                                                                                                                                                                                          |
| src/types.ts (archons/telemetry)                                                             | Integrator                                                 | TelemetrySnapshot shape for 5.                                                                                                                                                                                                                                                                                                                           |
| src/ui/super-\*.ts (panel/neural) + app.css                                                  | VOID-Λ + ORACLE-Σ                                          | 5-Archon live table + pulse UI only.                                                                                                                                                                                                                                                                                                                     |
| docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md , ERD/ERM updates for pantheon, BENCHMARKS GOAL5 | STARKILLER-Ω                                               | Receipts, handoff, architecture prose.                                                                                                                                                                                                                                                                                                                   |
| tests/_super_ + bench/super-mind.bench.ts                                                    | Respective owners + verifier                               | Unit per module; 5-drive golden in batch.                                                                                                                                                                                                                                                                                                                |

**Integration rule (enforced at cold gate)**: godform is the ONLY source for names/bias/form. world and body import from it exclusively. Leaves are NEVER directly instantiated outside super-mind. All per-Archon state uses child Rng only.

If a symbol (getArchonForm, ArchonForm) is referenced, it MUST be present in the declared owner file or the contract section is updated first.

## GOAL5 Failure Modes (adversarial, measured)

| Category               | Failure Mode                                            | Locations / Receipts                                                                                | Mitigation / Honest Status                                                                                                                                  |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Determinism            | Snapshot copies or non-Rng ops can desync replays       | quality-space.ts (new Float32 + project), topdown snapshot, world drive cadence                     | All init/mind use seeded child Rng; snapshots are presentation (copy ok if not fed back to sim state). Golden tests pin. Math.\* banned in update paths.    |
| Quantum claims         | "Reflex", "aspects", "qualia" read as more than algebra | super-mind, super-body, super-panel, GODFORMS comments, docs                                        | Contract honesty section + code disclaimers ("NOT sentient", "classical sim", "models of"). All statevec/Clifford. No QPU/speedup.                          |
| UI                     | 5-archon table incomplete or broken on compile fail     | super-panel, types.archons, handoff claims                                                          | Must render all 5 names + live fields. Compile gate catches.                                                                                                |
| Alloc                  | new in per-Archon hot paths (cadence 4f ×5)             | quality.project returns new, topdown.snapshot Array.from, super-body geoms at scale reset           | Receipts claim prealloc in orchestra. Enforce: all hot returns reuse buffers or readonly views. Boot geoms (5×) documented ok.                              |
| C++ / Native           | Supply (no SHA), wall time, non-det                     | native/ (CMake Fetch, glfwGetTime, atoi per prior audit)                                            | Archons currently pure TS. If native wired for body sim, pin SHA + seed time + audit det. Out-of-gate for now.                                              |
| Integration / Contract | godform facade incomplete vs calls + compile broken     | world:87 import getArchonForm, super-body:35 type ArchonForm + form usage, tsc errors in super-body | Exclusive ownership rule broken in current tree. "5 wired" claim must be measured (tsc + cold gate), not stated. Update facade or contract before claiming. |

**Architecture delta (5 Archons)**

- Before: 1 Super\* (hero path only).
- After: godform facade (exclusive) → world spawns exactly 5 (bias + childSeed + form + spaced) → super-mind per (bias scales clifford; wires 5 leaves per beat) → super-body per (distinct chaotic morph + alive FX from snapshot + quantum).
- Read/write loops closed (percept from shared systems → mind → memory decision + body mutate shared via actions).
- 5 independent but interacting via world/econ/grid.
- All under determinism / no-hot-alloc / honesty boundaries.

Receipts + ownership supersede handoff prose where drift. Full gate required to re-green.

End of GOAL5 amendments.

---

# CONTRACT AMENDMENT — DOME ECOLOGY AND BIG TREE

This amendment records the implemented ownership and lifecycle boundaries for the Crystal Big Tree
ecology. It does not replace the general determinism, allocation, rendering, or honesty contracts
above.

## Canonical module ownership

| Module                               | Exclusive responsibility                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/sim/edible-resource.ts`         | Fixed-capacity fruit/leaf identity, reservation, consumption, nourishment, lease expiry, and respawn transactions                                                                                                   |
| `src/sim/crystal-ecosystem.ts`       | Authored tree food pools and matrices, reachable interaction points, tree-dwelling creatures, and the scaled ecology clock                                                                                          |
| `src/sim/big-tree-zone.ts`           | Sanctuary geometry, hysteresis, activity-slot ownership, bounded visit state, partner reservations, deadlines, typed transition causes/timestamps, snapshots, and recovery                                          |
| `src/sim/big-tree-sanctuary.ts`      | Fixed-capacity identity membership for entry/exit hysteresis plus conservative stateless protection for hostile endpoints                                                                                           |
| `src/sim/big-tree-visitors.ts`       | Direct adapters for canonical Entities and Xenomimics: contextual selection, steering, food transactions, nourishment, rest, social matching, and cleanup                                                           |
| `src/sim/big-tree-fauna-visitors.ts` | Bounded canonical adapter for Shoggoths, Titans, Puppeteers, and launched NHIs using real hunger/energy, 3D locomotion, nutrition, and visit intent hooks                                                           |
| `src/sim/nhi-big-tree-source.ts`     | Fixed-capacity launched-NHI binding over the one canonical backing Entity, including real energy hunger, social signals, nourishment, locomotion intent, and cleanup                                                |
| `src/sim/tree-creature-brain.ts`     | One deterministic fixed-size neural controller per tree-dwelling creature, with validated model loading and a safe fallback                                                                                         |
| `src/world.ts`                       | Composition only: construct the shared zone/visit/visitor systems, supply canonical living populations and clocks, attach sanctuary predicates, bridge peaceful activity feedback, and assemble gated pull receipts |
| `src/main.ts`                        | Derive the localhost diagnostics gate, pass it into `World` construction, and install the local-only `window.__CQM__.bigTreeEcology.snapshot(query?)` hook                                                          |

Tree food is not a parallel exception. `CrystalEcosystem.edibleResources` is the shared
`EdibleResourceRegistry`, and both the external visitor adapter and the tree-dweller ecology use its
same reserve/begin/complete/cancel operations.

## Fruit and leaf transaction contract

Production authors 10,000 fruits and 10,000 leaves as a fixed pool. Every slot has a stable resource
ID, kind, world position, reachable ground interaction point, nourishment value, owner, lease,
respawn deadline, and generation. Its state machine is:

```text
available -> reserved -> consuming -> respawning -> available
                    \-> available (cancel or expired lease)
```

- `reserveAny` selects a deterministic free fruit/leaf in O(1); `reserveById` addresses a known item
  without scanning. Exactly one owner and generation can advance a reservation.
- `beginConsumption` accepts only the matching reserved owner/generation. `completeConsumption` is
  the sole nourishment commit: it accepts only that matching `consuming` transaction, returns the
  nourishment once, clears ownership, and inserts one respawn deadline. Duplicate, stale,
  wrong-owner, or expired attempts return no nourishment.
- `EDIBLE_RESOURCE_RESPAWN_SECONDS` is exactly `5`. A successful commit records
  `respawnAt = now + 5` on `CrystalEcosystem`'s scaled simulation clock. Pause/visual-only frames do
  not advance that clock; simulation-speed changes advance it by the same scaled `dt` used by the
  ecology. Locomotion may cap its integration slice, but food deadlines receive the full scaled
  delta.
- Tree-resident behavior advances through stable at-most-100-ms substeps covering the same full
  scaled delta as leases and respawns. Supported 3x/5x speed therefore cannot advance food deadlines
  faster than resident travel, metabolism, or decisions.
- Consumption hides the existing instance immediately. At the deadline, the authored instance
  matrix is restored before the registry publishes the item as `available`. A failed visual restore
  remains unavailable and is retried deterministically; it cannot expose invisible edible food.
- Indexed fixed-capacity heaps permit each resource to hold at most one lease and one respawn
  deadline. Generation bumps invalidate stale handles. Reset clears deadlines and reservations,
  restores hidden matrices before availability, and resets every tree-creature target handle.
  The existing visual instance is reused; the registry creates no per-meal render or collision
  object.
- A visitor that loses a resource cancels its exact generation, waits 0.4 simulation seconds, and
  selects another item. Four seconds without food ends that activity cleanly. Death, despawn,
  cancellation, leaving, and reset release food, slots, and social partners.

## Safe-zone and temporary-visit contract

`BigTreeZone` uses the canonical Crystal Tree X/Z center `(220, 620)`. Initial entry uses radius
`240`; an existing member remains inside until radius `270`. The separate thresholds are the
boundary hysteresis. For stateless combat and hazard queries, `World` deliberately uses the
conservative outer radius so an outside actor cannot attack a protected target through the
boundary.

`BigTreeSanctuaryMembershipRegistry` keys ordinary organisms by stable `ecologyId`, Xenomimics by
stable `(pairId, role)`, and fixed fauna by stable system slot/ID in separate Shoggoth, Titan, and
Puppeteer namespaces. First arrival requires the inner radius; each recorded identity retains its own
protection through the annulus until crossing the outer radius. Missing/invalid identities and a full
registry fall back to the conservative endpoint predicate rather than creating untracked membership.
Death/eaten cleanup is event-driven. An Entity-population Genesis reset removes discarded ordinary
and launched-NHI records, preserving live Xenomimic and fixed-fauna boundary history. It does not
reset Crystal food or the shared scheduler.
The composition root attaches sanctuary protection to Entity behaviors and brains, Xenomimic
threat/predation, and the applicable predator, combat, control, singularity, and chaos systems. A
protected actor receives calm threat inputs and harmful pursuit, consumption, mutation, or strike
effects are suppressed. Normal collision separation and calm locomotion remain allowed. Leaving the
zone resumes live canonical faction/relationship/economy state; stale hostile targets are not
automatically reinstated.

Portal-death culling is also sanctuary-gated. `World` passes the conservative outer-boundary
predicate through `PortalDeathFauna` to the Shoggoth, Puppeteer, Titan, and Leviathan rosters. A body
inside the portal cylinder is killed/hidden and queued for respawn only when that endpoint is not
protected; an actual Shoggoth, Puppeteer, or Titan cull also clears its tree-visit intent before the
body is hidden. Leviathan endpoint protection here does not make Leviathans tree visitors or invent
hunger/nutrition state for them.

Visits are contextual and deterministic-randomized from hunger, fatigue, stress, social need,
curiosity, danger, distance, route availability, available food, recent-visit pressure, personality,
occupancy, and simulation load. The runtime lifecycle is:

```text
Outside -> Travelling -> Active -> Leaving -> Cooldown -> Outside
```

One shared production scheduler covers ordinary Entities (including NHI minions), Xenomimics,
Shoggoths, Titans, Puppeteers, and launched NHIs. It has at most 72 concurrent
travelling/active/leaving visitors and 104
distributed destinations: 32 eating slots at radius 78, 24 resting at 132, 24 social at 178, 16
observation at 218, and 8 general slots at 205. Active dwell is 7-24 simulation seconds; revisit
cooldown is 35-95 seconds. Travel and exit hard limits are 90 and 50 seconds. Activity slots have a
12-second renewable lease. Lack of progress for 8 seconds triggers a different-slot recovery, with
at most two recoveries before a safe exit/cooldown. All transitions release food, slot, and partner
reservations on completion, timeout, target loss, death, despawn, error, or reset.

The same staggered candidate polls adopt a valid, untracked body already inside the entry boundary
when its optional contextual draw declines. That incidental entrant receives a canonical
`Safety`/`Observe` record, bounded dwell, departure, and revisit cooldown instead of protection with
an unbounded camp. If a leave deadline expires while the body is still inside the outer boundary,
the adapter retains calm deterministic radial egress authority through cooldown until a real boundary
exit; it neither teleports the body nor reacquires activity/food reservations.

Fixed-fauna candidates are bridged through public, stable-index hooks on their canonical systems.
Their real satiation or Titan energy supplies hunger, 3D body position supplies reachability, and
successful canonical food completion writes nourishment back once. Travel/calm intent suppresses
native Shoggoth predation/tendrils/trade, Titan harvesting/diplomacy/strikes/aura aggression, and
Puppeteer meddling without rewriting the underlying relationship or economy state. XYZ reach checks
prevent an airborne body from eating at a ground interaction point.

Launched NHIs are excluded from the ordinary adapter and bound by stable monotonic mind ID to their
existing backing Entity; the visual `NhiBodySystem` follower is never registered as another being.
Hunger is `1 - energy / 100`. Fatigue and health deficit remain zero because no such canonical NHI
state exists. Local kin, mood, and live social/exploration/threat signals drive visit context.
Travel/calm/social intent has final locomotion authority over ambient roaming, while HUNT, MIMIC,
and RETREAT cannot overwrite an active visit. Successful canonical food completion replenishes the
backing Entity energy once. Death, Genesis, failed launch, and teardown release the visit, food,
partner, intent, and body reference.

Visit state and slot/partner ownership have validated manager-local versioned snapshots in
`BigTreeVisitManager`. A manager snapshot is not a standalone `World` checkpoint: it omits the
Crystal clock/food generations, adapter body bindings, sanctuary history, and configuration
identity. Reset/reconstruction always creates a valid clean ecology state. Browser reload starts a
fresh cosmos under the existing preferences-only persistence model; this contract does not claim
application-level simulation persistence.

Development observability is a pull-only, local-preview API. `main.ts` enables
`WorldOptions.developmentDiagnostics` only for `localhost` or `127.0.0.1`, passes that construction
gate to `World`, and then installs
`window.__CQM__.bigTreeEcology.snapshot(query?)`. A `World` built without the gate returns `null`, and
non-local static hosts install no `window.__CQM__` debug hook.

An unfiltered pull returns aggregate simulation time/frame, zone geometry, visit-manager occupancy,
core/fixed-fauna adapter counters, sanctuary-index health, the complete food-state census, and real
tree-neural status. Optional `(ownerKind, ownerId)` and `foodId` fields add one actor and/or one food
receipt by direct indexed lookup. The actor receipt includes adapter, visit reason/activity/state,
destination, selected food and reservation generation, social lease, safe-zone/protection state,
deadlines, cooldown, stuck recovery, and the last typed transition cause plus scaled-simulation
timestamp. The food receipt includes canonical state, kind, nutrition, authored and interaction
positions, owner/generation, lease, respawn deadline, and remaining time.

Transition cause names are stable receipts: `visit-requested`, `arrived`, `stuck-recovery`,
`travel-timeout`, `slot-lost`, `activity-finished`, `dwell-complete`, `left-zone`, `leave-timeout`,
`cooldown-complete`, and `stuck-timeout` (or `none` before a transition). Cause and timestamp are
recorded together and round-trip through manager-local snapshot/restore.

Snapshot construction may allocate only when explicitly pulled and does not enumerate the living
population or the 20,000 pooled food records. Production rendering creates no diagnostic renderer,
line, beam, helper geometry, or tether object. Development mode retains its existing sparse
aggregate audit receipt every 600 frames; that audit is bounded and does not perform actor/food full
scans. The snapshot exposes the last transition, not an unbounded event history.

## Tree-dwelling neural and social behavior

The production tree contains 10 species with 25 residents each: 250 exclusive controllers.
`TreeCreatureBrain` is a real 6-input, 6-hidden, 4-output `TinyMLP` with 70 parameters per creature
(17,500 total). Energy, food direction/proximity, social density, threat, safe-zone calm, phase, and
stable personality are compacted into the six neural lanes. The four outputs directly contribute
two motor axes and two activity axes; those outputs steer movement and select eat, rest, socialize,
or roam. Visitor presence and social activity are live inputs, not decorative labels.

Model shape and every weight/input/output are validated for finite values. Invalid weights, inputs,
or outputs select the deterministic resting fallback and are exposed through controller status.
The fallback does not claim that a model drove the action. Tree residents are friendly by default,
do not contest visitors, use the canonical edible registry, and return to ordinary tree activity
after food or social activity. No sentience, online-learning, or physical-quantum claim follows from
this controller.

Social visits use willing active partners, reciprocal reservations, reach checks, and expiring
leases. Matching is one pass over each bounded adapter-local active visitor set; a partner may hold
only one pair. Ordinary Entities and Xenomimics share one pool, while fixed fauna and launched NHIs
share another. Cross-pool targeting and direct visitor-to-tree-resident pairing are not claimed.
Partner loss or excess distance releases both ends, and visit cleanup prevents permanent pairing.
The world callback maps valid social/observation activity into existing Entity activation/payoff and
Xenomimic shimmer feedback. No teaching or knowledge-transfer result is recorded unless a canonical
underlying system performs one.

## Bounded-query and performance contract

- Candidate discovery is round-robin and capped at 64 ordinary/Xenomimic candidates every 0.1
  simulation seconds plus 24 fixed-fauna candidates every 0.15 seconds, not a full-population scan
  every frame.
- Active work is bounded by the 72-visitor capacity. O(1) identity maps locate active ordinary and
  Xenomimic visitors; the visit manager steps a dense scheduled-record set rather than every actor
  record, and social matching is a single bounded pass rather than all pairs.
- The 20,000 food objects are fixed and pooled. Deterministic per-kind free lists make free-resource
  selection O(1); fixed indexed heaps make lease/respawn deadline changes O(log capacity) without
  per-cycle object growth.
- Visitor and scheduler arrays are allocated once at construction, reusable read/stat views avoid
  steady-frame object creation, and development observability remains data-only. It must never add a
  tether-like debug line.

Automated contract coverage lives in `tests/edible-resource.test.ts`,
`tests/big-tree-zone.test.ts`, `tests/big-tree-visitors.test.ts`,
`tests/big-tree-sanctuary.test.ts`, `tests/big-tree-fauna-visitors.test.ts`,
`tests/tree-creature-brain.test.ts`, `tests/big-tree-observability.test.ts`,
`tests/portal-death.test.ts`, the Crystal ecosystem test family, and
`tests/big-tree-world-integration.test.ts`, with species-hook coverage in the Shoggoth, Titan, and
Puppet test families. This amendment records implemented code and automated
targets only; it does not claim GitHub Pages deployment or manual browser verification.
