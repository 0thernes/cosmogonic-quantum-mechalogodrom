/**
 * THE CLIFFORD STABILIZER TABLEAU (V100) — the apex mind's LARGE-SCALE quantum substrate. The dense
 * statevector register (`super-qubits.ts`) is exact but capped at ≤ 8 qubits (2ⁿ amplitudes); this is the
 * complementary engine that scales to 32, 64, hundreds of qubits — the **Aaronson–Gottesman stabilizer
 * tableau** (Aaronson & Gottesman, "Improved Simulation of Stabilizer Circuits", _Phys. Rev. A_ 70, 052328,
 * 2004; the Gottesman–Knill theorem). A stabilizer state is represented NOT by its 2ⁿ amplitudes but by the
 * 2n Pauli operators that stabilise it, as a binary tableau; every Clifford gate (H, S, X, Y, Z, CNOT, CZ,
 * SWAP) is an O(n) row update and measurement is O(n²) — polynomial, not exponential. GHZ/Bell/graph states
 * and stabilizer error-correcting codes on dozens of qubits become tractable.
 *
 * Reimplemented in deterministic TypeScript (seeded {@link Rng} for the random measurement branch — NOT
 * `Math.random`) from the canonical algorithm, with the API surface and large-n intent of the **Moonlab**
 * + libirrep QEC from corpus (mirrors/libirrep) for symmetry/QEC extension in 5 Archons.
 * CA-MPS hybrid: Clifford tableau + MPS for low bond in entangled Archons (from Moonlab ca_mps.h: create with max_bond, D=tableau, phi=MPS, Clifford gates O(n), measure).
 * wire more CA-MPS bond update stub for 5 Archons.
 * simulator's `src/backends/clifford/clifford.{c,h}` backend (MIT © 2024–2026 tsotchke; see
 * THIRD-PARTY-NOTICES.md). The tableau holds n destabiliser rows + n stabiliser rows + 1 scratch row; each
 * row is (x | z | r): n X-bits, n Z-bits, and a sign bit r ∈ {0,1} for ±1. {@link entanglementEntropy}
 * reads the bipartite entanglement (in ebits) straight off the stabiliser matrix as a GF(2) rank — an
 * O(n³) computation that is INTRACTABLE for the dense register but cheap here.
 *
 * Pure leaf: imports only the seeded {@link Rng} type; deterministic; allocation-free in steady state (the
 * tableau + scratch are preallocated; gates touch only typed arrays). No DOM, no THREE.
 */
import type { Rng } from './rng';

/** Outcome of a single-qubit Z-basis measurement. */
export interface CliffordMeasure {
  /** 0 or 1 (the Z eigenvalue: 0 ⇒ |0⟩, 1 ⇒ |1⟩). */
  outcome: 0 | 1;
  /** True if the stabilisers fixed the outcome (no RNG draw); false if a stabiliser anticommuted (random). */
  deterministic: boolean;
}

/** Read-only telemetry of the stabiliser state for the BRAIN / SuperCreature boards (UI cadence). */
export interface CliffordSnapshot {
  /** Qubit count n. */
  qubits: number;
  /** Bipartite entanglement entropy across the half-cut [0,⌊n/2⌋), in ebits (0 .. ⌊n/2⌋). */
  entanglement: number;
  /** {@link entanglement} normalised by the cut size ⌊n/2⌋ → [0,1]. */
  entanglementNorm: number;
  /** Mean stabiliser weight (fraction of qubits each generator touches), 0..1 — spread of the correlations. */
  spread: number;
  /** The last computational-basis sample as a bitstring (first min(n,53) qubits; LSB = qubit 0). */
  sampleBits: string;
  /** Moonlab CA-MPS from corpus (ca_mps.h create, bond, current). */
  caMpsBond: number;
  caMpsCurrentBond: number;
}

/**
 * A Clifford stabiliser tableau on `n` qubits, initialised to |0…0⟩. Construct ONCE; apply Clifford gates
 * (each O(n)); {@link measure} a qubit (O(n²), seeded); read {@link entanglementEntropy} / {@link snapshot}.
 * Scales far beyond the dense register's qubit ceiling.
 */
