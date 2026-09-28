/** Xylos runtime boundary: live browser entropy, bounded input recording and exact local replay. */
import { XylosMind, type XylosPercept, type XylosView } from '../sim/xylos-mind';

/** About three minutes of complete numeric input at the fixed cognitive cadence. */
export const XYLOS_RECORDING_CAPACITY = 4096;
/** Cognitive integration interval in simulation seconds. */
export const XYLOS_STEP = 0.05;
const CHANNELS = 6;

/** Stable inspector view; recording replays this organism, not the entire surrounding world. */
export interface XylosSessionStatus {
  mode: 'live' | 'seeded' | 'replay';
  source: 'browser entropy' | 'seeded' | 'seeded fallback' | 'recorded inputs';
  recording: boolean;
  recordedSteps: number;
  capacity: number;
  replayStep: number;
  droppedSteps: number;
  error: string | null;
}

/**
 * Sole entropy owner. O(N+E) per tick; preallocated 192 KiB tape, no hot-loop allocations.
 * Recording starts a fresh brain so the complete captured sequence can be replayed from its seed.
 * Replay consumes recorded senses, never fresh world senses, and suppresses world writes.
 */
export class XylosSession {
  private mind: XylosMind;
  private readonly tape = new Float64Array(XYLOS_RECORDING_CAPACITY * CHANNELS);
  private readonly word = new Uint32Array(1);
  private readonly percept: XylosPercept = {
    nutrient: 0,
    hazard: 0,
    signal: 0,
    gradientX: 0,
    gradientZ: 0,
  };
  private accumulator = 0;
  private liveFailed = false;
  /** Reused read-only-by-convention session telemetry. */
  readonly status: XylosSessionStatus;

  /** `noiseSource` injects a finite [-1,1] boundary sample for deterministic tests. */
  constructor(
    private readonly seed: number,
    mode: 'live' | 'seeded' = 'live',
    private readonly noiseSource?: () => number,
  ) {
    this.mind = new XylosMind(seed);
    this.status = {
      mode,
      source: mode === 'live' ? 'browser entropy' : 'seeded',
      recording: false,
      recordedSteps: 0,
      capacity: XYLOS_RECORDING_CAPACITY,
      replayStep: 0,
      droppedSteps: 0,
      error: null,
    };
  }

  /** Borrow the current organism state; references change only on explicit record/replay reset. */
  get view(): XylosView {
    return this.mind.view;
  }

  /** Change entropy source and leave replay; a recorded experiment remains available. */
  setMode(mode: 'live' | 'seeded'): void {
    if (mode !== 'live' && mode !== 'seeded') throw new RangeError('Unknown Xylos mode');
    this.status.mode = mode;
    this.status.source = mode === 'live' ? 'browser entropy' : 'seeded';
    this.status.recording = false;
    this.status.error = null;
    this.liveFailed = false;
    this.accumulator = 0;
  }

  /** Begin a bounded fresh life; its complete initial-to-final input sequence is retained. */
  startRecording(): void {
    if (this.status.mode === 'replay') this.setMode('seeded');
    this.mind = new XylosMind(this.seed);
    this.accumulator = 0;
    this.status.recording = true;
    this.status.recordedSteps = 0;
    this.status.replayStep = 0;
    this.status.droppedSteps = 0;
    this.status.error = null;
  }

  /** Re-run the recorded brain experiment from its seed, without altering the habitat. */
  replay(): void {
    if (this.status.recordedSteps === 0) throw new Error('Record a Xylos life before replaying');
    this.mind = new XylosMind(this.seed);
    this.accumulator = 0;
    this.status.mode = 'replay';
    this.status.source = 'recorded inputs';
    this.status.recording = false;
    this.status.replayStep = 0;
    this.status.error = null;
  }

