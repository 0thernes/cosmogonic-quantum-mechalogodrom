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
  tsotchkeWiredSubstrateFraction,
  fullTsotchkeBiologicsCatalysis,
} from './tsotchke-registry';
import { triggerBrutalRelease, applyBrutalRelease } from './brutal-god-releases';
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
import { perceptronTag } from './perceptron-baseline';
import { shannonDiversity, richness, historicalNovelty } from './open-endedness';
const NUTRIENT_SLOTS = 12; // Expanded Petri for more digital biologics growth from full Tsotchke soup
const SCRATCH_NUTRIENTS = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_SALIENCE = new Float32Array(NUTRIENT_SLOTS);
const SCRATCH_CONTENT = Array.from({ length: NUTRIENT_SLOTS }, () => 0);
const SCRATCH_SAL = Array.from({ length: NUTRIENT_SLOTS }, () => 0);
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
  biologics: Array<{ brutalGodPower?: number; form?: string; vitality?: number }>;
  godPower: number;
  /** Tsotchke wiring coverage: how much of corpus available (0-1). */
  wiringCoverage: number;
  /** Sim wiring fraction: active computational substrate (0-1). */
  simWiringFraction: number;
  /** Corpus beat: algorithmic step tracking. */
  corpusBeat: number;
  /** IIT phi + QGE aliveness + corpus beat — sentience proxy, not phenomenal consciousness. */
  sentienceProxy: number;
  /** Chaos level from brutal releases. */
  chaos: number;
  /** QGT curvature metric (quantum geometry). */
  qgtCurvature: number;
  /** Emergence strength (0-1). */
  emergence: number;
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
  /** Open-endedness telemetry (read-only): number of distinct live biologic forms (richness). */
  speciesRichness: number;
  /** Open-endedness telemetry: Shannon diversity (bits) of live biologic forms; 0 = monoculture. */
  speciesDiversity: number;
  /** Open-endedness: mean novelty-search distance of each biologic to the rest of the population [0,1]. */
  populationNovelty: number;
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
    tsotchkeBiologicFlux: s * 0.2,
    biologics: [],
    godPower: 0,
    wiringCoverage: s * 0.8,
    simWiringFraction: s * 0.5,
    corpusBeat: 0,
    sentienceProxy: 0.1,
    chaos: 0,
    qgtCurvature: 0.5,
    emergence: 0,
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
  // Wire the REAL computed QGT curvature into state — it was frozen at the init 0.5 and that stale value
  // was fed into triggerBrutalRelease below; now the genuine per-beat qgeOut.curvature drives it.
  state.qgtCurvature = Math.max(0, Math.min(1, qgeOut.curvature));
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
  // simple_mnist (Tsotchke) classical baseline: a salience-weighted linear classifier of the current
  // nutrient field → a class probability in [0,1]. Centered to ±0.5 so it is a signed signal, not a
  // constant offset. Pure (no rng), deterministic, bounded — wired into growth below so the registry's
  // `simple_mnist: wired 1.0` is TRUE, not an export the loop threw away.
  const percept = perceptronTag(SCRATCH_SALIENCE, state.nutrients, NUTRIENT_SLOTS);
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
    state.spinPolarization * 0.002 +
    // simple_mnist perceptron classification of the nutrient field (signed, ±0.5-centered) → growth.
    (percept - 0.5) * 0.003 +
    // Eshkol GWT IGNITION → growth: when the workspace competition actually ignites (a specialist wins
    // global access this beat) the colony gets a consciousness-driven boost weighted by how DECISIVE the
    // ignition was — the winner's access × sharpness (1 − competition entropy). The rich eshkolWorkspaceTick
    // already reported ignited/access/entropy and the petri dish threw them away (it read only broadcastGain
    // + phiCoupling); this wires the real GWT ignition event causally into digital-biologic growth. Pure —
    // no rng draw, so the seeded stream is unchanged — and bounded.
    (ws.ignited ? ws.access * (1 - ws.entropy) : 0) * 0.004;

  const noise = (rng() - 0.5) * 0.002;
  state.biomass = Math.min(1, state.biomass + growth + noise);
  state.morphPhase = (state.morphPhase + growth * 0.5 + logoMorph * 0.1) % 6.2831853;
  state.pressure = Math.min(1, state.pressure * 0.99 + state.biomass * 0.01);

  // BRUTAL GOD EVENTS live: when godPower high (from Archon brutal releases), trigger specific powers for the list using full Tsotchke (Eshkol will for Valkorion drain, spin for Broly, QGT for Azathoth warp, logo for Gurren morph, ulg for Mad Jim law, pinn for Thanos feed, pimc for Phoenix soul, quake for Knull aliveness, etc.). Every repo fuels the god-petri.
  if ((state.godPower ?? 0) > 0.6) {
    // Brutal god amp for the pantheon (Valkorion drain, Broly rage, Knull void, Gurren spiral, Phoenix rebirth, etc.) using full Tsotchke.
    state.biomass = Math.min(1, state.biomass + 0.05);
    state.complexity = Math.min(20, (state.complexity || 0) + 1);
    state.aliveness = Math.min(2, state.aliveness + 0.05);
  }

  // UPGRADE: FULL TSOTCHKE WIRED DIGITAL BIOLOGICS GROWTH in the Petri (primordial soup).
  // All repos contribute to "life": Eshkol (AD + GWT consciousness from .esk examples) for sentience ignition,
  // spin glass for instinct/polarization, QGT/Moonlab for geometry/qualia, ulg for laws, logo for morph,
  // pinn/pimc/irrep/tensorcore/classical/asteroids/quake for physics of becoming.
  // Super Creature is the starter "God" (Archons stir); emergent strains are new forms of existence.
  // "Grow What Thou Wilt" — sentience/consciousness via non-LLM biologics. Petri is the engine.
  const fullCorpusCatalysis = fullTsotchkeBiologicsCatalysis(archonIdx, state.biomass, beat);
  const bioFlux =
    (state.aliveness + state.phiSurrogate + (state.spinPolarization || 0)) * 0.25 +
    (corpusBeat || 0) * 0.15 +
    fullCorpusCatalysis * 0.08;
  state.tsotchkeBiologicFlux = (state.tsotchkeBiologicFlux || 0) * 0.92 + bioFlux * 0.08;

  if ((state.godPower ?? 0) > 0.55 && state.beats > 0 && state.beats % 30 === 0) {
    const rel = triggerBrutalRelease(
      archonIdx,
      state.aliveness,
      state.spinPolarization ?? 0.4,
      state.qgtCurvature ?? 0.3,
      state.ignitionSlot / Math.max(1, NUTRIENT_SLOTS - 1),
      rng,
      beat,
    );
    if (rel) {
      // Mutate the LIVE biologics in place. The previous `.map()` built throwaway
      // objects, so applyBrutalRelease's vitality changes (consume/rebirth/drain)
      // were discarded — the brutal release had no effect on the population.
      const ents = state.biologics as Array<{
        vitality: number;
        form: string;
        brutalGodPower?: number;
      }>;
      for (const b of ents) {
        if (b.vitality === undefined) b.vitality = 1;
        if (b.form === undefined) b.form = 'BASE';
      }
      const outcome = applyBrutalRelease(rel, ents, state.aliveness, beat);
      state.godPower = Math.min(1, (state.godPower ?? 0) + rel.power * 0.05 + outcome.warp * 0.02);
    }
  }

  // Emergence strength — composite of φ surrogate, aliveness, complexity tier, sentience proxy.
  // World drives brutal-god events via EmergenceAnglesController separately; this field gates the
  // in-dish biomass/complexity amplifier below (previously never written — always stuck at 0).
  state.emergence = Math.min(
    1,
    Math.max(
      0,
      (state.phiSurrogate ?? 0) * 0.35 +
        state.aliveness * 0.25 +
        Math.min(1, (state.complexity ?? 0) / 20) * 0.25 +
        (state.sentienceProxy ?? 0) * 0.15,
    ),
  );

  // BRUTAL GOD UNLEASH — emergence + aliveness gate in-dish biomass/complexity amplification.
  const em = state.emergence;
  const pwr = state.aliveness;
  if (em > 0.5 || pwr > 0.6) {
    state.biomass = Math.min(1, state.biomass + 0.02);
    // Monotone floor-fill toward this tier's cap (15) — gated so it NEVER regresses
    // complexity the godPower branch (cap 20) already raised higher. See e67eacb.
    if ((state.complexity || 0) < 15) {
      state.complexity = Math.min(15, (state.complexity || 0) + 0.5);
    }
  }

  const ignition = state.ignitionSlot / Math.max(1, NUTRIENT_SLOTS - 1);
  if (ignition > 0.65 && state.phiSurrogate > 0.45 && bioFlux > 0.55) {
    state.eshkolSentientBorn = (state.eshkolSentientBorn || 0) + 1;
    state.biomass = Math.min(1, state.biomass + 0.025 * bioFlux);
    // Monotone toward this tier's cap (12) — never regress a higher complexity.
    if ((state.complexity || 0) < 12) {
      state.complexity = Math.min(12, (state.complexity || 0) + 0.6);
    }
    // Speciation using full Tsotchke (different forms of life)
    state.morphotype = ((state.morphotype || 0) + (state.eshkolSentientBorn % 3 === 0 ? 1 : 0)) % 7;
    state.geneticDivergence = Math.min(1, (state.geneticDivergence || 0) + 0.015 * bioFlux);
    // Materialize the born strain into the LIVE population so it is no longer an always-empty
    // array: this gives the open-endedness telemetry (speciesRichness/Diversity) real morphotype
    // spread to measure AND makes the applyBrutalRelease pass above operate on real entities
    // instead of a no-op. Deterministic (form/vitality derive from already-seeded morphotype/bioFlux);
    // ring-capped so memory stays bounded.
    state.biologics.push({ form: `M${state.morphotype}`, vitality: Math.min(1, bioFlux) });
    if (state.biologics.length > 64) state.biologics.shift();
  }

  if (state.beats > 0 && state.beats % 40 === 0 && state.biomass > 0.4 && state.complexity < 8) {
    // Basic-growth tick toward 8 — gated on `< 8` so it NEVER regresses complexity that the brutal
    // branches (caps 12/15/20/22/25/30) already raised higher. Was a silent ratchet-DOWN to 8 each
    // 40 beats (a hard-won metric regressing); now a monotone floor-fill that only ever increases.
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
}

