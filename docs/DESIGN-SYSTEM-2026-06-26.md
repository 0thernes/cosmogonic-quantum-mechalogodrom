<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Design System — Cosmogonic Quantum Mechalogodrom

Audit + token reference + component documentation for the void/cyan glass UI.
Sources of truth: `src/styles/app.css` (`@theme static` tokens) and
`index.html` (utility classes). The audit below was run against the v1 UI
(pre-remediation); the **Remediation record** documents what the V2 pass fixed.

---

## Design System Audit

### Summary

**Components reviewed:** 11 | **Issues found:** 12 | **Score:** 58/100 (pre-fix) → **91/100 (post-remediation)**

Counts below are real `grep -oE` measurements against the pre-remediation
files, reproducible with:
`grep -oE '#[0-9a-fA-F]{3,8}\b' index.html` (minus `&#NNNN;` HTML entities),
`grep -oE '\[[0-9.]+px\]' index.html`, `grep -oE 'rgba\([0-9., ]+\)' <file>`.

### Naming Consistency

| Issue                                                                                                             | Components                                                        | Recommendation                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixed id conventions: legacy short codes (`#sP #cP #aP #nm #sec #alg #joy #bar`) vs kebab (`#a-name #audit-list`) | All                                                               | **Freeze.** Ids are a contract surface (MODULE-CONTRACTS-2026-06-26.md binds them); renaming breaks `ui/*` caches and HTMX targets. Registry below.                                      |
| Two data-attribute systems: `[data-a]` vs `[data-action]`                                                         | ControlPad key, ToolbarButton                                     | **Keep — semantic.** `data-a` = held (pointerdown..up, `.on` state); `data-action` = one-shot tap. Documented per component.                                                             |
| Three color-sourcing strategies: raw hex arbitrary values, Tailwind palette names, theme tokens                   | ControlPad key (raw hex), ToolbarButton (emerald-\*), Panel (mix) | **Adopt theme tokens for repeated/identity colors** — applied (see Remediation). One-off tint families (emerald/purple/orange) stay on the standard palette and are documented as roles. |
| Sparkline stroke colors are rgba strings in TS (`ui/panels.ts`), unlinked to CSS tokens                           | Sparkline                                                         | **Accepted.** Canvas needs runtime strings; the mapping is pinned in the token tables below — change both or neither.                                                                    |

### Token Coverage

| Category   | Defined (pre-fix)        | Hardcoded Values Found (pre-fix)                                                                                                                                            |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors     | 3 (`void accent warn`)   | **76** hex in `index.html` class attrs (5 ctrl blues ×12 buttons = 60; 3 sim oranges = 16) + **9** `rgba()` shadows; `app.css`: **4** hex + **8** `rgba()` outside `@theme` |
| Spacing    | 0 custom (default scale) | **115** arbitrary `[Npx]` utilities across 9 distinct sizes (`[5px]`×30, `[8px]`×31, `[10px]`×18, `[9px]`×13, `[26px]`×11, `[30px]`×5, `[11px]`×3, `[88px]`×2, `[29px]`×2)  |
| Typography | 2 font families          | 4 raw font sizes (8/9/10/11px) used 48× via `text-[Npx]`; display clamp + tracking clamp inline on `#sec`                                                                   |
| Radii      | 0                        | `rounded-[10px]` ×5, `rounded-[5px]` ×28                                                                                                                                    |
| Shadows    | 0                        | 3 box-shadow + 6 text-shadow arbitrary literals                                                                                                                             |
| Motion     | 0                        | 3 raw durations in `app.css` (0.2s/0.8s/1.2s); no reduced-motion handling                                                                                                   |

Accepted residuals (cannot be tokenized): `<meta name="theme-color">` hex ×1,
favicon data-URI hex ×4 (URL-encoded SVG), media-query breakpoints and
safe-area `calc()` anchors in `app.css`.

### Component Completeness

Pre-fix scores; ✅ = complete, ⚠️ = partial, ❌ = missing. "States" counts
default/active/focus/collapsed as applicable.

