/**
 * so3.ts — SO(3) rotation-group toolkit (leaf, exclusive owner).
 *
 * Genuine Lie-group operations on 3D rotations via unit quaternions (the double
 * cover SU(2) → SO(3)): composition, axis–angle and rotation-matrix conversions,
 * the ZYZ Euler decomposition that the Wigner-D matrices in `libirrep-symmetry.ts`
 * are written in, geodesic SLERP, the bi-invariant geodesic distance, and the
 * **Karcher mean** — the intrinsic Riemannian average of a set of rotations
 * (Euclidean averaging of rotations is wrong; this is the correct manifold mean,
 * found by iterating in the tangent algebra so(3)).
 *
 * Deterministic leaf: closed-form trig/linear algebra, fixed iteration order,
 * NO `Rng`/`Math.random`/`Date.now`. Gives the body/forms layer a principled
 * rotation substrate to replace ad-hoc Euler angles, and pairs with the libirrep
 * Wigner-D/SO(3) lineage (Tsotchke `libirrep`, MIT © 2024–2026 tsotchke).
 *
 * Refs: Shoemake, *SIGGRAPH* 1985 (SLERP); Moakher, *SIAM J. Matrix Anal.* 24
 * (2002) — means of rotations / Karcher mean on SO(3).
 */

/** Unit quaternion `[w, x, y, z]` (scalar-first). */
export type Quat = readonly [number, number, number, number];
/** 3-vector. */
export type Vec3 = readonly [number, number, number];

export const QUAT_IDENTITY: Quat = [1, 0, 0, 0];

/** Hamilton product q·r. O(1). */
export function quatMul(q: Quat, r: Quat): Quat {
  const [w1, x1, y1, z1] = q;
  const [w2, x2, y2, z2] = r;
  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
}

/** Conjugate (= inverse for a unit quaternion). */
export function quatConj(q: Quat): Quat {
  return [q[0], -q[1], -q[2], -q[3]];
}

/** Normalise to a unit quaternion. The zero quaternion maps to identity. */
export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  if (n < 1e-300) return QUAT_IDENTITY;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Unit quaternion for a rotation by `angle` (rad) about `axis` (need not be unit). */
export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const n = Math.hypot(axis[0], axis[1], axis[2]);
  if (n < 1e-300) return QUAT_IDENTITY;
  const s = Math.sin(angle / 2) / n;
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

/** ZYZ Euler angles → quaternion: R = R_z(α)·R_y(β)·R_z(γ) (the Wigner-D convention). */
export function quatFromZYZ(alpha: number, beta: number, gamma: number): Quat {
  const za: Quat = [Math.cos(alpha / 2), 0, 0, Math.sin(alpha / 2)];
  const yb: Quat = [Math.cos(beta / 2), 0, Math.sin(beta / 2), 0];
  const zg: Quat = [Math.cos(gamma / 2), 0, 0, Math.sin(gamma / 2)];
  return quatMul(quatMul(za, yb), zg);
}

/** 3×3 rotation matrix (row-major) of a unit quaternion. */
export function quatToMatrix(q: Quat): number[][] {
  const [w, x, y, z] = quatNormalize(q);
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/** Rotation matrix (row-major, assumed proper orthogonal) → unit quaternion (Shepperd's method). */
export function matrixToQuat(m: readonly (readonly number[])[]): Quat {
  const t = m[0]![0]! + m[1]![1]! + m[2]![2]!;
  let q: [number, number, number, number];
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    q = [
      s / 4,
      (m[2]![1]! - m[1]![2]!) / s,
      (m[0]![2]! - m[2]![0]!) / s,
      (m[1]![0]! - m[0]![1]!) / s,
    ];
  } else if (m[0]![0]! > m[1]![1]! && m[0]![0]! > m[2]![2]!) {
    const s = Math.sqrt(1 + m[0]![0]! - m[1]![1]! - m[2]![2]!) * 2;
    q = [
      (m[2]![1]! - m[1]![2]!) / s,
      s / 4,
      (m[0]![1]! + m[1]![0]!) / s,
      (m[0]![2]! + m[2]![0]!) / s,
    ];
  } else if (m[1]![1]! > m[2]![2]!) {
    const s = Math.sqrt(1 + m[1]![1]! - m[0]![0]! - m[2]![2]!) * 2;
    q = [
      (m[0]![2]! - m[2]![0]!) / s,
      (m[0]![1]! + m[1]![0]!) / s,
      s / 4,
      (m[1]![2]! + m[2]![1]!) / s,
    ];
  } else {
    const s = Math.sqrt(1 + m[2]![2]! - m[0]![0]! - m[1]![1]!) * 2;
    q = [
      (m[1]![0]! - m[0]![1]!) / s,
      (m[0]![2]! + m[2]![0]!) / s,
      (m[1]![2]! + m[2]![1]!) / s,
      s / 4,
    ];
  }
  return quatNormalize(q);
}

