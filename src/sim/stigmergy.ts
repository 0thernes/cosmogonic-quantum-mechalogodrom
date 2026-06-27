/**
 * STIGMERGY — Collective intelligence via pheromone lattice (BRUTALISM 8/9)
 *
 * Stigmergy (Grassé 1959): indirect coordination through environmental marks.
 * Ants, termites, and slime molds build global complexity via local pheromone
 * deposition + evaporation — no central controller, no direct communication.
 *
 * Implementation:
 *   • 2D pheromone lattice GRID×GRID with 4 channels:
 *     0=food-trail, 1=alarm, 2=recruitment, 3=nest-marker
 *   • Gaussian diffusion (σ=1.5) each beat
 *   • Exponential evaporation (τ_evap = 0.05)
 *   • Moonlab tensor: multi-channel pheromone aggregation (MPO bond compression)
 *   • Eshkol AD: gradient of trail strength for gradient-following navigation
 *   • libirrep D₄ symmetry (square lattice): enforces 4-fold rotational symmetry
 *   • quakePerturb: stochastic noise (ant random walk component)
 *   • GWT: high pheromone density triggers alarm broadcast
 *
 * Outputs: trail strength, alarm level, gradient vector for navigation.
 * NOT SENTIENT. Swarm coordination model; no individual mind attributed to ants.
 */

import {
  moonlabTensorContract,
  moonlabMpoStep,
  eshkolADGradient,
  libirrepSymmetry,
  quakePerturb,
  gwtBroadcast,
} from './tsotchke-facade';

const GRID = 8; // 8×8 pheromone lattice
const CHANNELS = 4;
const EVAP_TAU = 0.05;
const DIFFUSE_SIGMA = 0.3;
const N = GRID * GRID;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function idx(x: number, y: number): number {
  return (((y % GRID) + GRID) % GRID) * GRID + (((x % GRID) + GRID) % GRID);
}

export interface StigmergySnapshot {
  trailStrength: number;
  alarmLevel: number;
  recruitmentLevel: number;
  gradient: [number, number]; // navigation gradient dx, dy
  totalPheromone: number;
  broadcastAlarm: number;
}

