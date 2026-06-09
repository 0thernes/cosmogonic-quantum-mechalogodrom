# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a vulnerability

Email **0_0@0thernes.art** with a description, reproduction steps, and impact
assessment. Please do **not** open a public issue for security reports.

- You will receive an acknowledgement within 7 days.
- We aim to ship a fix or mitigation within 90 days of triage.
- Coordinated disclosure is appreciated; credit is given unless you opt out.

## Threat model

This is a client-side WebGL simulation fronted by a deliberately tiny Bun
server. Know the surface before deploying it anywhere public:

| Surface                 | Notes                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /` and `GET /docs` | Static, bundled HTML. No templating of user input.                                                                                                                                           |
| `GET /api/health`       | Returns `{ ok, uptime, version }`. No secrets.                                                                                                                                               |
| `POST /api/audit`       | Unauthenticated. Appends `{ action, detail?, ts }` to an in-memory ring capped at 200 entries. Nothing is persisted server-side.                                                             |
| `GET /api/audit`        | Returns an **HTML fragment** rendered from ring entries for HTMX polling. Entries originate from `POST /api/audit`, so all fields MUST be HTML-escaped at render time to prevent stored XSS. |
| `localStorage`          | Keys `cqm.state` (preferences + RNG seed) and `cqm.audit.v1` (local audit ring). No credentials, no PII. Loads are versioned and corrupt-tolerant (`load()` never throws).                   |
| Cookies / auth / PII    | None. The app has no accounts and collects nothing.                                                                                                                                          |

## Hardening checklist for public deployments

The dev server is meant for `localhost`. If you expose it:

1. **Escape audit output.** Treat every field of `POST /api/audit` bodies as
   hostile when rendering the `GET /api/audit` fragment.
2. **Cap request bodies** on `POST /api/audit` (a few KB) and rate-limit the
   endpoint; the ring is memory-bounded but parsing is not free.
3. **Serve over HTTPS** behind a reverse proxy; the Web Audio and pointer APIs
   the app uses behave better in secure contexts anyway.
4. **Add a CSP.** The app needs `script-src 'self'`, `style-src 'self'`, and
   `connect-src 'self'`; it loads no third-party origins at runtime (fonts are
   self-hosted via Fontsource).
5. **Pin dependencies** with the committed `bun.lock` and run `bun run check`
   before deploying.

## Out of scope

- Denial of service via WebGL workload on the visitor's own GPU.
- Issues only reproducible with a modified client.
- The legacy prototype in `legacy/` (kept verbatim as a historical artifact;
  it is not served).
