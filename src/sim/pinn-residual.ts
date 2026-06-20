/**
 * PINN RESIDUAL — physics-informed loss from Tsotchke mirrors/PINN.
 * Gray-Scott PDE residual for reaction-diffusion coupling. O(1).
 * MIT © tsotchke — see THIRD-PARTY-NOTICES.md.
 */

/** Gray-Scott residual R_u = D_u∇²u + f(u,v) at a cell (finite-diff laplacian proxy). O(1). */
export function grayScottResidual(
  u: number,
  v: number,
  uL: number,
  uR: number,
  uU: number,
  uD: number,
  feed: number,
  kill: number,
  du = 0.16,
): number {
  const lapU = uL + uR + uU + uD - 4 * u;
  const f = -u * v * v + feed * (1 - u) - kill * v * 0.01;
  return du * lapU + f;
}

/** Scalar PINN loss proxy for field health [0,1]. O(1). */
export function pinnLoss(residual: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(residual) * 2));
}
