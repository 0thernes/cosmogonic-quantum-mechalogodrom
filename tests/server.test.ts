/**
 * Boundary tests for the server-side wire parsers (server.ts). These narrow UNTRUSTED POST bodies
 * before they reach the in-memory audit ring / the Copilot — security-relevant input validation that
 * the 500-point pass found untested (finding TEST-SRV). `server.ts` guards `Bun.serve` behind
 * `import.meta.main`, so importing it here opens no socket and the suite stays hermetic.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  auditPostOriginAllowed,
  makeRateLimiter,
  parseAuditBody,
  parseChatMessages,
  parseWaitlistBody,
  readJsonBody,
  redactEmailForLog,
  withSecurityHeaders,
} from '../server';

const serverSource = readFileSync(resolve(import.meta.dir, '..', 'server.ts'), 'utf8');

describe('parseAuditBody — audit POST body narrowing', () => {
  test('accepts a minimal valid body and stamps a finite ts', () => {
    const e = parseAuditBody({ action: 'split' });
    expect(e).not.toBeNull();
    expect(e?.action).toBe('split');
    expect(Number.isFinite(e?.ts)).toBe(true);
    expect(e?.detailJson).toBeUndefined();
  });

  test('rejects non-object / array / null / missing-or-empty action', () => {
    expect(parseAuditBody(null)).toBeNull();
    expect(parseAuditBody([1, 2])).toBeNull();
    expect(parseAuditBody('str')).toBeNull();
    expect(parseAuditBody(42)).toBeNull();
    expect(parseAuditBody({})).toBeNull();
    expect(parseAuditBody({ action: '' })).toBeNull();
    expect(parseAuditBody({ action: 123 })).toBeNull();
  });

  test('truncates an over-long action to the storage cap', () => {
    const e = parseAuditBody({ action: 'x'.repeat(500) });
    expect(e).not.toBeNull();
    expect(e!.action.length).toBeLessThanOrEqual(120);
  });

  test('serializes + bounds a valid detail object; rejects non-object detail', () => {
    const ok = parseAuditBody({ action: 'a', detail: { k: 'v' } });
    expect(ok?.detailJson).toContain('"k"');
    expect(ok?.detailJson?.length ?? 0).toBeLessThanOrEqual(400);
    expect(parseAuditBody({ action: 'a', detail: 'nope' })).toBeNull();
    expect(parseAuditBody({ action: 'a', detail: [1] })).toBeNull();
  });

  test('a huge detail object is truncated to the storage cap (no unbounded retention)', () => {
    const e = parseAuditBody({ action: 'a', detail: { blob: 'y'.repeat(5000) } });
    expect(e).not.toBeNull();
    expect(e!.detailJson!.length).toBeLessThanOrEqual(400);
  });

  test('an out-of-range ts falls back to a finite wall-clock value', () => {
    const e = parseAuditBody({ action: 'a', ts: 1e30 });
    expect(e).not.toBeNull();
    expect(Number.isFinite(e!.ts)).toBe(true);
    expect(Math.abs(e!.ts)).toBeLessThan(1e16); // within the valid Date range, not the hostile 1e30
  });

  test('a valid in-range ts is preserved', () => {
    const e = parseAuditBody({ action: 'a', ts: 1700000000000 });
    expect(e?.ts).toBe(1700000000000);
  });
});

describe('parseWaitlistBody — ventures waitlist POST narrowing', () => {
  test('accepts a valid email and normalizes case', () => {
    const e = parseWaitlistBody({ email: ' Player@Example.COM ' });
    expect(e?.email).toBe('player@example.com');
  });

  test('accepts optional tier tag', () => {
    const e = parseWaitlistBody({ email: 'a@b.co', tier: ' edu ' });
    expect(e?.tier).toBe('edu');
  });

  test('rejects invalid email shapes', () => {
    expect(parseWaitlistBody(null)).toBeNull();
    expect(parseWaitlistBody({ email: 'not-an-email' })).toBeNull();
    expect(parseWaitlistBody({ email: 'x'.repeat(200) + '@y.co' })).toBeNull();
  });

  test('redacts waitlist emails before they enter logs', () => {
    expect(redactEmailForLog('player@example.com')).toBe('p***@example.com');
    expect(redactEmailForLog('ab@example.com')).toBe('a***@example.com');
    expect(redactEmailForLog('bad-shape')).toBe('[redacted-email]');
  });
});

describe('parseChatMessages — chat POST body narrowing', () => {
  test('accepts a valid array with all three roles', () => {
    const ms = parseChatMessages({
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'yo' },
      ],
    });
    expect(ms).not.toBeNull();
    expect(ms!.length).toBe(3);
    expect(ms![0]!.role).toBe('system');
  });

  test('rejects non-object, missing / empty / oversized arrays', () => {
    expect(parseChatMessages(null)).toBeNull();
    expect(parseChatMessages({})).toBeNull();
    expect(parseChatMessages({ messages: 'no' })).toBeNull();
    expect(parseChatMessages({ messages: [] })).toBeNull();
    const tooMany = {
      messages: Array.from({ length: 101 }, () => ({ role: 'user', content: 'x' })),
    };
    expect(parseChatMessages(tooMany)).toBeNull();
  });

  test('rejects an invalid role, non-string content, or non-object element', () => {
    expect(parseChatMessages({ messages: [{ role: 'root', content: 'x' }] })).toBeNull();
    expect(parseChatMessages({ messages: [{ role: 'user', content: 5 }] })).toBeNull();
    expect(parseChatMessages({ messages: [{ role: 'user' }] })).toBeNull();
    expect(parseChatMessages({ messages: [null] })).toBeNull();
  });

  test('truncates over-long content to the 32 KiB cap', () => {
    const ms = parseChatMessages({ messages: [{ role: 'user', content: 'z'.repeat(40000) }] });
    expect(ms).not.toBeNull();
    expect(ms![0]!.content.length).toBeLessThanOrEqual(32 * 1024);
  });
});

describe('makeRateLimiter — POST /api/audit flood seal (SERVER-RL)', () => {
  test('a fresh bucket allows exactly its burst capacity, then denies', () => {
    const rl = makeRateLimiter(5, 1);
    // Same instant (no refill): the first 5 succeed, the 6th is shed.
    for (let i = 0; i < 5; i++) expect(rl.tryRemove(1000)).toBe(true);
    expect(rl.tryRemove(1000)).toBe(false);
  });

  test('tokens refill continuously at the configured rate', () => {
    const rl = makeRateLimiter(2, 10); // 10 tokens/sec
    expect(rl.tryRemove(0)).toBe(true);
    expect(rl.tryRemove(0)).toBe(true);
    expect(rl.tryRemove(0)).toBe(false); // bucket drained at t=0
    // 100 ms later → +1 token (10/s × 0.1s); one more call succeeds, the next is denied again.
    expect(rl.tryRemove(100)).toBe(true);
    expect(rl.tryRemove(100)).toBe(false);
  });

  test('refill is capped at capacity — idle time cannot bank unlimited burst', () => {
    const rl = makeRateLimiter(3, 100);
    // Idle for an hour: tokens saturate at capacity, not hours × rate.
    expect(rl.tryRemove(3_600_000)).toBe(true);
    expect(rl.tryRemove(3_600_000)).toBe(true);
    expect(rl.tryRemove(3_600_000)).toBe(true);
    expect(rl.tryRemove(3_600_000)).toBe(false);
  });

  test('the operator cadence (one post every few seconds) is never throttled', () => {
    // Production bucket shape: 60 burst, 30/s. A human posting an audit action every 2 s for a
    // long session must always be admitted — the seal only sheds machine-speed floods.
    const rl = makeRateLimiter(60, 30);
    for (let i = 0; i < 50; i++) expect(rl.tryRemove(i * 2000)).toBe(true);
  });
});

describe('auditPostOriginAllowed — same-origin POST guard', () => {
  test('allows missing Origin (same-origin fetch)', () => {
    expect(
      auditPostOriginAllowed(new Request('http://localhost:3000/api/audit', { method: 'POST' })),
    ).toBe(true);
  });

  test('allows matching Origin header', () => {
    expect(
      auditPostOriginAllowed(
        new Request('http://localhost:3000/api/audit', {
          method: 'POST',
          headers: { Origin: 'http://localhost:3000' },
        }),
      ),
    ).toBe(true);
  });

  test('rejects cross-origin Origin', () => {
    expect(
      auditPostOriginAllowed(
        new Request('http://localhost:3000/api/audit', {
          method: 'POST',
          headers: { Origin: 'https://evil.example' },
        }),
      ),
    ).toBe(false);
  });

  test('rejects null Origin from sandboxed or opaque-origin contexts', () => {
    expect(
      auditPostOriginAllowed(
        new Request('http://localhost:3000/api/audit', {
          method: 'POST',
          headers: { Origin: 'null' },
        }),
      ),
    ).toBe(false);
  });
});

describe('readJsonBody — size guard before buffering', () => {
  test('rejects declared oversized JSON bodies before reading', async () => {
    const r = await readJsonBody(
      new Request('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Length': '999999' },
        body: '{"email":"player@example.com"}',
      }),
      512,
    );
    expect(r).toEqual({ ok: false, status: 413, error: 'body too large' });
  });
});

describe('Copilot route guards — origin before quota', () => {
  function routeBlock(route: string): string {
    const start = serverSource.indexOf(`'${route}'`);
    const end = serverSource.indexOf('}),', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    return serverSource.slice(start, end);
  }

  test('/api/chat rejects hostile origins before spending rate-limit tokens', () => {
    const block = routeBlock('/api/chat');
    expect(block.indexOf('if (!auditPostOriginAllowed(req))')).toBeLessThan(
      block.indexOf('tryRemoveForClient(chatLimiters'),
    );
  });

  test('/api/tool rejects hostile origins before spending rate-limit tokens', () => {
    const block = routeBlock('/api/tool');
    expect(block.indexOf('if (!auditPostOriginAllowed(req))')).toBeLessThan(
      block.indexOf('tryRemoveForClient(toolLimiters'),
    );
  });
});

describe('static texture routes — pantheon equirect atlas (items 10/18)', () => {
  test('fetch handler serves /textures/ from public/textures with traversal guard', () => {
    expect(serverSource).toContain("p.startsWith('/textures/')");
    expect(serverSource).toContain('./public/textures/');
    expect(serverSource).toContain("rel.includes('..')");
  });
});

describe('static lab routes — consciousness and sentience feeds', () => {
  test('server publishes the headless sentience lab HTML and JSON feed', () => {
    expect(serverSource).toContain("'/lab/sentience'");
    expect(serverSource).toContain("'/lab/sentience-data.json'");
    expect(serverSource).toContain("'/api/sentience-lab'");
    expect(serverSource).toContain('./lab/sentience.html');
    expect(serverSource).toContain('./lab/sentience-data.json');
  });
});

describe('withSecurityHeaders — defense-in-depth response headers (RISK-05)', () => {
  test('adds nosniff + no-referrer while preserving status and existing headers', () => {
    const res = withSecurityHeaders(
      Response.json({ ok: true }, { status: 201, headers: { 'Retry-After': '1' } }),
    );
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Retry-After')).toBe('1'); // pre-existing header untouched
    expect(res.status).toBe(201);
  });

  test('mutates and returns the same response instance (so wrapped handlers stay zero-copy)', () => {
    const res = new Response('not found', { status: 404 });
    expect(withSecurityHeaders(res)).toBe(res);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
