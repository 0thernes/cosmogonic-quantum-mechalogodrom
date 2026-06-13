# Cosmogonic Quantum Mechalogodrom — Audit & Fix Plan

**Date:** 2026-06-13 · **Version:** 0.9.0 · **Reviewer:** Claude (Opus 4.8, 1M)
**Method:** Direct senior review of the running app + source (the parallel fan-out
audit workflow was repeatedly killed by a transient server-side rate-limit; this
hand review supersedes it and is grounded in code actually read, cited `file:line`).

> Scope: 172 files · 108 TS modules · ~26.4k LOC · 40 test files · Bun + TS(strict) +
> three.js + Tailwind v4 + HTMX. This document is both the **audit** and the **execution
> plan**, and it records the one architectural decision that is the owner's to make.

---

## 0. Severity legend & status

`CRITICAL` ship-blocker / security / data-or-IP exposure · `HIGH` real bug or broken
feature · `MED` quality / UX / perf · `LOW` polish. Each item maps to a fix and a stage.

---

## A. Confirmed findings (grounded in code)

### A1 — Security: AI copilot exposes proprietary source on any served instance — `CRITICAL`

- **Where:** `server.ts:289-335` registers `/api/chat`, `/api/tool`, `/api/copilot`
  unconditionally; `src/server/ai-sandbox.ts` permits `read_file`/`list_dir`/`grep`/
  `run git log|show|diff` across all of `src/`, `.gitignore`, `SECURITY.md`, git history.
- **Assessment:** The sandbox is _well built_ — default-deny, repo-confined, blocks
  `.git/.env/legacy/node_modules/dist`, allow-listed bins, deny-list tokens, no shell
  metacharacters. It is **not** remote code execution. **But** it has no auth, no
  rate-limit, and is **always on**, so any visitor to a hosted server can read the entire
  proprietary codebase + history. The [proprietary mandate](../../LICENSE) (All-Rights-
  Reserved) makes that an IP leak.
- **Fix:** Gate the copilot/tool/chat routes behind an explicit opt-in that is **OFF by
  default in production / non-localhost** (e.g. `COPILOT_ENABLED` + a localhost bind check).
  Local dev keeps the feature; a deploy never exposes source. Stop the failure message from
  advertising `/run`/`/read` when disabled.

### A2 — AI chat is dead because failover funnels into the dead provider — `HIGH`

- **Where:** `src/server/copilot.ts:174-179` `fallbackProvider()` hard-returns
  **Pollinations**; `runAgent` (`:367`) fails over only to that one endpoint.
- **Symptom (yours):** Pollinations returns `429 … legacy text API being deprecated`, and
  LLM7 (the other key-less option) **also** fails over into Pollinations → "both options error."
- **Fix:** Replace the single fallback with a **chain** across every currently-available
  provider (key-less first: LLM7 → Pollinations(repaired) → any keyed preset present),
  trying each until one answers. Repair the Pollinations endpoint/model per its 2026
  migration, and surface _which_ provider actually served the turn (the UI already shows it).
  Provider table to adopt: the attached **free-LLM report** (Groq, Cerebras, OpenRouter,
  GitHub Models, Gemini, Mistral, NVIDIA, DeepSeek, HF) — most already scaffolded at
  `copilot.ts:37-113`, just not chained.

### A3 — Spacebar (and Tab) unusable in the chat input — `HIGH`

- **Where:** `src/ui/input.ts:181-183` — a global `window` keydown does
  `if (e.key === 'Tab' || e.key === ' ') e.preventDefault()` with **no focus guard**.
- **Fix:** Early-return from the global sim key handler when the event target is an
  `<input>/<textarea>/<select>/[contenteditable]` (or `document.activeElement` is one).
  One guard fixes Space, Tab, and any future field. (Also clears "Known Bug 11" blur note.)

### A4 — Docs link hidden behind the Copilot button — `MED`

