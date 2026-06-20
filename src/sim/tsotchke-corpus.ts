/**
 * TSOTCHKE CORPUS REGISTRY — canonical map of all 20 local mirrors + org repos
 * to Cosmogonic exclusive leaves. Source: Z:\[Vibe Coded (AI)]\(Tsotchke)\CORPUS.md
 *
 * Not a runtime dependency on the corpus path — provenance + wiring index only.
 * Deterministic; no I/O.
 */

export const TSOTCHKE_CORPUS_ROOT = 'Z:\\[Vibe Coded (AI)]\\(Tsotchke)';

export interface TsotchkeRepoBinding {
  readonly id: string;
  readonly mirrorPath: string;
  readonly cosmogonicLeaf: string;
  readonly paradigm: string;
}

/** All repos from github.com/tsotchke + Tsotchke-Corporation, bound to sim leaves. */
export const TSOTCHKE_REPO_BINDINGS: readonly TsotchkeRepoBinding[] = [
  {
    id: 'eshkol',
    mirrorPath: 'Eshkol/eshkol_repo',
    cosmogonicLeaf: 'sim/eshkol-bridge.ts',
    paradigm: 'AD primitive · consciousness engine · .esk language',
  },
  {
    id: 'moonlab',
    mirrorPath: 'mirrors/moonlab',
    cosmogonicLeaf: 'sim/moonlab-tensor.ts',
    paradigm: 'tensor nets · MPO · Clifford · VQE · QRNG',
  },
  {
    id: 'quantum_geometric_tensor',
    mirrorPath: 'mirrors/quantum_geometric_tensor',
    cosmogonicLeaf: 'math/quantum-geometry.ts',
    paradigm: 'QGT · Fubini–Study · natural gradient',
  },
  {
    id: 'quantum_rng',
    mirrorPath: 'mirrors/quantum_rng',
    cosmogonicLeaf: 'math/eshkol-qrng.ts',
    paradigm: 'Bell QRNG · phase qubits',
  },
  {
    id: 'spin_based_neural_network',
    mirrorPath: 'mirrors/spin_based_neural_network',
    cosmogonicLeaf: 'sim/spin-glass.ts',
    paradigm: 'Hopfield · Ising instinct lattice',
  },
  {
    id: 'libirrep',
    mirrorPath: 'mirrors/libirrep',
    cosmogonicLeaf: 'sim/irrep-symmetry.ts',
    paradigm: 'SO(3)/SU(2) reps · Clebsch–Gordan · QEC zoo',
  },
  {
    id: 'quantum-quake',
    mirrorPath: 'mirrors/quantum-quake',
    cosmogonicLeaf: 'sim/qge-physics.ts',
    paradigm: 'QGE · Quake aliveness · hybrid physics',
  },
  {
    id: 'ulg',
    mirrorPath: 'mirrors/ulg',
    cosmogonicLeaf: 'sim/tsotchke-facade.ts',
    paradigm: 'browser triad · PeerCompute · staged workers',
  },
  {
    id: 'tensorcore',
    mirrorPath: 'mirrors/tensorcore',
    cosmogonicLeaf: 'sim/moonlab-tensor.ts',
    paradigm: 'tensor core kernels · metal paths',
  },
  {
    id: 'logo-lab',
    mirrorPath: 'mirrors/logo-lab',
    cosmogonicLeaf: 'sim/super-body.ts',
    paradigm: 'material lab · ascii renderer · mobius baseline',
  },
  {
    id: 'SolanaQuantumFlux',
    mirrorPath: 'mirrors/SolanaQuantumFlux',
    cosmogonicLeaf: 'math/eshkol-qrng.ts',
    paradigm: 'on-chain QRNG · statistical verification',
  },
  {
    id: 'Quantum-RNG-API',
    mirrorPath: 'mirrors/Quantum-RNG-API',
    cosmogonicLeaf: 'math/eshkol-qrng.ts',
    paradigm: 'REST QRNG API · native C binding',
  },
  {
    id: 'homebrew-eshkol',
    mirrorPath: 'mirrors/homebrew-eshkol',
    cosmogonicLeaf: 'sim/eshkol-bridge.ts',
    paradigm: 'Eshkol toolchain packaging',
  },
  {
    id: 'llm-arbitrator',
    mirrorPath: 'mirrors/llm-arbitrator',
    cosmogonicLeaf: 'sim/quantum-deliberation.ts',
    paradigm: 'multi-model arbitration (sim only; not copilot)',
  },
  {
    id: 'gpt2-basic',
    mirrorPath: 'mirrors/gpt2-basic',
    cosmogonicLeaf: 'sim/ai/brains.ts',
    paradigm: 'tiny MLP baseline (pre-transformer contrast)',
  },
  {
    id: 'simple_mnist',
    mirrorPath: 'mirrors/simple_mnist',
    cosmogonicLeaf: 'sim/ai/brains.ts',
    paradigm: 'classical perceptron demos',
  },
  {
    id: 'asteroids',
    mirrorPath: 'mirrors/asteroids',
    cosmogonicLeaf: 'sim/qge-physics.ts',
    paradigm: 'arcade physics seed patterns',
  },
  {
    id: 'classical_rng',
    mirrorPath: 'mirrors/classical_rng',
    cosmogonicLeaf: 'math/rng.ts',
    paradigm: 'classical PRNG contrast to Eshkol QRNG',
  },
  {
    id: 'PINN',
    mirrorPath: 'mirrors/PINN',
    cosmogonicLeaf: 'sim/pinn-residual.ts',
    paradigm: 'physics-informed nets · free energy',
  },
  {
    id: 'PIMC',
    mirrorPath: 'mirrors/PIMC',
    cosmogonicLeaf: 'sim/pimc-paths.ts',
    paradigm: 'path-integral Monte Carlo inspiration',
  },
] as const;

export function repoBindingForId(id: string): TsotchkeRepoBinding | undefined {
  return TSOTCHKE_REPO_BINDINGS.find((r) => r.id === id);
}

export function corpusCoverageRatio(): number {
  const leaves = new Set(TSOTCHKE_REPO_BINDINGS.map((r) => r.cosmogonicLeaf));
  return leaves.size / TSOTCHKE_REPO_BINDINGS.length;
}
