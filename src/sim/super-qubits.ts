/**
 * THE QUANTUM COMPUTING MIND (V75) — the apex creature's simulated-qubit cognition layer, the
 * directive's "Quantum Computing Mind · Simulated Qubits". Where {@link SuperMind} is a classical
 * composite of tiny MLPs, this is a genuine **statevector quantum register** ({@link QuantumRegister},
 * 6 qubits → 64 complex amplitudes) that the composite mind drives each beat: a parameterised circuit
 * encodes the mind's own signals (its 16-d world-model latent + its 10 reactive quantum-aspect
 * intensities) into qubit rotations and tunable entanglement, the state evolves under real unitary
 * gates, and a non-destructive Born sample selects a basis index — all deterministic from a
 * seeded {@link Rng} (no `Math.random`/`Date.now`), so the circuit and sampling replay from a seed.
 *
 * Honest math (docs/PHILOSOPHY-2026-06-26.md): every amplitude obeys the Schrödinger evolution of the applied
 * gates; the per-qubit Bloch vectors come from the true single-qubit reduced density matrices; the
 * entanglement reading is the reduced-state purity deficit (1 − |r|²); the entropy is the normalized
 * Shannon entropy of the Born distribution. The statevector register + RY/RZ/CNOT gate set are our own
 * (`src/math/quantum.ts`); the per-beat basis index is sampled through the Eshkol quantum RNG (a
 * faithful Tsotchke port wired in by {@link SuperMind}), and the geometry readout delegates to the
 * ported QGTL primitive ({@link quantumGeometricTensor}).
 * Heartbeat wiring: Moonlab tensor contract (Tsotchke corpus) for 5 Archons quantum scaling in super-mind.
 *
 * V84 — moved from research to development: {@link QuantumMind.geometricMetric} reads the **Quantum
 * Geometric Tensor / Fubini–Study metric** of the mind's own circuit by delegating to the canonical
 * ported primitive `src/math/quantum-geometry.ts` (the QGTL port), restricted to the two cognition
 * knobs (superposition, entanglement):
 * `g_μν = Re⟨∂_μψ|(1−|ψ⟩⟨ψ|)|∂_νψ⟩`. The determinant and trace describe this metric;
 * neither is a curvature invariant or evidence of consciousness.
 *
 * ─── ATTRIBUTION (Quantum Geometric Tensor / Fubini–Study metric) ──────────────────────────────────
 *   The geometry engine is {@link quantumGeometricTensor} (`src/math/quantum-geometry.ts`), adapted
 *   from the Tsotchke `quantum_geometric_tensor` (QGTL) + Moonlab `quantum_geometry/qgt.c`. Original
 *   work © 2024–2026 tsotchke, MIT License (https://opensource.org/licenses/MIT). References: Provost &
 *   Vallee (1980); Berry (1984); Fukui–Hatsugai–Suzuki (2005). Full attribution: THIRD-PARTY-NOTICES.md.
 * ────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Cost: O(layers · gates · 2ⁿ) per circuit build; evolve also builds five self-optimization probes.
 * {@link snapshot} allocates public arrays and computes a five-build QGT plus coherence, balanced-cut
 * purities and a Pauli-sum magic diagnostic. UI reads use a separate scratch register and no RNG.
 */
import { QuantumRegister } from '../math/quantum';
import { quantumGeometricTensor } from '../math/quantum-geometry';
import { integratedInformation } from './integrated-information';
import { quantumCoherence } from '../math/quantum-coherence';
import { naturalGradient2x2 } from '../math/quantum-natural-gradient';
import { quantumMagic } from '../math/quantum-magic';
import type { Rng } from '../math/rng';
import { gwtBroadcast, makeEshkolDual } from './tsotchke-facade'; // Ralph 10x continue: Eshkol GWT/dual from Tsotchke corpus (workspace.cpp, AUTODIFF) wired into qubit mind for modulation

/** Register width — 6 qubits → 64 basis amplitudes: a rich BRAIN view that stays trivially in budget. */
export const QMIND_QUBITS = 6;
/** Circuit depth: rotation + tunable-entanglement layers applied per beat. */
export const QMIND_LAYERS = 3;
const DIM = 1 << QMIND_QUBITS; // 64
const TAU = Math.PI * 2;
// All circuit latent indices are below max(layers*qubits, 2*(qubits-1)+layers).
const CIRCUIT_LATENT_SIZE = Math.max(
  QMIND_LAYERS * QMIND_QUBITS,
  2 * (QMIND_QUBITS - 1) + QMIND_LAYERS,
);

