/**
 * Web Audio engine: procedural music scheduler + 8-type SFX synthesizer.
 *
 * Port of the legacy monolith's audio block (lines 541-572) and audio toggles/cycles
 * (lines 588-591), with three Known Bugs fixed:
 *
 * - Bug 1 (legacy 557): the chord pitch multiplier `0.5 + Math.floor(st / 8) * 0.5` grew
 *   unbounded and drifted ultrasonic — now wrapped to four octaves:
 *   `0.5 + (Math.floor(st / 8) % 4) * 0.5`.
 * - Bug 2 (legacy 588): toggling music off left the scheduler interval running — now
 *   `clearInterval` on toggle-off.
 * - Bug 3 (legacy 556): the scheduler kept queueing oscillators while the tab was hidden
 *   (burst on resume) — the tick is now guarded with `document.hidden`, and the
 *   AudioContext is suspended/resumed on `visibilitychange` while audio is enabled.
 *
 * The ambient auto-SFX interval (legacy 548) lives here too and only fires when SFX are
 * enabled AND the tab is visible.
 *
 * Browser-global module by contract (rule 8): uses `window` AudioContext + `document`
 * visibility. All randomness (detune, SFX jitter, ambient cadence) flows through the
 * injected seeded `Rng` — never the built-in unseeded random (contract rule 7).
 *
 * Allocation note: oscillator/gain/filter nodes are created per musical beat / SFX
 * trigger (WebAudio's fire-and-forget model), never per animation frame — there is no
 * per-frame `update()` in this module.
 */
import type { Rng } from '../math/rng';
import type { SfxType, SimState } from '../types';
import { SFX_TYPES, SONGS } from './songs';

/** Scale steps used by both chords and melody (legacy `fNotes`, line 550). */
const F_NOTES: readonly number[] = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];

/**
 * Scale degree → frequency in Hz, base C3 = 130.81 Hz; degrees past the scale length
 * climb whole octaves (legacy `ffN`, line 551). Callers only pass degrees >= 0. O(1).
 */
function noteFreq(i: number): number {
  // i >= 0 always (chord/melody degrees are non-negative), so the index is in range.
  const semis = F_NOTES[i % F_NOTES.length]!;
  return 130.81 * Math.pow(2, semis / 12 + Math.floor(i / F_NOTES.length));
}

/**
 * Lazily initialized Web Audio engine. Construct once in world.ts, call {@link init}
 * from the first user gesture (autoplay policy), then drive it through the toggle/cycle
 * actions and {@link play}.
 *
 * Reads and advances `state.songIdx`; everything else is internal.
 */
export class AudioEngine {
  private readonly state: SimState;
  private readonly rng: Rng;
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private _musicOn = false;
  private _sfxOn = false;
  /** Preview cursor for {@link cycleSfxPreview} (legacy `sfxIdx`). */
  private sfxIdx = 0;

  /**
   * @param state Shared sim state; the engine reads/advances `songIdx` only.
   * @param rng Injected seeded Rng (contract rule 7) — detune, SFX jitter, ambient cadence.
   */
  constructor(state: SimState, rng: Rng) {
    this.state = state;
    this.rng = rng;
  }

  /** Music enabled? Read-only outside; flip via {@link toggleMusic}. */
  get musicOn(): boolean {
    return this._musicOn;
  }

  /** SFX enabled? Read-only outside; flip via {@link toggleSfx}. */
  get sfxOn(): boolean {
    return this._sfxOn;
  }

