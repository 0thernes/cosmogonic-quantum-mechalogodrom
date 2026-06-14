/**
 * Copilot diagnostics (V30) — the pure classifiers behind the "AI offline → diagnostics + recovery
 * pipeline" panel. The network probe itself isn't unit-tested (it calls live endpoints); these pin the
 * mapping from a ping outcome → a human-readable health verdict, which is what the panel renders.
 */
import { describe, expect, test } from 'bun:test';
import { classifyHealth, healthVerdict, type ProviderHealth } from '../src/server/copilot';

describe('classifyHealth', () => {
  test('2xx is reachable + "ok"', () => {
    expect(classifyHealth(200, '')).toEqual({ reachable: true, detail: 'ok' });
    expect(classifyHealth(204, '')).toEqual({ reachable: true, detail: 'ok' });
  });

  test('429 reads as rate-limited (the usual free-tier failure)', () => {
    const r = classifyHealth(429, '');
    expect(r.reachable).toBe(false);
    expect(r.detail).toContain('rate-limited');
  });

  test('401/403 read as auth problems (a bad/missing key)', () => {
    expect(classifyHealth(401, '').detail).toContain('auth');
    expect(classifyHealth(403, '').detail).toContain('auth');
    expect(classifyHealth(401, '').reachable).toBe(false);
  });

  test('other HTTP statuses surface the code; aborts read as a timeout', () => {
    expect(classifyHealth(500, '').detail).toBe('http 500');
    expect(classifyHealth(0, 'The operation was aborted').detail).toBe('timeout');
    expect(classifyHealth(0, 'getaddrinfo ENOTFOUND host').detail).toContain('ENOTFOUND');
    expect(classifyHealth(0, '').detail).toBe('unreachable');
  });
});

describe('healthVerdict', () => {
  const mk = (id: string, reachable: boolean): ProviderHealth => ({
    id,
    label: id,
    keyed: false,
    reachable,
    status: reachable ? 200 : 429,
    latencyMs: 100,
    detail: reachable ? 'ok' : 'rate-limited (429)',
  });

  test('no providers ⇒ not operational', () => {
    const v = healthVerdict([]);
    expect(v.operational).toBe(false);
    expect(v.summary).toContain('no providers');
  });

  test('≥1 reachable ⇒ operational, with the up/total count', () => {
    const v = healthVerdict([mk('a', true), mk('b', false), mk('c', true)]);
    expect(v.operational).toBe(true);
    expect(v.summary).toContain('2/3');
  });

  test('all down ⇒ not operational, with a recovery hint', () => {
    const v = healthVerdict([mk('a', false), mk('b', false)]);
    expect(v.operational).toBe(false);
    expect(v.summary).toContain('unreachable');
  });
});