// ── V93: QUANTUM NATURAL GRADIENT self-optimization (Stokes, Izaac, Killoran & Carleo, Quantum 4, 269, 2020) ──
/** Central-difference step for the per-beat ∇P(target) + the 2×2 Fubini–Study metric over (sup, ent). */
const SELFOPT_EPS = 0.01;
/** Tikhonov ridge regularising the (possibly singular) 2×2 metric before inversion. */
const SELFOPT_RIDGE = 1e-2;
/** Step rate of the natural-gradient bias toward the intended thought (small — it accrues over beats). */
const SELFOPT_RATE = 0.02;
/** Per-beat decay of the bias toward 0 (so it tracks the current intent instead of running away). */
const SELFOPT_DECAY = 0.9;
/** Bound on the persisted (superposition, entanglement) self-optimization bias. */
const SELFOPT_MAX = 0.35;

/** A single qubit's Bloch vector and length; reduced purity is (1+r²)/2, not r. */
export interface BlochVec {
  x: number;
  y: number;
  z: number;
  r: number;
}

/**
 * The quantum-geometric readout of the mind's parameterised circuit — a genuine port of the
 * **Quantum Geometric Tensor / Fubini–Study metric** from the Tsotchke `quantum_geometric_tensor`
 * (QGTL) + Moonlab `qgt.c` study (see header attribution). The 2×2 metric is taken over the two
 * circuit drives, superposition and entanglement. This describes the pre-amplification circuit
 * family, not a measurement of experience. A stencil crossing a discrete gate switch is flagged.
 */
export interface QGeometry {
  /** Row-major 2×2 Fubini–Study metric g_μν over (superposition, entanglement), 0..~. */
  metric: [number, number, number, number];
  /** det(g): squared metric area factor in these coordinates; not a curvature invariant. */
  determinant: number;
  /** tr(g): summed sensitivity to these two parameter coordinates; not scalar curvature. */
  trace: number;
  /** Compatibility alias for determinant. New displays must label this det(g), not curvature. */
  curvature: number;
  /** Compatibility alias for trace. */
  scalar: number;
  /** Berry component F₀₁ = −2 Im Q₀₁ under the project's sign convention. */
  berry: number;
  /** Central-difference half-width in circuit-drive coordinates. */
  finiteDifferenceStep: number;
  /** True when the stencil crosses sup>0.66's discrete Hadamard switch: no smooth local metric there. */
  stencilCrossesBranch: boolean;
}

/**
 * V93: the QUANTUM NATURAL GRADIENT self-optimization readout — how the apex mind is DESCENDING its own
 * Fubini–Study geometry (the QGT it already computes) to target a latent-sign basis probability, in the
 * spirit of Stokes, Izaac, Killoran & Carleo, "Quantum Natural Gradient", _Quantum_ 4, 269 (2020). The mind
 * update is a bounded numerical adaptation, not a cognitive-performance or consciousness result.
 */
export interface SelfOptReadout {
  /** The intended-thought basis index the optimization targets (= the Grover amplify target). */
  target: number;
  /** {@link target} as a qubit bitstring. */
  targetBits: string;
  /** Born probability of the intended thought in the parameterised circuit (pre-amplification), 0..1. */
  pTarget: number;
  /** ‖∇P‖ over (superposition, entanglement) — raw sensitivity of intent to the two cognition knobs. */
  gradNorm: number;
  /** ‖g⁻¹∇P‖ — the geometry-preconditioned (natural-gradient) step magnitude. */
  natNorm: number;
  /** ∇P·(g⁻¹∇P) ≥ 0, clamped 0..1 — the predicted ascent rate, i.e. the live "learning" signal. */
  improve: number;
  /** Persisted self-optimization bias added to the superposition drive each beat, −0.35..0.35. */
  biasSup: number;
  /** Persisted self-optimization bias added to the entanglement drive each beat, −0.35..0.35. */
  biasEnt: number;
}

