/**
 * SHARED TSOTCHKE ORGANISM INTELLIGENCE
 *
 * One deterministic owner folds the external corpus into a stable, bounded signal for every living
 * system. Repository work is O(22) on a slow cadence; consumers read fixed channels in O(1), so a
 * 50,000-organism world never performs O(repositories × organisms) work.
 *
 * The Taylor forecast is a bounded Float64 analogue of Eshkol v1.3.2-evolve's Taylor towers. The
 * exploration sample is a deterministic classical state-vector model adapted from quantum_rng
 * v3.0.1. Neither is native parity, physical quantum entropy, a CSPRNG, consciousness, or sentience.
 */

import { mulberry32 } from '../math/rng';
import { EshkolTaylorJet } from '../math/eshkol-taylor-jet';
import { DeterministicStatevectorRng } from '../math/deterministic-statevector-rng';
import type { OrganismIntelligenceSignal } from '../types';
import { corpusBrainVectorInto, type MutableCorpusBrainVector } from './tsotchke-brain-intake';
import type { TsotchkeRepoSlug } from './tsotchke-registry';

const DEFAULT_CADENCE_FRAMES = 12;
const FORECAST_ORDER = 3;

const clamp01 = (value: number): number =>
  !Number.isFinite(value) || value <= 0 ? 0 : value >= 1 ? 1 : value;

export interface TsotchkeOrganismInput {
  frame: number;
  /** World chaos normalized to [0,1]. */
  chaos: number;
  /** Ordering/heat-death pressure normalized to [0,1]. */
  entropy: number;
  /** Temperature in degrees Celsius; normalized internally. */
  temperature: number;
  population: number;
  capacity: number;
  /** Mean creature metabolic energy normalized to [0,1]. */
  meanMetabolicEnergy: number;
  /** Mean live plant biomass normalized to [0,1]. */
  floraBiomass: number;
}

export interface TsotchkeOrganismIntelligenceOptions {
  enabled?: boolean;
  cadenceFrames?: number;
  /** Fixed at 2..8 by the state-vector model; four qubits keep the shared cadence inexpensive. */
  statevectorQubits?: number;
}

export interface TsotchkeOrganismIntelligenceSnapshot {
  schemaVersion: 1;
  model: 'shared-tsotchke-organism-intelligence';
  indicatorOnly: true;
  seed: number;
  cadenceFrames: number;
  lastFrame: number;
  historyCount: number;
  pressureHistory: number[];
  signal: {
    enabled: boolean;
    revision: number;
    resourcePressure: number;
    threatResponse: number;
    exploration: number;
    socialDrive: number;
    plasticity: number;
    forecast: number;
    confidence: number;
    corpusDrive: number;
    channels: number[];
    integratedRepoCount: number;
    diagnosticAlert: boolean;
  };
  substrate: ReturnType<DeterministicStatevectorRng['snapshot']>;
}

/** Shared field owner. Construct once, call {@link step}, and hand {@link signal} to consumers. */
export class TsotchkeOrganismIntelligence {
  readonly signal: OrganismIntelligenceSignal;

  private readonly seed: number;
  private readonly cadenceFrames: number;
  private readonly statevector: DeterministicStatevectorRng;
  private readonly pressureHistory = new Float64Array(4);
  private readonly coefficients = new Float64Array(FORECAST_ORDER + 1);
  private readonly forecastJet = new EshkolTaylorJet(FORECAST_ORDER);
  private readonly corpusVector: MutableCorpusBrainVector;
  private historyCount = 0;
  private lastFrame = -Infinity;

