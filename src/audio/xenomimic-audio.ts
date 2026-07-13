/**
 * Bounded Xenomimic sound field.
 *
 * The bus owns a fixed fifteen-node Web Audio graph: three bipolar carrier voices, two slow
 * modulators, and one filtered deterministic-noise bed. It creates no nodes while metrics update;
 * callers can therefore drive population, neurology, environment, and proximity continuously via
 * AudioParam smoothing without building a one-voice-per-creature audio storm.
 *
 * Event stings are separately bounded to four accepted triggers in any sliding second and six live
 * transient voices. Random variation comes only from the injected seeded RNG. Strict silence hard-
 * zeros the output AudioParam and rejects new events, so pending target ramps cannot leak a whine.
 */
import type { Rng } from '../math/rng';

export const XENOMIMIC_PERSISTENT_NODE_COUNT = 15;
export const XENOMIMIC_MAX_EVENTS_PER_SECOND = 4;
export const XENOMIMIC_MAX_TRANSIENT_VOICES = 6;

const EVENT_WINDOW_SECONDS = 1;
const DEFAULT_MAX_POPULATION = 1000;
const MINOR_SECOND_RATIO = 16 / 15;
const TRITONE_RATIO = Math.SQRT2;
const PARAMETER_TIME_CONSTANT = 0.08;

export type XenomimicAudioEventKind =
  | 'birth'
  | 'mate'
  | 'blink'
  | 'graze'
  | 'eaten'
  | 'natural-death'
  | 'respawn'
  | 'land'
  | 'twin-loss';

/** Aggregate world signals. Every normalized lane is sanitized and clamped by the pure mapper. */
export interface XenomimicAudioMetrics {
  population: number;
  maxPopulation?: number;
  activity: number;
  /** Predictive-coding surprise / free-energy proxy in [0,1]. */
  predictionError?: number;
  twinTension: number;
  weather: number;
  entropy: number;
  proximity: number;
  /** Optional signed warm/cold twin balance used only for stereo position. */
  polarityBalance?: number;
  /** Binding hard mute: output becomes exactly zero immediately and events are rejected. */
  strictSilence?: boolean;
}

/** Caller-reusable result of {@link mapXenomimicAudioMetrics}. */
export interface XenomimicAudioParameters {
  outputGain: number;
  baseHz: number;
  minorSecondHz: number;
  tritoneHz: number;
  voiceAGain: number;
  voiceBGain: number;
  voiceCGain: number;
  noiseGain: number;
  filterHz: number;
  filterQ: number;
  lfoAHz: number;
  lfoBHz: number;
  lfoADepth: number;
  lfoBDepth: number;
  pan: number;
}

export interface XenomimicEventParameters {
  wave: OscillatorType;
  startHz: number;
  endHz: number;
  duration: number;
  peakGain: number;
  attack: number;
}

const EVENT_SHAPES: Readonly<
  Record<XenomimicAudioEventKind, readonly [OscillatorType, number, number, number, number, number]>
> = Object.freeze({
  birth: ['sine', 210, 520, 0.42, 0.055, 0.018],
  mate: ['triangle', 145, 225, 0.58, 0.045, 0.04],
  blink: ['square', 1180, 72, 0.19, 0.052, 0.004],
  graze: ['sawtooth', 112, 62, 0.16, 0.025, 0.006],
  eaten: ['triangle', 92, 24, 0.72, 0.075, 0.008],
  'natural-death': ['sine', 185, 21, 1.05, 0.065, 0.03],
  respawn: ['triangle', 74, 390, 0.46, 0.052, 0.012],
  land: ['square', 165, 48, 0.14, 0.035, 0.003],
  'twin-loss': ['sawtooth', 138, 27, 1.18, 0.078, 0.025],
});

function clamp(value: number, lo: number, hi: number, fallback = lo): number {
  const finite = Number.isFinite(value) ? value : fallback;
  return finite < lo ? lo : finite > hi ? hi : finite;
}

function freshParameters(): XenomimicAudioParameters {
  return {
    outputGain: 0,
    baseHz: 36,
    minorSecondHz: 36 * MINOR_SECOND_RATIO,
    tritoneHz: 36 * TRITONE_RATIO,
    voiceAGain: 0.42,
    voiceBGain: 0.34,
    voiceCGain: 0.24,
    noiseGain: 0,
    filterHz: 260,
    filterQ: 2.5,
    lfoAHz: 0.13,
    lfoBHz: 0.17,
    lfoADepth: 5,
    lfoBDepth: 7,
    pan: 0,
  };
}

/**
 * Pure aggregate-signal mapping. Pass `out` in a hot path to avoid allocation; omitting it is useful
 * for diagnostics and tests. A zero population, zero proximity, or explicit strict-silence request
 * maps to an exact zero output gain.
 */
