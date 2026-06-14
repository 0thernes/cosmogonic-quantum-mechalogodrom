# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Post-`0.9.0` continuous-hardening plus the **V10 NHI super-mind** and **V11 environment + look**
work — all additive (a no-op until a launched NHI, or behind the opt-in `?fx` flag), shipped behind
the full gate (now also a coverage gate, on Linux + Windows) with same-seed determinism preserved.

### Added

- **UI: the panel dock — one bottom menu bar (V33)** — the directive's UI/UX fix ("move ARCHITECT,
  NEURAL, MARKET, DOCS, and SPECS into the bottom menu bar … readable, touchable, responsive,
  intentional"). The four self-mounting inspector toggles used to float at four different `right:`
  offsets (ARCHITECT 330 · MARKET 204 · NEURAL 108 · ✦ AI 10), crowding the corner and **overlapping
  the Docs/Spec links**. A new self-mounting **`ui/panel-dock.ts`** builds a single glass **menu bar**
  (bottom-right, flex-wrap row); each panel now calls `mountToggle(...)` instead of fixing its own
  button, and the standalone Docs + Spec nav links are **adopted into the same bar** (the dock CSS
  neutralises each child's fixed positioning, keeping its styling). The View/Speed/Render readout was
  raised (`bottom-16` → `bottom-[76px]`) to clear the bar. **Verified live**: one 477px bar holds all 6
  items (`✦ · ⊞ NEURAL · ⊙ MARKET · ⬢ ARCHITECT · Docs · Spec`) in a tidy non-overlapping row, **zero
  stray toggles**, panels still open on click (ARCHITECT → DOMINATE), the V/S/R box clears the bar (gap
  13px), no console errors; full gate green (737 tests). _Remaining UI items: relocate the Sorting
  step/meter clock off the Sorting Fields panel; bottom-center bar polish._
- **THE SUPER CREATURE — the masterful body (V32)** — the directive's graphics emphasis: the apex mind
  (V31) now has a **masterful, morphing, many-eyed BODY** (`sim/super-body.ts`), rendered outside the
  instanced pool so it can carry unique geometry + a hand-written shader. The form is drawn from the
  five visual-DNA plates: a faceted crystalline **CORE** (R≈6, ½-Titan class), a wireframe
  **ARCHITECTURE cage**, a corona of **16 glowing EYES** (iris + void pupil), **11 radial SPIKE-ARMS**,
  and **3 orbiting CHROME RINGS** (the halo-mechanism). The surface is a **god-jewel shader** — a
  patched `MeshStandardMaterial` (real scene lighting) injected with object-space **fBm crystalline
  relief**, worn-jewel roughness, **thin-film iridescence** (Fresnel-cycled hue), and a **subsurface
  GOD-GLOW in the creature's live plan colour scaled by its dominance**. The animation grammar is
  wholly **cognition-driven**: spin + heartbeat ∝ arousal, glow + eye-blaze ∝ dominance, core/eye
  colour = the committed plan, arm-splay ∝ aggression, a vertex morph-wobble ∝ surprise, the cage
  counter-rotates, the rings never rest, and the whole colossus drifts on the mind's own movement
  output. Additive + allocation-free per frame (reused uniforms; `setMind` on the mind cadence,
  `update` animates from the clock); draws no rng. **Verified live** via the `__CQM__` capture: the
  body renders as a violet many-eyed spiked orb haloed by chrome rings (plan **DOMINATE** → violet
  glow), god-jewel shader compiled clean (no console errors), full gate green (737 tests). _Next loop:
  bloom/iridescence polish, real world-query senses, then the access puzzle + 2nd super creature._
- **THE SUPER CREATURE — the apex deep mind (V31)** — the new directive's always-active super being:
  **half a Titan, ~100× the power**, driven by a genuine **1444-parameter deep neural mind** — a
  stacked CORTEX→ACTOR network (18→32→16→12→8, a true 4-layer net, an order of magnitude past an NHI's
  tiny gene, inside the briefed 1000–1500 band). On top of the net sit the faculties the brief names,
  every one a real internal variable: an **emotion-like state** (valence / arousal / dominance, each an
  EMA of live signals), an **episodic-memory** ring, a **prediction loop** (the cortex forecasts
  next-beat salience; the gap is felt as SURPRISE and feeds arousal back), **GOAP-style planning** (a
  goal — HUNT / FLEE / DOMINATE / DECEIVE / SPAWN / EXPLORE / REST — is argmaxed from the drive scores
  each beat), **dominance**, and **self-replication** (it sires up to **3 mutated twins**, each one
  generation deeper). Enrolled in the economy with an **apex purse (weight 20)** and it **appears in
  telemetry** via a self-mounting **⬢ ARCHITECT** panel (identity · `1444p deep` · ½ Titan ×100 ·
  committed plan · seven emotion/intent meters · twins · wallet), placed bottom-right with a 32px gap
  from the market toggle (no overlap). Wired into the world on its **own seeded rng sub-stream** so the
  main determinism golden stays byte-identical, thinking ~15×/sec from live world signals
  (chaos→threat, population→crowding/prey, economy→wealth, audio bass/level→hearing+sight, a slow
  clock→circadian phase). Deterministic + tested (param budget, same-seed psychological arc, bounded
  I/O, the emotion temperament, the twin cap — 5 tests). **Verified live** in the running world:
  `ARCHITECT-Ω`, plan **DOMINATE**, dominance 0.998, wallet 2.1k, panel populated, no console errors;
  full gate green (736 tests). The masterful morphing many-eyed BODY + 4K shader that renders it hangs
  off `SuperCreature.snapshot` next loop (the brief's graphics emphasis).
- **AI diagnostics + recovery pipeline — the offline-AI repair (V30)** — the Copilot panel gains a 🩺
  DIAGNOSTICS view that answers "why is the AI silent?". A new server route **`/api/copilot/health`**
  live-probes every provider in the failover chain **in parallel** (a 1-token ping, 6s timeout each)
  and reports per-provider `{reachable, status, latency, reason}` + an overall verdict. The panel
  renders it as the **recovery pipeline** — failover order, green ● / red ○ health lights, latency,
  and a human reason (`ok` / `rate-limited (429)` / `auth (401)` / `timeout`) — surfaces the **failure
  reason** prominently, and offers **restart controls** (↻ Re-probe, which also re-enables the input
  the moment a provider recovers). The disabled / offline / all-providers-failed paths now point the
  user at 🩺 instead of a dead end. Pure classifiers (`classifyHealth`, `healthVerdict`) are
  unit-tested (+7, 731 total); the probe lives entirely outside the deterministic sim (no sim import,
  no rng). **Verified live: the probe found both key-less providers UP (LLM7 200 / 766ms, Pollinations
  200 / 1118ms) → "operational — 2/2 reachable", and the panel rendered the pipeline with green health
  lights + the ↻ restart control on screen** — so the AI is, in fact, online; the diagnostics prove it.
- **Creatures bargain, trade & ally — the cognition↔economy loop closes (V29)** — the Shoggoths gain
  the last social-economic verbs, and for the first time cognition **writes** the economy it already
  reads. The kernel adds two drives: **trade** (bargain with a nearby UNLIKE creature — different
  wealth ⇒ gains from exchange; bargaining power ∝ boldness, so worth flows to the wealthier and
  WIDENS the spread) and **ally** (coalition with a nearby PEER under THREAT — solidarity moves worth
  to the poorer, NARROWING it). Both gate on a sensed `partner` (default 0 ⇒ silent, so legacy callers
  - determinism goldens stay byte-identical). The economy gains a conservation-exact
    **`transferWorth(from, to, v)`** primitive (one debit == one credit in AURUM value ⇒ the pair's
    aggregate net worth is invariant; clamped to the payer's liquidity so it never mints money).
    Shoggoths sense their nearest neighbour, read its wealth-comparability (peer), and — staggered so
    only ~1/24 of the horde deals per frame — ACT: a bargain or an alliance moves real money, and the
    effect shows up next tick through the existing wealth→boldness→glow coupling (**no new visual state —
    the loop _is_ the visual**). Decoupled through an `attachTrade` facade (the provider owns the
    index→econ-id map + conservation, so the sim layer never imports `Economy`). +5 tests (724 total).
    **Verified live on the 100-shoggoth horde:** over 600 frames **440 deals fired, moving 673 AURUM —
    103 bargains (worth → the richer) + 337 alliances (worth → the poorer)**; with the crowded horde
    under constant rival-threat, solidarity outweighs bargaining and the shoggoth Gini eased 0.138→0.125.
- **Jolt fracture: native specimens shatter on hard impact (V28)** — the C++ engine's Jolt backend
  gains a real fracture pass. After each solve, the **hardest qualifying contact** that step cracks the
  **smaller** body of the pair into **3 volume-conserving shards** (radius × ∛⅓, so the shards' summed
  volume equals the parent's → mass conserved at unit density); each shard inherits the parent's
  type/hue and bursts along the impact normal with its **own Jolt mass + inertia**, then re-settles in
  the same harmonic well. The closing speed is read from **pre-solve approach velocities** — by the
  post-`Update` readback Jolt has already resolved the collision away, so sampling there always looks
  gentle (this was the first-cut bug: 0 fractures). The threshold (**1.6 u/s**) sits at ~70% of the
  **measured** 2.24 u/s infall peak, so only the hard tail shatters and resting contacts never do.
  Shards below 0.42u are inert (no infinite cascade) and growth stops at the **48-body shader cap**
  (`MAX_BODIES` / `kMaxBodies` 24→48, so every shard still fits the uniform array and renders).
  Deterministic — the shard scatter is `rqHash`-seeded off a monotonic counter, no rng/clock — verified
  **18→24 bodies (3 shatters), byte-identical across two runs**; full gate green (719 tests).
- **Per-silhouette material language: 6 jewel archetypes (V27)** — the single biggest "obvious entity
  differentiation" lever. The Reliquary pool shader gains **six material classes** baked as a
  compile-time `#define RQ_MAT` per pool (so each compiles its own specialised variant, zero hot-path
  cost): **PEARL** (smooth, soft cool subsurface — spheres), **CRYSTAL** (sharp faceted ribs,
  prismatic thin-film — icosahedra/dodecahedra/torus-knots), **GLASS** (transmissive, razor rim,
  dielectric — octahedra/tetrahedra), **AMBER** (warm deep subsurface, glossy — tori), **METAL**
  (conductor, machined ridges, sharp specular — cylinders/cones/boxes), **BONE** (matte, chalky, deep
  relief — the organics). Each class tunes relief frequency + strength, the worn-jewel roughness,
  metalness, subsurface tint + amount, and thin-film gain (`materialClassFor(gi)` pairs each geometry
  family with its surface). So a sphere-creature reads as pearl, a knot as faceted crystal, a box as
  machined metal — distinct biology, silhouette, AND material in one. Verified live: all 6 variants
  compile (glErr 0), the field renders faceted darks, glossy metals, and pearly forms side by side.
- **Deception + active social sense (V26)** — the cognition kernel gains a fifth drive, `deceive`: a
  threatened, OUTMATCHED creature (high threat × low boldness) feigns weakness so a dominant rival
  overlooks it. In the Shoggoths this dims the core glow + eyes, shrinks the body, and softens the
  tendrils (laying low) — layered under the V17 wealth-glow so the broke-and-cornered visibly cower
  while the rich blaze on. The rival-crowding sense radius was widened (18→38u, cap 5→3) so the social
  dynamics actually engage in the spread-out horde — verified live: **63 of 100 shoggoths now sense
  rivals** (up to 3 nearby = max threat), so flee + deceive fire for the crowded majority. +1 test.
- **Puppeteer cognition: the schemer's mind (V25)** — the cabal joins the cognition layer, reusing the
  shared `creatureDrive` kernel with a distinct interpretation (no predator flee): a puppeteer
  PERCEIVES the disorder in its sector (entity density below its orbit, via one grid query), REMEMBERS
  recent meddling (a satiation EMA), and grows OPPORTUNISTIC — its HUNT drive shortens the meddle
  cadence over a target-rich, freshly-disordered sector (folded with V19 wealth-boldness), while
  AGITATION drives a restless glow + spin. Deterministic; goldens unaffected. Verified live: satiation
  diverges (peak 0.60 on a meddle → 0 decayed, ~4 actively meddling), 90 mutations fired, perf steady.
- **Shoggoth cognition: perceive · remember · flee · hunt (V24)** — the horde stops acting on a blind
  timer and gains a mind. A pure, unit-tested kernel (`src/sim/cognition.ts`, `creatureDrive`) maps a
  PERCEPT (local threat = rival crowding + an active singularity; prey density; satiation memory;
  wealth boldness) → DRIVES (flee, hunt, agitation). In `shoggoths.ts` each shoggoth now perceives its
  neighbourhood (reusing one grid query), REMEMBERS recent feeding (a satiation EMA that decays with
  hunger and spikes on a kill), then FLEES a dangerous crowd (an away-from-rivals impulse), HUNTS a
  prey-rich calm (shorter feed interval), and grows AGITATED under threat (faster spin + eye-flicker).
  All deterministic (no rng); goldens unaffected. +4 tests. Verified live: 100 shoggoths, satiation
  diverges (most at the hunger equilibrium, ~9 freshly gorged), perf steady.
- **Market Ticker panel (V23)** — the economy is now INSPECTABLE: a self-building ⊙ MARKET panel
  (`src/ui/market-ticker.ts`) surfaces the live AURUM/UMBRA market state — reserve (dominant) currency
  - share, FX, QUANTA/ICHOR prices + arbitrage spread, wealth Gini, total wealth, agent count, cartel
    share, sanctioned count, black-market volume, and the auction tally + last clearing price — over a
    three-line FX/price sparkline. UI shell (never touches sim state); the world pushes a `MarketSummary`
    each Observatory cadence. Verified live: all 11 readouts populated (210 agents, cartel 9.3%, 10
    sanctioned, black market 118, auction QUANTA @27.4) with the sparkline drawing real history.
- **Windfall auctions (V22)** — every `AUCTION_PERIOD` ticks a lot of the SCARCER commodity (the
  higher-priced one) is sold by a **second-price / ascending-English auction**: bids = net worth ×
  appetite, the highest bidder wins but pays the runner-up's bid (the dominant-strategy-truthful
  price; new pure `vickreyOutcome` helper). Proceeds are a **commons dividend** split among the
  others (currency conserved); the lot is a windfall (minting goods, like production). New telemetry:
  `auctions`, `lastAuctionPrice`, `lastAuctionCommodity`. +2 tests. Verified live: auctions fire on
  cadence, the scarce QUANTA lot clears at a real second price (~27 AURUM). This completes the
  economy's named market-mechanic list (scarcity · arbitrage · sanctions · black markets · cartels ·
  **auctions**).
- **Black market (V21)** — the embargo has a leak: SANCTIONED agents BUY commodities off-book at a
  smuggler's premium (`BLACK_PREMIUM` 25%) while everyone else SMUGGLES (supplies a slice at that
  premium, profiting from the embargo). A second clearing pass over the off-book book (currency
  conserved), surfaced as `MarketSummary.blackVolume`. Verified live: with the 10 warring titans
  embargoed, the off-book market runs ~115–149 units/tick — sanctions bite, but the embargoed evade
  at a cost that enriches the 200 smugglers. +1 test (off-book only for the sanctioned; zero
  otherwise). Determinism + invariants preserved.
- **Market mechanics: cartel · arbitrage · sanctions (V20)** — explicit game theory layered on the
  clearing market (`src/sim/economy.ts`): (1) **Cartel** — the richest {@link CARTEL_SIZE} agents
  collude to **withhold supply** (oligopoly scarcity → price support; `topKThreshold` finds the
  membership cut); (2) **Arbitrage** — preferences mean-revert toward the under-priced commodity so
  the QUANTA/ICHOR gap closes (law of one price); (3) **Sanctions** — `economy.sanction(id, on)` cuts
  an agent's production + trade budget, and **titan wars now trigger sanctions** (a titan at war with
  ≥3 rivals is embargoed → losing the war bankrupts it). New telemetry: `cartelShare`, `arbSpread`,
  `sanctioned`. +4 tests; determinism + bounded invariants preserved. Verified live (210 agents):
  cartelShare 0.09, arbSpread → 0.01 (gap closed), all 10 warring titans sanctioned.