| Component                       | States                                      | Variants                            | Docs | Score |
| ------------------------------- | ------------------------------------------- | ----------------------------------- | ---- | ----- |
| Panel (`#sP #cP #aP`)           | ⚠️ default/collapsed, no focus ring on chev | ✅ telemetry/control/audit          | ⚠️   | 6/10  |
| ToolbarButton (`[data-action]`) | ⚠️ default/active, no focus                 | ✅ standard/danger                  | ⚠️   | 6/10  |
| ControlPad key (`[data-a]`)     | ⚠️ default/active/held `.on`, no focus      | ✅ movement (blue)/sim (orange)     | ⚠️   | 6/10  |
| TelemetryRow (`#v0..#v8`)       | ✅ (display-only)                           | ✅ stat/env                         | ⚠️   | 7/10  |
| Banner (`#sec`)                 | ✅ hidden/show fade                         | —                                   | ⚠️   | 7/10  |
| Toast (`#nm`)                   | ✅ hidden/show fade                         | —                                   | ⚠️   | 7/10  |
| AlgoCard (`#alg`)               | ✅ (display-only)                           | —                                   | ⚠️   | 6/10  |
| Sparkline (`#g0..#g3`)          | ✅ (display-only)                           | ✅ 4 color series                   | ✅   | 8/10  |
| AuditFeed (`#audit-list`)       | ✅ empty/populated                          | —                                   | ✅   | 8/10  |
| Joystick (`#joy`)               | ⚠️ pointer-tracked, no visual held state    | —                                   | ⚠️   | 5/10  |
| NavLink (Docs)                  | ⚠️ hover only, no focus                     | ❌ single instance, no nav identity | ❌   | 4/10  |

### Priority Actions

1. **Hoist the 76 hardcoded hex + 115 arbitrary px into `@theme` tokens** —
   the control-pad and sim button identities were copy-pasted 12×/4× and
   would drift on first edit. _(Done — see Remediation.)_
2. **Add `:focus-visible` rings to every interactive element** — keyboard
   users had near-invisible UA defaults on dark glass. _(Done.)_
3. **Add `prefers-reduced-motion` damping** for all fades/transitions.
   _(Done.)_
4. **Define the V2 surfaces** — tribe palette tokens for graph-mind, the
   `#v9/#v10/#v11` telemetry rows, the `#lore` line, and a nav-variant `/lab`
   link. _(Done.)_
5. Joystick visual held state + audit-feed relative timestamps — deferred,
   tracked as backlog below.

### Remediation record (V2 design pass)

- `index.html`: arbitrary hex in class attributes **76 → 0**; arbitrary
  `[Npx]` utilities **115 → 0**; inline `rgba()` literals **9 → 0**. The
  orphan 11px chevron size was normalized to `text-xs` (12px) — the only
  intentional visual delta (+1px on a glyph), recorded here.
- `src/styles/app.css`: hex outside `@theme` **4 → 0**; raw `rgba()`
  **8 → 0** (now `--alpha(var(--color-*) / N%)`); raw durations **3 → 0**
  (motion tokens). `@theme static` so every token is emitted to `:root` and
  runtime-readable via `getComputedStyle`.
- Added: focus-visible rings, reduced-motion damping, semantic
  `danger` family on the apocalypse button, 8-hue tribe palette, micro type
  scale (`text-2xs/3xs/4xs`, `text-display`), radius/shadow/motion tokens,
  telemetry rows `#v9 #v10 #v11`, `#lore` line, `/lab` toolbar nav link.
- Verified: `bun run build` compiles every token utility (checked in
  `dist/*.css`); the 2,566-test canonical floor passes; prettier/oxlint/tsc clean.

### Remediation record (0.2.x controls + color pass)

User report: controls felt flatter and less colorful than the legacy
original. Root causes and fixes (legacy lines 40-92 as reference):

- **Toolbar had drifted off the legacy greens** to pale `emerald-*` palette
  names → new `bar-*` token family pinned to the legacy `#bar` values
  (`#00e664` / `#00b45a` / `#8ea` / `#00ff64`); `#bar` border now
  `bar-line/15` (legacy `rgba(100,255,100,.1)` green tinge).