export function mapXenomimicAudioMetrics(
  metrics: XenomimicAudioMetrics,
  out: XenomimicAudioParameters = freshParameters(),
): XenomimicAudioParameters {
  const maxPopulation = clamp(metrics.maxPopulation ?? DEFAULT_MAX_POPULATION, 1, 1_000_000, 1000);
  const population = clamp(metrics.population, 0, maxPopulation, 0);
  const populationN = population / maxPopulation;
  const activity = clamp(metrics.activity, 0, 1, 0);
  const predictionError = clamp(metrics.predictionError ?? 0, 0, 1, 0);
  const twinTension = clamp(metrics.twinTension, 0, 1, 0);
  const weather = clamp(metrics.weather, 0, 1, 0);
  const entropy = clamp(metrics.entropy, 0, 1, 0);
  const proximity = clamp(metrics.proximity, 0, 1, 0);
  const polarity = clamp(metrics.polarityBalance ?? 0, -1, 1, 0);
  const density = Math.sqrt(populationN);
  const strictSilence = metrics.strictSilence === true || population <= 0 || proximity <= 0;

  const baseHz = 33 + activity * 10 + predictionError * 11 + entropy * 9 + weather * 4;
  out.outputGain = strictSilence
    ? 0
    : clamp(
        proximity *
          (0.014 +
            density * 0.042 +
            activity * 0.02 +
            predictionError * 0.018 +
            twinTension * 0.02),
        0,
        0.12,
      );
  out.baseHz = baseHz;
  out.minorSecondHz = baseHz * MINOR_SECOND_RATIO * (1 + twinTension * 0.014);
  out.tritoneHz = baseHz * TRITONE_RATIO * (1 + weather * 0.011 - entropy * 0.006);
  out.voiceAGain = 0.38 + density * 0.18;
  out.voiceBGain = 0.28 + twinTension * 0.24;
  out.voiceCGain = 0.18 + activity * 0.19 + entropy * 0.11;
  out.noiseGain = strictSilence
    ? 0
    : clamp(
        0.025 + weather * 0.09 + entropy * 0.13 + activity * 0.025 + predictionError * 0.08,
        0,
        0.28,
      );
  out.filterHz = 260 + activity * 1050 + predictionError * 1350 + weather * 850 + entropy * 620;
  out.filterQ = 2.5 + twinTension * 7.5;
  out.lfoAHz = 0.13 + activity * 0.48 + weather * 0.12;
  out.lfoBHz = 0.17 + twinTension * 0.63 + entropy * 0.15;
  out.lfoADepth = 5 + twinTension * 31 + activity * 12;
  out.lfoBDepth = 7 + entropy * 38 + weather * 14;
  out.pan = polarity * (0.18 + twinTension * 0.52);
  return out;
}

/** Pure event timbre mapping. `jitter` must come from the caller's injected RNG. */
export function mapXenomimicAudioEvent(
  kind: number,
  eventKind: XenomimicAudioEventKind,
  intensity: number,
  jitter: number,
): XenomimicEventParameters {
  const shape = EVENT_SHAPES[eventKind];
  const safeKind = Number.isFinite(kind) ? ((Math.trunc(kind) % 10) + 10) % 10 : 0;
  const strength = clamp(intensity, 0, 1, 0);
  const random = clamp(jitter, 0, 1, 0.5);
  // Kind contributes a bounded microtonal identity; RNG adds only ±3% trigger variation.
  const identity = Math.pow(2, (safeKind - 4.5) / 60);
  const variation = 0.97 + random * 0.06;
  return {
    wave: shape[0],
    startHz: Math.max(20, shape[1] * identity * variation),
    endHz: Math.max(20, (shape[2] * identity) / variation),
    duration: shape[3] * (0.82 + strength * 0.36),
    peakGain: shape[4] * (0.35 + strength * 0.65),
    attack: shape[5],
  };
}

/** Allocation-free sliding-window and live-voice limiter used by the browser bus and headless tests. */
export class XenomimicEventLimiter {
  private readonly acceptedAt = new Float64Array(XENOMIMIC_MAX_EVENTS_PER_SECOND);
  private cursor = 0;
  private lastNow = Number.NEGATIVE_INFINITY;

  constructor() {
    this.acceptedAt.fill(Number.NEGATIVE_INFINITY);
  }

  recentCount(now: number): number {
    if (!Number.isFinite(now)) return XENOMIMIC_MAX_EVENTS_PER_SECOND;
    let count = 0;
    for (let i = 0; i < this.acceptedAt.length; i++) {
      const age = now - this.acceptedAt[i]!;
      if (age >= 0 && age < EVENT_WINDOW_SECONDS) count++;
    }
    return count;
  }

