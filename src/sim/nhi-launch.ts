/**
 * Pure NHI launch-toss math — camera-forward cone with random fan-out.
 * World samples unit draws and this returns velocity; no three.js dependency.
 */

export interface NhiLaunchVelocity {
  x: number;
  y: number;
  z: number;
}

/**
 * @param fx,fy,fz look direction
 * @param u0..u3 independent samples in [0,1)
 */
export function nhiLaunchVelocityFromLook(
  fx: number,
  fy: number,
  fz: number,
  u0: number,
  u1: number,
  u2: number,
  u3: number,
): NhiLaunchVelocity {
  let rx = -fz;
  let ry = 0;
  let rz = fx;
  let rLen = Math.hypot(rx, rz);
  if (rLen < 1e-8) {
    rx = 1;
    ry = 0;
    rz = 0;
  } else {
    rx /= rLen;
    rz /= rLen;
  }
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;
  const yaw = (u0 - 0.5) * 2.6;
  const pitch = (u1 - 0.5) * 2.0;
  let dx = fx + rx * yaw + ux * pitch;
  let dy = fy + ry * yaw + uy * pitch;
  let dz = fz + rz * yaw + uz * pitch;
  const dLen = Math.hypot(dx, dy, dz) || 1;
  dx /= dLen;
  dy /= dLen;
  dz /= dLen;
  const speed = 7 + u2 * 5;
  const jx = (u3 - 0.5) * 1.2;
  const jz = (u0 + u1 - 1) * 0.9;
  return {
    x: dx * speed + rx * jx,
    y: dy * speed + uy * (u2 - 0.5) * 0.8,
    z: dz * speed + rz * jz,
  };
}

/** Minion birth kick — isotropic-ish cone from the parent NHI. */
export function nhiMinionKickVelocity(u0: number, u1: number, u2: number): NhiLaunchVelocity {
  const ang = u0 * Math.PI * 2;
  const elev = (u1 - 0.35) * 1.5;
  const kick = 2.2 + u2 * 2.8;
  const ch = Math.cos(elev);
  return {
    x: Math.cos(ang) * ch * kick,
    y: Math.sin(elev) * kick,
    z: Math.sin(ang) * ch * kick,
  };
}