  constructor(seed: number, options: TsotchkeOrganismIntelligenceOptions = {}) {
    this.seed = seed >>> 0 || 1;
    const cadence = options.cadenceFrames ?? DEFAULT_CADENCE_FRAMES;
    if (!Number.isInteger(cadence) || cadence < 1 || cadence > 600) {
      throw new RangeError(
        `organism-intelligence cadence must be an integer in [1,600], got ${cadence}`,
      );
    }
    this.cadenceFrames = cadence;
    this.statevector = new DeterministicStatevectorRng(
      mulberry32((this.seed ^ 0x51a7_e1d3) >>> 0 || 1),
      {
        qubits: options.statevectorQubits ?? 4,
        evolutionRounds: 1,
        healthWindowBits: 256,
        repetitionCutoff: 32,
      },
    );
    this.signal = {
      enabled: options.enabled ?? true,
      indicatorOnly: true,
      revision: 0,
      resourcePressure: 0,
      threatResponse: 0,
      exploration: 0,
      socialDrive: 0,
      plasticity: 0,
      forecast: 0,
      confidence: 0,
      corpusDrive: 0,
      channels: new Float32Array(4),
      integratedRepoCount: 0,
      diagnosticAlert: false,
    };
    this.corpusVector = { channels: this.signal.channels, drive: 0, repoCount: 0 };
  }

  /** Rebuild an exact deterministic continuation from a low-cadence evidence snapshot. */
  static fromSnapshot(
    snapshot: TsotchkeOrganismIntelligenceSnapshot,
  ): TsotchkeOrganismIntelligence {
    const instance = new TsotchkeOrganismIntelligence(snapshot.seed, {
      enabled: snapshot.signal.enabled,
      cadenceFrames: snapshot.cadenceFrames,
      statevectorQubits: snapshot.substrate.qubits,
    });
    instance.restore(snapshot);
    return instance;
  }

  /** Enable/disable the causal field without replacing the stable signal object. */
  setEnabled(enabled: boolean): void {
    this.signal.enabled = enabled;
    if (!enabled) this.clearSignal();
    // Force the next enabled call to recompute even if it shares the prior frame number.
    this.lastFrame = -Infinity;
  }

  /**
   * Advance on the configured cadence. Returns the same signal object every time.
   * `ablated` is a counterfactual/test hook; fenced/meta rows already contribute zero by registry law.
   */
  step(
    input: TsotchkeOrganismInput,
    ablated?: ReadonlySet<TsotchkeRepoSlug>,
    force = false,
  ): OrganismIntelligenceSignal {
    const frame = Number.isFinite(input.frame) ? Math.max(0, Math.floor(input.frame)) : 0;
    if (!this.signal.enabled) return this.signal;
    if (!force && frame - this.lastFrame < this.cadenceFrames) return this.signal;
    this.lastFrame = frame;

    const chaos = clamp01(input.chaos);
    const entropy = clamp01(input.entropy);
    const population = Math.max(0, Number.isFinite(input.population) ? input.population : 0);
    const capacity = Math.max(1, Number.isFinite(input.capacity) ? input.capacity : 1);
    const crowding = clamp01(population / capacity);
    const metabolic = clamp01(input.meanMetabolicEnergy);
    const biomass = clamp01(input.floraBiomass);
    const thermalStress = clamp01(
      Math.abs((Number.isFinite(input.temperature) ? input.temperature : 20) - 20) / 80,
    );

    // Observable ecological pressure—not a decorative clock. Depletion and low organism energy dominate;
    // chaos/crowding/temperature add bounded environmental stress.
    const pressure = clamp01(
      (1 - biomass) * 0.34 +
        (1 - metabolic) * 0.3 +
        chaos * 0.16 +
        crowding * 0.12 +
        thermalStress * 0.08,
    );
    const forecast = this.pushAndForecast(pressure);
    const corpus = corpusBrainVectorInto(this.corpusVector, this.seed, frame, ablated);
    const channels = this.signal.channels;

    const quantumSample = this.statevector.next01();
    const health = this.statevector.health();
    const alert = health.status === 'diagnostic-alert';
    // On a diagnostic alert, fall back to a transparent deterministic classical mixture rather than
    // letting a suspect state-vector stream amplify exploration.
    const explorationSample = alert
      ? clamp01((channels[0]! + channels[2]! + ((frame % 97) + 0.5) / 97) / 3)
      : quantumSample;
    const confidence = alert ? 0.2 : health.status === 'diagnostic-pass' ? 0.88 : 0.65;
    const novelty = clamp01(Math.abs(forecast - pressure) * 3);

    this.signal.resourcePressure = clamp01(pressure * 0.5 + forecast * 0.28 + channels[0]! * 0.22);
    this.signal.threatResponse = clamp01(
      chaos * 0.42 + entropy * 0.18 + thermalStress * 0.12 + channels[1]! * 0.28,
    );
    this.signal.exploration = clamp01(
      explorationSample * 0.42 + novelty * 0.18 + channels[2]! * 0.4,
    );
    this.signal.socialDrive = clamp01(
      (1 - Math.abs(crowding - 0.58)) * 0.34 + channels[3]! * 0.46 + metabolic * 0.2,
    );
    this.signal.forecast = forecast;
    this.signal.confidence = confidence;
    this.signal.corpusDrive = clamp01(corpus.drive);
    this.signal.plasticity = clamp01(
      confidence *
        (0.22 + corpus.drive * 0.58 + novelty * 0.2) *
        (1 - this.signal.threatResponse * 0.35),
    );
    this.signal.integratedRepoCount = corpus.repoCount;
    this.signal.diagnosticAlert = alert;
    this.signal.revision++;
    return this.signal;
  }