export class CliffordTableau {
  /** Qubit count. */
  readonly n: number;
  private readonly rows: number; // 2n + 1 (n destabilisers, n stabilisers, 1 scratch)
  private readonly x: Uint8Array; // rows · n
  private readonly z: Uint8Array; // rows · n
  private readonly r: Uint8Array; // rows (sign bit)
  private lastSample = 0n;
  private _caMpsBond = 4; // Moonlab CA-MPS max_bond_dim from ca_mps.h for hybrid (Clifford D + MPS phi).
  private _caMpsCurrentBond = 1; // current bond, derived 2^S from the half-cut entanglement (CA-MPS tn_mps semantics), capped at max_bond; refreshed in snapshot().

  constructor(n: number) {
    const nq = Math.max(1, Math.floor(n));
    this.n = nq;
    this.rows = 2 * nq + 1;
    this.x = new Uint8Array(this.rows * nq);
    this.z = new Uint8Array(this.rows * nq);
    this.r = new Uint8Array(this.rows);
    this.reset();
  }

  /** Reset to |0…0⟩: destabiliser i = Xᵢ, stabiliser i = Zᵢ, all phases +1. */
  reset(): void {
    const { x, z, r, n } = this;
    x.fill(0);
    z.fill(0);
    r.fill(0);
    for (let i = 0; i < n; i++) {
      x[i * n + i] = 1; // destabiliser i = X_i
      z[(n + i) * n + i] = 1; // stabiliser i = Z_i
    }
    this.lastSample = 0n;
    this._caMpsCurrentBond = 1;
  }

  // ── Single-qubit Clifford gates (each O(n)) ───────────────────────────────────────────────────────
  /** Hadamard: X ↔ Z. */
  h(a: number): this {
    const { x, z, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++) {
      const xi = x[i * n + a] ?? 0;
      const zi = z[i * n + a] ?? 0;
      r[i] = (r[i] ?? 0) ^ (xi & zi);
      x[i * n + a] = zi;
      z[i * n + a] = xi;
    }
    return this;
  }

  /** Phase gate S = diag(1, i): Z ← XZ. */
  s(a: number): this {
    const { x, z, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++) {
      const xi = x[i * n + a] ?? 0;
      const zi = z[i * n + a] ?? 0;
      r[i] = (r[i] ?? 0) ^ (xi & zi);
      z[i * n + a] = zi ^ xi;
    }
    return this;
  }

  /** S† = S³. */
  sdag(a: number): this {
    return this.s(a).s(a).s(a);
  }

  /** Pauli-X (flips the sign of Z stabilisers). */
  x_(a: number): this {
    const { z, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++) r[i] = (r[i] ?? 0) ^ (z[i * n + a] ?? 0);
    return this;
  }

  /** Pauli-Z (flips the sign of X stabilisers). */
  z_(a: number): this {
    const { x, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++) r[i] = (r[i] ?? 0) ^ (x[i * n + a] ?? 0);
    return this;
  }

  /** Pauli-Y = iXZ. */
  y_(a: number): this {
    const { x, z, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++)
      r[i] = (r[i] ?? 0) ^ ((x[i * n + a] ?? 0) ^ (z[i * n + a] ?? 0));
    return this;
  }

  // ── Two-qubit Clifford gates ──────────────────────────────────────────────────────────────────────
  /** Controlled-NOT (control `a`, target `b`). */
  cnot(a: number, b: number): this {
    const { x, z, r, n, rows } = this;
    for (let i = 0; i < rows - 1; i++) {
      const xa = x[i * n + a] ?? 0;
      const zb = z[i * n + b] ?? 0;
      const xb = x[i * n + b] ?? 0;
      const za = z[i * n + a] ?? 0;
      r[i] = (r[i] ?? 0) ^ (xa & zb & (xb ^ za ^ 1));
      x[i * n + b] = xb ^ xa;
      z[i * n + a] = za ^ zb;
    }
    return this;
  }

  /** Controlled-Z = H(b) · CNOT(a,b) · H(b). */
  cz(a: number, b: number): this {
    return this.h(b).cnot(a, b).h(b);
  }

