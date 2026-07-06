<!-- reviewed: 2026-07-06 | v0.21.1 truth-surface sweep | canonical facts: docs/VERIFICATION-ANALYTICAL-DATA.md -->

# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.21.x  | Yes       |
| < 0.21  | No        |

## Reporting a vulnerability

Email **0_0@0thernes.art** with a description, reproduction steps, and impact
assessment. Please do **not** open a public issue for security reports.

- You will receive an acknowledgement within 7 days.
- We aim to ship a fix or mitigation within 90 days of triage.
- Coordinated disclosure is appreciated; credit is given unless you opt out.

## Threat model

This is a client-side WebGL simulation fronted by a deliberately tiny Bun
server. Know the surface before deploying it anywhere public:

| Surface                                        | Notes                                                                                                                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`, `/docs`, `/spec`, `/bible`, `/lab`    | Static, bundled HTML. No templating of user input.                                                                                                                                                                     |
| `GET /lab/consciousness`, `/lab/sentience`     | Static lab dashboards that load deterministic JSON feeds. They are proxy telemetry surfaces, not medical/psychological or sentience claims.                                                                            |
| `GET /api/health`                              | Returns `{ ok, uptime, version }`. No secrets.                                                                                                                                                                         |
| `GET /api/consciousness-lab`, `/sentience-lab` | Returns deterministic lab JSON. No credentials or PII.                                                                                                                                                                 |
| `GET /api/ventures`, `/api/waitlist`           | Public JSON/demo surfaces. Treat as untrusted input/output boundaries if extended beyond the current demo behavior.                                                                                                    |
| `POST /api/audit`                              | Unauthenticated. Appends `{ action, detail?, ts }` to an in-memory ring capped at 200 entries; body-capped (8 KB -> 413) and token-bucket rate-limited (60-burst / 30 per s -> 429). Nothing is persisted server-side. |
| `GET /api/audit`                               | Returns an **HTML fragment** rendered from ring entries for HTMX polling. Entries originate from `POST /api/audit`, so all fields MUST be HTML-escaped at render time to prevent stored XSS.                           |
| Optional Copilot/chat/tool APIs                | Provider-mediated surfaces. Keep production availability, keys, prompts, and third-party requests explicit; do not paste secrets into public side-chat paths.                                                          |
| `localStorage`                                 | Keys `cqm.state` (preferences + RNG seed) and `cqm.audit.v1` (local audit ring). No credentials, no PII. Loads are versioned and corrupt-tolerant (`load()` never throws).                                             |
| Cookies / auth / PII                           | None. The app has no accounts and collects nothing.                                                                                                                                                                    |

## Hardening checklist for public deployments

The dev server is meant for `localhost`. If you expose it:

1. **Escape audit output.** Treat every field of `POST /api/audit` bodies as
   hostile when rendering the `GET /api/audit` fragment.
2. **Body caps + rate-limiting are now built in** on `POST /api/audit` (8 KB →
   413; a 60-burst / 30-per-second token bucket → 429), so the ring can't be
   flood-evicted and parse CPU is bounded. For a multi-tenant/public deploy,
   additionally key the limit **per client IP** (`server.requestIP`) and/or
   require auth — the ring is otherwise world-writable by design.
3. **Serve over HTTPS** behind a reverse proxy; the Web Audio and pointer APIs
   the app uses behave better in secure contexts anyway.
4. **`nosniff` + `Referrer-Policy: no-referrer` are now built in** on every
   response the server constructs (the JSON API + the `GET /api/audit` HTML
   fragment). Still **add a CSP** for a public deploy — the app needs
   `script-src 'self'`, `style-src 'self'`, and `connect-src 'self'
https://api.llm7.io` (the keyless default the optional ✦ AI side-chat calls
   from the browser; add any other free-LLM origins you enable in the picker).
   Scripts, styles, and fonts are self-hosted (fonts via Fontsource), so that
   LLM endpoint is the **only** third-party origin the app reaches at runtime.
   Treat the side-chat as public — it sends the user's prompt to that
   third-party model, so do not paste secrets into it. CSP + `X-Frame-Options`
   are left to the deploy layer because they can break the bundled shell / an
   embedding iframe and need testing against your host.
5. **Pin dependencies** with the committed `bun.lock` and run `bun run check`
   before deploying.

## Out of scope

- Denial of service via WebGL workload on the visitor's own GPU.
- Issues only reproducible with a modified client.
- The legacy prototype in `legacy/` (kept verbatim as a historical artifact;
  it is not served).
