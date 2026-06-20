/**
 * ESHKOL BRIDGE — consciousness engine substrates ported from
 * Eshkol/eshkol_repo (logic + active inference + GWT workspace).
 * See docs/breakdown/CONSCIOUSNESS_ENGINE.md in corpus.
 *
 * NOT sentient — deterministic functional model of three substrates.
 * Exclusive leaf; wired by super-mind, godform, primordial-soup.
 */

import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

const FACTS = 8;
const BELIEFS = 8;
const MODULES = 6;

export interface EshkolStepInput {
  surprise: number;
  ignition: number;
  narrative: number;
  salience: ArrayLike<number>;
  freeEnergy?: number;
}

export interface EshkolConsciousnessSnapshot {
  logic: number;
  inference: number;
  workspace: number;
  broadcastWinner: number;
  beliefEntropy: number;
  unified: number;
}

/** Three-substrate consciousness engine (Eshkol corpus model). Preallocated; O(n) small. */
export class EshkolConsciousnessEngine {
  logic: number;
  inference: number;
  workspace: number;

  private readonly facts = new Float32Array(FACTS);
  private readonly beliefs = new Float32Array(BELIEFS);
  private readonly moduleSalience = new Float32Array(MODULES);
  private broadcastWinner = 0;

  constructor(logic = 0.5, inference = 0.5, workspace = 0.5) {
    this.logic = clamp01(logic);
    this.inference = clamp01(inference);
    this.workspace = clamp01(workspace);
  }

  /** Logic substrate: ground facts unify with narrative (resolution-style consistency). */
  private stepLogic(narrative: number, surprise: number): void {
    const slot = Math.floor(narrative * (FACTS - 1)) % FACTS;
    const prev = this.facts[slot] ?? 0;
    this.facts[slot] = clamp01(prev * 0.85 + narrative * 0.1 + (1 - surprise) * 0.05);
    let agree = 0;
    for (let i = 0; i < FACTS; i++) agree += Math.abs((this.facts[i] ?? 0) - narrative);
    this.logic = clamp01(this.logic * 0.9 + (1 - agree / FACTS) * 0.1);
  }

  /** Inference substrate: loopy belief propagation from surprise (factor graph proxy). */
  private stepInference(surprise: number, freeEnergy: number): void {
    for (let i = 0; i < BELIEFS; i++) {
      const b = this.beliefs[i] ?? 0;
      const msg = surprise * (0.5 + 0.5 * Math.sin(i * 1.7));
      this.beliefs[i] = clamp01(b * 0.88 + msg * 0.12);
    }
    this.inference = clamp01(this.inference * 0.92 + (1 - freeEnergy) * 0.08);
  }

  /** Workspace substrate: GWT softmax competition + broadcast (Baars/Bengio model). */
  private stepWorkspace(salience: ArrayLike<number>, ignition: number): void {
    const n = Math.min(salience.length, MODULES);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.max(0, salience[i] ?? 0);
      this.moduleSalience[i] = s;
      sum += s;
    }
    let maxP = -1;
    let win = 0;
    for (let i = 0; i < n; i++) {
      const p = (this.moduleSalience[i] ?? 0) / (sum || 1);
      if (p > maxP) {
        maxP = p;
        win = i;
      }
    }
    this.broadcastWinner = win;
    this.workspace = clamp01(this.workspace * 0.93 + ignition * maxP * 0.07);
  }

  beliefEntropy(): number {
    let e = 0;
    let sum = 0;
    for (let i = 0; i < BELIEFS; i++) sum += this.beliefs[i] ?? 0;
    if (sum < 1e-9) return 1;
    for (let i = 0; i < BELIEFS; i++) {
      const p = (this.beliefs[i] ?? 0) / sum;
      if (p > 1e-9) e -= p * Math.log(p);
    }
    return clamp01(e / Math.log(BELIEFS));
  }

  /** One beat: evolve all three substrates. Allocation-free. */
  step(input: EshkolStepInput): EshkolConsciousnessSnapshot {
    const fe = clamp01(input.freeEnergy ?? input.surprise);
    this.stepLogic(input.narrative, input.surprise);
    this.stepInference(input.surprise, fe);
    this.stepWorkspace(input.salience, input.ignition);
    const unified = clamp01((this.logic + this.inference + this.workspace) / 3);
    return {
      logic: this.logic,
      inference: this.inference,
      workspace: this.workspace,
      broadcastWinner: this.broadcastWinner,
      beliefEntropy: this.beliefEntropy(),
      unified,
    };
  }

  snapshot(): EshkolConsciousnessSnapshot {
    return {
      logic: this.logic,
      inference: this.inference,
      workspace: this.workspace,
      broadcastWinner: this.broadcastWinner,
      beliefEntropy: this.beliefEntropy(),
      unified: clamp01((this.logic + this.inference + this.workspace) / 3),
    };
  }
}

