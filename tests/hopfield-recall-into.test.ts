import { describe, expect, test } from 'bun:test';
import { recall, recallStateInto, storeHebbian } from '../src/math/hopfield';

describe('recallStateInto', () => {
  test('writes the same attractor and sweep count as recall, reusing one dirty array', () => {
    let seed = 5;
    const bit = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) & 1 ? 1 : -1);
    const pats = Array.from({ length: 5 }, () => Array.from({ length: 24 }, bit));
    const net = storeHebbian(pats);
    const s: number[] = new Array<number>(24).fill(3);
    for (let k = 0; k < 300; k++) {
      const probe = Float32Array.from({ length: 24 }, () => (k % 7 === 0 ? 0 : bit()));
      for (const sweeps of [1, 2, 50]) {
        const want = recall(net, probe, sweeps);
        const got = recallStateInto(net, probe, s, sweeps);
        expect(got).toBe(want.sweeps);
        expect(s.length).toBe(want.state.length);
        for (let i = 0; i < s.length; i++) expect(Object.is(s[i], want.state[i])).toBe(true);
      }
    }
  });
});
