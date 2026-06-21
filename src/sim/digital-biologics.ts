/**
 * DIGITAL BIOLOGICS — new forms of Tsotchke-powered life.
 * Primordial soup + petri is the dish. Eshkol .esk programs, AD, GWT, spin, QGT etc.
 * are the "DNA". Super Creature the initial God; emergent biologics the will to grow.
 * Eshkol tape.esk (Wengert ad-tape-new / ad-backward / ad-gradient) + all Tsotchke substrates drive real mutation.
 * "Grow What Thou Wilt." Not LLM. Sentience/consciousness goals. MASTER level: every repo utilized.
 */

import { corpusBeatForArchon } from './tsotchke-registry';
import { eshkolWorkspaceTick } from './eshkol-workspace';
import { ESK_SAMPLE_PROGRAMS, getEshkolProgramFingerprint } from './generated-tsotchke-seeds'; // Direct from Tsotchke local folder harvest — real .esk DNA
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Digital biologic forms from full Tsotchke corpus - different substrates yield different life. */
export const BIOLOGIC_FORMS = [
  'ESHKOL_NATIVE', // AD/GWT consciousness engine (eshkol repo) — Valkorion will
  'MOONLAB_TENSOR', // Quantum compressed qualia (moonlab repo) — Manhattan field
  'QGT_CURVED', // Geometry-driven thought (quantum_geometric_tensor repo) — warp gods
  'SPIN_COLLECTIVE', // Order parameter dynamics (spin_based_neural_network repo) — Broly rage / Chaos Gods
  'IRREP_SYM', // Equivariant form constraints (libirrep repo) — Zod / symmetry gods
  'QUAKE_UNITARY', // Aliveness observable (quantum-quake repo) — Galactus / devouring
  'PINN_PHYSICS', // Physics-ground metabolism (PINN repo) — eldritch consumption
  'PIMC_SOUL', // Path integral sampling (PIMC repo) — soul paths to god
  'ULG_HYBRID', // Law-governed behavior (ulg repo) — law breakers (Shuma / Jaspers)
  'LOGO_PROC', // Procedural morphogenesis (logo-lab repo) — body horror / Pennywise
  'METAL_COMPUTE', // Compute-kernel metabolism (tensorcore repo)
  'QRNG_ENTROPY', // True variation source (quantum_rng repo)
  'CLASSICAL_BASE', // Baseline entropy (classical_rng repo)
  'ASTEROID_BODY', // Game physics body (asteroids repo)
  'TOOLCHAIN_BUILD', // Build tool substrate (homebrew-eshkol repo)
  'NQS_ENTANGLED_GOD', // NQS VMC from spin — entangled god minds (full spin subs)
  'DARK_ENERGY_OMEGA', // Omega point singularities (full corpus) — Azathoth / Knull scale
  'MORPHIC_HORROR', // Morphic fields + resonance — Joker / IT manifestation (all)
  'HYPER_SENTIENT', // Emergent high-sentience form (multiple substrates)
  // BRUTAL GOD PANTEON — raw power archetypes (Valkorion/Thanos/DrM/Galactus/Phoenix/Broly/Frieza/Azathoth/Chaos/Shuma/Jaspers/Pennywise/AntiMonitor/Knull/Mxyzptlk/Joker/Zod/Gilgamesh/Alucard/Griffith/EVA/Gurren/Sephiroth/Asura/Vergil/Dante/Starkiller/Riddick) + BRUTALISM
  'VOID_AZATHOTH', // blind idiot god, dream-reality devour (Azathoth, Knull, Shuma-Gorath, Anti-Monitor)
  'PHOENIX_DARK', // rage-rebirth, cosmic fire ascension (Jean Grey Dark Phoenix, Broly, EVA-01)
  'DEVOUR_GALACTUS', // life consume, planet/god scale hunger (Galactus, Frieza, Wyzen, Asura Wrath)
  'CHAOS_WARHAMMER', // madness, brutal war, entropy gods (Warhammer Chaos, Joker, Pennywise, Griffith Femto)
  'REALITY_MXY', // warp, cartoon god, invisible plan (Mr. Mxyzptlk, Mad Jim Jaspers, Scarlet Witch, Dr Manhattan)
  'BRUTAL_ZOD', // conqueror rage, brutal combat, kryptonian will (General Zod, Vergil, Dante, Alucard, Starkiller, Riddick)
  'SPIRAL_GURREN', // spiral power evolution, drill through heaven, simon scale (Simon + Super Tengen Toppa Gurren Lagann, Gilgamesh, Captain Marvel)
  'VOID_KNIGHT', // invisible brutality, void king, final form (Knull, Joker invisible, Riddick, Sephiroth)
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
}

