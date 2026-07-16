/**
 * Bun fullstack server for the Cosmogonic Quantum Mechalogodrom.
 *
 * Routes:
 * - `/`               → bundled app shell (`index.html`, scripts/styles bundled by Bun)
 * - `/docs`           → bundled architecture docs (`docs.html`, mermaid diagrams)
 * - `/lab`            → the self-contained p5.js lab artifact, served as a static
 *                       file (deliberately NOT bundled — it is CDN-only by design)
 * - `/lab/consciousness` and `/api/consciousness-lab`
 *                     → static consciousness-indicator dashboard + deterministic JSON feed
 * - `/lab/sentience` and `/api/sentience-lab`
 *                     → headless mass-run sentience analytics dashboard + deterministic JSON feed
 * - `GET  /api/health`→ JSON `{ ok, uptime, version }`
 * - `GET  /api/audit` → HTML fragment (`<ol>` of recent audit entries, newest first)
 *                       polled by the HTMX audit panel every 5s
 * - `POST /api/audit` → append `{ action, detail?, ts }` into a 200-entry in-memory ring
 *                       (detail serialized + truncated at storage time; bodies over
 *                       `MAX_BODY_LEN` are rejected with 413; flooding callers get 429 —
 *                       a token bucket shields the ring from eviction-spam)
 * - `/workers/simulation-worker.js`
 *                     → the pre-bundled wilderness worker (dist artifact, else bundled on the fly)
 * - anything else     → 404
 *
 * Tailwind is applied to the HTML bundles via `bun-plugin-tailwind` (see bunfig.toml).
 */
import index from './index.html';
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
import type { BunFile } from 'bun';

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
 * commands. It is therefore explicit-opt-in in every environment, so a documented `bun start` with
 * no environment configuration cannot expose the tool surface accidentally.
 */
export function copilotEnabled(value: string | undefined): boolean {
  return value === '1';
}

export function developmentMode(value: string | undefined): boolean {
  return value === 'development';
}

const COPILOT_ENABLED = copilotEnabled(process.env.COPILOT_ENABLED);

/** Maximum number of audit entries retained in memory (matches the client-side cap). */
const AUDIT_CAP = 200;

/** Longest `action` string stored — defends the ring against hostile payloads. */
const MAX_ACTION_LEN = 120;

/** Longest serialized `detail` STORED per entry (cap applied at parse time, not just render). */
const MAX_DETAIL_LEN = 400;

/** Longest accepted `POST /api/audit` body in bytes; over ⇒ 413. */
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

/** In-memory waitlist (Ventures scaffold — not persisted; export via logs only). */
const WAITLIST_CAP = 500;
const waitlistRing: { email: string; ts: number; tier?: string }[] = [];

interface RateLimiter {
  tryRemove(now: number): boolean;
}

const waitlistLimiters = new Map<string, RateLimiter>();
const auditPostLimiters = new Map<string, RateLimiter>();
const chatLimiters = new Map<string, RateLimiter>();
const toolLimiters = new Map<string, RateLimiter>();
const healthLimiters = new Map<string, RateLimiter>();
const MAX_LIMITER_KEYS = 1024;

function tryRemoveForClient(
  buckets: Map<string, RateLimiter>,
  key: string,
  capacity: number,
  refillPerSec: number,
  now = Date.now(),
): boolean {
  if (!buckets.has(key)) {
    if (buckets.size >= MAX_LIMITER_KEYS) buckets.delete(buckets.keys().next().value ?? '');
    buckets.set(key, makeRateLimiter(capacity, refillPerSec));
  }
  return buckets.get(key)?.tryRemove(now) ?? false;
}

export function redactEmailForLog(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0 || at === email.length - 1) return '[redacted-email]';
  return `${email[0] ?? '*'}***${email.slice(at)}`;
}

