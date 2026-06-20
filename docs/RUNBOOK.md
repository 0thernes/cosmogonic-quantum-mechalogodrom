# RUNBOOK — Cosmogonic Quantum Mechalogodrom

The one canonical ops doc: install, run, gate, build, deploy, release, roll back, troubleshoot.
For _what the project is_ see [README.md](../README.md); for architecture see
[docs/ARCHITECTURE.md](ARCHITECTURE.md); for change history see [CHANGELOG.md](../CHANGELOG.md).

> **Path caveat:** this repo's absolute path contains `[ ]`. In PowerShell use `-LiteralPath` (or the
> dedicated file tools); plain globbing will mis-parse the brackets. Always run commands with the
> current directory **inside the repo** — Bun's HTML-import bundler fails when invoked from elsewhere.

## Prerequisites

- **Bun** `1.3.14` (pinned; the lockfile is `bun.lock`). Install from <https://bun.sh>.
- A modern WebGL2 browser for the app. No backend/database is required for the static demo.

## Install (clean checkout)

```bash
bun install                 # local
bun install --frozen-lockfile   # CI / reproducible (fails if lockfile drifts)
```

## Run locally

```bash
bun dev      # bun --hot server.ts — app at http://localhost:3000  (diagrams at /docs, spec at /spec, lab at /lab)
bun start    # non-hot production server (bun server.ts)
```

## The full gate (run before EVERY commit)

```bash
bun run check   # prettier --check → tsc --noEmit → oxlint → bun test → bun run build
```

All five stages must pass. Current baseline: prettier clean · tsc 0 · oxlint 0 · **942 tests** · build 7
artifacts. Individual stages: `bun run format:check`, `bun run typecheck`, `bun run lint`, `bun test`,
`bun run build`.

## Build & assemble the static site

```bash
bun run build   # → dist/ (minified bundle for index.html + docs.html + specs.html)
bun run pages   # bun run build + scripts/build-pages.ts → site/  (the GitHub Pages artifact)
```

`scripts/build-pages.ts` rewrites the absolute nav links (`/docs`→`docs.html`, `/spec`→`specs.html`,
`/lab`→`lab/`) to subpath-relative for the project-Pages host, drops the `/lab` artifact at
`site/lab/index.html`, and neutralizes the server-only `/api/audit` poll. Both `dist/` and `site/` are
**git-ignored** and wiped before each assembly — never commit them.

## Deploy (GitHub Pages, via Actions)

Pushing to `main` triggers `.github/workflows/pages.yml`, which builds and deploys to GitHub Pages.
Live site: <https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/>.

- **Gotcha (already fixed, keep in mind):** the `github-pages` _environment_ deployment-branch policy
  must allow `main`, or every deploy is silently **rejected** at the deploy step while CI stays green.
  Re-apply with:
  `gh api --method POST repos/0thernes/cosmogonic-quantum-mechalogodrom/environments/github-pages/deployment-branch-policies -f name=main -f type=branch`
- Diagnose a stale deploy: `gh run list --workflow=pages.yml` (look for `failure`), then
  `gh run view <id>` and read the **annotations** (the env-protection rejection shows there, not in the logs).

## Cut a release

```bash
# 1. bump version in package.json + date the CHANGELOG [x.y.z] section, then:
git add package.json CHANGELOG.md <changed files>
git commit -m "chore(release): vX.Y.Z — …"
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z — …" && git push origin vX.Y.Z   # → release.yml gates, builds, SBOMs, publishes
```

Verify: `gh release list`, `gh run list --workflow=release.yml`. Semver line so far:
`0.8.0 → 0.9.0 → 0.10.0 (Living Era) → 0.10.1 → 0.10.2 → 0.10.3 → 0.10.4`. The internal `V##` numbers are
NOT semver.

## Roll back

- **Code/release:** `git checkout vX.Y.Z` (every release is an annotated tag) — the last known-good is the
  newest `v*` tag. To re-deploy an older state, push that state to `main` (Pages always deploys `main`).
- **Pages only:** the GitHub Pages "deployments" list keeps prior successful deploys; the previous one is
  the rollback target if a bad deploy ships.

## Troubleshoot

| Symptom                                                             | Cause                                                              | Fix                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `bun dev` shows `initCenterHud is not a function` or a stale layout | `bun --hot` cached a broken intermediate bundle during rapid edits | Restart `bun dev`. The committed code compiles (`tsc` 0) and builds clean.           |
| Live Pages site looks stale after a push                            | `github-pages` env rejected the `main` deploy                      | See the Deploy "Gotcha" above; check `gh run list --workflow=pages.yml` annotations. |
| Gate fails on `format:check`                                        | unformatted files                                                  | `bunx prettier --write <files>` then re-run `bun run check`.                         |
| `dist/` huge / many orphaned chunks                                 | (fixed) build now wipes `dist/` first                              | Re-run `bun run build`; if an old tree persists, `rm -rf dist site` and rebuild.     |
| Determinism test fails                                              | `Math.random`/`Date.now` crept into `src/sim/**`                   | Route all sim randomness through the seeded `Rng` (`src/math/rng.ts`).               |

## Determinism & license invariants (do not break)

- All simulation randomness flows through the seeded `Rng` (`src/math/rng.ts`); `Math.random`/`Date.now`
  are **banned** in `src/sim/**` (enforced by `tests/determinism-law.test.ts`).
- License is **proprietary / UNLICENSED** by design — never relicense to MIT/open-source.
- `legacy/` is preserved verbatim — never edit it.

**Ralph Wiggum Loop (MANDATORY per mandate):** If any tool, push, MCP, check, or external call hangs or errors, sleep 15s then retry the exact command. Continue non-stop. Bank green, persist plan, forward progress. Used for all Tsotchke wiring + this session.
