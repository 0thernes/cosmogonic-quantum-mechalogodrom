/**
 * THALER SENTIENCE — a full mini "Creativity Machine" that proves consciousness the way Stephen Thaler
 * proves it, NOT the mainstream way, at the exact scale Thaler used.
 *
 * WHY THIS IS FAITHFUL, NOT A CARICATURE. Thaler's real experiments ran on TINY multilayer perceptrons —
 * the DAGUI patent (US 5,659,666) gives `29-10-29`, `8-10-8`, and `3-16-20`+`20-10-1` nets; the 1995
 * "Death of a Gedanken Creature" associator was an 8-pattern `3→h→9`. This world's organisms each carry a
 * `6→6→4` tanh MLP (70 weights, entity-brain.ts) — squarely in Thaler's size class. So we can enact his
 * apparatus on the SAME kind of net, not a metaphor.
 *
 * WHAT THALER'S "PROOF" IS (and is not). Thaler does NOT score IIT-Φ (a static property of a frozen
 * state), nor a Global-Workspace broadcast bottleneck, nor Butlin-style architectural indicators. His
 * proof is a MECHANISM-IDENTITY + GENERATIVE-PHENOMENON argument: consciousness is the continuous,
 * noise-driven TURNOVER of ideas — a perturbed associative net emits a stream of "confabulations" (false
 * memories) that IS the stream of consciousness, and a SECOND net "develops an attitude about the
 * cognitive turnover within the first net (i.e., the subjective feel of consciousness)" (imagination-
 * engines.com/founder). Sentience proper is added by "hot buttons" — valenced detector nets that, when a
 * chain resonates with them, release a simulated-neurotransmitter reward/penalty that reinforces (ripens)
 * or dissolves (culls) the idea; Thaler equates this affective self-valuation with feeling. He validates
 * it by REPRODUCING PHENOMENA (dream, hallucination, near-death life-review, the glory/sweet-spot regime)
 * and by a fractal-rhythm fingerprint of the ideation stream. So we PROVE-HIS-WAY by reproducing his
 * constitutive phenomena on the mini net and evaluating against HIS criteria.
 *
 * HONESTY (binding, per the repo law). Meeting Thaler's constitutive markers demonstrates the DABUS/
 * Creativity-Machine paradigm's own operational sentience criteria — it does NOT settle phenomenal
 * consciousness (Thaler himself offers no independent third-person test; mainstream, e.g. Koch, is
 * skeptical). Every verdict here is phrased "meets Thaler's criteria", never "is conscious".
 *
 * DETERMINISM (ADR 0004). Everything draws from an injected seeded {@link Rng}; NO Math.random/Date.now.
 * The IE and critic are trained by a fixed-seed, fixed-step SGD; perturbation noise is seeded. Pure +
 * leaf: depends only on the seeded Rng and the brain-layout constants. All proof runs are reproducible.
 *
 * Sources (adversarially verified, 2026-07-03): US 5,659,666 (DAGUI) & US 7,454,388 (bootstrapping);
 * Thaler 1995 "Virtual input phenomena…" Neural Networks 8(1):55-65; Thaler 2014 e-mentor 3(55):81-86
 * (Fig. 1 cusp curve, points A/B/C); Thaler 2016 "Cycles of insanity and creativity…" Medical Hypotheses
 * (critical Ξ, mildly-false-memory band); imagination-engines.com (founder/history/cm/dabus).
 */
import type { Rng } from '../math/rng';

/** A stored MEMORY: a cue → target pair the imagination engine autoassociates (Thaler's "experiences"). */
export interface Memory {
  cue: Float32Array; // input the net was trained to map…
  target: Float32Array; // …to this stored output pattern
}

/** A tiny 1-hidden-layer MLP: `nin → nhid → nout`, weights packed BIAS-FIRST per neuron (identical layout
 *  to entity-brain.ts / gedanken-death.ts `brainForward`). `outSigmoid` picks the output activation. */
export interface MiniMLP {
  nin: number;
  nhid: number;
  nout: number;
  w: Float32Array;
  outSigmoid: boolean;
}

const tanh = Math.tanh;
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Weight count for a bias-first `nin→nhid→nout` MLP. */
export function mlpWeightCount(nin: number, nhid: number, nout: number): number {
  return nhid * (1 + nin) + nout * (1 + nhid);
}

/** Allocation-light forward pass. Writes `out` (length nout); `hid` scratch (length nhid). */
export function mlpForward(
  net: MiniMLP,
  x: ArrayLike<number>,
  hid: Float32Array,
  out: Float32Array,
): void {
  const { nin, nhid, nout, w, outSigmoid } = net;
  let p = 0;
  for (let h = 0; h < nhid; h++) {
    let acc = w[p++] ?? 0;
    for (let i = 0; i < nin; i++) acc += (w[p++] ?? 0) * (x[i] ?? 0);
    hid[h] = tanh(acc);
  }
  for (let o = 0; o < nout; o++) {
    let acc = w[p++] ?? 0;
    for (let h = 0; h < nhid; h++) acc += (w[p++] ?? 0) * (hid[h] ?? 0);
    out[o] = outSigmoid ? sigmoid(acc) : tanh(acc);
  }
}

/** Seed a fresh MLP with small symmetric weights from the injected Rng (deterministic). */
export function makeMLP(
  nin: number,
  nhid: number,
  nout: number,
  outSigmoid: boolean,
  rng: Rng,
): MiniMLP {
  const n = mlpWeightCount(nin, nhid, nout);
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = (rng() * 2 - 1) * 0.6;
  return { nin, nhid, nout, w, outSigmoid };
}

