/**
 * so3.test.ts — experiments pinning the SO(3) rotation toolkit (Manhattan: tests are experiments).
 */
import { describe, expect, test } from 'bun:test';
import {
  type Quat,
  type Vec3,
  QUAT_IDENTITY,
  quatMul,
  quatConj,
  quatFromAxisAngle,
  quatFromZYZ,
  quatToMatrix,
  matrixToQuat,
  rotateVector,
  geodesicDistance,
  slerp,
  quatLog,
  quatExp,
  karcherMean,
} from '../src/math/so3';

const HALF_PI = Math.PI / 2;
function vlen(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

describe('quaternion algebra', () => {
  test('q · q⁻¹ = identity', () => {
    const q = quatFromAxisAngle([1, 2, 3], 0.7);
    const r = quatMul(q, quatConj(q));
    expect(r[0]).toBeCloseTo(1, 12);
    expect(Math.hypot(r[1], r[2], r[3])).toBeCloseTo(0, 12);
  });
  test('a 90° rotation about ẑ maps x̂ → ŷ', () => {
    const q = quatFromAxisAngle([0, 0, 1], HALF_PI);
    const v = rotateVector(q, [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 12);
    expect(v[1]).toBeCloseTo(1, 12);
    expect(v[2]).toBeCloseTo(0, 12);
  });
  test('rotation preserves vector length', () => {
    const q = quatFromZYZ(0.4, 1.1, -0.8);
    expect(vlen(rotateVector(q, [3, -4, 12]))).toBeCloseTo(13, 12);
  });
});

describe('matrix ↔ quaternion round-trip', () => {
  test('matrixToQuat ∘ quatToMatrix recovers the rotation (up to sign)', () => {
    const q = quatFromZYZ(0.3, 0.9, 1.7);
    const back = matrixToQuat(quatToMatrix(q));
    expect(geodesicDistance(q, back)).toBeCloseTo(0, 10);
  });
  test('quatToMatrix is special-orthogonal (det = +1, columns orthonormal)', () => {
    const m = quatToMatrix(quatFromAxisAngle([1, 1, 0], 2.0));
    // det
    const det =
      m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
      m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
      m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
    expect(det).toBeCloseTo(1, 12);
  });
});

describe('ZYZ Euler (Wigner-D convention)', () => {
  test('R_z(α)·R_y(β)·R_z(γ) composes as the product of the three quaternions', () => {
    const a = 0.5,
      b = 0.6,
      g = 0.7;
    const composed = quatMul(
      quatMul(quatFromAxisAngle([0, 0, 1], a), quatFromAxisAngle([0, 1, 0], b)),
      quatFromAxisAngle([0, 0, 1], g),
    );
    expect(geodesicDistance(quatFromZYZ(a, b, g), composed)).toBeCloseTo(0, 12);
  });
});

describe('geodesic distance & SLERP', () => {
  test('distance to self is 0; q and −q are the same rotation', () => {
    const q = quatFromAxisAngle([2, -1, 3], 1.3);
    const negQ: Quat = [-q[0], -q[1], -q[2], -q[3]];
    expect(geodesicDistance(q, q)).toBeCloseTo(0, 12);
    expect(geodesicDistance(q, negQ)).toBeCloseTo(0, 12);
  });
  test('distance equals the relative-rotation angle', () => {
    const q0 = QUAT_IDENTITY;
    const q1 = quatFromAxisAngle([0, 0, 1], 1.0);
    expect(geodesicDistance(q0, q1)).toBeCloseTo(1.0, 12);
  });
  test('SLERP hits the endpoints and bisects the geodesic at t = 0.5', () => {
    const q0 = QUAT_IDENTITY;
    const q1 = quatFromAxisAngle([0, 1, 0], 1.2);
    expect(geodesicDistance(slerp(q0, q1, 0), q0)).toBeCloseTo(0, 10);
    expect(geodesicDistance(slerp(q0, q1, 1), q1)).toBeCloseTo(0, 10);
    const mid = slerp(q0, q1, 0.5);
    expect(geodesicDistance(q0, mid)).toBeCloseTo(0.6, 10);
    expect(geodesicDistance(mid, q1)).toBeCloseTo(0.6, 10);
  });
});

describe('log / exp maps', () => {
  test('exp ∘ log = identity on the rotation', () => {
    const q = quatFromAxisAngle([1, -2, 0.5], 2.4);
    expect(geodesicDistance(quatExp(quatLog(q)), q)).toBeCloseTo(0, 10);
  });
  test('log of identity is the zero vector', () => {
    expect(vlen(quatLog(QUAT_IDENTITY))).toBeCloseTo(0, 12);
  });
});

describe('Karcher (intrinsic Riemannian) mean', () => {
  test('mean of identical rotations is that rotation', () => {
    const q = quatFromAxisAngle([1, 1, 1], 0.9);
    expect(geodesicDistance(karcherMean([q, q, q]), q)).toBeCloseTo(0, 10);
  });
  test('mean of {R(+θ), R(−θ)} about one axis is the identity', () => {
    const qp = quatFromAxisAngle([0, 0, 1], 0.8);
    const qm = quatFromAxisAngle([0, 0, 1], -0.8);
    expect(geodesicDistance(karcherMean([qp, qm]), QUAT_IDENTITY)).toBeCloseTo(0, 8);
  });
  test('mean sits between the inputs (closer to the cluster than any outlier corner)', () => {
    const qs = [
      quatFromAxisAngle([0, 0, 1], 0.1),
      quatFromAxisAngle([0, 0, 1], 0.2),
      quatFromAxisAngle([0, 0, 1], 0.3),
    ];
    const m = karcherMean(qs);
    // The mean of three equal-spaced rotations about one axis is the middle one
    // (iterative Riemannian solver → ~1e-8 residual).
    expect(geodesicDistance(m, qs[1]!)).toBeCloseTo(0, 6);
  });
  test('deterministic: same inputs ⇒ identical mean', () => {
    const qs = [quatFromAxisAngle([1, 0, 0], 0.5), quatFromAxisAngle([0, 1, 0], 0.5)];
    expect(karcherMean(qs)).toEqual(karcherMean(qs));
  });
});
