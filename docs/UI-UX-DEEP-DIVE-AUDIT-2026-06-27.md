# UI/UX Deep-Dive Audit — 2nd + 3rd + 4th + 5th + 6th + 7th + 8th + 9th Pass

**Scope:** Full frontend visual audit of the simulation shell, dynamically mounted inspector panels, controls, static satellite pages (Docs/Spec/Lab), and the Super Creature / Access-Puzzle flow.  
**Date:** 2026-06-28 (2nd + 3rd + 4th + 5th + 6th + 7th + 8th + 9th pass)  
**Sources reviewed:** `index.html`, `site/index.html`, `site/docs.html`, `site/specs.html`, `site/lab/index.html`, `src/styles/app.css`, `src/main.ts`, `src/core/quality.ts`, `src/core/frame-governor.ts`, `src/memory/store.ts`, `src/world.ts`, `scripts/build-pages.ts`, `scripts/build.ts`, `scripts/sync-surfaces.ts`, `scripts/canonical-receipts.ts`, `.github/workflows/pages.yml`, `.githooks/pre-commit`, `.gitignore`, `README.md`, `src/ui/*.ts` (copilot, help-system, market-ticker, nhi-observatory, super-neural, super-panel, pantheon-architecture-panel, access-puzzle, superhero-hud, center-hud, **panel-dock**, audit-dock, perf-hud, input, hud, observatory, graphs, panels).  
**Method:** Static code review, cross-device media-query trace, numerical consistency comparison, z-index/cascade analysis. No runtime fixes applied.

---

## 1. Executive Summary

The interface has a **well-engineered structural core** — Tailwind v4, a static-emitted token system, a responsive grid with edge-docked sheet fallback, and the `center-hud.ts` unification pattern. The user's reported roughness is real, but it is now concentrated in **twelve systemic failures** rather than isolated bugs:

1. **Token leakage —** every dynamically mounted panel ships its own hard-coded palette, font sizes, and shadows. The shell is void/cyan glass; the satellites are green, purple, red, gold, and beige.
2. **Bottom-band collision architecture —** the toolbar, center HUD launcher, readout boxes, dock buttons, touch controls, and nav links all compete for the same 90–110px of screen bottom. On phones and short laptops the world is a letterbox.
3. **Incomplete Super Creature / Access-Puzzle flow —** the puzzle is a self-contained green terminal with no solved-state UI; the superhero HUD is a tiny, non-responsive, cosmetic inventory bar with no world anchor.
4. **Satellite pages are three separate websites —** Docs/Spec/Lab have no shared CSS, nav, or data source. Numbers disagree across `README.md`, `index.html`, and the deployed Pages.
5. **Micro-typography as default —** the base UI is built around 8–10px type. It reads as data-dense on desktop and becomes illegible on phones; it is the root cause of the "fonts off comparing" complaint.
6. **The center HUD and the panel dock are two competing nav systems —** `panel-dock.ts` builds a bottom bar and mounts every panel toggle into it; `center-hud.ts` then hides that bar with `display:none !important` and builds a second launcher. The dock is still in the DOM, still mounts buttons, and is still clicked programmatically. This is a workaround, not a unified architecture, and it contributes to the bottom-band messiness.
7. **Input and boot-time architecture are not phone-first —** the joystick and lookpad are touch-only (not pointer events), the action wheel is pointer-based, and the toolbar is click-based, so the same device can be handled by three different input APIs. Quality detection is coarse (`hover:none || pointer:coarse || viewport < 600px`), so small desktop windows and large tablets are misclassified.
8. **The satellite pages are three separate websites with stale data —** Docs, Specs, and Lab each have their own inline CSS, their own font families, and their own viewport meta tags. `scripts/build-pages.ts` only rewrites nav links; it does not regenerate the hardcoded test/coverage numbers from a canonical source, so the site disagrees with the README. The Lab page is based on the Anthropic algorithmic-art viewer template and uses a light background with Poppins/Lora fonts — a completely different brand from the void/cyan simulation shell.
9. **The source HTML and CSS are not maintainable at scale —** `index.html` repeats ~270-character Tailwind class chains on every control-pad button; `app.css` uses a token that is not defined (`--color-white`); `world.ts` constructs a dozen UI panels directly, so the UI is a byproduct of the sim boot rather than a declared component tree. These are not user-visible bugs, but they are why the UI keeps accumulating small inconsistencies.
10. **The committed build artifacts are stale —** the `site/` directory is listed in `.gitignore` but remains tracked in the repo, and it still contains numbers from an older build (1,477 tests / 95.03% / 92.03%) while the source files and `canonical-receipts.ts` have the current numbers (1,771 / 91.97% / 94.85%). The pre-commit hook syncs the source files but does not regenerate `site/`, and the hook is non-blocking, so stale artifacts can ship.
11. **The first-time user experience is hostile —** the app opens on a 3D world with no onboarding, a 19-button scrolling toolbar, three tiny nav links in the corner, and an access-puzzle toggle that keeps flickering after it is solved. The hero HUD and access puzzle are self-mounting, but they provide no introduction, no tutorial, and no confirmation that the simulation is interactive.
12. **Accessibility and reduced-motion support are inconsistent —** the app has good ARIA labels on individual buttons, but the toolbar lacks roving tabindex, the flickering access-puzzle and superhero pulse animations have no reduced-motion escape hatch, and the 8px micro-type fails WCAG readability thresholds. The `prefers-reduced-motion` media query exists but only shortens transitions; it does not stop the decorative scramble, denied-language rotation, or pulse loops.

**Overall score:** 6.0/10 — strong bones, inconsistent finish, navigation system needs unification, input ergonomics need consolidation, satellite pages need a shared brand, the source needs a component layer, the build artifacts need to be kept fresh, the first-run experience needs an onboarding pass, and accessibility/reduced-motion need to be systematic rather than spot-checked.

---

## 2. What Is Working Well

- **Tailwind v4 token system in `src/styles/app.css`** is clean, statically emitted, and runtime-readable. The color families (accent, warn, danger, ink, ctrl, sim, bar) are semantically named and well documented.
- **Responsive grid in `app.css:509-537`** is the right architecture: three-column grid on desktop, edge-docked sheets on small/portrait/coarse, twin rails on foldable landscape, 10-foot mode on large coarse screens.
- **TV scaling is correctly gated** to `(min-width: 1900px) and (orientation: landscape) and (pointer: coarse)` so it does not blow up fine-pointer desktop layouts.
- **Center HUD (`center-hud.ts`)** solves the bottom-dock overlap problem by re-homing inspector panels into a measured center slot. However, it achieves this by hiding the original `panel-dock` with `display:none !important` and building a second launcher, then driving the hidden buttons by click. It is a successful workaround, not a unified navigation architecture.
- **Observatory canvas sizing uses container queries** (`@container (min-width: 300px)` etc.) so charts scale with the panel width rather than the viewport.
- **Accessibility basics** are present: focus-visible rings, reduced-motion damping, ARIA labels, safe-area insets, `touch-action` hints.
- **Audit panel neutralization** (`audit-dock.ts`) correctly removes the dead HTMX poll and renders the localStorage trail client-side.

---

## 3. Architectural Finding: The Self-Mounting Panel Pattern

### 3.1 How the UI is assembled

`src/main.ts` imports six side-effect modules that each inject DOM and styles:

```
import './ui/copilot';        // AI chat toggle + panel
import './ui/access-puzzle';  // ACCESS toggle + modal
import './ui/help-system';    // HELP toggle + panel
import './ui/audit-dock';     // AUDIT toggle + client renderer
import { initCenterHud } from './ui/center-hud';  // launcher + re-homes panels
```

Then `world.ts` constructs `SuperPanel`, `PantheonArchitecturePanel`, `NhiObservatory`, `MarketTicker`, etc. — each also injects its own `<style>` and panel.

**Result:** the final DOM is a stack of **independently authored panels**, not a coherent component tree. The main stylesheet establishes the shell, but the actual inspectors are self-contained CSS micro-apps.

### 3.2 Style injection order is a cascade risk

Each panel does:

```ts
const style = doc.createElement('style');
style.textContent = STYLE;
doc.head.appendChild(style);
```

Because `appendChild` always adds to the end of `<head>`, the **last panel to mount wins** when selectors overlap. With HMR or hot reload, the order can change. This is a real cross-browser risk: a selector like `#cqm-sup-panel` or `.cqm-arch-main` could be overridden by a later-mounted panel with equal or higher specificity.

### 3.3 No shared panel chrome

Every panel reinvents its own header, close button, and section titles. The current inventory:

| Panel        | Toggle shape    | Accent           | Header         | Close button |
| ------------ | --------------- | ---------------- | -------------- | ------------ |
| Copilot      | round 42px icon | blue `#6aa6ff`   | flex bar       | 16px text    |
| Help         | 42px pill       | green `#66e0a0`  | flex bar       | 11px boxed   |
| Audit        | 42px pill       | cyan `#5cc6e0`   | dock toggle    | none         |
| Market       | 42px pill       | gold `#ffc24a`   | flex bar       | 11px boxed   |
| Super        | 42px pill       | purple `#c478ff` | flex bar       | 11px boxed   |
| Architecture | 42px pill       | red `#ff3b4e`    | flex bar       | 11px boxed   |
| NHI          | 42px pill       | violet `#b98cff` | flex bar       | 11px boxed   |
| Access       | 42px pill       | green `#7dffc0`  | flex bar       | 12px boxed   |
| Superhero    | no toggle       | purple `#c79bff` | three-row band | none         |

This is the core reason the UI feels "messy" — the user is looking at **nine different design languages** that share only the bottom-left toggle bar.

---

## 4. Third Pass — The Center HUD / Panel Dock Hack and the Cascade Stack

### 4.1 Two navigation systems occupy the same conceptual layer

`panel-dock.ts` (`src/ui/panel-dock.ts:15-37`) is designed to be the single bottom bar. It mounts every panel toggle into one glass pill (`#cqm-dock`) at `bottom: 62px`, centered, with `flex-wrap: nowrap` and horizontal scrolling.

Then `center-hud.ts` (`src/ui/center-hud.ts:78-81`) does this:

```css
#cqm-dock {
  display: none !important;
}
```

It replaces the dock with a new launcher (`#cqm-hud-nav`) at `bottom: 66px`. It also re-homes every panel into a center column with `!important` positioning (`src/ui/center-hud.ts:55-68`).

**Why this matters:**

- The hidden `#cqm-dock` still exists in the DOM and still contains all the panel toggle buttons. Its CSS is still loaded. It is a dead, hidden, but active component.
- `center-hud.ts` drives the hidden buttons by clicking them (`drive()` calls `document.getElementById(s.toggle)?.click()`). This is indirection, not a clean API.
- The launcher itself is built by `center-hud.ts` and re-adopts the Docs/Spec/Lab links by `data-nav` attribute, plus adds an extra "⛓ ACCESS" button because the access-puzzle toggle was otherwise invisible (the code comment at `center-hud.ts:491-506` explicitly says this).
- The result is two competing implementations of the same bottom launcher: one hidden, one visible, both in the DOM.