/** Read-only telemetry of the quantum mind for the BRAIN view (built at UI cadence). */
export interface QubitSnapshot {
  qubits: number;
  dim: number;
  layers: number;
  gates: number;
  /** Born-rule probabilities |αᵢ|² over the 2ⁿ basis states (length {@link dim}). */
  probs: number[];
  /** Amplitude phase arg(αᵢ) ∈ (−π, π] per basis state, for phase colouring (length {@link dim}). */
  phase: number[];
  /** Per-qubit Bloch vectors from the reduced density matrices. */
  bloch: BlochVec[];
  /** P(|1⟩) per qubit. */
  p1: number[];
  /** Normalized Shannon entropy of computational-basis Born probabilities, 0..1; not von Neumann entropy. */
  entropy: number;
  /** Mean normalized single-qubit purity deficit 1−|r|², 0..1; not a pairwise entanglement matrix. */
  entanglement: number;
  /** Mean equatorial Bloch magnitude √(x²+y²) across qubits, 0..1 (live superposition strength). */
  coherence: number;
  /** Index of the last non-destructive Born sample; the statevector is not collapsed. */
  sampled: number;
  /** {@link sampled} as a qubit bitstring (qubit n−1 … qubit 0). */
  sampledBits: string;
  /** Pre-amplification circuit geometry, computed without modifying the live register. */
  geometry: QGeometry;
  /** V1.1: the INTENDED-thought basis index that goal-directed amplitude amplification (Grover) marks. */
  amplified: number;
  /** {@link amplified} as a qubit bitstring. */
  amplifiedBits: string;
  /** Grover oracle+diffuse rounds run this beat (0..2) — the mind's quantum-search focus. */
  amplifyRounds: number;
  /** Target Born probability AFTER the oracle/diffuser rounds; not a gain or guaranteed improvement. */
  amplifiedProb: number;
  /** Minimum normalized linear entropy over balanced cuts only, 0..1. A restricted entanglement
   * diagnostic: not IIT Φ, not a test of all partitions and not a consciousness measure. */
  phi: number;
  /** Minimizing balanced-cut mask, as a qubit bitstring; not an IIT minimum-information partition. */
  phiMip: string;
  /** V1.1: l1-norm quantum coherence of the register (resource theory of coherence), normalized 0..1. */
  coherenceL1: number;
  /** V1.1: relative-entropy quantum coherence (resource theory of coherence), normalized 0..1. */
  coherenceRel: number;
  /** Bounded natural-gradient adaptation of two circuit drives toward a target basis probability. */
  selfOpt: SelfOptReadout;
  /** Stabilizer 2-Rényi entropy M₂ ≥ 0 (non-stabilizerness); 0 = a stabilizer state.
   * This classically simulated six-qubit diagnostic establishes no computational advantage. */
  magic: number;
  /** {@link magic} normalized by log₂(d), in [0,1). */
  magicNorm: number;
  /** Whether the register is (numerically) a stabilizer state — zero magic. */
  stabilizer: boolean;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Clamp to ±m — the symmetric bound on the self-optimization bias. */
const clampPM = (v: number, m: number): number => (v < -m ? -m : v > m ? m : v);

/**
 * Apply |0><0|⊗I + |1><1|⊗RY(angle), with arbitrary distinct control/target indices.
 * Execution order RY(+angle/2), CX, RY(-angle/2), CX uses two CNOTs: control 0 cancels
 * the rotations; control 1 gives RY(angle). At π this is controlled-RY(π), not CNOT.
 * O(2ⁿ) with no allocation or random draws; zero angle is exactly the identity.
 */
export function applyControlledRy(
  reg: QuantumRegister,
  control: number,
  target: number,
  angle: number,
): void {
  if (
    !Number.isInteger(control) ||
    !Number.isInteger(target) ||
    control < 0 ||
    target < 0 ||
    control >= reg.qubits ||
    target >= reg.qubits ||
    control === target ||
    !Number.isFinite(angle)
  )
    throw new RangeError('controlled-RY requires distinct in-range qubits and a finite angle');
  if (angle === 0) return;
  reg.apply('ry', target, undefined, angle / 2);
  reg.apply('cx', target, control);
  reg.apply('ry', target, undefined, -angle / 2);
  reg.apply('cx', target, control);
}

/**
 * The quantum mind. Construct ONCE per {@link SuperMind} with a dedicated seeded {@link Rng} (its own
 * stream, so quantum sampling never perturbs sim determinism). Call {@link evolve} each cognitive beat
 * with the mind's live signals; call {@link snapshot} at the UI cadence to read the BRAIN view.
 */
export class QuantumMind {
  private readonly reg = new QuantumRegister(QMIND_QUBITS);
  /** Circuit probes never write the live evolved/amplified register. */
  private readonly analysisReg = new QuantumRegister(QMIND_QUBITS);
  private readonly rng: Rng;
  // Reusable read buffers (snapshot allocates the public arrays; these stay private + fixed).
  private readonly bufRe = new Float64Array(DIM);
  private readonly bufIm = new Float64Array(DIM);
  private readonly bloch3 = new Float64Array(3);
  // Last evolve's drive params, so the UI-cadence QGT replays the SAME circuit deterministically.
  private dSup = 0;
  private dEnt = 0;
  private dFtl = 0;
  private dMut = 0;
  private readonly dLatent = new Float64Array(CIRCUIT_LATENT_SIZE);
  private dL = 1;
  private gateCount = 0;
  private sampled = 0;
  /** Basis index marked by the oracle before non-destructive sampling. */
  private amplifyTarget = 0;
  /** V1.1: how many Grover oracle+diffuse rounds ran this beat (0..2, gated by focus). */
  private amplifyRounds = 0;
  /** Pre-allocated scratch for gwtBroadcast calls in evolve() — no per-beat array allocation. */
  private readonly gwtContent = [0, 0, 0, 0];
  private readonly gwtSalience = [0.7, 0.8, 0.5, 0.6];
  // ── V93: natural-gradient self-optimization — persisted biases + preallocated finite-diff buffers ──
  /** Persisted natural-gradient bias on the superposition drive (steers the circuit toward intent). */
  private optSup = 0;
  /** Persisted natural-gradient bias on the entanglement drive. */
  private optEnt = 0;
  private readonly soOut: [number, number] = [0, 0];
  private readonly soBaseRe = new Float64Array(DIM);
  private readonly soBaseIm = new Float64Array(DIM);
  private readonly soSpRe = new Float64Array(DIM);
  private readonly soSpIm = new Float64Array(DIM);
  private readonly soSmRe = new Float64Array(DIM);
  private readonly soSmIm = new Float64Array(DIM);
  private readonly soEpRe = new Float64Array(DIM);
  private readonly soEpIm = new Float64Array(DIM);
  private readonly soEmRe = new Float64Array(DIM);
  private readonly soEmIm = new Float64Array(DIM);
  /** Persisted self-optimization readout — mutated in place each beat (no per-beat allocation). */
  private readonly so: SelfOptReadout = {
    target: 0,
    targetBits: (0).toString(2).padStart(QMIND_QUBITS, '0'),
    pTarget: 0,
    gradNorm: 0,
    natNorm: 0,
    improve: 0,
    biasSup: 0,
    biasEnt: 0,
  };

