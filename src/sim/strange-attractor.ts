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

const DT = 0.002;

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

function lorenzDeriv(s: Vec3, sigma: number, rho: number, beta: number): Vec3 {
  return {
    x: sigma * (s.y - s.x),
    y: s.x * (rho - s.z) - s.y,
    z: s.x * s.y - beta * s.z,
  };
}

function rosslerDeriv(s: Vec3, a: number, b: number, c: number): Vec3 {
  return {
    x: -s.y - s.z,
    y: s.x + a * s.y,
    z: b + s.z * (s.x - c),
  };
}

function rabinovichDeriv(s: Vec3, gamma: number, delta: number): Vec3 {
  const x2 = s.x * s.x;
  return {
    x: s.y * (s.z - 1 + x2) + gamma * s.x,
    y: s.x * (3 * s.z + 1 - x2) + gamma * s.y,
    z: -2 * s.z * (delta + s.x * s.y),
  };
}

function rk4Step(s: Vec3, dt: number, deriv: (v: Vec3) => Vec3): Vec3 {
  const k1 = deriv(s);
  const k2 = deriv({
    x: s.x + (k1.x * dt) / 2,
    y: s.y + (k1.y * dt) / 2,
    z: s.z + (k1.z * dt) / 2,
  });
  const k3 = deriv({
    x: s.x + (k2.x * dt) / 2,
    y: s.y + (k2.y * dt) / 2,
    z: s.z + (k2.z * dt) / 2,
  });
  const k4 = deriv({ x: s.x + k3.x * dt, y: s.y + k3.y * dt, z: s.z + k3.z * dt });
  return {
    x: s.x + ((k1.x + 2 * k2.x + 2 * k3.x + k4.x) * dt) / 6,
    y: s.y + ((k1.y + 2 * k2.y + 2 * k3.y + k4.y) * dt) / 6,
    z: s.z + ((k1.z + 2 * k2.z + 2 * k3.z + k4.z) * dt) / 6,
  };
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
    this.lorenz = rk4Step(this.lorenz, DT, (s) => lorenzDeriv(s, lSig, this.rho, this.beta));
    this.rossler = rk4Step(this.rossler, DT, (s) => rosslerDeriv(s, 0.2, 0.2, 5.7));
    this.rabinovich = rk4Step(this.rabinovich, DT, (s) => rabinovichDeriv(s, 0.87, 0.1));

    // Lyapunov proxy: running variance of |dX/dt| for Lorenz
    const lorenzRate = Math.sqrt(
      lorenzDeriv(this.lorenz, lSig, this.rho, this.beta).x ** 2 +
        lorenzDeriv(this.lorenz, lSig, this.rho, this.beta).y ** 2 +
        lorenzDeriv(this.lorenz, lSig, this.rho, this.beta).z ** 2,
    );
    this.lyapunovProxy += 0.05 * (clamp01(lorenzRate / 30) - this.lyapunovProxy);

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
    this.lorenz.x *= qk;

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
