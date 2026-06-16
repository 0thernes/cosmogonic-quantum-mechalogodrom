/**
 * THE BERRY PHASE (V98) — Super Creature 1.1's HOLONOMIC memory. As the apex mind's two dominant cognition
 * knobs (superposition, entanglement) trace a path each beat, its wavefunction accumulates a GEOMETRIC
 * (Berry) phase — the line/area integral of the quantum-geometric tensor's **Berry curvature** Ω (the
 * imaginary part of the QGT, from the {@link ../math/quantum-geometry} QGTL port, which until now was only
 * summarised as a magnitude). Unlike the dynamical phase, the geometric phase depends ONLY on the PATH the
 * state traces over its projective Hilbert manifold — not on the speed, nor on the Hamiltonian. A closed
 * loop returns a gauge-invariant holonomy; an open path accrues the surface integral ∮∮ Ω dA of the swept
 * area. It is therefore a *topological memory of the cognitive cycle*: two minds that visited the same
 * thoughts in the same order carry the same Berry phase, however fast or slow they moved.
 *
 * References: Berry (1984); Provost & Vallée (1980); Fukui–Hatsugai–Suzuki (2005). Deterministic (pure
 * arithmetic, NaN-guarded), allocation-free in steady state, pure leaf: no DOM, no THREE.
 */

const TWO_PI = Math.PI * 2;
// NaN-safe clamp (NaN > 0 is false ⇒ non-finite collapses to 0) — reusable-leaf boundary.
const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);
const finite = (v: number): number => (Number.isFinite(v) ? v : 0);

/** Read-only telemetry of the holonomic memory for the BRAIN / SuperCreature boards (UI cadence). */
export interface BerryPhaseSnapshot {
  /** The accumulated geometric phase wrapped to (−π, π]. */
  phase: number;
  /** Net signed number of full 2π holonomies completed — the winding of the cognitive cycle. */
  winding: number;
  /** The total UNWRAPPED accumulated geometric phase (radians; grows without bound, signed). */
  total: number;
  /** The Berry curvature Ω used this beat (the imaginary QGT off-diagonal). */
  curvature: number;
  /** 0..1 — the rate of geometric-phase accrual this beat (|dφ|), how fast the mind traverses its manifold. */
  flux: number;
}

/**
 * The geometric-phase accumulator. Construct ONCE per mind (no seed — pure deterministic integration);
 * call {@link accumulate} each beat the QGT is available with the Berry curvature Ω and the two drive
 * coordinates, then read {@link holonomy} / {@link snapshot}.
 */
export class BerryPhase {
  private total = 0; // unwrapped accumulated geometric phase
  private prevX = 0;
  private prevY = 0;
  private curvature = 0;
  private flux = 0;
  private primed = false;

  /**
   * Accrue the geometric phase from this beat's Berry curvature Ω and the (x, y) drive coordinates on the
   * 2-parameter cognition plane. dφ = Ω · dA, where dA = ½(x_prev·y − x·y_prev) is the signed area swept by
   * the radius vector from the origin (the discrete surface integral of the Berry curvature). Returns the
   * total unwrapped phase. Allocation-free; NaN-guarded.
   */
  accumulate(berryCurvature: number, x: number, y: number): number {
    const cx = finite(x);
    const cy = finite(y);
    const om = finite(berryCurvature);
    this.curvature = om;
    if (!this.primed) {
      this.prevX = cx;
      this.prevY = cy;
      this.primed = true;
      this.flux = 0;
      return this.total;
    }
    const dA = 0.5 * (this.prevX * cy - cx * this.prevY); // signed swept area
    const dphi = om * dA;
    this.flux = dphi < 0 ? -dphi : dphi;
    this.total += dphi;
    this.prevX = cx;
    this.prevY = cy;
    return this.total;
  }

  /** The total unwrapped geometric phase (radians, signed). */
  get holonomy(): number {
    return this.total;
  }

  /** The wrapped geometric phase in (−π, π]. */
  get phase(): number {
    return this.total - Math.round(this.total / TWO_PI) * TWO_PI;
  }

  snapshot(): BerryPhaseSnapshot {
    const winding = Math.round(this.total / TWO_PI);
    return {
      phase: this.total - winding * TWO_PI,
      winding,
      total: this.total,
      curvature: this.curvature,
      flux: clamp01(this.flux),
    };
  }
}
