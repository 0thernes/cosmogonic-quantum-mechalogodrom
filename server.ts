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
 *                       (detail serialized + truncated at storage time; bodies over
 *                       `MAX_BODY_LEN` are rejected with 413; flooding callers get 429 —
 *                       a token bucket shields the ring from eviction-spam)
 * - anything else     → 404
 *
 * Tailwind is applied to the HTML bundles via `bun-plugin-tailwind` (see bunfig.toml).
 */
import index from './index.html';
import docs from './docs.html';
import spec from './specs.html';
import { createLogger } from './src/logging/logger';
import {
  runAgent,
  providerLabel,
  availableProviders,
  probeProviders,
  healthVerdict,
  type ChatMessage,
} from './src/server/copilot';
import { dispatchTool } from './src/server/ai-sandbox';

const log = createLogger('server');

/**
 * Reported by `GET /api/health`. Derived from package.json at startup rather than hand-synced, so
 * the health version can never drift from the package (it previously had — the constant said 0.6.1
 * while the package was already 0.7.2). server.ts is run directly by Bun (never bundled), so the
 * top-level await + file read is evaluated exactly once at boot.
 */
const VERSION = (
  (await Bun.file(new URL('./package.json', import.meta.url)).json()) as { version: string }
).version;

/**
 * The Copilot (LLM side-chat + read-only tool sandbox) can read repo source and run read-only
 * commands. It is therefore OPT-IN and OFF by default in production, so a public/hosted deploy never
 * exposes proprietary source (audit CRITICAL/HIGH). Enabled in development, or when COPILOT_ENABLED=1
 * is set explicitly.
 */
const COPILOT_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.COPILOT_ENABLED === '1';

/** Maximum number of audit entries retained in memory (matches the client-side cap). */
const AUDIT_CAP = 200;

/** Longest `action` string stored — defends the ring against hostile payloads. */
const MAX_ACTION_LEN = 120;

/** Longest serialized `detail` STORED per entry (cap applied at parse time, not just render). */
const MAX_DETAIL_LEN = 400;

/** Longest accepted `POST /api/audit` body (declared bytes / read UTF-16 units); over ⇒ 413. */
const MAX_BODY_LEN = 8 * 1024;

/** Largest |ts| representable by `Date` (ECMA-262 time-value range); beyond it toISOString throws. */
const MAX_TS_MAGNITUDE = 8.64e15;

/**
 * Ring storage shape — distinct from the wire-format `AuditEntry`. `detail` is
 * serialized and truncated at parse time, so every stored entry is constant-
 * bounded: action ≤ MAX_ACTION_LEN chars, detailJson ≤ MAX_DETAIL_LEN chars,
 * ts within the valid Date range. The ring can never retain a reference to an
 * arbitrarily large hostile payload.
 */
interface StoredAuditEntry {
  ts: number;
  action: string;
  detailJson?: string;
}

/** Circular audit buffer. `auditHead` is the next write slot; `auditCount` ≤ AUDIT_CAP. O(1) push. */
const auditRing: (StoredAuditEntry | undefined)[] = Array.from({ length: AUDIT_CAP });
let auditHead = 0;
let auditCount = 0;

/** Append one entry to the ring, evicting the oldest once the cap is reached. O(1). */
function pushAudit(entry: StoredAuditEntry): void {
  auditRing[auditHead] = entry;
  auditHead = (auditHead + 1) % AUDIT_CAP;
  if (auditCount < AUDIT_CAP) auditCount++;
}

/**
 * Pure token-bucket rate limiter (the caller supplies the clock, so it is deterministic and
 * unit-testable without timers). `tryRemove(now)` refills continuously at `refillPerSec` up to
 * `capacity`, then consumes one token if any remain — returning false (deny) when the bucket is
 * empty. The first call seeds the clock, so a fresh bucket starts full. O(1).
 */
export function makeRateLimiter(
  capacity: number,
  refillPerSec: number,
): { tryRemove(now: number): boolean } {
  let tokens = capacity;
  let last = Number.NaN;
  return {
    tryRemove(now: number): boolean {
      if (Number.isNaN(last)) last = now;
      const dt = (now - last) / 1000;
      if (dt > 0) {
        tokens = Math.min(capacity, tokens + dt * refillPerSec);
        last = now;
      }
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    },
  };
}

