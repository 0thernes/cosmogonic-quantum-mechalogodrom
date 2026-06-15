# Security Governance — Cosmogonic Quantum Mechalogodrom

_Standing security posture, risk register, and SLA tracking (CISO/CISM-style). Companion to
[`SECURITY.md`](../../SECURITY.md) (disclosure policy) and the 2026-06-15
[Ultracode inspection](./ULTRACODE-INSPECTION-2026-06-15.md). Last reviewed: 2026-06-15._

## 1. Threat model & trust boundaries

This is a **single-author, proprietary, client-heavy WebGL art instrument** served by a small Bun
fullstack server. It is **not** a multi-tenant SaaS; it has no user accounts, no database, no PII,
and no money movement. The security-relevant surface is therefore narrow and well-understood:

| Boundary                     | Trust                     | Control                                                                                                |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Browser ↔ `server.ts`        | untrusted client          | input narrowing, body caps (8–256 KB), HTML-escaping, bounded rings                                    |
| `POST /api/audit`            | **unauthenticated**       | size cap + 200-entry ring + per-entry HTML-escape + token-bucket rate-limit 60/30s (no auth — RISK-04) |
| Copilot LLM ↔ tool sandbox   | **fully untrusted model** | `COPILOT_ENABLED` off in prod; default-deny read-only sandbox                                          |
| Tool sandbox ↔ host          | hostile-input assumed     | `Bun.spawn` array-form (no shell), allow/deny lists, repo-confine, `minimalEnv()` (no keys)            |
| Web search ↔ public internet | untrusted output          | query-only (no model URL), fixed key-less endpoint, output-capped (no SSRF)                            |
| Sim RNG ↔ reproducibility    | determinism law           | seeded `mulberry32`, isolated sub-streams, golden test (enforcement: convention — see RISK-07)         |

**Primary asset to protect:** the proprietary source itself (All-Rights-Reserved). The dominant
control is `COPILOT_ENABLED=false` in production — the LLM organ that can read source is simply off
on any hosted/public deploy.

## 2. Security capability coverage (Ultracode mandate)

| Capability        | Status | Evidence                                                                                                             |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| SAST              | ✅     | CodeQL `security-extended` (push/PR + weekly) `codeql.yml`; oxlint                                                   |
| SCA / deps        | ✅     | `bun audit` (0 vulns 2026-06-15); Dependabot                                                                         |
| Secrets           | ✅     | `minimalEnv()` strips provider keys from subprocesses; `.env*` blocked from reads; no hardcoded keys (grep-verified) |
| License / SBOM    | ✅     | CycloneDX via `scripts/sbom.ts`; all-permissive, no copyleft conflict                                                |
| Container / IaC   | n/a    | no Dockerfile / Terraform / k8s in repo (documented as N/A)                                                          |
| Pipeline security | ◑      | least-privilege `contents: read`; **CI actions on mutable tags** (RISK-09)                                           |
| API security      | ◑      | per-route gating + body caps + token-bucket rate-limit on `POST /api/audit`; **`0.0.0.0` bind, no CSP** (RISK-05)    |
| AI/LLM safety     | ◑      | sandboxed + key-stripped; **no untrusted-data fencing / tool-step logging** (RISK-06)                                |
| DAST              | ◑      | manual; no automated dynamic scan (low priority — tiny surface)                                                      |

## 3. Risk register & SLA

Policy: **High → 14-day SLA, Medium → 30-day, Low → best-effort.** No public-internet production
deploy may run with `COPILOT_ENABLED=true` until RISK-05/06 are closed.

| ID      | Sev    | Title                                                                       | Status / SLA                                                                                     |
| ------- | ------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| RISK-01 | HIGH   | `git grep -O` option-injection → process exec (sandbox escape)              | ✅ **REMEDIATED 2026-06-15** (`ai-sandbox.ts` + tests)                                           |
| RISK-02 | MEDIUM | `run cat .env` read of blocked files                                        | ✅ **REMEDIATED 2026-06-15**                                                                     |
| RISK-03 | MEDIUM | `run sort -o` writes a file (read-only violation)                           | ✅ **REMEDIATED 2026-06-15**                                                                     |
| RISK-04 | MEDIUM | `POST /api/audit` unauthenticated + feed-poisoning                          | ◑ **flood/eviction SEALED 2026-06-15** (token bucket, `763381a`); auth deferred to public-deploy |
| RISK-05 | MEDIUM | ~~No rate-limit primitive~~; server binds `0.0.0.0`; no CSP                 | ◑ rate-limit ADDED (`POST /api/audit`, `763381a`); `0.0.0.0` + CSP gate before deploy            |
| RISK-06 | MEDIUM | Copilot tool/web output not fenced as untrusted data; tool-steps not logged | OPEN — gate before deploy                                                                        |
| RISK-07 | MEDIUM | Determinism law enforced by convention, no `.oxlintrc` ratchet              | OPEN — fix specified (inspection §6.2)                                                           |
| RISK-08 | LOW    | `super-evolution.fromJSON` accepts `+Infinity` xp                           | ✅ **REMEDIATED 2026-06-15** (`df49dd7`, `Number.isFinite` guards + test)                        |
| RISK-09 | LOW    | CI `uses:` pinned to mutable tags, not commit SHAs                          | OPEN — pin + Dependabot actions ecosystem                                                        |
| RISK-10 | LOW    | Provider error body reflected (≤300 chars; not XSS)                         | OPEN — generic category                                                                          |

## 4. Verified-strong controls (do not regress)

- **No shell anywhere** — every subprocess is `Bun.spawn(argv, …)` array-form; the `META`
  filter + quote ban reject redirection/chaining/subshell at the door.
- **Default-deny** allow-list of binaries + deny-list of write/network/escalation tokens + git/bun
  subcommand gating + (as of 2026-06-15) write/exec **option** denial.
- **Repo-confinement** with case-insensitive `.env*` / `.git*` / `legacy` / `node_modules` / `dist`
  blocking, now shared by both `read_file` and the `run` tool.
- **`minimalEnv()`** hands subprocesses only `PATH`/system vars — never the provider API keys in
  `process.env`.
- **`COPILOT_ENABLED`** defaults off when `NODE_ENV=production`; all of `/api/chat`, `/api/tool`,
  `/api/copilot/health` 403 without it.
- **Output bounded everywhere** — 16 KB tool output, 8/256 KB bodies, 200-entry ring, 4 KB web
  results, 15 s command timeout, HTML-escape on the only HTML sink.

## 5. Governance actions

1. Treat the repo-book contract drift as a **security-adjacent** risk: under "Contract wins," a stale
   `MODULE-CONTRACTS.md` can cause a future agent to regress a real control. Keep contracts current.
2. Do not enable `COPILOT_ENABLED` on any internet-reachable host until RISK-04/05/06 are closed.
3. Re-run `bun audit` + review Dependabot/CodeQL on every dependency bump; this doc's risk table is
   the system of record for High/Medium remediation tracking.
