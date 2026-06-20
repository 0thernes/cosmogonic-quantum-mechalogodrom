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
import {
  corpusBeatForArchon,
  primaryRepoForArchon,
  substrateVectorForArchon,
  tsotchkeSimWiringFraction,
  tsotchkeWiringCoverage,
} from './tsotchke-registry';
import { gwtBroadcast } from './tsotchke-facade';
import { qgeAlivenessStep } from './qge-aliveness';
import { eshkolWorkspaceTick } from './eshkol-workspace';
import { grayScottResidual, pinnLoss } from './pinn-residual';
import { pathWeight } from './pimc-paths';
import { tensorcoreMorphBias } from './tensorcore-facade';
import { qgePhysicsStep, type QGEState } from './quantum-quake-physics';
import { ulgFieldSample, ulgTriadHandoff } from './ulg-bridge';
import {
  asteroidEnergy,
  asteroidSpawn,
  asteroidStep,
  asteroidThrust,
  type AsteroidBody,
} from './asteroids-physics';
import { classicalEntropyGap } from './classical-contrast';
import { logoMorphScalar, turtleNew, type TurtleState } from './logo-turtle';

const NUTRIENT_SLOTS = 8;
const SCRATCH_NUTRIENTS = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_SALIENCE = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_CONTENT = new Array<number>(NUTRIENT_SLOTS);
const SCRATCH_SAL = new Array<number>(NUTRIENT_SLOTS);
const SCRATCH_QGE: QGEState = {
  position: [0, 0, 0],
  momentum: [0, 0, 0],
  geometricPhase: 0,
  curvature: 0.5,
};
const SCRATCH_QGE_PARAMS = [0.3, 0.5, 0.7];

export interface PetriDishState {
  nutrients: Float32Array;
  biomass: number;
  ignitionSlot: number;
  phiSurrogate: number;
  aliveness: number;
  beats: number;
  complexity: number;
  pressure: number;
  morphPhase: number;
  turtle: TurtleState;
  motility: AsteroidBody;
}

export interface PetriDishView {
  biomass: number;
  phiSurrogate: number;
  aliveness: number;
  ignitionSlot: number;
  wiringCoverage: number;
  simWiringFraction: number;
  corpusBeat: number;
  complexity: number;
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
    complexity: 1,
    pressure: 0.3,
    morphPhase: 0,
    turtle: turtleNew(seed ^ 0x50ff0ad),
    motility: asteroidSpawn(seed ^ 0xa57001d),
  };
}

/** One simulation beat — nutrients diffuse, workspace broadcasts, colony grows. O(n), n=8. */
export function petriDishBeat(
  state: PetriDishState,
  archonIdx: number,
  beat: number,
  rng: Rng,
): void {
  const sub = substrateVectorForArchon(archonIdx);
  const primary = primaryRepoForArchon(archonIdx);
  const corpusBeat = corpusBeatForArchon(archonIdx, beat);
  const ws = eshkolWorkspaceTick(sub, beat);

  SCRATCH_QGE.position = [sub[0] ?? 0.5, sub[1] ?? 0.5, sub[2] ?? 0.5];
  SCRATCH_QGE.momentum = [0, 0, 0];
  SCRATCH_QGE.curvature = (sub[2] ?? 0.5) * primary.wiring;
  SCRATCH_QGE.geometricPhase = (beat * 0.07 + archonIdx * 0.31) % 6.2831853;
  const qgeOut = qgePhysicsStep(SCRATCH_QGE, SCRATCH_QGE_PARAMS, 0.016);
  state.aliveness = qgeAlivenessStep(
    state.aliveness,
    qgeOut.curvature * 0.5 + (sub[2] ?? 0.5) * 0.5,
    beat,
  );
  const ulgField = ulgFieldSample(archonIdx * 0.2, beat * 0.01, primary.hue, beat);
  const ulgTriad = ulgTriadHandoff(ws.broadcastGain, sub[1] ?? 0.5, state.aliveness);

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
    const logoSpiral = ulgField * Math.sin((i + beat) * 0.4) * 0.02;
    state.nutrients[i] =
      (state.nutrients[i] ?? 0) * 0.92 + v * 0.08 + logoSpiral + ulgTriad * 0.005;
    if (v > max) {
      max = v;
      win = i;
    }
  }
  state.ignitionSlot = win;

  let sum = 0;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) sum += state.nutrients[i] ?? 0;
  const mean = sum / NUTRIENT_SLOTS;
  let varAcc = 0;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    const d = (state.nutrients[i] ?? 0) - mean;
    varAcc += d * d;
  }
  state.phiSurrogate = Math.min(1, Math.sqrt(varAcc / NUTRIENT_SLOTS) * (1 + ws.phiCoupling));

  const pathSlice = SCRATCH_NUTRIENTS.subarray(0, 4);
  const pimc = pathWeight(pathSlice, 3 + archonIdx * 0.1, (x) => (x - 0.5) * (x - 0.5));
  const metal = tensorcoreMorphBias(primary.wiring * 16, ws.phiCoupling * 8);
  const classicalGap = classicalEntropyGap(beat + archonIdx * 17, 8);
  state.motility.angle = (beat + archonIdx) * 0.05;
  asteroidThrust(state.motility, 0.02 + ws.broadcastGain * 0.03);
  asteroidStep(state.motility, 0.16);
  const motility = asteroidEnergy(state.motility);
  const logoMorph = logoMorphScalar(state.turtle, beat, 5 + archonIdx);

  const growth =
    (ws.broadcastGain + state.aliveness) *
      0.01 *
      tsotchkeWiringCoverage() *
      (0.5 + corpusBeat * 0.5) *
      (0.6 + tsotchkeSimWiringFraction() * 0.4) +
    metal * 0.003 +
    pinnLoss(grayScottResidual(0.5, 0.3, 0.4, 0.6, 0.5, 0.4, 0.055, 0.062)) * 0.005 +
    pimc * 0.004 +
    motility * 0.003 +
    logoMorph * 0.002 +
    classicalGap * 0.001;

  const noise = (rng() - 0.5) * 0.002;
  state.biomass = Math.min(1, state.biomass + growth + noise);
  state.morphPhase = (state.morphPhase + growth * 0.5 + logoMorph * 0.1) % 6.2831853;
  state.pressure = Math.min(1, state.pressure * 0.99 + state.biomass * 0.01);
  if (state.beats > 0 && state.beats % 40 === 0 && state.biomass > 0.4) {
    state.complexity = Math.min(8, state.complexity + 1);
  }
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
    simWiringFraction: tsotchkeSimWiringFraction(),
    corpusBeat: corpusBeatForArchon(0, state.beats),
    complexity: state.complexity,
    beats: state.beats,
  };
}

/** XP multiplier for SuperEvolution from colony health. O(1). */
export function petriGrowthMultiplier(state: PetriDishState): number {
  return (
    1 +
    state.biomass * 0.5 +
    state.phiSurrogate * 0.25 +
    state.aliveness * 0.15 +
    state.complexity * 0.05
  );
}