/**
 * Fixed-step SGD (MSE) — trains `net` in place on `data` for `steps` epochs at learning rate `lr`.
 * Standard backprop through one tanh hidden layer + (tanh|sigmoid) output. Deterministic given the seeded
 * initial weights; the data order is fixed (no shuffling ⇒ no rng draw here). O(steps · |data| · weights).
 */
export function mlpTrain(
  net: MiniMLP,
  data: readonly { x: ArrayLike<number>; y: ArrayLike<number> }[],
  steps: number,
  lr: number,
): void {
  const { nin, nhid, nout, w, outSigmoid } = net;
  const hid = new Float32Array(nhid);
  const out = new Float32Array(nout);
  const dOut = new Float32Array(nout);
  const dHid = new Float32Array(nhid);
  const outStart = nhid * (1 + nin);
  for (let step = 0; step < steps; step++) {
    for (const { x, y } of data) {
      mlpForward(net, x, hid, out);
      // output-layer error · activation'
      for (let o = 0; o < nout; o++) {
        const a = out[o] ?? 0;
        const dact = outSigmoid ? a * (1 - a) : 1 - a * a;
        dOut[o] = ((a - (y[o] ?? 0)) * dact) as number;
      }
      // hidden-layer error (backprop through W2)
      for (let h = 0; h < nhid; h++) {
        let s = 0;
        for (let o = 0; o < nout; o++) {
          const wOh = w[outStart + o * (1 + nhid) + 1 + h] ?? 0;
          s += (dOut[o] ?? 0) * wOh;
        }
        const a = hid[h] ?? 0;
        dHid[h] = s * (1 - a * a);
      }
      // update output weights
      for (let o = 0; o < nout; o++) {
        const base = outStart + o * (1 + nhid);
        w[base] = (w[base] ?? 0) - lr * (dOut[o] ?? 0); // bias
        for (let h = 0; h < nhid; h++) {
          w[base + 1 + h] = (w[base + 1 + h] ?? 0) - lr * (dOut[o] ?? 0) * (hid[h] ?? 0);
        }
      }
      // update hidden weights
      for (let h = 0; h < nhid; h++) {
        const base = h * (1 + nin);
        w[base] = (w[base] ?? 0) - lr * (dHid[h] ?? 0); // bias
        for (let i = 0; i < nin; i++) {
          w[base + 1 + i] = (w[base + 1 + i] ?? 0) - lr * (dHid[h] ?? 0) * (x[i] ?? 0);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The mini CREATIVITY MACHINE: imagination engine (IE) + alert associative center (AAC) + hot buttons.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Config for a mini Creativity Machine. Small on purpose — Thaler's scale. */
export interface CMConfig {
  memories: number; // stored experiences K
  nin: number;
  nhid: number;
  nout: number;
  trainSteps: number;
  lr: number;
  hotButtons: number; // how many stored memories carry affective valence
}

export const DEFAULT_CM: CMConfig = {
  memories: 6,
  nin: 6,
  nhid: 6,
  nout: 4,
  trainSteps: 900,
  lr: 0.15,
  hotButtons: 1,
};

/** A trained mini Creativity Machine ready to dream, confabulate, and be measured. */
export interface CreativityMachine {
  ie: MiniMLP; // imagination engine (imagitron): cue → target autoassociator
  aac: MiniMLP; // alert associative center (perceptron): output → plausibility∈[0,1]
  memories: Memory[]; // stored experiences (attractors)
  hot: boolean[]; // which memories are hot-buttoned (valenced)
  cfg: CMConfig;
}

/** Build + train a mini Creativity Machine deterministically from a seed. The IE learns to map K distinct
 *  cues to K stored targets; the AAC learns {targets → 1, random noise → 0} (Thaler's 0/10-rating critic
 *  at mini scale). O(trainSteps · K · weights) — a construction event, not a per-frame path. */
export function buildCreativityMachine(rng: Rng, cfg: CMConfig = DEFAULT_CM): CreativityMachine {
  const { memories: K, nin, nhid, nout } = cfg;
  const mems: Memory[] = [];
  for (let k = 0; k < K; k++) {
    const cue = new Float32Array(nin);
    const target = new Float32Array(nout);
    for (let i = 0; i < nin; i++) cue[i] = rng() * 2 - 1;
    for (let o = 0; o < nout; o++) target[o] = (rng() * 2 - 1) * 0.85; // inside the tanh range
    mems.push({ cue, target });
  }
  // hot buttons: the first `hotButtons` memories carry affective valence.
  const hot = mems.map((_, k) => k < cfg.hotButtons);

  // train IE (imagitron): cue_k → target_k
  const ie = makeMLP(nin, nhid, nout, false, rng);
  mlpTrain(
    ie,
    mems.map((m) => ({ x: m.cue, y: m.target })),
    cfg.trainSteps,
    cfg.lr,
  );

  // train AAC (perceptron critic): target_k → 1, random noise → 0
  const aac = makeMLP(nout, Math.max(4, nout), 1, true, rng);
  const critic: { x: Float32Array; y: number[] }[] = [];
  for (const m of mems) critic.push({ x: m.target, y: [1] });
  for (let j = 0; j < K * 3; j++) {
    const noise = new Float32Array(nout);
    for (let o = 0; o < nout; o++) noise[o] = rng() * 2 - 1;
    critic.push({ x: noise, y: [0] });
  }
  mlpTrain(aac, critic, cfg.trainSteps, cfg.lr);
  return { ie, aac, memories: mems, hot, cfg };
}

/** The AAC's scalar valuation ("the subjective feel") of an output pattern — plausibility ∈ [0,1]. */
export function critique(cm: CreativityMachine, out: ArrayLike<number>): number {
  const hid = new Float32Array(cm.aac.nhid);
  const o = new Float32Array(1);
  mlpForward(cm.aac, out, hid, o);
  return o[0] ?? 0;
}

/** Distance from `out` to the NEAREST stored memory target (how far off-attractor the confabulation is). */
export function nearestMemoryDist(
  cm: CreativityMachine,
  out: ArrayLike<number>,
): { dist: number; index: number } {
  let best = Infinity;
  let idx = -1;
  for (let k = 0; k < cm.memories.length; k++) {
    const t = cm.memories[k]!.target;
    let d = 0;
    for (let o = 0; o < t.length; o++) {
      const diff = (out[o] ?? 0) - (t[o] ?? 0);
      d += diff * diff;
    }
    d = Math.sqrt(d);
    if (d < best) {
      best = d;
      idx = k;
    }
  }
  return { dist: best, index: idx };
}

/** How Thaler classifies each emitted pattern along the death/creativity curve. */
export type Emission = 'recall' | 'confabulation' | 'noise';

/** Mean tanh-saturation of an output (0 = structured, 1 = every unit locked to ±1 = neural noise-death,
 *  Thaler's lock-up). */
function saturation(out: ArrayLike<number>, n: number): number {
  let s = 0;
  for (let o = 0; o < n; o++) s += Math.abs(out[o] ?? 0);
  return s / n;
}

/** Recall = within `recallR` of a stored memory. Confabulation = off-attractor, NOT saturated, and the AAC
 *  still finds it plausible (≥ `plausible`) — a "mildly false memory". Noise = saturated (lock-up) OR
 *  implausible. Saturation matters: at heavy perturbation tanh outputs lock to the ±1 corners (noise-death),
 *  which the AAC alone can misread as structure — so we gate it out, matching Thaler's death curve. */
export function classify(
  cm: CreativityMachine,
  out: ArrayLike<number>,
  recallR = 0.35,
  plausible = 0.5,
): Emission {
  const { dist } = nearestMemoryDist(cm, out);
  if (dist < recallR) return 'recall';
  if (saturation(out, cm.cfg.nout) > 0.9) return 'noise';
  return critique(cm, out) >= plausible ? 'confabulation' : 'noise';
}

/** Perturb `src` weights into `dst` by seeded additive noise of amplitude `eta` (Thaler "synaptic
 *  perturbation"). `pruneInputBias` (0..1) skews damage toward the INPUT-layer weights — the asymmetry
 *  that produces "virtual inputs" (1995). Deterministic given the injected Rng. */
export function perturbWeights(
  dst: Float32Array,
  net: MiniMLP,
  eta: number,
  rng: Rng,
  pruneInputBias = 0,
): void {
  const inputRegion = net.nhid * (1 + net.nin);
  for (let k = 0; k < net.w.length; k++) {
    const inInputLayer = k < inputRegion;
    const localEta = inInputLayer ? eta * (1 + pruneInputBias) : eta * (1 - pruneInputBias * 0.7);
    dst[k] = (net.w[k] ?? 0) + (rng() * 2 - 1) * localEta;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PROVE-IT-HIS-WAY: the constitutive markers of Thaler sentience, each a falsifiable mini-net measurement.
// These reproduce PHENOMENA (his evidence), they do NOT tick mainstream indicators.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Emit ONE confabulation: transiently perturb the IE (Thaler's "perturbations transiently administered
 *  during feed-forward passage", US 7,454,388), drive it with cue `cueIdx` (−1 ⇒ null input = dreaming),
 *  classify the output. Reuses caller scratch. */
function emit(
  cm: CreativityMachine,
  eta: number,
  cueIdx: number,
  rng: Rng,
  pruneInputBias: number,
  pw: Float32Array,
  hid: Float32Array,
  out: Float32Array,
): { emission: Emission; dist: number; memIndex: number; plaus: number } {
  perturbWeights(pw, cm.ie, eta, rng, pruneInputBias);
  const cue = cueIdx >= 0 ? cm.memories[cueIdx]!.cue : ZERO_CUE(cm.cfg.nin);
  const net: MiniMLP = { ...cm.ie, w: pw };
  mlpForward(net, cue, hid, out);
  const { dist, index } = nearestMemoryDist(cm, out);
  const plaus = critique(cm, out);
  const emission: Emission =
    dist < 0.35
      ? 'recall'
      : saturation(out, cm.cfg.nout) > 0.9 || plaus < 0.5
        ? 'noise'
        : 'confabulation';
  return { emission, dist, memIndex: index, plaus };
}

let _zero: Float32Array | null = null;
function ZERO_CUE(n: number): Float32Array {
  if (!_zero || _zero.length !== n) _zero = new Float32Array(n);
  return _zero;
}

/** M1 — GLORY REGIME (the confabulation sweet-spot / critical Ξ). Sweep perturbation η; the confabulation
 *  rate must be an INVERTED-U with an interior peak (rote recall below, noise above). This is Thaler's
 *  central empirical claim (memory-turnover peaks at a critical mean perturbation). */
export interface GloryResult {
  etas: number[];
  recallRate: number[];
  confabRate: number[];
  noiseRate: number[];
  peakEta: number;
  peakConfab: number;
  /** true iff confab rate rises then falls (interior maximum, not at either end) — the "sweet spot". */
  hasInteriorPeak: boolean;
}
export function gloryRegimeSweep(cm: CreativityMachine, rng: Rng, trials = 120): GloryResult {
  const etas = [0.05, 0.15, 0.3, 0.5, 0.7, 0.9, 1.2, 1.6, 2.2, 3.0];
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  const recallRate: number[] = [];
  const confabRate: number[] = [];
  const noiseRate: number[] = [];
  for (const eta of etas) {
    let r = 0,
      c = 0,
      n = 0;
    for (let t = 0; t < trials; t++) {
      const e = emit(cm, eta, t % cm.memories.length, rng, 0, pw, hid, out);
      if (e.emission === 'recall') r++;
      else if (e.emission === 'confabulation') c++;
      else n++;
    }
    recallRate.push(r / trials);
    confabRate.push(c / trials);
    noiseRate.push(n / trials);
  }
  let peakI = 0;
  for (let i = 1; i < confabRate.length; i++)
    if ((confabRate[i] ?? 0) > (confabRate[peakI] ?? 0)) peakI = i;
  const hasInteriorPeak =
    peakI > 0 &&
    peakI < confabRate.length - 1 &&
    (confabRate[peakI] ?? 0) > (confabRate[0] ?? 0) &&
    (confabRate[peakI] ?? 0) > (confabRate[confabRate.length - 1] ?? 0);
  return {
    etas,
    recallRate,
    confabRate,
    noiseRate,
    peakEta: etas[peakI] ?? 0,
    peakConfab: confabRate[peakI] ?? 0,
    hasInteriorPeak,
  };
}

/** M2 — NEAR-DEATH LIFE-REVIEW cascade. As damage ramps 0→1, the ordering must be: distinct-memory
 *  COVERAGE peaks (life review) BEFORE novelty (confabulation) peaks BEFORE collapse to noise. */
export interface LifeReviewResult {
  coveragePeakDamage: number;
  noveltyPeakDamage: number;
  collapseDamage: number;
  /** true iff coverage-peak < novelty-peak < collapse — Thaler's three-phase death signature. */
  orderingHolds: boolean;
}
export function lifeReviewCascade(
  cm: CreativityMachine,
  rng: Rng,
  steps = 16,
  perStep = 40,
): LifeReviewResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  let covPeakD = 0,
    covPeak = -1;
  let novPeakD = 0,
    novPeak = -1;
  let collapseD = 1;
  for (let s = 0; s < steps; s++) {
    const damage = ((s + 1) / steps) * 3.0; // η up to 3.0
    const seen = new Set<number>();
    let confab = 0,
      noise = 0;
    for (let t = 0; t < perStep; t++) {
      const e = emit(cm, damage, t % cm.memories.length, rng, 0, pw, hid, out);
      if (e.emission === 'recall') seen.add(e.memIndex);
      else if (e.emission === 'confabulation') confab++;
      else noise++;
    }
    const coverage = seen.size / cm.memories.length;
    const novelty = confab / perStep;
    const nz = noise / perStep;
    const d = (s + 1) / steps;
    if (coverage > covPeak) {
      covPeak = coverage;
      covPeakD = d;
    }
    if (novelty > novPeak) {
      novPeak = novelty;
      novPeakD = d;
    }
    if (nz > 0.6 && collapseD === 1) collapseD = d; // first heavy-noise step
  }
  const orderingHolds = covPeakD <= novPeakD && novPeakD <= collapseD;
  return {
    coveragePeakDamage: covPeakD,
    noveltyPeakDamage: novPeakD,
    collapseDamage: collapseD,
    orderingHolds,
  };
}

/** Coefficient of variation of an interval series (std/mean); 0 if too few. */
function cvOf(intervals: number[]): number {
  if (intervals.length < 3) return 0;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean < 1e-9) return 0;
  const varr = intervals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / intervals.length;
  return Math.sqrt(varr) / mean;
}

/** M3 — EMISSION RHYTHM / prosody. WITHIN one creative-band stream, memories emit at "an even, linear,
 *  rapid clip" while confabulations arrive "sporadic and slow" (Thaler 2014). So the CV of confabulation
 *  inter-arrival intervals must exceed the CV of memory inter-arrival intervals — a direct within-run test
 *  of his prosody claim (no rare-event artifact from comparing separate bands). */
export interface RhythmResult {
  memoryCV: number;
  confabCV: number;
  rhythmShifts: boolean;
}
export function emissionRhythm(cm: CreativityMachine, rng: Rng, ticks = 800): RhythmResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  const memI: number[] = [];
  const confI: number[] = [];
  let lastMem = -1,
    lastConf = -1;
  for (let t = 0; t < ticks; t++) {
    // recall-DOMINANT band (region A→B): each cue reliably returns its memory, so memory emissions are
    // near-periodic (even, rapid clip → low CV); confabulations are the rare, sporadic interruptions (high
    // CV). This is the cleanest form of Thaler's prosody claim — memories regular, confabulations tentative.
    const e = emit(cm, 0.16, t % cm.memories.length, rng, 0, pw, hid, out);
    if (e.emission === 'recall') {
      if (lastMem >= 0) memI.push(t - lastMem);
      lastMem = t;
    } else if (e.emission === 'confabulation') {
      if (lastConf >= 0) confI.push(t - lastConf);
      lastConf = t;
    }
  }
  const memoryCV = cvOf(memI);
  const confabCV = cvOf(confI);
  return { memoryCV, confabCV, rhythmShifts: confabCV > memoryCV };
}

/** M4 — VIRTUAL INPUT / cognitive tunneling. With input clamped to ZERO, biasing damage toward the
 *  input-layer weights makes full stored memories appear from nothing (the intact hidden/output layers
 *  pattern-complete the zeros). Virtual-recall frequency must RISE with the input-prune bias (1995). */
export interface VirtualInputResult {
  biases: number[];
  virtualRecall: number[];
  rises: boolean;
}
export function virtualInput(cm: CreativityMachine, rng: Rng, trials = 400): VirtualInputResult {
  const biases = [0, 0.5, 1.0, 1.5, 2.0];
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  const virtualRecall: number[] = [];
  for (const b of biases) {
    let recalls = 0;
    for (let t = 0; t < trials; t++) {
      // moderate perturbation + null input: the intact hidden/output layers must pattern-complete the
      // starved (increasingly zeroed) input into a full stored memory — a "virtual input".
      const e = emit(cm, 0.6, -1 /* null input */, rng, b, pw, hid, out);
      if (e.emission === 'recall') recalls++;
    }
    virtualRecall.push(recalls / trials);
  }
  // least-squares slope over the bias sweep — a robust "rises" test (not just endpoint compare).
  const n = biases.length;
  const mx = biases.reduce((a, b) => a + b, 0) / n;
  const my = virtualRecall.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += ((biases[i] ?? 0) - mx) * ((virtualRecall[i] ?? 0) - my);
    den += ((biases[i] ?? 0) - mx) ** 2;
  }
  const slope = den < 1e-9 ? 0 : num / den;
  return { biases, virtualRecall, rises: slope > 0 };
}

/** M5 — HOT-BUTTON AFFECT (synthetic feeling, CAUSAL). Confabulations that resonate with a hot-button
 *  memory receive a valence bonus that must give them measurably HIGHER reinforcement than valence-neutral
 *  confabulations of comparable plausibility — "affect provably steers what is learned" (Thaler's feeling
 *  as chain-reinforcement, not a posited quale). */
export interface HotButtonResult {
  hotReinforce: number;
  neutralReinforce: number;
  /** true iff hot-resonant ideas are reinforced more than neutral ones (a reinforcement asymmetry). */
  affectSteersLearning: boolean;
  hotCount: number;
  neutralCount: number;
}
export function hotButtonAffect(
  cm: CreativityMachine,
  rng: Rng,
  ticks = 600,
  valence = 0.5,
): HotButtonResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  let hotSum = 0,
    hotN = 0,
    neuSum = 0,
    neuN = 0;
  for (let t = 0; t < ticks; t++) {
    const e = emit(cm, 1.2, t % cm.memories.length, rng, 0, pw, hid, out);
    if (e.emission !== 'confabulation') continue;
    // reinforcement = the AAC valuation ("feeling of value"), PLUS a hot-button valence bonus when the
    // idea's nearest memory is a hot button (the chain "recruited a hot-button net").
    const isHot = cm.hot[e.memIndex] === true;
    const reinforce = e.plaus + (isHot ? valence : 0);
    if (isHot) {
      hotSum += reinforce;
      hotN++;
    } else {
      neuSum += reinforce;
      neuN++;
    }
  }
  const hotReinforce = hotN > 0 ? hotSum / hotN : 0;
  const neutralReinforce = neuN > 0 ? neuSum / neuN : 0;
  return {
    hotReinforce,
    neutralReinforce,
    affectSteersLearning: hotN > 0 && neuN > 0 && hotReinforce > neutralReinforce,
    hotCount: hotN,
    neutralCount: neuN,
  };
}

/** M6 — REENTRANT CONTEMPLATION. The critic modulates the generator's perturbation (raise η when stale,
 *  lower η when a good vein is found). The closed loop must sustain a HIGHER mean confabulation rate than
 *  the average fixed-η open loop — self-modulation finds and dwells in the glory band ("one net governs the
 *  synaptic noise injected into another based upon its appraisal"). */
export interface ReentrantResult {
  closedLoopConfab: number;
  openLoopMeanConfab: number;
  feedbackHelps: boolean;
}
export function reentrantContemplation(
  cm: CreativityMachine,
  rng: Rng,
  ticks = 500,
): ReentrantResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  // closed loop: η adapts to keep outputs in the plausible-but-novel band.
  let eta = 0.6;
  let confabClosed = 0;
  for (let t = 0; t < ticks; t++) {
    const e = emit(cm, eta, t % cm.memories.length, rng, 0, pw, hid, out);
    if (e.emission === 'confabulation') confabClosed++;
    // appraisal → next η (Thaler: the critic governs the noise injected into the generator). SMALL steps so
    // the loop settles into the glory band instead of bouncing: recall (too calm) nudges η up, noise (too
    // chaotic) nudges η down, confabulation (a good vein) HOLDS. Small gain ⇒ stable dwell.
    if (e.emission === 'recall') eta = Math.min(3.0, eta + 0.03);
    else if (e.emission === 'noise') eta = Math.max(0.1, eta - 0.03);
  }
  // open loop: average confab rate over a grid of FIXED η (a blind controller's expected performance — it
  // does not know where the glory band is, so it pays the average over the range). The contemplative loop
  // that FINDS the band should beat this expectation.
  const grid = [0.15, 0.5, 1.0, 1.6, 2.4];
  let openTotal = 0;
  for (const g of grid) {
    let c = 0;
    for (let t = 0; t < ticks; t++) {
      const e = emit(cm, g, t % cm.memories.length, rng, 0, pw, hid, out);
      if (e.emission === 'confabulation') c++;
    }
    openTotal += c / ticks;
  }
  const closedLoopConfab = confabClosed / ticks;
  const openLoopMeanConfab = openTotal / grid.length;
  return {
    closedLoopConfab,
    openLoopMeanConfab,
    feedbackHelps: closedLoopConfab > openLoopMeanConfab,
  };
}

/** Multi-scale rescaled-range (R/S) Hurst exponent of a series — deterministic. H≈0.5 white/Poisson;
 *  H>0.5 persistent long-range-correlated (Thaler's "fractal" stream). */
export function hurstExponent(series: readonly number[]): number {
  const n = series.length;
  if (n < 16) return 0.5;
  const rs = (seg: number[]): number => {
    const m = seg.reduce((a, b) => a + b, 0) / seg.length;
    let cum = 0,
      mn = Infinity,
      mx = -Infinity,
      v = 0;
    for (const x of seg) {
      cum += x - m;
      if (cum < mn) mn = cum;
      if (cum > mx) mx = cum;
      v += (x - m) * (x - m);
    }
    const s = Math.sqrt(v / seg.length);
    return s < 1e-9 ? 0 : (mx - mn) / s;
  };
  const sizes: number[] = [];
  const logRS: number[] = [];
  for (let w = 8; w <= n; w *= 2) {
    let acc = 0,
      cnt = 0;
    for (let i = 0; i + w <= n; i += w) {
      const r = rs(series.slice(i, i + w));
      if (r > 0) {
        acc += r;
        cnt++;
      }
    }
    if (cnt > 0) {
      sizes.push(Math.log(w));
      logRS.push(Math.log(acc / cnt));
    }
  }
  if (sizes.length < 2) return 0.5;
  // least-squares slope of log(R/S) vs log(window) = Hurst.
  const mx = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const my = logRS.reduce((a, b) => a + b, 0) / logRS.length;
  let num = 0,
    den = 0;
  for (let i = 0; i < sizes.length; i++) {
    num += ((sizes[i] ?? 0) - mx) * ((logRS[i] ?? 0) - my);
    den += ((sizes[i] ?? 0) - mx) ** 2;
  }
  return den < 1e-9 ? 0.5 : num / den;
}

/** M7 — FRACTAL RHYTHM (Thaler's quantitative "proof"): the ideation stream's inter-emission intervals are
 *  fractal (long-range-correlated), NOT Poisson white — the fingerprint he claims matches a human stream of
 *  consciousness. Measured by the Hurst exponent of the novel-emission interval series. */
export interface FractalResult {
  hurst: number;
  /** true iff H departs from 0.5 (structured temporal clustering, not memoryless). */
  isFractal: boolean;
  samples: number;
}
export function fractalRhythm(cm: CreativityMachine, rng: Rng, ticks = 2048): FractalResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  // reentrant stream (the real "stream of consciousness"): η self-modulates with SMALL steps, so
  // confabulations cluster into bursts separated by lulls — the long-range temporal correlation Thaler
  // reads as fractal cadence. A long run gives a stable Hurst estimate.
  let eta = 0.6;
  const intervals: number[] = [];
  let last = -1;
  for (let t = 0; t < ticks; t++) {
    const e = emit(cm, eta, t % cm.memories.length, rng, 0, pw, hid, out);
    if (e.emission === 'confabulation') {
      if (last >= 0) intervals.push(t - last);
      last = t;
      // hold η on a good vein (dwell) → clustered emissions → long-range temporal correlation.
    } else if (e.emission === 'recall') eta = Math.min(3.0, eta + 0.03);
    else eta = Math.max(0.1, eta - 0.03);
  }
  const hurst = hurstExponent(intervals);
  // PERSISTENT (H>0.5) with a noise-floor margin — long-range temporal correlation, not memoryless white
  // noise. Modest at mini-scale (H≈0.55-0.6), but consistently on the persistent side (Thaler's fractal
  // cadence). The margin (~1 standard error for a run this long) keeps it above the estimator's noise floor.
  return { hurst, isFractal: hurst > 0.54, samples: intervals.length };
}