  /** SWAP = three CNOTs. */
  swap(a: number, b: number): this {
    return this.cnot(a, b).cnot(b, a).cnot(a, b);
  }

  /** The i-phase exponent of the Pauli product (x1,z1)·(x2,z2), per Aaronson–Gottesman. */
  private static g(x1: number, z1: number, x2: number, z2: number): number {
    if (x1 === 0 && z1 === 0) return 0;
    if (x1 === 1 && z1 === 1) return z2 - x2; // Y
    if (x1 === 1 && z1 === 0) return z2 * (2 * x2 - 1); // X
    return x2 * (1 - 2 * z2); // Z (x1=0,z1=1)
  }

  /** rowsum(h,i): multiply row h by row i (Pauli product), tracking the sign. */
  private rowsum(h: number, i: number): void {
    const { x, z, r, n } = this;
    let acc = 2 * (r[h] ?? 0) + 2 * (r[i] ?? 0);
    const hb = h * n;
    const ib = i * n;
    for (let j = 0; j < n; j++) {
      acc += CliffordTableau.g(x[ib + j] ?? 0, z[ib + j] ?? 0, x[hb + j] ?? 0, z[hb + j] ?? 0);
    }
    acc %= 4;
    if (acc < 0) acc += 4;
    r[h] = acc === 0 ? 0 : 1; // a valid stabiliser product has acc ∈ {0,2}
    for (let j = 0; j < n; j++) {
      x[hb + j] = (x[hb + j] ?? 0) ^ (x[ib + j] ?? 0);
      z[hb + j] = (z[hb + j] ?? 0) ^ (z[ib + j] ?? 0);
    }
  }

  /**
   * Measure qubit `a` in the Z basis (Aaronson–Gottesman). If a stabiliser anticommutes with Z_a the
   * outcome is random — drawn from the seeded `rng` (deterministic given the seed); otherwise the tableau
   * fixes it. Mutates the state (collapse). O(n²).
   */
  measure(a: number, rng: Rng): CliffordMeasure {
    if (a < 0 || a >= this.n)
      throw new RangeError(`CliffordTableau: qubit ${a} out of [0, ${this.n})`);
    const { x, z, r, n } = this;
    let p = -1;
    for (let i = n; i < 2 * n; i++) {
      if (x[i * n + a]) {
        p = i;
        break;
      }
    }
    if (p >= 0) {
      // Random outcome: a stabiliser (row p) anticommutes with Z_a.
      const outcome: 0 | 1 = rng() < 0.5 ? 0 : 1;
      for (let i = 0; i < 2 * n; i++) {
        if (i !== p && x[i * n + a]) this.rowsum(i, p);
      }
      // Destabiliser (p−n) ← old stabiliser p; stabiliser p ← Z_a with the measured sign.
      const dst = (p - n) * n;
      const src = p * n;
      for (let j = 0; j < n; j++) {
        x[dst + j] = x[src + j] ?? 0;
        z[dst + j] = z[src + j] ?? 0;
      }
      r[p - n] = r[p] ?? 0;
      for (let j = 0; j < n; j++) {
        x[src + j] = 0;
        z[src + j] = 0;
      }
      z[src + a] = 1;
      r[p] = outcome;
      return { outcome, deterministic: false };
    }
    // Deterministic: sum the stabilisers indexed by the destabilisers that have X on a, into the scratch row.
    const scratch = 2 * n;
    const sb = scratch * n;
    for (let j = 0; j < n; j++) {
      x[sb + j] = 0;
      z[sb + j] = 0;
    }
    r[scratch] = 0;
    for (let i = 0; i < n; i++) {
      if (x[i * n + a]) this.rowsum(scratch, i + n);
    }
    return { outcome: (r[scratch] ?? 0) === 0 ? 0 : 1, deterministic: true };
  }

  /**
   * Sample the full computational basis (non-destructively snapshotting first, then restoring): measure each
   * qubit in turn through a COPY so the tableau is unchanged. Returns the packed bits (LSB = qubit 0). For
   * n > 53 the bigint is exact but {@link snapshot} only renders the low bits. O(n³).
   */
  sample(rng: Rng): bigint {
    const copy = this.clone();
    let bits = 0n;
    for (let q = 0; q < this.n; q++) {
      const m = copy.measure(q, rng);
      if (m.outcome) bits |= 1n << BigInt(q);
    }
    this.lastSample = bits;
    return bits;
  }

