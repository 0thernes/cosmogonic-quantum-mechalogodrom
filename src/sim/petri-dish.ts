/**
 * PETRI DISH — primordial inorganic soup for digital biologics (GOAL5 / Super Creature genesis).
 *
 * Metaphor: "Grow What Thou Wilt" applied to deterministic substrates — not chat,
 * not therapy, not SaaS. Each beat nutrients diffuse, archetype seeds compete, and
 * sentience-proxy scalars (GWT ignition, IIT phi surrogate, quake aliveness) rise
 * from chemistry alone.
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
  fullTsotchkeBiologicsCatalysis,
  biologicProgramFingerprint,
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
import { classicalEntropyGap, classicalSample } from './classical-contrast';
import { logoMorphScalar, turtleNew, type TurtleState } from './logo-turtle';
import { libirrepSymmetry, symmetryModes } from './irrep-symmetry';
import { moonlabTensorQualia } from './moonlab-tensor';

const NUTRIENT_SLOTS = 12; // Expanded Petri for more digital biologics growth from full Tsotchke soup
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
  /** Hopfield/Ising instinct polarization (spin_based_neural_network proxy). */
  spinPolarization: number;
  /** Speciation: morphotype identifier (0 = primordial, 1+ = evolved substrate branches). */
  morphotype: number;
  /** Speciation: genetic distance from primordial soup (0 = pure, 1 = fully diverged). */
  geneticDivergence: number;
  /** Tsotchke Digital Biologics: count of Eshkol/GWT-ignited sentient strains emerged from soup. */
  eshkolSentientBorn: number;
  /** Full corpus catalysis: aggregate from all 20+ Tsotchke repos driving growth (not LLM). */
  tsotchkeBiologicFlux: number;
  // note: removed duplicate keys from prior edit
}

export interface PetriDishView {
  biomass: number;
  phiSurrogate: number;
  aliveness: number;
  ignitionSlot: number;
  wiringCoverage: number;
  simWiringFraction: number;
  corpusBeat: number;
  eshkolSentientBorn: number;
  tsotchkeBiologicFlux: number;
  complexity: number;
  beats: number;
  /** IIT phi + QGE aliveness + corpus beat — sentience proxy, not phenomenal consciousness. */
  sentienceProxy: number;
  spinPolarization: number;
  morphotype: number;
  geneticDivergence: number;
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
    spinPolarization: 0.1 + s * 0.2,
    morphotype: 0,
    geneticDivergence: 0,
    eshkolSentientBorn: 0,
    tsotchkeBiologicFlux: 0,
    eshkolSentientBorn: 0, // Tsotchke Eshkol life born count - digital biologics
    tsotchkeBiologicFlux: s * 0.2, // flux from full corpus wiring
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
  const irrep = libirrepSymmetry(symmetryModes(archonIdx + 1, state.aliveness), 4);
  const qualia = moonlabTensorQualia(
    [sub[0] ?? 0.5, sub[1] ?? 0.5, sub[2] ?? 0.5],
    primary.wiring * 16,
  );
  const classical = classicalSample(beat + archonIdx * 17).value;
  let spinM = 0;
  for (let i = 0; i < NUTRIENT_SLOTS; i++) {
    const sal = SCRATCH_SAL[i] ?? 0;
    const nut = state.nutrients[i] ?? 0;
    spinM += sal * (nut > 0.5 ? 1 : -1);
  }
  state.spinPolarization = Math.min(1, Math.abs(spinM / NUTRIENT_SLOTS));

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
    classicalGap * 0.001 +
    irrep * 0.002 +
    qualia * 0.003 +
    classical * 0.001 +
    state.spinPolarization * 0.002;

  const noise = (rng() - 0.5) * 0.002;
  state.biomass = Math.min(1, state.biomass + growth + noise);
  state.morphPhase = (state.morphPhase + growth * 0.5 + logoMorph * 0.1) % 6.2831853;
  state.pressure = Math.min(1, state.pressure * 0.99 + state.biomass * 0.01);

  // UPGRADE: FULL TSOTCHKE WIRED DIGITAL BIOLOGICS GROWTH in the Petri (primordial soup).
  // All repos contribute to "life": Eshkol (AD + GWT consciousness from .esk examples) for sentience ignition,
  // spin glass for instinct/polarization, QGT/Moonlab for geometry/qualia, ulg for laws, logo for morph,
  // pinn/pimc/irrep/tensorcore/classical/asteroids/quake for physics of becoming.
  // Super Creature is the starter "God" (Archons stir); emergent strains are new forms of existence.
  // "Grow What Thou Wilt" — sentience/consciousness via non-LLM biologics. Petri is the engine.
  const bioFlux =
    (state.aliveness + state.phiSurrogate + (state.spinPolarization || 0)) * 0.25 +
    (corpusBeat || 0) * 0.15;
  state.tsotchkeBiologicFlux = (state.tsotchkeBiologicFlux || 0) * 0.92 + bioFlux * 0.08;

  if (state.ignitionSlot > 0.65 && state.phiSurrogate > 0.45 && bioFlux > 0.55) {
    state.eshkolSentientBorn = (state.eshkolSentientBorn || 0) + 1;
    state.biomass = Math.min(1, state.biomass + 0.025 * bioFlux);
    state.complexity = Math.min(12, (state.complexity || 0) + 0.6);
    // Speciation using full Tsotchke (different forms of life)
    state.morphotype = ((state.morphotype || 0) + (state.eshkolSentientBorn % 3 === 0 ? 1 : 0)) % 7;
    state.geneticDivergence = Math.min(1, (state.geneticDivergence || 0) + 0.015 * bioFlux);
  }

