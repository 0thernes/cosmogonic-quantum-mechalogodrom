import { describe, expect, test } from 'bun:test';
import { MECHA_WARP_GLSL, mechaWarpVertex } from '../src/sim/mechalogodrom';

describe('Mechalogodrom GPU warp', () => {
  test('GLSL port carries every constant of the CPU reference and w=0 is the identity', () => {
    const cpu = mechaWarpVertex.toString();
    const nums = (s: string) => new Set((s.match(/\d+\.\d+|\d+e-\d+/g) ?? []).map(Number));
    const gl = nums(MECHA_WARP_GLSL);
    for (const k of nums(cpu)) expect(gl.has(k)).toBe(true);
    expect(MECHA_WARP_GLSL).toContain('vec3 cqmMechaWarp(vec3 b)');
    const out = [0, 0, 0];
    mechaWarpVertex(3, -7, 11, 4.2, 0, out, 0);
    expect(out).toEqual([3, -7, 11]);
  });
});
