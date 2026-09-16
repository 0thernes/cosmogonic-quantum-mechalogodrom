/**
 * schrodinger.ts — numerical time-dependent Schrödinger evolution (leaf, exclusive owner).
 *
 * A classical numerical model evolves a complex wavefunction ψ(x,t) on a 1-D grid
 * under Ĥ = −½∂ₓ² + V(x) by the Crank–Nicolson (Cayley) scheme
 *     (I + i·dt/2·Ĥ) ψⁿ⁺¹ = (I − i·dt/2·Ĥ) ψⁿ ,
 * which is EXACTLY unitary (norm- and energy-conserving to machine precision)
 * and unconditionally stable. This is the simulated quantum-mechanics substrate behind
 * the corpus's `quantum-quake` QGE physics (`qge_physics.c`) — wavepackets that
 * propagate, disperse, and tunnel, not a "gravity-well proxy" multiplier.
 *
 * The implicit step is a complex tridiagonal solve (Thomas algorithm) with
 * Dirichlet (hard-wall) boundaries. DETERMINISM (Manhattan): pure linear
 * algebra, NO `Rng`, NO `Date.now`, fixed elimination order; same ψ₀ + V + dt ⇒
 * same trajectory, bit for bit. Callers on a hot path can retain one
 * {@link SchrodingerWorkspace}; the inner sweeps are then allocation-free.
 * Ref: Crank & Nicolson, Proc. Camb. Phil. Soc. 43
 * (1947); Goldberg, Schey & Schwartz, Am. J. Phys. 35 (1967).
 */

/** A complex wavefunction sampled on a uniform grid (split real/imag arrays). */
export interface Wave {
  readonly re: Float64Array;
  readonly im: Float64Array;
}

/**
 * Reusable storage for the complex Thomas sweep.
 *
 * A workspace belongs to one synchronous evolution at a time. Its arrays are
 * deliberately exposed as readonly references so tests and profilers can pin
 * their identity; callers must not mutate their contents while
 * {@link cnStepInto} is running.
 */
export interface SchrodingerWorkspace {
  readonly size: number;
  readonly dRe: Float64Array;
  readonly dIm: Float64Array;
  readonly cpRe: Float64Array;
  readonly cpIm: Float64Array;
  readonly dpRe: Float64Array;
  readonly dpIm: Float64Array;
}

/** Largest grid supported (keeps the O(N) tridiagonal solve bounded). */
export const SCHRODINGER_MAX_N = 1024;

/** Allocate the six O(N) Thomas-sweep buffers once for repeated CN steps. */
export function createSchrodingerWorkspace(n: number): SchrodingerWorkspace {
  if (!Number.isInteger(n) || n < 0 || n > SCHRODINGER_MAX_N) {
    throw new Error(`schrodinger: workspace size must be an integer in [0, ${SCHRODINGER_MAX_N}]`);
  }
  return {
    size: n,
    dRe: new Float64Array(n),
    dIm: new Float64Array(n),
    cpRe: new Float64Array(n),
    cpIm: new Float64Array(n),
    dpRe: new Float64Array(n),
    dpIm: new Float64Array(n),
  };
}

/** ⟨ψ|ψ⟩ = Σ|ψⱼ|² (grid-normalised norm²; dx cancels in conserved ratios). */
export function norm2(psi: Wave): number {
  let s = 0;
  for (let j = 0; j < psi.re.length; j++) s += psi.re[j]! * psi.re[j]! + psi.im[j]! * psi.im[j]!;
  return s;
}

/** A normalised Gaussian wavepacket centred at x0, width σ, carrying momentum k0. */
export function gaussianPacket(n: number, dx: number, x0: number, sigma: number, k0: number): Wave {
  const wave: Wave = { re: new Float64Array(n), im: new Float64Array(n) };
  return gaussianPacketInto(wave, dx, x0, sigma, k0);
}

/**
 * Write a normalised Gaussian wavepacket into caller-owned buffers.
 * Reusing `out` is bit-identical to {@link gaussianPacket} and allocation-free.
 */
