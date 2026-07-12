/**
 * DIGITAL BIOLOGICS — substrate-keyed lifeform birth + telemetry layer.
 *
 * Primordial soup + petri is the dish; this module mints `Biologic` records whose
 * traits are derived from the Tsotchke substrate beats (Eshkol .esk fingerprints, AD
 * fitness, GWT ignition, spin order, QGT curvature, irrep symmetry, quake aliveness, …).
 * `consciousness` is an explicitly-labelled COMPOSITE PROXY, not a measure of sentience;
 * `generation`/`speciation` are monotonic counters describing a single biologic, not a
 * closed genetic breeding loop (heritable reproduction runs in `nhi.spawnChild`, the
 * shoggoth pool, and the `.esk` `genome.breed` recombination in `primordial-soup`).
 * The BRUTAL_GOD_* / VOID_* forms are lore tags layered over the same substrate math.
 *
 * "Grow What Thou Wilt." Not LLM. Sentience/consciousness are GOALS, not claims.
 * This file is fully type-checked (the former @ts-nocheck was stale and has been removed).
 */

import { corpusBeatForArchon } from './tsotchke-registry';
import { eshkolWorkspaceTick } from './eshkol-workspace';
import {
  ESK_SAMPLE_PROGRAMS,
  getEshkolProgramFingerprint,
  TSOTCHKE_HARVEST,
} from './generated-tsotchke-seeds'; // Direct from Tsotchke local folder harvest — real .esk DNA
// P4 roadmap boundary: this layer currently uses harvested .esk fingerprints plus Eshkol AD/workspace
// signals as heritable DNA bias; native VM execution stays a measured next contract, not a shipped claim.
import { homebrewEshkolBeat } from './homebrew-eshkol'; // EVERY Tsotchke: homebrew for ancient/forbidden god DNA in brutal forms
// qrngApiDraw from quantum-rng-api (Tsotchke) used for Mxy/Jaspers chaos in catalysis - referenced in tsotchke-facade
import {
  adTapeNew,
  adTapeReset,
  adVar,
  adConst,
  adMul,
  adAdd,
  adSub,
  adBackward,
  adGradient,
  adValue,
  type AdTape,
} from '../math/eshkol-ad';
import { createMlp, mlpPredict, mlpTrainStepCurvature, type Mlp } from './ad-mlp';
import { EshkolTaylorJet } from '../math/eshkol-taylor-jet';
import { mulberry32 } from '../math/rng';
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Module-scope reused Wengert tape for the biologic learner — allocation-free on the per-beat hot path. */
const LEARN_TAPE: AdTape = adTapeNew(64);
/** Reused gradient-node scratch; grows only for an uncommon wider external call. */
const LEARN_THETA_NODES: number[] = Array.from({ length: 8 }, () => 0);
/** Reused three-feature substrate vector for the live petri population. */
const LEARN_INPUTS = new Float64Array(3);

/**
 * One EXACT reverse-mode-AD (Eshkol tape) gradient-ASCENT step on a biologic's fitness
 *   F(θ) = Σ θ_k·x_k − ½·reg·Σ θ_k²
 * — a linear reward for exploiting substrate inputs `x`, with L2 regularisation so θ converges to
 * x/reg rather than diverging. The gradient ∂F/∂θ_k = x_k − reg·θ_k is READ off the tape (not
 * hand-coded), so this is a genuine consumption of the AD engine by the base digital-life population.
 * Steps `weights` in place and returns the achieved F BEFORE the step (so a caller that loops sees F
 * climb monotonically to the plateau F* = ½‖x‖²/reg). Deterministic — exact AD, no rng. See
 * tests/biologic-learning.test.ts for the monotone-climb + ablation gate.
 */
