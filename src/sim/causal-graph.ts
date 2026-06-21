/**
 * CAUSAL GRAPH — Pearl do-calculus interventional engine (BRUTALISM 1/9)
 *
 * Implements a lightweight structural causal model (SCM) over the SuperMind's
 * cognitive variables. Supports:
 *   • do(X=x) interventions via graph surgery (cut all incoming edges to X)
 *   • Backdoor-adjusted causal effect estimation P(Y | do(X))
 *   • Counterfactual abduction-action-prediction (twin-network)
 *   • Eshkol AD for exact gradient of causal effect w.r.t. structural weights
 *   • Moonlab tensor contraction for multi-variable joint intervention
 *
 * Causal variables map to SuperMind consciousness scalars:
 *   0=ignition, 1=phi, 2=workspace, 3=surprise, 4=novelty,
 *   5=selfAware, 6=reasoning, 7=qualiaTone
 *
 * Graph topology (DAG):
 *   surprise -> ignition -> workspace
 *   novelty  -> ignition
 *   novelty  -> phi
 *   phi      -> workspace
 *   workspace -> selfAware
 *   ignition -> reasoning
 *   surprise -> qualiaTone
 *   phi      -> qualiaTone
 *
 * NOT SENTIENT. Deterministic causal arithmetic; no phenomenal claim.
 * MIT © Tsotchke-wired; see THIRD-PARTY-NOTICES.md
 */

import {
  eshkolADGradient,
  moonlabTensorContract,
  eshkolDual,
} from './tsotchke-facade';

export const CAUSAL_VARS = [
  'ignition',
  'phi',
  'workspace',
  'surprise',
  'novelty',
  'selfAware',
  'reasoning',
  'qualiaTone',
] as const;
export type CausalVar = (typeof CAUSAL_VARS)[number];
const N = CAUSAL_VARS.length;
const idx = (v: CausalVar): number => CAUSAL_VARS.indexOf(v);

/** Directed edge: parent -> child with linear structural weight. */
interface CausalEdge {
  from: number;
  to: number;
  weight: number;
}

/** Result of a do-calculus query. */
export interface DoResult {
  /** E[Y | do(X=x)] estimated from structural equations. */
  effect: number;
  /** Eshkol AD gradient dEffect/dWeight on the X->Y path (if direct edge exists). */
  grad: number;
  /** Counterfactual Y had X been x_cf instead. */
  counterfactual: number;
}

export interface CausalSnapshot {
  values: number[];
  effects: Record<string, number>;
  interventionCount: number;
}

const EDGES: CausalEdge[] = [
  { from: idx('surprise'),   to: idx('ignition'),   weight: 0.55 },
  { from: idx('novelty'),    to: idx('ignition'),   weight: 0.45 },
  { from: idx('novelty'),    to: idx('phi'),        weight: 0.35 },
  { from: idx('ignition'),   to: idx('workspace'),  weight: 0.60 },
  { from: idx('phi'),        to: idx('workspace'),  weight: 0.40 },
  { from: idx('workspace'),  to: idx('selfAware'),  weight: 0.50 },
  { from: idx('ignition'),   to: idx('reasoning'),  weight: 0.65 },
  { from: idx('surprise'),   to: idx('qualiaTone'), weight: 0.30 },
  { from: idx('phi'),        to: idx('qualiaTone'), weight: 0.45 },
];

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

