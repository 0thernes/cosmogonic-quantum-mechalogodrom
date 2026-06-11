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
 *
 * V2 (0.2.0): adds the shared analyser tap ({@link AudioEngine.tapAnalyser}) feeding
 * src/audio/analysis.ts — ONE lazily created AnalyserNode fan-out connected from both
 * busses, so tapping never changes what is audible.
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
 * Per-song intensity envelope (V5.2 dynamics): a slow rising/falling swell over a
 * 32-beat phrase that scales voice gains and filter brightness so every piece breathes
 * — building dread, cresting, and ebbing rather than droning flat. Returns a multiplier
 * in roughly [0.55, 1.15]: a raised-cosine swell (one full build-and-release per phrase)
 * plus a gentler 8-beat ripple for motion within the phrase. Pure, allocation-free, O(1).
 *
 * @param st Absolute beat counter since the song (re)started.
 */
function intensityAt(st: number): number {
  const phrase = ((st % 32) / 32) * Math.PI * 2; // one full cycle per 32-beat phrase
  const swell = 0.5 - 0.5 * Math.cos(phrase); // 0 → 1 → 0 raised cosine
  const ripple = 0.5 + 0.5 * Math.sin(st * (Math.PI / 4)); // 8-beat sub-motion
  return 0.55 + swell * 0.5 + ripple * 0.1;
}

/**
 * Master headroom (V5.2): steady-state music-bus gain. The 0.5.0 rescore stacks many
 * more simultaneous voices (sub-bass octave, a third detuned chord layer, chord-tone
 * arpeggiation) than the legacy two-voice texture, so the bus sits lower than the legacy
 * 0.25 to keep the summed signal clear of the 0 dBFS clip ceiling at high density.
 */