export function gaussianPacketInto(
  out: Wave,
  dx: number,
  x0: number,
  sigma: number,
  k0: number,
): Wave {
  const { re, im } = out;
  const n = re.length;
  if (im.length !== n) throw new Error('schrodinger: wave real/imaginary lengths differ');
  // Fresh typed arrays were zero-filled in gaussianPacket. Clear reused storage
  // to preserve that exact boundary condition before the identical arithmetic.
  re.fill(0);
  im.fill(0);
  for (let j = 1; j < n - 1; j++) {
    const x = j * dx;
    const env = Math.exp(-((x - x0) * (x - x0)) / (2 * sigma * sigma));
    re[j] = env * Math.cos(k0 * x);
    im[j] = env * Math.sin(k0 * x);
  }
  const nrm = Math.sqrt(norm2(out)) || 1;
  for (let j = 0; j < n; j++) {
    re[j] = re[j]! / nrm;
    im[j] = im[j]! / nrm;
  }
  return out;
}

/** ⟨Ĥ⟩ = Σ Re(ψ*ⱼ (Ĥψ)ⱼ) — conserved for a time-independent potential. */
export function expectationEnergy(psi: Wave, V: readonly number[], dx: number): number {
  const n = psi.re.length;
  const inv = 1 / (dx * dx);
  let e = 0;
  for (let j = 0; j < n; j++) {
    // Dirichlet walls: ψ outside the grid is 0 (the SAME operator cnStep evolves under). The old
    // index-clamped neighbours substituted ψⱼ for the missing endpoint, a Neumann-like stencil that
    // reported a non-conserved ⟨Ĥ⟩ whenever a packet reached the walls.
    const lRe = j > 0 ? psi.re[j - 1]! : 0;
    const lIm = j > 0 ? psi.im[j - 1]! : 0;
    const rRe = j < n - 1 ? psi.re[j + 1]! : 0;
    const rIm = j < n - 1 ? psi.im[j + 1]! : 0;
    // (Ĥψ)ⱼ = −½(ψ₊ −2ψ +ψ₋)/dx² + Vⱼψⱼ
    const hRe = -0.5 * (rRe - 2 * psi.re[j]! + lRe) * inv + V[j]! * psi.re[j]!;
    const hIm = -0.5 * (rIm - 2 * psi.im[j]! + lIm) * inv + V[j]! * psi.im[j]!;
    e += psi.re[j]! * hRe + psi.im[j]! * hIm; // Re(ψ* · Ĥψ)
  }
  return e;
}

/** Mean position ⟨x⟩ = Σ xⱼ|ψⱼ|² / Σ|ψⱼ|². */
export function expectationX(psi: Wave, dx: number): number {
  let num = 0;
  let den = 0;
  for (let j = 0; j < psi.re.length; j++) {
    const p = psi.re[j]! * psi.re[j]! + psi.im[j]! * psi.im[j]!;
    num += j * dx * p;
    den += p;
  }
  return den > 0 ? num / den : 0;
}

/**
 * One Crank–Nicolson step. Solves (I + i·dt/2·Ĥ)ψⁿ⁺¹ = (I − i·dt/2·Ĥ)ψⁿ via a
 * complex tridiagonal Thomas sweep. Off-diagonals are the constant a = −i·k
 * (k = dt/4dx²); the diagonal carries the potential. O(N), unitary.
 */
export function cnStep(psi: Wave, V: readonly number[], dt: number, dx: number): Wave {
  const n = psi.re.length;
  const out: Wave = { re: new Float64Array(n), im: new Float64Array(n) };
  return cnStepInto(psi, V, dt, dx, out, createSchrodingerWorkspace(n));
}

/**
 * Allocation-free Crank–Nicolson step into caller-owned output and scratch.
 *
 * The arithmetic and statement order intentionally mirror the historical
 * allocating {@link cnStep} implementation exactly. `out` may alias `psi`:
 * the complete RHS is captured in the workspace before back-substitution
 * writes the result.
 */
