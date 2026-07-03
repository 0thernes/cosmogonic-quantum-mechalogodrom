/**
 * Web Audio engine: procedural music scheduler + a data-driven 100-voice SFX synthesizer
 * (CONTRACTS V7.1 — a procedurally generated palette voiced by one generic `synth()`).
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
 *   (burst on resume) — the tick is now guarded with `document.hidden`, and the whole
 *   AudioContext is UNCONDITIONALLY suspended on `visibilitychange`→hidden / `pagehide`
 *   and resumed on visible (V126): the portal-horror bus runs on its own gain outside the
 *   music/sfx flags, so a flag-gated suspend let its scream drone on in a backgrounded tab.
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
import {
  SFX_CUE_BAND,
  SFX_EXTRA_BANDS,
  SFX_FAMILY_BANDS,
  SFX_TYPES,
  SONGS,
  createSfxPalette,
  type SfxSpec,
} from './songs';

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

/** Sleep timer: auto-mute music after this many minutes of continuous playback. */
const SLEEP_MS = 20 * 60 * 1000;

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
  private masterGain: GainNode | null = null;
  /** V112 cinematic reverb (music bus only): a long cathedral tail turning the oscillator voices
   *  into Horner/Annihilation space. Parallel send to masterGain so mute/sleep govern it; dry intact. */
  private reverb: ConvolverNode | null = null;

  // USER #18: PORTAL NIGHTMARE HORROR DRONE — sustained "1M dying slowly" screams + putrid warped begging.
  // Dark black low drones + bright high screaming layers + back-and-forth quiet/horror dynamics.
  // Equirect hell visual inspiration translated to sound: chaotic, ontologically shocking, demonic.
  private _portalHorror: {
    drone: OscillatorNode | null;
    scream: OscillatorNode | null;
    noise: AudioBufferSourceNode | null;
    filter: BiquadFilterNode | null;
    gain: GainNode | null;
    level: number;
  } | null = null;
  private reverbWet: GainNode | null = null;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  /** Sleep timer that auto-mutes after a period of continuous playback. */
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private sleepMs = SLEEP_MS;
  /** V122 (USER #7): true when the MASTER mute was engaged by the sleep timer, not the user — the
   *  doze used to be STICKY (music/SFX buttons flipped their own toggles under a silent master bus,
   *  so "audio died until refresh"); any audio control now wakes a dozed bus first. */
  private sleptAuto = false;
  /** Ambient auto-SFX timer + its visibilitychange handler — retained so {@link dispose} can clear
   *  them (the renderer side already tears down via Engine.dispose; the audio side must match). */
  private ambientInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  /** Hard-stop handler for tab close / navigation / minimize (pagehide fires where visibilitychange
   *  sometimes doesn't); retained so {@link dispose} can drop it. */
  private pagehideHandler: (() => void) | null = null;
  private _musicOn = false;
  private _sfxOn = false;
  private _muted = false;
  /** Preview cursor for {@link cycleSfxPreview} (legacy `sfxIdx`). */
  private sfxIdx = 0;
  /** Shared analysis tap (V2); created lazily by {@link tapAnalyser}, once per engine. */
  private analyser: AnalyserNode | null = null;
  /** The 100-entry procedural SFX palette (CONTRACTS V7.1), built once at construction. */
  private readonly palette: readonly SfxSpec[];
  /** Per-band round-robin cursor (keyed by band start) so repeat triggers don't repeat. */
  private readonly bandCursor = new Map<number, number>();
  /** Shared white-noise buffer for noisy specs (filled once, seeded by a local LCG). */
  private noiseBuf: AudioBuffer | null = null;
  /**
   * SIMULATION N(2) audio bend (CONTRACTS V7.6): 0 in GENESIS, 1 in BREAK FREE. When 1, every
   * music voice detunes ~35 cents flat and its filter darkens, and every SFX sting bends ~18%
   * down — the whole soundscape sags sick and ominous. Forked-rng / wall-clock-scheduled, so
   * it provably cannot touch sim reproducibility.
   */
  private nightmareBend = 0;

  /**
   * @param state Shared sim state; the engine reads/advances `songIdx` only.
   * @param rng Injected seeded Rng (contract rule 7) — palette generation, detune, SFX
   *   jitter, ambient cadence. This is the FORKED audio stream (seed ^ 0xa0d10), independent
   *   of the sim stream, so audio draws never perturb sim determinism.
   */
  constructor(state: SimState, rng: Rng) {
    this.state = state;
    this.rng = rng;
    this.palette = createSfxPalette(rng);
  }

  /** Safe driver for portal nightmare horror (item 18). Rich bus layers drone+scream when built. */
  setPortalNightmare(level: number = 0): void {
    const h = this._portalHorror;
    if (!h) return;
    h.level = Math.max(0, Math.min(5.5, level));
    const g = h.level > 0.05 ? Math.min(0.92, 0.1 + h.level * 0.16) : 0;
    if (h.gain && this.ctx) {
      h.gain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.12);
    }
    if (h.drone && this.ctx) {
      h.drone.frequency.setTargetAtTime(32 + h.level * 11, this.ctx.currentTime, 0.2);
    }
    if (h.scream && this.ctx) {
      h.scream.frequency.setTargetAtTime(360 + h.level * 220, this.ctx.currentTime, 0.15);
    }
    if (h.filter && this.ctx) {
      h.filter.frequency.setTargetAtTime(600 + h.level * 2800, this.ctx.currentTime, 0.18);
      h.filter.Q.setTargetAtTime(2.4 + h.level * 0.35, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Layered portal horror bus (item 18) — the "1M dying slowly" demonic nightmare. A low detuned-saw
   * DRONE bed + a high square-wave SCREAM + a putrid noise wash, all shaped by a resonant band-pass into
   * an ontologically-shocking hell timbre, summed into a MASTER GAIN that STARTS AT SILENCE and is routed
   * through {@link masterGain} (so global mute / sleep govern it).
   *
   * The old "constant whine" is designed out at BOTH ends: (1) world.ts only drives {@link
   * setPortalNightmare} with `level>0` during an ACTUAL portal ascension (else `level=0`), and (2) the
   * master gain here is `0` until a positive level ramps it up — so with no ascension the bus is dead
   * silent. The back-and-forth demonic swell comes from world.ts feeding a pulsing `portalPulse` level,
   * which sweeps the drone/scream/filter continuously. The oscillators run for the ctx's life (silent
   * when idle) and are stopped in {@link dispose}.
   */
  private buildPortalHorrorBus(): void {
    const ctx = this.ctx;
    if (!ctx || this._portalHorror) return;
    // Master — SILENT at rest; setPortalNightmare ramps it only during ascension (no whine when idle).
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain ?? ctx.destination);
    // Resonant band-pass shaping the layers into a putrid, hollow hell resonance.
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 2.4;
    filter.connect(gain);
    // Low drone bed — a detuned sawtooth pair beats a slow, sick dissonance.
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 32;
    drone.detune.value = -14;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.62;
    drone.connect(droneGain);
    droneGain.connect(filter);
    // High scream — a square wave shriek (the begging / screaming layer), swept by level.
    const scream = ctx.createOscillator();
    scream.type = 'square';
    scream.frequency.value = 360;
    const screamGain = ctx.createGain();
    screamGain.gain.value = 0.2;
    scream.connect(screamGain);
    screamGain.connect(filter);
    // Putrid noise wash (shared white-noise buffer, looped) — texture under the tones. Skipped if the
    // buffer hasn't been lazily built yet; the drone+scream still carry the horror.
    let noise: AudioBufferSourceNode | null = null;
    if (this.noiseBuf) {
      noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuf;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.13;
      noise.connect(noiseGain);
      noiseGain.connect(filter);
    }
    drone.start();
    scream.start();
    noise?.start();
    this._portalHorror = { drone, scream, noise, filter, gain, level: 0 };
  }

  /** Music enabled? Read-only outside; flip via {@link toggleMusic} or {@link setMusicOn}. */
  get musicOn(): boolean {
    return this._musicOn;
  }

  /**
   * Set the music state from persisted preference (no-op if already in target state).
   * Called during first-gesture unlock so a persisted `musicOn=true` starts playing
   * without requiring a manual toggle. Does NOT create the AudioContext itself — the
   * caller must `init()` first.
   */
  setMusicOn(on: boolean): void {
    if (this._musicOn === on) return;
    this._musicOn = on;
    if (this._musicOn) {
      this.startScheduler();
      this.resetSleepTimer();
    } else {
      this.stopScheduler();
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      }
    }
  }

  /** SFX enabled? Read-only outside; flip via {@link toggleSfx}. */
  get sfxOn(): boolean {
    return this._sfxOn;
  }

  /** Master mute state? Read-only outside; flip via {@link toggleMute}. */
  get muted(): boolean {
    return this._muted;
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
    if (typeof window === 'undefined') return; // No browser context (e.g. unit tests): keep inert.
    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return; // No Web Audio support: engine stays inert, toggles still track state.
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.masterGain);
    // V112: parallel cinematic reverb send off the music bus -> masterGain (so mute/sleep govern it
    // too); SFX stay dry + punchy. Highpassed at 300 Hz so sub-bass never muddies the long tail.
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.buildReverbIR(this.ctx);
    const reverbHP = this.ctx.createBiquadFilter();
    reverbHP.type = 'highpass';
    reverbHP.frequency.value = 300;
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0.34;
    this.musicGain.connect(reverbHP);
    reverbHP.connect(this.reverb);
    this.reverb.connect(this.reverbWet);
    this.reverbWet.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0;
    this.sfxGain.connect(this.masterGain);
    this.buildPortalHorrorBus();
    // Ambient auto-SFX (legacy 548): only ticks while SFX are on AND the tab is visible.
    this.ambientInterval = setInterval(
      () => {
        if (this._sfxOn && typeof document !== 'undefined' && !document.hidden) {
          this.play('ambient');
        }
      },
      3500 + this.rng() * 3500,
    );
    // Known Bug 3 (hardened V126): park the ENTIRE context whenever the page is hidden — not merely
    // when music/sfx are on. The portal-horror bus (a sustained square-wave scream) runs on its OWN
    // gain, independent of _musicOn/_sfxOn, and the requestAnimationFrame loop that ramps its level
    // back to 0 when an ascension ends is throttled to a STOP while the tab is hidden — so without an
    // unconditional suspend the scream droned on forever in a backgrounded / minimized tab (the
    // "endless reeeee that won't stop even when I look away / close the window" bug). Suspending
    // silences ALL audio while hidden; a running-but-silent ctx after resume costs nothing.
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    // Hard stop on tab close / navigation / minimize: `pagehide` fires in cases visibilitychange can
    // miss (bfcache eviction, iOS, some window-minimize paths). Suspend so nothing lingers past the
    // page; a bfcache restore + the next user gesture re-inits/resumes.
    if (typeof window !== 'undefined') {
      this.pagehideHandler = () => {
        if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
      };
      window.addEventListener('pagehide', this.pagehideHandler);
    }
  }

  /**
   * Lifecycle teardown (HMR / world disposal): stop the scheduler, clear the ambient timer, drop the
   * visibilitychange listener, and close the AudioContext. Idempotent — safe to call when never
   * `init()`-ed. Without this, every dev hot-reload leaked a live interval + listener + context
   * bound to the dead engine (the renderer side already disposed via Engine.dispose; this matches it).
   */
  dispose(): void {
    this.stopScheduler();
    if (this.ambientInterval !== null) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.pagehideHandler) {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', this.pagehideHandler);
      }
      this.pagehideHandler = null;
    }
    const horror = this._portalHorror;
    if (horror) {
      try {
        horror.drone?.stop();
        horror.scream?.stop();
        horror.noise?.stop();
      } catch {
        /* already stopped */
      }
      this._portalHorror = null;
    }
    const ctx = this.ctx;
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.reverb = null;
    this.reverbWet = null;
    this.analyser = null;
    this._musicOn = false;
    this._sfxOn = false;
    this._muted = false;
    if (this.sleepTimer !== null) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    if (ctx && ctx.state !== 'closed') void ctx.close();
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
    this.wake(); // V122: a dozed master bus wakes on any audio button (USER #7)
    this._musicOn = !this._musicOn;
    if (this._musicOn) {
      this.startScheduler();
      this.resetSleepTimer();
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
    this.wake(); // V122: a dozed master bus wakes on any audio button (USER #7)
    this._sfxOn = !this._sfxOn;
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this._sfxOn ? 0.3 : 0, this.ctx.currentTime, 0.1);
    }
    return this._sfxOn;
  }

  /**
   * Master mute/unmute: silences both music and SFX buses without changing their individual
   * toggle states, so unmuting restores exactly what was playing. Ramps to avoid clicks.
   * Resets/clears the sleep timer so user intent is respected.
   */
  toggleMute(): boolean {
    this.init();
    this.sleptAuto = false; // a manual mute action takes ownership from the sleep doze
    this._muted = !this._muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._muted ? 0 : 1, this.ctx.currentTime, 0.1);
    }
    if (this._muted) {
      this.clearSleepTimer();
    } else if (this._musicOn) {
      this.resetSleepTimer();
    }
    return this._muted;
  }

  /**
   * Toggle the SIMULATION N(2) audio bend (CONTRACTS V7.6) — detunes + darkens the whole
   * soundscape. Takes effect on subsequently-scheduled voices/stings (no per-frame audio work
   * exists; the scheduler is fire-and-forget per beat). O(1). World calls it from
   * `applySimVisuals`.
   */
  setNightmare(on: boolean): void {
    this.nightmareBend = on ? 1 : 0;
  }

  /**
   * Advance to the next song (legacy `cycleSong`, line 590) and return its display name.
   * If music is playing, the scheduler restarts on the new song immediately.
   */
  cycleSong(): string {
    this.wake(); // V122: a dozed master bus wakes on any audio button (USER #7)
    this.state.songIdx = (this.state.songIdx + 1) % SONGS.length;
    // songIdx ∈ [0, SONGS.length) by the modulo above and SONGS is non-empty.
    const song = SONGS[this.state.songIdx]!;
    if (this._musicOn) {
      this.startScheduler(); // startScheduler clears the old interval first.
      this.resetSleepTimer();
    }
    return song.name;
  }

  /**
   * Advance the SFX preview cursor, audition that SFX, and return its display label
   * (legacy `cycleSfx`, line 591 — e.g. `'SFX: WARP'`). The audition is silent while
   * SFX are toggled off, matching legacy `pS` gating.
   */
  cycleSfxPreview(): string {
    this.wake(); // V122: a dozed master bus wakes on any audio button (USER #7)
    this.sfxIdx = (this.sfxIdx + 1) % SFX_TYPES.length;
    // sfxIdx ∈ [0, SFX_TYPES.length) by the modulo above and SFX_TYPES is non-empty.
    const type = SFX_TYPES[this.sfxIdx]!;
    this.play(type);
    return 'SFX: ' + type.toUpperCase();
  }

  /**
   * Fire one synthesized SFX for a semantic action (legacy `pS`). Selects from the action's
   * family band in the 100-entry palette via a per-band round-robin cursor PLUS a per-trigger
   * pitch jitter, so repeated triggers of the same action never sound identical (CONTRACTS
   * V7.1 — "nothing repetitive"). No-op until {@link init} has run and SFX are on. O(1).
   */
  play(type: SfxType): void {
    if (!this.ctx || !this.sfxGain || !this._sfxOn) return;
    const band = SFX_FAMILY_BANDS[type];
    const cursor = this.bandCursor.get(band.start) ?? Math.floor(this.rng() * band.count);
    this.bandCursor.set(band.start, cursor + 1);
    const spec = this.palette[band.start + (cursor % band.count)];
    if (spec) this.synth(spec, this.rng());
  }

  /**
   * Fire palette entry `n` directly (CONTRACTS V7.1) — used by cosmology/impact systems and
   * any caller that wants a specific engineered voice. Clamped into range; honors the SFX
   * toggle. O(1).
   */
  playId(n: number): void {
    if (!this.ctx || !this.sfxGain || !this._sfxOn) return;
    const i = ((Math.floor(n) % this.palette.length) + this.palette.length) % this.palette.length;
    const spec = this.palette[i];
    if (spec) this.synth(spec, this.rng());
  }

  /**
   * V109: fire a sound from a named extra band (alienchitter, demonic, howl, etc.).
   * Round-robin within the band + per-trigger jitter, like {@link play}.
   */
  playExtra(name: string): void {
    if (!this.ctx || !this.sfxGain || !this._sfxOn) return;
    const band = SFX_EXTRA_BANDS[name];
    if (!band) return;
    const cursor = this.bandCursor.get(band.start) ?? Math.floor(this.rng() * band.count);
    this.bandCursor.set(band.start, cursor + 1);
    const spec = this.palette[band.start + (cursor % band.count)];
    if (spec) this.synth(spec, this.rng());
  }

  /**
   * USER #7a: NHI launch sound — bright, inhuman, short, shimmery. Marks a new alien colossus
   * appearing in the dome. Deterministic (uses the audio fork-rng), no per-frame cost.
   */
  playNhiLaunch(): void {
    this.playExtra('alienchitter');
  }

  /**
   * USER #7a: NHI social chorus — called when nearby NHIs are detected by nhi-body.ts. The social
   * level (0..1) scales the volume via the SFX bus gain, so a mob of NHIs sounds denser than a
   * lone wanderer.
   */
  playNhiSocial(socialLevel: number = 0.5): void {
    if (!this.ctx || !this.sfxGain || !this._sfxOn) return;
    const gain = this.sfxGain.gain.value;
    // Temporarily boost the SFX bus for this chorus, then restore.
    const t = this.ctx.currentTime;
    this.sfxGain.gain.setValueAtTime(gain, t);
    this.sfxGain.gain.linearRampToValueAtTime(Math.min(0.55, gain + socialLevel * 0.25), t + 0.08);
    this.sfxGain.gain.linearRampToValueAtTime(gain, t + 0.45);
    this.playExtra('howl');
  }

  /** USER #7a: NHI death/despawn — low sub-boom as the alien body collapses. */
  playNhiDeath(): void {
    this.playExtra('subboom');
  }

  /**
   * Lazily build the shared white-noise buffer for noisy specs. Filled ONCE with a local
   * xorshift (not the injected rng — noise content needs no seed-reproducibility, and this
   * avoids draining ~½s·sampleRate draws from the audio stream; not the banned global RNG
   * either). 0.5 s mono. O(sampleRate) once.
   */
  /**
   * Procedural reverb impulse response (V112): a ~3.6 s stereo exponential-decay noise tail.
   * Filled ONCE with a local xorshift (like noiseBuffer below — reverb content needs no
   * seed-reproducibility and must not drain the audio rng stream), channels decorrelated for a
   * wide cathedral image; a short onset ramp avoids a click. Determinism-safe: this bus is
   * forked-rng + wall-clock and never touches sim state. O(sampleRate) once.
   */
  private buildReverbIR(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 3.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    let x = 0x6d2b79f5 >>> 0;
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        x >>>= 0;
        const onset = i < 480 ? i / 480 : 1;
        const decay = Math.pow(1 - i / len, 2.4);
        d[i] = ((x / 0xffffffff) * 2 - 1) * decay * onset;
      }
    }
    return ir;
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let x = 0x9e3779b9 >>> 0;
    for (let i = 0; i < len; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      x >>>= 0;
      data[i] = (x / 0xffffffff) * 2 - 1;
    }
    this.noiseBuf = buf;
    return buf;
  }

  /**
   * Voice one {@link SfxSpec} on the SFX bus (CONTRACTS V7.1). Builds the primary oscillator
   * (with a one- or two-segment pitch ramp), an optional biquad filter, optional FM and
   * pitch-LFO modulators, an optional octave shimmer partial, and an optional filtered noise
   * burst — exactly the parts the spec enables. Fire-and-forget; nodes are GC'd after `stop`.
   * O(1): a small constant of WebAudio nodes per trigger (never per animation frame).
   *
   * @param spec The palette descriptor to voice.
   * @param jitter A 0..1 sample (from the forked rng) wobbling f-values by ±½·spec.jitter.
   */
  private synth(spec: SfxSpec, jitter: number): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    // N(2) bend: every sting drops ~18% in pitch — sick, detuned, wrong (CONTRACTS V7.6).
    const jf = (1 + (jitter - 0.5) * spec.jitter) * (1 - 0.18 * this.nightmareBend);
    const f0 = Math.max(20, spec.f0 * jf);
    const f1 = Math.max(20, spec.f1 * jf);
    const peak = Math.max(0.0005, spec.peak);
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = spec.wave;
    o.frequency.setValueAtTime(f0, t);
    const seg1 = spec.f2 > 0 ? t + spec.dur * 0.18 : t + spec.dur;
    if (spec.ramp === 'lin') o.frequency.linearRampToValueAtTime(f1, seg1);
    else o.frequency.exponentialRampToValueAtTime(f1, seg1);
    if (spec.f2 > 0) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, spec.f2 * jf), t + spec.dur);
    }
    // Optional filter in series with the main oscillator.
    let node: AudioNode = o;
    if (spec.filterType !== '') {
      const f = ctx.createBiquadFilter();
      f.type = spec.filterType;
      f.frequency.value = spec.filterFreq;
      f.Q.value = spec.filterQ;
      o.connect(f);
      node = f;
    }
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(peak, t + spec.attack + 0.001);
    gn.gain.exponentialRampToValueAtTime(0.0008, t + spec.dur);
    node.connect(gn);
    gn.connect(out);
    o.start(t);
    o.stop(t + spec.dur + 0.05);
    // FM modulator → carrier frequency. Depth is clamped to 80% of the (jittered) carrier so
    // the instantaneous frequency can never swing negative — WebAudio clamps a negative
    // frequency to ~0, which silenced the tails of the most alien specs when the carrier
    // ramped toward 20-28 Hz with depths up to 600 Hz (audit 13d).
    if (spec.fmRatio > 0 && spec.fmDepth > 0) {
      const mod = ctx.createOscillator();
      const mg = ctx.createGain();
      mod.frequency.value = f0 * spec.fmRatio;
      mg.gain.value = Math.min(spec.fmDepth, f0 * 0.8);
      mod.connect(mg);
      mg.connect(o.frequency);
      mod.start(t);
      mod.stop(t + spec.dur + 0.05);
    }
    // Pitch-LFO (vibrato/wobble) → carrier frequency. Same negative-frequency clamp.
    if (spec.lfoRate > 0 && spec.lfoDepth > 0) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = spec.lfoRate;
      lg.gain.value = Math.min(spec.lfoDepth, f0 * 0.8);
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + spec.dur + 0.05);
    }
    // Octave shimmer partial.
    if (spec.partial > 0) {
      const op = ctx.createOscillator();
      const pg = ctx.createGain();
      op.type = 'sine';
      op.frequency.value = f0 * spec.partial;
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.exponentialRampToValueAtTime(peak * 0.4, t + 0.012);
      pg.gain.exponentialRampToValueAtTime(0.0008, t + spec.dur * 0.6);
      op.connect(pg);
      pg.connect(out);
      op.start(t);
      op.stop(t + spec.dur * 0.6 + 0.05);
    }
    // Filtered noise burst (zaps/booms/strange).
    if (spec.noise > 0) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(ctx);
      const nf = ctx.createBiquadFilter();
      const ng = ctx.createGain();
      nf.type = 'bandpass';
      nf.frequency.value = Math.min(8000, f0 * 4 + 400);
      nf.Q.value = 1;
      ng.gain.setValueAtTime(spec.noise * peak, t);
      ng.gain.exponentialRampToValueAtTime(0.0005, t + Math.min(0.25, spec.dur));
      src.connect(nf);
      nf.connect(ng);
      ng.connect(out);
      src.start(t);
      src.stop(t + Math.min(0.3, spec.dur) + 0.02);
    }
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
    if (!this.ctx || !this.sfxGain || !this._sfxOn) return;
    const n = Math.max(1, total);
    const i = ((Math.floor(idx) % n) + n) % n;
    // Route through the 25-slot cue band (CONTRACTS V7.1): each field has its own engineered
    // ascending voice with a built-in octave shimmer. Map an arbitrary field count onto the
    // 25 cue voices proportionally so any ALGOS length stays in band.
    const slot =
      SFX_CUE_BAND.start +
      Math.min(SFX_CUE_BAND.count - 1, Math.floor((i / n) * SFX_CUE_BAND.count));
    const spec = this.palette[slot];
    if (spec) this.synth(spec, this.rng());
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
    // N(2): detune ~35 cents flat (sick sag) + darken the filter (CONTRACTS V7.6).
    o.detune.value = detune - this.nightmareBend * 35;
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(peak, t + attack);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (cutoff > 0 && Number.isFinite(cutoff)) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff * (1 - 0.4 * this.nightmareBend);
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
        if (st % 8 === 0) {
          const root = ch[0];
          const crown = ch[ch.length - 1];
          if (root !== undefined && crown !== undefined) {
            const padCutoff = Math.max(260, cutoff * 0.72);
            this.voice(
              t,
              noteFreq(root) * octave * 0.5,
              'triangle',
              0.025 * intensity,
              1.2,
              7.6,
              -14,
              padCutoff,
            );
            this.voice(
              t + 0.18,
              noteFreq(crown) * octave,
              'sine',
              0.018 * intensity,
              1.6,
              7.2,
              11,
              padCutoff,
            );
          }
        }
        if (st % 4 === 2) {
          const bell = song.mel[(st + 5) % song.mel.length] ?? 0;
          this.voice(
            t + 0.03,
            noteFreq(bell) * octave * 3,
            'sine',
            0.018 * intensity,
            0.006,
            2.8,
            (this.rng() - 0.5) * 16,
            0,
          );
          this.voice(
            t + 0.07,
            noteFreq(bell + 5) * octave * 2,
            'triangle',
            0.012 * intensity,
            0.02,
            2.2,
            (this.rng() - 0.5) * 12,
            0,
          );
        }
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
    this.clearSleepTimer();
  }

  /** Reset the sleep timer so music keeps playing until sleepMs of continuous playback. */
  private resetSleepTimer(): void {
    this.clearSleepTimer();
    this.sleepTimer = setTimeout(() => {
      this.sleepTimer = null;
      if (this._musicOn && !this._muted) {
        this.toggleMute();
        this.sleptAuto = true; // a recoverable DOZE, not a user mute — any audio button wakes it
      }
    }, this.sleepMs);
  }

  /** V122 (USER #7): wake a sleep-dozed master bus. No-op unless the sleep timer muted it. */
  private wake(): void {
    if (this.sleptAuto) {
      this.sleptAuto = false;
      if (this._muted) this.toggleMute(); // restores the master gain + re-arms the sleep timer
    }
  }

  /** Test hook: override the auto-mute sleep delay. */
  setSleepDelay(ms: number): void {
    this.sleepMs = Math.max(0, ms);
    if (this._musicOn && !this._muted) this.resetSleepTimer();
  }

  private clearSleepTimer(): void {
    if (this.sleepTimer !== null) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
  }
}