const MUSIC_BUS_GAIN = 0.2;

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
  /** Shared analysis tap (V2); created lazily by {@link tapAnalyser}, once per engine. */
  private analyser: AnalyserNode | null = null;

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
   * Lazily create and return the shared analysis tap (CONTRACTS V2): a single
   * AnalyserNode (fftSize 256, smoothingTimeConstant 0.8) fan-out connected from BOTH
   * the music and SFX gain busses in addition to their existing destination links, so
   * tapping never alters what is audible. Returns null until {@link init} has created
   * the AudioContext (or forever, when Web Audio is unsupported — graceful silence).
   * O(1); the node and its two connections are created exactly once per engine.
   */
  tapAnalyser(): AnalyserNode | null {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return null;
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      // Fan-out: GainNode.connect supports multiple destinations, so both busses keep
      // feeding ctx.destination while also feeding the analyser (a sink-only tap).
      this.musicGain.connect(this.analyser);
      this.sfxGain.connect(this.analyser);
    }
    return this.analyser;
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
   * Play a UNIQUE cue tone for sorting field `idx` of `total` — each of the 25
   * fields announces itself with its own sound. The pitch climbs ~3 octaves
   * across the index range and the waveform rotates through four timbres, so no
   * two fields sound alike; a plucked downward chirp plus a shimmering octave
   * partial give it sparkle to match the on-screen light show. Honors the SFX
   * toggle; silent when audio is off or unavailable. O(1) — a few WebAudio nodes
   * per call (a user gesture, never per frame).
   */
  cue(idx: number, total: number): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out || !this._sfxOn) return;
    const t = ctx.currentTime;
    const n = Math.max(1, total);
    const i = ((idx % n) + n) % n;
    const base = 196 * Math.pow(2, (i * (36 / n)) / 12); // G3-rooted, ~3 octaves over the list
    const waves: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
    // Body voice: plucked, with a quick downward chirp and a lowpass for tone.
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = waves[i % 4] ?? 'sine';
    o.frequency.setValueAtTime(base * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.12);
    f.type = 'lowpass';
    f.frequency.value = base * 6;
    f.Q.value = 4;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(f);
    f.connect(gn);
    gn.connect(out);
    o.start(t);
    o.stop(t + 0.7);
    // Shimmer partial: a quieter octave sine for sparkle.
    const o2 = ctx.createOscillator();
    const gn2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(base * 2, t);
    gn2.gain.setValueAtTime(0.0001, t);
    gn2.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
    gn2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o2.connect(gn2);
    gn2.connect(out);
    o2.start(t);
    o2.stop(t + 0.4);
  }

  /**
   * Spawn one enveloped, optionally-filtered oscillator voice on the music bus
   * (V5.2 helper). Consolidates the repeated WebAudio node-wiring the deepened
   * synthesis needs. Fire-and-forget: nodes are GC'd after `stop`. O(1); allocates
   * only the handful of WebAudio nodes WebAudio's model requires per note (never
   * per animation frame — this runs on the scheduler's beat interval).
   *
   * @param t Context start time for the voice.
   * @param freq Oscillator frequency in Hz (already octave-scaled by the caller).
   * @param wave Oscillator waveform.
   * @param peak Peak gain after the attack ramp (already intensity-scaled).
   * @param attack Attack time in seconds.
   * @param dur Total lifetime in seconds; the gain decays to silence by `t + dur`.
   * @param detune Detune in cents (caller draws jitter from the forked rng).
   * @param cutoff Optional lowpass cutoff in Hz; when finite, a 1-pole-ish biquad is
   *   inserted (Q 2) so chord/arp voices share the song's swelling filter colour.
   */
  private voice(
    t: number,
    freq: number,
    wave: OscillatorType,
    peak: number,
    attack: number,
    dur: number,
    detune: number,
    cutoff: number,
  ): void {
    const ctx = this.ctx;
    const mGn = this.musicGain;
    if (!ctx || !mGn) return;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = wave;
    o.frequency.value = freq;
    o.detune.value = detune;
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(peak, t + attack);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (cutoff > 0 && Number.isFinite(cutoff)) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      f.Q.value = 2;
      o.connect(f);
      f.connect(gn);
    } else {
      o.connect(gn);
    }
    gn.connect(mGn);
    o.start(t);
    o.stop(t + dur);
  }

  /**
   * Chord/melody/bass scheduler (legacy `stM`, lines 553-561), deepened for the 0.5.0
   * "Resonance" rescore (V5.2). One tick per beat (`60000 / bpm` ms):
   *
   * - a detuned, lowpass-filtered chord every beat, now THREE voices per chord note
   *   (centre + two opposed-detune partials) for a thick, beating chorus;
   * - a slow filter-cutoff LFO swell (two summed sines) over the song's `fBase`, so the
   *   harmony opens and closes rather than sitting at a fixed brightness;
   * - chord-tone arpeggiation on the off-beat — a short plucked tone walking the chord;
   * - a melody note every 2nd beat;
   * - a bass note every 4th beat PLUS a sub-bass octave one octave below it;
   * - a per-song rising/falling intensity envelope ({@link intensityAt}) scaling every
   *   voice's gain and the filter brightness so each piece breathes dramatically.
   *
   * The chord index advances every 8 beats. Pitch multiplier wraps every 4 octave steps
   * (Known Bug 1 fix) and the tick is skipped while the tab is hidden (Known Bug 3 fix).
   * Master headroom is held by {@link MUSIC_BUS_GAIN} and conservative per-voice peaks so
   * the denser texture stays clear of clipping. All jitter draws from the forked `this.rng`
   * (never the global RNG), preserving the engine's independent deterministic stream.
   *
   * Complexity: O(chord notes) WebAudio nodes per beat — a small constant; no per-frame work.
   */
  private startScheduler(): void {
    this.init();
    const ctx = this.ctx;
    const mGn = this.musicGain;
    if (!ctx || !mGn) return;
    mGn.gain.setTargetAtTime(MUSIC_BUS_GAIN, ctx.currentTime, 0.5);
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
        const intensity = intensityAt(st);
        // Filter-cutoff LFO swell: a slow deep sweep (≈21-beat period) plus the legacy
        // fast ripple, widened by the current intensity so loud phrases open up brighter.
        const cutoff =
          song.fBase + (Math.sin(st * 0.3) * 260 + Math.sin(st * 0.1) * 220) * intensity;
        ch.forEach((n, i) => {
          const base = noteFreq(n + (st % 3)) * octave;
          const peak = 0.045 * intensity;
          // Centre voice + two opposed detuned partials = a thick, slowly-beating chorus.
          this.voice(
            t + i * 0.12,
            base,
            song.wave,
            peak,
            0.3,
            3.5,
            (this.rng() - 0.5) * 18,
            cutoff,
          );
          this.voice(
            t + i * 0.12,
            base,
            song.wave,
            peak * 0.6,
            0.35,
            3.5,
            (this.rng() - 0.5) * 14 - 9,
            cutoff,
          );
          this.voice(
            t + i * 0.12,
            base,
            song.wave,
            peak * 0.6,
            0.35,
            3.5,
            (this.rng() - 0.5) * 14 + 9,
            cutoff,
          );
        });
        // Chord-tone arpeggiation: on the off-beat, pluck one rising chord tone an octave
        // up — a glinting filigree over the held chord that walks the voicing across beats.
        if (st % 2 === 1) {
          const an = ch[st % ch.length];
          if (an !== undefined) {
            this.voice(
              t,
              noteFreq(an) * octave * 2,
              'triangle',
              0.026 * intensity,
              0.01,
              0.5,
              (this.rng() - 0.5) * 10,
              0,
            );
          }
        }
        if (st % 2 === 0) {
          this.voice(
            t,
            noteFreq(song.mel[st % song.mel.length] ?? 0) * 2,
            'sine',
            0.032 * intensity,
            0.1,
            2.5,
            0,
            0,
          );
        }
        const root = ch[0];
        if (st % 4 === 0 && root !== undefined) {
          const bassFreq = noteFreq(root) * 0.25;
          this.voice(t, bassFreq, song.bass, 0.04 * intensity, 0.5, 4, 0, 0);
          // Sub-bass octave: a pure sine an octave below the bass for subterranean weight.
          this.voice(t, bassFreq * 0.5, 'sine', 0.05 * intensity, 0.5, 4, 0, 0);
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
