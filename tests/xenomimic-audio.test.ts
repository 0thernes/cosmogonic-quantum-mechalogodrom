import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  XENOMIMIC_MAX_EVENTS_PER_SECOND,
  XENOMIMIC_MAX_TRANSIENT_VOICES,
  XENOMIMIC_PERSISTENT_NODE_COUNT,
  XenomimicAudioBus,
  XenomimicEventLimiter,
  mapXenomimicAudioEvent,
  mapXenomimicAudioMetrics,
  type XenomimicAudioEventKind,
} from '../src/audio/xenomimic-audio';

type ParamEvent =
  | { kind: 'set'; value: number; time: number }
  | { kind: 'target'; value: number; time: number; constant: number }
  | { kind: 'linear'; value: number; time: number }
  | { kind: 'exponential'; value: number; time: number }
  | { kind: 'cancel'; time: number };

class FakeAudioParam {
  value = 0;
  readonly events: ParamEvent[] = [];

  setValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number, constant: number): this {
    this.value = value;
    this.events.push({ kind: 'target', value, time, constant });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'exponential', value, time });
    return this;
  }

  cancelScheduledValues(time: number): this {
    this.events.push({ kind: 'cancel', time });
    return this;
  }
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnectCount = 0;

  connect(destination: unknown): unknown {
    this.connections.push(destination);
    return destination;
  }

  disconnect(): void {
    this.disconnectCount++;
    this.connections.length = 0;
  }
}

class FakeOscillator extends FakeNode {
  readonly frequency = new FakeAudioParam();
  readonly detune = new FakeAudioParam();
  type: OscillatorType = 'sine';
  onended: (() => void) | null = null;
  startCount = 0;
  stopCount = 0;
  stopAt = Number.NaN;

  start(): void {
    this.startCount++;
  }

  stop(when?: number): void {
    this.stopCount++;
    this.stopAt = when ?? 0;
  }

  finish(): void {
    this.onended?.();
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeAudioParam();
}

class FakeFilter extends FakeNode {
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  type: BiquadFilterType = 'lowpass';
}

class FakePanner extends FakeNode {
  readonly pan = new FakeAudioParam();
}

class FakeBuffer {
  private readonly channels: Float32Array[];

  constructor(channelCount: number, length: number) {
    this.channels = Array.from({ length: channelCount }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]!;
  }
}

class FakeBufferSource extends FakeNode {
  loop = false;
  buffer: AudioBuffer | null = null;
  startCount = 0;
  stopCount = 0;

  start(): void {
    this.startCount++;
  }

  stop(): void {
    this.stopCount++;
  }
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48_000;
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly filters: FakeFilter[] = [];
  readonly panners: FakePanner[] = [];
  readonly sources: FakeBufferSource[] = [];

  createOscillator(): OscillatorNode {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    const node = new FakeGain();
    this.gains.push(node);
    return node as unknown as GainNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeFilter();
    this.filters.push(node);
    return node as unknown as BiquadFilterNode;
  }