### 4.2 The center HUD is a runtime layout engine

`center-hud.ts` measures the live DOM on every resize:

- `fitHud()` (`src/ui/center-hud.ts:281-324`) iterates over `#ui` children, calls `getBoundingClientRect()`, and writes `--cqm-hud-left`, `--cqm-hud-right`, `--cqm-hud-bottom` to the root element.
- `chooseNavMode()` (`src/ui/center-hud.ts:347-365`) measures `nav.scrollWidth` against the live gap and toggles between named tabs, tabs without links, or the cycler.

This is clever, but it means the layout is **computed in JS rather than declared in CSS**. If a panel is hidden, off-screen, or has a zero box, the measurement can be wrong. The `fitHud` function skips elements with `width < 8 || height < 8`, but hidden panels that are about to open are still measured by `getBoundingClientRect()` (hidden via `display:none` returns a zero rect, so they are skipped). That means the center column can shift when a panel opens.

### 4.3 The cascade stack is undocumented and fragile

`z-index` is scattered across files with no single source of truth:

| Layer                            | z-index | Source                                |
| -------------------------------- | ------- | ------------------------------------- |
| 3D canvas (`#c`)                 | 0       | `index.html:35`                       |
| `#ui` grid                       | 20      | `app.css:512`                         |
| Bottom toolbar (`#bar`)          | 20      | `index.html:879`                      |
| Puppet-master toast              | 22      | `index.html:47`                       |
| Sector banner (`#sec`)           | 25      | `index.html:41`                       |
| Joystick / lookpad / wheel       | 25      | `index.html:1043`, `1053`, `1065`     |
| Algorithm readout (`#alg`)       | 20      | `app.css:610`                         |
| Simulation settings (`#hud-vsr`) | 20      | `index.html:782` (implied by context) |
| Perf HUD (`#perf-hud`)           | 40      | `src/ui/perf-hud.ts:63`               |
| Superhero HUD (`#cqm-hero`)      | 58      | `src/ui/superhero-hud.ts:28`          |
| Hidden `#cqm-dock`               | 60      | `src/ui/panel-dock.ts:21`             |
| Panel toggles (Copilot, etc.)    | 59–60   | Their own CSS files                   |
| Center HUD panels                | 71      | `src/ui/center-hud.ts:67`             |
| Center HUD launcher              | 73      | `src/ui/center-hud.ts:99`             |
| Access-puzzle modal              | 200     | `src/ui/access-puzzle.ts:130`         |
| WebGL recovery card              | 9999    | `src/main.ts:53`                      |

**Issues:**

- The superhero HUD (`z-index: 58`) sits **below** the center HUD panels (`z-index: 71`). If a user opens the center HUD while the superhero HUD is active, the HUD is covered. This is likely correct (modal panels over the HUD), but it is not documented.
- The hidden dock (`z-index: 60`) is higher than the joystick/lookpad (`z-index: 25`). If the dock were ever un-hidden, it would overlay the touch controls. This is dead code, but it is a latent bug.
- The access-puzzle modal (`z-index: 200`) is well above everything, but the superhero HUD (58) and center HUD (71) can both be visible behind it. That is correct, but the gap between 73 and 200 is unused — if another overlay is needed later, there is no documented slot.
- The WebGL recovery card at 9999 is the emergency overlay. The gap between 200 and 9999 is enormous and undocumented.

### 4.4 Style injection order is a real cross-browser risk

Every panel injects its own `<style>` via `doc.head.appendChild(style)`. The order of injection depends on the module import/evaluation order:

1. `main.ts` imports `copilot`, `access-puzzle`, `help-system`, `audit-dock` (in that order).
2. `main.ts` then calls `initCenterHud()`, which appends `#cqm-hud-style`.
3. `world.ts` later constructs `SuperPanel`, `PantheonArchitecturePanel`, `NhiObservatory`, `MarketTicker`, etc., each appending its own style.

Because `center-hud.ts` uses `!important` for positioning and opacity, it wins most fights. But if a panel defines, for example, a `border` or `font` on the same selector as the center HUD, the panel's style may override the center HUD if it is injected later. The `super-neural.ts` style is appended after the center HUD style, so it could override non-`!important` rules.

### 4.5 What this means for the user's complaint

The user said the UI is "messy" and "not uniform." The hidden dock + visible launcher pattern is a direct cause:

- The bottom band has a **hidden dock** at `z-index: 60` and a **visible launcher** at `z-index: 73`. Both contain the same conceptual buttons.
- The launcher is built at runtime, so its buttons can appear, disappear, or change based on the measured gap. The user sees a launcher that sometimes shows tabs, sometimes a cycler, and sometimes drops the Docs/Spec/Lab links.
- The center HUD re-homes panels with `!important`, so each panel's own styling is partially overridden. This creates the visual inconsistency where panels look different when opened from the center HUD versus when they were originally designed.

### 4.6 The `data-nav` adoption is a workaround for the Pages build

`center-hud.ts` adopts the Docs/Spec/Lab links by `data-nav` because `build-pages.ts` rewrites the absolute hrefs to subpath-relative. This is a correct fix for a deployment problem, but it means the launcher is tightly coupled to the build process. The links live in `index.html` as `<a href="/docs" data-nav="docs">`, but the launcher only finds them by the `data-nav` attribute. This is fragile: if the link markup changes, the launcher silently loses the links.

---

## 5. Phone / Portrait / Coarse-Pointer Issues

### 5.1 Sheet mode is correct but the content inside is not phone-first

**Current state (from `app.css:681-747`):** sheets are 78vh/dvh tall, 85–90vw wide, anchored to the edge. The handles are visible and 56px tall. This part works.

**What breaks inside the sheets:**

- **Observatory canvases still leave dead space.** `app.css:648-660` uses container queries to lift the canvas floor from 56px to 72px to 84px, but the panel body is `max-height: 78vh` and the active page shows only four canvases. On a 760px-tall phone, 78vh ≈ 593px; the four canvases at 84px + gaps + tab bar ≈ 400px, leaving ~190px of empty cyan-bordered glass below. The user is still right about the empty bottom spots.
- **Page 2 small-multiples overflow.** Ten per-phylum sparklines stacked at ~84px each need 840px of vertical space, exceeding the sheet height. The body scrolls, but the user sees only 4–5 at a time, which defeats the purpose of a small-multiples overview.
- **Observatory tab labels are 8px uppercase.** `app.css:156` sets `font: 600 var(--text-4xs) var(--font-ui)` — 8px, uppercase, 0.08em letter-spacing. On a 320px-wide sheet with four tabs, the text is barely readable.
- **Telemetry keys are 8px.** The primary labels for every stat row are `text-4xs`. On a phone at arm's length, this is below the comfort threshold.

### 5.2 The bottom band is the single worst phone experience

**Current geometry (from `app.css:509-617` and `index.html`):**

- `#ui` has `padding-bottom: calc(96px + safe-area)` to clear the bottom.
- `#bar` toolbar is `bottom: 1.5` (6px) + its own height (~28px) + `gap-1`.
- Center HUD launcher (`#cqm-hud-nav`) is generated by `center-hud.ts` and sits above the toolbar.
- `#alg` is fixed at `right: 2px; bottom: 180px;`.
- `#hud-vsr` is fixed at `right: 2px; bottom: 1.5` (6px) — i.e., it sits on the bottom edge.
- Docs/Spec/Lab links are `fixed bottom-2`.

**On a 360×640 phone, this means:**

- `#hud-vsr` (8 rows + header ≈ 130px) starts at the bottom and rises upward.
- The toolbar is a horizontally scrolling 18-button strip above or below it. It is the only home for high-impact actions like `⟁ NHI`, `⚡ CHAOS MODE`, `ENTROPY`, `SPACE`, and `☠ APOC`. On a phone, these world-altering controls are buried in a scrollable strip while the user is also trying to use the joystick and wheel.
- The sheet handles are on the left/right edges.
- The joystick is bottom-left; the lookpad is bottom-right; the action wheel is also bottom-right.
- The center HUD launcher is somewhere in the middle of this crowd.

The 3D world is visible only in a narrow horizontal band near the top. This is the root of the "messy on phone" complaint.

### 5.3 Touch controls are incomplete and hidden on the wrong surfaces

**Joystick / lookpad (`index.html:1043-1063`, `app.css:1102-1156`):**

- The knob is 30px in an 80–104px pad. Acceptable but not generous.
- The actual interactive surface is the `#jP` / `#lp` div, which has **no `aria-label`**. The parent `#joy` has none either. Only the wheel has an `aria-label`.
- The knob has no visual drag-limit or held state. The user cannot see how far the stick is pushed.
- The lookpad duplicates the canvas drag behavior but is not discoverable — there is no hint or icon.

**Action wheel (`index.html:1065-1092`):**

- The four petal labels are abbreviations: `SPL`, `BRS`, `MUT`, `CHS`. No iconography.
- The apocalypse center button is visually identical to the petals and has no long-press affordance (a ring fills, but the user has to guess).
- The wheel is in the bottom-right corner, the same zone as the lookpad and the Copilot toggle. On a phone, they can overlap.

**Missing rotation controls on touch.** `app.css` hides `#cP` on coarse pointers. The joystick covers movement, but **roll, tilt, and yaw are not available** on touch. The lookpad only controls camera look; it does not rotate the hero. The user is right: the in-game controls are incomplete.

---

## 6. Desktop / Laptop / Fine-Pointer Issues

### 6.1 The current layout is more stable than the first pass, but still hard-positioned

`app.css` (current state) positions the right-cluster readouts like this:

- `#cP` is now `fixed right: 172px; bottom: 56px; width: clamp(150px, 13vw, 178px); max-height: 42vh;`.
- `#alg` is `fixed right: 2px; bottom: 180px; max-width: clamp(120px, 18vw, 150px);`.
- `#hud-vsr` is `fixed right: 2px; bottom: 1.5;`.

These are **pixel/percentage hybrids**, not grid-based. They do not reflow as a unit. On a 13" laptop at 1366×768, the bottom-right stack is correct but the 3D world is compressed. On a 16" 2560×1600 laptop at default scaling, the text is tiny relative to the screen. The user's note that "desktop laptop modes are ok but not uniform across devices" is precisely because the readouts are fixed islands while the main grid is responsive.

### 6.2 Micro-typography is the default

**Current tokens (`app.css:75-79`):**

```css
--text-2xs: 10px;
--text-3xs: 9px;
--text-4xs: 8px;
--text-display: clamp(14px, 4vw, 28px);
```

