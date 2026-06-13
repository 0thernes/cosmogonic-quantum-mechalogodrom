# Cosmogonic Quantum Mechalogodrom — Executive Summary

**Audit date:** 2026-06-13 · **Version audited:** 0.9.0 · **Reviewer:** Claude (Opus 4.8, 1M ctx)
**Scope:** 108 TypeScript files (57 runtime/src + server modules, ~18.6k LOC; ~26.4k LOC incl. tests/scripts/bench) · 40 test files · Bun + TS(strict) + three.js 0.184 + Tailwind v4 + HTMX

> **Sibling deliverables in this folder:** [AUDIT-AND-FIX-PLAN.md](./AUDIT-AND-FIX-PLAN.md) — the staged remediation plan and the owner-decision forks (in-world AI vs. determinism; public-deploy authorization).

---

## Verdict

Cosmogonic Quantum Mechalogodrom is an **exceptionally well-engineered simulation engine wrapped around a single, concentrated security failure and a broken public face.** The core is the real thing: a genuinely acyclic 50-plus-module graph with a structurally-enforced sim/LLM fence, maximal-strict TypeScript with **zero** suppressions across all 108 modules, near-exemplary seeded determinism (a repo-wide grep of the sim finds zero `Math.random`/`Date.now`/`performance.now` hits), real physics under every effect, and top-decile golden/property tests where they exist. That engineering credibility is undercut by a **critical, code-confirmed key-disclosure path** — the AI Copilot's path-confinement blocklist is trivially bypassed (`read_file('.env.local')` leaks every provider API key, exfiltrated to a third-party LLM) — sitting on an entirely **untested** server boundary, and by the fact that the **public GitHub Pages demo is a stale, hand-pushed legacy stub, not the real app**, with no CI/CD path that deploys the actual build. The path from "impressive private artifact" to "shippable product" is short and well-understood: close the secret-leak family, put a regression suite under the sandbox, and stand up a real Pages deploy. None of the headline gaps are structural — they are a concentrated security perimeter plus documentation/delivery drift around an otherwise top-tier core.

---

## Headline Metrics

| Metric                                    | Value                               |
| ----------------------------------------- | ----------------------------------- |
| Version                                   | 0.9.0                               |
| TypeScript files (total)                  | 108                                 |
| Runtime modules (src + `server.ts`)       | 57                                  |
| Runtime LOC (src + `server.ts`)           | ~18,582                             |
| Total LOC (src + tests + scripts + bench) | ~26,055                             |
| Largest module                            | `src/ui/observatory.ts` (2,234 LOC) |
| Largest sim module                        | `src/sim/titans.ts` (815 LOC)       |
| Test files                                | 40                                  |
| Tests passing (`bun test`)                | 581 (~928k expect calls)            |
| Coverage gate (bunfig)                    | line ≥ 0.90 / func ≥ 0.85           |
| **Findings — Critical**                   | **2**                               |
| Findings — High                           | 19                                  |
| Findings — Medium                         | 40                                  |
| Findings — Low                            | 62                                  |
| Findings — Info                           | 33                                  |
| **Total findings**                        | **156**                             |

**Findings by category (top):** correctness 44 · docs 20 · architecture 15 · security 13 · testing 12 · type-safety 9 · determinism 8 · performance 7 · devops 7 · contract 6 · DX 6 · accessibility 6 · license 2 · bug 1

---

## Maturity Scorecard