  /** Low-cadence evidence snapshot; allocation here is intentional and never used by the hot path. */
  snapshot(): TsotchkeOrganismIntelligenceSnapshot {
    const s = this.signal;
    return {
      schemaVersion: 1,
      model: 'shared-tsotchke-organism-intelligence',
      indicatorOnly: true,
      seed: this.seed,
      cadenceFrames: this.cadenceFrames,
      lastFrame: Number.isFinite(this.lastFrame) ? this.lastFrame : -1,
      historyCount: this.historyCount,
      pressureHistory: Array.from(this.pressureHistory),
      signal: {
        enabled: s.enabled,
        revision: s.revision,
        resourcePressure: s.resourcePressure,
        threatResponse: s.threatResponse,
        exploration: s.exploration,
        socialDrive: s.socialDrive,
        plasticity: s.plasticity,
        forecast: s.forecast,
        confidence: s.confidence,
        corpusDrive: s.corpusDrive,
        channels: Array.from(s.channels),
        integratedRepoCount: s.integratedRepoCount,
        diagnosticAlert: s.diagnosticAlert,
      },
      substrate: this.statevector.snapshot(),
    };
  }

  /**
   * Replace live history, signal, and substrate with a validated same-configuration snapshot.
   * Validation completes before mutation; the nested state-vector restore has the same strong guarantee.
   */
  restore(snapshot: TsotchkeOrganismIntelligenceSnapshot): void {
    if (
      snapshot.schemaVersion !== 1 ||
      snapshot.model !== 'shared-tsotchke-organism-intelligence' ||
      snapshot.indicatorOnly !== true
    ) {
      throw new TypeError('unsupported organism-intelligence snapshot');
    }
    if (snapshot.seed !== this.seed || snapshot.cadenceFrames !== this.cadenceFrames) {
      throw new RangeError(
        'organism-intelligence snapshot configuration does not match this field',
      );
    }
    if (
      !Number.isSafeInteger(snapshot.lastFrame) ||
      snapshot.lastFrame < -1 ||
      !Number.isInteger(snapshot.historyCount) ||
      snapshot.historyCount < 0 ||
      snapshot.historyCount > this.pressureHistory.length ||
      snapshot.pressureHistory.length !== this.pressureHistory.length
    ) {
      throw new RangeError('organism-intelligence snapshot history metadata is invalid');
    }
    for (const pressure of snapshot.pressureHistory) {
      if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) {
        throw new RangeError('organism-intelligence pressure history must remain in [0,1]');
      }
    }
    const signal = snapshot.signal;
    if (
      typeof signal.enabled !== 'boolean' ||
      !Number.isSafeInteger(signal.revision) ||
      signal.revision < 0 ||
      signal.channels.length !== this.signal.channels.length ||
      !Number.isInteger(signal.integratedRepoCount) ||
      signal.integratedRepoCount < 0 ||
      signal.integratedRepoCount > 22 ||
      typeof signal.diagnosticAlert !== 'boolean'
    ) {
      throw new RangeError('organism-intelligence snapshot signal metadata is invalid');
    }
    const bounded = [
      signal.resourcePressure,
      signal.threatResponse,
      signal.exploration,
      signal.socialDrive,
      signal.plasticity,
      signal.forecast,
      signal.confidence,
      signal.corpusDrive,
      ...signal.channels,
    ];
    if (bounded.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      throw new RangeError('organism-intelligence snapshot signals must remain in [0,1]');
    }
    if (
      !signal.enabled &&
      (bounded.some((value) => value !== 0) || signal.integratedRepoCount !== 0)
    ) {
      throw new RangeError('a disabled organism-intelligence snapshot must have a zero signal');
    }

