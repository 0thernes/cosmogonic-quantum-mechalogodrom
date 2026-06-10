/**
 * Bun fullstack server for the Cosmogonic Quantum Mechalogodrom.
 *
 * Routes:
 * - `/`               → bundled app shell (`index.html`, scripts/styles bundled by Bun)
 * - `/docs`           → bundled architecture docs (`docs.html`, mermaid diagrams)
 * - `/lab`            → the self-contained p5.js lab artifact, served as a static
 *                       file (deliberately NOT bundled — it is CDN-only by design)
 * - `GET  /api/health`→ JSON `{ ok, uptime, version }`
 * - `GET  /api/audit` → HTML fragment (`<ol>` of recent audit entries, newest first)
 *                       polled by the HTMX audit panel every 5s
 * - `POST /api/audit` → append `{ action, detail?, ts }` into a 200-entry in-memory ring
 * - anything else     → 404
 *
 * Tailwind is applied to the HTML bundles via `bun-plugin-tailwind` (see bunfig.toml).
 */
import index from './index.html';
import docs from './docs.html';
import { createLogger } from './src/logging/logger';
import type { AuditEntry } from './src/types';

const log = createLogger('server');

/** Reported by `GET /api/health`; mirrors package.json `version`. */
const VERSION = '0.2.0';

/** Maximum number of audit entries retained in memory (matches the client-side cap). */
const AUDIT_CAP = 200;

/** Longest `action` string stored — defends the ring against hostile payloads. */
const MAX_ACTION_LEN = 120;

/** Longest serialized `detail` rendered into the fragment. */
const MAX_DETAIL_LEN = 400;

/** Circular audit buffer. `auditHead` is the next write slot; `auditCount` ≤ AUDIT_CAP. O(1) push. */
const auditRing: (AuditEntry | undefined)[] = Array.from({ length: AUDIT_CAP });
let auditHead = 0;
let auditCount = 0;

/** Append one entry to the ring, evicting the oldest once the cap is reached. O(1). */
function pushAudit(entry: AuditEntry): void {
  auditRing[auditHead] = entry;
  auditHead = (auditHead + 1) % AUDIT_CAP;
  if (auditCount < AUDIT_CAP) auditCount++;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape user-provided strings before interpolating them into the audit HTML fragment. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/**
 * Render the audit ring as an HTML fragment for HTMX: `<ol>` of `<li>`, newest first.
 * All user-controlled strings (action, detail) are HTML-escaped. O(n), n ≤ 200.
 */
function renderAuditFragment(): string {
  let out = '<ol>';
  for (let i = 0; i < auditCount; i++) {
    const slot = (auditHead - 1 - i + AUDIT_CAP) % AUDIT_CAP;
    const entry = auditRing[slot];
    if (!entry) break; // invariant: slots [0, auditCount) behind head are populated
    const iso = new Date(entry.ts).toISOString();
    const detail =
      entry.detail === undefined
        ? ''
        : ` <code>${escapeHtml(JSON.stringify(entry.detail).slice(0, MAX_DETAIL_LEN))}</code>`;
    out += `<li><time datetime="${iso}">${iso.slice(11, 19)}</time> <strong>${escapeHtml(
      entry.action,
    )}</strong>${detail}</li>`;
  }
  return out + '</ol>';
}

/** Narrow an unknown POST body to an AuditEntry; null when the shape is invalid. */
function parseAuditBody(body: unknown): AuditEntry | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const rec = body as Record<string, unknown>;
  const action = rec['action'];
  if (typeof action !== 'string' || action.length === 0) return null;
  const rawTs = rec['ts'];
  const ts = typeof rawTs === 'number' && Number.isFinite(rawTs) ? rawTs : Date.now();
  const detail = rec['detail'];
  if (detail === undefined) return { ts, action: action.slice(0, MAX_ACTION_LEN) };
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) return null;
  return {
    ts,
    action: action.slice(0, MAX_ACTION_LEN),
    detail: detail as Record<string, unknown>,
  };
}

/** One-line request log: method, path, response status. */
function logRequest(req: Request, status: number): void {
  log.info(`${req.method} ${new URL(req.url).pathname} -> ${status}`);
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  development: process.env.NODE_ENV !== 'production',
  routes: {
    '/': index,
    '/docs': docs,
    '/lab': {
      GET(req) {
        logRequest(req, 200);
        return new Response(Bun.file(new URL('./lab/quantum-wildbeyond.html', import.meta.url)), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      },
    },
    '/api/health': {
      GET(req) {
        logRequest(req, 200);
        return Response.json({ ok: true, uptime: process.uptime(), version: VERSION });
      },
    },
    '/api/audit': {
      GET(req) {
        logRequest(req, 200);
        return new Response(renderAuditFragment(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      },
      async POST(req) {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          logRequest(req, 400);
          return Response.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
        }
        const entry = parseAuditBody(body);
        if (!entry) {
          logRequest(req, 400);
          return Response.json(
            { ok: false, error: 'expected { action: string, detail?: object, ts?: number }' },
            { status: 400 },
          );
        }
        pushAudit(entry);
        logRequest(req, 201);
        return Response.json({ ok: true, retained: auditCount }, { status: 201 });
      },
    },
  },
  fetch(req) {
    logRequest(req, 404);
    return new Response('Not Found', { status: 404 });
  },
});

log.info(`mechalogodrom listening on ${server.url.href}`);