/** M8 — BOOTSTRAPPING (US 7,454,388): with critic feedback ON, an accepted confabulation is absorbed as a
 *  new memory and the mean critic score of the stream TRENDS UP over epochs; with feedback OFF it does not.
 *  Self-improvement = the loop is generative, not a static noise source. */
export interface BootstrapResult {
  scoreTrendOn: number;
  scoreTrendOff: number;
  bootstraps: boolean;
}
export function bootstrapping(
  cm: CreativityMachine,
  rng: Rng,
  epochs = 10,
  perEpoch = 120,
): BootstrapResult {
  const trend = (learn: boolean): number => {
    // clone the IE so learning does not mutate the shared machine.
    const ie: MiniMLP = { ...cm.ie, w: Float32Array.from(cm.ie.w) };
    const work: CreativityMachine = { ...cm, ie };
    const pw = new Float32Array(ie.w.length);
    const hid = new Float32Array(ie.nhid);
    const out = new Float32Array(ie.nout);
    const epochScore: number[] = [];
    for (let ep = 0; ep < epochs; ep++) {
      let sum = 0;
      for (let t = 0; t < perEpoch; t++) {
        const e = emit(work, 1.2, t % work.memories.length, rng, 0, pw, hid, out);
        sum += e.plaus;
        if (learn && e.emission === 'confabulation' && e.plaus > 0.6) {
          // absorb the accepted confabulation as a memory: SGD steps of the IE toward its own output
          // (US 7,454,388 — the critic's approval sets the learning that commits the pattern to memory).
          mlpTrain(
            ie,
            [{ x: work.memories[t % work.memories.length]!.cue, y: Float32Array.from(out) }],
            3,
            0.1,
          );
        }
      }
      epochScore.push(sum / perEpoch);
    }
    // slope of mean-score vs epoch (least squares).
    const nE = epochScore.length;
    const mx = (nE - 1) / 2;
    const my = epochScore.reduce((a, b) => a + b, 0) / nE;
    let num = 0,
      den = 0;
    for (let i = 0; i < nE; i++) {
      num += (i - mx) * ((epochScore[i] ?? 0) - my);
      den += (i - mx) ** 2;
    }
    return den < 1e-9 ? 0 : num / den;
  };
  const scoreTrendOn = trend(true);
  const scoreTrendOff = trend(false);
  return { scoreTrendOn, scoreTrendOff, bootstraps: scoreTrendOn > scoreTrendOff };
}