/** Central-difference AD (Eshkol tape primitive inspiration). */
export function eshkolADGradient(f: (x: number) => number, x: number, eps = 1e-4): number {
  return (f(x + eps) - f(x - eps)) / (2 * eps);
}

export interface EshkolDual {
  value: number;
  derivative: number;
}

export function eshkolDual(f: (x: number) => number, x: number): EshkolDual {
  return { value: f(x), derivative: eshkolADGradient(f, x) };
}

export function eshkolApplyAD(base: number, grad: number, scale = 0.1): number {
  return base + grad * scale;
}

export function makeEshkolDual(value: number, derivative = 1): EshkolDual {
  return { value, derivative };
}

export function dualAdd(a: EshkolDual, b: EshkolDual): EshkolDual {
  return { value: a.value + b.value, derivative: a.derivative + b.derivative };
}

export function dualMul(a: EshkolDual, b: EshkolDual): EshkolDual {
  return {
    value: a.value * b.value,
    derivative: a.derivative * b.value + a.value * b.derivative,
  };
}

/** GWT broadcast (workspace.cpp step proxy). */
export function gwtBroadcast(content: number[], salience: number[]): number[] {
  const n = Math.min(content.length, salience.length, 8);
  if (!n) return [];
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.max(0, salience[i] ?? 0);
  const out: number[] = [];
  let maxS = -1;
  let win = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.max(0, salience[i] ?? 0) / (sum || 1);
    out.push((content[i] ?? 0) * s);
    if (s > maxS) {
      maxS = s;
      win = i;
    }
  }
  if (n > 0) out[win] = (out[win] ?? 0) + 0.1;
  return out;
}

/** Per-Archon consciousness triple (logic / inference / workspace) from Eshkol engine spec. */
export function consciousnessTriple(archonIdx: number): {
  logic: number;
  inference: number;
  workspace: number;
} {
  const i = ((archonIdx % 5) + 5) % 5;
  return {
    logic: [0.85, 0.55, 0.7, 0.4, 0.75][i]!,
    inference: [0.6, 0.9, 0.65, 0.5, 0.8][i]!,
    workspace: [0.9, 0.5, 0.75, 0.6, 0.85][i]!,
  };
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Deterministic string hash → [0,1). */
export function eshkolProgramFingerprint(program: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < program.length; i++) {
    h ^= program.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return (h >>> 0) / 0xffffffff;
}

export interface EshkolProgramEffect {
  logic: number;
  inference: number;
  workspace: number;
  reasoning: number;
  fingerprint: number;
}

/** Evaluate an Eshkol .esk-inspired program against a scalar state probe. O(1). */
export function eshkolEvalProgram(program: string, state: number): EshkolProgramEffect {
  const s = clamp01(state);
  const fp = eshkolProgramFingerprint(program);
  const p = program.toLowerCase();
  let logic = 0;
  let inference = 0;
  let workspace = 0;
  let reasoning = 0;
  if (p.includes('unify') || p.includes('kb ') || p.includes("'deceive")) logic += 0.35;
  if (p.includes('factor-graph') || p.includes('factor_graph') || p.includes("'shift"))
    inference += 0.35;
  if (p.includes('gwt') || p.includes('broadcast') || p.includes("'prophecy")) workspace += 0.35;
  if (p.includes('ad ') || p.includes("'hallucinate") || p.includes('sim ')) reasoning += 0.3;
  const mix = fp * 0.15 + s * 0.1;
  return {
    logic: clamp01(logic + mix * (logic > 0 ? 1 : 0.5)),
    inference: clamp01(inference + mix * (inference > 0 ? 1 : 0.5)),
    workspace: clamp01(workspace + mix * (workspace > 0 ? 1 : 0.5)),
    reasoning: clamp01(reasoning + mix),
    fingerprint: fp,
  };
}

export function eshkolApplyProgramEffect(
  logic: number,
  inference: number,
  workspace: number,
  effect: EshkolProgramEffect,
  scale = 0.08,
): { logic: number; inference: number; workspace: number } {
  return {
    logic: clamp01(logic + effect.logic * scale),
    inference: clamp01(inference + effect.inference * scale),
    workspace: clamp01(workspace + effect.workspace * scale),
  };
}
