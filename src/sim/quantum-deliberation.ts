/**
 * QUANTUM DELIBERATION (V98) — Super Creature 1.1's OPEN-quantum-system decision substrate: a Lindblad /
 * GKSL master equation that models how the mind's COHERENT superposition of candidate actions DECOHERES into
 * a committed classical decision. Where the apex register (`super-qubits.ts`) is a CLOSED, unitary statevector
 * and `quantum-coherence.ts` MEASURES the coherence resource of a frozen state, this faculty evolves the
 * DYNAMICS of decoherence: a two-level system coupled to an environment, losing coherence over time (T₂
 * dephasing) and relaxing toward a ground decision (T₁), per the Gorini–Kossakowski–Sudarshan–Lindblad
 * equation — the canonical generator of completely-positive trace-preserving open-system evolution (Lindblad,
 * "On the generators of quantum dynamical semigroups", Commun. Math. Phys. 1976; Gorini, Kossakowski &
 * Sudarshan, J. Math. Phys. 1976; Breuer & Petruccione, *The Theory of Open Quantum Systems*, 2002).
 *
 * dρ/dt = −i[H, ρ] + Σ_k γ_k (L_k ρ L_k† − ½{L_k†L_k, ρ}). For one qubit this is exactly the optical-Bloch
 * equations on the Bloch vector b = (x, y, z), ρ = ½(I + x·σ_x + y·σ_y + z·σ_z):
 *   ẋ = Δ·y − Γ₂·x,   ẏ = Ω·z − Δ·x − Γ₂·y,   ż = −Ω·y − Γ₁·(z − 1),   Γ₂ = γ_φ + Γ₁/2,
 * with a coherent drive H = ½(Ω·σ_x + Δ·σ_z) — Ω the Rabi DELIBERATION drive (keeps options in
 * superposition), Δ a preference detuning (leans toward a pole) — a pure-dephasing channel γ_φ that shrinks
 * the off-diagonal coherence (the environment — the mind's own AROUSAL + quantum noise — collapsing the
 * superposition), and amplitude damping Γ₁ relaxing toward the ground "rest" decision. COHERENCE
 * √(x²+y²) = the mind still deliberating (undecided); DECISIVENESS 1−√(x²+y²) = it has decohered into a
 * classical commitment. A real model of deliberation→commitment in genuine open-system physics.
 *
 * Integrated with a fixed midpoint (RK2) substep; b stays inside the Bloch ball (purity ≤ 1) and the trace
 * is conserved by construction (Tr ρ = 1 ⇔ the b-parametrisation). Fully deterministic (pure arithmetic — no
 * unseeded randomness, no wall-clock; it needs no seed) and allocation-free. Pure leaf: no DOM, no THREE.
 */

/** Midpoint-integration substeps per cognitive beat (stability of the stiff dephasing term). */
const DELIB_SUBSTEPS = 8;
/** Total Bloch-evolution time advanced per beat (substep dt = this / DELIB_SUBSTEPS). */
const DELIB_DT = 1.0;
/** Max Rabi drive Ω (deliberation oscillation) at full drive input. */
const OMEGA_MAX = 2.4;
/** Max preference detuning |Δ| at full bias input. */
const DELTA_MAX = 1.6;
/** Baseline dephasing γ_φ — a small always-on decoherence (no decision deliberates forever). */
const GAMMA_PHI_BASE = 0.04;
/** How strongly the environment input (arousal + quantum noise) raises the dephasing rate. */
const GAMMA_PHI_GAIN = 1.6;
/** Amplitude-damping Γ₁ — slow relaxation toward the ground "rest" decision. */
const GAMMA1_DEFAULT = 0.05;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp11 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

/** Optional construction overrides (defaults are the module constants). */
export interface DeliberationConfig {
  /** Amplitude-damping rate Γ₁ (≥ 0). Default 0.05. Set 0 for a purely dephasing / unitary test. */
  gamma1?: number;
  /** Always-on baseline dephasing γ_φ floor (≥ 0). Default 0.04. Set 0 for a perfectly closed system. */
  gammaPhiBase?: number;
  /** Substeps per beat. Default {@link DELIB_SUBSTEPS}. */
  substeps?: number;
  /** Evolution time per beat. Default {@link DELIB_DT}. */
  dt?: number;
}

/** Read-only telemetry of the open-system deliberation for the BRAIN / SuperCreature boards (UI cadence). */
export interface DeliberationSnapshot {
  /** Bloch vector of the deliberation qubit. */
  bloch: { x: number; y: number; z: number };
  /** Coherence √(x²+y²) ∈ [0,1] — how superposed/undecided the deliberation is (the T₂ resource). */
  coherence: number;
  /** Decisiveness 1 − √(x²+y²) ∈ [0,1] — how far it has decohered into a classical commitment. */
  decisiveness: number;
  /** Purity Tr(ρ²) = ½(1 + |b|²) ∈ [0.5,1] — 1 = pure/coherent, 0.5 = maximally mixed (fully collapsed). */
  purity: number;
  /** Excited-state population ρ₁₁ = (1 − z)/2 ∈ [0,1] — the "act" pole vs the ground "rest" pole. */
  excited: number;
  /** The Rabi drive Ω applied this beat (the deliberation tension). */
  omega: number;
  /** The total transverse dephasing rate Γ₂ applied this beat (the environmental collapse pressure). */
  dephasing: number;
  /** True when decisiveness has crossed 0.9 — a (near-)committed, decohered decision this beat. */
  committed: boolean;
}

