/**
 * Procedural soundtrack and SFX catalog data.
 *
 * Leaf module (contract rule 4): the only import is type-only, so this file has zero
 * runtime dependencies and runs under `bun test` without a DOM.
 *
 * Ported from the legacy monolith (lines 197-204) and rescored. `chords` and `mel` hold
 * scale degrees into the audio engine's 10-step scale (legacy `fNotes`); `fBase` is the
 * chord lowpass-filter base cutoff in Hz; `bpm` drives the scheduler interval.
 */
import type { Rng } from '../math/rng';
import type { SfxType, Song } from '../types';

/**
 * The procedural songs, cycle order preserved. 0.5.0 "Resonance" rescore (V5.2):
 * the summoner loves QUANTUM and BLACK MERIDIAN and wants the WHOLE cycle at that
 * tier — Final-Fantasy extreme dark-endgame: powerful, dynamic, ominous, deep,
 * dramatic, each a DIFFERENT species of dark.
 *
 * QUANTUM and BLACK MERIDIAN are kept bit-identical (the references). VOIDCROWN,
 * ELDER ENGINE and LAST THEOREM are rebuilt to full 4-note dramatic voicings with
 * longer, evolving 16-step melodies and a distinct character each. One new song,
 * STARKILLER REQUIEM, closes the cycle as a cataclysmic finale.
 *
 * Degree indices map through the engine's 10-step scale (fNotes semitones
 * 0,2,3,5,7,8,10,12,14,15; degree d → semitone `fNotes[d % 10] + 12·floor(d/10)`),
 * so the voicings below are chosen as SEMITONE stacks, noted per chord. The engine
 * adds its own sub-bass octave, third detuned chord voice, chord-tone arpeggiation,
 * filter-cutoff LFO swells, and a per-song rising/falling intensity envelope, so the
 * data here only needs to carry the harmony, melody and timbre of each piece.
 */