/** Parse POST /api/waitlist body — email required, optional tier tag. */
export function parseWaitlistBody(body: unknown): { email: string; tier?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { email?: unknown; tier?: unknown };
  if (typeof b.email !== 'string') return null;
  const email = b.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  const tier = typeof b.tier === 'string' ? b.tier.trim().slice(0, 32) : undefined;
  return { email, tier };
}

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
export function makeRateLimiter(capacity: number, refillPerSec: number): RateLimiter {
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
 * Token bucket guarding POST /api/audit: a 60-request burst, refilling 30/s. The browser client
 * independently rate-shapes its best-effort mirror because accelerated simulation events can emit
 * faster than a human. This server-side bucket still caps a direct ring-eviction flood: an
 * unauthenticated client can no longer evict all 200 real entries (and burn parse CPU) with a tight
 * POST loop. Buckets are keyed per client IP in the server route, so one noisy caller no longer drains
 * every user's allowance.
 */
const AUDIT_POST_BURST = 60;
const AUDIT_POST_REFILL_PER_SEC = 30;
const WAITLIST_BURST = 8;
const WAITLIST_REFILL_PER_SEC = 1;
const CHAT_BURST = 12;
const CHAT_REFILL_PER_SEC = 0.25;
const TOOL_BURST = 8;
const TOOL_REFILL_PER_SEC = 0.2;
const HEALTH_BURST = 10;
const HEALTH_REFILL_PER_SEC = 0.2;

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
export async function readJsonBody(
  req: Request,
  cap: number,
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const byteCap = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 0;
  const declared = req.headers.get('content-length');
  if (declared !== null && Number.isFinite(Number(declared)) && Number(declared) > byteCap) {
    return { ok: false, status: 413, error: 'body too large' };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const body = req.body;
  if (body !== null) {
    const reader = body.getReader();
    let unreadable = false;
    let oversized = false;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        const value = part.value;
        total += value.byteLength;
        if (total > byteCap) {
          oversized = true;
          // Cancellation is best-effort and MUST NOT delay the 413 if an underlying stream's cancel
          // hook stalls. No more chunks are read or retained after this point.
          void reader.cancel('body too large').catch(() => {});
          break;
        }
        chunks.push(value);
      }
    } catch {
      unreadable = true;
      // The 400 should not wait on a broken stream's cancellation hook.
      void reader.cancel('unreadable body').catch(() => {});
    } finally {
      reader.releaseLock();
    }
    if (oversized) return { ok: false, status: 413, error: 'body too large' };
    if (unreadable) return { ok: false, status: 400, error: 'unreadable body' };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
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
  if (origin === null) return true;
  if (origin === 'null') return false;
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
const HTML_ROOT = new URL('./dist/', import.meta.url);
const REPORT_ASSETS_ROOT = new URL('./docs/reports/assets/', import.meta.url);

function svgAssetFromPath(pathname: string, prefix: string): BunFile | null {
  if (!pathname.startsWith(prefix) || !pathname.endsWith('.svg')) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }
  if (
    rel.length === 0 ||
    rel.includes('\\') ||
    rel.split('/').some((part) => part.length === 0 || part === '..')
  ) {
    return null;
  }
  return Bun.file(new URL(rel, REPORT_ASSETS_ROOT));
}

/**
 * The repo `docs/` tree, read-only — the EVIDENCE every documentary surface cites.
 *
 * /docs, /spec, /bible and all three lab pages link their receipts as `./docs/<file>.md` and
 * `./docs/reports/assets/<file>.json|.csv`, and every one of those 404'd: the only docs route was
 * {@link svgAssetFromPath}, which serves `/docs/reports/assets/**` and ONLY `.svg`. So the reports,
 * dashboards, ledgers and benchmark data the pages present as their proof were unreachable on the
 * host that serves those pages — a dead citation on every claim, in a project whose whole ethos is
 * receipts. The files were on disk the entire time; nothing routed to them.
 *
 * Read-only and allowlisted by extension: documents and data, never source. Traversal is rejected
 * rather than normalized — any `..`, backslash or empty segment fails closed, and the resolved URL
 * must still sit under DOCS_ROOT (belt and braces: catches encoded escapes the segment check misses).
 * `/docs` exact stays the HTML page — this only ever matches the `/docs/` subtree.
 */
const DOCS_ROOT = new URL('./docs/', import.meta.url);
const DOCS_FILE_TYPES: Record<string, string> = {
  md: 'text/markdown; charset=utf-8',
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  svg: 'image/svg+xml; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
};
function docsFileFromPath(pathname: string): { file: BunFile; type: string } | null {
  if (!pathname.startsWith('/docs/')) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(pathname.slice('/docs/'.length));
  } catch {
    return null;
  }
  if (
    rel.length === 0 ||
    rel.includes('\\') ||
    rel.includes('\0') ||
    rel.split('/').some((part) => part.length === 0 || part === '..' || part === '.')
  ) {
    return null;
  }
  const type = DOCS_FILE_TYPES[rel.slice(rel.lastIndexOf('.') + 1).toLowerCase()];
  if (!type) return null;
  const url = new URL(rel, DOCS_ROOT);
  if (!url.href.startsWith(DOCS_ROOT.href)) return null;
  return { file: Bun.file(url), type };
}

