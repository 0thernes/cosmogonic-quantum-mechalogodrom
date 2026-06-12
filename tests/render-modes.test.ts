import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { RENDER_MODES, RENDER_MODE_FX } from '../src/sim/constants';
import { applyRenderModeTo } from '../src/sim/entities';

/**
 * Render-mode facade (CONTRACTS V7.3). `applyRenderModeTo` layers a {@link RenderMode} onto a
 * MeshStandardMaterial built from a morphotype base — pure material-flag changes, headless
 * (THREE runs without a WebGL context). These pin the five-mode contract and the SOLID
 * round-trip that keeps the legacy look byte-identical.
 */
const OPAQUE_BASE = { met: 0.4, rou: 0.6, op: 1.0, emI: 0.8 };
const TRANSLUCENT_BASE = { met: 0.2, rou: 0.7, op: 0.4, emI: 0.5 };

describe('RENDER_MODES table', () => {
  test('is the seven-mode cycle, all distinct, SOLID first', () => {
    expect(RENDER_MODES.length).toBe(7);
    expect(new Set(RENDER_MODES).size).toBe(7);
    expect(RENDER_MODES[0]).toBe('solid');
    expect([...RENDER_MODES]).toEqual([
      'solid',
      'wire',
      'ghost',
      'neon',
      'chrome',
      'hologram',
      'iridescent',
    ]);
  });

  test('every mode has a finite-emissiveBoost FX entry (NEON the brightest)', () => {
    for (const mode of RENDER_MODES) {
      const fx = RENDER_MODE_FX[mode];
      expect(fx).toBeDefined();
      expect(Number.isFinite(fx.emissiveBoost)).toBe(true);
      expect(fx.emissiveBoost).toBeGreaterThan(0);
    }
    // NEON remains the strongest emissive lift (the self-glow mode).
    expect(RENDER_MODE_FX.neon.emissiveBoost).toBe(3);
    expect(RENDER_MODE_FX.solid.emissiveBoost).toBe(1);
  });
});

describe('applyRenderModeTo', () => {
  test('SOLID reproduces the morphotype base exactly (legacy look preserved)', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'solid', OPAQUE_BASE);
    expect(mat.wireframe).toBe(false);
    expect(mat.metalness).toBe(OPAQUE_BASE.met);
    expect(mat.roughness).toBe(OPAQUE_BASE.rou);
    expect(mat.transparent).toBe(false); // op >= 0.6
    expect(mat.opacity).toBe(1.0);
    expect(mat.depthWrite).toBe(true);
    expect(mat.emissiveIntensity).toBeCloseTo(OPAQUE_BASE.emI, 12);
  });

  test('SOLID keeps a translucent morphotype translucent (op < 0.6)', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'solid', TRANSLUCENT_BASE);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(TRANSLUCENT_BASE.op, 12);
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.depthWrite).toBe(true); // legacy never turned it off outside GHOST
  });

  test('WIRE only flips the wireframe flag', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'wire', OPAQUE_BASE);
    expect(mat.wireframe).toBe(true);
    expect(mat.metalness).toBe(OPAQUE_BASE.met);
    expect(mat.opacity).toBe(1.0);
  });

  test('GHOST is a low-opacity x-ray with depthWrite off', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'ghost', OPAQUE_BASE);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.3, 12);
    expect(mat.depthWrite).toBe(false);
    expect(mat.side).toBe(THREE.DoubleSide);
  });

  test('NEON triples the emissive target and flattens the surface', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'neon', OPAQUE_BASE);
    expect(mat.emissiveIntensity).toBeCloseTo(OPAQUE_BASE.emI * 3, 12);
    expect(mat.metalness).toBe(0);
    expect(mat.roughness).toBe(1);
    expect(mat.wireframe).toBe(false);
  });

  test('CHROME is a mirror (metalness 1, near-zero roughness)', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'chrome', OPAQUE_BASE);
    expect(mat.metalness).toBe(1);
    expect(mat.roughness).toBeCloseTo(0.05, 12);
    expect(mat.transparent).toBe(false);
  });

  test('switching GHOST → SOLID fully restores the base (depthWrite + opacity)', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyRenderModeTo(mat, 'ghost', OPAQUE_BASE);
    applyRenderModeTo(mat, 'solid', OPAQUE_BASE);
    expect(mat.depthWrite).toBe(true);
    expect(mat.transparent).toBe(false);
    expect(mat.opacity).toBe(1.0);
    expect(mat.metalness).toBe(OPAQUE_BASE.met);
    expect(mat.emissiveIntensity).toBeCloseTo(OPAQUE_BASE.emI, 12);
  });
});