The entire UI is built around 8–10px labels. The only `clamp()` is the sector banner. There is no tablet-friendly scale. The TV block scales up only when the device is both ≥1900px and coarse-pointer. A 16" 2560×1600 laptop with a mouse gets the same 8–10px text as a 360px phone. This is the root cause of the "fonts off comparing" complaint.

**Specific readability issues:**

- Toolbar captions are 9px uppercase.
- Telemetry keys are 8px.
- Observatory tabs are 8px.
- Control-pad captions are 8px.
- Algorithm picker rows are 10px/9px.
- Superhero HUD is 8–11px.
- NHI observatory captions are 8.5px.
- Docs/Spec tables are 11.5px/12.5px.

### 6.3 `var(--color-white)` is used but not defined in the static theme

`app.css` uses `var(--color-white)` in at least 10 places (observatory tabs, algorithm picker, control-pad, sheets, etc.). It is **not listed in the `@theme static` block**. In Tailwind v4, `--color-white` is part of the default theme and resolves to white, but the project is explicitly using `@theme static` to pin every runtime token. Leaving `--color-white` implicit is a design-system hole — it makes the code dependent on Tailwind's default theme rather than the documented token system.

---

## 7. TV / 4K / Large-Screen Issues

### 7.1 TV block scales type but not controls

**Current TV block (`app.css` ≥1900px coarse):** it scales `--text-2xs` to `clamp(15px, 0.85vw, 22px)`, `--text-3xs` to `clamp(13px, 0.72vw, 19px)`, `--text-4xs` to `clamp(12px, 0.66vw, 17px)`, and radii.

**What it does not scale:**

- The bottom toolbar buttons stay at `min-h-7` (28px).
- The center HUD launcher buttons stay at ~30px.
- The touch joystick/lookpad/wheel stay at 80–104px.
- The sheet handles stay at 56px.
- The control panel `#cP` stays at `width: 178px` max.
- The toggle buttons in the dock stay at 42px.

On a 43" 4K TV, the panel text is large and the controls are tiny. The user is right that the modes are not uniform.

### 7.2 4K spreads the UI too far

The TV grid columns are `clamp(300px, 18vw, 480px)` and `clamp(360px, 22vw, 600px)`. At 3840px, the columns are ~480px and ~600px, leaving the center column at ~2760px. The telemetry and observatory are legible, but the bottom-right readouts and the top-left telemetry are separated by a vast empty 3D space. The UI is not "organized" at this scale; it is scattered.

---

## 8. Observatory Specific Issues

### 8.1 Dead space persists

The container query now lets canvases grow, but the page still renders **four canvases per page** in a fixed layout. On a tall desktop panel, four 168px canvases = 672px; the panel max-height is 82vh. On a 1080p desktop, 82vh ≈ 887px, leaving ~215px of unused glass. The canvases do not share the remaining height proportionally.

### 8.2 Page 2 small-multiples are not responsive

Page 2 shows ten per-phylum sparklines. Each sparkline is the same height as the other charts. On a narrow phone sheet, the user sees only 4–5 at a time. The page should switch to a 2×5 or 5×2 grid on small screens, or reduce the number of visible sparklines.

### 8.3 War-matrix heat grid is too small on narrow panels

Page 0 chart `#obs-c2` is a 10×10 titan war matrix. On a 320px canvas, each cell is ~24px. The labels and values drawn at 8px font are illegible on a phone.

---

## 9. Controls Panel (`#cP`) Specific Issues

### 9.1 The control panel is still a wall of identical buttons

`index.html:552-703` defines the control pad. Every movement, rotation, and sim-action button is the same size and weight. There is no visual hierarchy: WASD, Q/E vertical, and six rotation buttons all look equally important.

**Specific issues:**

- **Abbreviated labels are cryptic.** `Rl`, `Rr`, `Tu`, `Td`, `Yl`, `Yr` are not self-explanatory.
- **No grouping.** Movement, rotation, and sim actions are stacked with only 2px gaps.
- **Held-state feedback is subtle.** `[data-a].on` changes border and glow, but the 8px text makes the change hard to see.
- **No icons.** Every button is text + `<kbd>` hint. The user has to read rather than recognize.
- **Maintainability risk from utility-chain bloat.** Each button in `index.html:552-703` repeats ~250 characters of Tailwind utility classes. The movement, rotation, and sim-action buttons each carry their own full color/fill/transition chain. A single semantic class (e.g., `.ctrl-pad-btn`) would reduce the file size, guarantee consistency, and make the hover/active states easier to audit.

### 9.2 The control panel is hidden on touch without replacement

On coarse pointers, `#cP` is `display: none`. The joystick and wheel replace movement and four sim actions, but **rotation/tilt/yaw are gone**. The user is right that the controls are "not complete" on touch.

---

## 10. Access Puzzle (`src/ui/access-puzzle.ts`) Specific Issues

### 10.1 It is a separate visual application

`access-puzzle.ts:123-168` defines a green CIA-terminal palette (`#7dffc0`, `#ff5a6b`, `#4fd39a`) that does not use the central tokens. No `--color-accent`, no `--radius-panel`, no `--shadow-panel`, no `--color-ink`.

### 10.2 Mobile layout is brittle

The box is `width: min(94vw, 560px)` and `max-height: 92vh`. On a phone, the cipher grid `30px auto 1fr` has no `min-width: 0` on the middle column, so the noise field can force the box wider than the viewport. The 10 cipher lines plus the banner, hint, and footer fill the screen tightly.

### 10.3 Interaction is incomplete

- **No solved-state UI in the dock.** After `grant()`, `this.solved = true` and `open()` becomes a no-op, but the dock button keeps its green flicker animation and still reads "⛓ ACCESS". The user has no persistent visual confirmation that the puzzle is solved.
- **No progressive disclosure.** The hint is always the same; failing repeatedly gives no extra help.
- **No reduced-motion support.** The flicker, blink, shake, and scanline animations are always on.
- **The Roman-numeral input is not clearly labeled.** The placeholder says "e.g. III IV V …", but the `aria-label` is just "Access code". A first-time user may type Arabic digits.

### 10.4 The puzzle is disconnected from the superhero HUD

Solving dispatches `cqm:superhero-unlock`. The world reveals the hero, and the HUD slides down. There is no tutorial, no reticle, no marker showing which creature is the hero. The user is right: the in-game controls for the "Super Creature Twin" are not a coherent experience.

---

## 11. Superhero HUD (`src/ui/superhero-hud.ts`) Specific Issues

### 11.1 The HUD is too dense and too small

`superhero-hud.ts:27-68` packs three rows of data into a top-center band:

- Row A: avatar, name, level, Life/Energy/XP bars.
- Row B: power, plan, wallet, three neural emotion dots, six inventory slots.
- Row C: four power buttons, PILOT/VISION/CAM modes, 6-way D-pad, world stat.

Font sizes are 8–11px. D-pad cells are 22px × 22px. On a 16" laptop this is dense; on a phone it is unusable.

### 11.2 The HUD is not responsive

The HUD width is `min(98vw, 880px)`. The font sizes and button sizes do not scale. On a phone, the D-pad is far below the recommended 44px touch target.

### 11.3 The D-pad is non-standard and has no held-state feedback

The grid is 3×2: `◀ ▲ ▶` on top, `⤓ ▼ ⤒` on bottom. The diagonal glyphs are not standard. The 22px hit targets are too small. There is no `.on` or active state when a direction is held.

### 11.4 Features are incomplete

- **Inventory slots are cosmetic.** `INVENTORY = ['◈', '❄', '⚛', '✶', '☍', '⬡']` is rendered but not clickable.
- **Power buttons have no cooldown or charge state.** A power that is too expensive still looks clickable.
- **Mode buttons cycle but have no menu.** The user does not know what modes exist.
- **No health/energy thresholds.** Bars are plain progress bars with no low-health flash or damage feedback.
- **No world anchor.** The HUD floats over the 3D world but does not indicate which creature is the hero. No reticle, no world-space marker.

---

## 12. Center HUD / Inspector Panels Specific Issues

### 12.1 The panels are visually inconsistent

`center-hud.ts` re-homes the Copilot, Help, Audit, NHI, Market, Super, and Architecture panels. Each panel ships its own CSS. The header heights, border colors, close-button styles, and font sizes all differ. When cycling, the user feels like they are switching between different applications.

### 12.2 Per-panel findings

| Panel                                                      | Key issue                                                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Copilot** (`copilot.ts:163-200`)                         | 50/50 split is good, but the font sizes are 9–10px. The provider selector and model chips are tiny. The close button is just "✕" text. |
| **Help** (`help-system.ts:25-69`)                          | Green palette does not match the shell. The answer and topics columns are tiny (9px headers).                                          |
| **Market** (`market-ticker.ts:22-49`)                      | Gold palette, three sections, 9px section names. The canvas and readout rows are dense.                                                |
| **Super** (`super-panel.ts:38-83`)                         | Purple palette. The 5-archon footer is hard-coded at 9px opacity. The neural toggle expands the box but the transition is abrupt.      |
| **Architecture** (`pantheon-architecture-panel.ts:53-106`) | Red/purple palette. The canvas uses `clamp(170px, 30vh, 280px)` which is good, but the data well is 9–10px.                            |
| **NHI** (`nhi-observatory.ts:47-65`)                       | Violet palette. The 3×3 grid switches to 2×2 only at ≤560px, leaving the 560–768px range with too-narrow columns. Captions are 8.5px.  |
| **SuperNeural** (`super-neural.ts:47-65`)                  | Hard-coded palette (`#b98cff`, `#6cdfff`, `#ff6ab0`, etc.). Tabs are 9.5px uppercase. The 3×3 grid is too dense for small screens.     |

### 12.3 The `applyGhost` transparency dims text

`center-hud.ts` applies `opacity: 0.4 !important` to panels when ghosted. This dims the entire panel, including text, making the data hard to read. A background-only translucency would be better.

---

## 13. DOCS / SPEC / LAB Specific Issues

### 13.1 Three different visual systems

- **Docs** (`site/docs.html`): dark void/cyan, `JetBrains Mono`, `max-width: 980px`, 12px body, no media queries.
- **Spec** (`site/specs.html`): dark void/cyan + fuchsia, `JetBrains Mono`, `max-width: 1040px`, one media query for `.grid2` at 720px.
- **Lab** (`site/lab/index.html`): light Anthropic beige/orange, `Poppins`/`Lora`, sidebar/stage layout, mobile breakpoint at 720px.

A user clicking Docs → Spec → Lab feels like they are visiting three different websites.

### 13.2 Numbers are inconsistent

