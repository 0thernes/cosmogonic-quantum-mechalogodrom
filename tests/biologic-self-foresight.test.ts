/**
 * GATE-SELF-FORESIGHT — proves the digital biologic's Taylor-tower self-foresight
 * ({@link ../src/sim/digital-biologics}, wired into stepBiologic's `learn=true` path) is a REAL,
 * measurable metacognitive faculty, not decorative. Each learn beat the biologic fits an Eshkol
 * Taylor tower to its own last four `consciousness` beats and reads the tower's embedded
 * truncation-error proxy ({@link ../src/math/eshkol-taylor-jet EshkolTaylorJet.tailMagnitude}) to
 * estimate how far ahead it can trust its OWN trajectory. Falsifiable / defensible:
 *   - MATH: tailMagnitude is the exact highest-term magnitude (a validated Taylor error bar in the
 *     spirit of Eshkol v1.3), exact on a genuine polynomial and zero for a line;
 *   - OPERATIONAL: a predictable (constant-drive) self-trajectory yields higher foresight than an
 *     oscillating one — the signal tracks real predictability, not decoration;
 *   - deterministic: identical birth + drive ⇒ identical selfForesight;
 *   - golden-safe: `learn=false` never computes foresight or history (byte-identical to the prior sim).
 */
import { describe, expect, test } from 'bun:test';
import { birthBiologic, stepBiologic } from '../src/sim/digital-biologics';
import { EshkolTaylorJet } from '../src/math/eshkol-taylor-jet';

describe('GATE-SELF-FORESIGHT: a biologic quantifies how far it can anticipate its own consciousness', () => {
  test('MATH: tailMagnitude = |c[order]|·h^order, exact on a cubic and zero for a line', () => {
    const jet = new EshkolTaylorJet(3);
    // A genuine cubic tail term: |c3|·h^3 = 0.03·2^3 = 0.24, exactly.
    jet.setCoefficients([0.5, 0.2, -0.1, 0.03]);
    expect(jet.tailMagnitude(2)).toBeCloseTo(0.03 * 2 ** 3, 12);
    expect(jet.tailMagnitude(1)).toBeCloseTo(0.03, 12);
    // A line (degree ≤ 1, all higher coefficients zero) extrapolates with NO truncation tail.
    jet.setCoefficients([0.5, 0.2, 0, 0]);
    expect(jet.tailMagnitude(2)).toBe(0);
    expect(jet.tailMagnitude(5)).toBe(0);
  });

  test('OPERATIONAL: foresight is higher under a predictable drive than an oscillating one', () => {
    const smooth = birthBiologic(2, 17);
    for (let t = 0; t < 300; t++) stepBiologic(smooth, 0.6, true); // constant drive ⇒ smooth self-trajectory
    const oscillating = birthBiologic(2, 17);
    for (let t = 0; t < 300; t++) stepBiologic(oscillating, t % 2 === 0 ? 0.02 : 0.98, true); // hard swing

    // A perfectly regular self-trajectory is (near-)perfectly extrapolable.
    expect(smooth.selfForesight).toBeGreaterThan(0.99);
    // The oscillating one is measurably less predictable — a decisive, non-decorative gap.
    expect(oscillating.selfForesight!).toBeLessThan(smooth.selfForesight! - 0.03);
    // Both remain bounded indicators.
    for (const v of [smooth.selfForesight!, oscillating.selfForesight!]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('deterministic: identical birth + drive ⇒ identical selfForesight', () => {
    const run = (): number => {
      const b = birthBiologic(3, 9);
      for (let t = 0; t < 120; t++) stepBiologic(b, 0.55, true);
      return b.selfForesight ?? -1;
    };
    expect(run()).toBe(run());
  });

  test('golden-safe: learn=false never computes foresight or history (byte-identical path)', () => {
    const b = birthBiologic(2, 17);
    for (let t = 0; t < 50; t++) stepBiologic(b, 0.6); // learn defaults false
    expect(b.selfForesight).toBeUndefined();
    expect(b.consciousnessHistory).toBeUndefined();
  });
});