  createStereoPanner(): StereoPannerNode {
    const node = new FakePanner();
    this.panners.push(node);
    return node as unknown as StereoPannerNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource();
    this.sources.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createBuffer(channels: number, length: number): AudioBuffer {
    return new FakeBuffer(channels, length) as unknown as AudioBuffer;
  }
}

const ACTIVE = {
  population: 500,
  maxPopulation: 1000,
  activity: 0.7,
  predictionError: 0.65,
  twinTension: 0.8,
  weather: 0.4,
  entropy: 0.6,
  proximity: 0.9,
  polarityBalance: -0.5,
};

describe('Xenomimic audio pure mapping', () => {
  test('maps all six required live signals to finite bounded parameters', () => {
    const quiet = mapXenomimicAudioMetrics({ ...ACTIVE, activity: 0, twinTension: 0 });
    const active = mapXenomimicAudioMetrics(ACTIVE);
    expect(Object.values(active).every(Number.isFinite)).toBe(true);
    expect(active.outputGain).toBeGreaterThan(0);
    expect(active.outputGain).toBeLessThanOrEqual(0.12);
    expect(active.minorSecondHz).toBeGreaterThan(active.baseHz);
    expect(active.tritoneHz).toBeGreaterThan(active.minorSecondHz);
    expect(active.filterHz).toBeGreaterThan(quiet.filterHz);
    expect(active.filterQ).toBeGreaterThan(quiet.filterQ);
    expect(active.pan).toBeLessThan(0);
  });

  test('strict silence, zero population, and zero proximity are exact silence', () => {
    expect(mapXenomimicAudioMetrics({ ...ACTIVE, strictSilence: true }).outputGain).toBe(0);
    expect(mapXenomimicAudioMetrics({ ...ACTIVE, population: 0 }).outputGain).toBe(0);
    expect(mapXenomimicAudioMetrics({ ...ACTIVE, proximity: 0 }).outputGain).toBe(0);
  });

  test('FEP prediction error causally brightens and detunes the bounded field', () => {
    const expected = mapXenomimicAudioMetrics({ ...ACTIVE, predictionError: 0 });
    const surprised = mapXenomimicAudioMetrics({ ...ACTIVE, predictionError: 1 });
    expect(surprised.baseHz).toBeGreaterThan(expected.baseHz);
    expect(surprised.filterHz).toBeGreaterThan(expected.filterHz);
    expect(surprised.noiseGain).toBeGreaterThan(expected.noiseGain);
  });

  test('event mappings are deterministic, finite, and cover every semantic event', () => {
    const events: XenomimicAudioEventKind[] = [
      'birth',
      'mate',
      'blink',
      'graze',
      'eaten',
      'natural-death',
      'respawn',
      'land',
      'twin-loss',
    ];
    for (let i = 0; i < events.length; i++) {
      const a = mapXenomimicAudioEvent(i, events[i]!, 0.8, 0.25);
      const b = mapXenomimicAudioEvent(i, events[i]!, 0.8, 0.25);
      expect(a).toEqual(b);
      expect(
        Object.values(a)
          .filter((v) => typeof v === 'number')
          .every(Number.isFinite),
      ).toBe(true);
      expect(a.startHz).toBeGreaterThanOrEqual(20);
      expect(a.endHz).toBeGreaterThanOrEqual(20);
      expect(a.duration).toBeGreaterThan(0);
    }
  });
});

describe('XenomimicEventLimiter', () => {
  test('enforces four triggers per sliding second and six live voices', () => {
    const limiter = new XenomimicEventLimiter();
    for (let i = 0; i < XENOMIMIC_MAX_EVENTS_PER_SECOND; i++) {
      expect(limiter.allow(i * 0.1, i)).toBe(true);
    }
    expect(limiter.allow(0.5, 4)).toBe(false);
    expect(limiter.allow(1.01, XENOMIMIC_MAX_TRANSIENT_VOICES)).toBe(false);
    expect(limiter.allow(1.01, 5)).toBe(true);
  });

  test('a rewound offline clock resets instead of wedging the limiter', () => {
    const limiter = new XenomimicEventLimiter();
    expect(limiter.allow(10, 0)).toBe(true);
    expect(limiter.allow(2, 0)).toBe(true);
    expect(limiter.recentCount(2)).toBe(1);
  });
});

describe('XenomimicAudioBus', () => {
  test('constructs exactly fifteen persistent nodes and starts hard-silent', () => {
    const context = new FakeAudioContext();
    const destination = new FakeNode();
    const bus = new XenomimicAudioBus(
      context as unknown as AudioContext,
      destination as unknown as AudioNode,
      mulberry32(7),
    );
    expect(bus.persistentNodeCount).toBe(XENOMIMIC_PERSISTENT_NODE_COUNT);
    expect(bus.persistentNodeCount).toBeLessThanOrEqual(16);
    expect(bus.isSilent).toBe(true);
    expect(context.oscillators.length).toBe(5);
    expect(context.gains.length).toBe(7);
    expect(context.filters.length).toBe(1);
    expect(context.panners.length).toBe(1);
    expect(context.sources.length).toBe(1);
    expect(context.gains.at(-1)!.gain.value).toBe(0);
    bus.dispose();
  });

  test('updates persistent parameters with targets and strict silence cancels the output', () => {
    const context = new FakeAudioContext();
    const bus = new XenomimicAudioBus(
      context as unknown as AudioContext,
      new FakeNode() as unknown as AudioNode,
      mulberry32(8),
    );
    context.currentTime = 2;
    bus.update(ACTIVE);
    expect(bus.isSilent).toBe(false);
    expect(context.oscillators[0]!.frequency.events.at(-1)?.kind).toBe('target');
    const output = context.gains.at(-1)!.gain;
    expect(output.events.at(-1)?.kind).toBe('target');
    expect(output.value).toBeGreaterThan(0);

    context.currentTime = 3;
    bus.update({ ...ACTIVE, strictSilence: true });
    expect(bus.isSilent).toBe(true);
    expect(output.events.slice(-2).map((event) => event.kind)).toEqual(['cancel', 'set']);
    expect(output.value).toBe(0);
    expect(bus.event(0, 'blink')).toBe(false);
    bus.dispose();
  });

  test('bounds live transient voices and releases a voice on oscillator end', () => {
    const context = new FakeAudioContext();
    const bus = new XenomimicAudioBus(
      context as unknown as AudioContext,
      new FakeNode() as unknown as AudioNode,
      mulberry32(9),
    );
    bus.update(ACTIVE);
    for (let i = 0; i < 4; i++) expect(bus.event(i, 'blink', 0.8)).toBe(true);
    expect(bus.event(4, 'blink')).toBe(false); // sliding-window ceiling
    expect(bus.activeTransientVoices).toBe(4);

    context.currentTime = 1.1;
    expect(bus.event(4, 'land')).toBe(true);
    expect(bus.event(5, 'graze')).toBe(true);
    expect(bus.activeTransientVoices).toBe(XENOMIMIC_MAX_TRANSIENT_VOICES);
    expect(bus.event(6, 'birth')).toBe(false); // live-voice ceiling

    context.oscillators[5]!.finish(); // first five are persistent
    expect(bus.activeTransientVoices).toBe(5);
    expect(bus.event(6, 'birth')).toBe(true);
    expect(bus.activeTransientVoices).toBe(6);
    bus.dispose();
  });

  test('dispose is terminal and idempotently stops persistent and transient sources', () => {
    const context = new FakeAudioContext();
    const bus = new XenomimicAudioBus(
      context as unknown as AudioContext,
      new FakeNode() as unknown as AudioNode,
      mulberry32(10),
    );
    bus.update(ACTIVE);
    expect(bus.event(2, 'twin-loss')).toBe(true);
    bus.dispose();
    bus.dispose();
    expect(bus.isDisposed).toBe(true);
    expect(bus.isSilent).toBe(true);
    expect(bus.activeTransientVoices).toBe(0);
    expect(context.oscillators.slice(0, 5).every((osc) => osc.stopCount === 1)).toBe(true);
    expect(context.sources[0]!.stopCount).toBe(1);
    expect(bus.event(0, 'respawn')).toBe(false);
    bus.update(ACTIVE);
  });
});
