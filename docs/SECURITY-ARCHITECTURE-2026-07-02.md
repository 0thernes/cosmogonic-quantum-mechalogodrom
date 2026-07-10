<!-- reviewed: 2026-07-02 | mega-audit PM-artifact gap-fill | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Security Architecture

**Living document.** The threat model and hardening posture for a static public research artifact with an
optional local Bun server. [SECURITY.md](../SECURITY.md) is the reporting/disclosure policy; this is the
_architecture_. GitHub Pages has no server session or accounts; `bun start` adds bounded in-memory routes
and an explicit-opt-in Copilot/tool boundary, so its request and subprocess surfaces are defended too.

## 1 · Trust boundary

- **Public (assume adversarial reads it):** everything shipped to GitHub Pages / CodePen — all frontend
  JS/HTML/CSS/WASM, the docs, the bundle. **Rule: zero secrets in anything public.** No API keys, tokens,
  or private endpoints in frontend code, ever.
- **Private (local only):** the working tree, `.env` (gitignored), the native C++ build, agent tooling.
- **Managed backends (if ever added):** Supabase / Vercel / Stripe / Cloudflare hold their own secrets
  server-side; the frontend only ever sees publishable keys. Compute-heavy work runs on cloud agents, not
  in the browser.

## 2 · Attack surface & mitigations

| Surface                                      | Threat                                        | Mitigation                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Static bundle (Pages)**                    | Leaked secret; tampered/broken deploy         | No frontend secrets; keyless LLM chat (`askStaticAi` → anonymous LLM7/Codestral, CORS-open); `golden-hash.yml` + `smoke.ts` validate the build; `build-pages` rewrite-proof `data-nav`. |
| **AI sandbox** (`ai-sandbox.ts`)             | Unbounded output; code/write escape           | Repo confinement; private-path blocks; exact binary/subcommand gates; no Bun/project executors; secret-free child env; streamed output byte cap + deadline.                             |
| **Copilot / chat** (`copilot.ts`)            | Prompt-driven data exfiltration; provider DoS | Explicit `COPILOT_ENABLED=1`; bounded request/response bytes, model content, provider attempts, tool-call fanout and whole-turn deadline.                                               |
| **Persistence** (`localStorage`, audit dock) | Poisoned/oversized local state                | Bounded parse of `cqm.audit.v1`; local-only, no PII, no cross-user surface.                                                                                                             |
| **`server.ts` (optional local)**             | Request handling flaws                        | Body caps, origin checks, rate limits, security headers, bounded rings, and Copilot OFF unless explicitly enabled.                                                                      |
| **Supply chain**                             | Malicious/compromised dependency              | Frozen integrity lock, push-diff dependency review, full-tree `bun audit`, SHA-pinned Actions, CycloneDX SBOM, checksums, and SLSA/Sigstore release provenance.                         |

## 3 · What is deliberately NOT defended (and why)

No user auth or session management exists because there are no accounts. The optional Bun server does
hold bounded process-local state, so its mutating/model routes use origin checks, byte ceilings, and token
buckets. A future persistent multi-user backend requires a separate identity/data threat model.

## 4 · Hardening backlog (tracked)

- **DONE (v0.21.12)** — release SBOM, SHA-256 checksums, and SLSA/Sigstore provenance are published.
- **P2** — document HTTP security headers (CSP, X-Content-Type-Options, Referrer-Policy) for the Pages
  deploy; add `axe-core` a11y-and-injection static check to CI.
- **P2** — periodic re-audit of the sandbox/copilot paths each release (see
  [RISK-REGISTER-2026-07-02.md](./RISK-REGISTER-2026-07-02.md) R9).

## 5 · Disclosure

Vulnerability reporting and coordinated disclosure follow [SECURITY.md](../SECURITY.md). This is a
research artifact with no user data; the practical blast radius of any finding is the static site itself.
