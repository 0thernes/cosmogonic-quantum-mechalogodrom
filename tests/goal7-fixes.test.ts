/**
 * GOAL7 receipts (V122) — the owner's second six-pack, measured root causes:
 *  - NHI MEMORY was READ but never WRITTEN (the "remember" step was documented and missing) — the
 *    MEMORY observatory pane sat at "filling memory…" forever and the mean() mood term was dead 0;
 *  - titans/shoggoths PREYED on launched NHIs (age-immortal by design) — the mind unregistered
 *    seconds after launch and every NHI observatory pane blanked (static seals below);
 *  - burst/apocalypse spawn counts are the owner numbers (+25 / +250), not tier-scaled floods;
 *  - the audio sleep doze is recoverable (behavioral test lives in audio-engine.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mulberry32 } from '../src/math/rng';
import { NhiMind, type NhiPercept } from '../src/sim/nhi';

const root = resolve(import.meta.dir, '..');
const src = (p: string): string => readFileSync(resolve(root, p), 'utf8');

const PERCEPT: NhiPercept = {
  beat: 0,
  energy: 0.6,
  crowding: 0.4,
  chaos: 0.3,
  threat: 0.2,
  rivalFaction: 2,
  rivalLastMove: 1,
};

describe('V122 — NHI episodic memory is WRITTEN (USER #3: MEMORY pane no longer empty)', () => {
  test('every think() beat stores one valence sample; snapshot exposes them oldest→newest', () => {
    const mind = new NhiMind(mulberry32(11));
    const rng = mulberry32(12);
    expect(mind.snapshot().memory.length).toBe(0);
    for (let b = 0; b < 5; b++) mind.think({ ...PERCEPT, beat: b }, rng);
    const mem = mind.snapshot().memory;
    expect(mem.length).toBe(5); // one sample per decision beat
    // The stored valence is the documented energy − threat + chaos·0.2 blend (clamped ±1).
    expect(mem[0]).toBeCloseTo(0.6 - 0.2 + 0.3 * 0.2, 5);
  });

  test('memory feeds mood: identical minds with different histories diverge in mood', () => {
    const a = new NhiMind(mulberry32(21));
    const b = new NhiMind(mulberry32(21));
    const rngA = mulberry32(22);
    const rngB = mulberry32(22);
    for (let i = 0; i < 8; i++) {
      a.think({ ...PERCEPT, beat: i, energy: 0.95, threat: 0.0 }, rngA); // fed + safe
      b.think({ ...PERCEPT, beat: i, energy: 0.05, threat: 0.9 }, rngB); // starved + hunted
    }
    expect(a.snapshot().mood).toBeGreaterThan(b.snapshot().mood);
  });
});

describe('V122 — static seals: NHI predation guards + owner spawn counts', () => {
  test('titan harvest and shoggoth feed both skip NHI MATRIX beings', () => {
    expect(src('src/sim/titans.ts')).toContain('if (e.userData.isNhi) continue;');
    expect(src('src/sim/shoggoths.ts')).toContain('if (e.userData.isNhi) continue;');
  });

  test('burst defaults to +25 and apocalypse passes exactly 250 (USER #8)', () => {
    const world = src('src/world.ts');
    expect(world).toContain('private doBurst(count = 25): void');
    expect(world).toContain('this.doBurst(250);');
    // The old tier-scaled flood (maxEntities/100 ≈ 500/press) must be gone.
    expect(world).not.toContain('Math.max(30, Math.floor(this.quality.maxEntities / 100))');
  });
});
