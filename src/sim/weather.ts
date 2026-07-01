/**
 * Weather system — drives wind, temperature, fog density/color, and tone-mapping exposure
 * toward per-weather targets with frame-rate-independent lerps.
 *
 * Ported from legacy lines 466-478, then amplified for CONTRACTS V7.5 ("DRAMATIC weather"):
 * stronger wind/fog/exposure ranges, faster onset, vivid per-state fog colours, and a
 * deterministic STORM lightning flash. Still allocation-free, still draws no rng (so the only
 * stream effect is the indirect one any sim tuning has — weather moves entities, which shifts
 * neighbour sets). Exposure remains weather-OWNED (the 0.2.1 audit removed the audio coupling).
 */
import * as THREE from 'three';
import { lerp, clamp } from '../math/scalar';
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
  /**
   * Smoothed BASE exposure (V7.5). STORM lightning is an INSTANT additive flash on top of this
   * each frame, so the base can't be read back off `renderer.toneMappingExposure` (the flash
   * would pollute the lerp source) — it is tracked here instead.
   */
  private exposureBase = 1.15;

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
    s.weatherIdx = (((s.weatherIdx + 1) % WEATHERS.length) + WEATHERS.length) % WEATHERS.length;
    this.ctx.sfx('crystallize');
    // Invariant: weatherIdx ∈ [0, WEATHERS.length) after the modulo above.
    return WEATHERS[s.weatherIdx]!;
  }

  /**
   * Per-frame atmospheric response (V7.5 — DRAMATIC weather). O(1), allocation-free, no rng
   * (lightning is a deterministic function of `t`). Every state reshapes the world
   * unmistakably:
   * - **STORM** — a gale (×9 wind), near-black low cover, and sharp deterministic LIGHTNING
   *   flashes that blow the exposure bright for a frame.
   * - **VOID** — a deep freeze (−60 °C → faster cold death), an almost lightless black, dense.
   * - **AURORA** — luminous and saturated: the fog hue cycles vividly, exposure swells to 2×.
   * - **FOG** — a pale whiteout: dense bright-grey fog that swallows sightlines.
   * - **RAIN** — a moody blue-grey downpour drift (×3.5 wind).
   * - **CLEAR** — the calm void-blue baseline (tone-mapping unchanged, tMod = 1).
   *
   * Onset rates are faster than the legacy lerps so switching weather is felt immediately.
   */
  apply(dt: number, t: number): void {
    const s = this.ctx.state;
    // Defensive modulo: puppet masters and persistence may write any non-negative index.
    const w: Weather =
      WEATHERS[((s.weatherIdx % WEATHERS.length) + WEATHERS.length) % WEATHERS.length] ?? 'CLEAR';
    // Wind — a real gale in STORM, a steady drift in RAIN, a breath otherwise.
    const windAmp = w === 'STORM' ? 9 : w === 'RAIN' ? 3.5 : w === 'AURORA' ? 1.2 : 0.8;
    s.wind.x = Math.sin(t * 0.4) * 2.4 * windAmp;
    s.wind.z = Math.cos(t * 0.28) * 1.8 * (w === 'STORM' ? 7 : w === 'RAIN' ? 3 : 1);

    const c01 = (v: number) => clamp(v, 0, 1);

    // Temperature — deep extremes (cold < 0 °C shortens lifespan via tMod, thinning the
    // population in VOID/AURORA; heat > 30 °C extends it via entities.ts tMod). STORM under high
    // chaos can spike hot (heat-lightning) so the hot branch is reachable, not dead code.
    const stormTarget = w === 'STORM' && s.chaos > 3 ? 35 : w === 'STORM' ? 2 : null;
    s.temperature = lerp(
      s.temperature,
      w === 'VOID'
        ? -60
        : stormTarget !== null
          ? stormTarget
          : w === 'AURORA'
            ? -18
            : w === 'FOG'
              ? 14
              : 22,
      c01(dt * 0.25),
    );
    // Fog density — a real whiteout in FOG, a smothering dark in VOID/STORM. Targets ×FOG_SCALE
    // (÷ ARENA) keep the optical depth honest at 5× sightlines; faster onset (dt·0.6).
    this.fog.density = lerp(
      this.fog.density,
      // USER: densities roughly HALVED so sightlines stay READABLE in every weather — the far platform
      // used to vanish into a grey/black wash ("too dark/grey all the time"). Still graded: FOG is the
      // thickest haze, CLEAR the crispest, but none swallow the scene now.
      (w === 'FOG'
        ? 0.0055
        : w === 'VOID'
          ? 0.005
          : w === 'STORM'
            ? 0.0045
            : w === 'RAIN'
              ? 0.0035
              : 0.0022) * FOG_SCALE,
      c01(dt * 0.6),
    );
    // Fog colour — vivid AURORA cycling, pale FOG whiteout, blue-grey RAIN, near-black storm/void.
    // USER: lift the darkest fog colours OFF near-black so distance fades to a deep, readable tone rather
    // than a black/grey void — keeps the cool night mood without swallowing the scene into murk.
    if (w === 'AURORA') this.fog.color.setHSL((t * 0.04) % 1, 0.7, 0.16);
    else if (w === 'FOG') this.fog.color.set(0x8890a8);
    else if (w === 'RAIN') this.fog.color.set(0x1a2233);
    else if (w === 'STORM') this.fog.color.set(0x10121c);
    else if (w === 'VOID') this.fog.color.set(0x080814);
    else this.fog.color.set(0x0a1428);
    // Exposure — luminous AURORA, near-lightless VOID, dim STORM, bright FOG whiteout.
    // USER: lift the darkest exposure floors (VOID 0.35→0.52, STORM 0.6→0.78) so no weather reads as
    // near-lightless — the scene stays clear regardless of state (VOID stays the DARKEST, just readable;
    // the big fog-density cut above does most of the clarity work).
    const exTarget =
      w === 'VOID' ? 0.52 : w === 'AURORA' ? 2.0 : w === 'STORM' ? 0.78 : w === 'FOG' ? 1.35 : 1.15;
    this.exposureBase = lerp(this.exposureBase, exTarget, c01(dt * 0.3));
    // STORM lightning: two sharp, deterministic exposure spikes (sin raised to a high power is a
    // narrow flash near its peak) added INSTANTLY on top of the smoothed base — a stroke of light.
    let exposure = this.exposureBase;
    if (w === 'STORM') {
      const a = Math.max(0, Math.sin(t * 2.3));
      const b = Math.max(0, Math.sin(t * 5.7 + 1.3));
      exposure += (Math.pow(a, 30) + Math.pow(b, 60)) * 2.2;
    }
    this.engine.renderer.toneMappingExposure = exposure;
  }
}