- **Danger had drifted to pale `red-400/300`-range hexes** → restored legacy
  reds: `#f00` fills, `#ff3232` borders, `#f88` ink.
- **No hover affordance anywhere** (legacy had none either, but desktop
  expects it) → three-step idle/hover/active ramp on every button; idle
  tints raised one step (borders /15→/30, fills /10→/15) so the blue/orange
  color coding reads at rest; `.on` glow strengthened to match.
- **Targets**: control keys `h-7`→`h-8` (32px), toolbar `min-h-6.5`→`min-h-7`
  (28px) + `px-2`→`px-2.5`.
- **Key hints**: `<kbd>` chips on all 16 pad keys (movement letters + ⇧␣M⇥
  held macros); sim-key `aria-label`/`title` now name their held-key twins.
- **Canvas became an input surface**: pointer-drag mouse-look + wheel zoom
  (`InputSystem.look`/`zoom`), `cursor-grab/grabbing` + `touch-none` on `#c`.
- No ids, data-attributes, or module APIs changed; `InputSystem` gained the
  additive `look`/`zoom` contract amendment (documented in input.ts JSDoc).

---

## Tokens

All tokens live in the `@theme static` block of `src/styles/app.css`.

### Color roles

| Token                 | Value                   | Role                                               |
| --------------------- | ----------------------- | -------------------------------------------------- |
| `--color-void`        | `#030612`               | Page/scene background, panel glass base            |
| `--color-accent`      | `#0ef`                  | Panel headers, focus rings, nav links, audit times |
| `--color-warn`        | `#fa0`                  | Telemetry keys (at /70), warnings                  |
| `--color-danger`      | `#f00`                  | Destructive fills (/5 idle, /15 hover, /25 active) |
| `--color-danger-line` | `#ff3232`               | Destructive borders (legacy `rgba(255,50,50)`)     |
| `--color-danger-ink`  | `#f88`                  | Destructive captions (legacy `#f88`)               |
| `--color-ink`         | `#9fb6d9`               | Audit body text                                    |
| `--color-ink-dim`     | `#8fa8c8`               | Audit `code` detail text                           |
| `--color-ink-ghost`   | `rgba(184,200,232,0.4)` | Empty-state placeholder text                       |

Control-pad family (held movement keys, blue): `--color-ctrl-line #0078dc`
(idle border) · `--color-ctrl-bg #0050a0` (idle fill) · `--color-ctrl-ink
#88bbff` (caption) · `--color-ctrl-hot #008cff` (held fill) ·
`--color-ctrl-glow #00b4ff` (held border) · `--color-ctrl-halo #0078ff`
(held outer glow).

Sim-action family (split/burst/mutate/chaos, orange): `--color-sim-line
#ff6400` · `--color-sim-bg #ff5000` · `--color-sim-ink #ffaa88` ·
`--color-sim-glow #ff8c00` · `--color-sim-halo #ff7800`.

Toolbar family (one-shot `[data-action]` buttons + `#bar` border, green —
the legacy `#bar` palette, restored in the 0.2.x controls pass):
`--color-bar-line #00e664` (borders) · `--color-bar-bg #00b45a` (idle fill)
· `--color-bar-ink #8ea` (caption) · `--color-bar-hot #00ff64`
(hover/active fill).

Standard-palette tint roles (kept on Tailwind names, not re-tokenized):
algo card = `purple-*`, toast = `orange-*`, joystick = `sky/cyan-*`,
panel borders = `cyan-300/15`.

### Tribe palette (graph-mind communities, V2)

8 evenly spaced hues; community `k` renders at **hue `k/8` turns,
saturation 0.85, lightness 0.60**. The three.js side MUST use the same
formula — `color.setHSL(k / 8, 0.85, 0.6)` — so connectome link colors,
entity halos, and any future DOM tribe legend agree.

