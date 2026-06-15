/**
 * Boundary tests for the server-side wire parsers (server.ts). These narrow UNTRUSTED POST bodies
 * before they reach the in-memory audit ring / the Copilot — security-relevant input validation that
 * the 500-point pass found untested (finding TEST-SRV). `server.ts` guards `Bun.serve` behind
 * `import.meta.main`, so importing it here opens no socket and the suite stays hermetic.
 */
import { describe, expect, test } from 'bun:test';
import { makeRateLimiter, parseAuditBody, parseChatMessages } from '../server';

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
