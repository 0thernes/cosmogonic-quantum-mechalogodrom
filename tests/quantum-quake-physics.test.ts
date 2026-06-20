/**
 * Quantum-quake QGE physics port — deterministic perturbation + aliveness receipts.
 */
import { describe, expect, test } from 'bun:test';
import {
  berryCurvature,
  computeQGE,
  fubiniStudyDistance,
  qgeAlivenessProxy,
  qgePerturb,
  qgePhysicsStep,
  type QGEState,
} from '../src/sim/quantum-quake-physics';

const BASE: QGEState = {
  position: [0.1, 0.2, 0.3],
  momentum: [0.01, -0.02, 0.03],
  geometricPhase: 0.5,
  curvature: 0.4,
};

describe('quantum-quake-physics (QGE port)', () => {
  test('computeQGE returns 9-element metric', () => {
    const m = computeQGE(BASE, [0.3, 0.5]);
    expect(m.length).toBe(9);
    expect(m[0]).toBeGreaterThan(0);
    expect(m[4]).toBeGreaterThan(0);
    expect(m[8]).toBeGreaterThan(0);
  });

  test('qgePerturb aliveness stays bounded', () => {
    const p = qgePerturb(BASE, [0.2, 0.4, 0.6], 0.15);
    expect(p.aliveness).toBeGreaterThanOrEqual(0);
    expect(p.aliveness).toBeLessThanOrEqual(1);
    expect(Number.isFinite(p.newPosition[0])).toBe(true);
  });

  test('qgePhysicsStep is deterministic', () => {
    const a = qgePhysicsStep(BASE, [0.3, 0.5, 0.7], 0.016);
    const b = qgePhysicsStep(BASE, [0.3, 0.5, 0.7], 0.016);
    expect(a).toEqual(b);
    expect(a.curvature).toBeGreaterThanOrEqual(-1);
    expect(a.curvature).toBeLessThanOrEqual(1);
  });

  test('fubiniStudyDistance is non-negative', () => {
    const other: QGEState = { ...BASE, geometricPhase: 1.2, position: [0.2, 0.3, 0.4] };
    const d = fubiniStudyDistance(BASE, other);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(Math.PI / 2);
  });

  test('berryCurvature and aliveness proxy are finite', () => {
    const b = berryCurvature(BASE, []);
    expect(b.length).toBe(3);
    const a = qgeAlivenessProxy(BASE.curvature, BASE.geometricPhase);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });
});
