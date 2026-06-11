import { describe, expect, test } from 'bun:test';
import { SFX_TYPES, SONGS } from '../src/audio/songs';
import type { SfxType } from '../src/types';

/**
 * SONGS catalog invariants (V5.2 "Resonance" rescore). The audio engine's scheduler and
 * `noteFreq` rely on these data guarantees: non-negative degrees (the `F_NOTES[i % len]`
 * index precondition), at least one chord per song, a non-empty melody, and valid
 * waveforms. These are pure-data assertions — no DOM, no AudioContext.
 */
const VALID_WAVES: ReadonlySet<string> = new Set(['sine', 'square', 'sawtooth', 'triangle']);

describe('SONGS catalog', () => {
  test('the cycle is non-empty (cycleSong uses % SONGS.length)', () => {
    expect(SONGS.length).toBeGreaterThan(0);
  });

  test('keeps the loved references QUANTUM and BLACK MERIDIAN', () => {
    const names = SONGS.map((s) => s.name);
    expect(names).toContain('QUANTUM');
    expect(names).toContain('BLACK MERIDIAN');
  });

  test('QUANTUM is kept bit-identical (the reference the summoner loves)', () => {
    const quantum = SONGS.find((s) => s.name === 'QUANTUM');
    expect(quantum).toBeDefined();
    expect(quantum).toEqual({
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
    });
  });

  test('BLACK MERIDIAN is kept bit-identical (the second loved reference)', () => {
    const bm = SONGS.find((s) => s.name === 'BLACK MERIDIAN');
    expect(bm).toBeDefined();
    expect(bm).toEqual({
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
    });
  });

  test('every song name is distinct (each a different species of dark)', () => {
    const names = SONGS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('every song is well-formed: positive bpm/fBase, valid waveforms', () => {
    for (const song of SONGS) {
      expect(song.name.length).toBeGreaterThan(0);
      expect(song.bpm).toBeGreaterThan(0);
      expect(Number.isFinite(song.bpm)).toBe(true);
      expect(song.fBase).toBeGreaterThan(0);
      expect(VALID_WAVES.has(song.wave)).toBe(true);
      expect(VALID_WAVES.has(song.bass)).toBe(true);
    }
  });

  test('every song has at least one chord (scheduler indexes ch[ci % chords.length])', () => {
    for (const song of SONGS) {
      expect(song.chords.length).toBeGreaterThan(0);
      for (const chord of song.chords) {
        expect(chord.length).toBeGreaterThan(0);
      }
    }
  });

  test('every song has a non-empty melody (scheduler indexes mel[st % mel.length])', () => {
    for (const song of SONGS) {
      expect(song.mel.length).toBeGreaterThan(0);
    }
  });

  test('all chord and melody degrees are non-negative integers (noteFreq precondition)', () => {
    // noteFreq indexes F_NOTES[i % len] and floors i/len for the octave; a negative degree
    // would index out of range or drop below the base octave. Every degree must be a
    // non-negative integer.
    for (const song of SONGS) {
      for (const chord of song.chords) {
        for (const degree of chord) {
          expect(Number.isInteger(degree)).toBe(true);
          expect(degree).toBeGreaterThanOrEqual(0);
        }
      }
      for (const degree of song.mel) {
        expect(Number.isInteger(degree)).toBe(true);
        expect(degree).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('the upgraded songs reach the 4-note dramatic-voicing tier', () => {
    // VOIDCROWN, ELDER ENGINE, LAST THEOREM and the new STARKILLER REQUIEM were raised to
    // QUANTUM/BLACK MERIDIAN's tier: every chord is a full 4-note voicing.
    for (const name of ['VOIDCROWN', 'ELDER ENGINE', 'LAST THEOREM', 'STARKILLER REQUIEM']) {
      const song = SONGS.find((s) => s.name === name);
      expect(song).toBeDefined();
      for (const chord of song!.chords) {
        expect(chord.length).toBe(4);
      }
      // Longer evolving melodies: at least a full 16-step phrase.
      expect(song!.mel.length).toBeGreaterThanOrEqual(16);
    }
  });
});

describe('SFX_TYPES catalog', () => {
  test('is the eight-type preview cycle, all distinct', () => {
    expect(SFX_TYPES.length).toBe(8);
    expect(new Set(SFX_TYPES).size).toBe(8);
  });

  test('every entry is a valid SfxType (no stray strings)', () => {
    const allowed: ReadonlySet<SfxType> = new Set<SfxType>([
      'split',
      'burst',
      'mutate',
      'ambient',
      'warp',
      'crystallize',
      'decay',
      'resonance',
    ]);
    for (const t of SFX_TYPES) {
      expect(allowed.has(t)).toBe(true);
    }
  });
});
