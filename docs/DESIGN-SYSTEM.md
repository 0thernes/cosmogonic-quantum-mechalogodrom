# Design System — Cosmogonic Quantum Mechalogodrom

Audit + token reference + component documentation for the void/cyan glass UI.
Sources of truth: `src/styles/app.css` (`@theme static` tokens) and
`index.html` (utility classes). Layout anchors live in
[WIREFRAMES.md](WIREFRAMES.md). The audit below was run against the v1 UI
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
| Mixed id conventions: legacy short codes (`#sP #cP #aP #nm #sec #alg #joy #bar`) vs kebab (`#a-name #audit-list`) | All                                                               | **Freeze.** Ids are a contract surface (MODULE-CONTRACTS.md binds them); renaming breaks `ui/*` caches and HTMX targets. Registry below.                                                 |
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
  `dist/*.css`); 229 tests pass; prettier/oxlint/tsc clean.

---

## Tokens

All tokens live in the `@theme static` block of `src/styles/app.css`.

### Color roles

| Token                 | Value                   | Role                                               |
| --------------------- | ----------------------- | -------------------------------------------------- |
| `--color-void`        | `#030612`               | Page/scene background, panel glass base            |
| `--color-accent`      | `#0ef`                  | Panel headers, focus rings, nav links, audit times |
| `--color-warn`        | `#fa0`                  | Telemetry keys (at /70), warnings                  |
| `--color-danger`      | `#ef4444`               | Destructive fills (apocalypse active)              |
| `--color-danger-line` | `#f87171`               | Destructive borders                                |
| `--color-danger-ink`  | `#fca5a5`               | Destructive captions                               |
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

Standard-palette tint roles (kept on Tailwind names, not re-tokenized):
toolbar = `emerald-*`, algo card = `purple-*`, toast = `orange-*`,
joystick = `sky/cyan-*`, panel borders = `cyan-300/15`.

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
calc() anchors (see WIREFRAMES placement table).

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

One-shot action: `min-h-6.5 rounded-btn border px-2 py-1 font-ui text-3xs`.
Variants: **standard** (emerald tint) and **danger** (`danger-*` tokens,
apocalypse only). States: default → `active:` fill+white text (100ms). Every
icon-only button has `aria-label` **and** `title` (Known Bug 7). Container is
`role="toolbar"` + `aria-label="Simulation toolbar"`.

### NavLink (Docs · `/lab`)

Anchor styled as a toolbar button but in the **accent (cyan) family** —
navigation is visually distinct from simulation actions. `/lab` sits in
`#bar` (aria-label "Open the Quantum Wildbeyond lab artifact"); Docs floats
bottom-right. States: default → `hover:text-accent` → `active:` fill.

### ControlPad key (`#cP [data-a]`)

Held control: `h-7 rounded-btn text-4xs`, blue `ctrl-*` family for movement
(fwd/back/left/right/up/down/rleft/rright/tup/tdown/yleft/yright), orange
`sim-*` family for split/burst/mutate/chaos.

| State | Visual                                                                         | Behavior                                   |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Idle  | Tinted border/fill, family ink caption                                         | —                                          |
| Held  | `.on` (JS) and `:active` (CSS): hot fill, glow border, halo shadow, white text | `ui/input.ts` pointerdown..up/leave/cancel |

A11y: every key has `aria-label` + `title` naming its keyboard twin
(e.g. "Move forward (W)").

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
`Hud.setLore` only on change. Position flips with pointer media (see
WIREFRAMES). Display-only, `pointer-events-none`.

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
