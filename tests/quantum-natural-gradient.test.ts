/**
 * QUANTUM NATURAL GRADIENT (V93 / SC 1.1) — proves the Fubini–Study preconditioner against closed
 * forms: an identity metric leaves the gradient unchanged (flat space ⇒ natural = ordinary); a diagonal
 * metric rescales each axis by 1/g_ii (the defining property); a general SPD metric matches the exact
 * matrix inverse; the Tikhonov ridge keeps a singular metric finite; and because g(+λI) is SPD the
 * natural gradient never leaves the ascent half-space of the gradient (grad·ng ≥ 0).
 */
import { describe, expect, test } from 'bun:test';
import {
  naturalGradient,
  solveSymmetric,
  vecDot,
  vecNorm,
} from '../src/math/quantum-natural-gradient';

describe('solveSymmetric (V93)', () => {
  test('identity system returns b unchanged', () => {
    const x = solveSymmetric(
      [
        [1, 0],
        [0, 1],
      ],
      [3, 5],
      0,
    );
    expect(Math.abs((x[0] ?? 0) - 3)).toBeLessThan(1e-12);
    expect(Math.abs((x[1] ?? 0) - 5)).toBeLessThan(1e-12);
  });

  test('general 3×3 SPD system matches the known solution', () => {
    // A = [[4,1,0],[1,3,1],[0,1,2]], b = [1,2,3]  →  x ≈ [0.130435, 0.478261, 1.260870]
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const b = [1, 2, 3];
    const x = solveSymmetric(A, b, 0);
    // verify by residual A·x ≈ b (the strongest, basis-free check)
    for (let i = 0; i < 3; i++) {
      let axi = 0;
      for (let j = 0; j < 3; j++) axi += (A[i]?.[j] ?? 0) * (x[j] ?? 0);
      expect(Math.abs(axi - (b[i] ?? 0))).toBeLessThan(1e-9);
    }
  });

  test('a singular system without ridge yields a finite (never NaN/∞) fallback', () => {
    const x = solveSymmetric(
      [
        [0, 0],
        [0, 0],
      ],
      [1, 1],
      0,
    );
    expect(Number.isFinite(x[0] ?? NaN)).toBe(true);
    expect(Number.isFinite(x[1] ?? NaN)).toBe(true);
  });

  test('a Tikhonov ridge regularises a singular metric: (0 + λI)x = b ⇒ x = b/λ', () => {
    const x = solveSymmetric(
      [
        [0, 0],
        [0, 0],
      ],
      [3, 5],
      1,
    );
    expect(Math.abs((x[0] ?? 0) - 3)).toBeLessThan(1e-9);
    expect(Math.abs((x[1] ?? 0) - 5)).toBeLessThan(1e-9);
  });
});

describe('naturalGradient (V93)', () => {
  test('identity Fubini–Study metric ⇒ natural gradient = ordinary gradient (flat space)', () => {
    const ng = naturalGradient(
      [
        [1, 0],
        [0, 1],
      ],
      [0.7, -0.2],
      0,
    );
    expect(Math.abs((ng[0] ?? 0) - 0.7)).toBeLessThan(1e-12);
    expect(Math.abs((ng[1] ?? 0) + 0.2)).toBeLessThan(1e-12);
  });

  test('diagonal metric rescales each axis by 1/g_ii (the defining property)', () => {
    const ng = naturalGradient(
      [
        [2, 0],
        [0, 4],
      ],
      [1, 1],
      0,
    );
    expect(Math.abs((ng[0] ?? 0) - 0.5)).toBeLessThan(1e-12);
    expect(Math.abs((ng[1] ?? 0) - 0.25)).toBeLessThan(1e-12);
  });

  test('general SPD metric matches the exact 2×2 inverse', () => {
    // g = [[2,1],[1,2]] ⇒ g⁻¹ = (1/3)[[2,-1],[-1,2]]; g⁻¹·[1,0] = [2/3, -1/3]
    const ng = naturalGradient(
      [
        [2, 1],
        [1, 2],
      ],
      [1, 0],
      0,
    );
    expect(Math.abs((ng[0] ?? 0) - 2 / 3)).toBeLessThan(1e-9);
    expect(Math.abs((ng[1] ?? 0) + 1 / 3)).toBeLessThan(1e-9);
  });

  test('an SPD metric keeps the natural gradient in the ascent half-space (grad·ng ≥ 0)', () => {
    const g = [
      [3, 1],
      [1, 2],
    ];
    for (const grad of [
      [1, 0],
      [0, 1],
      [0.4, -0.9],
      [-0.6, -0.2],
    ]) {
      const ng = naturalGradient(g, grad, 1e-6);
      expect(vecDot(grad, ng)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  test('vecNorm / vecDot basics', () => {
    expect(Math.abs(vecNorm([3, 4]) - 5)).toBeLessThan(1e-12);
    expect(Math.abs(vecDot([1, 2, 3], [4, 5, 6]) - 32)).toBeLessThan(1e-12);
  });
});
