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
  test('World feeds the archon percept through it and bends pull + light only through the trust gate', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    expect(src).toContain('this.xenomind.think(xs)');
    expect(src).toContain('this.xenoGate.observe(xPull, basePercept.pull)');
    expect(src).toMatch(/this\.xenoGate\.nudge\(xPull, basePercept\.pull, 0\.04\)/);
    expect(src).toMatch(
      /this\.xenoGate\.nudge\(xIntent\[1\] \?\? 0\.5, basePercept\.light, 0\.02\)/,
    );
    expect(src).not.toMatch(/xIntent\[0\] \?\? 0\.5\) - 0\.5\) \* 0\.04/);
  });
});
