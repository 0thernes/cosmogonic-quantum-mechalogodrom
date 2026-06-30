/**
 * BRUTALISM phone-tier parity (PHILOSOPHY "Real math or no math"; CONTRACTS BRUTALISM crossfade).
 *
 * On the instanced tiers the ▦ BRUTAL toggle desaturates organisms IN-SHADER
 * (`InstancedEntityRenderer`'s `uBrutalism`). The phone tier has no instanced renderer — each
 * organism is a real `THREE.Mesh` in the scene — so `EntityManager.applyBrutalism` is the CPU mirror
 * that keeps the population from staying lurid while sky + ground + apex bodies turn to concrete
 * (the gap a PR review flagged). This pins the contract that makes that mirror honest:
 *
 * - the desaturate matches the shader exactly: `mix(color, mix(luma-grey, concrete(0.42,0.42,0.45),
 *   0.55), f)` with Rec.601 luma;
 * - `f = 0` is byte-identical (untouched) and the OFF edge restores the captured TRUE colour exactly;
 * - it never compounds (re-applying full brutalism is idempotent — it lerps FROM the captured base);
 * - on an instanced tier it is a guarded no-op (the shader owns the look there).
 *
 * Headless: scene-graph only, no WebGL (the fake-ctx pattern from tests/behaviors.test.ts).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { EntityManager } from '../src/sim/entities';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

function makeState(): SimState {
  return {
    chaos: 4,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
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

function makeCtx(seed: number, instanced: boolean): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const auditNoop = { record: () => undefined, entries: () => [] };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: instanced ? 'desktop' : 'phone',
      isMobile: !instanced,
      instanced,
      dprCap: 1.25,
      maxEntities: 400,
      targetEntities: 400,
      quantumCount: 10,
      maxLinks: 100,
      shadows: false,
      starCount: 10,
    },
    rng,
    grid: new SpatialHash<Entity>(8),
    morphs: createMorphotypes(rng, geos.length),
    geos,
    state: makeState(),
    audit: auditNoop as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

const live = (ents: EntityManager): Entity[] => ents.list.filter((e): e is Entity => e != null);

/** Snapshot every live organism's colour as packed hex (stable, exact). */
const colors = (ents: EntityManager): number[] => live(ents).map((e) => e.material.color.getHex());

/** Saturation (HSL) of a colour — desaturation toward grey must lower this. */
function sat(c: THREE.Color): number {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return hsl.s;
}

/** The exact shader formula, in CPU, for one base colour at factor f. The implementation captures the
 *  base as a PACKED HEX (zero-alloc), so mirror that 8-bit round-trip here for an exact comparison. */
function expectConcrete(base: THREE.Color, f: number): THREE.Color {
  const b = new THREE.Color().setHex(base.getHex()); // match the impl's packed-hex base capture
  const lum = b.r * 0.299 + b.g * 0.587 + b.b * 0.114;
  const tgt = new THREE.Color(lum, lum, lum).lerp(new THREE.Color(0.42, 0.42, 0.45), 0.55);
  return b.lerp(tgt, f);
}

describe('EntityManager.applyBrutalism — phone-tier per-mesh parity', () => {
  test('f = 0 from a fresh state is byte-identical (never touches the colour)', () => {
    const ents = new EntityManager(makeCtx(0xb70741, false));
    ents.reset(48);
    const before = colors(ents);
    ents.applyBrutalism(0);
    expect(colors(ents)).toEqual(before);
  });

  test('full brutalism desaturates every organism toward concrete (exact shader formula)', () => {
    const ents = new EntityManager(makeCtx(0x5caa07, false));
    ents.reset(48);
    const bases = live(ents).map((e) => e.material.color.clone());
    ents.applyBrutalism(1);
    const after = live(ents).map((e) => e.material.color);
    for (let i = 0; i < after.length; i++) {
      const want = expectConcrete(bases[i]!, 1);
      expect(after[i]!.r).toBeCloseTo(want.r, 6);
      expect(after[i]!.g).toBeCloseTo(want.g, 6);
      expect(after[i]!.b).toBeCloseTo(want.b, 6);
      // Each organism is now strictly closer to neutral than its lurid base (genuine desaturation).
      expect(sat(after[i]!)).toBeLessThanOrEqual(sat(bases[i]!) + 1e-9);
    }
    // At least one base was actually saturated, so the pass did real work (not a vacuous identity).
    expect(bases.some((b) => sat(b) > 0.2)).toBe(true);
  });

  test('the OFF edge restores every TRUE colour exactly (on → off round-trip)', () => {
    const ents = new EntityManager(makeCtx(0x1eee77, false));
    ents.reset(48);
    const before = colors(ents);
    ents.applyBrutalism(1); // on
    ents.applyBrutalism(0.5); // partial
    ents.applyBrutalism(0); // off edge → restore
    expect(colors(ents)).toEqual(before);
  });

  test('re-applying full brutalism is idempotent (lerps FROM base — never compounds)', () => {
    const ents = new EntityManager(makeCtx(0x9a9a9a, false));
    ents.reset(48);
    ents.applyBrutalism(1);
    const once = colors(ents);
    ents.applyBrutalism(1);
    ents.applyBrutalism(1);
    expect(colors(ents)).toEqual(once);
  });

  test('partial factor matches the analytic mid-crossfade', () => {
    const ents = new EntityManager(makeCtx(0xc0ffee, false));
    ents.reset(32);
    const bases = live(ents).map((e) => e.material.color.clone());
    ents.applyBrutalism(0.5);
    const after = live(ents).map((e) => e.material.color);
    for (let i = 0; i < after.length; i++) {
      const want = expectConcrete(bases[i]!, 0.5);
      expect(after[i]!.getHex()).toBe(want.getHex());
    }
  });

  test('remorph during brutalism re-captures the new morph colour on restore', () => {
    const ctx = makeCtx(0xbeef00, false);
    const ents = new EntityManager(ctx);
    ents.reset(16);
    const e = live(ents)[0]!;
    const mi0 = e.userData.mi;
    ents.applyBrutalism(1);
    ents.remorph(e, (mi0 + 1) % ctx.morphs.length);
    ents.applyBrutalism(0);
    const restored = e.material.color.getHex();
    ents.applyBrutalism(0);
    const baseAfterRemorph = e.material.color.getHex();
    expect(restored).toBe(baseAfterRemorph);
    ents.applyBrutalism(1);
    expect(e.material.color.getHex()).not.toBe(baseAfterRemorph);
  });

  test('instanced tier is a guarded no-op (the shader owns the look)', () => {
    const ents = new EntityManager(makeCtx(0xdec0de, true));
    ents.reset(48);
    const before = colors(ents);
    ents.applyBrutalism(1);
    ents.applyBrutalism(0.5);
    expect(colors(ents)).toEqual(before);
  });

  test('factor is clamped — values past 1 behave like full concrete', () => {
    const a = new EntityManager(makeCtx(0x42, false));
    a.reset(24);
    const b = new EntityManager(makeCtx(0x42, false));
    b.reset(24);
    a.applyBrutalism(1);
    b.applyBrutalism(5); // over-range
    expect(colors(b)).toEqual(colors(a));
  });
});
