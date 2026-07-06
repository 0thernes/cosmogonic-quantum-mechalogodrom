/**
 * APEX Native Backend contract — the reference-reproducing bridge to a C/C++/GPU kernel backend.
 *
 * The 1-billion-parameter design cannot run its heavy dense kernels (a 100M-node prime sieve, a
 * hundred-million-cell heat grid, the pendulum integrators) in single-thread JS. The roadmap answer is
 * a native backend (the repo already ships a `native/` C++20 engine). But ADR-0007 is binding: the
 * native side is **one-way and never authoritative** — it may render or accelerate, but the seeded TS
 * simulation is the source of truth. This module encodes that as a *reproduction contract*:
 *
 * - {@link ReferenceApexBackend} is the pure-TS **deterministic oracle**. It implements small,
 *   quantised versions of the heavy kernels and hashes their state.
 * - {@link apexGoldenVectors} emits the same-seed golden hashes a native build must reproduce
 *   bit-for-bit (after the documented quantisation). A native kernel that disagrees is WRONG — the
 *   oracle wins. This is the falsifiability gate from the corpus report.
 * - {@link resolveApexBackend} returns the reference oracle today; a real native/WASM backend registers
 *   itself here once it passes the golden vectors, and the accounting flips its `native-declared`
 *   parameters into genuinely computed ones.
 *
 * Floats are quantised (round to 1e-6) before hashing so a C++ build with different FP rounding still
 * reproduces the hash — cross-platform determinism at a defined tolerance, not fragile bit-equality.
 * Deterministic (seeded {@link Rng}; no `Math.random`/`Date.now`), DOM-free, allocation-light.
 *
 * @see native/apex/README.md  (the C/C++ side of this contract)
 * @see docs/ARCHITECTURE-2026-06-26.md
 */

import { mulberry32 } from '../math/rng';

/** Quantisation grid for cross-platform hashing (6 decimal places). */
const QUANT = 1e6;

/** A backend that can compute (or reproduce) the APEX heavy kernels. */
export interface ApexKernelBackend {
  /** Backend identity ('reference-ts', 'native-cpp', 'wasm', …). */
  readonly name: string;
  /** True when this backend is actually usable in the current environment. */
  readonly available: boolean;
  /**
   * True ONLY for the TS reference oracle. A native/WASM backend is a *reproduction* of the oracle
   * (ADR-0007) — it must match {@link apexGoldenVectors}, never define its own truth.
   */
  readonly authoritative: boolean;
  /** Hash of the twin-prime edge set over `n` nodes (the Prime-Sieve Loom law). */
  primeSieveHash(n: number, seed: number): number;
  /** Hash of a `qubits`-wide statevector after `steps` of a fixed drive circuit. */
  statevectorHash(qubits: number, steps: number, seed: number): number;
  /** Hash of a `w`×`h` heat grid after `steps` of 5-point diffusion. */
  heatGridHash(w: number, h: number, steps: number, seed: number): number;
  /** Hash of `n` kicked-rotor pendulums (Chirikov standard map) after `steps`. */
  pendulumHash(n: number, steps: number, seed: number): number;
}

/** FNV-1a over a quantised float — the cross-platform hashing primitive. O(1). */
function fnvFloat(h: number, v: number): number {
  const q = Math.round((Number.isFinite(v) ? v : 0) * QUANT) | 0;
  let x = h ^ (q & 0xff);
  x = Math.imul(x, 0x01000193) >>> 0;
  x = (x ^ ((q >>> 8) & 0xff)) >>> 0;
  x = Math.imul(x, 0x01000193) >>> 0;
  x = (x ^ ((q >>> 16) & 0xff)) >>> 0;
  x = Math.imul(x, 0x01000193) >>> 0;
  x = (x ^ ((q >>> 24) & 0xff)) >>> 0;
  return Math.imul(x, 0x01000193) >>> 0;
}

/** Is `d` a twin-prime distance (both `d` and one of `d±2` prime)? Matches the loom law. O(√d). */
function isTwinDistance(d: number): boolean {
  const prime = (k: number): boolean => {
    if (k < 2) return false;
    for (let i = 2; i * i <= k; i++) if (k % i === 0) return false;
    return true;
  };
  return prime(d) && (prime(d - 2) || prime(d + 2));
}

/**
 * The pure-TS deterministic oracle. Every method is O(bounded) and seeded; these hashes ARE the
 * definition the native backend reproduces. NOT sentient; a numerical reference implementation.
 */
export class ReferenceApexBackend implements ApexKernelBackend {
  readonly name = 'reference-ts';
  readonly available = true;
  readonly authoritative = true;

  primeSieveHash(n: number, seed: number): number {
    const N = Math.max(2, Math.min(1 << 20, Math.floor(n)));
    let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
    for (let d = 1; d < N; d++) h = fnvFloat(h, isTwinDistance(d) ? 1 : 0);
    return h >>> 0;
  }

