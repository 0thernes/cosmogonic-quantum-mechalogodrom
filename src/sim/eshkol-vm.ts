/**
 * Eshkol program VM facade — re-exports evaluator from eshkol-bridge (single owner).
 * TSOTCHKE_REPO_MAP: quick scientific-vs-fenced index for tests/telemetry.
 */

export {
  eshkolProgramFingerprint,
  eshkolEvalProgram,
  eshkolApplyProgramEffect,
} from './eshkol-bridge';
export type { EshkolProgramEffect } from './eshkol-bridge';

/** Core scientific repos vs fenced LLM boundaries (metadata only). */
export const TSOTCHKE_REPO_MAP = {
  eshkol: 'EshkolConsciousness — AD primitive, logic KB, GWT workspace, factor graphs',
  moonlab: 'MoonlabSim — Clifford, tensor/MPO, Bloch, QGT geometry',
  libirrep: 'LibirrepSym — SO(3)/SU(2) irreps, Clebsch–Gordan, equivariance',
  quantum_quake: 'QuantumQuake — QGE aliveness, lattice perturbations',
  quantum_rng: 'QRNG — seeded qubit measurement (ported to eshkol-qrng.ts)',
  ulg: 'ULG-Browser — triad handoff / hybrid aliveness',
  qgt: 'QGTLGeo — quantum geometry & topological curvature',
  spin_nets: 'SpinNets — spin-glass instinct lattices',
  tensorcore_metal: 'TensorCore-Metal — GPU tensor kernels (facade bias only)',
  gpt2_basic: 'gpt2-basic — BOUNDARY ONLY (shell/Copilot, never sim hot path)',
  llm_arbitrator: 'llm-arbitrator — BOUNDARY ONLY (never sim hot path)',
} as const;

export type TsotchkeRepoKey = keyof typeof TSOTCHKE_REPO_MAP;