| Dimension                     |    Score    | Grade | One-line rationale                                                                                                                                                                                                                         |
| ----------------------------- | :---------: | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type Safety**               | **5.0 / 5** |  A+   | Maximal strict tsconfig; zero `any`/`ts-ignore`/lint-disable across all 108 modules; non-null assertions are the disciplined `noUncheckedIndexedAccess` pattern.                                                                           |
| **Determinism & Physics**     | **4.6 / 5** |   A   | Seeded `Rng` enforced _in practice_ (grep-clean sim); audio forked onto its own stream; bit-identical golden + divergence + NaN-stability seals. Docked for unwired fixed-seed boot + partial frame-budget measurement.                    |
| **Architecture & Boundaries** | **4.0 / 5** |  A−   | Acyclic graph, respected layering, **structurally-enforced** server/sim fence; large modules are legit composition-root/renderer. Docked for module-graph docs drifting ~10 modules behind code.                                           |
| **Testing & QA**              | **3.5 / 5** |   B   | Top-decile golden/property/perf tests, but the security boundary (`ai-sandbox.ts`), the only network surface (`server.ts`), the LLM resolver, and the largest sim module are **untested**; the `Math.random` ban has no automated gate.    |
| **Licensing & Compliance**    | **3.5 / 5** |   B   | Strong All-Rights-Reserved posture, clean permissive dep closure. Docked for incomplete `/docs` NOTICE, bundle missing LICENSE/NOTICE, and Copilot leaking confidential source to anonymous LLMs.                                          |
| **Performance**               | **4.0 / 5** |  A−   | Allocation-free hot paths, pooled spatial hash, instanced renderer, CI perf guard. Docked for ~9× perf-budget slack, entity-loop-only measurement, and an uninstrumented GPU 10k ceiling.                                                  |
| **Security**                  | **3.0 / 5** |  C+   | Real defense-in-depth (HTML escaping, server-side allowlist, repo-confined sandbox) undone by a **critical key-disclosure bypass**, full `process.env` spread into subprocesses, no auth/rate-limit, no CSP, and zero boundary tests.      |
| **DevOps & CD**               | **3.0 / 5** |  C+   | Excellent cross-OS CI _gate_ (strict→tsc→oxlint→test→build, frozen lockfile, SBOM). But **no workflow deploys the real app**, CodeQL no-ops on the private repo, and actions are pinned to mutable tags. CI strong, CD effectively absent. |

**Unit quality scores (per-subsystem, 0–5):** ui-shell 4.5 · math-determinism 4.7 · core-spine 4.3 · render-bridge 4.3 · ui-observatory 4.3 · audio-engine 4.3 · markup-styles 4.3 · entities-genetics / macro-agents / environment-cosmology 4.0 · **server-io 3.5** (lowest — the security-relevant boundary).

---

## Top 10 Risks (confirmed High / Critical)

> Listed by remediation priority. The two **CRITICAL** items are key-disclosure paths and lead the list.

|  #  |     Sev     | Risk                                                                                                                                                                                      | Where                                     | One-line impact                                                                                                                            |
| :-: | :---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
|  1  | 🔴 **CRIT** | **`.env.*` secret-blocklist bypass** — `confine()` exact-matches the top path segment, so `read_file('.env.local')` (and `.ENV`/`.Git` case-variants on Win/macOS) reads gitignored files | `src/server/ai-sandbox.ts:39,50-61`       | Full disclosure of every LLM provider API key, exfiltrated off-host to a 3rd-party LLM; reachable via `/api/tool` with no LLM in the loop. |
|  2  | 🔴 **CRIT** | **Sandbox security boundary has ZERO tests** — the entire default-deny `confine`/`validateCommand` gate is unspecified executably                                                         | `src/server/ai-sandbox.ts:50-296`         | A one-character regression silently converts the "read-only" sandbox into arbitrary host RCE / out-of-repo read with no failing test.      |
|  3  |   🟠 HIGH   | **`find` on the allowlist gives a file-deletion primitive** — `find . -delete` passes every gate                                                                                          | `src/server/ai-sandbox.ts:99,205-227`     | A model-controlled `run` recursively deletes the repo tree, breaking the module's "writes nothing" contract.                               |
|  4  |   🟠 HIGH   | **`bun run check`/`bench` allowlisted** — both write to disk / execute arbitrary project code                                                                                             | `src/server/ai-sandbox.ts:240-254`        | "Read-only" sandbox writes `dist/` via `scripts/build.ts` and executes `bench/index.ts`.                                                   |
|  5  |   🟠 HIGH   | **Copilot leaks confidential source to anonymous LLMs** — `src/`, `masters/`, `docs/` are POSTed to key-less Pollinations/LLM7                                                            | `src/server/copilot.ts:284-294`           | Proprietary, All-Rights-Reserved source egresses with no contract; contradicts SECURITY.md.                                                |
|  6  |   🟠 HIGH   | **No auth / rate-limit / CORS on `/api/chat` & `/api/tool`** — both bind `0.0.0.0`, not loopback                                                                                          | `server.ts:289-335`                       | Unauthenticated repo recon + denial-of-wallet against operator LLM keys on any exposed instance.                                           |
|  7  |   🟠 HIGH   | **Full `process.env` spread into model-controlled subprocesses** — every API key handed to every child                                                                                    | `src/server/ai-sandbox.ts:277-282`        | Defense-in-depth failure: any future env-printing binary or filter gap = total key exfiltration.                                           |
|  8  |   🟠 HIGH   | **`server.ts` HTTP surface untested** — `escapeHtml`, body guards, surrogate-pair truncation, message parsing                                                                             | `server.ts:91-313`                        | An XSS-escaping or body-guard regression on the only network surface ships undetected.                                                     |
|  9  |   🟠 HIGH   | **#1 project law (`Math.random`/`Date.now` ban) has no automated gate** — no `.oxlintrc`, no meta-test                                                                                    | `package.json:13`                         | A stray draw in a rarely-hit branch silently breaks "one seed, one cosmos" past the golden tests.                                          |
| 10  |   🟠 HIGH   | **V9 AI triad is orphaned** — `factions.ts`/`genome.ts`/`lineage.ts`/`brains.ts` are built + tested but wired into nothing; the **binding contract** describes the wiring as shipped      | `src/world.ts`, `src/sim/factions.ts:217` | Offspring inherit nothing; the documented faction→steering emergence is inert; contract vs. code diverge.                                  |

