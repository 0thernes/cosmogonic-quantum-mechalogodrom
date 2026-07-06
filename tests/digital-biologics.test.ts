import { describe, expect, test } from 'bun:test';
import { BIOLOGIC_FORMS, birthBiologic } from '../src/sim/digital-biologics';

describe('digital biologics birth', () => {
  test('is deterministic, finite, and selects a known corpus-backed form', () => {
    const a = birthBiologic(3, 42);
    const b = birthBiologic(3, 42);

    expect(a).toEqual(b);
    expect(BIOLOGIC_FORMS).toContain(a.form);
    expect(a.alive).toBe(true);
    expect(a.consciousness).toBeGreaterThanOrEqual(0);
    expect(a.consciousness).toBeLessThanOrEqual(1);

    for (const [key, value] of Object.entries(a)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), key).toBe(true);
      }
    }
  });
});