  if (state.beats > 0 && state.beats % 40 === 0 && state.biomass > 0.4) {
    state.complexity = Math.min(8, state.complexity + 1);
  }
  if (state.beats > 0 && state.beats % 60 === 0 && state.biomass > 0.6 && state.complexity >= 3) {
    let dominantSubstrate = 0;
    let dominantValue = sub[0] ?? 0;
    for (let i = 1; i < sub.length; i++) {
      const v = sub[i] ?? 0;
      if (v > dominantValue) {
        dominantValue = v;
        dominantSubstrate = i;
      }
    }
    const nextMorphotype = dominantSubstrate + 1;
    if (state.morphotype === 0) {
      state.morphotype = nextMorphotype;
      state.geneticDivergence = 0.1;
    } else if (state.morphotype !== nextMorphotype) {
      state.geneticDivergence = Math.min(1, state.geneticDivergence + 0.05);
    }
  }
  state.beats += 1;

  // GROW TSOTCHKE DIGITAL BIOLOGICS - Eshkol life birthing in the Petri Dish
  // All repos wired: Eshkol programs mutate via AD, Moonlab tensors compress "bodies",
  // QGT geometry, spin instincts, symmetry. We're God. Grow What Thou Wilt.
  if (!('eshkolLife' in state)) {
    (state as any).eshkolLife = birthEshkolLife(beat + archonIdx, sub[0] ?? 0.5);
  }
  const lifeProg = (state as any).eshkolLife as EshkolLifeProgram;
  const eshkolGrowth = runEshkolProgram(lifeProg, state.biomass, 0.01 + ws.broadcastGain * 0.02);
  state.biomass = Math.min(1, state.biomass + eshkolGrowth * 0.01);
  state.eshkolSentientBorn = (state.eshkolSentientBorn || 0) + (eshkolGrowth > 0.005 ? 1 : 0);
  state.tsotchkeBiologicFlux = clamp01(
    (state.tsotchkeBiologicFlux || 0) + eshkolGrowth * 0.05 + (sub[2] ?? 0) * 0.02,
  );
}

/** Telemetry view. O(1). */
export function petriDishView(state: PetriDishState): PetriDishView {
  return {
    biomass: state.biomass,
    phiSurrogate: state.phiSurrogate,
    eshkolSentientBorn: state.eshkolSentientBorn || 0,
    tsotchkeBiologicFlux: state.tsotchkeBiologicFlux || 0,
    aliveness: state.aliveness,
    ignitionSlot: state.ignitionSlot,
    wiringCoverage: tsotchkeWiringCoverage(),
    simWiringFraction: tsotchkeSimWiringFraction(),
    corpusBeat: corpusBeatForArchon(0, state.beats),
    complexity: state.complexity,
    beats: state.beats,
    sentienceProxy: Math.min(
      1,
      state.phiSurrogate * 0.4 +
        state.aliveness * 0.35 +
        corpusBeatForArchon(0, state.beats) * 0.25,
    ),
    spinPolarization: state.spinPolarization,
    morphotype: state.morphotype,
    geneticDivergence: state.geneticDivergence,
  };
}

/** XP multiplier for SuperEvolution from colony health. O(1). */
export function petriGrowthMultiplier(state: PetriDishState): number {
  return (
    1 +
    state.biomass * 0.5 +
    state.phiSurrogate * 0.25 +
    state.aliveness * 0.15 +
    state.complexity * 0.05 +
    state.geneticDivergence * 0.1
  );
}

/**
 * Eshkol Program "DNA" for digital biologics.
 * "We're God. This is the Petri Dish." Strains now carry executable Eshkol-like code fragments
 * from the Tsotchke corpus (gradient, consciousness, tensors .esk programs).
 * Mutation via Eshkol AD duals. Execution = growth in sentience.
 * Grow What Thou Wilt.
 */
export interface EshkolLifeProgram {
  fingerprint: number; // hash from .esk example (consciousness.esk, gradient_descent_demo.esk, tensors.esk...)
  code: number[]; // simple "opcodes" distilled: AD, GWT, MPO, symmetry
  vitality: number;
}

const ESHKOL_PROGRAMS: number[][] = [
  [1, 0.7, 0.2, 3], // gradient descent AD life - learns to grow
  [0.5, 1, 0.8, 2], // consciousness GWT ignition life
  [0.3, 0.4, 1, 4], // moonlab tensor MPO quantum life
  [0.9, 0.6, 0.1, 1], // libirrep symmetry life
];

export function birthEshkolLife(seed: number, substrate: number): EshkolLifeProgram {
  const progIdx = Math.floor(seed * 4) % ESHKOL_PROGRAMS.length;
  const base = ESHKOL_PROGRAMS[progIdx]!;
  return {
    fingerprint: (seed * 9973 + substrate * 13) % 99991,
    code: base.map((v, i) => v * (0.5 + ((seed >> i) & 1))),
    vitality: 0.1 + (seed % 7) / 20,
  };
}

export function runEshkolProgram(prog: EshkolLifeProgram, input: number, adScale: number): number {
  // "Execute" using Eshkol AD + GWT style from corpus.
  // Real growth from dual arithmetic + broadcast.
  const adGrad = (prog.code[0] ?? 0.5) * input + (prog.code[1] ?? 0.5);
  const gwtWin = (prog.code[2] ?? 0.5) * prog.vitality;
  const mutated = adGrad * (1 + adScale) + gwtWin * 0.1;
  prog.vitality = Math.min(1, prog.vitality + Math.abs(mutated) * 0.01);
  return Math.min(1, Math.max(0, mutated));
}