  statevectorHash(qubits: number, steps: number, seed: number): number {
    const q = Math.max(1, Math.min(12, Math.floor(qubits)));
    const dim = 1 << q;
    const re = new Float64Array(dim);
    const im = new Float64Array(dim);
    re[0] = 1;
    for (let t = 0; t < Math.max(1, steps); t++) {
      // Hadamard on every qubit, then a phase kick (deterministic, drive from beat).
      for (let target = 0; target < q; target++) {
        const tm = 1 << target;
        const s = Math.SQRT1_2;
        for (let i = 0; i < dim; i++) {
          if ((i & tm) === 0) {
            const j = i | tm;
            const ar = re[i] ?? 0;
            const ai = im[i] ?? 0;
            const br = re[j] ?? 0;
            const bi = im[j] ?? 0;
            re[i] = (ar + br) * s;
            im[i] = (ai + bi) * s;
            re[j] = (ar - br) * s;
            im[j] = (ai - bi) * s;
          }
        }
      }
      const phi = (t + 1) * 0.196349 + (seed % 1000) / 1000;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      for (let i = 0; i < dim; i++) {
        const ar = re[i] ?? 0;
        const ai = im[i] ?? 0;
        re[i] = ar * c - ai * sn;
        im[i] = ar * sn + ai * c;
      }
    }
    let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
    for (let i = 0; i < dim; i++) {
      const p = (re[i] ?? 0) * (re[i] ?? 0) + (im[i] ?? 0) * (im[i] ?? 0);
      h = fnvFloat(h, p);
    }
    return h >>> 0;
  }

  heatGridHash(w: number, h0: number, steps: number, seed: number): number {
    const W = Math.max(2, Math.min(256, Math.floor(w)));
    const H = Math.max(2, Math.min(256, Math.floor(h0)));
    let grid = new Float64Array(W * H);
    const next = new Float64Array(W * H);
    const rng = mulberry32(seed >>> 0 || 1);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    const k = 0.2;
    for (let t = 0; t < Math.max(1, steps); t++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const c = grid[y * W + x] ?? 0;
          const l = grid[y * W + (x > 0 ? x - 1 : x)] ?? 0;
          const r = grid[y * W + (x < W - 1 ? x + 1 : x)] ?? 0;
          const u = grid[(y > 0 ? y - 1 : y) * W + x] ?? 0;
          const dn = grid[(y < H - 1 ? y + 1 : y) * W + x] ?? 0;
          next[y * W + x] = c + k * (l + r + u + dn - 4 * c);
        }
      }
      const tmp = grid;
      grid = next.slice();
      tmp.fill(0);
    }
    let hh = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
    for (let i = 0; i < grid.length; i++) hh = fnvFloat(hh, grid[i] ?? 0);
    return hh >>> 0;
  }

  pendulumHash(n: number, steps: number, seed: number): number {
    const N = Math.max(1, Math.min(4096, Math.floor(n)));
    const theta = new Float64Array(N);
    const p = new Float64Array(N);
    const rng = mulberry32(seed >>> 0 || 1);
    for (let i = 0; i < N; i++) {
      theta[i] = rng() * 2 * Math.PI;
      p[i] = (rng() - 0.5) * 0.1;
    }
    const K = 2.7; // strong kick → positive-Lyapunov chaos (matches the PendulumHive)
    for (let t = 0; t < Math.max(1, steps); t++) {
      for (let i = 0; i < N; i++) {
        const np = (p[i] ?? 0) + K * Math.sin(theta[i] ?? 0);
        p[i] = np;
        theta[i] = ((theta[i] ?? 0) + np) % (2 * Math.PI);
      }
    }
    let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
    for (let i = 0; i < N; i++) h = fnvFloat(h, theta[i] ?? 0);
    return h >>> 0;
  }
}

/** The single shared reference oracle. */
export const REFERENCE_BACKEND = new ReferenceApexBackend();

/** The golden hashes a native/WASM backend MUST reproduce for a fixed small config. */
export interface ApexGoldenVectors {
  readonly seed: number;
  readonly primeSieve: number;
  readonly statevector: number;
  readonly heatGrid: number;
  readonly pendulum: number;
}

/** Emit the golden reproduction vectors for a seed (the native falsifiability gate). O(bounded). */
export function apexGoldenVectors(seed: number): ApexGoldenVectors {
  const b = REFERENCE_BACKEND;
  return {
    seed: seed >>> 0,
    primeSieve: b.primeSieveHash(256, seed),
    statevector: b.statevectorHash(6, 8, seed),
    heatGrid: b.heatGridHash(32, 32, 16, seed),
    pendulum: b.pendulumHash(64, 32, seed),
  };
}

/**
 * Resolve the active APEX kernel backend. Returns the pure-TS oracle today; a native/WASM backend
 * substitutes here ONLY after it reproduces {@link apexGoldenVectors} (ADR-0007). O(1).
 */
export function resolveApexBackend(): ApexKernelBackend {
  // No native/WASM backend is registered in this environment — the oracle is authoritative.
  return REFERENCE_BACKEND;
}

/** True if a candidate backend reproduces the oracle's golden vectors for a set of probe seeds. O(bounded). */
export function backendReproducesOracle(
  candidate: ApexKernelBackend,
  seeds: readonly number[] = [1, 7, 12345, 0xabcdef],
): boolean {
  for (const seed of seeds) {
    const gold = apexGoldenVectors(seed);
    if (candidate.primeSieveHash(256, seed) !== gold.primeSieve) return false;
    if (candidate.statevectorHash(6, 8, seed) !== gold.statevector) return false;
    if (candidate.heatGridHash(32, 32, 16, seed) !== gold.heatGrid) return false;
    if (candidate.pendulumHash(64, 32, seed) !== gold.pendulum) return false;
  }
  return true;
}
