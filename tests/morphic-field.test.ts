/**
 * MORPHIC FIELD (V-MORPH) — the shared morphic-resonance field the apex imprints each beat, now
 * WIRED into world.ts. Falsifiable claims:
 * - constructed with a weak non-zero seed pattern (fieldNorm > 0), 0 imprints, 0 resonance;
 * - imprint() accumulates (imprints rises) and keeps the field FINITE;
 * - readBias() returns a FIELD_DIM bias vector + a resonance strength clamped to [0, 1];
 * - decay() shrinks the field toward zero (natural forgetting);
 * - DETERMINISM: same imprint sequence ⇒ bit-identical snapshot (the field draws NO rng, so wiring
 *   it into the apex beat never perturbs the seeded world stream).
 *
 * Headless: pure math (tsotchke-facade primitives), no DOM/GL.
 */
import { describe, expect, test } from 'bun:test';
import { MorphicField } from '../src/sim/morphic-field';

const FIELD_DIM = 16; // must match the module constant

/** A deterministic bounded latent (∈ [0,1]) of length `n`, varied by `seed` — no rng. */
function latent(seed: number, n = FIELD_DIM): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(((Math.sin(seed * 12.9898 + i * 78.233) + 1) / 2) as number);
  return out;
}

const allFinite = (xs: ArrayLike<number>): boolean => {
  for (let i = 0; i < xs.length; i++) if (!Number.isFinite(xs[i])) return false;
  return true;
};

describe('MorphicField (V-MORPH shared resonance field)', () => {
  test('constructs with a weak non-zero seed pattern and zero imprints/resonance', () => {
    const f = new MorphicField();
    const s = f.snapshot();
    expect(s.imprints).toBe(0);
    expect(s.resonanceStrength).toBe(0);
    expect(s.fieldNorm).toBeGreaterThan(0); // seeded non-zero (SO(3) symmetric basis)
    expect(s.bias.length).toBe(FIELD_DIM);
    expect(allFinite(s.bias)).toBe(true);
  });

  test('imprint accumulates and keeps the field finite; readBias is bounded', () => {
    const f = new MorphicField();
    for (let i = 0; i < 50; i++) {
      f.imprint(latent(i + 1), (i % 10) / 10); // successScore ∈ [0, 0.9]
    }
    const s = f.snapshot();
    expect(s.imprints).toBe(50);
    expect(allFinite(s.bias)).toBe(true);
    expect(Number.isFinite(s.fieldNorm)).toBe(true);

    const { bias, strength } = f.readBias(latent(7));
    expect(bias.length).toBe(FIELD_DIM);
    expect(allFinite(bias)).toBe(true);
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(1); // clamp01(gwtBroadcast) — the sim's chaos-coupling gate
  });

  test('decay shrinks the field toward zero (natural forgetting)', () => {
    const f = new MorphicField();
    for (let i = 0; i < 20; i++) f.imprint(latent(i + 3), 0.8);
    const before = f.snapshot().fieldNorm;
    for (let d = 0; d < 200; d++) f.decay();
    const after = f.snapshot().fieldNorm;
    expect(after).toBeLessThan(before); // ×0.999 per decay
    expect(after).toBeGreaterThan(0); // asymptotic, never exactly zero over a bounded run
  });

  test('DETERMINISM: same imprint sequence ⇒ bit-identical snapshot (draws no rng)', () => {
    const run = (): number[] => {
      const f = new MorphicField();
      for (let i = 0; i < 40; i++) {
        f.imprint(latent(i * 2 + 1), ((i * 7) % 11) / 11);
        f.readBias(latent(i)); // exercise the read path too (it mutates resonanceStrength)
        if (i % 5 === 0) f.decay();
      }
      const s = f.snapshot();
      return [s.fieldNorm, s.resonanceStrength, s.imprints, ...s.bias];
    };
    expect(run()).toEqual(run()); // identical — no Math.random / Date.now anywhere in the field
  });

  test('resonance strength stays in [0,1] across varied latents/scores (the chaos-coupling gate)', () => {
    const f = new MorphicField();
    let ok = true;
    for (let i = 0; i < 100; i++) {
      f.imprint(latent(i * 3 + 5), (i % 13) / 13);
      const { strength } = f.readBias(latent(i * 5 + 2));
      if (!(strength >= 0 && strength <= 1 && Number.isFinite(strength))) ok = false;
    }
    expect(ok).toBe(true);
  });
});
