# Ultracode 250-Point Inspection — 2026-06-15

**Repo:** Cosmogonic Quantum Mechalogodrom · **Commit at inspection:** `bdb9ddd`→`618dc98`
(V62→V68, a fast-moving session) · **Reviewer:** Validation pass (separation of duties —
Generation vs Validation). · **Method:** 10-dimension static inspection (multi-agent + main-loop),
adversarial verification of every CRITICAL/HIGH finding, a completeness critic, and an independent
dynamic gate run. STATIC analysis did not run the suite/build/bench (captured separately).

> **Headline grade: B+ (Tier-1 "excellent, shippable with `COPILOT_ENABLED` off").** Engineering
> discipline is genuinely high — hardened security boundary, real-math-under-every-effect,
> allocation-free hot paths, 819 green tests, 0 dependency vulnerabilities. The gap to "A / merge-it"
> is (1) **one verified sandbox-escape — now FIXED this run**, (2) determinism enforced by
> **convention, not tooling**, and (3) a **generation of repo-book drift** (the governing maps
> describe the V3/V4 era while code shipped through V68), which matters because CLAUDE.md makes the
> contract _law_.

---

## 1. Executive summary

| Dimension                         | Verdict     | Notes                                                                 |
| --------------------------------- | ----------- | --------------------------------------------------------------------- |
| 1. Cartography / dead code        | ✅ Strong   | 87 modules, **0** TODO/FIXME/HACK in `src/`; `world.ts` god-object    |
| 2. Build / run / env / CI         | ✅ Good     | Full cross-OS gate, least-privilege token; CI actions on mutable tags |
| 3. Application security           | ⚠️→✅ Fixed | 1 HIGH + 2 MED sandbox escapes **remediated this run**; 1 MED open    |
| 4. Supply chain / SBOM / license  | ✅ Strong   | `bun audit` clean; all-permissive licenses; no copyleft conflict      |
| 5. Determinism / AI safety        | ✅ Strong\* | Law holds (verified); **not lint-enforced**; AI organ well-bounded    |
| 6. Code quality / refactoring     | ✅ Strong   | Clean, documented; `world.ts` (2389 lines) is the one structural debt |
| 7. Architecture / ERD conformance | ⚠️ Drift    | Invariants hold; diagrams/ERD/FILE-MAP a generation stale (V3/V4)     |
| 8. Performance / reliability      | ✅ Strong   | Allocation-free hot paths verified; 2 measurement-coverage gaps       |
| 9. Correctness / testing          | ✅ Strong   | 819 tests green; server route + parser boundary tests are thin        |
| 10. Docs / repo-book / governance | ⚠️ Drift    | Rich repo-book; README synced this run; KANBAN/contracts stale        |

**Confirmed strengths (not rubber-stamped — verified):** array-form `Bun.spawn` (no shell),
default-deny allow/deny lists, repo-confinement with case-insensitive `.env`/`.git` blocking,
`minimalEnv()` stripping every provider key from subprocesses, `COPILOT_ENABLED` off in production,
complete HTML-escaping of the audit fragment, bounded rings/body-caps, seeded `mulberry32` with
isolated sub-streams, the off⇒rng-silent optional-system pattern, and a same-seed golden test.

---

## 2. Dynamic gate evidence (independent run, commit `55b50d6`)

```
typecheck (tsc --strict)  : clean
lint (oxlint)             : clean
bun test                  : 819 pass · 0 fail · 59 files · ~1.6 s   (was 810 pre-fix)
bun audit                 : No vulnerabilities found
SBOM                      : three=MIT · tailwind=MIT · typescript=Apache-2.0 (+ ISC/0BSD/SIL-OFL)
bench (mitata)            : hot paths ns–µs, allocation columns ≈ 0 B (allocation-free confirmed)
```

Full capture: [`verification-run.txt`](./verification-run.txt).

---

## 3. Risk register (deduplicated, severity-ranked)