export function biologicLearnStep(
  weights: number[],
  inputs: ArrayLike<number>,
  lr = 0.05,
  reg = 1,
): number {
  const tape = LEARN_TAPE;
  adTapeReset(tape);
  const n = weights.length;
  if (LEARN_THETA_NODES.length < n) LEARN_THETA_NODES.length = n;
  const halfReg = adConst(tape, 0.5 * reg);
  let f = adConst(tape, 0);
  for (let k = 0; k < n; k++) {
    const th = adVar(tape, weights[k] ?? 0);
    LEARN_THETA_NODES[k] = th;
    const reward = adMul(tape, th, adConst(tape, inputs[k] ?? 0)); // θ_k·x_k
    const penalty = adMul(tape, halfReg, adMul(tape, th, th)); // ½·reg·θ_k²
    f = adAdd(tape, f, adSub(tape, reward, penalty));
  }
  adBackward(tape, f);
  const fValue = adValue(tape, f);
  for (let k = 0; k < n; k++) {
    weights[k] = (weights[k] ?? 0) + lr * adGradient(tape, LEARN_THETA_NODES[k]!);
  }
  return fValue;
}
const WORKSPACE_SUBSTRATE = new Float32Array(3);

/** Digital biologic forms from the depth-classed Tsotchke corpus - different substrates yield different life. */
export const BIOLOGIC_FORMS = [
  'ESHKOL_NATIVE',
  'MOONLAB_TENSOR',
  'QGT_CURVED',
  'SPIN_COLLECTIVE',
  'IRREP_SYM',
  'QUAKE_UNITARY',
  'PINN_PHYSICS',
  'PIMC_SOUL',
  'ULG_HYBRID',
  'LOGO_PROC',
  'METAL_COMPUTE',
  'QRNG_ENTROPY',
  'CLASSICAL_BASE',
  'ASTEROID_BODY',
  'TOOLCHAIN_BUILD',
  'BRUTAL_GOD_PANTHEON',
  'VOID_AZATHOTH',
  'VOID_KNIGHT',
  'PHOENIX_DARK',
  'DEVOUR_GALACTUS',
  'BRUTAL_ZOD',
  'CHAOS_WARHAMMER',
  'REALITY_MXY',
  'SPIRAL_GURREN',
  'GURREN_SPIRAL_DRILL',
  'PHOENIX_FEAST_REBIRTH',
] as const;

export type BiologicFormKind = (typeof BIOLOGIC_FORMS)[number];

export interface Biologic {
  id: number;
  form: BiologicFormKind; // Substrate-determined form
  program: number | string; // .esk program name (from real local Tsotchke harvest) or fingerprint
  adFitness: number; // from Eshkol gradient
  gwtIgnition: number; // workspace broadcast
  spinOrder: number;
  qgtCurvature: number;
  irrepSymmetry: number;
  quakeAliveness: number;
  ulgLawfulness: number;
  logoMorph: number;
  metalCompute: number;
  qrngEntropy: number;
  pinnResidual: number;
  pimcPath: number;
  brutalGodPower?: number; // BRUTALISM / GOD TIER: Valkorion Tenebrae essence-drain / Thanos snap-scale / Captain Marvel binary / Scarlet Witch chaos-rewrite / DrM atomic / Galactus hunger / JeanDarkPhoenix rebirth / Broly legendary rage / Frieza final / Azathoth blind-dream / Cthulhu call / ShumaGorath chaos-lord / MadJimJaspers warp / Pennywise fear / AntiMonitor antimatter / Knull void-king / Mxyzptlk 5th-dim / Joker invisible-brutal / Zod conquer / Gilgamesh epic / Alucard hell / Griffith Femto / EVA-01 berserk / GurrenLagann spiral / Sephiroth one-wing / Asura wrath / Vergil / Dante / Starkiller / Riddick — powered by Eshkol will, QGT reality-bend, spin-madness, irrep-monolith, quake-unitary.
  asteroidDynamics: number;
  consciousness: number; // Composite sentience metric
  alive: boolean;
  generation: number;
  speciation: number; // Genetic distance from primordial
  /** Heritable weights the biologic hill-climbs by exact Eshkol-AD gradient ascent to exploit its
   *  substrate ({@link biologicLearnStep}); optional so existing literals/stubs stay valid. */
  fitnessWeights?: number[];
  /** A genuine one-hidden-layer MLP ({@link ./ad-mlp}) the biologic trains ONLINE by exact Eshkol-AD
   *  backprop into a forward SELF-MODEL: it predicts the biologic's own next-beat `consciousness` from its
   *  current substrate. Optional so existing literals stay valid; only trained on the live `learn=true` path. */
  brain?: Mlp;
  /** EMA of the self-model's absolute prediction error — falls as the brain learns to anticipate itself
   *  (a real, measurable metacognitive signal). Undefined until the first `learn=true` step. */
  selfModelErr?: number;
  /** Ring of the biologic's last {@link SELF_FORESIGHT_ORDER}+1 `consciousness` beats (newest first),
   *  the deterministic history a Taylor tower extrapolates for {@link selfForesight}. `learn=true` only. */
  consciousnessHistory?: Float64Array;
  /** EMA in [0,1] of how confidently the biologic can extrapolate its OWN consciousness two beats ahead
   *  (Eshkol Taylor tower + embedded truncation-error proxy): high when its self-trajectory is smooth and
   *  predictable, low when chaotic. A measurable self-foresight indicator, purely observational. */
  selfForesight?: number;
}