export const SONGS: readonly Song[] = [
  {
    // Funeral colossus — the slowest, heaviest dread in the cycle. Hollow minor
    // voids that bloom into a grieving minor-9th, a subterranean sine bass beneath.
    // A cathedral of bone. Semis: {0,3,7,10} {0,3,8,14} {0,5,10,12} {0,3,7,15}.
    name: 'VOIDCROWN',
    bpm: 56,
    chords: [
      [0, 2, 4, 6],
      [0, 2, 5, 8],
      [0, 3, 6, 7],
      [0, 2, 4, 9],
    ],
    wave: 'sawtooth',
    bass: 'sine',
    // A slow descending procession that keeps falling back to the tonic, then lifts
    // a tragic minor-third before sinking again — a dirge that refuses to resolve.
    mel: [9, 7, 6, 4, 6, 2, 4, 1, 2, 0, 4, 2, 1, 0, 4, 6],
    fBase: 360,
  },
  {
    // Relentless pursuit — minor-b6 engine at full sprint, square-on-square;
    // the final-boss chase. Semis: {0,3,8,12} {0,3,10,15} {0,8,12,14}
    // {0,5,8,14}.
    name: 'BLACK MERIDIAN',
    bpm: 156,
    chords: [
      [0, 2, 5, 7],
      [0, 2, 6, 9],
      [0, 5, 7, 11],
      [0, 3, 5, 8],
    ],
    wave: 'square',
    bass: 'square',
    mel: [0, 5, 3, 8, 6, 9, 8, 11, 9, 6, 3, 1],
    fBase: 760,
  },
  {
    // Ritual machine-god — clangorous fifth+flat-six dirges with grinding minor-2nd
    // and tritone clusters in the high register, double sawtooth. The sound of a vast
    // mechanism worshipping itself. Semis: {0,7,8,10} {0,3,8,14} {0,5,7,8} {0,6,8,15}.
    name: 'ELDER ENGINE',
    bpm: 96,
    chords: [
      [0, 4, 5, 6],
      [0, 2, 5, 8],
      [0, 3, 4, 5],
      [0, 5, 5, 9],
    ],
    wave: 'sawtooth',
    bass: 'sawtooth',
    // Hammering ostinato that hangs on the tonic, then ratchets up a flat-five and
    // wrenches back — a machine cycling through its liturgy, never quite the same.
    mel: [0, 0, 4, 0, 5, 0, 6, 4, 0, 0, 5, 4, 8, 6, 5, 4],
    fBase: 420,
  },
  {
    // Tragic endgame aria — noble minor-octave voicings torn by a flat-10th, wide
    // soaring leaps over a swelling string-saw bass; grief with a sword in its hand.
    // The hero's last stand. Semis: {0,3,7,12} {0,5,8,15} {0,3,10,14} {0,7,12,15}.
    name: 'LAST THEOREM',
    bpm: 112,
    chords: [
      [0, 2, 4, 7],
      [0, 3, 5, 9],
      [0, 2, 6, 8],
      [0, 4, 7, 9],
    ],
    wave: 'triangle',
    bass: 'sawtooth',
    // A soaring, weeping line: it climbs to a high suspended peak, breaks, and falls
    // a full octave to the depths before gathering to climb again.
    mel: [4, 7, 9, 11, 13, 11, 9, 12, 9, 7, 4, 2, 0, 2, 4, 7],
    fBase: 900,
  },
  {
    name: 'QUANTUM',
    bpm: 140,
    chords: [
      [0, 2, 4, 8],
      [0, 4, 6, 10],
      [0, 2, 8],
      [0, 6, 10],
    ],
    wave: 'square',
    bass: 'sawtooth',
    mel: [0, 2, 4, 6, 8, 10, 8, 6, 4, 2, 0, 10],
    fBase: 600,
  },
  {
    // Cataclysm finale — the cycle's apocalypse. Towering minor-major and tritone
    // pillars stacked across two octaves, a triangle sub-bass like collapsing
    // architecture, slow and immense. The last song before the end of the world.
    // Semis: {0,3,7,14} {0,5,8,15} {0,6,10,12} {0,3,8,17}.
    name: 'STARKILLER REQUIEM',
    bpm: 72,
    chords: [
      [0, 2, 4, 8],
      [0, 3, 5, 9],
      [0, 5, 6, 7],
      [0, 2, 5, 11],
    ],
    wave: 'sawtooth',
    bass: 'triangle',
    // Vast, deliberate strokes — a slow rising sweep to a screaming apex, then a long
    // catastrophic descent through two octaves into silence.
    mel: [0, 2, 5, 8, 11, 14, 11, 8, 14, 11, 8, 5, 2, 0, 5, 2],
    fBase: 500,
  },
];