  allow(now: number, activeVoices: number): boolean {
    if (!Number.isFinite(now) || activeVoices >= XENOMIMIC_MAX_TRANSIENT_VOICES) return false;
    // An AudioContext clock is monotonic. Reset rather than wedging if a test/offline context rewinds.
    if (now < this.lastNow) this.reset();
    this.lastNow = now;
    if (this.recentCount(now) >= XENOMIMIC_MAX_EVENTS_PER_SECOND) return false;
    this.acceptedAt[this.cursor] = now;
    this.cursor = (this.cursor + 1) % this.acceptedAt.length;
    return true;
  }

  reset(): void {
    this.acceptedAt.fill(Number.NEGATIVE_INFINITY);
    this.cursor = 0;
    this.lastNow = Number.NEGATIVE_INFINITY;
  }
}

interface TransientVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
  ended: boolean;
}

function target(param: AudioParam, value: number, now: number): void {
  param.setTargetAtTime(value, now, PARAMETER_TIME_CONSTANT);
}

function hardZero(param: AudioParam, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(0, now);
}

function safeStop(source: OscillatorNode | AudioBufferSourceNode): void {
  try {
    source.stop();
  } catch {
    // Already stopped or never started. Disposal remains idempotent.
  }
}

function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // A partially constructed/fake node may already be disconnected.
  }
}

/**
 * Fixed-node Web Audio sound field. Construction is browser-bound; all mapping and limiting above
 * remain DOM-free and directly testable under Bun.
 */
export class XenomimicAudioBus {
  private readonly context: AudioContext;
  private readonly rng: Rng;
  private readonly carriers: readonly [OscillatorNode, OscillatorNode, OscillatorNode];
  private readonly voiceGains: readonly [GainNode, GainNode, GainNode];
  private readonly lfos: readonly [OscillatorNode, OscillatorNode];
  private readonly lfoGains: readonly [GainNode, GainNode];
  private readonly noise: AudioBufferSourceNode;
  private readonly noiseFilter: BiquadFilterNode;
  private readonly noiseGain: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly output: GainNode;
  private readonly persistentNodes: readonly AudioNode[];
  private readonly limiter = new XenomimicEventLimiter();
  private readonly transients = new Set<TransientVoice>();
  private readonly parameters = freshParameters();
  private strictSilent = true;
  private disposed = false;

  constructor(context: AudioContext, destination: AudioNode, rng: Rng) {
    this.context = context;
    this.rng = rng;

    const carrierA = context.createOscillator();
    const carrierB = context.createOscillator();
    const carrierC = context.createOscillator();
    carrierA.type = 'sine';
    carrierB.type = 'triangle';
    carrierC.type = 'sawtooth';
    carrierA.frequency.value = 36;
    carrierB.frequency.value = 36 * MINOR_SECOND_RATIO;
    carrierC.frequency.value = 36 * TRITONE_RATIO;
    carrierA.detune.value = -13;
    carrierB.detune.value = 13;
    carrierC.detune.value = -7;

    const voiceA = context.createGain();
    const voiceB = context.createGain();
    const voiceC = context.createGain();
    voiceA.gain.value = 0.42;
    voiceB.gain.value = 0.34;
    voiceC.gain.value = 0.24;

    const lfoA = context.createOscillator();
    const lfoB = context.createOscillator();
    lfoA.type = 'sine';
    lfoB.type = 'triangle';
    lfoA.frequency.value = 0.13;
    lfoB.frequency.value = 0.17;
    const lfoGainA = context.createGain();
    const lfoGainB = context.createGain();
    lfoGainA.gain.value = 5;
    lfoGainB.gain.value = 7;

    const noise = context.createBufferSource();
    noise.loop = true;
    noise.buffer = this.buildNoiseBuffer();
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 260;
    noiseFilter.Q.value = 2.5;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0;
    const panner = context.createStereoPanner();
    panner.pan.value = 0;
    const output = context.createGain();
    output.gain.value = 0;

    carrierA.connect(voiceA).connect(panner);
    carrierB.connect(voiceB).connect(panner);
    carrierC.connect(voiceC).connect(panner);
    lfoA.connect(lfoGainA).connect(carrierB.detune);
    lfoB.connect(lfoGainB).connect(carrierC.detune);
    noise.connect(noiseFilter).connect(noiseGain).connect(panner);
    panner.connect(output).connect(destination);

    this.carriers = [carrierA, carrierB, carrierC];
    this.voiceGains = [voiceA, voiceB, voiceC];
    this.lfos = [lfoA, lfoB];
    this.lfoGains = [lfoGainA, lfoGainB];
    this.noise = noise;
    this.noiseFilter = noiseFilter;
    this.noiseGain = noiseGain;
    this.panner = panner;
    this.output = output;
    this.persistentNodes = [
      carrierA,
      carrierB,
      carrierC,
      voiceA,
      voiceB,
      voiceC,
      lfoA,
      lfoB,
      lfoGainA,
      lfoGainB,
      noise,
      noiseFilter,
      noiseGain,
      panner,
      output,
    ];

    carrierA.start();
    carrierB.start();
    carrierC.start();
    lfoA.start();
    lfoB.start();
    noise.start();
  }

