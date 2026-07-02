<!-- reviewed: 2026-07-02 | mega-audit PM-artifact gap-fill | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Security Architecture

**Living document.** The threat model and hardening posture for a **static, single-machine, no-backend
research artifact**. [SECURITY.md](../SECURITY.md) is the reporting/disclosure policy; this is the
_architecture_. The governing reality: for a one-person, statically-deployed repo, the ONLY boundary that
matters is **public vs private** — there is no server session, no user data, no auth surface to attack.

## 1 · Trust boundary

- **Public (assume adversarial reads it):** everything shipped to GitHub Pages / CodePen — all frontend
  JS/HTML/CSS/WASM, the docs, the bundle. **Rule: zero secrets in anything public.** No API keys, tokens,
  or private endpoints in frontend code, ever.
- **Private (local only):** the working tree, `.env` (gitignored), the native C++ build, agent tooling.
- **Managed backends (if ever added):** Supabase / Vercel / Stripe / Cloudflare hold their own secrets
  server-side; the frontend only ever sees publishable keys. Compute-heavy work runs on cloud agents, not
  in the browser.

## 2 · Attack surface & mitigations

| Surface                                      | Threat                                            | Mitigation                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Static bundle (Pages)**                    | Leaked secret; tampered/broken deploy             | No frontend secrets; keyless LLM chat (`askStaticAi` → anonymous LLM7/Codestral, CORS-open); `golden-hash.yml` + `smoke.ts` validate the build; `build-pages` rewrite-proof `data-nav`.             |
| **AI sandbox** (`ai-sandbox.ts`)             | Unbounded recursion/allocation (DoS); code escape | Recursion depth + allocation caps; no `eval` of untrusted code into the sim; deterministic-only execution. Secret-leak grep bypass (`-d/--directories` recursion) closed 2026-07-01.                |
| **Copilot / chat** (`copilot.ts`)            | Prompt-driven data exfiltration; injection        | Keyless anonymous provider; no repo secrets in context; static deploy has no server to pivot to.                                                                                                    |
| **Persistence** (`localStorage`, audit dock) | Poisoned/oversized local state                    | Bounded parse of `cqm.audit.v1`; local-only, no PII, no cross-user surface.                                                                                                                         |
| **`server.ts` (dev only)**                   | Request handling flaws                            | Dev-server only (`bun dev`), not a deployed backend; not exposed publicly.                                                                                                                          |
| **Supply chain**                             | Malicious/compromised dependency                  | `--frozen-lockfile`; `bun audit` (HIGH/CRITICAL isolated); dependency-review on PR triggers (dead by design — no PRs); minimal dep tree. **Gap:** SBOM (`bun sbom`) not published to releases (P1). |

## 3 · What is deliberately NOT defended (and why)

No auth, no session management, no rate-limiting on a public endpoint, no CSRF/XSS-token machinery —
because there is **no server-side state and no user accounts**. Adding any of those without a backend
would be theater. If a real backend is ever introduced, this section becomes a live threat model (managed
providers carry their own hardening).

## 4 · Hardening backlog (tracked)

- **P1** — publish `bun sbom` output as a release artifact; add SLSA/provenance attestation.
- **P2** — document HTTP security headers (CSP, X-Content-Type-Options, Referrer-Policy) for the Pages
  deploy; add `axe-core` a11y-and-injection static check to CI.
- **P2** — periodic re-audit of the sandbox/copilot paths each release (see
  [RISK-REGISTER-2026-07-02.md](./RISK-REGISTER-2026-07-02.md) R9).

## 5 · Disclosure

Vulnerability reporting and coordinated disclosure follow [SECURITY.md](../SECURITY.md). This is a
research artifact with no user data; the practical blast radius of any finding is the static site itself.
