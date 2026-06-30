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