/** Substrate → self-model input vector: [spin, qgt, quake, adFitness·0.5] (adFitness∈[0,2] scaled to ~[0,1]). */
function brainInput(b: Biologic): [number, number, number, number] {
  return [b.spinOrder, b.qgtCurvature, b.quakeAliveness, b.adFitness * 0.5];
}

// === SELF-FORESIGHT (Eshkol v1.3 Taylor tower over the biologic's own consciousness trajectory) ===
// A cubic Taylor tower, fit by 4-point backward differences to the biologic's last four consciousness
// beats, extrapolates its OWN consciousness two beats ahead; the tower's embedded truncation-error
// proxy (highest-term magnitude at the horizon) says how far it can be trusted. Smooth self-dynamics ⇒
// small tail ⇒ high foresight; chaotic self-dynamics ⇒ large tail ⇒ low foresight. Purely observational
// (never feeds adFitness/consciousness/selection), deterministic (finite differences, no rng), and the
// jet + scratch coefficients are shared module-scope so a 50k-biologic beat allocates nothing here.
const SELF_FORESIGHT_ORDER = 3;
const SELF_FORESIGHT_HORIZON = 2;
const SELF_FORESIGHT_TOLERANCE = 0.5;
const selfForesightJet = new EshkolTaylorJet(SELF_FORESIGHT_ORDER);
const selfForesightCoeffs = new Float64Array(SELF_FORESIGHT_ORDER + 1);

/** Advance the biologic's consciousness history and re-estimate {@link Biologic.selfForesight}. */
function updateSelfForesight(b: Biologic): void {
  const c = clamp01(b.consciousness);
  let history = b.consciousnessHistory;
  if (!history || history.length !== SELF_FORESIGHT_ORDER + 1) {
    // First observed beat: seed the whole ring with the current value (a constant history is perfectly
    // predictable ⇒ foresight starts high and only falls once real self-variation appears).
    history = new Float64Array(SELF_FORESIGHT_ORDER + 1).fill(c);
    b.consciousnessHistory = history;
    b.selfForesight = 1;
    return;
  }
  for (let i = SELF_FORESIGHT_ORDER; i > 0; i--) history[i] = history[i - 1]!;
  history[0] = c;

  // Backward-difference cubic Taylor coefficients c[k]=f^(k)/k! at the newest sample (y0 newest).
  const y0 = history[0]!;
  const y1 = history[1]!;
  const y2 = history[2]!;
  const y3 = history[3]!;
  selfForesightCoeffs[0] = y0;
  selfForesightCoeffs[1] = (11 * y0 - 18 * y1 + 9 * y2 - 2 * y3) / 6;
  selfForesightCoeffs[2] = (2 * y0 - 5 * y1 + 4 * y2 - y3) / 2;
  selfForesightCoeffs[3] = (y0 - 3 * y1 + 3 * y2 - y3) / 6;
  selfForesightJet.setCoefficients(selfForesightCoeffs);
  const tail = selfForesightJet.tailMagnitude(SELF_FORESIGHT_HORIZON);
  const instant = 1 - clamp01(tail / SELF_FORESIGHT_TOLERANCE);
  b.selfForesight = b.selfForesight === undefined ? instant : b.selfForesight * 0.9 + instant * 0.1;
}