  constructor(rng: Rng) {
    this.rng = rng;
  }

  /**
   * Encode → evolve → read. Rebuilds the state from |0…0⟩ each beat (so it tracks the mind's current
   * cognition, smoothly, deterministically) by applying {@link QMIND_LAYERS} layers of single-qubit
   * rotations (angles from the latent) and tunable controlled-RY entanglers (angle from the
   * `entanglement` aspect), with Hadamards gated by the `superposition` aspect, then takes one
   * non-destructive Born sample. Allocation-free; O(layers · gates · 2ⁿ). `aspects` is the 10-element
   * quantum-aspect vector (0..1); `latent` is the world-model latent (any length ≥ 1, values ~−1..1).
   */
  evolve(aspects: ArrayLike<number>, latent: ArrayLike<number>): void {
    const supRaw = clamp01(aspects[0] ?? 0); // superposition
    const entRaw = clamp01(aspects[1] ?? 0); // entanglement
    // V93: the persisted natural-gradient bias steers the circuit toward the intended thought. It is 0 on
    // the first beat (a single evolve is unchanged) and accrues only across beats as the mind self-tunes.
    const sup = clamp01(supRaw + this.optSup);
    const ent = clamp01(entRaw + this.optEnt);
    const ftl = clamp01(aspects[2] ?? 0); // ftl → phase drive
    const mut = clamp01(aspects[6] ?? 0); // mutation → rotation jitter
    const L = latent.length || 1;
    // Remember the drive params so snapshot()'s UI-cadence QGT replays the SAME circuit and takes its
    // parameter derivatives deterministically (no extra RNG draw — only evolve() ever samples).
    this.dSup = sup;
    this.dEnt = ent;
    this.dFtl = ftl;
    this.dMut = mut;
    // Copy only the bounded input slice read by the circuit: callers reuse/mutate their latent buffers.
    this.dL = Math.min(L, CIRCUIT_LATENT_SIZE);
    for (let i = 0; i < this.dL; i++) this.dLatent[i] = latent[i] ?? 0;
    // Ralph 10x: use gwtBroadcast (Eshkol GWT from Tsotchke) + dual for corpus modulation of qubit drives
    const gwtC = this.gwtContent;
    gwtC[0] = sup;
    gwtC[1] = ent;
    gwtC[2] = ftl;
    gwtC[3] = mut;
    const gwt = gwtBroadcast(gwtC, this.gwtSalience);
    // Apply the GWT-modulated drive to the REAL circuit (and keep the replay param in sync) — the
    // modulation used to only overwrite this.dSup while applyCircuit ran the UNmodulated `sup`, so the
    // corpus modulation was dead wiring and snapshot()'s QGT replayed a circuit that was never run.
    const dSup = makeEshkolDual(sup, gwt[0] || 0);
    const supMod = clamp01(dSup.value + (gwt[1] || 0) * 0.01);
    this.dSup = supMod;
    this.gateCount = this.applyCircuit(supMod, ent, ftl, mut, latent, L);
    // Oracle/diffuser rounds mark the basis state whose bits are the latent's signs. The
    // 'qudit-compute' aspect selects 0..2 rounds; their actual probability change is state-dependent.
    // Bounded to 2 unitary rounds; a general input state can still overshoot or lose target probability.
    let target = 0;
    for (let k = 0; k < QMIND_QUBITS; k++) if ((latent[k % L] ?? 0) > 0) target |= 1 << k;
    const rounds = Math.round(clamp01(aspects[4] ?? 0) * 2);
    for (let it = 0; it < rounds; it++) {
      this.reg.phaseFlip(target);
      this.reg.diffuse();
      this.gateCount += 2;
    }
    this.amplifyTarget = target;
    this.amplifyRounds = rounds;
    // V93 — QUANTUM NATURAL GRADIENT self-optimization: descend the Fubini–Study geometry toward the
    // target probability, nudge the persisted (sup,ent) bias for the NEXT beat, using a separate probe
    // register so the current amplified state and Born sample remain unchanged. No RNG in the probes.
    this.selfOptimizeStep(target, supMod, ent, ftl, mut, latent, L);
    this.sampled = this.reg.sample(this.rng);
  }