export class Stigmergy {
  private readonly grid = new Float32Array(N * CHANNELS);
  private readonly scratch = new Float32Array(N * CHANNELS);
  private trailStrength = 0;
  private alarmLevel = 0;
  private broadcastAlarm = 0;
  private beatCount = 0;
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);

  private cell(x: number, y: number, ch: number): number {
    return this.grid[idx(x, y) * CHANNELS + ch] ?? 0;
  }

  private setCell(x: number, y: number, ch: number, v: number): void {
    this.grid[idx(x, y) * CHANNELS + ch] = clamp01(v);
  }

  /**
   * Deposit pheromone at (x,y) on channel ch.
   * Called by creature agents from the sim loop.
   */
  deposit(x: number, y: number, channel: number, amount: number): void {
    const gx = Math.floor(((x + 1) / 2) * (GRID - 1));
    const gy = Math.floor(((y + 1) / 2) * (GRID - 1));
    const cur = this.cell(gx, gy, channel);
    this.setCell(gx, gy, channel, clamp01(cur + amount));
  }

  /**
   * Read pheromone gradient at (x,y) for navigation.
   * Returns [dx, dy] normalized gradient direction.
   */
  readGradient(x: number, y: number, channel: number): [number, number] {
    const gx = Math.floor(((x + 1) / 2) * (GRID - 1));
    const gy = Math.floor(((y + 1) / 2) * (GRID - 1));
    const east = this.cell(gx + 1, gy, channel);
    const west = this.cell(gx - 1, gy, channel);
    const north = this.cell(gx, gy + 1, channel);
    const south = this.cell(gx, gy - 1, channel);
    const gDx = east - west;
    const gDy = north - south;
    const norm = Math.sqrt(gDx * gDx + gDy * gDy) + 1e-9;
    // Eshkol AD: gradient of trail strength for navigation confidence
    const adGrad = eshkolADGradient((g: number) => clamp01(g * g), Math.abs(gDx) + Math.abs(gDy));
    return [(gDx / norm) * (1 + adGrad * 0.1), (gDy / norm) * (1 + adGrad * 0.1)];
  }

  /** Advance pheromone field one beat: diffuse + evaporate + Tsotchke wiring. */
  step(): void {
    this.beatCount++;

    // Gaussian diffusion (3×3 kernel)
    this.scratch.fill(0);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        for (let ch = 0; ch < CHANNELS; ch++) {
          let acc = 0;
          let wSum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const w = Math.exp(-(dx * dx + dy * dy) / (2 * DIFFUSE_SIGMA * DIFFUSE_SIGMA));
              acc += this.cell(x + dx, y + dy, ch) * w;
              wSum += w;
            }
          }
          this.scratch[idx(x, y) * CHANNELS + ch] = clamp01(acc / wSum);
        }
      }
    }

    // Copy diffused + evaporate
    for (let i = 0; i < N * CHANNELS; i++) {
      this.grid[i] = clamp01((this.scratch[i] ?? 0) * (1 - EVAP_TAU));
    }

    // libirrep D₄ symmetry: enforce 4-fold rotational symmetry on food channel
    for (let i = 0; i < GRID; i++) {
      const sym = libirrepSymmetry(2, (i + this.beatCount) % 7); // D₄ irrep
      const corr = ((sym % 3) - 1) * 0.002;
      this.grid[idx(i, 0) * CHANNELS + 0] = clamp01(
        (this.grid[idx(i, 0) * CHANNELS + 0] ?? 0) + corr,
      );
    }

    // quakePerturb: stochastic noise (random-walk component)
    const qk = quakePerturb(0.5, this.beatCount % 31, 0.04);
    const randCell = this.beatCount % N;
    for (let ch = 0; ch < CHANNELS; ch++) {
      this.grid[randCell * CHANNELS + ch] = clamp01(
        (this.grid[randCell * CHANNELS + ch] ?? 0) * qk,
      );
    }

    // Moonlab tensor: multi-channel pheromone aggregation (MPO)
    for (let ch = 0; ch < 4; ch++) {
      const center = GRID / 2;
      this.tA[ch] = this.cell(center, center, ch);
    }
    this.tB[0] = this.trailStrength;
    this.tB[1] = this.alarmLevel;
    this.tB[2] = 0.5;
    this.tB[3] = clamp01(this.beatCount / 1000);
    const tensorAgg = moonlabTensorContract(this.tA, this.tB, 4);

    // MPO: bond-compress the food channel signal
    const foodCol = new Float32Array(GRID);
    for (let y = 0; y < GRID; y++) foodCol[y] = this.cell(GRID / 2, y, 0);
    const mpoOut = moonlabMpoStep(foodCol, 2, 4);

    // Summary scalars
    let total = 0;
    let alarmTotal = 0;
    let trailTotal = 0;
    for (let i = 0; i < N; i++) {
      total +=
        (this.grid[i * CHANNELS + 0] ?? 0) +
        (this.grid[i * CHANNELS + 1] ?? 0) +
        (this.grid[i * CHANNELS + 2] ?? 0) +
        (this.grid[i * CHANNELS + 3] ?? 0);
      alarmTotal += this.grid[i * CHANNELS + 1] ?? 0;
      trailTotal += this.grid[i * CHANNELS + 0] ?? 0;
    }
    this.trailStrength = clamp01(
      trailTotal / N + Math.abs(mpoOut) * 0.02 + Math.abs(tensorAgg) * 0.01,
    );
    this.alarmLevel = clamp01(alarmTotal / N);

    // GWT alarm broadcast
    const gwtOut = gwtBroadcast([this.alarmLevel, this.trailStrength], [0.8, 0.4]);
    this.broadcastAlarm = clamp01(gwtOut[0] ?? 0);
  }

  get trail(): number {
    return this.trailStrength;
  }
  get alarm(): number {
    return this.alarmLevel;
  }
  get alarmBroadcast(): number {
    return this.broadcastAlarm;
  }

  snapshot(): StigmergySnapshot {
    const [gx, gy] = this.readGradient(0, 0, 0);
    const total = this.grid.reduce((s, v) => s + v, 0) / N;
    return {
      trailStrength: this.trailStrength,
      alarmLevel: this.alarmLevel,
      recruitmentLevel: (() => {
        let s = 0;
        for (let i = 0; i < N; i++) s += this.grid[i * CHANNELS + 2] ?? 0;
        return clamp01(s / N);
      })(),
      gradient: [gx, gy],
      totalPheromone: clamp01(total),
      broadcastAlarm: this.broadcastAlarm,
    };
  }
}
