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
- 🟧 P1 `ECON-MARKET-MECHANICS` — cartel (supply withholding), arbitrage (price-gap mean-reversion), sanctions (`economy.sanction`; titan wars → embargo). New telemetry cartelShare/arbSpread/sanctioned. +4 tests. Verified live
- 🟧 P1 `ECON-BLACK-MARKET` — embargoed buy off-book at a 25% smuggler premium, everyone else smuggles; second clearing pass, `blackVolume` telemetry. Verified live ~115 units/tick under the titan war-sanctions
- 🟧 P1 `ECON-AUCTIONS` — second-price (Vickrey/English) windfall auctions of the scarcer commodity; commons-dividend redistribution; `vickreyOutcome` helper + auctions/lastAuctionPrice telemetry. +2 tests, verified live (QUANTA lot @ ~27)
- 🟧 P1 `ECON-MARKET-TICKER` — self-building ⊙ MARKET panel surfacing all 11 economy telemetry (reserve money, FX, prices, arb, Gini, wealth, agents, cartel, sanctioned, black market, auctions) + FX/price sparkline. Verified live, all populated

- 🟧 P1 `SHOG-COGNITION` — Shoggoths perceive (prey + rival crowding + singularity), remember (satiation EMA), flee the crowd, hunt the calm, agitate under threat. Pure `creatureDrive` kernel + 4 tests. Verified live (satiation diverges, perf steady)
- 🟧 P1 `PUP-COGNITION` — Puppeteers reuse the kernel as SCHEMERS (no flee): perceive sector disorder, remember meddling, meddle MORE opportunistically over target-rich chaos. Verified live (satiation diverges, 90 mutations fired)
- 🟧 P1 `CREATURE-DECEIVE` — kernel `deceive` drive: outmatched shoggoths feign weakness (dim glow + eyes, shrink, soften tendrils). Threat radius widened so social sense engages. Verified: 63/100 sense rivals
- 🟥 P0 `MATERIAL-CLASSES` — 6 per-silhouette material archetypes (pearl/crystal/glass/amber/metal/bone) baked as compile-time `#define RQ_MAT` in the Reliquary shader; each tunes relief/roughness/metalness/SSS/film. `materialClassFor(gi)`. Verified live (all 6 compile, distinct materials render)
- 🟥 P0 `JOLT-FRACTURE` (V28) — native specimens shatter on hard impact: the hardest contact each step cracks the smaller body into **3 volume-conserving Jolt shards** (∛⅓ radius, own mass/inertia) bursting along the impact normal. **Pre-solve** approach-velocity gate @ 1.6 u/s (≈70% of the measured 2.24 u/s infall peak); shards <0.42u inert, growth capped at 48 (shader `MAX_BODIES` 24→48). Deterministic — verified 18→24 bodies, identical ×2
- 🟥 P0 `CREATURE-TRADE` (V29) — Shoggoths **bargain, trade & ally**: kernel gains `trade` (deal with the UNLIKE → worth to the wealthier, widens spread) + `ally` (peer coalition under threat → worth to the poorer, narrows it). Economy gains conservation-exact `transferWorth`; `attachTrade` facade closes the cognition→wealth→boldness loop. +5 tests. **Verified live: 440 deals / 673 AURUM over 600 frames — 103 bargains + 337 alliances, Gini 0.138→0.125**
- 🟥 P0 `AI-REPAIR` (V30) — Copilot **diagnostics + recovery pipeline**: `/api/copilot/health` live-probes the whole failover chain (parallel 1-token ping, 6s timeout); the 🩺 panel shows per-provider health lights (● up / ○ down + reason: ok/rate-limited/auth/timeout), the verdict, and a ↻ Re-probe/restart that re-enables the input on recovery. Pure `classifyHealth`/`healthVerdict` +7 tests. **Verified live: 2/2 key-less providers UP → operational**
- 🟥 P0 `SUPER-CREATURE-MIND` (V31) — the always-active apex being: **½ Titan, ~100× power**, a genuine **1444-param deep mind** (stacked CORTEX→ACTOR 18→32→16→12→8) with emotion EMA (valence/arousal/dominance), episodic memory, a prediction loop (→SURPRISE), GOAP planning (HUNT/FLEE/DOMINATE/DECEIVE/SPAWN/EXPLORE/REST), and ≤3 mutated twins. Apex purse (weight 20); self-mounting **⬢ ARCHITECT** telemetry panel (no overlap, 32px gap). Own rng sub-stream → golden intact. +5 tests. **Verified live: `ARCHITECT-Ω`, plan DOMINATE, dominance 0.998, wallet 2.1k, panel populated, 0 console errors, 736 tests green**
- 🟧 P1 `AI-HELP-SYSTEM` (V36) — **HELP ME NOW**: a self-mounting ❓ HELP panel (`ui/help-system.ts`) answering "Explain this / What is that? / I'm confused" + any typed question from a repo-grounded knowledge base (`ui/help-knowledge.ts`, 13 cards + `findHelp` retriever, +5 tests) — offline-safe (no external-AI dependency); quick chips, freeform search, a safety-constitution footer, and an "Ask the ✦ AI" handoff for web/freeform. **Verified live: ❓ in the dock, chips + freeform queries route to the right grounded cards, 0 console errors, 753 tests green**
- 🟥 P0 `SUPERHERO-MODE` (V35) — solving the puzzle drops the player INTO the 2nd creature: a top-center game HUD (`ui/superhero-hud.ts`) with LIFE/ENERGY/XP-LEVEL bars, stats (power/plan/wallet), NEURAL meters, inventory, 4 quantum POWERS, VISION/CAMERA controls — fed by a DOM-free progression model (`ui/superhero-state.ts`, +6 tests: XP curve, regen, energy economy). Powers act via window events (PHASE/VISION cycle render, CAMERA the view, FORK sires a twin ≤3 energy-gated). **Verified live: HUD shows `ARCHITECT-Ω·twin1`, LV 4→5 passive XP, wallet populated, FORK spawns a 2nd body (charges 0.6e), too-poor FORK blocked, VISION flips solid→wire, 0 console errors, 748 tests green**
- 🟥 P0 `ACCESS-PUZZLE` (V34) — the flagship cryptographic gate to the **2nd super creature**: a ⛓ ACCESS CRT terminal (`ui/access-puzzle.ts`) — 10 shimmering cipher lines whose tallies ARE the seed 3455456754, ACCESS DENIED rotating **100 languages**, alien glyphs re-scrambling every 5s; "only the Romans know" → `III IV V V IV V VI VII V IV`. DOM-free `ui/access-code.ts` (`checkAccessCode`, +5 tests). Solving fires `cqm:superhero-unlock` → the world releases a 2nd super creature (twin deep mind + apex purse + god-jewel body, own rng sub-stream). **Verified live: tallies [3,4,5,5,4,5,6,7,5,4], Roman answer → ACCESS GRANTED → `ARCHITECT-Ω·twin1` rendered (both creatures captured), 0 console errors, 742 tests green**
- 🟧 P1 `UI-DOCK` (V33) — the **bottom menu bar**: a self-mounting `ui/panel-dock.ts` consolidates the 4 floating inspector toggles (✦ AI · ⊞ NEURAL · ⊙ MARKET · ⬢ ARCHITECT) — which were scattered at 4 `right:` offsets and overlapped the Docs/Spec links — into one glass bar, and adopts the Docs + Spec nav links into it; V/S/R box raised to clear it. **Verified live: one 477px bar, 6 items, 0 strays, no overlap, panels still open, 0 console errors, 737 tests green**
- 🟥 P0 `SUPER-CREATURE-BODY` (V32) — the **graphics emphasis**: a masterful many-eyed apex BODY (`sim/super-body.ts`) — faceted crystalline CORE + wireframe ARCHITECTURE cage + 16 glowing EYES + 11 radial SPIKE-ARMS + 3 orbiting CHROME RINGS, from the 5 visual-DNA plates. Hand-written **god-jewel shader** (patched MeshStandardMaterial): fBm crystalline relief + thin-film iridescence + Fresnel + subsurface GOD-GLOW in the live plan colour × dominance. Animation wholly cognition-driven (spin/heartbeat∝arousal, glow∝dominance, colour=plan, arm-splay∝aggression, morph∝surprise). **Verified live via `__CQM__` capture: violet many-eyed spiked orb haloed by chrome rings (plan DOMINATE→violet), shader compiled clean, 0 console errors, 737 tests green**

