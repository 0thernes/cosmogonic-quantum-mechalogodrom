/**
 * Alien atmosphere — sky dome, breathing haze, particulate air and an aurora curtain
 * (CONTRACTS V4.1 — XENOGENESIS). Built once at boot, animated in O(1) per frame.
 *
 * Nothing here is Earth-coloured: the inverted sky dome bakes a deep-oxblood horizon →
 * violet zenith → teal counter-glow gradient into vertex colours (no shaders), three
 * high-altitude haze ribbons advect with `ctx.state.wind` and breathe with audio bass,
 * a tier-scaled particulate THREE.Points volume drifts on a slow seeded brownian walk,
 * and an emissive aurora curtain ignites only under AURORA weather, brightening with the
 * quantum register's entropy.
 *
 * Determinism (contract rule 7): every random draw flows through `ctx.rng`. The
 * constructor consumes a FIXED, documented number of samples so the integrator can place
 * construction deterministically in the boot stream — see {@link RNG_DRAW_COUNT}.
 *
 * Allocation discipline (contract rule 5): all per-frame work mutates pre-allocated typed
 * arrays / reused scratch colours; `update()` allocates nothing. Runs headless under
 * `bun test` (three's Scene/BufferGeometry/Mesh/Points need no DOM until a real render).
 */
import * as THREE from 'three';
import { TAU, clamp, lerp } from '../math/scalar';
import { ARENA, ARENA_MID, ARENA_Y, CAMERA_FAR, GROUND_EXTENT, WEATHERS } from './constants';
import type { Weather } from './constants';
import type { SimContext } from '../types';

const sin = Math.sin;
const cos = Math.cos;

/** Module-level scratch colours — reused for every HSL/blend so update() never allocates. */
const TMP_A = new THREE.Color();
const TMP_B = new THREE.Color();

/** Number of haze ribbons (contract: 3 drifting atmospheric bands). */
const HAZE_BANDS = 3;

/** Sky dome radius as a fraction of the camera far plane (contract: ~far·0.9). */
const DOME_RADIUS = CAMERA_FAR * 0.9;

/**
 * Latitude/longitude tessellation of the dome. 48×32 ≈ 1617 vertices — enough for a smooth
 * three-stop gradient with no banding, cheap to recolour each frame (still O(verts), but
 * verts are constant and small relative to the entity budget).
 */
const DOME_WSEG = 48;
const DOME_HSEG = 32;

/** Particulate point size (additive, tiny — contract: "fine particulate layer"). */
const DUST_SIZE = 0.5 * ARENA_Y;

/** Max bass contribution to haze opacity (contract: ≤ 0.3). */
const HAZE_BASS_GAIN = 0.3;

/**
 * Exact number of `ctx.rng()` calls the constructor makes, so the integrator can advance
 * the boot RNG stream deterministically when placing construction.
 *
 * Breakdown (let `D` = particulate count = `floor(quality.maxEntities / 4)`):
 * - Sky dome gradient bake: **0** draws (pure geometry-driven, no randomness).
 * - Haze ribbons: 3 bands × 4 draws each (drift phase, altitude jitter, hue jitter,
 *   base-opacity jitter) = **12** draws.
 * - Particulate volume: `D` particles × 5 draws each (x, y, z position + 2 velocity
 *   components; the third velocity component is derived from the first two with no draw) =
 *   **5·D** draws.
 * - Aurora curtain: 1 draw (phase seed) = **1** draw.
 *
 * Total = `13 + 5·D`. This constant is `13` (the fixed part); add `5 · floor(maxEntities/4)`
 * for the per-tier particulate draws. The integrator note states both halves explicitly.
 */
export const RNG_DRAW_COUNT_FIXED = 13;

/** Per-particle RNG draws in the particulate volume (see {@link RNG_DRAW_COUNT_FIXED}). */
export const RNG_DRAWS_PER_PARTICLE = 5;

/** Minimal audio-bands view consumed by {@link AtmosphereSystem.update} (structural). */
export interface AtmosphereBands {
  /** Low-band energy 0..1 — pulses the haze opacity (gain ≤ 0.3). */
  bass: number;
  /** Overall level 0..1 — subtle particulate twinkle. */
  level: number;
}