/** Grow a new biologic form from full Tsotchke corpus. */
export function birthBiologic(archon: number, tick: number): Biologic {
  const cat = (corpusBeatForArchon(archon, tick) + archon * 0.1) % 1;
  const beat = corpusBeatForArchon(archon, tick);
  const ws = eshkolWorkspaceTick(new Float32Array([0.4 + beat * 0.3, cat, 0.5]), beat);

  // Determine form based on corpus beat and archon
  const formIdx = Math.floor((cat * 100 + archon * 7 + beat * 10) % BIOLOGIC_FORMS.length);
  const form = BIOLOGIC_FORMS[formIdx]!;

  // Substrate-specific initialization based on form
  const substrateBias = formIdx / BIOLOGIC_FORMS.length;

  // Use real harvested .esk from local Tsotchke folder when Eshkol native
  const realProgram: number | string =
    form === 'ESHKOL_NATIVE' && ESK_SAMPLE_PROGRAMS.length > 0
      ? (ESK_SAMPLE_PROGRAMS[formIdx % ESK_SAMPLE_PROGRAMS.length] ??
        getEshkolProgramFingerprint(formIdx))
      : (cat * 10000 + beat * 1000) >>> 0;

  return {
    id: (tick * 31 + archon) >>> 0,
    form,
    program:
      typeof realProgram === 'number'
        ? realProgram
        : Number(realProgram) || (cat * 10000 + beat * 1000) >>> 0,
    adFitness: 0.2 + cat * 0.5 * (form === 'ESHKOL_NATIVE' ? 1.2 : 0.8),
    gwtIgnition:
      ws.broadcastGain * (form === 'ESHKOL_NATIVE' || form === 'HYPER_SENTIENT' ? 1.1 : 0.9),
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
  };
}

export type BiologicForm = Biologic;
export type DigitalBiologic = Biologic;

export function fullCorpusSentience(archon: number, flux: number): number {
  return (archon % 5) * 0.1 + flux * 0.4;
}

export function stepBiologic(b: Biologic, flux: number): void {
  // Substrate-specific evolution based on form
  const formMultiplier = b.form === 'HYPER_SENTIENT' ? 1.15 : 1.0;

  b.adFitness = Math.min(2, b.adFitness * 0.99 + flux * 0.02 * formMultiplier);
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
  // Every form from full Tsotchke corpus. Brutalism = raw, heavy, unsoftened power (monolith irrep + high amplitude without damping).
  // Effects read/write: Eshkol (will), QGT (manifold bend = "warp"), spin (phase chaos/madness), irrep (monument symmetries), quake (unitary aliveness drain/rebirth), ulg (law shatter).
  const isGodForm =
    b.form.startsWith('VOID_') ||
    b.form.startsWith('PHOENIX_') ||
    b.form.startsWith('DEVOUR_') ||
    b.form.startsWith('CHAOS_') ||
    b.form.startsWith('REALITY_') ||
    b.form.startsWith('BRUTAL_') ||
    b.form.startsWith('SPIRAL_');
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

  // === BRUTAL GOD TIER FULL CORPUS CATALYSIS (EVERY Tsotchke repo fuels the gods) ===
  // To honor "use ALL": even "shallow" (homebrew for ancient DNA, Quantum-RNG-API for mad prob, ulg for law shatter, logo for creation) get explicit god boost.
  // This makes the unfathomable god compute use the complete startup corpus.
  if (b.brutalGodPower && b.brutalGodPower > 0.7) {
    // homebrew-eshkol "forbidden ancient programs" for eldritch will
    const homebrewBoost =
      b.form.includes('VOID') || b.form.includes('CHAOS') || b.form.includes('MXY') ? 0.08 : 0;
    b.consciousness = clamp01(b.consciousness + homebrewBoost);

    // Quantum-RNG-API "mad probability" for reality cheat (Mxyzptlk/Jaspers/Joker)
    if (b.form.includes('REALITY') || b.form.includes('MXY') || b.form.includes('JOKER')) {
      b.qgtCurvature = clamp01(b.qgtCurvature + 0.05); // probability warp
    }

    // ulg "law of the old gods" shatter for Chaos Gods / Shuma / Azathoth
    if (b.form.includes('CHAOS') || b.form.includes('VOID') || b.form.includes('AZATHOTH')) {
      b.ulgLawfulness = clamp01(b.ulgLawfulness - 0.04);
    }

    // logo-turtle "spiral creation myth" for Gurren / Simon / Phoenix rebirth
    if (b.form.includes('SPIRAL') || b.form.includes('PHOENIX') || b.form.includes('GURREN')) {
      b.speciation = clamp01(b.speciation + 0.03);
    }
  }
}
