/**
 * GATE-PETRI-SURVIVE — proves the digital-biologics ring (petri-dish.ts) is a real differential-survival
 * GA, not a FIFO birth/decay queue: at the cap it culls the LEAST-fit strain, so the population keeps a
 * strictly higher mean fitness than the old FIFO behavior. Falsifiable + deterministic. If eviction were
 * fitness-blind (the old `.shift()`), the two arms would coincide and the margin assertion would fail.
 */
import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import { evictLeastFit } from '../src/sim/petri-dish';

const mean = (a: { consciousness: number }[]): number =>
  a.reduce((s, b) => s + b.consciousness, 0) / a.length;

describe('GATE-PETRI-SURVIVE: the biologics ring selects on fitness, not arrival order', () => {
  test('evicts the LEAST-fit biologic, not the oldest (vs the old FIFO shift)', () => {
    const bios = [{ consciousness: 0.8 }, { consciousness: 0.1 }, { consciousness: 0.5 }];
    evictLeastFit(bios);
    expect(bios.map((b) => b.consciousness)).toEqual([0.8, 0.5]); // 0.1 culled; the OLDEST (0.8) survives
  });

  test('falls back to vitality for thin stubs (form/vitality only, no consciousness)', () => {
    const bios: { consciousness?: number; vitality?: number }[] = [
      { vitality: 0.9 },
      { vitality: 0.2 },
      { vitality: 0.6 },
    ];
    evictLeastFit(bios);
    expect(bios.map((b) => b.vitality)).toEqual([0.9, 0.6]);
  });

  test('over a stream of varied-fitness births at the cap, truncation keeps a HIGHER mean than FIFO', () => {
    const CAP = 64;
    const rng = mulberry32(0x5e1ec7);
    const truncation: { consciousness: number }[] = [];
    const fifo: { consciousness: number }[] = [];
    for (let i = 0; i < 4000; i++) {
      const c = rng(); // birth fitness in [0,1)
      truncation.push({ consciousness: c });
      fifo.push({ consciousness: c });
      if (truncation.length > CAP) evictLeastFit(truncation); // NEW: cull the least fit
      if (fifo.length > CAP) fifo.shift(); // OLD: cull the oldest (fitness-blind baseline)
    }
    expect(truncation).toHaveLength(CAP);
    expect(fifo).toHaveLength(CAP);
    // truncation streams the fittest survivors to the top; FIFO retains only the last CAP (mean ≈ 0.5).
    expect(mean(truncation)).toBeGreaterThan(mean(fifo) + 0.2);
    expect(mean(truncation)).toBeGreaterThan(0.9); // selection concentrates the top of the stream
  });

  test('deterministic: identical stream ⇒ identical survivors', () => {
    const build = (): number[] => {
      const r = mulberry32(42);
      const a: { consciousness: number }[] = [];
      for (let i = 0; i < 300; i++) {
        a.push({ consciousness: r() });
        if (a.length > 64) evictLeastFit(a);
      }
      return a.map((b) => b.consciousness);
    };
    expect(build()).toEqual(build());
  });
});