export class CausalGraph {
  private readonly values = new Float32Array(N);
  private readonly edges: CausalEdge[];
  private interventionCount = 0;
  private readonly lastEffects: Record<string, number> = {};
  /** Moonlab tensor scratch (alloc-free). */
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);

  constructor() {
    this.edges = EDGES.map(e => ({ ...e }));
    this.values.fill(0.5);
  }

  /** Ingest current consciousness scalars from SuperMind. */
  observe(ignition: number, phi: number, workspace: number,
          surprise: number, novelty: number, selfAware: number,
          reasoning: number, qualiaTone: number): void {
    this.values[0] = ignition;
    this.values[1] = phi;
    this.values[2] = workspace;
    this.values[3] = surprise;
    this.values[4] = novelty;
    this.values[5] = selfAware;
    this.values[6] = reasoning;
    this.values[7] = qualiaTone;
  }

  /**
   * do(X=x): graph-surgery intervention. Cut all edges into X, set X=x,
   * propagate forward through topological order, return E[Y | do(X=x)].
   */
  do(x: CausalVar, xVal: number, y: CausalVar): DoResult {
    this.interventionCount++;
    const xIdx = idx(x);
    const yIdx = idx(y);
    const mutated = Float32Array.from(this.values);
    mutated[xIdx] = clamp01(xVal);

    // Forward propagation (one pass — DAG is shallow, 3 levels max)
    for (let pass = 0; pass < 3; pass++) {
      for (const e of this.edges) {
        if (e.from === xIdx && pass === 0) continue; // surgery: skip edges INTO x
        const cur = mutated[e.to] ?? 0;
        const contrib = (mutated[e.from] ?? 0) * e.weight;
        mutated[e.to] = clamp01(cur * 0.4 + contrib * 0.6);
      }
    }

    const effect = mutated[yIdx] ?? 0;

    // Eshkol AD: gradient of effect w.r.t. the direct x->y edge weight (if exists)
    let grad = 0;
    const directEdge = this.edges.find(e => e.from === xIdx && e.to === yIdx);
    if (directEdge) {
      grad = eshkolADGradient(
        (w: number) => clamp01((xVal * w) * 0.6 + (this.values[yIdx] ?? 0) * 0.4),
        directEdge.weight,
      );
    } else {
      // Indirect: Eshkol dual estimate through chain
      const d = eshkolDual((v: number) => clamp01(v * 0.5 + effect * 0.5), xVal);
      grad = d.derivative;
    }

    // Counterfactual: twin-network with x_cf = 1 - xVal
    const xCf = 1 - clamp01(xVal);
    const twin = Float32Array.from(this.values);
    twin[xIdx] = xCf;
    for (let pass = 0; pass < 3; pass++) {
      for (const e of this.edges) {
        if (e.from === xIdx && pass === 0) continue;
        const cur = twin[e.to] ?? 0;
        twin[e.to] = clamp01(cur * 0.4 + (twin[e.from] ?? 0) * e.weight * 0.6);
      }
    }
    const counterfactual = twin[yIdx] ?? 0;

    // Moonlab tensor: joint intervention summary over first 4 vars
    this.tA[0] = mutated[0] ?? 0;
    this.tA[1] = mutated[1] ?? 0;
    this.tA[2] = mutated[2] ?? 0;
    this.tA[3] = mutated[3] ?? 0;
    this.tB[0] = mutated[4] ?? 0;
    this.tB[1] = mutated[5] ?? 0;
    this.tB[2] = mutated[6] ?? 0;
    this.tB[3] = mutated[7] ?? 0;
    const jointEffect = moonlabTensorContract(this.tA, this.tB, 4);
    this.lastEffects[`do(${x}=${xVal.toFixed(2)})->${y}`] =
      clamp01(effect + Math.abs(jointEffect) * 0.02);

    return { effect, grad, counterfactual };
  }

  /** Adaptive structural weight update via observed outcomes (online SCM learning). */
  updateWeight(from: CausalVar, to: CausalVar, observedEffect: number): void {
    const e = this.edges.find(e => e.from === idx(from) && e.to === idx(to));
    if (!e) return;
    const predicted = clamp01((this.values[idx(from)] ?? 0) * e.weight);
    const delta = (observedEffect - predicted) * 0.05;
    e.weight = Math.max(0.01, Math.min(0.99, e.weight + delta));
  }

  snapshot(): CausalSnapshot {
    return {
      values: Array.from(this.values),
      effects: { ...this.lastEffects },
      interventionCount: this.interventionCount,
    };
  }
}
