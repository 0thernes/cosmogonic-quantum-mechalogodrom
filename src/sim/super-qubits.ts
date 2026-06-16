/**
 * THE QUANTUM COMPUTING MIND (V75) — the apex creature's simulated-qubit cognition layer, the
 * directive's "Quantum Computing Mind · Simulated Qubits". Where {@link SuperMind} is a classical
 * composite of tiny MLPs, this is a genuine **statevector quantum register** ({@link QuantumRegister},
 * 6 qubits → 64 complex amplitudes) that the composite mind drives each beat: a parameterised circuit
 * encodes the mind's own signals (its 16-d world-model latent + its 10 reactive quantum-aspect
 * intensities) into qubit rotations and tunable entanglement, the state evolves under real unitary
 * gates, and a non-destructive Born sample reads a "thought collapse" — all deterministic from a
 * seeded {@link Rng} (no `Math.random`/`Date.now`), so the whole quantum psyche replays from a seed.
 *
 * Honest math (docs/PHILOSOPHY.md): every amplitude obeys the Schrödinger evolution of the applied
 * gates; the per-qubit Bloch vectors come from the true single-qubit reduced density matrices; the
 * entanglement reading is the reduced-state purity deficit (1 − |r|²); the entropy is the normalized
 * Shannon entropy of the Born distribution. The statevector register + RY/RZ/CNOT gate set are our own
 * (`src/math/quantum.ts`); the per-beat thought-collapse is sampled through the Eshkol quantum RNG (a
 * faithful Tsotchke port wired in by {@link SuperMind}), and the geometry readout delegates to the
 * ported QGTL primitive ({@link quantumGeometricTensor}).
 *
 * V84 — moved from research to development: {@link QuantumMind.geometricMetric} reads the **Quantum
 * Geometric Tensor / Fubini–Study metric** of the mind's own circuit by delegating to the canonical
 * ported primitive `src/math/quantum-geometry.ts` (the QGTL port), restricted to the two cognition
 * knobs (superposition, entanglement). The mind feels the curvature of its own thought-space —
 * `g_μν = Re⟨∂_μψ|(1−|ψ⟩⟨ψ|)|∂_νψ⟩` — a real, deterministic quantum-geometry quantity.
 *
 * ─── ATTRIBUTION (Quantum Geometric Tensor / Fubini–Study metric) ──────────────────────────────────
 *   The geometry engine is {@link quantumGeometricTensor} (`src/math/quantum-geometry.ts`), adapted
 *   from the Tsotchke `quantum_geometric_tensor` (QGTL) + Moonlab `quantum_geometry/qgt.c`. Original
 *   work © 2024–2026 tsotchke, MIT License (https://opensource.org/licenses/MIT). References: Provost &
 *   Vallee (1980); Berry (1984); Fukui–Hatsugai–Suzuki (2005). Full attribution: THIRD-PARTY-NOTICES.md.
 * ────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Cost: ~90 gates × 64 amplitudes ≈ 5.8k complex mults per beat — sub-microsecond, allocation-free in
 * {@link evolve} (the hot path). {@link snapshot} allocates the read-only arrays the BRAIN view paints
 * from + computes the QGT (a 2-knob finite difference = 5 circuit builds); it runs only at the
 * Observatory UI cadence, never per simulation beat, so the per-beat hot path stays untouched.
 */
import { QuantumRegister } from '../math/quantum';
import { quantumGeometricTensor } from '../math/quantum-geometry';
import { integratedInformation } from './integrated-information';
import { quantumCoherence } from '../math/quantum-coherence';
import { naturalGradient2x2 } from '../math/quantum-natural-gradient';
import type { Rng } from '../math/rng';

/** Register width — 6 qubits → 64 basis amplitudes: a rich BRAIN view that stays trivially in budget. */
export const QMIND_QUBITS = 6;
/** Circuit depth: rotation + tunable-entanglement layers applied per beat. */
export const QMIND_LAYERS = 3;
const DIM = 1 << QMIND_QUBITS; // 64
const TAU = Math.PI * 2;

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

/** A single qubit's Bloch vector plus its length (purity: 1 = separable pure, <1 = entangled). */
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
 * cognition knobs that most shape the quantum state — superposition and entanglement — so the mind
 * can *feel the curvature of its own thought-space*: how fast |ψ⟩ moves as those drives vary.
 */
export interface QGeometry {
  /** Row-major 2×2 Fubini–Study metric g_μν over (superposition, entanglement), 0..~. */
  metric: [number, number, number, number];
  /** det(g) — the geometric "volume": how much the 2-knob state-space curves (0 = flat/degenerate). */
  curvature: number;
  /** tr(g) — the geometric "speed": total sensitivity of |ψ⟩ to the two drives. */
  scalar: number;
  /** Berry curvature Ω₀₁ = Im Q₀₁ — the geometric phase twisting between the two knobs. */
  berry: number;
}

