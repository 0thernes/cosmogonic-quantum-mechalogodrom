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

/** The five procedural songs (legacy lines 197-203), cycle order preserved. */
export const SONGS: readonly Song[] = [
  {
    name: 'FF SOMBER',
    bpm: 86,
    chords: [
      [0, 3, 7],
      [0, 2, 5],
      [0, 3, 8],
      [0, 5, 7],
      [0, 2, 7],
      [0, 3, 5, 10],
    ],
    wave: 'sine',
    bass: 'sawtooth',
    mel: [7, 5, 3, 2, 0, 3, 5, 7, 8, 7, 5, 3],
    fBase: 800,
  },
  {
    name: 'CRYSTAL',
    bpm: 60,
    chords: [
      [0, 4, 7, 11],
      [0, 2, 6, 9],
      [0, 4, 6, 11],
      [0, 5, 9],
    ],
    wave: 'sine',
    bass: 'sine',
    mel: [11, 9, 7, 6, 4, 2, 0, 4, 7, 11, 9, 6],
    fBase: 1200,
  },
  {
    name: 'INDUSTRIAL',
    bpm: 120,
    chords: [
      [0, 1, 5],
      [0, 3, 6],
      [0, 1, 5, 8],
      [0, 3, 7],
    ],
    wave: 'sawtooth',
    bass: 'square',
    mel: [0, 1, 5, 0, 3, 6, 5, 1, 0, 8, 5, 3],
    fBase: 500,
  },
  {
    name: 'ETHEREAL',
    bpm: 72,
    chords: [
      [0, 3, 7, 10],
      [0, 2, 5, 9],
      [0, 3, 7],
      [0, 5, 7, 10],
    ],
    wave: 'triangle',
    bass: 'sine',
    mel: [10, 7, 5, 3, 0, 2, 5, 7, 10, 12, 7, 3],
    fBase: 1000,
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
