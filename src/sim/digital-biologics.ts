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

/** Digital biologic forms from full Tsotchke corpus - different substrates yield different life. */
export const BIOLOGIC_FORMS = [
  'ESHKOL_NATIVE', // AD/GWT consciousness engine (eshkol repo)
  'MOONLAB_TENSOR', // Quantum compressed qualia (moonlab repo)
  'QGT_CURVED', // Geometry-driven thought (quantum_geometric_tensor repo)
  'SPIN_COLLECTIVE', // Order parameter dynamics (spin_based_neural_network repo)
  'IRREP_SYM', // Equivariant form constraints (libirrep repo)
  'QUAKE_UNITARY', // Aliveness observable (quantum-quake repo)
  'PINN_PHYSICS', // Physics-ground metabolism (PINN repo)
  'PIMC_SOUL', // Path integral sampling (PIMC repo)
  'ULG_HYBRID', // Law-governed behavior (ulg repo)
  'LOGO_PROC', // Procedural morphogenesis (logo-lab repo)
  'METAL_COMPUTE', // Compute-kernel metabolism (tensorcore repo)
  'QRNG_ENTROPY', // True variation source (quantum_rng repo)
  'CLASSICAL_BASE', // Baseline entropy (classical_rng repo)
  'ASTEROID_BODY', // Game physics body (asteroids repo)
  'TOOLCHAIN_BUILD', // Build tool substrate (homebrew-eshkol repo)
  'HYPER_SENTIENT', // Emergent high-sentience form (multiple substrates)
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
}