/** The eight synthesized SFX types (legacy line 204), in preview-cycle order. */
export const SFX_TYPES: readonly SfxType[] = [
  'split',
  'burst',
  'mutate',
  'ambient',
  'warp',
  'crystallize',
  'decay',
  'resonance',
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS V7.1 — the 100-entry procedural SFX palette
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single synthesized sound effect, fully described by data so {@link AudioEngine}'s
 * generic `synth()` can voice any of the 100 without a per-effect `switch`. Every numeric
 * field is finite and the frequencies/duration are strictly positive (the engine uses
 * exponential ramps, which cannot cross zero). Generated, never hand-authored, so the
 * palette stays genuinely varied — see {@link createSfxPalette}.
 */
export interface SfxSpec {
  /** Debug label `family#index` (never shown to users). */
  label: string;
  /** Primary oscillator waveform. */
  wave: OscillatorType;
  /** Start frequency (Hz, > 0). */
  f0: number;
  /** First pitch-ramp target (Hz, > 0); equals f0 for a steady pitch. */
  f1: number;
  /** Optional second pitch-ramp target (Hz); 0 = single-segment sweep. */
  f2: number;
  /** Pitch-ramp shape. */
  ramp: 'exp' | 'lin';
  /** Total lifetime (s, > 0); the gain decays to silence by t + dur. */
  dur: number;
  /** Peak gain after the attack ramp. */
  peak: number;
  /** Attack time (s). */
  attack: number;
  /** Biquad filter type, or '' for a dry voice. */
  filterType: BiquadFilterType | '';
  /** Filter cutoff/centre (Hz). */
  filterFreq: number;
  /** Filter Q. */
  filterQ: number;
  /** FM modulator ratio (× f0); 0 = no frequency-modulation voice. */
  fmRatio: number;
  /** FM depth (Hz of carrier-frequency deviation). */
  fmDepth: number;
  /** Pitch-LFO rate (Hz); 0 = no vibrato/wobble. */
  lfoRate: number;
  /** Pitch-LFO depth (Hz). */
  lfoDepth: number;
  /** Shimmer partial ratio (× f0); 0 = none (2 = an octave glint). */
  partial: number;
  /** Short filtered noise-burst mix 0..1; 0 = tonal only. */
  noise: number;
  /** Per-trigger pitch-jitter fraction 0..1 — the engine wobbles f0 by ±½·jitter each
   *  fire so repeated triggers of the same effect never sound identical. */
  jitter: number;
}

/** Total palette size (CONTRACTS V7.1). */
export const SFX_PALETTE_SIZE = 100;

/** A contiguous `[start, count)` slice of the palette. */
export interface SfxBand {
  start: number;
  count: number;
}

/**
 * The twelve event families (75 slots) followed by the 25-slot cue band — laid out in
 * palette-index order. {@link createSfxPalette} fills the palette in exactly this order, so
 * these offsets are the contract between the data and {@link SFX_FAMILY_BANDS}/
 * {@link SFX_CUE_BAND}. Sums to {@link SFX_PALETTE_SIZE}.
 */
const FAMILY_LAYOUT = [
  { fam: 'pluck', count: 7 },
  { fam: 'zap', count: 7 },
  { fam: 'bend', count: 6 },
  { fam: 'drone', count: 5 },
  { fam: 'sweep', count: 6 },
  { fam: 'bell', count: 7 },
  { fam: 'fall', count: 6 },
  { fam: 'vibrato', count: 5 },
  { fam: 'fmclang', count: 5 },
  { fam: 'subboom', count: 4 },
  { fam: 'glint', count: 3 },
  { fam: 'strange', count: 14 },
  { fam: 'cue', count: 25 },
] as const;

/** Resolve a family's `[start, count)` band from {@link FAMILY_LAYOUT}. */
function bandOf(fam: string): SfxBand {
  let start = 0;
  for (const f of FAMILY_LAYOUT) {
    if (f.fam === fam) return { start, count: f.count };
    start += f.count;
  }
  return { start: 0, count: 1 }; // unreachable for the literal family names above
}

/**
 * Maps each legacy semantic {@link SfxType} to the palette family that voices it. The engine
 * rotates a per-band cursor across these so repeated triggers of the same action vary.
 */
export const SFX_FAMILY_BANDS: Readonly<Record<SfxType, SfxBand>> = {
  split: bandOf('pluck'),
  burst: bandOf('zap'),
  mutate: bandOf('bend'),
  ambient: bandOf('drone'),
  warp: bandOf('sweep'),
  crystallize: bandOf('bell'),
  decay: bandOf('fall'),
  resonance: bandOf('vibrato'),
};

/** The 25-slot cue band backing the per-sorting-field tones ({@link AudioEngine.cue}). */
export const SFX_CUE_BAND: SfxBand = bandOf('cue');

/** Extra non-semantic bands used directly by name via `playId` (cosmology, impacts, sparkle). */
export const SFX_EXTRA_BANDS: Readonly<Record<string, SfxBand>> = {
  fmclang: bandOf('fmclang'),
  subboom: bandOf('subboom'),
  glint: bandOf('glint'),
  strange: bandOf('strange'),
  demonic: bandOf('strange'),
  chitter: bandOf('strange'),
  howl: bandOf('strange'),
};

const WAVES: readonly OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

/**
 * Build the deterministic 100-entry SFX palette from a seeded `Rng`. Each timbral family
 * (pluck, zap, bend, drone, sweep, bell, fall, vibrato, fm-clang, sub-boom, glint, strange)
 * generates its slots with seeded parameter excursions, and a final ascending 25-slot CUE
 * band gives every sorting field its own engineered voice. Pure and allocation-bounded
 * (called ONCE at engine construction, never per frame). Same seed ⇒ same palette. O(100).
 */
export function createSfxPalette(rng: Rng): SfxSpec[] {
  const R = (lo: number, hi: number): number => lo + rng() * (hi - lo);
  const wave = (i: number): OscillatorType => WAVES[i % WAVES.length] ?? 'sine';
  const out: SfxSpec[] = [];
  const base = (
    label: string,
    wv: OscillatorType,
    f0: number,
    dur: number,
    peak: number,
  ): SfxSpec => ({
    label,
    wave: wv,
    f0,
    f1: f0,
    f2: 0,
    ramp: 'exp',
    dur,
    peak,
    attack: 0.005,
    filterType: '',
    filterFreq: 0,
    filterQ: 1,
    fmRatio: 0,
    fmDepth: 0,
    lfoRate: 0,
    lfoDepth: 0,
    partial: 0,
    noise: 0,
    jitter: 0.12,
  });

  // PLUCK — bright descending mitosis blips (the 'split' family).
  for (let i = 0; i < 7; i++) {
    const s = base(
      `pluck#${i}`,
      i % 2 === 0 ? 'sawtooth' : i % 3 === 0 ? 'square' : 'triangle',
      R(620, 1120),
      R(0.5, 1.3),
      R(0.08, 0.12),
    );
    s.f1 = R(40, 95);
    s.filterType = 'lowpass';
    s.filterFreq = R(1400, 3200);
    s.filterQ = R(2, 6);
    s.jitter = 0.16;
    out.push(s);
  }
  // ZAP — noisy explosive spawns (the 'burst' family): up then crash down.
  for (let i = 0; i < 7; i++) {
    const s = base(
      `zap#${i}`,
      i % 2 === 0 ? 'square' : 'sawtooth',
      R(150, 300),
      R(0.4, 0.9),
      R(0.07, 0.11),
    );
    s.f1 = R(1500, 2300);
    s.f2 = R(28, 80);
    s.ramp = 'lin';
    s.noise = R(0.3, 0.6);
    s.jitter = 0.2;
    out.push(s);
  }
  // BEND — wobbling transmutations (the 'mutate' family).
  for (let i = 0; i < 6; i++) {
    const s = base(
      `bend#${i}`,
      i % 2 === 0 ? 'sine' : 'triangle',
      R(110, 560),
      R(0.7, 1.3),
      R(0.06, 0.1),
    );
    s.lfoRate = R(4, 13);
    s.lfoDepth = R(30, 130);
    s.jitter = 0.26;
    out.push(s);
  }
  // DRONE — low ambient pads (the 'ambient' family).
  for (let i = 0; i < 5; i++) {
    const s = base(
      `drone#${i}`,
      i % 2 === 0 ? 'sawtooth' : 'sine',
      R(34, 120),
      R(1.2, 2.3),
      R(0.02, 0.05),
    );
    s.lfoRate = R(0.4, 2.2);
    s.lfoDepth = R(2, 9);
    s.attack = R(0.05, 0.3);
    s.jitter = 0.18;
    out.push(s);
  }
  // SWEEP — bandpass space-warps (the 'warp' family): rise then fall.
  for (let i = 0; i < 6; i++) {
    const s = base(`sweep#${i}`, 'sawtooth', R(45, 70), R(1.0, 1.8), R(0.07, 0.1));
    s.f1 = R(2500, 3600);
    s.f2 = R(80, 150);
    s.filterType = 'bandpass';
    s.filterFreq = R(500, 850);
    s.filterQ = R(8, 15);
    s.jitter = 0.14;
    out.push(s);
  }
  // BELL — high crystalline glints (the 'crystallize' family).
  for (let i = 0; i < 7; i++) {
    const s = base(`bell#${i}`, 'sine', R(1500, 3500), R(0.6, 1.2), R(0.05, 0.085));
    s.f1 = s.f0 * R(1.02, 1.12);
    s.f2 = R(700, 1100);
    s.ramp = 'lin';
    s.partial = i % 2 === 0 ? 2 : 2.5;
    s.filterType = 'highpass';
    s.filterFreq = R(900, 1300);
    s.attack = 0.01;
    s.jitter = 0.1;
    out.push(s);
  }
  // FALL — long sinking decays (the 'decay'/death family).
  for (let i = 0; i < 6; i++) {
    const s = base(`fall#${i}`, 'triangle', R(350, 520), R(1.2, 2.2), R(0.06, 0.09));
    s.f1 = R(16, 32);
    s.filterType = 'lowpass';
    s.filterFreq = R(240, 420);
    s.filterQ = R(6, 10);
    s.jitter = 0.12;
    out.push(s);
  }
  // VIBRATO — resonant sustains (the 'resonance' family).
  for (let i = 0; i < 5; i++) {
    const s = base(`vibrato#${i}`, 'sine', R(180, 320), R(1.2, 2.2), R(0.05, 0.08));
    s.lfoRate = R(5, 15);
    s.lfoDepth = R(80, 260);
    s.jitter = 0.1;
    out.push(s);
  }
  // FM-CLANG — inharmonic metallic strikes (cosmology / strange events).
  for (let i = 0; i < 5; i++) {
    const ratios = [1.41, 2.4, 3.1, 5.1, 1.73];
    const s = base(
      `fmclang#${i}`,
      i % 2 === 0 ? 'sine' : 'square',
      R(120, 400),
      R(0.5, 1.2),
      R(0.05, 0.085),
    );
    s.fmRatio = ratios[i] ?? 2.4;
    s.fmDepth = R(120, 600);
    s.filterType = 'bandpass';
    s.filterFreq = R(900, 2400);
    s.filterQ = R(3, 8);
    s.jitter = 0.18;
    out.push(s);
  }
  // SUB-BOOM — subterranean impacts (black-hole / apocalypse weight).
  for (let i = 0; i < 4; i++) {
    const s = base(
      `subboom#${i}`,
      i % 2 === 0 ? 'sine' : 'triangle',
      R(80, 140),
      R(1.5, 2.6),
      R(0.1, 0.14),
    );
    s.f1 = R(28, 50);
    s.attack = R(0.01, 0.04);
    s.noise = R(0.05, 0.2);
    s.jitter = 0.1;
    out.push(s);
  }
  // GLINT — tiny high sparkles.
  for (let i = 0; i < 3; i++) {
    const s = base(`glint#${i}`, 'sine', R(2600, 5200), R(0.15, 0.4), R(0.03, 0.055));
    s.partial = 1.5;
    s.jitter = 0.22;
    out.push(s);
  }
  // STRANGE — demonic / chitter / howl / gurgle hybrids (creature + cosmology voices).
  const strangeWaves: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sine'];
  for (let i = 0; i < 14; i++) {
    const kind = i % 4;
    const s = base(
      `strange#${i}`,
      strangeWaves[i % strangeWaves.length] ?? 'sawtooth',
      kind === 0 ? R(38, 95) : kind === 1 ? R(900, 2800) : kind === 2 ? R(120, 420) : R(200, 900),
      kind === 1 ? R(0.08, 0.22) : R(0.6, 2.1),
      R(0.04, 0.14),
    );
    if (kind === 0) {
      s.f1 = R(18, 42);
      s.noise = R(0.15, 0.45);
      s.filterType = 'lowpass';
      s.filterFreq = R(180, 520);
    } else if (kind === 1) {
      s.f1 = R(40, 120);
      s.noise = R(0.35, 0.75);
      s.attack = 0.001;
    } else if (kind === 2) {
      s.f1 = R(680, 1400);
      s.f2 = R(90, 220);
      s.lfoRate = R(3, 9);
      s.lfoDepth = R(40, 180);
    } else {
      s.lfoRate = R(6, 22);
      s.lfoDepth = R(60, 280);
      s.fmRatio = [1.61, 2.71, 3.33, 4.17][i % 4] ?? 1.61;
      s.fmDepth = R(80, 420);
      s.noise = R(0.12, 0.55);
    }
    s.jitter = 0.32;
    out.push(s);
  }
  // CUE — 25 ascending engineered voices, one per sorting field (~3 octaves over the list).
  for (let i = 0; i < 25; i++) {
    const f0 = 196 * Math.pow(2, (i * (36 / 25)) / 12); // G3-rooted, climbing ~3 octaves
    const s = base(`cue#${i}`, wave(i), f0, 0.6, R(0.07, 0.095));
    s.f0 = f0 * 1.5; // a quick downward pluck chirp into the target
    s.f1 = f0;
    s.filterType = 'lowpass';
    s.filterFreq = f0 * 6;
    s.filterQ = 4;
    s.partial = 2; // octave shimmer for sparkle
    s.attack = 0.008;
    s.jitter = 0.06;
    out.push(s);
  }
  return out;
}
