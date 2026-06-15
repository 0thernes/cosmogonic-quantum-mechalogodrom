/**
 * Weather drama (CONTRACTS V7.5). Falsifiable claims about the amplified per-state response:
 * - VOID drives a deep freeze (temperature well below 0 °C) and near-lightless exposure;
 * - AURORA swells the exposure luminously high;
 * - STORM is a gale (large wind amplitude) and throws sharp lightning flashes above its base;
 * - the response is deterministic (no rng) — the same t-sequence yields the same exposure.
 *
 * Headless: a minimal fake Engine carries a FogExp2 scene + a mutable toneMappingExposure.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { WeatherSystem } from '../src/sim/weather';
import { WEATHERS } from '../src/sim/constants';
import type { Engine } from '../src/core/engine';
import type { SimContext, SimState } from '../src/types';

const IDX = (w: string): number => WEATHERS.indexOf(w as (typeof WEATHERS)[number]);

function makeState(weatherIdx: number): SimState {
  return {
    chaos: 0.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

/** A fake Engine exposing exactly what WeatherSystem reads/writes. */
function makeEngine(): Engine {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020310, 0.003);
  return {
    scene,
    renderer: { toneMappingExposure: 1.15 },
  } as unknown as Engine;
}

function makeCtx(state: SimState): SimContext {
  return { state, sfx: () => undefined } as unknown as SimContext;
}

/** Run `frames` of apply() at 60fps; returns the final exposure + the max over the run. */
function run(
  weather: string,
  frames: number,
): { state: SimState; engine: Engine; maxExposure: number; maxWind: number } {
  const state = makeState(IDX(weather));
  const engine = makeEngine();
  const sys = new WeatherSystem(makeCtx(state), engine);
  let maxExposure = 0;
  let maxWind = 0;
  for (let f = 0; f < frames; f++) {
    state.elapsed += 1 / 60;
    sys.apply(1 / 60, state.elapsed);
    const ex = engine.renderer.toneMappingExposure;
    if (ex > maxExposure) maxExposure = ex;
    const wind = Math.abs(state.wind.x);
    if (wind > maxWind) maxWind = wind;
  }
  return { state, engine, maxExposure, maxWind };
}

describe('WeatherSystem drama (V7.5)', () => {
  test('VOID is a deep freeze with near-lightless exposure', () => {
    const { state, engine } = run('VOID', 600);
    expect(state.temperature).toBeLessThan(-40);
    expect(engine.renderer.toneMappingExposure).toBeLessThan(0.6);
  });

  test('AURORA swells the exposure luminously high', () => {
    const { engine } = run('AURORA', 600);
    expect(engine.renderer.toneMappingExposure).toBeGreaterThan(1.7);
  });

  test('STORM is a gale and throws lightning flashes above its base', () => {
    const { maxWind, maxExposure } = run('STORM', 1200);
    expect(maxWind).toBeGreaterThan(10); // ×9 wind reaches ~21
    expect(maxExposure).toBeGreaterThan(1.5); // a flash well above the dim STORM base (~0.6)
  });

  test('CLEAR keeps the calm baseline (tMod = 1 band, no flashes)', () => {
    const { state, engine } = run('CLEAR', 600);
    expect(state.temperature).toBeGreaterThan(0);
    expect(state.temperature).toBeLessThan(30);
    expect(engine.renderer.toneMappingExposure).toBeGreaterThan(1.0);
    expect(engine.renderer.toneMappingExposure).toBeLessThan(1.3);
  });

  test('the response is deterministic (no rng) — same sequence, same exposure', () => {
    const a = run('STORM', 300);
    const b = run('STORM', 300);
    expect(a.engine.renderer.toneMappingExposure).toBe(b.engine.renderer.toneMappingExposure);
    expect(a.state.temperature).toBe(b.state.temperature);
    expect(a.maxExposure).toBe(b.maxExposure);
  });
});

describe('WeatherSystem.cycle — manual weather advance', () => {
  test('advances weatherIdx, plays the sting, returns the new weather, and wraps the ring', () => {
    const sfx: string[] = [];
    const state = makeState(0);
    const ctx = { state, sfx: (n: string) => sfx.push(n) } as unknown as SimContext;
    const sys = new WeatherSystem(ctx, makeEngine());

    const first = sys.cycle();
    expect(state.weatherIdx).toBe(1);
    expect(first).toBe(WEATHERS[1]); // returns the NEW weather (post-increment)
    expect(sfx).toContain('crystallize'); // the advance plays its sting

    // One more full ring of cycles brings the index back to its start (modulo wrap).
    for (let i = 1; i < WEATHERS.length; i++) sys.cycle();
    expect(state.weatherIdx).toBe(0);
  });
});
