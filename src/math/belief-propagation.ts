/**
 * FACTOR-GRAPH BELIEF PROPAGATION — discrete sum-product message passing, ported from Eshkol's
 * consciousness-engine inference layer (`lib/core/inference.cpp`: make-factor-graph, fg-add-factor!,
 * fg-infer!; audit-verified). A factor graph is a bipartite graph of variables (finite domains) and
 * factors (non-negative potential tables); sum-product passes messages until the per-variable
 * marginals (beliefs) settle. EXACT on trees; loopy-BP approximation with iteration on graphs with
 * cycles. This is genuine probabilistic inference — a creature reasoning under uncertainty by
 * propagating evidence through a structured model, not by token statistics.
 *
 * UPSTREAM (ported, with attribution — see THIRD-PARTY-NOTICES.md):
 *   tsotchke/Eshkol/eshkol_repo — lib/core/inference.cpp, lib/backend/vm_inference.c,
 *   inc/eshkol/core/inference.h. (MIT, © 2024–2026 tsotchke.)
 *
 * Determinism: pure — fixed (synchronous) update order, no Rng, no Date.now. Messages are
 * normalised each step for numerical stability.
 */

/** A factor: the variable indices it couples and its potential table (row-major, first var slowest). */
export interface Factor {
  /** Variable indices this factor couples, in table-axis order. */
  vars: number[];
  /** Non-negative potential, length = product of the coupled variables' cardinalities. */
  table: Float64Array;
}

/** A factor graph: variable cardinalities + factors. */
export interface FactorGraph {
  /** Domain size of each variable, indexed by variable id. */
  cardinalities: number[];
  factors: Factor[];
}

const EPS = 1e-12;

/** Mixed-radix index of assignment `a` over cardinalities `card` (first axis most significant). */
function encode(a: number[], card: number[]): number {
  let idx = 0;
  for (let k = 0; k < card.length; k++) idx = idx * card[k]! + a[k]!;
  return idx;
}

/** Normalise a vector in place to sum 1 (uniform if it sums to ~0). Returns it. */
function normalize(v: Float64Array): Float64Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i]!;
  if (s < EPS) {
    v.fill(1 / v.length);
    return v;
  }
  const inv = 1 / s;
  for (let i = 0; i < v.length; i++) v[i]! *= inv;
  return v;
}

const key = (v: number, f: number): string => `${v}:${f}`;

/**
 * Run sum-product belief propagation and return the marginal belief (a normalised distribution)
 * for every variable.
 *
 * @param iterations number of synchronous message-passing sweeps (≥ graph diameter for trees).
 */
export function beliefPropagation(fg: FactorGraph, iterations = 20): Float64Array[] {
  const V = fg.cardinalities.length;
  const F = fg.factors.length;

  // Incident factors per variable.
  const incident: number[][] = Array.from({ length: V }, () => []);
  for (let f = 0; f < F; f++) for (const v of fg.factors[f]!.vars) incident[v]!.push(f);

  // Messages factor→var (mFV) and var→factor (mVF), keyed by (var,factor), initialised uniform.
  const mFV = new Map<string, Float64Array>();
  const mVF = new Map<string, Float64Array>();
  for (let f = 0; f < F; f++) {
    for (const v of fg.factors[f]!.vars) {
      const c = fg.cardinalities[v]!;
      mFV.set(key(v, f), normalize(new Float64Array(c).fill(1)));
      mVF.set(key(v, f), normalize(new Float64Array(c).fill(1)));
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    // var → factor: product of incoming factor messages from OTHER incident factors.
    for (let v = 0; v < V; v++) {
      const c = fg.cardinalities[v]!;
      for (const f of incident[v]!) {
        const out = new Float64Array(c).fill(1);
        for (const g of incident[v]!) {
          if (g === f) continue;
          const m = mFV.get(key(v, g))!;
          for (let x = 0; x < c; x++) out[x]! *= m[x]!;
        }
        mVF.set(key(v, f), normalize(out));
      }
    }

    // factor → var: marginalise the potential against incoming var→factor messages of OTHER vars.
    for (let f = 0; f < F; f++) {
      const fac = fg.factors[f]!;
      const vars = fac.vars;
      const card = vars.map((v) => fg.cardinalities[v]!);
      const total = card.reduce((a, b) => a * b, 1);
      for (let p = 0; p < vars.length; p++) {
        const vp = vars[p]!;
        const out = new Float64Array(card[p]!);
        const a = Array.from({ length: vars.length }, () => 0);
        for (let lin = 0; lin < total; lin++) {
          // decode lin → assignment a
          let rem = lin;
          for (let k = vars.length - 1; k >= 0; k--) {
            a[k] = rem % card[k]!;
            rem = Math.floor(rem / card[k]!);
          }
          let w = fac.table[encode(a, card)]!;
          for (let q = 0; q < vars.length; q++) {
            if (q === p) continue;
            w *= mVF.get(key(vars[q]!, f))![a[q]!]!;
          }
          out[a[p]!]! += w;
        }
        mFV.set(key(vp, f), normalize(out));
      }
    }
  }

  // Beliefs: product of all incoming factor messages at each variable.
  const beliefs: Float64Array[] = [];
  for (let v = 0; v < V; v++) {
    const c = fg.cardinalities[v]!;
    const b = new Float64Array(c).fill(1);
    for (const f of incident[v]!) {
      const m = mFV.get(key(v, f))!;
      for (let x = 0; x < c; x++) b[x]! *= m[x]!;
    }
    beliefs.push(normalize(b));
  }
  return beliefs;
}

/** Normalised Shannon entropy (0..1) of a belief — a creature's uncertainty about that variable. */
export function beliefEntropy(b: Float64Array): number {
  const n = b.length;
  if (n <= 1) return 0;
  let h = 0;
  for (let i = 0; i < n; i++) {
    const p = b[i]!;
    if (p > 0) h -= p * Math.log(p);
  }
  const norm = h / Math.log(n);
  return norm < 0 ? 0 : norm > 1 ? 1 : norm;
}
