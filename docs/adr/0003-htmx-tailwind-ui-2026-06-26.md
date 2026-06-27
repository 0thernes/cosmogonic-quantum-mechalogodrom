<!-- reviewed: 2026-06-27 | repo-wide consistency audit | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# ADR 0003 — HTMX + Tailwind CSS for the UI chrome

- Status: Accepted
- Date: 2026-06-09

## Context

The UI is deliberately thin: two collapsible glass panels, a toolbar, three
fading overlays, a joystick, and one server-fed list (the audit trail).
Everything interesting happens on the WebGL canvas. The legacy file styled
this with ~80 lines of hand-rolled CSS custom properties and wired it with
inline `onclick="tM()"` handlers calling globals — untypable, untestable, and
inaccessible (icon-only buttons with no names, Known Bug 7).

A SPA framework (React/Vue/Svelte) would add a render loop next to the rAF
loop, a virtual DOM the telemetry panel would fight at 7.5 updates/sec, and a
dependency weight wildly out of proportion to two panels and a toolbar.

## Decision

- **Tailwind CSS 4** for styling: utilities in `index.html`, design tokens
  via `@theme` in `src/styles/app.css` (`--color-void: #030612`,
  `--color-accent: #0ef`, `--color-warn: #fa0`), plus the few genuinely
  stateful rules (panel collapse, joystick circle, safe-area padding) as
  plain CSS. Fonts self-hosted via Fontsource (Inter Variable, JetBrains
  Mono).
- **HTMX 2** for the single piece of server-driven UI: the audit panel
  declares `hx-get="/api/audit" hx-trigger="load, every 5s"
hx-swap="innerHTML"`, and the server returns a ready-to-swap `<ol>`
  fragment. No JSON, no client-side templating, no state sync.
- **Typed event binding instead of inline handlers**: `src/ui/input.ts`
  binds `[data-a]` (movement/sim) and `[data-action]` (toolbar) buttons to a
  typed `UiActions` interface implemented by `world.ts`. Every icon-only
  control gets `aria-label` + `title`.
- Direct DOM writes for telemetry — cached element refs, `textContent`
  assignments, canvas sparklines (Known Bug 4 fix). No framework reconciler.

## Consequences

**Positive**

- Runtime payload for the whole UI layer is HTMX (~10 KB gz) + generated
  Tailwind CSS; no framework runtime competes with the rAF loop.
- The audit trail is server-rendered — the panel works even while the sim is
  paused or the tab is recovering, and the endpoint is trivially curl-able.
- `UiActions` makes the UI surface mockable: input binding is testable
  without a renderer, and the contract between DOM and sim is one interface.

**Negative / accepted risks**

- HTMX polling is eventually consistent (≤ 5s lag) and keeps a request timer
  alive per open tab. Accepted for a 200-entry debug ring.
- Server-rendered fragments mean the server must HTML-escape audit fields
  (see SECURITY.md) — an obligation JSON APIs don't have.
- Tailwind utilities in markup are verbose; mitigated by `@theme` tokens and
  `prettier-plugin-tailwindcss` class ordering.
- Two styling systems exist during the port (legacy CSS as reference,
  Tailwind as implementation); `legacy/` is frozen so drift is one-way.
