# Kanban — Cosmogonic Quantum Mechalogodrom

The delivery board for the project. It tracks work as cards moving left→right
across columns, grouped by **epic (era)**. The eras map 1:1 to the binding
contract sections in [MODULE-CONTRACTS.md](./MODULE-CONTRACTS.md) and to the
tagged releases in [../CHANGELOG.md](../CHANGELOG.md). Every "Done" card landed
behind the full gate (`bun run check`) and a commit.

> **How to read this:** a card is `[id] title — one-line outcome`. The legend
> below defines status and priority. WIP limits keep focus: at most a handful of
> cards are ever **In Progress** at once. New work enters at **Backlog**, is
> pulled to **Next** when scoped, **In Progress** when started, **Review** when
> the gate runs, and **Done** when committed.

## Legend

| Symbol | Meaning                                                          |
| ------ | ---------------------------------------------------------------- |
| 🟥 P0  | Correctness / determinism / security — blocks a release          |
| 🟧 P1  | User-visible behaviour or contract conformance                   |
| 🟨 P2  | Quality, perf headroom, docs, cleanup                            |
| 🟦 P3  | Nice-to-have / exploratory                                       |
| ⏳     | Cadenced / deferred (waiting on an external input or a decision) |

**WIP limits:** Next ≤ 6 · In Progress ≤ 3 · Review ≤ 2.

---

## Board

### ✅ Done — V12 RELIQUARY + V13 ECONOMY/PHYSICS (2026-06-14)

- 🟧 P1 `V12-SURFACE` — Reliquary Surface jewel BRDF: carved fBm relief engraves the PBR normal, worn-jewel roughness, dielectric pull, amber bass-reactive SSS, thin-film iridescence — _037f0d4_
- 🟧 P1 `V12-SPECIMEN` — macro SPECIMEN camera view (10th mode, snap-on-jump studio-plate tour of live organisms) — _037f0d4_
- 🟧 P1 `V13-ECONOMY` — 2 competing currencies (AURUM ☉/UMBRA ☾) + 2 commodities (QUANTA ◇/ICHOR ❖): clearing market + currency-adoption game, titan/NHI wallets, own `econRng` sub-stream (determinism intact) — _237710c, +9 tests_
- 🟧 P1 `V13-HUD` — bottom-right View/Speed/Render box (non-overlapping) + NHI telemetry tally — _1cfe189_
- 🟧 P1 `NATIVE-ENGINE` — C++20/OpenGL SDF ray-marcher, GLFW+GLM, MinGW GCC 16.1, rendered on RTX 5070 Ti; unified amber jewel plate — _17fa52f, 1178c0f_
- 🟥 P0 `NATIVE-PHYSICS` — **LIVE** impulse rigid-body solver (gravity well, sphere collisions + restitution + friction-spin, quaternion tumbling), active by default, drives the render — _6f5daa9_
- 🟨 P2 `DOCS-V13` — ADR-0007, ENTITY-SHEETS, ERD economy/physics, this board
- 🟧 P1 `CREATURES-100` — 100 Shoggoths + 100 Puppeteers (desktop+; lights capped → shader-safe; lesser puppeteers deterministic, no rng). Verified 100/100 at `?tier=ultra`, glErr 0
- 🟨 P2 `TIER-OVERRIDE` — `?tier=` boot override for QA across the quality ladder
- 🟨 P2 `NATIVE-4K` — true 3840×2160 reliquary plate rendered (native, live physics, RTX 5070 Ti)
- 🟧 P1 `NHI-OBSERVATORY` — per-NHI 9-view 3×3 connectome grid (firing · topology · memory · reward · sensory · intention · affect · prediction · decision), live + scientific, each bound to real `NhiMind` state. Verified: 3 NHIs, all 9 views painting
- 🟧 P1 `TITAN-DIPLO-ECON` — AURUM/UMBRA wealth steers titan PD diplomacy (richer → raid → war, poorer → appease); null-safe `attachEconomy`, goldens byte-identical. Verified live: 21 ally / 24 war / 0 truce under a live Gini
- 🟧 P1 `SHOG-ECON-BEHAVIOR` — 100 Shoggoths enrolled (varied purses); wealth drives boldness (hunt cadence, tendril tug, body size+glow), relative to live mean. Verified: 210→500 spread, ~31 bold / ~32 timid
- 🟥 P0 `JOLT-ON` — Jolt Physics 5.2 wired ON by default in the native engine (`physics_jolt.h`): specimens are real rigid bodies (mass/inertia/restitution), central well + case spring, broad/narrow-phase solve. Built w/ MinGW, verified on RTX 5070 Ti
- 🟧 P1 `PUP-ECON-BEHAVIOR` — 100 Puppeteers enrolled (varied purses); wealth drives meddle cadence + body size/glow, relative to live mean. Market now 210 agents. Verified: 181→435 spread, ~32 bold / ~32 timid