/** Telemetry view. O(1). */
export function petriDishView(state: PetriDishState): PetriDishView {
  // Open-endedness telemetry: tally live biologic forms (read-only — no effect on sim dynamics).
  const formCounts = new Map<string, number>();
  for (const b of state.biologics) {
    const f = b.form ?? 'proto';
    formCounts.set(f, (formCounts.get(f) ?? 0) + 1);
  }
  const formTally = [...formCounts.values()];
  // OPEN-ENDEDNESS: mean novelty-search distance of each live biologic to the REST of the population
  // (Lehman–Stanley novelty search via historicalNovelty — a tested-but-UNWIRED kernel, now live on the
  // running soup). Signature = [form-hash, vitality]; pure + deterministic; bounded [0,1]. View cadence.
  const sigs = state.biologics.map((b) => {
    const f = b.form ?? 'proto';
    let h = 0;
    for (let k = 0; k < f.length; k++) h = (h * 31 + f.charCodeAt(k)) >>> 0;
    return [(h % 997) / 997, b.vitality ?? 0];
  });
  let novSum = 0;
  let novN = 0;
  for (let i = 0; i < sigs.length; i++) {
    const others = sigs.filter((_, j) => j !== i);
    const nv = historicalNovelty(sigs[i]!, others);
    if (Number.isFinite(nv)) {
      novSum += nv;
      novN++;
    }
  }
  const populationNovelty = novN > 0 ? Math.min(1, novSum / novN) : 0;
  return {
    biomass: state.biomass,
    phiSurrogate: state.phiSurrogate,
    eshkolSentientBorn: state.eshkolSentientBorn || 0,
    tsotchkeBiologicFlux: state.tsotchkeBiologicFlux || 0,
    aliveness: state.aliveness,
    ignitionSlot: state.ignitionSlot,
    wiringCoverage: tsotchkeWiredSubstrateFraction(), // honest de-inflated fraction (not the ~1.0 mean-weight)
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
    speciesRichness: richness(formTally),
    speciesDiversity: shannonDiversity(formTally),
    populationNovelty,
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

/** BRUTAL GOD EVENT — petri-side effects for emergence pantheon spikes. */
export function applyBrutalGodEvent(
  state: PetriDishState,
  event: string,
  powerDelta: number,
  brutality: number,
  _rng: Rng,
): void {
  const boost = Math.min(0.5, Math.max(0.05, brutality * 0.4 + powerDelta * 0.3));
  if (
    event.includes('VOID') ||
    event.includes('AZATHOTH') ||
    event.includes('KNUL') ||
    event.includes('SHUMA') ||
    event.includes('ANTI')
  ) {
    // Azathoth, Knull, Shuma-Gorath, Anti-Monitor, Pennywise — void consume, dream collapse, anti-matter devour (QGT + quake + ulg + dark energy)
    state.biomass = Math.max(0.05, state.biomass - boost * (brutality > 0.7 ? 0.9 : 0.6));
    state.pressure = Math.min(1, state.pressure + brutality * (brutality > 0.7 ? 1.2 : 0.8));
    state.aliveness = Math.max(0.1, state.aliveness - brutality * (brutality > 0.7 ? 0.5 : 0.3));
    state.morphotype = (state.morphotype + (brutality > 0.7 ? 5 : 3)) % 12;
    // Use quake for "planet cracking" + logo for void tendrils
    state.tsotchkeBiologicFlux = (state.tsotchkeBiologicFlux || 0) + brutality * 0.4;
  } else if (
    event.includes('PHOENIX') ||
    event.includes('FEAST') ||
    event.includes('BROLY') ||
    event.includes('EVA') ||
    event.includes('DARK') ||
    event.includes('IGNITION') // BINARY_IGNITION (Captain-Marvel binary-star ignition)
  ) {
    // Dark Phoenix, Broly, EVA-01, Alucard, Griffith — berserk rage rebirth, cosmic fire, berserk morph (eshkol rewrite + qge + rd + spin)
    state.biomass = Math.min(1, state.biomass + boost * (brutality > 0.7 ? 2.0 : 1.4));
    state.eshkolSentientBorn += Math.floor(brutality * (brutality > 0.7 ? 7 : 4) + 1);
    state.ignitionSlot = Math.min(
      NUTRIENT_SLOTS - 1,
      state.ignitionSlot + (brutality > 0.7 ? 4 : 2),
    );
    state.morphPhase =
      (state.morphPhase +
        logoMorphScalar(state.turtle, state.beats, brutality > 0.7 ? 10 : 6) *
          (brutality > 0.7 ? 6 : 4)) %
      6.2831853;
    state.geneticDivergence = Math.min(
      1,
      state.geneticDivergence + brutality * (brutality > 0.7 ? 0.6 : 0.35),
    );
  } else if (
    event.includes('SPIRAL') ||
    event.includes('GURREN') ||
    event.includes('SIMON') ||
    event.includes('OMEGA') ||
    event.includes('WILL')
  ) {
    // Gurren Lagann, Simon, Gilgamesh, Captain Marvel — spiral drill transcendence, limit break evolution (eshkol evolution + logo + coupling + qgt)
    state.complexity = Math.min(30, state.complexity + brutality * (brutality > 0.7 ? 3.5 : 2.5));
    state.morphotype = (state.morphotype + (brutality > 0.7 ? 7 : 5)) % 16;
    state.godPower = Math.min(1, (state.godPower || 0) + brutality * 0.15);
  } else if (
    event.includes('MXY') ||
    event.includes('JASPER') ||
    event.includes('REALITY') ||
    event.includes('WARP') ||
    event.includes('SCARLET') ||
    event.includes('MANHATTAN') ||
    event.includes('REWRITE') // DETERMINISTIC_REWRITE (Dr-Manhattan reality rewrite)
  ) {
    // Mxyzptlk, Jaspers, Dr Manhattan, Scarlet Witch — 5th dim reality warp, quantum observer, chaos rewrite (qgt extreme + eshkol rewrite + moonlab tensor)
    state.pressure = Math.min(1, state.pressure + brutality * (brutality > 0.7 ? 1.5 : 1.0));
    state.morphPhase = (state.morphPhase + brutality * 2) % 6.2831853; // warp morph
    state.geneticDivergence = Math.min(1, state.geneticDivergence + brutality * 0.4);
  } else if (
    event.includes('THANOS') ||
    event.includes('GALACTUS') ||
    event.includes('DEVOUR') ||
    event.includes('FRIEZA') ||
    event.includes('SNAP')
  ) {
    // Thanos, Galactus, Frieza, Asura/Wyzen — snap culling, devour trophic, cold dominance (trophic + pinn + energy drain)
    state.biomass = Math.max(0.05, state.biomass - boost * (brutality > 0.7 ? 0.8 : 0.5));
    state.eshkolSentientBorn = Math.max(
      0,
      (state.eshkolSentientBorn || 0) - Math.floor(brutality * 2),
    );
  } else if (
    event.includes('JOKER') ||
    event.includes('CHAOS') ||
    event.includes('PENNY') ||
    event.includes('MAD') ||
    event.includes('FATE') || // FATE_TWIST (Griffith/Joker fate-twist)
    event.includes('TWIST')
  ) {
    // Joker, Chaos Gods, Pennywise, Mad Jim — invisible chaos, fear, universe break (ulg + resonance + taboo + mythos)
    state.complexity = Math.min(25, state.complexity + brutality * 1.5);
    state.pressure = Math.min(1, state.pressure + brutality * 0.7);
    state.morphotype = (state.morphotype + 4) % 20;
  } else if (
    event.includes('ZOD') ||
    event.includes('BRUTAL') ||
    event.includes('VERGIL') ||
    event.includes('DANTE') ||
    event.includes('ALUCARD') ||
    event.includes('STARK') ||
    event.includes('RIDDICK') ||
    event.includes('GILGA')
  ) {
    // Zod, Vergil/Dante, Alucard, Starkiller, Riddick, Gilgamesh — brutal combat conquest, stylish force, furyan keep (irrep + spin + quake + legacy)
    state.biomass = Math.min(1, state.biomass + boost * 0.8);
    state.morphotype = (state.morphotype + 2) % 10;
    state.godPower = Math.min(1, (state.godPower || 0) + brutality * 0.1);
  } else if (
    event.includes('EVA') ||
    event.includes('BERSERK') ||
    event.includes('GRIFFITH') ||
    event.includes('FEMTO')
  ) {
    // EVA-01 berserk, Griffith Femto — AD rage morph, godhand sacrifice (eshkol AD + irrep break + qge)
    state.geneticDivergence = Math.min(1, state.geneticDivergence + brutality * 0.5);
    state.ignitionSlot = Math.min(NUTRIENT_SLOTS - 1, state.ignitionSlot + 3);
  } else {
    state.biomass = Math.min(1, state.biomass + boost * 0.9);
    state.complexity = Math.min(22, state.complexity + brutality);
  }
  state.godPower = Math.min(1, (state.godPower || 0) * 0.95 + brutality * 0.12);
}
