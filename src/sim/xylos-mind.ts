// Audit #185 (honesty, documented): measured: the learned action/forecast/attention models do not improve foraging on the synthetic field (0.47-0.49 for all ablations).
/**
 * Xylos: a bounded, tokenless recurrent manifold with autonomous numeric sensing/action.
 * Eshkol's MIT workspace softmax primitive supplies competition (see global-workspace.ts
 * and THIRD-PARTY-NOTICES.md). The other mechanisms are owned experimental adaptations.
 * Computational mechanisms are research evidence, never a consciousness certification.
 */
import { gwtSoftmax } from '../math/global-workspace';
import { mulberry32, type Rng } from '../math/rng';

/** Numeric environmental observations; no language, prompts, or tokenization. */
export interface XylosPercept {
  nutrient: number;
  hazard: number;
  signal: number;
  gradientX: number;
  gradientZ: number;
}

/** Controlled interventions; false disables use of a mechanism, not unrelated random draws. */
export interface XylosOptions {
  recurrence?: boolean;
  broadcast?: boolean;
  plasticity?: boolean;
  metacognition?: boolean;
  attentionModel?: boolean;
  actionModel?: boolean;
  /** Shared adaptation multiplier in [0,1]; zero is the frozen-learning control. */
  learningRate?: number;
}

/** Stable borrowed telemetry. Consumers must not mutate these arrays or retain them as snapshots. */
export interface XylosView {
  tick: number;
  x: number;
  z: number;
  phase: number;
  coherence: number;
  predictionError: number;
  confidence: number;
  energy: number;
  valence: number;
  pulse: number;
  attention: number;
  workspaceWinner: number;
  workspace: Float32Array;
  activity: Float32Array;
  coordinates: Float32Array;
  sources: Uint16Array;
  weights: Float32Array;
  rewires: number;
  /** Two admitted specialists; all other workspace components are zero. */
  admitted: Int8Array;
  /** Continuous soft-thresholded specialist codes, not phenomenal qualities. */
  quality: Float32Array;
  /** Actual selected heading, among eight equally spaced motor directions. */
  action: number;
  /** EMA of action-conditioned sensory-delta prediction error. */
  modelError: number;
  /** One-step categorical attention prediction error. */
  attentionError: number;
  /** Current learned forecast and reliability for six perceptual channels. */
  prediction: Float32Array;
  reliability: Float32Array;
}

const N = 48;
const GROUPS = 6;
const EDGES = N * 4;
const TAU = Math.PI * 2;
const DX = new Float32Array([
  1,
  Math.SQRT1_2,
  0,
  -Math.SQRT1_2,
  -1,
  -Math.SQRT1_2,
  0,
  Math.SQRT1_2,
]);
const DZ = new Float32Array([
  0,
  Math.SQRT1_2,
  1,
  Math.SQRT1_2,
  0,
  -Math.SQRT1_2,
  -1,
  -Math.SQRT1_2,
]);
const bound = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const inRange = (v: number, lo: number, hi: number): boolean =>
  Number.isFinite(v) && v >= lo && v <= hi;

/** Single-owner neural state; 48 foci, 192 directed plastic edges, six specialist groups. */
export class XylosMind {
  readonly view: XylosView;
  private readonly rng: Rng;
  private readonly options: Required<XylosOptions>;
  private readonly next = new Float32Array(N);
  private readonly observations = new Float32Array(GROUPS);
  private readonly previous = new Float32Array(GROUPS);
  private readonly percepts = new Float32Array(GROUPS);
  private readonly residual = new Float32Array(GROUPS);
  private readonly variance = new Float32Array(GROUPS).fill(0.1);
  private readonly slopes = new Float32Array(GROUPS).fill(0.8);
  private readonly intercepts = new Float32Array(GROUPS).fill(0.1);
  private readonly salience = new Float32Array(GROUPS);
  private readonly competition = new Float32Array(GROUPS);
  private readonly broadcastInput = new Float32Array(GROUPS);
  private readonly broadcastMap = new Float32Array(GROUPS * GROUPS);
  private readonly attentionTransitions = new Float32Array(GROUPS * GROUPS).fill(1 / GROUPS);
  private readonly attentionForecast = new Float32Array(GROUPS).fill(1 / GROUPS);
  private readonly actionWeights = new Float32Array(8 * 3 * 6);
  private readonly actionForecast = new Float32Array(8 * 3);
  private readonly lastFeatures = new Float32Array(6);
  private readonly features = new Float32Array(6);
  private readonly visits = new Uint32Array(8);
  private readonly rewards = new Float32Array(8);
  private lastAttention = 0;
  private velocityX = 0;
  private velocityZ = 0;

