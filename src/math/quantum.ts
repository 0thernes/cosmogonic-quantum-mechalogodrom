/**
 * Minimal statevector quantum register (CONTRACTS V2 — Quantum Wildbeyond).
 *
 * Pure-TS backend: the 2^n complex amplitudes live in a Float64Array re/im pair and every gate
 * is applied in place — no npm simulator, no per-call allocation (decision context: ADR 0005).
 * With the n ≤ 8 cap the worst case is 256 amplitudes, so every O(2^n) operation below is
 * sub-microsecond on commodity hardware (see bench/quantum.bench.ts).
 *
 * Basis convention: qubit `k` is bit `k` (LSB = qubit 0) of the basis-state index, so for n = 2
 * the state |q1 q0⟩ = |01⟩ is index 1 and |10⟩ is index 2.
 *
 * Leaf module: imports nothing of the type hub at runtime (contract ground rule 4).
 */
import type { Rng } from './rng';

/** Names of the supported gates (single-qubit, parameterized rotations, and two-qubit). */
export type GateName =
  | 'h'
  | 'x'
  | 'y'
  | 'z'
  | 's'
  | 't'
  | 'rx'
  | 'ry'
  | 'rz'
  | 'cx'
  | 'cz'
  | 'swap';

/** Hard cap on register width — 2^8 = 256 amplitudes keeps every op trivially in frame budget. */
const MAX_QUBITS = 8;
/** 1/√2 — Hadamard matrix entry and T-gate phase component. */
const SQRT1_2 = Math.SQRT1_2;
/** Probabilities below this are treated as exactly 0 in the entropy sum (p·log2 p → 0). */
const ENTROPY_EPS = 1e-15;

/**
 * Statevector quantum register over 1..8 qubits with allocation-free gate application,
 * Born-rule probabilities into a reused buffer, normalized Shannon entropy, and seeded
 * probabilistic measurement. All mutating operations are O(2^n) where n = `qubits`.
 */
export class QuantumRegister {
  /** Register width in qubits (1..8, fixed at construction). */
  readonly qubits: number;
  /** Statevector dimension 2^qubits. */
  private readonly dim: number;
  /** Real parts of the 2^n amplitudes. */
  private readonly re: Float64Array;
  /** Imaginary parts of the 2^n amplitudes. */
  private readonly im: Float64Array;
  /** Shared Born-rule probability buffer returned by {@link probabilities} (reused per call). */
  private readonly probs: Float64Array;

  /**
   * Allocates the statevector and initializes it to |0...0⟩.
   * @throws RangeError when `qubits` is not an integer in [1, 8].
   */
  constructor(qubits: number) {
    if (!Number.isInteger(qubits) || qubits < 1 || qubits > MAX_QUBITS) {
      throw new RangeError(
        `QuantumRegister: qubits must be an integer in [1, ${MAX_QUBITS}], got ${qubits}`,
      );
    }
    this.qubits = qubits;
    this.dim = 1 << qubits;
    this.re = new Float64Array(this.dim);
    this.im = new Float64Array(this.dim);
    this.probs = new Float64Array(this.dim);
    this.re[0] = 1;
  }