| ID                    | Sev     | Dim | Title                                                                                            | Status                                      |
| --------------------- | ------- | --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **APPSEC-01**         | HIGH    | 3   | `git grep --open-files-in-pager` option-injection → process exec                                 | **FIXED this run**                          |
| **APPSEC-03**         | MEDIUM  | 3   | `run cat .env` reads files `read_file` blocks (no prefix-block on run)                           | **FIXED this run**                          |
| **SBX-WRITE**         | MEDIUM  | 3   | `run sort -o <file>` writes a file (read-only-sandbox violation)                                 | **FIXED this run**                          |
| **APPSEC-06 / D5-01** | MEDIUM  | 3/5 | `POST /api/audit` unauthenticated + no rate-limit (feed poisoning)                               | Open — see §6 (SERVER-RL)                   |
| **APPSEC-02**         | MEDIUM  | 3   | Server binds `0.0.0.0`; no CSP; no per-route throttle                                            | Open — recommend                            |
| **APPSEC-04 / D5-02** | MEDIUM  | 3/5 | Copilot feeds tool/web output to the model without untrusted-data fencing                        | Open — recommend (gated by COPILOT_ENABLED) |
| **GOV-DET**           | MEDIUM  | 5   | Determinism law enforced by convention; no `.oxlintrc` ratchet                                   | Open — fix ready (§6)                       |
| **ARCH-01/02/03**     | MEDIUM  | 7   | ARCHITECTURE/FILE-MAP/ERD/ERM map V3/V4; code is V68 (drift)                                     | Partly fixed (FILE-MAP regen)               |
| **CI-PIN**            | LOW→MED | 2   | CI `uses:` pinned to mutable tags (`@v4`), not commit SHAs                                       | Open — recommend                            |
| **TEST-SRV**          | MEDIUM  | 9   | `server.ts` routes + `parseAuditBody`/`parseChatMessages` thinly tested                          | Open — recommend                            |
| **D5-03**             | LOW     | 5   | `super-evolution.fromJSON` accepts `+Infinity` xp → max-level on load                            | Open — 1-line fix                           |
| **D5-05**             | LOW     | 5   | web-search deny-phrase gate is an evadable substring heuristic                                   | Accept (backend is the real boundary)       |
| **D5-06**             | LOW     | 5   | Copilot tool-steps not server-side logged (forensics gap when enabled)                           | Open — recommend                            |
| **APPSEC-05**         | LOW     | 3   | Provider error body (≤300 chars) reflected into chat reply (textContent, not XSS)                | Open — recommend                            |
| **ARCH-04**           | LOW     | 7   | `types.ts` `EntityData.mi` comment says `0..99` (code is `0..morphTotal-1`)                      | **FIXED this run**                          |
| **ARCH-05/06**        | LOW     | 7   | ARCHITECTURE quality table/route list stale; `world.ts` 2389-line god-object                     | Open — recommend                            |
| **PERF-SYNC**         | MEDIUM  | 8   | `instanced.sync` (2nd-largest stage, ~4.7 ms/10k) has no bench/regression guard; harness deleted | Open — recommend                            |
| **PERF-STEP**         | LOW     | 8   | Full `world.step()` aggregate unguarded by the lone perf test                                    | Open — recommend                            |
| **PERF-CHAOS**        | LOW     | 8   | `ChaosField` O(n/3) per-frame pass unmeasured at the 50k mega tier                               | Open — recommend                            |

No **CRITICAL** findings. The lone HIGH is remediated. Everything else is MEDIUM-and-below and, for
the AI surface, gated behind `COPILOT_ENABLED` (off in production).

---

## 4. Remediations landed this run

**Security — `src/server/ai-sandbox.ts` (+ `tests/ai-sandbox.test.ts`, +9 deny tests):**

1. **APPSEC-01 (HIGH) — git option-injection → process execution.** `run git grep
--open-files-in-pager=id <pat>` passed every guard: the dash-led token is a flag, so the
   positional path-confine loop skipped it, and `--fixed-strings` governs pattern interpretation,
   not option parsing — so `git grep` parsed it as the option and spawned the pager `id` as a
   process. **Fix:** a universal `EXEC_OR_WRITE_FLAG` deny (`-O`, `--open-files-in-pager`,
   `--output`) plus per-binary forbidden-flag maps (`git`: `-[oOf]`/`--file`/…; `sort`: `-o`),
   applied to flag tokens (which were previously never inspected). `grepRepo` now also rejects a
   dash-led pattern.