| Source               | Tests | Coverage                  |
| -------------------- | ----- | ------------------------- |
| `README.md`          | 1,771 | 91.97% line / 94.85% func |
| `index.html` meta    | 1,771 | —                         |
| `index.html` og      | 1,477 | —                         |
| `site/index.html` og | 1,477 | —                         |
| `site/docs.html`     | 1,477 | 95.03% line / 92.03% func |
| `site/specs.html`    | 1,477 | 95.03% line / 92.03% func |

The same repository has two different test counts (1,771 vs 1,477) and two different coverage pairs. The user is right: "the data isn't matching on pages."

### 13.3 Mobile treatment is broken

- Docs and Spec have no mobile media queries. Tables overflow horizontally.
- The Lab page has a 720px breakpoint but the tile canvases are 300² backing scaled down to ~150px on phones, wasting GPU and looking blurry.
- There is no shared header or nav; the user cannot return to the simulation from the Lab except via the browser back button.

---

## 14. Typography & Readability Issues

| Issue                                                                                      | Where                                                            | Severity |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------- |
| 8px (`text-4xs`) used for telemetry keys, observatory tabs, control captions, NHI captions | `app.css`, `index.html`, `nhi-observatory.ts`, `super-neural.ts` | High     |
| No viewport-relative type scale except `#sec` banner and TV block                          | `app.css`                                                        | High     |
| All-caps + wide letter-spacing on tiny labels reduces readability                          | `app.css`, `index.html`                                          | Medium   |
| Mixed font stacks: Inter, JetBrains Mono, plus Poppins/Lora on Lab                         | `site/lab/index.html`                                            | Medium   |
| `font` shorthand in many CSS rules resets line-height to normal                            | `app.css` panel headers, `.obs-tab`, etc.                        | Low      |
| Tables on Docs/Spec are 11.5–12.5px with no mobile scaling                                 | `site/docs.html`, `site/specs.html`                              | Medium   |
| `--color-white` is used but not defined in the static theme                                | `app.css`                                                        | Medium   |

---

## 15. Color & Visual Identity Issues

| Issue                                                                                          | Where                                                                                                                                                                                   | Severity |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Central token palette is not consumed by dynamically mounted panels                            | All `src/ui/*` panels                                                                                                                                                                   | High     |
| Lab page is a completely different light theme                                                 | `site/lab/index.html`                                                                                                                                                                   | High     |
| Each panel has its own border color, shadow, and header gradient                               | `copilot.ts`, `help-system.ts`, `market-ticker.ts`, `super-panel.ts`, `pantheon-architecture-panel.ts`, `nhi-observatory.ts`, `super-neural.ts`, `access-puzzle.ts`, `superhero-hud.ts` | High     |
| Superhero HUD uses purple while the apocalypse button uses red; danger color is not consistent | `superhero-hud.ts`, `app.css`                                                                                                                                                           | Medium   |
| Toolbar green, algorithm picker purple, observatory cyan — semantic but not harmonized         | `app.css`, `index.html`                                                                                                                                                                 | Medium   |
| Glassmorphism values (blur, saturation) vary between panels                                    | All panels                                                                                                                                                                              | Low      |

---

## 16. Spacing & Wireframing Issues

| Issue                                                                                            | Where                                    | Severity |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- | -------- |
| Bottom band is too crowded: toolbar + launcher + readout boxes + dock toggles + nav links        | `index.html`, `center-hud.ts`, `app.css` | High     |
| `#hud-vsr` is tall and pinned to the bottom edge; on phones it consumes the world                | `index.html`, `app.css`                  | High     |
| `#alg` and `#hud-vsr` are two separate fixed boxes instead of one unified readout column         | `app.css`                                | Medium   |
| Touch controls (joystick, lookpad, wheel, Copilot toggle) compete for the bottom-right corner    | `index.html`, `copilot.ts`, `app.css`    | High     |
| Observatory sheet has unused vertical space below the four canvases                              | `index.html`, `app.css`                  | Medium   |
| Control panel buttons are stacked with 2px gaps, feels cramped                                   | `index.html`                             | Medium   |
| Sheet handles on left edge are positioned by percentage; on short phones they crowd the joystick | `app.css`                                | Medium   |
| Docs/Spec/Lab pages use different max-widths and padding                                         | `site/*`                                 | Medium   |

---

## 17. Data Consistency & Functional UI Issues

| Issue                                                                                                        | Where                         | Severity |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------- |
| Test count / coverage numbers differ between README, index.html, site/docs.html, site/specs.html             | Satellite pages               | High     |
| Algorithm readout `#alg` and telemetry could show different algorithm names if updated on different cadences | `ui/hud.ts` vs `ui/panels.ts` | Medium   |
| Superhero HUD inventory is cosmetic                                                                          | `superhero-hud.ts`            | High     |
| Access puzzle has no solved-state UI feedback                                                                | `access-puzzle.ts`            | Medium   |
| Audit panel originally depended on HTMX `/api/audit`; now fixed by `audit-dock.ts` client render             | `audit-dock.ts`               | Resolved |
| Help/Copilot/AI panels depend on external LLM endpoints; on static deploy only LLM7 fallback works           | `copilot.ts`                  | Medium   |

---

## 18. Cross-Browser / Device-Specific Risks

| Risk                                                                        | Why                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tailwind v4 `--alpha(var(--color-*) / N%)` syntax                           | Modern browsers OK; older Safari (<16) may ignore the rule. The `--alpha` function is Tailwind-specific. |
| `env(viewport-segment-*)` for foldables                                     | Only supported on Surface Duo / Galaxy Fold.                                                             |
| `dvh` units                                                                 | iOS Safari and Chrome support; older Android WebView falls back to `vh`.                                 |
| Container queries for observatory canvas                                    | Safari <16 ignores them; canvas keeps inline height.                                                     |
| `pointer: coarse` for TV detection                                          | Mouse on TV → fine; remote on TV → coarse. Correctly gated.                                              |
| Multiple `position: fixed` + `backdrop-filter` layers                       | Safari has known stacking/rendering bugs; z-index must be tested.                                        |
| Inline `<style>` tags injected by TS panels                                 | Cascade order depends on mount order; HMR can change it.                                                 |
| `viewport` meta has `maximum-scale=1,user-scalable=no` in `site/index.html` | Accessibility anti-pattern; prevents zoom on some devices.                                               |

---

## 19. Prioritized Recommendations

### P0 — Fix before the next visual release

