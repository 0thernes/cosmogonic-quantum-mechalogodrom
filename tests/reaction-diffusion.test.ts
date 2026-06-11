/**
 * Experiments pinning the Gray–Scott reaction-diffusion contract:
 * finite after 500 stressed steps, uniform-stays-uniform, perturbation breaks
 * symmetry, same-seed bit-determinism, and the weather/chaos couplings.
 * Runs DOM-free under bun — three's Scene/DataTexture are pure JS.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { ReactionDiffusionSystem } from '../src/sim/reaction-diffusion';
import { WEATHERS } from '../src/sim/constants';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

/** Fresh mutable sim state with sane defaults; override weather/chaos per experiment. */
function makeState(overrides: Partial<SimState> = {}): SimState {
  return {
    chaos: 1,
    mutations: 0,
    timeScale: 1,
    wireframe: false,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    frame: 0,
    elapsed: 0,
    ...overrides,
  };
}

/**
 * Minimal fake SimContext. ReactionDiffusionSystem only touches `state` and
 * `rng`; the rest are inert placeholders (the audit noop is cast because the
 * real AuditTrail is a browser leaf and is never called by this system).
 */
function makeCtx(seed: number, state: SimState = makeState()): SimContext {
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'laptop' as const,
      isMobile: false,
      instanced: false,
      dprCap: 2,
      maxEntities: 10,
      targetEntities: 10,
      quantumCount: 10,
      maxLinks: 10,
      shadows: false,
      starCount: 10,
    },
    rng: mulberry32(seed),
    grid: new SpatialHash<Entity>(),
    morphs: [],
    geos: [],
    state,
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

const WEATHER_INDEX: Record<string, number> = {};
WEATHERS.forEach((w, i) => {
  WEATHER_INDEX[w] = i;
});

describe('construction', () => {
  test('throws on non-integer or too-small sizes', () => {
    expect(() => new ReactionDiffusionSystem(makeCtx(1), 0)).toThrow();
    expect(() => new ReactionDiffusionSystem(makeCtx(1), 7)).toThrow();
    expect(() => new ReactionDiffusionSystem(makeCtx(1), 64.5)).toThrow();
  });

  test('defaults to a 128×128 RGBA8 texture, uniform white (u = 1) with opaque alpha', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(1));
    expect(rd.texture.image.width).toBe(128);
    expect(rd.texture.image.height).toBe(128);
    const data = rd.texture.image.data as Uint8Array;
    expect(data.length).toBe(128 * 128 * 4);
    for (let i = 0; i < data.length; i++) expect(data[i]).toBe(255);
    expect(rd.fieldU.length).toBe(128 * 128);
    expect(rd.fieldV.length).toBe(128 * 128);
  });

  test('construction draws nothing from the rng (stream stays aligned)', () => {
    const rng = mulberry32(777);
    const reference = mulberry32(777);
    const rd = new ReactionDiffusionSystem({ ...makeCtx(0), rng }, 32);
    expect(rd.fieldU.length).toBe(32 * 32);
    expect(rng()).toBe(reference());
  });
});

describe('uniform field stays uniform without perturbation', () => {
  test('the trivial state (u=1, v=0) is an exact fixed point over 50 steps', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(42), 64);
    for (let n = 0; n < 50; n++) rd.step();
    const u = rd.fieldU;
    const v = rd.fieldV;
    for (let i = 0; i < u.length; i++) {
      expect(u[i]).toBe(1);
      expect(v[i]).toBe(0);
    }
  });

  test('uniformity holds under every weather and extreme chaos', () => {
    for (const w of WEATHERS) {
      const state = makeState({ weatherIdx: WEATHER_INDEX[w] ?? 0, chaos: 10 });
      const rd = new ReactionDiffusionSystem(makeCtx(7, state), 32);
      for (let n = 0; n < 25; n++) rd.step();
      const u = rd.fieldU;
      const v = rd.fieldV;
      const u0 = u[0];
      const v0 = v[0];
      for (let i = 1; i < u.length; i++) {
        expect(u[i]).toBe(u0);
        expect(v[i]).toBe(v0);
      }
    }
  });
});