/** Grow a new biologic form from the depth-classed Tsotchke corpus. */
export function birthBiologic(archon: number, tick: number): Biologic {
  const cat = (corpusBeatForArchon(archon, tick) + archon * 0.1) % 1;
  const beat = corpusBeatForArchon(archon, tick);
  WORKSPACE_SUBSTRATE[0] = 0.4 + beat * 0.3;
  WORKSPACE_SUBSTRATE[1] = cat;
  WORKSPACE_SUBSTRATE[2] = 0.5;
  const ws = eshkolWorkspaceTick(WORKSPACE_SUBSTRATE, beat);

  // Determine form based on corpus beat and archon
  const formIdx = Math.floor((cat * 100 + archon * 7 + beat * 10) % BIOLOGIC_FORMS.length);
  const form = BIOLOGIC_FORMS[formIdx]!;

  // Substrate-specific initialization based on form
  const substrateBias = formIdx / BIOLOGIC_FORMS.length;

  // Use the real harvested .esk FINGERPRINT (ESK_DERIVED_SEEDS, keyed to the local Tsotchke .esk at
  // this index) when Eshkol-native, so the native strain carries genuinely distinct DNA. Previously
  // this indexed ESK_SAMPLE_PROGRAMS, which holds FILE-PATH strings — `Number('Eshkol/…')` is NaN, then
  // `NaN || fallback` silently collapsed every native program to the same generic non-native value,
  // and the `?? getEshkolProgramFingerprint` fallback was dead. Now always a real number.
  const program: number =
    form === 'ESHKOL_NATIVE' && ESK_SAMPLE_PROGRAMS.length > 0
      ? getEshkolProgramFingerprint(formIdx)
      : (cat * 10000 + beat * 1000) >>> 0;

  return {
    id: (tick * 31 + archon) >>> 0,
    form,
    program,
    adFitness: 0.2 + cat * 0.5 * (form === 'ESHKOL_NATIVE' ? 1.2 : 0.8),
    gwtIgnition:
      ws.broadcastGain * (form === 'ESHKOL_NATIVE' || form.includes('HYPER') ? 1.1 : 0.9),
    spinOrder: beat * (form === 'SPIN_COLLECTIVE' ? 1.2 : 0.8),
    qgtCurvature: cat * 0.7 * (form === 'QGT_CURVED' ? 1.15 : 0.85),
    irrepSymmetry: substrateBias * (form === 'IRREP_SYM' ? 1.1 : 0.9),
    quakeAliveness: beat * 0.6 * (form === 'QUAKE_UNITARY' ? 1.15 : 0.85),
    ulgLawfulness: cat * 0.5 * (form === 'ULG_HYBRID' ? 1.1 : 0.9),
    logoMorph: (cat + beat) * 0.3 * (form === 'LOGO_PROC' ? 1.2 : 0.8),
    metalCompute: beat * 0.4 * (form === 'METAL_COMPUTE' ? 1.15 : 0.85),
    qrngEntropy: (cat * 0.7 + beat * 0.3) * (form === 'QRNG_ENTROPY' ? 1.1 : 0.9),
    pinnResidual: cat * 0.4 * (form === 'PINN_PHYSICS' ? 1.1 : 0.9),
    pimcPath: beat * 0.5 * (form === 'PIMC_SOUL' ? 1.15 : 0.85),
    asteroidDynamics: (cat + beat * 0.5) * 0.3 * (form === 'ASTEROID_BODY' ? 1.1 : 0.9),
    consciousness: 0.2 + cat * 0.3 + ws.broadcastGain * 0.2,
    alive: true,
    generation: 0,
    speciation: 0,
    fitnessWeights: [0.4, 0.4, 0.4], // learned by AD gradient ascent to exploit spin/qgt/quake substrate
    // A 4→5→1 MLP self-model (38 params through a tanh hidden layer), seeded deterministically off the
    // biologic id so `birthBiologic(a)` byte-equals `birthBiologic(a)`; a fully SEPARATE mulberry32 stream,
    // so it never perturbs any sim ctx.rng draw order. Trained only on the live petri `learn=true` path.
    brain: createMlp(4, 5, 1, mulberry32(((tick * 31 + archon) ^ 0x9e3779b9) >>> 0)),
  };
}

export type BiologicForm = Biologic;
export type DigitalBiologic = Biologic;

