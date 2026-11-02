import { describe, expect, test } from 'bun:test';
import { gwtBroadcast, gwtBroadcastFirst } from '../src/sim/eshkol-bridge';

describe('gwtBroadcastFirst', () => {
  test('equals gwtBroadcast(...)[0] || 0 bit for bit, ties and degenerate salience included', () => {
    let s = 9;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32) * 2 - 0.5;
    const cases: [number[], number[]][] = [
      [[], []],
      [[0.3], [0]],
      [
        [0.3, 0.7],
        [0.5, 0.5],
      ],
      [
        [0.3, 0.7],
        [-1, -2],
      ],
      [
        [0.3, 0.7, 0.1],
        [0.5, 0.6, 0.4],
      ],
      [
        [Number.NaN, 0.2],
        [0.6, 0.5],
      ],
    ];
    for (let k = 0; k < 2000; k++) {
      const n = 1 + (k % 9);
      cases.push([Array.from({ length: n }, r), Array.from({ length: n + (k % 2) }, r)]);
    }
    for (const [c, w] of cases) {
      const want = gwtBroadcast(c, w)[0] || 0;
      expect(
        Object.is(gwtBroadcastFirst(Float64Array.from(c), Float64Array.from(w)) || 0, want),
      ).toBe(true);
    }
  });
});