1. **Unify the navigation architecture.** Merge `panel-dock.ts` and `center-hud.ts` into a single launcher. Either make the dock the real launcher (with center-hud's cycler/tabs behavior), or remove the dock and make `center-hud.ts` mount the toggles directly without creating a hidden `display:none` bar. Document the z-index stack and assign named layers (e.g., `--layer-world`, `--layer-ui`, `--layer-panels`, `--layer-modals`).
2. **Tokenize the satellite panels.** Convert every panel's CSS to use the central tokens (`--color-*`, `--text-*`, `--font-ui`, `--font-mono`, `--radius-*`, `--shadow-*`). Each panel may keep a semantic accent, but it must be derived from the token system. Add `--color-white` to the static theme explicitly.
3. **Redesign the bottom band for phones.**
   - Convert the 19-button toolbar into a hamburger menu or category tray on coarse pointers.
   - Merge `#alg` and `#hud-vsr` into one collapsible bottom-right info pill.
   - Move touch controls (joystick, wheel) away from the dock toggles and nav links.
   - Add a dedicated rotation control for touch.
4. **Complete the Superhero HUD and Access Puzzle.**
   - Add a world-space reticle / marker for the hero.
   - Make inventory slots interactive or remove them until functional.
   - Add power cooldowns, charge states, and disabled states.
   - Give the access puzzle a solved-state UI (steady green "ACCESS GRANTED" toggle, no flicker) and a mobile-friendly layout.
5. **Unify the satellite pages and their build artifacts.**
   - Create a shared `site/shared.css` for Docs/Spec/Lab with common nav, header, footer, and responsive breakpoints.
   - Bring Lab into the void/cyan brand or redesign Docs/Spec to a consistent second brand.
   - Establish a single source of truth for test counts, coverage, and creature counts (e.g., `docs/VERIFICATION-ANALYTICAL-DATA.md` or `src/canonical-receipts.ts`) and regenerate all HTML pages from it.
   - Either remove the tracked `site/` directory from the repo and let CI generate it, or commit a fresh `site/` after every canonical-receipts change and add a CI check that `bun run pages` produces no diff.
6. **Consolidate the input event model.** Convert the joystick and look-pad from touch-only to pointer events so they work with mouse, pen, and stylus on touch-capable devices. Add a dead-zone ring, maximum-throw indicator, and held-state glow to the joystick and look-pad. Label the action wheel petals with icons or full words instead of abbreviations, and make the apocalypse long-press affordance discoverable (e.g., an initial pulse hint).

### P1 — Important polish

7. **Add a viewport-relative type scale.** Replace the fixed 8–10px tokens with `clamp()` so type scales from phone → laptop → TV. Do not rely solely on the TV block.
8. **Redesign the control panel.** Group movement, rotation, and sim actions visually; use icons and larger buttons; add stronger held-state feedback.
9. **Improve observatory vertical use.** Let the active page's canvases share available panel height; on phones show 2 charts at a time, not 4.
10. **Add reduced-motion support to all animated panels** (access-puzzle flicker, superhero pulse, architecture pulse, NHI live views).
11. **Standardize focus-visible rings** across all dynamically mounted buttons (some panels use 1px, some 2px, some none).
12. **Align quality detection with the UI.** Make `detectQuality()` in `src/core/quality.ts` expose the same breakpoint logic the CSS uses (e.g., `max-width: 768px`, `orientation: portrait`, `pointer: coarse`) so the sim tier and UI layout never disagree.

### P2 — Fine-tuning

13. **Document the z-index stack** and replace magic numbers with a single `--layer-*` token system (e.g., `--layer-canvas: 0`, `--layer-ui: 20`, `--layer-panels: 50`, `--layer-modals: 100`, `--layer-recovery: 9999`).
14. **Add visual feedback to the joystick/lookpad knobs** when held/dragged.
15. **Fix the `font` shorthand line-height reset** in `app.css` by adding explicit line-height values.
16. **Add a mobile-safe `viewport` meta** to `site/index.html` (remove `maximum-scale=1,user-scalable=no`).
17. **Create a shared canvas-shell component** for Observatory, NHI, and Super Neural so they share resize handling, DPR scaling, expansion behavior, and a consistent label style.
18. **Normalize panel micro-typography.** Define a single type ramp (e.g., `--text-panel-head`, `--text-panel-body`, `--text-panel-caption`) and apply it to all dock panels. The current 7.5px–13px range should collapse to a deliberate 3–4 sizes.
19. **Collapse duplicated utility chains in `index.html`.** Replace the repeated control-pad and toolbar button class strings with component classes (e.g., `.ctrl-pad-btn`, `.toolbar-btn`) so the design system is enforceable and the file is readable.
20. **Add a UI bootstrap layer.** Move panel construction out of `world.ts` into a dedicated `src/ui/bootstrap.ts` that declares the panel tree, mounting order, and dependencies. The sim should push data to the UI, not construct the UI.
21. **Make the pre-commit sync check blocking or add a CI gate.** The current hook redirects sync output to `/dev/null` and uses `|| true`, so sync failures are silent. The `check` script should run `sync:check` and `verify:facts` in CI and fail on drift.
22. **Add a first-run onboarding layer.** A short, dismissible overlay (or the help panel auto-opened once) should explain: drag to look, scroll to zoom, toolbar groups, how to open the access puzzle, and how the superhero flow is unlocked.
23. **Redesign the toolbar into grouped categories.** Collapse the 19 buttons into 4–5 groups (Audio, World, Creative, System) with icons and a single menu or segmented control. Remove the horizontal scrolling.
24. **Add a persistent settings panel.** Music/SFX/quality/render/view should be toggled in a single place and persisted to `localStorage`. The current readout box should be interactive or replaced by a settings icon.
25. **Complete the superhero HUD.** Replace the wallet symbols with labels, make inventory slots interactive or remove them, add cooldown/charge states to powers, and enlarge the D-pad to ≥44px targets.
26. **Add a systematic reduced-motion policy.** Every decorative loop (access-puzzle flicker, denied-language rotation, superhero pulse, architecture pulse, NHI live views) must query `prefers-reduced-motion` and either pause or switch to a static state. The global 1ms media query is not enough for photosensitive users.
27. **Implement toolbar keyboard navigation.** Add roving `tabindex` + arrow keys to `#bar` so keyboard users can navigate 19 buttons with arrow keys instead of 19 Tab presses.
28. **Add a quality-degradation toast.** When the frame governor drops DPR or turns off FX/shadows, show a transient, non-blocking explanation (e.g., "Quality reduced to keep 60fps") so users understand why the world became blurry.
29. **Make the viewport zoomable.** Remove `maximum-scale=1,user-scalable=no` from `site/index.html` and replace it with `width=device-width,initial-scale=1,viewport-fit=cover`. Users must be able to enlarge the 8px text.

---

## 20. Files to Touch in a Remediation Pass

- `src/styles/app.css` — type scale, bottom-band geometry, shared panel chrome, `--color-white` token.
- `index.html` — observatory canvas layout, control panel, `#hud-vsr`/`#alg` merging, touch controls, viewport meta.
- `src/ui/panel-shell.ts` (new) — shared panel chrome for all dock panels.
- `src/ui/copilot.ts`, `src/ui/help-system.ts`, `src/ui/market-ticker.ts`, `src/ui/super-panel.ts`, `src/ui/pantheon-architecture-panel.ts`, `src/ui/nhi-observatory.ts`, `src/ui/super-neural.ts` — tokenize and standardize.
- `src/ui/access-puzzle.ts` — tokenize, mobile layout, solved state, reduced motion.
- `src/ui/superhero-hud.ts` — responsive layout, reticle, interactive inventory, power states, wallet labels, larger D-pad.
- `src/ui/onboarding.ts` (new) — first-run overlay or auto-opened help, dismissible with `localStorage` flag.
- `src/ui/settings-panel.ts` (new) — persistent settings UI for audio/quality/render/view, toggled from a single icon.
- `src/ui/toolbar.ts` (new) — grouped category toolbar with roving tabindex, replacing the 19 inline buttons.
- `index.html` — remove the 19-button `#bar` markup and `#hud-vsr` passive card; replace with new toolbar + settings entry points.
- `src/ui/center-hud.ts` + `src/ui/panel-dock.ts` — merge into a single launcher, remove hidden dock, document z-index layers.
- `src/ui/bootstrap.ts` (new) — declare the panel tree and mounting order; move UI construction out of `src/world.ts`.
- `src/world.ts` — push data to UI panels instead of constructing them.
- `src/ui/input.ts` — unify joystick/lookpad to pointer events, add knob affordances, rotation controls.
- `src/ui/perf-hud.ts` — tokenize colors, use `app.css` classes, document z-index layer, add quality-degradation toast trigger.
- `src/ui/observatory.ts` — add `aria-live` region or table semantics for chart data; label canvas trends for screen readers.
- `src/ui/access-puzzle.ts` + `src/ui/superhero-hud.ts` + `src/ui/nhi-observatory.ts` + `src/ui/pantheon-architecture-panel.ts` — add per-component reduced-motion queries.
- `src/ui/toolbar.ts` — roving tabindex, arrow-key navigation, `aria-activedescendant`.
- `src/memory/store.ts` — persist `musicOn`, quality tier, render mode, onboarding-dismissed, and panel states.
- `site/index.html` — zoomable viewport meta.
- `src/ui/hud.ts` — soften `mustGet` failures or document the required markup contract.
- `src/core/quality.ts` — align `detectQuality()` breakpoints with CSS layout breakpoints.
- `src/main.ts` — tokenize the WebGL recovery card styles.
- `src/ui/canvas-shell.ts` (new) — shared canvas panel component for observatory/NHI/super neural.
- `site/shared.css` (new), `site/docs.html`, `site/specs.html`, `site/lab/index.html` (+ `lab/quantum-wildbeyond.html`) — unified brand, nav, responsive, data sync.
- `scripts/build-pages.ts` — generate or inject canonical test/coverage numbers into the built Pages HTML.
- `.githooks/pre-commit` — stop redirecting sync output to `/dev/null`; make `sync:check` exit non-zero on drift.
- `.github/workflows/ci.yml` — add a step that runs `bun run sync:check && bun run verify:facts` and fails on drift.
- `.gitignore` + `git rm --cached site/` — remove the stale tracked `site/` directory or commit a fresh regeneration after every receipt change.
- `docs/VERIFICATION-ANALYTICAL-DATA.md` or `src/canonical-receipts.ts` — single source of truth for numbers.
- `package.json` — add a CI check that static pages and README numbers match the canonical source.

---

## 21. Fourth Pass — Input Ergonomics, Canvas Quality, and Boot-Time Architecture

### 21.1 The input system uses three different event APIs for the same user

`src/ui/input.ts` handles the same physical screen with three different event models:

- **Control-pad buttons (`[data-a]`) and toolbar buttons (`[data-action]`)** use `pointerdown` / `click` (`input.ts:222-258`). These work on every pointer type.
- **Joystick and look-pad** use `touchstart` / `touchmove` / `touchend` only (`input.ts:292-398`). They do not respond to mouse, pen, or stylus on a touch-capable laptop (e.g., a 2-in-1 in tent mode with a trackpad, or a tablet with a mouse connected).
- **Action wheel apocalypse** uses `pointerdown` / `pointerup` (`input.ts:419-432`). This works on every pointer type.

**Why this matters:** on a touch-enabled Windows laptop or a tablet with a mouse, the user may see the joystick and look-pad but find them unresponsive because they are only bound to touch events. This is a cross-device inconsistency that the user is likely hitting when comparing modes.

### 21.2 The joystick lacks visual affordances

`input.ts:282` moves the knob with `transform: translate(${kx}px,${ky}px)`. The pad is 88px (`h-22 w-22`), the knob is 30px, and the throw is limited by `r.width/2 - 15`. There is no:

- dead-zone indicator,
- maximum-throw ring,
- held-state glow beyond the CSS knob color,
- or directional icon (N/E/S/W).

On a phone, the user places a thumb on a blank cyan circle and must infer the stick is centered. The look-pad has the same problem: it is a blank purple circle (`index.html:1053-1063`).

### 21.3 The action wheel abbreviations are cryptic

`index.html:1065-1092` labels the four petals `SPL`, `BRS`, `MUT`, `CHS` and the center apocalypse button is a black dot. The apocalypse long-press arms over 600ms (`input.ts:72`) and shows a CSS ring, but the user must discover that the center is a long-press. There is no icon, no tooltip, and no initial hint animation.

### 21.4 Quality detection is coarse and not aligned with the UI

`src/core/quality.ts:118-139` detects "mobile" as:

```ts
const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches;
const isSmall = window.innerWidth < 600 || window.innerHeight < 600;
const isMobile = isTouch || isSmall;
```

**Issues:**

- A 12-inch tablet with a coarse pointer is classified as mobile, even though the UI could support a desktop-like layout.
- A desktop browser resized to 500px wide is classified as mobile, so the phone UI (edge sheets, hidden toolbar) appears for a mouse user.
- The UI CSS uses its own media queries (`max-width: 768px`, `orientation: portrait`, `pointer: coarse`) that do not match `quality.isMobile`. The sim may run in `phone` tier while the CSS shows the desktop grid, or vice versa.

### 21.5 The boot-time WebGL recovery card is hardcoded and unstyled

`src/main.ts:47-69` creates a full-screen recovery card with a `z-index: 9999` and inline styles. It does not use any design tokens. It is a different visual system from the rest of the app. The card is correct and useful, but it is not part of the design system.

### 21.6 The perf HUD is a fourth visual micro-app

`src/ui/perf-hud.ts:58-102` mounts a chip with hardcoded inline styles and colors (`#5fe39a`, `#ffce6b`, `#ff6b6b`). It sits at `z-index: 40` and is not styled by `app.css`. It is another self-contained UI with its own palette, like the panels.

### 21.7 The HUD throws on missing elements

`src/ui/hud.ts:14-18` defines `mustGet`:

```ts
function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Hud: missing required element #${id}`);
  return el;
}
```

The constructor calls `mustGet('sec')`, `mustGet('nm')`, `mustGet('a-name')`, `mustGet('a-step')`, `mustGet('lore')`, and `mustGetCanvas('g-alg')`. If any of these are missing from `index.html`, the app throws during boot. This is a hard coupling between the markup and the HUD class that makes the UI fragile to markup changes.

### 21.8 The observatory and NHI/Super panels are canvas-heavy but share no canvas shell

`src/ui/observatory.ts`, `src/ui/nhi-observatory.ts`, and `src/ui/super-neural.ts` each manage their own canvas grids, resize handling, DPR scaling, and drawing. They do not share a canvas component. The result is three different label sizes, three different grid gaps, and three different expansion behaviors:

- Observatory: 4 canvases per page, page tabs, container-query sizing.
- NHI: 3×3 grid (2×2 on small screens), click-to-expand a single cell, footer legend.
- Super Neural: 3×3 grid inside the SuperPanel, four tabs (I/II/III/IV), no click-to-expand.

Each one is correct in isolation, but the user sees three different canvas-panel conventions.

### 21.9 The market ticker and NHI panels both use `mountToggle` but with their own fixed positions

`src/ui/market-ticker.ts:122` and `src/ui/nhi-observatory.ts` (via import) both call `mountToggle(toggle, doc)`. `panel-dock.ts` adopts the toggle into the hidden dock. But each file also defines its own panel positioning in its own `<style>` block. The center HUD then overrides those positions with `!important`. This is the cascade problem described in section 4 in concrete terms: the same panel has three authoritative sources for its position (its own CSS, the center HUD, and the CSS media query).

---

## 22. Fifth Pass — Satellite Pages, Build-Time Data, and Deeper Panel Microscopy

### 22.1 Docs, Specs, and Lab are three separate websites

`site/docs.html`, `site/specs.html`, and `site/lab/index.html` each ship their own full `<style>` block in `<head>` and do not share a stylesheet:

| Page             | Background                             | Body font        | Heading font          | Body size | Viewport meta                                                                            |
| ---------------- | -------------------------------------- | ---------------- | --------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `docs.html`      | void/cyan radial gradients             | `JetBrains Mono` | `Inter Variable`      | 12px      | `width=device-width,initial-scale=1`                                                     |
| `specs.html`     | void/teal-violet gradients             | `JetBrains Mono` | `JetBrains Mono`      | 14px      | `width=device-width,initial-scale=1,viewport-fit=cover`                                  |
| `lab/index.html` | light gradient (`#faf9f5` → `#f5f3ee`) | `Poppins`        | `Poppins`/`Lora`      | ~16px     | `width=device-width, initial-scale=1.0`                                                  |
| App shell        | `#030612` black                        | `var(--font-ui)` | `var(--font-display)` | 8–10px    | `width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover` |

