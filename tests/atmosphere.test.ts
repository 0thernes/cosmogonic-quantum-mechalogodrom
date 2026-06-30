/**
 * AtmosphereSystem contract (CONTRACTS V4.1 — XENOGENESIS). Falsifiable claims:
 * - builds headless (three Scene/Sphere/Plane/Points need no DOM) and adds exactly the
 *   documented objects to the scene (dome + 3 haze ribbons + particulate Points + aurora);
 * - the constructor draws exactly `RNG_DRAW_COUNT_FIXED + 5·floor(maxEntities/4)` rng
 *   samples (so the integrator can place boot-stream construction deterministically);
 * - the baked sky dome vertex colours are bit-identical for the same seed and the dome
 *   geometry/colour bake is seed-INDEPENDENT (gradient is geometry-driven, not random);
 * - update() keeps every dynamic buffer finite over 5000 frames at chaos 10 across every
 *   weather, and the bass→haze / qEntropy→aurora couplings actually move their targets.
 *
 * Headless: three's Scene/BufferGeometry/Mesh/Points/Color are pure JS until a real render.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import {
  AtmosphereSystem,
  RNG_DRAWS_PER_PARTICLE,
  RNG_DRAW_COUNT_FIXED,
} from '../src/sim/atmosphere';
import { WEATHERS } from '../src/sim/constants';
import type { AtmosphereBands } from '../src/sim/atmosphere';
import type { AuditTrail } from '../src/logging/audit';
import type { SimContext, SimState } from '../src/types';

/** Fresh mutable sim state; override weather/chaos/wind per experiment. */
function makeState(overrides: Partial<SimState> = {}): SimState {
  return {
    chaos: 1,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0.5, z: 0.3 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
    ...overrides,
  };
}

/**
 * Minimal DOM-free SimContext. AtmosphereSystem only touches scene/quality/rng/state;
 * the rest are inert placeholders (the audit noop is cast — the real AuditTrail is a
 * browser leaf this system never calls).
 */
function makeCtx(seed: number, maxEntities: number, state: SimState = makeState()): SimContext {
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop' as const,
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 100,
      maxLinks: 100,
      shadows: false,
      starCount: 100,
    },
    rng: mulberry32(seed),
    grid: null as unknown as SimContext['grid'],
    morphs: [],
    geos: [],
    state,
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Private internals reached for buffer assertions (sibling-test cast pattern). */
interface AtmosInternals {
  domeColors: Float32Array;
  domeVertCount: number;
  dustPos: Float32Array;
  dustCount: number;
  ribbons: { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> }[];
  auroraMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

const ZERO_BANDS: AtmosphereBands = { bass: 0, level: 0 };
const WEATHER_INDEX: Record<string, number> = {};
WEATHERS.forEach((w, i) => {
  WEATHER_INDEX[w] = i;
});

describe('construction', () => {
  test('builds headless and adds dome + ribbons + particulate + aurora + wireframe overlay', () => {
    const ctx = makeCtx(1, 800);
    const atmos = new AtmosphereSystem(ctx);
    expect(atmos).toBeInstanceOf(AtmosphereSystem);
    // dome (Mesh) + 3 ribbon Meshes + aurora Mesh + V109 dome-wireframe circuit overlay (Mesh)
    // = 6 Meshes + 1 Points (particulate).
    const meshes = ctx.scene.children.filter((c) => c instanceof THREE.Mesh);
    const points = ctx.scene.children.filter((c) => c instanceof THREE.Points);
    expect(meshes.length).toBe(6);
    expect(points.length).toBe(1);
  });

  test('particulate count is floor(maxEntities / 4)', () => {
    const a = new AtmosphereSystem(makeCtx(1, 800)) as unknown as AtmosInternals;
    expect(a.dustCount).toBe(200);
    const b = new AtmosphereSystem(makeCtx(1, 10)) as unknown as AtmosInternals;
    expect(b.dustCount).toBe(2);
    const c = new AtmosphereSystem(makeCtx(1, 3)) as unknown as AtmosInternals;
    expect(c.dustCount).toBe(0); // floor(3/4) = 0 — degenerate, must not crash
  });

  test('draws exactly RNG_DRAW_COUNT_FIXED + 5·floor(maxEntities/4) rng samples', () => {
    for (const maxEntities of [3, 10, 800, 2000]) {
      const rng = mulberry32(909);
      const reference = mulberry32(909);
      new AtmosphereSystem({ ...makeCtx(0, maxEntities), rng });
      const expected = RNG_DRAW_COUNT_FIXED + RNG_DRAWS_PER_PARTICLE * Math.floor(maxEntities / 4);
      for (let i = 0; i < expected; i++) reference();
      // The reference stream, advanced by exactly `expected` draws, now matches the
      // post-construction generator: the system consumed precisely that many samples.
      expect(rng()).toBe(reference());
    }
  });

  test('a degenerate (zero-particle) atmosphere updates without throwing', () => {
    const ctx = makeCtx(1, 3); // dustCount 0
    const atmos = new AtmosphereSystem(ctx);
    expect(() => atmos.update(0.016, 1, ZERO_BANDS, 0.5)).not.toThrow();
  });
});

describe('sky dome vertex-colour determinism', () => {
  test('same seed ⇒ bit-identical baked dome colours', () => {
    const a = new AtmosphereSystem(makeCtx(424242, 800)) as unknown as AtmosInternals;
    const b = new AtmosphereSystem(makeCtx(424242, 800)) as unknown as AtmosInternals;
    expect(a.domeColors).toEqual(b.domeColors);
  });

  test('dome gradient is seed-INDEPENDENT (geometry-driven, no random draws)', () => {
    // Two different seeds: the particulate field differs, but the baked sky gradient is
    // identical because the dome bake consumes zero rng.
    const a = new AtmosphereSystem(makeCtx(1, 800)) as unknown as AtmosInternals;
    const b = new AtmosphereSystem(makeCtx(98765, 800)) as unknown as AtmosInternals;
    expect(a.domeColors).toEqual(b.domeColors);
    // Sanity: the gradient is not a flat fill — horizon and zenith differ.
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < a.domeColors.length; i++) {
      const c = a.domeColors[i] ?? 0;
      min = Math.min(min, c);
      max = Math.max(max, c);
    }
    expect(max - min).toBeGreaterThan(0.05);
  });

  test('weather visibly recolours the dome (STORM/VOID/AURORA differ from CLEAR)', () => {
    function bakedUnder(weather: (typeof WEATHERS)[number]): Float32Array {
      const ctx = makeCtx(7, 400, makeState({ weatherIdx: WEATHER_INDEX[weather] ?? 0 }));
      const atmos = new AtmosphereSystem(ctx);
      atmos.update(0.016, 0.1, ZERO_BANDS, 0.5); // triggers the gated re-bake
      return (atmos as unknown as AtmosInternals).domeColors.slice();
    }
    const clear = bakedUnder('CLEAR');
    expect(bakedUnder('STORM')).not.toEqual(clear);
    expect(bakedUnder('VOID')).not.toEqual(clear);
    expect(bakedUnder('AURORA')).not.toEqual(clear);
  });
});

