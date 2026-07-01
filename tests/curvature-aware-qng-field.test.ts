/**
 * CURVATURE-AWARE QNG — real field-based curvature (closes the "∂ₖg≈0 ⇒ Γ=0" gap + the invertMetric bug).
 *
 * Falsifiable against textbook differential geometry: for polar coordinates on the flat plane, g=diag(1,r²),
 * the Christoffel symbols are exactly Γʳ_φφ=−r, Γ^φ_rφ=Γ^φ_φr=1/r, all others 0. The finite-difference field
 * routine must recover these; a flat metric must yield Γ≈0; and the field NG must actually differ from the
 * curvature-blind fixed path. Also pins the invertMetric Gauss-Jordan fix. Pure — no rng/clock/DOM.
 */
import { describe, expect, test } from 'bun:test';
import {
  invertMetric,
  computeChristoffelSymbolsField,
  curvatureAwareNaturalGradient,
  curvatureAwareNaturalGradientField,
} from '../src/math/curvature-aware-qng';

describe('invertMetric (Gauss-Jordan, bug fixed)', () => {
  test('diagonal and general 2×2 inverses satisfy g·g⁻¹ = I', () => {
    const inv = invertMetric([
      [2, 0],
      [0, 4],
    ]);
    expect(inv[0]![0]!).toBeCloseTo(0.5, 9);
    expect(inv[1]![1]!).toBeCloseTo(0.25, 9);
    const g = [
      [4, 1],
      [1, 3],
    ];
    const gi = invertMetric(g);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let k = 0; k < 2; k++) s += g[i]![k]! * gi[k]![j]!;
        expect(s).toBeCloseTo(i === j ? 1 : 0, 9);
      }
  });
});

describe('computeChristoffelSymbolsField — REAL curvature (textbook polar coords)', () => {
  // g = diag(1, r²) with coordinates (r, φ). Γʳ_φφ = −r, Γ^φ_rφ = Γ^φ_φr = 1/r, else 0.
  const polar = (t: ReadonlyArray<number>) => [
    [1, 0],
    [0, t[0]! * t[0]!],
  ];
  test('recovers the exact Christoffel symbols of the plane in polar coordinates', () => {
    const r = 2;
    const G = computeChristoffelSymbolsField(polar, [r, 0.5]);
    expect(G[0]![1]![1]!).toBeCloseTo(-r, 4); // Γʳ_φφ = −r
    expect(G[1]![0]![1]!).toBeCloseTo(1 / r, 4); // Γ^φ_rφ = 1/r
    expect(G[1]![1]![0]!).toBeCloseTo(1 / r, 4); // Γ^φ_φr = 1/r (symmetric in lower indices)
    // all others vanish
    expect(G[0]![0]![0]!).toBeCloseTo(0, 4);
    expect(G[0]![0]![1]!).toBeCloseTo(0, 4);
    expect(G[1]![0]![0]!).toBeCloseTo(0, 4);
    expect(G[1]![1]![1]!).toBeCloseTo(0, 4);
  });
  test('a flat (constant) metric has zero curvature ⇒ Γ ≈ 0', () => {
    const flat = () => [
      [1, 0],
      [0, 1],
    ];
    const G = computeChristoffelSymbolsField(flat, [0.3, -1.2]);
    for (let m = 0; m < 2; m++)
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) expect(Math.abs(G[m]![i]![j]!)).toBeLessThan(1e-6);
  });
});

describe('curvatureAwareNaturalGradientField — curvature actually influences the step', () => {
  const polar = (t: ReadonlyArray<number>) => [
    [1, 0],
    [0, t[0]! * t[0]!],
  ];
  test('field path differs from the curvature-blind fixed path on a curved manifold', () => {
    const theta = [2, 0.5];
    const grad = [0.3, 0.7];
    const cfg = { curvatureWeight: 0.5, ridge: 1e-3, adaptive: false };
    const g = polar(theta);
    const blind = curvatureAwareNaturalGradient(g, grad, cfg); // Γ=0 ⇒ plain QNG
    const aware = curvatureAwareNaturalGradientField(polar, theta, grad, cfg);
    const diff = Math.hypot(aware[0]! - blind[0]!, aware[1]! - blind[1]!);
    expect(diff).toBeGreaterThan(1e-3); // real curvature correction moved the direction
    expect(Number.isFinite(aware[0]!) && Number.isFinite(aware[1]!)).toBe(true);
  });
  test('deterministic: identical inputs → identical output', () => {
    const a = curvatureAwareNaturalGradientField(polar, [2, 0.5], [0.3, 0.7]);
    const b = curvatureAwareNaturalGradientField(polar, [2, 0.5], [0.3, 0.7]);
    expect(a).toEqual(b);
  });
});