export function cnStepInto(
  psi: Wave,
  V: readonly number[],
  dt: number,
  dx: number,
  out: Wave,
  workspace: SchrodingerWorkspace,
): Wave {
  const n = psi.re.length;
  if (psi.im.length !== n || out.re.length !== n || out.im.length !== n || workspace.size !== n) {
    throw new Error('schrodinger: wave/output/workspace sizes differ');
  }
  const k = dt / (4 * dx * dx);
  const p = dt / (2 * dx * dx);
  // RHS d = B ψ, with B diag (1, −(p + dt·Vⱼ/2)) and off-diag (0, +k).
  const { dRe, dIm, cpRe, cpIm, dpRe, dpIm } = workspace;
  for (let j = 0; j < n; j++) {
    const bdi = -(p + 0.5 * dt * V[j]!);
    const sumRe = (j > 0 ? psi.re[j - 1]! : 0) + (j < n - 1 ? psi.re[j + 1]! : 0);
    const sumIm = (j > 0 ? psi.im[j - 1]! : 0) + (j < n - 1 ? psi.im[j + 1]! : 0);
    // (1 + i·bdi)·ψⱼ + (0 + i·k)·sum
    dRe[j] = psi.re[j]! - bdi * psi.im[j]! - k * sumIm;
    dIm[j] = psi.im[j]! + bdi * psi.re[j]! + k * sumRe;
  }
  // Thomas: sub = super = a = (0,−k); diag bⱼ = (1, p + dt·Vⱼ/2). All complex.
  // j = 0
  {
    const b0i = p + 0.5 * dt * V[0]!;
    const denom = 1 + b0i * b0i; // |b0|², b0 = (1, b0i)
    // cp0 = a / b0 ; a = (0,−k)
    cpRe[0] = (-k * b0i) / denom;
    cpIm[0] = (-k * 1) / denom;
    // dp0 = d0 / b0
    dpRe[0] = (dRe[0]! * 1 + dIm[0]! * b0i) / denom;
    dpIm[0] = (dIm[0]! * 1 - dRe[0]! * b0i) / denom;
  }
  for (let j = 1; j < n; j++) {
    const bji = p + 0.5 * dt * V[j]!;
    // a·cp_{j-1}, a = (0,−k): (0−ik)(cr+ici) = (k·ci) + i(−k·cr)
    const acpRe = k * cpIm[j - 1]!;
    const acpIm = -k * cpRe[j - 1]!;
    // m = bⱼ − a·cp_{j-1} = (1 − acpRe, bji − acpIm)
    const mRe = 1 - acpRe;
    const mIm = bji - acpIm;
    const mDen = mRe * mRe + mIm * mIm;
    // cpⱼ = a / m
    cpRe[j] = (-k * mIm) / mDen;
    cpIm[j] = (-k * mRe) / mDen;
    // a·dp_{j-1}
    const adpRe = k * dpIm[j - 1]!;
    const adpIm = -k * dpRe[j - 1]!;
    // num = dⱼ − a·dp_{j-1}
    const numRe = dRe[j]! - adpRe;
    const numIm = dIm[j]! - adpIm;
    // dpⱼ = num / m
    dpRe[j] = (numRe * mRe + numIm * mIm) / mDen;
    dpIm[j] = (numIm * mRe - numRe * mIm) / mDen;
  }
  const { re, im } = out;
  re[n - 1] = dpRe[n - 1]!;
  im[n - 1] = dpIm[n - 1]!;
  for (let j = n - 2; j >= 0; j--) {
    // xⱼ = dpⱼ − cpⱼ·x_{j+1}
    const cxRe = cpRe[j]! * re[j + 1]! - cpIm[j]! * im[j + 1]!;
    const cxIm = cpRe[j]! * im[j + 1]! + cpIm[j]! * re[j + 1]!;
    re[j] = dpRe[j]! - cxRe;
    im[j] = dpIm[j]! - cxIm;
  }
  return out;
}

/** Evolve ψ for `steps` Crank–Nicolson ticks under potential V. */
export function evolve(
  psi: Wave,
  V: readonly number[],
  dt: number,
  dx: number,
  steps: number,
): Wave {
  if (psi.re.length > SCHRODINGER_MAX_N) {
    throw new Error(`schrodinger: grid exceeds SCHRODINGER_MAX_N=${SCHRODINGER_MAX_N}`);
  }
  let cur = psi;
  for (let t = 0; t < steps; t++) cur = cnStep(cur, V, dt, dx);
  return cur;
}
