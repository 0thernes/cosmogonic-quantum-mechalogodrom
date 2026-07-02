/**
 * REPRODUCIBILITY ARTIFACT — proves scripts/reproduce.ts is a valid third-party replication tool:
 * deterministic (same inputs ⇒ identical fingerprint), discriminating (different seed ⇒ different
 * fingerprint), and consistent with the gate's own coupling floor. Deliberately does NOT pin a golden
 * hash — the fingerprint is a PER-COMMIT value that legitimately changes whenever the apex evolves;
 * pinning it would red main on every intentional cognition change.
 */
import { describe, expect, test } from 'bun:test';
import { reproduce, fingerprint } from '../scripts/reproduce';

describe('reproducibility artifact (scripts/reproduce.ts)', () => {
  test('fingerprint: exact-bytes hashing — order-sensitive, value-sensitive, stable', () => {
    expect(fingerprint([1, 2, 3])).toBe(fingerprint([1, 2, 3]));
    expect(fingerprint([1, 2, 3])).not.toBe(fingerprint([3, 2, 1]));
    expect(fingerprint([0.1])).not.toBe(fingerprint([0.1 + 1e-15])); // one ulp-ish flip changes it
    expect(fingerprint([])).toBe(fingerprint([]));
  });

  test('same (seed, beats) ⇒ bit-identical receipt; different seed ⇒ different fingerprint', () => {
    const a = reproduce(42, 40);
    const b = reproduce(42, 40);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.meanAbsCoupling).toBe(b.meanAbsCoupling);
    expect(a.final).toEqual(b.final);
    const c = reproduce(43, 40);
    expect(c.fingerprint).not.toBe(a.fingerprint);
  }, 30000); // 3 × 40 full apex think() beats

  test('the receipt reports the same coupling regime the gate enforces', () => {
    const r = reproduce(123, 80); // 80 beats matches the coupling-audit test config
    expect(r.meanAbsCoupling).toBeGreaterThan(0.188); // the gate's regression floor
    expect(r.meanAbsCoupling).toBeLessThan(0.6); // the gate's anti-overclaim ceiling
    expect(r.isolatedCount).toBeLessThan(16);
    expect(r.density).toBeGreaterThan(0);
    expect(r.density).toBeLessThanOrEqual(1);
  }, 30000);
});