  /**
   * Applies one gate in place. `control` is required (and must differ from `target`) for
   * 'cx'/'cz'/'swap' (for 'swap' it names the second swapped qubit); `theta` (radians, finite)
   * is required for 'rx'/'ry'/'rz'. Arguments a gate does not use are ignored.
   * O(2^n); allocation-free.
   * @throws RangeError / TypeError on out-of-range qubits or missing parameters.
   */
  apply(gate: GateName, target: number, control?: number, theta?: number): void {
    this.checkQubit(target, 'target');
    switch (gate) {
      case 'h':
        this.apply1(target, SQRT1_2, 0, SQRT1_2, 0, SQRT1_2, 0, -SQRT1_2, 0);
        return;
      case 'x':
        this.apply1(target, 0, 0, 1, 0, 1, 0, 0, 0);
        return;
      case 'y':
        // [[0, -i], [i, 0]]
        this.apply1(target, 0, 0, 0, -1, 0, 1, 0, 0);
        return;
      case 'z':
        this.apply1(target, 1, 0, 0, 0, 0, 0, -1, 0);
        return;
      case 's':
        // diag(1, i)
        this.apply1(target, 1, 0, 0, 0, 0, 0, 0, 1);
        return;
      case 't':
        // diag(1, e^{iπ/4})
        this.apply1(target, 1, 0, 0, 0, 0, 0, SQRT1_2, SQRT1_2);
        return;
      case 'rx': {
        const th = checkTheta(theta, 'rx');
        const c = Math.cos(th / 2);
        const s = Math.sin(th / 2);
        // [[cos, -i·sin], [-i·sin, cos]]
        this.apply1(target, c, 0, 0, -s, 0, -s, c, 0);
        return;
      }
      case 'ry': {
        const th = checkTheta(theta, 'ry');
        const c = Math.cos(th / 2);
        const s = Math.sin(th / 2);
        // [[cos, -sin], [sin, cos]] (real)
        this.apply1(target, c, 0, -s, 0, s, 0, c, 0);
        return;
      }
      case 'rz': {
        const th = checkTheta(theta, 'rz');
        const c = Math.cos(th / 2);
        const s = Math.sin(th / 2);
        // diag(e^{-iθ/2}, e^{iθ/2})
        this.apply1(target, c, -s, 0, 0, 0, 0, c, s);
        return;
      }
      case 'cx': {
        const ctl = this.checkControl(target, control, 'cx');
        const tm = 1 << target;
        const cm = 1 << ctl;
        const { re, im, dim } = this;
        for (let i = 0; i < dim; i++) {
          if ((i & cm) !== 0 && (i & tm) === 0) {
            const j = i | tm;
            const r = re[i] ?? 0;
            const m = im[i] ?? 0;
            re[i] = re[j] ?? 0;
            im[i] = im[j] ?? 0;
            re[j] = r;
            im[j] = m;
          }
        }
        return;
      }
      case 'cz': {
        const ctl = this.checkControl(target, control, 'cz');
        const both = (1 << target) | (1 << ctl);
        const { re, im, dim } = this;
        for (let i = 0; i < dim; i++) {
          if ((i & both) === both) {
            re[i] = -(re[i] ?? 0);
            im[i] = -(im[i] ?? 0);
          }
        }
        return;
      }
      case 'swap': {
        const other = this.checkControl(target, control, 'swap');
        const p = 1 << target;
        const q = 1 << other;
        const { re, im, dim } = this;
        for (let i = 0; i < dim; i++) {
          // Visit each unordered pair once: i has the target bit set and the other bit clear.
          if ((i & p) !== 0 && (i & q) === 0) {
            const j = i ^ p ^ q;
            const r = re[i] ?? 0;
            const m = im[i] ?? 0;
            re[i] = re[j] ?? 0;
            im[i] = im[j] ?? 0;
            re[j] = r;
            im[j] = m;
          }
        }
        return;
      }
    }
  }

  /**
   * Born-rule probabilities |amp_i|² written into a REUSED Float64Array — the returned buffer
   * is valid only until the next probabilities() call on this register. O(2^n); allocation-free.
   */
  probabilities(): Float64Array {
    const { re, im, dim, probs } = this;
    for (let i = 0; i < dim; i++) {
      const r = re[i] ?? 0;
      const m = im[i] ?? 0;
      probs[i] = r * r + m * m;
    }
    return probs;
  }

  /**
   * Normalized Shannon entropy of the Born-rule distribution: H(p)/n ∈ [0, 1] where the maximum
   * n bits occurs at the uniform superposition. Computed directly from the amplitudes — does NOT
   * touch the shared {@link probabilities} buffer. O(2^n); allocation-free.
   */
  entropy(): number {
    const { re, im, dim } = this;
    let h = 0;
    for (let i = 0; i < dim; i++) {
      const r = re[i] ?? 0;
      const m = im[i] ?? 0;
      const p = r * r + m * m;
      if (p > ENTROPY_EPS) h -= p * Math.log2(p);
    }
    const norm = h / this.qubits;
    // Clamp the float lattice: rounding can land epsilon outside [0, 1].
    return norm < 0 ? 0 : norm > 1 ? 1 : norm;
  }