| Token             | Value                 | Token             | Value                 |
| ----------------- | --------------------- | ----------------- | --------------------- |
| `--color-tribe-0` | `hsl(0deg 85% 60%)`   | `--color-tribe-4` | `hsl(180deg 85% 60%)` |
| `--color-tribe-1` | `hsl(45deg 85% 60%)`  | `--color-tribe-5` | `hsl(225deg 85% 60%)` |
| `--color-tribe-2` | `hsl(90deg 85% 60%)`  | `--color-tribe-6` | `hsl(270deg 85% 60%)` |
| `--color-tribe-3` | `hsl(135deg 85% 60%)` | `--color-tribe-7` | `hsl(315deg 85% 60%)` |

Sparkline strokes (canvas strings in `ui/panels.ts`, pinned here): entities
`rgba(0,200,255,1)` · chaos `rgba(255,80,0,1)` · energy `rgba(100,255,100,1)`
· connectome `rgba(255,255,0,1)`; each fills its area at 8% alpha over
`rgba(0,0,8,0.85)`.

### Type scale

Two families only — `--font-ui` (Inter Variable; labels, uppercase, wide
tracking) and `--font-mono` (JetBrains Mono; every numeral, `tabular-nums`).

| Token / utility | Size                     | Used for                                             |
| --------------- | ------------------------ | ---------------------------------------------------- |
| `text-display`  | `clamp(14px, 4vw, 28px)` | Sector banner `#sec` (+ `tracking-display`)          |
| `text-xs`       | 12px (Tailwind std)      | Panel chevrons                                       |
| `text-2xs`      | 10px                     | Telemetry values, panel headers, toast `#nm`         |
| `text-3xs`      | 9px                      | Toolbar captions, algo name, Docs//lab links         |
| `text-4xs`      | 8px                      | Telemetry keys, env rows, control-pad captions, lore |

Tokens define **font-size only** — line-height inherits, matching the
`text-[Npx]` utilities they replaced. Numerals never jitter: `font-mono` +
`tabular-nums` is mandatory on every value cell.

### Spacing

Default Tailwind dynamic scale (`--spacing: 0.25rem`); no custom spacing
tokens. Steps in use: `0.5`(2px) `1`(4px) `1.25`(5px) `1.5`(6px — global
gutter) `2`(8px) `2.5`(10px) `3.5`(14px) `6.5`(26px — toolbar button
min-height) `7`(28px — control key height) `7.25`/`7.5`(joystick knob)
`22`(88px — joystick pad). Safe-area: `env(safe-area-inset-top/bottom)`
calc() anchors (see layout documentation).

### Radii

| Token            | Value | Used for                                       |
| ---------------- | ----- | ---------------------------------------------- |
| `--radius-panel` | 10px  | Glass panels, toolbar, algo card               |
| `--radius-btn`   | 5px   | Control keys, toolbar buttons, Docs//lab links |
| `rounded` (std)  | 4px   | Panel chevrons                                 |
| `rounded-full`   | —     | Toast pill, joystick pad + knob                |

### Blur / elevation

| Layer             | Treatment                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Panel glass       | `bg-void/90` + `backdrop-blur-xl` (24px) + `backdrop-saturate-150` + `shadow-panel` (`--shadow-panel: 0 4px 30px rgba(0,0,0,0.4)`) |
| Algo card         | `bg-void/90` + `backdrop-blur-lg` (16px)                                                                                           |
| Toast / Docs link | `backdrop-blur-md` (12px)                                                                                                          |
| Header glow       | `--text-shadow-glow-accent: 0 0 12px rgba(0,220,255,0.35)`                                                                         |
| Banner glow       | `--text-shadow-banner` (40px + 80px cyan pair)                                                                                     |
| Toast glow        | `--text-shadow-toast: 0 0 20px rgba(255,150,0,0.5)`                                                                                |
| z-ladder          | 0 canvas · 20 panels/bar/links · 22 toast · 25 banner/joystick                                                                     |

### Motion