    this.statevector.restore(snapshot.substrate);
    this.lastFrame = snapshot.lastFrame < 0 ? -Infinity : snapshot.lastFrame;
    this.historyCount = snapshot.historyCount;
    this.pressureHistory.set(snapshot.pressureHistory);
    const target = this.signal;
    target.enabled = signal.enabled;
    target.revision = signal.revision;
    target.resourcePressure = signal.resourcePressure;
    target.threatResponse = signal.threatResponse;
    target.exploration = signal.exploration;
    target.socialDrive = signal.socialDrive;
    target.plasticity = signal.plasticity;
    target.forecast = signal.forecast;
    target.confidence = signal.confidence;
    target.corpusDrive = signal.corpusDrive;
    target.channels.set(signal.channels);
    target.integratedRepoCount = signal.integratedRepoCount;
    target.diagnosticAlert = signal.diagnosticAlert;
    this.corpusVector.drive = signal.corpusDrive;
    this.corpusVector.repoCount = signal.integratedRepoCount;
  }

  private pushAndForecast(pressure: number): number {
    for (let i = this.pressureHistory.length - 1; i > 0; i--) {
      this.pressureHistory[i] = this.pressureHistory[i - 1]!;
    }
    this.pressureHistory[0] = pressure;
    if (this.historyCount < this.pressureHistory.length) this.historyCount++;
    if (this.historyCount < this.pressureHistory.length) return pressure;

    const y0 = this.pressureHistory[0]!;
    const y1 = this.pressureHistory[1]!;
    const y2 = this.pressureHistory[2]!;
    const y3 = this.pressureHistory[3]!;
    // Four-point backward differences at the latest sample. Coefficients are normalized derivatives
    // c[k]=f^(k)/k!, exactly the representation consumed by EshkolTaylorJet.
    this.coefficients[0] = y0;
    this.coefficients[1] = (11 * y0 - 18 * y1 + 9 * y2 - 2 * y3) / 6;
    this.coefficients[2] = (2 * y0 - 5 * y1 + 4 * y2 - y3) / 2;
    this.coefficients[3] = (y0 - 3 * y1 + 3 * y2 - y3) / 6;
    this.forecastJet.setCoefficients(this.coefficients);
    return clamp01(this.forecastJet.evaluate(1));
  }

  private clearSignal(): void {
    const s = this.signal;
    s.resourcePressure = 0;
    s.threatResponse = 0;
    s.exploration = 0;
    s.socialDrive = 0;
    s.plasticity = 0;
    s.forecast = 0;
    s.confidence = 0;
    s.corpusDrive = 0;
    s.channels.fill(0);
    s.integratedRepoCount = 0;
    s.diagnosticAlert = false;
    s.revision++;
  }
}