describe('perturbation breaks symmetry', () => {
  test('perturb seeds the inhibitor and cuts the activator immediately', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(5), 64);
    rd.perturb(0.5, 0.5);
    let vMax = 0;
    let uMin = 1;
    for (let i = 0; i < rd.fieldV.length; i++) {
      vMax = Math.max(vMax, rd.fieldV[i] ?? 0);
      uMin = Math.min(uMin, rd.fieldU[i] ?? 1);
    }
    expect(vMax).toBeGreaterThan(0.5);
    expect(uMin).toBeLessThan(0.6);
  });

  test('the field is spatially non-uniform after stepping a perturbed grid', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(5), 64);
    rd.perturb(0.5, 0.5);
    for (let n = 0; n < 60; n++) rd.step();
    const u = rd.fieldU;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < u.length; i++) {
      const c = u[i] ?? 0;
      min = Math.min(min, c);
      max = Math.max(max, c);
    }
    expect(max - min).toBeGreaterThan(0.1);
    // The texture must reflect the broken symmetry too.
    const px = rd.texture.image.data as Uint8Array;
    let pxMin = 255;
    let pxMax = 0;
    for (let i = 0; i < px.length; i += 4) {
      const lum = px[i] ?? 0;
      pxMin = Math.min(pxMin, lum);
      pxMax = Math.max(pxMax, lum);
    }
    expect(pxMax - pxMin).toBeGreaterThan(25);
  });

  test('perturb wraps toroidally at corners and accepts out-of-range UV', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(11), 32);
    rd.perturb(0, 0);
    rd.perturb(1, 1);
    rd.perturb(1.25, -0.1); // wraps to (0.25, 0.9)
    rd.perturb(0.5, 0.5, 100000); // radius clamps to size/4
    rd.perturb(0.5, 0.5, 0); // radius clamps up to 1 — still seeds the center
    for (let n = 0; n < 10; n++) rd.step();
    for (let i = 0; i < rd.fieldU.length; i++) {
      expect(Number.isFinite(rd.fieldU[i] ?? NaN)).toBeTrue();
      expect(Number.isFinite(rd.fieldV[i] ?? NaN)).toBeTrue();
    }
  });
});

describe('boundedness: finite after 500 steps', () => {
  test('stressed field (max chaos, all weathers, repeated perturbs) stays in [0, 1]', () => {
    const state = makeState({ chaos: 10 });
    const rd = new ReactionDiffusionSystem(makeCtx(1337, state), 128);
    const rng = mulberry32(2026);
    for (let n = 0; n < 500; n++) {
      if (n % 80 === 0) state.weatherIdx = (state.weatherIdx + 1) % WEATHERS.length;
      if (n % 50 === 0) rd.perturb(rng(), rng());
      rd.step();
    }
    const u = rd.fieldU;
    const v = rd.fieldV;
    for (let i = 0; i < u.length; i++) {
      const uc = u[i] ?? NaN;
      const vc = v[i] ?? NaN;
      expect(Number.isFinite(uc)).toBeTrue();
      expect(Number.isFinite(vc)).toBeTrue();
      expect(uc).toBeGreaterThanOrEqual(0);
      expect(uc).toBeLessThanOrEqual(1);
      expect(vc).toBeGreaterThanOrEqual(0);
      expect(vc).toBeLessThanOrEqual(1);
    }
  }, 20000);
});

describe('determinism', () => {
  /** Same perturb/step schedule applied to a fresh system built on `seed`. */
  function runSchedule(seed: number, weatherIdx: number, chaos: number): ReactionDiffusionSystem {
    const state = makeState({ weatherIdx, chaos });
    const rd = new ReactionDiffusionSystem(makeCtx(seed, state), 64);
    rd.perturb(0.25, 0.25);
    rd.perturb(0.7, 0.6, 6);
    rd.perturb(0.1, 0.9, 2);
    for (let n = 0; n < 120; n++) rd.step();
    return rd;
  }

  test('same seed ⇒ bit-identical U and V fields', () => {
    const a = runSchedule(424242, 0, 1);
    const b = runSchedule(424242, 0, 1);
    expect(a.fieldU).toEqual(b.fieldU);
    expect(a.fieldV).toEqual(b.fieldV);
    expect(a.texture.image.data as Uint8Array).toEqual(b.texture.image.data as Uint8Array);
  });

  test('different seeds diverge', () => {
    const a = runSchedule(1, 0, 1);
    const b = runSchedule(2, 0, 1);
    expect(a.fieldU).not.toEqual(b.fieldU);
  });
});

describe('weather and chaos couplings change the dynamics', () => {
  function fieldAfter(weather: (typeof WEATHERS)[number], chaos: number): Float32Array {
    const state = makeState({ weatherIdx: WEATHER_INDEX[weather] ?? 0, chaos });
    const rd = new ReactionDiffusionSystem(makeCtx(99, state), 64);
    rd.perturb(0.5, 0.5);
    for (let n = 0; n < 80; n++) rd.step();
    return rd.fieldU;
  }

  test('STORM (feed+), VOID (kill+), and AURORA (diffusion+) each diverge from CLEAR', () => {
    const clear = fieldAfter('CLEAR', 1);
    expect(fieldAfter('STORM', 1)).not.toEqual(clear);
    expect(fieldAfter('VOID', 1)).not.toEqual(clear);
    expect(fieldAfter('AURORA', 1)).not.toEqual(clear);
  });

  test('RAIN and FOG leave the base parameters untouched (match CLEAR exactly)', () => {
    const clear = fieldAfter('CLEAR', 1);
    expect(fieldAfter('RAIN', 1)).toEqual(clear);
    expect(fieldAfter('FOG', 1)).toEqual(clear);
  });

  test('chaos scales the reaction rate', () => {
    expect(fieldAfter('CLEAR', 10)).not.toEqual(fieldAfter('CLEAR', 0.1));
  });
});

describe('texture upload contract', () => {
  test('step() flags the texture for re-upload every step', () => {
    const rd = new ReactionDiffusionSystem(makeCtx(3), 32);
    const before = rd.texture.version;
    rd.step();
    rd.step();
    rd.step();
    expect(rd.texture.version).toBe(before + 3);
  });
});