2. **APPSEC-03 (MEDIUM) — `run` read of blocked files.** `run cat .env` / `cat legacy/x` slipped
   past `validateCommand` because it only checked for a `..` escape, not the `.env`/`.git`/`legacy`
   prefix-block that `read_file`'s `confine()` enforces. **Fix:** every positional path-like arg now
   routes through `confine()` (incl. the `git <rev>:<path>` colon form), so `run` and `read_file`
   share one block-list.
3. **SBX-WRITE (MEDIUM, newly found) — `run sort -o <file>` writes a file**, violating the
   "writes NOTHING" guarantee. **Fix:** covered by the `sort` forbidden-flag map above.

**Verification:** `bun test tests/ai-sandbox.test.ts` → 31 pass / 0; full suite **819 pass / 0**;
typecheck + oxlint + prettier all clean.

**Documentation — synced this run (owned, non-colliding with the active parallel editor):**

- `README.md` — tests badge 580→810, module count 77→87, and a new **"Living Era (V10–V64)"**
  section (the README narrative previously stopped at 0.9.0).
- `docs/FILE-MAP.md` — regenerated (`bun run filemap`) → **87 modules** (was 77).
- `src/types.ts` — `EntityData.mi` comment corrected to `0..morphTotal-1` (ARCH-04).
- `docs/audit-2026-06-15/CHAOS-MODE-V62-VALIDATION.md` — independent V62 validation (PASS).

---

## 5. Per-dimension detail (condensed)

**1 · Cartography.** 87 TS modules, 10 dirs; entrypoints `server.ts` / `src/main.ts` /
`src/world.ts` / `src/docs-page.ts`. **Zero** TODO/FIXME/HACK/XXX/WIP in `src/` — unusually clean.
Layering verified acyclic (leaf `math/*` never imports `sim/*`; no `sim/*` value-imports `types.ts`).
`world.ts` is the one god-module (see ARCH-06).

**2 · Build/Run/CI.** Gate = prettier→tsc→oxlint→test→coverage→build on an `ubuntu`+`windows`
matrix; `permissions: contents: read` (least-privilege); frozen lockfile; Bun pinned `1.3.14`.
**CI-PIN:** `actions/checkout@v4`, `oven-sh/setup-bun@v2`, `actions/cache@v4`,
`actions/upload-artifact@v4` are mutable-tag pins — pin to commit SHAs for supply-chain integrity.

**3 · Security.** See §4 (3 fixed) + §3 register. Net posture after this run: **strong**; residual
items are the unauth audit route (known backlog) and the AI-organ hardening (prompt-injection
fencing, tool-step logging), all gated by `COPILOT_ENABLED` off in production.

**4 · Supply chain.** `bun audit`: **0 vulnerabilities**. Direct deps all permissive (three/tailwind/
mermaid/graphology/simplex-noise/@noble/hashes = MIT; d3-delaunay/simple-statistics = ISC; htmx =
0BSD; fonts = SIL OFL). **No copyleft conflict** with the proprietary license — p5.js (LGPL) is
loaded by `/lab` from a CDN, not redistributed. CycloneDX SBOM emitted by `scripts/sbom.ts`.

**5 · Determinism / AI safety.** Law **verified clean**: the only real `Date.now()` in sim-adjacent
code is the documented, try-guarded super-evolution localStorage catch-up (`world.ts:962,977`,
outside the population golden); all other matches are JSDoc or legit UI/server/logging. **GOV-DET:**
no `.oxlintrc` mechanically bans the calls — the law rests on review + the golden. AI organ is
well-bounded (read-only sandbox, `minimalEnv` strips keys, web-search is query-only/fixed-endpoint —
no SSRF) but lacks untrusted-data fencing (APPSEC-04) and server-side tool-step logs (D5-06).