/**
 * Token bucket guarding POST /api/audit: a 60-request burst, refilling 30/s. That is far above any
 * legitimate audit cadence (entries are user-action-driven — a human never posts dozens per
 * second), so the operator is never throttled, yet it caps the ring-eviction flood: an
 * unauthenticated client can no longer evict all 200 real entries (and burn parse CPU) with a tight
 * POST loop. A public/multi-tenant deploy should ALSO key this per client IP (`server.requestIP`)
 * and/or require auth — see SECURITY.md; this global bucket is the single-tenant DoS seal.
 */
const auditPostLimiter = makeRateLimiter(60, 30);

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
 * All user-controlled strings (action, detailJson) are HTML-escaped. Rendering is
 * fault-isolated per entry: one bad slot degrades to a placeholder `<li>` instead
 * of permanently 500ing the feed. O(n), n ≤ 200.
 */
function renderAuditFragment(): string {
  let out = '<ol>';
  for (let i = 0; i < auditCount; i++) {
    const slot = (auditHead - 1 - i + AUDIT_CAP) % AUDIT_CAP;
    const entry = auditRing[slot];
    if (!entry) break; // invariant: slots [0, auditCount) behind head are populated
    try {
      const iso = new Date(entry.ts).toISOString();
      const detail =
        entry.detailJson === undefined ? '' : ` <code>${escapeHtml(entry.detailJson)}</code>`;
      out += `<li><time datetime="${iso}">${iso.slice(11, 19)}</time> <strong>${escapeHtml(
        entry.action,
      )}</strong>${detail}</li>`;
    } catch {
      out += '<li><em>unrenderable audit entry</em></li>';
    }
  }
  return out + '</ol>';
}

/**
 * Narrow an unknown POST body (wire shape `{ action, detail?, ts? }`) to a
 * StoredAuditEntry; null when the shape is invalid. A `ts` outside the valid
 * Date range (|ts| > MAX_TS_MAGNITUDE) falls back to the current wall clock —
 * the same default applied when `ts` is missing. `detail` is serialized and
 * truncated HERE so the stored entry is constant-bounded.
 */
export function parseAuditBody(body: unknown): StoredAuditEntry | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const rec = body as Record<string, unknown>;
  const action = rec['action'];
  if (typeof action !== 'string' || action.length === 0) return null;
  const rawTs = rec['ts'];
  const ts =
    typeof rawTs === 'number' && Number.isFinite(rawTs) && Math.abs(rawTs) <= MAX_TS_MAGNITUDE
      ? rawTs
      : Date.now();
  const detail = rec['detail'];
  if (detail === undefined) return { ts, action: action.slice(0, MAX_ACTION_LEN) };
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) return null;
  // Truncate WITHOUT splitting a surrogate pair (audit fix): a hard .slice at a UTF-16
  // code-unit boundary can cut an astral-plane character (emoji etc.) in half, leaving a lone
  // high surrogate that renders as U+FFFD mojibake in the audit fragment forever after.
  let detailJson = JSON.stringify(detail).slice(0, MAX_DETAIL_LEN);
  const last = detailJson.charCodeAt(detailJson.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) detailJson = detailJson.slice(0, -1);
  return {
    ts,
    action: action.slice(0, MAX_ACTION_LEN),
    detailJson,
  };
}

/** One-line request log: method, path, response status. */
function logRequest(req: Request, status: number): void {
  log.info(`${req.method} ${new URL(req.url).pathname} -> ${status}`);
}

/** Longest accepted Copilot chat body — a conversation plus cited file snippets can be large. */
const MAX_CHAT_BODY = 256 * 1024;

/** Read, size-guard, and JSON-parse a POST body. Returns a tagged result (never throws). */
async function readJsonBody(
  req: Request,
  cap: number,
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const declared = req.headers.get('content-length');
  if (declared !== null && Number.isFinite(Number(declared)) && Number(declared) > cap) {
    return { ok: false, status: 413, error: 'body too large' };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: 'unreadable body' };
  }
  if (text.length > cap) return { ok: false, status: 413, error: 'body too large' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: 'invalid JSON' };
  }
}