describe('update boundedness over 5000 frames', () => {
  test('chaos 10, every weather, with audio — all dynamic buffers stay finite', () => {
    const state = makeState({ chaos: 10 });
    const ctx = makeCtx(1337, 1200, state);
    const atmos = new AtmosphereSystem(ctx);
    const internals = atmos as unknown as AtmosInternals;
    const bands: AtmosphereBands = { bass: 0, level: 0 };
    let tt = 0;
    for (let n = 0; n < 5000; n++) {
      if (n % 200 === 0) state.weatherIdx = (state.weatherIdx + 1) % WEATHERS.length;
      // Synthetic audio: oscillating bass/level in [0, 1].
      bands.bass = 0.5 + 0.5 * Math.sin(n * 0.05);
      bands.level = 0.5 + 0.5 * Math.cos(n * 0.03);
      const qEntropy = 0.5 + 0.5 * Math.sin(n * 0.017);
      const dt = 0.016;
      tt += dt;
      state.frame = n;
      atmos.update(dt, tt, bands, qEntropy);
    }
    // Particulate positions finite and inside a sane box (toroidal wrap holds them in).
    const pos = internals.dustPos;
    for (let i = 0; i < pos.length; i++) {
      expect(Number.isFinite(pos[i] ?? NaN)).toBeTrue();
    }
    // Dome colours finite and in [0, 1] (valid colour channels).
    const dc = internals.domeColors;
    for (let i = 0; i < dc.length; i++) {
      const c = dc[i] ?? NaN;
      expect(Number.isFinite(c)).toBeTrue();
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    // Ribbon opacities finite and in a plausible range.
    for (const r of internals.ribbons) {
      const o = r.mesh.material.opacity;
      expect(Number.isFinite(o)).toBeTrue();
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
    // Aurora opacity finite and in [0, 1].
    const ao = internals.auroraMesh.material.opacity;
    expect(Number.isFinite(ao)).toBeTrue();
    expect(ao).toBeGreaterThanOrEqual(0);
    expect(ao).toBeLessThanOrEqual(1);
  }, 30000);

  test('extreme NaN-free inputs (huge dt, out-of-range bands) stay finite', () => {
    const ctx = makeCtx(5, 400, makeState({ chaos: 10 }));
    const atmos = new AtmosphereSystem(ctx);
    const internals = atmos as unknown as AtmosInternals;
    // Clamps inside update() must absorb out-of-range bass/level/qEntropy.
    atmos.update(0.05, 1, { bass: 5, level: -3 }, 9);
    atmos.update(0.05, 2, { bass: -1, level: 2 }, -4);
    for (let i = 0; i < internals.dustPos.length; i++) {
      expect(Number.isFinite(internals.dustPos[i] ?? NaN)).toBeTrue();
    }
  });
});

describe('audio + entropy couplings', () => {
  test('bass raises haze opacity (gain ≤ 0.3 above the quiescent base)', () => {
    const ctx = makeCtx(3, 400);
    const atmos = new AtmosphereSystem(ctx);
    const internals = atmos as unknown as AtmosInternals;
    atmos.update(0.016, 0.1, { bass: 0, level: 0 }, 0);
    const quiet = internals.ribbons.map((r) => r.mesh.material.opacity);
    atmos.update(0.016, 0.2, { bass: 1, level: 0 }, 0);
    const loud = internals.ribbons.map((r) => r.mesh.material.opacity);
    for (let i = 0; i < quiet.length; i++) {
      const q = quiet[i] ?? 0;
      const l = loud[i] ?? 0;
      expect(l).toBeGreaterThan(q); // bass pulses the air
      expect(l - q).toBeLessThanOrEqual(0.3 + 1e-9); // contract gain ceiling
    }
  });

  test('aurora brightens with qEntropy under AURORA weather only', () => {
    const auroraIdx = WEATHER_INDEX['AURORA'] ?? 3;
    // Under AURORA, higher entropy drives a higher opacity target.
    const lowCtx = makeCtx(4, 400, makeState({ weatherIdx: auroraIdx }));
    const lowAtmos = new AtmosphereSystem(lowCtx);
    const lowInt = lowAtmos as unknown as AtmosInternals;
    for (let n = 0; n < 30; n++) lowAtmos.update(0.05, n * 0.05, ZERO_BANDS, 0.0);
    const lowOpacity = lowInt.auroraMesh.material.opacity;

    const highCtx = makeCtx(4, 400, makeState({ weatherIdx: auroraIdx }));
    const highAtmos = new AtmosphereSystem(highCtx);
    const highInt = highAtmos as unknown as AtmosInternals;
    for (let n = 0; n < 30; n++) highAtmos.update(0.05, n * 0.05, ZERO_BANDS, 1.0);
    const highOpacity = highInt.auroraMesh.material.opacity;

    expect(highOpacity).toBeGreaterThan(lowOpacity);

    // Outside AURORA the curtain stays dark (fades to ~0 and hides).
    const clearCtx = makeCtx(4, 400, makeState({ weatherIdx: WEATHER_INDEX['CLEAR'] ?? 0 }));
    const clearAtmos = new AtmosphereSystem(clearCtx);
    const clearInt = clearAtmos as unknown as AtmosInternals;
    for (let n = 0; n < 30; n++) clearAtmos.update(0.05, n * 0.05, ZERO_BANDS, 1.0);
    expect(clearInt.auroraMesh.material.opacity).toBeLessThanOrEqual(0.01);
  });
});

describe('BRUTALISM sky dome — the OFF toggle fully restores the pristine sky', () => {
  test('easing brutalism to 0 re-bakes the exact pristine gradient (no permanent concrete tint)', () => {
    const ctx = makeCtx(7, 800); // CLEAR weather, fixed chaos ⇒ only the brutalism bucket varies
    const atmos = new AtmosphereSystem(ctx);
    const internals = atmos as unknown as AtmosInternals;

    // Pristine baseline after a normal (brutalism-off) update.
    atmos.update(0.016, 1, ZERO_BANDS, 0.5);
    const pristine = Float32Array.from(internals.domeColors);

    // Full brutalism → the dome bakes toward concrete (must actually change, or the test is vacuous).
    atmos.setBrutalism(1);
    atmos.update(0.016, 1.1, ZERO_BANDS, 0.5);
    let changed = false;
    for (let i = 0; i < pristine.length; i++) {
      if (Math.abs((internals.domeColors[i] ?? 0) - (pristine[i] ?? 0)) > 1e-4) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);

    // Ease brutalism back toward 0 the way the world does — geometric decay that never lands EXACTLY
    // on 0, passing through the bottom rounding bucket where the old code froze the dome ~4% concrete.
    let f = 1;
    for (let frame = 0; frame < 80; frame++) {
      f += (0 - f) * 0.2;
      atmos.setBrutalism(f);
      atmos.update(0.016, 2 + frame * 0.016, ZERO_BANDS, 0.5);
    }

    // The < 0.02 snap + bucket-0 re-bake must return the sky to byte-identical pristine.
    expect(Float32Array.from(internals.domeColors)).toEqual(pristine);
  });
});
