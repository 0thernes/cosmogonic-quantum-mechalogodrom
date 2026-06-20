/**
 * DIGITAL BIOLOGICS — new forms of Tsotchke-powered life.
 * Primordial soup + petri is the dish. Eshkol .esk programs, AD, GWT, spin, QGT etc.
 * are the "DNA". Super Creature the initial God; emergent biologics the will to grow.
 * "Grow What Thou Wilt." Not LLM. Sentience/consciousness goals.
 */

import { corpusBeatForArchon } from './tsotchke-registry';
import { eshkolWorkspaceTick } from './eshkol-workspace';

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
  program: number; // .esk-like fingerprint
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
  return {
    id: (tick * 31 + archon) >>> 0,
    program: (cat * 10000 + beat * 1000) >>> 0,
    adFitness: 0.2 + cat * 0.5,
    gwtIgnition: ws.broadcastGain,
    spinOrder: beat,
    qgtCurvature: cat * 0.7,
    alive: true,
  };
}

export type BiologicForm = Biologic;
export type DigitalBiologic = Biologic;

export function fullCorpusSentience(archon: number, flux: number): number {
  return (archon % 5) * 0.1 + flux * 0.4;
}

export function stepBiologic(b: Biologic, flux: number): void {
  b.adFitness = Math.min(2, b.adFitness * 0.99 + flux * 0.02);
  b.gwtIgnition = Math.min(1, b.gwtIgnition * 0.97 + (flux > 0.5 ? 0.04 : 0));
  if (b.adFitness < 0.05) b.alive = false;
}