/** Narrow an unknown body to a bounded {@link ChatMessage}[]; null when malformed. */
export function parseChatMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const arr = (body as Record<string, unknown>)['messages'];
  if (!Array.isArray(arr) || arr.length === 0 || arr.length > 100) return null;
  const out: ChatMessage[] = [];
  for (const m of arr) {
    if (typeof m !== 'object' || m === null) return null;
    const rec = m as Record<string, unknown>;
    const role = rec['role'];
    const content = rec['content'];
    if (
      (role !== 'user' && role !== 'assistant' && role !== 'system') ||
      typeof content !== 'string'
    ) {
      return null;
    }
    out.push({ role, content: content.slice(0, 32 * 1024) });
  }
  return out;
}

/**
 * Defense-in-depth headers added to every response THIS server constructs (RISK-05). `nosniff` stops
 * a browser MIME-confusing the user-data HTML audit fragment or the JSON API into something
 * executable; `no-referrer` keeps the local URL out of any outbound request. CSP + `X-Frame-Options`
 * are deliberately OMITTED — they are the public-deploy step (SECURITY.md) and would risk the bundled
 * app shell / the dev-preview iframe, whereas these two never change how any client renders the page.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** Stamp {@link SECURITY_HEADERS} onto a response in place and return it. O(1). */
export function withSecurityHeaders(res: Response): Response {
  for (const k in SECURITY_HEADERS) res.headers.set(k, SECURITY_HEADERS[k]!);
  return res;
}

/**
 * Same-origin guard for POST /api/audit. Allows missing Origin (same-origin fetch from the app)
 * and rejects cross-origin POST floods. O(1).
 */
export function auditPostOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (origin === null || origin === 'null') return true;
  try {
    const url = new URL(req.url);
    return origin === `${url.protocol}//${url.host}`;
  } catch {
    return false;
  }
}

/**
 * Wrap a Bun route handler-map so EVERY response it returns passes through {@link withSecurityHeaders}
 * exactly once — sync or async, every status code, with no per-return edits. Static HTML-bundle routes
 * (`/`, `/docs`, `/spec`) are served by Bun's bundler and keep their own headers; their CSP is the
 * documented deploy step.
 */
function secured<T extends Record<string, (req: Request) => Response | Promise<Response>>>(
  handlers: T,
): T {
  const out: Record<string, (req: Request) => Promise<Response>> = {};
  for (const method in handlers) {
    const fn = handlers[method]!;
    out[method] = (req: Request) => Promise.resolve(fn(req)).then(withSecurityHeaders);
  }
  return out as T;
}