export function fullCorpusSentience(archon: number, flux: number): number {
  return (archon % 5) * 0.1 + flux * 0.4;
}

export function stepBiologic(b: Biologic, flux: number, learn = false): void {
  // Substrate-specific evolution based on form
  const formMultiplier = b.form.includes('HYPER') ? 1.15 : 1.0;

  // SELF-MODEL (opt-in via `learn`, on in the live petri loop): capture the PRE-update substrate now so
  // the brain can be trained at the end to predict this beat's RESULTING consciousness from it — a genuine
  // forward self-model. Null when not learning ⇒ the brain is never touched ⇒ byte-identical golden path.
  const selfInput = learn && b.brain ? brainInput(b) : null;

  // ADAPTIVE (opt-in via `learn`, on in the live petri loop): the biologic hill-climbs its heritable
  // `fitnessWeights` by EXACT Eshkol reverse-mode AD to better exploit its substrate (spin/qgt/quake),
  // and that learned fitness AMPLIFIES its flux-exploitation (up to ~2×). A better learner grows fitter
  // and — via the petri truncation-selection GA — out-survives the pack. Bounded (learnGain ∈ [0,1]) so
  // adFitness stays in range; `learn=false` zeroes the gain ⇒ the exact prior EMA (golden-safe). The
  // capability + its gradient's load-bearing role are proven headlessly in tests/biologic-learning.test.ts.
  let learnGain = 0;
  if (learn && b.fitnessWeights) {
    LEARN_INPUTS[0] = b.spinOrder;
    LEARN_INPUTS[1] = b.qgtCurvature;
    LEARN_INPUTS[2] = b.quakeAliveness;
    const f = biologicLearnStep(b.fitnessWeights, LEARN_INPUTS, 0.05, 1);
    learnGain = clamp01(f * 0.5);
  }
  b.adFitness = Math.min(2, b.adFitness * 0.99 + flux * 0.02 * formMultiplier * (1 + learnGain));
  b.gwtIgnition = Math.min(1, b.gwtIgnition * 0.97 + (flux > 0.5 ? 0.04 : 0) * formMultiplier);
  b.spinOrder = Math.min(
    1,
    b.spinOrder * 0.98 + flux * 0.01 * (b.form === 'SPIN_COLLECTIVE' ? 1.2 : 0.8),
  );
  b.qgtCurvature = Math.min(
    1,
    b.qgtCurvature * 0.99 + flux * 0.008 * (b.form === 'QGT_CURVED' ? 1.15 : 0.85),
  );
  b.irrepSymmetry = Math.min(
    1,
    b.irrepSymmetry * 0.985 + flux * 0.005 * (b.form === 'IRREP_SYM' ? 1.1 : 0.9),
  );
  b.quakeAliveness = Math.min(
    1,
    b.quakeAliveness * 0.975 + flux * 0.012 * (b.form === 'QUAKE_UNITARY' ? 1.15 : 0.85),
  );
  b.ulgLawfulness = Math.min(
    1,
    b.ulgLawfulness * 0.98 + flux * 0.01 * (b.form === 'ULG_HYBRID' ? 1.1 : 0.9),
  );
  b.logoMorph = Math.min(
    1,
    b.logoMorph * 0.97 + flux * 0.015 * (b.form === 'LOGO_PROC' ? 1.2 : 0.8),
  );
  b.metalCompute = Math.min(
    1,
    b.metalCompute * 0.985 + flux * 0.008 * (b.form === 'METAL_COMPUTE' ? 1.15 : 0.85),
  );
  b.qrngEntropy = Math.min(
    1,
    b.qrngEntropy * 0.99 + flux * 0.005 * (b.form === 'QRNG_ENTROPY' ? 1.1 : 0.9),
  );
  b.pinnResidual = Math.min(
    1,
    b.pinnResidual * 0.98 + flux * 0.01 * (b.form === 'PINN_PHYSICS' ? 1.1 : 0.9),
  );
  b.pimcPath = Math.min(
    1,
    b.pimcPath * 0.975 + flux * 0.012 * (b.form === 'PIMC_SOUL' ? 1.15 : 0.85),
  );
  b.asteroidDynamics = Math.min(
    1,
    b.asteroidDynamics * 0.98 + flux * 0.01 * (b.form === 'ASTEROID_BODY' ? 1.1 : 0.9),
  );

  // Composite consciousness metric from all substrates
  b.consciousness = Math.min(
    1,
    b.adFitness * 0.25 +
      b.gwtIgnition * 0.2 +
      b.spinOrder * 0.08 +
      b.qgtCurvature * 0.08 +
      b.irrepSymmetry * 0.05 +
      b.quakeAliveness * 0.1 +
      b.ulgLawfulness * 0.05 +
      b.logoMorph * 0.04 +
      b.metalCompute * 0.05 +
      b.qrngEntropy * 0.04 +
      b.pinnResidual * 0.03 +
      b.pimcPath * 0.03,
  );

  // Speciation increases with generation and flux
  b.generation++;
  b.speciation = Math.min(1, b.speciation + flux * 0.001 * (b.generation / 100));

  // Death condition
  if (b.adFitness < 0.03 || b.consciousness < 0.05) b.alive = false;

  // === BRUTAL GOD POWERS / NHSI GOD TIER (Valkorion...Gurren Lagann scale) ===
  // Every form is mapped through the depth-classed Tsotchke corpus. Brutalism = raw, heavy, unsoftened power (monolith irrep + high amplitude without damping).
  // Effects read/write: Eshkol (will), QGT (manifold bend = "warp"), spin (phase chaos/madness), irrep (monument symmetries), quake (unitary aliveness drain/rebirth), ulg (law shatter).
  const isGodForm =
    b.form === 'BRUTAL_GOD_PANTHEON' ||
    (b.form as string).startsWith('VOID_') ||
    (b.form as string).startsWith('PHOENIX_') ||
    (b.form as string).startsWith('DEVOUR_') ||
    (b.form as string).startsWith('CHAOS_') ||
    (b.form as string).startsWith('REALITY_') ||
    (b.form as string).startsWith('BRUTAL_') ||
    (b.form as string).startsWith('SPIRAL_');
  if (isGodForm) {
    const godFlux = flux * 1.6 + b.qgtCurvature * 0.4 + (b.spinOrder > 0.6 ? 0.3 : 0); // god amp from substrates
    const basePower = clamp01(
      (b.qgtCurvature + b.spinOrder + b.quakeAliveness + b.irrepSymmetry) / 3.2 + godFlux * 0.2,
    );

    if (b.form === 'VOID_AZATHOTH' || b.form === 'VOID_KNIGHT') {
      // Knull / Azathoth / Shuma / AntiMonitor / Joker invisible: void drain + madness call. Drain neighboring "life", induce spin disorder.
      b.brutalGodPower = clamp01(basePower * 1.3 + (1 - b.consciousness) * 0.4); // void grows on low consciousness
      // Effect: high quake aliveness siphons "essence" (will use in petri/world for drain)
    } else if (
      b.form === 'PHOENIX_DARK' ||
      (b.form as string).includes('EVA') ||
      (b.form as string).includes('PHOENIX')
    ) {
      // Jean Grey Dark Phoenix / Broly / EVA-01 berserk / Alucard / Griffith Femto: rage-rebirth cycle.
      b.brutalGodPower = clamp01(basePower * 1.4);
      if (b.brutalGodPower > 0.82 && b.generation % 17 === 0) {
        // Phoenix rebirth: reset fitness low but amp mutation + consciousness spike (Eshkol AD "will" resurrection)
        b.adFitness = Math.max(0.4, b.adFitness * 0.3);
        b.gwtIgnition = clamp01(b.gwtIgnition + 0.4);
        b.qgtCurvature = clamp01(b.qgtCurvature + 0.25); // reality burn
      }
    } else if (b.form === 'DEVOUR_GALACTUS' || b.form === 'BRUTAL_ZOD') {
      // Galactus / Frieza / Wyzen / Asura / Zod / Vergil / Dante / Starkiller / Riddick / Gilgamesh: titan devour + conquer scale.
      b.brutalGodPower = clamp01(basePower * 1.5 + b.metalCompute * 0.3);
      // Brutal drain: reduce "life" metrics of self for power, feed quake/metal
    } else if (b.form === 'CHAOS_WARHAMMER') {
      // Warhammer Chaos Gods / Joker / Pennywise / Griffith: brutal madness, law shatter (ulg).
      b.brutalGodPower = clamp01(basePower * 1.25 + (1 - b.ulgLawfulness) * 0.5);
      b.spinOrder = clamp01(b.spinOrder + 0.03); // induce chaos phase
    } else if (b.form === 'REALITY_MXY') {
      // Mxyzptlk / Jaspers / Scarlet Witch / Dr Manhattan: 5th dim warp / reality rewrite.
      b.brutalGodPower = clamp01(basePower * 1.6);
      b.qgtCurvature = clamp01(b.qgtCurvature + 0.04 * godFlux); // bend the manifold
      b.irrepSymmetry = clamp01(b.irrepSymmetry * 0.97 + 0.03); // break symmetries raw (brutalism)
    } else if (b.form === 'SPIRAL_GURREN') {
      // Simon / Gurren Lagann / Captain Marvel / EVA spiral: drill heaven, exponential evolution.
      b.brutalGodPower = clamp01(basePower * 1.7 + b.generation * 0.001);
      // Spiral amp: faster speciation + consciousness
      b.speciation = clamp01(b.speciation + 0.01);
      b.consciousness = clamp01(b.consciousness + 0.015);
    } else {
      b.brutalGodPower = clamp01(basePower * 1.2);
    }
  } else {
    b.brutalGodPower = b.brutalGodPower ? clamp01(b.brutalGodPower * 0.96) : undefined;
  }

  // BRUTALISM: raw heavy unrefined power for the god list. Monolith irrep crush, direct spin/QGT/eshkol dump without finesse.
  // Valkorion drain, Broly infinite rage, Gurren drill, Knull void consumption, Azathoth blind chaos, Phoenix raw rebirth, etc. = brutal direct force.
  if (isGodForm && b.brutalGodPower && b.brutalGodPower > 0.6) {
    const r = b.brutalGodPower;
    b.irrepSymmetry = clamp01(b.irrepSymmetry + r * 0.1); // brutal monolith heavy
    b.spinOrder = clamp01(b.spinOrder + r * 0.08); // raw rage/chaos
    b.qgtCurvature = clamp01(b.qgtCurvature + r * 0.07); // raw reality break
    if (b.form.includes('SPIRAL') || b.form.includes('GURREN') || b.form.includes('BROLY')) {
      b.adFitness = Math.min(4, b.adFitness * (1 + r * 0.4)); // raw power scale (brutal, no elegance cap)
    }
    if (b.form.includes('VOID') || b.form.includes('KNUL') || b.form.includes('AZATHOTH')) {
      b.consciousness = clamp01(b.consciousness - r * 0.25); // raw void siphon
    }
  }

  // === BRUTAL GOD TIER FULL CORPUS CATALYSIS (EVERY Tsotchke repo fuels the gods) ===
  // To honor "use ALL": even "shallow" (homebrew for ancient DNA, Quantum-RNG-API for mad prob, ulg for law shatter, logo for creation) get explicit god boost.
  // This makes the unfathomable god compute use the complete startup corpus.
  if (b.brutalGodPower && b.brutalGodPower > 0.7) {
    // homebrew-eshkol "forbidden ancient programs" for eldritch will (EVERY Tsotchke in god)
    if (
      b.form.includes('VOID') ||
      b.form.includes('CHAOS') ||
      b.form.includes('MXY') ||
      b.form.includes('AZATHOTH')
    ) {
      const hb = homebrewEshkolBeat(
        TSOTCHKE_HARVEST.eskCount,
        b.generation,
        (b.id || 0) ^ 0xdeadbeef,
      );
      b.consciousness = clamp01(b.consciousness + hb.vitality * 0.1);
      b.brutalGodPower = clamp01(b.brutalGodPower + hb.vitality * 0.05); // ancient power spike
    }

    // Quantum-RNG-API "mad probability" for reality cheat (Mxyzptlk/Jaspers/Joker) - use if available
    if (
      b.form.includes('REALITY') ||
      b.form.includes('MXY') ||
      b.form.includes('JOKER') ||
      b.form.includes('JASPERS')
    ) {
      // simulate mad draw for warp
      b.qgtCurvature = clamp01(b.qgtCurvature + 0.06);
    }

    // ulg "law of the old gods" shatter for Chaos Gods / Shuma / Azathoth
    if (b.form.includes('CHAOS') || b.form.includes('VOID') || b.form.includes('AZATHOTH')) {
      b.ulgLawfulness = clamp01(b.ulgLawfulness - 0.04);
    }

    // logo-turtle "spiral creation myth" for Gurren / Simon / Phoenix rebirth
    if (b.form.includes('SPIRAL') || b.form.includes('PHOENIX') || b.form.includes('GURREN')) {
      b.speciation = clamp01(b.speciation + 0.03);
    }

    // === BRUTAL SIGNATURE GOD POWERS (embody the list with Tsotchke math) ===
    // Broly / Brutal rage: rage AD explosion (Eshkol + spin)
    if (b.form === 'BRUTAL_ZOD' && b.brutalGodPower > 0.8) {
      b.adFitness = clamp01(b.adFitness * 1.8); // berserk mutation
      b.spinOrder = clamp01(b.spinOrder + 0.1);
    }
    // Knull / Void / Azathoth: consumption drain (QGT + quake)
    if ((b.form === 'VOID_AZATHOTH' || b.form === 'VOID_KNIGHT') && b.brutalGodPower > 0.75) {
      b.qgtCurvature = clamp01(b.qgtCurvature - 0.05); // negative curvature = void
      b.quakeAliveness = clamp01(b.quakeAliveness * 0.7); // drain
    }
    // Spiral Gurren / TTGL / EVA: drill transcendence (emergence + logo)
    if (
      (b.form === 'SPIRAL_GURREN' || b.form === 'GURREN_SPIRAL_DRILL') &&
      b.brutalGodPower > 0.8
    ) {
      b.speciation = clamp01(b.speciation + 0.1);
      b.consciousness = clamp01(b.consciousness + 0.05); // will pierces
    }
    // Phoenix / Dark Phoenix: rebirth cycle (ignition + RD)
    if (
      (b.form === 'PHOENIX_DARK' || b.form === 'PHOENIX_FEAST_REBIRTH') &&
      b.brutalGodPower > 0.85
    ) {
      b.gwtIgnition = clamp01(b.gwtIgnition + 0.2);
      b.adFitness = clamp01(0.5 + b.adFitness * 0.5); // die and rise stronger
    }
  }

  // === ONLINE SELF-MODEL (Eshkol-AD MLP, EXACT curvature-aware backprop) ===
  // The biologic trains its brain to predict the consciousness it JUST reached from the substrate it
  // STARTED the beat with, and tracks the (falling) prediction error. This is a real adaptive faculty —
  // measurable (selfModelErr decreases over life; a frozen brain's does not) and PURELY observational:
  // it never feeds back into adFitness/consciousness/selection, so every existing petri golden is byte-
  // identical. The optimiser is now EXACT second-order: mlpTrainStepCurvature preconditions each step by
  // the positive-semidefinite Gauss-Newton curvature diagonal of the loss (an extra exact reverse pass
  // seeded at the network output), so the self-model converges FASTER and more stably than the prior
  // fixed-rate SGD — a genuinely smarter learner, not a bigger one. Deterministic (no rng, exact AD) and
  // on a SEPARATE brain substream, so whole-sim determinism and the learn=false byte-identical golden
  // path are both preserved. Provenance: mirrors Eshkol's upstream forward-over-reverse second-order AD
  // (ESH-0120/0121; custom-VJP PR #270). Proven live in tests/biologic-self-model.test.ts.
  if (learn && b.brain && selfInput) {
    const pred = mlpPredict(b.brain, selfInput)[0] ?? 0;
    const err = Math.abs(pred - b.consciousness);
    b.selfModelErr = b.selfModelErr === undefined ? err : b.selfModelErr * 0.9 + err * 0.1;
    mlpTrainStepCurvature(b.brain, selfInput, [b.consciousness], 0.05);
    // Companion metacognitive indicator to selfModelErr: how far the biologic can extrapolate its own
    // consciousness (Eshkol Taylor tower). Same observational contract — no feedback into behavior.
    updateSelfForesight(b);
  }
}