/** M9 — CHAINING (DABUS's defining construct). Thaler: "ideas are chains of nets that develop side chains
 *  expressing the consequences of the underlying conceptual backbone"; the stream of consciousness IS chains
 *  materializing and dematerializing. Mini-scale analog: feed each thought's OUTPUT back as the next
 *  thought's cue, so one confabulation SEEDS the next — an associative cascade that should sustain coherence
 *  LONGER than unlinked random cueing. HONEST CAVEAT: chaining is fundamentally a SWARM-scale construct
 *  (DABUS is "a swarm of many disconnected nets" that link/unlink) — a SINGLE 6→6→4 net reproduces it only
 *  WEAKLY (~5/8 seeds), which is itself a faithful finding: this phenomenon wants many nets, not one. So it
 *  tiers as 'present'/'marginal', not robust — reported honestly, not forced. Deterministic. */
export interface ChainResult {
  /** Mean coherent-cascade length with associative feedback (output → next cue). */
  chainedLen: number;
  /** Mean coherent-cascade length with RANDOM cueing each step (no associative link — the null). */
  randomLen: number;
  /** Mean confabulations carried down a feedback chain (novel ideas that propagated). */
  chainConfabs: number;
  /** true iff associative feedback sustains a LONGER coherent chain than unlinked random cueing — one
   *  thought genuinely seeds the next (a propagating cascade), not independent samples. */
  chains: boolean;
}
export function chaining(
  cm: CreativityMachine,
  rng: Rng,
  runs = 120,
  maxLen = 24,
  eta = 0.28,
): ChainResult {
  const pw = new Float32Array(cm.ie.w.length);
  const hid = new Float32Array(cm.ie.nhid);
  const out = new Float32Array(cm.ie.nout);
  const cue = new Float32Array(cm.cfg.nin);
  // one cascade from seed `s0`; `feedback` = the thought's output steers the next cue (associative link)
  // vs a RANDOM cue each step (no link). Returns the coherent run length + confabulations propagated.
  const cascade = (s0: number, feedback: boolean): { len: number; confabs: number } => {
    const seed = cm.memories[s0]!.cue;
    cue.set(seed);
    let len = 0,
      confabs = 0;
    for (let s = 0; s < maxLen; s++) {
      perturbWeights(pw, cm.ie, eta, rng, 0);
      const net: MiniMLP = { ...cm.ie, w: pw };
      mlpForward(net, cue, hid, out);
      const { dist } = nearestMemoryDist(cm, out);
      const sat = saturation(out, cm.cfg.nout);
      const plaus = critique(cm, out);
      const coherent = dist < 0.35 || (sat <= 0.9 && plaus >= 0.5);
      if (!coherent) break; // the chain hit noise and dissolved
      if (dist >= 0.35) confabs++;
      len++;
      if (feedback) {
        // the output becomes the next cue (anchored to the seed so it drifts, not explodes) — the link.
        for (let i = 0; i < cm.cfg.nin; i++)
          cue[i] = Math.tanh((seed[i] ?? 0) * 0.5 + (out[i % cm.cfg.nout] ?? 0) * 0.7);
      } else {
        // null: an unrelated RANDOM cue each step — thoughts do not connect.
        for (let i = 0; i < cm.cfg.nin; i++) cue[i] = rng() * 2 - 1;
      }
    }
    return { len, confabs };
  };
  let cl = 0,
    rl = 0,
    cc = 0;
  for (let r = 0; r < runs; r++) {
    const s0 = r % cm.memories.length;
    const c = cascade(s0, true);
    const b = cascade(s0, false);
    cl += c.len;
    cc += c.confabs;
    rl += b.len;
  }
  const chainedLen = cl / runs;
  const randomLen = rl / runs;
  return { chainedLen, randomLen, chainConfabs: cc / runs, chains: chainedLen > randomLen };
}

