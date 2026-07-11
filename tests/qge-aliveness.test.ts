/**
 * QGE ALIVENESS — bounded aliveness proxy over simulated QGE states.
 *
 * Falsifiable claims under test:
 *   • aliveness ∈ [0,1] for every state;
 *   • a trivial/ground state is (near-)minimal, a geometrically rich state is strictly higher;
 *   • two geometrically distinct states ⇒ distinct aliveness;
 *   • deterministic: identical state ⇒ identical aliveness (and the existing scalar helpers replay);
 *   • the legacy contracts (qgeAlivenessStep / qgeWorldPerturb / qgeFubiniProxy) are preserved.
 */
import { describe, expect, test } from 'bun:test';
import {
  qgeAlivenessStep,
  qgeFisherAliveness,
  qgeFubiniProxy,
  qgeStateAliveness,
  qgeWorldPerturb,
} from '../src/sim/qge-aliveness';
import type { QGEState } from '../src/sim/quantum-quake-physics';

const GROUND: QGEState = {
  position: [0, 0, 0],
  momentum: [0, 0, 0],
  geometricPhase: 0,
  curvature: 0,
};

const RICH: QGEState = {
  position: [0.37, 0.61, 0.12],
  momentum: [1.4, 0.9, 1.1],
  geometricPhase: 1.2,
  curvature: 0.8,
};

const OTHER: QGEState = {
  position: [0.1, 0.2, 0.3],
  momentum: [0.5, 0.4, 0.6],
  geometricPhase: 0.3,
  curvature: 0.4,
};

describe('qge-aliveness: genuine geometric aliveness', () => {
  test('aliveness is bounded in [0,1] for ground, rich, and other states', () => {
    for (const s of [GROUND, RICH, OTHER]) {
      const a = qgeStateAliveness(s);
      expect(Number.isFinite(a)).toBe(true);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  test('ground state is minimal; a geometrically rich state is strictly higher', () => {
    const ground = qgeStateAliveness(GROUND);
    const rich = qgeStateAliveness(RICH);
    // Trivial state sits at the dead pole of both invariants.
    expect(ground).toBeLessThan(0.05);
    // A curved, momentum- and phase-rich state is genuinely more "alive".
    expect(rich).toBeGreaterThan(ground);
    expect(rich).toBeGreaterThan(0.1);
  });

  test('two distinct states give distinct aliveness', () => {
    const rich = qgeStateAliveness(RICH);
    const other = qgeStateAliveness(OTHER);
    expect(Math.abs(rich - other)).toBeGreaterThan(1e-6);
  });

  test('deterministic: identical state replays an identical value', () => {
    expect(qgeStateAliveness(RICH)).toBe(qgeStateAliveness(RICH));
    expect(qgeFisherAliveness(RICH)).toBe(qgeFisherAliveness(RICH));
  });

  test('log-normalized quantum Fisher information is bounded, finite, and genuinely varies', () => {
    const fGround = qgeFisherAliveness(GROUND);
    const fRich = qgeFisherAliveness(RICH);
    const fOther = qgeFisherAliveness(OTHER);
    for (const f of [fGround, fRich, fOther]) {
      expect(Number.isFinite(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
    // It must NOT be a saturated constant — distinct states give distinct QFI factors.
    expect(Math.abs(fRich - fOther)).toBeGreaterThan(1e-6);
    expect(Math.abs(fGround - fOther)).toBeGreaterThan(1e-6);
  });

  test('preserved contracts: step integrates deterministically and stays in [0,1]', () => {
    const a = qgeAlivenessStep(0.5, 0.7, 0);
    const b = qgeAlivenessStep(0.5, 0.7, 0);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    // A higher geometric drive should pull the integrated value up.
    expect(qgeAlivenessStep(0.5, 0.9, 0)).toBeGreaterThan(qgeAlivenessStep(0.5, 0.1, 0));
  });

  test('preserved contracts: world perturb is deterministic; Fubini proxy is 0 for identical slices', () => {
    expect(qgeWorldPerturb(0.8, 123)).toBe(qgeWorldPerturb(0.8, 123));
    const v = new Float32Array([1, 0, 0]);
    expect(qgeFubiniProxy(v, v)).toBe(0);
  });
});