The Lab page is visibly the outlier: it is based on the Anthropic algorithmic-art viewer template (`site/lab/index.html:34` comment) and imports `Poppins` and `Lora` from Google Fonts. A user clicking from the dark void/cyan app to `/lab` is suddenly on a light beige page with rounded sans-serif headings. This is the "three separate websites" complaint in concrete form.

### 22.2 The build process does not synchronize data

`scripts/build-pages.ts` does three things:

1. Copies `dist/` into `site/`.
2. Copies `lab/quantum-wildbeyond.html` to `site/lab/index.html`.
3. Rewrites absolute nav links (`/docs` → `docs.html?v=...`, etc.) and strips the HTMX poll.

It does **not** read `README.md` or `docs/VERIFICATION-ANALYTICAL-DATA.md` to fill in the numbers. The result is hardcoded stale data:

| Source            | Tests                 | Coverage                  |
| ----------------- | --------------------- | ------------------------- |
| `README.md:11-12` | 1,771 passing         | 91.97% line · 94.85% func |
| `site/index.html` | 1,477 passing         | 95.03% line · 92.03% func |
| `site/specs.html` | 1,477                 | 95.03% line · 92.03% func |
| `index.html`      | similar stale numbers | similar stale numbers     |

The `sync-surfaces` mechanism mentioned in the README is not visible in `build-pages.ts` for these HTML badges; the stale numbers are baked into the source HTML and copied verbatim.

### 22.3 The viewport meta is inconsistent across the domain

- `site/index.html`: `width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover` — blocks user zoom, an accessibility issue.
- `site/docs.html`: `width=device-width,initial-scale=1` — allows zoom.
- `site/specs.html`: `width=device-width,initial-scale=1,viewport-fit=cover` — allows zoom.
- `site/lab/index.html`: `width=device-width, initial-scale=1.0` — allows zoom.

The main app is the only page that forbids zoom. This is inconsistent and penalizes users who need to magnify.

### 22.4 Every dock panel has its own micro-typography

A survey of the dynamically mounted panels shows a fragmented type system:

| Panel                                           | Toggle font | Header font | Body font   | Smallest label | Accent |
| ----------------------------------------------- | ----------- | ----------- | ----------- | -------------- | ------ |
| Copilot (`copilot.ts`)                          | 11px mono   | 12px mono   | 12px mono   | 9px provider   | blue   |
| Help (`help-system.ts`)                         | 11px mono   | 11px mono   | 12px UI     | 9px colhead    | green  |
| Market (`market-ticker.ts`)                     | 11px mono   | 11px mono   | 11px mono   | 9px section    | gold   |
| NHI (`nhi-observatory.ts`)                      | 11px mono   | 11px mono   | 11px mono   | 8.5px caption  | cyan   |
| Super (`super-panel.ts`)                        | 11px mono   | 11px mono   | 11px mono   | 10px bar label | violet |
| Super Neural (`super-neural.ts`)                | —           | 9.5px mono  | —           | 7.5px title    | violet |
| Architecture (`pantheon-architecture-panel.ts`) | 11px mono   | 11px mono   | 11px mono   | 9px sub-label  | red    |
| Access (`access-puzzle.ts`)                     | 12px mono   | 13px mono   | 11px mono   | 9px hint       | green  |
| Superhero (`superhero-hud.ts`)                  | 10px sans   | 10px sans   | 8–11px sans | 8px stats      | purple |

The only consistent token is the toggle height (42px) and the border radius (21px). Everything else is panel-specific. The user's "fonts off comparing" complaint is visible in this table: the same app shows 7.5px titles next to 13px headers and 8px stats.

### 22.5 The self-mounted panels all define their own z-index and position

Every panel in the table above defines `position:fixed; right:10px; bottom:128px; z-index:59` or similar, with slight variations. `copilot.ts` uses `z-index:60`. `help-system.ts` uses `z-index:59`. `market-ticker.ts` uses `z-index:59`. `nhi-observatory.ts` uses `z-index:59`. `super-panel.ts` uses `z-index:59`. `architecture.ts` uses `z-index:59`. Then `center-hud.ts` overrides all of these with `!important` to `z-index:71` and `left/right/bottom` coordinates.

This means every panel has three sources of truth for its geometry:

1. Its own CSS.
2. The center HUD override.
3. The responsive media query in `center-hud.ts` (or its own media query).

### 22.6 The Lab page is a WebGL context bomb on mobile

`site/lab/index.html:10-15` and `lab/quantum-wildbeyond.html` describe 12 live WebGL tiles per page (36 total), each 300² backing, with lazy page creation because browsers cap ~16 live contexts. On a phone with `dprCap: 1.25` (the `phone` tier), each tile is still 300 CSS pixels square but the backing store is 375px. The grid is 3×4 or 4×3; on a 360px-wide phone a single tile row may exceed the viewport. The page is not designed for the phone UI; it has no sheet/gesture pattern matching the main app.

### 22.7 The README claims are not reflected in the app UI

`README.md` states the app has a `docs-truth-law` CI gate that fails on doc overclaims or number drift. The UI audit found that the **deployed Pages numbers drift anyway** (`site/index.html` vs `README.md`), and the Pages site is a first-class user-facing surface. The CI may be checking Markdown files, but it is not stamping the built `site/index.html` or `site/specs.html` with the same canonical source.

---

## 23. Sixth Pass — Source-Level Maintainability, Contrast, and Canvas Performance

### 23.1 `index.html` has massive utility-chain duplication

`index.html:552-704` defines the control pad with 14 buttons. Each button carries a class chain of roughly 270 characters:

```html
class="inline-flex h-8 items-center justify-center rounded-btn border border-ctrl-line/30
bg-ctrl-bg/15 px-1 font-ui text-4xs whitespace-nowrap text-ctrl-ink transition-all duration-100
select-none hover:border-ctrl-glow/45 hover:bg-ctrl-hot/20 hover:text-white
active:border-ctrl-glow/50 active:bg-ctrl-hot/30 active:text-white"
```

This exact string is repeated for the movement, rotation, and sim-action buttons. The toolbar buttons below it repeat a similar pattern. The result is:

- ~3.8KB of duplicated class strings in one file section.
- Changing a hover state requires editing 14 identical chains.
- The file is harder to scan than the legacy 882-line monolith it replaced.

A single `.ctrl-pad-btn` component class would collapse the duplication and make the design system enforceable.

### 23.2 `--color-white` is used but not defined in the static theme

`app.css` defines the static theme at lines 20-96. It defines `--color-ink`, `--color-ink-dim`, `--color-ink-ghost`, `--color-accent`, `--color-warn`, `--color-danger`, etc., but **not `--color-white`**. Yet `app.css` uses `var(--color-white)` in at least 12 places:

- `.obs-tab[aria-selected='true']` color (`app.css:172`).
- `.sheet-handle` background alpha (`app.css:668, 696, 722`).
- `#audit-list strong` color (`app.css:1209`).
- `#audit-list ol:empty::after` (`app.css:1189` uses `var(--font-ui)` but the strong uses white).
- `site/docs.html` and `site/specs.html` have their own `--void` and `--ink` tokens but also use `#fff` or `rgba(255,255,255,…)` directly.

In Tailwind v4, `--color-white` falls back to the default theme white, but the project is explicitly using `@theme static` to pin every runtime token. Leaving `--color-white` implicit is a design-system hole and makes the code dependent on Tailwind's default theme.

### 23.3 The `font` shorthand resets line-height to 1.0

`app.css` uses the `font` shorthand in many places, e.g.:

```css
font: 600 var(--text-4xs) var(--font-ui);
```

The CSS `font` shorthand sets `line-height` to its initial value (`1.0`) when not specified. This is why the 8px observatory tab labels and 8px control-pad captions feel cramped — they are not inheriting the body's `line-height: 1.6` or any comfortable line-height. The result is text that is not just small but also vertically compressed.

### 23.4 The HUD and panel construction are hard-wired in `world.ts`

`src/world.ts:644-677` constructs the UI panels in the middle of the sim boot:

```ts
this.hud = new Hud();
this.panel = new TelemetryPanel();
this.observatory = new Observatory();
this.nhiObs = new NhiObservatory();
this.marketTicker = new MarketTicker();
this.superPanel = new SuperPanel();
this.pantheonArchitecturePanel = new PantheonArchitecturePanel();
```

These classes are imported from `src/ui/*.ts`. Each panel then self-mounts its own DOM and CSS. This means:

- The UI is not declared in `index.html` or a component tree; it is a side effect of the sim boot.
- `main.ts` also imports side-effect UI modules (`copilot.ts`, `help-system.ts`, `access-puzzle.ts`, `audit-dock.ts`, `center-hud.ts`).
- The order of imports matters: center-hud runs after the panels have mounted, so it can override their geometry.

This is the root cause of the cascade problem described in section 4: the UI is a stack of independently authored panels rather than a coherent component tree.

### 23.5 `audit-dock.ts` is another example of panel-specific override CSS

`audit-dock.ts:33-39` defines:

```css
#ui > #aP.audit-on {
  width: min(94vw, 560px);
  max-height: 60vh;
}
#ui > #aP.audit-on #audit-list ol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 14px;
  align-content: start;
}
```

