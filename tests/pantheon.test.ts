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

  test('V1.3 individuation: each light Archon carries a persistent, evolving, bounded identity memory', () => {
    const p = new PantheonSociety();
    const stride = ARCHON_CHANNELS - 5; // = LIGHT_COUNT ⇒ frame + k·stride re-ticks the SAME light Archon
    const mems: number[] = [];
    for (let k = 0; k < 8; k++) {
      const ll = p.beat(2 + k * stride).lastLight!;
      expect(Number.isFinite(ll.memory)).toBe(true);
      expect(ll.memory).toBeGreaterThanOrEqual(0);
      expect(ll.memory).toBeLessThanOrEqual(1);
      mems.push(ll.memory);
    }
    // a persistent EMA of the archon's own plan-bias ⇒ not a single frozen value across its sub-beats
    expect(new Set(mems.map((m) => m.toFixed(5))).size).toBeGreaterThanOrEqual(2);
  });
});