  /**
   * Build the parameterised circuit from |0…0⟩ — NO measurement, so it draws no RNG. {@link evolve}
   * runs it once per beat; {@link geometricMetric} re-runs it on perturbed drives to finite-difference
   * the derivatives of |ψ⟩. Allocation-free; O(layers · gates · 2ⁿ). Returns the gate count.
   */
  private applyCircuit(
    sup: number,
    ent: number,
    ftl: number,
    mut: number,
    latent: ArrayLike<number>,
    L: number,
    reg: QuantumRegister = this.reg,
  ): number {
    reg.reset();
    let gates = 0;
    for (let layer = 0; layer < QMIND_LAYERS; layer++) {
      // ── single-qubit rotations: each qubit's Y/Z angles read a slice of the world-model latent ──
      for (let k = 0; k < QMIND_QUBITS; k++) {
        const lv = latent[(k + layer * QMIND_QUBITS) % L] ?? 0; // ~−1..1
        const lv2 = latent[(k * 2 + layer + 1) % L] ?? 0;
        // Superposition aspect lifts qubits toward the equator; mutation jitters the angle.
        const theta = (lv * 0.5 + 0.5) * Math.PI + sup * (Math.PI / 2) + mut * lv2 * 0.6;
        const phi = lv2 * Math.PI + ftl * TAU * ((k + 1) / QMIND_QUBITS);
        reg.apply('ry', k, undefined, theta);
        reg.apply('rz', k, undefined, phi);
        gates += 2;
        if (sup > 0.66 && ((k + layer) & 1) === 0) {
          reg.apply('h', k);
          gates += 1;
        }
      }
      // ── tunable entanglement: a controlled-RY ring, strength set by the entanglement aspect ──
      // Two-CNOT controlled RY, continuous at β=0 and valid for signed finite-difference probes.
      const beta = ent * Math.PI * (0.55 + 0.45 * Math.sin(layer + 1));
      if (beta !== 0) {
        for (let k = 0; k < QMIND_QUBITS; k++) {
          const t = (k + 1) % QMIND_QUBITS;
          applyControlledRy(reg, k, t, beta);
          gates += 4;
        }
      }
    }
    return gates;
  }

  /** Build the parameterised circuit at (sup,ent) into the caller's amplitude buffers (no RNG, no alloc). */
  private buildInto(
    sup: number,
    ent: number,
    ftl: number,
    mut: number,
    latent: ArrayLike<number>,
    L: number,
    outRe: Float64Array,
    outIm: Float64Array,
  ): void {
    this.applyCircuit(sup, ent, ftl, mut, latent, L, this.analysisReg);
    this.analysisReg.amplitudesInto(outRe, outIm);
  }

