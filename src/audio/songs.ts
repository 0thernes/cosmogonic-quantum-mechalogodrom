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
