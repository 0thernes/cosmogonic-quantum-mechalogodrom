/**
 * STRANGE ATTRACTOR — Chaos engine (BRUTALISM 3/9)
 *
 * Three coupled strange attractors running as cognitive-physics substrates:
 *   • Lorenz (σ=10, ρ=28, β=8/3)  — the canonical chaos butterfly
 *   • Rössler (a=0.2, b=0.2, c=5.7) — funnel attractor
 *   • Rabinovich-Fabrikant (γ=0.87, δ=0.1) — multi-wing attractor
 *
 * Each attractor is stepped via RK4 (deterministic, Δt=0.002) producing a
 * trajectory {x,y,z} that feeds:
 *   1. Chaos index  — Lyapunov proxy (running variance of divergence rate)
 *   2. Attractor bias — maps attractor coordinates → cognitive modulations
 *   3. Phase coupling — Moonlab tensor contraction across all three attractors
 *   4. Quantum aliveness — quakePerturb injects Tsotchke QGE noise
 *   5. Eshkol AD — gradient of chaos index for self-tuning σ
 *
 * The chaos index feeds back to super-mind criticality + curiosity.
 * NOT SENTIENT. Deterministic math; no physical chaos claim beyond the model.
 */

import { moonlabTensorContract, eshkolADGradient, quakePerturb } from './tsotchke-facade';

// Audit #254: 0.002/beat needed ~5k beats to reach the attractor; 0.01 (still stable RK-free Euler
// for Lorenz at these parameters) settles in ~1k.
const DT = 0.01;

