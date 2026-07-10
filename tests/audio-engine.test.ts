import { describe, expect, test } from 'bun:test';
import { AudioEngine } from '../src/audio/engine';
import { SONGS } from '../src/audio/songs';
import { mulberry32 } from '../src/math/rng';
import type { SimState } from '../src/types';

const state = () =>
  ({ songIdx: 0, algoIdx: 0, viewIdx: 0, weatherIdx: 0, sim: 1 as const }) as unknown as SimState;

type ParamEvent =
  | { kind: 'hold'; time: number }
  | { kind: 'ramp'; time: number; value: number }
  | { kind: 'target'; time: number; value: number };

class FakeAudioParam {
  value = 0;
  events: ParamEvent[] = [];

  cancelAndHoldAtTime(time: number): this {
    this.events = this.events.filter((event) => event.time <= time);
    this.events.push({ kind: 'hold', time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'ramp', time, value });
    return this;
  }

  setTargetAtTime(value: number, time: number): this {
    this.events.push({ kind: 'target', time, value });
    this.value = value;
    return this;
  }
}

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

  test('toggleSfx cancels a social boost restore before turning the SFX bus off', () => {
    const engine = new AudioEngine(state(), mulberry32(20));
    const param = new FakeAudioParam();
    const context = { currentTime: 1, state: 'running' };
    const internals = engine as unknown as {
      ctx: AudioContext;
      sfxGain: GainNode;
      playExtra(name: string): void;
    };
    internals.ctx = context as unknown as AudioContext;
    internals.sfxGain = { gain: param } as unknown as GainNode;
    internals.playExtra = () => undefined;

    expect(engine.toggleSfx()).toBe(true);
    context.currentTime = 2;
    engine.playNhiSocial(99); // finite inputs clamp to the documented 0..1 range
    expect(param.events).toContainEqual({ kind: 'ramp', time: 2.08, value: 0.55 });
    expect(param.events).toContainEqual({ kind: 'ramp', time: 2.45, value: 0.3 });

    context.currentTime = 2.1;
    expect(engine.toggleSfx()).toBe(false);
    expect(param.events.some((event) => event.kind === 'ramp' && event.time > 2.1)).toBe(false);
    expect(param.events.at(-2)).toEqual({ kind: 'hold', time: 2.1 });
    expect(param.events.at(-1)).toEqual({ kind: 'target', time: 2.1, value: 0 });

    context.currentTime = 3;
    expect(engine.toggleSfx()).toBe(true);
    engine.playNhiSocial(Number.POSITIVE_INFINITY);
    const finalRamps = param.events.filter((event) => event.kind === 'ramp').slice(-2);
    expect(finalRamps).toEqual([
      { kind: 'ramp', time: 3.08, value: 0.3 },
      { kind: 'ramp', time: 3.45, value: 0.3 },
    ]);
    expect(finalRamps.every((event) => Number.isFinite(event.value))).toBe(true);
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

  test('dispose is terminal and prevents a later control from rearming the sleep timer', async () => {
    const engine = new AudioEngine(state(), mulberry32(6));
    engine.setSleepDelay(1);
    engine.toggleMusic();
    engine.dispose();
    // After dispose, music flags are reset and no crash occurs.
    expect(engine.musicOn).toBe(false);
    expect(engine.muted).toBe(false);
    engine.toggleMusic();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(engine.muted).toBe(false);
    expect(
      (engine as unknown as { disposed: boolean; sleepTimer: ReturnType<typeof setTimeout> | null })
        .disposed,
    ).toBe(true);
    expect(
      (engine as unknown as { disposed: boolean; sleepTimer: ReturnType<typeof setTimeout> | null })
        .sleepTimer,
    ).toBeNull();
  });
});