/**
 * Hashed build assets at the dist/ root, for the statically-served surfaces.
 *
 * `/docs`, `/spec` and `/bible` are served straight out of dist/ by {@link serveHtml}, so their
 * markup carries the hashed entry the bundler emitted (`<script src="./chunk-fpdgmsjv.js">`).
 * `/` is different: it is a Bun HTML import, so the dev bundler owns that graph and serves its
 * chunks itself. Nothing served dist/'s own chunks, so all three static surfaces loaded with ZERO
 * javascript — the mermaid ERD/ERM/ERP diagrams and the ALife metric gallery rendered as blank
 * boxes (`pre.mermaid` is `color: transparent` until mermaid stamps data-processed) while the HTML
 * around them looked perfectly healthy.
 *
 * Matches a SINGLE path segment only — the pattern admits no '/', so no traversal is expressible
 * and the leading-dot guard keeps dotfiles out.
 */
const DIST_ASSET_PATH = /^\/(?!\.)[A-Za-z0-9._-]+\.(?:js|css|map|woff2?)$/;
function distAssetFromPath(pathname: string): { file: BunFile; type: string } | null {
  if (!DIST_ASSET_PATH.test(pathname)) return null;
  const name = pathname.slice(1);
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const type =
    ext === 'css'
      ? 'text/css; charset=utf-8'
      : ext === 'map'
        ? 'application/json; charset=utf-8'
        : ext === 'woff2'
          ? 'font/woff2'
          : ext === 'woff'
            ? 'font/woff'
            : 'application/javascript; charset=utf-8';
  return { file: Bun.file(new URL(name, HTML_ROOT)), type };
}

/**
 * The simulation worker must be served PRE-BUNDLED: world.ts resolves
 * `new URL('./workers/simulation-worker.js', import.meta.url)` against the served chunk origin,
 * and Bun's HTML bundler does not follow `new Worker(...)` graphs (the raw `.ts` path 404'd, so
 * every worker lineage died on startup and a 24-core machine ran the sim main-thread-only).
 * Prefers the build artifact (dist/); falls back to bundling the TS entry on the fly so a plain
 * `bun server.ts` without a prior `bun run build` still gets live workers. The fallback bundle is
 * cached per process — `bun --hot` resets it when server.ts reloads, and the pool requests the
 * script once per spawned worker (~cores), so rebuilding per request would be pure waste.
 */