| Token             | Value  | Used for                               |
| ----------------- | ------ | -------------------------------------- |
| `--motion-tap`    | 100ms  | Button press feedback (`duration-100`) |
| `--motion-chev`   | 200ms  | Panel-collapse chevron rotation        |
| `--motion-toast`  | 800ms  | `#nm` opacity fade                     |
| `--motion-banner` | 1200ms | `#sec` opacity fade                    |

Easing is the browser default `ease` everywhere. Hold times (2.5s banner, 3s
toast) are JS constants in `ui/hud.ts`. **Reduced motion:** a global
`prefers-reduced-motion: reduce` rule damps all transition/animation
durations to 1ms (snap, not disable) — visibility timing stays JS-governed.

---

## Components

Interactive components all share: `:focus-visible` → 2px `--color-accent`
outline, offset 2px (CSS in app.css, applies to every `button` and `a`).

### Panel (`#sP` telemetry · `#cP` control · `#aP` audit)

Glass section: `rounded-panel border-cyan-300/15 bg-void/90 backdrop-blur-xl
backdrop-saturate-150 shadow-panel`, header (`[data-panel-toggle]`) + body
(`.panel-body`, scrollable, max-height clamped).

| State     | Visual                                                     | Behavior                                              |
| --------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| Default   | Body visible, chevron pointing down                        | —                                                     |
| Collapsed | `.col` on panel: body `display:none`, chevron rotated −90° | Click anywhere on header toggles (`bindPanelToggles`) |

