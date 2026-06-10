/**
 * Procedural soundtrack and SFX catalog data.
 *
 * Leaf module (contract rule 4): the only import is type-only, so this file has zero
 * runtime dependencies and runs under `bun test` without a DOM.
 *
 * Ported verbatim from the legacy monolith, lines 197-204. `chords` and `mel` hold
 * scale degrees into the audio engine's 10-step scale (legacy `fNotes`); `fBase` is the
 * chord lowpass-filter base cutoff in Hz; `bpm` drives the scheduler interval.
 */
import type { SfxType, Song } from '../types';

/**
 * The five procedural songs, cycle order preserved. 0.3.0 "Pantheon" rescore:
 * QUANTUM (the reference the summoner loves — suspenseful, intense) is kept
 * bit-identical; the other four are rebuilt to its intensity tier, each a
 * different species of dark. Degree indices map through the engine's 10-step
 * scale (fNotes semitones 0,2,3,5,7,8,10,12,14,15; +10 = next octave), so the
 * tension structures below are chosen as SEMITONE stacks, noted per chord.
 */
export const SONGS: readonly Song[] = [
  {
    // Funeral colossus — hollow sus2/b7 voids under a subterranean sine bass;
    // the slowest, heaviest dread in the cycle. Semis: {0,2,10} {0,7,15}
    // {0,2,7,10} {0,8,15}.
    name: 'VOIDCROWN',
    bpm: 58,
    chords: [
      [0, 1, 6],
      [0, 4, 9],
      [0, 1, 4, 6],
      [0, 5, 9],
    ],
    wave: 'sawtooth',
    bass: 'sine',
    mel: [9, 4, 6, 2, 4, 1, 2, 0, 1, 5, 4, 9],
    fBase: 380,
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
    // Ritual machine-god — fifth+flat-six dirges with a minor-2nd cluster
    // grinding in the high register, double sawtooth. Semis: {0,7,8}
    // {0,5,7,14} {0,3,8} {0,7,8,15}.
    name: 'ELDER ENGINE',
    bpm: 100,
    chords: [
      [0, 4, 5],
      [0, 3, 4, 8],
      [0, 2, 5],
      [0, 4, 5, 9],
    ],
    wave: 'sawtooth',
    bass: 'sawtooth',
    mel: [0, 0, 4, 5, 0, 0, 2, 3, 0, 4, 5, 8],
    fBase: 440,
  },
  {
    // Tragic endgame aria — noble minor-octave voicings torn by a flat-10th,
    // wide soaring leaps; grief with a sword in its hand. Semis: {0,3,7,12}
    // {0,3,7,15} {0,5,8,12} {0,3,10,14}.
    name: 'LAST THEOREM',
    bpm: 116,
    chords: [
      [0, 2, 4, 7],
      [0, 2, 4, 9],
      [0, 3, 5, 7],
      [0, 2, 6, 8],
    ],
    wave: 'triangle',
    bass: 'sawtooth',
    mel: [4, 9, 7, 11, 9, 13, 12, 9, 7, 4, 2, 0],
    fBase: 920,
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
