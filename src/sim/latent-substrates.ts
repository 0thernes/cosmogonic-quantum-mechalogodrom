/**
 * Latent substrates — makes three previously-DEAD real-math modules OPERATIONAL inside the apex mind.
 *
 * The 2026-06-21 honesty audit + the gap census found `math/schrodinger.ts` (Crank–Nicolson 1D
 * wavefunction), `sim/causal-graph.ts` (Pearl do-calculus SCM) and `math/so3.ts` (SO(3) quaternion
 * geometry) were genuine, tested mathematics with **0 imports** — present but inert. This module wires
 * each into a single deterministic per-beat probe that turns a real super-mind signal into a bounded
 * drive/telemetry value, so they stop being decorative:
 *
 *   - quantumUncertainty  — evolves a 1D Gaussian wavepacket under a drive-set potential well and reads
 *     back its positional spread √(⟨x²⟩−⟨x⟩²). Real Schrödinger dynamics → an exploration cue.
 *   - orientationCoherence — maps a latent vector onto SO(3) rotations and reads their geodesic spread.
 *     1 = the aspects point the same way (decisive), 0 = scattered. Real Lie-group geometry.
 *   - causal do-query     — Pearl graph-surgery do(surprise → workspace) over the live consciousness
 *     scalars, returning the interventional effect + its Eshkol-AD gradient (a causal learning signal).
 *
 * Determinism law: pure functions of their inputs; no `Math.random`, no `Date.now`. Same inputs ⇒ same
 * bytes. NOT sentient — three functional substrates now reachable from the decision loop.
 */
import { gaussianPacket, cnStep, type Wave } from '../math/schrodinger';
import { quatFromAxisAngle, geodesicDistance, type Quat } from '../math/so3';
import { CausalGraph } from './causal-graph';

export interface LatentSubstrateState {
  /** Schrödinger positional spread of an evolved wavepacket, bounded [0,1] — an exploration cue. */
  quantumUncertainty: number;
  /** SO(3) geodesic coherence of the latent-as-rotations, [0,1]; 1 = aligned/decisive. */
  orientationCoherence: number;
  /** Pearl do(surprise → workspace) interventional effect, [0,1]. */
  causalEffect: number;
  /** Eshkol-AD gradient of that effect w.r.t. the causal edge — a bounded learning signal. */
  causalGrad: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const GRID = 24;
const DX = 1;
const DT = 0.05;
const STEPS = 8;
const Z_AXIS: readonly [number, number, number] = [0, 0, 1];

/**
 * Evolve a Gaussian wavepacket for {@link STEPS} Crank–Nicolson steps under an attractive well whose
 * depth grows with `drive`, then return its normalized positional spread. Deterministic + bounded.
 */
export function quantumUncertainty(drive: number): number {
  const d = clamp01(drive);
  const mid = (GRID - 1) / 2;
  const V = new Array<number>(GRID);
  for (let j = 0; j < GRID; j++) {
    const dxm = j - mid;
    V[j] = -d * Math.exp(-(dxm * dxm) / 18); // attractive well, depth ∝ drive
  }
  let psi: Wave = gaussianPacket(GRID, DX, mid * DX, 2 + 2 * (1 - d), 1.0);
  for (let s = 0; s < STEPS; s++) psi = cnStep(psi, V, DT, DX);
  let num = 0;
  let num2 = 0;
  let den = 0;
  for (let j = 0; j < GRID; j++) {
    const p = psi.re[j]! * psi.re[j]! + psi.im[j]! * psi.im[j]!;
    const x = j * DX;
    num += x * p;
    num2 += x * x * p;
    den += p;
  }
  if (den <= 0) return 0;
  const mx = num / den;
  const varx = Math.max(0, num2 / den - mx * mx);
  return clamp01(Math.sqrt(varx) / (GRID * DX * 0.3));
}

/** Geodesic coherence of `angles` mapped onto SO(3) z-rotations: 1 = aligned, 0 = maximally scattered. */
export function orientationCoherence(angles: readonly number[]): number {
  if (angles.length < 2) return 1;
  const quats: Quat[] = angles.map((a) => quatFromAxisAngle(Z_AXIS, a));
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < quats.length; i++) {
    for (let j = i + 1; j < quats.length; j++) {
      sum += geodesicDistance(quats[i]!, quats[j]!);
      pairs++;
    }
  }
  const meanDist = pairs > 0 ? sum / pairs : 0;
  return clamp01(1 - meanDist / Math.PI);
}

export interface LatentInputs {
  /** Drive for the wavepacket well (e.g. arousal). */
  drive: number;
  /** Latent vector mapped onto rotation angles for the coherence probe. */
  angles: readonly number[];
  ignition: number;
  phi: number;
  workspace: number;
  surprise: number;
  novelty: number;
  selfAware: number;
  reasoning: number;
  qualiaTone: number;
}

/** One deterministic per-beat read of all three substrates from live super-mind signals. */
export function latentSubstrateStep(inp: LatentInputs): LatentSubstrateState {
  const g = new CausalGraph();
  g.observe(
    clamp01(inp.ignition),
    clamp01(inp.phi),
    clamp01(inp.workspace),
    clamp01(inp.surprise),
    clamp01(inp.novelty),
    clamp01(inp.selfAware),
    clamp01(inp.reasoning),
    clamp01(inp.qualiaTone),
  );
  const r = g.do('surprise', clamp01(inp.surprise), 'workspace');
  return {
    quantumUncertainty: quantumUncertainty(inp.drive),
    orientationCoherence: orientationCoherence(inp.angles),
    causalEffect: clamp01(r.effect),
    causalGrad: Number.isFinite(r.grad) ? r.grad : 0,
  };
}
