/**
 * Weather system — drives wind, temperature, fog density/color, and tone-mapping exposure
 * toward per-weather targets with frame-rate-independent lerps.
 * Faithful port of legacy lines 466-478.
 */
import * as THREE from 'three';
import { lerp } from '../math/scalar';
import { FOG_SCALE, WEATHERS, type Weather } from './constants';
import type { SimContext } from '../types';
import type { Engine } from '../core/engine';

/**
 * Owns the atmospheric response to the current weather. Reads/writes shared sim state
 * (`weatherIdx`, `wind`, `temperature`) and mutates the engine's fog + exposure.
 */
export class WeatherSystem {
  private readonly ctx: SimContext;
  private readonly engine: Engine;
  private readonly fog: THREE.FogExp2;

  /** Caches a narrowed reference to the engine's FogExp2 (engine contract guarantees it). */
  constructor(ctx: SimContext, engine: Engine) {
    this.ctx = ctx;
    this.engine = engine;
    const fog = engine.scene.fog;
    if (!(fog instanceof THREE.FogExp2)) {
      throw new Error('WeatherSystem requires the engine scene to use THREE.FogExp2 fog');
    }
    this.fog = fog;
  }

  /**
   * Advance to the next weather (legacy `cycleWeather`): bumps `state.weatherIdx`, plays the
   * crystallize sting, and returns the new weather for the caller's HUD toast.
   */
  cycle(): Weather {
    const s = this.ctx.state;
    s.weatherIdx = (s.weatherIdx + 1) % WEATHERS.length;
    this.ctx.sfx('crystallize');
    // Invariant: weatherIdx ∈ [0, WEATHERS.length) after the modulo above.
    return WEATHERS[s.weatherIdx]!;
  }

  /**
   * Per-frame atmospheric lerps (legacy `applyWeather`). O(1), allocation-free.
   * Wind oscillates with weather-scaled amplitude; temperature, fog density, and exposure
   * ease toward their per-weather targets; AURORA cycles the fog hue.
   */
  apply(dt: number, t: number): void {
    const s = this.ctx.state;
    // Defensive modulo: puppet masters and persistence may write any non-negative index.
    const w: Weather = WEATHERS[s.weatherIdx % WEATHERS.length] ?? 'CLEAR';
    s.wind.x = Math.sin(t * 0.3) * 2 * (w === 'STORM' ? 5 : w === 'RAIN' ? 2 : 0.5);
    s.wind.z = Math.cos(t * 0.2) * 1.5 * (w === 'STORM' ? 4 : 1);
    s.temperature = lerp(
      s.temperature,
      w === 'VOID' ? -40 : w === 'STORM' ? 5 : w === 'AURORA' ? -10 : 20,
      dt * 0.1,
    );
    // Legacy density targets × FOG_SCALE (÷ ARENA) — same optical depth at 5× sightlines.
    this.fog.density = lerp(
      this.fog.density,
      (w === 'FOG' ? 0.012 : w === 'VOID' ? 0.008 : w === 'STORM' ? 0.006 : 0.003) * FOG_SCALE,
      dt * 0.3,
    );
    if (w === 'AURORA') this.fog.color.setHSL((t * 0.02) % 1, 0.4, 0.04);
    else if (w === 'VOID') this.fog.color.set(0x000005);
    else this.fog.color.set(0x020310);
    this.engine.renderer.toneMappingExposure = lerp(
      this.engine.renderer.toneMappingExposure,
      w === 'VOID' ? 0.5 : w === 'AURORA' ? 1.6 : w === 'STORM' ? 0.8 : 1.15,
      dt * 0.2,
    );
  }
}