/**
 * The open-system deliberation qubit. Construct ONCE (no seed needed — it is a deterministic master
 * equation); call {@link step} each beat with the deliberation drive, preference bias, and environmental
 * dephasing, read {@link coherence} / {@link decisiveness} to modulate exploration vs commitment, and
 * {@link snapshot} at UI cadence.
 */
export class QuantumDeliberation {
  private x = 1; // start pure on the equator: a maximally COHERENT (undecided) superposition, |b| = 1
  private y = 0;
  private z = 0;
  private readonly gamma1: number;
  private readonly gammaPhiBase: number;
  private readonly substeps: number;
  private readonly dt: number;
  private omegaApplied = 0;
  private gamma2Applied = 0;

  constructor(config: DeliberationConfig = {}) {
    const g1 = config.gamma1 ?? GAMMA1_DEFAULT;
    this.gamma1 = g1 >= 0 ? g1 : GAMMA1_DEFAULT;
    const gpb = config.gammaPhiBase ?? GAMMA_PHI_BASE;
    this.gammaPhiBase = gpb >= 0 ? gpb : GAMMA_PHI_BASE;
    this.substeps = Math.max(1, Math.floor(config.substeps ?? DELIB_SUBSTEPS));
    this.dt = config.dt ?? DELIB_DT;
  }

  /**
   * Advance the open-system deliberation one beat. `drive` (0..1) sets the Rabi Ω (deliberation tension that
   * sustains the superposition), `bias` (−1..1) sets the preference detuning Δ, `dephase` (0..1) sets the
   * environmental collapse pressure (arousal + quantum noise). Integrates the optical-Bloch / Lindblad
   * equations with a fixed midpoint substep. O(substeps); allocation-free.
   */
  step(drive: number, bias: number, dephase: number): void {
    const omega = clamp01(drive) * OMEGA_MAX;
    const delta = clamp11(bias) * DELTA_MAX;
    const gPhi = this.gammaPhiBase + clamp01(dephase) * GAMMA_PHI_GAIN;
    const g1 = this.gamma1;
    const gamma2 = gPhi + g1 / 2; // transverse (T₂) rate
    // NOTE: earlier revisions injected cosmetic "Ralph 10x" perturbations into `delta` here
    // (an AD-gradient nudge ×0.02, a GWT-broadcast nudge ×0.05, a Moonlab tensor nudge ×0.01).
    // They added noise to an otherwise-exact optical-Bloch/Lindblad model without physical
    // meaning, so they have been removed — the detuning Δ is now exactly the bias mapping above.
    this.omegaApplied = omega;
    this.gamma2Applied = gamma2;
    const h = this.dt / this.substeps;
    let x = this.x;
    let y = this.y;
    let z = this.z;
    // Bloch derivatives of the qubit Lindblad equation (drive Ω along x, detuning Δ along z).
    const dx = (px: number, py: number): number => delta * py - gamma2 * px;
    const dy = (px: number, py: number, pz: number): number =>
      omega * pz - delta * px - gamma2 * py;
    const dz = (py: number, pz: number): number => -omega * py - g1 * (pz - 1);
    for (let s = 0; s < this.substeps; s++) {
      // Midpoint (RK2): evaluate the slope at the half-step, then advance with it.
      const k1x = dx(x, y);
      const k1y = dy(x, y, z);
      const k1z = dz(y, z);
      const mx = x + 0.5 * h * k1x;
      const my = y + 0.5 * h * k1y;
      const mz = z + 0.5 * h * k1z;
      x += h * dx(mx, my);
      y += h * dy(mx, my, mz);
      z += h * dz(my, mz);
    }
    // Keep the state physical: clamp z to [−1,1] and project the Bloch vector back into the unit ball so
    // integration error can never report purity > 1 (a valid ρ has |b| ≤ 1).
    if (z > 1) z = 1;
    else if (z < -1) z = -1;
    const r2 = x * x + y * y + z * z;
    if (r2 > 1) {
      const inv = 1 / Math.sqrt(r2);
      x *= inv;
      y *= inv;
      z *= inv;
    }
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /** Coherence √(x²+y²) ∈ [0,1] — how undecided/superposed the deliberation is. */
  get coherence(): number {
    return clamp01(Math.sqrt(this.x * this.x + this.y * this.y));
  }

  /** Decisiveness 1 − coherence ∈ [0,1] — how far the superposition has decohered into a commitment. */
  get decisiveness(): number {
    return clamp01(1 - Math.sqrt(this.x * this.x + this.y * this.y));
  }

  /** Build the read-only board snapshot. O(1); allocates the small public object (UI cadence only). */
  snapshot(): DeliberationSnapshot {
    const { x, y, z } = this;
    const trans = Math.sqrt(x * x + y * y);
    const r2 = x * x + y * y + z * z;
    return {
      bloch: { x, y, z },
      coherence: clamp01(trans),
      decisiveness: clamp01(1 - trans),
      purity: Math.min(1, Math.max(0.5, 0.5 * (1 + r2))),
      excited: clamp01((1 - z) / 2),
      omega: this.omegaApplied,
      dephasing: this.gamma2Applied,
      committed: 1 - trans > 0.9,
    };
  }
}