- **Wealth-driven Puppeteer behavior (V19)** — the 100-strong puppeteer cabal joins the economy
  (varied golden-angle purses, econ ids 3000..3099): each puppeteer's **wealth drives how often it
  meddles** — a rich hand reshapes/stokes the world more frequently and shows it (looms larger, glows
  brighter), a broke one falls quiet. Boldness is RELATIVE to the live mean puppeteer wealth. With
  titans + shoggoths + puppeteers all enrolled, the market now spans **210 agents**, and "economy
  affects EVERYTHING" reaches every active class. Null-default `attachEconomy` keeps the goldens
  byte-identical. Verified live: puppeteer net worth spreads 181→435 (2.4×), ~32 bold / ~32 timid.
- **Jolt Physics ON by default in the native engine (V18)** — the shipping-AAA **Jolt Physics 5.2**
  (jrouwe/JoltPhysics — Horizon Forbidden West) now drives the native specimens. A new
  `native/src/physics_jolt.h` is a drop-in backend behind `CQM_WITH_JOLT` (now default ON): each
  specimen is a real Jolt rigid body (sphere shape, true mass/inertia, restitution, damping); each
  step applies a central harmonic well + a soft spherical-case spring (Jolt has no radial gravity),
  runs Jolt's broad/narrow-phase collision + constraint solve, then reads the transforms back for the
  ray-marcher. Same deterministic shell seeding (`rqSeedBody`) as the built-in solver, so the LAYOUT
  matches while the DYNAMICS are Jolt's. Built with MinGW GCC 16.1 (Jolt compiled clean) and
  **verified on the NVIDIA RTX 5070 Ti** (`cqm_native.exe --shot`, 320 Jolt-driven frames). The
  self-contained built-in impulse solver remains the `-DCQM_WITH_JOLT=OFF` fallback (no network fetch).
- **Wealth-driven Shoggoth behavior (V17)** — the eldritch horde joins the economy: all 100 Shoggoths
  enrol as agents with varied (golden-angle) starting purses, and each one's **wealth drives its
  boldness** — a rich Shoggoth hunts harder (feeds sooner, tendrils tug stronger) and shows it on its
  body (looms larger + glows brighter), a broke one scavenges timidly. Boldness is RELATIVE to the
  live mean Shoggoth wealth (inflation-proof). Null-default `attachEconomy` keeps the goldens
  byte-identical. Verified live: across the 100, net worth spreads 210→500 (2.38×), splitting into
  ~31 bold-rich / ~32 timid-poor — "wallets affect behavior", not a uniform tag.
- **Wealth-driven Titan diplomacy (V16)** — the AURUM/UMBRA economy now steers the colossi's
  game-theoretic diplomacy: in each PD round, a titan far richer than its rival is emboldened to
  raid (an extra logged defection, scaled by wealth disparity), tilting the pair toward WAR while a
  poorer titan appeases — so economic dominance, not just the PD strategy, decides who marches to
  war (`TitanSystem.attachEconomy`, wired in `world.ts`). Determinism-safe via the null-default
  `attach` pattern (every titan golden test stays byte-identical). Verified live: 21 alliances /
  24 wars across the 45 pairs under a live wealth Gini — pacts and proxy wars, not stalemate.