  /**
   * Probabilistic collapse: draws once from `rng`, picks a basis state by cumulative Born-rule
   * probability, resets the register to that pure state |i⟩, and returns its index. Same rng
   * stream position ⇒ same outcome (determinism, contract rule 7). O(2^n); allocation-free.
   */
  measure(rng: Rng): number {
    const { re, im, dim } = this;
    const r = rng();
    // On the floating-point shortfall (Σp = 1 − ε ≤ r) the cumulative loop falls through; the
    // fallback then collapses to the MOST PROBABLE basis state rather than the last index,
    // which could carry near-zero amplitude (a measurement must never land on a ~0-probability
    // outcome). Tracked in the same O(2^n) pass — still allocation-free.
    let chosen = 0;
    let bestP = -1;
    let acc = 0;
    let picked = -1;
    for (let i = 0; i < dim; i++) {
      const rr = re[i] ?? 0;
      const ii = im[i] ?? 0;
      const p = rr * rr + ii * ii;
      if (p > bestP) {
        bestP = p;
        chosen = i;
      }
      acc += p;
      if (picked < 0 && r < acc) picked = i;
    }
    if (picked >= 0) chosen = picked;
    re.fill(0);
    im.fill(0);
    re[chosen] = 1;
    return chosen;
  }

  /** Resets the register to |0...0⟩. O(2^n). */
  reset(): void {
    this.re.fill(0);
    this.im.fill(0);
    this.re[0] = 1;
  }

  /**
   * Applies the 2×2 complex matrix [[a, b], [c, d]] (split into re/im scalars) to the `target`
   * qubit across all 2^(n-1) amplitude pairs. O(2^n); allocation-free.
   */
  private apply1(
    target: number,
    ar: number,
    ai: number,
    br: number,
    bi: number,
    cr: number,
    ci: number,
    dr: number,
    di: number,
  ): void {
    const m = 1 << target;
    const { re, im, dim } = this;
    const stride = m << 1;
    for (let base = 0; base < dim; base += stride) {
      for (let off = 0; off < m; off++) {
        const i0 = base + off;
        const i1 = i0 + m;
        const x0r = re[i0] ?? 0;
        const x0i = im[i0] ?? 0;
        const x1r = re[i1] ?? 0;
        const x1i = im[i1] ?? 0;
        re[i0] = ar * x0r - ai * x0i + br * x1r - bi * x1i;
        im[i0] = ar * x0i + ai * x0r + br * x1i + bi * x1r;
        re[i1] = cr * x0r - ci * x0i + dr * x1r - di * x1i;
        im[i1] = cr * x0i + ci * x0r + dr * x1i + di * x1r;
      }
    }
  }

  /** Validates one qubit index. O(1). @throws RangeError when out of [0, qubits). */
  private checkQubit(q: number, role: string): void {
    if (!Number.isInteger(q) || q < 0 || q >= this.qubits) {
      throw new RangeError(
        `QuantumRegister: ${role} must be an integer in [0, ${this.qubits}), got ${q}`,
      );
    }
  }

  /**
   * Validates the second qubit of a two-qubit gate. O(1).
   * @throws TypeError when missing; RangeError when out of range or equal to `target`.
   */
  private checkControl(target: number, control: number | undefined, gate: string): number {
    if (control === undefined) {
      throw new TypeError(`QuantumRegister: '${gate}' requires a control qubit`);
    }
    this.checkQubit(control, 'control');
    if (control === target) {
      throw new RangeError(
        `QuantumRegister: '${gate}' control and target must differ, both ${target}`,
      );
    }
    return control;
  }
}

/**
 * Validates a rotation angle. O(1).
 * @throws TypeError when `theta` is missing or non-finite.
 */
function checkTheta(theta: number | undefined, gate: string): number {
  if (theta === undefined || !Number.isFinite(theta)) {
    throw new TypeError(`QuantumRegister: '${gate}' requires a finite theta, got ${theta}`);
  }
  return theta;
}