/**
 * V93: the QUANTUM NATURAL GRADIENT self-optimization readout — how the apex mind is DESCENDING its own
 * Fubini–Study geometry (the QGT it already computes) to make its INTENDED thought more probable, in the
 * spirit of Stokes, Izaac, Killoran & Carleo, "Quantum Natural Gradient", _Quantum_ 4, 269 (2020). The mind
 * does not merely feel the curvature of its thought-space — it steps down it.
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
  /** Normalized Shannon entropy of the Born distribution, 0..1 (1 = uniform superposition). */
  entropy: number;
  /** Mean reduced-state purity deficit (1 − |r|²) across qubits, 0..1 (1 = maximally entangled). */
  entanglement: number;
  /** Mean equatorial Bloch magnitude √(x²+y²) across qubits, 0..1 (live superposition strength). */
  coherence: number;
  /** Index of the last non-destructive Born sample (the "collapsed" thought this beat). */
  sampled: number;
  /** {@link sampled} as a qubit bitstring (qubit n−1 … qubit 0). */
  sampledBits: string;
  /** Quantum-geometric readout (Fubini–Study metric + curvature) — ported from the QGTL study. */
  geometry: QGeometry;
  /** V1.1: the INTENDED-thought basis index that goal-directed amplitude amplification (Grover) marks. */
  amplified: number;
  /** {@link amplified} as a qubit bitstring. */
  amplifiedBits: string;
  /** Grover oracle+diffuse rounds run this beat (0..2) — the mind's quantum-search focus. */
  amplifyRounds: number;
  /** Born probability of the intended thought AFTER amplification (the search gain, 0..1). */
  amplifiedProb: number;
  /** V1.1: REAL integrated information Φ of the register — min-cut entanglement at the MIP (IIT), 0..1.
   *  Unlike a participation-ratio surrogate, this is genuine irreducibility: a localized correlation that
   *  a balanced cut can keep whole reads Φ=0; only globally bound states (e.g. GHZ) score high. */
  phi: number;
  /** The minimum-information-partition mask Φ is measured at, as a qubit bitstring. */
  phiMip: string;
  /** V1.1: l1-norm quantum coherence of the register (resource theory of coherence), normalized 0..1. */
  coherenceL1: number;
  /** V1.1: relative-entropy quantum coherence (resource theory of coherence), normalized 0..1. */
  coherenceRel: number;
  /** V93: quantum-natural-gradient self-optimization — the mind descending its own thought-geometry. */
  selfOpt: SelfOptReadout;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Clamp to ±m — the symmetric bound on the self-optimization bias. */
const clampPM = (v: number, m: number): number => (v < -m ? -m : v > m ? m : v);

/**
 * The quantum mind. Construct ONCE per {@link SuperMind} with a dedicated seeded {@link Rng} (its own
 * stream, so quantum sampling never perturbs sim determinism). Call {@link evolve} each cognitive beat
 * with the mind's live signals; call {@link snapshot} at the UI cadence to read the BRAIN view.
 */