- **NHI Neural Observatory (V15)** — a self-building inspection panel (`src/ui/nhi-observatory.ts`,
  ⊞ NEURAL toggle) that opens a **3×3 grid of nine scientific diagrams** of a launched NHI's live
  mind, ◀ ▶ to cycle through them: FIRING (the gene MLP's hidden+output activations), TOPOLOGY (the
  actual 5→6→7 weight matrix as a node-link graph), MEMORY (the episodic ring), REWARD (cumulative
  regret), SENSORY (the percept radar), INTENTION (the action-utility star), AFFECT (mood gauge +
  traits), PREDICTION (the GOAP world-model + planned next step), DECISION (the softmax policy,
  chosen vs greedy). Each view is bound to a REAL internal variable of `NhiMind.think` — nothing
  decorative. New `NhiMind.snapshot()` + `NhiSystem.snapshot(id)`/`ids()` expose the cognitive state
  (deterministic; +3 tests). Runtime-verified: 3 NHIs launched, all 9 views painting live data.
- **100 Shoggoths + 100 Puppeteers (V14)** — the eldritch horde and the puppeteer cabal scale from 3
  to **100 each** on desktop+ (16 / 14 on phone for fill-rate). Point lights are capped at the first
  few of each (WebGL compiles the lighting loop per light, so the dynamic-light count stays bounded
  and the fragment shader is byte-identical at any population); the bulk glow by emissive + bloom.
  The 97 lesser puppeteers use a deterministic golden-angle layout (no rng → the seeded stream is
  untouched). Runtime-verified at `?tier=ultra`: 100/100, no shader error (glErr 0), 10k-entity world.
- **`?tier=phone|laptop|desktop|ultra` quality override** (`core/quality.ts`) — a boot-time dev/QA
  hook so a desktop browser can preview the phone path, and a touch-emulating preview can exercise
  the full desktop/ultra population. Absent → the auto-detect ladder is unchanged.
- **True 4K plate (native)** — the C++ engine renders a 3840×2160 reliquary plate
  (`cqm_native.exe --shot --w3840x2160`) with live rigid-body physics on the RTX 5070 Ti.
- **`docs/CONTROLS.md`** — a complete control reference (mouse, keyboard hotkeys incl. `G`/`N`/`H`,
  touch, every bottom-panel button, and the 9 camera views).
- **Bottom-panel buttons** for SPACE, ENTROPY, and LAUNCH NHI (the Wave 1-2 controls were previously
  hotkey-only) — runtime-verified firing through the audit trail.