**Also confirmed High (testing/docs/devops):** `titans.ts` (815 LOC, own determinism contract) has no direct test · the 0.9.0 AGImAGNOSIS layer is absent from ERD/ERM/ERP/ARCHITECTURE/COMPLEXITY · three live server routes (`/api/copilot`, `/api/chat`, `/api/tool`) are undocumented and contradict the inspection's "routes are documented" claim · NOTICE incomplete for `/docs` transitive deps. _(Several Highs were verified-down to Medium on adversarial review — e.g. the `timeScale`/dt clamp ordering and the GraphMind stride-2 subgraph — but remain real robustness/provenance gaps; see AUDIT-AND-FIX-PLAN.md.)_

---

## ⚠️ Called Out Explicitly: The Broken GitHub Pages Deployment

**The public face of this project is not this project.**

- There is **no Pages (or any) deployment workflow** anywhere under `.github/workflows/` — only `ci.yml`, `codeql.yml`, `release.yml`. `release.yml`'s sole output is a `.tar.gz` Release asset; nothing deploys to Pages.
- GitHub Pages serves the **`gh-pages` branch**, which contains **a single hand-pushed `index.html`** (last commit `7556d07`, 2026-06-13, _"deploy: …public demo to GitHub Pages"_).
- That `index.html` is **byte-identical to `legacy/cosmogonic-quantum-mechalogodrom.html`** — the original single-file prototype (~881 lines), **not** the real ~18.6k-LOC / 57-module engine the README describes. It loads three.js **r128 from cdnjs** (a stale pin from the monolith era).
- Net effect: a visitor to the public site sees a primitive stub with its own low entity cap (the source of the "only 650 creatures" confusion in user reports), while the actual maximalist engine never reaches the public — a direct violation of THE EXECUTOR's "ship the real thing" discipline.
- **The inputs already exist:** `scripts/build.ts` emits `dist/index.html` + `dist/docs.html`, and `lab/quantum-wildbeyond.html` is the self-contained `/lab` artifact. A real deploy is **cheap to stand up**.

> **Correction to the original "404/dead demo" framing:** on re-verification the cdnjs r128 URL returns **HTTP 200** and the stub actually loads and runs. The defect is that Pages serves the **wrong artifact**, not a runtime-dead one — reputationally damaging, not an availability outage. Severity calibrates to **High (devops) → effectively Medium on impact**, but the gap is unambiguous and must be closed before any public launch.

**Fix:** add `.github/workflows/pages.yml` (`permissions: { contents: read, pages: write, id-token: write }`) → checkout → `setup-bun@<sha>` (1.3.14) → `bun install --frozen-lockfile` → `bun run build` → stage `dist/*` + `lab/quantum-wildbeyond.html` into `_site/` → `upload-pages-artifact` → `deploy-pages`. Then repoint the Pages source from the `gh-pages` branch to GitHub Actions and delete the stale branch so the legacy stub can never be served again. **Gate behind the proprietary-deploy decision (D2).**

---

## Top Strengths

