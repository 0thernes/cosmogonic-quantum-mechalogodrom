import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Xenomind } from '../src/sim/xenomind';
import { mulberry32 } from '../src/math/rng';

describe('xenomind wiring', () => {
  test('intent is a bounded 6-D drive and seeded-deterministic', () => {
    const run = (): number[] => {
      const x = new Xenomind(mulberry32(5));
      let out: number[] = [];
      for (let i = 0; i < 50; i++)
        out = Array.from(x.think([0.5, 0.2, 0.3, 0.1, 0.4, 0.6, 0.2, (i % 10) / 10]));
      return out;
    };
    const a = run();
    expect(a).toHaveLength(6);
    for (const v of a) expect(v >= 0 && v <= 1).toBe(true);
    expect(a).toEqual(run());
  });
  test('World feeds the archon percept through it and bends pull + light', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    expect(src).toContain('this.xenomind.think(xs)');
    expect(src).toMatch(/xIntent\[0\] \?\? 0\.5\) - 0\.5\) \* 0\.04/);
  });
});