- **Determinism-under-use tests** — prove the render-mode and entropy couplings reproduce byte-for-byte
  from one seed when ENGAGED (not just at their identity defaults) and visibly diverge from baseline
  (the couplings aren't accidental no-ops).
- **Doc-link integrity test** — scans every Markdown file's relative links; it immediately caught and
  fixed a stale `docs/KANBAN.md → ./INSPECTION.md` link left from the 0.8.0 consolidation.
- **Game-theory benchmarks** (`bench/games.bench.ts`) — iterated-PD `playRound` + `replicatorStep`.
- **`prefers-reduced-motion`** accommodation (`app.css`) — calms UI-chrome animation for
  motion-sensitive users; the WebGL canvas is intentionally unaffected.
- **CycloneDX 1.5 SBOM** (`scripts/sbom.ts`, `bun run sbom`) — deterministic, attached to each release.
- **NHI super-mind (V10)** — `src/sim/nhi.ts` + `nhi-system.ts` + a game-theory kernel in
  `ai/brains.ts` (best-response, Axelrod iterated strategies, regret-matching): a deterministic apex
  intelligence (game theory + memory grudges + a per-NHI alien Markov voice + an inherited neural
  gene) wired into the world. A launched NHI now spawns mutated swarms, plays the nearest faction
  (gather/pacify when it cooperates, scatter + Nash-strategy gaslight when it defects), broadcasts
  hallucinated utterances, and wears an alien biomechanical red-eyed morphing body (`nhi-body.ts`).
  +40 tests, bit-reproducible; a no-op (draws no rng) until launched.
- **Environment depth (V11)** — additive, boot-stream-neutral backdrops for "no more 1980s feel":
  a **cosmic web** of glowing nodes + filaments (`cosmic-web.ts`), floating **gold-line architecture**
  (`gold-lattice.ts`), and a neon **sacred-geometry quantum lattice** (`quantum-lattice.ts`).
  Headless-tested (`viz-systems.test.ts`).
- **Glass-jewel organism shading** + **flag-gated cinematic post-FX** (`?fx=1`: UnrealBloom + a
  procedural PMREM env-map, `core/postfx.ts`) — OFF by default and guarded, so the verified default
  render is never regressed by an unverified effect graph.
- **Reliquary Surface (V12)** — a procedural carved-mineral jewel BRDF baked into the instanced-pool
  shader (`sim/instanced-entities.ts`): a 3-octave object-space fBm engraves the _shading_ normal so
  the six real point-lights rake honest relief across every organism, plus ornamental radiolaria-rib
  striation, a worn-jewel roughness (polished crests / matte recesses), a dielectric-glass pull, amber
  subsurface translucency that breathes with the audio bass, and thin-film iridescence riding the rim
  - ridge crests (phase drifting with time + chaos). All real `f(objPos, normal, view, time, audio)` —
    zero textures, deterministic, GPU-only, no per-entity CPU cost. Runtime-verified in the live preview.
- **SPECIMEN camera view (V12, F-RELIQUARY)** — a 10th camera mode (`'specimen'`, append-only to
  `VIEW_MODES`): a macro "specimen plate" tour that frames the live tracked organism huge on the
  fog-void, slow-turntabling and auto-advancing every ~6 s, cutting (not gliding) between specimens so
  the view reads as discrete studio plates — the direct in-engine answer to the NHI specimen reference.
- **Dev-only inspection hook** (`window.__CQM__`, localhost-only) — exposes the live world/engine and a
  manual `step()` so the preview/automation harness can drive frames + capture a backgrounded tab
  (where `requestAnimationFrame` is throttled to ~0). Never attached on the deployed static site.
- **ECONOMY (V13)** — `src/sim/economy.ts`: **two competing currencies** (AURUM ☉ / UMBRA ☾) and **two
  commodities** (QUANTA ◇ / ICHOR ❖) under a real game-theoretic clearing market. Commodity prices move
  by **tâtonnement** (excess demand → price); the AURUM/UMBRA `fx` floats via a **currency-adoption
  game** (each agent softmax-best-responds toward the appreciating money, so dominance shifts
  emergently); trades **clear buy-against-sell** so currency is conserved. Every intelligence gets a
  **purse sized to its stature** — the ten titans (and NHI super-minds on launch) are enrolled as
  agents. Runs on its own seeded sub-stream (`econRng`) so it never perturbs the main deterministic
  order (every existing golden/parity test stays byte-identical). Telemetry surfaces dominant money +
  share, FX, commodity prices, and the wealth **Gini**. +9 tests (determinism, conservation-clearing,
  price/fx bounds, Gini, stature-scaled purses). Runtime-verified live in the preview.
- **HUD (V13)** — a bottom-right **View / Speed / Render** readout box (clear of Docs/Spec, the AI
  toggle, and the toolbar) and an **NHI super-mind tally** row in Telemetry.
- **NATIVE C++ engine (`native/`)** — a real C++20 + OpenGL 3.3 ray-marcher answering the "C++ + best
  frameworks" mandate directly. The whole specimen gallery is signed-distance-field math in one
  fragment shader (urchin, Ω-ring, ribbed disc, spindle, star, diatom-lattice, pearl — each carved
  with fBm filigree, soft shadows, AO, amber subsurface, thin-film iridescence). GLFW + GLM via
  FetchContent; a codegen-free GL loader (`gl_core.*`); Jolt Physics + Dear ImGui wired as documented
  `-D` options. Self-contained `cqm_native.exe` (static MinGW runtimes); an offscreen `--shot` mode
  renders one frame to BMP and exits (4K via the `P` key). **Built with GCC 16.1 + CMake and rendered
  live on an NVIDIA RTX 5070 Ti** — `plate`/`hero` captures verify the pipeline end-to-end.
- **LIVE rigid-body physics (`native/src/physics.h`)** — the specimens are no longer static: a real
  impulse-based solver runs EVERY frame (active by default, no flag) and its transforms ARE what the
  ray-marcher draws. Each specimen is a rigid body in a harmonic gravity well inside a spherical
  reliquary case; they fall inward, **collide** (impulse resolution with restitution + positional
  correction + friction-induced spin), **tumble** (quaternion angular integration), scuff the wall,
  and settle into a churning cluster — deterministic from an integer-hash seed. The shader's `map()`
  now unions the live bodies (`uBodyPosScale/uBodyQuat/uBodyMeta`) instead of a static plate; an
  offscreen `--frames=K` advances the sim before capture. Verified on the RTX 5070 Ti: a 30-step
  frame and a 420-step frame show completely different (collided, clustered) arrangements.
- **ADR 0006** — the ASI graphics stack + the honest language verdict (GLSL now; Rust→WASM/WebGPU
  later; Python/C++ can't run client-side in a browser app).
- **GitHub Pages CD** (`.github/workflows/pages.yml` + `scripts/build-pages.ts`) — builds and publishes
  the REAL app on every push to `master`, replacing the stale hand-pushed legacy demo.

### Changed

- **CI** now enforces a coverage threshold (measured **95.6% line / 90.5% function**) and runs a
  **cross-platform matrix (ubuntu + windows)**, both verified green.
- **500-Point Inspection** refreshed to **485 PASS / 15 WARN / 0 FAIL** — §2.40 (cross-platform CI),
  §13.258 (reduced-motion), §17.339 (coverage gate), and §21.420 (SBOM) promoted, each backed by a
  shipped, verified fix.

### Verified

- Adversarial review of the new in-world AI (`brains.ts` GOAP planner, `genome.ts` crossover/mutation,
  `lineage.ts` kinship traversal): sound, deterministic, and covered by tests — no defects found.

## [0.9.0] - 2026-06-13

"AGImAGNOSIS" — the world gains minds. Pre-transformer game/A-Life AI (finite-state
machines, utility scoring, tiny neural nets, Markov chains, GOAP planning, genetics)
drives the organisms and a new roster of factions; the cosmos reproduces, ages, and
relates across generations; five cinematic cameras, TIME/SPACE controls, render-driven
dynamics, an environment artifact field, and a read-only free-LLM Copilot round it out.
Every wave shipped behind the full gate; same-seed determinism preserved.

### Added

- **Deterministic classical-AI kernel** (`src/sim/ai/brains.ts`) — the pre-2016 toolbox
  as pure, seeded, allocation-free primitives: utility/needs scoring (`utilityPick`,
  `softmaxPick`), a fixed-weight perceptron (`TinyMLP`), a `MarkovChain`, an `fsmStep`
  finite-state machine, a `goapPlan` goal planner (F.E.A.R.-style), and a bounded
  `MemoryRing` (Halo-2 blackboard). (`tests/brains.test.ts`.)
- **Digital genome + lineage** (`src/sim/genome.ts`, `src/sim/lineage.ts`) — a heritable
  gene vector decoding to traits + a `TinyMLP` brain, with seeded crossover/mutation/breed,
  and a bounded parent→offspring kinship graph (generations, ancestry, relatedness). The
  substrate for reproduction, offspring, relations, and sentience-tier propensity.
- **Eight faction archetypes** (`src/sim/factions.ts`) — Watchers / Weavers / Wardens /
  Heralds / Leviathans / SwarmMinds / Oracles / Devourers, each thinking with a DIFFERENT
  brain technique so they behave recognizably unlike one another.
- **Leviathans** (`src/sim/leviathans.ts`) — a fourth order of colossi (F-BEINGS).
- **Sentience-variation tiers** — the biome sentience index classified into named tiers
  (F-SENTIENCE-VAR).
- **Five cinematic camera views** — follow / chase / cinematic / vortex / titan motion and
  subject-tracking shots (F-CAM5), plus **TIME** (finer `timeScale` steps) and **SPACE**
  (camera-FOV dilation) controls.
- **NHI beings** (F-NHI) — launch autonomous mini-AIs with "Matrix powers" that fly and act
  on the world.
- **Environment artifact field** (`src/sim/artifacts.ts`) — persistent relics (a scar on each
  death, a relic on each summoned singularity, motes) rendered through one pooled InstancedMesh;
  visual-only and determinism-safe; wired into the world's death/summon events.
- **Free-LLM Copilot side-chat** (`src/server/copilot.ts`, `src/server/ai-sandbox.ts`,
  `src/ui/copilot.ts`) — a read-only AI you chat with about the repo and the world. Pluggable
  OpenAI-compatible provider (Pollinations no-key default; `freellmapi` ~1.7B-token pool /
  OpenRouter / Groq via env). A default-deny sandbox lets it READ files and RUN read-only
  commands but never change code.
- **Documentation** — `docs/research/PRE-TRANSFORMER-GAME-AI.md` (how AI worked before the
  transformer) and `docs/AI-SUBSYSTEM.md` (in-world minds + Copilot reference), plus the
  `PRE-2016-AI.md` dossier.

### Changed

- **Render modes now alter dynamics, not just appearance** (`RENDER_MODE_DYN`) — each style
  nudges speed / vision / social / jitter; `solid` is the exact identity, so the determinism
  golden is unchanged.
- **Singularities ("holes") affect the big roaming beings** — titans, shoggoths, and leviathans,
  not only the organisms (F-HOLES).
- **Chaos is leveled and bipolar** — discrete chaos LEVELS plus an opposing ENTROPY axis
  (F-CHAOS-ENTROPY).

### Determinism

- All in-world AI (brains, genome, factions, reproduction, sentience) draws only from the seeded
  RNG; the artifact field and the Copilot are fenced out of sim logic (visual / shell only). The
  300-frame determinism golden and the full gate (prettier → tsc strict → oxlint → 535 tests →
  build) stay green.

## [0.8.0] - 2026-06-12

"HARDENING" — a professional-grade pass: a new DSA primitive, full CI/CD plus
security automation, the complete data-model + process documentation set, and a
standing 500-point quality audit.

### Added

- **Binary heap + bounded top-K selector** (`src/math/heap.ts`) — a generic
  array-backed `BinaryHeap<T>` (O(log n) push/pop/replaceRoot) and `selectTopK`,
  which returns the K best by a strict-total-order comparator in O(n log k) time /
  O(k) space. Exhaustive tests (heapsort parity over 1,000 arrays, top-K parity vs
  a reference stable sort over 2,000 rank vectors, tie-break + degenerate cases)
  and a benchmark (`bench/heap.bench.ts`: selectTopK vs sort+slice at V=10,000,
  K=20).
- **CodeQL security scanning** (`security-extended`, push/PR + weekly schedule)
  and repo **governance**: a PR template (gate checklist), bug/feature issue
  templates, and CODEOWNERS. (Complements the existing CI gate, tagged-release CD,
  and grouped Dependabot.)
- **Data-model documentation set**: `docs/ERM.md` (conceptual relationship model
  with cardinality rules + a cross-system write-back matrix) and `docs/ERP.md`
  (process view — boot sequence, per-frame pipeline, cadence schedule, entity
  lifecycle, audit flow), complementing the existing `docs/ERD.md`.
- **`docs/500-POINT-INSPECTION.md`** — a standing audit: 25 sections × 20
  checkpoints (480 PASS / 20 WARN / 0 FAIL), each with a verdict and concrete
  evidence (file, symbol, test, or measured fact).
- **`ROADMAP.md`** — shipped / now / next horizons, with the "Next" horizon
  sourced directly from the inspection's 20 open WARNs.
- README status badges (CI, CodeQL, license, Bun, TypeScript-strict, tests,
  audit) and an expanded documentation index.

### Changed

- **PageRank halo selection is now O(V log K), not O(V log V).**
  `GraphMind.updateRank` selects the top-20 via the bounded min-heap instead of a
  full sort over all V ≤ 10,000 node keys. The exact tie-break (rank descending,
  ties by ascending entity index) is preserved, so the chosen set is byte-identical
  and deterministic. (`docs/COMPLEXITY.md` updated.)

### Fixed

- **Health-endpoint version drift.** `GET /api/health` reported a hand-synced
  constant (`0.6.1`) that had fallen behind the package (`0.7.2`). The version is
  now derived from `package.json` at server startup, so it can never drift again.
  (`server.ts`.)

## [0.7.2] - 2026-06-12

A whole-repo audit pass (handle everything: errors, bugs, structure) plus the
lab decree.

### Added

- **Quantum Wildbeyond lab — 12 3D visuals per page** (was 7; 36 total). Pages
  2/3/4 each carry twelve honest rotating-WEBGL p5 sketches that reflow 2/3/4/6-up
  at any screen shape; every tile is **clickable for sound** (a deterministic
  per-tile blip on a shared AudioContext) and **reactive** — click/Enter fires a
  `pulse()` (camera kick + energy surge decaying over ~1 s), hover speeds and
  brightens it. The fifteen new forms: Thomas/Halvorsen/Chen-Lee attractors, a
  3D Lissajous knot, a curl-noise cloud (page 2); a Bloch sphere, the oscillator
  |ψ|² height-field, a spherical-harmonic shell, a 3D quantum walk, a torus knot
  (page 3); a spiral galaxy, a 3D random walk, a seed-digit DNA helix, a Gielis
  superformula shell, a Hopf fibration (page 4). Boards build **lazily** (only
  the shown board's 12 WebGL contexts live — the other two are torn down) so the
  browser's ~16-context cap is never exceeded. (`lab/quantum-wildbeyond.html`.)
- **Same-seed golden determinism test** at the integrated population layer — two
  independent worlds, 300 frames, a bit-identical trace (the repo's #1 law, until
  now untested where it can actually break). (`tests/determinism.test.ts`.)

### Fixed

- A backlog of lower-severity audit findings, all verified-by-reading: GHOST's
  pool `depthWrite` (cross-tier over-draw), the FM/LFO negative-frequency clamp
  (silenced alien SFX tails), the **grey hole can finally retain matter** (its
  "absorb" phase was secretly a white hole), the RUN ALL cursor bound, the
  game-theory `window ≤ 30` bit-cap, the titan `setStrategy` NaN seal, `resetSim`
  rebuilding the spatial grid immediately (no frame of corpse-queries), the
  server audit-detail truncation never splitting a surrogate pair (emoji
  mojibake), and the **rank-halo restore that was dead code on every instanced
  tier** (the `parent === null` guard is true for all pooled entities).

## [0.7.1] - 2026-06-12

**Beyond beyonds** — a swarm re-audit (8 agents) of the V7 build found it reading
"familiar" and N(2) too tame; this pass pushes the marquee features past it, in
five gated waves. Every coupling stays deterministic + allocation-disciplined,
and **N(1) is byte-identical** (the 436-test suite is unchanged throughout).

### Changed

- **SIMULATION N(2) becomes a real nightmare.** The swarm found its core lever
  mis-calibrated — the chaos floor (3.5) sat _below_ the `min(chaos/2,3)`
  saturation point, so "BREAK FREE" was milder than a normal chaos-boost — and
  three contracted clauses missing. Now: chaos floor → 6 (saturation), **writhing
  behaviour** (the chaos-jitter velocity ×3, applied after the rng draw so N1 is
  exact), an **inverted/glitched palette** (per-instance `mix(c,(1−c).bgr,n)` +
  channel rotation, written to the instance attributes only → auto-reverts),
  **detuned/darker audio** (voices −35 cents + filter ×0.6, SFX −18%, on the
  forked audio rng), and a **GPU vertex-melt** — organisms physically writhe via
  per-instance normal displacement in the pool shader (gated on `uNightmare`, so
  N1 vertices are untouched). All gated on `sim===2`.

### Added

- **Keplerian singularity particles** — every black/white/grey hole, strange
  star and entropy field now spawns an additive `THREE.Points` cloud on real
  orbital mechanics (ω ∝ √(G/ρ³), inner faster): black holes **spiral matter
  in**, white holes **fountain it out**, entropy disperses. Seeded at summon,
  pure-math per frame.
- **HOLOGRAM + IRIDESCENT render modes** (5 → 7): GPU shader modes — thin-film
  oil-slick interference (cosine palette × view angle), and a fresnel-rim
  hologram with bass-pulsing scanlines (which also rescues CHROME's no-envMap
  deadness).
- **Per-algo signature ignition** — each of the 25 fields flares in its _own_
  topology (value SWEEP, parity BANDS, BUTTERFLY, value BUCKETS, RADIAL burst)
  instead of one universal flash; the per-swap sparkle brightens with **treble**
  (visual-only, so the seeded sim is untouched).

### Fixed

- Singularity holes were O(n)+sqrt over the whole population every frame for 9s
  with no stride (ENTROPY was strided, the holes weren't) — now half-rate strided
  at the ultra tier (2× accel), off the 10k budget cliff.
- `sortPerformance` near-origin kick could teleport-pop a body at |p|≈0.01
  (denominator now clamped ≥1); the per-swap flash uses `max()` not a hard set,
  so it can't dim a body the neural cap pushed above 4.

## [0.7.0] - 2026-06-11

The **XENOCATACLYSM** decree (CONTRACTS V7) — the third user-feedback pass: make
the world visibly come alive. Landed in six gated waves (see
[docs/MODULE-CONTRACTS.md](./docs/MODULE-CONTRACTS.md) §V7).

### Added

- **100 distinct sound effects** (was 8): `src/audio/songs.ts` gains a
  procedurally generated, seeded 100-entry SFX palette (`createSfxPalette`)
  spread across twelve timbral families (pluck, zap, bend, drone, sweep, bell,
  fall, vibrato, fm-clang, sub-boom, glint, strange) plus a 25-slot cue band —
  one engineered voice per sorting field. The engine voices any of them through
  one data-driven `synth()` (oscillator + optional filter, FM, pitch-LFO, octave
  shimmer, and filtered noise), and `play(type)` rotates a per-family cursor with
  per-trigger pitch jitter so repeating the same action never sounds identical.
  New `playId(n)` fires a palette entry directly. (`src/audio/songs.ts`,
  `src/audio/engine.ts`, `tests/songs.test.ts`.)
- **Living algorithm picker** — every one of the 25 `.algo-row` entries now reads
  uniquely: a deterministic per-field accent hue and a distinct leading glyph
  (`ALGO_GLYPHS`), with reactive hover/active/focus states (hue glow, scale, the
  fill bar tinted to the field's colour). Selecting a field ignites the
  population — ~800 organisms flare brighter and ripple outward.
- **RUN ALL** and **AUTO** sorting modes — a new pair of picker buttons: RUN ALL
  blends swap proposals from every one of the 25 fields each frame (the whole
  world organizes under all signatures at once); AUTO marches through all 25 in
  succession, announcing and igniting each. The HUD card and the active-field
  readout show the mode. (`index.html`, `src/styles/app.css`, `src/world.ts`,
  `src/sim/algorithms.ts`, `src/types.ts`.)
- **Five render modes** (the toolbar "Wire" button becomes "Render"): cycle
  SOLID → WIRE → GHOST (low-opacity x-ray) → NEON (each organism self-glows its
  own hue) → CHROME (liquid-metal mirror). Pure MeshStandardMaterial flag changes
  (no geometry/object swap), applied allocation-free to BOTH the per-mesh and the
  instanced pooled paths; SOLID is byte-identical to the previous look.
  (`src/sim/constants.ts`, `src/sim/entities.ts`, `src/sim/instanced-entities.ts`,
  `src/world.ts`, `src/ui/input.ts`, `index.html`, `tests/render-modes.test.ts`.)
- **Cosmological singularities** on a new chaos-control button — summon real
  cosmology at a point in the arena, one at a time: **ENTROPY** (heat death —
  thermalizes velocities, greys the glow, raises the heat), **BLACK HOLE** (r⁻²
  pull, an event horizon that consumes and scars the ground, a heated accretion
  disk), **WHITE HOLE** (the time-reversed hole — nothing may enter; r⁻² ejection),
  **GREY HOLE** (alternating absorb↔emit, the evaporating hole), and **STRANGE
  STAR** (a quark-matter conversion front that recolours organisms into strange
  matter — the strangelet chain reaction). Each is a deterministic force-field +
  a self-built, auto-expiring visual rig, with a thematic palette voice and a
  lore-named audit. (`src/sim/singularities.ts`, `src/world.ts`, `src/types.ts`,
  `src/ui/input.ts`, `index.html`, `tests/singularities.test.ts`.)

- **SIMULATION N(1) / N(2) duality** — a new toolbar toggle between two variants
  of the cosmos. **N(1) GENESIS** is the world as it ships; **N(2) BREAK FREE** is
  the nightmare — the chaos floor snaps up to a permanent agitation (wilder
  behaviour excursions), the alien sky lurid-inverts to a sickly oversaturated
  wrongness, and the page rebrands to "SIMULATION N(2)". The variant is persisted
  (an additive field — pre-V7.6 saves load as GENESIS) and applied at boot.
  (`src/types.ts`, `src/memory/store.ts`, `src/sim/atmosphere.ts`, `src/world.ts`,
  `src/ui/input.ts`, `index.html`, `tests/store.test.ts`.)

### Changed

- **Dramatic weather** — the six states now reshape the world unmistakably: STORM
  is a gale (×9 wind) under near-black cover with sharp deterministic LIGHTNING
  flashes; VOID a −60 °C lightless deep freeze (cold thins the population faster);
  AURORA luminous and saturated (exposure to 2×, vivid cycling fog); FOG a pale
  bright whiteout; RAIN a moody blue-grey downpour drift. Faster onset so a
  weather switch is felt immediately. Exposure stays weather-owned; no rng (the
  lightning is a deterministic function of time). (`src/sim/weather.ts`,
  `docs/ERD.md`, `tests/weather.test.ts`.)

### Fixed

- The algorithm-picker progress bar never moved: the integrator set
  `style.width` on the `.algo-prog` track (resizing the box) while the shipped
  CSS fills via the `--algo-prog` custom property (`scaleX`). Now driven through
  `--algo-prog`, so the sorted-fraction bar actually fills. (`src/world.ts`.)

## [0.6.1] - 2026-06-11

### Added

- **Pinch-to-zoom** on touch devices: a two-finger pinch on the world feeds the
  same `zoom` accumulator as the mouse wheel — spread apart to pull the camera
  in, pinch together to push out. One-finger look is suppressed during the
  gesture so it can't also yank the camera. Joins the existing joystick (move),
  look pad (look), and radial action wheel for full keyboard-parity touch.
  (`src/ui/input.ts`.)
- **Sorting-field light show**: selecting an algorithm now ignites a bright
  shimmer sweep across the population (~500 organisms flash regardless of
  count), and each swap flashes brighter (emissive 2.6 → 4), so the chosen
  field visibly performs as it sorts. (`src/world.ts`.)
- **A unique sound per sorting field**: `AudioEngine.cue(idx, total)` gives each
  of the 25 fields its own tone — the pitch climbs ~3 octaves across the list
  and the waveform rotates through four timbres, with a shimmering octave
  partial, so no two fields sound alike. (`src/audio/engine.ts`, `src/world.ts`.)

### Notes

- Verified the 25 sorting fields work: each provably reduces inversions (or is a
  documented perpetual field) in `tests/algorithms.test.ts`, and the live HUD
  shows the per-frame swap count climbing. (A "frozen" sim in a preview only
  means the browser tab is backgrounded — `requestAnimationFrame` pauses when
  `document.hidden`.)

## [0.6.0] - 2026-06-11

The **ATELIER** pass (CONTRACTS V6) — a second round of direct user feedback.

### Fixed

- **`/docs` no longer crashes**: Mermaid treats `;` as a statement separator, so
  semicolons inside sequence- and ER-diagram labels threw a parse error. Replaced
  them; all three diagrams render. (`docs.html`.)
- **Observatory legibility — no more text over data**: every chart reserves a
  title band and insets the plot body with padding so titles/legends/readouts
  never overlap the plotted data. The cramped **Titan Roster** and **Titan
  Resources** panels were reworked — real row heights with gaps, a single-column
  or compact two-column fallback, ellipsis-truncated names that can't collide
  with their values, and bars in a separate band from their labels. The
  observatory canvases are taller (≥72px desktop) and the panel roomier/wider on
  desktop and TV. (`src/ui/observatory.ts`, `index.html`, `src/styles/app.css`.)

### Added

- **Visible 25-algorithm picker**: a new collapsible "Sorting Fields" panel lists
  all 25 sorting algorithms as clickable rows (no longer just a cycle button);
  selecting one highlights it, announces it with a distinct per-field tone (the
  eight SFX timbres cycle by index), and a live progress bar on the active row
  tracks how sorted the field currently is. The toolbar cycle button shares the
  same selection path. (`index.html`, `src/styles/app.css`, `src/world.ts`,
  `src/ui/hud.ts`.)
- **Four-page Lab**: the lab artifact is now a 4-page app — page 1 the collapse
  field, pages 2-4 boards of multiple live, seeded generative data-visuals
  (phase portraits, reaction-diffusion, Voronoi, statevector, attractors,
  fractals, networks, spectra…) including p5 WEBGL 3D views. Page nav preserves
  the seed. (`lab/quantum-wildbeyond.html`.)
- **Architecture report at `/docs`**: expanded into a local GitHub-Pages-style
  report — a file/folder architecture tree of the real repo, explicitly labelled
  **ERD / ERM / ERP** sections, per-era system explanations, the tech stack, and
  the determinism/perf model. (`docs.html`.)

## [0.5.0] - 2026-06-11

The **RESONANCE** pass (CONTRACTS V5) — a round of direct user feedback on 0.4.0.

### Fixed / Changed

- **Observatory legibility**: the VAR / ECO / WAR pages rendered but were faint,
  sparse, and unlabeled — they read as broken. Every one of the 16 canvases now
  carries an in-canvas title, value/unit readout, axis ticks/gridlines, bold
  high-contrast strokes and additive glow, and a boot-seed prime so a fresh
  world is never blank. (`src/ui/observatory.ts`.)
- **Population fills its ceiling**: the ultra tier now grows to the full 10,000
  entities (was an adaptive 6,500 throttle) — an ultra classification implies a
  discrete GPU, and the per-frame neighbour-query optimizations keep it smooth.
  `targetEntities === maxEntities` on every tier; determinism preserved per
  device. (`src/core/quality.ts`.)
- **Algorithms are visible again**: the active sorting field now batches swaps
  per frame (6–28, scaled to population) so it visibly organizes the world
  instead of nudging one organism among thousands; swapped organisms flash
  brighter and the HUD shows a live swap-count (`step N · M ⇄`). Cycling the
  algorithm now obviously changes the activity. (`src/world.ts`, `src/ui/hud.ts`.)
- **25 sorting fields** (was 20): added TIM RUN MERGE, BITONIC NETWORK, PATIENCE
  BUCKET, BRICK TRANSPOSE, and a fifth — each with a distinct spatial swap
  signature. (`src/sim/algorithms.ts`.)
- **Audio raised to the QUANTUM/BLACK MERIDIAN tier**: VOIDCROWN, ELDER ENGINE,
  and LAST THEOREM rebuilt with full 4-note dramatic voicings and 16-step
  evolving melodies; a new cataclysmic finale, **STARKILLER REQUIEM**; the
  synthesis deepened across all songs with a sub-bass octave, a third detuned
  chord voice, chord-tone arpeggiation, slow filter-cutoff LFO swells, and a
  per-song rising/falling intensity envelope. (`src/audio/songs.ts`, `engine.ts`.)
- **Lab artifact filled**: the collapse-field now grows to the full viewport
  (was ~40% dead margin) with a live in-canvas HUD (seed, particle count,
  collapse events, last measurement + Born probability, field blend, fps) and a
  "THE MATH" legend explaining the Lorenz-XZ + curl-noise blend and the Born
  rule. (`lab/quantum-wildbeyond.html`.)
- **Mobile/portrait ergonomics**: on small / portrait / coarse-pointer viewports
  the four panels become edge-docked **slide-out sheets** — each parked
  off-screen behind an always-visible handle tab (TEL/CTL/OBS/AUD) that slides it
  in over the unobstructed 3D world; one sheet per edge, Escape closes all. The
  audit panel is a sheet now instead of hidden. (`index.html`, `src/styles/app.css`.)

### Performance

- **Ultra-tier 10k frame-cost optimization** (CONTRACTS V3.6/V4.5 amendment).
  Headless forensic profiling (a throwaway `scripts/perf-probe.ts` mirroring the
  exact `world.ts` `step()` cadences, since deleted) measured the sim-CPU cost at
  the 10,000-entity ceiling at **23.67 ms/frame** (42 fps render-free), dominated
  by `entities.update`'s O(n·k) neighbor-query loop (≈ 292k neighbor visits/frame;
  `flock` alone ran unthrottled every frame). Four ultra-only levers — all gated
  `maxEntities > 5000` so phone/laptop/desktop stay byte-identical and every
  determinism test is untouched — cut it to **18.46 ms/frame** (54 fps render-free):
  theory-behavior stagger 2→3, `flock` to half-rate, spatial-hash cell 16→10
  (`ULTRA_GRID_CELL`), and the connectome rebuild cadence ladder extended /4 (>2k)
  and /6 (>5k).
- **Adaptive ultra population target** (`QualityProfile.targetEntities`). Organic
  growth now settles an idle ultra world at **6,500** entities (sim-CPU ≈ 9.5
  ms/frame → 105 fps render-free), where the ≥55fps desktop acceptance gate holds
  with GPU-render headroom; **10,000 remains the reachable hard ceiling** via
  bursts/apocalypse, after which the world relaxes back toward the target. Every
  capacity buffer (pools, index tables, atmosphere rng-draw count) is still sized
  from the 10k ceiling — determinism preserved. `targetEntities === maxEntities`
  on all other tiers (no behavioral change).
- **Regression guard** `tests/perf-budget.test.ts`: asserts the median
  entity-update frame at 8k entities stays under a loose 120 ms wall-clock bound
  (catches a 5×-class regression without flaking on CI).
- Full per-stage breakdown, tuned constants, and **rejected calibration values**
  recorded in `docs/BENCHMARKS.md` ("Ultra-tier 10k optimization"). The harness
  excludes GPU draw cost (~21 ms at 10k), which is why 55fps at a true idle-settled
  10k is met via the adaptive target rather than raw CPU optimization.

## [0.4.0] - 2026-06-11

The **XENOGENESIS** expansion (CONTRACTS V4): the cosmos becomes an alien,
immortal, sentient biome — it gets an atmosphere, watches itself through a
holographic 3D instrument panel and a four-page analytics observatory, and
rates its own aliveness.

### Added

- **Alien atmosphere** (`src/sim/atmosphere.ts`) — an inverted sky dome with a
  non-Earth baked gradient (deep-oxblood horizon → violet zenith → teal
  counter-glow) that recolors with weather and chaos, three wind-advected haze
  ribbons that breathe with the music's bass, a tier-scaled particulate air
  volume, and an aurora curtain that brightens with quantum entropy.
- **In-scene 3D analytics** (`src/sim/viz3d.ts`) — a holographic instrument
  panel floating above the arena: a ring of ten phylum-population towers, a ring
  of ten titan economy obelisks (height = matter, glow = energy, hue = war), and
  a live war-network of up to 45 segments between them.
- **Four-page Observatory** (`src/ui/observatory.ts`) — page 0 overview, page 1
  **variance** (rolling mean±σ bands, population histogram, Shannon diversity,
  qEntropy–trend phase), page 2 **ecology** (per-phylum small-multiples,
  birth/death flux, titan matter–energy portraits), page 3 **conflict** (war
  intensity, alliance/truce/war stacks, per-titan resource bars, a biome
  sentience gauge), switched by accessible tabs.
- **Biome sentience index** in the telemetry snapshot — community structure ×
  quantum coherence × demographic momentum, normalized 0..1.

### Changed

- Consolidated the touch surface onto `InputSystem` (look pad + radial action
  wheel + long-press apocalypse + guarded haptics) and removed the redundant
  `TouchControls` twin to avoid double-binding.
- Removed a stale duplicate `onDeath` ground-feedback assignment in `world.ts`.

## [0.3.0] - 2026-06-10

The **PANTHEON** expansion (CONTRACTS V3): the arena grows 5×, the population
grows to 10,000, ten lore-named creature phyla with wildcard outliers populate
it, and ten colossal non-human intelligences (TITANS) run a global economy and
wage game-theoretic war over it — observed live from a four-chart Observatory,
playable from a phone to a 43″ TV. The QUANTUM-tier soundtrack (4 new dark
songs around the untouched QUANTUM) shipped in the 0.3.0 groundwork commit.

### Added

- **Quality tier ladder** (`core/quality.ts`): phone 650 (legacy per-mesh
  path) / laptop 2,000 / desktop 5,000 / ultra 10,000 entities, resolved once
  at boot from pointer type + `hardwareConcurrency` + `deviceMemory ?? 8`;
  quantum/links/stars budgets scale sublinearly per rung. `QualityProfile`
  gains `tier` + `instanced`.
- **5× arena** (`sim/constants.ts`): `ARENA = 5` (XZ), `ARENA_Y = 2`
  (vertical), `ARENA_MID = 2.5` (mid-field actors) drive everything — ground
  240→1200 (same 60×60 segments, wavelengths ÷ARENA, swell ×ARENA_Y),
  containment 65→325 (4225→105625), monolith/diorama layouts ×5 floor and ×2
  height from one legacy-authored table, camera far 900→2600, fog ÷ARENA,
  star shells ×3, spatial-hash cell 8→16, sky-web at y 110, camera modes and
  speeds ×ARENA_MID, sector rectangles ×ARENA.
- **InstancedMesh pools** (`sim/instanced-entities.ts`): above the phone tier
  every entity renders through one InstancedMesh per (cached geometry ×
  transparency) pair — ≤80 draw calls for 10,000 organisms instead of 10,000.
  Per-instance matrix + `instanceColor` + custom vec4 emissive·intensity/alpha
  attribute patched via `onBeforeCompile`; pools are lazily built at uniform
  share ×4 headroom and grow ×2 event-driven, uploads clipped to live ranges.
  The EntityManager facade is UNCHANGED — entities stay real meshes (never
  scene-added), mirrored once per frame after all visual mutations.
- **Phyla taxonomy live** (V3.2 wiring): `createPhyla` mints 10 lore-named
  phyla; `createMorphotypes(rng, geoCount, phyla)` emits 250 morphotypes in
  contiguous 25-morph blocks with ~1% wildcard OUTLIERS (band-ignoring
  palettes, blended behavior pairs, ×3 parameter excursions). `EntityData`
  gains `phylum`/`beh2`; outliers temporally blend their two behaviors on
  (frame+i) parity; null-position spawns bias toward the phylum's home wedge
  (matching its titan's patrol post); `EntityManager.phylumCounts` recounts
  per update. All morph rolls now span the LIVE morph table (`morphs.length`,
  not the legacy 100), across world/shoggoths/puppets/titans.
- **TITANS** (`sim/titans.ts` + `math/games.ts`, V3.3 wiring): ten colossal
  (×3 scale) silhouette archetypes patrol phylum wedges inside ±300; each runs
  an {energy, matter, entropy} economy — harvest (entities consumed → matter),
  metabolize, witness quantum collapses (energy, wired through `onCollapse`),
  bathe in RD pattern density (entropy relief, fed every 60f from the live V
  field), pay size-scaled upkeep, and WASTE entropy as ground scars drained to
  the reaction-diffusion field each frame. Staggered iterated-PD diplomacy
  (45 pairs over a 600f cycle) derives TRUCE/ALLIANCE/WAR; wars fire territory
  strikes (energy raid + loot + champion-morph burst + scatter + conscription
  remorphs); bankruptcy mutates strategy by replicator dynamics over the live
  strategy census. Payoffs flow through the actual energy ledger.
- **Observatory live** (V3.5 wiring): world pushes the telemetry snapshot into
  the four-chart observatory every 18f (36f phone) — stacked phylum areas,
  titan wealth polylines + war markers, 10×10 war-matrix heat grid, and
  rdEnergy/qEntropy/trend timelines. `TelemetrySnapshot` grows
  `maxLinks/morphTotal/titans/phylumCounts/titanLedger/warMatrix/rdEnergy`
  (REUSED views, documented); telemetry panel gains the TITANS row and scales
  its sparklines from the snapshot caps.
- **Touch controls v2** (V3.4): on coarse pointers the static pads are
  replaced by the drag joystick (move), a right-thumb LOOK PAD feeding the
  same `look` accumulator as mouse drags, and a radial ACTION WHEEL
  (Split/Burst/Mutate/Chaos petals ≥44px + 600ms apocalypse long-press core
  with a CSS arming ring). Sim actions pulse `navigator.vibrate` ≤30ms,
  silenced under `prefers-reduced-motion`.
- **Responsive overlay** (V3.4, `#ui` in app.css): desktop three-column grid
  (telemetry+audit left, observatory+control right, free 3D center), phone
  portrait sheet stack with grips (audit yields), low-landscape twin rails,
  foldable hinge-safe columns (`horizontal-viewport-segments: 2` — panels
  never span the fold), TV ≥1900px 10-foot mode (type tokens ×~1.6, 44px
  toolbar targets, 3px focus rings). Panels carry only glass styling; ALL
  placement lives in CSS.
- **Tests**: games equilibria (PD defect lock-in, TFT cooperation, grim window
  forgiveness, Pavlov fixed points, GTFT forgiveness threshold, replicator
  fixed points/absorption/seals), quality ladder (tier resolution + budget
  monotonicity), instanced pools (sizing math + headless sync: mirroring,
  emissive/alpha channels, matrix tracking, growth, wireframe sweep).

### Changed

- Boot/reset population is 30% of the tier cap (legacy 300 of 1,000); burst
  scales 30→100 at ultra; sparse-respawn floor scales to 10% of the cap.
- Graph-mind cadences double above 2,500 entities (Louvain on a 10k mirror
  would spike the V2 240f budget).
- Death→ground feedback (`EntityManager.onDeath` → `rd.perturb`) is wired in
  the composition root over the 1200u ground UV, completing the 0.2.1 API.
- `ObservatorySnapshot.ledger` renamed `titanLedger` so the reused
  `TelemetrySnapshot` satisfies it structurally.

### Known compromises (documented in MODULE-CONTRACTS §V3 notes)

- Instanced pools render metalness/roughness at 0.5/0.5 (per-instance PBR
  scalars are not worth two more attributes; emissive carries identity) and
  cast no shadows (legacy capped casters at 120 anyway).
- Pool transparency is a two-variant split per geometry at per-instance
  alpha — within-pool instance sorting is not performed.

## [0.2.1] - 2026-06-10

The audit wave: SKEPTIC-confirmed findings from the adversarial 0.2.0 audit,
landed as a patch release. Contract additions are recorded in
`docs/MODULE-CONTRACTS.md` §CONTRACT AMENDMENTS — 0.2.1.

### Added

- **Mouse-look + wheel zoom** on the canvas: pointer drags that start on `#c`
  accumulate into `InputSystem.look` (`{dx, dy}`, pointer-captured, first
  pointer wins) and the wheel into a deltaMode-normalized `zoom` accumulator;
  the world consumes-and-zeroes both every frame (applied in free view only),
  and window blur clears them along with all other held input (Known Bug 11
  extension).
- **Feedback-web APIs made explicit**: `EntityManager.onDeath` (world wires
  deaths to `rd.perturb` at ground UV), `QuantumCloud.implodeAt(basis)`
  (localized implosion on register collapse) and `setBreath(level)`
  (audio-level point-size breathe), `EnvironmentSystem.setAudioBass(bass)`
  (six-light rig shimmer), and `AnalyticsSystem.nameOmen` (world injects
  `lore.name('omen', i)` so omens are lore-named).

### Changed

- **Audio coupling set finalized**: bass → six-light rig shimmer
  (`EnvironmentSystem.setAudioBass`), treble → constellation pulse, level →
  quantum-cloud point size (`QuantumCloud.setBreath`), all multipliers
  ≤ 0.35. The bass → tone-mapping-exposure offset is removed entirely —
  exposure is owned by the weather system alone.

### Fixed

- **NaN lorenz seal**: the `lorenz` behavior clamps its attractor samples to
  ±25, so an escapee's position can no longer drive the quadratic terms to
  ±Infinity and spread NaN population-wide through the spatial hash
  (regression-tested in `tests/nan-stability.test.ts`).
- **Exposure accumulation**: the audio bass shimmer compounded into
  `toneMappingExposure` (~15× past the weather pullback once music played,
  tone-mapping the world to white); fixed first as a bounded
  remove-before-lerp offset, then removed outright in favor of the rig
  coupling above.
- **Color-pipeline legacy fidelity**: `outputColorSpace` is forced to
  `LinearSRGBColorSpace` (with `THREE.ColorManagement` disabled before engine
  construction) and the point-light rig is rescaled with explicit
  legacy-light gains, so the palette authored against three r128's
  linear-out, legacy-light-unit pipeline renders exactly as the monolith did.
- **Controls color restoration**: the legacy control families are back as
  `@theme` tokens — the green-glass toolbar (`#bar`) and the apocalypse red
  danger family — instead of the flattened accent palette.
- **Determinism**: the audio engine draws from its own derived RNG stream
  (`seed ^ 0xa0d10`), so wall-clock scheduler callbacks can no longer drain
  the sim stream and break same-seed reproducibility.
- **Docs match the executed pipeline**: PageRank runs every 600th frame at
  offset 300 (offset 120 — as previously documented — would collide with the
  240-frame Louvain pass at frame 720 and every 1,200 frames after); the
  documented frame order now ends graph mind → constellations → environment →
  telemetry + analytics push (8f) → analytics analyze (60f) → render; the
  `/docs` diagrams are regenerated (V2 module graph + `/lab` route, V2 ERD,
  V2 frame pipeline with cadences).

### Security

- **Server hardening**: `POST /api/audit` bodies are capped at 8 KB (413
  beyond, declared and actual), audit `detail` payloads are truncated at
  storage time, and the HTMX fragment HTML-escapes every user-controlled
  string.
- **Store validation**: `MemoryStore.load()` field-validates the persisted
  JSON (finite numbers, booleans, known version) and returns `null` on any
  mismatch — corrupt or hostile `localStorage` can never throw or smuggle
  values into the sim.
- **SRI**: the `/lab` artifact pins its p5.js CDN script with a sha384
  `integrity` hash + `crossorigin="anonymous"`.

## [0.2.0] - 2026-06-10

The **Quantum Wildbeyond** expansion. Seven new systems implementing
[docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md): every effect earns its visuals from
an honest model (statevector, PDE, graph, Voronoi geometry, cryptographic
digest, audio spectrum, rolling regression), and every system both reads from
and writes to at least one existing system. Specified in
`docs/MODULE-CONTRACTS.md` §CONTRACTS V2.

### Added

- **Quantum register** (`src/math/quantum.ts`): pure-TS statevector core —
  2^n complex amplitudes as a Float64Array pair (n ≤ 8 enforced), 12 gates
  (h/x/y/z/s/t/rx/ry/rz/cx/cz/swap), Born-rule probabilities into a reused
  buffer, normalized Shannon entropy, and seeded-RNG measurement collapse.
- **Quantum circuit system** (`src/sim/qcircuit.ts`): a 5-qubit register
  driven by the world — puppet-master events apply characteristic gate
  sequences (AETHON → rx(chaos·π/4), SELENE → h+cz, KRONOS → x+swap), sort
  swaps apply parity-targeted cx, a chaos-derived ry drifts every 30 frames,
  and every 8th update measures. Basis probabilities become 32 hue bands for
  the quantum cloud; measured collapses implode it locally.
- **Reaction-diffusion ground** (`src/sim/reaction-diffusion.ts`): Gray-Scott
  on a 128×128 CPU typed-array ping-pong field bound to a three.js
  `DataTexture` used as the ground's emissive map. Weather couples the
  parameters (STORM raises feed, VOID raises kill, AURORA boosts diffusion;
  chaos scales reaction rate) and entity deaths perturb the field at their
  ground-UV position.
- **Graph mind** (`src/sim/graph-mind.ts`, graphology +
  graphology-communities-louvain + graphology-metrics): mirrors the
  connectome into a graph every 240 frames and runs seeded Louvain community
  detection — tribes color connectome links via an 8-hue palette and are
  written back into member entities' set-theory groups; a PageRank pass every
  600 frames gives the top-20 entities an emissive floor boost.
- **Constellations** (`src/sim/constellations.ts`, d3-delaunay): a Voronoi
  sky-web at y≈55 over the 24 static monolith/diorama sites, built once;
  Delaunay site links and audio-pulsed cell edges; O(log n) camera point
  location resolves the current lore sub-sector.
- **Lore engine** (`src/sim/lore.ts`, @noble/hashes sha256): deterministic
  cosmic naming — sha256(seed‖kind‖index) digests index a syllable table to
  derive sector/tribe/star/omen names and puppet/weather/collapse epithets,
  memoized. Same seed, same mythology.
- **Audio analysis** (`src/audio/analysis.ts`): AnalyserNode tap over the
  music and SFX buses polled per frame into a pre-allocated buffer —
  bass/mid/treble/level bands (multipliers ≤ 0.35) drive point-light shimmer,
  constellation pulse, and quantum-cloud point-size breathing. A silent world
  looks identical to v0.1.
- **Analytics** (`src/sim/analytics.ts`, simple-statistics): 120-sample
  rolling rings for population/energy/links; every 60 frames a
  linear-regression slope yields the population trend per minute, and
  population z-score anomalies (|z| > 2.5) emit lore omens to the audit
  trail, at most once per 30 s.
- **Telemetry**: rows `#v9` TRIBES, `#v10` TREND (`±x.x/m`), `#v11` QBIT-S
  (register entropy), and the `#lore` sub-sector line; `TelemetrySnapshot`
  gains `tribes` / `trend` / `qEntropy` / `lore`.
- **Lab artifact** (`lab/quantum-wildbeyond.html`, served at `/lab`):
  self-contained seeded p5.js "collapse field" — particles flowing a blended
  Lorenz-XZ/curl-noise field, a Voronoi shatter overlay echoing the 24 cosmos
  sites, interference rings on measurement events; p5 from CDN only.
- **Master files** (`masters/`): the steering trinity — Executor (Broly),
  Architect (Starkiller), Physicist (Dr Manhattan) — bound by `CLAUDE.md`,
  plus the aesthetic constitution `docs/PHILOSOPHY.md`.
- **Reference catalogs** imported into `docs/reference/`
  (`math-libs-catalog.md` + `domain-key-libraries.csv`): the 20-domain JS/TS
  math-library survey with per-library adoption status; the selection itself
  is recorded in [ADR 0005](./docs/adr/0005-math-stack-selection.md).
- **Design-system audit** (`docs/DESIGN-SYSTEM.md`): component and token
  audit (naming, token coverage, completeness scores), documented color/type/
  spacing/motion tokens including the 8-hue tribe palette, and per-component
  accessibility notes.
- Tests for the new math: quantum (H·H identity within 1e-12, Bell-pair
  entropy, probabilities sum to 1 ± 1e-9, measurement determinism),
  reaction-diffusion (finite over 500 steps, symmetry breaking, same-seed
  field equality), graph-mind (two-cluster Louvain, seeded determinism),
  lore (seed stability, pronounceability), analytics (slope signs, one omen
  per window). Benchmarks: quantum gates/probabilities at n = 5,
  reaction-diffusion step at 128².

### Changed

- `Connectome` exposes `pairs`/`pairCount` (filled during the rebuild it
  already performs) and `setCommunityOf(fn)` — link hue offsets by community
  index instead of pure time hue when the graph mind installs a palette.
- `QuantumCloud` gains `setQuantumBands(bands)` — particle hue keys off the
  register's 32 basis probabilities blended with the legacy psi hue; a change
  in the last collapse index triggers a localized implosion through the
  existing collapse/respawn path (no new allocation).
- `AudioEngine` gains `tapAnalyser()` — one lazily created AnalyserNode
  (fftSize 256, smoothing 0.8) fan-out connected from the music and SFX
  gains; null before `init()`.
- `EnvironmentSystem` gains `attachGroundEmissiveMap(texture)` with an
  emissive-intensity coupling on the ground material.
- `Hud` gains `setLore(name)`; puppet-master toasts now carry lore epithets.
- Design system pass: remaining hardcoded hex/px values hoisted into `@theme`
  tokens, `:focus-visible` rings on all interactive elements,
  `prefers-reduced-motion` damping for pulses/transitions, and an
  aria-labeled `/lab` link in the toolbar. Visual identity (void/cyan glass)
  unchanged — elevated, not redesigned.

## [0.1.0] - 2026-06-09

First release: the 882-line legacy monolith
(`legacy/cosmogonic-quantum-mechalogodrom.html`, three.js r128 via CDN) ported
to a modular Bun + TypeScript + three.js 0.184 codebase with the same
constants, magic numbers, and audiovisual feel.

### Added

- Modular simulation: 26 behavioral fields (drift, orbit, pulse, swarm, flee,
  hunt, split, coil, spiral, expand, zigzag, sine, bounce, flock, scatter,
  vortex, lattice, wave, helix, quantum, nash, market, typemorph, setunion,
  graphseek, lorenz), 100 procedural morphotypes over ~41 shared geometries,
  20 sorting-field algorithms with behaviorally honest names.
- Ecosystem actors: 3 Shoggoths (Lorenz-ish drift, grid-queried tendrils,
  consumption with corrupted respawn) and 3 puppet masters (AETHON / SELENE /
  KRONOS) acting on chaos, weather, and mutation timers.
- Environment: 16 monoliths, 8 dioramas, 21 data pipelines, quantum particle
  cloud (3,500 mobile / 6,000 desktop) with collapse/respawn, neural
  connectome (up to 2,200 / 4,000 links), 6 weather states, sector naming.
- Audio: 5 procedural Web Audio songs (FF SOMBER, CRYSTAL, INDUSTRIAL,
  ETHEREAL, QUANTUM) plus 8 synthesized SFX types.
- Deterministic seeded RNG (`mulberry32`) injected via `SimContext` — runs are
  reproducible from a persisted seed.
- Bun fullstack server (`server.ts`): `/`, `/docs`, `GET /api/health`,
  HTMX-polled `GET /api/audit` fragment, `POST /api/audit` in-memory ring.
- UI: glassmorphic Tailwind 4 panels, telemetry with canvas sparklines,
  touch control pad + joystick, audit trail panel, `/docs` page rendering live
  Mermaid architecture/ERD/sequence diagrams.
- Persistence: versioned `localStorage` store (`cqm.state`) for seed, song,
  algorithm, view, weather, SFX preference, and session count.
- Tests (`bun test`) for math, RNG determinism, spatial hash, sorting
  algorithms, store, and audit; mitata benchmarks (`bun run bench`).
- Docs: architecture, ERD/ERM/ERP, wireframes, complexity budget, and four
  ADRs (Bun runtime, three.js rendering, HTMX + Tailwind UI, deterministic
  RNG).

### Changed

- three.js r128 global script replaced with npm `three@0.184` ES modules;
  partial GPU buffer uploads now use `clearUpdateRanges()` /
  `addUpdateRange()`.
- Hand-rolled CSS replaced with Tailwind CSS 4 `@theme` tokens; fonts
  self-hosted via Fontsource instead of Google Fonts CDN.
- Touch control pad gained yaw buttons (`yleft` / `yright`), making the
  keyboard's C/V yaw reachable on touch devices.

### Fixed

Fixes mandated by the Known Bugs table in `docs/MODULE-CONTRACTS.md`, relative
to the legacy prototype:

- Music pitch octave now wraps instead of drifting ultrasonic over time.
- Toggling music off clears the scheduler interval (no orphaned scheduler).
- Hidden tabs no longer queue oscillators (burst-on-resume eliminated);
  AudioContext suspends/resumes with `visibilitychange`.
- Render loop no longer calls `getElementById` per frame or copies sort
  values into a fresh object; UI caches element refs, sorting uses the
  pre-allocated `Float32Array` + live length.
- Spatial hash queries reuse a shared result buffer instead of allocating an
  array per call (hundreds per frame).
- Window resize reapplies the device pixel ratio (monitor moves between
  displays of different DPR).
- Icon-only toolbar buttons have accessible names (`aria-label` + `title`).
- Joystick tracks its own pointer/touch identifier (no wrong-finger reads
  under multi-touch).
- Seeded `mulberry32` RNG injection replaces all `Math.random()` calls in sim
  logic — runs are reproducible.
- Touch roll/tilt buttons rotate in the same direction as the Z/X/R/F keys
  they mirror (signs were inverted).
- Held keys clear on window blur (camera no longer keeps flying, Space no
  longer keeps bursting).
- Pipeline packets reuse a target vector in `curve.getPointAt(t, target)`
  (no per-packet Vector3 allocation per frame).
- Connectome uploads only the live link range to the GPU instead of the full
  4,000-segment buffers.
- The `mutations` counter is surfaced in telemetry (`#v8`) instead of being
  write-only.

[0.7.2]: ./CHANGELOG.md
[0.7.1]: ./CHANGELOG.md
[0.7.0]: ./CHANGELOG.md
[0.6.1]: ./CHANGELOG.md
[0.6.0]: ./CHANGELOG.md
[0.5.0]: ./CHANGELOG.md
[0.4.0]: ./CHANGELOG.md
[0.3.0]: ./CHANGELOG.md
[0.2.1]: ./CHANGELOG.md
[0.2.0]: ./CHANGELOG.md
[0.1.0]: ./CHANGELOG.md
