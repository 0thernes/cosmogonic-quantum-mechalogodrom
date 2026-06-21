import { describe, expect, test } from 'bun:test';
import { PantheonSociety, ARCHON_CHANNELS } from '../src/sim/pantheon';
import { GODFORMS, PANTHEON_SIZE, getArchonTier } from '../src/sim/godform';

describe('25-Archon pantheon society', () => {
  test('registry exposes 25 godforms in three tiers', () => {
    expect(PANTHEON_SIZE).toBe(25);
    expect(GODFORMS.length).toBe(25);
    expect(getArchonTier(0)).toBe('neo');
    expect(getArchonTier(4)).toBe('omega');
    expect(getArchonTier(5)).toBe('alpha');
    expect(getArchonTier(24)).toBe('alpha');
  });

  test('mind-field + light echoes advance deterministically', () => {
    const a = new PantheonSociety();
    const b = new PantheonSociety();
    for (let f = 0; f < 120; f++) {
      expect(JSON.stringify(a.beat(f))).toBe(JSON.stringify(b.beat(f)));
    }
    const snap = a.snapshot();
    expect(snap.lightCount).toBe(ARCHON_CHANNELS - 5);
    expect(snap.field.channels).toBe(ARCHON_CHANNELS);
    expect(snap.field.energy).toBeGreaterThan(0);
  });
});
