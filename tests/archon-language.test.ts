import { describe, expect, test } from 'bun:test';
import { ArchonLanguage } from '../src/sim/archon-language';
import { readFileSync } from 'node:fs';

const groupsAt = (k: number): number[] =>
  Array.from({ length: 8 }, (_, i) => (i === k % 8 ? 1 : 0.1));

describe('ArchonLanguage (emergent-language wiring)', () => {
  test('a shared lexicon emerges: fluency climbs from 0 toward 1', () => {
    const l = new ArchonLanguage(7);
    for (let b = 0; b < 400; b++) l.step(groupsAt(Math.floor(b / 3)));
    const s = l.snapshot();
    expect(s.fluency).toBeGreaterThan(0.5);
    expect(s.signs).toBeGreaterThan(0);
  });
  test('seeded determinism', () => {
    const run = (): string => {
      const l = new ArchonLanguage(42);
      for (let b = 0; b < 200; b++) l.step(groupsAt(b * 5));
      return JSON.stringify(l.snapshot());
    };
    expect(run()).toBe(run());
  });
  test('World steps it on the apex beat and feeds fluency into the archon percept', () => {
    const src = readFileSync('src/world.ts', 'utf8');
    expect(src).toContain('this.archonLanguage.step(facultyGroups)');
    expect(src).toMatch(/lang\.fluency \* 0\.02/);
  });
});