### 🚧 Next — V13/V14 directive backlog (user, 2026-06-14)

- 🟧 P1 `ECON-PROXY-WARS` — explicit patron→proxy funding + trade blocs (titan wealth now tilts PD diplomacy → war/alliance; explicit bloc mechanics next)
- 🟧 P1 `ECON-MARKETS` — black markets, cartels, auctions, sanctions, arbitrage (creature wallets now drive titan/shoggoth/puppeteer behaviour — 210 agents; next: the market-mechanic depth + tribe wallets)
- 🟧 P1 `CREATURES-SMART` — make the 100+100 smart/social/dangerous: perceive, remember, bargain, flee, hunt, deceive, trade, ally, mutate (counts shipped; behavior depth next)
- 🟧 P1 `AI-REPAIR` — Copilot offline: diagnostics + failure reason + restart controls + recovery pipeline
- 🟨 P2 `JOLT-FRACTURE` — Jolt is ON + driving the native specimens (V18); next: convex-decomp fracture, soft-body, crowd-scale
- 🟨 P2 `DOCS-SYNC` — keep README/Docs/Specs/ERD/Architecture/Kanban current every increment (standing card)

### 📥 Backlog (unscheduled)

- 🟦 P3 `LAB-ART` — wire user-supplied AI artwork as N(2)/lab textures & palettes (⏳ awaiting image files on disk)
- 🟦 P3 `SFX-KARPLUS` — Karplus–Strong + ring-mod/wavefold SFX families (swarm idea; richer timbres beyond subtractive)
- 🟦 P3 `RENDER-MORE` — additional exotic render modes (point-cloud, x-ray-skeleton) past the current 7
- 🟦 P3 `SING-SPAGHETTI` — black-hole spaghettification via GPU vertex stretch (deferred: collides with belly/pulse scale, needs release-relax)
- 🟨 P2 `OBS-EXPORT` — observatory chart → PNG export; lab tile → focused PNG export
- 🟨 P2 `A11Y-SWEEP` — full keyboard map for the 3D camera; prefers-reduced-motion audit across the canvas overlay
- 🟦 P3 `I18N` — externalize HUD/lore strings for localization

### 📋 Next (scoped, ready to pull)

- 🟨 P2 `AUDIT-DATE` — make sim-originated audit records deterministic (thread a tick counter; remove `Date.now` from the collapse/omen records)
- 🟨 P2 `HOT-LIFESPAN` — resolve the unreachable `tMod = 1.3` hot branch (add a hot weather state, or drop the dead branch)
- 🟨 P2 `SERVER-RL` — rate-limit + origin-check `POST /api/audit` (currently unauthenticated; ring-eviction spam vector)
- 🟦 P3 `PAGES-CD` — GitHub Pages deploy of `dist/` + `/lab` (gated on making the repo public — exposes `legacy/` personal files; decision required ⏳)

### 🔨 In Progress (WIP ≤ 3)

- 🟨 P2 `PRO-DOCS` — pro-grade documentation pass: KANBAN (this), 500-point inspection, README/architecture polish
- 🟨 P2 `DSA-SWEEP` — time-complexity review + verified algorithmic upgrades across the hot paths

### 🔍 Review (gate running, WIP ≤ 2)

- _(empty)_

### ✅ Done (shipped behind the gate)

**Epic: Genesis & port (0.1.0)**

- 🟥 P0 `PORT` — 882-line HTML monolith → strict, deterministic, allocation-disciplined module graph
- 🟥 P0 `DET-RNG` — single seeded `mulberry32` stream; `Math.random`/`Date.now` banned in sim logic ([ADR 0004](./adr/0004-deterministic-rng.md))
- 🟧 P1 `RENDER-CORE` — three.js scene, fixed-timestep engine, device-adaptive quality ([ADR 0002](./adr/0002-threejs-rendering.md))

**Epic: Quantum Wildbeyond V2 (0.2.0) + audit wave (0.2.1)**