  /**
   * One QUANTUM NATURAL GRADIENT step (Stokes et al., _Quantum_ 4, 269, 2020). Finite-difference ∇P(target)
   * over the two cognition knobs (superposition, entanglement), build the 2×2 Fubini–Study metric from the
   * SAME shifted states, precondition the gradient by the (Tikhonov-regularised) inverse metric, and nudge
   * the persisted (sup,ent) bias up that natural gradient so the mind's INTENDED thought grows more probable
   * over beats. Reads its own quantum geometry, writes its own quantum drives — the substrate optimizes
   * its two biases. Preallocated probe buffers and register; deterministic (no RNG). The live evolved
   * register is never modified. Predicted ascent is not a guarantee of actual gain on a later beat.
   */
  private selfOptimizeStep(
    target: number,
    sup: number,
    ent: number,
    ftl: number,
    mut: number,
    latent: ArrayLike<number>,
    L: number,
  ): void {
    const eps = SELFOPT_EPS;
    this.buildInto(sup, ent, ftl, mut, latent, L, this.soBaseRe, this.soBaseIm);
    const br0 = this.soBaseRe[target] ?? 0;
    const bi0 = this.soBaseIm[target] ?? 0;
    const pBase = br0 * br0 + bi0 * bi0;
    this.buildInto(clamp01(sup + eps), ent, ftl, mut, latent, L, this.soSpRe, this.soSpIm);
    this.buildInto(clamp01(sup - eps), ent, ftl, mut, latent, L, this.soSmRe, this.soSmIm);
    this.buildInto(sup, clamp01(ent + eps), ftl, mut, latent, L, this.soEpRe, this.soEpIm);
    this.buildInto(sup, clamp01(ent - eps), ftl, mut, latent, L, this.soEmRe, this.soEmIm);
    const inv2e = 1 / (2 * eps);
    // ∇P(target) over (sup, ent) by central difference of the marked-state Born probability.
    const spr = this.soSpRe[target] ?? 0;
    const spi = this.soSpIm[target] ?? 0;
    const smr = this.soSmRe[target] ?? 0;
    const smi = this.soSmIm[target] ?? 0;
    const epr = this.soEpRe[target] ?? 0;
    const epi = this.soEpIm[target] ?? 0;
    const emr = this.soEmRe[target] ?? 0;
    const emi = this.soEmIm[target] ?? 0;
    const gradS = (spr * spr + spi * spi - (smr * smr + smi * smi)) * inv2e;
    const gradE = (epr * epr + epi * epi - (emr * emr + emi * emi)) * inv2e;
    // 2×2 Fubini–Study metric g_ij = Re⟨∂_iψ|∂_jψ⟩ − Re(⟨∂_iψ|ψ⟩·conj⟨∂_jψ|ψ⟩), each ∂_iψ via central diff.
    let ss = 0;
    let ee = 0;
    let seRe = 0;
    let sPsiRe = 0;
    let sPsiIm = 0;
    let ePsiRe = 0;
    let ePsiIm = 0;
    for (let i = 0; i < DIM; i++) {
      const dsr = ((this.soSpRe[i] ?? 0) - (this.soSmRe[i] ?? 0)) * inv2e;
      const dsi = ((this.soSpIm[i] ?? 0) - (this.soSmIm[i] ?? 0)) * inv2e;
      const der = ((this.soEpRe[i] ?? 0) - (this.soEmRe[i] ?? 0)) * inv2e;
      const dei = ((this.soEpIm[i] ?? 0) - (this.soEmIm[i] ?? 0)) * inv2e;
      const pr = this.soBaseRe[i] ?? 0;
      const pi = this.soBaseIm[i] ?? 0;
      ss += dsr * dsr + dsi * dsi;
      ee += der * der + dei * dei;
      seRe += dsr * der + dsi * dei; // Re(conj(∂s)·∂e)
      sPsiRe += dsr * pr + dsi * pi; // Re(conj(∂s)·ψ)
      sPsiIm += dsr * pi - dsi * pr; // Im(conj(∂s)·ψ)
      ePsiRe += der * pr + dei * pi;
      ePsiIm += der * pi - dei * pr;
    }
    const g00 = ss - (sPsiRe * sPsiRe + sPsiIm * sPsiIm);
    const g11 = ee - (ePsiRe * ePsiRe + ePsiIm * ePsiIm);
    const g01 = seRe - (sPsiRe * ePsiRe + sPsiIm * ePsiIm);
    naturalGradient2x2(g00, g01, g11, gradS, gradE, SELFOPT_RIDGE, this.soOut);
    const ngS = this.soOut[0] ?? 0;
    const ngE = this.soOut[1] ?? 0;
    // ascent step toward more P(target); bounded + decaying so it tracks intent without running away.
    this.optSup = clampPM(SELFOPT_DECAY * this.optSup + SELFOPT_RATE * ngS, SELFOPT_MAX);
    this.optEnt = clampPM(SELFOPT_DECAY * this.optEnt + SELFOPT_RATE * ngE, SELFOPT_MAX);
    const so = this.so;
    so.target = target;
    so.targetBits = target.toString(2).padStart(QMIND_QUBITS, '0');
    so.pTarget = clamp01(pBase);
    so.gradNorm = Math.hypot(gradS, gradE);
    so.natNorm = Math.hypot(ngS, ngE);
    so.improve = clamp01(gradS * ngS + gradE * ngE);
    so.biasSup = this.optSup;
    so.biasEnt = this.optEnt;
  }