It overrides the app.css width and the audit list layout. The audit list is also styled twice: once in `app.css:1180-1214` (server-rendered list), and once in `audit-dock.ts:41-46` (client-rendered list). The two styles differ slightly (`font:10px/1.5` vs `font:400 var(--text-3xs)/1.5`). On the static deploy, the server-rendered styles are dead because the HTMX poll is stripped; the client-rendered styles take over.

### 23.6 Every canvas panel allocates its own HiDPI backing store

`graphs.ts:78-83` uses `c.offsetWidth * 2` for the sparkline backing store. `observatory.ts`, `nhi-observatory.ts`, `super-neural.ts`, and `market-ticker.ts` each do similar DPR scaling. On a 4K desktop with DPR 2, the observatory's four canvases at `clamp(84px, 14cqi, 200px)` can be ~200px CSS height → 400px backing height. The Lab page's 12 tiles at 300² backing are 900×900 pixels each. The total GPU memory for UI canvases is non-trivial, and there is no shared canvas pool or renderer.

### 23.7 Color contrast is below WCAG for the micro-type

The 8px `text-4xs` captions use `color-ctrl-ink` (`#88bbff`) on `bg-ctrl-bg/15` (`rgba(0,80,160,0.15)`). The effective contrast against the near-black `#030612` background is high enough for the blue, but the 10px and 8px sizes are below the WCAG threshold for "normal text" (which requires 4.5:1 at any size). More importantly, the 8px text is simply below the readability threshold for arm's-length viewing, regardless of contrast ratio.

### 23.8 The simulation panel layout is declared in CSS comments, not in a layout system

`app.css:509-537` is the `#ui` grid. It is extensively commented, but the grid itself is a single complex declaration with no named layout component. The `#cP`, `#alg`, `#hud-vsr`, `#algoP`, `#aP`, and `#oP` placements are all declared in separate rules spread across 100+ lines. This makes the layout hard to verify: a change to one panel's position can break the others because the relationships are implicit rather than declared in a layout system.

---

## 24. Seventh Pass — Build Pipeline, Sync Gaps, and Stale Artifacts

### 24.1 `canonical-receipts.ts` is the real source of truth, but `site/` is stale

`scripts/canonical-receipts.ts` contains:

```ts
export const CANONICAL_TEST_COUNT = 1771;
export const CANONICAL_LINE_COV = '91.97';
export const CANONICAL_FUNC_COV = '94.85';
```

`scripts/sync-surfaces.ts` propagates these to `README.md`, `index.html`, `docs.html`, `specs.html`, and other surfaces. The source files now show the correct numbers:

- `index.html` OG description: `1,771 tests`.
- `docs.html` gate: `1,771 tests / 0 fail` · `91.97% line / 94.85% func`.
- `specs.html` OG description: `1,771 tests, 91.97% line / 94.85% func`.

But the committed `site/` directory (the Pages build artifact) still shows the old numbers:

- `site/index.html` OG description: `1,477 tests`.
- `site/docs.html` gate: `1,477 tests / 0 fail` · `95.03% line / 92.03% func`.
- `site/specs.html` stat box: `1,477 tests · 95.03% line / 92.03% func`.

### 24.2 The pre-commit hook syncs source files but not `site/`

`.githooks/pre-commit` runs:

```sh
bun scripts/sync-surfaces.ts >/dev/null 2>&1 || true
```

It then re-stages `*.md`, `*.xml`, `*.html`, and `package.json`. It does **not** re-stage or regenerate the `site/` directory. The hook is also non-blocking (`|| true`), so a sync failure is silent.

### 24.3 `site/` is gitignored but still tracked

`.gitignore` line 3 lists `site/`, but the files are still present in the repo (tracked before the ignore was added). This means:

- A fresh clone sees stale `site/` files.
- `bun run pages` regenerates `site/` locally, but the regenerated files are ignored and easy to forget to commit.
- The Pages CI does regenerate `site/` on deploy, so the live site is correct — but the repo and local dev can disagree.

### 24.4 The build pipeline is correct but the workflow is fragile

`scripts/build.ts` bundles `index.html`, `docs.html`, `specs.html` into `dist/`. `scripts/build-pages.ts` copies `dist/` into `site/` and rewrites nav links. The pipeline is correct. The fragility is human: the source files are synced by the pre-commit hook, but the `site/` artifact is only regenerated if someone runs `bun run pages` and then commits the tracked files (which are ignored by default).

### 24.5 The sync regexes may miss non-canonical phrasings

`sync-surfaces.ts` uses regexes to replace test/coverage tokens. The stat box in `site/specs.html` (`1,477 tests · 95.03% line / 92.03% func cov`) uses a phrasing that is not in the source `specs.html`, suggesting it was produced by an older build or a different template. If the source file doesn't contain the pattern, sync-surfaces won't touch it. The coverage shorthand is also matched only when it appears in specific shapes (`NN.NN% line / NN.NN% func`, `NN.NN% / NN.NN%`, etc.).

### 24.6 The local dev server serves the correct source files

`server.ts` imports `index.html`, `docs.html`, and `specs.html` directly and serves them bundled. This means `bun dev` shows the synced, correct numbers. The discrepancy is only visible in the committed `site/` directory or on a deploy that doesn't run `bun run pages`.

### 24.7 The Lab page is not bundled or synced

`server.ts` serves `/lab` as a static file (`lab/quantum-wildbeyond.html`), not through the Bun bundler. `build-pages.ts` copies it verbatim. The Lab page is never processed by `sync-surfaces.ts`, so it carries no test/coverage numbers. It also uses Google Fonts and a light theme, completely separate from the main app.

---

## 25. Eighth Pass — First-Run Experience, Toolbar, and Incomplete Hero Flow

### 25.1 The toolbar is a 19-button scrolling strip

`index.html:876-1039` defines `#bar`, a fixed bottom toolbar with 19 buttons:

- music, song, sfx, sfxcycle, reset, time, wire, view, algo, weather, sim, cosmo, space, entropy, chaosmode, nhi, apoc.

Every button repeats the same 200-character class chain. The container is `max-w-[calc(100vw-16px)]` with `overflow-x-auto` and `flex-nowrap`, so on a small laptop it becomes a horizontal scroll strip. The user must discover the meaning of each icon/word combination. There is no grouping: audio controls (music, song, sfx, fx) are mixed with world controls (reset, time, weather, view), creative controls (wire, cosmo, nhi, apoc), and a toggle (sim). The `role="toolbar"` is present but there is no roving `tabindex` or arrow-key navigation; keyboard users must tab through all 19 buttons.

### 25.2 The nav links are tiny and corner-stranded

`index.html:1094-1124` places Docs, Spec, and Lab links as fixed-position pills at `right-16`, `right-28`, and `right-40` from the bottom-right corner. They are 9px uppercase, bordered, and sit on top of the 3D world. On phones they are likely to collide with the touch controls or the `#hud-vsr` box. The `center-hud.ts` re-homes them into the launcher, but the raw markup still carries the fixed utilities, so the CSS must forcibly override them with `position:static`.

### 25.3 The touch action wheel uses cryptic abbreviations

`index.html:1066-1092` defines the radial wheel with four petals:

- `SPL` (split), `BRS` (burst), `MUT` (mutate), `CHS` (chaos).

The apocalypse core is a skull icon with no text. A new user has no idea what `SPL` or `BRS` means without long-pressing for the title. The petals are 44px circles, which meets the touch target minimum, but the labels are 8px uppercase and hard to read.

### 25.4 There is no onboarding or first-run guidance

The app opens directly on the 3D world. There is no splash screen, no "Drag to look, scroll to zoom" hint, no explanation of the toolbar, no introduction to the access puzzle, and no sign that the superhero flow exists. The help panel (`help-system.ts`) is self-mounting and can be opened from the dock, but it is not shown automatically. The user must discover every interaction by trial and error.

### 25.5 The Superhero HUD is dense but incomplete

`src/ui/superhero-hud.ts` draws a top-center game band with:

- Life / Energy / XP bars (9px labels, 9px numbers).
- Power, Plan, Wallet (`☉☾◇❖` symbols), Neural emotion dots, and six cosmetic inventory slots.
- Four power buttons with costs in `⚡`.
- PILOT, VISION, CAM buttons.
- A 22px 6-way D-pad.
- World frame counter.

The wallet symbols are not explained. The inventory slots are cosmetic (no interaction). The powers have no cooldown or charge-state visuals. The D-pad is 22px per button, which is below the comfortable 44px thumb target. The whole HUD is 11px font with 8px stat labels, making it feel like a debug overlay rather than a game HUD.

### 25.6 The Access Puzzle toggle stays green after solving

`src/ui/access-puzzle.ts:274` returns early from `open()` if `this.solved` is true, but the dock toggle (`#cqm-acc-toggle`) still has the `cqm-acc-flick` animation and the original `⛓ ACCESS` label. There is no visual distinction between "unsolved puzzle" and "access already granted." A user who solved it once and comes back later sees the same flickering green button and may think they need to solve it again.

### 25.7 The sheet-toggler script is inline and not unit-testable

`index.html:1181-1219` contains an inline IIFE that toggles `.sheet` classes. It works, but it is not in a module, not typed, and not tested. It also only handles `click` and `Escape`, not touch gestures or screen-reader activation. The logic is duplicated in spirit by `center-hud.ts` which drives the same panels through the hidden dock.

### 25.8 The `#hud-vsr` box is a passive, always-on bottom-right card

`index.html:1129-1172` places the View/Speed/Render/Music/SFX/Song/Resets readout at `right-2 bottom-1.5`. It is `pointer-events-none` so it cannot be clicked. There is no way to change these settings from the readout — the user must use the toolbar. The card competes for the same corner as the nav links and the action wheel on phones.

### 25.9 No persistent settings UI exists

Settings like music, SFX, quality tier, and render mode are toggled through the toolbar buttons or the action wheel. There is no central settings panel, no saved preferences, and no indication of the current state beyond the readout box. The `localStorage` audit ring is used, but settings are not persisted.

---

## 26. Ninth Pass — Accessibility, Performance, and Reduced Motion

### 26.1 The toolbar has ARIA labels but no roving tabindex

`index.html:876-1039` gives every toolbar button an `aria-label` and `title`, but `#bar` only has `role="toolbar"`. A screen-reader or keyboard user must Tab through all 19 buttons one by one. There is no `aria-orientation`, no `aria-activedescendant`, no arrow-key roving tabindex, and no escape-to-exit behavior. The toolbar also lacks a visible focus indicator override — it relies on the global `button:focus-visible` rule, which is fine, but the 8px font makes the focus ring the most visible element on the button.

### 26.2 The access puzzle and superhero HUD pulse continuously