### 🚧 Next — SUPER CREATURE + chaos-biome directive (user, 2026-06-14)

- 🟥 P0 `SUPER-CREATURE-POLISH` — past V32 (body shipped): push the look further — selective **bloom** on the god-glow + eyes, sharper crystalline facets, stronger thin-film, blink/saccade on the eyes, quantum teleport-flourish; tune eye colour (currently blazes white at high dominance). The "endlessly refine" loop.
- 🟧 P1 `SUPER-CREATURE-SENSES` — wire the percept from REAL world queries (nearest prey/rival via the grid, singularity pull, true vision/sound) instead of the current chaos/population proxies; let its `move`/dominance act back on the world (manipulate lesser entities).
- 🟥 P0 `SUPERHERO-CONTROLS` (V41) — **the game-controls ask, shipped:** 3 pilot modes (AUTOPILOT / ASSIST / MANUAL) + a PILOT button; keyboard (WASD/QE + arrows) + an on-screen 6-way D-pad fly the avatar with camera-relative steering (`super-body.setControl`); CAMERA cycles ORBIT → 3RD-PERSON → 1ST-PERSON with a follow rig (`world.updateHeroCamera`); HELP entry updated. Verified headlessly (4-case `super-body-control` test: manual flies by input, autopilot roams, hover on release, no NaN); follow-cam live-verify blocked by preview WebGL exhaustion this session (confirm on GPU).
- 🟦 P3 `SUPERHERO-DEEPEN` — past V35 (HUD/progression/powers) + V41 (controls + follow-cam): deepen it further — damage/combat (life is currently regen-only), functional inventory, richer DOMINION/RECALL world-effects.
- 🟧 P1 `CHAOS-BIOME-50K` (V38 + V40) — **shipped:** the `mega` tier raises the ceiling to **50,000** (profiled `bench/scale.ts` + √N density scaling cut 50k 167→60 ms, golden byte-identical). **V40: now the AUTO DEFAULT** — `resolveTier` returns `mega` for ≥16-core/≥8 GB machines (opt-in killed per user); verified live booting **49,975 entities, glError 0**. Archetypes already met (100/250 morphotypes). **V42: the 70-param per-entity NN is wired** — `sim/entity-brain.ts` runs every organism's genome brain (6→6→4) on a round-robin cohort, perceiving its state + world and steering itself (bounded), determinism golden byte-identical, 7 headless tests. **Remaining:** neighbour-perception senses (currently self+global); deeper neighbour-list LOD for 50k @ 60 fps; cognition-driven mutation on split.
- 🟥 P0 `AI-WEB-SEARCH` (V43) — **shipped:** the ✦ Copilot gains a `web_search` tool — model supplies a QUERY (no URL → no SSRF), the server screens it against a **safety constitution** (`src/server/web-search.ts`; public/educational only, refuses secrets/private/harm) then looks it up via a fixed key-less PUBLIC endpoint (DuckDuckGo IA), source-cited. Constitution injected into the system prompt. 8 headless tests; **live-verified** (real summary for "nikola tesla", "build a bomb" refused pre-network). Completes the directive's 6 blocks.
- 🟦 P3 `AI-WEB-DEEPEN` — past V43 (web_search shipped): grow the help corpus as systems land; add multi-source search (Wikipedia REST fallback) + result re-ranking; richer RAG grounding.
- ✅ `RAG-BOOK` (V37) — shipped: `docs/BOOK.md` is the master index over all 38 docs + code + build/run/data-flow/troubleshooting/roadmap; `scripts/gen-filemap.ts` (`bun run filemap`) self-generates `docs/FILE-MAP.md` from module headers (77 modules, deterministic). Verified: 43/43 BOOK links resolve, 0 broken. _Grows with the world (standing)._
- 🟦 P3 `UI-ERGONOMICS` — past V33 (the dock consolidated NEURAL/MARKET/ARCHITECT/AI/Docs/Spec): still TODO — relocate the Sorting Count/Step meter clock (`#alg`) off the Sorting Fields panel (`#algoP`) into a clean zone, keep Sorting Fields draggable; typography/spacing pass.