  /**
   * Advance fixed steps with fresh sensing each step. Zero dt is fully inert. At most four
   * ticks per frame; discarded backlog is counted. Callbacks are caller-owned stable functions.
   */
  advance(
    dt: number,
    sense: (view: XylosView, out: XylosPercept) => void,
    effect: (view: XylosView) => void,
  ): void {
    if (!Number.isFinite(dt) || dt < 0)
      throw new RangeError('Xylos dt must be finite and non-negative');
    if (dt === 0) return;
    // Cap before addition to prevent a huge finite delta overflowing the accumulator.
    const admitted = Math.min(dt, 1);
    let droppedSteps = Math.min(
      Number.MAX_SAFE_INTEGER,
      this.status.droppedSteps +
        Math.floor(Math.min(dt - admitted, Number.MAX_SAFE_INTEGER * XYLOS_STEP) / XYLOS_STEP),
    );
    const pending = this.accumulator + admitted;
    let steps = Math.floor((pending + 1e-10) / XYLOS_STEP);
    const remainder = Math.max(0, pending - steps * XYLOS_STEP);
    if (steps > 4) {
      droppedSteps = Math.min(Number.MAX_SAFE_INTEGER, droppedSteps + steps - 4);
      steps = 4;
    }
    let completed = 0;
    try {
      for (let i = 0; i < steps; i++) {
        if (this.status.mode !== 'replay') sense(this.view, this.percept);
        if (!this.tick(this.percept)) break;
        completed++;
        if (this.status.mode !== 'replay') effect(this.view);
      }
    } catch (error) {
      // First-input rejection leaves prior fractional debt untouched. Successfully completed
      // ticks cannot be undone across the habitat boundary; account for an interrupted batch.
      if (completed > 0) {
        this.accumulator = remainder;
        this.status.droppedSteps = Math.min(
          Number.MAX_SAFE_INTEGER,
          droppedSteps + steps - completed,
        );
      }
      throw error;
    }
    this.accumulator = remainder;
    this.status.droppedSteps = droppedSteps;
  }

  /** One fixed cognitive step. Returns false after the last recorded step; replay then holds. */
  tick(input: XylosPercept): boolean {
    const status = this.status;
    if (status.mode === 'replay') {
      if (status.replayStep >= status.recordedSteps) return false;
      const offset = status.replayStep * CHANNELS;
      const p = this.percept;
      p.nutrient = this.tape[offset] ?? 0;
      p.hazard = this.tape[offset + 1] ?? 0;
      p.signal = this.tape[offset + 2] ?? 0;
      p.gradientX = this.tape[offset + 3] ?? 0;
      p.gradientZ = this.tape[offset + 4] ?? 0;
      this.mind.tick(p, this.tape[offset + 5] ?? 0);
      status.replayStep++;
      return true;
    }
    // Validate before acquiring entropy or mutating the tape/cursors.
    if (
      !Number.isFinite(input.nutrient) ||
      !Number.isFinite(input.hazard) ||
      !Number.isFinite(input.signal) ||
      !Number.isFinite(input.gradientX) ||
      !Number.isFinite(input.gradientZ) ||
      input.nutrient < 0 ||
      input.nutrient > 1 ||
      input.hazard < 0 ||
      input.hazard > 1 ||
      input.signal < 0 ||
      input.signal > 1 ||
      Math.abs(input.gradientX) > 1 ||
      Math.abs(input.gradientZ) > 1
    ) {
      throw new RangeError('Invalid Xylos percept');
    }
    const noise = this.noise();
    this.mind.tick(input, noise);
    if (status.recording) {
      const offset = status.recordedSteps * CHANNELS;
      this.tape[offset] = input.nutrient;
      this.tape[offset + 1] = input.hazard;
      this.tape[offset + 2] = input.signal;
      this.tape[offset + 3] = input.gradientX;
      this.tape[offset + 4] = input.gradientZ;
      this.tape[offset + 5] = noise;
      status.recordedSteps++;
      if (status.recordedSteps === XYLOS_RECORDING_CAPACITY) status.recording = false;
    }
    return true;
  }

  private noise(): number {
    if (this.status.mode !== 'live' || this.liveFailed) return 0;
    try {
      let value: number;
      if (this.noiseSource) value = this.noiseSource();
      else {
        globalThis.crypto.getRandomValues(this.word);
        value = ((this.word[0] ?? 0) / 0xffffffff) * 2 - 1;
      }
      if (!Number.isFinite(value) || Math.abs(value) > 1)
        throw new RangeError('Invalid entropy sample');
      return value;
    } catch {
      this.liveFailed = true;
      this.status.source = 'seeded fallback';
      this.status.error = 'Browser entropy unavailable; the seeded neural dynamics remain active.';
      return 0;
    }
  }
}