**6 · Code quality.** Idiomatic, heavily and honestly documented, magic numbers named, errors
fault-isolated (e.g. the audit fragment degrades per-entry). One structural debt: `world.ts`.

**7 · Architecture.** The four hardest invariants (determinism, DOM-free leaves, acyclic graph,
dependency facades) **hold across ~55 sim modules and 64 waves** — verified. The drift is map-vs-
territory: `ARCHITECTURE.md`/`ERD.md`/`ERM.md` describe ~40 modules (V3/V4) while 87 shipped; under
the project's "Contract wins" law this is a correctness artifact, not docs-polish.

**8 · Performance.** Hot paths reuse module-level scratch (allocation-free, bench-confirmed); WebGL
`dispose()`/HMR teardown correct (V49 leak fix holds); `nhi-observatory` rAF self-heals. Gaps are
**measurement coverage**: PERF-SYNC / PERF-STEP / PERF-CHAOS (see register).

**9 · Testing.** 819 tests, strong per-module determinism + security-gate coverage. **TEST-SRV:**
`server.ts` route handlers and the `parseAuditBody`/`parseChatMessages` narrowers lack direct
boundary tests; the integrated golden omits the optional rng-owning systems (D5-04, by design but
worth an integrated assertion).

**10 · Docs / repo-book.** Maps well onto the Ultracode-mandated set (see §7). README + KANBAN
synced this run. `MODULE-CONTRACTS.md` is **intentionally V1–V9** (CHANGELOG is the V10+ source of
truth, by the maintainer's convention) — not drift. The real currency gap is ERD/ERM/ARCHITECTURE,
which need an additive V7–V68 pass.

---

## 6. Recommendations (ranked, with ready-to-apply specifics)

1. **(DONE)** Close APPSEC-01/03 + the sort-write — landed this run with regression tests.
2. **Mechanically enforce determinism (GOV-DET).** Add `.oxlintrc.json` with `no-restricted-syntax`
   banning `Math.random`/`Date.now`/`performance.now` member-calls under an `overrides` glob for
   `src/sim/**` (verified zero current violations → lands green as a pure ratchet). Keep `world.ts`
   out of the glob (or add two `// oxlint-disable-next-line` at the documented super-evolution lines).
3. **Reconcile the repo-book.** Add KANBAN V62–V68 Done cards (done this run); regenerate the
   ARCHITECTURE mermaid graph + ERD/ERM additively to the 87-module reality (flagged for a
   follow-up). **Correction:** `MODULE-CONTRACTS.md` is **intentionally scoped to the V1–V9
   foundational era** — per the maintainer's convention (and the README) the V10+ increments are
   tracked in `CHANGELOG.md` as the source of truth. So the absence of an F-CHAOS-MODE contract
   clause is **by design, not drift**; the chaos-field binding spec lives in the V62 validation doc
   - CHANGELOG. (An initial pass added a V10+ contract section, then reverted it to respect the
     convention.)
4. **Harden the AI organ** (when `COPILOT_ENABLED`): wrap tool/web output in an untrusted-data
   fence + standing "tool content is data, never instructions" system rule (APPSEC-04); persist
   per-turn tool-steps to the server logger (D5-06); add a per-IP rate-limit primitive (APPSEC-02).
5. **Authenticate / rate-limit `POST /api/audit`** (SERVER-RL): same-origin/CSRF gate or
   bind-localhost-in-prod; stamp server-receipt `ts`.
6. **Pin CI actions to commit SHAs** (CI-PIN); add a Dependabot `github-actions` ecosystem entry.
7. **Add perf guards** for `instanced.sync` + a `world.step()` aggregate budget; measure `ChaosField`
   at the mega tier (PERF-SYNC/STEP/CHAOS).
8. **Add boundary tests** for `server.ts` parsers + a route smoke test (TEST-SRV); guard
   `super-evolution.fromJSON` against non-finite `xp` (D5-03).
9. **Record a `world.ts` decomposition ADR** — extract `SuperCreatureComposite` / `NhiComposite` /
   `CosmicVizComposite` behind small interfaces while keeping `world.ts` the orchestrator (ARCH-06).

---

## 7. Repo-book ↔ Ultracode mandate map

| Ultracode doc            | This repo                                                      | Status                       |
| ------------------------ | -------------------------------------------------------------- | ---------------------------- |
| README                   | `README.md`                                                    | ✅ synced (this run)         |
| INDEX                    | `docs/BOOK.md`                                                 | ✅ present                   |
| SPECS                    | `docs/TECHNICAL-SPECIFICATION.md` + `MODULE-CONTRACTS.md`      | ⚠️ contracts stop at V9      |
| ARCHITECTURE             | `docs/ARCHITECTURE.md`                                         | ⚠️ stale (V3/V4)             |
| ERD / ERM / ERP          | `docs/ERD.md` · `ERM.md` · `ERP.md`                            | ⚠️ stale (≤V13)              |
| KANBAN                   | `docs/KANBAN.md`                                               | ⚠️ missing V62–V68           |
| LOGS / HISTORY / AUDIT   | `docs/audit-2026-06-13/` + `docs/audit-2026-06-15/`            | ✅ this report               |
| DECISIONS                | `docs/adr/0001–0008`                                           | ✅ present                   |
| CHANGELOG                | `CHANGELOG.md`                                                 | ✅ current (V68)             |
| FILE_MAP / MODULE_MAP    | `docs/FILE-MAP.md` (auto) + `MODULE-CONTRACTS.md`              | ✅ regenerated (87)          |
| AI_RAG_NOTES             | `docs/BOOK.md` (RAG index) + in-app HELP/BOOK                  | ✅ present                   |
| UI_ENTITY_GUIDE          | `docs/ENTITY-SHEETS.md` + `CONTROLS.md` + `WIREFRAMES.md`      | ✅ present                   |
| PERFORMANCE_MATH_SCIENCE | `docs/COMPLEXITY.md` + `BENCHMARKS.md`                         | ✅ present (perf gaps noted) |
| BUILD_RUN_GUIDE          | `README` Quickstart + `CONTRIBUTING.md`                        | ✅ adequate                  |
| TROUBLESHOOTING          | in-app HELP + `docs/audit-2026-06-13/`                         | ◑ partial                    |
| ROADMAP                  | `ROADMAP.md` + `docs/KANBAN.md`                                | ✅ present                   |
| SBOM                     | `scripts/sbom.ts` (CycloneDX) + §4 here                        | ✅ generated                 |
| SECURITY_GOVERNANCE      | `SECURITY.md` + `docs/audit-2026-06-15/SECURITY-GOVERNANCE.md` | ✅ added (this run)          |

The repo-book is **substantially complete** against the mandate; the work is _currency_, not
_coverage_ — most mandated docs exist (often under domain names), and the gaps are staleness on the
fast-moving V10–V68 layer.

---

## 8. Completion assessment (vs Ultracode criteria)

- ✅ Installs/builds/runs/tests from documented commands; gate green (819 tests, 0 vulns).
- ✅ Core code paths understandable; architecture invariants verified intact.
- ✅ High/Medium security risks: the one HIGH + two MEDIUM sandbox escapes **remediated**; the rest
  tracked here with severity, status, and a concrete next action.
- ✅ CI/CD, dependency, license, SBOM, secrets inspected (clean; CI-PIN noted).
- ⚠️ Repo-book currency: README/FILE-MAP/types/KANBAN synced this run; ERD/ARCHITECTURE/ERM flagged
  for an additive follow-up (MODULE-CONTRACTS is intentionally V1–V9 — CHANGELOG carries V10+).
- ✅ No major finding left only in chat — all recorded here.

**Net:** the codebase is high-craft and clears most of a Tier-1 bar. After this run's remediation it
is **shippable with `COPILOT_ENABLED` off**. The remaining distance to "A" is governance hardening
(determinism-by-tooling, repo-book currency) and AI-organ defense-in-depth — none blocking, all
tracked.
