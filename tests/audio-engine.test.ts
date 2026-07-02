import { describe, expect, test } from 'bun:test';
import { AudioEngine } from '../src/audio/engine';
import { SONGS } from '../src/audio/songs';
import { mulberry32 } from '../src/math/rng';
import type { SimState } from '../src/types';

const state = () =>
  ({ songIdx: 0, algoIdx: 0, viewIdx: 0, weatherIdx: 0, sim: 1 as const }) as unknown as SimState;

describe('AudioEngine', () => {
  test('toggleMusic toggles the music flag without crashing when Web Audio is unavailable', () => {
    const engine = new AudioEngine(state(), mulberry32(1));
    expect(engine.musicOn).toBe(false);
    expect(engine.toggleMusic()).toBe(true);
    expect(engine.musicOn).toBe(true);
    expect(engine.toggleMusic()).toBe(false);
    expect(engine.musicOn).toBe(false);
  });

  test('toggleSfx toggles the sfx flag without crashing when Web Audio is unavailable', () => {
    const engine = new AudioEngine(state(), mulberry32(2));
    expect(engine.sfxOn).toBe(false);
    expect(engine.toggleSfx()).toBe(true);
    expect(engine.sfxOn).toBe(true);
    expect(engine.toggleSfx()).toBe(false);
    expect(engine.sfxOn).toBe(false);
  });

  test('toggleMute toggles the master-mute flag without changing music/sfx toggles', () => {
    const engine = new AudioEngine(state(), mulberry32(3));
    engine.toggleMusic();
    engine.toggleSfx();
    expect(engine.muted).toBe(false);
    expect(engine.toggleMute()).toBe(true);
    expect(engine.muted).toBe(true);
    expect(engine.musicOn).toBe(true);
    expect(engine.sfxOn).toBe(true);
    expect(engine.toggleMute()).toBe(false);
    expect(engine.muted).toBe(false);
    expect(engine.musicOn).toBe(true);
    expect(engine.sfxOn).toBe(true);
  });

  test('cycleSong advances through the catalog deterministically', () => {
    const engine = new AudioEngine(state(), mulberry32(4));
    const first = engine.cycleSong();
    expect(first).toBe(SONGS[1]!.name);
    // Wrap back to the first song after a full cycle.
    let current = first;
    for (let i = 0; i < SONGS.length; i++) current = engine.cycleSong();
    expect(current).toBe(first);
  });

  test('sleep timer auto-mutes after the configured delay', async () => {
    const engine = new AudioEngine(state(), mulberry32(5));
    engine.setSleepDelay(1);
    engine.toggleMusic();
    expect(engine.musicOn).toBe(true);
    expect(engine.muted).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(engine.muted).toBe(true);
    expect(engine.musicOn).toBe(true); // toggle state preserved
  });

  test('V122 (USER #7): the sleep doze is RECOVERABLE — any audio button wakes the master bus', async () => {
    // Pre-fix the sleep timer set the STICKY master mute: MUSIC/SFX presses flipped their own
    // toggles under a silent master bus, so audio "died until refresh". Any control must wake it.
    const engine = new AudioEngine(state(), mulberry32(7));
    engine.setSleepDelay(1);
    engine.toggleMusic();
    await new Promise((r) => setTimeout(r, 20));
    expect(engine.muted).toBe(true); // dozed
    engine.toggleSfx(); // user presses ANY audio button…
    expect(engine.muted).toBe(false); // …and the master bus is awake again
    expect(engine.sfxOn).toBe(true);
    expect(engine.musicOn).toBe(true); // music kept playing state through the doze

    // A dozed bus also wakes via the song cycler.
    const e2 = new AudioEngine(state(), mulberry32(8));
    e2.setSleepDelay(1);
    e2.toggleMusic();
    await new Promise((r) => setTimeout(r, 20));
    expect(e2.muted).toBe(true);
    e2.cycleSong();
    expect(e2.muted).toBe(false);

    // But a MANUAL mute stays exactly where the user put it (no auto-wake hijack).
    const e3 = new AudioEngine(state(), mulberry32(9));
    e3.toggleMusic();
    e3.toggleMute(); // user muted on purpose
    e3.toggleSfx();
    expect(e3.muted).toBe(true); // buttons do NOT override an intentional mute
  });

  test('dispose clears the sleep timer', () => {
    const engine = new AudioEngine(state(), mulberry32(6));
    engine.setSleepDelay(1);
    engine.toggleMusic();
    engine.dispose();
    // After dispose, music flags are reset and no crash occurs.
    expect(engine.musicOn).toBe(false);
    expect(engine.muted).toBe(false);
  });
});
