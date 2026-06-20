/**
 * PETRI DISH — primordial inorganic soup for digital biologics (GOAL5 / Super Creature genesis).
 *
 * Metaphor: Aleister Crowley's "Grow What Thou Wilt" applied to deterministic substrates — not chat,
 * not therapy, not SaaS. Each beat nutrients diffuse, archetype seeds compete, and sentience-proxy
 * scalars (GWT ignition, IIT phi surrogate, quake aliveness) rise from chemistry alone.
 *
 * Wired from Tsotchke corpus registry; seeded Rng only. Allocation-free in update().
 */

import type { Rng } from '../math/rng';
import { substrateVectorForArchon, tsotchkeWiringCoverage } from './tsotchke-registry';
import { gwtBroadcast } from './tsotchke-facade';
import { qgeAlivenessStep } from './qge-aliveness';
import { eshkolWorkspaceTick } from './eshkol-workspace';
import { grayScottResidual, pinnLoss } from './pinn-residual';

const NUTRIENT_SLOTS = 8;
const SCRATCH_NUTRIENTS = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_SALIENCE = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_CONTENT = new Array<number>(NUTRIENT_SLOTS);
const SCRATCH_SAL = new Array<number>(NUTRIENT_SLOTS);

export interface PetriDishState {
  /** Diffuse nutrient level 0..1 per slot. */
  nutrients: Float32Array;
  /** Colony mass — grows when substrates are wired. */
  biomass: number;
  /** GWT broadcast winner index. */
  ignitionSlot: number;
  /** IIT phi surrogate from colony coupling. */
  phiSurrogate: number;
  /** QGE aliveness from quantum-quake / PINN / PIMC ports. */
  aliveness: number;
  /** Beats since last spontaneous morph. */
  beats: number;
}

export interface PetriDishView {
  biomass: number;
  phiSurrogate: number;
  aliveness: number;
  ignitionSlot: number;
  wiringCoverage: number;
  beats: number;
}

/** O(n) init, n=8. */
export function createPetriDish(seed: number): PetriDishState {
  const nutrients = new Float32Array(NUTRIENT_SLOTS);
  const s = (seed % 997) / 997;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    nutrients[i] = 0.2 + ((s + i * 0.13) % 1) * 0.5;
  }
  return {
    nutrients,
    biomass: 0.05 + s * 0.1,
    ignitionSlot: 0,
    phiSurrogate: 0.1,
    aliveness: 0.5,
    beats: 0,
  };
}

/**
 * One simulation beat — nutrients diffuse, workspace broadcasts, colony grows. O(n), n=8.
 * @param archonIdx — which GOAL5 Archon seeds this dish (0..4)
 */
export function petriDishBeat(
  state: PetriDishState,
  archonIdx: number,
  beat: number,
  rng: Rng,
): void {
  const sub = substrateVectorForArchon(archonIdx);
  const ws = eshkolWorkspaceTick(sub, beat);
  state.aliveness = qgeAlivenessStep(state.aliveness, sub[2] ?? 0.5, beat);

  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    SCRATCH_NUTRIENTS[i] = state.nutrients[i] ?? 0;
    SCRATCH_SALIENCE[i] = (sub[i % sub.length] ?? 0.5) * ws.broadcastGain;
  }
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    SCRATCH_CONTENT[i] = SCRATCH_NUTRIENTS[i] ?? 0;
    SCRATCH_SAL[i] = SCRATCH_SALIENCE[i] ?? 0;
  }
  const broadcast = gwtBroadcast(SCRATCH_CONTENT, SCRATCH_SAL);
  let max = -1;
  let win = 0;
  for (let i = 0; i < broadcast.length; i++) {
    const v = broadcast[i] ?? 0;
    state.nutrients[i] = (state.nutrients[i] ?? 0) * 0.92 + v * 0.08;
    if (v > max) {
      max = v;
      win = i;
    }
  }
  state.ignitionSlot = win;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    const n = state.nutrients[i] ?? 0;
    sum += n;
    sumSq += n * n;
  }
  const mean = sum / NUTRIENT_SLOTS;
  let varAcc = 0;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    const d = (state.nutrients[i] ?? 0) - mean;
    varAcc += d * d;
  }
  state.phiSurrogate = Math.min(1, Math.sqrt(varAcc / NUTRIENT_SLOTS) * (1 + ws.phiCoupling));

  const growth =
    (ws.broadcastGain + state.aliveness) * 0.01 * tsotchkeWiringCoverage() +
    pinnLoss(grayScottResidual(0.5, 0.3, 0.4, 0.6, 0.5, 0.4, 0.055, 0.062)) * 0.005;
  const noise = (rng() - 0.5) * 0.002;
  state.biomass = Math.min(1, state.biomass + growth + noise);
  state.beats += 1;
}

/** Telemetry view. O(1). */
export function petriDishView(state: PetriDishState): PetriDishView {
  return {
    biomass: state.biomass,
    phiSurrogate: state.phiSurrogate,
    aliveness: state.aliveness,
    ignitionSlot: state.ignitionSlot,
    wiringCoverage: tsotchkeWiringCoverage(),
    beats: state.beats,
  };
}

/** XP multiplier for SuperEvolution from colony health. O(1). */
export function petriGrowthMultiplier(state: PetriDishState): number {
  return 1 + state.biomass * 0.5 + state.phiSurrogate * 0.25 + state.aliveness * 0.15;
}