1. **Airtight determinism.** Every sim draw flows through the injected seeded mulberry32 `Rng`; the `AudioEngine` is deliberately forked onto its _own_ stream (`seed ^ 0xa0d10`) so wall-clock-timed audio callbacks can never perturb the sim. A grep of `src/sim` + `src/math` for `Math.random`/`Date.now`/`performance.now` finds **zero** sim-affecting hits.
2. **Maximal type rigor.** Strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`; **zero** real `any`, **zero** `ts-ignore`/`ts-nocheck`, **zero** lint-disable across all 108 modules. A genuine 5/5.
3. **Structurally-enforced sim/LLM fence.** `server/*` and `ui/copilot.ts` import **nothing** from `sim`/`world`/`types`, so the non-deterministic LLM organ _provably cannot_ reach `SimState` or the RNG — boundary paranoia realized in the import graph, not just prose.
4. **Real physics under every effect.** Two-species Gray-Scott PDE with a 9-point Laplacian + ping-pong buffers; r⁻² gravity with Keplerian orbits; entropy-clamped quantum measurement consuming exactly one draw per call. The "every system reads AND writes another" law is a real world.ts-orchestrated feedback web.
5. **Allocation-free, documented hot paths.** Module-level scratch vectors, pre-allocated typed arrays, pooled `SpatialHash` with a shared query buffer, partial-buffer instanced uploads — each lifetime rule spelled out in JSDoc with Big-O and legacy-line provenance.
6. **Top-decile tests where they exist.** Bit-identical 300-frame golden + engaged-lever divergence + a documented NaN-stability seal + a JIT-warmed median perf budget at 8k entities + genuine property tests + reference-vector tests (FNV-1a, WCAG contrast) — all DOM-free via a disciplined fake-ctx pattern.
7. **Strong CI gate.** Cross-OS (ubuntu + windows) matrix, full prettier→tsc-strict→oxlint→test→coverage→build pipeline, `--frozen-lockfile`, pinned Bun 1.3.14, least-privilege permissions, deterministic CycloneDX SBOM, coverage regression guard.

---

## Prioritized Next 5 Actions

|  #  | Action                                                                                                                                                                                                                                                                                                                                                              | Addresses                       | Effort | Why first                                                                                                              |
| :-: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------- |
|  1  | **Close the `.env.*` / dotfile-family leak.** Normalize + lowercase the confined segment; reject `=== '.env'` **or** `startsWith('.env.')` **or** blocked set (case-insensitive); prefer an **allowlist** of readable roots. Add the same guard to `validateCommand` (today `cat .env` bypasses entirely).                                                          | Risk #1 (CRIT)                  |   S    | Single critical key-disclosure path; one localized fix removes off-host secret exfiltration.                           |
|  2  | **Add `tests/ai-sandbox.test.ts` as a security regression suite.** Table-drive both directions: blocked (`../`, absolute, `~`, `.env`/`.env.local`/`.ENV`, `find . -delete`, `git push`, redirection, quotes, 600+ chars) and allowed (`ls src`, `git log`, `bun test`). Assert `dispatchTool` denies unknown tools.                                                | Risk #2 (CRIT), #3, #4          |  S–M   | Highest-value test in the repo; pins the gate so every future edit fails loudly. Would have caught `find -delete`.     |
|  3  | **Lock down the server surface.** Bind `127.0.0.1` by default behind an opt-in exposure flag; gate `/api/chat`,`/api/tool`,`/api/copilot` off in non-localhost; add a per-IP token-bucket limiter; pass a **minimal explicit env** to `Bun.spawn`; drop `check`/`bench` and `find` from the allowlists.                                                             | Risks #4, #6, #7, #5            |   M    | Converts "safe-ish on localhost" into "safe to deploy"; also stops denial-of-wallet and source egress.                 |
|  4  | **Enforce the determinism law + cover the untested core.** Add `.oxlintrc.json` (or a meta-test) banning `Math.random`/`Date.now` under `src/sim/**` + `src/world.ts` as a CI gate; add `tests/server.test.ts` (escape/body-guard/parse) and `tests/titans.test.ts` (golden + divergence + cadence + replicator conservation).                                      | Risks #8, #9; titans gap        |   M    | Turns the cardinal rule and the two largest untested surfaces from convention into enforced contract.                  |
|  5  | **Stand up real Continuous Delivery + reconcile contract drift.** Add `pages.yml` deploying `dist/` + `/lab` + `/docs`, repoint Pages to Actions, retire the `gh-pages` stub; pin third-party actions to SHAs; **then** either wire the V9 AI triad per the contract or record the deferral, and refresh ERD/ERM/ERP/ARCHITECTURE + the server route docs to 0.9.0. | Pages gap, Risk #10, docs drift |  M–L   | Makes the public face the real app and re-aligns the binding contract with shipped code (gated by deploy decision D2). |

---

_Generated as part of the Cosmogonic Quantum Mechalogodrom audit, 2026-06-13. See [AUDIT-AND-FIX-PLAN.md](./AUDIT-AND-FIX-PLAN.md) for the staged remediation roadmap and the owner-decision forks (D1 in-world AI vs. determinism; D2 public-deploy authorization)._
