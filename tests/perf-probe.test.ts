/** `?perf=1` frame-breakdown probe: opt-in parsing, per-frame rows, and timing-only wrapping. */
import { describe, expect, test } from 'bun:test';
import { PerfProbe, perfProbeRequested, perfRows } from '../src/ui/perf-probe';

describe('perf probe', () => {
  test('only ?perf=1 turns it on', () => {
    expect(perfProbeRequested('?perf=1')).toBe(true);
    expect(perfProbeRequested('?world=mini&perf=1')).toBe(true);
    expect(perfProbeRequested('?perf=10')).toBe(false);
    expect(perfProbeRequested('?world=mini')).toBe(false);
  });

  test('rows are per-frame and sorted by cost', () => {
    const t = new Map([
      ['a', { ms: 10, calls: 2 }],
      ['b', { ms: 40, calls: 4 }],
    ]);
    expect(perfRows(t, 2)).toEqual([
      { name: 'b', msPerFrame: 20, calls: 2 },
      { name: 'a', msPerFrame: 5, calls: 1 },
    ]);
  });

  test('wrapping times a subsystem without changing its result', () => {
    class Sys {
      n = 0;
      update(k: number): number {
        this.n += k;
        return this.n;
      }
    }
    const world = { sys: new Sys() } as unknown as Record<string, unknown>;
    const probe = new PerfProbe();
    probe.instrument(world, 'world', 1);
    const sys = world['sys'] as Sys;
    expect(sys.update(3)).toBe(3);
    expect(sys.update(4)).toBe(7);
    expect(probe.totals.get('sys.update')?.calls).toBe(2);
  });
});