- **Where:** Docs anchor `index.html:1029` (`fixed right-1.5 bottom-1.5 z-20`) vs Copilot
  toggle `src/ui/copilot.ts:40` (`fixed right:10px bottom:10px z-index:60`). Same corner.
- **Fix:** Move the Copilot toggle up/offset (e.g. `bottom:60px` or left of Docs), or dock
  Docs bottom-left. Ensure both are reachable + not overlapping at mobile widths.

### A5 — Documentation diagrams not viewable/zoomable — `MED`

- **Where:** `/docs` (`docs.html` + `src/docs-page.ts`) renders Mermaid (architecture, and
  ERD/ERM/ERP) as static inline SVG with no pan/zoom and no click-to-expand.
- **Fix:** Add lightweight pan/zoom (wheel-zoom + drag-pan) and a click-to-fullscreen
  lightbox to every diagram SVG; ensure the architecture and ERD/ERM/ERP diagrams render
  and are interactive. (Pairs with regenerating the ERD/ERM/ERP from current code — see C.)

### A6 — LAB (`lab/quantum-wildbeyond.html`): pages dead, regen makes empty black tiles — `HIGH`

- **Where:** self-contained p5.js + WebGL artifact. Page nav `setPage(1..4)` /
  `prevPage()` / `nextPage()` (`:567-578`); boards built **lazily**, 12 WebGL tiles/page
  (`:10-12`). Seed controls `previousSeed/nextSeed/randomSeedAndUpdate` (`:593-597`).
- **Symptom (yours):** clicking pages 1-4 does nothing; Regenerate/Reset spawns boxes that
  are **black & empty**; no interactivity/morphology/mutation/evolution.
- **Likely cause:** the lazy per-tile WebGL init (or the per-tile draw loop) isn't running
  for newly built/visible tiles — empty contexts render black; `setPage` isn't triggering
  the build/redraw. Needs a focused debugging pass in the artifact.
- **Desired (yours):** Regenerate = re-derive randomized, chaotic variations of the existing
  forms (seed re-roll → new but honest variants); pages switch live; add click-drag reactive,
  adaptive, self-correcting interactivity, plus morphology / mutation / variance / evolution
  driven by the same pre-2016 game-AI the sim uses.

### A7 — Creature count & GitHub mirror — `HIGH`

- **Two separate things conflated by the live site:**
  1. **The 650 on `*.github.io` is the _legacy_ single-file demo** (the stale gh-pages
     artifact diagnosed earlier — old prototype, broken CDN three.js r128). It is **not**
     the real app and has its own low cap.
  2. The real app's population cap lives in the sim core (to be raised + instancing-validated
     for a 10,000-entity target at 60 fps; `src/sim/instanced-entities.ts` +
     `src/sim/constants.ts` + the world budget).
- **Fix:** (a) deploy the **real** app to Pages so the public site stops showing the 650-demo;
  (b) raise the entity budget toward 10k with GPU-instancing + frame-budget proof
  (`tests/perf-budget.test.ts`). 10k organisms at 60 fps is a genuine perf effort, not a constant bump.

### A8 — Local ≠ GitHub repo ≠ Pages — `HIGH`

- **State:** `master` is level with `origin/master`, but the working tree has **uncommitted**
  changes (`src/core/engine.ts`, `package.json`→0.9.0, several docs, untracked
  `CODE_OF_CONDUCT.md`); Pages serves the broken legacy demo (no CI builds the real app).
- **Fix:** commit the tree; add an **Actions → Pages** workflow that runs `bun run build` and
  publishes `dist/` + `/lab` + `/docs`; switch Pages source to GitHub Actions. Then
  local == repo == io. (Outward-facing — see decision D2.)

### A9 — In-world AI vs. determinism — **architectural fork (your call)** — `CRITICAL` to resolve

- **The law:** `docs/PHILOSOPHY.md` + ADR 0004 + the copilot's own system prompt
  (`copilot.ts:271`): one seeded RNG ⇒ same seed → same cosmos; `Math.random`/`Date.now`
  banned in sim; LLMs are deliberately fenced **out** of the sim.
