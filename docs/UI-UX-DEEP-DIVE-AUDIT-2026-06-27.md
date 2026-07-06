<!-- reviewed: 2026-07-06 | living UI/UX index | backlog: docs/FRONTEND-ACTION-PLAN.md -->

# UI/UX Deep-Dive Audit (living index)

**Canonical backlog:** [FRONTEND-ACTION-PLAN.md](./FRONTEND-ACTION-PLAN.md) · **Receipts:**
[docs/AUDIT-LOG.md](./AUDIT-LOG.md) passes 2–8 · **Gate:** `bun run check`

**Scope:** simulation shell, center HUD / panel dock, satellite pages (Docs/Spec/Lab), Super Creature /
Access-Puzzle flow, static a11y. **Method:** static code review (`index.html`, `src/styles/app.css`,
`src/ui/*`, build pipeline) — no Playwright pixel gate in CI.

**Last deep pass:** 2026-06-28 (passes 2–9, ~1,070 lines). **Pass 10 refresh:** 2026-07-06 — verbose
pass narrative removed; open items tracked only here and in FRONTEND-ACTION-PLAN.

---

## Verdict

**6.0/10** — responsive grid + tokenized shell are strong; polish debt is **coherence** (panel palettes,
bottom-band density, satellite brand unity, first-run onboarding, systematic reduced-motion).

---

## Twelve systemic issues (status)

| #   | Issue                                            | Status                                                                                                      |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Token leakage — each panel ships its own palette | **Open** — `panel-shell` migrated copilot/help/audit/settings; super/neural/arch/market panels still custom |
| 2   | Bottom-band collision (toolbar + HUD + dock)     | **Improved** — center HUD hides dock; phone portrait still tight                                            |
| 3   | Access puzzle + superhero HUD incomplete         | **Improved** — solved-state, 44px targets, wallet labels; not world-anchored                                |
| 4   | Satellite pages = three separate sites           | **Partial** — shared sticky header on docs/spec/lab; inline CSS remains                                     |
| 5   | Micro-typography default (8–10px)                | **Open** — readability / WCAG on phones                                                                     |
| 6   | Dual nav (panel-dock vs center-hud)              | **Workaround** — dock hidden, programmatic clicks                                                           |
| 7   | Input APIs split (touch / pointer / click)       | **Open** — consolidate pointer events                                                                       |
| 8   | Stale hardcoded numbers on Pages artifacts       | **Fixed** — `sync-surfaces` + `build-pages`; pre-commit sync enforced                                       |
| 9   | `index.html` / `world.ts` UI not componentized   | **Open** — structural maintainability                                                                       |
| 10  | First-run hostile (no onboarding)                | **Fixed** — `onboarding.ts` overlay (2026-06-28 remediation)                                                |
| 11  | a11y / reduced-motion spotty                     | **Partial** — toolbar roving tabindex; decorative pulses need audit                                         |
| 12  | Lab keyboard trap / tile a11y                    | **Partial** — WildBeyond arrow-key roving; WebGL tiles still visual-only                                    |

---

## Resolved since 2026-06-28 (do not re-open)

- Toolbar grouped (Audio/World/Visual/Creative/Special) + roving `tabindex`
- Settings panel — sim controls in **SET → Settings** only (`#pad-sim` hidden)
- Access puzzle `.solved` state (no flicker after grant)
- Onboarding overlay + persisted music/render/tier in `store.ts`
- Quality-degradation toast via `RenderGovernor` transitions
- Perf HUD tokenized + expanded (frame ms, p95, heap, workers, wilderness) — pass 6–7
- Wilderness ambient render (ADR 0010 Stage 3b) — pass 4–6
- Observatory `aria-live` region for telemetry snapshots
- DOCS/SPEC SVG fit (`alife-metrics-gallery.ts`) — FRONTEND #5
- Entity color saturation (`paintVibrant`) — FRONTEND #7

---

## Open work (ordered — see FRONTEND-ACTION-PLAN sprints)

1. **Sprint A:** Playwright smoke screenshots (SVG fit, WildBeyond, MEGA 4D tab IV)
2. **Panel tokenization:** migrate super-neural / super-panel / pantheon / market bodies to shared tokens
3. **Phone portrait bottom-band** redesign (single launcher row)
4. **Unified satellite stylesheet** — one shared CSS module for docs/spec/lab (not three inline themes)
5. **Input consolidation** — pointer events for joystick, wheel, toolbar
6. **Systematic `prefers-reduced-motion`** on scramble, pulse, denied-language rotation
7. **MEGA 4D brain in window** — FRONTEND #11 (in progress)
8. **BIBLE depth + peer-review grid** — FRONTEND #12 / Sprint C–D

---

## Do-not-break

- Sim controls stay in **SET → Settings** — never restore `#pad-sim` to the dock without explicit request.
- Letter pantheon visual-only until economy backend is requested.
- Determinism: seeded `Rng` only in sim logic.