// Basin re-injection seeds — the attractors' initial conditions; boundVec resets here on numerical escape.
const LORENZ_SEED: Vec3 = { x: 0.1, y: 0.0, z: 0.0 };
const ROSSLER_SEED: Vec3 = { x: 0.1, y: 0.0, z: 0.0 };
const RABINOVICH_SEED: Vec3 = { x: 0.1, y: 0.0, z: 0.1 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function boundVecInPlace(s: Vec3, m: number, seed: Vec3): void {
  if (
    !Number.isFinite(s.x) ||
    !Number.isFinite(s.y) ||
    !Number.isFinite(s.z) ||
    Math.abs(s.x) > m ||
    Math.abs(s.y) > m ||
    Math.abs(s.z) > m
  ) {
    s.x = seed.x;
    s.y = seed.y;
    s.z = seed.z;
  }
}

function rk4LorenzInPlace(s: Vec3, dt: number, sigma: number, rho: number, beta: number): void {
  const sx = s.x,
    sy = s.y,
    sz = s.z;
  const h = dt * 0.5;
  const k1x = sigma * (sy - sx);
  const k1y = sx * (rho - sz) - sy;
  const k1z = sx * sy - beta * sz;

  const x2 = sx + k1x * h,
    y2 = sy + k1y * h,
    z2 = sz + k1z * h;
  const k2x = sigma * (y2 - x2);
  const k2y = x2 * (rho - z2) - y2;
  const k2z = x2 * y2 - beta * z2;

  const x3 = sx + k2x * h,
    y3 = sy + k2y * h,
    z3 = sz + k2z * h;
  const k3x = sigma * (y3 - x3);
  const k3y = x3 * (rho - z3) - y3;
  const k3z = x3 * y3 - beta * z3;

  const x4 = sx + k3x * dt,
    y4 = sy + k3y * dt,
    z4 = sz + k3z * dt;
  const k4x = sigma * (y4 - x4);
  const k4y = x4 * (rho - z4) - y4;
  const k4z = x4 * y4 - beta * z4;

  s.x = sx + ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
  s.y = sy + ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6;
  s.z = sz + ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6;
}

function rk4RosslerInPlace(s: Vec3, dt: number, a: number, b: number, c: number): void {
  const sx = s.x,
    sy = s.y,
    sz = s.z;
  const h = dt * 0.5;
  const k1x = -sy - sz;
  const k1y = sx + a * sy;
  const k1z = b + sz * (sx - c);

  const x2 = sx + k1x * h,
    y2 = sy + k1y * h,
    z2 = sz + k1z * h;
  const k2x = -y2 - z2;
  const k2y = x2 + a * y2;
  const k2z = b + z2 * (x2 - c);

  const x3 = sx + k2x * h,
    y3 = sy + k2y * h,
    z3 = sz + k2z * h;
  const k3x = -y3 - z3;
  const k3y = x3 + a * y3;
  const k3z = b + z3 * (x3 - c);

  const x4 = sx + k3x * dt,
    y4 = sy + k3y * dt,
    z4 = sz + k3z * dt;
  const k4x = -y4 - z4;
  const k4y = x4 + a * y4;
  const k4z = b + z4 * (x4 - c);

  s.x = sx + ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
  s.y = sy + ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6;
  s.z = sz + ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6;
}

function rk4RabinovichInPlace(s: Vec3, dt: number, gamma: number, delta: number): void {
  const sx = s.x,
    sy = s.y,
    sz = s.z;
  const h = dt * 0.5;
  const sx2 = sx * sx;
  const k1x = sy * (sz - 1 + sx2) + gamma * sx;
  const k1y = sx * (3 * sz + 1 - sx2) + gamma * sy;
  const k1z = -2 * sz * (delta + sx * sy);

  const x2 = sx + k1x * h,
    y2 = sy + k1y * h,
    z2 = sz + k1z * h;
  const x2Sq = x2 * x2;
  const k2x = y2 * (z2 - 1 + x2Sq) + gamma * x2;
  const k2y = x2 * (3 * z2 + 1 - x2Sq) + gamma * y2;
  const k2z = -2 * z2 * (delta + x2 * y2);

  const x3 = sx + k2x * h,
    y3 = sy + k2y * h,
    z3 = sz + k2z * h;
  const x3Sq = x3 * x3;
  const k3x = y3 * (z3 - 1 + x3Sq) + gamma * x3;
  const k3y = x3 * (3 * z3 + 1 - x3Sq) + gamma * y3;
  const k3z = -2 * z3 * (delta + x3 * y3);

  const x4 = sx + k3x * dt,
    y4 = sy + k3y * dt,
    z4 = sz + k3z * dt;
  const x4Sq = x4 * x4;
  const k4x = y4 * (z4 - 1 + x4Sq) + gamma * x4;
  const k4y = x4 * (3 * z4 + 1 - x4Sq) + gamma * y4;
  const k4z = -2 * z4 * (delta + x4 * y4);

  s.x = sx + ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
  s.y = sy + ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6;
  s.z = sz + ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6;
}

export interface AttractorSnapshot {
  lorenz: Vec3;
  rossler: Vec3;
  rabinovich: Vec3;
  chaosIndex: number;
  phaseCoherence: number;
  lyapunovProxy: number;
}

export class StrangeAttractor {
  private lorenz: Vec3 = { x: 0.1, y: 0.0, z: 0.0 };
  private rossler: Vec3 = { x: 0.1, y: 0.0, z: 0.0 };
  private rabinovich: Vec3 = { x: 0.1, y: 0.0, z: 0.1 };
  private chaosIndex = 0.5;
  private lyapunovProxy = 0.5;
  private phaseCoherence = 0.5;
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);
  private beatCount = 0;

  // Tunable Lorenz sigma (Eshkol AD self-tunes this)
  private sigma = 10.0;
  private readonly rho = 28.0;
  private readonly beta = 8 / 3;

  step(externalDrive = 0.5): void {
    this.beatCount++;
    // RK4 step all three
    const lSig = this.sigma;
    // Re-inject each attractor at its basin seed on numerical escape (esp. the stiff Rabinovich-Fabrikant) so
    // the chaos can never diverge to NaN and poison the cognition that now reads it, yet stays genuinely
    // varying (clamp-and-stick would freeze it dead-constant on the rail).
    rk4LorenzInPlace(this.lorenz, DT, lSig, this.rho, this.beta);
    boundVecInPlace(this.lorenz, 90, LORENZ_SEED);
    rk4RosslerInPlace(this.rossler, DT, 0.2, 0.2, 5.7);
    boundVecInPlace(this.rossler, 60, ROSSLER_SEED);
    rk4RabinovichInPlace(this.rabinovich, DT, 0.87, 0.1);
    boundVecInPlace(this.rabinovich, 15, RABINOVICH_SEED);

    // Lyapunov proxy: running velocity magnitude of |dX/dt| for Lorenz normalized by characteristic
    // Lorenz attractor speed (~250) so lyapunovProxy fluctuates in (0,1) instead of saturating at 1.
    const lx = this.lorenz.x;
    const ly = this.lorenz.y;
    const lz = this.lorenz.z;
    const ldx = lSig * (ly - lx);
    const ldy = lx * (this.rho - lz) - ly;
    const ldz = lx * ly - this.beta * lz;
    const lorenzRate = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
    this.lyapunovProxy += 0.05 * (clamp01(lorenzRate / 250) - this.lyapunovProxy);

    // Moonlab tensor: phase coherence across three attractors
    this.tA[0] = clamp01(this.lorenz.x / 30 + 0.5);
    this.tA[1] = clamp01(this.lorenz.y / 30 + 0.5);
    this.tA[2] = clamp01(this.rossler.x / 10 + 0.5);
    this.tA[3] = clamp01(this.rossler.y / 10 + 0.5);
    this.tB[0] = clamp01(this.rabinovich.x / 5 + 0.5);
    this.tB[1] = clamp01(this.rabinovich.y / 5 + 0.5);
    this.tB[2] = clamp01(this.lorenz.z / 50 + 0.5);
    this.tB[3] = clamp01(externalDrive);
    const tensorPhase = moonlabTensorContract(this.tA, this.tB, 4);
    this.phaseCoherence += 0.1 * (clamp01(Math.abs(tensorPhase)) - this.phaseCoherence);

    // quakePerturb: QGE aliveness on Lorenz state
    const qk = quakePerturb(clamp01(this.lorenz.x / 30 + 0.5), this.beatCount % 37, 0.08);
    // Audit #254: a multiplicative kick knocked Lorenz x off the attractor; it is now a small additive
    // nudge proportional to the QGE deviation.
    this.lorenz.x += (qk - 1) * 0.1;

    // Eshkol AD: self-tune sigma to keep chaos index near criticality (target 0.5)
    const chaosTarget = 0.5 + externalDrive * 0.2;
    const grad = eshkolADGradient((sig: number) => clamp01(Math.abs(sig - 10) / 10), this.sigma);
    this.sigma = clamp(this.sigma + (chaosTarget - this.lyapunovProxy) * 0.1 - grad * 0.05, 6, 16);

    // Final chaos index
    this.chaosIndex = clamp01(
      0.4 * this.lyapunovProxy +
        0.4 * this.phaseCoherence +
        0.2 * clamp01(Math.abs(this.lorenz.x) / 20),
    );
  }

  /** Cognitive bias vector [0..1]^8 from attractor coordinates. */
  cognitiveBias(): number[] {
    return [
      clamp01(this.lorenz.x / 30 + 0.5),
      clamp01(this.lorenz.y / 30 + 0.5),
      clamp01(this.lorenz.z / 50),
      clamp01(this.rossler.x / 10 + 0.5),
      clamp01(this.rossler.z / 20),
      clamp01(this.rabinovich.x / 5 + 0.5),
      this.chaosIndex,
      this.phaseCoherence,
    ];
  }

  get chaos(): number {
    return this.chaosIndex;
  }

  snapshot(): AttractorSnapshot {
    return {
      lorenz: { ...this.lorenz },
      rossler: { ...this.rossler },
      rabinovich: { ...this.rabinovich },
      chaosIndex: this.chaosIndex,
      phaseCoherence: this.phaseCoherence,
      lyapunovProxy: this.lyapunovProxy,
    };
  }
}