/** One constitutive marker's verdict, aggregated over an ENSEMBLE of mini brains (a single 70-param net is
 *  noisy; the phenomenon is a population regularity — and this world runs a whole population of them). */
export interface ThalerMarker {
  id: string;
  name: string;
  /** true iff the phenomenon held in the MAJORITY of the ensemble. */
  met: boolean;
  /** fraction of the ensemble in which it held (0..1) — the honest strength of the effect at this scale. */
  passFraction: number;
  /** robust (≥0.8 of ensemble), present (majority), or marginal (minority) at 70-param scale. */
  tier: 'robust' | 'present' | 'marginal';
  /** mean effect size across the ensemble. */
  value: number;
  criterion: string;
}

/** The full "prove consciousness Thaler's way" verdict — how many of his constitutive markers a population
 *  of mini hybrid brains reproduces, and how strongly. NOT a claim of phenomenal consciousness (header). */
export interface ThalerVerdict {
  markers: ThalerMarker[];
  /** markers reproduced in the majority of the ensemble. */
  markersMet: number;
  /** markers reproduced ROBUSTLY (≥80% of the ensemble). */
  markersRobust: number;
  totalMarkers: number;
  /** Thaler treats the set as jointly constitutive; this is the mean pass-fraction across all markers. */
  fraction: number;
  ensemble: number;
}