// Start the HTTP server only when this file is run directly (`bun server.ts` / `bun --hot server.ts`).
// When imported — e.g. by unit tests of the pure body-parsers above — `import.meta.main` is false, so
// no socket is opened and the test process exits cleanly.
if (import.meta.main) {
  const server = Bun.serve({
    port: Number(process.env.PORT) || 3000,
    development: process.env.NODE_ENV !== 'production',
    routes: {
      '/': index,
      '/docs': docs,
      '/spec': spec,
      '/lab': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/quantum-wildbeyond.html', import.meta.url)), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
      }),
      '/api/health': secured({
        GET(req) {
          logRequest(req, 200);
          return Response.json({ ok: true, uptime: process.uptime(), version: VERSION });
        },
      }),
      '/api/audit': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(renderAuditFragment(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
        async POST(req) {
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'forbidden origin' }, { status: 403 });
          }
          // Shed floods BEFORE any work: a tight unauthenticated POST loop would otherwise evict
          // the whole 200-entry ring and burn parse CPU. The bucket is generous enough that real
          // user-action audit posts never reach it — see auditPostLimiter.
          if (!auditPostLimiter.tryRemove(Date.now())) {
            logRequest(req, 429);
            return Response.json(
              { ok: false, error: 'rate limited' },
              { status: 429, headers: { 'Retry-After': '1' } },
            );
          }
          // Reject oversized bodies before parsing: declared length first, then the
          // actual read (covers chunked/undeclared bodies and lying headers).
          const declared = req.headers.get('content-length');
          if (
            declared !== null &&
            Number.isFinite(Number(declared)) &&
            Number(declared) > MAX_BODY_LEN
          ) {
            logRequest(req, 413);
            return Response.json({ ok: false, error: 'body too large' }, { status: 413 });
          }
          let text: string;
          try {
            text = await req.text();
          } catch {
            logRequest(req, 400);
            return Response.json({ ok: false, error: 'unreadable body' }, { status: 400 });
          }
          if (text.length > MAX_BODY_LEN) {
            logRequest(req, 413);
            return Response.json({ ok: false, error: 'body too large' }, { status: 413 });
          }
          let body: unknown;
          try {
            body = JSON.parse(text);
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
      }),
      // ── Copilot (CONTRACTS V9): the free-LLM side-chat. Outside the deterministic sim. ──
      '/api/copilot': secured({
        // Report the active provider so the chat panel can show it (no secrets — label only).
        GET(req) {
          logRequest(req, 200);
          return Response.json({
            ok: true,
            enabled: COPILOT_ENABLED,
            provider: COPILOT_ENABLED ? providerLabel() : '',
            providers: COPILOT_ENABLED ? availableProviders() : [],
          });
        },
      }),
      // Diagnostics + recovery pipeline: live-probe every provider in the failover chain so the panel
      // can show WHY the AI is silent (rate-limited? auth? all down?) and offer a restart/re-probe.
      '/api/copilot/health': secured({
        async GET(req) {
          if (!COPILOT_ENABLED) {
            logRequest(req, 200);
            return Response.json({
              ok: true,
              enabled: false,
              reason:
                'disabled in this deployment — production gate is on (set COPILOT_ENABLED=1 to allow)',
              default: '',
              providers: [],
            });
          }
          const providers = await probeProviders();
          const verdict = healthVerdict(providers);
          logRequest(req, 200);
          return Response.json({
            ok: true,
            enabled: true,
            operational: verdict.operational,
            reason: verdict.summary,
            default: providerLabel(),
            providers,
          });
        },
      }),
      '/api/chat': secured({
        // Run one Copilot turn: the model may call read-only tools (read/list/grep/run) via the
        // ai-sandbox gate, then answers. Never writes to the repo or the sim.
        async POST(req) {
          if (!COPILOT_ENABLED) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'copilot disabled' }, { status: 403 });
          }
          const body = await readJsonBody(req, MAX_CHAT_BODY);
          if (!body.ok) {
            logRequest(req, body.status);
            return Response.json({ ok: false, error: body.error }, { status: body.status });
          }
          const messages = parseChatMessages(body.value);
          if (!messages) {
            logRequest(req, 400);
            return Response.json(
              { ok: false, error: 'expected { messages: { role, content }[] }' },
              { status: 400 },
            );
          }
          // Optional free-LLM picker (server resolves the id → endpoint+key; default-deny on unknown).
          const rec = (body.value ?? {}) as Record<string, unknown>;
          const provider = typeof rec['provider'] === 'string' ? rec['provider'] : undefined;
          const result = await runAgent(messages, provider);
          logRequest(req, 200);
          return Response.json(result);
        },
      }),
      '/api/tool': secured({
        // Direct read-only tool call for the chat panel's manual terminal (/read /ls /grep /run).
        // Every call passes through the same default-deny ai-sandbox gate.
        async POST(req) {
          if (!COPILOT_ENABLED) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'copilot disabled' }, { status: 403 });
          }
          const body = await readJsonBody(req, MAX_BODY_LEN);
          if (!body.ok) {
            logRequest(req, body.status);
            return Response.json({ ok: false, error: body.error }, { status: body.status });
          }
          const rec = (
            typeof body.value === 'object' && body.value !== null ? body.value : {}
          ) as Record<string, unknown>;
          const tool = typeof rec['tool'] === 'string' ? rec['tool'] : '';
          const args =
            typeof rec['args'] === 'object' && rec['args'] !== null
              ? (rec['args'] as Record<string, unknown>)
              : {};
          const result = await dispatchTool(tool, args);
          logRequest(req, result.ok ? 200 : 400);
          return Response.json(result, { status: result.ok ? 200 : 400 });
        },
      }),
    },
    fetch(req) {
      logRequest(req, 404);
      return withSecurityHeaders(new Response('Not Found', { status: 404 }));
    },
  });

  log.info(`mechalogodrom listening on ${server.url.href}`);
}