  /**
   * Lazy AudioContext init (legacy `initA`, lines 543-549). Safe to call repeatedly:
   * re-entry just resumes a suspended context. Call from the first user gesture.
   * Also installs the ambient auto-SFX interval and the visibilitychange
   * suspend/resume handler (Known Bug 3), both exactly once.
   */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return; // No Web Audio support: engine stays inert, toggles still track state.
    this.ctx = new Ctor();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0;
    this.sfxGain.connect(this.ctx.destination);
    // Ambient auto-SFX (legacy 548): only ticks while SFX are on AND the tab is visible.
    setInterval(
      () => {
        if (this._sfxOn && !document.hidden) this.play('ambient');
      },
      3500 + this.rng() * 3500,
    );
    // Known Bug 3: park the whole context while hidden; wake it only if audio is enabled.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        if (this._musicOn || this._sfxOn) void this.ctx.suspend();
      } else if (this._musicOn || this._sfxOn) {
        void this.ctx.resume();
      }
    });
  }

  /**
   * Toggle music (legacy `tM`, line 588). On: ramps the music bus to 0.25 and starts the
   * chord/melody/bass scheduler. Off: ramps to silence AND clears the scheduler interval
   * (Known Bug 2 — legacy left it running). Returns the new state.
   */
  toggleMusic(): boolean {
    this.init();
    this._musicOn = !this._musicOn;
    if (this._musicOn) {
      this.startScheduler();
    } else {
      this.stopScheduler(); // Known Bug 2 fix: legacy only ramped the gain down.
      if (this.ctx && this.musicGain) {
        this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      }
    }
    return this._musicOn;
  }

  /**
   * Toggle SFX (legacy `tS`, line 589): ramps the SFX bus between 0.3 and 0.
   * Returns the new state.
   */
  toggleSfx(): boolean {
    this.init();
    this._sfxOn = !this._sfxOn;
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this._sfxOn ? 0.3 : 0, this.ctx.currentTime, 0.1);
    }
    return this._sfxOn;
  }

  /**
   * Advance to the next song (legacy `cycleSong`, line 590) and return its display name.
   * If music is playing, the scheduler restarts on the new song immediately.
   */
  cycleSong(): string {
    this.state.songIdx = (this.state.songIdx + 1) % SONGS.length;
    // songIdx ∈ [0, SONGS.length) by the modulo above and SONGS is non-empty.
    const song = SONGS[this.state.songIdx]!;
    if (this._musicOn) this.startScheduler(); // startScheduler clears the old interval first.
    return song.name;
  }

  /**
   * Advance the SFX preview cursor, audition that SFX, and return its display label
   * (legacy `cycleSfx`, line 591 — e.g. `'SFX: WARP'`). The audition is silent while
   * SFX are toggled off, matching legacy `pS` gating.
   */
  cycleSfxPreview(): string {
    this.sfxIdx = (this.sfxIdx + 1) % SFX_TYPES.length;
    // sfxIdx ∈ [0, SFX_TYPES.length) by the modulo above and SFX_TYPES is non-empty.
    const type = SFX_TYPES[this.sfxIdx]!;
    this.play(type);
    return 'SFX: ' + type.toUpperCase();
  }

  /**
   * Fire one synthesized SFX (legacy `pS`, lines 562-572). No-op until {@link init} has
   * run and SFX are toggled on. O(1) — a handful of WebAudio nodes per trigger.
   */
  play(type: SfxType): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out || !this._sfxOn) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    const f = ctx.createBiquadFilter();
    switch (type) {
      case 'split':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(50, t + 1.2);
        gn.gain.setValueAtTime(0.12, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        o.connect(gn);
        break;
      case 'burst':
        o.type = 'square';
        o.frequency.setValueAtTime(200, t);
        o.frequency.linearRampToValueAtTime(1800, t + 0.1);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.7);
        gn.gain.setValueAtTime(0.1, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(gn);
        break;
      case 'mutate':
        o.type = 'sine';
        o.frequency.setValueAtTime(100 + this.rng() * 500, t);
        gn.gain.setValueAtTime(0.08, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 1);
        o.connect(gn);
        break;
      case 'warp':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(50, t);
        o.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
        o.frequency.exponentialRampToValueAtTime(100, t + 1.5);
        f.type = 'bandpass';
        f.frequency.value = 600;
        f.Q.value = 12;
        gn.gain.setValueAtTime(0.1, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        o.connect(f);
        f.connect(gn);
        break;
      case 'crystallize':
        o.type = 'sine';
        o.frequency.setValueAtTime(2000, t);
        o.frequency.linearRampToValueAtTime(4000, t + 0.05);
        o.frequency.exponentialRampToValueAtTime(800, t + 1);
        f.type = 'highpass';
        f.frequency.value = 1000;
        gn.gain.setValueAtTime(0.06, t);
        gn.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 1);
        o.connect(f);
        f.connect(gn);
        break;
      case 'decay':
        o.type = 'triangle';
        o.frequency.setValueAtTime(400, t);
        o.frequency.exponentialRampToValueAtTime(20, t + 2);
        f.type = 'lowpass';
        f.frequency.value = 300;
        f.Q.value = 8;
        gn.gain.setValueAtTime(0.08, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(f);
        f.connect(gn);
        break;
      case 'resonance': {
        o.type = 'sine';
        o.frequency.setValueAtTime(220, t);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5 + this.rng() * 10;
        const lg = ctx.createGain();
        lg.gain.value = 100 + this.rng() * 200;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + 2);
        gn.gain.setValueAtTime(0.07, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(gn);
        break;
      }
      case 'ambient':
        o.type = 'sawtooth';
        o.frequency.value = 40 + this.rng() * 90;
        gn.gain.setValueAtTime(0.02, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        o.connect(gn);
        break;
    }
    gn.connect(out);
    o.start(t);
    o.stop(t + 3);
  }

  /**
   * Chord/melody/bass scheduler (legacy `stM`, lines 553-561). One tick per beat
   * (`60000 / bpm` ms): a detuned, lowpass-filtered chord every beat, a melody note every
   * 2nd beat, a bass note every 4th; the chord index advances every 8 beats. Pitch
   * multiplier wraps every 4 octave steps (Known Bug 1 fix) and the tick is skipped while
   * the tab is hidden (Known Bug 3 fix).
   */
  private startScheduler(): void {
    this.init();
    const ctx = this.ctx;
    const mGn = this.musicGain;
    if (!ctx || !mGn) return;
    mGn.gain.setTargetAtTime(0.25, ctx.currentTime, 0.5);
    let st = 0;
    let ci = 0;
    const song = SONGS[this.state.songIdx % SONGS.length];
    if (!song) return; // Unreachable: SONGS is non-empty and the index is wrapped.
    this.stopScheduler();
    this.musicInterval = setInterval(
      () => {
        if (!this._musicOn || document.hidden) return; // Known Bug 3: no queueing while hidden.
        const t = ctx.currentTime;
        const ch = song.chords[ci % song.chords.length];
        if (!ch) return; // Unreachable: every song has at least one chord.
        // Known Bug 1 fix: wrap the octave climb instead of drifting ultrasonic forever.
        const octave = 0.5 + (Math.floor(st / 8) % 4) * 0.5;
        ch.forEach((n, i) => {
          const o = ctx.createOscillator();
          const gn = ctx.createGain();
          const f = ctx.createBiquadFilter();
          o.type = song.wave;
          o.frequency.value = noteFreq(n + (st % 3)) * octave;
          o.detune.value = (this.rng() - 0.5) * 18;
          f.type = 'lowpass';
          f.frequency.value = song.fBase + Math.sin(st * 0.1) * 300;
          f.Q.value = 2;
          gn.gain.setValueAtTime(0, t);
          gn.gain.linearRampToValueAtTime(0.05, t + 0.3);
          gn.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
          o.connect(f);
          f.connect(gn);
          gn.connect(mGn);
          o.start(t + i * 0.12);
          o.stop(t + 3.5);
        });
        if (st % 2 === 0) {
          const o = ctx.createOscillator();
          const gn = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = noteFreq(song.mel[st % song.mel.length] ?? 0) * 2;
          gn.gain.setValueAtTime(0, t);
          gn.gain.linearRampToValueAtTime(0.03, t + 0.1);
          gn.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
          o.connect(gn);
          gn.connect(mGn);
          o.start(t);
          o.stop(t + 2.5);
        }
        const root = ch[0];
        if (st % 4 === 0 && root !== undefined) {
          const o = ctx.createOscillator();
          const gn = ctx.createGain();
          o.type = song.bass;
          o.frequency.value = noteFreq(root) * 0.25;
          gn.gain.setValueAtTime(0, t);
          gn.gain.linearRampToValueAtTime(0.04, t + 0.5);
          gn.gain.exponentialRampToValueAtTime(0.001, t + 4);
          o.connect(gn);
          gn.connect(mGn);
          o.start(t);
          o.stop(t + 4);
        }
        st++;
        if (st % 8 === 0) ci++;
      },
      Math.round(60000 / song.bpm),
    );
  }

  /** Clear the music scheduler interval if running (Known Bug 2 helper). */
  private stopScheduler(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}