  /**
   * Finite-difference quantum geometric tensor of the pre-amplification circuit. Delegates to
   * the canonical ported QGTL primitive {@link quantumGeometricTensor} (`src/math/quantum-geometry.ts`),
   * restricted to the two cognition drives θ = (superposition, entanglement): it central-differences
   * |ψ(θ)⟩ over the parameterised circuit (DETERMINISTIC — pure 64-amplitude statevector algebra, no
   * RNG) and yields g_μν = Re Q_μν, det(g), tr(g), and F₀₁ = −2·Im Q₀₁. Runs at UI cadence using a
   * dedicated scratch register; live probabilities, phases, observables and samples are untouched.
   * The parameter family includes a discrete Hadamard switch, so crossing that switch is reported.
   */
  geometricMetric(): QGeometry {
    const build = (p: readonly number[], outRe: Float64Array, outIm: Float64Array): void => {
      this.applyCircuit(
        p[0] ?? 0,
        p[1] ?? 0,
        this.dFtl,
        this.dMut,
        this.dLatent,
        this.dL,
        this.analysisReg,
      );
      this.analysisReg.amplitudesInto(outRe, outIm);
    };
    const g = quantumGeometricTensor([this.dSup, this.dEnt], build, DIM, SELFOPT_EPS);
    const g00 = g.metric[0]?.[0] ?? 0;
    const g11 = g.metric[1]?.[1] ?? 0;
    const g01 = g.metric[0]?.[1] ?? 0;
    const berry = -2 * (g.berry[0]?.[1] ?? 0); // F₀₁ = −2·Im Q₀₁ (the project's Berry sign convention)
    const determinant = g00 * g11 - g01 * g01;
    const trace = g00 + g11;
    return {
      metric: [g00, g01, g01, g11],
      determinant,
      trace,
      // Audit #95: these are metric invariants, NOT Riemann curvature — `curvature` is det g and
      // `scalar` is tr g. Kept under the legacy keys for consumers; see `determinant`/`trace`.
      curvature: determinant,
      scalar: trace,
      berry,
      finiteDifferenceStep: SELFOPT_EPS,
      stencilCrossesBranch: this.dSup - SELFOPT_EPS <= 0.66 && this.dSup + SELFOPT_EPS > 0.66,
    };
  }

  /** Index of the most recent non-destructive Born sample; no state collapse occurs. */
  get lastSample(): number {
    return this.sampled;
  }

  /**
   * V1.2 — write the register's per-qubit Bloch observables ⟨X⟩,⟨Y⟩,⟨Z⟩ (3 × {@link QMIND_QUBITS} = 18
   * values) into `out` (length ≥ 18). These are the live "measurements" of the quantum reservoir that the
   * quantum-reservoir-computing readout ({@link ../sim/quantum-reservoir}) reads each beat. Call AFTER
   * {@link evolve} (which leaves the register in the evolved + amplified state; the Born sample is
   * non-destructive, so the amplitudes are unchanged). Cheap (O(qubits · 2ⁿ)); allocation-free; no RNG.
   */
  readObservables(out: Float64Array): void {
    for (let k = 0; k < QMIND_QUBITS; k++) {
      this.reg.blochInto(k, this.bloch3);
      out[3 * k] = this.bloch3[0] ?? 0;
      out[3 * k + 1] = this.bloch3[1] ?? 0;
      out[3 * k + 2] = this.bloch3[2] ?? 0;
    }
  }

  /**
   * Minimum normalized linear entropy over ten balanced cuts of the CURRENT six-qubit pure state.
   * Compatibility name: this is not IIT integrated information or an all-partition irreducibility test.
   * Deterministic; reuses private amplitude buffers without modifying the register or RNG.
   */
  integratedInformationNow(): number {
    this.reg.amplitudesInto(this.bufRe, this.bufIm);
    return integratedInformation(this.bufRe, this.bufIm, QMIND_QUBITS).phi;
  }