### 🚧 Next — V13/V14 directive backlog (user, 2026-06-14)

- 🟧 P1 `ECON-PROXY-WARS` — explicit patron→proxy funding + trade blocs (titan wealth now tilts PD diplomacy → war/alliance; explicit bloc mechanics next)
- 🟦 P3 `ECON-TRIBE-WALLETS` — give graph-tribes collective wallets + coalition treasuries (the full market-mechanic list — cartel/arbitrage/sanctions/black-market/auctions — shipped V20–V22)
- 🟩 P2 `CREATURES-SMART` — Shoggoths now perceive/remember/flee/hunt (V24) + deceive (V26) + **bargain/trade/ally (V29)**; Puppeteers scheme (V25). Remaining verbs: **mutate** (cognition-driven), and trade/ally for the Puppeteer cabal
- 🟦 P3 `AI-AUTOKEY` — past V30 diagnostics (shipped): optional auto-provision of a keyed provider (Groq/Cerebras) to fail over to when the key-less pool is rate-limited, for higher chat reliability
- 🟦 P3 `JOLT-SOFTBODY` — past V18 (Jolt ON) + V28 (rigid fracture): soft-body deformation + crowd-scale (100s of native bodies); bring the native target into CI; render true 4K (3840×2160) plates from the Jolt sim
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