- 🟧 P1 `QREG` — pure-TS 5-qubit statevector; Born-rule cloud recolour; measurement collapse
- 🟧 P1 `RD-GROUND` — Gray–Scott reaction-diffusion as the living ground emissive map
- 🟧 P1 `GRAPH-MIND` — graphology mirror, seeded Louvain tribes, PageRank crown
- 🟧 P1 `LORE` — sha256-derived sector/tribe/omen names; one seed → one mythology
- 🟥 P0 `AUDIT-21` — 21 adversarially-confirmed findings sealed (Lorenz NaN, exposure feedback, palette parity, body caps + HTML escaping)

**Epic: PANTHEON V3 (0.3.0)**

- 🟧 P1 `INSTANCED` — InstancedMesh pools, ≤80 draw calls at 10k entities, four-rung quality ladder
- 🟧 P1 `PHYLA` — 10 lore-named phyla × 25 morphotypes + wildcard outliers
- 🟧 P1 `TITANS` — 10 colossi, {energy,matter,entropy} economy, 45-pair iterated-PD diplomacy + wars
- 🟧 P1 `OBSERVATORY` — four live canvas chart pages

**Epic: XENOGENESIS V4 (0.4.0) · RESONANCE V5 (0.5.0) · ATELIER V6 (0.6.x)**

- 🟧 P1 `ATMOSPHERE` · `VIZ3D` · `OBS-4PAGE` — alien sky, holographic 3D analytics, four-page observatory
- 🟧 P1 `ALGOS-25` — 25 distinct sorting fields with visible batched swaps
- 🟧 P1 `RESCORE` — soundtrack raised to the QUANTUM tier (6 songs)
- 🟧 P1 `LAB-4PAGE` · `DOCS-REPORT` — four-page lab; GitHub-Pages-style ERD/ERM/ERP report at `/docs`

**Epic: XENOCATACLYSM V7 (0.7.0) + beyond-beyonds (0.7.1) + audit sweep (0.7.2)**

- 🟧 P1 `SFX-100` — 100 procedurally-generated, never-repeating SFX
- 🟧 P1 `ALGO-LIVE` — per-field colour/glyph picker, RUN ALL + AUTO, per-algo signature ignition
- 🟧 P1 `RENDER-7` — SOLID/WIRE/GHOST/NEON/CHROME + GPU HOLOGRAM/IRIDESCENT
- 🟧 P1 `SINGULARITY` — entropy / black / white / grey hole / strange star + Keplerian accretion particles
- 🟧 P1 `WEATHER-DRAMA` — gale/lightning/freeze/whiteout; unmistakable per-state reshaping
- 🟧 P1 `SIM-N2` — N(1) Genesis ↔ N(2) "BREAK FREE" nightmare (chaos floor, writhe, inverted palette, GPU melt, detuned audio)
- 🟥 P0 `DEFECT-SWEEP` — 9 backlog defects sealed (grey-hole retain, FM clamp, NaN seals, surrogate-pair, rank-halo dead code, …)
- 🟥 P0 `GOLDEN-DET` — same-seed golden determinism test at the integrated population layer
- 🟧 P1 `LAB-12x3D` — lab boards → 12 reactive 3D visuals/page (36), lazy WebGL-context lifecycle, click-sound + pulse
- 🟨 P2 `CICD` — CI trigger bug fixed; full pipeline + tagged-release CD + dependabot

---

## Flow metrics (snapshot)

| Column      | Cards | Notes                                           |
| ----------- | ----- | ----------------------------------------------- |
| Backlog     | 7     | Exploratory + deferred; no committed date       |
| Next        | 4     | Scoped; pull as WIP frees                       |
| In Progress | 2     | Within the WIP limit of 3                       |
| Review      | 0     |                                                 |
| Done        | 30+   | Every card gated + committed + (per era) tagged |

**Definition of Done:** code + tests + JSDoc/complexity note; `bun run check`
green (prettier → tsc strict → oxlint → bun test → build); a conventional commit;
docs updated (CHANGELOG + any affected contract/diagram). Determinism preserved
(same seed → same cosmos) and per-frame hot paths allocation-free.

## Related boards & specs

- **Process model (ERP)** — the frame pipeline & boot/audit sequences: [ERD.md §ERP](./ERD.md)
- **Data model (ERD/ERM)** — entities, relationships, cardinalities: [ERD.md](./ERD.md)
- **Binding work specs** — per-era acceptance criteria: [MODULE-CONTRACTS.md](./MODULE-CONTRACTS.md)
- **Release log** — what shipped per version: [../CHANGELOG.md](../CHANGELOG.md)
- **Audit & review** — the 500-point inspection: [500-POINT-INSPECTION.md](./500-POINT-INSPECTION.md)