export class QuantumMind {
  private readonly reg = new QuantumRegister(QMIND_QUBITS);
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
  private dLatent: ArrayLike<number> = [0];
  private dL = 1;
  private gateCount = 0;
  private sampled = 0;
  /** V1.1: the basis index the goal-directed amplitude amplification marks + amplifies before collapse. */
  private amplifyTarget = 0;
  /** V1.1: how many Grover oracle+diffuse rounds ran this beat (0..2, gated by focus). */
  private amplifyRounds = 0;
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
    this.dLatent = latent;
    this.dL = L;
    this.gateCount = this.applyCircuit(sup, ent, ftl, mut, latent, L);
    // V1.1 — GOAL-DIRECTED AMPLITUDE AMPLIFICATION (Grover): bias the thought-collapse toward the mind's
    // INTENDED thought — the basis state whose bits are the signs of the world-model latent (the pattern
    // the mind is reaching for). The 'qudit-compute' aspect sets the focus: 0 rounds leaves the open
    // superposition, more rounds pull the collapse toward intent — quantum SEARCH, not just rotate-collapse.
    // Bounded to 2 rounds so the amplitude never over-rotates past the target. Deterministic + unitary.
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
    // intended thought, nudge the persisted (sup,ent) bias for the NEXT beat, then RESTORE the evolved +
    // amplified state so the Born sample below is exactly the pre-self-opt state. Allocation-free; no RNG.
    this.selfOptimizeStep(target, sup, ent, ftl, mut, latent, L);
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
  ): number {
    const reg = this.reg;
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
      // CRY(β) = RY(t,−β/2) · CX(c,t) · RY(t,+β/2): β=0 ⇒ identity (separable), β=π ⇒ full CNOT.
      const beta = ent * Math.PI * (0.55 + 0.45 * Math.sin(layer + 1));
      if (beta > 1e-3) {
        for (let k = 0; k < QMIND_QUBITS; k++) {
          const t = (k + 1) % QMIND_QUBITS;
          reg.apply('ry', t, undefined, -beta / 2);
          reg.apply('cx', t, k); // control = k, target = t
          reg.apply('ry', t, undefined, beta / 2);
          gates += 3;
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
    this.applyCircuit(sup, ent, ftl, mut, latent, L);
    this.reg.amplitudesInto(outRe, outIm);
  }

  /**
   * One QUANTUM NATURAL GRADIENT step (Stokes et al., _Quantum_ 4, 269, 2020). Finite-difference ∇P(target)
   * over the two cognition knobs (superposition, entanglement), build the 2×2 Fubini–Study metric from the
   * SAME shifted states, precondition the gradient by the (Tikhonov-regularised) inverse metric, and nudge
   * the persisted (sup,ent) bias up that natural gradient so the mind's INTENDED thought grows more probable
   * over beats. Reads its own quantum geometry, writes its own quantum drives — the substrate optimizes
   * itself. Allocation-free (preallocated buffers); deterministic (no RNG); RESTORES the evolved + amplified
   * register on exit so the caller's Born sample is untouched.
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
    // RESTORE the evolved + amplified register so the caller's Born sample is the pre-self-opt state.
    this.applyCircuit(sup, ent, ftl, mut, latent, L);
    for (let it = 0; it < this.amplifyRounds; it++) {
      this.reg.phaseFlip(this.amplifyTarget);
      this.reg.diffuse();
    }
  }

  /**
   * **Quantum Geometric Tensor — the mind feeling the curvature of its own thought-space.** Delegates to
   * the canonical ported QGTL primitive {@link quantumGeometricTensor} (`src/math/quantum-geometry.ts`),
   * restricted to the two cognition drives θ = (superposition, entanglement): it central-differences
   * |ψ(θ)⟩ over the parameterised circuit (DETERMINISTIC — pure 64-amplitude statevector algebra, no
   * RNG) and yields the 2×2 Fubini–Study metric g_μν = Re Q_μν, its det (curvature), its trace (scalar),
   * and the Berry curvature F₀₁ = −2·Im Q₀₁. Runs at UI cadence; it re-applies the circuit a handful of
   * times, LEAVING the register perturbed — the next {@link evolve} resets it from |0…0⟩, so the seeded
   * beat stream is never corrupted. Ported from the Tsotchke QGTL / Moonlab `qgt.c` study (MIT — see the
   * file header + NOTICE.md).
   */
  geometricMetric(): QGeometry {
    const build = (p: readonly number[], outRe: Float64Array, outIm: Float64Array): void => {
      this.applyCircuit(p[0] ?? 0, p[1] ?? 0, this.dFtl, this.dMut, this.dLatent, this.dL);
      this.reg.amplitudesInto(outRe, outIm);
    };
    const g = quantumGeometricTensor([this.dSup, this.dEnt], build, DIM, 0.01);
    const g00 = g.metric[0]?.[0] ?? 0;
    const g11 = g.metric[1]?.[1] ?? 0;
    const g01 = g.metric[0]?.[1] ?? 0;
    const berry = -2 * (g.berry[0]?.[1] ?? 0); // F₀₁ = −2·Im Q₀₁ (the project's Berry sign convention)
    const curvature = g00 * g11 - g01 * g01; // det of the symmetric 2×2 metric
    return { metric: [g00, g01, g01, g11], curvature, scalar: g.volume, berry };
  }

  /** Index of the most recent non-destructive Born sample (the collapsed thought). */
  get lastSample(): number {
    return this.sampled;
  }

  /**
   * Build the read-only BRAIN snapshot from the live statevector: Born probabilities + phases, the
   * per-qubit Bloch vectors and P(|1⟩), the normalized entropy, the mean entanglement (purity
   * deficit) and equatorial coherence, and the last sampled basis state. Allocates the public arrays
   * (UI cadence only). O(qubits · 2ⁿ).
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
    // Read entropy from the post-evolve state BEFORE the QGT re-applies (and perturbs) the circuit.
    const entropy = reg.entropy();
    // V1.1: REAL integrated information Φ (IIT min-cut entanglement) + resource-theory coherence, read
    // from the live amplitudes captured above (this.bufRe/Im) — BEFORE the QGT perturbs the register.
    const info = integratedInformation(this.bufRe, this.bufIm, QMIND_QUBITS);
    const coh = quantumCoherence(this.bufRe, this.bufIm);
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
      selfOpt: { ...this.so },
    };
  }
}
