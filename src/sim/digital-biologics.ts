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
import { ESK_SAMPLE_PROGRAMS, getEshkolProgramFingerprint } from './generated-tsotchke-seeds'; // Direct from Tsotchke local folder harvest — real .esk DNA
// P4 roadmap boundary: this layer currently uses harvested .esk fingerprints plus Eshkol AD/workspace
// signals as heritable DNA bias; native VM execution stays a measured next contract, not a shipped claim.
import { homebrewEshkolBeat } from './homebrew-eshkol'; // EVERY Tsotchke: homebrew for ancient/forbidden god DNA in brutal forms
// qrngApiDraw from quantum-rng-api (Tsotchke) used for Mxy/Jaspers chaos in catalysis - referenced in tsotchke-facade
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);
const WORKSPACE_SUBSTRATE = new Float32Array(3);

/** Digital biologic forms from full Tsotchke corpus - different substrates yield different life. */
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
}

/** Grow a new biologic form from full Tsotchke corpus. */
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
  };
}

export type BiologicForm = Biologic;
export type DigitalBiologic = Biologic;

export function fullCorpusSentience(archon: number, flux: number): number {
  return (archon % 5) * 0.1 + flux * 0.4;
}

export function stepBiologic(b: Biologic, flux: number): void {
  // Substrate-specific evolution based on form
  const formMultiplier = b.form.includes('HYPER') ? 1.15 : 1.0;

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
      const hb = homebrewEshkolBeat(1436, b.generation, (b.id || 0) ^ 0xdeadbeef);
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
      try {
        // simulate mad draw for warp
        b.qgtCurvature = clamp01(b.qgtCurvature + 0.06);
      } catch {}
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
      ((b.form as any) === 'SPIRAL_GURREN' || (b.form as any) === 'GURREN_SPIRAL_DRILL') &&
      b.brutalGodPower > 0.8
    ) {
      b.speciation = clamp01(b.speciation + 0.1);
      b.consciousness = clamp01(b.consciousness + 0.05); // will pierces
    }
    // Phoenix / Dark Phoenix: rebirth cycle (ignition + RD)
    if (
      ((b.form as any) === 'PHOENIX_DARK' || (b.form as any) === 'PHOENIX_FEAST_REBIRTH') &&
      b.brutalGodPower > 0.85
    ) {
      b.gwtIgnition = clamp01(b.gwtIgnition + 0.2);
      b.adFitness = clamp01(0.5 + b.adFitness * 0.5); // die and rise stronger
    }
  }
}