A11y: each `<section>` carries `aria-label`. The header div itself is not
focusable; keyboard access is via the chevron `<button>` (labelled "Collapse
or expand … panel"), whose click bubbles to the header listener. Known
limitation: collapse state is not announced (`aria-expanded` candidate —
backlog).

### ToolbarButton (`#bar [data-action]`)

One-shot action: `min-h-7 rounded-btn border px-2.5 py-1 font-ui text-3xs`.
Variants: **standard** (green `bar-*` tokens — the legacy `#bar` family) and
**danger** (`danger-*` tokens, apocalypse only).

| State  | Visual (standard / danger)                                           |
| ------ | -------------------------------------------------------------------- |
| Idle   | `bar-line/20` border, `bar-bg/10` fill, `bar-ink` / `danger-*` tints |
| Hover  | `bar-hot/15` fill, `bar-line/40` border, white text (hover pointers) |
| Active | `bar-hot/25` (`danger/25`) fill, white text, 100ms transition        |

Every icon-only button has `aria-label` **and** `title` (Known Bug 7).
Container is `role="toolbar"` + `aria-label="Simulation toolbar"` with a
`bar-line/15` border (legacy green-tinged bar).

### NavLink (Docs · `/lab`)

Anchor styled in the **accent (cyan) family** — navigation is visually
distinct from simulation actions. As of V51 the `/lab`, `/docs`, and `/spec`
nav links all live in the **bottom dock** (`ui/panel-dock.ts` adopts them
there); the toolbar `#bar` is purely world controls. States: default → hover
(`accent/10` fill, `accent/40` border, full-accent text) → `active:` fill.

### ControlPad key (`#cP [data-a]`)

Held control: `h-8 rounded-btn text-4xs`, blue `ctrl-*` family for movement
(fwd/back/left/right/up/down/rleft/rright/tup/tdown/yleft/yright), orange
`sim-*` family for split/burst/mutate/chaos. Each key leads with a `<kbd>`
chip naming its keyboard twin (movement letters; sim macros ⇧/␣/M/⇥) —
14px family-tinted mono badge, styled by `[data-a] kbd` in `app.css`.

| State | Visual                                                                         | Behavior                                   |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Idle  | Tinted border (/30) + fill (/15), family ink caption                           | —                                          |
| Hover | Hot fill /20, glow border /45, white text (hover-capable pointers only)        | CSS `hover:` utilities                     |
| Held  | `.on` (JS) and `:active` (CSS): hot fill, glow border, halo shadow, white text | `ui/input.ts` pointerdown..up/leave/cancel |

A11y: every key has `aria-label` + `title` naming its keyboard twin
(e.g. "Move forward (W)", "Burst-spawn entities (hold Space)").

### TelemetryRow (`#v0..#v11`, env rows `#ew #ewi #et #es #ep`)

Label/value pair: `text-4xs` uppercase warn-tinted key + `text-2xs` mono
tabular value. V2 rows: `#v9` TRIBES (int), `#v10` TREND (signed `+x.x/m`),
`#v11` QBIT-S (`0.00`–`1.00`). Display-only; updated every ~8th frame by
`TelemetryPanel.update`. Values stay legible at 7.5 Hz because of
tabular-nums (no horizontal jitter).

### Banner (`#sec`)

Centered display text at 42% viewport height, `text-display` +
`tracking-display` + `text-shadow-banner`. Hidden (opacity 0) ↔ `.show`
(opacity .55) over `--motion-banner`; auto-hides after 2.5s.
`pointer-events-none`; decorative — content duplicated nowhere, announced
nowhere (intentional: high-frequency ambient info).

### Toast (`#nm`)

Top-center pill (orange family, `backdrop-blur-md text-shadow-toast`),
`NAME — action` from puppet-master events. `.show` (opacity .8) over
`--motion-toast`, auto-hides after 3s. `pointer-events-none`.

### AlgoCard (`#alg`)

Bottom-left violet glass card: `#a-name` (text-3xs, white, semibold),
`#a-step` (text-4xs mono, purple-200, `step N ⇄`), and V2 `#lore` (text-4xs
ui, uppercase, purple-300/80) — the Voronoi sub-sector lore name, written by
`Hud.setLore` only on change. Position flips with pointer media. Display-only, `pointer-events-none`.

### Sparkline (`#g0..#g3`)

24px-tall canvas under its telemetry row; ring buffer of 100 samples, HiDPI
2× backing store, stroke colors pinned in the token table above. Redraws
every 3rd panel update (~24 frames). Decorative (`<canvas>` without role);
the numeric row above it is the accessible value.

### AuditFeed (`#aP` → `#audit-list`)

Server-rendered `<ol>` fragment polled by HTMX (`hx-get="/api/audit"`,
load + every 5s). Styled wholesale from app.css tokens (`ink` family,
accent timestamps). Empty state renders "awaiting events…" via CSS
`::after`. Entries are server-escaped (see SECURITY).

### Joystick (`#joy` → `#jP` pad / `#jK` knob)

Touch-only (`hover:none`/`pointer:coarse` media), 88px pad / 30px knob,
sky/cyan tints. Pointer tracked by identifier (Known Bug 8). Not focusable
and intentionally outside the tab order — every joystick capability has a
keyboard/button equivalent in `#cP`. Backlog: visual held state on `#jK`.

### Canvas look surface (`#c`)

The WebGL canvas is itself an input surface (0.2.x): `cursor-grab` idle →
`cursor-grabbing` while `:active` signals draggability; `touch-none` keeps
browser gestures from eating touch drags. A pointer that goes **down on the
canvas** (mouse, pen, or touch outside the joystick — all UI floats above
the canvas) is captured and its drag accumulates into `InputSystem.look`;
the wheel accumulates into `InputSystem.zoom`. The world consumes-and-zeroes
both each frame in free view. First pointer wins; pad/toolbar/joystick
interaction never steers the camera. Not focusable — keyboard users have
full camera control via W A S D Q E Z X R F C V.

---

## Id registry (frozen — contract surface)

`#c` canvas · `#sec` banner · `#npc-t`/`#nm` toast · `#sP #cP #aP` panels ·
`#audit-list` feed target · `#bar` toolbar · `#alg` (`#a-name #a-step
#lore`) algo card · `#joy #jP #jK` joystick · `#v0..#v11` stats ·
`#ew #ewi #et #es #ep` env rows · `#g0..#g3` sparklines.

## Backlog (non-blocking)

1. `aria-expanded` on panel chevrons reflecting `.col` state.
2. Joystick knob held-state visual (`.on` analog).
3. Relative timestamps in the audit feed (server renders absolute).