`src/ui/access-puzzle.ts:128` defines `cqm-acc-flick` (2.2s steps animation) on the toggle. `src/ui/access-puzzle.ts:144` defines `cqm-acc-blink` (1.05s steps animation) on the denied banner. `src/ui/superhero-hud.ts:39` defines `cqm-hero-pulse` (2.4s ease-in-out animation) on the hero glyph. These are decorative loops that continue until the user solves the puzzle or closes the HUD.

`app.css:116-125` has a `@media (prefers-reduced-motion: reduce)` block that sets `transition-duration: 1ms` and `animation-duration: 1ms`, which should effectively stop these loops. However, the access-puzzle and superhero HUD styles are injected as inline `<style>` elements by TypeScript modules; they do not live in `app.css` and do not include their own reduced-motion queries. They rely on the global media query, which is correct, but the media query only shortens durations — the animations still run once. For a photosensitive or motion-sensitive user, a `steps(2)` flash compressed to 1ms is still a flash.

### 26.3 The 8px micro-type fails readability thresholds

WCAG 2.1 SC 1.4.4 (Resize text) and 1.4.10 (Reflow) do not set a minimum font size, but the 8px `text-4xs` used for control-pad captions, observatory tab labels, and toolbar glyphs is below the threshold where most users can read it comfortably without browser zoom. The main app viewport meta (`site/index.html`) disables zoom with `maximum-scale=1,user-scalable=no`, so users cannot enlarge it. The static pages allow zoom, but the app shell does not.

### 26.4 The perf HUD is hardcoded and not tokenized

`src/ui/perf-hud.ts:63-67` creates the performance chip with a `style.cssText` string:

```ts
'position:fixed;left:8px;bottom:8px;z-index:40;font:11px/1.4 ui-monospace,monospace;' +
  'color:#cfe0fb;background:rgba(8,14,30,.72);border:1px solid rgba(120,160,220,.22);' +
  'border-radius:8px;padding:5px 8px;user-select:none;backdrop-filter:blur(6px)';
```

This is another instance of the hardcoded-style pattern. It also provides a tiny hint (`fly: drag · scroll · WASD`) that is the only onboarding affordance in the app. The hint is 10px, bottom-left, and not visible to screen readers unless they navigate to the perf chip.

### 26.5 The frame governor can silently degrade visual quality

`src/core/frame-governor.ts` sheds DPR from 1.0 → 0.85 → 0.65 and turns off post-FX and shadows under sustained slow frames. The only UI feedback is the perf HUD label changing from `full` to `dpr 85%` to `dpr 65%`. A user who sees the world become blurry has no explanation unless they know to look at the bottom-left chip. There is no transient toast or explanation of why the quality dropped.

### 26.6 Settings persistence is partial

`src/memory/store.ts` persists only `seed`, `songIdx`, `algoIdx`, `viewIdx`, `weatherIdx`, `sfxOn`, `sessions`, and `sim`. It does not persist `musicOn`, `render mode`, `quality tier`, `panel open/closed states`, `help-dismissed flag`, or `onboarding-completed flag`. Each reload resets music to OFF and the user must re-enable it. The only visible onboarding-like persistence is the session counter, which is used for analytics but not UX.

### 26.7 The WebGL recovery card is hardcoded and not reduced-motion safe

`src/main.ts:47-69` builds a full-screen error card with `style.cssText`. The card is well-written (uses `textContent` for the error message), but it has no reduced-motion support, no high-contrast mode support, and uses fixed pixel values. It is also the only error state UI in the app.

### 26.8 The observatory canvases are not accessible to screen readers

`index.html` and `observatory.ts` create `<canvas>` elements with `role="img"` and `aria-label` on some, but the live data values (entity count, chaos, energy, etc.) are only written into the telemetry panel rows. There is no `aria-live` region for the observatory, no table semantics for the data grid, and no way for a screen reader to read the chart trend. The charts are purely visual.

### 26.9 The sheet toggle script uses inline, untyped JavaScript

`index.html:1181-1219` is an inline IIFE that toggles sheet classes. It has no `aria-live`, no `aria-controls` wiring beyond the initial attribute, and no `aria-pressed` or `aria-expanded` updates for the toggle itself. It handles click and Escape, but not touch gestures or screen-reader activation. Because it is inline, it is not unit-tested or linted.

### 26.10 The Lab page is keyboard-trap prone

`site/lab/index.html` and `lab/quantum-wildbeyond.html` are p5.js canvases with no visible focus indicator. The 12-tile WebGL grid has no keyboard navigation, no `aria-label` per tile, and no reduced-motion support for the shader animations. A keyboard user cannot navigate the gallery without a mouse.

## 27. Remediation Progress (1st pass — applied 2026-06-28)

A first remediation pass was executed against the audit recommendations. The following changes are in the working tree and pass `bun run check`:

- **Canonical receipts fixed and surfaces synced.** `scripts/canonical-receipts.ts` corrected the swapped line/function coverage values (line `94.77` / function `91.97`, `1771` tests). `bun run scripts/sync-surfaces.ts` propagated the truth to `README.md`, `index.html`, `docs.html`, `specs.html`, and the dated docs. `bun run pages` refreshed the untracked `site/` directory.
- **Toolbar rebuilt.** `index.html` now groups the 19 controls into Audio / World / Visual / Creative / Special using `.toolbar-group` + `.toolbar-btn` component classes. `src/ui/toolbar.ts` adds roving `tabindex` and arrow-key navigation. `src/ui/input.ts` switched to event delegation so dynamically added `[data-action]` buttons work.
- **Persisted settings expanded.** `src/memory/store.ts` and `src/types.ts` now accept `musicOn`, `renderIdx`, and `tier` as additive fields. `src/world.ts` persists music and render-mode changes, and `src/audio/engine.ts` gained `setMusicOn` so first-gesture unlock restores the user's last preference.
- **Superhero HUD improved.** `src/ui/superhero-hud.ts` now uses 44px D-pad touch targets, labels the wallet with `☉ Aurum · ☾ Umbra · ◇ Quanta · ❖ Ichor`, disables individual power buttons when energy is insufficient, adds a tooltip explaining the cosmetic inventory slots, and includes ARIA labels for the D-pad and power buttons.
- **Access puzzle solved-state fixed.** `src/ui/access-puzzle.ts` adds a `.solved` class that removes the flicker animation, changes the toggle text to `✓ ACCESS GRANTED`, and updates the title/ARIA label.
- **First-run onboarding added.** `src/ui/onboarding.ts` shows a one-time, dismissible overlay explaining look/zoom/fly, the grouped toolbar, the access puzzle, and superhero mode. It stores the dismissed flag in `localStorage` and respects reduced motion.
- **Settings panel added.** `src/ui/settings-panel.ts` mounts a `⚙` toggle into the dock and opens a modal with Audio / Visual / World buttons that reuse the same `[data-action]` contract as the toolbar.
- **Quality-degradation toast added.** `src/main.ts` tracks `RenderGovernor` level transitions and calls `world.showQualityNotice(level)` so users see "QUALITY · DPR 65%" / "QUALITY RESTORED · FULL" instead of a silently blurrier world.
- **Perf HUD tokenized.** `src/ui/perf-hud.ts` no longer uses `style.cssText`; it uses the `.perf-hud-*` classes in `src/styles/app.css` for layout, tier buttons, and the hint.
- **Observatory ARIA-live region added.** `src/ui/observatory.ts` creates a screen-reader-only live region inside `#oP` and updates it with the active page name, entity count, energy, links, and sentience on every snapshot push.
- **Satellite pages unified.** `docs.html`, `specs.html`, and `lab/quantum-wildbeyond.html` now share a consistent sticky header bar (logo + Dome · Docs · Spec · Lab navigation) with matching focus states and responsive behavior. The shared chrome is inlined in each page so `Bun.build` does not need to resolve external stylesheets, and the build script still rewrites the absolute nav links to subpath-relative for GitHub Pages.
- **Lab page keyboard navigation.** `lab/quantum-wildbeyond.html` already had `tabindex` and Enter/Space on each of the 12 visual tiles; it now adds arrow-key / Home / End roving focus so keyboard users can move between the 3D tiles without a mouse. The handler is assigned via `grid.onkeydown` so board rebuilds never accumulate duplicate listeners.
- **Shared panel shell created.** `src/ui/panel-shell.ts` centralizes idempotent CSS injection, a fixed glass-panel container, a standard header with close button, a bottom-dock toggle, and backdrop/Escape close wiring. The settings panel and onboarding overlay were migrated to use it, removing their duplicated glass-panel and close-button CSS.
- **Remaining self-mounting panels migrated to shared shell.** `src/ui/copilot.ts`, `src/ui/help-system.ts`, and `src/ui/audit-dock.ts` now use the panel-shell primitives (`dockToggle`, `panelHeader`, `wireClose`, `injectPanelBaseCSS`). The copilot and help panels keep their custom 50/50 body layouts but reuse the shared toggle, header, and close wiring; the audit dock reuses the shared dock toggle. This eliminates the duplicated toggle and close-button CSS across the three panels. `src/ui/onboarding.ts` was already on the shared shell and verified. `src/ui/center-hud.ts` is a navigation controller rather than a panel, so it stays outside the shell (its chrome is the launcher, not a glass panel).

All major audit recommendations from the 8th and 9th passes have been addressed in this remediation cycle. Remaining optional polish: continue the phone-portrait bottom-band redesign and any further panel-body CSS tokenization.

## 28. Conclusion

The current UI is **functionally ambitious but visually fragmented**. The core shell is well engineered and the responsive grid/sheet architecture is the right foundation. The user's pain points are concentrated in:

- **small-screen density and collisions,**
- **inconsistent visual identity between the shell and the nine satellite panels,**
- **incomplete superhero/access-puzzle experience,**
- **three satellite pages that feel like separate websites,**
- **and a micro-typography default that makes the app feel like a data dashboard rather than a game/simulation.**

A remediation pass should focus on **tokenizing the satellite panels**, **creating a shared panel chrome**, **redesigning the phone portrait bottom band**, **completing the superhero controls**, **unifying the static pages**, **consolidating the input system**, **collapsing the source-level duplication** (utility-chain buttons, missing `--color-white`, font-shorthand resets, and the UI construction in `world.ts`), **refreshing the build artifacts** (regenerate or remove the stale tracked `site/` directory, and make the pre-commit sync check blocking), **adding a first-run onboarding layer** (toolbar grouping, persistent settings, and a dismissible tutorial), and **systematizing accessibility and reduced-motion** (roving toolbar focus, per-component reduced-motion, zoomable viewport, quality-degradation toasts). The underlying simulation is not the issue; the issue is the **polish, coherence, and inclusivity of the control surface** around it.

---

_End of 2nd + 3rd + 4th + 5th + 6th + 7th + 8th + 9th-pass audit. A first remediation pass (section 27) was applied on 2026-06-28._