  /** Smooth the fixed graph toward live aggregate state; performs no steady-state allocation. */
  update(metrics: XenomimicAudioMetrics): void {
    if (this.disposed) return;
    const p = mapXenomimicAudioMetrics(metrics, this.parameters);
    const now = this.context.currentTime;
    this.strictSilent = p.outputGain <= 0;

    target(this.carriers[0].frequency, p.baseHz, now);
    target(this.carriers[1].frequency, p.minorSecondHz, now);
    target(this.carriers[2].frequency, p.tritoneHz, now);
    target(this.voiceGains[0].gain, p.voiceAGain, now);
    target(this.voiceGains[1].gain, p.voiceBGain, now);
    target(this.voiceGains[2].gain, p.voiceCGain, now);
    target(this.noiseGain.gain, p.noiseGain, now);
    target(this.noiseFilter.frequency, p.filterHz, now);
    target(this.noiseFilter.Q, p.filterQ, now);
    target(this.lfos[0].frequency, p.lfoAHz, now);
    target(this.lfos[1].frequency, p.lfoBHz, now);
    target(this.lfoGains[0].gain, p.lfoADepth, now);
    target(this.lfoGains[1].gain, p.lfoBDepth, now);
    target(this.panner.pan, p.pan, now);

    if (this.strictSilent) hardZero(this.output.gain, now);
    else target(this.output.gain, p.outputGain, now);
  }

  /**
   * Voice one bounded semantic sting. Returns false when silent, rate-limited, voice-limited, or
   * disposed. Each accepted event owns exactly one oscillator and one envelope gain.
   */
  event(kind: number, eventKind: XenomimicAudioEventKind, intensity = 1): boolean {
    if (this.disposed || this.strictSilent) return false;
    const now = this.context.currentTime;
    if (!this.limiter.allow(now, this.transients.size)) return false;
    const mapped = mapXenomimicAudioEvent(kind, eventKind, intensity, this.safeRandom());
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const voice: TransientVoice = { oscillator, gain, ended: false };
    const cleanup = (): void => {
      if (voice.ended) return;
      voice.ended = true;
      this.transients.delete(voice);
      safeDisconnect(oscillator);
      safeDisconnect(gain);
    };

    oscillator.type = mapped.wave;
    oscillator.frequency.setValueAtTime(mapped.startHz, now);
    oscillator.frequency.exponentialRampToValueAtTime(mapped.endHz, now + mapped.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0005, mapped.peakGain), now + mapped.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + mapped.duration);
    oscillator.connect(gain).connect(this.panner);
    oscillator.onended = cleanup;
    this.transients.add(voice);
    try {
      oscillator.start(now);
      oscillator.stop(now + mapped.duration + 0.03);
      return true;
    } catch {
      cleanup();
      return false;
    }
  }

  get persistentNodeCount(): number {
    return this.persistentNodes.length;
  }

  get activeTransientVoices(): number {
    return this.transients.size;
  }

  get isSilent(): boolean {
    return this.strictSilent;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.strictSilent = true;
    hardZero(this.output.gain, this.context.currentTime);
    for (const voice of this.transients) {
      voice.ended = true;
      voice.oscillator.onended = null;
      safeStop(voice.oscillator);
      safeDisconnect(voice.oscillator);
      safeDisconnect(voice.gain);
    }
    this.transients.clear();
    for (const carrier of this.carriers) safeStop(carrier);
    for (const lfo of this.lfos) safeStop(lfo);
    safeStop(this.noise);
    for (const node of this.persistentNodes) safeDisconnect(node);
    this.limiter.reset();
  }

  private safeRandom(): number {
    const value = this.rng();
    return Number.isFinite(value) ? clamp(value, 0, 1, 0.5) : 0.5;
  }

  private buildNoiseBuffer(): AudioBuffer {
    const sampleRate = Math.max(8000, Math.floor(this.context.sampleRate || 48_000));
    const length = Math.max(1, Math.floor(sampleRate * 0.25));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let state = Math.floor(this.safeRandom() * 0xffff_ffff) >>> 0;
    if (state === 0) state = 0x9e37_79b9;
    for (let i = 0; i < data.length; i++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      data[i] = (state / 0xffff_ffff) * 2 - 1;
    }
    return buffer;
  }
}