  constructor(seed: number, options: XylosOptions = {}) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
      throw new RangeError('Xylos seed must be a uint32');
    const learningRate = options.learningRate ?? 1;
    if (!inRange(learningRate, 0, 1)) throw new RangeError('Xylos learning rate must be in [0,1]');
    this.options = {
      recurrence: options.recurrence ?? true,
      broadcast: options.broadcast ?? true,
      plasticity: options.plasticity ?? true,
      metacognition: options.metacognition ?? true,
      attentionModel: options.attentionModel ?? true,
      actionModel: options.actionModel ?? true,
      learningRate,
    };
    this.rng = mulberry32(seed);
    this.view = {
      tick: 0,
      x: 0.18,
      z: 0.12,
      phase: 0,
      coherence: 0,
      predictionError: 0,
      confidence: 0.5,
      energy: 0.65,
      valence: 0,
      pulse: 0,
      attention: 0,
      workspaceWinner: 0,
      workspace: new Float32Array(GROUPS),
      activity: new Float32Array(N),
      coordinates: new Float32Array(N * 2),
      sources: new Uint16Array(EDGES),
      weights: new Float32Array(EDGES),
      rewires: 0,
      admitted: new Int8Array([0, 1]),
      quality: new Float32Array(GROUPS),
      action: 0,
      modelError: 0,
      attentionError: 0,
      prediction: new Float32Array(GROUPS).fill(0.5),
      reliability: new Float32Array(GROUPS).fill(0.5),
    };
    // Every typed-array index below is bounded by its declared dimension.
    for (let i = 0; i < N; i++) {
      const angle = i * 2.3999632297 + this.rng() * 0.3;
      const r = 0.25 + this.rng() * 0.45;
      this.view.coordinates[2 * i] = r * Math.cos(angle);
      this.view.coordinates[2 * i + 1] = r * Math.sin(angle);
      this.view.activity[i] = (this.rng() - 0.5) * 0.2;
      for (let j = 0; j < 4; j++) {
        const e = i * 4 + j;
        this.view.sources[e] = (i + 1 + j * 11) % N;
        this.view.weights[e] = (this.rng() - 0.35) * 0.8;
      }
    }
    for (let g = 0; g < GROUPS; g++)
      for (let h = 0; h < GROUPS; h++)
        this.broadcastMap[g * GROUPS + h] = 0.2 + 0.12 * Math.cos((g + 1) * (h + 1));
  }

  /**
   * One 20 Hz cognition beat. O(N×4 + 6² + 8×3×6), fixed memory, no hot allocations.
   * Invalid inputs are rejected atomically before recurrence, learning or RNG consumption.
   */
  tick(percept: XylosPercept, noise = 0): XylosView {
    if (
      !percept ||
      !inRange(percept.nutrient, 0, 1) ||
      !inRange(percept.hazard, 0, 1) ||
      !inRange(percept.signal, 0, 1) ||
      !inRange(percept.gradientX, -1, 1) ||
      !inRange(percept.gradientZ, -1, 1) ||
      !inRange(noise, -1, 1)
    )
      throw new RangeError('Xylos requires finite, bounded percepts and noise');
    const v = this.view;
    const lr = this.options.learningRate;
    this.observations[0] = percept.nutrient;
    this.observations[1] = percept.hazard;
    this.observations[2] = percept.signal;
    this.observations[3] = 0.5 + 0.5 * percept.gradientX;
    this.observations[4] = 0.5 + 0.5 * percept.gradientZ;
    this.observations[5] = v.energy;
    this.learnConsequences(lr);
    let errorSum = 0,
      confidenceSum = 0;
    // Residuals compare yesterday's forecast to today's observation, before updating the model.
    for (let g = 0; g < GROUPS; g++) {
      const observed = this.observations[g]!;
      const error = observed - v.prediction[g]!;
      this.residual[g] = error;
      this.variance[g] = bound(this.variance[g]! + 0.08 * lr * (error * error - this.variance[g]!));
      const reliability = 1 / (1 + 12 * this.variance[g]!);
      v.reliability[g] = reliability;
      const gain = this.options.metacognition ? reliability : 1;
      this.percepts[g] = bound(0.35 * this.percepts[g]! + 0.65 * (v.prediction[g]! + gain * error));
      const rate = (0.16 * lr) / (1 + this.previous[g]! ** 2);
      this.slopes[g] = bound(this.slopes[g]! + rate * error * this.previous[g]!, -1, 1);
      this.intercepts[g] = bound(this.intercepts[g]! + rate * error, -1, 1);
      v.prediction[g] = bound(this.slopes[g]! * observed + this.intercepts[g]!);
      errorSum += Math.abs(error);
      confidenceSum += reliability;
      let broadcast = 0;
      for (let h = 0; h < GROUPS; h++)
        broadcast += v.workspace[h]! * this.broadcastMap[g * GROUPS + h]!;
      this.broadcastInput[g] = this.options.broadcast ? broadcast : 0;
    }
    v.predictionError = errorSum / GROUPS;
    v.confidence = confidenceSum / GROUPS;
    v.phase = (v.phase + 0.061 + 0.012 * noise + 0.006 * v.predictionError) % TAU;
    v.quality.fill(0);
    let sum = 0,
      magnitude = 0;
    for (let i = 0; i < N; i++) {
      const g = Math.floor(i / 8);
      let recurrent = 0;
      for (let j = 0; j < 4; j++) {
        const e = i * 4 + j,
          source = v.sources[e]!;
        const attenuation = this.edgeAttenuation(i, source);
        recurrent += v.activity[source]! * v.weights[e]! * attenuation;
        if (this.options.plasticity)
          v.weights[e] = bound(
            v.weights[e]! +
              0.012 *
                lr *
                attenuation *
                (v.activity[i]! * v.activity[source]! - 0.18 * v.weights[e]!),
            -0.9,
            0.9,
          );
      }
      const intrinsic =
        0.2 * Math.sin(v.phase + i * 0.73) + 0.13 * Math.sin(v.phase * 3 + i * 0.31);
      const proposal = Math.tanh(
        (this.options.recurrence ? 0.55 * v.activity[i]! + 0.65 * recurrent : 0) +
          0.62 * (this.percepts[g]! - 0.5) +
          this.broadcastInput[g]! +
          intrinsic +
          0.12 * noise * Math.sin(i * 1.13 + v.phase),
      );
      this.next[i] = proposal;
      v.quality[g]! += proposal / 8;
      sum += proposal;
      magnitude += Math.abs(proposal);
    }
    v.activity.set(this.next);
    v.coherence = magnitude > 1e-8 ? Math.abs(sum) / magnitude : 0;
    this.compete(lr);
    this.chooseAction(percept);
    v.energy = bound(v.energy + 0.007 * percept.nutrient - 0.005 * percept.hazard - 0.002);
    v.valence = bound(percept.nutrient - percept.hazard - 0.3 * v.predictionError, -1, 1);
    v.pulse = bound(0.15 + 0.45 * (0.5 + 0.5 * Math.sin(v.phase * 2)) + (0.3 * magnitude) / N);
    this.previous.set(this.observations);
    this.lastFeatures.set(this.features);
    v.tick++;
    // Fixed cadence and draw count also apply in ablated runs, isolating the intervention.
    if (v.tick % 40 === 0) this.rewire();
    return v;
  }

  /** Poincaré disk geodesic attenuation, O(1); radii stay below .8. */
  private edgeAttenuation(target: number, source: number): number {
    const c = this.view.coordinates;
    const x = c[target * 2]!,
      y = c[target * 2 + 1]!;
    const u = c[source * 2]!,
      w = c[source * 2 + 1]!;
    const d = Math.acosh(
      1 + (2 * ((x - u) ** 2 + (y - w) ** 2)) / ((1 - x * x - y * y) * (1 - u * u - w * w)),
    );
    return 1 / (1 + d);
  }

  /** Two admitted proposals; content is available to every specialist on the next beat. O(6²). */
  private compete(lr: number): void {
    const v = this.view;
    for (let g = 0; g < GROUPS; g++) {
      const code = v.quality[g]!;
      v.quality[g] = Math.sign(code) * Math.max(0, Math.abs(code) - 0.065);
      const need = g === 0 ? 1 - v.energy : g === 1 ? this.observations[1]! : 0.12;
      this.salience[g] =
        Math.abs(this.residual[g]!) +
        0.6 * Math.abs(code) +
        need +
        (this.options.attentionModel ? 0.45 * this.attentionForecast[g]! : 0);
    }
    gwtSoftmax(this.salience, this.competition, GROUPS, 0.28);
    let first = 0,
      second = 1;
    if (this.competition[1]! > this.competition[0]!) {
      first = 1;
      second = 0;
    }
    for (let g = 2; g < GROUPS; g++) {
      if (this.competition[g]! > this.competition[first]!) {
        second = first;
        first = g;
      } else if (this.competition[g]! > this.competition[second]!) second = g;
    }
    v.workspace.fill(0);
    v.admitted[0] = first;
    v.admitted[1] = second;
    v.workspace[first] = bound(v.quality[first]! + 0.4 * this.percepts[first]!, -1, 1);
    v.workspace[second] = bound(v.quality[second]! + 0.4 * this.percepts[second]!, -1, 1);
    v.workspaceWinner = first;
    v.attention = first;
    v.attentionError = 1 - this.attentionForecast[first]!;
    for (let g = 0; g < GROUPS; g++) {
      const index = this.lastAttention * GROUPS + g;
      this.attentionTransitions[index]! +=
        0.12 * lr * ((g === first ? 1 : 0) - this.attentionTransitions[index]!);
      this.attentionForecast[g] = this.attentionTransitions[first * GROUPS + g]!;
    }
    this.lastAttention = first;
  }

  /** Learn action×state→sensory change from the previous action's actual outcome. O(3×6). */
  private learnConsequences(lr: number): void {
    const v = this.view;
    if (v.tick === 0) return;
    let norm = 1,
      error = 0;
    for (let f = 0; f < 6; f++) norm += this.lastFeatures[f]! ** 2;
    for (let channel = 0; channel < 3; channel++) {
      const delta = this.observations[channel]! - this.previous[channel]!;
      const residual = delta - this.actionForecast[v.action * 3 + channel]!;
      error += Math.abs(residual);
      for (let f = 0; f < 6; f++) {
        const index = (v.action * 3 + channel) * 6 + f;
        this.actionWeights[index] = bound(
          this.actionWeights[index]! + (0.35 * lr * residual * this.lastFeatures[f]!) / norm,
          -1,
          1,
        );
      }
    }
    v.modelError += 0.08 * (error / 3 - v.modelError);
    const reward =
      this.observations[0]! -
      0.8 * this.observations[1]! +
      0.2 * Math.abs(this.observations[2]! - this.previous[2]!);
    this.rewards[v.action]! += 0.1 * lr * (reward - this.rewards[v.action]!);
  }

  /** Model-based goal tradeoffs plus intrinsic exploration choose a bounded motor action. O(8×3×6). */
  private chooseAction(percept: XylosPercept): void {
    const v = this.view;
    this.features[0] = 1;
    this.features[1] = percept.nutrient;
    this.features[2] = percept.hazard;
    this.features[3] = percept.gradientX;
    this.features[4] = percept.gradientZ;
    this.features[5] = percept.signal;
    let best = -Infinity,
      action = 0;
    const hunger = 1.1 + 1.8 * (1 - v.energy);
    const curiosity = 0.08 + 0.3 * v.energy + 0.15 * (1 - v.confidence);
    for (let a = 0; a < 8; a++) {
      for (let channel = 0; channel < 3; channel++) {
        let forecast = 0;
        for (let f = 0; f < 6; f++)
          forecast += this.actionWeights[(a * 3 + channel) * 6 + f]! * this.features[f]!;
        this.actionForecast[a * 3 + channel] = bound(forecast, -1, 1);
      }
      const model = this.options.actionModel
        ? 4 *
          (hunger * this.actionForecast[a * 3]! -
            1.4 * this.actionForecast[a * 3 + 1]! +
            curiosity * Math.abs(this.actionForecast[a * 3 + 2]!))
        : 0;
      const dx = DX[a]!,
        dz = DZ[a]!;
      const boundary =
        Math.max(0, Math.abs(v.x + dx * 0.04) - 0.82) +
        Math.max(0, Math.abs(v.z + dz * 0.04) - 0.82);
      const score =
        model +
        0.25 * this.rewards[a]! +
        0.45 * hunger * (dx * percept.gradientX + dz * percept.gradientZ) +
        curiosity * (dx * Math.cos(v.phase * 0.37) + dz * Math.sin(v.phase * 0.37)) +
        0.12 / Math.sqrt(1 + this.visits[a]!) +
        0.12 * v.activity[a * 6]! -
        12 * boundary;
      if (score > best) {
        best = score;
        action = a;
      }
    }
    v.action = action;
    this.visits[action] = Math.min(1000000, this.visits[action]! + 1);
    const speed = 0.0025 + 0.003 * v.energy;
    this.velocityX = 0.55 * this.velocityX + 0.45 * DX[action]! * speed;
    this.velocityZ = 0.55 * this.velocityZ + 0.45 * DZ[action]! * speed;
    v.x = bound(v.x + this.velocityX, -0.85, 0.85);
    v.z = bound(v.z + this.velocityZ, -0.85, 0.85);
  }

  /** Replace one weak edge with a nearby alternative; topology stays sparse and capped. O(4). */
  private rewire(): void {
    const v = this.view;
    const target = Math.floor(this.rng() * N);
    const candidate = Math.floor(this.rng() * N);
    if (!this.options.plasticity || this.options.learningRate === 0 || candidate === target) return;
    let weakest = target * 4;
    for (let j = 0; j < 4; j++) {
      const e = target * 4 + j;
      if (v.sources[e] === candidate) return;
      if (Math.abs(v.weights[e]!) < Math.abs(v.weights[weakest]!)) weakest = e;
    }
    const previous = v.sources[weakest]!;
    if (this.edgeAttenuation(target, candidate) <= this.edgeAttenuation(target, previous)) return;
    v.sources[weakest] = candidate;
    v.weights[weakest] = 0.12;
    v.rewires++;
  }
}