- **Your ask:** NHI that "pull from free API AI," "max hallucinate," "unpredictable, chaotic."
  Wiring **live** LLM calls into NHI cognition **breaks determinism** and the replay/golden
  tests — i.e. it contradicts "follow your audit & review standards." This must be resolved
  before NHI work starts. See **§D1** for the options and recommendation.

---

## B. Your reported issues → cause → fix (triage)

| #   | Reported issue                                                                                                     | Root cause                                         | Fix                                                                                       | Sev  | Stage |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---- | ----- |
| 1   | AI chat exposes files/git/.gitignore/security/src                                                                  | sandbox always-on, no auth (A1)                    | gate copilot off in prod / behind opt-in                                                  | CRIT | 1     |
| 2   | Both AI options error (429)                                                                                        | fallback hard-wired to dead Pollinations (A2)      | multi-provider failover chain + repair endpoints                                          | HIGH | 1     |
| 3   | Can't use spacebar in chat                                                                                         | global keydown preventDefault, no focus guard (A3) | guard editable targets in `input.ts`                                                      | HIGH | 1     |
| 4   | Docs button behind AI chat button                                                                                  | both fixed bottom-right (A4)                       | reposition toggle / Docs link                                                             | MED  | 1     |
| 5   | Can't click/zoom architecture diagram                                                                              | static Mermaid SVG, no pan/zoom (A5)               | add pan/zoom + lightbox                                                                   | MED  | 2     |
| 6   | Can't click/zoom ERM/ERD/ERP                                                                                       | same as #5 + stale docs                            | regenerate ERD/ERM/ERP + interactive view                                                 | MED  | 2     |
| 7   | LAB regen → black empty boxes; pages dead; no interactivity/morph/mutation/AI                                      | lazy WebGL tile build/draw not firing (A6)         | debug + rebuild lab: live pages, seeded chaotic regen, drag-reactive, morph/mutate/evolve | HIGH | 3     |
| 8   | Only 650 creatures (want 10,000)                                                                                   | Pages shows legacy demo; real cap low (A7)         | deploy real app + raise budget w/ instancing & perf proof                                 | HIGH | 3/5   |
| 9   | Repo/io not synced to local                                                                                        | uncommitted tree; no Pages CI (A8)                 | commit + Actions Pages deploy                                                             | HIGH | 5     |
| 10  | NHI float away, do nothing, look generic                                                                           | weak NHI behavior + visuals; determinism fork (A9) | redesign NHI cognition + alien visuals + lifecycle                                        | HIGH | 4     |
| 11  | NHI should be hyper-intelligent gaslighters, game-theory, memory, hallucinating, alien, morph/mimic, respawn/swarm | new feature                                        | build per §D1 chosen path                                                                 | HIGH | 4     |
| 12  | Creatures should look HD / cooler / better color+texture+detail                                                    | material + morphology fidelity                     | material/morph overhaul to the attached radiolarian/glass-amber aesthetic                 | MED  | 4     |
| 13  | Update stacks/versions/deps/tools/best langs+SDKs                                                                  | maintenance                                        | dependency-update pass (Context7-verified)                                                | MED  | 5     |
| 14  | Could Python/Rust/Go/PHP/C++ help?                                                                                 | advisory                                           | see §E                                                                                    | —    | —     |

---

## C. Documentation deliverables to (re)generate

The existing `docs/ERD.md`, `ERM.md`, `ERP.md`, `KANBAN.md`, `ARCHITECTURE.md` exist but need
verification against current code, plus **interactive** rendering on `/docs` (A5/A6). Planned:
refreshed ERD (Mermaid `erDiagram` of Entity·Genome·Lineage·Phylum·Titan·Shoggoth·PuppetMaster·
Leviathan·Faction·Connectome/GraphMind·QuantumRegister·Singularity·Environment/Weather·NHI·
AuditEntry), ERM coupling matrix, ERP lifecycle/process view, and a zoomable architecture +
scaffolding diagram. (The fan-out workflow was meant to author these; will be produced directly.)