/** Rotate a 3-vector by a unit quaternion. */
export function rotateVector(q: Quat, v: Vec3): Vec3 {
  const qv: Quat = [0, v[0], v[1], v[2]];
  const r = quatMul(quatMul(q, qv), quatConj(q));
  return [r[1], r[2], r[3]];
}

/** Dot product of two quaternions (as 4-vectors). */
function quatDot(a: Quat, b: Quat): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/**
 * Bi-invariant geodesic distance on SO(3): the angle (rad, in [0, π]) of the
 * relative rotation. Respects the double cover (q and −q are the same rotation,
 * distance 0). O(1).
 */
export function geodesicDistance(a: Quat, b: Quat): number {
  const d = Math.min(1, Math.abs(quatDot(quatNormalize(a), quatNormalize(b))));
  return 2 * Math.acos(d);
}

/** Spherical linear interpolation along the SO(3) geodesic; t∈[0,1], shortest path. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  const qa = quatNormalize(a);
  let qb = quatNormalize(b);
  let dot = quatDot(qa, qb);
  if (dot < 0) {
    qb = [-qb[0], -qb[1], -qb[2], -qb[3]]; // shortest path across the double cover
    dot = -dot;
  }
  if (dot > 0.9995) {
    // Near-parallel: fall back to normalised linear interpolation.
    return quatNormalize([
      qa[0] + t * (qb[0] - qa[0]),
      qa[1] + t * (qb[1] - qa[1]),
      qa[2] + t * (qb[2] - qa[2]),
      qa[3] + t * (qb[3] - qa[3]),
    ]);
  }
  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const s0 = Math.cos(theta) - (dot * Math.sin(theta)) / Math.sin(theta0);
  const s1 = Math.sin(theta) / Math.sin(theta0);
  return [
    s0 * qa[0] + s1 * qb[0],
    s0 * qa[1] + s1 * qb[1],
    s0 * qa[2] + s1 * qb[2],
    s0 * qa[3] + s1 * qb[3],
  ];
}

/** Log map: unit quaternion → rotation vector (axis·angle) in so(3). Hemisphere-fixed (w ≥ 0). */
export function quatLog(q: Quat): Vec3 {
  let [w, x, y, z] = quatNormalize(q);
  if (w < 0) {
    w = -w;
    x = -x;
    y = -y;
    z = -z;
  }
  const vn = Math.hypot(x, y, z);
  if (vn < 1e-12) return [0, 0, 0];
  const angle = 2 * Math.atan2(vn, w);
  const s = angle / vn;
  return [x * s, y * s, z * s];
}

/** Exp map: rotation vector (axis·angle) in so(3) → unit quaternion. */
export function quatExp(omega: Vec3): Quat {
  const angle = Math.hypot(omega[0], omega[1], omega[2]);
  if (angle < 1e-12) return QUAT_IDENTITY;
  const s = Math.sin(angle / 2) / angle;
  return [Math.cos(angle / 2), omega[0] * s, omega[1] * s, omega[2] * s];
}

/**
 * Karcher (Fréchet) mean of a set of rotations — the intrinsic Riemannian
 * average on SO(3), found by gradient descent in the tangent algebra: average
 * the log-map tangents about the current estimate and step by the exp map until
 * the update is below `tol` or `maxIters` is reached. Deterministic (fixed seed =
 * first sample, fixed order). O(iters · n).
 */
export function karcherMean(
  quats: readonly Quat[],
  opts: { maxIters?: number; tol?: number } = {},
): Quat {
  const maxIters = opts.maxIters ?? 100;
  const tol = opts.tol ?? 1e-10;
  if (quats.length === 0) return QUAT_IDENTITY;
  let mean = quatNormalize(quats[0]!);
  for (let it = 0; it < maxIters; it++) {
    const inv = quatConj(mean);
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (const q of quats) {
      const [vx, vy, vz] = quatLog(quatMul(inv, q));
      ax += vx;
      ay += vy;
      az += vz;
    }
    const n = quats.length;
    const omega: Vec3 = [ax / n, ay / n, az / n];
    mean = quatNormalize(quatMul(mean, quatExp(omega)));
    if (Math.hypot(omega[0], omega[1], omega[2]) < tol) break;
  }
  return mean;
}