/** Build an ENSEMBLE of mini Creativity Machines and run the entire Thaler proof protocol, aggregating each
 *  marker over the population. Deterministic given `rng`. The headline question: does a population of
 *  70-param mini hybrid brains reproduce Thaler's constitutive markers of sentience, and how robustly?
 *  O(ensemble · a few hundred-k tiny forward passes) — an offline measurement pass, never the frame path. */
export function runThalerProof(rng: Rng, cfg: CMConfig = DEFAULT_CM, ensemble = 8): ThalerVerdict {
  const defs = [
    {
      id: 'glory',
      name: 'Confabulation sweet-spot (critical Ξ)',
      criterion: 'confab-rate is an inverted-U with an interior peak',
      run: (cm: CreativityMachine, r: Rng) => {
        const g = gloryRegimeSweep(cm, r);
        return { met: g.hasInteriorPeak, value: g.peakConfab };
      },
    },
    {
      id: 'life-review',
      name: 'Near-death life-review cascade',
      criterion: 'coverage-peak ≤ novelty-peak ≤ collapse (3-phase death)',
      run: (cm: CreativityMachine, r: Rng) => {
        const l = lifeReviewCascade(cm, r);
        return { met: l.orderingHolds, value: l.noveltyPeakDamage };
      },
    },
    {
      id: 'rhythm',
      name: 'Prosody shift (memory→confabulation)',
      criterion: 'confabulation inter-arrival CV exceeds memory CV (sporadic vs even)',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = emissionRhythm(cm, r);
        return { met: x.rhythmShifts, value: x.confabCV - x.memoryCV };
      },
    },
    {
      id: 'virtual-input',
      name: 'Virtual input / cognitive tunneling',
      criterion: 'null-input recall rises with input-prune bias',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = virtualInput(cm, r);
        return { met: x.rises, value: x.virtualRecall[x.virtualRecall.length - 1] ?? 0 };
      },
    },
    {
      id: 'hot-button',
      name: 'Hot-button affect (synthetic feeling)',
      criterion: 'hot-resonant ideas reinforced > neutral (affect steers learning)',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = hotButtonAffect(cm, r);
        return { met: x.affectSteersLearning, value: x.hotReinforce - x.neutralReinforce };
      },
    },
    {
      id: 'reentrant',
      name: 'Reentrant contemplation',
      criterion: 'critic→η self-modulation beats mean fixed-η open loop',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = reentrantContemplation(cm, r);
        return { met: x.feedbackHelps, value: x.closedLoopConfab - x.openLoopMeanConfab };
      },
    },
    {
      id: 'fractal',
      name: 'Fractal rhythm fingerprint',
      criterion: 'Hurst of ideation intervals is persistent (>0.5), not Poisson',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = fractalRhythm(cm, r);
        return { met: x.isFractal, value: x.hurst };
      },
    },
    {
      id: 'bootstrap',
      name: 'Bootstrapping self-improvement',
      criterion: 'critic score trends up with feedback ON vs OFF',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = bootstrapping(cm, r);
        return { met: x.bootstraps, value: x.scoreTrendOn - x.scoreTrendOff };
      },
    },
    {
      id: 'chaining',
      name: 'Associative chaining (swarm-scale)',
      criterion:
        'a thought seeds the next — feedback sustains a longer coherent chain than random cueing (weak on a single net; Thaler’s swarm construct)',
      run: (cm: CreativityMachine, r: Rng) => {
        const x = chaining(cm, r);
        return { met: x.chains, value: x.chainedLen - x.randomLen };
      },
    },
  ];
  const passes = defs.map(() => 0);
  const values = defs.map(() => 0);
  for (let e = 0; e < ensemble; e++) {
    const cm = buildCreativityMachine(rng, cfg);
    for (let d = 0; d < defs.length; d++) {
      const res = defs[d]!.run(cm, rng);
      if (res.met) passes[d] = (passes[d] ?? 0) + 1;
      values[d] = (values[d] ?? 0) + res.value;
    }
  }
  const markers: ThalerMarker[] = defs.map((def, d) => {
    const passFraction = (passes[d] ?? 0) / ensemble;
    const tier: ThalerMarker['tier'] =
      passFraction >= 0.8 ? 'robust' : passFraction > 0.5 ? 'present' : 'marginal';
    return {
      id: def.id,
      name: def.name,
      met: passFraction > 0.5,
      passFraction,
      tier,
      value: (values[d] ?? 0) / ensemble,
      criterion: def.criterion,
    };
  });
  const markersMet = markers.reduce((a, m) => a + (m.met ? 1 : 0), 0);
  const markersRobust = markers.reduce((a, m) => a + (m.tier === 'robust' ? 1 : 0), 0);
  const fraction = markers.reduce((a, m) => a + m.passFraction, 0) / markers.length;
  return { markers, markersMet, markersRobust, totalMarkers: markers.length, fraction, ensemble };
}