  /**
   * Perf — the register L1-coherence of the CURRENT evolved state, O(2ⁿ). Cheap read for the per-beat
   * cognition hot path ({@link ../sim/super-mind}.think()), which needs only this scalar + magic and must
   * NOT pay for the full UI-cadence {@link snapshot} (whose quantumMagic 4ⁿ-Pauli sum, 5× QGT circuit
   * rebuild and balanced-cut diagnostic cost more than this read). Reuses the snapshot
   * buffers exactly like {@link integratedInformationNow}; snapshot() re-reads them, so no cross-call hazard.
   */
  coherenceL1Now(): number {
    this.reg.amplitudesInto(this.bufRe, this.bufIm);
    return quantumCoherence(this.bufRe, this.bufIm).l1Norm;
  }

  /**
   * Perf — the register magic (stabilizer 2-Rényi non-stabilizerness) of the CURRENT state. Still O(4ⁿ)
   * (quantum-magic's own doc says 'never per simulation beat'), so callers should recompute it only on the
   * full round-robin beat and cache it for the interleaved echo beats — see super-mind.think().
   */
  magicNormNow(): number {
    this.reg.amplitudesInto(this.bufRe, this.bufIm);
    return quantumMagic(this.bufRe, this.bufIm, QMIND_QUBITS).magicNorm;
  }

  /**
   * Build the read-only BRAIN snapshot from the live statevector: Born probabilities + phases, the
   * per-qubit Bloch vectors and P(|1⟩), the normalized entropy, the mean entanglement (purity
   * deficit) and equatorial coherence, and the last sampled basis state. Allocates the public arrays
   * (UI cadence only). Includes QGT probes, balanced-cut purities and the Pauli-sum magic diagnostic.
   */
  snapshot(): QubitSnapshot {
    const reg = this.reg;
    reg.amplitudesInto(this.bufRe, this.bufIm);
    const probs = Array.from({ length: DIM }, () => 0);
    const phase = Array.from({ length: DIM }, () => 0);
    for (let i = 0; i < DIM; i++) {
      const r = this.bufRe[i] ?? 0;
      const m = this.bufIm[i] ?? 0;
      probs[i] = r * r + m * m;
      phase[i] = Math.atan2(m, r);
    }
    const bloch: BlochVec[] = [];
    const p1 = Array.from({ length: QMIND_QUBITS }, () => 0);
    let entSum = 0;
    let cohSum = 0;
    for (let k = 0; k < QMIND_QUBITS; k++) {
      reg.blochInto(k, this.bloch3);
      const x = this.bloch3[0] ?? 0;
      const y = this.bloch3[1] ?? 0;
      const z = this.bloch3[2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      bloch.push({ x, y, z, r });
      p1[k] = clamp01((1 - z) / 2); // P(|1⟩) = (1 − ⟨Z⟩)/2
      entSum += clamp01(1 - r * r); // purity deficit (linear entanglement entropy)
      cohSum += clamp01(Math.sqrt(x * x + y * y)); // equatorial (off-diagonal) magnitude
    }
    // Every state diagnostic reads the same live post-evolve, post-amplification state.
    const entropy = reg.entropy();
    // Restricted balanced-cut linear entropy + resource-theory coherence; neither certifies experience.
    const info = integratedInformation(this.bufRe, this.bufIm, QMIND_QUBITS);
    const coh = quantumCoherence(this.bufRe, this.bufIm);
    // SC 1.1: quantum "magic" (stabilizer Rényi entropy) — non-stabilizerness of the live register,
    // read from the same captured amplitudes. The QGT below uses a separate register.
    const mag = quantumMagic(this.bufRe, this.bufIm, QMIND_QUBITS);
    const geometry = this.geometricMetric();
    return {
      qubits: QMIND_QUBITS,
      dim: DIM,
      layers: QMIND_LAYERS,
      gates: this.gateCount,
      probs,
      phase,
      bloch,
      p1,
      entropy,
      entanglement: entSum / QMIND_QUBITS,
      coherence: cohSum / QMIND_QUBITS,
      sampled: this.sampled,
      sampledBits: this.sampled.toString(2).padStart(QMIND_QUBITS, '0'),
      geometry,
      amplified: this.amplifyTarget,
      amplifiedBits: this.amplifyTarget.toString(2).padStart(QMIND_QUBITS, '0'),
      amplifyRounds: this.amplifyRounds,
      amplifiedProb: probs[this.amplifyTarget] ?? 0,
      phi: info.phi,
      phiMip: info.mipBits,
      coherenceL1: coh.l1Norm,
      coherenceRel: coh.relEntropyNorm,
      magic: mag.magic,
      magicNorm: mag.magicNorm,
      stabilizer: mag.stabilizer,
      selfOpt: { ...this.so },
    };
  }
}