---

## D. Decisions required before execution

### D1 — In-world AI & determinism (the pivotal fork)

- **Option 1 — Deterministic super-intelligence (recommended).** Make NHI genuinely the
  "smartest things ever" using _seeded_ techniques fully inside the engine's law: game-theory
  solver (minimax/regret), utility-AI + GOAP planning, belief/memory models, **deception &
  gaslighting** as belief-state manipulation of other agents, and **seeded "hallucination"**
  via grammar/Markov so it's wild but replayable. Optional: a _flagged, non-deterministic
  side-channel_ uses free LLMs **only for flavor** (utterances/taunts/names) that never feeds
  sim state. Keeps determinism + golden tests, works offline and on static Pages.
- **Option 2 — Online "chaos mode."** Wire live free-LLM into NHI cognition behind an explicit
  flag that **suspends determinism** (replay/golden tests gated off while on). Maximum "pull
  from real AI," but not reproducible and won't run on static Pages.
- **Option 3 — Hybrid always-on flavor.** Deterministic behavior + live-LLM utterances always
  on; breaks determinism whenever online.

### D2 — Public deploy authorization (outward-facing)

Pushing source to the GitHub repo and building/deploying the real app to **public** Pages so
`local == repo == io`. The repo is **proprietary**; a public Pages bundle is world-readable
(minified, not relicensed). Confirm before I push/deploy.

### D3 — AI provider keys

The chat needs a live provider. Key-less only (LLM7 + repaired Pollinations) works with zero
setup; keyed providers (Groq/Cerebras/OpenRouter/…) are far more reliable but need keys in a
local `.env`.

---

## E. Language / stack evaluation (Python · Rust · Go · PHP · C++ · …)

This is a **browser-delivered WebGL app** — the simulation must run client-side, so the
runtime language is JS/TS or **WebAssembly**.

- **Rust → WASM — real upside.** The one with genuine payoff: a Rust/WASM kernel for the
  10k-entity update loop, reaction-diffusion, and any physics would buy large headroom at
  60 fps. Matches the repo's own math catalog (Rapier is Rust/WASM; `docs/reference/…`).
  **Recommended as the perf path for the 10k target if pure-TS instancing isn't enough.**
- **C++ → WASM (Emscripten)** — same niche as Rust but heavier toolchain; Rust is the cleaner
  modern choice here.
- **Python / Go / PHP — not for the sim.** They can't run in the browser. Only relevant for
  _offline_ tooling/build/server (and Bun already covers the server). No benefit to the deliverable.
- **GPU compute (WebGPU/WebGL2)** — for 10k+ organisms and richer fields, `typegpu`/`gpu-io`
  (already cataloged as deferred upgrade paths) likely beat any CPU-language swap.
- **Verdict:** keep TS as the spine; consider **Rust→WASM and/or WebGPU** specifically for the
  10k-creature perf push. Everything else stays JS/TS.

---

## F. Staged execution roadmap

- **Stage 1 — Safety & quick wins (no decisions needed except D3):** A1 gate, A2 failover
  chain, A3 spacebar guard, A4 corner overlap. Verify in preview.
- **Stage 2 — Documentation:** A5/A6 interactive diagrams; regenerate ERD/ERM/ERP + architecture (C).
- **Stage 3 — LAB:** A6 fix pages + seeded chaotic regen + drag-reactive morph/mutate/evolve.
- **Stage 4 — Creatures & NHI:** D1 path → NHI cognition + alien visuals + lifecycle (respawn/
  offspring/swarms); HD material/morphology overhaul to the attached aesthetic; tie into the
  600/650 budget.
- **Stage 5 — Scale, deps & deploy:** raise to 10k (instancing/WASM/WebGPU as needed), dependency
  update pass, commit, Actions→Pages deploy so local == repo == io. (D2 gates the push.)
- **Verification:** each stage run through `bun run check` + preview; the full set double-checked
  per the requested **/loop ×3** before close-out.