/** A single drifting haze ribbon plus its animation parameters. */
interface HazeRibbon {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Drift phase offset (radians) so the three bands desynchronise. */
  phase: number;
  /** Base altitude (world Y) this ribbon hovers around. */
  baseY: number;
  /** Quiescent opacity before the bass pulse is added. */
  baseOpacity: number;
}

/**
 * Owns the alien sky + air. Construct once (adds a dome, three haze ribbons, a particulate
 * Points cloud and an aurora curtain to `ctx.scene`); call {@link update} once per frame.
 */
export class AtmosphereSystem {
  private readonly ctx: SimContext;

  // ── Sky dome ───────────────────────────────────────────────────────────────
  private readonly domeColors: Float32Array;
  private readonly domeColorAttr: THREE.BufferAttribute;
  /** Normalized vertical position of each dome vertex, −1 (nadir) .. +1 (zenith). */
  private readonly domeLat: Float32Array;
  private readonly domeVertCount: number;
  private readonly domeMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

  // ── Haze ribbons ─────────────────────────────────────────────────────────────
  private readonly ribbons: HazeRibbon[] = [];

  // ── Particulate volume ───────────────────────────────────────────────────────
  private readonly dustCount: number;
  private readonly dustPos: Float32Array;
  private readonly dustVel: Float32Array;
  private readonly dustPosAttr: THREE.BufferAttribute;
  private readonly dustMaterial: THREE.PointsMaterial;
  private readonly dustMesh: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  // ── Aurora curtain ───────────────────────────────────────────────────────────
  private readonly auroraMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly auroraPhase: number;

  // V109: dome wireframe circuit overlay — thin lat/long wireframe that pulses with chaos
  private readonly wireMat: THREE.MeshBasicMaterial;
  private readonly wireMesh: THREE.Mesh;

  // V109: rain particles (visible only during RAIN weather) + lightning flash
  private readonly rainPos: Float32Array;
  private readonly rainPosAttr: THREE.BufferAttribute;
  private readonly rainMat: THREE.PointsMaterial;
  private readonly rainMesh: THREE.Points;
  private lightningFlash = 0;

