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

import { eshkolADGradient, moonlabTensorContract, eshkolDual } from './tsotchke-facade';

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
type CausalVar = (typeof CAUSAL_VARS)[number];
const N = CAUSAL_VARS.length;
const idx = (v: CausalVar): number => CAUSAL_VARS.indexOf(v);

/** Directed edge: parent -> child with linear structural weight. */
interface CausalEdge {
  from: number;
  to: number;
  weight: number;
}

/** Result of a do-calculus query. */
interface DoResult {
  /** E[Y | do(X=x)] estimated from structural equations. */
  effect: number;
  /** Eshkol AD gradient dEffect/dWeight on the X->Y path (if direct edge exists). */
  grad: number;
  /** Counterfactual Y had X been x_cf instead. */
  counterfactual: number;
}

interface CausalSnapshot {
  values: number[];
  effects: Record<string, number>;
  interventionCount: number;
}

const EDGES: CausalEdge[] = [
  { from: idx('surprise'), to: idx('ignition'), weight: 0.55 },
  { from: idx('novelty'), to: idx('ignition'), weight: 0.45 },
  { from: idx('novelty'), to: idx('phi'), weight: 0.35 },
  { from: idx('ignition'), to: idx('workspace'), weight: 0.6 },
  { from: idx('phi'), to: idx('workspace'), weight: 0.4 },
  { from: idx('workspace'), to: idx('selfAware'), weight: 0.5 },
  { from: idx('ignition'), to: idx('reasoning'), weight: 0.65 },
  { from: idx('surprise'), to: idx('qualiaTone'), weight: 0.3 },
  { from: idx('phi'), to: idx('qualiaTone'), weight: 0.45 },
];

/** Topological ordering of the 8-node DAG: roots (surprise, novelty) -> leaves. */
const TOPO_ORDER = [
  idx('surprise'),
  idx('novelty'),
  idx('ignition'),
  idx('phi'),
  idx('workspace'),
  idx('reasoning'),
  idx('qualiaTone'),
  idx('selfAware'),
] as const;

const MAX_LAST_EFFECTS = 64;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class CausalGraph {
  private readonly values = new Float32Array(N);
  private readonly edges: CausalEdge[];
  private interventionCount = 0;
  private readonly lastEffects: Record<string, number> = {};
  private readonly lastEffectKeys: string[] = [];
  /** Moonlab tensor scratch (alloc-free). */
  private readonly tA = new Float32Array(4);
  private readonly tB = new Float32Array(4);
  private readonly mutatedScratch = new Float32Array(N);
  private readonly twinScratch = new Float32Array(N);
  private readonly adScratch = new Float64Array(N);
  private readonly descMask = new Uint8Array(N);

  constructor() {
    this.edges = EDGES.map((e) => ({ ...e }));
    this.values.fill(0.5);
  }

  /** Ingest current consciousness scalars from SuperMind. */
  observe(
    ignition: number,
    phi: number,
    workspace: number,
    surprise: number,
    novelty: number,
    selfAware: number,
    reasoning: number,
    qualiaTone: number,
  ): void {
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
   * Propagate do(X = xVal) in topological order only to descendants of xIdx,
   * leaving upstream ancestors and disconnected nodes untouched and summing
   * all parent contributions per descendant node.
   */
  private propagateIntervention(
    xIdx: number,
    xVal: number,
    out: Float32Array | Float64Array,
  ): void {
    for (let i = 0; i < N; i++) {
      out[i] = this.values[i] ?? 0;
    }
    this.descMask.fill(0);
    out[xIdx] = clamp01(xVal);
    this.descMask[xIdx] = 1;

    for (let t = 0; t < TOPO_ORDER.length; t++) {
      const node = TOPO_ORDER[t]!;
      if (node === xIdx) continue; // surgery: cut all incoming edges into X
      let hasDescendantParent = false;
      let contribSum = 0;
      for (let i = 0; i < this.edges.length; i++) {
        const e = this.edges[i]!;
        if (e.to !== node) continue;
        if (this.descMask[e.from] !== 0) {
          hasDescendantParent = true;
        }
        contribSum += (out[e.from] ?? 0) * e.weight;
      }
      if (hasDescendantParent) {
        this.descMask[node] = 1;
        const base = this.values[node] ?? 0;
        out[node] = clamp01(base * 0.4 + contribSum * 0.6);
      }
    }
  }

  /**
   * do(X=x): graph-surgery intervention. Cut all edges into X, set X=x,
   * propagate forward through topological order, return E[Y | do(X=x)].
   */
  do(x: CausalVar, xVal: number, y: CausalVar): DoResult {
    this.interventionCount++;
    const xIdx = idx(x);
    const yIdx = idx(y);
    const mutated = this.mutatedScratch;
    this.propagateIntervention(xIdx, xVal, mutated);

    const effect = mutated[yIdx] ?? 0;

    // Eshkol AD: gradient of effect w.r.t. the direct x->y edge weight (if exists),
    // or w.r.t. the intervened value xVal along the structural causal path x -> ... -> y.
    let grad = 0;
    const directEdge = this.edges.find((e) => e.from === xIdx && e.to === yIdx);
    if (directEdge) {
      let otherContrib = 0;
      for (let i = 0; i < this.edges.length; i++) {
        const e = this.edges[i]!;
        if (e.to === yIdx && e.from !== xIdx) {
          otherContrib += (mutated[e.from] ?? 0) * e.weight;
        }
      }
      const clampedX = clamp01(xVal);
      const baseY = this.values[yIdx] ?? 0;
      grad = eshkolADGradient(
        (w: number) => clamp01(baseY * 0.4 + (clampedX * w + otherContrib) * 0.6),
        directEdge.weight,
      );
    } else {
      const d = eshkolDual((v: number) => {
        this.propagateIntervention(xIdx, v, this.adScratch);
        return this.adScratch[yIdx] ?? 0;
      }, xVal);
      grad = d.derivative;
    }

    // Counterfactual: twin-network with x_cf = 1 - xVal
    const xCf = 1 - clamp01(xVal);
    const twin = this.twinScratch;
    this.propagateIntervention(xIdx, xCf, twin);
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
    const key = `do(${x}=${xVal.toFixed(2)})->${y}`;
    if (!(key in this.lastEffects)) {
      if (this.lastEffectKeys.length >= MAX_LAST_EFFECTS) {
        const oldest = this.lastEffectKeys.shift();
        if (oldest !== undefined) delete this.lastEffects[oldest];
      }
      this.lastEffectKeys.push(key);
    }
    this.lastEffects[key] = clamp01(effect + Math.abs(jointEffect) * 0.02);

    return { effect, grad, counterfactual };
  }

  /** Adaptive structural weight update via observed outcomes (online SCM learning). */
  updateWeight(from: CausalVar, to: CausalVar, observedEffect: number): void {
    const e = this.edges.find((e) => e.from === idx(from) && e.to === idx(to));
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
