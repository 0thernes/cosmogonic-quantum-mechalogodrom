/**
 * Latent substrates — proves the three formerly-DEAD modules (schrodinger / so3 / causal-graph) are
 * now genuine, bounded, deterministic mechanisms (not decorative). The super-mind reproducibility
 * test additionally covers their live integration (snapshot().latentSubstrates is part of the
 * bit-identical-from-seed assertion).
 */
import { describe, expect, test } from 'bun:test';
import {
  quantumUncertainty,
  orientationCoherence,
  latentSubstrateStep,
  type LatentInputs,
} from '../src/sim/latent-substrates';

describe('latent substrates — Schrödinger positional uncertainty', () => {
  test('bounded [0,1], finite, deterministic across the drive range', () => {
    for (let i = 0; i <= 10; i++) {
      const d = i / 10;
      const u = quantumUncertainty(d);
      expect(Number.isFinite(u)).toBe(true);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
      expect(quantumUncertainty(d)).toBe(u); // same input ⇒ identical bytes
    }
  });

  test('the wavepacket spread genuinely depends on drive (not a frozen constant)', () => {
    expect(quantumUncertainty(0)).not.toBe(quantumUncertainty(1));
  });
});

describe('latent substrates — SO(3) orientation coherence', () => {
  test('aligned/degenerate inputs → coherence 1', () => {
    expect(orientationCoherence([0.5, 0.5, 0.5])).toBeCloseTo(1, 6);
    expect(orientationCoherence([0.7])).toBe(1);
    expect(orientationCoherence([])).toBe(1);
  });

  test('scattered angles → coherence in [0,1) and bounded', () => {
    const c = orientationCoherence([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(1);
  });
});

describe('latent substrates — combined per-beat step', () => {
  const inp: LatentInputs = {
    drive: 0.4,
    angles: [0.1, 0.5, 0.9, 0.3],
    ignition: 0.6,
    phi: 0.5,
    workspace: 0.6,
    surprise: 0.7,
    novelty: 0.5,
    selfAware: 0.4,
    reasoning: 0.5,
    qualiaTone: 0.5,
  };

  test('all fields finite, causalEffect bounded, fully deterministic', () => {
    const a = latentSubstrateStep(inp);
    const b = latentSubstrateStep(inp);
    for (const k of [
      'quantumUncertainty',
      'orientationCoherence',
      'causalEffect',
      'causalGrad',
    ] as const) {
      expect(Number.isFinite(a[k])).toBe(true);
      expect(a[k]).toBe(b[k]);
    }
    expect(a.causalEffect).toBeGreaterThanOrEqual(0);
    expect(a.causalEffect).toBeLessThanOrEqual(1);
  });

  test('the Pearl do(surprise→workspace) effect responds to surprise (live, not constant)', () => {
    const low = latentSubstrateStep({ ...inp, surprise: 0 }).causalEffect;
    const high = latentSubstrateStep({ ...inp, surprise: 1 }).causalEffect;
    expect(low).not.toBe(high);
  });
});