  /**
   * Build the whole atmosphere and add every object to `ctx.scene`. Draws exactly
   * `RNG_DRAW_COUNT_FIXED + RNG_DRAWS_PER_PARTICLE · floor(maxEntities/4)` samples from
   * `ctx.rng` (see {@link RNG_DRAW_COUNT_FIXED}). One-time cost; no per-frame allocation.
   */
  constructor(ctx: SimContext) {
    this.ctx = ctx;
    const rng = ctx.rng;

    // ── Sky dome: inverted BackSide sphere, vertex-colour gradient, fog-exempt. ──
    const domeGeo = new THREE.SphereGeometry(DOME_RADIUS, DOME_WSEG, DOME_HSEG);
    const posAttr = domeGeo.getAttribute('position');
    const vc = posAttr.count;
    this.domeVertCount = vc;
    this.domeColors = new Float32Array(vc * 3);
    this.domeLat = new Float32Array(vc);
    for (let i = 0; i < vc; i++) {
      // Normalised latitude in [-1, 1] from world Y on the sphere of radius DOME_RADIUS.
      this.domeLat[i] = clamp((posAttr.getY(i) ?? 0) / DOME_RADIUS, -1, 1);
    }
    this.domeColorAttr = new THREE.BufferAttribute(this.domeColors, 3);
    domeGeo.setAttribute('color', this.domeColorAttr);
    // Bake the initial CLEAR-weather gradient (no rng draws here).
    this.bakeDome('CLEAR', 1);
    const domeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.domeMesh = new THREE.Mesh(domeGeo, domeMat);
    ctx.scene.add(this.domeMesh);

    // V109: dome wireframe circuit overlay — thin lat/long wireframe that pulses with chaos.
    // Gives the dome a wired/circuit-like infrastructure feel instead of a bare gradient sphere.
    const wireGeo = new THREE.SphereGeometry(DOME_RADIUS * 1.001, 24, 16);
    this.wireMat = new THREE.MeshBasicMaterial({
      color: 0x2a4a6a,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.wireMesh = new THREE.Mesh(wireGeo, this.wireMat);
    this.wireMesh.frustumCulled = false;
    ctx.scene.add(this.wireMesh);

    // V109: rain particles — deterministic positional hash, no rng draws.
    // Only visible during RAIN weather; falls straight down with wind drift.
    const RAIN_COUNT = 600;
    this.rainPos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const i3 = i * 3;
      const s = Math.sin(i * 41.17 + 13.91) * 24634.6345;
      const h = s - Math.floor(s);
      this.rainPos[i3] = (h - 0.5) * GROUND_EXTENT;
      this.rainPos[i3 + 1] = h * 140 * ARENA_Y;
      this.rainPos[i3 + 2] = (((Math.sin(i * 17.13 + 7.7) * 4131.7) % 1) - 0.5) * GROUND_EXTENT;
    }
    const rainGeo = new THREE.BufferGeometry();
    this.rainPosAttr = new THREE.BufferAttribute(this.rainPos, 3);
    rainGeo.setAttribute('position', this.rainPosAttr);
    this.rainMat = new THREE.PointsMaterial({
      color: 0x6a8aaa,
      size: 2 * ARENA_Y,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      fog: false,
    });
    this.rainMesh = new THREE.Points(rainGeo, this.rainMat);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    ctx.scene.add(this.rainMesh);

    // ── Haze ribbons: 3 large translucent planes at high altitude. ──────────────
    // 4 rng draws per band (phase, altitude jitter, hue jitter, opacity jitter) = 12.
    const ribbonSpan = GROUND_EXTENT * 0.9;
    for (let b = 0; b < HAZE_BANDS; b++) {
      const phase = rng() * TAU;
      const baseY = (70 + b * 22 + (rng() - 0.5) * 16) * ARENA_Y;
      const hue = 0.74 + (rng() - 0.5) * 0.16; // violet/magenta band, away from sky-blue
      const baseOpacity = 0.05 + rng() * 0.05;
      const geo = new THREE.PlaneGeometry(ribbonSpan, ribbonSpan * 0.32);
      const mat = new THREE.MeshBasicMaterial({
        color: TMP_A.setHSL(((hue % 1) + 1) % 1, 0.55, 0.45).getHex(),
        transparent: true,
        opacity: baseOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // lie flat, high overhead
      mesh.rotation.z = phase; // each ribbon canted differently
      mesh.position.set(0, baseY, 0);
      ctx.scene.add(mesh);
      this.ribbons.push({ mesh, phase, baseY, baseOpacity });
    }

    // ── Particulate volume: THREE.Points, count ~ tier / 4, brownian drift. ──────
    const dustCount = Math.max(0, Math.floor(ctx.quality.maxEntities / 4));
    this.dustCount = dustCount;
    this.dustPos = new Float32Array(dustCount * 3);
    this.dustVel = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      // 5 rng draws per particle: 3 position + 2 velocity (third velocity derived).
      const px = (rng() - 0.5) * GROUND_EXTENT;
      const py = (10 + rng() * 120) * ARENA_Y;
      const pz = (rng() - 0.5) * GROUND_EXTENT;
      const vx = (rng() - 0.5) * 0.04;
      const vz = (rng() - 0.5) * 0.04;
      this.dustPos[i3] = px;
      this.dustPos[i3 + 1] = py;
      this.dustPos[i3 + 2] = pz;
      this.dustVel[i3] = vx;
      // Gentle upward bias so motes loft rather than sink; derived, no extra draw.
      this.dustVel[i3 + 1] = (Math.abs(vx) + Math.abs(vz)) * 0.5 + 0.005;
      this.dustVel[i3 + 2] = vz;
      // Cold teal/violet motes (non-Earth), set once at boot.
      TMP_A.setHSL(0.5 + (px / GROUND_EXTENT) * 0.25, 0.5, 0.6);
      dustCol[i3] = TMP_A.r;
      dustCol[i3 + 1] = TMP_A.g;
      dustCol[i3 + 2] = TMP_A.b;
    }
    const dustGeo = new THREE.BufferGeometry();
    this.dustPosAttr = new THREE.BufferAttribute(this.dustPos, 3);
    dustGeo.setAttribute('position', this.dustPosAttr);
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    this.dustMaterial = new THREE.PointsMaterial({
      size: DUST_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.dustMesh = new THREE.Points(dustGeo, this.dustMaterial);
    ctx.scene.add(this.dustMesh);

    // ── Aurora curtain: tall emissive ribbon, lit only under AURORA. ─────────────
    this.auroraPhase = rng() * TAU; // 1 rng draw
    const auroraGeo = new THREE.PlaneGeometry(GROUND_EXTENT * 0.7, 160 * ARENA_Y, 24, 1);
    const auroraMat = new THREE.MeshBasicMaterial({
      color: 0x1affc8,
      transparent: true,
      opacity: 0, // dark until AURORA brightens it
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    this.auroraMesh.position.set(0, 120 * ARENA_Y, -90 * ARENA);
    ctx.scene.add(this.auroraMesh);
  }

  /** Remove every object this system added to the scene and free their GPU resources (e.g. dev HMR). */
  dispose(): void {
    const scene = this.ctx.scene;
    scene.remove(this.domeMesh);
    this.domeMesh.geometry.dispose();
    this.domeMesh.material.dispose();
    scene.remove(this.wireMesh);
    this.wireMesh.geometry.dispose();
    this.wireMat.dispose();
    scene.remove(this.rainMesh);
    this.rainMesh.geometry.dispose();
    this.rainMat.dispose();
    scene.remove(this.dustMesh);
    this.dustMesh.geometry.dispose();
    this.dustMaterial.dispose();
    scene.remove(this.auroraMesh);
    this.auroraMesh.geometry.dispose();
    this.auroraMesh.material.dispose();
    for (const r of this.ribbons) {
      scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
  }

  /**
   * Re-bake the dome vertex-colour gradient for a weather + chaos pairing. Three latitude
   * stops — deep-oxblood horizon, violet zenith, teal counter-glow below the horizon —
   * shifted by weather and intensified by chaos. Allocation-free (reuses scratch colours).
   * O(domeVertCount); domeVertCount is a small fixed constant. Called from `update()` only
   * when the visible weather or a coarse chaos bucket changes, so it is NOT a per-frame cost.
   */
  private bakeDome(weather: Weather, chaosNorm: number): void {
    // Per-weather hue/lightness targets for the three stops (all NON-Earth).
    // horizon: oxblood (deep red), zenith: violet, counter: teal.
    let hHorizon = 0.99; // ≈ deep oxblood red
    let hZenith = 0.76; // violet
    let hCounter = 0.47; // teal
    let lScale = 1;
    let sScale = 1;
    switch (weather) {
      case 'STORM':
        hHorizon = 0.86; // bruised magenta storm front
        hZenith = 0.7;
        lScale = 0.8;
        sScale = 1.1;
        break;
      case 'VOID':
        lScale = 0.25; // near-black void sky
        sScale = 0.6;
        break;
      case 'AURORA':
        hHorizon = 0.55; // cyan-shifted, the air goes electric
        hZenith = 0.78;
        hCounter = 0.42;
        lScale = 1.25;
        sScale = 1.2;
        break;
      case 'FOG':
        lScale = 0.7;
        sScale = 0.5;
        break;
      default:
        break; // CLEAR / RAIN keep the base alien palette
    }
    // SIMULATION N(2) — the world breaks free: a sickly, oversaturated, too-bright sky that
    // overrides whatever the weather chose. Bile-green horizon, rotten-violet zenith, a
    // blood-magenta underglow — wrong in every direction (CONTRACTS V7.6).
    if (this.nightmare) {
      hHorizon = 0.28; // bilious green
      hZenith = 0.83; // rotten violet
      hCounter = 0.97; // blood magenta
      lScale *= 2.1; // unnaturally bright
      sScale = 1.7; // oversaturated
    }
    // Chaos lifts saturation and adds a hot tremor to the horizon.
    const chaosLift = 0.85 + chaosNorm * 0.4;
    const colors = this.domeColors;
    const lat = this.domeLat;
    for (let i = 0; i < this.domeVertCount; i++) {
      const y = lat[i] ?? 0; // −1 (nadir) .. +1 (zenith)
      const i3 = i * 3;
      if (y >= 0) {
        // Upper hemisphere: horizon → zenith.
        const t = y; // 0 at horizon, 1 at zenith
        const hue = lerp(hHorizon, hZenith, t);
        const l = lerp(0.14, 0.07, t) * lScale;
        const s = clamp(lerp(0.85, 0.7, t) * sScale * chaosLift, 0, 1);
        TMP_A.setHSL(((hue % 1) + 1) % 1, s, clamp(l, 0, 1));
      } else {
        // Lower hemisphere: horizon → counter-glow (teal underlight).
        const t = -y; // 0 at horizon, 1 at nadir
        const hue = lerp(hHorizon, hCounter, t);
        const l = lerp(0.14, 0.05, t) * lScale;
        const s = clamp(lerp(0.85, 0.6, t) * sScale * chaosLift, 0, 1);
        TMP_A.setHSL(((hue % 1) + 1) % 1, s, clamp(l, 0, 1));
      }
      // BRUTALISM: lerp the alien gradient toward overcast concrete (brighter at the horizon,
      // darker toward the poles for monolithic depth). Off (0) ⇒ the alien sky is unchanged.
      if (this.brutalismF > 0) {
        TMP_B.setHSL(0.62, 0.04, lerp(0.34, 0.2, Math.abs(y)));
        TMP_A.lerp(TMP_B, this.brutalismF);
      }
      colors[i3] = TMP_A.r;
      colors[i3 + 1] = TMP_A.g;
      colors[i3 + 2] = TMP_A.b;
    }
    this.domeColorAttr.needsUpdate = true;
  }

  /** Last weather the dome was baked for (avoids per-frame re-bake). */
  private lastWeather: Weather | null = null;
  /** Last coarse chaos bucket the dome was baked for (0..10 integer). */
  private lastChaosBucket = -1;
  /** SIMULATION N(2) nightmare flag (CONTRACTS V7.6): a lurid inverted sky when set. */
  private nightmare = false;
  /** BRUTALISM 0..1 — lerps the baked sky-dome gradient toward overcast concrete. */
  private brutalismF = 0;
  /** Last brutalism bucket the dome was baked for (forces a re-bake on change). */
  private lastBrutalismBucket = -1;

  /**
   * Toggle the SIMULATION N(2) nightmare sky (CONTRACTS V7.6). When on, {@link bakeDome}
   * overrides the alien palette with a sickly, oversaturated, too-bright wrongness. Forces a
   * re-bake on the next `update()`. O(1).
   */
  setNightmare(on: boolean): void {
    if (this.nightmare === on) return;
    this.nightmare = on;
    this.lastWeather = null; // invalidate the bake cache so update() re-bakes
    this.lastChaosBucket = -1;
  }

  /**
   * BRUTALISM: set the 0..1 factor that lerps the sky-dome gradient toward overcast concrete. The
   * gated re-bake in {@link update} (a coarse brutalism bucket) picks the change up next frame. O(1).
   */
  setBrutalism(f: number): void {
    const c = f < 0 ? 0 : f > 1 ? 1 : f;
    // Snap the easing tail to a clean OFF. The world eases brutalism toward 0 but never reaches it,
    // so without this snap the dome would freeze ~4% concrete-tinted forever: the coarse re-bake
    // bucket in update() cannot distinguish a tiny positive factor from 0, so the last bake (at the
    // bucket-0 boundary, ≈0.04) would persist. < 0.02 is imperceptible. See update()'s bucketing.
    this.brutalismF = c < 0.02 ? 0 : c;
  }

  /**
   * Per-frame atmosphere animation. Allocation-free; O(domeVerts + ribbons + dust).
   *
   * - Sky: re-bakes the dome gradient only when the visible weather or a coarse chaos
   *   bucket changes (cheap to call every frame; the inner bake is gated).
   * - Haze: advects each ribbon with `ctx.state.wind`, gently bobs its altitude, and pulses
   *   its opacity with `bands.bass` (gain ≤ {@link HAZE_BASS_GAIN}).
   * - Particulate: integrates the seeded brownian drift, wraps motes that leave the arena
   *   box, and twinkles size faintly with `bands.level`.
   * - Aurora: visible only under AURORA weather; opacity + a slow sway brighten with
   *   `qEntropy` (normalized 0..1 register entropy).
   *
   * @param dt   Frame delta (seconds, already time-scaled by world.ts).
   * @param t    Elapsed sim time (seconds) for phase-coherent waves.
   * @param bands Audio bands (bass pulses haze, level twinkles dust).
   * @param qEntropy Normalized 0..1 quantum-register entropy (brightens the aurora).
   */
  update(dt: number, t: number, bands: AtmosphereBands, qEntropy: number): void {
    const s = this.ctx.state;
    const weather: Weather = WEATHERS[s.weatherIdx % WEATHERS.length] ?? 'CLEAR';
    const chaosNorm = clamp(s.chaos / 10, 0, 1);

    // ── Sky dome: gated re-bake (weather change or a new integer chaos bucket). ──
    const chaosBucket = Math.round(s.chaos);
    // Bucket 0 ⇔ exactly OFF (re-bakes the pristine alien sky; the lerp in bakeDome is gated on
    // `brutalismF > 0`); buckets 1..12 span the live (0,1] range. Distinguishing "off" from
    // "barely on" is what lets the OFF toggle fully restore the sky instead of parking it on the
    // bottom rounding bucket (paired with the < 0.02 snap in setBrutalism).
    const brutalismBucket = this.brutalismF <= 0 ? 0 : 1 + Math.round(this.brutalismF * 11);
    if (
      weather !== this.lastWeather ||
      chaosBucket !== this.lastChaosBucket ||
      brutalismBucket !== this.lastBrutalismBucket
    ) {
      this.bakeDome(weather, chaosNorm);
      this.lastWeather = weather;
      this.lastChaosBucket = chaosBucket;
      this.lastBrutalismBucket = brutalismBucket;
    }

    // ── Haze ribbons: advect with wind, bob, pulse opacity with bass. ────────────
    const bass = clamp(bands.bass, 0, 1);
    const windX = s.wind.x;
    const windZ = s.wind.z;
    const span = GROUND_EXTENT * 0.45;
    for (let b = 0; b < this.ribbons.length; b++) {
      // In range: loop bound is ribbons.length.
      const r = this.ribbons[b]!;
      const ph = r.phase;
      // Slow advection: wind nudges the ribbon, wrapped into ±span so it never escapes.
      let x = r.mesh.position.x + windX * dt * 6;
      let z = r.mesh.position.z + windZ * dt * 6;
      x = ((((x + span) % (span * 2)) + span * 2) % (span * 2)) - span;
      z = ((((z + span) % (span * 2)) + span * 2) % (span * 2)) - span;
      r.mesh.position.x = x;
      r.mesh.position.z = z;
      r.mesh.position.y = r.baseY + sin(t * 0.05 + ph) * 6 * ARENA_Y;
      r.mesh.rotation.z = ph + t * 0.01;
      r.mesh.material.opacity = r.baseOpacity + bass * HAZE_BASS_GAIN;
    }

    // ── Particulate volume: seeded brownian drift + arena wrap + faint twinkle. ──
    const pos = this.dustPos;
    const vel = this.dustVel;
    const half = GROUND_EXTENT * 0.5;
    const topY = 140 * ARENA_Y;
    const dt60 = dt * 60;
    const driftAmp = (0.6 + chaosNorm * 1.2) * ARENA_MID;
    for (let i = 0; i < this.dustCount; i++) {
      const i3 = i * 3;
      // Deterministic pseudo-brownian wobble keyed off index + time (no rng in hot path).
      const wob = sin(t * 0.3 + i * 0.7) * cos(t * 0.21 + i * 0.013);
      let px = (pos[i3] ?? 0) + ((vel[i3] ?? 0) + windX * 0.002) * dt60 * driftAmp;
      let py = (pos[i3 + 1] ?? 0) + (vel[i3 + 1] ?? 0) * dt60 * driftAmp;
      let pz =
        (pos[i3 + 2] ?? 0) + ((vel[i3 + 2] ?? 0) + windZ * 0.002 + wob * 0.01) * dt60 * driftAmp;
      // Toroidal wrap so the volume stays full without any allocation/respawn rng.
      if (px > half) px -= GROUND_EXTENT;
      else if (px < -half) px += GROUND_EXTENT;
      if (pz > half) pz -= GROUND_EXTENT;
      else if (pz < -half) pz += GROUND_EXTENT;
      if (py > topY) py = 8 * ARENA_Y;
      else if (py < 4 * ARENA_Y) py = topY;
      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
    }
    if (this.dustCount > 0) {
      this.dustPosAttr.needsUpdate = true;
      // Faint level twinkle on point size (≤ 0.25 of base — silent world unchanged).
      this.dustMaterial.size = DUST_SIZE * (1 + 0.25 * clamp(bands.level, 0, 1));
    }

    // ── Aurora curtain: only under AURORA; brightness ∝ qEntropy. ────────────────
    const auroraMat = this.auroraMesh.material;
    if (weather === 'AURORA') {
      const e = clamp(qEntropy, 0, 1);
      const target = 0.12 + e * 0.5;
      auroraMat.opacity = lerp(auroraMat.opacity, target, clamp(dt * 2, 0, 1));
      // Electric hue sweep + a slow lateral sway that quickens with entropy.
      TMP_B.setHSL((0.45 + 0.12 * sin(t * 0.1 + this.auroraPhase)) % 1, 0.85, 0.55);
      auroraMat.color.copy(TMP_B);
      this.auroraMesh.rotation.z = sin(t * (0.04 + e * 0.06) + this.auroraPhase) * 0.18;
      this.auroraMesh.visible = true;
    } else if (auroraMat.opacity > 0.001) {
      // Fade out smoothly when weather leaves AURORA, then hide.
      auroraMat.opacity = lerp(auroraMat.opacity, 0, clamp(dt * 2, 0, 1));
      if (auroraMat.opacity <= 0.001) this.auroraMesh.visible = false;
    } else {
      this.auroraMesh.visible = false;
    }

    // V109: dome wireframe circuit — pulse opacity with chaos, slow rotation for circuit feel.
    this.wireMat.opacity = 0.04 + chaosNorm * 0.12;
    this.wireMesh.rotation.y = t * 0.008;
    this.wireMesh.rotation.x = t * 0.005;

    // V109: rain particles — only visible during RAIN weather.
    if (weather === 'RAIN') {
      this.rainMesh.visible = true;
      const targetOp = 0.35 + chaosNorm * 0.2;
      this.rainMat.opacity = lerp(this.rainMat.opacity, targetOp, clamp(dt * 3, 0, 1));
      // Fall + wind drift + wrap
      const fallSpeed = (30 + chaosNorm * 20) * ARENA_Y;
      const windDrift = s.wind.x * 0.01;
      const halfR = GROUND_EXTENT * 0.5;
      const topY = 140 * ARENA_Y;
      for (let i = 0; i < this.rainPos.length; i += 3) {
        const px = this.rainPos[i];
        const py = this.rainPos[i + 1];
        const pz = this.rainPos[i + 2];
        if (px !== undefined && py !== undefined && pz !== undefined) {
          let nx = px + windDrift * dt * 60;
          let ny = py - fallSpeed * dt;
          const nz = pz + s.wind.z * 0.005 * dt * 60;
          if (ny < 0) ny = topY;
          if (nx > halfR) nx -= GROUND_EXTENT;
          else if (nx < -halfR) nx += GROUND_EXTENT;
          this.rainPos[i] = nx;
          this.rainPos[i + 1] = ny;
          this.rainPos[i + 2] = nz;
        }
      }
      this.rainPosAttr.needsUpdate = true;
    } else {
      this.rainMat.opacity = lerp(this.rainMat.opacity, 0, clamp(dt * 2, 0, 1));
      if (this.rainMat.opacity <= 0.001) this.rainMesh.visible = false;
    }

    // V109: lightning flash during STORM — deterministic time-based brief brightness pulse on the dome.
    if (weather === 'STORM') {
      // Deterministic pseudo-random from sin hash (no Math.random — determinism law).
      const strike = sin(t * 137.0 + 41.17) * 0.5 + 0.5;
      if (this.lightningFlash <= 0 && strike > 0.997 - chaosNorm * 0.005) {
        this.lightningFlash = 0.15; // 150ms flash
      }
      if (this.lightningFlash > 0) {
        this.lightningFlash -= dt;
        const flash = Math.max(0, this.lightningFlash / 0.15);
        this.wireMat.color.setRGB(0.6 + flash * 0.4, 0.7 + flash * 0.3, 1.0);
        this.wireMat.opacity = 0.04 + chaosNorm * 0.12 + flash * 0.3;
      } else {
        this.wireMat.color.setHex(0x2a4a6a);
      }
    } else {
      this.lightningFlash = 0;
      this.wireMat.color.setHex(0x2a4a6a);
    }
  }
}