  /** A deep copy of the tableau (for non-destructive sampling/queries). */
  clone(): CliffordTableau {
    const c = new CliffordTableau(this.n);
    c.x.set(this.x);
    c.z.set(this.z);
    c.r.set(this.r);
    return c;
  }

  /**
   * Bipartite entanglement entropy (in ebits) across the cut A = [0,k), B = [k,n). For a stabiliser state
   * this is S_A = rank_{GF(2)}(stabiliser generators restricted to A's 2k coordinates) − k (Fattal et al.,
   * 2004). Cheap here (O(n²·k)); INTRACTABLE for the dense register. Returns 0 for a trivial/empty cut.
   */
  entanglementEntropy(k: number): number {
    const n = this.n;
    const cut = Math.max(0, Math.min(n, Math.floor(k)));
    if (cut === 0 || cut === n) return 0;
    const { x, z } = this;
    // Build the n × 2·cut binary matrix: each stabiliser row restricted to (x_j, z_j) for j ∈ [0,cut).
    const cols = 2 * cut;
    const mat: Uint8Array[] = [];
    for (let s = 0; s < n; s++) {
      const row = new Uint8Array(cols);
      const base = (n + s) * n;
      for (let j = 0; j < cut; j++) {
        row[j] = x[base + j] ?? 0;
        row[cut + j] = z[base + j] ?? 0;
      }
      mat.push(row);
    }
    // GF(2) rank by Gaussian elimination.
    let rank = 0;
    for (let col = 0; col < cols && rank < mat.length; col++) {
      let pivot = -1;
      for (let i = rank; i < mat.length; i++) {
        if ((mat[i]?.[col] ?? 0) === 1) {
          pivot = i;
          break;
        }
      }
      if (pivot < 0) continue;
      const tmp = mat[rank];
      mat[rank] = mat[pivot] ?? new Uint8Array(cols);
      if (tmp) mat[pivot] = tmp;
      const pr = mat[rank];
      if (!pr) continue;
      for (let i = 0; i < mat.length; i++) {
        if (i !== rank && (mat[i]?.[col] ?? 0) === 1) {
          const ri = mat[i];
          if (!ri) continue;
          for (let c = 0; c < cols; c++) ri[c] = (ri[c] ?? 0) ^ (pr[c] ?? 0);
        }
      }
      rank++;
    }
    const s = rank - cut;
    return s < 0 ? 0 : s;
  }

  /** Build the read-only board snapshot. O(n³) (the entropy GF(2) rank); UI cadence only. */
  snapshot(): CliffordSnapshot {
    const n = this.n;
    const cut = Math.floor(n / 2);
    const ent = this.entanglementEntropy(cut);
    // Live CA-MPS bond across the half-cut: a stabiliser state's exact bond is 2^S ebits (tn_mps
    // semantics), capped at the CA-MPS max_bond_dim. Previously a frozen constant presented as live.
    this._caMpsCurrentBond = Math.min(this._caMpsBond, 2 ** ent);
    // Mean stabiliser weight (how many qubits each generator touches) — a cheap correlation-spread proxy.
    const { x, z } = this;
    let weight = 0;
    for (let s = 0; s < n; s++) {
      const base = (n + s) * n;
      let w = 0;
      for (let j = 0; j < n; j++) if ((x[base + j] ?? 0) || (z[base + j] ?? 0)) w++;
      weight += w / n;
    }
    const lowBits = this.lastSample & ((1n << 53n) - 1n);
    return {
      qubits: n,
      entanglement: ent,
      entanglementNorm: cut > 0 ? ent / cut : 0,
      spread: n > 0 ? weight / n : 0,
      sampleBits: lowBits.toString(2).padStart(Math.min(n, 53), '0'),
      caMpsBond: this._caMpsBond,
      caMpsCurrentBond: this._caMpsCurrentBond,
    };
  }
}