let workerFallbackBundle: Promise<string | null> | null = null;
async function simulationWorkerJs(): Promise<string | null> {
  const dist = Bun.file(new URL('./dist/workers/simulation-worker.js', import.meta.url));
  if (await dist.exists()) return dist.text();
  workerFallbackBundle ??= (async () => {
    const entry = Bun.fileURLToPath(new URL('./src/workers/simulation-worker.ts', import.meta.url));
    const built = await Bun.build({ entrypoints: [entry], target: 'browser' });
    const output = built.outputs[0];
    if (!built.success || !output) {
      log.warn('simulation-worker bundle failed — worker pool will fall back to sync');
      for (const message of built.logs) log.warn(String(message));
      return null;
    }
    return output.text();
  })();
  return workerFallbackBundle;
}

function serveHtml(path: string): (req: Request) => Promise<Response> {
  return async (req) => {
    const file = Bun.file(new URL(path, HTML_ROOT));
    if (!(await file.exists())) {
      log.warn(`${path} not found in dist/ — run \`bun run build\` first`);
      return new Response('Not built yet — run `bun run build` first', { status: 503 });
    }
    logRequest(req, 200);
    return new Response(file, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  };
}

if (import.meta.main) {
  const server = Bun.serve({
    port: Number(process.env.PORT) || 3000,
    development: developmentMode(process.env.NODE_ENV),
    routes: {
      '/': index,
      '/docs': serveHtml('docs.html'),
      '/spec': serveHtml('specs.html'),
      '/bible': serveHtml('bible.html'),
      '/lab': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/quantum-wildbeyond.html', import.meta.url)), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
      }),
      '/lab/consciousness': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/consciousness.html', import.meta.url)), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
      }),
      '/lab/consciousness-data.json': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/consciousness-data.json', import.meta.url)), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        },
      }),
      '/api/consciousness-lab': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/consciousness-data.json', import.meta.url)), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        },
      }),
      '/lab/sentience': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/sentience.html', import.meta.url)), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
      }),
      '/lab/sentience-data.json': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/sentience-data.json', import.meta.url)), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        },
      }),
      '/api/sentience-lab': secured({
        GET(req) {
          logRequest(req, 200);
          return new Response(Bun.file(new URL('./lab/sentience-data.json', import.meta.url)), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        },
      }),
      '/workers/simulation-worker.js': secured({
        async GET(req) {
          const js = await simulationWorkerJs();
          if (js === null) {
            logRequest(req, 503);
            return new Response('worker bundle unavailable', { status: 503 });
          }
          logRequest(req, 200);
          return new Response(js, {
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
          });
        },
      }),
      '/api/health': secured({
        GET(req) {
          logRequest(req, 200);
          return Response.json({ ok: true, uptime: process.uptime(), version: VERSION });
        },
      }),
      '/api/ventures': secured({
        GET(req) {
          logRequest(req, 200);
          return Response.json({
            ok: true,
            version: VERSION,
            horizon: 'ventures',
            doc: '/ROADMAP-2026-06-26.md',
            milestones: [
              'hosted-deploy',
              'waitlist',
              'cloud-profiles',
              'multiplayer-10',
              'monetization',
              'peer-review-study',
              'institution-outreach',
            ],
            waitlistSize: waitlistRing.length,
          });
        },
      }),
      '/api/waitlist': secured({
        async POST(req) {
          const client = server.requestIP(req)?.address ?? 'unknown';
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'forbidden origin' }, { status: 403 });
          }
          if (
            !tryRemoveForClient(waitlistLimiters, client, WAITLIST_BURST, WAITLIST_REFILL_PER_SEC)
          ) {
            logRequest(req, 429);
            return Response.json({ ok: false, error: 'rate limited' }, { status: 429 });
          }
          const body = await readJsonBody(req, 512);
          if (!body.ok) {
            logRequest(req, body.status);
            return Response.json({ ok: false, error: body.error }, { status: body.status });
          }
          const entry = parseWaitlistBody(body.value);
          if (!entry) {
            logRequest(req, 400);
            return Response.json(
              { ok: false, error: 'expected { email: string, tier?: string }' },
              { status: 400 },
            );
          }
          if (waitlistRing.length >= WAITLIST_CAP) waitlistRing.shift();
          waitlistRing.push({ ...entry, ts: Date.now() });
          log.info(
            `waitlist +1 ${redactEmailForLog(entry.email)}${entry.tier ? ` (${entry.tier})` : ''}`,
          );
          logRequest(req, 202);
          return Response.json(
            { ok: true, accepted: true, queue: waitlistRing.length },
            { status: 202 },
          );
        },
      }),
      '/api/audit': secured({
        GET(req) {
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return new Response('Forbidden', { status: 403 });
          }
          logRequest(req, 200);
          return new Response(renderAuditFragment(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        },
        async POST(req) {
          const client = server.requestIP(req)?.address ?? 'unknown';
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'forbidden origin' }, { status: 403 });
          }
          // Shed floods BEFORE any work: a tight unauthenticated POST loop would otherwise evict
          // the whole 200-entry ring and burn parse CPU. The bucket is generous enough that real
          // the rate-shaped first-party audit mirror should not reach it — see AuditTrail.
          if (
            !tryRemoveForClient(
              auditPostLimiters,
              client,
              AUDIT_POST_BURST,
              AUDIT_POST_REFILL_PER_SEC,
            )
          ) {
            logRequest(req, 429);
            return Response.json(
              { ok: false, error: 'rate limited' },
              { status: 429, headers: { 'Retry-After': '1' } },
            );
          }
          const body = await readJsonBody(req, MAX_BODY_LEN);
          if (!body.ok) {
            logRequest(req, body.status);
            return Response.json({ ok: false, error: body.error }, { status: body.status });
          }
          const entry = parseAuditBody(body.value);
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
          const client = server.requestIP(req)?.address ?? 'unknown';
          if (!tryRemoveForClient(healthLimiters, client, HEALTH_BURST, HEALTH_REFILL_PER_SEC)) {
            logRequest(req, 429);
            return Response.json({ ok: false, error: 'rate limited' }, { status: 429 });
          }
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
          const client = server.requestIP(req)?.address ?? 'unknown';
          if (!COPILOT_ENABLED) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'copilot disabled' }, { status: 403 });
          }
          // Same-origin guard (mirrors /api/audit + /api/waitlist): a cross-site page in the same
          // browser must not be able to drive the model or its read-only sandbox tools via a forged
          // POST. Missing Origin (same-origin app fetch) is allowed; a foreign Origin is rejected.
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'cross-origin POST denied' }, { status: 403 });
          }
          if (!tryRemoveForClient(chatLimiters, client, CHAT_BURST, CHAT_REFILL_PER_SEC)) {
            logRequest(req, 429);
            return Response.json({ ok: false, error: 'rate limited' }, { status: 429 });
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
          const result = await runAgent(messages, provider, { signal: req.signal });
          logRequest(req, 200);
          return Response.json(result);
        },
      }),
      '/api/tool': secured({
        // Direct read-only tool call for the chat panel's manual terminal (/read /ls /grep /run).
        // Every call passes through the same default-deny ai-sandbox gate.
        async POST(req) {
          const client = server.requestIP(req)?.address ?? 'unknown';
          if (!COPILOT_ENABLED) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'copilot disabled' }, { status: 403 });
          }
          // Same-origin guard (mirrors /api/audit): block cross-site CSRF POSTs to the read-only
          // tool endpoint.
          if (!auditPostOriginAllowed(req)) {
            logRequest(req, 403);
            return Response.json({ ok: false, error: 'cross-origin POST denied' }, { status: 403 });
          }
          if (!tryRemoveForClient(toolLimiters, client, TOOL_BURST, TOOL_REFILL_PER_SEC)) {
            logRequest(req, 429);
            return Response.json({ ok: false, error: 'rate limited' }, { status: 429 });
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
    fetch: async (req) => {
      const url = new URL(req.url);
      const p = url.pathname;
      if (p.startsWith('/docs/reports/assets/') && p.endsWith('.svg')) {
        const file = svgAssetFromPath(p, '/docs/reports/assets/');
        if (!file || !(await file.exists())) {
          logRequest(req, 404);
          return withSecurityHeaders(new Response('Not Found', { status: 404 }));
        }
        logRequest(req, 200);
        return withSecurityHeaders(
          new Response(file, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } }),
        );
      }
      // The docs/ tree (md/json/csv/svg/xml/txt/html) — the receipts every surface cites. Runs after
      // the assets/*.svg handler above, which it would otherwise subsume, so that route keeps owning
      // its own 404 shape.
      const docsFile = docsFileFromPath(p);
      if (docsFile) {
        if (!(await docsFile.file.exists())) {
          logRequest(req, 404);
          return withSecurityHeaders(new Response('Not Found', { status: 404 }));
        }
        logRequest(req, 200);
        return withSecurityHeaders(
          new Response(docsFile.file, { headers: { 'Content-Type': docsFile.type } }),
        );
      }
      if (p.startsWith('/assets/alife/') && p.endsWith('.svg')) {
        const file = svgAssetFromPath(p, '/assets/alife/');
        if (!file || !(await file.exists())) {
          logRequest(req, 404);
          return withSecurityHeaders(new Response('Not Found', { status: 404 }));
        }
        logRequest(req, 200);
        return withSecurityHeaders(
          new Response(file, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } }),
        );
      }
      if (p === '/satellite-music.js') {
        const dist = Bun.file(new URL('./dist/satellite-music.js', import.meta.url));
        if (await dist.exists()) {
          logRequest(req, 200);
          return withSecurityHeaders(
            new Response(dist, {
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            }),
          );
        }
        // Dev fallback: transpile the TS source on the fly so the lab page still gets the music
        // widget without a manual `bun run build`.
        const srcPath = new URL('./src/satellite-music.ts', import.meta.url);
        const src = Bun.file(srcPath);
        if (await src.exists()) {
          const transpiler = new Bun.Transpiler();
          const source = await src.text();
          const out = await transpiler.transform(source, 'ts');
          logRequest(req, 200);
          return withSecurityHeaders(
            new Response(out, {
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            }),
          );
        }
      }
      if (p === '/alife-gallery.js') {
        const file = Bun.file(new URL('./dist/alife-gallery.js', import.meta.url));
        if (await file.exists()) {
          logRequest(req, 200);
          return withSecurityHeaders(
            new Response(file, {
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            }),
          );
        }
      }
      // Hashed chunks/styles for the dist-served surfaces (/docs, /spec, /bible). Runs AFTER the
      // named handlers above so `/alife-gallery.js` + `/satellite-music.js` keep their dev
      // source-transpile fallbacks; content-hashed names are immutable by construction.
      const distAsset = distAssetFromPath(p);
      if (distAsset && (await distAsset.file.exists())) {
        logRequest(req, 200);
        return withSecurityHeaders(
          new Response(distAsset.file, {
            headers: {
              'Content-Type': distAsset.type,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          }),
        );
      }
      if (p.startsWith('/textures/')) {
        const rel = p.slice('/textures/'.length);
        if (rel.includes('..') || rel.includes('\\') || rel.includes('\0')) {
          logRequest(req, 404);
          return withSecurityHeaders(new Response('Not Found', { status: 404 }));
        }
        const file = Bun.file(new URL(`./public/textures/${rel}`, import.meta.url));
        if (await file.exists()) {
          const ext = rel.split('.').pop()?.toLowerCase() ?? '';
          const ct =
            ext === 'png'
              ? 'image/png'
              : ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'webp'
                  ? 'image/webp'
                  : 'application/octet-stream';
          logRequest(req, 200);
          return withSecurityHeaders(new Response(file, { headers: { 'Content-Type': ct } }));
        }
      }
      logRequest(req, 404);
      return withSecurityHeaders(new Response('Not Found', { status: 404 }));
    },
  });

  log.info(`mechalogodrom listening on ${server.url.href}`);
}
